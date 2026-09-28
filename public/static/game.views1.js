/* CASE FILE ZERO — modals + shared UI interactions */

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
window.modal = modal;

function closeModal() {
  const veils = document.querySelectorAll('.veil')
  veils.forEach(v => v.remove())
}
window.closeModal = closeModal;

function form(fields) {
  return fields.map(f => {
    if (f.type === 'textarea') return `<div class="fld"><label>${esc(f.label)}${f.req ? '<span class="req">*</span>' : ''}</label>
      <textarea id="${f.id}" class="${f.cls || ''}" placeholder="${esc(f.ph || '')}" rows="${f.rows || 6}">${esc(f.val || '')}</textarea>
      ${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`
    if (f.type === 'select') return `<div class="fld"><label>${esc(f.label)}${f.req ? '<span class="req">*</span>' : ''}</label>
      <select id="${f.id}">${(f.opts || []).map(o => `<option value="${esc(o)}" ${o === f.val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
      ${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`
    return `<div class="fld"><label>${esc(f.label)}${f.req ? '<span class="req">*</span>' : ''}</label>
      <input type="${f.type || 'text'}" id="${f.id}" value="${esc(f.val || '')}" placeholder="${esc(f.ph || '')}" />
      ${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`
  }).join('')
}

/* ---------- Duty Room: the FIR composer ---------- */

function firModal() {
  const s = G.snapshot
  const off = OFFENCES
  const already = s.fir
  modal({
    cls: 'wide',
    title: 'First Information Report — BNSS s.173',
    body: `
      ${already ? `<div class="legalbox"><div class="lb-h">&#9878; Already registered</div>FIR No. <b>${esc(already.fir_no || '—')}</b> was registered on day ${already.filed_day}. The narrative below is the filed record.</div>` : ''}
      ${legalBox('BNSS s.173 — information in cognizable cases', 'Every information relating to the commission of a cognizable offence, if given orally, shall be reduced to writing, read over to the informant, and signed by him. A copy shall be given free of cost. If the officer refuses to record the information, the informant may send it in writing to the Superintendent of Police.', '173', 'BNSS')}
      <div class="grid g2">
        <div>
          ${form([
            { id: 'f-place', label: 'Place of occurrence', req: 1, val: already?.place_of_occurrence || s.fir?.place_of_occurrence || 'Bus stop opposite Anand Tea Stall, Marol Depot Road, Malhar East', hint: 'Exact location. This determines which scene is inspected.' },
            { id: 'f-when', label: 'Date & time of occurrence', req: 1, val: already?.date_of_occurrence || 'Today, 08:35 hrs', hint: 'Must be consistent with everything you record later. A mismatch here is a permanent contradiction.' },
            { id: 'f-informant', label: 'Complainant / informant', req: 1, val: already?.informant || 'Nitin Bhosale, Accounts Cashier, Sunrise Logistics Pvt Ltd' },
            { id: 'f-delay', label: 'Delay in reporting, and its cause', val: already?.delay || 'Reported within the hour; the informant was at the hospital with the injured escort.' , hint: 'An unexplained delay is the first point the defence will take.' },
            { id: 'f-sections', label: 'Sections you believe are attracted', val: (already?.bns_sections || []).join(', ') || 'BNS 309, BNS 115, BNS 61', hint: 'Comma separated. BNS 309 robbery, BNS 115 hurt, BNS 61 conspiracy.' }
          ])}
          <div class="fld">
            <label>Registration route<span class="req">*</span></label>
            <div class="opt ${''}" id="r-reg"><span class="dot"></span><span><b>Register the FIR now.</b> Correct for every cognizable offence. No cost in time.</span></div>
            <div class="opt" id="r-prelim"><span class="dot"></span><span><b>Seek a preliminary inquiry.</b> ${cite('173', 'BNSS')} Only for offences punishable 3 to under 7 years, with SP permission, and it costs you <b>14 days</b> off your clock.</span></div>
          </div>
        </div>
        <div>
          <div class="fld">
            <label>Narrative — write what you were told${' '}<span class="req">*</span></label>
            <textarea id="f-narr" class="doc" rows="16" placeholder="Write the substance of the information in sequence. For each ingredient of the offence, include the fact that satisfies it. Do not editorialise; do not conclude."></textarea>
            <div class="hint">The classification system will check your narrative against the statutory ingredients of the offence and mark which you established. Ingredients score, not adjectives.</div>
          </div>
          ${G.player.settings.ingredientHighlight ? `<div id="ing-chips" class="card" style="padding:11px"><div class="card-h"><h3>Statutory ingredients detected</h3></div><div id="ing-list" class="dim" style="font-size:12.5px">Begin typing — ingredients will light up as you satisfy them.</div></div>` : ''}
        </div>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button>
      <button class="btn pri" id="f-submit" ${already ? 'disabled' : ''}>${already ? 'Already registered' : 'Register FIR'}</button>`,
    after: (veil, close) => {
      let prelim = false
      const rr = veil.querySelector('#r-reg'), rp = veil.querySelector('#r-prelim')
      const setRoute = (p) => {
        prelim = p
        rr.classList.toggle('on', !p); rp.classList.toggle('on', p)
        rr.querySelector('.dot').style.borderColor = !p ? 'var(--gold)' : 'var(--line2)'
        rp.querySelector('.dot').style.borderColor = p ? 'var(--gold)' : 'var(--line2)'
      }
      setRoute(false)
      rr.onclick = () => setRoute(false)
      rp.onclick = () => setRoute(true)

      const ta = veil.querySelector('#f-narr')
      if (ta && already?.narrative) ta.value = already.narrative
      const ing = veil.querySelector('#ing-list')
      const KEYS = [
        { k: 'dishonest intention to take', label: 'Dishonest intention' },
        { k: 'movable property', label: 'Movable property' },
        { k: 'without consent', label: 'Without consent' },
        { k: 'out of the possession', label: 'Out of the possession of a person' },
        { k: 'violence or threat of instant violence', label: 'Violence or fear of instant violence (robbery)' },
        { k: 'hurt', label: 'Hurt caused' },
        { k: 'agreement to do an illegal act', label: 'Agreement — criminal conspiracy' },
        { k: 'cash', label: 'Money or valuable property described' },
        { k: '18:00', label: 'Time of occurrence stated' },
        { k: 'bus stop', label: 'Place of occurrence stated' }
      ]
      if (ta && ing) ta.oninput = () => {
        const t = ta.value.toLowerCase()
        const hits = KEYS.filter(x => t.includes(x.k))
        ing.innerHTML = hits.length
          ? hits.map(h => `<span class="tag green" style="margin:2px">&#10003; ${esc(h.label)}</span>`).join('')
          : '<span class="dim">No statutory ingredient detected yet. Describe the act, the property, the consent and the place.</span>'
      }
      const sub = veil.querySelector('#f-submit')
      if (sub) sub.onclick = () => act(async () => {
        const narrative = ta.value.trim()
        if (narrative.length < 60) { toast('Narrative too brief', 'An FIR must state the facts that satisfy the ingredients of the offence. Write at least a full paragraph.', 'warn'); return }
        const sections = veil.querySelector('#f-sections').value.split(',').map(x => x.trim()).filter(Boolean)
        const r = await api(`/cases/${s.caseId}/fir`, { method: 'POST', body: JSON.stringify({
          place: veil.querySelector('#f-place').value,
          dateOfOcc: veil.querySelector('#f-when').value,
          informant: veil.querySelector('#f-informant').value,
          informantType: 'victim',
          delay: veil.querySelector('#f-delay').value,
          narrative, sections, preliminary: prelim
        }) })
        mergeBundle(r)
        close()
        render()
        const res = r.result
        toast(r.accepted ? 'FIR registered — ' + (r.firNo || '') : 'Draft rejected', res.advice || '', r.accepted ? 'good' : 'crit')
        modal({
          cls: 'wide',
          title: 'Classification of your FIR',
          body: `<div class="grid g2">
            <div class="card"><div class="card-h"><h3>Ingredients</h3></div>
              ${(res.ingredients || []).map(i => `<div class="check ${i.present ? 'ok' : 'no'}"><span class="ci">${i.present ? '&#10003;' : '&#10007;'}</span><span class="cn">${esc(i.ingredient)}${i.evidence_in_narrative ? `<div class="cd">"${esc(i.evidence_in_narrative)}"</div>` : ''}</span></div>`).join('') || '<div class="dim">No ingredients assessed.</div>'}
              ${(res.missing_ingredients || []).length ? `<div class="rule"></div><div class="hd" style="font-size:11px;color:var(--red);margin-bottom:6px">Not established</div>${res.missing_ingredients.map(m => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(m)}</span></div>`).join('')}` : ''}
            </div>
            <div>
              <div class="card"><div class="card-h"><h3>Assessment</h3></div>
                <div class="kv"><span class="k">Offence disclosed</span><span class="v">${esc(res.offence_detected)}</span></div>
                <div class="kv"><span class="k">Cognizable</span><span class="v">${res.cognizable ? '<span class="tag red">Yes — registration mandatory</span>' : '<span class="tag grey">No</span>'}</span></div>
                <div class="kv"><span class="k">Sections suggested</span><span class="v mono">${esc((res.suggested_sections || []).join(', '))}</span></div>
                <div class="kv"><span class="k">Jurisdiction</span><span class="v">${res.jurisdiction_ok ? '<span class="tag green">Proper</span>' : '<span class="tag red">Outside your station</span>'}</span></div>
                <div class="kv"><span class="k">Delay explained</span><span class="v">${res.delay_explained ? '<span class="tag green">Yes</span>' : '<span class="tag red">No</span>'}</span></div>
                <div class="kv"><span class="k">Severity</span><span class="v">${esc(res.severity)}</span></div>
              </div>
              ${(res.defects || []).length ? `<div class="card" style="border-color:var(--red)"><div class="card-h"><h3 style="color:#ff8b86">Defects</h3></div>${res.defects.map(d => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(d)}</span></div>`).join('')}</div>` : ''}
              <div class="legalbox"><div class="lb-h">&#9878; Advice</div>${esc(res.advice)}</div>
            </div>
          </div>`,
          footer: `<button class="btn pri" data-close>Noted</button>`
        })
      })
    }
  })
}

const OFFENCES = ['BNS 303','BNS 309','BNS 101','BNS 103','BNS 115','BNS 117','BNS 316','BNS 318','BNS 61']

/* ---------- Exhibit quick-look ---------- */

function exhibitModal(ex) {
  const s = G.snapshot
  const isTainted = ex.admissibility === 'tainted' || ex.tainted
  const clsTag = ex.admissibility === 'admissible' ? 'green'
    : isTainted ? 'red'
    : ex.admissibility === 'inadmissible' ? 'violet' : 'grey'
  const displayPts = (!ex.seized || isTainted) ? 0 : (ex.weight != null && ex.weight > 0 ? ex.weight : (ex.isDigital ? 30 : 25))
  const canRedo = !!(ex.seized || ex.tainted || ex.admissibility === 'tainted' || ex.admissibility === 'admissible')

  modal({
    cls: 'wide',
    title: (ex.exhibitNo ? 'Exhibit ' + ex.exhibitNo + ' — ' : '') + ex.name,
    body: `
      <div class="grid g12">
        <div>
          ${typeof window.getExhibitForensicSVG === 'function' ? window.getExhibitForensicSVG(ex, '') : ''}
          <div class="paper" style="padding:18px 20px">
            <div class="paper-head"><h2>EXHIBIT LABEL</h2><p>Metro Crime Branch &middot; Case №${esc(s.caseNo)}</p></div>
            <div class="paper-row"><span class="k">Exhibit</span><span class="v">${esc(ex.exhibitNo || 'un-numbered')}</span></div>
            <div class="paper-row"><span class="k">Description</span><span class="v">${esc(ex.name)}</span></div>
            <div class="paper-row"><span class="k">Category</span><span class="v">${esc(ex.category)}</span></div>
            <div class="paper-row"><span class="k">Grid reference</span><span class="v">${esc(ex.gridRef || 'not recorded')}</span></div>
            <div class="paper-row"><span class="k">Status</span><span class="v">${ex.found ? (ex.seized ? 'Seized & Deposited' : 'Examined in situ') : 'Not yet recovered'}</span></div>
            ${ex.isDigital ? `<div class="paper-row"><span class="k">SHA-256</span><span class="v" style="font-size:11px;word-break:break-all">${esc(ex.hash || 'not taken — the record has no established integrity')}</span></div>` : ''}
            <div class="paper-sig">
              <div>Investigating Officer</div>
              <div>Deposited: Malkhana</div>
            </div>
          </div>
        </div>
        <div>
          <div class="card"><div class="card-h"><h3>Admissibility</h3><span class="sp tag ${clsTag}">${esc((ex.admissibility || 'UNSEIZED').toUpperCase())}</span></div>
            <div style="font-size:13px;line-height:1.6">${esc(ex.why || (ex.seized ? (isTainted ? 'Procedural defects under BNSS s.103.' : 'Seized lawfully under BNSS s.103.') : 'Recovered in situ. Complete seizure memo to admit.'))}</div>
            <div class="meter" style="margin-top:12px">
              <div class="meter-l"><span>Evidentiary weight</span><span>${displayPts}/100</span></div>
              <div class="meter-b"><div class="meter-f" style="width:${Math.min(100, displayPts * 2)}%;background:${isTainted ? '#ef4444' : 'linear-gradient(90deg,var(--gold),var(--gold2))'}"></div></div>
            </div>
          </div>
          <div class="card"><div class="card-h"><h3>Scene notes</h3></div>
            <div style="font-size:13px;line-height:1.6;margin-bottom:8px">${esc(ex.described || '—')}</div>
            <div class="rule"></div>
            <div class="hd" style="font-size:11px;color:var(--gold)">Significance</div>
            <div style="font-size:13px;line-height:1.6">${esc(ex.significance || '—')}</div>
          </div>
          <div class="card"><div class="card-h"><h3>Chain of custody</h3>${cite('57', 'BSA')}</div>
            ${(ex.custody || []).length ? ex.custody.map(c => `<div class="kv"><span class="k">Day ${c.day}</span><span class="v">${esc(c.from)} &rarr; ${esc(c.to)} <span class="dim">(${esc(c.person)})</span><div class="dim" style="font-size:11.5px">${esc(c.note)}</div></span></div>`).join('') : '<div class="dim" style="font-size:12.5px">No hand-offs recorded.</div>'}
            ${ex.custodyIntact ? '' : '<div class="check no" style="margin-top:8px"><span class="ci">&#10007;</span><span class="cn">Continuity of possession is broken. The exhibit is contestable.</span></div>'}
          </div>
          ${(ex.taintReasons || []).length ? `<div class="card" style="border-color:var(--red)"><div class="card-h"><h3 style="color:#ff8b86">Handling defects</h3></div>${ex.taintReasons.map(t => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(t)}</span></div>`).join('')}<div class="dim" style="font-size:12px;margin-top:8px">Use the redo button below to clear this seizure memo and record fresh independent panch witnesses under BNSS s.103.</div></div>` : ''}
        </div>
      </div>`,
    footer: `
      <div class="modal-f-left">
        ${canRedo ? `<button class="btn gh" id="ex-redo-seizure" title="Redo seizure memo and re-examine" style="display:inline-flex;align-items:center;justify-content:center;padding:0 10px;height:32px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>` : ''}
        ${!ex.seized && ex.found ? `<button class="btn pri" id="ex-seize">Record seizure memo</button>` : ''}
        ${ex.isDigital ? `<button class="btn gh" id="ex-hash">Take forensic image &amp; hash</button><button class="btn gh" id="ex-s63">BSA s.63 certificate</button>` : ''}
      </div>
      <div class="modal-f-right">
        <button class="btn" data-close>Close</button>
      </div>`,
    after: (veil, close) => {
      const bRedo = veil.querySelector('#ex-redo-seizure')
      if (bRedo) bRedo.onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/exhibits/${ex.id}/reset`, { method: 'POST', body: '{}' })
        mergeBundle(r); close(); render()
        toast('Exhibit seizure reset', `Exhibit ${ex.exhibitNo || ex.name} unseized. You can now re-examine and record fresh independent panch witnesses.`, 'good')
        setTimeout(() => {
          const freshEx = (G.snapshot.exhibits || []).find(x => String(x.id) === String(ex.id)) || { ...ex, seized: false, manuallyReset: true }
          freshEx.seized = false
          freshEx.manuallyReset = true
          seizureModal(freshEx)
        }, 80)
      })
      const b1 = veil.querySelector('#ex-seize'); if (b1) b1.onclick = () => { close(); seizureModal(ex) }
      const b2 = veil.querySelector('#ex-hash'); if (b2) b2.onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/exhibits/${ex.id}/digital`, { method: 'POST', body: '{}' })
        mergeBundle(r); close(); render()
        toast('Forensic image taken', 'SHA-256 recorded. The electronic record now has an established integrity. A BSA s.63 certificate is still required before it is admissible.', 'good')
      })
      const b3 = veil.querySelector('#ex-s63'); if (b3) b3.onclick = () => { close(); s63Modal(ex) }
    }
  })
}

/* ---------- Seizure memo ---------- */

function seizureModal(ex) {
  const s = G.snapshot
  const exNow = (s.exhibits || []).find(e => String(e.id) === String(ex.id)) || ex
  if (exNow.seized && !exNow.manuallyReset) {
    modal({
      title: 'Seizure memo — ' + exNow.name,
      body: exNow.seizureValid
        ? `<div class="check ok"><span class="ci">&#10003;</span><span class="cn">Lawfully seized in the presence of <b>${esc(exNow.witnessA || exNow.witness1 || 'Independent Witness')}</b> and <b>${esc(exNow.witnessB || exNow.witness2 || 'Independent Witness')}</b>. BNSS s.103 satisfied.<div class="cd">The exhibit is admissible; its weight depends on forensic support and the custody record.</div></span></div>`
        : `<div class="card" style="border-color:var(--red)"><div class="card-h"><h3 style="color:#ff8b86">This seizure has procedural defects</h3></div>${(exNow.taintReasons || exNow.defects || ['Defective witness recording']).map(t => `<div class="check no"><span class="ci">&#10007;</span><span class="cn">${esc(t)}</span></div>`).join('')}<div class="dim" style="font-size:12.5px;margin-top:10px">Click the button below to clear the defective memo and record fresh independent panch witnesses under BNSS s.103.</div></div>`,
      footer: `<button class="btn left gh" id="se-redo" title="Redo seizure memo" style="display:inline-flex;align-items:center;justify-content:center;padding:0 10px;height:32px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button><button class="btn" data-close>Close</button>`,
      after: (veil, close) => {
        const rBtn = veil.querySelector('#se-redo')
        if (rBtn) rBtn.onclick = () => act(async () => {
          const r = await api(`/cases/${s.caseId}/exhibits/${exNow.id}/reset`, { method: 'POST', body: '{}' })
          mergeBundle(r); close(); render()
          toast('Exhibit seizure reset', `Exhibit ${exNow.exhibitNo || exNow.name} unseized. Ready for fresh seizure memo.`, 'good')
          setTimeout(() => {
            const freshEx = (G.snapshot.exhibits || []).find(x => String(x.id) === String(exNow.id)) || { ...exNow, seized: false, manuallyReset: true }
            freshEx.seized = false
            freshEx.manuallyReset = true
            seizureModal(freshEx)
          }, 80)
        })
      }
    })
    return
  }

  // Only pre-fill if witnesses have actually disclosed/corroborated knowledge during examination
  const isSuspect = (name) => {
    if (!name) return false
    const lower = name.toLowerCase().trim()
    return (s.persons || []).some(p => (p.role === 'suspect' || p.role === 'accused' || p.is_culprit) && (p.name || '').toLowerCase().trim().includes(lower))
  }
  const isVictim = (name) => {
    if (!name) return false
    const lower = name.toLowerCase().trim()
    return (s.persons || []).some(p => (p.role === 'victim' || p.role === 'complainant') && (p.name || '').toLowerCase().trim().includes(lower))
  }

  // Independent witnesses must come from canvassing outcome as per BNSS s.103
  const consentedWitnesses = (s.persons || []).filter(p =>
    ((p.canvassed && p.consented) || (s.consentedWitnesses && s.consentedWitnesses.includes(p.name)) || (ex.confirmedWitnesses || []).includes(p.name)) &&
    !isSuspect(p.name) && !isVictim(p.name)
  )
  const suspects = (s.persons || []).filter(p => isSuspect(p.name))
  const victims = (s.persons || []).filter(p => isVictim(p.name))

  const confirmed = (ex.confirmedWitnesses || []).filter(w => !isSuspect(w))
  const w1Val = (ex.witnessA && !isSuspect(ex.witnessA)) ? ex.witnessA : (confirmed[0] || (consentedWitnesses[0] ? consentedWitnesses[0].name : ''))
  const w2Val = (ex.witnessB && !isSuspect(ex.witnessB) && ex.witnessB !== w1Val) ? ex.witnessB : (confirmed[1] || (consentedWitnesses[1] ? consentedWitnesses[1].name : ''))

  const renderSelectOpts = (curVal) => {
    let html = `<option value="">-- [Leave Blank: Proceed without Witness (Major Procedural Defect)] --</option>`
    
    html += `<optgroup label="✅ Consented Independent Panch Inhabitants (BNSS s.103)">`
    if (consentedWitnesses.length) {
      consentedWitnesses.forEach(p => {
        html += `<option value="${esc(p.name)}" ${curVal === p.name ? 'selected' : ''}>✓ ${esc(p.name)} (${esc(p.occupation || 'Local Resident')}) — Consented Panch</option>`
      })
    } else {
      html += `<option value="" disabled>⚠️ No local inhabitants canvassed yet (Visit Crime Scene &gt; Canvassing)</option>`
    }
    html += `</optgroup>`

    html += `<optgroup label="⚠️ Accused / Suspects (BSA s.23 Disclosure only — Tainted if used as Panch)">`
    suspects.forEach(p => {
      html += `<option value="${esc(p.name)}" ${curVal === p.name ? 'selected' : ''}>⚠ ${esc(p.name)} (${esc(p.role || 'Accused')}) [Accused: Will Taint Seizure]</option>`
    })
    html += `</optgroup>`

    html += `<optgroup label="ℹ️ Victims &amp; Complainants">`
    victims.forEach(p => {
      html += `<option value="${esc(p.name)}" ${curVal === p.name ? 'selected' : ''}>ℹ ${esc(p.name)} (${esc(p.role)})</option>`
    })
    html += `</optgroup>`

    return html
  }

  modal({
    cls: 'wide',
    title: 'Seizure / Recovery Memo — BNSS s.103',
    body: `
      ${legalBox('BNSS s.103 — search and seizure', 'Every search or seizure shall be made in the presence of two or more independent and respectable inhabitants of the locality, and a list of things seized shall be prepared and signed by the witnesses. Two DIFFERENT, independent persons. An accused or police officer cannot act as an independent panch witness.', '103', 'BNSS')}
      <div class="grid g2">
        <div class="paper" style="padding:20px 22px">
          <div class="paper-head"><h2>SEIZURE MEMO</h2><p>Metro Crime Branch &middot; Case №${esc(s.caseNo)} &middot; Day ${s.day}</p></div>
          <div class="paper-row"><span class="k">Item</span><span class="v">${esc(ex.name)}</span></div>
          <div class="paper-row"><span class="k">Grid reference</span><span class="v">${esc(ex.gridRef || 'not recorded')}</span></div>
          <div class="paper-row"><span class="k">Description</span><span class="v" style="font-size:12.5px">${esc(ex.described || ex.name)}</span></div>
          <div class="paper-sig"><div>Witness 1</div><div>Witness 2</div><div>Investigating Officer</div></div>
        </div>
        <div>
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Independent Panch Witness 1 <span class="dim">(BNSS s.103)</span></label>
            <select id="w1" class="doc-input" style="width:100%;padding:8px 10px;background:#0d141f;border:1px solid #23344a;border-radius:4px;color:#e6edf3;font-size:13px">
              ${renderSelectOpts(w1Val)}
            </select>
          </div>
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Independent Panch Witness 2 <span class="dim">(BNSS s.103)</span></label>
            <select id="w2" class="doc-input" style="width:100%;padding:8px 10px;background:#0d141f;border:1px solid #23344a;border-radius:4px;color:#e6edf3;font-size:13px">
              ${renderSelectOpts(w2Val)}
            </select>
          </div>

          <div id="se-validation-banner" style="margin-top:10px"></div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px">
            <button type="button" class="btn sm gh" id="se-go-canvass" style="font-size:11.5px">🏘️ Canvass Crime Scene for Panchas</button>
            <span class="dim mono" style="font-size:11px">${consentedWitnesses.length} consented panch(es) available</span>
          </div>
        </div>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="se-do">Record seizure</button>`,
    after: (veil, close) => {
      const w1El = veil.querySelector('#w1')
      const w2El = veil.querySelector('#w2')
      const bannerEl = veil.querySelector('#se-validation-banner')

      const updateValidation = () => {
        const val1 = (w1El.value || '').trim()
        const val2 = (w2El.value || '').trim()

        const hasBlank = !val1 || !val2
        const isSame = val1 && val2 && val1.toLowerCase() === val2.toLowerCase()
        const hasAccused = isSuspect(val1) || isSuspect(val2)

        if (hasBlank) {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#e0be6c;background:rgba(224,190,108,0.08)"><div class="hb-h" style="color:#e0be6c">&#9888; Major Procedural Defect: Missing Panch Witness</div>BNSS s.103 mandates two independent respectable inhabitants of the locality. Proceeding with an empty witness field will flag a <b>Major Procedural Defect</b> and TAINT the exhibit (0 PTS). You can proceed now and redo it later after canvassing.</div>`
        } else if (hasAccused) {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#ff8b86;background:rgba(255,139,134,0.08)"><div class="hb-h" style="color:#ff8b86">&#9888; Major Procedural Defect: Accused cannot act as Panch</div>Under BNSS s.103, an accused person cannot be an independent panch witness. Under BSA s.23, an accused only gives a disclosure statement; the physical search/recovery must be attested by independent respectable inhabitants. Proceeding will TAINT the exhibit (0 PTS).</div>`
        } else if (isSame) {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#ff8b86;background:rgba(255,139,134,0.08)"><div class="hb-h" style="color:#ff8b86">&#9888; Procedural Defect: Identical Witness</div>BNSS s.103 mandates two DIFFERENT independent persons. The same person cannot sign as both witnesses.</div>`
        } else {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#3f9d6a;background:rgba(63,157,106,0.08)"><div class="hb-h" style="color:#6fd39b">&#10003; Lawful Statutory Seizure (BNSS s.103)</div>Two distinct independent respectable local inhabitants selected. The seizure memo will be legally sound and exhibit will be fully admissible.</div>`
        }
      }

      w1El.onchange = updateValidation
      w2El.onchange = updateValidation
      updateValidation()

      const canvassBtn = veil.querySelector('#se-go-canvass')
      if (canvassBtn) {
        canvassBtn.onclick = () => {
          close()
          G.sceneMode = 'canvass'
          G.tab = 'scene'
          render()
        }
      }

      veil.querySelector('#se-do').onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/seizure`, { method: 'POST', body: JSON.stringify({
          exhibitId: ex.id,
          witnessA: w1El.value,
          witnessB: w2El.value
        }) })
        mergeBundle(r); close(); render()
        if (r.valid || r.ok) toast('Seized lawfully', 'Recorded before two independent witnesses under BNSS s.103. Chain of custody opened. The exhibit is admissible.', 'good')
        else toast('Seizure Recorded with Major Procedural Defect', ((r.problems || []).join(' ') || 'Procedural defect under BNSS s.103. Exhibit tainted (0 PTS).') + ' You can use Redo to update once independent panchas are canvassed.', 'crit')
      })
    }
  })
}

/* ---------- s.63 certificate ---------- */

function s63Modal(ex) {
  const s = G.snapshot
  const exNow = s.exhibits.find(e => e.id === ex.id) || ex
  const certifySigners = (G.team || []).filter(m => ['cyber', 'forensic', 'expert'].includes(m.role)).map(m => m.name)
  const defaultExpert = certifySigners[0] || 'Preeti Nair, Cyber Forensic Specialist (Cyber Cell)'

  modal({
    cls: 'wide',
    title: 'Certificate for Electronic Records — BSA s.63',
    body: `
      ${legalBox('BSA s.63 — admissibility of electronic records', 'An electronic record is admissible only if accompanied by a certificate identifying the record, describing how it was produced, giving particulars of the device, and dealing with the conditions ensuring accuracy and integrity — signed by the person in charge AND an expert. BOTH signatures are required.', '63', 'BSA')}
      <div class="grid g2">
        <div class="paper" style="padding:20px 22px">
          <div class="paper-head"><h2>CERTIFICATE UNDER SECTION 63</h2><p>Bharatiya Sakshya Adhiniyam, 2023</p></div>
          <div class="paper-row"><span class="k">Record</span><span class="v">${esc(exNow.name)}</span></div>
          <div class="paper-row"><span class="k">Hash</span><span class="v" style="font-size:11px;word-break:break-all">${esc(exNow.hash || '— NOT TAKEN —')}</span></div>
          <div class="paper-row"><span class="k">Produced by</span><span class="v">Forensic imaging, Metro Crime Branch</span></div>
          <div class="paper-row"><span class="k">Condition</span><span class="v">Record produced in the ordinary course; device operating properly; no tampering.</span></div>
          <div class="paper-sig"><div>Person in charge</div><div>Expert</div></div>
        </div>
        <div>
          ${!exNow.hash ? `<div class="card" style="border-color:var(--red)"><div class="card-h"><h3 style="color:#ff8b86">Hash not taken</h3></div><div style="font-size:13px;line-height:1.6">A certificate cannot be issued for a record whose integrity has not been established. Take a forensic image and hash the record first.</div></div>` : ''}
          ${form([
            { id: 's1', label: 'Signature of the person in charge', req: 1, val: 'Nitin Bhosale, Accounts Cashier (Sunrise Logistics)', ph: 'e.g. Proprietor of the premises holding the DVR', hint: 'The person occupying a responsible position in relation to the device or the record.' },
            { id: 's2', label: 'Signature of the expert', req: 1, val: defaultExpert, ph: certifySigners[0] || 'e.g. Preeti Nair, Cyber Cell', hint: 'Must be a DIFFERENT person from the signatory above. One signature is defective.' }
          ])}
          ${certifySigners.length ? `<div class="helpbox"><div class="hb-h">&#128101; Your team</div>Available experts: ${certifySigners.map(esc).join(', ')}</div>` : ''}
        </div>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="s63-do" ${!exNow.hash ? 'disabled' : ''}>Sign &amp; certify</button>`,
    after: (veil, close) => {
      const b = veil.querySelector('#s63-do')
      if (!b) return
      b.onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/exhibits/${ex.id}/s63`, { method: 'POST', body: JSON.stringify({
          signerA: veil.querySelector('#s1').value, signerB: veil.querySelector('#s2').value
        }) })
        mergeBundle(r); close(); render()
        if (r.ok || r.valid) toast('s.63 certificate completed', 'Dual-signed. The electronic record is now admissible.', 'good')
        else toast('Certificate defective', (r.problems || []).join(' ') || 'Dual signatures missing.', 'crit')
      })
    }
  })
}

/* ---------- Daily Briefing: Situation & Case Objectives ---------- */

function dailyBriefingModal(force = false) {
  if (!force && localStorage.getItem('cfz_show_briefing') === 'false') return
  const s = G.snapshot
  if (!s) return
  const p = G.player || {}
  const sc = s.scene || {}

  // Outstanding strategic objectives
  const objectives = []
  if (!s.fir) {
    objectives.push({
      icon: '&#128220;',
      title: 'Register the First Information Report (FIR)',
      law: 'BNSS s.173',
      desc: 'Mandatory statutory commencement. Enter occurrence time, place, and attracted BNS sections in the Duty Room.',
      view: 'desk'
    })
  } else if (!sc.sealed) {
    const nextStep = !sc.cordoned ? 'Cordon the crime scene & log IO arrival'
      : !sc.walkthrough ? 'Perform initial walkthrough before disturbing evidence'
      : !sc.photographed ? 'Photograph scene wide, mid, and close-up with metric scale'
      : !sc.diagrammed ? 'Draft rough scene diagram and establish search grid'
      : !sc.canvassed ? 'Canvass locality and question initial eyewitnesses'
      : 'Seal the scene under BNSS s.176'
    objectives.push({
      icon: '&#128300;',
      title: 'Crime Scene Protocol: ' + nextStep,
      law: 'BNSS s.176',
      desc: 'Systematically process the scene to prevent contamination or spoliation of physical traces.',
      view: 'scene'
    })
  }

  const unpursuedRecoveries = (s.leads || []).filter(l => l && l.locatable && !l.followed)
  if (unpursuedRecoveries.length) {
    objectives.push({
      icon: '&#9878;',
      title: `Execute Physical Recovery (${unpursuedRecoveries.length} available)`,
      law: 'BSA s.23',
      desc: `Disclosed in interrogation: "${unpursuedRecoveries[0]?.title || 'Disclosed item'}". Must be recovered before two independent respectable panch witnesses.`,
      view: 'board'
    })
  }

  const pendingLabs = (s.labRequests || []).filter(l => l && l.status !== 'collected')
  if (pendingLabs.length) {
    objectives.push({
      icon: '&#129514;',
      title: `Collect Forensic Science Laboratory Results (${pendingLabs.length} in lab)`,
      law: 'BSA s.39 / s.45',
      desc: `Awaiting analytical report for: ${pendingLabs[0]?.test_name || 'Specimen'} (turnaround: ${pendingLabs[0]?.turnaround_days || 1}d).`,
      view: 'labs'
    })
  }

  const unexaminedPois = (s.persons || []).filter(x => x && !x.statement && !x.arrested)
  if (unexaminedPois.length) {
    objectives.push({
      icon: '&#128101;',
      title: `Examine Persons of Interest & Verify Alibis (${unexaminedPois.length} pending)`,
      law: 'BNSS s.180',
      desc: `Key suspect/witness ${unexaminedPois[0]?.name || 'Subject'} requires formal examination or alibi verification.`,
      view: 'pois'
    })
  }

  if (s.fir && !s.readiness?.chargeSheetReady) {
    objectives.push({
      icon: '&#9878;',
      title: 'Assemble Admissible Evidence for Police Report',
      law: 'BNSS s.193',
      desc: `Current aggregate admissible weight: ${s.readiness?.admissibleWeight || 0}. Resolve outstanding procedural defects before filing.`,
      view: 'charge'
    })
  }

  // Alerts & Critical Defects
  const alerts = []
  if (s.daysLeft <= 10) {
    alerts.push({
      crit: true,
      title: `Statutory Clock Expiry Imminent (${s.daysLeft} days remaining)`,
      desc: `Default bail under BNSS s.187 applies if charge sheet is not filed before Day ${s.dayLimit}.`
    })
  }
  (s.blockers || []).forEach(b => {
    alerts.push({
      crit: b.severity === 'critical',
      title: b.title,
      desc: b.fix
    })
  })

  const exhibitsCount = (s.exhibits || []).filter(e => e && e.found).length
  const admissibleCount = (s.exhibits || []).filter(e => e && e.admissibility === 'admissible').length
  const labReportsCount = (s.labRequests || []).filter(l => l && l.status === 'collected').length

  modal({
    cls: 'wide briefing-modal',
    title: 'METRO CRIME BRANCH // DAILY SITUATION BRIEFING',
    body: `
      <div class="briefing-header" style="background:#131822;border:1px solid #283344;padding:16px 20px;border-radius:4px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #202b3c;padding-bottom:12px;margin-bottom:12px;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:2px;color:#c8a24a;text-transform:uppercase">Classified Incident Dossier &middot; ${esc(s.offenceClass || 'COGNIZABLE')}</div>
            <div style="font-family:'Oswald',sans-serif;font-size:20px;letter-spacing:0.5px;color:#e6edf3;margin-top:2px">CASE №${esc(s.caseNo)}: ${esc(s.title)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8b949e">STATUTORY CLOCK (BNSS s.187)</div>
            <div style="font-family:'Oswald',sans-serif;font-size:22px;color:${s.daysLeft <= 10 ? '#ff8b86' : '#c8a24a'}">DAY ${s.day} <span style="font-size:14px;color:#8b949e">/ ${s.dayLimit}</span></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px">
          <div style="background:#0d1117;border:1px solid #232d3d;padding:10px 12px;border-radius:3px">
            <div style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:#8b949e">FIR REGISTRATION</div>
            <div style="font-size:14px;font-weight:600;color:${s.fir ? '#6fd39b' : '#f0b45f'};margin-top:4px">${s.fir ? 'Filed (Day ' + s.fir.filed_day + ')' : 'Pending'}</div>
          </div>
          <div style="background:#0d1117;border:1px solid #232d3d;padding:10px 12px;border-radius:3px">
            <div style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:#8b949e">CRIME SCENE</div>
            <div style="font-size:14px;font-weight:600;color:${sc.sealed ? '#6fd39b' : '#e6edf3'};margin-top:4px">${sc.sealed ? 'Sealed &amp; Secured' : sc.cordoned ? 'Under Processing' : 'Not Cordoned'}</div>
          </div>
          <div style="background:#0d1117;border:1px solid #232d3d;padding:10px 12px;border-radius:3px">
            <div style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:#8b949e">EVIDENCE ARTIFACTS</div>
            <div style="font-size:14px;font-weight:600;color:#e6edf3;margin-top:4px">${exhibitsCount} Seized <span style="font-size:11px;color:#6fd39b">(${admissibleCount} Admissible)</span></div>
          </div>
          <div style="background:#0d1117;border:1px solid #232d3d;padding:10px 12px;border-radius:3px">
            <div style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:#8b949e">FSL FORENSICS</div>
            <div style="font-size:14px;font-weight:600;color:#e6edf3;margin-top:4px">${labReportsCount} Completed <span style="font-size:11px;color:#8b949e">(${pendingLabs.length} in lab)</span></div>
          </div>
          <div style="background:#0d1117;border:1px solid #232d3d;padding:10px 12px;border-radius:3px">
            <div style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:#8b949e">COURT READINESS</div>
            <div style="font-size:14px;font-weight:600;color:${s.readiness?.chargeSheetReady ? '#6fd39b' : '#ff8b86'};margin-top:4px">${s.readiness?.admissibleWeight || 0} pts &middot; ${s.readiness?.chargeSheetReady ? 'Ready' : 'Defective'}</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px">
        <div>
          <div style="font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:1px;color:#c8a24a;margin-bottom:8px">&#9670; OUTSTANDING STRATEGIC OBJECTIVES</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${objectives.map(obj => `
              <div style="background:#161c27;border:1px solid #283344;padding:10px 14px;border-radius:3px">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <div style="font-weight:600;font-size:13.5px;color:#e6edf3"><span style="margin-right:6px">${obj.icon}</span>${esc(obj.title)}</div>
                  <span class="tag cyan" style="font-size:10px">${esc(obj.law)}</span>
                </div>
                <div style="font-size:12px;color:#8b949e;line-height:1.5;margin-top:4px">${esc(obj.desc)}</div>
                <div style="margin-top:8px">
                  <button class="btn sm gh" data-jump="${obj.view}">Open ${obj.view.toUpperCase()}</button>
                </div>
              </div>`).join('')}
            ${!objectives.length ? '<div class="dim" style="font-size:12.5px;padding:12px;background:#161c27;border:1px dashed #283344">All standard investigation phases completed. Review Evidence Board and proceed to Court Filing.</div>' : ''}
          </div>
        </div>

        <div>
          <div style="font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:1px;color:${alerts.some(a => a.crit) ? '#ff8b86' : '#c8a24a'};margin-bottom:8px">&#9888; PENDING ALERTS &amp; PROCEDURAL WARNINGS (${alerts.length})</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${alerts.map(a => `
              <div style="background:${a.crit ? 'rgba(201,64,58,0.12)' : '#161c27'};border:1px solid ${a.crit ? '#8b2723' : '#303947'};padding:10px 14px;border-radius:3px">
                <div style="font-weight:600;font-size:13px;color:${a.crit ? '#ff8b86' : '#f0b45f'}">${a.crit ? '&#9888; CRITICAL: ' : '&#8505; '}${esc(a.title)}</div>
                <div style="font-size:12px;color:#c9d1d9;line-height:1.5;margin-top:4px">${esc(a.desc)}</div>
              </div>`).join('')}
            ${!alerts.length ? '<div class="dim" style="font-size:12.5px;padding:12px;background:#161c27;border:1px dashed #283344;color:#6fd39b">&#10003; No procedural defects or critical alerts logged. Procedure is pristine.</div>' : ''}
          </div>
        </div>
      </div>
    `,
    footer: `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;flex-wrap:wrap;gap:10px">
        <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:#8b949e;cursor:pointer">
          <input type="checkbox" id="chk-briefing-auto" ${localStorage.getItem('cfz_show_briefing') !== 'false' ? 'checked' : ''} />
          <span>Show Daily Briefing on console startup</span>
        </label>
        <button class="btn pri" data-close>Acknowledge &amp; Proceed to Console &rarr;</button>
      </div>`,
    after: (veil, close) => {
      const chk = veil.querySelector('#chk-briefing-auto')
      if (chk) {
        chk.onchange = () => {
          localStorage.setItem('cfz_show_briefing', chk.checked ? 'true' : 'false')
        }
      }
      veil.querySelectorAll('[data-jump]').forEach(btn => {
        btn.onclick = () => {
          const targetView = btn.dataset.jump
          if (targetView && VIEWS[targetView]) {
            G.view = targetView
            close()
            render()
          }
        }
      })
    }
  })
}

