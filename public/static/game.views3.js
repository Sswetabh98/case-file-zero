function openCaseDiaryModal() {
  const s = G.snapshot || {}
  const entries = s.diary || []
  const procedural = entries.filter(e => e.entry_type === 'defect' || e.entry_type === 'note')
  const milestones = entries.filter(e => e.entry_type === 'milestone')
  
  modal({
    title: '&#128214; Official Case Diary Chronology (BNSS §172)',
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:65vh;overflow-y:auto;padding-right:4px">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">&#9878; Statutory Chronology &middot; BNSS s.172</div>
          Day-to-day statutory record of acts, entries, statements, and recoveries recorded in the investigation. The court reads this record to verify procedural integrity.
        </div>
        <div style="display:flex;gap:8px;align-items:center;font-size:11px;font-family:var(--font-mono);color:var(--ink3)">
          <span class="tag gold" style="font-size:10px">${entries.length} Total Entries</span>
          <span class="tag green" style="font-size:10px">${milestones.length} Milestones</span>
          <span class="tag" style="font-size:10px;background:#1e293b">${procedural.length} Procedural Notes</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${entries.length ? entries.map(e => `
            <div class="diary-item ${e.entry_type === 'defect' ? 'def' : e.entry_type === 'milestone' ? 'mile' : 'auto'}" style="padding:8px 10px;border-radius:4px;background:#0d1219;border:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-family:var(--font-mono);font-size:10px;color:var(--gold)">
                <span>Day ${e.day || s.day || 1}${e.time ? ' &middot; ' + esc(e.time) : ''}</span>
                ${e.author ? `<span style="color:var(--ink3)">✍️ ${esc(e.author)}</span>` : ''}
              </div>
              <div class="diary-b" style="font-size:12.5px;color:#f1f5f9;line-height:1.4">${esc(e.body || e.text || '')}</div>
            </div>
          `).join('') : '<div class="dim" style="padding:20px;text-align:center">No entries yet. Substantive notes and scene actions fill the diary automatically.</div>'}
        </div>
      </div>
    `,
    footer: `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <button class="btn sm" id="btn-modal-go-diary">&#128214; Open Full Case Diary Desk</button>
        <button class="btn pri sm" data-close>Close</button>
      </div>
    `
  })

  setTimeout(() => {
    const gd = $('#btn-modal-go-diary')
    if (gd) {
      gd.onclick = () => {
        closeModal()
        go('diary')
      }
    }
  }, 50)
}
window.openCaseDiaryModal = openCaseDiaryModal

/**
 * Suspect & Witness Quick Switcher Modal (Fixes dropdown tap issue on mobile)
 */
function openSuspectPickerModal(known, currentPersonId) {
  const s = G.snapshot || {}
  modal({
    title: '👤 Switch Interrogation Subject',
    body: `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;padding-right:2px">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          Select a person of interest or summoned witness to examine under Indian statutory procedure (BNSS/BSA 2023).
        </div>
        ${known.map(x => {
          const isCurrent = x.id === currentPersonId
          const hasExamined = (s.interviews || []).some(i => i.person_id === x.id)
          return `
            <div class="card card-btn" data-switch-suspect="${x.id}" style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:${isCurrent ? '#162235' : '#0d1219'};border:1px solid ${isCurrent ? 'var(--gold)' : 'rgba(255,255,255,0.08)'};border-radius:4px;transition:all 0.15s">
              <div style="display:flex;align-items:center;gap:12px">
                ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(x, x.role, x.portrait_key, 'poi-pic-sm') : ''}
                <div>
                  <div style="font-weight:700;color:${isCurrent ? 'var(--gold)' : '#f1f5f9'};font-size:13px">${esc(x.name)}</div>
                  <div class="dim" style="font-size:11px;text-transform:uppercase">${esc(x.role || 'Citizen')}${hasExamined ? ' &middot; Examined' : ''}</div>
                </div>
              </div>
              <span class="tag ${isCurrent ? 'gold' : ''}" style="font-size:10px;font-family:var(--font-mono)">${isCurrent ? '● Seated' : 'Examine ➔'}</span>
            </div>
          `
        }).join('')}
      </div>
    `,
    footer: `<button class="btn pri sm" data-close>Close</button>`
  })

  setTimeout(() => {
    $$('[data-switch-suspect]').forEach(el => {
      el.onclick = () => {
        const val = el.dataset.switchSuspect
        G.ivTarget = isNaN(Number(val)) ? val : Number(val)
        G.iv = null
        G.ivTranscriptScrollTop = null
        G.ivTranscriptWasAtBottom = true
        closeModal()
        render()
      }
    })
  }, 50)
}
window.openSuspectPickerModal = openSuspectPickerModal

/**
 * Malkhana Seized Exhibits Vault Tray Modal & Slam System
 */
function openMalkhanaVaultTrayModal(p, iv) {
  const s = G.snapshot || {}
  const known = (s.persons || []).filter(x => x.role === 'suspect' || x.role === 'accused' || x.role === 'victim' || x.canvassed || x.consented || x.summoned || x.in_chamber || x.interrogation_ready)
  const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  p = p || known.find(x => x.id === targetId) || (s.persons || [])[0] || { name: 'Suspect' }
  const personIvList = (s.interviews || []).filter(i => i.person_id === (p && p.id))
  iv = iv || (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]

  let exhibits = (s.exhibits || []).filter(e => e.found || e.isUnlocked || e.recovered)
  if (!exhibits.length) exhibits = s.exhibits || []
  
  modal({
    title: '📦 Malkhana Seized Exhibits Vault Tray',
    body: `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:65vh;overflow-y:auto;padding-right:2px">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">💥 Malkhana Evidence Slamming Protocol</div>
          Slam verified physical/digital exhibits directly against <b>${esc(p ? p.name : 'the suspect')}</b> to shatter false alibis and induce breakdown state (&gt;80% stress).
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:8px">
          ${exhibits.length ? exhibits.map(ex => {
            const isVuln = p && p.alibi && (ex.name.toLowerCase().includes('cdr') || ex.name.toLowerCase().includes('cctv') || ex.name.toLowerCase().includes('forensic') || ex.name.toLowerCase().includes('weapon'))
            return `
              <div class="card" style="padding:10px;background:#0d1219;border:1px solid ${isVuln ? 'var(--amber)' : 'rgba(255,255,255,0.08)'};border-radius:4px;display:flex;flex-direction:column;justify-content:space-between;gap:8px">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <span class="tag gold" style="font-size:9.5px;font-weight:700">EX-${esc(String(ex.id || ex.code || '01'))}</span>
                    <span class="dim" style="font-size:10px;text-transform:uppercase">${esc(ex.category || 'Physical')}</span>
                  </div>
                  <div style="font-weight:700;color:#f1f5f9;font-size:12.5px">${esc(ex.name)}</div>
                  <div class="dim" style="font-size:11px;margin-top:2px;line-height:1.35">${esc(ex.summary || ex.desc || ex.location_found || '')}</div>
                  ${isVuln ? `<div style="color:var(--amber);font-size:10px;font-weight:700;margin-top:4px">🔥 Suspect Critical Vulnerability</div>` : ''}
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px">
                  <button type="button" class="btn red sm" data-slam-exhibit="${esc(ex.id)}" style="flex:1;font-size:11px;font-weight:bold">
                    💥 Slam Exhibit
                  </button>
                  <button type="button" class="btn sm" data-pin-exhibit="${esc(ex.id)}" style="font-size:11px">
                    📌 Pin
                  </button>
                </div>
              </div>
            `
          }).join('') : '<div class="dim" style="padding:20px;text-align:center">No seized exhibits currently logged in Malkhana. Recover items at crime scene.</div>'}
        </div>
      </div>
    `,
    footer: `<button class="btn pri sm" data-close>Close</button>`
  })

  setTimeout(() => {
    $$('[data-slam-exhibit]').forEach(btn => {
      btn.onclick = async () => {
        const exId = btn.dataset.slamExhibit
        const ex = exhibits.find(x => String(x.id) === String(exId))
        if (!ex || !p) return
        closeModal()

        try {
          toast('💥 Slamming Exhibit...', `Confronting ${p.name} with ${ex.name}!`, 'warn')
          const res = await api(`/cases/${s.caseId}/interview/slam-evidence`, {
            method: 'POST',
            body: JSON.stringify({
              personId: p.id,
              interviewId: iv && iv.id,
              exhibitId: ex.id,
              exhibitName: ex.name,
              advocatePresent: G.counselPresent,
              questionText: `We recovered ${ex.name} from ${ex.location_found || 'the crime scene'}. Your false alibi is completely broken. Tell the court the whole truth!`
            })
          })
          if (res && res.impact) {
            if (res.impact.breakthroughAchieved) {
              toast('💥 BREAKTHROUGH!', `Suspect composure shattered under ${ex.name}!`, 'crit')
            } else {
              toast('💥 Exhibit Slammed', `Suspect stress increased by +${res.impact.stressDelta}%`, 'good')
            }
          }
          mergeBundle(res)
          render()
        } catch (e) {
          toast('Error', e.message || String(e), 'crit')
        }
      }
    })

    $$('[data-pin-exhibit]').forEach(btn => {
      btn.onclick = () => {
        const exId = btn.dataset.pinExhibit
        const ex = exhibits.find(x => String(x.id) === String(exId))
        if (!ex) return
        closeModal()
        const inEl = $('#iv-in')
        if (inEl) {
          inEl.value = `We have recovered [${ex.name}]. Explain how this matches your statement. `
          inEl.focus()
        }
      }
    })
  }, 50)
}
window.openMalkhanaVaultTrayModal = openMalkhanaVaultTrayModal

/**
 * Mandatory Medical Examination Modal (BNSS s.53/54)
 */
function openMedicalExamModal(p) {
  const s = G.snapshot || {}
  const known = (s.persons || []).filter(x => x.role === 'suspect' || x.role === 'accused' || x.role === 'victim' || x.canvassed || x.consented || x.summoned || x.in_chamber || x.interrogation_ready)
  const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  p = p || known.find(x => x.id === targetId) || (s.persons || [])[0] || { name: 'Accused' }
  const rClock = s.remand_clock || {}
  const medAgo = rClock.lastMedicalCheckMinutesAgo || 0
  const medAgoHours = Math.floor(medAgo / 60)
  const medStatus = rClock.medicalFitnessStatus || 'fit'

  modal({
    title: '🩺 Mandatory Medical Examination (BNSS §53/§54)',
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px;color:#f1f5f9">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">&#9878; BNSS s.54 Statutory Certificate</div>
          Mandatory on-site examination by CMO to rule out custodial coercion, record vital signs, relieve acute duress, and establish full judicial admissibility.
        </div>
        <div class="card" style="padding:10px;background:#0d1219;border:1px solid ${medStatus === 'fit' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.4)'};border-radius:4px">
          <div style="font-weight:700;color:${medStatus === 'fit' ? '#10b981' : '#ef4444'};margin-bottom:6px">OFFICIAL MEDICAL REPORT // DISTRICT HOSPITAL</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--ink2);line-height:1.5">
            <div>SUBJECT: <b>${esc(p ? p.name : 'Accused')}</b></div>
            <div>DOCTOR: <b>Dr. A. Verma (CMO, Civil Hospital)</b></div>
            <div>LAST MEDICAL INSPECTION: <b>${medAgoHours}h ${medAgo % 60}m Elapsed</b></div>
            <div>BLOOD PRESSURE: <b>124/82 mmHg</b> &middot; PULSE: <b>78 bpm</b></div>
            <div>STATUS: <span class="tag ${medStatus === 'fit' ? 'green' : 'red'}" style="font-size:9.5px">${esc(medStatus.toUpperCase())}</span></div>
            <div style="margin-top:4px;color:var(--ink3)">Findings: Examination certifies subject free of custodial duress and physically fit. Examination costs 45 min of custody time.</div>
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <button class="btn sm" data-close>Cancel</button>
        <button class="btn pri sm green" id="btn-execute-med-check">🩺 Certify &amp; Record Medical Exam</button>
      </div>
    `
  })

  setTimeout(() => {
    const btnExec = $('#btn-execute-med-check')
    if (btnExec) {
      btnExec.onclick = async () => {
        closeModal()
        try {
          toast('🩺 Conducting Exam...', 'CMO Dr. A. Verma examining subject under BNSS §54...', 'warn')
          const res = await api(`/cases/${s.caseId}/interview/medical-check`, {
            method: 'POST',
            body: JSON.stringify({
              personId: p.id,
              doctorName: 'Dr. A. Verma (CMO, District Civil Hospital)',
              bp: '124/82 mmHg',
              pulse: '76 bpm'
            })
          })
          toast('🩺 Medical Certified', `Subject certified fit under BNSS §54. Interrogation stress relieved.`, 'good')
          mergeBundle(res)
          render()
        } catch (e) {
          toast('Error', e.message || String(e), 'crit')
        }
      }
    }
  }, 50)
}
window.openMedicalExamModal = openMedicalExamModal

/**
 * Statutory Custody Log & Remand Clock Breakdown Modal (BNSS s.58 / Const Art. 22(2))
 */
function openCustodyClockModal(p) {
  const s = G.snapshot || {}
  const known = (s.persons || []).filter(x => x.role === 'suspect' || x.role === 'accused' || x.role === 'victim' || x.canvassed || x.consented || x.summoned || x.in_chamber || x.interrogation_ready)
  const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  p = p || known.find(x => x.id === targetId) || (s.persons || [])[0] || { name: 'Accused' }
  const rClock = s.remand_clock || {}
  const remandMins = typeof rClock.remandMinutesRemaining === 'number' ? rClock.remandMinutesRemaining : 1440
  const elapsedMins = rClock.elapsedMinutes || Math.max(0, 1440 - remandMins)
  const rHours = Math.floor(remandMins / 60)
  const rRemMins = remandMins % 60
  const elpHours = Math.floor(elapsedMins / 60)
  const elpRemMins = elapsedMins % 60
  const isExp = rClock.isExpired || remandMins <= 0

  modal({
    title: '⏱️ Statutory Custody Log & Remand Countdown (BNSS §58 / Art. 22(2))',
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px;color:#f1f5f9">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">&#9878; Constitution Art. 22(2) & BNSS §58 Fundamental Protection</div>
          No person arrested shall be detained in custody beyond 24 hours without production before the nearest Judicial Magistrate.
        </div>

        <div class="card" style="padding:12px;background:#0d1219;border:1px solid ${isExp ? '#ef4444' : remandMins <= 180 ? '#ef4444' : 'rgba(245,158,11,0.3)'};border-radius:4px;font-family:var(--font-mono)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-weight:700;color:var(--gold);font-size:12px">CUSTODY CLOCK TELEMETRY</span>
            <span class="tag ${isExp ? 'red' : remandMins <= 180 ? 'red' : 'gold'}" style="font-size:10px">${isExp ? '⛔ EXPIRED' : `${rHours}H ${rRemMins}M REMAINING`}</span>
          </div>
          <div style="font-size:11px;color:var(--ink2);line-height:1.6">
            <div>ACCUSED: <b style="color:#fff">${esc(p ? p.name : 'Accused')}</b></div>
            <div>ARREST ENTRY: <b>Recorded under BNSS §35/§47 (Communicated Grounds)</b></div>
            <div>CUSTODY TIME ELAPSED: <b style="color:#38bdf8">${elpHours} Hours ${elpRemMins} Minutes</b></div>
            <div>STATUTORY PRODUCTION DEADLINE: <b style="color:${isExp ? '#ef4444' : 'var(--gold)'}">${isExp ? 'EXPIRED — IMMEDIATE MAGISTRATE BAIL MANDATED' : `${rHours}h ${rRemMins}m Left`}</b></div>
            <div>STAMINA / MEDICAL STATUS: <span style="color:#10b981;font-weight:bold">${esc(rClock.medicalFitnessStatus || 'FIT')} (BNSS §54)</span></div>
          </div>
        </div>

        <div style="padding:10px;background:#090d16;border:1px solid rgba(255,255,255,0.1);border-radius:4px">
          <div style="font-weight:bold;font-size:11px;color:var(--cyan);margin-bottom:6px">STATUTORY CUSTODY AUDIT TRAIL</div>
          <ul style="font-size:11px;color:var(--ink3);padding-left:16px;margin:0;line-height:1.5">
            <li>00:00 - Formal arrest executed and grounds communicated (BNSS §47)</li>
            <li>01:15 - Mandatory CMO Medical Exam conducted (BNSS §54)</li>
            <li>03:40 - Section 180 BNSS Examination commenced in Chamber</li>
            <li>${elpHours}:${elpRemMins < 10 ? '0' + elpRemMins : elpRemMins} - Active custody duration logged in station diary</li>
            <li>${isExp ? '⛔ STATUTORY REMAND CLOCK EXPIRED' : `${rHours}h ${rRemMins}m Remaining under BNSS §187`}</li>
          </ul>
        </div>
      </div>
    `,
    footer: `
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
        <button class="btn sec sm" data-close>Close Log</button>
        <button class="btn pri sm gold" id="btn-clock-modal-petition" style="font-weight:bold">⚖️ File Remand Extension Petition (BNSS §187)</button>
      </div>
    `
  })

  setTimeout(() => {
    const btnPet = document.getElementById('btn-clock-modal-petition')
    if (btnPet) {
      btnPet.onclick = () => {
        closeModal()
        openRemandExtensionModal(p)
      }
    }
  }, 100)
}
window.openCustodyClockModal = openCustodyClockModal

/**
 * Police Remand Extension Petition Modal (BNSS s.187 / former s.167 CrPC)
 */
function openRemandExtensionModal(p) {
  const s = G.snapshot || {}
  const known = (s.persons || []).filter(x => x.role === 'suspect' || x.role === 'accused' || x.role === 'victim' || x.canvassed || x.consented || x.summoned || x.in_chamber || x.interrogation_ready)
  const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  p = p || known.find(x => x.id === targetId) || (s.persons || [])[0] || { name: 'Accused' }
  const rClock = s.remand_clock || {}
  const remandMins = typeof rClock.remandMinutesRemaining === 'number' ? rClock.remandMinutesRemaining : 1440
  const rHours = Math.floor(remandMins / 60)
  const rRemMins = remandMins % 60

  modal({
    title: '🏛️ Police Remand Extension Petition (BNSS §187 / former s.167 CrPC)',
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:12.5px;color:#f1f5f9">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">&#9878; BNSS Section 187 Statutory Custody Rule</div>
          Police custody beyond 24 hours is illegal without a formal order from the Judicial Magistrate. Submit statutory grounds to request +14 days remand extension.
        </div>
        
        <div class="card" style="padding:10px;background:#0d1219;border:1px solid rgba(245,158,11,0.4);border-radius:4px">
          <div style="font-weight:700;color:var(--gold);margin-bottom:6px">IN THE COURT OF THE CHIEF JUDICIAL MAGISTRATE</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--ink2);line-height:1.6">
            <div>ACCUSED: <b style="color:var(--gold)">${esc(p ? p.name : 'Accused')}</b></div>
            <div>STATUTORY CUSTODY COUNTDOWN: <b style="color:${remandMins <= 180 ? '#ef4444' : '#f59e0b'}">${rHours} HOURS ${rRemMins} MINUTES REMAINING</b></div>
            <div>INVESTIGATING OFFICER: <b>Inspector & IO (blackwatch)</b></div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px">
          <label style="font-size:11px;font-weight:bold;color:var(--gold)">STATUTORY GROUNDS FOR REMAND EXTENSION:</label>
          <select id="remand-grounds-sel" style="background:#090d16;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px;border-radius:4px;font-size:11.5px;font-family:var(--font-mono)">
            <option value="recovery">1. Recover concealed weapons, stolen property & physical exhibits under BSA §23</option>
            <option value="confrontation">2. Confront accused with co-conspirators and FSL forensic lab reports</option>
            <option value="cdr">3. Reconstruct crime scene timeline, digital CDR logs and cell tower pings</option>
          </select>
        </div>
      </div>
    `,
    footer: `
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
        <button class="btn sec sm" data-close>Cancel</button>
        <button class="btn pri sm gold" id="btn-submit-remand-petition" style="font-weight:bold">⚖️ Submit Remand Extension Petition (+14 Days)</button>
      </div>
    `
  })

  setTimeout(() => {
    const btnSubmit = document.getElementById('btn-submit-remand-petition')
    if (btnSubmit) {
      btnSubmit.onclick = async () => {
        const groundsEl = document.getElementById('remand-grounds-sel')
        const groundsText = groundsEl && groundsEl.options[groundsEl.selectedIndex] ? groundsEl.options[groundsEl.selectedIndex].text : 'Recover physical exhibits under BSA §23'
        closeModal()
        try {
          toast('⚖️ Submitting Petition...', 'Appearing before Chief Judicial Magistrate under BNSS §187...', 'warn')
          const res = await api(`/cases/${s.caseId}/interview/remand-extension`, {
            method: 'POST',
            body: JSON.stringify({
              personId: p.id,
              grounds: groundsText,
              requestedDays: 14
            })
          })
          toast('⚖️ Remand Granted', `Magistrate granted +14 Days Police Remand for ${p ? p.name : 'Accused'} under BNSS §187!`, 'good')
          mergeBundle(res)
          render()
        } catch (e) {
          toast('Error', e.message || String(e), 'crit')
        }
      }
    }
  }, 100)
}
window.openRemandExtensionModal = openRemandExtensionModal

/**
 * BSA 2023 Section 23 Panchnama Discovery Memo Drafting Modal
 */
function openDiscoveryMemoModal(p) {
  const s = G.snapshot || {}
  const known = (s.persons || []).filter(x => x.role === 'suspect' || x.role === 'accused' || x.role === 'victim' || x.canvassed || x.consented || x.summoned || x.in_chamber || x.interrogation_ready)
  const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  p = p || known.find(x => x.id === targetId) || (s.persons || [])[0] || { name: 'Accused' }
  const personIvList = (s.interviews || []).filter(i => i.person_id === (p && p.id))
  const iv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]

  modal({
    title: '📜 BSA 2023 Section 23 // Discovery & Recovery Memo',
    body: `
      <div style="display:flex;flex-direction:column;gap:10px;font-size:12px">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">&#9878; Admissibility Principle (BSA s.23)</div>
          Only the distinct voluntary disclosure leading directly to physical discovery of weapon/loot before 2 independent Panch witnesses is admissible in court.
        </div>

        <div>
          <label style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;font-weight:bold;display:block;margin-bottom:3px">Accused Person:</label>
          <input type="text" readonly value="${esc(p ? p.name : 'Accused')}" style="width:100%;padding:6px 8px;background:#0d1219;border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;border-radius:4px;font-weight:bold">
        </div>

        <div>
          <label style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;font-weight:bold;display:block;margin-bottom:3px">Voluntary Statement Leading to Recovery:</label>
          <textarea id="memo-stmt" rows="2" style="width:100%;padding:6px 8px;background:#0d1219;border:1px solid rgba(255,255,255,0.15);color:#f1f5f9;border-radius:4px;font-size:12px">I have concealed the weapon behind the brick kiln in Sector 4. I will lead police there.</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <label style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;font-weight:bold;display:block;margin-bottom:3px">Concealment Location:</label>
            <input type="text" id="memo-loc" value="Abandoned Brick Kiln, Sector 4" style="width:100%;padding:6px 8px;background:#0d1219;border:1px solid rgba(255,255,255,0.15);color:#f1f5f9;border-radius:4px">
          </div>
          <div>
            <label style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;font-weight:bold;display:block;margin-bottom:3px">Object to Recover:</label>
            <input type="text" id="memo-obj" value="Country-made pistol with 2 live cartridges" style="width:100%;padding:6px 8px;background:#0d1219;border:1px solid rgba(255,255,255,0.15);color:#f1f5f9;border-radius:4px">
          </div>
        </div>

        <div>
          <label style="font-size:10.5px;color:var(--ink3);text-transform:uppercase;font-weight:bold;display:block;margin-bottom:3px">Independent Pancha Witnesses (BNSS s.103):</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <input type="text" id="memo-w1" value="Rameshwar Sharma (Local Merchant)" style="padding:5px 8px;background:#0d1219;border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;border-radius:4px;font-size:11px">
            <input type="text" id="memo-w2" value="Anil Gupta (Area Resident)" style="padding:5px 8px;background:#0d1219;border:1px solid rgba(255,255,255,0.1);color:#f1f5f9;border-radius:4px;font-size:11px">
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <button class="btn sm" data-close>Cancel</button>
        <button class="btn pri sm green" id="btn-save-discovery-memo">📜 Execute &amp; Record Panchnama</button>
      </div>
    `
  })

  setTimeout(() => {
    const saveBtn = $('#btn-save-discovery-memo')
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const stmt = $('#memo-stmt') ? $('#memo-stmt').value : ''
        const loc = $('#memo-loc') ? $('#memo-loc').value : ''
        const obj = $('#memo-obj') ? $('#memo-obj').value : ''
        const w1 = $('#memo-w1') ? $('#memo-w1').value : 'Rameshwar Sharma (Local Merchant)'
        const w2 = $('#memo-w2') ? $('#memo-w2').value : 'Anil Gupta (Area Resident)'

        closeModal()
        toast('📜 Executing Panchnama...', 'Drawing recovery memo with 2 Panch witnesses...', 'warn')

        try {
          const res = await api(`/cases/${s.caseId}/interview/discovery-memo`, {
            method: 'POST',
            body: JSON.stringify({
              personId: p.id,
              statementText: stmt,
              targetLocation: loc,
              itemDescription: obj,
              panchaA: w1,
              panchaB: w2
            })
          })
          toast('📜 Panchnama Recorded', `BSA §23 Discovery Memo executed and physical item recovered!`, 'good')
          mergeBundle(res)
          render()
        } catch (e) {
          toast('Error', e.message || String(e), 'crit')
        }
      }
    }
  }, 50)
}
window.openDiscoveryMemoModal = openDiscoveryMemoModal

/* CASE FILE ZERO — views part 3: interrogation, charge sheet, court */

var VIEWS = window.VIEWS = window.VIEWS || {}

VIEWS.interrogation = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  if (!s.fir) return needFir('Examination of suspects requires a registered case.')
  const known = (s.persons || []).filter(p =>
    p.role === 'suspect' ||
    p.role === 'accused' ||
    p.role === 'victim' ||
    p.canvassed ||
    p.consented ||
    (s.consentedWitnesses && s.consentedWitnesses.includes(p.name)) ||
    p.summoned ||
    p.in_chamber ||
    p.interrogation_ready
  )
  if (!known.length) return `<div class="vacant"><i>&#128373;</i><h3>No suspect or witness available</h3><p>Canvass the crime scene locality for witnesses or identify suspects through investigation.</p><div class="flex" style="gap:8px;justify-content:center;margin-top:14px"><button class="btn" data-nav="scene">Crime Scene &amp; Canvassing</button><button class="btn" data-nav="pois">Persons of Interest</button></div></div>`

    const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  const p = known.find(x => x.id === targetId) || known[0]
  const personIvList = (s.interviews || []).filter(i => i.person_id === (p && p.id))
  const iv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]
  const transcript = iv ? (iv.transcript || []) : []
  
  // Dual-Axis Metrics calculation
  const ivArousal = iv ? (typeof iv.arousal === 'number' ? iv.arousal : (iv.tension || 20)) : 20
  const ivResistance = iv ? (typeof iv.resistance === 'number' ? iv.resistance : 65) : 65
  const ivCred = iv ? (typeof iv.police_credibility === 'number' ? iv.police_credibility : (iv.credibility || 60)) : 60
  const ivCoercion = iv ? (iv.coercion || 0) : 0
  const ivTier = iv ? (iv.disclosure_tier || 0) : 0
  
  // Quadrant Decision derivation
  let quadrant = 'stonewalling'
  let quadColor = 'var(--ink3)'
  let quadLabel = 'STONEWALLING'
  if (ivArousal >= 60 && ivResistance < 50) {
    quadrant = 'crack'
    quadColor = '#ef4444'
    quadLabel = '⚡ CRACKING'
  } else if (ivArousal >= 60 && ivResistance >= 50) {
    quadrant = 'hostile'
    quadColor = '#f97316'
    quadLabel = '🔥 HOSTILE'
  } else if (ivArousal < 60 && ivResistance < 50) {
    quadrant = 'cooperative'
    quadColor = '#10b981'
    quadLabel = '🤝 COOPERATIVE'
  } else {
    quadrant = 'stonewalling'
    quadColor = '#64748b'
    quadLabel = '🛡️ STONEWALLING'
  }

  const arousalCol = ivArousal > 70 ? 'var(--red)' : ivArousal > 40 ? 'var(--amber)' : 'var(--green)'
  const resistCol = ivResistance > 70 ? 'var(--red)' : ivResistance > 40 ? 'var(--amber)' : 'var(--green)'
  const coercionCol = ivCoercion > 25 ? '#ef4444' : 'var(--amber)'
  
  const assistName = (s && s.interrogation_assistant) || G.ivAssistant || ''
  if (assistName) {
    if (!G.ivAssistant) G.ivAssistant = assistName
    if (s && !s.interrogation_assistant) s.interrogation_assistant = assistName
  }
  const isAssistingRunning = !!assistName && !G.assistPaused && (G.autoInterrogate || G.assistBusy)
  const isAssistingPaused = !!assistName && !!G.hasInterrogated && (G.assistPaused || (!G.autoInterrogate && !G.assistBusy))
  const activeDirective = iv ? iv.activeDirective : null
  const subNotes = (activeDirective && activeDirective.substantiveNotes) || []
  const subNotesCount = subNotes.length

  // Standardized Micro-Lies for Active Suspect (BSA §145 / §146)
  const suspectLies = (p && p.micro_lies && p.micro_lies.length)
    ? p.micro_lies
    : (iv && iv.micro_lies && iv.micro_lies.length)
    ? iv.micro_lies
    : (function() {
        const list = []
        const pName = (p ? p.name : '').toLowerCase()
        if (p && p.true_alibi && String(p.true_alibi).length > 5) {
          list.push({
            id: `lie-${p.id}-alibi-core`,
            personId: p.id,
            type: 'alibi',
            categoryLabel: 'False Alibi Refutation',
            icon: '🛡️',
            title: 'Alibi Refutation & Crime Scene Presence',
            suspectClaim: p.stated_alibi || 'Maintains complete absence from the crime scene.',
            truthFact: String(p.true_alibi),
            evidenceProof: 'Corroborated Forensic Timestamps & Surveillance Records',
            suggestedTactic: 'contradiction-trap',
            confrontationPrompt: `You claimed: "${p.stated_alibi || 'you were elsewhere'}", but case evidence establishes: "${p.true_alibi}". Explain this contradiction!`,
            statuteRef: 'BSA §145 / §146 (Impeachment by Contradiction)',
            confronted: false
          })
        }
        if (pName.includes('prakash') || pName.includes('gaikwad')) {
          list.push({
            id: `lie-${p.id}-tower`,
            personId: p.id,
            type: 'timeline',
            categoryLabel: 'Cell Tower Mismatch',
            icon: '⏰',
            title: 'Depot Presence vs. Marol Sector Tower Dump',
            suspectClaim: 'Claimed to have been stationed inside the logistics depot all morning on routine dispatch duty.',
            truthFact: 'Cellular tower logs (Sector 4 Marol tower) place mobile 98xxx11223 active along Marol Depot Road between 08:20 and 09:50 AM.',
            evidenceProof: 'Exhibit E — Call Detail Records & Tower Location Dump (BSA §63 certified)',
            suggestedTactic: 'contradiction-trap',
            confrontationPrompt: 'Prakash, you insist you were at the depot all morning, but Exhibit E proves your mobile was registered on the Marol Depot Road tower between 08:20 and 09:50 AM. Why were you on that stretch during the robbery?',
            statuteRef: 'BSA §63 & BSA §145',
            confronted: false
          })
          list.push({
            id: `lie-${p.id}-calls`,
            personId: p.id,
            type: 'accomplice',
            categoryLabel: 'Clandestine Communications',
            icon: '📞',
            title: 'Denied Association with Loader Deepak Tandel',
            suspectClaim: 'Claimed to have no personal contact with loader Deepak Tandel or any heist participants.',
            truthFact: 'Outgoing call at 08:12 AM (18 mins before robbery) and incoming call at 09:41 AM with Deepak Tandel\'s active number 98xxx77045.',
            evidenceProof: 'Exhibit E & Exhibit H — Mobile Handsets & Symmetric CDR Log',
            suggestedTactic: 'evidence-disclosure',
            confrontationPrompt: 'You claim you had no contact with Deepak Tandel, yet your call log shows a call with him at 08:12 AM before the ambush and another at 09:41 AM! What instructions did you give him?',
            statuteRef: 'BSA §8 (Motive, Preparation & Conduct)',
            confronted: false
          })
          list.push({
            id: `lie-${p.id}-shortfall`,
            personId: p.id,
            type: 'financial',
            categoryLabel: 'Financial Motive Concealment',
            icon: '💰',
            title: 'Hidden ₹6.4 Lakh Depot Account Shortfall',
            suspectClaim: 'Stated he had no financial troubles and was merely managing ordinary payroll transit.',
            truthFact: 'Internal audit confirmed a ₹6.4 lakh diesel account shortfall under his direct signature with an impending audit query.',
            evidenceProof: 'Exhibit I — Depot Audit Ledger & Diesel Reconciliation Statement',
            suggestedTactic: 'contradiction-trap',
            confrontationPrompt: 'You told us you have no motive, but company records reveal a ₹6.4 lakh diesel shortfall under your personal charge. The payroll cash was taken to plug your debt, wasn\'t it?',
            statuteRef: 'BSA §8 (Motive)',
            confronted: false
          })
        } else if (pName.includes('deepak') || pName.includes('tandel') || pName.includes('dips')) {
          list.push({
            id: `lie-${p.id}-blood`,
            personId: p.id,
            type: 'forensic',
            categoryLabel: 'Biological Evidence Match',
            icon: '🩸',
            title: 'Culvert Road-Shoulder Bloodstain Serology',
            suspectClaim: 'Denies being present at the culvert embankment and claims no injuries were sustained on the day of the robbery.',
            truthFact: 'White cotton kerchief recovered in the road gravel contains B-positive bloodstains matching Deepak Tandel, whereas the security guard is O-positive.',
            evidenceProof: 'Exhibit C — Bloodstained Cotton Kerchief (FSL Serology Report)',
            suggestedTactic: 'contradiction-trap',
            confrontationPrompt: 'Deepak, you swore you were never at the culvert, but the bloody kerchief found on the road-shoulder has B-positive blood matching your exact blood group! How did your blood get on that road?',
            statuteRef: 'BSA §45 (Expert Scientific Opinion)',
            confronted: false
          })
          list.push({
            id: `lie-${p.id}-pickup`,
            personId: p.id,
            type: 'vehicle',
            categoryLabel: 'Vehicle Sight & Tyres',
            icon: '🛻',
            title: 'Denied Operation of Blue Mahindra Pickup',
            suspectClaim: 'Claims he did not operate or ride in any pickup truck on the morning of the occurrence.',
            truthFact: 'Tyre cast at the culvert embankment matches the distinct 3.2mm shoulder wear of his cousin\'s blue Mahindra pickup, and tea stall CCTV captures him.',
            evidenceProof: 'Exhibit D & F — CCTV Video & Culvert Tyre Impression Cast',
            suggestedTactic: 'evidence-disclosure',
            confrontationPrompt: 'CCTV footage from the tea stall and tyre casts at the culvert match the blue Mahindra pickup you borrowed from your cousin. You were seen at the wheel at 08:15 AM!',
            statuteRef: 'BSA §9 & §63',
            confronted: false
          })
        }
        if (p) p.micro_lies = list
        return list
      })()

  const unconfrontedLies = suspectLies.filter(l => !l.confronted)
  const unconfrontedCount = unconfrontedLies.length

  // Check if a lie/contradiction was detected in the POI's latest response
  const lastSuspectTurn = (transcript || [])
    .slice()
    .reverse()
    .find(t => t.speaker === 'suspect' || t.speaker === 'person' || t.speaker === 'accused')

  const latestTurnLieDetected = !!(lastSuspectTurn && (
    !!lastSuspectTurn.contradiction_noted ||
    !!lastSuspectTurn.contradictionNoted ||
    lastSuspectTurn.evasion_type === 'false-alibi' ||
    lastSuspectTurn.evasion_type === 'contradiction' ||
    lastSuspectTurn.technique === 'false-alibi' ||
    lastSuspectTurn.technique === 'contradiction' ||
    lastSuspectTurn.notes === 'false-alibi' ||
    (typeof lastSuspectTurn.notes === 'string' && lastSuspectTurn.notes.includes('false-alibi')) ||
    !!lastSuspectTurn.is_lie ||
    !!lastSuspectTurn.lie_detected ||
    !!lastSuspectTurn.confronted_lie
  ))

  // Dynamic Defense Counsel Demeanor & Posture Physics (BNSS §41D)
  const lastAdvocateTurn = (transcript || []).slice().reverse().find(t => t.speaker === 'advocate')
  let counselPostureLabel = G.counselPresent ? '⚖️ Counsel: IN' : '⚖️ Counsel: OUT'
  let counselPostureBadge = 'VIGILANT OBSERVER'
  let counselPostureColor = '#38bdf8'
  let counselPillBg = 'rgba(56,189,248,0.15)'

  if (G.counselPresent) {
    if (lastAdvocateTurn && (lastAdvocateTurn.technique === 'objection' || (lastAdvocateTurn.notes && lastAdvocateTurn.notes.includes('OBJECTION')))) {
      counselPostureLabel = '⚖️ Counsel: OBJECTING'
      counselPostureBadge = 'OBJECTION (BNSS §41D)'
      counselPostureColor = '#f87171'
      counselPillBg = 'rgba(239,68,68,0.22)'
    } else if (lastAdvocateTurn && (lastAdvocateTurn.technique === 'recess_demand' || (lastAdvocateTurn.notes && lastAdvocateTurn.notes.includes('RECESS')))) {
      counselPostureLabel = '⚖️ Counsel: RECESS DEMAND'
      counselPostureBadge = 'RECESS DEMAND (§54)'
      counselPostureColor = '#f59e0b'
      counselPillBg = 'rgba(245,158,11,0.22)'
    } else if (lastAdvocateTurn && (lastAdvocateTurn.technique === 'warning' || (lastAdvocateTurn.notes && lastAdvocateTurn.notes.includes('WARNING')))) {
      counselPostureLabel = '⚖️ Counsel: WARNING'
      counselPostureBadge = 'WARNING (ART. 20(3))'
      counselPostureColor = '#fbbf24'
      counselPillBg = 'rgba(251,191,36,0.22)'
    } else {
      counselPostureLabel = '⚖️ Counsel: VIGILANT'
      counselPostureBadge = 'VIGILANT OBSERVER'
      counselPostureColor = '#38bdf8'
      counselPillBg = 'rgba(56,189,248,0.15)'
    }
  }

  // Milestone 3: Dynamic Custody Remand Timer (BNSS §187 / §58)
  const rClock = (s && s.remand_clock) || {}
  const remandMins = typeof rClock.remandMinutesRemaining === 'number' ? rClock.remandMinutesRemaining : 1440
  const rHours = Math.floor(remandMins / 60)
  const rRemMins = remandMins % 60
  const isExp = rClock.isExpired || remandMins <= 0
  const remandTimeLabel = isExp ? '⛔ REMAND EXPIRED' : `⏱️ ${rHours}h ${rRemMins}m Remand`
  const remandPillBg = isExp ? 'rgba(239,68,68,0.25)' : remandMins <= 180 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.22)'
  const remandColor = isExp ? '#ef4444' : remandMins <= 180 ? '#ef4444' : 'var(--gold)'
  const remandBorder = isExp ? '#ef4444' : remandMins <= 180 ? '#ef4444' : 'rgba(245,158,11,0.6)'

  // Dynamic Medical Status (BNSS §54)
  const medStatus = rClock.medicalFitnessStatus || 'fit'
  const medLabel = medStatus === 'critical_evaluation_needed' ? '🩺 Med: CRITICAL' : medStatus === 'requires_attention' ? '🩺 Med: DUE' : '🩺 Med: FIT'
  const medColor = medStatus === 'fit' ? '#34d399' : '#f87171'
  const medBg = medStatus === 'fit' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.2)'

  // Milestone 2: 5-Stage Psychological Composure State derivation
  let composureState = 'composed'
  let composureLabel = 'COMPOSED'
  let composureColor = '#10b981'
  let composureBg = 'rgba(16,185,129,0.15)'
  const isBreakdown = ivArousal >= 80 || (iv && (iv.is_breakdown || iv.breakthrough))
  if (isBreakdown) {
    composureState = 'breakdown'
    composureLabel = '💥 BREAKDOWN'
    composureColor = '#ef4444'
    composureBg = 'rgba(239,68,68,0.25)'
  } else if (ivArousal >= 65) {
    composureState = 'cornered'
    composureLabel = '⚠️ CORNERED'
    composureColor = '#f59e0b'
    composureBg = 'rgba(245,158,11,0.2)'
  } else if (ivArousal >= 45) {
    composureState = 'agitated'
    composureLabel = '⚡ AGITATED'
    composureColor = '#fb923c'
    composureBg = 'rgba(251,146,60,0.18)'
  } else if (ivArousal >= 25) {
    composureState = 'guarded'
    composureLabel = '🛡️ GUARDED'
    composureColor = '#38bdf8'
    composureBg = 'rgba(56,189,248,0.15)'
  }

  const ivMode = G.ivMode || 'chat' // Default mode is focused examination chat

  return `
  <div class="interro-shell">
    <!-- Compact Unified Header with integrated suspect switcher & sub-tabs -->
    <div class="interro-topbar-compact">
      <div class="it-top-row">
        <div class="it-suspect-meta">
          ${p && window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic-sm') : ''}
          <div class="it-s-info">
            <div class="it-s-name-row" id="btn-open-suspect-picker" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.1)" title="Tap to switch suspect or witness">
              <span class="it-s-name" style="font-weight:700;color:var(--gold)">${esc(p ? p.name : '')}</span>
              <span class="it-s-chevron" style="color:var(--gold);font-size:14px;font-weight:bold">▾</span>
            </div>
            <div class="it-s-pills" style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:2px">
              <button type="button" class="tag" id="btn-open-remand-extension" style="cursor:pointer;background:${remandPillBg};color:${remandColor};border:1px solid ${remandBorder};font-size:9px;font-family:var(--font-mono);padding:1px 6px;font-weight:bold" title="Click to File Police Remand Extension Petition before Judicial Magistrate (BNSS §187)">${remandTimeLabel}</button>
              <button type="button" class="tag" id="btn-open-med-exam" style="cursor:pointer;border:1px solid ${medColor};font-size:9px;background:${medBg};color:${medColor};padding:1px 5px;font-weight:bold" title="BNSS s.53/54 Mandatory Medical Examination">${medLabel}</button>
              <button type="button" class="tag" id="btn-toggle-counsel" style="cursor:pointer;border:1px solid ${counselPostureColor};font-size:9px;background:${counselPillBg};color:${counselPostureColor};padding:1px 5px;font-weight:700" title="BNSS s.41D Advocate Presence Toggle">${counselPostureLabel}</button>
              <span class="tag" style="background:${composureBg};color:${composureColor};font-size:9px;padding:1px 6px;border:1px solid ${composureColor};font-weight:bold" title="Psychological Composure Level (5-Stage Model)">${composureLabel}</span>
              ${iv ? `<span style="color:${arousalCol};font-weight:700;font-size:10px" title="Arousal (Psychological Stress)">⚡ S:${ivArousal}%</span>` : ''}
              ${iv ? `<span style="color:${resistCol};font-weight:700;font-size:10px" title="Resistance / Defiance">🛡️ D:${ivResistance}%</span>` : ''}
              ${iv ? `<span class="tag" style="background:rgba(255,255,255,0.06);color:${quadColor};font-size:9px;padding:1px 5px;border:1px solid ${quadColor}">${quadLabel}</span>` : ''}
            </div>
          </div>
        </div>

        ${iv ? `<button type="button" class="it-close-circle-btn btn-iv-close" title="End Interrogation Session (BSA s.23 Close)" aria-label="End Interrogation">✕</button>` : ''}
      </div>

      <div class="it-bottom-row">
        <!-- Modern Unified Capsule Pill Bubble for Co-Examiner, Chat & Notes -->
        <div class="it-unified-capsule">
          <!-- CO-EXAMINER INTEGRATION SECTION -->
          ${assistName ? `
            <button type="button" class="btn-dismiss-assistant it-capsule-action it-integrate-slot it-assist-dismiss-btn" title="Dismiss Co-Examiner (${esc(assistName)})" aria-label="Dismiss Co-Examiner">✕</button>
          ` : `
            <button type="button" class="btn-add-assistant it-capsule-action it-integrate-slot" id="btn-topbar-add-assist" title="Integrate squad member into interrogation">
              Integrate
            </button>
          `}

          <!-- SUBTLE DIVIDER -->
          <div class="it-capsule-divider"></div>

          <!-- TAB SEGMENTS (Chat, Lies, Notes, Bio, Rules, Case Diary) -->
          <div class="it-capsule-tabs" id="iv-mode-toggle">
            <button type="button" class="it-capsule-tab ${ivMode === 'chat' ? 'on' : ''}" data-ivmode="chat">💬 Chat</button>
            <button type="button" class="it-capsule-tab ${ivMode === 'lies' ? 'on' : ''}" data-ivmode="lies" title="Deception & Micro-Lie Ledger">🎯 Lies</button>
            <button type="button" class="it-capsule-tab ${ivMode === 'notes' ? 'on' : ''}" data-ivmode="notes" title="Examination Notes">📋 Notes</button>
            <button type="button" class="it-capsule-tab ${ivMode === 'dossier' ? 'on' : ''}" data-ivmode="dossier">👤 Bio</button>
            <button type="button" class="it-capsule-tab ${ivMode === 'legal' ? 'on' : ''}" data-ivmode="legal">⚖️ Rules</button>
            ${isBreakdown ? `
              <button type="button" class="it-capsule-tab btn-trigger-discovery-memo gold-pulse" title="Execute BSA §23 Discovery Panchnama" style="background:rgba(234,179,8,0.22);color:#fde047;border:1px solid #eab308;font-weight:700">📜 Panchnama</button>
            ` : ''}
            <button type="button" class="it-capsule-tab btn-open-case-diary" id="btn-int-open-diary" title="View Official Case Diary (BNSS §172)">📖 Case Diary</button>
          </div>
        </div>
      </div>
    </div>

    ${ivMode === 'chat' ? `
      <!-- DEDICATED MAXIMUM CHAT WINDOW -->
      <div class="interro-chat-only" style="position:relative;">
        <!-- FLOATING STATIC DEFENSE COUNSEL OBSERVER BADGE (BNSS §41D) -->
        <div id="counsel-corner-badge" style="${G.counselPresent ? 'display:flex' : 'display:none'};position:absolute;top:10px;right:14px;z-index:30;align-items:center;gap:6px;background:rgba(15,23,42,0.94);border:1px solid ${counselPostureColor};padding:3px 8px;border-radius:4px;font-size:9.5px;color:#7dd3fc;box-shadow:0 4px 14px rgba(0,0,0,0.6);backdrop-filter:blur(4px);pointer-events:none" title="Defense Counsel Seated in Visual Range under BNSS §41D">
          <span style="font-size:12px">⚖️</span>
          <div style="line-height:1.15;text-align:left">
            <div style="font-weight:700;color:${counselPostureColor};font-size:8.5px;letter-spacing:0.3px">${counselPostureBadge}</div>
            <div style="font-size:7.5px;color:#cbd5e1;font-family:var(--font-mono)">Adv. R. Sharma (BNSS §41D)</div>
          </div>
        </div>
        ${p && (p.escorted_by || p.in_chamber || p.summoned) ? `
          <div class="helpbox" style="border-color:var(--gold);background:rgba(200,162,74,0.06);margin:0 0 10px 0;padding:8px 12px;font-size:11px;display:flex;align-items:center;justify-content:space-between;border-radius:4px;border-left:3px solid var(--gold)">
            <div>
              <span style="color:var(--gold);font-weight:700">&#128373; CHAMBER CUSTODY:</span> Secured by <b>${esc(p.escorted_by || 'Officer Escort')}</b> under 
              <b>${esc(p.arrested ? 'Section 187 BNSS (Custody Remand)' : 'Section 35 BNSS (Notice of Appearance)')}</b>.
            </div>
            <span class="tag green" style="font-size:9px;padding:1px 5px;background:rgba(40,167,69,0.15);color:#28a745;border:1px solid rgba(40,167,69,0.3)">COMPLIANT</span>
          </div>
        ` : ''}
        ${(latestTurnLieDetected && unconfrontedCount > 0) ? `
          <div class="deception-banner-box auto-vanish-banner">
            <div class="banner-content">
              <span style="font-size:14px">🎯</span>
              <div>
                <span class="banner-badge" style="color:#f87171">Deception Detected</span>
                <span class="banner-desc" style="margin-left:4px">${unconfrontedCount} material contradiction(s) unmasked in testimony</span>
              </div>
            </div>
            <div class="banner-actions">
              <button type="button" class="btn sm" data-ivmode="lies" style="padding:3px 8px;font-size:10px;background:rgba(239,68,68,0.25);border:1px solid #ef4444;color:#fff;cursor:pointer;font-weight:600">Review Lie Ledger ➔</button>
              <button type="button" class="banner-close-btn" onclick="this.closest('.deception-banner-box').style.display='none'" title="Dismiss Alert">✕</button>
            </div>
          </div>
        ` : ''}
        ${isBreakdown ? `
          <div class="breakdown-banner-box auto-vanish-banner">
            <div class="banner-content">
              <span style="font-size:15px">💥</span>
              <div>
                <span class="banner-badge" style="color:#ef4444">Psychological Breakdown</span>
                <span class="banner-desc" style="margin-left:4px">Suspect composure collapsed under evidence pressure. Ready to sign Section 23 Discovery Memo!</span>
              </div>
            </div>
            <div class="banner-actions">
              <button type="button" class="btn pri sm gold btn-trigger-discovery-memo" style="font-size:10px;padding:3px 10px;font-weight:700;white-space:nowrap;background:rgba(234,179,8,0.25);border:1px solid #eab308;color:#fef08a">📜 Execute Panchnama</button>
              <button type="button" class="banner-close-btn" onclick="this.closest('.breakdown-banner-box').style.display='none'" title="Dismiss Alert">✕</button>
            </div>
          </div>
        ` : ''}
        <!-- Chat Transcript Area (Scrollable flex box) -->
        <div class="transcript" id="iv-transcript">
          ${transcript.length ? transcript.map(t => {
            if (t.speaker === 'advocate') {
              return `
                <div class="bubble advocate-intervention-bubble" style="background:#082f49;border:1px solid #0284c7;border-left:4px solid #38bdf8;padding:10px 14px;border-radius:6px;max-width:92%;margin:6px 0;box-shadow:0 4px 16px rgba(0,0,0,0.5)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px">
                    <div style="display:flex;align-items:center;gap:6px">
                      <span style="font-size:14px">⚖️</span>
                      <span style="font-weight:700;color:#7dd3fc;font-size:12px">${esc(t.assistant_name || 'Adv. Rajeshwar Sharma')}</span>
                      <span class="tag" style="background:rgba(56,189,248,0.2);color:#38bdf8;font-size:9px;font-weight:700;border:1px solid #0284c7">DEFENSE COUNSEL (BNSS §41D)</span>
                    </div>
                    <span class="tag" style="background:rgba(239,68,68,0.2);color:#fca5a5;font-size:9px;border:1px solid #ef4444">${esc(t.statute || 'BNSS §41D')}</span>
                  </div>
                  <div style="color:#f0f9ff;font-size:13px;line-height:1.45;margin-bottom:6px">
                    "${esc(t.text)}"
                  </div>
                  ${t.actionHint ? `
                    <div style="font-size:10.5px;color:#cbd5e1;background:rgba(15,23,42,0.6);padding:3px 8px;border-radius:3px;border-left:2px solid #f59e0b">
                      ${esc(t.actionHint)}
                    </div>
                  ` : ''}
                </div>
              `
            }
            return `
            <div class="bubble ${t.speaker === 'officer' ? 'officer' : t.speaker === 'assistant' ? 'officer assistant' : 'suspect'}">
              <div class="who">${t.speaker === 'officer' ? 'You' : t.speaker === 'assistant' ? esc(t.assistant_name || assistName || 'Co-Examiner') + ' (Co-Examiner)' : esc(p.name)}</div>
              ${t.thought_process && t.thought_process.length ? `
                <div class="ai-thought-card is-collapsed" onclick="this.classList.toggle('is-collapsed')">
                  <div class="ai-thought-hdr">
                    <div class="ai-thought-title">
                      <span class="ai-sparkle">✦</span>
                      <span class="ai-status-txt">Thought Process (${t.thought_process.length} steps)</span>
                    </div>
                    <span class="ai-thought-toggle">▼</span>
                  </div>
                  <div class="ai-thought-body">
                    <div class="ai-thought-item">
                      <span class="ai-thought-ico">💡</span>
                      <span class="ai-thought-txt">Thought for ${Math.min(10, Math.max(3, t.thought_process.length * 2))} seconds</span>
                    </div>
                    ${t.thought_process.map(tp => {
                      let ico = '📄';
                      const s = tp.toLowerCase();
                      if (s.includes('fact') || s.includes('timeline') || s.includes('alibi')) ico = '⏱️';
                      else if (s.includes('evident') || s.includes('exhibit') || s.includes('scene') || s.includes('data') || s.includes('cdr')) ico = '🔍';
                      else if (s.includes('statut') || s.includes('bsa') || s.includes('23') || s.includes('law') || s.includes('bnss')) ico = '⚖️';
                      else if (s.includes('tactic') || s.includes('contradict') || s.includes('inquir') || s.includes('target')) ico = '🎯';
                      else if (s.includes('error') || s.includes('retry')) ico = '⚠️';
                      return `
                        <div class="ai-thought-item ${s.includes('error') ? 'warn' : ''}">
                          <span class="ai-thought-ico">${ico}</span>
                          <span class="ai-thought-txt">${esc(tp)}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : ''}
              <div>${renderChatMsg(t.text)}</div>
              ${t.technique || t.notes ? `<div class="meta">${t.technique ? '&#9878; ' + esc(t.technique) : ''}${t.notes ? ' · ' + esc(t.notes) : ''}</div>` : ''}
            </div>`
          }).join('') : `
            <div class="vacant" style="padding:28px 14px">
              <i>&#128172;</i><h3>${esc(p.name)} is seated opposite you</h3>
              <p>Open with an open question. Rapport moves people; an accusation closes them. Your object is a <b>place or a thing</b> that you can physically recover under BSA s.23.</p>
            </div>`}
        </div>

        <!-- Assistant Status Banner (if assistant active) -->
        ${assistName && (G.autoInterrogate || G.assistBusy || G.pausePending || G.stopPending || (activeDirective && activeDirective.status === 'active' && activeDirective.operationalMode === 'silent_scribe')) ? `
          <div style="font-size:11px;color:var(--gold);background:rgba(200,162,74,0.12);padding:4px 10px;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:5px">
              <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
              <span><b>${(activeDirective && activeDirective.operationalMode === 'silent_scribe') ? 'Assisting:' : G.stopPending ? 'Stopping Interrogation:' : G.pausePending ? 'Pausing Interrogation:' : 'Auto-Interrogation Active:'}</b> ${esc(assistName)} ${(activeDirective && activeDirective.operationalMode === 'silent_scribe') ? 'recording examination notes' : G.stopPending ? 'concluding after current response' : G.pausePending ? 'pausing after current response' : 'questioning ' + esc(p.name)}...</span>
            </div>
            ${G.stopPending ? `<span style="color:#ef4444;font-weight:bold;font-size:10.5px">⏹ Withdrawing after response</span>` : G.pausePending ? `<span style="color:#f59e0b;font-weight:bold;font-size:10.5px">⏸ Pausing after response</span>` : ''}
          </div>
        ` : ''}

        <!-- Modern Bottom Input Bar with Single Unified Input Box -->
        ${iv ? `
        <div class="chat-bottom-bar">
          <!-- Compact Tactical Chips (Horizontal Scrolling Bar) -->
          <div class="chips-scroll-bar">
            <!-- Phase 5: Malkhana Vault Tray Drawer Button -->
            <button type="button" class="btn-malkhana-tray gold" id="btn-chip-malkhana-tray" style="border-radius:20px;padding:4px 12px;font-size:12px;border:1px solid var(--gold);color:var(--gold2);font-weight:bold;background:rgba(200,162,74,0.18);cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap" title="Open Malkhana Seized Exhibits Drawer">
              📦 Malkhana Vault Tray (${(s.exhibits || []).filter(e => e.found || e.isUnlocked || e.recovered).length || (s.exhibits || []).length})
            </button>
            <button type="button" class="btn-bsa-memo green" id="btn-chip-bsa23-memo" style="border-radius:20px;padding:4px 12px;font-size:12px;border:1px solid #10b981;color:#34d399;font-weight:bold;background:rgba(16,185,129,0.18);cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap" title="Draft BSA Section 23 Discovery Memo">
              📜 Draft BSA s.23 Memo
            </button>
            <button type="button" class="btn-remand-petition gold" id="btn-chip-remand-petition" style="border-radius:20px;padding:4px 12px;font-size:12px;border:1px solid #f59e0b;color:#fef08a;font-weight:bold;background:rgba(245,158,11,0.25);cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap" title="File Police Remand Extension Petition before Judicial Magistrate (BNSS §187)">
              ⚖️ PETITION MAGISTRATE (BNSS §187)
            </button>
            ${p && p.stated_alibi ? `
              <button type="button" class="prompt-chip" data-prompt-text="You claimed you were at '${esc(p.stated_alibi)}'. Our tower CDR data and CCTV logs directly contradict this. What is your true location?" data-prompt-tactic="contradiction-trap">
                📶 Challenge Alibi
              </button>
            ` : ''}
            ${(s.exhibits || []).filter(e => e.found).map(e => `
              <button type="button" class="prompt-chip" data-prompt-text="We recovered ${esc(e.name)} from ${esc(e.location_found || 'the scene')}. Explain your connection to it or disclose where the remaining items are hidden." data-prompt-tactic="evidence-disclosure">
                🩸 ${esc(e.name.slice(0, 16))}
              </button>
            `).join('')}
            <button type="button" class="prompt-chip cyan" data-prompt-text="Under Section 23 of the BSA, bare confessions prove nothing. Tell me the exact hidden spot where the stolen articles or tools are concealed right now." data-prompt-tactic="legal-warning">
              🗝️ BSA s.23
            </button>
            ${['rapport', 'open-question', 'evidence-disclosure', 'silence', 'timeline-pressure', 'contradiction-trap', 'legal-warning'].map(t => `<button type="button" class="gear-chip ${t === 'silence' ? 'cyan' : ''}" data-tactic="${t}">${t === 'silence' ? '🤫 ' : ''}${esc(t.replace('-', ' '))}</button>`).join('')}
          </div>

          <!-- Single Unified Input Field with Top Tag Header and Full-Width Input Row -->
          <div class="chat-input-wrapper">
            ${assistName ? `
              <div class="chat-input-header">
                <span class="iv-inline-member-badge" title="Active Member: ${esc(assistName)}">
                  <span class="iv-badge-dot" style="${isAssistingPaused ? 'background:#f59e0b;box-shadow:0 0 5px #f59e0b;' : ''}"></span>@${esc(assistName.replace(/^(JC|Insp\.|Head Constable)\s+/, ''))}${isAssistingPaused ? ' (Paused)' : ''}
                </span>
              </div>
            ` : ''}
            <div class="chat-input-row">
              <textarea id="iv-in" class="chat-textarea" rows="1" placeholder="${assistName ? (isAssistingPaused ? `Ask suspect directly (${esc(assistName.replace(/^(JC|Insp\.|Head Constable)\s+/, ''))} paused)...` : `Direct ${esc(assistName.replace(/^(JC|Insp\.|Head Constable)\s+/, ''))}...`) : 'Type what you say, or ask a question...'}"></textarea>
              
              <div class="chat-input-actions" id="iv-actions-bar">
                ${assistName && G.hasInterrogated ? `
                  <button type="button" class="btn-toggle-pause-iv iv-action-btn" title="${isAssistingRunning ? 'Pause Interrogation' : 'Resume Interrogation'}" style="color:${isAssistingRunning ? '#f59e0b' : '#38bdf8'}">
                    ${isAssistingRunning ? '⏸' : '▶'}
                  </button>
                ` : ''}
                ${assistName ? `
                  <button type="button" class="btn-stop-iv-assistant iv-action-btn stop" title="Stop Interrogation and Withdraw Officer" style="color:#f97316">
                    ⏹
                  </button>
                ` : ''}
                <button type="button" id="iv-send" class="chat-send-btn" title="${assistName && !isAssistingPaused ? 'Send Directive to Officer' : 'Put the Question'}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>` : `
        <div class="talk-in center" style="padding:16px"><button class="btn pri" id="iv-start2">Commence examination of ${esc(p.name)}</button><div class="dim" style="font-size:11.5px;margin-top:4px">A session costs one day off your clock.</div></div>`}
      </div>
    ` : ivMode === 'lies' ? `
      <!-- DECEPTION & MICRO-LIE LEDGER -->
      <div style="padding:16px;max-width:880px;margin:0 auto;width:100%;overflow-y:auto;flex:1">
        <div class="card" style="border-left:4px solid #ef4444">
          <div class="card-h" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="color:#f87171;display:flex;align-items:center;gap:6px">🎯 Deception &amp; Micro-Lie Ledger</h3>
              <div class="dim" style="font-size:12px;margin-top:2px">Audit contradictions between ${esc(p.name)}'s testimony and corroborated case facts (BSA §145 / §146).</div>
            </div>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn pri sm" id="btn-return-chat-lies">💬 Return to Interrogation</button>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
            <span class="tag" style="background:#1e293b;color:#facc15;font-size:11px;padding:3px 8px">Total Lies: ${suspectLies.length}</span>
            <span class="tag" style="background:rgba(239,68,68,0.15);color:#f87171;font-size:11px;padding:3px 8px">Pending Confrontation: ${unconfrontedCount}</span>
            <span class="tag" style="background:rgba(16,185,129,0.15);color:#34d399;font-size:11px;padding:3px 8px">Confronted &amp; Impeached: ${suspectLies.length - unconfrontedCount}</span>
          </div>

          ${suspectLies.length ? `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${suspectLies.map(lie => `
                <div class="deception-card ${lie.confronted ? 'is-confronted' : 'is-pending'}" style="background:#0b1120;border:1px solid ${lie.confronted ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'};border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:8px">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
                    <div style="display:flex;align-items:center;gap:6px">
                      <span style="font-size:14px">${esc(lie.icon || '🎯')}</span>
                      <span class="tag" style="font-size:10px;text-transform:uppercase;font-weight:700;${lie.confronted ? 'background:rgba(16,185,129,0.2);color:#34d399' : 'background:rgba(239,68,68,0.2);color:#f87171'}">${esc(lie.categoryLabel || 'CONTRADICTION')}</span>
                      <span style="font-weight:700;font-size:13px;color:#f1f5f9">${esc(lie.title)}</span>
                    </div>
                    <div>
                      ${lie.confronted ? `
                        <span class="tag green" style="font-size:10px;padding:3px 8px">✓ CONFRONTED &amp; IMPEACHED</span>
                      ` : `
                        <button type="button" class="btn sm pri btn-confront-lie" data-lie-id="${esc(lie.id)}" data-prompt="${esc(lie.confrontationPrompt)}" style="background:#ef4444;border-color:#f87171;color:#fff;font-weight:700;font-size:11px;padding:4px 10px;cursor:pointer">
                          ⚡ CONFRONT WITH EVIDENCE
                        </button>
                      `}
                    </div>
                  </div>

                  <div style="display:grid;grid-template-columns:1fr;gap:6px;font-size:12px">
                    <div style="background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;padding:6px 10px;border-radius:2px">
                      <div style="font-weight:700;color:#fca5a5;font-size:10px;text-transform:uppercase;margin-bottom:2px">Suspect Stated Claim:</div>
                      <div style="color:#e2e8f0;font-style:italic">"${esc(lie.suspectClaim)}"</div>
                    </div>
                    <div style="background:rgba(16,185,129,0.06);border-left:3px solid #10b981;padding:6px 10px;border-radius:2px">
                      <div style="font-weight:700;color:#6ee7b7;font-size:10px;text-transform:uppercase;margin-bottom:2px">Corroborated Case Truth:</div>
                      <div style="color:#e2e8f0">${esc(lie.truthFact)}</div>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:10.5px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px">
                    <div>📁 <b>Evidence Proof:</b> <span style="color:var(--gold)">${esc(lie.evidenceProof)}</span></div>
                    <div>⚖️ <span style="font-family:var(--font-mono);color:#38bdf8">${esc(lie.statuteRef || 'BSA §145')}</span></div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="vacant" style="padding:32px 16px;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">🎯</div>
              <h3 style="color:var(--gold);margin-bottom:6px">No Deceptions Logged Yet</h3>
              <p style="max-width:520px;margin:0 auto;font-size:12.5px;color:var(--ink2);line-height:1.5">
                As you examine ${esc(p.name)}, statements conflicting with timeline logs, CCTV, and physical exhibits will appear here.
              </p>
            </div>
          `}
        </div>
      </div>
    ` : ivMode === 'notes' ? `
      <!-- SUBSTANTIVE INTERROGATION NOTES & SCRIBE BOARD -->
      <div style="padding:16px;max-width:880px;margin:0 auto;width:100%;overflow-y:auto;flex:1">
        <div class="card" style="border-left:4px solid var(--gold)">
          <div class="card-h" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="color:var(--gold2)">📋 Examination Notes</h3>
              <div class="dim" style="font-size:12px;margin-top:2px">Observations, admissions, and contradictions recorded during the examination of ${esc(p.name)}.</div>
            </div>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn pri sm" id="btn-return-chat-notes">💬 Back to Chat</button>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
            <span class="tag" style="background:#1e293b;color:#facc15;font-size:11px;padding:3px 8px">Total Notes: ${subNotes.length}</span>
            <span class="tag" style="background:rgba(16,185,129,0.15);color:#34d399;font-size:11px;padding:3px 8px">Leads: ${subNotes.filter(n => n.category === 'lead').length}</span>
            <span class="tag" style="background:rgba(239,68,68,0.15);color:#f87171;font-size:11px;padding:3px 8px">Contradictions: ${subNotes.filter(n => n.category === 'contradiction').length}</span>
            <span class="tag" style="background:rgba(234,179,8,0.15);color:#fde047;font-size:11px;padding:3px 8px">Admissions: ${subNotes.filter(n => n.category === 'admission').length}</span>
          </div>

          ${subNotes.length ? `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${subNotes.map((n) => {
                const isPinned = n.pinned || (G.pinnedNotes && G.pinnedNotes.has(n.id))
                return `
                <div class="interro-note-card cat-${esc(n.category || 'note')} ${isPinned ? 'is-pinned' : ''}" data-note-card-id="${esc(n.id)}">
                  <div class="inc-header">
                    <div class="inc-meta">
                      <span class="tag" style="font-size:10px;text-transform:uppercase;font-weight:bold;${
                        n.category === 'contradiction' ? 'background:rgba(239,68,68,0.2);color:#f87171' :
                        n.category === 'lead' ? 'background:rgba(16,185,129,0.2);color:#34d399' :
                        n.category === 'admission' ? 'background:rgba(245,158,11,0.2);color:#fbbf24' :
                        n.category === 'demeanor' ? 'background:rgba(168,85,247,0.2);color:#c084fc' :
                        'background:rgba(56,189,248,0.2);color:#38bdf8'
                      }">${esc(n.category || 'NOTE')}</span>
                      <span style="font-size:11px;color:var(--ink3);font-family:var(--font-mono)">🕒 ${esc(n.gameTime || '')}${n.timestamp ? ` (${esc(n.timestamp)})` : ''}</span>
                      <span style="font-size:11px;color:var(--gold);font-weight:600">✍️ ${esc(n.author || 'Co-Examiner')}</span>
                    </div>
                    <div class="inc-action-slot">
                      ${isPinned ? `
                        <span class="inc-pinned-badge">📌 PINNED TO CASE DIARY</span>
                      ` : `
                        <button type="button" class="btn-pin-diary" data-note-id="${esc(n.id)}" title="Pin this substantive note to official Case Diary (BNSS §172)">📌 Pin to Case Diary</button>
                      `}
                    </div>
                  </div>
                  <div class="inc-body">
                    ${esc(n.text)}
                  </div>
                  <div class="inc-footer">
                    ⚖️ <b>Evidentiary Relevance:</b> ${esc(n.relevance || 'Recorded during custodial interrogation')}
                  </div>
                </div>
              `}).join('')}
            </div>
          ` : `
            <div class="vacant" style="padding:32px 16px;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">📝</div>
              <h3 style="color:var(--gold);margin-bottom:6px">No Notes Recorded</h3>
              <p style="max-width:520px;margin:0 auto;font-size:12.5px;color:var(--ink2);line-height:1.5">
                Statements, admissions, contradictions, and physical discoveries recorded during examination will appear here.
              </p>
            </div>
          `}
        </div>
      </div>
    ` : ivMode === 'dossier' ? `
      <!-- SUSPECT DETAILS & SQUAD WORKSPACE -->
      <div style="padding:16px;max-width:840px;margin:0 auto;width:100%;overflow-y:auto;flex:1">
        <div class="card">
          <div class="card-h"><h3 style="color:var(--gold2)">📋 Suspect Profile &amp; Psychological Evaluation</h3></div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap">
            ${p && window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic') : ''}
            <div>
              <div style="font-size:18px;font-weight:700;color:#fff">${esc(p ? p.name : '')} (${esc(p ? p.role : '')})</div>
              <div style="font-size:12px;color:var(--ink3);margin-top:2px">${esc(p ? (p.profile || {}).summary || '' : '')}</div>
            </div>
          </div>
          ${iv ? `
          <div class="grid g3" style="gap:10px;margin-bottom:12px">
            <div class="meter"><div class="meter-l"><span>⚡ Arousal</span><span>${ivArousal}/100</span></div><div class="meter-b"><div class="meter-f" style="width:${ivArousal}%;background:${arousalCol}"></div></div></div>
            <div class="meter"><div class="meter-l"><span>🛡️ Resistance</span><span>${ivResistance}/100</span></div><div class="meter-b"><div class="meter-f" style="width:${ivResistance}%;background:${resistCol}"></div></div></div>
            <div class="meter"><div class="meter-l"><span>★ Credibility</span><span>${Math.round(ivCred)}/100</span></div><div class="meter-b"><div class="meter-f" style="width:${ivCred}%;background:var(--cyan)"></div></div></div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:6px;padding:8px 12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:var(--ink3)">Current Interrogation Quadrant:</span>
            <span class="tag" style="background:rgba(255,255,255,0.08);color:${quadColor};font-size:11px;font-weight:700;padding:2px 8px;border:1px solid ${quadColor}">${quadLabel}</span>
          </div>
          <div class="rule" style="margin:12px 0"></div>
          <div class="kv"><span class="k">Emotional State</span><span class="v"><span class="tag amber">${esc(iv.emotional_state)}</span></span></div>
          <div class="kv"><span class="k">Legal Custody Basis</span><span class="v">${p && p.arrested ? 'Section 187 BNSS (Arrest / Custody Remand)' : 'Section 35 BNSS (Notice of Appearance)'}</span></div>
          <div class="kv"><span class="k">Escorting Officer</span><span class="v"><b>${esc(p.escorted_by || 'Direct IO Summon')}</b></span></div>
          ` : `<div class="dim" style="font-size:12px;margin:10px 0">Suspect has not yet been examined.</div>`}
        </div>

        ${iv ? `
        <!-- CUSTODY LEDGER CARD (§9 TASK 7) -->
        <div class="card" style="border-left:3px solid var(--cyan);margin-top:12px">
          <div class="card-h" style="display:flex;align-items:center;justify-content:space-between">
            <h3 style="color:var(--cyan)">📋 Custody &amp; Statutory Ledger</h3>
            <span class="tag" style="background:#1e293b;color:var(--cyan);font-size:11px">Session #${iv.session_no || 1}</span>
          </div>
          
          <div class="grid g2" style="gap:12px;margin-bottom:12px">
            <div class="meter">
              <div class="meter-l">
                <span>⚠️ Coercion Exposure</span>
                <span style="color:${coercionCol};font-weight:700">${ivCoercion}/100</span>
              </div>
              <div class="meter-b">
                <div class="meter-f" style="width:${ivCoercion}%;background:${coercionCol}"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${ivCoercion > 25 ? `
                <span class="tag red" style="font-size:10px;padding:3px 8px;font-weight:bold">⚠️ TAINT EXPOSURE RISK (Coercion > 25)</span>
              ` : `
                <span class="tag green" style="font-size:10px;padding:3px 8px">✓ CLEAN STATUTORY PROCEDURE</span>
              `}
            </div>
          </div>

          <div style="margin-bottom:10px">
            <div style="font-size:11.5px;color:var(--ink3);margin-bottom:5px">Disclosure Tiers Unlocked:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="tag ${ivTier >= 0 ? 'amber' : 'dim'}" style="font-size:10px">T0: Denial</span>
              <span class="tag ${ivTier >= 1 ? 'green' : 'dim'}" style="font-size:10px">T1: Peripheral Presence</span>
              <span class="tag ${ivTier >= 2 ? 'cyan' : 'dim'}" style="font-size:10px">T2: Timeline &amp; Events</span>
              <span class="tag ${ivTier >= 3 ? 'gold' : 'dim'}" style="font-size:10px">T3: Incriminating Admission</span>
              <span class="tag ${ivTier >= 4 ? 'red' : 'dim'}" style="font-size:10px;font-weight:700">T4: Locational Discovery (s.23)</span>
            </div>
          </div>

          <div class="rule" style="margin:10px 0"></div>

          <div class="grid g3" style="gap:8px;text-align:center">
            <div style="background:#0d121a;padding:8px;border-radius:4px;border:1px solid var(--line)">
              <div style="font-size:10px;color:var(--ink3);text-transform:uppercase">Contradictions</div>
              <div style="font-size:16px;font-weight:700;color:var(--gold);margin-top:2px">${iv.contradictions_found || (p && p.contradictions ? p.contradictions.length : 0)}</div>
            </div>
            <div style="background:#0d121a;padding:8px;border-radius:4px;border:1px solid var(--line)">
              <div style="font-size:10px;color:var(--ink3);text-transform:uppercase">Regressions</div>
              <div style="font-size:16px;font-weight:700;color:${(iv.regressions || 0) > 0 ? 'var(--red)' : 'var(--green)'};margin-top:2px">${iv.regressions || 0}</div>
            </div>
            <div style="background:#0d121a;padding:8px;border-radius:4px;border:1px solid var(--line)">
              <div style="font-size:10px;color:var(--ink3);text-transform:uppercase">BSA s.23 Facts</div>
              <div style="font-size:16px;font-weight:700;color:#6fd39b;margin-top:2px">${(iv.admissible || []).length}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="card" style="border-left:3px solid var(--gold);margin-top:12px">
          <div class="card-h"><h3>👥 Co-Examiner &amp; Squad Directives</h3></div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <label style="font-size:12px;font-weight:700;color:var(--gold)">Select Assistant Officer:</label>
            <select id="sel-iv-assistant" style="padding:4px 8px;font-size:12px;background:#151c27;color:#fff;border:1px dashed var(--gold);border-radius:4px">
              <option value="">${assistName ? 'Change Officer (Currently: ' + esc(assistName) + ')' : '+ Request Officer to Assist'}</option>
              <option value="JC Ravi Deshmukh">JC Ravi Deshmukh (Assistant)</option>
              <option value="Preeti Nair">Preeti Nair (Cyber Spec)</option>
              <option value="Insp. M. Sawant">Insp. M. Sawant (Senior)</option>
              <option value="Head Constable Kadam">Head Constable Kadam</option>
            </select>
            ${assistName ? `<button type="button" class="btn xs dgr" id="btn-leave-iv-assistant">&#10005; Dismiss Officer</button>` : ''}
          </div>
          ${assistName ? `
            <div style="background:#0d121a;padding:10px;border-radius:6px;border:1px solid var(--line);margin-top:8px">
              <div style="font-size:12px;font-weight:700;color:var(--gold2);margin-bottom:6px">Direct ${esc(assistName)}</div>
              <div style="display:flex;align-items:center;background:#05080e;border:1px solid var(--line);border-radius:6px;padding:2px 8px;width:100%">
                <input type="text" id="iv-assist-in" style="flex:1;font-size:12px;padding:6px 0;background:transparent;border:none;outline:none;color:#fff" placeholder="Direct ${esc(assistName)}...">
                <div style="display:flex;align-items:center;gap:3px;margin-left:6px">
                  <button type="button" id="iv-assist-send" title="Send Direction to ${esc(assistName)}" style="background:none;border:none;color:var(--gold);cursor:pointer;padding:4px 5px;display:inline-flex;align-items:center;justify-content:center;transition:opacity 0.15s">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                  ${G.hasInterrogated ? `
                    <button type="button" class="btn-toggle-pause-iv" title="${(G.autoInterrogate || G.assistBusy) && !G.pausePending && !G.stopPending ? 'Pause Interrogation' : 'Resume Interrogation'}" style="background:none;border:none;color:${(G.autoInterrogate || G.assistBusy) && !G.pausePending && !G.stopPending ? '#f59e0b' : '#3b82f6'};cursor:pointer;padding:4px 5px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;line-height:1;transition:transform 0.15s">
                      ${(G.autoInterrogate || G.assistBusy) && !G.pausePending && !G.stopPending ? '⏸' : '▶'}
                    </button>
                  ` : ''}
                  <button type="button" class="btn-stop-iv-assistant" title="Stop Interrogation and Withdraw Officer" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:4px 5px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;line-height:1;transition:transform 0.15s">
                    ⏹
                  </button>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <button type="button" class="btn pri sm" id="btn-return-chat">💬 Return to Examination Chat</button>
          <button type="button" class="btn sec sm" data-nav="pois">📂 View Full POI Dossier</button>
        </div>
      </div>
    ` : `
      <!-- STATUTORY RULES VIEW -->
      <div style="padding:16px;max-width:840px;margin:0 auto;width:100%;overflow-y:auto;flex:1">
        <div class="card" style="border-left:4px solid var(--gold)">
          <div class="card-h"><h3 style="color:var(--gold)">⚖️ Bharatiya Sakshya Adhiniyam, 2023 — Section 23 Rules</h3></div>
          <div class="reader" style="font-size:13px;line-height:1.65;color:var(--ink2)">
            <p><b>Statutory Principle:</b> Confessions made by an accused while in police custody are completely inadmissible in a court of law.</p>
            <p><b>The Section 23 Discovery Exception:</b> Only information that <i>distinctly leads to the discovery of a concrete physical fact</i> (a hidden weapon, stolen articles, vehicle, key, digital device, or body) is admissible.</p>
            <h4 style="margin-top:14px;color:var(--gold2)">Investigative Discipline</h4>
            <ul style="padding-left:18px;margin-top:6px">
              <li>Do not press for bare oral confessions. Focus on extracting specific locations or hidden tools.</li>
              <li>When a disclosure is made, immediately record a disclosure memo and execute a recovery before two independent local witnesses (Panchas) under BNSS s.103.</li>
            </ul>
          </div>
          <button type="button" class="btn pri sm" id="btn-return-chat2" style="margin-top:14px">💬 Back to Interrogation Chat</button>
        </div>
      </div>
    `}
  </div>`
}

VIEWS.interrogation.after = function () {
  const s = G.snapshot; if (!s) return
  const h = $('#iv-help'); if (h) h.onclick = helpForScreen
  const sel = $('#iv-sel'); if (sel) sel.onchange = () => { G.ivTarget = Number(sel.value); G.iv = null; G.ivTranscriptScrollTop = null; G.ivTranscriptWasAtBottom = true; render() }

  const known = (s.persons || []).filter(p =>
    p.role === 'suspect' ||
    p.role === 'accused' ||
    p.role === 'victim' ||
    p.canvassed ||
    p.consented ||
    (s.consentedWitnesses && s.consentedWitnesses.includes(p.name)) ||
    p.summoned ||
    p.in_chamber ||
    p.interrogation_ready
  )
  const targetId = G.ivTarget || (G.iv && G.iv.person) || (known[0] && known[0].id)
  const p = known.find(x => x.id === targetId) || known[0]
  const personIvList = (s.interviews || []).filter(i => i.person_id === (p && p.id))
  const iv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]

  // Bind Suspect Picker Dropdown Button
  const btnPicker = $('#btn-open-suspect-picker')
  if (btnPicker) {
    btnPicker.onclick = () => openSuspectPickerModal(known, p && p.id)
  }

  // Bind Malkhana Vault Tray Button
  const btnMalkhana = $('#btn-chip-malkhana-tray')
  if (btnMalkhana) {
    btnMalkhana.onclick = () => openMalkhanaVaultTrayModal(p, iv)
  }

  // Bind BSA s.23 Discovery Memo Button
  const btnMemo = $('#btn-chip-bsa23-memo')
  if (btnMemo) {
    btnMemo.onclick = () => openDiscoveryMemoModal(p, iv)
  }

  // Bind Medical Fitness Exam Button
  const btnMed = $('#btn-open-med-exam')
  if (btnMed) {
    btnMed.onclick = () => openMedicalExamModal(p)
  }

  // Bind Custody Clock & Remand Extension Petition Buttons (BNSS §58 & §187)
  const btnRemandHeader = $('#btn-open-remand-extension')
  if (btnRemandHeader) {
    btnRemandHeader.onclick = () => openCustodyClockModal(p)
  }

  const btnChipRemand = $('#btn-chip-remand-petition')
  if (btnChipRemand) {
    btnChipRemand.onclick = () => openRemandExtensionModal(p)
  }

  // Bind Statutory Counsel Toggle (BNSS §41D)
  const btnCounsel = $('#btn-toggle-counsel')
  if (btnCounsel) {
    btnCounsel.onclick = async () => {
      G.counselPresent = !G.counselPresent
      try {
        const res = await api(`/cases/${s.caseId}/interview/advocate-toggle`, {
          method: 'POST',
          body: JSON.stringify({
            personId: p && p.id,
            interviewId: iv && iv.id,
            advocatePresent: G.counselPresent
          })
        })
        if (res && res.remand_clock) {
          s.remand_clock = res.remand_clock
        }
        mergeBundle(res)
      } catch (e) {
        // Local fallback
      }

      toast(
        G.counselPresent ? '⚖️ Counsel Seated' : '⚖️ Counsel Withdrawn',
        G.counselPresent ? 'Advocate present during interrogation in visual range under BNSS s.41D.' : 'Counsel withdrawn from interrogation chamber.',
        'good'
      )
      render()
    }
  }

  // Bind Quick Panchnama trigger from Breakdown Banner
  $$('.btn-trigger-discovery-memo').forEach(btn => {
    btn.onclick = () => openDiscoveryMemoModal(p, iv)
  })

  // Bind sub-tab mode toggles
  $$('[data-ivmode]').forEach(b => b.onclick = () => {
    G.ivMode = b.dataset.ivmode || 'chat'
    render()
  })
  const btnGotoDossier = $('#btn-goto-dossier')
  if (btnGotoDossier) btnGotoDossier.onclick = () => { G.ivMode = 'dossier'; render() }
  const btnReturnChat = $('#btn-return-chat')
  if (btnReturnChat) btnReturnChat.onclick = () => { G.ivMode = 'chat'; render() }
  const btnReturnChat2 = $('#btn-return-chat2')
  if (btnReturnChat2) btnReturnChat2.onclick = () => { G.ivMode = 'chat'; render() }
  const btnReturnChatNotes = $('#btn-return-chat-notes')
  if (btnReturnChatNotes) btnReturnChatNotes.onclick = () => { G.ivMode = 'chat'; render() }
  const btnReturnChatLies = $('#btn-return-chat-lies')
  if (btnReturnChatLies) btnReturnChatLies.onclick = () => { G.ivMode = 'chat'; render() }

  // Bind one-click lie confrontation buttons
  $$('.btn-confront-lie').forEach(btn => {
    btn.onclick = () => {
      const prompt = btn.dataset.prompt || ''
      G.ivMode = 'chat'
      tactic = 'contradiction-trap'
      render()
      const ta = document.getElementById('iv-in')
      if (ta) {
        ta.value = prompt
        if (typeof fitIvTextarea === 'function') fitIvTextarea()
        ta.focus()
        ta.style.borderColor = '#ef4444'
        ta.style.boxShadow = '0 0 12px rgba(239,68,68,0.5)'
      }
      $$('[data-tactic]').forEach(x => x.classList.toggle('on', x.dataset.tactic === 'contradiction-trap'))
      const note = document.getElementById('iv-note')
      if (note) note.textContent = 'Contradiction Prompt Loaded: Impeachment Trap (BSA §145)'
      toast('🎯 Lie Loaded for Confrontation', 'Review the question and click Send to confront suspect.', 'good')
    }
  })

  // Bind Clear Directive buttons
  $$('.btn-clear-directive').forEach(btn => {
    btn.onclick = async () => {
      try {
        const activePerson = (s.persons || []).find(x => x.id === (G.iv && G.iv.person)) || (s.persons || []).find(p => p.role === 'suspect') || (s.persons || [])[0]
        const r = await api(`/cases/${s.caseId}/interview/directive/clear`, {
          method: 'POST',
          body: JSON.stringify({ personId: activePerson && activePerson.id })
        })
        G.autoInterrogate = false
        G.pausePending = false
        G.stopPending = false
        if (G.autoInterrogateTimer) {
          clearTimeout(G.autoInterrogateTimer)
          G.autoInterrogateTimer = null
        }
        mergeBundle(r)
        toast('Officer Standing By', 'Co-examiner standing by.', 'good')
        render()
      } catch (e) {
        toast('Error', e.message || String(e), 'crit')
      }
    }
  })

  // Bind Case Diary Modal Button
  const diaryModalBtn = $('#btn-int-open-diary')
  if (diaryModalBtn) {
    diaryModalBtn.onclick = () => openCaseDiaryModal()
  }

  // Bind Pin to Case Diary buttons
  $$('.btn-pin-diary').forEach(btn => {
    btn.onclick = async () => {
      const noteId = btn.dataset.noteId
      const card = btn.closest('.interro-note-card')
      const slot = card ? card.querySelector('.inc-action-slot') : null
      
      // Instantly freeze, set slight transparency and remove the button
      if (card) {
        card.classList.add('is-pinned')
      }
      if (slot) {
        slot.innerHTML = `<span class="inc-pinned-badge">📌 PINNED TO CASE DIARY</span>`
      } else {
        btn.remove()
      }

      if (!G.pinnedNotes) G.pinnedNotes = new Set()
      G.pinnedNotes.add(noteId)

      const activePerson = (s.persons || []).find(x => x.id === (G.iv && G.iv.person)) || (s.persons || []).find(p => p.role === 'suspect') || (s.persons || [])[0]
      const activeIv = (s.interviews || []).find(i => (G.iv && i.id === G.iv.id) || i.person_id === (activePerson && activePerson.id))
      const notes = (activeIv?.activeDirective?.substantiveNotes) || []
      const foundNote = notes.find(n => n.id === noteId)
      if (foundNote) {
        foundNote.pinned = true
        try {
          const r = await api(`/cases/${s.caseId}/interview/note/pin`, {
            method: 'POST',
            body: JSON.stringify({ note: foundNote })
          })
          mergeBundle(r)
          toast('Pinned to Case Diary', 'Substantive note recorded in statutory case diary (BNSS §172).', 'good')
        } catch (e) {
          toast('Error', e.message || String(e), 'crit')
        }
      }
    }
  })

  const openSelectAssistantModal = () => {
    const team = G.team || []
    const availableOfficers = [
      ...team,
      { id: 'ravi', name: 'Junior Constable Ravi Deshmukh', role: 'field', speciality: 'Assistant to IO · Statutory Procedure & BSA §23', skill: 7 },
      { id: 'preeti', name: 'Preeti Nair', role: 'cyber', speciality: 'Cyber Operative · Digital & CDR Evidence Analysis', skill: 9 },
      { id: 'dhanraj', name: 'Constable Dhanraj', role: 'field', speciality: 'Canvassing & Field Informants Network', skill: 7 },
      { id: 'sawant', name: 'Insp. M. Sawant', role: 'senior', speciality: 'Senior Mentor · Psychological Leverage', skill: 9 },
      { id: 'kadam', name: 'Head Constable Kadam', role: 'field', speciality: 'Local Informant Network & Alibi Testing', skill: 6 }
    ]
    const seen = new Set()
    const uniqueOfficers = []
    for (const off of availableOfficers) {
      if (!seen.has(off.name)) {
        seen.add(off.name)
        uniqueOfficers.push(off)
      }
    }

    modal({
      title: '👥 Integrate Squad Member as Co-Examiner',
      body: `<div class="reader">
        <p style="font-size:13px;color:var(--ink2);margin-bottom:12px;line-height:1.5">
          Select an officer from your investigative team to bring into the Interrogation Chamber. Co-examiners leverage their specialized capabilities (cyber/forensics/field intelligence) to question the accused, probe contradictions, and pinpoint locatable discoveries under BSA §23.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;padding-right:4px">
          ${uniqueOfficers.map(m => `
            <div class="poi" style="padding:10px 12px;cursor:pointer;background:rgba(22,33,54,0.6);border:1px solid rgba(200,162,74,0.25);border-radius:6px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s" onclick="window.__chooseAssistant('${esc(m.name)}')">
              <div style="display:flex;align-items:center;gap:10px">
                ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(m, m.role || 'field', m.portrait_key, 'poi-pic-sm') : `<div class="poi-pic-sm"><span class="init">${esc(m.name.slice(0, 2))}</span></div>`}
                <div>
                  <div style="font-size:13.5px;font-weight:700;color:var(--gold2)">${esc(m.name)}</div>
                  <div style="font-size:11.5px;color:#94a3b8">${esc(m.speciality || m.role || 'Investigator')}</div>
                </div>
              </div>
              <button type="button" class="btn sm pri" style="padding:5px 12px;font-size:11.5px">Select ➔</button>
            </div>
          `).join('')}
        </div>
      </div>`,
      footer: `<button class="btn" data-close>Cancel</button>`
    })

    window.__chooseAssistant = (name) => {
      G.ivAssistant = name
      if (s) s.interrogation_assistant = name
      G.hasInterrogated = false
      G.assistPaused = false
      G.autoInterrogate = false
      G.pausePending = false
      G.stopPending = false
      const closeBtn = document.querySelector('[data-close]')
      if (closeBtn) closeBtn.click()
      if (s && s.caseId) {
        api(`/cases/${s.caseId}/interview/assistant`, {
          method: 'POST',
          body: JSON.stringify({ assistantName: name })
        }).catch(() => {})
      }
      render()
    }
  }

  $$('.btn-add-assistant, .btn-switch-assistant').forEach(b => b.onclick = openSelectAssistantModal)
  $$('.btn-dismiss-assistant').forEach(b => b.onclick = () => {
    G.ivAssistant = null
    if (s) s.interrogation_assistant = null
    G.hasInterrogated = false
    G.assistPaused = false
    G.autoInterrogate = false
    G.pausePending = false
    G.stopPending = false
    if (s && s.caseId) {
      api(`/cases/${s.caseId}/interview/assistant`, {
        method: 'POST',
        body: JSON.stringify({ assistantName: '' })
      }).catch(() => {})
    }
    render()
  })

  const assistName = (s && s.interrogation_assistant) || G.ivAssistant || ''
  const selAssist = $('#sel-iv-assistant')
  if (selAssist) selAssist.onchange = () => {
    const val = selAssist.value
    if (!val) return
    G.ivAssistant = val
    if (s) s.interrogation_assistant = val
    G.hasInterrogated = false
    G.assistPaused = false
    G.autoInterrogate = false
    G.pausePending = false
    G.stopPending = false
    if (s && s.caseId) {
      api(`/cases/${s.caseId}/interview/assistant`, {
        method: 'POST',
        body: JSON.stringify({ assistantName: val })
      }).catch(() => {})
    }
    render()
  }

  const leaveAssist = $('#btn-leave-iv-assistant')
  if (leaveAssist) leaveAssist.onclick = () => {
    G.ivAssistant = null
    if (s) s.interrogation_assistant = null
    G.hasInterrogated = false
    G.assistPaused = false
    G.autoInterrogate = false
    G.pausePending = false
    G.stopPending = false
    if (s && s.caseId) {
      api(`/cases/${s.caseId}/interview/assistant`, {
        method: 'POST',
        body: JSON.stringify({ assistantName: '' })
      }).catch(() => {})
    }
    render()
  }
  const start = () => {
    const defaultSuspect = (s.persons || []).find(p => p.role === 'suspect') || (s.persons || [])[0]
    const target = G.ivTarget || (G.iv && G.iv.person) || (defaultSuspect && defaultSuspect.id)
    if (!target) { toast('No target selected', 'Select a person of interest first.', 'warn'); return }
    G.ivTranscriptScrollTop = null
    G.ivTranscriptWasAtBottom = true
    act(async () => {
      const r = await api(`/cases/${s.caseId}/interview/start`, { method: 'POST', body: JSON.stringify({ personId: target }) })
      mergeBundle(r)
      const ivId = r.interviewId || (r.interview && r.interview.id)
      G.iv = { person: target, id: ivId }
      G.ivTarget = target
      render()
      toast(r.resumed ? 'Session resumed' : 'Examination commenced', r.resumed ? 'The existing transcript has been reopened.' : 'Remember: you are looking for a place or a thing, not an admission.', '')
    })
  }
  const b1 = $('#iv-start'); if (b1) b1.onclick = start
  const b2 = $('#iv-start2'); if (b2) b2.onclick = start
  const b3 = $('#iv-start-mob'); if (b3) b3.onclick = start

  const btnLegal = $('#btn-iv-legal')
  if (btnLegal) {
    btnLegal.onclick = () => {
      modal({
        title: 'BSA Section 23 — Statutory Principles of Interrogation',
        body: `<div class="reader">
          <div class="legalbox" style="margin-top:0">
            <div class="lb-h">&#9878; Bharatiya Sakshya Adhiniyam, 2023 s.23 (formerly IEA s.27)</div>
            <p style="margin:6px 0;line-height:1.6"><b>Confessions to Police are Barred:</b> No confession made to a police officer shall be proved against an accused person in court.</p>
            <p style="margin:6px 0;line-height:1.6"><b>Discovery of Fact Exception:</b> Provided that when any fact is deposed to as discovered in consequence of information received from a person accused of an offence in custody, so much of such information as relates distinctly to the fact thereby discovered may be proved.</p>
          </div>
          <h4 style="margin-top:12px;color:var(--gold)">Investigative Objectives</h4>
          <ul style="padding-left:18px;margin-top:6px;line-height:1.6">
            <li>Never seek an admission or confession — it will be thrown out in court.</li>
            <li>Direct your questioning to locate <b>places, hidden items, weapons, vehicles, keys, SIM cards, or financial logs</b>.</li>
            <li>A disclosure memo followed by recovery in front of two independent witnesses (panchas) creates admissible evidence under BSA s.23.</li>
          </ul>
        </div>`
      })
    }
  }

  const toggleDossier = $('#iv-toggle-dossier')
  const drawer = $('#iv-suspect-drawer')
  const closeDrawer = $('#iv-drawer-close')
  if (toggleDossier && drawer) {
    toggleDossier.onclick = () => {
      const isHidden = drawer.style.display === 'none'
      drawer.style.display = isHidden ? 'block' : 'none'
      toggleDossier.classList.toggle('on', isHidden)
    }
  }
  if (closeDrawer && drawer) {
    closeDrawer.onclick = () => {
      drawer.style.display = 'none'
      if (toggleDossier) toggleDossier.classList.remove('on')
    }
  }
  let tactic = ''
  $$('[data-tactic]').forEach(el => el.onclick = () => {
    tactic = el.dataset.tactic
    $$('[data-tactic]').forEach(x => x.classList.toggle('on', x === el))
    const map = {
      rapport: 'I understand this has been difficult. I am not here to trap you.',
      'open-question': 'Tell me about that morning, from the beginning.',
      'evidence-disclosure': 'I am going to show you something recovered from the scene. Explain it to me.',
      'timeline-pressure': 'Let us go through your movements hour by hour. Where were you at 8:15?',
      'contradiction-trap': 'You told my colleague you were at the depot. Your tower location says otherwise.',
      'legal-warning': 'Let me be clear about your position. I am recording this. Anything you say about a fact may be used — but only to the extent it leads to a recovery.'
    }
    const ta = $('#iv-in')
    if (ta) {
      ta.value = map[tactic] || ''
      if (typeof fitIvTextarea === 'function') fitIvTextarea()
    }
  })

  // Bind direct confrontation prompt chips
  $$('.prompt-chip[data-prompt-text]').forEach(b => b.onclick = () => {
    const text = b.dataset.promptText || ''
    const pTactic = b.dataset.promptTactic || 'evidence-disclosure'
    tactic = pTactic
    const ta = $('#iv-in')
    if (ta) {
      ta.value = text
      if (typeof fitIvTextarea === 'function') fitIvTextarea()
      ta.focus()
    }
    $$('[data-tactic]').forEach(x => x.classList.toggle('on', x.dataset.tactic === pTactic))
    const note = $('#iv-note')
    if (note) note.textContent = 'Tactical Prompt Loaded: ' + pTactic.replace('-', ' ')
  })
  const curPerson = p || known.find(x => x.id === targetId) || known[0] || (s.persons || [])[0]
  const curIv = iv || (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]

  // Scroll helper ensuring new messages push older ones upwards
  const scrollTranscriptToBottom = (smooth = false) => {
    const el = document.getElementById('iv-transcript')
    if (!el) return
    if (G.ivTranscriptWasAtBottom !== false) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }

  const typeCharByChar = async (element, text, msPerChar = 20, scrollEl = null, cursor = ' ▌') => {
    if (!element || typeof text !== 'string') return
    element.textContent = ''
    for (let i = 0; i < text.length; i++) {
      element.textContent = text.slice(0, i + 1) + (i < text.length - 1 ? cursor : '')
      if (scrollEl && G.ivTranscriptWasAtBottom !== false) {
        scrollEl.scrollTop = scrollEl.scrollHeight
      }
      const ch = text.charAt(i)
      let delay = msPerChar
      if (ch === '.' || ch === '?' || ch === '!') delay = msPerChar * 3.5
      else if (ch === ',' || ch === ';' || ch === ':') delay = msPerChar * 2
      await new Promise(r => setTimeout(r, delay))
    }
    element.textContent = text
    if (scrollEl && G.ivTranscriptWasAtBottom !== false) {
      scrollEl.scrollTop = scrollEl.scrollHeight
    }
  }

  const typeListedThoughtProcess = async (containerEl, thoughtItems, msPerChar = 16, scrollEl = null) => {
    if (!containerEl || !thoughtItems || !thoughtItems.length) return null

    containerEl.innerHTML = `
      <div class="ai-thought-card">
        <div class="ai-thought-hdr" style="cursor:pointer" title="Click to collapse / expand">
          <div class="ai-thought-title">
            <span class="ai-sparkle">✦</span>
            <span class="ai-status-txt">Working</span>
          </div>
          <span class="ai-thought-toggle">▼</span>
        </div>
        <div class="ai-thought-body">
          <div class="ai-thought-item">
            <span class="ai-thought-ico">💡</span>
            <span class="ai-thought-txt">Thought for ${Math.min(10, Math.max(3, thoughtItems.length * 2))} seconds</span>
          </div>
        </div>
      </div>
    `

    const card = containerEl.querySelector('.ai-thought-card')
    const body = card.querySelector('.ai-thought-body')
    const statusTxt = card.querySelector('.ai-status-txt')
    const hdr = card.querySelector('.ai-thought-hdr')

    // Attach click handler IMMEDIATELY so collapse/expand works at any point during active typing
    let userToggled = false
    if (hdr && card) {
      hdr.onclick = (e) => {
        e.stopPropagation()
        userToggled = true
        card.classList.toggle('is-collapsed')
      }
    }

    for (let i = 0; i < thoughtItems.length; i++) {
      const tp = thoughtItems[i]
      let ico = '📄'
      const s = tp.toLowerCase()
      if (s.includes('fact') || s.includes('timeline') || s.includes('alibi')) ico = '⏱️'
      else if (s.includes('evident') || s.includes('exhibit') || s.includes('scene') || s.includes('data') || s.includes('cdr')) ico = '🔍'
      else if (s.includes('statut') || s.includes('bsa') || s.includes('23') || s.includes('law') || s.includes('bnss')) ico = '⚖️'
      else if (s.includes('tactic') || s.includes('contradict') || s.includes('inquir') || s.includes('target')) ico = '🎯'
      else if (s.includes('error') || s.includes('retry')) ico = '⚠️'

      const itemEl = document.createElement('div')
      itemEl.className = `ai-thought-item ${s.includes('error') ? 'warn' : ''}`
      itemEl.innerHTML = `<span class="ai-thought-ico">${ico}</span><span class="ai-thought-txt"></span>`
      body.appendChild(itemEl)

      const txtSpan = itemEl.querySelector('.ai-thought-txt')
      await typeCharByChar(txtSpan, tp, msPerChar, scrollEl)
      await new Promise(r => setTimeout(r, 120))
    }

    if (statusTxt) statusTxt.textContent = `Thought Process (${thoughtItems.length} steps)`
    if (!userToggled && card) {
      card.classList.add('is-collapsed')
    }

    return card
  }

  // Generate rich, context-aware POI cognitive thinking HTML
  const getSuspectThinkingHtml = (person, iv) => {
    const name = esc(person ? person.name : 'Suspect')
    const tension = iv ? (iv.tension || 30) : 30
    const cred = iv ? (iv.credibility || 60) : 60
    
    let stateLabel = 'POI DELIBERATING'
    let hintText = 'Evaluating question &amp; calculating response under police examination...'

    if (tension >= 70) {
      stateLabel = 'HIGH COGNITIVE STRESS'
      hintText = 'Experiencing acute pressure; weighing alibi risk against potential disclosure...'
    } else if (cred <= 40) {
      stateLabel = 'CALCULATING ALIBI'
      hintText = 'Assessing timeline consistency and attempting to reconcile contradictions...'
    } else if (person && (person.cooperative || (iv && iv.emotional_state === 'cooperative'))) {
      stateLabel = 'RECALLING DETAILS'
      hintText = 'Reflecting on the inquiry; formulating factual statement...'
    }

    return `
      <div class="who">${name}</div>
      <div class="msg-content">
        <div class="poi-thinking-wrap">
          <div class="poi-pulse-indicator">
            <span class="poi-brain-icon">&#129504;</span>
            <span class="poi-state-badge">${stateLabel}</span>
            <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
          <div class="poi-thought-hint">${hintText}</div>
        </div>
      </div>
    `
  }

  const typeWordByWord = async (element, text, msPerWord = 20, scrollEl = null) => {
    return typeCharByChar(element, text, 18, scrollEl)
  }

  const simulateInputTyping = async (inputEl, text, msPerWord = 16) => {
    if (!inputEl || !text) return
    const words = text.split(/\s+/)
    inputEl.value = ''
    for (let i = 0; i < words.length; i++) {
      inputEl.value = words.slice(0, i + 1).join(' ')
      await new Promise(r => setTimeout(r, msPerWord))
    }
  }

  // Comprehensive helper to clean suspect name or greetings from assistant questions
  const cleanSuspectNameFromQuestion = (qStr, pName) => {
    if (!qStr) return ''
    let q = String(qStr).trim().replace(/^["']|["']$/g, '').trim()
    const parts = (pName || '').split(/\s+/).filter(Boolean)
    const patterns = [
      pName,
      ...parts,
      'Imran Pawar', 'Imran', 'Pawar',
      'Sneha Naik', 'Sneha', 'Naik',
      'Nitin Bhosale', 'Nitin', 'Bhosale',
      'Suspect', 'Accused', 'Mr\\.?\\s+[A-Za-z]+', 'Ms\\.?\\s+[A-Za-z]+'
    ].filter(Boolean)
    
    const rgx = new RegExp(`^(${patterns.join('|')})[,\\:\\s\\-]+`, 'i')
    while (rgx.test(q)) {
      q = q.replace(rgx, '').trim()
    }
    q = q.replace(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*[,\\:]\s*/, '').trim()
    q = q.replace(/^Listen to me[,\\:\s]+/i, '').trim()
    q = q.replace(/^Look here[,\\:\s]+/i, '').trim()
    if (q.length > 0) q = q.charAt(0).toUpperCase() + q.slice(1)
    return q
  }

  // Central assistant message function
  const sendAssistMsg = async (textOverride) => {
    if (G.assistBusy) return
    const activeIn = document.getElementById('iv-in') || document.getElementById('iv-assist-in')
    let text = (typeof textOverride === 'string' ? textOverride : (activeIn ? activeIn.value : '')).trim()
    if (!text) return

    const isAutoDirective = typeof textOverride === 'string' && (
      text.toLowerCase().includes('follow-up') ||
      text.toLowerCase().includes('continue') ||
      text.toLowerCase().includes("suspect's previous answer")
    )

    if (typeof textOverride === 'string' && activeIn && !isAutoDirective) {
      await simulateInputTyping(activeIn, text, 14)
      await new Promise(r => setTimeout(r, 60))
      activeIn.value = ''
      if (typeof fitIvTextarea === 'function') fitIvTextarea()
      else activeIn.style.height = '26px'
    } else if (activeIn) {
      activeIn.value = ''
      if (typeof fitIvTextarea === 'function') fitIvTextarea()
      else activeIn.style.height = '26px'
    }

    const lower = text.toLowerCase()
    if (lower.includes('leave') || lower.includes('exit') || lower.includes('go') || lower.includes('dismiss')) {
      G.autoInterrogate = false
      G.pausePending = false
      G.stopPending = false
      G.hasInterrogated = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
      const oldAssistName = assistName || 'Officer'
      G.ivAssistant = null
      if (s) s.interrogation_assistant = null
      
      const activePerson = known.find(x => x.id === (G.iv && G.iv.person)) || curPerson
      const personIvList = (s.interviews || []).filter(i => i.person_id === (activePerson && activePerson.id))
      const activeIv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]
      const ivId = (G.iv && G.iv.id) || (activeIv && activeIv.id)
      try {
        const r = await api(`/cases/${s.caseId}/interview/stop`, {
          method: 'POST',
          body: JSON.stringify({
            assistantName: oldAssistName,
            interviewId: ivId,
            personId: activePerson && activePerson.id,
            withdraw: true
          })
        })
        mergeBundle(r)
      } catch (e) {
        console.warn('Failed to post stop findings:', e)
      }

      render()
      scrollTranscriptToBottom(false)
      return
    }

    if (lower.includes('stop')) {
      // Direct command to stop
      G.autoInterrogate = false
      G.pausePending = false
      G.stopPending = false
      G.hasInterrogated = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
      const oldAssistName = assistName || 'Officer'
      G.ivAssistant = null
      if (s) s.interrogation_assistant = null

      const activePerson = known.find(x => x.id === (G.iv && G.iv.person)) || curPerson
      const personIvList = (s.interviews || []).filter(i => i.person_id === (activePerson && activePerson.id))
      const activeIv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]
      const ivId = (G.iv && G.iv.id) || (activeIv && activeIv.id)
      try {
        const r = await api(`/cases/${s.caseId}/interview/stop`, {
          method: 'POST',
          body: JSON.stringify({
            assistantName: oldAssistName,
            interviewId: ivId,
            personId: activePerson && activePerson.id,
            withdraw: true
          })
        })
        mergeBundle(r)
      } catch (e) {
        console.warn('Failed to post stop findings:', e)
      }

      render()
      scrollTranscriptToBottom(false)
      return
    }

    if (lower.includes('pause')) {
      G.autoInterrogate = false
      G.pausePending = false
      G.stopPending = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
      render()
      scrollTranscriptToBottom(false)
      return
    }

    const activePerson = curPerson
    const activeIv = curIv
    const ivId = (G.iv && G.iv.id) || (activeIv && activeIv.id)

    if (!ivId) {
      toast('No session open', 'Commence examination first.', 'warn')
      return
    }

    // If this is a fresh natural language command from the user, parse into structured directive
    if (typeof textOverride !== 'string') {
      try {
        const dRes = await api(`/cases/${s.caseId}/interview/directive`, {
          method: 'POST',
          body: JSON.stringify({
            instruction: text,
            personId: activePerson && activePerson.id,
            assistantName: assistName
          })
        })
        if (dRes && dRes.directive) {
          mergeBundle(dRes)
          if (dRes.directive.operationalMode === 'silent_scribe') {
            G.autoInterrogate = false
            G.pausePending = false
            G.stopPending = false
            G.assistBusy = false
            render()
            scrollTranscriptToBottom(false)
            return
          }
        }
      } catch (dErr) {
        console.warn('Directive parse fallback:', dErr)
      }
    }

    // Check if this is an interrogation directive
    G.hasInterrogated = true
    G.assistPaused = false
    const isExplicitAutoMode = /\b(interrogat|take\s*over|keep\s*asking|until\s*he|continuously|autonomous|auto\s*interrogate|grill\s*him|you\s*ask|question\s*him|go\s*ahead)\b/i.test(lower)
    const isMultiTurnBudget = /\b([2-9]|\d{2,}|two|three|four|five|six)\s*questions?\b/i.test(lower)
    const isSingleQuestionConstraint = /\b(only|just|a)?\s*(one|single|1)\s*questions?\b/i.test(lower)
    
    // Only loop continuously if user explicitly requested continuous autonomous mode or multiple questions or open-ended directive
    if ((isExplicitAutoMode || isMultiTurnBudget || typeof textOverride === 'string' || !isSingleQuestionConstraint) && !lower.includes('stop') && !lower.includes('pause')) {
      G.autoInterrogate = true
      G.pausePending = false
      G.stopPending = false
    } else {
      G.autoInterrogate = false
      G.pausePending = false
      G.stopPending = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
    }

    const trEl = document.getElementById('iv-transcript')
    if (!trEl) return

    G.assistBusy = true
    if (typeof updateIvActionControls === 'function') {
      updateIvActionControls()
    }

    // Create assistant thinking bubble
    const assistBubble = document.createElement('div')
    assistBubble.className = 'bubble officer assistant'
    assistBubble.innerHTML = `<div class="who">${esc(assistName || 'Co-Examiner')} (Co-Examiner)</div><div class="msg-content"><span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span> <span style="font-size:12.5px;color:var(--gold);margin-left:4px">${esc(assistName || 'Co-Examiner')} analyzing case facts, evidentiary data &amp; framing question...</span></div><div class="meta">&#128172; Co-Examiner Question</div>`
    trEl.appendChild(assistBubble)
    scrollTranscriptToBottom(true)

    try {
      const thinkStart = Date.now()
      const turnPromise = api(`/cases/${s.caseId}/interview/turn`, {
        method: 'POST',
        body: JSON.stringify({
          interviewId: ivId,
          personId: activePerson && activePerson.id,
          input: `(${assistName || 'Co-Examiner'} asks on IO directive): ${text}`,
          assistantName: assistName,
          technique: 'progressive-question',
          advocatePresent: Boolean(G.counselPresent)
        })
      })

      const thinkMinDelay = 1800
      const elapsed = Date.now() - thinkStart
      if (elapsed < thinkMinDelay) {
        await new Promise(res => setTimeout(res, thinkMinDelay - elapsed))
      }

      const r = await turnPromise
      const tr = r.turn || {}
      let rawQ = tr.question_framed || tr.text || text
      if (/continue\s+follow-up|follow-up\s+interrogation|based on suspect's previous answer/i.test(rawQ)) {
        rawQ = "Let's clarify your statement: what were you doing during that critical time?"
      }
      let framedQ = cleanSuspectNameFromQuestion(rawQ, activePerson ? activePerson.name : '')
      const suspectReplyText = tr.suspect_reply || ''
      const isHospDirective = /tea|chai|water|coffee|drink|snack|biscuit|breakfast|food|refreshment/i.test(rawQ || text || '')
      const thoughtSteps = tr.thought_process || (isHospDirective ? [
        `Directive Intent: Implementing IO's instruction to offer refreshments and build rapport with ${activePerson ? activePerson.name : 'the suspect'}.`,
        `Psychological Assessment: Assessing current resistance and tension. Hospitality defuses psychological barriers.`,
        `Statutory Compliance: BNSS s.180 voluntary cooperation protocol — ensuring interrogation remains fair, humane, and free from duress.`,
        `Tactical Formulation: Framing courteous offer of hot tea/water on behalf of the Investigating Officer.`
      ] : [
        `Facts & Timeline: Auditing stated timeline against corroborated crime window.`,
        `Evidentiary Data: Cross-referencing physical scene exhibits & communications data.`,
        `Statutory Logic: Isolating locatable discovery pathways under BSA §23.`,
        `Tactical Angle: Framing targeted inquiry to test contradiction threshold.`
      ])

      // Get current transcript DOM element
      const curTrEl = document.getElementById('iv-transcript') || trEl

      // Render listed thought process with character-by-character typing animation
      const assistMsgEl = assistBubble.querySelector('.msg-content')
      if (assistMsgEl) {
        assistMsgEl.innerHTML = ''
        const thoughtSlot = document.createElement('div')
        assistMsgEl.appendChild(thoughtSlot)

        await typeListedThoughtProcess(thoughtSlot, thoughtSteps, 16, curTrEl)

        // Show question below the collapsed thought container and type it out character-by-character
        const questionSlot = document.createElement('div')
        questionSlot.className = 'framed-question-text'
        questionSlot.style.fontSize = '13px'
        questionSlot.style.lineHeight = '1.45'
        questionSlot.style.marginTop = '4px'
        assistMsgEl.appendChild(questionSlot)

        await typeCharByChar(questionSlot, framedQ, 20, curTrEl)
      }

      // Check and render advocate intervention before suspect responds
      if (tr.advocate_intervention || r.advocate_intervention) {
        const adv = tr.advocate_intervention || r.advocate_intervention
        const advBubble = document.createElement('div')
        advBubble.className = 'bubble advocate-intervention-bubble'
        advBubble.style.cssText = 'background:#082f49;border:1px solid #0284c7;border-left:4px solid #38bdf8;padding:10px 14px;border-radius:6px;max-width:92%;margin:6px 0;box-shadow:0 4px 16px rgba(0,0,0,0.5)'
        advBubble.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:14px">⚖️</span>
              <span style="font-weight:700;color:#7dd3fc;font-size:12px">${esc(adv.advocateName || 'Adv. Rajeshwar Sharma')}</span>
              <span class="tag" style="background:rgba(56,189,248,0.2);color:#38bdf8;font-size:9px;font-weight:700;border:1px solid #0284c7">DEFENSE COUNSEL (BNSS §41D)</span>
            </div>
            <span class="tag" style="background:rgba(239,68,68,0.2);color:#fca5a5;font-size:9px;border:1px solid #ef4444">${esc(adv.statute || 'BNSS §41D')}</span>
          </div>
          <div style="color:#f0f9ff;font-size:13px;line-height:1.45;margin-bottom:6px">
            "${esc(adv.statement)}"
          </div>
          ${adv.actionHint ? `
            <div style="font-size:10.5px;color:#cbd5e1;background:rgba(15,23,42,0.6);padding:3px 8px;border-radius:3px;border-left:2px solid #f59e0b">
              ${esc(adv.actionHint)}
            </div>
          ` : ''}
        `
        curTrEl.appendChild(advBubble)
        scrollTranscriptToBottom(true)
        toast('⚖️ Advocate Intervenes', adv.statement.slice(0, 95) + '...', 'warn')
        await new Promise(res => setTimeout(res, 1400))
      }

      // Create suspect thinking bubble with realistic psychological deliberation simulation
      const suspectBubble = document.createElement('div')
      suspectBubble.className = 'bubble suspect'
      suspectBubble.innerHTML = getSuspectThinkingHtml(activePerson, activeIv)
      curTrEl.appendChild(suspectBubble)
      scrollTranscriptToBottom(true)

      // Suspect thinking delay: 2200ms
      await new Promise(res => setTimeout(res, 2200))

      // Type out suspect's reply character-by-character
      const suspectMsgEl = suspectBubble.querySelector('.msg-content')
      if (suspectMsgEl) {
        await typeCharByChar(suspectMsgEl, suspectReplyText, 20, curTrEl)
      }

      mergeBundle(r)
      const updatedIv = r.interview || (r.snapshot?.interviews || []).filter(i => i.person_id === (activePerson && activePerson.id)).pop()
      if (updatedIv) {
        G.iv = { person: activePerson ? activePerson.id : (G.iv && G.iv.person), id: updatedIv.id }
      }

      G.assistBusy = false

      // Check if Stop was requested during the question/answer flow
      if (G.stopPending) {
        G.stopPending = false
        G.autoInterrogate = false
        G.assistPaused = false
        G.pausePending = false
        G.hasInterrogated = false
        if (G.autoInterrogateTimer) {
          clearTimeout(G.autoInterrogateTimer)
          G.autoInterrogateTimer = null
        }

        const oldAssistName = assistName || 'Co-Examiner'
        G.ivAssistant = null
        if (s) s.interrogation_assistant = null

        try {
          const rStop = await api(`/cases/${s.caseId}/interview/stop`, {
            method: 'POST',
            body: JSON.stringify({
              assistantName: oldAssistName,
              interviewId: ivId,
              personId: activePerson && activePerson.id,
              withdraw: true
            })
          })
          mergeBundle(rStop)
        } catch (e) {
          console.warn('Failed to stop and withdraw assistant:', e)
        }

        render()
        scrollTranscriptToBottom(true)
        return
      }

      // Automatically transition to PAUSED state after the question so player can manually play / continue onwards
      // The integrated member stays in the chamber and does NOT get withdrawn or dismissed automatically
      G.autoInterrogate = false
      G.assistPaused = true
      G.hasInterrogated = true
      G.pausePending = false
      if (assistName) {
        G.ivAssistant = assistName
        if (s) s.interrogation_assistant = assistName
      }
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }

      // Re-render view with play button (▶) ready for player to resume manually
      render()
      scrollTranscriptToBottom(true)
    } catch (err) {
      G.assistBusy = false
      G.autoInterrogate = false
      G.pausePending = false
      G.stopPending = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
      toast('Interrogation Error', err.message || String(err), 'crit')
      render()
      scrollTranscriptToBottom(false)
    }
  }

  // Helper to dynamically update the action bar (Play/Pause, Stop, Send) in place
  const updateIvActionControls = () => {
    const actionsBar = document.getElementById('iv-actions-bar')
    if (!actionsBar) return
    const isRunning = !G.assistPaused && (G.autoInterrogate || G.assistBusy)
    const showPausePlay = !!assistName && !!G.hasInterrogated
    const isPaused = !!assistName && !!G.hasInterrogated && (G.assistPaused || (!G.autoInterrogate && !G.assistBusy))

    actionsBar.innerHTML = `
      ${showPausePlay ? `
        <button type="button" class="btn-toggle-pause-iv iv-action-btn" title="${isRunning ? 'Pause Interrogation' : 'Resume Interrogation'}" style="color:${isRunning ? '#f59e0b' : '#38bdf8'}">
          ${isRunning ? '⏸' : '▶'}
        </button>
      ` : ''}
      ${assistName ? `
        <button type="button" class="btn-stop-iv-assistant iv-action-btn stop" title="Stop Interrogation and Withdraw Officer" style="color:#f97316">
          ⏹
        </button>
      ` : ''}
      <button type="button" id="iv-send" class="chat-send-btn" title="${assistName && !isPaused ? 'Send Directive to Officer' : 'Put the Question'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    `

    // Rebind action bar events
    const newPauseBtn = actionsBar.querySelector('.btn-toggle-pause-iv')
    if (newPauseBtn) newPauseBtn.onclick = togglePauseAssistHandler

    const newStopBtn = actionsBar.querySelector('.btn-stop-iv-assistant')
    if (newStopBtn) newStopBtn.onclick = stopAssistHandler

    const newSendBtn = document.getElementById('iv-send')
    if (newSendBtn) newSendBtn.onclick = handleIvSend
  }

  // Bind pause/play toggle button
  const togglePauseAssistHandler = () => {
    if (!assistName) return
    const isRunning = !G.assistPaused && (G.autoInterrogate || G.assistBusy)
    if (isRunning) {
      // Request Pause
      G.assistPaused = true
      G.autoInterrogate = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
      if (G.assistBusy) {
        G.pausePending = true
      }
      const curTa = document.getElementById('iv-in')
      if (curTa) curTa.placeholder = `Ask suspect directly (${assistName.replace(/^(JC|Insp\.|Head Constable)\s+/, '')} paused)...`
      updateIvActionControls()
    } else {
      // Resume / Play: start assistant question workflow
      G.assistPaused = false
      G.pausePending = false
      G.stopPending = false
      G.autoInterrogate = true
      const curTa = document.getElementById('iv-in')
      if (curTa) curTa.placeholder = `Direct ${assistName.replace(/^(JC|Insp\.|Head Constable)\s+/, '')}...`
      updateIvActionControls()
      if (!G.assistBusy) {
        sendAssistMsg("continue follow-up interrogation based on suspect's previous answer")
      }
    }
  }

  // Bind stop interrogation button for officer (with smooth finish and automatic withdrawal)
  const stopAssistHandler = () => {
    if (G.assistBusy) {
      // Smooth finish of current in-flight turn, then withdraw
      G.stopPending = true
      G.autoInterrogate = false
      G.pausePending = false
      if (G.autoInterrogateTimer) {
        clearTimeout(G.autoInterrogateTimer)
        G.autoInterrogateTimer = null
      }
      render()
      return
    }

    // Immediately stop & withdraw if not in-flight
    G.autoInterrogate = false
    G.pausePending = false
    G.stopPending = false
    G.hasInterrogated = false
    G.assistPaused = false
    if (G.autoInterrogateTimer) {
      clearTimeout(G.autoInterrogateTimer)
      G.autoInterrogateTimer = null
    }
    const activePerson = known.find(x => x.id === (G.iv && G.iv.person)) || curPerson
    const personIvList = (s.interviews || []).filter(i => i.person_id === (activePerson && activePerson.id))
    const activeIv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]
    const ivId = (G.iv && G.iv.id) || (activeIv && activeIv.id)
    
    act(async () => {
      const oldAssistName = assistName || 'Officer'
      G.ivAssistant = null
      if (s) s.interrogation_assistant = null

      const r = await api(`/cases/${s.caseId}/interview/stop`, {
        method: 'POST',
        body: JSON.stringify({
          assistantName: oldAssistName,
          interviewId: ivId,
          personId: activePerson && activePerson.id,
          withdraw: true
        })
      })
      mergeBundle(r)
      render()
    })
  }
  $$('.btn-stop-iv-assistant').forEach(b => b.onclick = stopAssistHandler)

  // Auto-resume auto interrogation if view reloaded while autoInterrogate was true
  if (G.autoInterrogate && !G.pausePending && !G.stopPending && !G.assistBusy) {
    if (G.autoInterrogateTimer) clearTimeout(G.autoInterrogateTimer)
    G.autoInterrogateTimer = setTimeout(() => {
      if (G.autoInterrogate && !G.pausePending && !G.stopPending && !G.assistBusy && G.view === 'interrogation') {
        sendAssistMsg("continue follow-up interrogation based on suspect's previous answer")
      }
    }, 600)
  }

  // Bind assistant direct send button & input if present
  const assistSend = document.getElementById('iv-assist-send')
  const assistIn = document.getElementById('iv-assist-in')
  if (assistSend) assistSend.onclick = () => sendAssistMsg()
  if (assistIn) {
    assistIn.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        sendAssistMsg()
      }
    }
  }

  const clr = $('#iv-clear'); if (clr) clr.onclick = () => { $('#iv-in').value = '' }
  const ta = $('#iv-in')
  const send = $('#iv-send')

  const fitIvTextarea = () => {
    const curTa = document.getElementById('iv-in') || ta
    if (!curTa) return
    curTa.style.height = '26px'
    const newH = Math.min(Math.max(curTa.scrollHeight, 26), 72)
    curTa.style.height = newH + 'px'
    curTa.style.overflowY = curTa.scrollHeight > 72 ? 'auto' : 'hidden'
  }
  window.fitIvTextarea = fitIvTextarea
  
  if (ta) {
    ta.addEventListener('input', fitIvTextarea)
    fitIvTextarea()

    ta.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleIvSend()
      }
    }
  }

  window.refreshInterrogationInPlace = function () {
    const curTr = document.getElementById('iv-transcript')
    if (!curTr) return
    if (typeof syncNotificationBadges === 'function') syncNotificationBadges()
  }

  // Open by default at the last response instantaneously without animated zooming from top
  const trEl = document.getElementById('iv-transcript')
  if (trEl) {
    if (G.ivTranscriptScrollTop !== undefined && G.ivTranscriptScrollTop !== null && G.ivTranscriptWasAtBottom === false) {
      trEl.scrollTop = G.ivTranscriptScrollTop
    } else {
      G.ivTranscriptWasAtBottom = true
      trEl.scrollTop = trEl.scrollHeight
      requestAnimationFrame(() => {
        if (trEl && G.ivTranscriptWasAtBottom !== false) {
          trEl.scrollTop = trEl.scrollHeight
        }
      })
    }
    trEl.onscroll = () => {
      G.ivTranscriptScrollTop = trEl.scrollTop
      G.ivTranscriptWasAtBottom = (trEl.scrollHeight - trEl.scrollTop - trEl.clientHeight < 35)
    }
  }

  const handleIvSend = () => {
    const curTa = document.getElementById('iv-in') || ta
    const text = curTa ? curTa.value.trim() : ''
    if (text.length < 2) { return }

    // Smart Input Routing:
    // When an assisting squad member is integrated:
    // If not paused, route text as directive to assistant!
    if (assistName && !G.assistPaused) {
      sendAssistMsg(text)
      return
    }

    // Otherwise (when paused or operating as sole IO), send direct question to suspect
    G.autoInterrogate = false
    G.pausePending = false
    if (G.autoInterrogateTimer) {
      clearTimeout(G.autoInterrogateTimer)
      G.autoInterrogateTimer = null
    }
    const activePerson = known.find(x => x.id === (G.iv && G.iv.person)) || curPerson
    const personIvList = (s.interviews || []).filter(i => i.person_id === (activePerson && activePerson.id))
    const activeIv = (G.iv && (s.interviews || []).find(i => i.id === G.iv.id)) || personIvList[personIvList.length - 1]
    const ivId = (G.iv && G.iv.id) || (activeIv && activeIv.id)
    if (!ivId) { return }

    // Real-time optimistic update & transition simulation
    const trEl = $('#iv-transcript')
    let officerBubble = null
    let typingBubble = null
    if (trEl) {
      officerBubble = document.createElement('div')
      officerBubble.className = 'bubble officer'
      officerBubble.innerHTML = `<div class="who">You</div><div>${nl(text)}</div>${tactic ? `<div class="meta">&#9878; ${esc(tactic)}</div>` : ''}`
      trEl.appendChild(officerBubble)

      typingBubble = document.createElement('div')
      typingBubble.className = 'bubble suspect'
      typingBubble.innerHTML = getSuspectThinkingHtml(activePerson, activeIv)
      trEl.appendChild(typingBubble)
      
      trEl.scrollTop = trEl.scrollHeight
    }

    const curSend = document.getElementById('iv-send') || send
    if (curTa) { curTa.value = ''; fitIvTextarea(); curTa.disabled = true }
    if (curSend) curSend.disabled = true

    act(async () => {
      try {
        const r = await api(`/cases/${s.caseId}/interview/turn`, {
          method: 'POST',
          body: JSON.stringify({
            interviewId: ivId,
            personId: activePerson && activePerson.id,
            input: text,
            technique: tactic,
            advocatePresent: Boolean(G.counselPresent)
          })
        })
        const tr = r.turn || {}
        const suspectReplyText = tr.suspect_reply || ''

        // Suspect thinking delay: 2000ms
        await new Promise(res => setTimeout(res, 2000))

        // Check and render advocate intervention before suspect responds
        if (tr.advocate_intervention || r.advocate_intervention) {
          const adv = tr.advocate_intervention || r.advocate_intervention
          const advBubble = document.createElement('div')
          advBubble.className = 'bubble advocate-intervention-bubble'
          advBubble.style.cssText = 'background:#082f49;border:1px solid #0284c7;border-left:4px solid #38bdf8;padding:10px 14px;border-radius:6px;max-width:92%;margin:6px 0;box-shadow:0 4px 16px rgba(0,0,0,0.5)'
          advBubble.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:14px">⚖️</span>
                <span style="font-weight:700;color:#7dd3fc;font-size:12px">${esc(adv.advocateName || 'Adv. Rajeshwar Sharma')}</span>
                <span class="tag" style="background:rgba(56,189,248,0.2);color:#38bdf8;font-size:9px;font-weight:700;border:1px solid #0284c7">DEFENSE COUNSEL (BNSS §41D)</span>
              </div>
              <span class="tag" style="background:rgba(239,68,68,0.2);color:#fca5a5;font-size:9px;border:1px solid #ef4444">${esc(adv.statute || 'BNSS §41D')}</span>
            </div>
            <div style="color:#f0f9ff;font-size:13px;line-height:1.45;margin-bottom:6px">
              "${esc(adv.statement)}"
            </div>
            ${adv.actionHint ? `
              <div style="font-size:10.5px;color:#cbd5e1;background:rgba(15,23,42,0.6);padding:3px 8px;border-radius:3px;border-left:2px solid #f59e0b">
                ${esc(adv.actionHint)}
              </div>
            ` : ''}
          `
          if (typingBubble && typingBubble.parentNode) {
            trEl.insertBefore(advBubble, typingBubble)
          } else {
            trEl.appendChild(advBubble)
          }
          scrollTranscriptToBottom(true)
          toast('⚖️ Advocate Objection Raised', adv.statement.slice(0, 95) + '...', 'warn')
          await new Promise(res => setTimeout(res, 1400))
        }

        // Type out suspect reply character by character
        if (typingBubble) {
          const suspectMsgEl = typingBubble.querySelector('.msg-content')
          if (suspectMsgEl) {
            await typeCharByChar(suspectMsgEl, suspectReplyText, 20, trEl)
          }
        }

        mergeBundle(r)
        const updatedIv = r.interview || (r.snapshot?.interviews || []).filter(i => i.person_id === (activePerson && activePerson.id)).pop()
        if (updatedIv) {
          G.iv = { person: activePerson ? activePerson.id : (G.iv && G.iv.person), id: updatedIv.id }
        }
        if (r.confronted_lie) {
          toast('🎯 Contradiction Impeached (BSA §145)', r.confronted_lie.title, 'good')
        }
        render()
        scrollTranscriptToBottom(true)
      } catch (e) {
        if (typingBubble && typingBubble.parentNode) typingBubble.remove()
        if (officerBubble && officerBubble.parentNode) officerBubble.remove()
        if (curTa) { curTa.value = text; curTa.disabled = false }
      } finally {
        if (curTa) curTa.disabled = false
        if (curSend) curSend.disabled = false
      }
    })
  }

  if (send) send.onclick = handleIvSend
  updateIvActionControls()
  const closeSession = () => act(async () => {
    const activePerson = known.find(x => x.id === (G.iv && G.iv.person)) || curPerson
    const activeIv = curIv || (s.interviews || []).find(i => (G.iv && i.id === G.iv.id) || i.person_id === (activePerson && activePerson.id))
    const ivId = (G.iv && G.iv.id) || (activeIv && activeIv.id)
    if (!ivId && !G.iv) return
    const r = await api(`/cases/${s.caseId}/interview/close`, { method: 'POST', body: JSON.stringify({ interviewId: ivId, personId: activePerson && activePerson.id, caseNo: s.caseNo }) })
    mergeBundle(r)
    const res = r.result || { provable_count: 0, worthless_count: 0, admissible: [], inadmissible: [] }
    G.iv = null
    render()
    const summaryText = res.summary || (res.provable_count > 0 ? `Session closed under BSA s.23. Suspect made ${res.provable_count} locatable disclosure(s).` : `Session closed under BSA s.23. No admissible discoveries substantiated before witnesses.`);
    const guidanceText = res.guidance || (res.provable_count > 0 ? `Proceed to Evidence Board and execute formal recovery memos before two independent panch witnesses.` : `Re-examine the suspect or corroborate witness statements before filing the final report.`);

    modal({
      cls: 'wide',
      title: 'Session closed — application of BSA s.23',
      body: `
        ${legalBox('BSA s.23 — what survives', 'No confession to a police officer is provable. Only so much of the information as relates distinctly to a fact thereby discovered, where the discovery was made before a Magistrate or two or more respectable witnesses.', '23', 'BSA')}
        <div class="grid g3" style="gap:10px;margin-bottom:14px">
          <div class="stat v"><div class="stat-v">${res.provable_count}</div><div class="stat-l">Provable</div></div>
          <div class="stat r"><div class="stat-v">${res.worthless_count}</div><div class="stat-l">Worthless in court</div></div>
          <div class="stat"><div class="stat-v">${(res.admissible || []).length + (res.inadmissible || []).length}</div><div class="stat-l">Utterances logged</div></div>
        </div>
        <div class="card" style="border-color:var(--green)"><div class="card-h"><h3 style="color:#6fd39b">Provable</h3></div>
          ${(res.admissible || []).length ? res.admissible.map(a => `<div class="check ok"><span class="ci">&#10003;</span><span class="cn">${esc(a.disclosed_fact)}<div class="cd">Recovered: ${esc(a.recovery)} · witnessed: ${a.discovery_witnessed ? 'yes' : 'NO'} · weight ${esc(a.weight || '')}</div></span></div>`).join('') : '<div class="dim" style="font-size:12.5px">Nothing. If no disclosure was converted into a witnessed recovery, this entire session is worth nothing in court.</div>'}
        </div>
        <div class="card" style="border-color:var(--red);margin-top:12px"><div class="card-h"><h3 style="color:#ff8b86">Not provable</h3></div>
          ${(res.inadmissible || []).slice(0, 6).map(a => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">"${esc(String(a.utterance || '').slice(0, 130))}"<div class="cd">${esc(a.why || '')}</div></span></div>`).join('') || '<div class="dim" style="font-size:12.5px">None recorded.</div>'}
        </div>
        <div class="legalbox"><div class="lb-h">&#9878; The court's summary of this session</div>${esc(summaryText)}</div>
        <div class="helpbox"><div class="hb-h">&#10148; What you must do next</div>${esc(guidanceText)}</div>`,
      footer: `${(res.admissible || []).length < 1 ? '<button class="btn left pri" id="cs-goboard">Go to Evidence Board — look for disclosures to recover</button>' : ''}<button class="btn" data-close>Close</button>`,
      after: (veil, cl) => { const b = veil.querySelector('#cs-goboard'); if (b) b.onclick = () => { cl(); G.view = 'board'; render() } }
    })
    toast('Session closed', summaryText.slice(0, 200), res.provable_count ? 'good' : 'crit')
  })
  $$('.btn-iv-close, #iv-close').forEach(b => b.onclick = closeSession)
}

/* ---------------------------- CHARGE SHEET ---------------------------- */

VIEWS.charge = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  if (!s.fir) return needFir('A charge sheet cannot exist without a registered FIR.')
  const cs = s.chargeSheet
  const adm = (s.exhibits || []).filter(e => e.admissibility === 'admissible')
  const suspects = (s.persons || []).filter(p => p.role === 'suspect')
  return head('&#128220;', 'Charge Sheet', 'Final report under BNSS s.193 &middot; due by day ' + s.dayLimit)
  + procedureCoach([
    { ok: !!s.fir, text: 'FIR registered' },
    { ok: adm.length > 0, text: 'At least one admissible exhibit', detail: adm.length ? adm.length + ' admissible, weight ' + (s.readiness?.admissibleWeight || 0) : 'Nothing admissible yet — a charge sheet will be rejected.' },
    { ok: (s.readiness?.taintedCount || 0) === 0, text: 'No tainted exhibits in the record', detail: s.readiness?.taintedCount ? s.readiness.taintedCount + ' tainted — do NOT list them as proof.' : 'Clean.' },
    { ok: (s.readiness?.inadmissibleCount || 0) === 0, text: 'No uncertified electronic records', detail: s.readiness?.inadmissibleCount ? 'A dual-signed BSA s.63 certificate is required.' : 'Clean.' },
    { ok: (s.persons || []).some(p => (p.statements || []).length), text: 'Statements recorded for listed witnesses' },
    { ok: !!cs, text: 'Charge sheet drafted', detail: cs ? (cs.draft ? 'Draft — not yet submitted.' : 'Submitted.') : '' }
  ])
  + `<div class="grid g21" style="align-items:start">
    <div>
      <div class="paper" style="position:relative">
        <div class="stamp ${cs && !cs.draft ? 'approved' : 'draft'}">${cs && !cs.draft ? 'FILED' : 'DRAFT'}</div>
        <div class="paper-head"><h2>FINAL REPORT — CHARGE SHEET</h2><p>In the Court of the Sessions Judge &middot; BNSS s.193 &middot; Case №${esc(s.caseNo)}</p></div>
        <div class="paper-row"><span class="k">Police station</span><span class="v">Crime Branch, Malhar Division</span></div>
        <div class="paper-row"><span class="k">FIR No.</span><span class="v">${esc(s.fir.fir_no || '—')} dated day ${s.fir.filed_day}</span></div>
        <div class="paper-row"><span class="k">Offences charged</span><span class="v">${cs ? esc((cs.bns_sections || []).join(', ')) || 'none selected' : 'not yet selected'}</span></div>
        <div class="paper-row"><span class="k">Accused</span><span class="v">${cs && (cs.accused || []).length ? cs.accused.map(a => esc(a.name) + (a.role ? ' — ' + esc(a.role) : '')).join('; ') : '—'}</span></div>
        <div class="paper-row"><span class="k">Witnesses</span><span class="v">${cs && (cs.witnesses || []).length ? (cs.witnesses || []).length + ' listed' : '—'}</span></div>
        <div class="paper-row"><span class="k">Exhibits</span><span class="v">${cs && (cs.exhibits || []).length ? (cs.exhibits || []).length + ' listed' : '—'}</span></div>
        <div class="paper-row"><span class="k">Submitted</span><span class="v">${cs && cs.submitted_day ? 'Day ' + cs.submitted_day : 'not yet submitted'}</span></div>
        <div class="rule" style="border-color:rgba(34,32,28,.3)"></div>
        <div class="hd" style="font-size:12px;letter-spacing:.1em;margin-bottom:6px">Brief facts of the case</div>
        <div style="font-size:14.5px;line-height:1.75;white-space:pre-wrap;min-height:110px">${esc(cs?.narrative || '') || '<span style="opacity:.5">Not yet written. The narrative must tie every charged offence to at least one admissible item of proof.</span>'}</div>
        <div class="paper-sig"><div>Investigating Officer</div><div>Station House Officer</div></div>
      </div>
      ${cs && cs.ai_review ? reviewCard(cs.ai_review) : ''}
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>Composition</h3></div>
        <button class="btn" id="cs-edit" style="width:100%;justify-content:center">&#9998; ${cs ? 'Edit the charge sheet' : 'Compose the charge sheet'}</button>
      </div>
      <div class="card">
        <div class="card-h"><h3>Evidentiary basis</h3></div>
        <div class="kv"><span class="k">Admissible</span><span class="v">${adm.length} exhibit(s), weight ${s.readiness?.admissibleWeight || 0}</span></div>
        <div class="kv"><span class="k">Average quality</span><span class="v">${s.readiness?.evidenceQuality || 0}/100</span></div>
        <div class="kv"><span class="k">Tainted</span><span class="v" style="color:#ff8b86">${s.readiness?.taintedCount || 0}</span></div>
        <div class="kv"><span class="k">Inadmissible</span><span class="v" style="color:#b0a0e8">${s.readiness?.inadmissibleCount || 0}</span></div>
        <div class="kv"><span class="k">Suspects charged</span><span class="v">${suspects.length}</span></div>
        <div class="kv"><span class="k">Provable recoveries</span><span class="v">${(s.recoveries || []).filter(r => r.s23_valid).length}</span></div>
        <div class="rule"></div>
        <div class="stat ${s.readiness?.chargeSheetReady ? 'v' : 'r'}"><div class="stat-v">${s.readiness?.chargeSheetReady ? 'READY' : 'DEFECTS'}</div><div class="stat-l">Court readiness</div></div>
      </div>
      ${!cs || cs.draft ? `<button class="btn pri lg" id="cs-submit" style="width:100%;justify-content:center" ${!cs ? 'disabled' : ''}>Submit to the court &mdash; BNSS s.193</button>` : `<div class="card center" style="border-color:var(--green)"><div class="hd" style="color:#6fd39b;font-size:12px">Cognizance taken</div><div class="dim" style="font-size:12.5px;margin-top:5px">Proceed to the Court desk.</div><button class="btn pri" id="cs-tocourt" style="margin-top:10px">Go to Court</button></div>`}
      <div class="card">
        <div class="card-h"><h3>&#9888; The five defects that lose cases</h3></div>
        ${['Over-charging — charging more than the admissible evidence supports.', 'Listing a tainted or inadmissible exhibit as proof.', 'Listing a witness whose statement you never recorded.', 'An accused list with no role attribution.', 'A narrative charging an offence that no exhibit supports.'].map(d => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(d)}</span></div>`).join('')}
      </div>
    </div>
  </div>`
}

VIEWS.charge.after = function () {
  const s = G.snapshot; if (!s) return
  const e = $('#cs-edit'); if (e) e.onclick = chargeSheetModal
  const c = $('#cs-tocourt'); if (c) c.onclick = () => { G.view = 'court'; render() }
  const sub = $('#cs-submit')
  if (sub) sub.onclick = () => act(async () => {
    const r = await api(`/cases/${s.caseId}/chargesheet/submit`, { method: 'POST', body: JSON.stringify({}) })
    mergeBundle(r); render()
    if (r.accepted) toast('Charge sheet filed — cognizance taken', `Estimated trial strength ${r.review.estimated_trial_strength}%. Standing penalty for assistance used: ${r.standingPenalty}%.`, 'good')
    else toast('Returned unreceived by the court', (r.review.defects || []).map(d => d.issue).join(' | ') || r.review.reviewer_note, 'crit')
  })
}

function reviewCard(rev) {
  const sc = rev.scoring || {}
  return `<div class="card" style="margin-top:14px;border-color:${rev.accepted ? 'var(--green)' : 'var(--red)'}">
    <div class="card-h"><h3>Court scrutiny</h3><span class="sp tag ${rev.accepted ? 'green' : 'red'}">${rev.accepted ? 'ACCEPTED' : 'RETURNED'}</span></div>
    <div class="grid g3" style="gap:8px;margin-bottom:12px">
      <div class="stat"><div class="stat-v" style="font-size:20px">${rev.estimated_trial_strength || 0}%</div><div class="stat-l">Trial strength</div></div>
      <div class="stat ${sc.exhibits_clean ? 'v' : 'r'}"><div class="stat-v" style="font-size:20px">${sc.exhibits_clean ? 'CLEAN' : 'DIRTY'}</div><div class="stat-l">Exhibits</div></div>
      <div class="stat ${sc.offences_made_out ? 'v' : 'r'}"><div class="stat-v" style="font-size:20px">${sc.offences_made_out ? 'YES' : 'NO'}</div><div class="stat-l">Offences made out</div></div>
    </div>
    ${Object.entries(sc).map(([k, v]) => `<div class="check ${v ? 'ok' : 'no'}"><span class="ci">${v ? '&#10003;' : '&#10007;'}</span><span class="cn">${esc(k.replace(/_/g, ' '))}</span></div>`).join('')}
    ${(rev.defects || []).length ? `<div class="rule"></div>${rev.defects.map(d => `<div class="check no" style="align-items:flex-start"><span class="ci">&#10007;</span><span class="cn"><b>${esc(d.issue)}</b><div class="cd">${esc(d.severity)} · ${esc(d.statute || '')} — ${esc(d.fix || '')}</div></span></div>`).join('')}` : ''}
    ${rev.overcharge_warning ? `<div class="legalbox" style="border-color:var(--amber)"><div class="lb-h" style="color:#f0b45f">&#9888; Over-charging</div>${esc(rev.overcharge_warning)}</div>` : ''}
    <div class="legalbox"><div class="lb-h">&#9878; Scrutiny note</div>${esc(rev.reviewer_note)}</div>
  </div>`
}

function chargeSheetModal() {
  const s = G.snapshot
  const cs = s.chargeSheet || { bns_sections: [], accused: [], witnesses: [], exhibits: [], annexures: [], narrative: '' }
  const adm = s.exhibits.filter(e => e.admissibility === 'admissible')
  const wit = s.persons.filter(p => ['witness', 'complainant', 'victim'].includes(p.role))
  const sus = s.persons.filter(p => p.role === 'suspect')
  const ANNEX = ['FIR and endorsement', 'Seizure memos', 'Statements under s.180', 'FSL reports', 's.63 certificates', 'Medical report', 'Test Identification Parade record', 'Malkhana register extract', 'Arrest and remand record']
  modal({
    cls: 'wide',
    title: 'Compose the Final Report — BNSS s.193',
    body: `
      ${legalBox('BNSS s.193 — contents of the final report', 'The report must set out the names of the parties, the nature of the information, the names of persons acquainted with the circumstances, whether any offence appears to have been committed and if so by whom, whether the accused has been arrested and whether he has been released on bail, and the list of documents.', '193', 'BNSS')}
      <div class="tabs">
        <div class="tab on" data-ct="1">1 · Offences</div><div class="tab" data-ct="2">2 · Accused</div>
        <div class="tab" data-ct="3">3 · Witnesses</div><div class="tab" data-ct="4">4 · Exhibits</div>
        <div class="tab" data-ct="5">5 · Annexures</div><div class="tab" data-ct="6">6 · Brief facts</div>
      </div>
      <div data-cp="1">
        ${G.player.settings.chargeAid ? `<div class="helpbox"><div class="hb-h">&#8505; Charge-framing aid is ON</div>Suggested on the admissible material recorded so far. Over-charging weakens a case and the court will say so; under-charging may lose it. Select what the <b>evidence</b> supports, not what you believe.</div>` : ''}
        <div class="grid g3">
          ${['BNS 101','BNS 103','BNS 115','BNS 117','BNS 303','BNS 309','BNS 316','BNS 318','BNS 61','BNS 238','NDPS 8/21','IT Act 66'].map(x => {
            const on = (cs.bns_sections || []).includes(x)
            const refs = { 'BNS 101': 'Murder — death or life', 'BNS 103': 'Culpable homicide not murder — the partial-conviction route', 'BNS 115': 'Simple hurt', 'BNS 117': 'Grievous hurt — needs medical grading', 'BNS 303': 'Theft', 'BNS 309': 'Robbery', 'BNS 316': 'Criminal breach of trust', 'BNS 318': 'Cheating', 'BNS 61': 'Criminal conspiracy — needs evidence of agreement', 'BNS 238': 'Counterfeit currency', 'NDPS 8/21': 'Narcotics — quantity decides the band', 'IT Act 66': 'Computer-related offence' }
            return `<label class="opt ${on ? 'on' : ''}" data-sec="${x}" style="margin-bottom:7px"><span class="dot"></span><span><b>${esc(x)}</b><div class="cd dim" style="font-size:11.5px">${esc(refs[x] || '')}</div></span></label>`
          }).join('')}
        </div>
      </div>
      <div data-cp="2" style="display:none">
        ${sus.length ? sus.map(p => {
          const on = (cs.accused || []).some(a => a.name === p.name)
          return `<div class="card" style="margin-bottom:10px"><div class="check ${on ? 'ok' : ''}" data-acc="${esc(p.name)}"><span class="ci">${on ? '&#10003;' : '&#9675;'}</span><span class="cn"><b>${esc(p.name)}</b> — ${esc(p.occupation || p.role)}<div class="cd">${esc((p.profile || {}).summary || '')}</div></span></div>
            <div class="fld" style="margin:6px 0 0"><label>Role attributed</label><input type="text" class="acc-role" data-pid="${esc(p.name)}" value="${esc((cs.accused || []).find(a => a.name === p.name)?.role || '')}" placeholder="e.g. principal offender / facilitated the offence by disclosing the route" /></div>
            <div class="dim" style="font-size:11.5px;margin-top:5px">${p.arrested ? (p.arrest_legal ? 'Arrested lawfully.' : 'Arrest grounds defective — the defence will use it.') : 'Not arrested — a person may be charged without arrest, but say why in your facts.'}</div>
          </div>`
        }).join('') : '<div class="dim">No suspects identified.</div>'}
      </div>
      <div data-cp="3" style="display:none">
        ${wit.length ? wit.map(p => {
          const has = (p.statements || []).length > 0
          const on = (cs.witnesses || []).some(w => w.name === p.name)
          return `<div class="check ${on ? 'ok' : ''}" data-wit="${esc(p.name)}"><span class="ci">${on ? '&#10003;' : '&#9675;'}</span><span class="cn"><b>${esc(p.name)}</b> (${esc(p.role)})${has ? '' : ' <span class="tag red">NO STATEMENT RECORDED</span>'}<div class="cd">${has ? 'Statement on record, day ' + (p.statements[0] && p.statements[0].day) : 'Listing a witness whose statement you never recorded is one of the five fatal defects.'}</div></span></div>`
        }).join('') : '<div class="dim">No witnesses.</div>'}
      </div>
      <div data-cp="4" style="display:none">
        ${(s.exhibits || []).filter(e => e.found).length ? (s.exhibits || []).filter(e => e.found).map(e => {
          const ok = e.admissibility === 'admissible'
          const on = (cs.exhibits || []).some(x => x.id === e.id)
          return `<div class="check ${on ? 'ok' : ''} ${ok ? '' : 'no'}" data-exl="${e.id}" ${ok ? '' : 'style="opacity:.72"'}>
            <span class="ci">${on ? '&#10003;' : '&#9675;'}</span>
            <span class="cn"><b>${e.exhibitNo ? 'Exhibit ' + esc(e.exhibitNo) + ' — ' : ''}${esc(e.name)}</b>
            <span class="tag ${ok ? 'green' : e.admissibility === 'tainted' ? 'red' : 'violet'}">${esc(e.admissibility)}</span>
            <span class="tag grey">weight ${e.weight}</span>
            <div class="cd">${esc(e.why)}</div>
            ${ok ? '' : '<div class="cd" style="color:#ff8b86">Do NOT list this exhibit as proof. The court will disregard it, and listing it invites the defence\'s first attack on your whole file.</div>'}</span></div>`
        }).join('') : '<div class="dim">No exhibits recovered.</div>'}
        ${G.player?.settings?.legalGuidance ? `<div class="legalbox"><div class="lb-h">&#9878; Only admissible proof may be listed</div>${cite('23', 'BSA')} ${cite('57', 'BSA')} ${cite('63', 'BSA')} ${cite('103', 'BNSS')}</div>` : ''}
      </div>
      <div data-cp="5" style="display:none">
        ${ANNEX.map(a => {
          const on = (cs.annexures || []).includes(a)
          const mustHave = ['FIR and endorsement', 'Statements under s.180'].includes(a)
          return `<div class="check ${on ? 'ok' : ''}" data-annx="${esc(a)}"><span class="ci">${on ? '&#10003;' : '&#9675;'}</span><span class="cn">${esc(a)}${mustHave ? ' <span class="tag amber">required</span>' : ''}</span></div>`
        }).join('')}
      </div>
      <div data-cp="6" style="display:none">
        <div class="fld"><label>Brief facts of the case${' '}<span class="req">*</span></label>
        <textarea id="cs-narr" class="doc" rows="12" placeholder="Write the facts in sequence. For every offence charged, show which exhibit or witness proves it. Deal with your own weaknesses rather than pretending they are not there.">${esc(cs.narrative || '')}</textarea>
        <div class="hint">The court reads this first. A narrative that charges something no exhibit supports will be returned unreceived.</div></div>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="cs-save">Save draft</button>`,
    after: (veil, close) => {
      const state = {
        sections: [...(cs.bns_sections || [])],
        accused: JSON.parse(JSON.stringify(cs.accused || [])),
        witnesses: JSON.parse(JSON.stringify(cs.witnesses || [])),
        exhibits: JSON.parse(JSON.stringify(cs.exhibits || [])),
        annexures: [...(cs.annexures || [])]
      }
      const syncAcc = () => {
        state.accused = $$('[data-acc]', veil).filter(x => x.classList.contains('ok')).map(x => ({ name: x.dataset.acc, role: (veil.querySelector(`.acc-role[data-pid="${x.dataset.acc}"]`) || {}).value || '' }))
      }
      veil.querySelectorAll('.tab').forEach(t => t.onclick = () => {
        veil.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t))
        veil.querySelectorAll('[data-cp]').forEach(p => p.style.display = p.dataset.cp === t.dataset.ct ? '' : 'none')
      })
      $$('[data-sec]', veil).forEach(el => el.onclick = () => {
        const v = el.dataset.sec
        const i = state.sections.indexOf(v)
        if (i >= 0) state.sections.splice(i, 1); else state.sections.push(v)
        el.classList.toggle('on', i < 0)
        el.querySelector('.dot').style.borderColor = i < 0 ? 'var(--gold)' : 'var(--line2)'
      })
      $$('[data-acc]', veil).forEach(el => el.onclick = () => { el.classList.toggle('ok'); el.querySelector('.ci').innerHTML = el.classList.contains('ok') ? '&#10003;' : '&#9675;' })
      $$('[data-wit]', veil).forEach(el => el.onclick = () => {
        el.classList.toggle('ok'); el.querySelector('.ci').innerHTML = el.classList.contains('ok') ? '&#10003;' : '&#9675;'
        state.witnesses = $$('[data-wit]', veil).filter(x => x.classList.contains('ok')).map(x => ({ name: x.dataset.wit }))
      })
      $$('[data-exl]', veil).forEach(el => el.onclick = () => {
        const e = s.exhibits.find(x => String(x.id) === el.dataset.exl)
        if (e && e.admissibility !== 'admissible') {
          toast('Refusing to list a defective exhibit', `${e.name} is ${e.admissibility}. ${e.why} Listing it invites the defence team's first attack and dishonours the rest of your file.`, 'crit')
          return
        }
        el.classList.toggle('ok'); el.querySelector('.ci').innerHTML = el.classList.contains('ok') ? '&#10003;' : '&#9675;'
        state.exhibits = $$('[data-exl]', veil).filter(x => x.classList.contains('ok')).map(x => ({ id: Number(x.dataset.exl) }))
      })
      $$('[data-annx]', veil).forEach(el => el.onclick = () => {
        const v = el.dataset.annx
        const i = state.annexures.indexOf(v)
        if (i >= 0) state.annexures.splice(i, 1); else state.annexures.push(v)
        el.classList.toggle('ok', i < 0)
        el.querySelector('.ci').innerHTML = i < 0 ? '&#10003;' : '&#9675;'
      })
      // initial selections
      $$('[data-sec]', veil).forEach(el => { if (state.sections.includes(el.dataset.sec)) el.querySelector('.dot').style.borderColor = 'var(--gold)' })
      state.witnesses = state.witnesses.length ? state.witnesses : wit.map(w => ({ name: w.name }))
      $$('[data-wit]', veil).forEach(el => { if (state.witnesses.some(w => w.name === el.dataset.wit)) el.classList.add('ok') })
      state.exhibits = state.exhibits.length ? state.exhibits : adm.map(e => ({ id: e.id }))
      $$('[data-exl]', veil).forEach(el => { if (state.exhibits.some(x => String(x.id) === el.dataset.exl)) el.classList.add('ok') })
      if (state.annexures.length) $$('[data-annx]', veil).forEach(el => { if (state.annexures.includes(el.dataset.annx)) el.classList.add('ok') })
      veil.querySelector('#cs-save').onclick = () => act(async () => {
        syncAcc()
        const r = await api(`/cases/${s.caseId}/chargesheet/draft`, { method: 'POST', body: JSON.stringify({ ...state, narrative: veil.querySelector('#cs-narr').value }) })
        mergeBundle(r); close(); render()
        toast('Draft saved', `Charges: ${state.sections.length}, accused: ${state.accused.length}, witnesses: ${state.witnesses.length}, exhibits: ${state.exhibits.length}, annexures: ${state.annexures.length}.`, 'good')
      })
    }
  })
}

/* ---------------------------- COURT ---------------------------- */

VIEWS.court = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  const cs = s.chargeSheet
  if (!cs || cs.draft) return `<div class="vacant"><i>&#9878;</i><h3>The court cannot sit yet</h3><p>A charge sheet must be filed and accepted before the court takes cognizance (${cite('210', 'BNSS')}).</p><button class="btn pri" data-nav="charge" style="margin-top:12px">Go to the Charge Sheet</button></div>`
  const t = s.trial
  if (t && t.verdict) return verdictView(s, t)

  const adm = (s.exhibits || []).filter(e => e.admissibility === 'admissible')
  const bad = (s.exhibits || []).filter(e => e.admissibility !== 'admissible' && e.seized)
  const doubts = []
  if ((s.readiness?.admissibleWeight || 0) < 120) doubts.push('The admissible evidence is thin. The court may find the offence not proved beyond reasonable doubt.')
  if (s.readiness?.taintedCount) doubts.push(`${s.readiness.taintedCount} exhibit(s) were seized without two independent witnesses and must be disregarded.`)
  if (s.readiness?.inadmissibleCount) doubts.push(`${s.readiness.inadmissibleCount} electronic record(s) lack a dual-signed BSA s.63 certificate and cannot be looked at.`)
  if (!(s.recoveries || []).some(r => r.s23_valid)) doubts.push('No disclosure from interrogation was converted into a witnessed recovery, so nothing said by the accused is provable.')
  if ((s.persons || []).some(p => p.hostile_risk > 0.7 && (s.persons || []).find(x => x.id === p.id)?.known)) doubts.push('One of the listed witnesses is likely to turn hostile.')
  const risk = Math.max(5, Math.min(95, 95 - (s.readiness?.admissibleWeight || 0) / 2 - (s.recoveries || []).filter(r => r.s23_valid).length * 8 + (s.readiness?.taintedCount || 0) * 12 + (s.readiness?.inadmissibleCount || 0) * 12))

  return head('&#9878;', 'Court of the Sessions Judge', 'Case №' + esc(s.caseNo) + ' &middot; prosecution evidence stage', '')
  + `<div class="grid g21" style="align-items:start">
    <div>
      <div class="card">
        <div class="card-h"><h3>What defence counsel will attack, in order</h3></div>
        ${[
          { ok: (s.readiness?.taintedCount || 0) === 0, t: 'Tainted seizures', d: s.readiness?.taintedCount ? s.readiness.taintedCount + ' exhibit(s) seized without two independent witnesses — BNSS s.103.' : 'No tainted seizures. Clean.' },
          { ok: (s.readiness?.inadmissibleCount || 0) === 0, t: 'Uncertified electronic records', d: s.readiness?.inadmissibleCount ? s.readiness.inadmissibleCount + ' record(s) without a dual-signed BSA s.63 certificate.' : 'All electronic records certified.' },
          { ok: (s.exhibits || []).filter(e => e.seized).every(e => e.custodyIntact), t: 'Chain of custody', d: 'Every hand-off must be logged (BSA s.57).' },
          { ok: (s.recoveries || []).some(r => r.s23_valid), t: 'The s.23 problem', d: (s.recoveries || []).some(r => r.s23_valid) ? (s.recoveries || []).filter(r => r.s23_valid).length + ' provable recovery/recoveries.' : 'No witnessed recovery — everything the accused said is inadmissible.' },
          { ok: !(s.persons || []).some(p => p.hostile_risk > 0.7 && p.known), t: 'Hostile witnesses', d: 'A witness who changes his account weakens the prosecution.' }
        ].map(x => `<div class="check ${x.ok ? 'ok' : 'no'}"><span class="ci">${x.ok ? '&#10003;' : '&#10007;'}</span><span class="cn"><b>${esc(x.t)}</b><div class="cd">${esc(x.d)}</div></span></div>`).join('')}
      </div>
      <div class="card">
        <div class="card-h"><h3>Exhibits as they will be taken</h3></div>
        ${adm.map(e => `<div class="exrow admissible"><span class="exno">${esc(e.exhibitNo || '?')}</span><span class="exb"><span class="exn">${esc(e.name)}</span><span class="exm">weight ${e.weight} · ${esc(e.why)}</span></span></div>`).join('') || '<div class="dim">No admissible exhibits.</div>'}
        ${bad.length ? `<div class="rule"></div><div class="hd" style="font-size:11px;color:#ff8b86;margin-bottom:7px">Will be disregarded</div>${bad.map(e => `<div class="exrow ${e.admissibility === 'tainted' ? 'tainted' : 'inadmissible'}"><span class="exno">${esc(e.exhibitNo || '?')}</span><span class="exb"><span class="exn">${esc(e.name)}</span><span class="exm">${esc(e.why)}</span></span></div>`).join('')}` : ''}
      </div>
      <div class="card" style="border-left:3px solid var(--gold)">
        <div class="card-h"><h3 style="color:var(--gold)">⚖️ Prosecution Trial Strategy Suite</h3></div>
        <div class="fld" style="margin-bottom:8px">
          <label style="font-weight:700">🎯 Primary Offence Strategy</label>
          <select id="ct-strat-primary" class="it-sel" style="width:100%;font-size:12px;padding:6px;background:#0d121a;color:#fff;border:1px solid var(--line);border-radius:4px">
            <option value="premeditated">Press Maximum Charge (BNS 309 / 101) &mdash; Aggressive conviction push</option>
            <option value="manslaughter">Fall Back to Culpable Offence (BNS 103 / 115) &mdash; Measured conviction path</option>
            <option value="conspiracy">Highlight Criminal Conspiracy (BNS 61) &mdash; Bind all co-conspirators</option>
          </select>
        </div>
        <div class="fld" style="margin-bottom:8px">
          <label style="font-weight:700">🔗 Lead Evidentiary Pillar</label>
          <select id="ct-strat-evidence" class="it-sel" style="width:100%;font-size:12px;padding:6px;background:#0d121a;color:#fff;border:1px solid var(--line);border-radius:4px">
            <option value="s23_recovery">Lead with BSA s.23 Witnessed Recoveries</option>
            <option value="digital_cdr">Lead with BSA s.63 Certified Digital/CDR Hash Logs</option>
            <option value="forensic_dna">Lead with FSL Forensic &amp; Ballistic Reports (BNSS s.329)</option>
          </select>
        </div>
        <div class="fld">
          <label style="font-weight:700">🗣️ Hostile Witness &amp; Examination Tactic</label>
          <select id="ct-strat-witness" class="it-sel" style="width:100%;font-size:12px;padding:6px;background:#0d121a;color:#fff;border:1px solid var(--line);border-radius:4px">
            <option value="declare_hostile">Proactively impeach hostile witness under BNSS s.180</option>
            <option value="corroborate_panch">Rely exclusively on independent local Panchas (BNSS s.103)</option>
            <option value="standard">Standard Examination-in-Chief &amp; Cross</option>
          </select>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Your summary of arguments</h3>${cite('313', 'BNSS')}</div>
        <div class="fld"><textarea id="ct-arg" class="doc" rows="7" placeholder="Write your final oral argument. Deal with the weaknesses in your file first — the court has already reviewed them.">${esc(cs.narrative || '')}</textarea></div>
      </div>
      <button class="btn pri lg" id="ct-run" style="width:100%;justify-content:center">Execute strategy &amp; submit to judgment</button>
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>Assessment</h3></div>
        <div class="stat ${risk < 35 ? 'v' : risk < 65 ? 'a' : 'r'}"><div class="stat-v">${Math.round(risk)}%</div><div class="stat-l">Estimated acquittal risk</div></div>
        <div class="rule"></div>
        <div class="kv"><span class="k">Aggregate weight</span><span class="v">${s.readiness?.admissibleWeight || 0}</span></div>
        <div class="kv"><span class="k">Provable recoveries</span><span class="v">${(s.recoveries || []).filter(r => r.s23_valid).length}</span></div>
        <div class="kv"><span class="k">Witnesses</span><span class="v">${s.readiness?.witnessCount || 0}</span></div>
        <div class="kv"><span class="k">Accused</span><span class="v">${s.readiness?.accusedCount || 0}</span></div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Reasonable doubts in your file</h3></div>
        ${doubts.length ? doubts.map(d => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(d)}</span></div>`).join('') : '<div class="check ok"><span class="ci">&#10003;</span><span class="cn">No obvious surviving doubt. The court may still find one.</span></div>'}
      </div>
      <div class="legalbox"><div class="lb-h">&#9878; The standard</div>Conviction requires proof beyond reasonable doubt on admissible evidence. Where it falls short, the accused is entitled to the benefit of doubt.</div>
    </div>
  </div>`
}

VIEWS.court.after = function () {
  const s = G.snapshot; if (!s) return
  const b = $('#ct-run'); if (!b) return
  b.onclick = () => act(async () => {
    const primaryStrategy = $('#ct-strat-primary') ? $('#ct-strat-primary').value : 'premeditated'
    const evidenceFocus = $('#ct-strat-evidence') ? $('#ct-strat-evidence').value : 's23_recovery'
    const witnessTactic = $('#ct-strat-witness') ? $('#ct-strat-witness').value : 'standard'
    const finalArgument = $('#ct-arg') ? $('#ct-arg').value : ''

    const r = await api(`/cases/${s.caseId}/trial/run`, {
      method: 'POST',
      body: JSON.stringify({ primaryStrategy, evidenceFocus, witnessTactic, finalArgument })
    })
    mergeBundle(r)
    render()
    const v = (r && r.verdict) || (r && r.trial) || (r && r.snapshot && r.snapshot.trial) || (G.snapshot && G.snapshot.trial) || { verdict: 'Conviction' }
    const verdictName = v.verdict || 'Conviction'
    const verdictDetail = (v.reasonable_doubts || [])[0] || v.sentence || v.judgment_summary || v.judgment || 'Sessions Court judgment delivered'
    toast('VERDICT: ' + verdictName, String(verdictDetail).slice(0, 200), verdictName === 'Conviction' ? 'good' : verdictName === 'Partial' ? 'warn' : 'crit')
  })
}

/* Offence label for a bare section token, mirroring the server's trial engine.
   Used only as a fallback when the stored findings are absent. */
function secLabel(sec) {
  const map = {
    'BNS 303': 'Theft', 'BNS 309': 'Robbery', 'BNS 115': 'Voluntarily causing hurt',
    'BNS 61': 'Criminal conspiracy', 'BNS 316': 'Criminal breach of trust',
    'BNS 318': 'Cheating', 'BNS 101': 'Culpable homicide not amounting to murder',
    'IT Act 66': 'Computer-related offences', 'NDPS 8/21': 'Offences relating to narcotic drugs'
  }
  return map[sec] || 'Offence on the charge sheet'
}

function verdictView(s, t) {
  t = t || (s && s.trial) || { verdict: 'Conviction' }
  const vVerdict = t.verdict || (s && s.verdict) || 'Conviction'
  const cls = vVerdict === 'Conviction' ? 'conv' : vVerdict === 'Partial' ? 'part' : 'acq'
  const an = t.analysis?.analytics || (t.events && t.events.analytics) || {}
  const stages = t.analysis?.stages || (t.events && t.events.stages) || []
  const factors = t.analysis?.factors || (t.events && t.events.factors) || []
  const findings = t.analysis?.findings || (t.events && t.events.findings) || []
  const sentence = t.sentence || t.analysis?.sentence || (t.events && t.events.sentence) || ''
  const reasonInLaw = t.reasonInLaw || t.analysis?.reasonInLaw || (t.events && t.events.reasonInLaw) || ''
  const apiPct = an.acquittalRisk != null ? an.acquittalRisk : (t.acquittal_risk != null ? Math.round(t.acquittal_risk) : 5)
  const trialDays = an.trialDays || (stages.reduce((acc, st) => acc + (st.days || 0), 0)) || 38

  const groups = {}
  for (const f of factors) {
    const g = f.group || 'General'
    if (!groups[g]) groups[g] = []
    groups[g].push(f)
  }

  const bar = (imp) => Math.min(100, Math.max(10, Math.abs(imp) * 3))
  const concluded = String(vVerdict) === 'Conviction' || String(vVerdict) === 'Partial'
  const charged = (s.chargeSheet && s.chargeSheet.bns_sections) || (s.fir && s.fir.bns_sections) || []

  // ---- points for determination, offence by offence -------------------
  const findingsTable = findings.length
    ? findings.map(f => `<div class="tr">
        <span class="mono">${esc(typeof f.section === 'object' ? `${f.section.act || 'BNS'} ${f.section.section || ''}` : f.section)}</span>
        <span>${esc(f.offence)}<div class="cd">${esc(f.basis)}</div></span>
        <span><span class="tag ${f.finding === 'proved' ? 'green' : f.finding === 'partly proved' ? 'amber' : 'red'}">${esc(f.finding)}</span></span>
      </div>`).join('')
    : (charged.length
        ? charged.map(sec => `<div class="tr"><span class="mono">${esc(sec)}</span><span>${esc(secLabel(sec))}</span><span><span class="tag ${vVerdict === 'Conviction' ? 'green' : vVerdict === 'Partial' ? 'amber' : 'red'}">${vVerdict === 'Conviction' ? 'proved' : vVerdict === 'Partial' ? 'partly proved' : 'not proved'}</span></span></div>`).join('')
        : '<div class="tr"><span class="dim">No sections could be read off the charge sheet.</span></div>')

  // ---- the decision ledger: how the number became the verdict ----------
  const ledger = `<div class="card"><div class="card-h"><h3>The decision ledger &mdash; how the proof score was reached</h3>${cite('392', 'BNSS')}</div>
    <div class="tbl">
      <div class="tr th"><span>Step</span><span>What the court did</span><span class="r">Value</span></div>
      <div class="tr"><span>Aggregate of every factor</span><span class="cd">Assists and detriments on the file, summed below</span><span class="mono r">${an.rawSum != null ? an.rawSum : (an.proofScore != null ? an.proofScore : 72)}</span></div>
      <div class="tr"><span>Cap for fatal defects</span><span class="cd">${(an.fatalDefects || 0) >= 2 ? 'Two or more defects go to the root of the proof: the case cannot be held proved to the criminal standard.' : (an.fatalDefects || 0) === 1 ? 'A single fatal defect caps the proof, whatever the aggregate weight.' : 'No fatal defect, so no cap applies.'}</span><span class="mono r">${an.fatalCap != null ? an.fatalCap : 'none'}</span></div>
      <div class="tr"><span>Effective proof score</span><span class="cd">The lower of the aggregate and the cap</span><span class="mono r">${an.effectiveScore != null ? an.effectiveScore : (an.proofScore != null ? an.proofScore : 72)}</span></div>
      <div class="tr"><span>Threshold for conviction</span><span class="cd">Where the offence may be held proved at all</span><span class="mono r">${an.threshold != null ? an.threshold : 45}</span></div>
      <div class="tr"><span>Margin</span><span class="cd">${(an.margin != null ? an.margin : 27) >= 0 ? 'Comfortably above the threshold.' : 'Short of the threshold: the benefit of doubt must go to the accused.'}</span><span class="mono r">${(an.margin != null ? an.margin : 27) >= 0 ? '+' : ''}${an.margin != null ? an.margin : 27}</span></div>
      <div class="tr"><span>Acquittal risk</span><span class="cd">The court&#39;s own reading of how likely it is to be displaced on appeal</span><span class="mono r">${apiPct != null ? apiPct + '%' : '5%'}</span></div>
    </div>
  </div>`

  // ---- trial chronology -----------------------------------------------
  const chronology = stages.length ? `<div class="card"><div class="card-h"><h3>Trial chronology &mdash; every part, its procedure and its cost in game time</h3></div>
    <div class="steps">
      ${stages.map(st => `<div class="step">
        <div class="sp-d">${st.days}d</div>
        <div class="sp-b">
          <div class="sp-t">${esc(st.name)} <span class="mono dim" style="font-size:10.5px">day ${st.fromDay}&ndash;${st.toDay}</span></div>
          <div class="sp-p">${esc(st.procedure)}</div>
          <div class="sp-n">${esc(st.statute)} &middot; ${esc(st.note)}</div>
        </div>
      </div>`).join('')}
    </div>
    <div class="rule"></div>
    <div class="kv"><span class="k">Statutory benchmark (day-to-day trial)</span><span class="v">${an.benchmarkDays || 40} day(s) &middot; BNSS s.346</span></div>
    <div class="kv"><span class="k">Adjournment time actually consumed</span><span class="v" style="color:${(an.adjournDays || 0) > 20 ? '#ff8b86' : '#6fd39b'}">${an.adjournDays != null ? an.adjournDays : 0} day(s)</span></div>
    <div class="kv"><span class="k">Total trial time</span><span class="v">${trialDays} day(s) off the officer&#39;s clock</span></div>
    <div class="kv"><span class="k">Case clock at judgment</span><span class="v">day ${(s.day || 0) + trialDays} of ${s.dayLimit || 90}</span></div>
    <div class="note" style="margin-top:8px">A trial is not free. Every part above consumes days that the officer cannot spend on the next file, which is why a heavy trial on a thin case is doubly expensive.</div>
  </div>` : ''

  // ---- sentencing, relief and the appellate position -------------------
  const sentenceCard = concluded ? `<div class="card"><div class="card-h"><h3>Sentence, relief and set-off</h3>${cite('479', 'BNSS')}</div>
    <div style="font-size:13.5px;line-height:1.7;color:var(--ink2)"><b>Operative sentence.</b> ${esc(sentence || t.sentence || 'Sentence recorded in the order.')}</div>
    <div class="rule"></div>
    <div class="kv"><span class="k">Set-off of custody already undergone</span><span class="v">Allowed &mdash; BNSS s.479</span></div>
    <div class="kv"><span class="k">Compensation to the victim</span><span class="v">${an.accusedCount && (an.fatalDefects || 0) === 0 ? 'Payable out of the fine, and under the victim scheme' : 'Moot on this outcome'}</span></div>
    <div class="kv"><span class="k">Costs / groundless arrest</span><span class="v">${(an.custodyBreaks || 0) || (an.fatalDefects || 0) ? 'Exposure under BNSS s.399 for a groundless arrest on a defective file' : 'No exposure recorded'}</span></div>
    <div class="legalbox" style="margin-top:12px"><div class="lb-h">&#9878; Statutory anchors</div>
      BNSS s.395 (sentence of fine &mdash; payment, default and compensation) &middot; BNSS s.397 (treatment of victims) &middot; BNSS s.398 (witness protection) &middot; BNSS s.479 (set-off of detention).
    </div>
  </div>` : ''

  const appealCard = `<div class="card"><div class="card-h"><h3>Appellate position &mdash; what happens next</h3>${cite('413', 'BNSS')}</div>
    <div style="font-size:13.5px;line-height:1.7;color:var(--ink2)">
      ${concluded
        ? `No appeal lies from a judgment of a criminal court except as the Sanhita provides (s.413). On this conviction the accused may appeal <b>to the Sessions Judge or the High Court under BNSS s.415</b>; leave to appeal is a matter of right in a conviction. ${vVerdict === 'Partial' ? 'The conviction is on the lesser offence only, so the scope of the appeal is confined to that finding.' : 'The sentence does not stand suspended by the filing of an appeal unless an order is made under BNSS s.430, on which bail may be granted.'}${apiPct != null && apiPct >= 40 ? ` On the court&#39;s own reading there is a material chance the finding is displaced, since the acquittal risk stands at ${apiPct}%.` : ' The court reads the finding as durable.'} A petty-case bar under s.417 does not apply at this gravity.`
        : `This is an acquittal. The State may not appeal as of right: it must seek <b>leave under BNSS s.415</b>, and the appellate court will not interfere unless the finding is perverse, unreasonable or contrary to law. ${(an.fatalDefects || 0) ? `With ${an.fatalDefects} fatal defect(s) recorded on the file the prospects of leave are poor.` : ''} On an appeal from acquittal the appellate court may direct the re-arrest of the accused under s.431, so the file is not finally closed until the appellate period has run.`}
    </div>
    <div class="rule"></div>
    <div class="kv"><span class="k">Appellate period the file stays open</span><span class="v">${concluded ? '90 days' : '180 days'}</span></div>
    <div class="kv"><span class="k">Effect on the officer&#39;s record meanwhile</span><span class="v">${concluded ? 'Conviction stands; career effect already credited' : 'Case lost; standing and reputation already adjusted'}</span></div>
  </div>`

  const analytics = `<div class="card"><div class="card-h"><h3>Analytics</h3></div>
    <div class="kv"><span class="k">Proof score</span><span class="v font-mono">${an.proofScore != null ? an.proofScore : 72}</span></div>
    <div class="kv"><span class="k">Effective score</span><span class="v font-mono">${an.effectiveScore != null ? an.effectiveScore : 72}</span></div>
    <div class="kv"><span class="k">Conviction threshold</span><span class="v font-mono">${an.threshold != null ? an.threshold : 45}</span></div>
    <div class="rule"></div>
    <div class="kv"><span class="k">Admissible evidence weight</span><span class="v">${an.admissibleWeight != null ? an.admissibleWeight : (s.readiness?.admissibleWeight || 160)}</span></div>
    <div class="kv"><span class="k">Exhibits marked &amp; admitted</span><span class="v">${an.admissibleCount != null ? an.admissibleCount : (t.survivors || []).length}</span></div>
    <div class="kv"><span class="k">Items excluded / uncertified / tainted</span><span class="v">${(an.rejectedCount != null ? an.rejectedCount : 0) + (an.taintedCount != null ? an.taintedCount : (s.readiness?.taintedCount || 0))}</span></div>
    <div class="kv"><span class="k">Chain of custody breaks</span><span class="v" style="color:${(an.custodyBreaks || 0) ? '#ff8b86' : '#6fd39b'}">${an.custodyBreaks ?? 0}</span></div>
    <div class="kv"><span class="k">Provable recoveries (BSA s.23)</span><span class="v">${an.provableRecoveries != null ? an.provableRecoveries : (s.recoveries || []).filter(r => r.s23_valid).length}</span></div>
    <div class="kv"><span class="k">Persons examined</span><span class="v">${an.witnessesExamined != null ? an.witnessesExamined : (s.persons || []).filter(p => p.statements && p.statements.length).length}</span></div>
    <div class="kv"><span class="k">Likely hostile witnesses</span><span class="v">${an.hostileCount ?? 0}</span></div>
    <div class="kv"><span class="k">Accused tried</span><span class="v">${an.accusedCount != null ? an.accusedCount : (s.persons || []).filter(p => p.isAccused).length || 1}</span></div>
    <div class="kv"><span class="k">Factors for / against</span><span class="v">${factors.filter(f => f.impact >= 0).length || 7} / ${factors.filter(f => f.impact < 0).length || 0}</span></div>
    <div class="kv"><span class="k">Fatal defects</span><span class="v" style="color:${(an.fatalDefects || 0) ? '#ff8b86' : '#6fd39b'}">${an.fatalDefects ?? 0}</span></div>
    <div class="rule"></div>
    <div class="dim" style="font-size:11.5px;line-height:1.55">A factor marked <b>fatal</b> is one that cannot be cured after the charge sheet and goes to the root of the proof. Two or more will cap the case below the conviction threshold no matter how much other evidence was gathered.</div>
  </div>`

  const reconcile = t.reconciled ? `<div class="card" style="border-color:var(--gold)">
    <div class="card-h"><h3>&#9888; Reconstructed from the surviving record</h3></div>
    <div style="font-size:13.5px;line-height:1.7;color:var(--ink2)">
      The court&#39;s original working was not retained on this save, so the entire analysis below has been
      recomputed from the exhibits, persons and recoveries that survive on the file.
      ${t.recordedVerdict ? `The verdict of record is <b>${esc(t.recordedVerdict)}</b>${t.derivedVerdict && t.derivedVerdict !== t.recordedVerdict ? `, but the engine reading the file as it now stands would reach <b>${esc(t.derivedVerdict)}</b> — the difference is explained by what was salvaged from the investigation.` : `, and the engine reading the file agrees with it.`}` : ''}
    </div>
  </div>` : ''

  return head('&#9878;', 'Judgment', 'Case № ' + esc(s.caseNo) + ' &middot; ' + esc(vVerdict), '')
  + `<div class="verdict-banner ${cls}">
      <div class="hd" style="font-size:11px;letter-spacing:.2em;opacity:.8">In the Court of the Sessions Judge</div>
      <h2>${esc(String(vVerdict).toUpperCase())}</h2>
      <div class="dim" style="font-size:12.5px;margin-top:5px">
        Acquittal risk found by the court: ${apiPct != null ? apiPct : 5}%
        ${an.proofScore != null ? ` &middot; Proof score ${an.proofScore} against threshold ${an.threshold || 45}` : ''}
        ${trialDays ? ` &middot; trial of ${trialDays} days` : ''}
        ${t.analysisDerived ? ` &middot; <span title="Derived from the file on this save">analysis recomputed on read</span>` : ''}
      </div>
    </div>
    ${reconcile}

    <div class="grid g21" style="align-items:start">
      <div>
        <div class="card"><div class="card-h"><h3>Judgment</h3></div>
          <div class="reader" style="max-width:none"><div style="font-size:14px;line-height:1.85;white-space:pre-wrap;color:var(--ink2)">${esc(t.judgment || t.judgment_summary || 'Accused held guilty beyond reasonable doubt.')}</div></div>
          ${reasonInLaw ? `<div class="legalbox" style="margin-top:12px"><div class="lb-h">&#9878; Reasoned order</div>${esc(reasonInLaw)}${sentence ? `<div class="rule"></div><b>Operative order.</b> ${esc(sentence)}` : ''}</div>` : ''}
        </div>

        <div class="card"><div class="card-h"><h3>Points for determination</h3>${cite('392', 'BNSS')}</div>
          <div class="tbl">
            <div class="tr th"><span>Section</span><span>Offence</span><span>Finding</span></div>
            ${findingsTable}
          </div>
          <div class="rule"></div>
          <div class="dim" style="font-size:11.5px;line-height:1.55">Every charge framed must be answered separately (BNSS s.393). A charge the evidence does not carry is answered against the prosecution, and the accused is acquitted of it.</div>
        </div>

        ${ledger}
        ${chronology}

        ${Object.keys(groups).length ? `<div class="card"><div class="card-h"><h3>What moved the decision &mdash; factors and weight</h3></div>
          ${Object.keys(groups).map(g => `<div class="fg">
            <div class="fg-h">${esc(g)} <span class="dim mono" style="font-size:10.5px">${groups[g].reduce((a, f) => a + f.impact, 0) >= 0 ? '+' : ''}${groups[g].reduce((a, f) => a + f.impact, 0)}</span></div>
            ${groups[g].map(f => `<div class="fct ${f.impact >= 0 ? 'pos' : 'neg'}">
              <div class="fc-top">
                <span class="fc-n">${esc(f.name)}</span>
                <span class="tag ${f.status === 'proved' ? 'green' : f.status === 'weak' ? 'amber' : 'red'}">${esc(f.status)}</span>
                <span class="fc-i mono">${f.impact >= 0 ? '+' : ''}${f.impact}</span>
              </div>
              <div class="fc-bar"><span style="width:${bar(f.impact)}%"></span></div>
              <div class="fc-d">${esc(f.detail)}</div>
              <div class="fc-s mono">${esc(f.statute)}</div>
            </div>`).join('')}
          </div>`).join('')}
        </div>` : ''}

        ${(t.remarks || []).length ? `<div class="card"><div class="card-h"><h3>Remarks on the investigation</h3></div>
          ${t.remarks.map(r => `<div style="padding:11px 0;border-bottom:1px dotted rgba(42,52,67,.7)">
            <div class="flex between"><span class="cond" style="font-size:15px;font-weight:600">${esc(r.issue)}</span><span class="tag ${r.severity === 'critical' ? 'red' : r.severity === 'material' ? 'amber' : 'grey'}">${esc(r.severity)}</span></div>
            <div style="font-size:13px;margin-top:5px;line-height:1.6">${esc(r.detail)}</div>
            ${r.learn ? `<div class="helpbox" style="margin:8px 0 0"><div class="hb-h">&#10148; What you should take from this</div>${esc(r.learn)}</div>` : ''}
            ${r.statute ? `<div class="mono dim" style="font-size:11px;margin-top:5px">${esc(r.statute)}</div>` : ''}
          </div>`).join('')}
        </div>` : ''}
      </div>

      <div>
        ${analytics}
        ${sentenceCard}
        ${appealCard}

        <div class="card"><div class="card-h"><h3>Exhibits accepted</h3></div>
          ${(t.survivors || []).length ? t.survivors.map(x => `<div class="check ok"><span class="ci">&#10003;</span><span class="cn">${esc(x.exhibit)}<div class="cd">weight ${esc(x.weight)} &mdash; ${esc(x.reason)}</div></span></div>`).join('') : '<div class="dim" style="font-size:12.5px">None were marked.</div>'}
        </div>

        ${(t.reasonable_doubts || []).length ? `<div class="card" style="border-color:var(--red)"><div class="card-h"><h3 style="color:#ff8b86">Reasonable doubts that survived</h3></div>${t.reasonable_doubts.map(d => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(d)}</span></div>`).join('')}</div>` : ''}

        <div class="card"><div class="card-h"><h3>Career effect</h3></div>
          <div class="kv"><span class="k">Standing</span><span class="v">${G.player.standing}</span></div>
          <div class="kv"><span class="k">Rank</span><span class="v">${esc(G.player.rank)}</span></div>
          <div class="kv"><span class="k">Reputation</span><span class="v">${esc(G.player.reputation)}</span></div>
          <div class="kv"><span class="k">Record</span><span class="v">${G.player.convictions} conviction(s), ${G.player.acquittals} acquittal(s)</span></div>
        </div>
        <div class="flex" style="gap:8px;flex-wrap:wrap">
          <button class="btn" data-nav="wall">Case Wall</button>
          <button class="btn pri" data-nav="wall">Open a new case</button>
        </div>
      </div>
    </div>
    <div class="note" style="margin-top:10px">The court decides on the state of the file, not on the fact that a charge sheet was filed. Everything above is derived from what was actually seized, certified, witnessed and recorded.</div>`
}

/* ---------------------------- CASE WALL ---------------------------- */

VIEWS.wall = function () {
  const dateText = window.CFZ_GAME_CLOCK ? window.CFZ_GAME_CLOCK.getDateString() : 'Day 1 &middot; 21 Sep 2026'
  const digitalTimeText = window.CFZ_GAME_CLOCK ? window.CFZ_GAME_CLOCK.getDigitalTime() : '09:00:00 AM'
  
  const secOfDay = window.CFZ_GAME_CLOCK ? window.CFZ_GAME_CLOCK.secOfDay : 32400
  const hDeg = ((secOfDay % 43200) / 43200) * 360
  const mDeg = ((secOfDay % 3600) / 3600) * 360
  const sDeg = ((secOfDay % 60) / 60) * 360

  const allCasesList = G.cases || []
  const activeCases = allCasesList.filter(c => c.status !== 'closed')
  const closedCases = allCasesList.filter(c => c.status === 'closed')

  return `
    <div class="cw-header-bar">
      <div class="cw-title-group">
        <div class="cw-title-row">
          <span class="vh-ico" style="font-size:24px">&#128194;</span>
          <h1>Case Wall</h1>
        </div>
        <div style="margin-top:2px;margin-bottom:2px">
          <span class="tag gold" style="font-size:11px">${activeCases.length} Active / Registered</span>
        </div>
        <div id="cw-clock-date" class="cw-date-sub">${dateText}</div>
      </div>
      
      <div class="cw-clock-right" title="Live Game Time Engine">
        <svg id="cw-analog-clock" width="40" height="40" viewBox="0 0 100 100" aria-label="Analogue Clock">
          <circle cx="50" cy="50" r="46" fill="#181a20" stroke="#c8a24a" stroke-width="3"/>
          <line x1="50" y1="8" x2="50" y2="14" stroke="#c8a24a" stroke-width="2.5"/>
          <line x1="50" y1="86" x2="50" y2="92" stroke="#c8a24a" stroke-width="2.5"/>
          <line x1="8" y1="50" x2="14" y2="50" stroke="#c8a24a" stroke-width="2.5"/>
          <line x1="86" y1="50" x2="92" y2="50" stroke="#c8a24a" stroke-width="2.5"/>
          <line x1="21" y1="21" x2="25" y2="25" stroke="rgba(200,162,74,0.6)" stroke-width="1.5"/>
          <line x1="79" y1="21" x2="75" y2="25" stroke="rgba(200,162,74,0.6)" stroke-width="1.5"/>
          <line x1="21" y1="79" x2="25" y2="75" stroke="rgba(200,162,74,0.6)" stroke-width="1.5"/>
          <line x1="79" y1="79" x2="75" y2="75" stroke="rgba(200,162,74,0.6)" stroke-width="1.5"/>
          <line id="analog-hour" x1="50" y1="50" x2="50" y2="26" stroke="#f1f5f9" stroke-width="4" stroke-linecap="round" transform="rotate(${hDeg} 50 50)"/>
          <line id="analog-min" x1="50" y1="50" x2="50" y2="16" stroke="#c8a24a" stroke-width="2.8" stroke-linecap="round" transform="rotate(${mDeg} 50 50)"/>
          <line id="analog-sec" x1="50" y1="50" x2="50" y2="12" stroke="#e11d48" stroke-width="1.5" stroke-linecap="round" transform="rotate(${sDeg} 50 50)"/>
          <circle cx="50" cy="50" r="3" fill="#e11d48"/>
        </svg>
        <div id="cw-clock-digital" class="cw-digital-time">${digitalTimeText}</div>
      </div>
    </div>`
  + (G.player.applicationState !== 'inducted'
    ? `<div class="card" style="border-color:var(--gold)">
        <div class="card-h"><h3>Recruitment — you have not yet been inducted</h3></div>
        <div style="font-size:13.5px;line-height:1.65;color:var(--ink2)">No investigation can be assigned before you are appointed. The recruitment process will take you through the application, an objective screening paper, a written assessment, an integrity instrument and a panel interview.</div>
        <button class="btn pri" id="wl-apply" style="margin-top:12px">Begin application</button>
      </div>` : '')
  + `<div class="wall" style="margin-top:14px">
      ${activeCases.map(c => {
        const dLeft = c.day_limit - c.current_day
        return `<article class="filecase ${G.snapshot && G.snapshot.caseId === c.id ? 'on' : ''}" data-case="${c.id}" style="--tabc:${tabColour(c.colour_tab)}" role="button" tabindex="0">
          <div class="fc-tab">${esc(c.colour_tab)}</div>
          <div class="fc-no">CASE №${esc(c.case_no)} · TIER ${c.tier || (c.aiGenerated ? 'AI' : 'I')}</div>
          <div class="fc-t">${esc(c.title)}</div>
          <div class="fc-d">${esc((c.summary || '').slice(0, 145))}</div>
          <div class="fc-f">
            <span>DAY ${c.current_day || 1}/${c.day_limit || 60}</span>
            <span style="color:${dLeft <= 15 ? '#8f2f2b' : '#5d5341'}">${dLeft} LEFT</span>
            <span style="margin-left:auto">${esc(c.offence_class || (c.aiGenerated ? 'AI Procedural' : 'General Crime'))}</span>
          </div>
        </article>`
      }).join('')}
      <div class="filecase" data-new="1" style="--tabc:#c8a24a;display:grid;place-items:center;text-align:center;cursor:pointer;background:linear-gradient(180deg, rgba(200,162,74,0.12), rgba(200,162,74,0.05));border:1.5px dashed var(--gold);min-height:170px">
        <div style="padding: 18px 12px;">
          <div style="font-size:32px;color:var(--gold);line-height:1;margin-bottom:6px">&#43;</div>
          <div class="cond" style="font-size:16.5px;font-weight:700;color:var(--gold2)">Open your next case</div>
          <div class="dim" style="font-size:12px;margin-top:4px;color:var(--ink3)">All active files resolved or archived. Open a standard or AI investigation.</div>
        </div>
      </div>
    </div>`
  + (closedCases.length ? `
      <div class="card" id="wl-case-archive-banner" style="margin-top:14px;border:1px solid rgba(200,162,74,0.45);background:linear-gradient(180deg, rgba(24,32,48,0.9), rgba(16,22,34,0.95));box-shadow:0 4px 18px rgba(0,0,0,0.35);border-radius:6px;padding:14px 18px;cursor:pointer">
        <div class="flex between items-center" style="flex-wrap:wrap;gap:12px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:42px;height:42px;background:rgba(200,162,74,0.15);border:1px solid rgba(200,162,74,0.35);border-radius:6px;display:grid;place-items:center;font-size:22px;color:var(--gold)">&#128193;</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="tag gold" style="font-weight:700;font-size:10.5px;letter-spacing:0.06em">&#128193; CASE ARCHIVE</span>
                <span style="font-size:11.5px;color:var(--ink3)">BNSS &sect;193(9)</span>
              </div>
              <div style="font-size:14.5px;font-weight:700;color:var(--ink0);margin-top:2px">
                <strong>${closedCases.length} Closed File(s)</strong> &middot; Preserved Adjudication Records
              </div>
              <div style="font-size:12px;color:var(--ink2);margin-top:1px">
                Inspect 5-stage summaries (FIR &rarr; Scene &rarr; Interrogations &rarr; Charge &rarr; Trial) or reopen cases for supplementary inquiry.
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn gold sm" id="btn-open-case-archive-modal" style="font-size:12.5px;font-weight:700;padding:7px 16px;display:flex;align-items:center;gap:6px">
              <span>&#128194; Open Case Archive</span> &rarr;
            </button>
          </div>
        </div>
      </div>
    ` : '')
  + `<div class="card" style="margin-top:18px">
      <div class="card-h"><h3>&#129309; Shared resources — the real constraint</h3></div>
      <div style="font-size:13px;line-height:1.6;color:var(--ink2)">Each case has its own clock, but your team does not. An officer assigned to one case is unavailable for the others until the task is done. Allocate your best people to the file that will die first.</div>
      <div class="team-resources-list">
        ${(G.team || []).map(m => `
          <div class="team-resource-card">
            <div class="team-resource-name">
              <span class="team-avatar-icon">&#128100;</span>
              <span class="team-officer-title">${esc(m.name)}</span>
            </div>
            <div class="team-status-bubble ${m.busy_until_day ? 'amber' : 'green'}">
              <span class="team-status-dot"></span>
              <span class="team-status-text">${m.busy_until_day ? 'committed to day ' + m.busy_until_day : 'available'}</span>
            </div>
          </div>
        `).join('') || '<div class="dim" style="font-size:12px;padding:6px 0">No team assigned yet.</div>'}
      </div>
    </div>`
}

VIEWS.wall.after = function () {
  const ap = $('#wl-apply'); if (ap) ap.onclick = () => { G.view = 'apply' ; render() }
  const nw = $('#wl-new'); if (nw) nw.onclick = newCaseModal
  const wai = $('#wl-ai'); if (wai) wai.onclick = openAiCaseModal
  const ab = $('#wl-case-archive-banner')
  if (ab) ab.onclick = () => openCaseArchiveModal()
  const abBtn = $('#btn-open-case-archive-modal')
  if (abBtn) abBtn.onclick = (e) => { e.stopPropagation(); openCaseArchiveModal() }

  $$('[data-new]').forEach(x => x.onclick = newCaseModal)
  $$('[data-case]').forEach(el => el.onclick = () => act(async () => {
    const r = await api(`/cases/${el.dataset.case}/activate`, { method: 'POST', body: '{}' })
    mergeBundle(r); G.view = 'desk'; render()
    const s = G.snapshot
    toast('Case ' + s.caseNo + ' opened', s.resumePoint + ' — ' + s.daysLeft + ' days remaining.', s.daysLeft <= 15 ? 'warn' : '')
  }))
}

function openCaseArchiveModal(initialCaseId) {
  let activeCaseId = initialCaseId || null
  let viewMode = initialCaseId ? 'summary' : 'list'
  let activeStageTab = 1
  let searchQuery = ''
  let verdictFilter = 'all'
  let summaryCache = {}
  let activeSummary = null
  let loadingSummary = false

  const allCases = G.cases || []
  let closedCases = allCases.filter(c => c.status === 'closed')

  if (!closedCases.length) {
    closedCases = [
      {
        id: '1',
        case_no: '24/113',
        title: 'The Marol Depot Road Payroll Robbery',
        summary: 'A logistics firm payroll van carrying weekly wages was ambushed on Marol Depot Road. Intercepted through swift canvassing, independent search panchnamas under BNSS s.103, and locatable disclosure recoveries under BSA s.23.',
        status: 'closed',
        verdict: 'Conviction',
        tier: 'III',
        offence_class: 'Serious Robbery',
        current_day: 18,
        day_limit: 60
      }
    ]
  }

  const modalInstance = modal({
    cls: 'wide archive-modal',
    title: '📁 Case Archive & Judicial Adjudication Repository',
    body: `<div id="archive-modal-root" style="min-height:540px;display:flex;flex-direction:column"></div>`,
    footer: `<div id="archive-modal-footer" style="width:100%;display:flex;align-items:center;justify-content:space-between"></div>`
  })

  const rootEl = modalInstance.el.querySelector('#archive-modal-root')
  const footEl = modalInstance.el.querySelector('#archive-modal-footer')

  async function loadSummary(caseId) {
    if (summaryCache[caseId]) {
      activeSummary = summaryCache[caseId]
      renderModalBody()
      return
    }
    loadingSummary = true
    renderModalBody()
    try {
      const res = await api(`/cases/${caseId}/summary`)
      if (res && res.summary) {
        summaryCache[caseId] = res.summary
        activeSummary = res.summary
      }
    } catch (err) {
      console.warn('Failed to fetch summary from server', err)
    } finally {
      loadingSummary = false
      renderModalBody()
    }
  }

  function handleReopenPrompt(caseId, caseNo, title) {
    modal({
      cls: 'slim',
      title: 'Authorize Supplementary Investigation',
      body: `
        <div style="font-size:13.5px;line-height:1.6;color:var(--ink1)">
          <div style="padding:10px 14px;background:rgba(200,162,74,0.12);border:1px solid rgba(200,162,74,0.3);border-radius:4px;margin-bottom:12px">
            <span style="font-weight:700;color:var(--gold2)">STATUTORY MANDATE: BNSS &sect;193(9)</span>
            <div style="font-size:12px;color:var(--ink2);margin-top:2px">Reopening Case <strong>№${esc(caseNo || caseId)}</strong> for supplementary inquiry.</div>
          </div>
          <p>Are you sure you want to reopen this investigation?</p>
          <p style="font-size:12.5px;color:var(--ink2);margin-top:8px">
            <strong>Intact Guarantee:</strong> All previously filed First Information Report (FIR) particulars, crime scene seizure memos, lab analysis reports, and witness statements will remain <strong>100% intact</strong> on your desk.
          </p>
        </div>
      `,
      footer: `
        <button class="btn gh" data-close>Cancel</button>
        <button class="btn gold" id="btn-confirm-reopen-exec" style="margin-left:8px">&#128275; Reopen Investigation</button>
      `,
      after: (veil, closeConfirm) => {
        const btn = veil.querySelector('#btn-confirm-reopen-exec')
        if (btn) btn.onclick = async () => {
          btn.disabled = true
          btn.textContent = 'Reopening Desk...'
          try {
            const r = await api(`/cases/${caseId}/reopen`, { method: 'POST', body: '{}' })
            if (r && r.bundle) {
              mergeBundle(r.bundle)
              closeConfirm()
              modalInstance.close()
              G.view = 'desk'
              render()
              toast('Case № ' + (r.bundle.snapshot?.caseNo || caseId) + ' Reopened', 'Investigation desk activated. FIR, exhibits, and statements intact.', 'good')
            } else {
              toast('Reopen Failed', 'Unable to activate case snapshot.', 'warn')
              btn.disabled = false
              btn.textContent = 'Reopen Investigation'
            }
          } catch (e) {
            toast('Reopen Error', e.message || 'Server error', 'warn')
            btn.disabled = false
            btn.textContent = 'Reopen Investigation'
          }
        }
      }
    })
  }

  function renderModalBody() {
    if (!rootEl) return

    if (viewMode === 'list') {
      const q = searchQuery.toLowerCase().trim()
      const filtered = closedCases.filter(c => {
        const matchesQ = !q || (c.title || '').toLowerCase().includes(q) || (c.case_no || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q)
        if (!matchesQ) return false
        if (verdictFilter === 'conviction') return (c.verdict || '').toLowerCase().includes('convict')
        if (verdictFilter === 'partial') return (c.verdict || '').toLowerCase().includes('partial')
        if (verdictFilter === 'acquittal') return (c.verdict || '').toLowerCase().includes('acquit')
        return true
      })

      rootEl.innerHTML = `
        <!-- Top Stats & Search Bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--line2)">
          <div style="display:flex;align-items:center;gap:12px;font-size:12.5px;color:var(--ink2)">
            <span><strong style="color:var(--ink0)">${closedCases.length}</strong> Closed File(s)</span>
            <span>&middot;</span>
            <span style="color:#6fd39b">&#10003; Convictions: ${closedCases.filter(c => (c.verdict||'').toLowerCase().includes('convict')).length}</span>
            <span>&middot;</span>
            <span style="color:#c8a24a">&#9888; Partials: ${closedCases.filter(c => (c.verdict||'').toLowerCase().includes('partial')).length}</span>
            <span>&middot;</span>
            <span style="color:#e06c75">&#10005; Acquittals: ${closedCases.filter(c => (c.verdict||'').toLowerCase().includes('acquit')).length}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="text" id="arch-search-input" value="${esc(searchQuery)}" placeholder="Search case №, title, or charge..." style="background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:6px 10px;font-size:12px;color:var(--ink0);width:220px">
            <select id="arch-verdict-filter" style="background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:6px 10px;font-size:12px;color:var(--ink0)">
              <option value="all" ${verdictFilter === 'all' ? 'selected' : ''}>All Verdicts</option>
              <option value="conviction" ${verdictFilter === 'conviction' ? 'selected' : ''}>Convictions</option>
              <option value="partial" ${verdictFilter === 'partial' ? 'selected' : ''}>Partials</option>
              <option value="acquittal" ${verdictFilter === 'acquittal' ? 'selected' : ''}>Acquittals</option>
            </select>
          </div>
        </div>

        <!-- Cases Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:14px;overflow-y:auto;flex:1;max-height:56vh;padding-right:4px">
          ${filtered.map(c => {
            const isConvict = (c.verdict || '').toLowerCase().includes('convict')
            const isAcquit = (c.verdict || '').toLowerCase().includes('acquit')
            const vBadgeCls = isConvict ? 'tag ok' : isAcquit ? 'tag red' : 'tag gold'
            return `
              <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(180deg, rgba(20,26,38,0.9), rgba(14,19,28,0.95));border:1px solid var(--line2);border-radius:5px;padding:14px;box-shadow:0 4px 14px rgba(0,0,0,0.25)">
                <div>
                  <div class="flex between items-center" style="margin-bottom:8px">
                    <span class="mono" style="font-size:11.5px;font-weight:700;color:var(--gold2)">CASE №${esc(c.case_no)}</span>
                    <span class="${vBadgeCls}" style="font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${esc(c.verdict || 'Adjudicated')}</span>
                  </div>
                  <h4 style="font-size:14.5px;color:var(--ink0);margin:0 0 6px 0;line-height:1.35;font-weight:600">${esc(c.title)}</h4>
                  <p class="dim" style="font-size:12px;line-height:1.55;color:var(--ink2);margin:0 0 10px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
                    ${esc(c.summary || 'Investigation and judicial proceedings completed.')}
                  </p>
                </div>
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink3);padding-top:8px;border-top:1px solid var(--line);margin-bottom:10px">
                    <span>TIER ${esc(c.tier || 'III')} &middot; ${esc(c.offence_class || 'Crime')}</span>
                    <span>DAY ${c.current_day || 1}/${c.day_limit || 60}</span>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button class="btn pri sm btn-view-summary-action" data-id="${c.id}" style="flex:1;font-size:11.5px">&#128214; View Summary</button>
                    <button class="btn gold sm btn-reopen-case-action" data-id="${c.id}" data-no="${esc(c.case_no)}" data-title="${esc(c.title)}" style="font-size:11.5px">&#128275; Reopen</button>
                  </div>
                </div>
              </div>
            `
          }).join('')}
          ${!filtered.length ? `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ink3);font-size:13px">No archived cases found matching your search.</div>` : ''}
        </div>
      `

      // Wire search & filter
      const si = rootEl.querySelector('#arch-search-input')
      if (si) {
        si.oninput = (e) => {
          searchQuery = e.target.value
          renderModalBody()
          const nsi = rootEl.querySelector('#arch-search-input')
          if (nsi) { nsi.focus(); nsi.selectionStart = nsi.selectionEnd = nsi.value.length }
        }
      }
      const vf = rootEl.querySelector('#arch-verdict-filter')
      if (vf) vf.onchange = (e) => { verdictFilter = e.target.value; renderModalBody() }

      // Wire cards buttons
      rootEl.querySelectorAll('.btn-view-summary-action').forEach(b => {
        b.onclick = () => {
          activeCaseId = b.dataset.id
          viewMode = 'summary'
          activeStageTab = 1
          loadSummary(activeCaseId)
        }
      })

      rootEl.querySelectorAll('.btn-reopen-case-action').forEach(b => {
        b.onclick = () => handleReopenPrompt(b.dataset.id, b.dataset.no, b.dataset.title)
      })

      footEl.innerHTML = `
        <div style="font-size:11.5px;color:var(--ink3)">All cases closed under BNSS procedures are cataloged with intact panchnama registries.</div>
        <button class="btn gh" id="arch-modal-close-btn">Close</button>
      `
      const cb = footEl.querySelector('#arch-modal-close-btn')
      if (cb) cb.onclick = () => modalInstance.close()

    } else if (viewMode === 'summary') {
      if (loadingSummary) {
        rootEl.innerHTML = `<div style="display:grid;place-items:center;padding:60px;font-size:14px;color:var(--gold2)">
          <div class="spin" style="margin-bottom:12px;font-size:24px">&#8987;</div>
          Retrieving complete judicial trial docket, panchnama registries, and FIR records...
        </div>`
        return
      }

      const s = activeSummary || {}
      const curCase = closedCases.find(c => c.id === activeCaseId) || {}

      rootEl.innerHTML = `
        <!-- Top Subheader -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--line2);margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn sm gh" id="btn-summary-back" style="font-size:12px">&larr; Return to Case Files</button>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="mono" style="font-size:12px;font-weight:700;color:var(--gold2)">CASE №${esc(s.caseNo || curCase.case_no)}</span>
                <span class="tag gold" style="font-size:10px;font-weight:700;text-transform:uppercase">${esc(s.verdict || curCase.verdict || 'Adjudicated')}</span>
              </div>
              <h3 style="font-size:15px;color:var(--ink0);margin:2px 0 0 0;font-weight:600">${esc(s.title || curCase.title)}</h3>
            </div>
          </div>
          <button class="btn gold sm" id="btn-summary-reopen-top" style="font-size:12px;font-weight:700">&#128275; Reopen Investigation (BNSS &sect;193(9))</button>
        </div>

        <!-- 5-Stage Stepper Tabs -->
        <div class="tabs" style="margin-bottom:14px">
          ${[
            { id: 1, label: '1. FIR Registration (BNSS §173)' },
            { id: 2, label: '2. Crime Scene & Panchnama (BNSS §103)' },
            { id: 3, label: '3. Interrogation & Recoveries (BSA §23)' },
            { id: 4, label: '4. Final Police Report (BNSS §193)' },
            { id: 5, label: '5. Sessions Trial & Judgment' }
          ].map(t => `
            <button class="tab-btn ${activeStageTab === t.id ? 'on' : ''}" data-stagetab="${t.id}" style="font-size:12px;padding:6px 12px">
              ${t.label}
            </button>
          `).join('')}
        </div>

        <!-- Stage Body -->
        <div id="stage-body-container" style="flex:1;overflow-y:auto;max-height:50vh;padding-right:4px">
          ${renderStageTabContent(activeStageTab, s, curCase)}
        </div>
      `

      // Wire stage tabs
      rootEl.querySelectorAll('[data-stagetab]').forEach(b => {
        b.onclick = () => {
          activeStageTab = parseInt(b.dataset.stagetab, 10)
          renderModalBody()
        }
      })

      const backBtn = rootEl.querySelector('#btn-summary-back')
      if (backBtn) backBtn.onclick = () => { viewMode = 'list'; renderModalBody() }

      const reopenTopBtn = rootEl.querySelector('#btn-summary-reopen-top')
      if (reopenTopBtn) reopenTopBtn.onclick = () => handleReopenPrompt(activeCaseId, s.caseNo || curCase.case_no, s.title || curCase.title)

      // Footer
      footEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn sm gh" id="btn-summary-back-foot">&larr; Back to Cases</button>
          <button class="btn sm gh" id="btn-summary-copy-foot">&#128203; Copy Certified Summary</button>
        </div>
        <button class="btn gold sm" id="btn-summary-reopen-foot">&#128275; Reopen This Investigation (BNSS &sect;193(9))</button>
      `
      const backFoot = footEl.querySelector('#btn-summary-back-foot')
      if (backFoot) backFoot.onclick = () => { viewMode = 'list'; renderModalBody() }

      const copyFoot = footEl.querySelector('#btn-summary-copy-foot')
      if (copyFoot) copyFoot.onclick = () => {
        const text = `CASE SUMMARY: №${s.caseNo || curCase.case_no} - ${s.title || curCase.title}\n` +
          `VERDICT: ${s.verdict || curCase.verdict}\nSENTENCE: ${s.sentence || 'Rigorous Imprisonment'}\n\n` +
          `STAGE 1 (FIR):\n${s.fir?.narrative || curCase.summary}\n\n` +
          `STAGE 5 (JUDGMENT):\n${s.trialJudgment?.judgment || 'Guilty as charged.'}`
        navigator.clipboard.writeText(text)
        toast('Summary Copied', 'Certified case summary copied to clipboard.', 'good')
      }

      const reopenFoot = footEl.querySelector('#btn-summary-reopen-foot')
      if (reopenFoot) reopenFoot.onclick = () => handleReopenPrompt(activeCaseId, s.caseNo || curCase.case_no, s.title || curCase.title)
    }
  }

  function renderStageTabContent(tab, s, c) {
    if (tab === 1) {
      const f = s.fir || {}
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-h"><h3 style="color:var(--gold2)">Statutory FIR Particulars &middot; BNSS &sect;173</h3></div>
          <div class="kv"><span class="k">FIR Number</span><span class="v mono">${esc(f.firNo || ('FIR/' + (s.caseNo || c.case_no) + '/2026'))}</span></div>
          <div class="kv"><span class="k">Date &amp; Time of Occurrence</span><span class="v">${esc(f.dateTime || '21 Sep 2026, 19:30 IST')}</span></div>
          <div class="kv"><span class="k">Place of Occurrence</span><span class="v">${esc(f.place || 'Marol Depot Road & Sector 9 Junction')}</span></div>
          <div class="kv"><span class="k">Informant / Complainant</span><span class="v">${esc(f.informant || 'Driver Somnath Patil (Sunrise Logistics)')}</span></div>
          <div class="kv"><span class="k">Cognizance</span><span class="v" style="color:#6fd39b">&#10003; Cognizable offence registered without magistrate pre-order</span></div>
        </div>

        <div class="card" style="margin-bottom:12px">
          <div class="card-h"><h3>Penal Sections Attracted</h3></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            ${(f.sections || [{ section: 'BNS §309', act: 'BNS' }, { section: 'BNS §115', act: 'BNS' }, { section: 'BNS §61', act: 'BNS' }]).map(sec => `
              <span class="tag gold" style="font-weight:600;font-size:11px">${esc(sec.section || sec)}</span>
            `).join('')}
          </div>
          <div class="dim" style="font-size:12px">Statutory ingredients: Dishonest taking of movable property, wrongful restraint, causing hurt, criminal conspiracy.</div>
        </div>

        <div class="card">
          <div class="card-h"><h3>Official Complaint Narrative (Recorded verbatim)</h3></div>
          <div style="font-size:13px;line-height:1.65;color:var(--ink1);white-space:pre-wrap;background:rgba(0,0,0,0.25);padding:12px;border-radius:4px;border:1px solid var(--line2)">${esc(f.narrative || c.summary || 'First Information Report filed by complainant regarding armed transit robbery.')}</div>
        </div>
      `
    }

    if (tab === 2) {
      const p = s.panchnama || {}
      const exhibits = p.exhibits || []
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-h"><h3 style="color:var(--gold2)">Crime Scene Protocol &middot; BNSS &sect;103 &amp; &sect;105</h3></div>
          <div class="grid g4" style="margin-bottom:10px">
            <div class="stat"><div class="stat-v" style="color:#6fd39b">&#10003;</div><div class="stat-l">Cordon Secured</div></div>
            <div class="stat"><div class="stat-v" style="color:#6fd39b">&#10003;</div><div class="stat-l">BNSS §105 Video</div></div>
            <div class="stat"><div class="stat-v" style="color:#6fd39b">&#10003;</div><div class="stat-l">Rough Sketch 1:50</div></div>
            <div class="stat"><div class="stat-v" style="color:#6fd39b">&#10003;</div><div class="stat-l">Panch Witnesses</div></div>
          </div>
          <div class="kv"><span class="k">Scene Location</span><span class="v">${esc(p.location || 'Depot Culvert & Surrounding Drainage Track')}</span></div>
          <div class="kv"><span class="k">Chain of Custody</span><span class="v" style="color:#6fd39b">&#10003; All seized articles sealed with brass MCB seal at locus</span></div>
        </div>

        <div class="card">
          <div class="card-h"><h3>Seized Exhibits &amp; Panchnama Registry</h3></div>
          ${exhibits.length ? `
            <table class="tbl" style="width:100%;font-size:12px;margin-top:6px">
              <thead>
                <tr>
                  <th>Ex. №</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Panch Witnesses</th>
                  <th>Lab Report &amp; Status</th>
                  <th style="text-align:right">Admissibility</th>
                </tr>
              </thead>
              <tbody>
                ${exhibits.map(ex => `
                  <tr>
                    <td class="mono" style="font-weight:700;color:var(--gold2)">${esc(ex.mark || ex.id)}</td>
                    <td style="font-weight:600;color:var(--ink0)">${esc(ex.name)}</td>
                    <td>${esc(ex.category || 'Physical')}</td>
                    <td class="dim" style="font-size:11px">${esc(ex.witnesses || 'Suresh Kadam & Anita Fernandes')}</td>
                    <td style="font-size:11px">${esc(ex.labStatus || 'Admitted · Valid')}</td>
                    <td style="text-align:right;font-weight:700;color:#6fd39b">+${ex.weight || 50} pts</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="dim" style="font-size:12px;padding:12px 0">Exhibits sealed under BNSS §103 panchnama and admitted by Sessions Court.</div>
          `}
        </div>
      `
    }

    if (tab === 3) {
      const it = s.interrogations || {}
      const examined = it.personsExamined || []
      const discoveries = it.discoveriesBSA23 || []
      return `
        <div class="card" style="margin-bottom:12px;background:rgba(200,162,74,0.06);border-color:rgba(200,162,74,0.3)">
          <div class="card-h"><h3 style="color:var(--gold2)">Statutory Mandate &middot; BSA Section 23 (Former IEA 27)</h3></div>
          <div style="font-size:12.5px;line-height:1.6;color:var(--ink1)">
            Custodial statements made to police officers are strictly inadmissible in evidence. Under Section 23 of the Bharatiya Sakshya Adhiniyam, 2023, <strong>only so much of the statement as distinctly leads to the discovery of a tangible physical fact</strong> is provable against the accused.
          </div>
        </div>

        <div class="card" style="margin-bottom:12px">
          <div class="card-h"><h3>Persons Examined &amp; Disclosures Recorded</h3></div>
          ${examined.length ? examined.map(p => `
            <div class="card" style="margin-bottom:8px;background:rgba(0,0,0,0.2)">
              <div class="flex between items-center" style="margin-bottom:4px">
                <span style="font-weight:700;color:var(--ink0)">${esc(p.name)} (${esc(p.role || 'Witness/Suspect')})</span>
                <span class="tag ${p.alibiVerified ? 'ok' : 'red'}" style="font-size:10px">${p.alibiVerified ? 'Alibi Verified' : 'Alibi Disproven'}</span>
              </div>
              <div class="dim" style="font-size:12px;line-height:1.55;color:var(--ink2)">${esc(p.statementSummary || 'Interrogation conducted under BNSS §180.')}</div>
            </div>
          `).join('') : '<div class="dim" style="font-size:12px">Statements recorded under BNSS §180.</div>'}
        </div>

        <div class="card">
          <div class="card-h"><h3>Verified Physical Recoveries (BSA &sect;23 Memoranda)</h3></div>
          ${discoveries.length ? discoveries.map(d => `
            <div class="kv" style="align-items:flex-start">
              <span class="k" style="width:140px;color:var(--gold2)">${esc(d.item)}</span>
              <span class="v">
                ${esc(d.location)}
                <div class="dim" style="font-size:11px;margin-top:2px">Witnesses: ${esc(d.witnesses || 'Independent Panchas')} &middot; ${esc(d.significance || '')}</div>
              </span>
            </div>
          `).join('') : '<div class="dim" style="font-size:12px">Concealed weapons and proceeds recovered pursuant to accused disclosures.</div>'}
        </div>
      `
    }

    if (tab === 4) {
      const cs = s.chargeSheet || {}
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-h"><h3 style="color:var(--gold2)">Police Final Report &middot; BNSS &sect;193</h3></div>
          <div class="kv"><span class="k">Charge-Sheet Serial</span><span class="v mono">${esc(cs.sheetNo || 'CS/2026/044')}</span></div>
          <div class="kv"><span class="k">Filing Date</span><span class="v">${esc(cs.dateFiled || '2026-09-24')}</span></div>
          <div class="kv"><span class="k">Committal Court</span><span class="v">${esc(cs.court || 'Court of Sessions Judge, Special Branch')}</span></div>
          <div class="kv"><span class="k">Accused Arrayed</span><span class="v" style="font-weight:700;color:var(--gold2)">${esc((cs.accused || []).join(', ') || 'Salim Qureshi & Dinesh Varma')}</span></div>
        </div>

        <div class="card" style="margin-bottom:12px">
          <div class="card-h"><h3>Three Prosecution Pillars</h3></div>
          <div class="grid g3">
            <div style="background:rgba(0,0,0,0.25);padding:10px;border-radius:4px;border:1px solid var(--line2)">
              <div style="color:var(--gold2);font-weight:700;font-size:12px;margin-bottom:4px">1. Direct Eyewitness</div>
              <div style="font-size:11.5px;color:var(--ink2)">Informant testimony, van crew identification, and panchnama corroboration.</div>
            </div>
            <div style="background:rgba(0,0,0,0.25);padding:10px;border-radius:4px;border:1px solid var(--line2)">
              <div style="color:var(--gold2);font-weight:700;font-size:12px;margin-bottom:4px">2. Circumstantial Chain</div>
              <div style="font-size:11.5px;color:var(--ink2)">CDR co-location logs, diesel debt shortfall motive, route manipulation.</div>
            </div>
            <div style="background:rgba(0,0,0,0.25);padding:10px;border-radius:4px;border:1px solid var(--line2)">
              <div style="color:var(--gold2);font-weight:700;font-size:12px;margin-bottom:4px">3. Forensic Laboratory</div>
              <div style="font-size:11.5px;color:var(--ink2)">Iron bar toolmarks, tyre impression cast, and digital hash continuity.</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><h3>Brief Facts Submitted under BNSS &sect;193(3)</h3></div>
          <div style="font-size:12.5px;line-height:1.65;color:var(--ink1)">
            ${esc(cs.briefFacts || 'The prosecution submits that upon exhaustive investigation under BNSS s.173-183, a complete and unbroken chain of evidence proves that the accused persons in conspiracy ambushed the payroll vehicle, assaulted the guard, and fled with ₹4,80,000.')}
          </div>
        </div>
      `
    }

    if (tab === 5) {
      const tj = s.trialJudgment || {}
      return `
        <div class="card" style="margin-bottom:12px;border-color:rgba(111,211,155,0.4)">
          <div class="card-h"><h3 style="color:#6fd39b">Sessions Court Adjudication &amp; Judicial Verdict</h3></div>
          <div class="flex between items-center" style="margin-bottom:12px">
            <div>
              <span class="mono" style="font-size:11.5px;color:var(--ink3)">SPECIAL TRIAL CASE № ${esc(tj.trialCaseNo || 'STC-24/113/2026')}</span>
              <div style="font-size:16px;font-weight:700;color:var(--gold2);margin-top:2px">${esc(tj.court || 'Court of the Sessions Judge, Special Division')}</div>
            </div>
            <span class="tag ok" style="font-size:12px;font-weight:700;letter-spacing:0.06em;padding:4px 10px">${esc(s.verdict || c.verdict || 'CONVICTION')}</span>
          </div>

          <div style="background:rgba(0,0,0,0.3);padding:12px;border-radius:4px;border:1px solid var(--line2);margin-bottom:12px">
            <span style="font-size:11px;color:var(--ink3);text-transform:uppercase;font-weight:700">Sentence &amp; Penal Order</span>
            <div style="font-size:14px;font-weight:700;color:var(--gold2);margin-top:4px">${esc(s.sentence || tj.sentence || 'Sentenced to 5 years Rigorous Imprisonment with fine.')}</div>
          </div>

          <div style="margin-top:10px">
            <span style="font-size:11px;color:var(--ink3);text-transform:uppercase;font-weight:700">Judgment Transcript</span>
            <pre style="font-size:12px;line-height:1.6;color:var(--ink1);white-space:pre-wrap;background:rgba(0,0,0,0.25);padding:12px;border-radius:4px;margin-top:6px;max-height:220px;overflow-y:auto">${esc(tj.judgment || 'Accused Salim Qureshi and Dinesh Varma are found GUILTY beyond reasonable doubt.')}</pre>
          </div>
        </div>

        <div class="card">
          <div class="card-h"><h3>Bench Observations on Police Investigation Integrity</h3></div>
          <div class="check ok" style="margin-bottom:6px">
            <span class="ci">&#10003;</span>
            <span class="cn"><b>Independent Search &amp; Seizure Panchnama:</b> Both independent witnesses corroborated exhibit recovery under cross-examination without contradiction (BNSS §103).</span>
          </div>
          <div class="check ok">
            <span class="ci">&#10003;</span>
            <span class="cn"><b>Electronic Admissibility (BSA §63):</b> Forensic bit-stream clone with dual SHA-256 certificate satisfied the statutory burden.</span>
          </div>
        </div>
      `
    }
  }

  // Initial render
  if (viewMode === 'summary') {
    loadSummary(activeCaseId)
  } else {
    renderModalBody()
  }
}
window.openCaseArchiveModal = openCaseArchiveModal

function tabColour(c) {
  return { amber: '#d9a441', slate: '#6b7f95', cyan: '#3b9bb0', red: '#c9403a', violet: '#8a72c8', stone: '#a09480', gold: '#c8a24a' }[c] || '#c8a24a'
}

function openAiCaseModal() {
  const archetypes = [
    { title: 'Armed Robbery & Transit Ambush', desc: 'Interception of logistics vehicle, blunt weapon trace, physical vault latch marks under ALS, latent blood.' },
    { title: 'Cyber Intrusion & Mule Network', desc: 'Bank account compromise, unauthorized electronic ledger entries, unhashed server logs, s.63 certification.' },
    { title: 'Stolen Heritage Artifact & Forgery', desc: 'Temple antique substitution, chemical solvent residue, UV fluorescent varnish mark, forged provenance.' },
    { title: 'Corporate Poisoning & Industrial Espionage', desc: 'Executive boardroom collapse, lethal toxin in tea service, obscured CCTV loop, biological swab.' },
    { title: 'Cold Case Homicide & Reopened File', desc: 'Unsolved decade-old murder, preserved ballistics casing, faded oblique footprint, surviving witness.' },
    { title: 'Kidnapping for Crypto Ransom', desc: 'Industrialist scion abduction, discarded burner SIM card, tire impression in mud embankment.' }
  ]

  modal({
    cls: 'wide',
    title: 'Generate Case Dossier with AI (Gemini 2.5 Flash)',
    body: `
      <div class="helpbox" style="margin-top:0">
        <div class="hb-h">&#129302; Generative Investigative Dossier</div>
        The Gemini model constructs a fully playable case file adhering strictly to statutory criminal codes (BNS, BNSS, BSA). It generates the incident locus, FIR particulars, physical/biological/digital exhibits with light spectrum reactions (UV, ALS, Luminol, Oblique), suspects, motives, and alibis.
      </div>

      <div class="setrow" style="margin-bottom:14px">
        <div class="sb">
          <div class="st">Active AI Intelligence Engine</div>
          <div class="sd" id="ai-modal-engine-sd">Checking secure server engine credentials…</div>
        </div>
        <div id="ai-modal-engine-tag"><span class="tag gold">&#9889; CHECKING…</span></div>
      </div>

      <div class="fld">
        <label>Select Case Archetype or Quick Preset</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px" id="ai-preset-chips">
          ${archetypes.map((a, i) => `<button type="button" class="btn sm ${i === 0 ? 'pri' : 'gh'}" data-arch="${i}">${esc(a.title)}</button>`).join('')}
        </div>
      </div>

      <div class="fld">
        <label>Custom Case Premise &amp; Incident Parameters (Optional prompt)</label>
        <textarea id="ai-case-prompt" class="doc" rows="4" placeholder="Describe a custom crime premise or leave empty to use the selected archetype...">${esc(archetypes[0].desc)}</textarea>
        <div class="hint">Gemini will translate your description into statutory FIR elements, scene grid coordinates, and forensic exhibits.</div>
      </div>

      <div class="grid g2" style="margin-top:10px">
        <div class="fld">
          <label>Difficulty Rating</label>
          <select id="ai-case-diff">
            <option value="Cadet">Cadet — generous clock, tainted exhibits recoverable</option>
            <option value="Sub-Inspector" selected>Sub-Inspector — standard</option>
            <option value="Inspector">Inspector — tighter clock, hostile witnesses likelier</option>
            <option value="Hard-Boiled">Hard-Boiled — 60-day clock, errors permanent</option>
          </select>
        </div>
        <div class="fld">
          <label>Statutory Jurisdiction</label>
          <input type="text" value="Metro Crime Branch, Malhar Division (BNS / BNSS / BSA 2023)" readonly style="background:rgba(0,0,0,0.2);color:var(--gold2);font-family:var(--font-mono);font-size:12px" />
        </div>
      </div>

      <div id="ai-gen-progress" style="display:none;margin-top:14px;padding:14px;border:1px solid rgba(200,162,74,0.3);border-radius:6px;background:rgba(20,26,36,0.6);text-align:center">
        <div style="display:flex;align-items:center;justify-content:center;gap:10px">
          <span class="spin"></span>
          <span class="cond" style="font-size:16px;color:var(--gold2)" id="ai-gen-status">Generating case dossier with Gemini AI...</span>
        </div>
        <div class="mono dim" style="font-size:11px;margin-top:6px">Synthesizing scene grid, light-sensitive exhibits, and suspect interrogation matrices</div>
      </div>`,
    footer: `
      <button class="btn gh" data-close>Cancel</button>
      <button class="btn pri sm" id="btn-do-ai-gen">Generate &amp; Open Case</button>`,
    after: (veil, close) => {
      api('/ai-status').then(st => {
        const sd = veil.querySelector('#ai-modal-engine-sd')
        const tag = veil.querySelector('#ai-modal-engine-tag')
        if (sd && tag) {
          if (st.byokConfigured && st.maskedByok) {
            sd.innerHTML = `<span style="color:#6fd39b;font-weight:600">PRIMARY: BYOK Active (${st.maskedByok})</span> &middot; Encrypted in HTTP-Only Vault.`
            tag.innerHTML = `<span class="tag green">&#10003; BYOK VAULT</span>`
          } else {
            sd.innerHTML = `<span style="color:#f0b45f;font-weight:600">FALLBACK: Server High-Speed Engine active</span> &middot; Free tier verified.`
            tag.innerHTML = `<span class="tag gold">&#9889; SERVER FALLBACK</span>`
          }
        }
      }).catch(() => {})

      let selectedArch = 0
      const promptEl = veil.querySelector('#ai-case-prompt')
      const chips = veil.querySelectorAll('#ai-preset-chips [data-arch]')
      chips.forEach(c => {
        c.onclick = () => {
          selectedArch = Number(c.dataset.arch)
          chips.forEach(x => {
            x.classList.toggle('pri', x === c)
            x.classList.toggle('gh', x !== c)
          })
          if (promptEl) promptEl.value = archetypes[selectedArch].desc
        }
      })

      const btnGen = veil.querySelector('#btn-do-ai-gen')
      const progressBox = veil.querySelector('#ai-gen-progress')
      const statusText = veil.querySelector('#ai-gen-status')

      if (btnGen) {
        btnGen.onclick = async () => {
          btnGen.disabled = true
          if (progressBox) progressBox.style.display = 'block'
          if (statusText) statusText.textContent = 'Calling Gemini model to draft incident dossier...'

          try {
            const prompt = promptEl ? promptEl.value.trim() : ''
            const genre = archetypes[selectedArch] ? archetypes[selectedArch].title : 'Armed Robbery'
            const diff = veil.querySelector('#ai-case-diff') ? veil.querySelector('#ai-case-diff').value : 'Sub-Inspector'

            const r = await api('/cases/generate', {
              method: 'POST',
              body: JSON.stringify({ prompt, genre, difficulty: diff })
            })

            if (r && r.bundle) {
              mergeBundle(r.bundle)
            } else if (r && r.snapshot) {
              mergeBundle(r)
            }
            await refreshBootstrap()
            close()
            G.view = 'desk'
            render()

            const title = (G.snapshot && G.snapshot.title) || 'New Investigation'
            const caseNo = (G.snapshot && G.snapshot.caseNo) || '2026'
            toast('AI Case Generated — ' + caseNo, title + ' initialized. Begin in the Duty Room with the FIR.', 'good')
          } catch (err) {
            if (progressBox) progressBox.style.display = 'none'
            btnGen.disabled = false
            toast('Case Generation Failed', err.message || String(err), 'crit')
          }
        }
      }
    }
  })
}

function newCaseModal() {
  const tiers = [
    { t: 1, label: 'Tier I — Theft from a locked shop', note: 'Scene processing, FIR, recovery, charge framing.' },
    { t: 2, label: 'Tier II — Robbery with hurt', note: 'Contradiction, identification parade, the s.23 lesson.' },
    { t: 3, label: 'Tier III — Organised robbery of a cash movement', note: 'Forensic priority and the time economy.' },
    { t: 4, label: 'Tier IV — Phishing and mule account fraud', note: 'The s.63 certificate and the digital chain.' },
    { t: 5, label: 'Tier V — Narcotics interception', note: 'Surveillance, informers, conspiracy under BNS s.61.' },
    { t: 6, label: 'Tier VI — Insider fraud and laundering', note: 'Document expertise, critiquing expert opinion.' },
    { t: 7, label: 'Tier VII — Reopened cold case', note: 'Further investigation under BNSS s.183.' }
  ]
  modal({
    title: 'Open a new case',
    body: `
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; Case options</div>Select the flagship authored file, procedural tiers, or generate a custom AI case with Gemini.</div>
      
      <div style="margin-bottom:12px">
        <button class="btn gold sm" id="nc-open-ai-gen" style="width:100%;justify-content:center;padding:7px 12px;font-size:12px;height:32px">Generate Case with AI</button>
      </div>

      <div class="fld"><label>Standard Case Files</label>
        <label class="opt on" id="nc-flagship"><span class="dot"></span><span class="opt-body"><b>The flagship — Case №24/113: The Marol Depot Road Payroll Robbery</b><div class="cd dim" style="font-size:11.5px">Tier III. Full authored case with all physical, biological, digital and financial evidence, two false leads, one contaminated exhibit and one hostile witness.</div></span></label>
        ${tiers.map(x => `<label class="opt" data-tier="${x.t}"><span class="dot"></span><span class="opt-body"><b>${esc(x.label)}</b><div class="cd dim" style="font-size:11.5px">${esc(x.note)}</div></span></label>`).join('')}
      </div>
      <div class="fld"><label>Difficulty — locked for this file</label>
        <select id="nc-diff">
          <option value="Cadet">Cadet — generous clock, tainted exhibits recoverable</option>
          <option value="Sub-Inspector" selected>Sub-Inspector — standard</option>
          <option value="Inspector">Inspector — tighter clock, hostile witnesses likelier</option>
          <option value="Hard-Boiled">Hard-Boiled — 60-day clock, assistance unavailable, errors permanent</option>
        </select>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="nc-do">Open the file</button>`,
    after: (veil, close) => {
      let choice = 'flagship'
      const btnAi = veil.querySelector('#nc-open-ai-gen')
      if (btnAi) {
        btnAi.onclick = () => {
          close()
          openAiCaseModal()
        }
      }

      const set = (f) => {
        choice = f
        $$('.opt', veil).forEach(o => {
          const on = (f === 'flagship' && o.id === 'nc-flagship') || (o.dataset.tier == f)
          o.classList.toggle('on', on)
          const d = o.querySelector('.dot'); if (d) d.style.borderColor = on ? 'var(--gold)' : 'var(--line2)'
        })
      }
      veil.querySelector('#nc-flagship').onclick = () => set('flagship')
      $$('[data-tier]', veil).forEach(o => o.onclick = () => set(o.dataset.tier))
      veil.querySelector('#nc-do').onclick = () => act(async () => {
        const body = choice === 'flagship' ? { blueprint: 'flagship', difficulty: veil.querySelector('#nc-diff').value } : { tier: Number(choice), difficulty: veil.querySelector('#nc-diff').value }
        const r = await api('/cases/new', { method: 'POST', body: JSON.stringify(body) })
        mergeBundle(r)
        await refreshBootstrap()
        close(); G.view = 'desk'; render()
        toast('Case opened — ' + G.snapshot.caseNo, G.snapshot.title + '. Begin in the Duty Room with the FIR.', 'good')
      })
    }
  })
}


/* generic nav delegation */
document.addEventListener('click', (e) => {
  const n = e.target.closest('[data-nav]')
  if (n) { G.view = n.dataset.nav; render() }
})
