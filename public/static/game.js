/* CASE FILE ZERO — game client.
   Renders ONLY from /api snapshots. No game logic lives here. */

var VIEWS = window.VIEWS = window.VIEWS || {}

const DEFAULT_SETTINGS = {
  legalGuidance: true,
  procedureCoach: true,
  onDemandHelp: true,
  interrogationAid: true,
  evidenceAid: true,
  chargeAid: true,
  ingredientHighlight: true,
  consequencePreview: true,
  notepadSuggestions: true,
  language: 'en',
  presentation: {
    textScale: 1,
    dyslexicFont: false,
    reducedMotion: false,
    monoDossier: false,
    colourSafeTags: false,
    typewriter: false,
    stringDensity: 'normal',
    ambienceVolume: 0.35
  }
}

const G = {
  player: { settings: DEFAULT_SETTINGS, name: 'Investigating Officer', standing: 50, careerScore: 0 },
  cases: [], snapshot: null, legalRefs: [], forms: [], candidates: [], team: [], threads: [],
  view: 'desk', busy: false, toastSeq: 0,
  // shell state — owned by the chrome, not by any single view
  menu: null,          // which dropdown is open, or null
  sections: [],        // sub-sections adopted from the active view's tab row
  sectionKey: null,    // which sub-section is showing
  npOpen: false,       // notepad drawer
  rev: null,           // last bundle revision seen (drives the sync re-render)
  scrollReset: false,  // set on navigation so a new section opens at the top
  iv: null, ivTarget: null, activeThread: null, chapter: null
}

const $ = (s, r) => (r || document).querySelector(s)
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s))

window.CFZ_GAME_CLOCK = window.CFZ_GAME_CLOCK || {
  secOfDay: 32400, // Starts at 09:00:00 AM
  speedRatio: 5,   // 5x real speed (5 minutes of game time = 1 minute of real time)
  timerId: null,

  init() {
    if (this.timerId) return
    this.timerId = setInterval(() => this.tick(), 1000)
  },

  tick() {
    // 1 real second = 5 game seconds
    this.secOfDay += this.speedRatio
    if (this.secOfDay >= 86400) {
      this.secOfDay = this.secOfDay % 86400
      if (G.snapshot && typeof G.snapshot.day === 'number') {
        G.snapshot.day++
        G.snapshot.daysLeft = Math.max(0, G.snapshot.dayLimit - G.snapshot.day)
        G.snapshot.clockPct = Math.round((G.snapshot.day / G.snapshot.dayLimit) * 100)
      }
    }
    this.updateUI()
  },

  getDateString() {
    const day = (G.snapshot && G.snapshot.day) ? G.snapshot.day : 1
    const baseDate = new Date(2026, 8, 21)
    baseDate.setDate(baseDate.getDate() + (day - 1))
    const dateFormatted = baseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `Day ${day} &middot; ${dateFormatted}`
  },

  getDigitalTime() {
    const h24 = Math.floor(this.secOfDay / 3600) % 24
    const m = Math.floor((this.secOfDay % 3600) / 60)
    const s = Math.floor(this.secOfDay % 60)
    const ampm = h24 >= 12 ? 'PM' : 'AM'
    const h12 = (h24 % 12) || 12
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(h12)}:${pad(m)}:${pad(s)} ${ampm}`
  },

  getShortTime() {
    const h24 = Math.floor(this.secOfDay / 3600) % 24
    const m = Math.floor((this.secOfDay % 3600) / 60)
    const ampm = h24 >= 12 ? 'PM' : 'AM'
    const h12 = (h24 % 12) || 12
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(h12)}:${pad(m)} ${ampm}`
  },

  updateUI() {
    const digitalTxt = this.getDigitalTime()
    const dateTxt = this.getDateString()

    const cwDigitalEl = document.getElementById('cw-clock-digital')
    if (cwDigitalEl) cwDigitalEl.textContent = digitalTxt

    const cwDateEl = document.getElementById('cw-clock-date')
    if (cwDateEl) cwDateEl.innerHTML = dateTxt

    const hudEl = document.getElementById('hud-game-clock-sub')
    if (hudEl) hudEl.textContent = this.getShortTime()

    // Update Analogue Clock hands
    const hDeg = ((this.secOfDay % 43200) / 43200) * 360
    const mDeg = ((this.secOfDay % 3600) / 3600) * 360
    const sDeg = ((this.secOfDay % 60) / 60) * 360

    const hHand = document.getElementById('analog-hour')
    const mHand = document.getElementById('analog-min')
    const sHand = document.getElementById('analog-sec')

    if (hHand) hHand.setAttribute('transform', `rotate(${hDeg} 50 50)`)
    if (mHand) mHand.setAttribute('transform', `rotate(${mDeg} 50 50)`)
    if (sHand) sHand.setAttribute('transform', `rotate(${sDeg} 50 50)`)
  }
}
window.CFZ_GAME_CLOCK.init()

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function nl(s) { return esc(s).replace(/\n/g, '<br>') }

async function api(path, opts = {}, retryCount = 0) {
  const customHeaders = {
    'Content-Type': 'application/json',
    'x-player': 'io',
    ...(opts.headers || {})
  }
  const url = path.startsWith('/api') ? path : ('/api' + path)
  let r
  try {
    r = await fetch(url, {
      ...opts,
      headers: customHeaders
    })
  } catch (err) {
    if (retryCount < 1) {
      await new Promise(res => setTimeout(res, 400))
      return api(path, opts, retryCount + 1)
    }
    throw err
  }

  const contentType = r.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    if (retryCount < 1) {
      await new Promise(res => setTimeout(res, 400))
      return api(path, opts, retryCount + 1)
    }
    if (!r.ok) {
      const e = new Error(`Server HTTP ${r.status}: ${r.statusText}`)
      e.status = r.status
      throw e
    }
    const e = new Error(`Server returned non-JSON response for ${url}`)
    e.status = r.status
    throw e
  }
  const data = await r.json()
  if (!r.ok) {
    const msg = (data && data.error) ? data.error : `Request failed (${r.status})`
    const e = new Error(msg)
    e.status = r.status
    throw e
  }
  return data
}

function toast(title, body, kind) {
  const w = $('#toasts')
  const el = document.createElement('div')
  el.className = 'toast ' + (kind || '')
  el.innerHTML = `<div class="tt">${esc(title)}</div><div>${nl(body)}</div>`
  w.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; setTimeout(() => el.remove(), 260) }, kind === 'crit' ? 9000 : 5200)
}
window.toast = toast

function modal(o) {
  const veil = document.createElement('div')
  veil.className = 'veil on'
  veil.innerHTML = `<div class="modal ${o.cls || ''}" role="dialog" aria-modal="true">
    <div class="modal-h"><h3>${esc(o.title)}</h3><button class="modal-x" data-close>&#10005;</button></div>
    <div class="modal-b">${o.body}</div>
    ${o.footer ? `<div class="modal-f">${o.footer}</div>` : ''}
  </div>`
  document.body.appendChild(veil)
  const close = () => veil.remove()
  veil.querySelectorAll('[data-close]').forEach(b => b.onclick = close)
  veil.onclick = (e) => { if (e.target === veil) close() }
  if (o.after) setTimeout(() => o.after(veil, close), 0)
  return { el: veil, close }
}
window.modal = modal

function closeModal() {
  const veils = document.querySelectorAll('.veil')
  veils.forEach(v => v.remove())
}
window.closeModal = closeModal

var SCREEN_HELP = window.SCREEN_HELP = {
  desk: { t: 'Duty Room — Registration of the FIR', intro: 'Every lawful investigation begins with a registered FIR. Nothing you gather before registration has a case to attach itself to.', steps: ['Read the complaint and note the offence it actually discloses.', 'Write the narrative in sequence, satisfying each statutory ingredient of that offence.', 'Record the date, time and exact place of occurrence.', 'If there was delay in reporting, explain it.', 'Choose either immediate registration, or a preliminary inquiry if the offence permits it.', 'Submit — the classifier will tell you which ingredients you established.'], law: { title: 'BNSS s.173 — information in cognizable cases', body: 'Every information relating to the commission of a cognizable offence must be reduced to writing, read over to the informant and signed, and a free copy given. Refusal is remediable by the complainant going to the Superintendent of Police.' }, trap: 'A vivid narrative that satisfies no ingredient of the offence fails. The classifier looks for ingredients, not adjectives.' },
  scene: { t: 'Crime Scene — processing protocol', intro: 'Process the scene in order. The order is not a formality; each step protects the evidence the next step relies on.', steps: ['Log arrival, then cordon the scene.', 'Walk through the whole scene before touching anything.', 'Photograph wide, mid and macro, with a scale.', 'Draw the scene diagram and assign grid references.', 'Examine exhibits — use UV or an alternate light source where a trace may be hidden.', 'Canvass the locality for witnesses.', 'Seize each exhibit, and record TWO independent witnesses on every memo.', 'Seal the scene.'], law: { title: 'BNSS s.103 and s.176', body: 'BNSS s.176 requires you to inspect the place of occurrence. BNSS s.103 requires every seizure to be made in the presence of two or more independent and respectable inhabitants of the locality, and a signed list prepared. An exhibit seized without two independent witnesses is permanently tainted.' }, trap: 'The single most common mistake in this game: seizing everything quickly with only one witness. A tainted exhibit is worse than no exhibit, because the defence will use it to attack the whole file.' },
  labs: { t: 'Forensic Lab — sending and collecting', intro: 'Untested evidence is weak evidence, but every test consumes days from your statutory clock. You cannot test everything.', steps: ['Choose the tests that go to the heart of the offence.', 'Send the exhibit — remember the turnaround in days is added to your clock.', 'Wait for the report to mature, then collect it.', 'Read the stated limitations as carefully as the finding; they are what the defence will quote.', 'For every electronic record, hash it and obtain a DUAL-SIGNED BSA s.63 certificate.'], law: { title: 'BSA s.63 and s.47A', body: 'An electronic record is admissible only with a certificate giving its particulars, the device particulars and the conditions ensuring accuracy and integrity, signed by the person in charge AND an expert. Two signatures are mandatory. Expert opinion is only as good as the basis stated for it.' }, trap: 'Sending a digital exhibit to the charge sheet without the s.63 certificate means the court will not look at it at all — the strongest evidence in the case becomes invisible.' },
  board: { t: 'Evidence Board — where the file is assembled', intro: 'Everything the case knows is pinned here, as evidence and as leads. Red cards are problems. Green are admissible proof.', steps: ['Review each exhibit\'s admissibility status and the reason given.', 'Follow open leads from surveillance and statements.', 'Pursue disclosures from interrogation into physical recoveries.', 'Build the narrative you will eventually write into the charge sheet.'], law: { title: 'BSA s.57 — chain of custody', body: 'Where the genuineness of an exhibit is questioned, the prosecution must establish continuity of possession without tampering from seizure to production in court. Every hand-off must be logged.' }, trap: 'Doing the investigation but not recording it. A lead you followed but never entered into the diary does not exist for the court.' },
  pois: { t: 'Persons of Interest — alibi, arrest, identification', intro: 'Names arrive from statements, surveillance and informers. Some are your accused. Some are a trap.', steps: ['Record each person\'s statement in their own words, not yours.', 'Verify the alibi of anyone you might charge — a false lead you charge will destroy your case.', 'Where identity is in issue, conduct the identification parade promptly and under independent supervision.', 'If you arrest, record the grounds in writing and communicate them, including the right to bail.'], law: { title: 'BNSS s.47, s.58, s.35 — arrest', body: 'No arrest without the officer being satisfied of its necessity, recorded in writing. The arrested person must forthwith be told the full particulars of the offence, the grounds of arrest, and the right to bail.' }, trap: 'Charging the person who owns the matching vehicle without verifying his alibi. Ownership is not participation.' },
  interrogation: { t: 'Interrogation Room — the central lesson', intro: 'What a person tells a police officer proves nothing. What that information leads you to recover, before the right witnesses, is evidence.', steps: ['Open with an open question, not an accusation. Rapport moves people; bullying closes them.', 'Present evidence you actually hold — bluffing may work once and costs you your credibility.', 'Watch for a LOCATABLE disclosure: a place or a thing, not an admission.', 'Do not repeat tactics; they lose their power.', 'When you close the session, read the admissibility split: provable facts versus worthless talk.', 'Then go and execute the recovery, before two respectable witnesses.'], law: { title: 'BSA s.23 — confession to police officer not provable', body: 'No confession made to a police officer may be proved against an accused. So much of the information received from a person in custody as relates distinctly to the fact thereby discovered may be proved, if the discovery is made in the presence of a Magistrate or in the presence of two or more respectable witnesses.' }, trap: 'Extracting a confession and closing the session feeling successful. You will have gained nothing, and the judgment will say so.' },
  charge: { t: 'Charge Sheet — the final report', intro: 'The court decides whether to take cognizance. It will check your charges, your exhibits, your witnesses and your narrative.', steps: ['Select only the offence the admissible evidence supports.', 'List the accused with role attribution.', 'List only witnesses whose statements you recorded.', 'List only admissible exhibits.', 'Complete the annexures.', 'Write the brief facts so that each charged offence is tied to an exhibit.', 'Submit for cognizance.'], law: { title: 'BNSS s.193 and s.210', body: 'The final report must set out the names of the parties, the nature of the information, the witnesses, whether an offence appears to have been committed and by whom, the arrest and bail particulars, and the list of documents. The Magistrate then decides whether to take cognizance.' }, trap: 'Listing a tainted exhibit because it is important to your theory. It is the defence\'s first and easiest attack, and it damages the credibility of everything else you filed.' },
  court: { t: 'Court — how your file will be tested', intro: 'Defence counsel will attack in a predictable order: tainted seizures, uncertified electronic records, broken custody chains, witnesses who departed from their statements, and every doubt that survives.', steps: ['Write your summary of arguments as an argument, dealing with your own weaknesses first.', 'The court will expressly disregard tainted and inadmissible material and say so.', 'Read the judgment\'s remarks — they are tied to the specific defects in your file.', 'Carry those lessons into your next case.'], law: { title: 'BNSS s.313 and the standard of proof', body: 'The accused is examined to explain the circumstances appearing against him. Conviction requires proof beyond reasonable doubt on admissible evidence; where it falls short the accused receives the benefit of doubt.' }, trap: 'Attacking the accused\'s character instead of proving the offence. Character is not evidence of guilt.' },
  team: { t: 'Team — people are a shared, scarce resource', intro: 'Your assistant and your specialists can only be in one place at a time, across every case you hold.', steps: ['Appoint specialists whose skills match the cases you carry.', 'Assign errands to free your own attention, and note the day cost.', 'Use the messaging desk to task people — what you ask for creates real assignments.', 'Watch for officers committed to another case.'], law: { title: null, body: '' }, trap: 'Committing your only forensic specialist to a case with a distant deadline while the case that will die first sits untested.' },
  diary: { t: 'Case Diary — the record the court reads', intro: 'The diary is how the court sees what you did and when. Entries are made automatically, but what you investigate is what appears.', steps: ['Review entries in order; each is dated.', 'Red entries are procedural deficiencies the system recorded — they are permanent.', 'Green entries are milestones.', 'Write your own note above.', 'Use the diary to check your chronology before filing.'], law: { title: 'BNSS s.193 and s.172', body: 'The case diary records the day-to-day progress of the investigation, including the time of each step and the facts and circumstances ascertained.' }, trap: 'Losing the chronology. The defence will build a gap between occurrences from your own diary.' },
  wall: { t: 'Case Wall — running several investigations', intro: 'Each file has its own clock, its own tab and its own team thread. Your people, however, are shared.', steps: ['Open a file to make it active; every desk then follows it.', 'Compare deadlines and allocate your specialists accordingly.', 'Start with the flagship case to learn the full pipeline, then open further cases at higher tiers.'], law: { title: 'BNSS s.187 — the 60/90 day clock', body: 'For offences punishable up to ten years the investigation must be completed and the report forwarded within sixty days; for other offences, ninety days. On expiry the accused is entitled to default bail.' }, trap: 'Opening three cases you cannot resource, and watching the oldest one die on day 90.' }
}

function helpForScreen(viewKey, secKey) {
  if (G.player && G.player.settings && G.player.settings.onDemandHelp === false) { 
    toast('On-demand help is off', 'Enable it in Settings → Assistance if you want procedural guidance.', 'warn')
    return 
  }
  const vk = (typeof viewKey === 'string' ? viewKey : null) || (G && G.view) || 'desk'
  const sk = (typeof secKey === 'string' ? secKey : null) || (G && G.sectionKey)
  const helpObj = window.SCREEN_HELP || SCREEN_HELP || {}
  let h = (sk && helpObj[vk + '_' + sk]) || (sk && helpObj[sk]) || helpObj[vk] || helpObj.desk || { t: 'Procedural Guidance', intro: 'Follow statutory criminal protocol.', steps: ['Examine the record', 'Collect admissible evidence'], law: null, trap: null }
  modal({
    title: h.t,
    body: `<div class="reader"><p class="dim" style="font-style:italic">${esc(h.intro)}</p>
      ${(h.steps || []).map((s, i) => `<div class="check ok"><span class="ci">${i + 1}.</span><span class="cn">${esc(s)}</span></div>`).join('')}
      ${h.law ? `<div class="legalbox"><div class="lb-h">&#9878; ${esc(h.law.title)}</div>${esc(h.law.body)}</div>` : ''}
      ${h.trap ? `<div class="helpbox"><div class="hb-h">&#9888; The trap</div>${esc(h.trap)}</div>` : ''}</div>`,
    footer: `<button class="btn" data-close>Close</button>`
  })
}
window.helpForScreen = helpForScreen

async function refreshBootstrap(forceRender = false) {
  try {
    const b = await api('/bootstrap')
    const changed = mergeBundle(b)
    if (changed || forceRender) {
      if (typeof syncNotificationBadges === 'function') syncNotificationBadges()
      const activeEl = document.activeElement
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)
      if (!isTyping || forceRender) {
        if (!forceRender && G.view === 'chat' && typeof window.refreshChatInPlace === 'function') {
          await window.refreshChatInPlace()
        } else if (!forceRender && G.view === 'interrogation' && typeof window.refreshInterrogationInPlace === 'function') {
          window.refreshInterrogationInPlace()
        } else {
          render()
        }
      } else {
        G.__pendingRenderAfterTyping = true
      }
    }
    return b
  } catch (err) {
    console.warn('refreshBootstrap warning:', err)
  }
}
window.refreshBootstrap = refreshBootstrap

function stripLeadTagsFromText(s) {
  if (!s) return ''
  return String(s).replace(/\[\[(alibi|evidence|person|contradiction|location):([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/gi, (_m, _type, _id, text) => {
    return text.trim()
  })
}
window.stripLeadTags = stripLeadTagsFromText

function extractLeadsFromText(s) {
  if (!s) return []
  const leads = []
  const regex = /\[\[(alibi|evidence|person|contradiction|location):([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/gi
  let match
  while ((match = regex.exec(s)) !== null) {
    const type = match[1].toLowerCase()
    const targetId = match[2].trim()
    const text = match[3].trim()
    const explicitSummary = match[4]?.trim()
    let summary = explicitSummary
    if (!summary) {
      if (type === 'alibi') summary = `Stated Alibi claim: "${text}"`
      else if (type === 'evidence') summary = `Physical/Digital Exhibit lead: "${text}"`
      else if (type === 'person') summary = `Implicated accomplice / Person of Interest: "${text}"`
      else if (type === 'contradiction') summary = `Contradiction / Admission made: "${text}"`
      else if (type === 'location') summary = `Scene / Recovery locus disclosed: "${text}"`
    }
    leads.push({ type, targetId, text, summary, raw: match[0] })
  }
  return leads
}
window.extractLeads = extractLeadsFromText

window.handleLeadChipClick = async function(e, type, targetId, summary, targetView) {
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }
  
  // 1. Play investigative audio cue if available
  try {
    if (window.sound && typeof window.sound.play === 'function') {
      window.sound.play('click')
    }
  } catch (err) {}

  // 2. Toast notification
  const typeIcons = {
    alibi: '🛡️ ALIBI DISCOVERY',
    evidence: '🔍 EXHIBIT RECOVERY',
    person: '👥 POI IMPLICATED',
    contradiction: '⚠️ ADMISSION LOGGED',
    location: '📍 LOCUS DISPATCH'
  }
  const badgeTitle = typeIcons[type] || '📋 INVESTIGATIVE LEAD'
  if (typeof toast === 'function') {
    toast(badgeTitle, summary || 'Lead recorded in Case Diary & Case File.', '')
  }

  // 3. Log lead to server Case Diary (deduplicated)
  const curCase = (G.s && G.s.caseId) ? G.s : (window.G && window.G.s)
  if (curCase && curCase.caseId && typeof api === 'function') {
    try {
      const activePerson = (curCase.persons || []).find(x => x.id === (G.iv && G.iv.person)) || (curCase.persons || [])[0]
      api(`/cases/${curCase.caseId}/lead/log`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          targetId,
          summary: summary || targetId,
          suspectName: activePerson ? activePerson.name : 'Subject'
        })
      }).then(r => {
        if (r && typeof mergeBundle === 'function') {
          mergeBundle(r)
        }
      }).catch(() => {})
    } catch (err) {}
  }

  // 4. Dispatch / navigate to corresponding view
  const destView = targetView || (type === 'alibi' || type === 'person' ? 'pois' : type === 'evidence' ? 'board' : type === 'location' ? 'scene' : 'interrogation')
  if (typeof go === 'function') {
    go(destView)
    
    // 5. Post-navigation highlight helper
    setTimeout(() => {
      if (type === 'alibi' || type === 'person') {
        const poiEl = document.querySelector(`[data-poi="${targetId}"]`) || document.querySelector(`[data-poi]`)
        if (poiEl) {
          poiEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          poiEl.style.boxShadow = '0 0 20px rgba(200, 162, 74, 0.7)'
          setTimeout(() => { poiEl.style.boxShadow = '' }, 2500)
        }
      } else if (type === 'evidence') {
        const exEl = document.querySelector(`[data-exhibit="${targetId}"]`) || document.querySelector(`.exrow`)
        if (exEl) {
          exEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          exEl.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.7)'
          setTimeout(() => { exEl.style.boxShadow = '' }, 2500)
        }
      }
    }, 150)
  }
}

/**
 * Smoothly positions and highlights targeted statutory section at its top edge below sticky headers
 */
window.scrollToLegalTarget = function() {
  const tryScroll = () => {
    const b = document.getElementById('legal-body') || document
    const cleanSec = G.targetLegalSection ? String(G.targetLegalSection).toLowerCase().trim() : ''
    
    // Find target by exact data-sec or target flash class
    let target = null
    if (cleanSec) {
      target = Array.from(b.querySelectorAll('.legal-row')).find(el => {
        const sec = (el.getAttribute('data-sec') || '').toLowerCase().trim()
        const act = (el.getAttribute('data-act') || '').toUpperCase().trim()
        return sec === cleanSec && (!G.targetLegalAct || act === String(G.targetLegalAct).toUpperCase().trim())
      }) || b.querySelector(`.legal-row[data-sec="${G.targetLegalSection}"]`)
    }
    if (!target) {
      target = b.querySelector('.legal-row-flash') || b.querySelector('.legal-row[open]') || b.querySelector('.legal-row')
    }
    if (!target) return false

    // Ensure the card details are expanded
    target.open = true

    const work = target.closest('.work') || document.querySelector('.work') || document.querySelector('.main') || window
    if (work && typeof work.scrollTo === 'function') {
      const targetRect = target.getBoundingClientRect()
      const workRect = work.getBoundingClientRect ? work.getBoundingClientRect() : { top: 0 }
      const currentScroll = work.scrollTop || window.scrollY || 0
      const relativeTop = targetRect.top - workRect.top + currentScroll

      // Calculate sticky page header height if present
      let stickyHeight = 0
      const pageHead = work.querySelector ? work.querySelector('.page-head') : null
      if (pageHead) {
        stickyHeight = pageHead.offsetHeight || 52
      }

      // Position the top edge of the card cleanly 12px below the sticky page header
      const topTarget = relativeTop - stickyHeight - 12
      work.scrollTo({
        top: Math.max(0, topTarget),
        behavior: 'smooth'
      })
    } else if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    target.classList.add('legal-row-flash')
    setTimeout(() => target.classList.remove('legal-row-flash'), 2500)
    return true
  }

  // Attempt across consecutive layout passes to handle dynamic DOM rendering
  tryScroll()
  setTimeout(tryScroll, 40)
  setTimeout(tryScroll, 140)
  setTimeout(tryScroll, 320)
}

/**
 * Open specific legal statutory section in Legal Library and draw player directly to it centered
 */
window.openLegalSection = async function(act, section) {
  let cleanAct = String(act || 'BNSS').toUpperCase().trim()
  if (cleanAct === 'CRPC') cleanAct = 'BNSS'
  if (cleanAct === 'IPC') cleanAct = 'BNS'
  if (cleanAct === 'IEA') cleanAct = 'BSA'

  const cleanSec = String(section || '').trim().replace(/^s\./i, '').trim()
  const fullCite = `${cleanAct} s.${cleanSec}`

  G.legalAct = cleanAct
  G.legalQuery = fullCite
  G.targetLegalAct = cleanAct
  G.targetLegalSection = cleanSec

  // Set loading search state so legalLibraryHTML renders cleanly without warning
  G.legalResults = { results: [], candidates: 0, mode: 'loading', summary: `Accessing ${fullCite} in Legal Library…` }

  if (typeof go === 'function') {
    go('legal')
  }

  // Pre-fill input without stealing keyboard focus on mobile devices
  setTimeout(() => {
    const qInput = document.getElementById('legal-q')
    if (qInput) qInput.value = fullCite
  }, 20)

  // Execute fast statute search (resolves in ~2ms from server)
  if (typeof window.runLegalSearch === 'function') {
    await window.runLegalSearch(fullCite)
  } else if (typeof runLegalSearch === 'function') {
    await runLegalSearch(fullCite)
  }

  window.scrollToLegalTarget()
}

/**
 * Universal Legal & Procedural Destination Navigator
 * Draws player directly to the specific part on the respective page with subtle focus flash
 */
window.handleLegalNavigation = function(event, type, meta) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  if (type === 'statute' && meta) {
    window.openLegalSection(meta.act, meta.section)
    return
  }

  const navMap = {
    charge: { view: 'charge', selector: '#cs-draft, .charge-sheet-wrap, .card' },
    court: { view: 'court', selector: '#remand-docket, .court-docket, .card' },
    fir: { view: 'desk', selector: '.fir-box, .card' },
    seizure: { view: 'board', selector: '.malkhana-register, #board-grid, .card' },
    scene: { view: 'scene', selector: '.scene-grid, .card' },
    labs: { view: 'labs', selector: '.fsl-workspace, .labcard, .card' },
    witness: { view: 'pois', selector: '.poi-card, .card' },
    interrogation: { view: 'interrogation', selector: '.card, #iv-history, .iv-box' },
    team: { view: 'team', selector: '.card, .team-card' }
  }

  const navTarget = navMap[type]
  if (navTarget && typeof go === 'function') {
    go(navTarget.view)
    setTimeout(() => {
      const el = document.querySelector(navTarget.selector)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('legal-row-flash')
        setTimeout(() => el.classList.remove('legal-row-flash'), 2500)
      }
    }, 150)
  }
}

function renderChatMsg(s) {
  if (!s) return ''
  let str = String(s)

  // 0. Convert semantic lead tags [[type:id|text|summary]] or [[type:id|text]]
  const leadTagRegex = /\[\[(alibi|evidence|person|contradiction|location):([^|\]]+)\|([^|\]]+)(?:\|([^\]]+))?\]\]/gi
  str = str.replace(leadTagRegex, (match, rawType, targetId, text, explicitSummary) => {
    const type = rawType.toLowerCase()
    const safeText = text.trim()
    const safeTarget = targetId.trim()
    const leadClassMap = {
      alibi: 'lead-chip-alibi',
      evidence: 'lead-chip-evidence',
      person: 'lead-chip-person',
      contradiction: 'lead-chip-contradiction',
      location: 'lead-chip-location'
    }
    const iconMap = {
      alibi: '🛡️',
      evidence: '🔍',
      person: '👥',
      contradiction: '⚠️',
      location: '📍'
    }
    const badgeMap = {
      alibi: 'ALIBI',
      evidence: 'EXHIBIT',
      person: 'POI',
      contradiction: 'ADMISSION',
      location: 'LOCUS'
    }
    const viewMap = {
      alibi: 'pois',
      evidence: 'board',
      person: 'pois',
      contradiction: 'interrogation',
      location: 'scene'
    }

    const cssClass = leadClassMap[type] || 'lead-chip-evidence'
    const icon = iconMap[type] || '🔍'
    const badge = badgeMap[type] || 'LEAD'
    const targetView = viewMap[type] || 'board'
    const summary = explicitSummary ? explicitSummary.trim() : `${badge}: ${safeText}`
    const safeSummaryAttr = summary.replace(/"/g, '&quot;')

    return `<span class="interactive-lead-chip ${cssClass}" data-lead-type="${type}" data-lead-target="${esc(safeTarget)}" data-lead-summary="${esc(safeSummaryAttr)}" data-target-view="${targetView}" onclick="window.handleLeadChipClick(event, '${type}', '${esc(safeTarget)}', '${esc(safeSummaryAttr)}', '${targetView}')" title="${esc(safeSummaryAttr)} (Click to inspect)"><span class="lead-chip-icon">${icon}</span><span class="lead-chip-text">${safeText}</span><span class="lead-chip-badge">${badge}</span></span>`
  })

  const lines = str.split('\n')
  const out = []
  let inRosterGroup = false

  function closeRosterGroup() {
    if (inRosterGroup) {
      out.push('</div>')
      inRosterGroup = false
    }
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      closeRosterGroup()
      out.push('')
      continue
    }

    // Check for dossier / roster section headers: **Title (count):** or ### Title
    const hdrMatch = trimmed.match(/^(?:###\s*|\*\*)([^*]+?)(?:\s*\(([0-9]+)\))?:?\s*(?:\*\*)?$/i)
    if (hdrMatch && (trimmed.startsWith('**') || trimmed.startsWith('###'))) {
      closeRosterGroup()
      const title = hdrMatch[1].trim()
      const count = hdrMatch[2]
      const isRosterHdr = /accused|suspect|witness|examination|exhibit|roster/i.test(title)
      const tagText = isRosterHdr ? 'ROSTER' : 'DOSSIER'
      const badgeHtml = count ? `<span class="cdh-count">${count} PENDING</span>` : ''
      out.push(`<div class="chat-dossier-hdr"><div class="cdh-left"><span class="cdh-tag">${tagText}</span><span class="cdh-title">${esc(title)}</span></div>${badgeHtml}</div>`)
      continue
    }

    // Check for bullet line (strip leading •, -, or *)
    const bulletMatch = rawLine.match(/^[ \t]*[•\-\*][ \t]+(.*)$/)
    if (bulletMatch) {
      const itemContent = bulletMatch[1].trim()

      // Check for statement quote: Key Statement Recorded: "..."
      const quoteMatch = itemContent.match(/^(?:Key\s*)?Statement\s*(?:Recorded)?:\s*["“](.*)["”]\s*$/i)
      if (quoteMatch) {
        closeRosterGroup()
        out.push(`<div class="chat-statement-quote"><div class="csq-hdr"><span class="csq-icon">📜</span> RECORDED STATEMENT (BNSS s.180)</div><div class="csq-text">“${esc(quoteMatch[1])}”</div></div>`)
        continue
      }

      // Check if this is a roster item with bold name: **Name** ...
      let linkLabel = '', linkTarget = ''
      let textBeforeLink = itemContent
      const linkMatch = itemContent.match(/\s*\[([^\]]+)\]\((?:go:|\/|#)?([a-z0-9_:-]+)\)\s*$/i)
      if (linkMatch) {
        linkLabel = linkMatch[1]
        linkTarget = linkMatch[2]
        textBeforeLink = itemContent.slice(0, linkMatch.index).trim()
      }

      let name = '', rest = textBeforeLink
      const nameMatch = textBeforeLink.match(/^\*\*([^*]+)\*\*(.*)$/)
      if (nameMatch) {
        name = nameMatch[1].trim()
        rest = nameMatch[2].trim()
      }

      const isRoster = Boolean(name && (
        (linkTarget && /^interrogation/i.test(linkTarget)) ||
        /status:/i.test(rest) ||
        /statement on record/i.test(rest) ||
        /under arrest/i.test(rest) ||
        /summons/i.test(rest) ||
        /interrogation|statement|examine|review|dossier/i.test(linkLabel)
      ))

      if (isRoster) {
        let status = ''
        const statusMatch = rest.match(/[—–-]?\s*Status:\s*(?:\*([^*]+)\*|([^.\n]+))\.*[ \t]*/i)
        if (statusMatch) {
          status = (statusMatch[1] || statusMatch[2]).trim()
          rest = rest.replace(/[—–-]?\s*Status:\s*(?:\*([^*]+)\*|([^.\n]+))\.*[ \t]*/i, '').trim()
        } else if (/statement on record/i.test(rest)) {
          status = 'Statement on record'
          rest = rest.replace(/statement on record/i, '').trim()
        } else if (/witness/i.test(linkLabel) || /witness/i.test(rest)) {
          status = 'Witness'
        }

        let detail = rest.replace(/^[—–-]\s*/, '').trim()
        if (detail.startsWith('(') && detail.endsWith(')')) {
          detail = detail.slice(1, -1).trim()
        }
        detail = detail.replace(/^[—–-]\s*/, '').trim()

        let badgeClass = 'default'
        const stLower = status.toLowerCase()
        if (stLower.includes('arrest') || stLower.includes('custody')) badgeClass = 'custody'
        else if (stLower.includes('summons') || stLower.includes('notice')) badgeClass = 'summons'
        else if (stLower.includes('statement') || stLower.includes('examined') || stLower.includes('record')) badgeClass = 'examined'
        else if (stLower.includes('untraced') || stLower.includes('abscond') || stLower.includes('hostile')) badgeClass = 'alert'

        let btnLabel = 'Examine ➔'
        if (linkLabel.toLowerCase().includes('review')) btnLabel = 'Review ➔'
        else if (linkLabel.toLowerCase().includes('record')) btnLabel = 'Record ➔'

        const clickAttr = linkTarget ? `onclick="event.preventDefault(); event.stopPropagation(); go('${esc(linkTarget)}')"` : ''

        if (!inRosterGroup) {
          out.push('<div class="chat-roster-group">')
          inRosterGroup = true
        }

        out.push(`<div class="chat-roster-item ${badgeClass}" ${clickAttr}><div class="cri-main"><div class="cri-top"><span class="cri-name">${esc(name)}</span>${status ? `<span class="cri-badge ${badgeClass}">${esc(status)}</span>` : ''}</div>${detail ? `<div class="cri-detail">${esc(detail)}</div>` : ''}</div>${linkTarget ? `<div class="cri-action"><span class="cri-btn">${btnLabel}</span></div>` : ''}</div>`)
        continue
      }

      // General bullet / tactical field item (removes raw •)
      closeRosterGroup()
      out.push(`<div class="chat-field-item"><span class="cfi-indicator"></span><div class="cfi-content">${itemContent}</div></div>`)
      continue
    }

    closeRosterGroup()
    out.push(trimmed)
  }

  closeRosterGroup()

  // Combine lines with smart block spacing
  let combined = ''
  for (let i = 0; i < out.length; i++) {
    const cur = out[i]
    if (!cur) {
      if (combined && !combined.endsWith('</div>') && !combined.endsWith('<br>')) combined += '<br>'
      continue
    }
    const isBlock = cur.startsWith('<div') || cur.endsWith('</div>')
    if (combined) {
      if (combined.endsWith('</div>') || isBlock) {
        combined += '\n'
      } else {
        combined += '<br>'
      }
    }
    combined += cur
  }

  let html = combined

  // 1. Convert markdown bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // 2. Convert markdown italic *text* (cleans raw asterisks)
  html = html.replace(/\*([^*]+)\*/g, '<em class="chat-em">$1</em>')

  // 3. Convert standalone markdown navigation links [Label](go:view) -> Tactical micro-buttons
  html = html.replace(/\[([^\]]+)\]\((?:go:|\/|#)?([a-z0-9_:-]+)\)/gi, (match, label, view) => {
    return `<button type="button" class="chat-nav-link-btn" data-nav="${esc(view)}" onclick="event.preventDefault(); event.stopPropagation(); go('${esc(view)}')">${label}</button>`
  })

  // 4. Convert Legal Sections & Legal Terms to distinct font color links with ZERO box/border/chip effects
  const tokens = html.split(/(<[^>]+>)/)
  
  // (a) Match penal & procedural sections: BNSS s.180, BNS s.309, BSA s.23, Section 180 of BNSS, CrPC s.161, IPC s.302, etc.
  const statuteRe = /\b(?:(BNSS|BNS|BSA|IPC|CrPC|IEA)\s*(?:s\.|section|sec\.?)\s*([0-9]{1,3}(?:[A-Z]|\([0-9a-z]+\))?)|(?:s\.|section)\s*([0-9]{1,3}(?:[A-Z]|\([0-9a-z]+\))?)\s*(?:of\s*(?:the\s*)?)?(BNSS|BNS|BSA|IPC|CrPC|IEA))\b/gi

  // (b) Priority list of procedural legal terms (drawn to specific page with NO box/border)
  const legalProcedures = [
    { re: /\b(Charge[- ]Sheets?|Final Reports? under s\.193|Police Reports? under s\.193)\b/i, type: 'charge', title: 'Open Charge Sheet Draft' },
    { re: /\b(Magistrate Remands?|Police Custody Remands?|Judicial Remands?|Police Remands?|Judicial Custody|Statutory Bails?|Default Bails?|Remands?)\b/i, type: 'court', title: 'Open Magistrate Remand & Court Docket' },
    { re: /\b(First Information Reports?|FIRs?)\b/i, type: 'fir', title: 'Open First Information Report (FIR)' },
    { re: /\b(Panchnamas?|Panchamas?|Seizure Memos?|Malkhana Registers?|Chain of Custody)\b/i, type: 'seizure', title: 'Open Seizure Records & Malkhana Register' },
    { re: /\b(Inquest Reports?|Crime Scene Panchnamas?)\b/i, type: 'scene', title: 'Open Crime Scene Inquest' },
    { re: /\b(Forensic Examinations?|Ballistics Examinations?|DNA Examinations?|Chemical Examinations?|FSL Examinations?|FSL Reports?|Forensic Science Laboratory|Forensic Reports?|FSL Requisitions?|Forensic Labs?)\b/i, type: 'labs', title: 'Open Forensic Laboratory' },
    { re: /\b(Witness Examinations?|Recording of Statements?|161 Statements?)\b/i, type: 'witness', title: 'Open Witness Statements' },
    { re: /\b(Interrogations?|Interrogation Chambers?|Interrogation Rooms?)\b/i, type: 'interrogation', title: 'Open Interrogation Room' },
    { re: /\b(BSA s\.63 Certificates?|Section 63 Certificates?|s\.63 Certificates?|Electronic Evidence Certificates?|65B Certificates?)\b/i, type: 'statute', meta: { act: 'BSA', section: '63' }, title: 'Open BSA s.63 in Legal Library' },
    { re: /\b(BSA s\.23 Disclosures?|Section 23 Disclosures?|s\.23 Disclosures?|Confessions? in Custody|Disclosure Statements?|Discovery Statements?)\b/i, type: 'statute', meta: { act: 'BSA', section: '23' }, title: 'Open BSA s.23 in Legal Library' },
    { re: /\b(Grounds of Arrest|Arrest Memos?|Notice under s\.35)\b/i, type: 'statute', meta: { act: 'BNSS', section: '35' }, title: 'Open BNSS s.35 in Legal Library' },
    { re: /\b(Evidence Boards?|Evidence Dossiers?)\b/i, type: 'seizure', title: 'Open Evidence Board' }
  ]

  for (let i = 0; i < tokens.length; i++) {
    // Skip existing HTML tags
    if (tokens[i].startsWith('<') && tokens[i].endsWith('>')) continue

    // First replace statute sections (e.g. BNSS s.180, BNS s.309)
    tokens[i] = tokens[i].replace(statuteRe, (match, a1, s1, s2, a2) => {
      const act = (a1 || a2 || 'BNSS').toUpperCase()
      const sec = (s1 || s2 || '').trim()
      return `<span class="legal-term-link" onclick="window.handleLegalNavigation(event, 'statute', { act: '${act}', section: '${sec}' })" title="Open ${act} s.${sec} in Legal Library">${match}</span>`
    })

    // Next replace legal procedures with distinct font color and NO boxes
    for (const term of legalProcedures) {
      const metaAttr = JSON.stringify(term.meta || {}).replace(/"/g, '&quot;')
      tokens[i] = tokens[i].replace(term.re, (m) => {
        return `<span class="legal-term-link" onclick="window.handleLegalNavigation(event, '${term.type}', ${metaAttr})" title="${term.title}">${m}</span>`
      })
    }
  }

  return tokens.join('')
}

function setBusy(b) { G.busy = b; $$('.btn').forEach(x => { if (x.dataset.keep) return; x.disabled = b }) }

async function act(fn, opts = {}) {
  if (G.busy) return
  setBusy(true)
  try { return await fn() }
  catch (e) { toast('Error', e.message || String(e), 'crit'); return null }
  finally { setBusy(false) }
}

function toSentenceCase(str) {
  if (!str) return ''
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getRegisteredMembers() {
  let members = []
  try {
    const raw = localStorage.getItem('cfz_registered_members')
    if (raw) members = JSON.parse(raw)
  } catch (e) { members = [] }
  if (!Array.isArray(members)) members = []

  // Ensure default commissioned officer "Swetabh Suman" (Badge MCB-4512) is saved in Sentence Case
  const swetabh = members.find(m => m && m.fullName && m.fullName.toLowerCase() === 'swetabh suman')
  if (!swetabh) {
    members.unshift({
      fullName: 'Swetabh Suman',
      badgeNumber: 'MCB-4512',
      loginId: 'MCB-4512',
      callsign: 'SUMAN',
      rank: 'PSI (Probation)',
      posting: 'Crime Branch, Malhar Division',
      clearanceLevel: 3,
      standing: 85,
      careerScore: 1850,
      casesClosed: 2,
      convictions: 2,
      dateCommissioned: '14 Jan 2026'
    })
    try { localStorage.setItem('cfz_registered_members', JSON.stringify(members)) } catch (e) {}
  } else {
    swetabh.fullName = 'Swetabh Suman'
    swetabh.badgeNumber = 'MCB-4512'
    if (!swetabh.loginId) swetabh.loginId = 'MCB-4512'
  }
  return members
}

function saveRegisteredMember(m) {
  const members = getRegisteredMembers()
  const idx = members.findIndex(x => x.fullName.toLowerCase() === m.fullName.toLowerCase() || (m.badgeNumber && x.badgeNumber === m.badgeNumber))
  if (idx >= 0) {
    members[idx] = { ...members[idx], ...m }
  } else {
    members.push(m)
  }
  try { localStorage.setItem('cfz_registered_members', JSON.stringify(members)) } catch (e) {}
}

function renderOfficerBadgeHTML(officer) {
  const p = officer || G.player || {}
  const name = toSentenceCase(p.fullName || 'Swetabh Suman')
  const badgeNo = p.badgeNumber || p.badgeNo || 'MCB-4512'
  const rank = p.rank || 'Police Sub-Inspector'
  const loginId = p.loginId || badgeNo
  const posting = p.posting || 'CID Crime Branch · Unit 1 (Homicide)'
  const clearance = p.clearanceLevel || 3
  const avatarUrl = p.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80'

  return `
  <div class="badge-frame" id="officer-official-badge">
    <div class="badge-clip"></div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px">
      <div class="badge-portrait-container">
        <img src="${esc(avatarUrl)}" alt="${esc(name)}" class="badge-portrait-img" />
        <div class="badge-portrait-stamp">COMMISSIONED</div>
      </div>
      <div class="badge-seal-svg">
        <svg viewBox="0 0 100 100" width="70" height="70" aria-hidden="true">
          <defs>
            <radialGradient id="goldGradBadge" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff0aa"/>
              <stop offset="60%" stop-color="#c8a24a"/>
              <stop offset="100%" stop-color="#7a5c1e"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#141a24" stroke="url(#goldGradBadge)" stroke-width="3.5"/>
          <circle cx="50" cy="50" r="38" fill="none" stroke="#c8a24a" stroke-width="1" stroke-dasharray="3 2"/>
          <path d="M50 18 L55 35 L73 35 L59 46 L64 63 L50 52 L36 63 L41 46 L27 35 L45 35 Z" fill="url(#goldGradBadge)" opacity="0.95"/>
          <circle cx="50" cy="50" r="9" fill="#0d1117" stroke="#e0be6c" stroke-width="1.5"/>
          <text x="50" y="53" text-anchor="middle" font-family="'Barlow Condensed', sans-serif" font-size="8" font-weight="700" fill="#e0be6c">MCB</text>
        </svg>
      </div>
    </div>
    <div class="badge-state-title">METRO POLICE</div>
    <div class="badge-div-title">${esc(posting)}</div>
    <div class="badge-officer-name">${esc(name)}</div>
    <div style="font-family:var(--font-cond);font-size:13px;color:#e0be6c;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">${esc(rank)}</div>
    
    <div class="badge-meta-grid">
      <div>
        <div class="badge-meta-lbl">OFFICIAL BADGE NO</div>
        <div class="badge-meta-val">${esc(badgeNo)}</div>
      </div>
      <div>
        <div class="badge-meta-lbl">STATION LOGIN ID</div>
        <div class="badge-meta-val">${esc(loginId)}</div>
      </div>
      <div>
        <div class="badge-meta-lbl">SECURITY CLEARANCE</div>
        <div class="badge-meta-val">LEVEL ${esc(clearance)} (CONFIDENTIAL)</div>
      </div>
      <div>
        <div class="badge-meta-lbl">COMMISSION STATUS</div>
        <div class="badge-meta-val" style="color:#6fd39b">ACTIVE DUTY</div>
      </div>
    </div>
    
    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:9px;color:#5a6675">
      <span>SEC-HASH: SHA256-MCB-${esc(badgeNo)}</span>
      <span style="color:#c8a24a">&#9733; CONFERRED &#9733;</span>
    </div>
  </div>`
}

function openBadgeModal(officer) {
  const p = officer || G.player || {}
  modal({
    title: '&#127894; Official Commissioned Badge &amp; Credentials',
    body: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:6px 0">
        ${renderOfficerBadgeHTML(p)}
        <div style="max-width:380px;text-align:center;font-size:12px;color:var(--ink3);line-height:1.4">
          This digital credentials badge is cryptographically linked to the Metro Crime Branch Central Registry. Authorized for Crime Scene Command &amp; Judicial Submissions.
        </div>
      </div>`,
    footer: `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <button class="btn warn sm" id="btn-modal-logout">Log Out / Switch Officer</button>
        <button class="btn pri sm" data-close>Close</button>
      </div>`
  })
  setTimeout(() => {
    const logoutBtn = $('#btn-modal-logout')
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        closeModal()
        localStorage.removeItem('cfz_current_member')
        G.authMember = null
        G.applyGatewayMode = 'choose'
        go('apply')
        toast('Logged out', 'Returned to Department Clearance Gateway.', '')
      }
    }
  }, 50)
}

function applyPlayer(p) {
  G.player = { ...(G.player || {}), ...(p || {}) }
  if (G.authMember) {
    if (p && p.fullName) G.authMember.fullName = p.fullName
    if (p && (p.badgeNo || p.badgeNumber)) G.authMember.badgeNumber = p.badgeNo || p.badgeNumber
    if (p && p.avatarUrl) G.authMember.avatarUrl = p.avatarUrl
    if (p && p.rank) G.authMember.rank = p.rank
    if (p && p.posting) G.authMember.posting = p.posting
    localStorage.setItem('cfz_current_member', JSON.stringify(G.authMember))
  }
  if (G.player) {
    G.player.applicationState = 'inducted'
  }
  if (p && p.settings) {
    const s = p.settings
    document.documentElement.style.setProperty('--scale', s.presentation?.textScale || 1)
    document.body.classList.toggle('dyslexic', !!s.presentation?.dyslexicFont)
    document.body.classList.toggle('mono-dossier', !!s.presentation?.monoDossier)
    document.body.classList.toggle('nomotion', !!s.presentation?.reducedMotion)
  }
}

// ---------------------------------------------------------------
// THE CLIENT SIDE OF THE SYNC GUARANTEE.
//
// Every API response carries the same complete bundle. This function is the
// ONLY place client state is written, so no view can hold a private copy of
// the case, the team, the threads or the officer's standing.
//
// Because the header, the menus, the notepad drawer and the active section all
// render from these fields, one write here updates all of them at once — which
// is what "a change in one part causes the requisite change in every other"
// means in practice.
// ---------------------------------------------------------------
function applyBundle(b) {
  // Keep the ambience bed in step with the loaded settings.
  if (window.Ambience) setTimeout(() => Ambience.play(Ambience.sceneFor(G.view)), 0)
  if (!b) return false
  if (b.player) applyPlayer(b.player)
  // accept both spellings: /bootstrap sends `cases`, caseBundle sends `caseList`
  const cases = b.caseList || b.cases
  if (cases) G.cases = cases
  if (b.team) G.team = b.team
  if (b.threads) {
    G.threads = b.threads
    if (G.view === 'chat') {
      const activeId = Number(G.activeThread) || (G.threads[0] ? Number(G.threads[0].id) : 1)
      const currentActive = G.threads.find(x => Number(x.id) === activeId)
      if (currentActive && currentActive.unread > 0) {
        currentActive.unread = 0
        api(`/chat/${activeId}/read`, { method: 'POST' }).catch(() => {})
      }
    }
    if (typeof syncNotificationBadges === 'function') syncNotificationBadges()
  }
  if (b.legalRefs) G.legalRefs = b.legalRefs
  if (b.forms) G.forms = b.forms
  if (b.candidates) G.candidates = b.candidates
  // `snapshot: null` is meaningful (no case open) and must be honoured
  if ('snapshot' in b) G.snapshot = b.snapshot
  const changed = b.rev != null && b.rev !== G.rev
  if (b.rev != null) G.rev = b.rev
  return changed
}

/* Back-compat alias — every view already calls mergeBundle(). */
function mergeBundle(b) { return applyBundle(b) }

let _lastSyncTime = 0
let _syncDebounceTimer = null

async function cfzPersistGameState() {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer)
  _syncDebounceTimer = setTimeout(async () => {
    try {
      const payload = {
        player: G.player,
        team: G.team,
        cases: G.cases,
        registeredMembers: getRegisteredMembers(),
        currentMember: G.authMember ? G.authMember.fullName : null,
        activeSnapshot: G.snapshot,
        timestamp: Date.now()
      }

      // 1. Persist to LocalStorage
      try {
        localStorage.setItem('cfz_cached_gamestate', JSON.stringify(payload))
      } catch (e) {}

      // 2. Persist to Server via /sync/state
      try {
        await api('/sync/state', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      } catch (e) {
        console.warn('Backend state sync deferred:', e)
      }

      // 3. Persist to Firestore if available
      if (window.syncGameStateToCloud && G.authMember) {
        try {
          await window.syncGameStateToCloud(G.authMember.badgeNumber || 'MCB-4512', payload)
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Error in cfzPersistGameState:', err)
    }
  }, 300)
}
window.cfzPersistGameState = cfzPersistGameState

async function boot() {
  const note = $('#boot-note')
  const steps = ['Establishing secure connection…', 'Verifying officer credentials…', 'Loading case registry…', 'Compiling legal reference library…', 'Opening the console…']
  let i = 0
  const t = setInterval(() => { if (note && steps[i]) note.textContent = steps[i++] }, 430)
  try {
    // Check local session
    const savedName = localStorage.getItem('cfz_current_member')
    const members = getRegisteredMembers()
    if (savedName) {
      const match = members.find(m => m.fullName.toLowerCase() === savedName.toLowerCase())
      if (match) {
        G.authMember = match
      }
    }
    
    // Fetch state from server
    let b = null
    try {
      const syncRes = await api('/sync/state')
      if (syncRes && syncRes.state) {
        b = syncRes.state
      }
    } catch (e) {}

    if (!b) {
      b = await api('/bootstrap')
    }

    clearInterval(t)
    applyBundle(b)
    
    if (!G.authMember) {
      G.view = 'apply'
      G.applyGatewayMode = 'choose'
    }

    $('#boot').style.display = 'none'
    $('#app').classList.add('on')
    render()

    // Automatically present Daily Situation Briefing on initial game load if authenticated
    if (G.authMember) {
      setTimeout(() => {
        try {
          if (typeof dailyBriefingModal === 'function') dailyBriefingModal()
        } catch (err) {
          console.error('Error opening daily briefing:', err)
        }
      }, 450)
    }

    // Set up real-time auto-persistence interval (every 25s) and real-time state polling (every 6s)
    setInterval(() => {
      if (G.authMember) {
        cfzPersistGameState()
      }
    }, 25000)

    setInterval(() => {
      if (G.authMember && !G.busy) {
        refreshBootstrap().catch(() => {})
      }
    }, 6000)

    window.addEventListener('beforeunload', () => {
      if (G.authMember) {
        cfzPersistGameState()
      }
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && G.authMember) {
        cfzPersistGameState()
      } else if (document.visibilityState === 'visible' && G.authMember && !G.busy) {
        refreshBootstrap().catch(() => {})
      }
    })
  } catch (e) {
    clearInterval(t)
    if (note) note.textContent = 'Connection failed: ' + e.message
  }
}

// ---------------------------------------------------------------
// chrome — a STATIC header carrying categorised dropdown menus.
// The workspace below it gets the whole remaining screen.
// ---------------------------------------------------------------

/* Categorised menu: every desk, record and setting is reachable from here.
   Nothing is a floating sidebar; the header never scrolls away. */
const MENU = [
  {
    k: 'casework', label: 'Casework', icon: '&#128193;',
    hint: 'The desks of an investigation, in the order the law requires them',
    items: [
      { k: 'desk', icon: '&#128220;', label: 'Duty Room', sub: 'FIR registration', act: 1 },
      { k: 'scene', icon: '&#128300;', label: 'Crime Scene', sub: 'Process and seize', act: 2 },
      { k: 'labs', icon: '&#129514;', label: 'Forensic Lab', sub: 'Test and collect', act: 3 },
      { k: 'board', icon: '&#128204;', label: 'Evidence Board', sub: 'Assemble proof', act: 4 },
      { k: 'pois', icon: '&#128101;', label: 'Persons of Interest', sub: 'Alibi, arrest, TIP', act: 4 },
      { k: 'interrogation', icon: '&#128373;', label: 'Interrogation Room', sub: 'BSA s.23 disclosures', act: 5 }
    ]
  },
  {
    k: 'filing', label: 'Filing', icon: '&#128209;',
    hint: 'The documents that put the case before a court',
    items: [
      { k: 'charge', icon: '&#128220;', label: 'Charge Sheet', sub: 'Final report, s.193', act: 7 },
      { k: 'court', icon: '&#9878;', label: 'Court', sub: 'Trial and judgment', act: 8 },
      { k: 'diary', icon: '&#128214;', label: 'Case Diary', sub: 'Chronology, s.172', act: 4 }
    ]
  },
  {
    k: 'force', label: 'Force', icon: '&#129309;',
    hint: 'Your files, your people and how you task them',
    items: [
      { k: 'wall', icon: '&#128194;', label: 'Case Wall', sub: 'All your files', badge: 'cases' },
      { k: 'chat', icon: '&#128172;', label: 'Messaging Desk', sub: 'Assistant, seniors, head', badge: 'unread' },
      { k: 'team', icon: '&#129309;', label: 'Team', sub: 'Appoint and allocate' }
    ]
  },
  {
    k: 'reference', label: 'Reference', icon: '&#128218;',
    hint: 'Statute, guidance, settings and your service record',
    items: [
      { k: 'legal', icon: '&#9878;', label: 'Legal Library', sub: 'BNS / BNSS / BSA' },
      { k: 'guide', icon: '&#128210;', label: 'Player Guide', sub: 'How the game works' },
      { k: 'settings', icon: '&#9881;', label: 'Settings', sub: 'Assistance and presentation' },
      { k: 'career', icon: '&#127894;', label: 'Career Record', sub: 'Standing and history' },
      { k: 'apply', icon: '🪪', label: 'Recruitment', sub: 'Act 0 — your application' }
    ]
  }
]

function menuItem(k) {
  for (const g of MENU) { const it = g.items.find(i => i.k === k); if (it) return { g, it } }
  return null
}

function menuBadge(it) {
  const s = G.snapshot
  if (it.badge === 'cases') return (G.cases || []).length > 1 ? (G.cases || []).length : 0
  if (it.badge === 'unread') return unreadTotal()
  if (!s || !it.act) return 0
  return (s.blockers || []).filter(b => b.act === it.act).length
}

function menuBadgeClass(it) {
  const s = G.snapshot
  if (it.badge === 'cases') return 'n'
  if (it.badge === 'unread') return 'warn'
  if (!s || !it.act) return ''
  const b = (s.blockers || []).filter(x => x.act === it.act)
  return b.some(x => x.severity === 'critical') ? 'crit' : b.length ? 'warn' : ''
}

function unreadTotal() {
  return (G.threads || []).reduce((n, t) => n + (t.unread || 0), 0)
}

function syncNotificationBadges() {
  const uTotal = unreadTotal()
  // 1. Update HUD header chat button badge
  const chatBtn = $('#btn-chat')
  if (chatBtn) {
    let existingBadge = chatBtn.querySelector('.badge')
    if (uTotal > 0) {
      if (!existingBadge) {
        existingBadge = document.createElement('span')
        existingBadge.className = 'badge'
        chatBtn.appendChild(existingBadge)
      }
      existingBadge.textContent = String(uTotal)
    } else if (existingBadge) {
      existingBadge.remove()
    }
  }

  // 2. Update drop-down menu items for chat
  $$('[data-view="chat"]').forEach(btn => {
    let navBadge = btn.querySelector('.nav-n')
    if (uTotal > 0) {
      if (!navBadge) {
        navBadge = document.createElement('span')
        navBadge.className = 'nav-n warn'
        btn.appendChild(navBadge)
      }
      navBadge.textContent = String(uTotal)
    } else if (navBadge) {
      navBadge.remove()
    }
  })

  // 3. Update thread list items in Chat View
  const activeThreadId = Number(G.activeThread) || (G.threads && G.threads[0] ? Number(G.threads[0].id) : 1);
  (G.threads || []).forEach(t => {
    const isAct = Number(t.id) === activeThreadId
    const itemEl = document.querySelector(`.chat-item[data-thread="${t.id}"]`)
    if (itemEl) {
      const titleContainer = itemEl.querySelector('.ci-t')
      if (titleContainer) {
        let badgeEl = titleContainer.querySelector('.nav-n')
        if (!isAct && (t.unread || 0) > 0) {
          if (!badgeEl) {
            badgeEl = document.createElement('span')
            badgeEl.className = 'nav-n warn'
            badgeEl.textContent = String(t.unread)
            titleContainer.appendChild(badgeEl)
          } else {
            badgeEl.textContent = String(t.unread)
          }
        } else if (badgeEl) {
          badgeEl.remove()
        }
      }
    }
  })
}
window.syncNotificationBadges = syncNotificationBadges

function getBreadcrumbSegments() {
  const active = menuItem(G.view)
  if (!active) {
    return ['CONSOLE']
  }

  const segments = []

  // 1. Group / Category (e.g. CASEWORK, FILING, FORCE, REFERENCE)
  if (active.g && active.g.label) {
    segments.push(active.g.label.toUpperCase())
  }

  // 2. Main View / Desk (e.g. EVIDENCE BOARD, CRIME SCENE, DUTY ROOM, etc.)
  if (active.it && active.it.label) {
    segments.push(active.it.label.toUpperCase())
  }

  // 3. Section / Tab & Sub-view resolution based on G.view:
  if (G.view === 'board') {
    const activeTabKey = G.sectionKey === '2' ? '2' : '1'
    if (activeTabKey === '2') {
      segments.push('CHRONOLOGICAL EVIDENCE TIMELINE')
      const filter = G.tlFilter || 'all'
      if (filter === 'all') segments.push('ALL MILESTONES')
      else if (filter === 'recovery') segments.push('SCENE RECOVERIES')
      else if (filter === 'lab') segments.push('LAB ANALYSES')
      else if (filter === 's23') segments.push('BSA S.23 RECOVERIES')
    } else {
      segments.push('PINNED EVIDENCE BOARD')
      const subView = G.boardSubView || 'dossier'
      if (subView === 'canvas') segments.push('CORKBOARD CANVAS')
      else if (subView === 'dossier') segments.push('CLASSIFIED DOSSIER VIEW')
    }
  }
  else if (G.view === 'scene') {
    const mode = G.sceneMode || 'grid'
    if (mode === 'canvass') {
      segments.push('LOCALITY CANVASS')
    } else {
      segments.push('FORENSIC OPTICS')
    }
  }
  else if (G.view === 'interrogation') {
    const intTab = G.intTab || G.sectionKey
    if (intTab === 's23' || intTab === '1') segments.push('BSA S.23 DISCLOSURE')
    else if (intTab === 'remand' || intTab === '2') segments.push('REMAND & LEGAL RIGHTS')
    else if (intTab === 'medical' || intTab === '3') segments.push('MEDICAL CHECK (S.53/54)')
    else if (intTab === 'chamber' || intTab === '0') segments.push('INTERROGATION CHAMBER')
    else if (G.sections && G.sections.length && G.sectionKey != null) {
      const sec = G.sections.find(s => s.key === G.sectionKey)
      if (sec && sec.label) segments.push(sec.label.toUpperCase())
    }
  }
  else if (G.view === 'labs') {
    const category = G.labCategory || G.sectionKey
    if (category === 'tox' || category === '1') segments.push('CHEMICAL & TOXICOLOGY')
    else if (category === 'ballistics' || category === '2') segments.push('BALLISTICS & STRIATIONS')
    else if (category === 'cyber' || category === '3') segments.push('CYBER & DIGITAL FORENSICS')
    else if (category === 'marks' || category === '4') segments.push('FINGERPRINTS & MARKS')
    else if (category === 'dna' || category === '5') segments.push('SEROLOGY & DNA')
    else if (G.sections && G.sections.length && G.sectionKey != null) {
      const sec = G.sections.find(s => s.key === G.sectionKey)
      if (sec && sec.label) segments.push(sec.label.toUpperCase())
    }
  }
  else if (G.view === 'pois') {
    const filter = G.poiFilter || G.sectionKey
    if (filter === 'accused' || filter === '1') segments.push('PRIMARY ACCUSED')
    else if (filter === 'suspects' || filter === '2') segments.push('SUSPECTS & ACCOMPLICES')
    else if (filter === 'witnesses' || filter === '3') segments.push('WITNESSES & INFORMERS')
    else if (G.sections && G.sections.length && G.sectionKey != null) {
      const sec = G.sections.find(s => s.key === G.sectionKey)
      if (sec && sec.label) segments.push(sec.label.toUpperCase())
    }
  }
  else if (G.view === 'chat') {
    if (G.threads && G.threads.length) {
      const activeThreadId = Number(G.activeThread) || Number(G.threads[0].id)
      const thread = G.threads.find(t => Number(t.id) === activeThreadId)
      if (thread && thread.title) {
        segments.push(thread.title.toUpperCase())
      }
    }
  }
  else if (G.view === 'settings') {
    const tab = G.settingsTab || G.sectionKey || 'profile'
    if (tab === 'profile' || tab === '0') segments.push('OFFICER PROFILE')
    else if (tab === 'byok' || tab === '1') segments.push('ADJUDICATION AI / BYOK')
    else if (tab === 'presentation' || tab === '2') segments.push('PRESENTATION & AUDIO')
    else if (tab === 'rules' || tab === '3') segments.push('GAME RULES & BRAKES')
    else if (G.sections && G.sections.length && G.sectionKey != null) {
      const sec = G.sections.find(s => s.key === G.sectionKey)
      if (sec && sec.label) segments.push(sec.label.toUpperCase())
    }
  }
  else {
    if (G.sections && G.sections.length && G.sectionKey != null) {
      const sec = G.sections.find(s => s.key === G.sectionKey)
      if (sec && sec.label) {
        const labelUpper = sec.label.toUpperCase()
        if (labelUpper !== active.it.label.toUpperCase()) {
          segments.push(labelUpper)
        }
      }
    }
  }

  return segments
}

function renderBreadcrumbHtml() {
  const s = G.snapshot
  const segments = getBreadcrumbSegments()
  if (!segments || !segments.length) return ''
  
  const formattedHtml = segments.map((seg, idx) => {
    const isLast = idx === segments.length - 1
    const cls = isLast ? 'crumb-i' : 'crumb-g'
    const clickAttr = isLast ? `class="${cls} clickable-tab-guide" onclick="helpForScreen()" title="Click for procedure guide" style="cursor:pointer"` : `class="${cls}"`
    const sep = idx === 0 ? '' : `<span class="crumb-s">/</span>`
    return `${sep}<span ${clickAttr}>${esc(seg)}</span>`
  }).join(' ')

  const resumePointHtml = s ? `<span class="crumb-r">${esc(s.resumePoint)}</span>` : ''
  return `${formattedHtml}${resumePointHtml}`
}

function updateBreadcrumb() {
  const crumbEl = document.getElementById('hud-crumb') || document.querySelector('.crumb')
  if (crumbEl) {
    crumbEl.innerHTML = renderBreadcrumbHtml()
  }
}
window.updateBreadcrumb = updateBreadcrumb

/* A single slim bar that never competes with the workspace. */
function hud() {
  const s = G.snapshot
  const p = G.player || {}
  const cls = s ? (s.daysLeft <= 7 ? 'crit' : s.daysLeft <= 15 ? 'warn' : 'ok') : 'ok'
  const critCount = s ? (s.blockers || []).filter(b => b.severity === 'critical').length : 0
  const active = menuItem(G.view)
  const openGroup = G.menu
  return `
  <header class="hud" role="banner">
    <div class="hud-row">
      <div class="hud-brand" role="button" tabindex="0" id="brand" title="Case Wall">
        <svg viewBox="0 0 44 44" width="26" height="26" aria-hidden="true">
          <circle cx="22" cy="22" r="20" fill="none" stroke="#c8a24a" stroke-width="1.6"/>
          <circle cx="22" cy="22" r="16.5" fill="none" stroke="#c8a24a" stroke-width=".8" stroke-dasharray="2 3"/>
          <path d="M22 8 L25 16 L33 16 L27 21 L29 29 L22 24 L15 29 L17 21 L11 16 L19 16 Z" fill="#c8a24a" opacity=".92"/>
        </svg>
        <span class="hud-brand-t">CASE FILE ZERO</span>
      </div>

      <nav class="menubar" role="navigation" aria-label="Console sections">
        ${MENU.map(g => `
          <div class="mgroup ${openGroup === g.k ? 'open' : ''} ${g.items.some(i => i.k === G.view) ? 'here' : ''}" data-menu="${g.k}">
            <button class="mbtn" data-menu-btn="${g.k}" aria-expanded="${openGroup === g.k}">
              <span class="mi">${g.icon}</span><span class="ml">${g.label}</span>
              <span class="mc">&#9662;</span>
            </button>
          </div>`).join('')}
      </nav>

      ${s ? `
      <div class="hud-case" id="hud-case" role="button" tabindex="0" title="Switch case">
        <div>
          <div class="hud-case-no">№${esc(s.caseNo)} &middot; ${esc(s.offenceClass)} ${esc(s.difficulty)}${critCount ? ` &middot; <span class="cr">${critCount} CRITICAL</span>` : ''}</div>
          <div class="hud-case-t">${esc(s.title)}</div>
        </div>
      </div>` : `<div class="hud-case empty"><div class="hud-case-t dim">No file open</div></div>`}

      <div class="hud-officer-wrap">
        <div class="hud-officer" id="hud-officer-btn" role="button" tabindex="0" title="Click for Quick Profile &amp; Commission Credentials">
          <div class="hud-officer-avatar">
            ${p.avatarUrl ? `<img src="${esc(p.avatarUrl)}" alt="${esc(p.fullName || 'Officer')}" />` : `<span class="init">${esc((p.fullName || 'IO').slice(0, 2).toUpperCase())}</span>`}
          </div>
          <div class="hud-officer-meta">
            <div class="officer-rank">${esc(p.rank || 'Applicant')}${p.badgeNo ? ' · ' + esc(p.badgeNo) : ''}</div>
            <div class="officer-name">${esc(p.fullName || 'Investigating Officer')}</div>
          </div>
        </div>
        <div class="hud-profile-bubble" id="hud-profile-bubble">
          <div class="hpb-header">
            <div class="hpb-avatar">
              ${p.avatarUrl ? `<img src="${esc(p.avatarUrl)}" alt="${esc(p.fullName || 'Officer')}" />` : `<span class="init">${esc((p.fullName || 'IO').slice(0, 2).toUpperCase())}</span>`}
            </div>
            <div class="hpb-info">
              <div class="hpb-name">${esc(p.fullName || 'Investigating Officer')}</div>
              <div class="hpb-rank">${esc(p.rank || 'Police Sub-Inspector')}${p.badgeNo ? ' · ' + esc(p.badgeNo) : ''}</div>
              <div class="hpb-status"><span style="font-size:8px">●</span> ACTIVE DUTY · ${esc(p.posting || 'CID Crime Branch')}</div>
            </div>
          </div>
          <div class="hpb-stats">
            <div class="hpb-stat-item">
              <span class="hpb-stat-k">Standing / Merit</span>
              <span class="hpb-stat-v" style="color:var(--gold2)">${p.standing != null ? p.standing : '92%'} Merit</span>
            </div>
            <div class="hpb-stat-item">
              <span class="hpb-stat-k">BSA §23 Split Admissibility</span>
              <span class="hpb-stat-v" style="color:#6fd39b">98% Clean</span>
            </div>
            <div class="hpb-stat-item">
              <span class="hpb-stat-k">Cases Cleared</span>
              <span class="hpb-stat-v">${p.casesClosed || 1} Solved</span>
            </div>
            <div class="hpb-stat-item">
              <span class="hpb-stat-k">Assistance Penalty</span>
              <span class="hpb-stat-v" style="color:var(--ink3)">−0% (Pure Solves)</span>
            </div>
          </div>
          <div class="hpb-actions">
            <button class="btn pri sm hpb-btn" id="hpb-btn-badge">&#127894; Official Commission Warrant</button>
            <button class="btn sm hpb-btn" id="hpb-btn-profile">&#9881; Edit Profile &amp; Settings</button>
            <button class="btn gh sm hpb-btn" id="hpb-btn-byok">&#129302; Adjudication AI / BYOK Key</button>
            <button class="btn warn sm hpb-btn" id="hpb-btn-logout">&#128274; Switch Officer / Gateway</button>
          </div>
        </div>
      </div>

      <div class="hud-btns">
        <button class="icobtn ${G.npOpen ? 'on active is-open' : ''}" id="np-toggle" title="Investigator's Notepad (Observations &amp; Blockers)">&#128203;${critCount ? `<span class="badge">${critCount}</span>` : ''}</button>
        <button class="icobtn ${(G.guideOpen || G.view === 'guide') ? 'on active is-open' : ''}" id="btn-guide" title="Procedural Guidance &amp; SOP (H)">&#128073;</button>
        <button class="icobtn ${(G.briefingOpen || G.view === 'briefing') ? 'on active is-open' : ''}" id="btn-briefing" title="Daily Situation Briefing">&#128240;</button>
        <button class="icobtn ${G.view === 'chat' ? 'on active is-open' : ''}" id="btn-chat" title="Messaging Desk (C)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>${unreadTotal() ? `<span class="badge">${unreadTotal()}</span>` : ''}</button>
        <button class="icobtn ${G.view === 'settings' ? 'on active is-open' : ''}" id="btn-settings" title="Settings">&#9881;</button>
      </div>
    </div>

    <!-- Layer 2: Dedicated Breadcrumb Row -->
    <div class="hud-row crumb-row">
      <div class="crumb" id="hud-crumb">
        ${renderBreadcrumbHtml()}
      </div>
    </div>

    <!-- Layer 3: Dedicated Section Strip Pill Bubble Row (above page content) -->
    <div class="hud-row seclist-row" id="seclist-row" style="display:none">
      <div class="seclist-slot" id="seclist-slot"></div>
    </div>

    ${MENU.map(g => `
      <div class="menu-panel ${openGroup === g.k ? 'on' : ''}" data-panel="${g.k}" role="menu">
        <div class="mp-head">${g.icon} <span>${g.label}</span><small>${esc(g.hint)}</small></div>
        <div class="mp-items">
          ${g.items.map(it => {
            const n = menuBadge(it)
            return `<button class="mp-item ${it.k === G.view ? 'on' : ''}" data-view="${it.k}" role="menuitem">
              <span class="mp-ico">${it.icon}</span>
              <span class="mp-b"><span class="mp-t">${it.label}</span><span class="mp-s">${it.sub}</span></span>
              ${n ? `<span class="nav-n ${menuBadgeClass(it)}">${n}</span>` : ''}
            </button>`
          }).join('')}
        </div>
      </div>`).join('')}
  </header>`
}

/* The notepad is an overlay drawer: it never takes space from the workspace. */
function notepad() {
  const s = G.snapshot
  if (!s) return ''
  const notes = (s.blockers || []).slice(0, 12).map(b => {
    const ic = b.severity === 'critical' ? '&#10006;' : b.severity === 'warning' ? '&#9888;' : '&#8505;'
    return `<div class="note ${b.severity}"><span class="note-ic">${ic}</span><span class="note-t"><b>${esc(b.title)}</b> — ${esc(b.fix)}</span></div>`
  }).join('')
  return `
  <div class="drawer ${G.npOpen ? 'open' : ''}" id="notepad">
    <div class="drawer-panel">
      <div class="drawer-head">
        <h4>&#128203; Investigator's Notepad</h4>
        <span class="dim mono">${(s.blockers || []).length} item(s) requiring attention &middot; autosaved</span>
        <button class="modal-x" id="np-close" title="Close">&#10005;</button>
      </div>
      <div class="drawer-body">${notes || '<div class="note info"><span class="note-ic">&#10003;</span><span class="note-t">Nothing outstanding. The file is in order.</span></div>'}</div>
    </div>
  </div>`
}

// ---------------------------------------------------------------
// render
// ---------------------------------------------------------------

/* Translate the interface chrome after a render. Runs after the view's own
   .after() so dynamically-built markup is covered too. Case content, statutory
   text and AI output are deliberately left in English. */
function translate() {
  try { if (window.I18N) I18N.apply($('#app') || document) } catch (e) { /* never break a render */ }
}

function render() {
  const app = $('#app')
  const prevScroll = $('#work') ? $('#work').scrollTop : 0
  // A navigation or section switch opens at the top; an in-place re-render
  // (after a save, a modal, or a sync update) keeps the reader where they were.
  const resetScroll = !!G.scrollReset
  G.scrollReset = false

  // Preserve focused element if typing
  const activeEl = document.activeElement
  const activeId = (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) ? activeEl.id : null
  const activeVal = activeId ? activeEl.value : null
  const activeSelStart = activeId ? activeEl.selectionStart : null
  const activeSelEnd = activeId ? activeEl.selectionEnd : null

  app.innerHTML = hud() + `<main class="work view-${G.view || 'desk'}" id="work" role="main"></main>` + notepad() +
    `<div class="menuscrim" id="menuscrim"></div><div class="toasts" id="toasts"></div>`
  wireChrome()
  const w = $('#work')
  const V = VIEWS[G.view] || VIEWS.desk
  try {
    w.innerHTML = V()
  } catch (e) {
    w.innerHTML = `<div class="vacant"><i>&#9888;</i><h3>This section failed to render</h3><p>${esc(e.message || String(e))}</p></div>`
  }
  // Order matters: .after() wires each view's internal controls (including its
  // tab row), and only then can adoptSections() read and drive that row.
  if (V.after) setTimeout(() => { 
    try { V.after() } finally { 
      adoptSections()
      translate()
      if (activeId) {
        const restored = document.getElementById(activeId)
        if (restored) {
          if (activeVal !== null && restored.value !== activeVal) restored.value = activeVal
          if (activeSelStart !== null && activeSelEnd !== null && typeof restored.setSelectionRange === 'function') {
            restored.setSelectionRange(activeSelStart, activeSelEnd)
          }
          restored.focus({ preventScroll: true })
        }
      }
    } 
  }, 0)
  else { 
    adoptSections()
    translate()
    if (activeId) {
      const restored = document.getElementById(activeId)
      if (restored) {
        if (activeVal !== null && restored.value !== activeVal) restored.value = activeVal
        if (activeSelStart !== null && activeSelEnd !== null && typeof restored.setSelectionRange === 'function') {
          restored.setSelectionRange(activeSelStart, activeSelEnd)
        }
        restored.focus({ preventScroll: true })
      }
    }
  }
  w.scrollTop = resetScroll ? 0 : prevScroll
}

/* Views still declare their own sub-tabs. Instead of two competing tab rows,
   the shell ADOPTS them: the row is hidden and re-rendered in the header as the
   section strip, while the original handlers stay in place. One section shows,
   every other section stays collapsed. */
function adoptSections() {
  const work = $('#work')
  G.sections = []
  if (!work) { renderSectionStrip(); return }
  const tabsEl = work.querySelector('.tabs')
  if (!tabsEl) { G.sectionKey = null; renderSectionStrip(); return }
  const tabs = Array.from(tabsEl.querySelectorAll('.tab'))
  if (!tabs.length) { G.sectionKey = null; renderSectionStrip(); return }
  G.sections = tabs.map((t, i) => ({ i, label: t.textContent.trim(), key: t.dataset.ct || t.dataset.st || String(i) }))
  const want = G.sectionKey != null ? G.sections.find(s => s.key === G.sectionKey) : null
  const target = want || G.sections.find((s, i) => tabs[i].classList.contains('on')) || G.sections[0]
  G.sectionKey = target.key
  if (G.view === 'settings') {
    G.settingsTab = target.key
  }
  // Re-apply the remembered section so a re-render never silently resets it.
  if (!tabs[target.i].classList.contains('on')) tabs[target.i].click()
  renderSectionStrip()
}

/* The strip is filled here, not in hud(), because the sections are only known
   after the view has rendered and its tab row has been read. */
function renderSectionStrip() {
  const row = $('#seclist-row')
  const slot = $('#seclist-slot')
  if (typeof updateBreadcrumb === 'function') updateBreadcrumb()
  if (!slot) return
  if (!G.sections || !G.sections.length) {
    slot.innerHTML = ''
    if (row) row.style.display = 'none'
    return
  }
  if (row) row.style.display = 'flex'
  slot.className = 'seclist'
  slot.setAttribute('role', 'tablist')
  slot.setAttribute('aria-label', 'Sections in this view')

  const buttonsHtml = G.sections.map((sec, idx) => {
    const isFirst = idx === 0
    const sep = isFirst ? '' : `<span class="sec-sep" aria-hidden="true"></span>`
    return `${sep}<button class="secbtn ${sec.key === G.sectionKey ? 'on' : ''}" data-sec-idx="${sec.i}" role="tab">${esc(sec.label)}</button>`
  }).join('')

  slot.innerHTML = `<div class="sec-pill-bubble">${buttonsHtml}</div>`
  $$('.secbtn', slot).forEach(b => b.onclick = () => {
    const sec = G.sections[Number(b.dataset.secIdx)]
    if (!sec) return
    G.sectionKey = sec.key
    if (G.view === 'settings') {
      G.settingsTab = sec.key
    }
    // Update active state on buttons immediately in place
    $$('.secbtn', slot).forEach(btn => btn.classList.toggle('on', btn === b))

    const work = $('#work')
    if (work) {
      const tabs = Array.from(work.querySelectorAll('.tabs .tab'))
      if (tabs[sec.i]) {
        tabs[sec.i].click()
      } else {
        const panels = Array.from(work.querySelectorAll('[data-sp]'))
        if (panels.length) {
          panels.forEach(p => p.style.display = p.dataset.sp === sec.key ? '' : 'none')
        }
      }
      // If switching to guide tab in settings, load chapters if not loaded
      if (G.view === 'settings' && sec.key === '7' && typeof loadGuide === 'function') {
        if (!(G.guideChapters || []).length) loadGuide()
      }
    }
    if (typeof updateBreadcrumb === 'function') updateBreadcrumb()
  })
}

function closeMenus() {
  G.menu = null
  $$('.mgroup').forEach(m => m.classList.remove('open'))
  $$('.menu-panel').forEach(p => p.classList.remove('on'))
  $$('.mbtn').forEach(b => b.setAttribute('aria-expanded', 'false'))
  const sc = $('#menuscrim'); if (sc) sc.classList.remove('on')
}

function openMenu(k) {
  const wasOpen = G.menu === k
  closeMenus()
  if (wasOpen) return
  G.menu = k
  const g = $$('.mgroup').find(m => m.dataset.menu === k)
  const p = $$('.menu-panel').find(x => x.dataset.panel === k)
  if (g) g.classList.add('open')
  if (p) p.classList.add('on')
  const b = $$('.mbtn').find(x => x.dataset.menuBtn === k); if (b) b.setAttribute('aria-expanded', 'true')
  const sc = $('#menuscrim'); if (sc) sc.classList.add('on')
}

function go(view) {
  if (typeof view === 'string' && view.startsWith('interrogation:')) {
    const parts = view.split(':');
    view = parts[0];
    const targetId = Number(parts[1]);
    if (targetId) {
      G.ivTarget = targetId;
      G.iv = null;
    }
  }
  const it = menuItem(view)
  if (it && it.it.act && !G.snapshot) {
    toast('Not available', 'Register the FIR first — a case without an FIR has no legal existence.', 'warn')
    closeMenus()
    return
  }
  G.view = view
  G.sectionKey = null
  G.scrollReset = true
  closeMenus()
  if (window.Ambience) Ambience.play(Ambience.sceneFor(view))
  render()
}

function wireChrome() {
  $$('[data-menu-btn]').forEach(b => b.onclick = (e) => { e.stopPropagation(); openMenu(b.dataset.menuBtn) })
  $$('[data-view]').forEach(b => b.onclick = () => go(b.dataset.view))
  const sc = $('#menuscrim'); if (sc) sc.onclick = closeMenus
  const br = $('#brand'); if (br) { br.onclick = () => go('wall') }
  const hc = $('#hud-case'); if (hc) hc.onclick = () => go('wall')
  const bc = $('#btn-chat'); if (bc) bc.onclick = () => go('chat')
  const bb = $('#btn-briefing'); if (bb) bb.onclick = () => { if (typeof dailyBriefingModal === 'function') dailyBriefingModal(true) }
  const bg = $('#btn-guide'); if (bg) bg.onclick = () => helpForScreen()
  const bs = $('#btn-settings'); if (bs) bs.onclick = () => go('settings')
  const nt = $('#np-toggle'); if (nt) nt.onclick = () => { G.npOpen = !G.npOpen; $('#notepad').classList.toggle('open', G.npOpen); const c = $('#np-caret'); if (c) c.innerHTML = G.npOpen ? '&#9660;' : '&#9650;' }
  const nc = $('#np-close'); if (nc) nc.onclick = () => { G.npOpen = false; $('#notepad').classList.remove('open'); const c = $('#np-caret'); if (c) c.innerHTML = '&#9650;' }
  const ho = $('#hud-officer-btn')
  const pb = $('#hud-profile-bubble')
  if (ho && pb) {
    ho.onclick = (e) => {
      e.stopPropagation()
      pb.classList.toggle('on')
    }
    const badgeBtn = $('#hpb-btn-badge')
    if (badgeBtn) badgeBtn.onclick = (e) => {
      e.stopPropagation()
      pb.classList.remove('on')
      openBadgeModal(G.authMember || G.player)
    }
    const profBtn = $('#hpb-btn-profile')
    if (profBtn) profBtn.onclick = (e) => {
      e.stopPropagation()
      pb.classList.remove('on')
      G.settingsTab = 'profile'
      go('settings')
    }
    const byokBtn = $('#hpb-btn-byok')
    if (byokBtn) byokBtn.onclick = (e) => {
      e.stopPropagation()
      pb.classList.remove('on')
      G.settingsTab = '3'
      go('settings')
    }
    const logoutBtn = $('#hpb-btn-logout')
    if (logoutBtn) logoutBtn.onclick = (e) => {
      e.stopPropagation()
      pb.classList.remove('on')
      localStorage.removeItem('cfz_current_member')
      G.authMember = null
      G.applyGatewayMode = 'choose'
      go('apply')
      toast('Logged out', 'Returned to Department Clearance Gateway.', '')
    }
    document.addEventListener('click', (ev) => {
      if (!pb.contains(ev.target) && !ho.contains(ev.target)) {
        pb.classList.remove('on')
      }
    })
  }
}

function head(icon, title, sub, actions) {
  return `<div class="page-head">
    <div class="page-ico">${icon}</div>
    <div class="page-head-text">
      <div class="page-t clickable-tab-guide" onclick="helpForScreen()" title="Click title for procedure guide" style="cursor:pointer">${title}</div>
      ${sub ? `<div class="page-s">${sub}</div>` : ''}
    </div>
    ${actions ? `<div class="page-acts">${actions}</div>` : ''}
  </div>`
}

function cite(section, act) {
  const r = (G.legalRefs || []).find(x => x.section === String(section) && x.act === act)
  const tip = r ? esc(r.title + ' — ' + r.plain.slice(0, 180)) : ''
  return `<span class="cite" data-cite="${esc(act + ' ' + section)}" title="${tip}">${esc(act)} s.${esc(section)}</span>`
}

function legalBox(title, body, section, act) {
  if (!G.player || !G.player.settings.legalGuidance) return ''
  return `<div class="legalbox"><div class="lb-h">&#9878; ${esc(title)} ${section ? cite(section, act) : ''}</div>${nl(body)}</div>`
}

function procedureCoach(steps) {
  if (!G.player || !G.player.settings.procedureCoach) return ''
  return `<div class="helpbox"><div class="hb-h">&#10003; Procedure Coach</div>${steps.map(s => `<div class="check ${s.ok ? 'ok' : 'no'}"><span class="ci">${s.ok ? '&#10003;' : '&#9675;'}</span><span class="cn">${esc(s.text)}${s.detail ? `<div class="cd">${s.detail}</div>` : ''}</span></div>`).join('')}</div>`
}

// Auto-migrate any legacy plain-text API key stored in localStorage to HTTP-Only server vault
(async function migrateLegacyByokKey() {
  try {
    const legacyKey = localStorage.getItem('cfz_gemini_api_key')
    if (legacyKey && legacyKey.trim()) {
      await fetch('/api/settings/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: legacyKey.trim() })
      })
      localStorage.removeItem('cfz_gemini_api_key')
    }
  } catch (e) {
    // quiet
  }
})()
