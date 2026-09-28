import React, { useState, useEffect } from 'react';
import { Shield, FileText, CheckCircle, AlertOctagon, Terminal, User, Copy, ArrowRight, CornerDownLeft } from 'lucide-react';
import { OfficerProfile } from '../types/game';
import { OfficerBadge } from './OfficerBadge';
import { sound } from '../lib/audio';

// Helper to convert names to sentence case
export function toSentenceCase(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface InductionPortalProps {
  onInductionComplete: (profile: OfficerProfile & { loginId?: string; division?: string; motivation?: string; isNewRecruit?: boolean }) => void;
}

export const InductionPortal: React.FC<InductionPortalProps> = ({ onInductionComplete }) => {
  // Screens: 'select' | 'apply' | 'interview' | 'conferred' | 'member_login'
  const [screen, setScreen] = useState<'select' | 'apply' | 'interview' | 'conferred' | 'member_login'>('select');

  // Application fields
  const [fullName, setFullName] = useState('');
  const [preferredCallsign, setPreferredCallsign] = useState('');
  const [division, setDivision] = useState('Crime Branch, Malhar Division');
  const [clearancePreference, setClearancePreference] = useState(3);
  const [motivation, setMotivation] = useState('');
  const [primarySkill, setPrimarySkill] = useState('Cybernetics & Ledger Audit');

  // Member Login fields
  const [loginName, setLoginName] = useState('');
  const [loginError, setLoginError] = useState('');

  // Interview state
  const [interviewTurn, setInterviewTurn] = useState(0);
  const [interviewMessages, setInterviewMessages] = useState<Array<{ sender: string; text: string; assessment?: string }>>([]);
  const [candidateResponse, setCandidateResponse] = useState('');
  const [interviewScore, setInterviewScore] = useState(70);
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Conferred state
  const [generatedBadgeNo, setGeneratedBadgeNo] = useState('');
  const [generatedLoginId, setGeneratedLoginId] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [recruitLoginInput, setRecruitLoginInput] = useState('');
  const [recruitLoginError, setRecruitLoginError] = useState('');

  const interviewQuestions = [
    {
      speaker: 'DIG K. Ranade',
      question: 'Candidate, explain your understanding of Section 103 BNSS regarding independent seizure panchas.',
      options: [
        'Panchas must be independent local inhabitants who witness the search to prevent planting of evidence.',
        'Panchas are optional observers and police personnel can act as panchas if no one is available.',
        'Panchas are only required for cyber forensics, not for physical property seizure.'
      ],
      assessments: [
        'EXCELLENT. Demonstrates thorough legal knowledge of search protocols and evidence chain-of-custody safeguarding.',
        'ADEQUATE. Requires re-training on search formalization procedures to minimize judicial scrutiny.',
        'DEFICIENT. Serious legal knowledge gap regarding mandatory panchnama requirements.'
      ]
    },
    {
      speaker: 'Senior Prosecutor Adv. Mehta',
      question: 'If an electronic record lacks a Section 63 BSA certificate at the time of filing chargesheet, can it be cured later?',
      options: [
        'Yes, under Supreme Court guidelines, certificate defect can be cured by submitting it before trial begins.',
        'No, any digital proof without immediate S.63 certification is permanently inadmissible.',
        'S.63 certificates are only decorative and not strictly examined by special crime courts.'
      ],
      assessments: [
        'EXCELLENT. Correctly identifies procedural cure directives for digital forensic evidence admissibility.',
        'FAIR. Caution advised: courts closely scrutinize late submissions; contemporaneous certificate is best practice.',
        'POOR. Misunderstands mandatory statutory requirements of the Bharatiya Sakshya Adhiniyam.'
      ]
    },
    {
      speaker: 'ACP V. Nadkarni',
      question: 'What is your operational priority when entering a volatile, contaminated scene of crime?',
      options: [
        'Cordon off the perimeter immediately, document the baseline state, and ensure no unauthorized entry.',
        'Search for weapons immediately, moving any artifacts that are blocking pathways.',
        'Conduct immediate suspect interrogations on-site before securing the crime scene bounds.'
      ],
      assessments: [
        'EXCELLENT. Prioritizes scene preservation, contamination prevention, and chain-of-custody containment.',
        'RISKY. Modifying crime scene layout before scientific examination is a critical procedural defect.',
        'IMPROPER. Interrogations must follow immediate securing of physical artifacts to preserve baseline logic.'
      ]
    }
  ];

  // Load registered members from LocalStorage or initialize with Swetabh Suman
  const getRegisteredMembers = () => {
    const saved = localStorage.getItem('blackwatch_registered_members');
    let members = [];
    if (saved) {
      try {
        members = JSON.parse(saved);
      } catch {
        members = [];
      }
    }
    if (!Array.isArray(members)) {
      members = [];
    }
    // Guarantee Swetabh Suman is in the list with badge MCB-4512 and sentence case
    const hasSwetabh = members.some((m: any) => m && typeof m === 'object' && m.fullName && m.fullName.toLowerCase() === 'swetabh suman');
    if (!hasSwetabh) {
      members.push({
        fullName: 'Swetabh Suman',
        badgeNumber: 'MCB-4512',
        loginId: 'MCB-4512',
        callsign: 'SUMAN',
        clearanceLevel: 3,
        division: 'Crime Branch, Malhar Division',
        casesClosed: 1,
        meritScore: 1500,
        isAnonymous: false
      });
      localStorage.setItem('blackwatch_registered_members', JSON.stringify(members));
    }
    return members;
  };

  // Play interface sounds
  const playClick = () => sound.playClick();

  // Trigger typing effect for interview speech
  useEffect(() => {
    if (screen === 'interview' && interviewTurn < interviewQuestions.length) {
      const q = interviewQuestions[interviewTurn];
      setDisplayedText('');
      setIsTypingEffect(true);
      let i = 0;
      const fullText = `[${q.speaker}] ${q.question}`;
      
      const interval = setInterval(() => {
        setDisplayedText(prev => prev + fullText.charAt(i));
        i++;
        if (i >= fullText.length) {
          clearInterval(interval);
          setIsTypingEffect(false);
        }
      }, 10); // rapid typing
      
      return () => clearInterval(interval);
    }
  }, [screen, interviewTurn]);

  // Handle member login
  const handleMemberLogin = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    if (!loginName.trim()) {
      setLoginError('Error: Name field cannot be empty.');
      return;
    }

    const formattedInput = toSentenceCase(loginName);
    const members = getRegisteredMembers();
    const matched = members.find((m: any) => m.fullName.toLowerCase() === formattedInput.toLowerCase());

    if (matched) {
      sound.playClueUnlocked();
      // Log in matched member
      onInductionComplete({
        uid: 'uid_' + matched.fullName.replace(/\s+/g, '_').toLowerCase(),
        displayName: matched.fullName,
        callsign: matched.callsign,
        badgeNumber: matched.badgeNumber,
        clearanceLevel: matched.clearanceLevel,
        casesClosed: matched.casesClosed || 0,
        meritScore: matched.meritScore || 1000,
        isAnonymous: false,
        loginId: matched.loginId,
        division: matched.division
      });
    } else {
      sound.playAlertWarning();
      setLoginError(`CREDENTIALS REJECTED // No active officer file under: "${formattedInput}"`);
    }
  };

  // Submit Detailed Application Form
  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    if (!fullName.trim()) {
      alert('Officer Name is mandatory.');
      return;
    }
    if (!preferredCallsign.trim()) {
      alert('Tactical Callsign is mandatory.');
      return;
    }

    // Move to interview phase
    setInterviewTurn(0);
    setInterviewMessages([]);
    setScreen('interview');
  };

  // Handle selection of interview response
  const handleSelectInterviewOption = async (optionIndex: number) => {
    if (isTypingEffect || isSubmittingAnswer) return;
    playClick();
    setIsSubmittingAnswer(true);

    const q = interviewQuestions[interviewTurn];
    const chosenText = q.options[optionIndex];
    const assessmentText = q.assessments[optionIndex];

    // Penalty or reward based on response quality
    let scoreDelta = 0;
    if (optionIndex === 0) scoreDelta = 10;
    else if (optionIndex === 1) scoreDelta = -5;
    else scoreDelta = -15;

    const nextScore = Math.min(100, Math.max(30, interviewScore + scoreDelta));
    setInterviewScore(nextScore);

    // Append to interview logs
    setInterviewMessages(prev => [
      ...prev,
      { sender: q.speaker, text: q.question },
      { sender: fullName, text: chosenText, assessment: assessmentText }
    ]);

    // Transition or finalize
    setTimeout(() => {
      setIsSubmittingAnswer(false);
      const nextTurn = interviewTurn + 1;
      if (nextTurn < interviewQuestions.length) {
        setInterviewTurn(nextTurn);
      } else {
        // Evaluate and finalize induction
        const finalBadge = 'MCB-' + Math.floor(1000 + Math.random() * 9000);
        const finalLoginId = 'BW-LID-' + Math.floor(100000 + Math.random() * 900000);
        setGeneratedBadgeNo(finalBadge);
        setGeneratedLoginId(finalLoginId);

        // Register member in localStorage so they can log in next time
        const members = getRegisteredMembers();
        const newMember = {
          fullName: toSentenceCase(fullName),
          badgeNumber: finalBadge,
          loginId: finalLoginId,
          callsign: preferredCallsign.trim().toUpperCase(),
          clearanceLevel: clearancePreference,
          division: division,
          casesClosed: 0,
          meritScore: finalScoreToMerit(nextScore),
          isAnonymous: false
        };
        members.push(newMember);
        localStorage.setItem('blackwatch_registered_members', JSON.stringify(members));

        sound.playMissionCompleted();
        setScreen('conferred');
      }
    }, 1500);
  };

  const finalScoreToMerit = (score: number) => {
    return Math.floor((score / 100) * 1500);
  };

  const handleCopyCredentials = () => {
    playClick();
    const textToCopy = `Officer Name: ${toSentenceCase(fullName)}\nBadge Number: ${generatedBadgeNo}\nLogin ID: ${generatedLoginId}\nCallsign: ${preferredCallsign.toUpperCase()}\nClearance: Level ${clearancePreference}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFinalizeInduction = () => {
    playClick();
    if (!recruitLoginInput.trim()) {
      setRecruitLoginError('Error: Login ID field cannot be empty.');
      sound.playAlertWarning();
      return;
    }
    if (recruitLoginInput.trim().toUpperCase() !== generatedLoginId.toUpperCase()) {
      setRecruitLoginError(`AUTHENTICATION FAILED // Entered Login ID does not match your generated credentials.`);
      sound.playAlertWarning();
      return;
    }

    sound.playClueUnlocked();
    onInductionComplete({
      uid: 'uid_' + fullName.trim().replace(/\s+/g, '_').toLowerCase(),
      displayName: toSentenceCase(fullName),
      callsign: preferredCallsign.trim().toUpperCase(),
      badgeNumber: generatedBadgeNo,
      clearanceLevel: clearancePreference,
      casesClosed: 0,
      meritScore: finalScoreToMerit(interviewScore),
      isAnonymous: false,
      loginId: generatedLoginId,
      division: division,
      motivation: motivation,
      isNewRecruit: true
    });
  };

  return (
    <div className="min-h-screen bg-[#070A13] flex items-center justify-center p-4 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Visual Scanning Line for high tech theme */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-amber-500/10 pointer-events-none animate-pulse" />

      <div className="w-full max-w-xl bg-[#0D1322] border border-slate-800 rounded shadow-2xl relative p-6 sm:p-8 space-y-6">
        
        {/* Top Border Indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-800 via-amber-500/80 to-slate-800 rounded-t" />

        {/* Brand Header */}
        <div className="text-center border-b border-slate-800 pb-4 space-y-1">
          <div className="flex justify-center mb-2">
            <Shield className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="font-serif-header text-xl sm:text-2xl font-bold tracking-wide text-slate-100 uppercase">
            PROJECT BLACKWATCH
          </h2>
          <p className="font-mono-tactical text-[10px] text-slate-400 uppercase tracking-widest">
            METROPOLITAN INVESTIGATION BUREAU // RECRUITMENT & INDUCTION PORTAL
          </p>
        </div>

        {/* 1. SELECTION SCREEN */}
        {screen === 'select' && (
          <div className="space-y-6">
            <p className="font-mono-tactical text-xs text-slate-300 leading-relaxed text-center">
              Welcome to the Project Blackwatch classification interface. Access to this mainframe is strictly limited to authorized personnel. Select your status to proceed.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2">
              {/* Option A: New Recruit */}
              <button
                onClick={() => { playClick(); setScreen('apply'); }}
                className="group flex flex-col items-start p-4 bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-amber-500/60 transition-all rounded text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
                <span className="font-mono-tactical text-[10px] text-amber-500 tracking-wider uppercase font-semibold">STATUS CODE: CADET-01</span>
                <span className="font-serif-header text-base font-bold text-slate-100 mt-1 uppercase group-hover:text-amber-400 transition-colors">
                  NEW RECRUIT INDUCTION
                </span>
                <p className="font-mono-tactical text-[11px] text-slate-400 mt-2 leading-normal">
                  Initiate the 3-step enlistment procedure: submit credentials, pass the tactical board interview, and generate your Special Agent badge.
                </p>
                <div className="flex items-center space-x-1 mt-4 text-xs font-mono-tactical text-amber-500 font-bold">
                  <span>START APPLICATION</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option B: Already a Member */}
              <button
                onClick={() => { playClick(); setScreen('member_login'); }}
                className="group flex flex-col items-start p-4 bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 transition-all rounded text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-500/5 to-transparent pointer-events-none" />
                <span className="font-mono-tactical text-[10px] text-cyan-400 tracking-wider uppercase font-semibold">STATUS CODE: OFFICER-ACTIVE</span>
                <span className="font-serif-header text-base font-bold text-slate-100 mt-1 uppercase group-hover:text-cyan-400 transition-colors">
                  ALREADY A MEMBER
                </span>
                <p className="font-mono-tactical text-[11px] text-slate-400 mt-2 leading-normal">
                  Previously inducted? Enter your full name to instantly retrieve your profile and access the operational tactical command board.
                </p>
                <div className="flex items-center space-x-1 mt-4 text-xs font-mono-tactical text-cyan-400 font-bold">
                  <span>ENTER COMMAND WORKSPACE</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. DETAILED APPLICATION FORM */}
        {screen === 'apply' && (
          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="font-serif-header text-sm font-bold text-slate-200 uppercase">
                Step 1 of 3: Detailed Admission Form
              </h3>
            </div>

            <div className="space-y-3.5 font-mono-tactical text-[11px]">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wider block">OFFICER FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Swetabh Suman"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-100 focus:border-amber-500/80 focus:outline-none"
                />
              </div>

              {/* Callsign */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wider block">PREFERRED CALLSIGN (Max 12 Chars) *</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={preferredCallsign}
                  onChange={(e) => setPreferredCallsign(e.target.value.toUpperCase())}
                  placeholder="e.g. VANGUARD"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-100 focus:border-amber-500/80 focus:outline-none uppercase"
                />
              </div>

              {/* Division Dropdown */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wider block">ASSIGNED ENLISTMENT DIVISION</label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 focus:border-amber-500/80 focus:outline-none cursor-pointer"
                >
                  <option value="Crime Branch, Malhar Division">Crime Branch, Malhar Division</option>
                  <option value="Cybernetics & Cyber Forensics Sector">Cybernetics & Cyber Forensics Sector</option>
                  <option value="Field Surveillance & Recon Unit">Field Surveillance & Recon Unit</option>
                  <option value="Ballistics & Physical Specimen Lab">Ballistics & Physical Specimen Lab</option>
                </select>
              </div>

              {/* Core Skill */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wider block">PRIMARY TACTICAL SKILLSET</label>
                <select
                  value={primarySkill}
                  onChange={(e) => setPrimarySkill(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-200 focus:border-amber-500/80 focus:outline-none cursor-pointer"
                >
                  <option value="Cybernetics & Ledger Audit">Cybernetics & Ledger Audit</option>
                  <option value="Covert Surveillance & Wiretap">Covert Surveillance & Wiretap</option>
                  <option value="Crime Scene & Ballistics">Crime Scene & Ballistics</option>
                  <option value="Tactical Breach & SWAT Operations">Tactical Breach & SWAT Operations</option>
                </select>
              </div>

              {/* Motivation */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wider block">MOTIVATION & OBJECTIVES STATEMENT</label>
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="State your operational drive and alignment with the bureau..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2.5 text-slate-100 focus:border-amber-500/80 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { playClick(); setScreen('select'); }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-xs font-mono-tactical text-slate-300"
              >
                RETURN TO MAIN
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-xs font-mono-tactical flex items-center space-x-1 cursor-pointer"
              >
                <span>PROCEED TO EXAMINATIONS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* 3. INTERACTIVE BOARD INTERVIEW */}
        {screen === 'interview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif-header text-sm font-bold text-slate-200 uppercase">
                  Step 2 of 3: Examination Board Interview
                </h3>
              </div>
              <div className="font-mono-tactical text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                SCORE: {interviewScore}%
              </div>
            </div>

            {/* Teletype console layout */}
            <div className="bg-slate-950 border border-slate-800 rounded p-4 h-64 overflow-y-auto space-y-4 font-mono-tactical text-[11px] leading-relaxed select-text">
              {interviewMessages.map((msg, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`font-bold ${msg.sender === fullName ? 'text-cyan-400' : 'text-amber-500'}`}>
                      [{msg.sender.toUpperCase()}]
                    </span>
                    <span className="text-slate-300">{msg.text}</span>
                  </div>
                  {msg.assessment && (
                    <div className="text-emerald-500 pl-4 border-l border-emerald-900/60 text-[10px] uppercase font-semibold">
                      &gt;&gt; BOARD EVALUATION: {msg.assessment}
                    </div>
                  )}
                </div>
              ))}

              {/* Current Question */}
              {interviewTurn < interviewQuestions.length && (
                <div className="text-amber-400 font-semibold text-xs border-t border-slate-900 pt-3 flex items-start space-x-1">
                  <span>&gt;</span>
                  <p>{displayedText}</p>
                </div>
              )}
            </div>

            {/* Response options */}
            {interviewTurn < interviewQuestions.length && !isTypingEffect && (
              <div className="space-y-2">
                <span className="font-mono-tactical text-[10px] text-slate-500 block uppercase tracking-wider">
                  Select your tactical response to the board:
                </span>
                {interviewQuestions[interviewTurn].options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    disabled={isSubmittingAnswer}
                    onClick={() => handleSelectInterviewOption(optIdx)}
                    className="w-full text-left p-3 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded text-xs font-mono-tactical text-slate-200 transition-all block relative"
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-amber-500 font-bold">{optIdx + 1}.</span>
                      <span className="leading-normal">{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isTypingEffect && (
              <div className="flex items-center justify-center p-4">
                <span className="text-slate-500 font-mono-tactical text-xs animate-pulse">
                  &gt;&gt; ESTABLISHING BOARD AUDIO TRANSMISSION...
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4. CONFERRED BADGE & INDUCTION COMPLETE */}
        {screen === 'conferred' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-serif-header text-lg sm:text-xl font-bold text-slate-100 uppercase">
                INDUCTION PROTOCOL CONFERRED!
              </h3>
              <p className="font-mono-tactical text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
                EVALUATION COMPLETED // EXAMINERS CONFIRMED SECURITY STANDBY
              </p>
            </div>

            {/* Render the stunning real looking badge */}
            <div className="py-2">
              <OfficerBadge 
                officer={{
                  uid: 'conferred_uid',
                  displayName: toSentenceCase(fullName),
                  callsign: preferredCallsign.toUpperCase(),
                  badgeNumber: generatedBadgeNo,
                  clearanceLevel: clearancePreference,
                  casesClosed: 0,
                  meritScore: finalScoreToMerit(interviewScore),
                  isAnonymous: false,
                  loginId: generatedLoginId,
                  division: division
                }}
              />
            </div>

            {/* Credentials / Copy Block */}
            <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3 font-mono-tactical text-[11px]">
              <div className="flex justify-between items-center text-slate-400">
                <span>NEW RECRUIT MAIN LOGIN ID:</span>
                <span className="text-cyan-400 font-bold text-xs tracking-wider">{generatedLoginId}</span>
              </div>
              <p className="text-slate-500 text-[10px] leading-relaxed text-center">
                Your credentials are saved to the local security mainframe. Copy this data to secure your file for future logins under the "Already a Member" portal.
              </p>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4 text-amber-500" />
                <span>{isCopied ? 'CREDENTIALS COPIED TO CLIPBOARD' : 'COPY CREDENTIALS ENVELOPE'}</span>
              </button>
            </div>

            {/* Login Verification Input */}
            <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3 font-mono-tactical text-[11px]">
              <label className="text-slate-400 uppercase tracking-wider block font-semibold">
                ACTIVATE TERMINAL // ENTER LOGIN ID
              </label>
              <input
                type="text"
                value={recruitLoginInput}
                onChange={(e) => {
                  setRecruitLoginInput(e.target.value);
                  if (recruitLoginError) setRecruitLoginError('');
                }}
                placeholder="e.g. BW-LID-123456"
                className="w-full bg-[#121826] border border-slate-800 rounded px-3 py-2.5 text-slate-100 focus:border-amber-500/80 focus:outline-none text-center font-bold tracking-widest uppercase text-xs"
              />
              {recruitLoginError && (
                <div className="text-rose-400 font-semibold text-[10px] uppercase text-center leading-normal">
                  &gt;&gt; {recruitLoginError}
                </div>
              )}
              <p className="text-slate-500 text-[10px] leading-relaxed text-center">
                Enter your newly generated Login ID to authorize clearance and initiate system workspace.
              </p>
            </div>

            {/* Proceed */}
            <button
              onClick={handleFinalizeInduction}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs font-mono-tactical tracking-widest rounded flex items-center justify-center space-x-1 transition-colors cursor-pointer shadow-lg"
            >
              <span>ACCESS MAIN WORKSPACE MAINCOMMAND</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 5. MEMBER LOGIN (NAME CARD INPUT) */}
        {screen === 'member_login' && (
          <form onSubmit={handleMemberLogin} className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <User className="w-5 h-5 text-cyan-400" />
              <h3 className="font-serif-header text-sm font-bold text-slate-200 uppercase">
                Officer Clearance Portal
              </h3>
            </div>

            <div className="space-y-4 font-mono-tactical text-[11px]">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase tracking-wider block">ENTER REGISTERED OFFICER NAME</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={loginName}
                  onChange={(e) => {
                    setLoginName(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="e.g. Swetabh Suman"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-3 text-slate-100 focus:border-cyan-500/80 focus:outline-none"
                />
                <span className="text-[9px] text-slate-500 mt-1 block leading-normal">
                  NOTE: Logins are case-insensitive. Name will automatically convert to correct Sentence Case.
                </span>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/50 text-rose-300 rounded flex items-start space-x-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="leading-normal">{loginError}</span>
                </div>
              )}
            </div>

            {/* Login Action Buttons */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => { playClick(); setScreen('select'); }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-xs font-mono-tactical text-slate-300"
              >
                RETURN TO MAIN
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded text-xs font-mono-tactical flex items-center space-x-1 cursor-pointer"
              >
                <span>VERIFY CREDENTIALS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
