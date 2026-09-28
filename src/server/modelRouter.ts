/**
 * src/server/modelRouter.ts
 * Dynamic Multi-Model Auto-Routing (Tiered Dispatch) for Case File Zero
 * 
 * Provides automated task-complexity classification, model tier assignment,
 * and resilient fallback chains compliant with the modern @google/genai SDK.
 */

export type ModelTier = 'lite' | 'balanced' | 'reasoning';

export interface ModelTierConfig {
  tier: ModelTier;
  primaryModel: string;
  fallbackModels: string[];
  maxTokens: number;
  temperature: number;
  description: string;
}

/**
 * Model Registry with recommended SDK aliases & tiered quotas
 */
export const MODEL_REGISTRY: Record<ModelTier, ModelTierConfig> = {
  lite: {
    tier: 'lite',
    primaryModel: 'gemini-3.1-flash-lite',
    fallbackModels: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'],
    maxTokens: 512,
    temperature: 0.7,
    description: 'Ultra-fast, quota-saving model for casual chatter, greetings, and brief intent classification'
  },
  balanced: {
    tier: 'balanced',
    primaryModel: 'gemini-3.8-flash',
    fallbackModels: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'],
    maxTokens: 1024,
    temperature: 0.7,
    description: 'Core investigative roleplay workhorse with rich character voice, Indian legal dialect, and procedural fidelity'
  },
  reasoning: {
    tier: 'reasoning',
    primaryModel: 'gemini-3.1-pro-preview',
    fallbackModels: ['gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
    maxTokens: 2048,
    temperature: 0.2,
    description: 'High-stakes court chargesheets, deep circumstantial evidence evaluation, and BSA s.23 discovery reasoning'
  }
};

export const ALL_ROUTER_MODELS = [
  MODEL_REGISTRY.lite.primaryModel,
  MODEL_REGISTRY.balanced.primaryModel,
  MODEL_REGISTRY.reasoning.primaryModel,
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-flash-latest'
];

export interface ClassificationContext {
  userText: string;
  intentCategory?: string;
  senderKind?: string; // 'assistant' | 'member' | 'fsl' | 'court' | 'head' | 'suspect'
  senderName?: string;
  hasEvidenceMention?: boolean;
  hasLegalStatute?: boolean;
}

export interface RouteDecision {
  tier: ModelTier;
  model: string;
  reason: string;
  fallbackChain: string[];
}

/**
 * Task Complexity Classifier Engine
 * Analyzes incoming player prompt, context, intent, and target recipient
 * to assign the optimal model tier.
 */
export function classifyTaskComplexity(ctx: ClassificationContext): RouteDecision {
  const text = (ctx.userText || '').trim();
  const lower = text.toLowerCase();

  // 1. Check for Deep Reasoning Triggers (Court/Magistrate, statutory sections, chargesheets, multi-evidence correlation)
  const isCourtOrLegal = ctx.senderKind === 'court' || (ctx.senderName && /magistrate|judge|legal|court/i.test(ctx.senderName));
  const hasStatuteKeywords = /\b(bnss|bns|bsa|ipc|crpc|section|s\.\d+|remand|magistrate|chargesheet|admissib|forensic correlation|contradiction|alibi disproof|corpus delicti|ballistic striation|malkhana chain)\b/i.test(lower);
  const isDeepAnalysis = (ctx.hasLegalStatute || hasStatuteKeywords || isCourtOrLegal) && text.length > 35;

  if (isDeepAnalysis) {
    const config = MODEL_REGISTRY.reasoning;
    return {
      tier: 'reasoning',
      model: config.primaryModel,
      reason: isCourtOrLegal 
        ? 'Magistrate/Court BNSS procedural compliance scrutiny' 
        : 'Deep statutory evidence analysis and chargesheet deduction',
      fallbackChain: [config.primaryModel, ...config.fallbackModels]
    };
  }

  // 2. Check for Casual / Micro-Task Triggers (Lite Tier)
  const isSocialIntent = ctx.intentCategory === 'SOCIAL_GREETING' || ctx.intentCategory === 'SOCIAL_ACK';
  const isShortCasual = text.length <= 40 && /\b(hi|hello|hey|chai|tea|coffee|thanks|thank you|ok|okay|cool|good morning|good evening|good night|yes|no|roger|understood|got it|sure)\b/i.test(lower);
  const hasNoLegalOrEvidence = !ctx.hasEvidenceMention && !hasStatuteKeywords;

  if ((isSocialIntent || isShortCasual) && hasNoLegalOrEvidence) {
    const config = MODEL_REGISTRY.lite;
    return {
      tier: 'lite',
      model: config.primaryModel,
      reason: 'Casual conversation / greeting / quick acknowledgment',
      fallbackChain: [config.primaryModel, ...config.fallbackModels]
    };
  }

  // 3. Default to Balanced Tier (Core investigative workhorse)
  const config = MODEL_REGISTRY.balanced;
  return {
    tier: 'balanced',
    model: config.primaryModel,
    reason: 'Investigative dialogue and operational case coordination',
    fallbackChain: [config.primaryModel, ...config.fallbackModels]
  };
}

export function getTierConfig(tier: ModelTier): ModelTierConfig {
  return MODEL_REGISTRY[tier] || MODEL_REGISTRY.balanced;
}

export interface GenerationOptions {
  contents: any;
  config?: any;
  timeoutMs?: number;
}

export interface GenerationResult {
  text: string;
  modelUsed: string;
  tierUsed: ModelTier;
  attempts: Array<{ model: string; success: boolean; error?: string }>;
  fellBack: boolean;
}

// In-memory circuit-breaker map: modelName -> epoch timestamp until which it is skipped
const modelCooldowns = new Map<string, number>();

export function isModelInCooldown(modelName: string): boolean {
  const until = modelCooldowns.get(modelName);
  return typeof until === 'number' && Date.now() < until;
}

export function recordModelDegraded(modelName: string, durationMs = 60000): void {
  modelCooldowns.set(modelName, Date.now() + durationMs);
}

/**
 * Resilient Fallback & Retry Cascade Executor
 * Attempts generation using the primary model in the tier's fallbackChain.
 * If 429 quota exhaustion, 503 high demand, timeout, or error occurs,
 * it records the model in a temporary cooldown and seamlessly cascades
 * to the next candidate model in the chain without spamming errors.
 */
export async function generateWithFallback(
  ai: any,
  route: RouteDecision,
  options: GenerationOptions
): Promise<GenerationResult | null> {
  const timeoutMs = options.timeoutMs || 8000;
  const attempts: Array<{ model: string; success: boolean; error?: string }> = [];

  // Filter candidates: prioritize models that are NOT currently in cooldown
  const availableChain = route.fallbackChain.filter(m => !isModelInCooldown(m));
  const candidateChain = availableChain.length > 0 ? availableChain : route.fallbackChain;

  for (let i = 0; i < candidateChain.length; i++) {
    const candidateModel = candidateChain[i];
    try {
      const genPromise = ai.models.generateContent({
        model: candidateModel,
        contents: options.contents,
        config: options.config
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const response: any = await Promise.race([genPromise, timeoutPromise]);

      if (!response) {
        attempts.push({ model: candidateModel, success: false, error: 'Request timeout' });
        recordModelDegraded(candidateModel, 30000);
        continue;
      }

      const text = response.text ? String(response.text).trim() : '';
      if (text) {
        attempts.push({ model: candidateModel, success: true });
        return {
          text,
          modelUsed: candidateModel,
          tierUsed: route.tier,
          attempts,
          fellBack: candidateModel !== route.fallbackChain[0]
        };
      } else {
        attempts.push({ model: candidateModel, success: false, error: 'Empty response text' });
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err || '');
      attempts.push({ model: candidateModel, success: false, error: errMsg });
      
      // If 503 high demand or 429 rate limit is detected, put this model on a 60s cooldown
      if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        recordModelDegraded(candidateModel, 60000);
      }
    }
  }

  return null;
}

