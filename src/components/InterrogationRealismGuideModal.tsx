import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  BookOpen, 
  Eye, 
  Lock, 
  Users, 
  Scale, 
  BrainCircuit, 
  FileCheck2, 
  Flame,
  CheckCircle2,
  Award
} from 'lucide-react';
import { sound } from '../lib/audio';

interface InterrogationRealismGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterrogationRealismGuideModal: React.FC<InterrogationRealismGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'squad' | 'tiers' | 'remand' | 'quiz'>('evidence');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const QUIZ_QUESTIONS = [
    {
      id: 1,
      scenario: "The suspect has been held in police custody for 22 hours without finishing the interrogation. What is your mandatory legal duty under BNSS §187?",
      options: [
        "A. Keep the suspect in custody silently for another 48 hours without court notice.",
        "B. File a formal Police Remand Extension Petition before the Judicial Magistrate with statutory grounds.",
        "C. Release the suspect immediately and drop all charges."
      ],
      correctAnswer: 1,
      explanation: "Under Section 187 BNSS 2023 (former s.167 CrPC), police custody beyond 24 hours requires a formal judicial extension order from the magistrate."
    },
    {
      id: 2,
      scenario: "During interrogation, the suspect orally states: 'I hid the stolen diamonds under my kitchen floorboards.' Is this statement admissible in court as it stands?",
      options: [
        "A. Yes, all oral confessions to police are 100% admissible evidence.",
        "B. No, oral confessions to police are barred under BSA §23; it becomes admissible only when converted into a witnessed Section 23 Discovery Memo with physical recovery.",
        "C. Only if recorded on an audio cassette."
      ],
      correctAnswer: 1,
      explanation: "Section 23 BSA 2023 dictates that confessions to police are barred EXCEPT for the distinct portion leading directly to the recovery of a physical object before Panch witnesses."
    },
    {
      id: 3,
      scenario: "Defense advocate is seated in the room under BNSS §41D. You assert an unverified bluff claiming you have a DNA match that does NOT exist in the file. What happens?",
      options: [
        "A. The advocate praises your clever tactic.",
        "B. The advocate lodges a formal statutory objection, increasing your Coercion Penalty and risking statement inadmissibility.",
        "C. The magistrate automatically grants default bail."
      ],
      correctAnswer: 1,
      explanation: "Under BNSS §41D, defense counsel present during questioning will object to uncorroborated bluffs, triggering a coercion penalty."
    },
    {
      id: 4,
      scenario: "The suspect appears physically exhausted, and 12 hours have elapsed since their last medical evaluation. What is the mandatory procedure under BNSS §54?",
      options: [
        "A. Continue continuous questioning for another 12 hours.",
        "B. Grant a 30-minute stamina / refreshment recess and conduct a fresh independent medical checkup.",
        "C. Transfer the suspect to another station."
      ],
      correctAnswer: 1,
      explanation: "BNSS §54 mandates periodic medical checks and stamina rest periods to safeguard against physical duress and ensure voluntary statements."
    }
  ];

  const handleSelectQuizOption = (questionId: number, optionIdx: number) => {
    sound.playClick();
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleCalculateScore = () => {
    sound.playDeductionSuccess();
    setQuizSubmitted(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f1420] border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-[#151c2d] border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif-header font-bold text-slate-100 flex items-center gap-2">
                CRIMINAL INVESTIGATION & INTERROGATION REALISM GUIDE
                <span className="text-[10px] font-mono-tactical px-2 py-0.5 bg-amber-950/60 border border-amber-600/60 text-amber-300 rounded">
                  BNSS / BSA 2023 SPEC
                </span>
              </h3>
              <p className="text-xs font-mono-tactical text-slate-400">
                OPERATIONAL PHYSICS • EVIDENCE CONTAINMENT • SQUAD DYNAMICS • STATUTORY SAFEGUARDS
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#121826] overflow-x-auto text-xs font-mono-tactical">
          <button
            onClick={() => { sound.playClick(); setActiveTab('evidence'); }}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'border-amber-500 text-amber-300 bg-amber-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>1. Evidence Containment Guardrails</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('squad'); }}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'squad'
                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Squad Room Dynamics (3-Way)</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('tiers'); }}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'tiers'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>3. Disclosure Tiers (BSA s.23)</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('remand'); }}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'remand'
                ? 'border-rose-500 text-rose-300 bg-rose-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>4. Remand Clock & Custody Laws</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveTab('quiz'); }}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'border-purple-500 text-purple-300 bg-purple-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>5. Interactive Statutory SOP Simulator</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-slate-300 text-sm font-sans leading-relaxed">
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="bg-amber-950/20 border border-amber-600/40 p-3.5 rounded-lg">
                <h4 className="font-serif-header font-bold text-amber-300 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  NO TELEPATHIC SUSPECTS: STRICT EVIDENCE PARTITIONING
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  In real criminal procedure, suspects in custody have <strong>zero awareness</strong> of police case files, secret forensic lab results, or CCTV camera feeds held in the police station until you or your squad explicitly confront them in the interrogation room.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#141b2c] border border-slate-800 p-3.5 rounded">
                  <span className="text-xs font-mono-tactical text-rose-400 font-bold uppercase block mb-1">
                    Unpresented Police Secrets
                  </span>
                  <p className="text-xs text-slate-400">
                    If an FSL fingerprint match or secret witness statement exists in your case dossier but hasn't been mentioned in the room, the suspect acts completely oblivious and maintains their cover alibi.
                  </p>
                </div>

                <div className="bg-[#141b2c] border border-slate-800 p-3.5 rounded">
                  <span className="text-xs font-mono-tactical text-emerald-400 font-bold uppercase block mb-1">
                    Explicit Confrontation & Slams
                  </span>
                  <p className="text-xs text-slate-400">
                    When you present an exhibit from the Malkhana drawer or cite specific CCTV timestamps in dialogue, the evidence is added to the <strong>Confronted Evidence Pool</strong>, forcing the suspect to address the contradiction.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded text-xs">
                <h5 className="font-bold text-slate-200 mb-1">Tactical Tip:</h5>
                <p className="text-slate-400">
                  Do not reveal all your cards in the first question. Let the suspect commit to an alibi on record first; once their statement is logged, confront them with conflicting CCTV or forensics to trigger a severe contradiction breakdown!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'squad' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/20 border border-cyan-600/40 p-3.5 rounded-lg">
                <h4 className="font-serif-header font-bold text-cyan-300 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  3-WAY ROOM DYNAMICS: WHO IS QUESTIONING MATTERS
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  The suspect is fully conscious of who is sitting across the table. Directives given to squad members alter the psychological pressure based on officer roles.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">Lead Investigating Officer (You)</span>
                    <span className="text-[10px] font-mono-tactical text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">Lead Authority</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Suspects maintain formal deference (&quot;Inspector Sir&quot;) and try to persuade you of their innocence. Accusations carry high psychological weight.
                  </p>
                </div>

                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">Sub-Inspector Preeti Nair</span>
                    <span className="text-[10px] font-mono-tactical text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded">Cyber & Digital Forensics</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    When Preeti speaks, tech-aware suspects recognize that electronic records (CCTV logs, mobile tower pings, UPI trails) cannot be easily bluffed, creating guarded anxiety.
                  </p>
                </div>

                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">Head Constable Dhanraj</span>
                    <span className="text-[10px] font-mono-tactical text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded">Street Beat & Recovery Veteran</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Dhanraj presses suspects on physical street realities, hidden godowns, and informant intel. Streetwise suspects test or argue against his beat claims.
                  </p>
                </div>

                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-xs">Junior Constable Ravi</span>
                    <span className="text-[10px] font-mono-tactical text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">Case Diary & Scribe</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Ravi observes silently or confronts procedural inconsistencies between past statements, making suspects self-conscious of their contradictions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/20 border border-emerald-600/40 p-3.5 rounded-lg">
                <h4 className="font-serif-header font-bold text-emerald-300 text-sm flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-emerald-400" />
                  STATUTORY DISCLOSURE TIERS (BSA 2023 SECTION 23)
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Confessions made to police officers in custody are inadmissible in Indian courts, EXCEPT when they lead to the discovery of a distinct physical fact or object under <strong>Section 23 of Bharatiya Sakshya Adhiniyam, 2023</strong> (formerly s.27 IEA).
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded flex items-start space-x-3">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono-tactical text-xs font-bold rounded">Tier 0</span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Total Denial</h5>
                    <p className="text-xs text-slate-400">Suspect claims total innocence and zero connection to the crime scene.</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded flex items-start space-x-3">
                  <span className="px-2 py-0.5 bg-slate-800 text-amber-300 font-mono-tactical text-xs font-bold rounded">Tier 1</span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Minimization & Peripheral Presence</h5>
                    <p className="text-xs text-slate-400">Admits to being near the vicinity but denies active role or criminal knowledge.</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded flex items-start space-x-3">
                  <span className="px-2 py-0.5 bg-slate-800 text-cyan-300 font-mono-tactical text-xs font-bold rounded">Tier 2</span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Accomplice Attribution</h5>
                    <p className="text-xs text-slate-400">Shifts blame to conspirators, handlers, or claims they acted under financial duress.</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-emerald-800/80 rounded flex items-start space-x-3">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-mono-tactical text-xs font-bold rounded">Tier 3</span>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Section 23 BSA Locatable Discovery Memo
                    </h5>
                    <p className="text-xs text-slate-300">
                      The breakthrough moment! Suspect reveals the exact hiding place of a physical article (stolen cash, weapon, tool). Record a Discovery Memo immediately to dispatch recovery units!
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-purple-800/80 rounded flex items-start space-x-3">
                  <span className="px-2 py-0.5 bg-purple-950 text-purple-300 font-mono-tactical text-xs font-bold rounded">Tier 4</span>
                  <div>
                    <h5 className="text-xs font-bold text-purple-300">Full Culpability Confession</h5>
                    <p className="text-xs text-slate-400">Complete collapse of psychological resistance, narrating the full conspiracy timeline.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'remand' && (
            <div className="space-y-4">
              <div className="bg-rose-950/20 border border-rose-600/40 p-3.5 rounded-lg">
                <h4 className="font-serif-header font-bold text-rose-300 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-rose-400" />
                  STATUTORY SAFEGUARDS & 24-HOUR REMAND CLOCK
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Indian criminal jurisprudence under <strong>BNSS 2023</strong> strictly protects the fundamental rights of persons in custody (Article 21 & 22(2) of the Constitution).
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <h5 className="font-bold text-slate-200">24-Hour Production Rule (BNSS s.58 & s.187)</h5>
                  <p className="text-slate-400 mt-0.5">
                    Police cannot detain an arrested person beyond 24 hours without an order from the Judicial Magistrate. If the Remand Clock expires, custody becomes illegal and results in judicial censure.
                  </p>
                </div>

                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <h5 className="font-bold text-slate-200">Mandatory Medical Examination (BNSS s.53 & s.54)</h5>
                  <p className="text-slate-400 mt-0.5">
                    Every arrested person must be medically examined by a registered medical practitioner. Failure to record timely medical checks allows defense counsel to claim police coercion.
                  </p>
                </div>

                <div className="bg-[#141b2c] border border-slate-800 p-3 rounded">
                  <h5 className="font-bold text-slate-200">Right to Consult Advocate (BNSS s.41D)</h5>
                  <p className="text-slate-400 mt-0.5">
                    Suspects may have their advocate present within visual range during interrogation (though not within hearing range throughout the entirety of questioning).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-4">
              <div className="bg-purple-950/20 border border-purple-600/40 p-3.5 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-serif-header font-bold text-purple-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    STATUTORY INTERROGATION SOP SIMULATION EXAM
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Test your tactical mastery of BNSS & BSA 2023 statutory procedure. Answer all 4 scenario questions to verify operational readiness.
                  </p>
                </div>
                {quizSubmitted && (
                  <div className="bg-emerald-950 border border-emerald-500/60 p-2 rounded text-center shrink-0 ml-3">
                    <div className="text-[10px] font-mono-tactical text-emerald-400 font-bold uppercase">SCORE RESULT</div>
                    <div className="text-lg font-bold text-emerald-300">
                      {QUIZ_QUESTIONS.filter(q => quizAnswers[q.id] === q.correctAnswer).length} / {QUIZ_QUESTIONS.length}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 font-mono-tactical text-xs">
                {QUIZ_QUESTIONS.map((q) => {
                  const selectedOpt = quizAnswers[q.id];
                  const isCorrect = selectedOpt === q.correctAnswer;
                  return (
                    <div 
                      key={q.id} 
                      className={`p-3.5 rounded border space-y-2.5 transition-colors ${
                        quizSubmitted 
                          ? isCorrect 
                            ? 'bg-emerald-950/20 border-emerald-500/50' 
                            : 'bg-rose-950/20 border-rose-500/50'
                          : 'bg-[#141b2c] border-slate-800'
                      }`}
                    >
                      <div className="font-bold text-slate-200 text-xs">
                        Q{q.id}. {q.scenario}
                      </div>

                      <div className="space-y-1.5 font-sans">
                        {q.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectQuizOption(q.id, optIdx)}
                            className={`w-full text-left p-2 rounded text-xs transition-all cursor-pointer border ${
                              selectedOpt === optIdx
                                ? 'bg-purple-900/40 border-purple-500 text-purple-200 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {quizSubmitted && (
                        <div className={`p-2 rounded text-[11px] font-sans ${isCorrect ? 'bg-emerald-950/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'}`}>
                          <span className="font-bold mr-1">{isCorrect ? '✓ CORRECT:' : '✗ INCORRECT:'}</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCalculateScore}
                    disabled={Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 cursor-pointer font-mono-tactical"
                  >
                    <Award className="w-4 h-4" />
                    <span>{quizSubmitted ? 'RE-EVALUATE ANSWERS' : 'SUBMIT SOP SIMULATION EXAM'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#151c2d] border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between">
          <span className="text-[11px] font-mono-tactical text-slate-400">
            METROPOLITAN BUREAU OF INVESTIGATION • STATUTORY COMPLIANCE DIVISION
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
          >
            UNDERSTOOD & RETURN TO CHAMBER
          </button>
        </div>

      </div>
    </div>
  );
};
