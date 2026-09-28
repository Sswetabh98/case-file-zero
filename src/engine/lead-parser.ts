/**
 * Investigative Lead Discovery & Semantic Tag Parser
 * Supports extracting, formatting, and rendering interactive breakthrough chips from AI interrogation dialogue.
 */

export type LeadType = 'alibi' | 'evidence' | 'person' | 'contradiction' | 'location';

export interface DiscoveredLead {
  type: LeadType;
  targetId: string;
  text: string;
  summary: string;
  raw: string;
}

export const LEAD_CONFIG: Record<LeadType, {
  label: string;
  icon: string;
  cssClass: string;
  targetView: string;
  badgeLabel: string;
}> = {
  alibi: {
    label: 'Alibi / Timeline',
    icon: '🛡️',
    cssClass: 'lead-chip-alibi',
    targetView: 'pois',
    badgeLabel: 'ALIBI CLAIM'
  },
  evidence: {
    label: 'Physical / Digital Evidence',
    icon: '🔍',
    cssClass: 'lead-chip-evidence',
    targetView: 'board', // also links to evidence locker
    badgeLabel: 'EXHIBIT LEAD'
  },
  person: {
    label: 'Person of Interest / Accomplice',
    icon: '👥',
    cssClass: 'lead-chip-person',
    targetView: 'pois',
    badgeLabel: 'POI IMPLICATED'
  },
  contradiction: {
    label: 'Contradiction / Admission',
    icon: '⚠️',
    cssClass: 'lead-chip-contradiction',
    targetView: 'interrogation',
    badgeLabel: 'ADMISSION / CONTRADICTION'
  },
  location: {
    label: 'Scene / Dispatch Location',
    icon: '📍',
    cssClass: 'lead-chip-location',
    targetView: 'scene', // maps to scene / dispatch view
    badgeLabel: 'LOCUS / RECOVERY'
  }
};

/**
 * Regular expression matching [[type:targetId|text|summary]] or [[type:targetId|text]]
 */
const LEAD_TAG_REGEX = /\[\[(alibi|evidence|person|contradiction|location):([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extracts all semantic leads embedded within a message.
 */
export function extractLeads(rawText: string): DiscoveredLead[] {
  if (!rawText) return [];
  const leads: DiscoveredLead[] = [];
  const regex = new RegExp(LEAD_TAG_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    const type = match[1].toLowerCase() as LeadType;
    const targetId = match[2].trim();
    const text = match[3].trim();
    const explicitSummary = match[4]?.trim();

    // Generate a contextual humanized summary if not explicitly provided
    let summary = explicitSummary;
    if (!summary) {
      switch (type) {
        case 'alibi':
          summary = `Stated Alibi claim: "${text}"`;
          break;
        case 'evidence':
          summary = `Physical/Digital Exhibit lead: "${text}"`;
          break;
        case 'person':
          summary = `Implicated accomplice / Person of Interest: "${text}"`;
          break;
        case 'contradiction':
          summary = `Contradiction / Admission made: "${text}"`;
          break;
        case 'location':
          summary = `Scene / Recovery locus disclosed: "${text}"`;
          break;
      }
    }

    leads.push({
      type,
      targetId,
      text,
      summary,
      raw: match[0]
    });
  }

  return leads;
}

/**
 * Strips all [[...]] lead tags from text, returning the clean conversational spoken dialogue.
 * Useful for text-to-speech, transcripts, audio generation, and screen readers.
 */
export function stripLeadTags(rawText: string): string {
  if (!rawText) return '';
  return rawText.replace(LEAD_TAG_REGEX, (_match, _type, _id, text) => {
    return text.trim();
  });
}

/**
 * Utility HTML escaper
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Transforms raw text containing [[type:id|text|summary]] tags into interactive HTML chips.
 */
export function renderInteractiveLeadsHtml(rawText: string): string {
  if (!rawText) return '';

  return rawText.replace(LEAD_TAG_REGEX, (_match, rawType, targetId, text, explicitSummary) => {
    const type = rawType.toLowerCase() as LeadType;
    const conf = LEAD_CONFIG[type] || LEAD_CONFIG.evidence;
    const safeText = escapeHtml(text.trim());
    const safeTarget = escapeHtml(targetId.trim());
    const summary = explicitSummary ? explicitSummary.trim() : `${conf.badgeLabel}: ${text.trim()}`;
    const safeSummary = escapeHtml(summary);

    return `<span class="interactive-lead-chip ${conf.cssClass}" data-lead-type="${type}" data-lead-target="${safeTarget}" data-lead-summary="${safeSummary}" data-target-view="${conf.targetView}" role="button" tabindex="0" title="${safeSummary} (Click to inspect)"><span class="lead-chip-icon">${conf.icon}</span><span class="lead-chip-text">${safeText}</span><span class="lead-chip-badge">${conf.badgeLabel}</span></span>`;
  });
}
