/* CASE FILE ZERO — views part 4: chat, team, settings, legal, guide, career, ACT 0 */

var VIEWS = window.VIEWS = window.VIEWS || {}

function renderThreadMessagesHTML(messages) {
  if (!messages || !messages.length) {
    return '<div class="center dim" style="padding:22px">No messages in this channel yet. Start the conversation.</div>'
  }
  return messages.map(m => {
    let dAttr = ''
    let rawDir = m.directive_json || null
    if (!rawDir && m.effect_json) {
      try {
        const parsed = typeof m.effect_json === 'string' ? JSON.parse(m.effect_json) : m.effect_json
        if (parsed && parsed.directive) rawDir = JSON.stringify(parsed.directive)
      } catch(e){}
    }
    if (rawDir && typeof isDirectiveActive === 'function' && isDirectiveActive(rawDir)) {
      dAttr = `data-directive="${esc(typeof rawDir === 'string' ? rawDir : JSON.stringify(rawDir))}"`
    }
    let intentBadge = ''
    let intentCode = m.intent || ''
    if (!intentCode && m.effect_json) {
      try {
        const parsed = typeof m.effect_json === 'string' ? JSON.parse(m.effect_json) : m.effect_json
        if (parsed && parsed.intent) intentCode = parsed.intent
      } catch(e){}
    }
    if (intentCode) {
      if (intentCode.startsWith('ORDER_')) {
        intentBadge = `<span class="tag gold" style="font-size:9.5px;padding:1px 6px;letter-spacing:0.04em">FIELD DIRECTIVE</span>`
      } else if (intentCode.startsWith('QUERY_')) {
        intentBadge = `<span class="tag blue" style="font-size:9.5px;padding:1px 6px;letter-spacing:0.04em">INQUIRY</span>`
      } else if (intentCode.startsWith('CLARIFICATION_')) {
        intentBadge = `<span class="tag amber" style="font-size:9.5px;padding:1px 6px;letter-spacing:0.04em">DISCUSS</span>`
      }
    }

    const isOfficialDebrief = m.role === 'npc' && m.body && (
      m.body.startsWith('Sir! Interrogation and witness examination completed:') ||
      m.body.startsWith('Sir! Assignment completed:') || 
      m.body.startsWith('Sir! Digital evidence assignment completed:') || 
      m.body.startsWith('Sir! Laboratory follow-up completed:') || 
      m.body.startsWith('Sir! Crime scene assignment completed:') || 
      m.body.startsWith('Sir! Evidence seizure completed:') || 
      m.body.startsWith('Sir! I have completed the assignment:') ||
      m.body.includes('Assignment completed:') ||
      m.body.includes('examination completed:')
    )

    return `
    <div class="msg ${m.role === 'player' ? 'me' : m.role === 'system' ? 'sys' : 'them'} ${isOfficialDebrief ? 'debrief-highlight' : ''}" ${dAttr} ${isOfficialDebrief ? 'style="border:1px solid rgba(212,175,55,0.45);background:rgba(212,175,55,0.08);border-radius:6px;padding:12px 14px;margin:8px 0;box-shadow:0 2px 10px rgba(0,0,0,0.35);"' : ''}>
      ${m.role !== 'system' ? `<div class="mh" style="display:flex;align-items:center;gap:6px"><span>${esc(m.sender)}</span>${isOfficialDebrief ? '<span class="tag gold" style="font-size:9.5px;padding:1px 6px;letter-spacing:0.04em">OFFICIAL DEBRIEF</span>' : ''}${intentBadge}</div>` : ''}
      <div>${renderChatMsg(m.body)}</div>
    </div>`
  }).join('')
}
window.renderThreadMessagesHTML = renderThreadMessagesHTML

function findThreadForMember(m, threads) {
  if (!m || !threads) return null
  let th = threads.find(x => x.member_id && (Number(x.member_id) === Number(m.candidate_id) || Number(x.member_id) === Number(m.id)))
  if (th) return th
  th = threads.find(x => x.title === m.name)
  if (th) return th
  if (m.is_assistant || (m.name && (m.name.includes('Ravi') || m.name.includes('Deshmukh')))) {
    th = threads.find(x => x.kind === 'assistant' || (x.title && (x.title.includes('Ravi') || x.title.includes('Deshmukh'))))
    if (th) return th
  }
  const mClean = (m.name || '').replace(/junior constable|constable|inspector|acp|psi|jc/gi, '').trim().toLowerCase()
  th = threads.find(x => {
    if (!x.title) return false
    const tClean = x.title.replace(/junior constable|constable|inspector|acp|psi|jc/gi, '').trim().toLowerCase()
    return mClean && tClean && (mClean.includes(tClean) || tClean.includes(mClean))
  })
  if (th) return th
  return null
}

function getOrCreateThreadForMember(m, threads) {
  let th = findThreadForMember(m, threads)
  if (th) return th
  const newId = 1000 + Number(m.candidate_id || m.id || Math.floor(Math.random() * 800))
  th = {
    id: newId,
    player_id: m.player_id || 1,
    kind: m.is_assistant ? 'assistant' : 'member',
    case_id: null,
    member_id: m.candidate_id || m.id,
    title: m.name,
    subtitle: m.speciality || m.role || 'Field Operative',
    scope: 'career',
    unread: 0,
    last_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  }
  threads.push(th)
  return th
}

/* ---------------------------- CHAT ---------------------------- */

VIEWS.chat = function () {
  const threads = G.threads || []
  const msgDeskIconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>`
  if (!threads.length) return `<div class="vacant"><i>${msgDeskIconSvg}</i><h3>No threads yet</h3><p>The messaging desk is opened at induction, when your assistant, your senior, the Head of Branch and the case squad threads become available.</p><button class="btn pri" data-nav="wall" style="margin-top:12px">Case Wall</button></div>`
  const active = Number(G.activeThread) || (threads[0] ? Number(threads[0].id) : 1)
  const t = threads.find(x => Number(x.id) === Number(active)) || threads[0]
  if (t && (t.unread || 0) > 0) {
    t.unread = 0
    api(`/chat/${active}/read`, { method: 'POST' }).catch(() => {})
  }
  const teamMembers = G.team || []
  const teamThreadIds = new Set(
    teamMembers.map(m => {
      const th = findThreadForMember(m, threads)
      return th ? Number(th.id) : null
    }).filter(Boolean)
  )
  const career = threads.filter(x => x.scope === 'career' && !teamThreadIds.has(Number(x.id)))
  const perCase = {}
  threads.filter(x => x.scope === 'case').forEach(x => { (perCase[x.case_id] = perCase[x.case_id] || []).push(x) })
  const caseThreads = Object.values(perCase).flat()
  const kindIcon = { assistant: '&#128100;', senior: '&#127894;', head: '&#11088;', fsl: '&#129514;', court: '&#9878;', member: '&#128101;', case: '&#128194;' }
  const mobileTab = G.mobileChatTab || 'list'

  // Determine active category (default based on current active thread or fallback to career)
  let activeCat = G.chatCategory
  if (!activeCat || activeCat === 'all') {
    if (t && t.scope === 'case') {
      activeCat = 'case'
    } else if (t && teamMembers.some(m => { const th = findThreadForMember(m, threads); return th && Number(th.id) === Number(t.id) })) {
      activeCat = 'team'
    } else {
      activeCat = 'career'
    }
    G.chatCategory = activeCat
  }

  const careerUnread = career.reduce((n, x) => n + (x.unread || 0), 0)
  const caseUnread = caseThreads.reduce((n, x) => n + (x.unread || 0), 0)
  const teamUnread = teamMembers.reduce((n, m) => {
    const th = findThreadForMember(m, threads)
    return n + ((th && th.unread) || 0)
  }, 0)

  const cachedMsgs = (G.__threadMessages && G.__threadMessages[active]) || null
  const msgsHtml = cachedMsgs ? renderThreadMessagesHTML(cachedMsgs) : '<div class="center" style="padding:22px"><span class="spin"></span></div>'

  let listItemsHtml = ''
  if (activeCat === 'case') {
    if (!caseThreads.length) {
      listItemsHtml = '<div class="chat-empty-cat"><span class="cec-icon">&#128194;</span><h4>No Case Squads</h4><p>Case squad communication threads for active cases will appear here.</p></div>'
    } else {
      listItemsHtml = caseThreads.map(x => chatItem(x, active, kindIcon)).join('')
    }
  } else if (activeCat === 'team') {
    if (!teamMembers.length) {
      listItemsHtml = '<div class="chat-empty-cat"><span class="cec-icon">&#128101;</span><h4>No Assigned Team</h4><p>Inducted officers and operatives in your squad will appear here.</p></div>'
    } else {
      listItemsHtml = teamMembers.map(m => {
        const th = getOrCreateThreadForMember(m, threads)
        return chatItem(th, active, kindIcon)
      }).join('')
    }
  } else {
    // Default: 'career'
    if (!career.length) {
      listItemsHtml = '<div class="chat-empty-cat"><span class="cec-icon">&#127970;</span><h4>No Career Personnel</h4><p>Headquarters and career contacts will appear here.</p></div>'
    } else {
      listItemsHtml = career.map(x => chatItem(x, active, kindIcon)).join('')
    }
  }

  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 820 : true
  const headerHtml = (mobileTab === 'chat' && isMobile) ? '' : head(msgDeskIconSvg, 'Messaging Desk', 'Task your people, request branch resources, and coordinate with active case squads', '')

  return headerHtml
  + `<div class="chat-wrap ${mobileTab === 'chat' ? 'show-pane mobile-chat-fullbleed' : 'show-list'}">
    <div class="chat-list">
      <div class="chat-category-bar">
        <div class="chat-pill-bubble" role="tablist" aria-label="Messaging Categories">
          <button type="button" class="chat-pill-btn ${activeCat === 'career' ? 'on' : ''}" data-chat-cat="career" title="Career-Wide Personnel">
            <span class="cpb-ico">&#127970;</span>
            <span class="cpb-text">Career Personnel</span>
            <span class="cpb-badge">${career.length}${careerUnread ? `<span class="cpb-dot"></span>` : ''}</span>
          </button>
          <div class="chat-pill-sep" aria-hidden="true"></div>
          <button type="button" class="chat-pill-btn ${activeCat === 'case' ? 'on' : ''}" data-chat-cat="case" title="Case Squad Threads">
            <span class="cpb-ico">&#128194;</span>
            <span class="cpb-text">Case Squad</span>
            <span class="cpb-badge">${caseThreads.length}${caseUnread ? `<span class="cpb-dot"></span>` : ''}</span>
          </button>
          <div class="chat-pill-sep" aria-hidden="true"></div>
          <button type="button" class="chat-pill-btn ${activeCat === 'team' ? 'on' : ''}" data-chat-cat="team" title="Your Assigned Team">
            <span class="cpb-ico">&#128101;</span>
            <span class="cpb-text">Your Team</span>
            <span class="cpb-badge">${teamMembers.length}${teamUnread ? `<span class="cpb-dot"></span>` : ''}</span>
          </button>
        </div>
      </div>

      <div class="chat-items-scroll">
        ${listItemsHtml}
      </div>
    </div>

    <div class="chat-pane">
      <div class="chat-head">
        <button class="chat-mobile-back" id="btn-chat-back-threads" title="Back to All Threads" aria-label="Back to All Threads">&#8592;</button>
        <div class="chat-head-info">
          <div class="chat-head-title">
            <span class="chi-ico">${kindIcon[t.kind] || '&#128172;'}</span>
            <span class="chi-name">${esc(t.title)}</span>
          </div>
          <div class="chat-head-sub">${esc(t.subtitle || 'Active investigative channel')}</div>
        </div>
        <span class="chat-head-tag ${t.scope === 'case' ? 'cyan' : 'gold'}">${t.scope === 'case' ? 'Case Thread' : 'Career-Wide'}</span>
      </div>

      <div class="chat-msgs" id="chat-msgs">
        ${msgsHtml}
      </div>

      <div id="chat-context-bar" class="chat-context-bar" style="display:none;"></div>

      <div class="chat-in">
        <div class="chat-input-wrapper">
          <div class="chat-input-row">
            <textarea id="chat-in" class="chat-textarea" rows="1" placeholder="Write your message... (Enter to send, Shift+Enter for new line)"></textarea>
            <div class="chat-input-actions">
              <button type="button" id="chat-send" class="chat-send-btn" title="Send Message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

function chatItem(t, active, icons) {
  const isAct = Number(t.id) === Number(active)
  return `<div class="chat-item ${isAct ? 'on' : ''}" data-thread="${t.id}">
    <div class="chat-item-ico">${icons[t.kind] || '&#128172;'}</div>
    <div class="chat-item-body">
      <div class="ci-t">
        <span>${esc(t.title)}</span>
        ${(!isAct && t.unread) ? `<span class="nav-n warn">${t.unread}</span>` : ''}
      </div>
      <div class="ci-s">${esc(t.subtitle || 'Direct channel')}</div>
    </div>
  </div>`
}

VIEWS.chat.after = async function () {
  const threads = G.threads || []
  if (!threads.length) return
  const active = Number(G.activeThread) || (threads[0] ? Number(threads[0].id) : 1)
  const t = threads.find(x => Number(x.id) === Number(active)) || threads[0]

  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 820 : true
  const mobileTab = G.mobileChatTab || 'list'
  const workEl = $('#work')
  if (workEl) {
    if (mobileTab === 'chat' && isMobile) {
      workEl.classList.add('chat-fullscreen-active')
    } else {
      workEl.classList.remove('chat-fullscreen-active')
    }
  }

  // If the active thread has unread notifications, mark them as read immediately
  if (t) {
    t.unread = 0
    api(`/chat/${active}/read`, { method: 'POST' }).catch(() => {})
    if (typeof syncNotificationBadges === 'function') {
      syncNotificationBadges()
    }
  }

  // Category pill tab button listeners
  $$('[data-chat-cat]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      const cat = btn.dataset.chatCat
      G.chatCategory = cat
      render()
    }
  })

  // Restore thread list scroll position if returning from chat
  if (mobileTab === 'list' && G.__chatListScrollTop !== undefined) {
    const listScrollEl = $('.chat-items-scroll')
    if (listScrollEl) {
      listScrollEl.scrollTop = G.__chatListScrollTop
    }
  }

  // Handle device hardware back button / swipe back gesture
  if (!window.__cfzChatPopstateWired) {
    window.__cfzChatPopstateWired = true
    window.addEventListener('popstate', (e) => {
      if (G.view === 'chat' && G.mobileChatTab === 'chat') {
        G.mobileChatTab = 'list'
        const wEl = document.getElementById('work')
        if (wEl) wEl.classList.remove('chat-fullscreen-active')
        if (typeof render === 'function') {
          render()
          setTimeout(() => {
            const listEl = document.querySelector('.chat-items-scroll')
            if (listEl && G.__chatListScrollTop !== undefined) {
              listEl.scrollTop = G.__chatListScrollTop
            }
          }, 0)
        }
      }
    })
  }

  $$('[data-thread]').forEach(el => el.onclick = () => {
    // Preserve thread list scroll position before opening conversation
    const listScrollEl = $('.chat-items-scroll')
    if (listScrollEl) {
      G.__chatListScrollTop = listScrollEl.scrollTop
    }
    const threadId = Number(el.dataset.thread)
    G.activeThread = threadId
    G.mobileChatTab = 'chat'
    if (isMobile) {
      try {
        history.pushState({ cfzChat: true, threadId }, '')
      } catch (e) {}
    }
    const selThread = (G.threads || []).find(x => Number(x.id) === threadId)
    if (selThread) {
      selThread.unread = 0
      api(`/chat/${threadId}/read`, { method: 'POST' }).catch(() => {})
    }
    if (typeof syncNotificationBadges === 'function') {
      syncNotificationBadges()
    }
    render()
  })

  const backBtn = $('#btn-chat-back-threads')
  if (backBtn) {
    backBtn.onclick = () => {
      G.mobileChatTab = 'list'
      const wEl = $('#work')
      if (wEl) wEl.classList.remove('chat-fullscreen-active')
      render()
      setTimeout(() => {
        const listScrollEl = $('.chat-items-scroll')
        if (listScrollEl && G.__chatListScrollTop !== undefined) {
          listScrollEl.scrollTop = G.__chatListScrollTop
        }
      }, 0)
    }
  }

  G.__chatScrollTop = G.__chatScrollTop || {}
  G.__chatWasAtBottom = G.__chatWasAtBottom || {}

  const box = $('#chat-msgs')
  if (box) {
    box.onscroll = () => {
      G.__chatScrollTop[active] = box.scrollTop
      G.__chatWasAtBottom[active] = (box.scrollHeight - box.scrollTop - box.clientHeight < 35)
    }
  }

  const paint = (html) => {
    const b = $('#chat-msgs')
    if (!b || !b.isConnected) return false
    if (b.innerHTML !== html) {
      b.innerHTML = html
    }
    const wasAtBottom = G.__chatWasAtBottom[active] !== false
    if (wasAtBottom) {
      b.scrollTop = b.scrollHeight
    } else if (G.__chatScrollTop[active] !== undefined) {
      b.scrollTop = G.__chatScrollTop[active]
    }
    return true
  }

  const setupMessageClickListeners = () => {
    const curBox = $('#chat-msgs')
    if (!curBox) return
    $$('.msg.them', curBox).forEach(msgEl => {
      const dAttr = msgEl.getAttribute('data-directive')
      if (dAttr && typeof isDirectiveActive === 'function' && isDirectiveActive(dAttr)) {
        msgEl.style.cursor = 'pointer'
        msgEl.onclick = () => {
          openDirectiveTaskModal(dAttr)
        }
      } else {
        msgEl.removeAttribute('data-directive')
        msgEl.style.cursor = 'default'
        msgEl.onclick = null
      }
    })
  }

  window.refreshChatInPlace = async function () {
    const threads = G.threads || []
    if (!threads.length) return
    const curActive = Number(G.activeThread) || (threads[0] ? Number(threads[0].id) : 1)
    const curMsgsBox = $('#chat-msgs')
    if (!curMsgsBox || !curMsgsBox.isConnected) return

    try {
      const r = await api(`/chat/${curActive}`)
      const newMsgs = r.messages || []
      G.__threadMessages = G.__threadMessages || {}
      const newHtml = renderThreadMessagesHTML(newMsgs)
      if (curMsgsBox.innerHTML !== newHtml) {
        G.__threadMessages[curActive] = newMsgs
        const wasAtBottom = (G.__chatWasAtBottom && G.__chatWasAtBottom[curActive] !== false)
        curMsgsBox.innerHTML = newHtml
        setupMessageClickListeners()
        if (wasAtBottom) {
          curMsgsBox.scrollTop = curMsgsBox.scrollHeight
        } else if (G.__chatScrollTop && G.__chatScrollTop[curActive] !== undefined) {
          curMsgsBox.scrollTop = G.__chatScrollTop[curActive]
        }
      }
    } catch (e) {
      console.warn('refreshChatInPlace failed:', e)
    }
  }

  try {
    const r = await api(`/chat/${active}`)
    G.__threadMessages = G.__threadMessages || {}
    const newMsgs = r.messages || []
    const newHtml = renderThreadMessagesHTML(newMsgs)
    G.__threadMessages[active] = newMsgs
    paint(newHtml)
    setupMessageClickListeners()
  } catch (e) {
    if (!G.__threadMessages || !G.__threadMessages[active]) {
      paint('<div class="center dim">Could not load the thread.</div>')
    }
  }

  const send = $('#chat-send')
  const ta = $('#chat-in')
  const contextBar = $('#chat-context-bar')
  if (!send || !ta) return

  // Smart Context Badges & Topic Grounding Bar
  const updateContextBar = (text) => {
    if (!contextBar) return
    const curCase = G.activeCase || (G.snapshot ? G.snapshot : null)
    if (!curCase) {
      contextBar.style.display = 'none'
      return
    }

    const lower = (text || '').toLowerCase().trim()
    const badges = []

    // 1. Detect person mention or active chamber occupant
    const persons = curCase.persons || []
    let matchedPerson = null
    for (const p of persons) {
      const pName = (p.name || '').toLowerCase()
      const nameParts = pName.split(/\s+/).filter(part => part.length >= 3)
      if ((pName && lower.includes(pName)) || nameParts.some(part => new RegExp(`\\b${part}\\b`, 'i').test(lower))) {
        matchedPerson = p
        break
      }
    }
    if (!matchedPerson && /\b(him|her|he|she|suspect|accused|interrogat|chamber|statement|alibi)\b/i.test(lower)) {
      matchedPerson = persons.find(p => p.in_chamber) || persons.find(p => p.role === 'suspect' || p.isAccused)
    }

    if (matchedPerson) {
      const chamberTag = matchedPerson.in_chamber ? ' · In Chamber' : ''
      badges.push(`<span class="chat-context-badge badge-person" title="Suspect dossier auto-linked">&#9670; Suspect: ${esc(matchedPerson.name)}${chamberTag}</span>`)
    }

    // 2. Detect exhibit mention
    const exhibits = curCase.exhibits || []
    let matchedExhibit = null
    for (const ex of exhibits) {
      const exCode = (ex.code || '').toLowerCase()
      const exTitle = (ex.title || ex.name || '').toLowerCase()
      if ((exCode && lower.includes(exCode)) || (exTitle && lower.includes(exTitle))) {
        matchedExhibit = ex
        break
      }
    }
    if (!matchedExhibit && /\b(exhibit|evidence|weapon|bag|phone|recovery|malkhana|fsl)\b/i.test(lower)) {
      matchedExhibit = exhibits.find(e => e.seized) || exhibits[0]
    }

    if (matchedExhibit) {
      const statusTag = matchedExhibit.seized ? ' · Malkhana Seized' : ' · Crime Scene'
      badges.push(`<span class="chat-context-badge badge-exhibit" title="Exhibit evidence file auto-linked">&#9670; Evidence: ${esc(matchedExhibit.code || matchedExhibit.title)}${statusTag}</span>`)
    }

    // 3. Detect directive / order
    if (/\b(deploy|search|seize|panch|canvass|summon|examine|analyze|requisition)\b/i.test(lower)) {
      badges.push(`<span class="chat-context-badge badge-directive" title="Field operation directive detected">&#9670; Action Directive</span>`)
    }

    if (badges.length > 0) {
      contextBar.innerHTML = `<span style="opacity:0.8;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--dim)">Grounded Context:</span> ` + badges.join('')
      contextBar.style.display = 'flex'
    } else {
      contextBar.style.display = 'none'
      contextBar.innerHTML = ''
    }
  }

  // Dynamic typing status generator based on officer role and query topic
  const getDynamicTypingStatus = (senderName, kind, userText) => {
    const lower = (userText || '').toLowerCase()
    const curCase = G.activeCase || G.snapshot
    const persons = curCase?.persons || []
    let targetPersonName = ''
    for (const p of persons) {
      const pName = (p.name || '').toLowerCase()
      if (pName && lower.includes(pName)) {
        targetPersonName = p.name
        break
      }
    }
    if (!targetPersonName) {
      const chamberP = persons.find(p => p.in_chamber)
      if (chamberP && /\b(him|her|he|she|suspect|interview|statement|interrogat)\b/i.test(lower)) {
        targetPersonName = chamberP.name
      }
    }

    if (kind === 'head' || senderName.includes('Nadkarni')) {
      if (targetPersonName) return `ACP Nadkarni is analyzing ${targetPersonName}'s disclosures & strategy...`
      if (/\b(help|advice|opinion|what should|next|recommend|guid)\b/i.test(lower)) return `ACP Nadkarni is reviewing case priorities & statutory roadmap...`
      if (/\b(exhibit|evidence|malkhana|seiz)\b/i.test(lower)) return `ACP Nadkarni is evaluating evidence admissibility & Malkhana log...`
      return `ACP Nadkarni is reviewing case docket & formulating guidance...`
    }

    if (senderName.includes('Dhanraj')) {
      if (targetPersonName) return `Constable Dhanraj is checking summons records & field logs for ${targetPersonName}...`
      if (/\b(search|scene|exhibit|recovery|malkhana)\b/i.test(lower)) return `Constable Dhanraj is preparing field search & recovery memo...`
      return `Constable Dhanraj is coordinating field deployment...`
    }

    if (senderName.includes('Preeti')) {
      if (/\b(cctv|video|camera|footage)\b/i.test(lower)) return `Preeti Nair is reviewing CCTV timestamps & BSA s.63 digital hashes...`
      if (/\b(phone|cdr|tower|mobile|call)\b/i.test(lower)) return `Preeti Nair is triangulating cell tower pings & CDR logs...`
      return `Preeti Nair is analyzing electronic intelligence...`
    }

    if (senderName.includes('Ravi')) {
      if (/\b(diary|case file|panchanama|fir)\b/i.test(lower)) return `JC Ravi Deshmukh is cross-referencing Case Diary entries...`
      return `JC Ravi Deshmukh is updating case administrative files...`
    }

    if (kind === 'fsl' || senderName.includes('Rao')) {
      return `Dr. Rao is reviewing laboratory analysis dockets & ballistics data...`
    }

    if (kind === 'court' || senderName.includes('Magistrate')) {
      return `Court Magistrate Desk is scrutinizing BNSS procedural compliance...`
    }

    if (targetPersonName) return `${senderName} is reviewing notes on ${targetPersonName}...`
    return `${senderName} is formulating operational response...`
  }

  // Dynamic auto-expansion upward up to 3 visible lines (max 72px) with hidden scrollbars
  const fitTextarea = () => {
    ta.style.height = '26px'
    const newH = Math.min(Math.max(ta.scrollHeight, 26), 72)
    ta.style.height = newH + 'px'
    ta.style.overflowY = ta.scrollHeight > 72 ? 'auto' : 'hidden'
  }
  ta.addEventListener('input', () => {
    fitTextarea()
    updateContextBar(ta.value)
  })
  fitTextarea()

  // Mobile virtual keyboard responsiveness: scroll to latest messages on focus
  ta.addEventListener('focus', () => {
    setTimeout(() => {
      if (box) box.scrollTop = box.scrollHeight
    }, 180)
  })

  // Keep chat messages aligned when virtual keyboard opens/closes
  if (window.visualViewport && !window.__cfzChatViewportListenerWired) {
    window.__cfzChatViewportListenerWired = true
    window.visualViewport.addEventListener('resize', () => {
      if (G.view === 'chat' && G.mobileChatTab === 'chat') {
        const curBox = document.getElementById('chat-msgs')
        if (curBox) {
          curBox.scrollTop = curBox.scrollHeight
        }
      }
    })
  }

  send.onclick = () => {
    const text = ta.value.trim()
    if (text.length < 2) return
    act(async () => {
      ta.value = ''
      fitTextarea()
      updateContextBar('')
      box.innerHTML += `<div class="msg me"><div class="mh">You</div><div>${renderChatMsg(text)}</div></div>`
      box.scrollTop = box.scrollHeight
      const thinking = document.createElement('div')
      thinking.className = 'msg them msg-thinking'
      thinking.innerHTML = `<div class="chat-thinking-content"><span class="chat-typing-dots"><span></span><span></span><span></span></span><span class="chat-typing-status">${esc(t ? t.title : 'Officer')} is thinking...</span></div>`
      box.appendChild(thinking); box.scrollTop = box.scrollHeight
      try {
        const r = await api(`/chat/${active}`, { method: 'POST', body: JSON.stringify({ message: text }) })
        globalThis.__chatLast = r
        if (thinking && thinking.parentNode) thinking.remove()
        
        const msgs = r.messages || []
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1]
          const prevMsgs = msgs.slice(0, msgs.length - 1)
          
          box.innerHTML = prevMsgs.map(m => `
            <div class="msg ${m.role === 'player' ? 'me' : m.role === 'system' ? 'sys' : 'them'}">
              ${m.role !== 'system' ? `<div class="mh">${esc(m.sender)}</div>` : ''}
              <div>${renderChatMsg(m.body)}</div>
            </div>`).join('')
          
          if (lastMsg.role !== 'player') {
            const replyMsgEl = document.createElement('div')
            replyMsgEl.className = `msg ${lastMsg.role === 'system' ? 'sys' : 'them'}`
            
            let dData = lastMsg.directive_json || null
            if (!dData && lastMsg.effect_json) {
              try {
                const parsed = typeof lastMsg.effect_json === 'string' ? JSON.parse(lastMsg.effect_json) : lastMsg.effect_json
                if (parsed && parsed.directive) dData = JSON.stringify(parsed.directive)
              } catch(e){}
            }

            if (dData && typeof isDirectiveActive === 'function' && isDirectiveActive(dData)) {
              replyMsgEl.setAttribute('data-directive', dData)
              replyMsgEl.style.cursor = 'pointer'
              replyMsgEl.onclick = () => openDirectiveTaskModal(dData)
            }

            let replyIntentBadge = ''
            const repIntent = lastMsg.intent || (r.reply && r.reply.intent) || ''
            if (repIntent.startsWith('ORDER_')) {
              replyIntentBadge = `<span class="tag gold" style="font-size:9.5px;padding:1px 6px;letter-spacing:0.04em">FIELD DIRECTIVE</span>`
            } else if (repIntent.startsWith('QUERY_')) {
              replyIntentBadge = `<span class="tag blue" style="font-size:9.5px;padding:1px 6px;letter-spacing:0.04em">INQUIRY</span>`
            }

            replyMsgEl.innerHTML = `${lastMsg.role !== 'system' ? `<div class="mh" style="display:flex;align-items:center;gap:6px"><span>${esc(lastMsg.sender)}</span>${replyIntentBadge}</div>` : ''}<div class="msg-content"></div>`
            box.appendChild(replyMsgEl)
            
            const msgContentEl = replyMsgEl.querySelector('.msg-content')
            const fullReplyText = lastMsg.body || ''
            if (msgContentEl && fullReplyText) {
              const words = fullReplyText.split(/\s+/)
              msgContentEl.textContent = ''
              for (let idx = 0; idx < words.length; idx++) {
                msgContentEl.textContent = words.slice(0, idx + 1).join(' ') + (idx < words.length - 1 ? ' ▌' : '')
                box.scrollTop = box.scrollHeight
                await new Promise(r => setTimeout(r, 20))
              }
              msgContentEl.innerHTML = renderChatMsg(fullReplyText)
            }
          } else {
            box.innerHTML += `
              <div class="msg me">
                <div class="mh">${esc(lastMsg.sender)}</div>
                <div>${renderChatMsg(lastMsg.body)}</div>
              </div>`
          }
        }
        
        box.scrollTop = box.scrollHeight
        const eff = r.reply && r.reply.effect
        if (eff && eff.kind && eff.kind !== 'none') toast('Resources: ' + eff.kind.replace('_', ' '), eff.detail || '', 'good')
        if (r.reply && r.reply.assignment && r.reply.assignment.create) {
          toast('Assignment created', r.reply.assignment.description + ' (' + r.reply.assignment.days_cost + ' day(s))', '')
          if (window.Ambience && window.Ambience.radioSquelch) window.Ambience.radioSquelch()
        }
        if (r.reply && (r.reply.action_items || []).length) toast('Action required', r.reply.action_items.join(' · '), 'warn')
        
        if (r.bundle) {
          mergeBundle(r.bundle)
        } else if (r.snapshot) {
          G.snapshot = r.snapshot
        } else {
          await refreshBootstrap()
          if (G.snapshot && G.snapshot.caseId) { const b = await api(`/cases/${G.snapshot.caseId}`); mergeBundle(b) }
        }
        if (t) t.unread = 0
        if (typeof syncNotificationBadges === 'function') syncNotificationBadges()
      } catch (e) {
        if (thinking && thinking.parentNode) thinking.remove()
        ta.value = text
        fitTextarea()
        toast('Messaging error', e.message || String(e), 'crit')
      }
    })
  }

  ta.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send.onclick()
    }
  }
}

/* ---------------------------- TEAM ---------------------------- */

VIEWS.team = function () {
  const team = G.team || []
  const cands = (G.candidates || []).filter(c => !c.name.includes('Ravi'))
  const busy = team.filter(m => m.busy_until_day)
  return head('&#129309;', 'Team', 'Your people are a shared, scarce resource across every case you hold', '')
  + `<div class="grid g4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-v">${team.length}</div><div class="stat-l">Officers</div></div>
      <div class="stat v"><div class="stat-v">${team.length - busy.length}</div><div class="stat-l">Available</div></div>
      <div class="stat a"><div class="stat-v">${busy.length}</div><div class="stat-l">Committed</div></div>
      <div class="stat"><div class="stat-v">${Math.round(team.reduce((a, m) => a + m.skill, 0) / Math.max(1, team.length))}</div><div class="stat-l">Average skill</div></div>
    </div>
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-h"><h3>Your investigating team</h3></div>
      ${team.length ? team.map(m => `
        <div class="poi ${m.busy_until_day ? 'warn' : ''}" style="cursor:default">
          ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(m, m.role, m.portrait_key, 'poi-pic') : `<div class="poi-pic"><span class="init">${esc(m.name.split(' ').map(x => x[0]).slice(-2).join(''))}</span></div>`}
          <div class="poi-b">
            <div class="poi-n">${esc(m.name)}${m.is_assistant ? ' <span class="tag gold">assistant</span>' : ''}</div>
            <div class="poi-r">${esc(m.role.replace('_', ' '))}${m.speciality ? ' · ' + esc(m.speciality) : ''}</div>
            <div class="poi-tags">
              <span class="tag grey">skill ${m.skill}/10</span>
              <span class="tag grey">trust ${m.trust}/10</span>
              <span class="tag grey">morale ${m.morale}</span>
              ${m.busy_until_day ? `<span class="tag amber">committed to day ${m.busy_until_day}</span>` : `<span class="tag green">available</span>`}
            </div>
            ${m.current_task ? `<div class="cd mono dim" style="font-size:11px;margin-top:6px">Current task: ${esc(m.current_task)}</div>` : ''}
            <div class="flex" style="gap:6px;margin-top:9px;flex-wrap:wrap">
              ${!m.busy_until_day && G.snapshot ? `<button class="btn sm" data-assign="${m.id}">Assign a task</button>` : ''}
              ${G.snapshot ? `<button class="btn sm pri" data-interrogate-poi="${m.id}" title="Accompany IO into Interrogation Chamber">👥 Interrogate a POI</button>` : ''}
              <button class="btn sm gh" data-msg="${m.name}">Message</button>
            </div>
          </div>
        </div>`).join('') : '<div class="vacant" style="padding:26px"><i>&#129309;</i><h3>No team appointed</h3><p>Your assistant is assigned at induction. Specialists are appointed from the pool as your standing allows.</p></div>'}
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>Candidate pool</h3><span class="sp mono dim" style="font-size:11px">budget increases with your record</span></div>
        <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; Composition changes outcomes</div>A forensic analyst shortens laboratory turnaround. A cyber operative can produce clean hash-and-certificate chains and sign the s.63 certificate. A legal advisor warns you before you over-charge. A field constable canvasses faster. Choose for the cases you actually carry.</div>
        ${cands.map(c => {
          const hired = (G.team || []).some(m => m.name === c.name)
          return `<div class="poi" style="padding:11px 0;border-bottom:1px dotted rgba(42,52,67,.7);background:transparent">
            ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(c, c.role, c.portrait_key, 'poi-pic') : `<div class="poi-pic"><span class="init">${esc(c.name.slice(0, 2))}</span></div>`}
            <div class="poi-b">
              <div class="flex between"><span class="cond" style="font-size:15px;font-weight:600">${esc(c.name)}</span>
                <span class="tag ${hired ? 'green' : 'grey'}">${hired ? 'appointed' : 'cost ' + c.cost}</span></div>
              <div class="poi-r">${esc(c.role.replace('_', ' '))}${c.speciality ? ' · ' + esc(c.speciality) : ''}</div>
              <div style="font-size:12.5px;color:var(--ink2);margin-top:5px;line-height:1.5">${esc(c.bio || '')}</div>
              <div class="poi-tags"><span class="tag grey">skill ${c.skill}</span><span class="tag grey">trust ${c.trust}</span><span class="tag grey">${esc(c.personality || '')}</span></div>
              ${!hired ? `<button class="btn sm pri" style="margin-top:8px" data-hire="${c.id}">Appoint</button>` : ''}
            </div>
          </div>`
        }).join('')}
      </div>
      <div class="card">
        <div class="card-h"><h3>Active assignments</h3></div>
        ${(G.snapshot?.assignments || []).length ? G.snapshot.assignments.map(a => `
          <div class="kv" style="cursor:pointer;transition:background .2s" onclick="openDirectiveTaskModal(null)" title="Click to view live Task Breakdown & Progress"><span class="k" style="color:var(--gold2)">${esc(a.member)}</span><span class="v">${esc(a.description || a.task_type)}<div class="cd mono dim" style="font-size:10.5px">${a.status} · due day ${a.due_day} <span style="color:var(--cyan)">&bull; View Breakdown &rarr;</span></div></span></div>`).join('') : '<div class="dim" style="font-size:12.5px">No assignments running on the active case.</div>'}
      </div>
    </div>
  </div>`
}

VIEWS.team.after = function () {
  $$('[data-hire]').forEach(b => b.onclick = () => act(async () => {
    const r = await api('/team/hire', { method: 'POST', body: JSON.stringify({ candidateId: Number(b.dataset.hire) }) })
    await refreshBootstrap()
    if (G.snapshot) { const bb = await api(`/cases/${G.snapshot.caseId}`); mergeBundle(bb) }
    render(); toast('Officer appointed', 'They have joined your team and a personal thread has been opened on the messaging desk.', 'good')
  }))
  $$('[data-msg]').forEach(b => b.onclick = () => {
    const th = (G.threads || []).find(x => x.title === b.dataset.msg)
    if (th) {
      G.activeThread = th.id
      G.view = 'chat'
      if (th.unread > 0) {
        th.unread = 0
        api(`/chat/${th.id}/read`, { method: 'POST' }).catch(() => {})
      }
      render()
    }
    else toast('No thread', 'This officer has no open thread yet.', 'warn')
  })
  $$('[data-assign]').forEach(b => b.onclick = () => assignModal(Number(b.dataset.assign)))
  $$('[data-interrogate-poi]').forEach(b => b.onclick = () => openMemberInterrogateModal(Number(b.dataset.interrogatePoi)))
}

function openMemberInterrogateModal(memberId) {
  const s = G.snapshot
  if (!s) { toast('No active case', 'Select a case on the Case Wall first.', 'warn'); return }
  const m = (G.team || []).find(x => x.id === memberId)
  if (!m) return
  const persons = (s.persons || []).filter(p => p.role === 'suspect' || p.role === 'witness' || p.role === 'complainant')
  if (!persons.length) {
    toast('No persons on file', 'Register the FIR and canvass witnesses or suspects first.', 'warn')
    return
  }

  modal({
    title: '👥 Co-Examine a POI with ' + m.name,
    body: `<div class="reader">
      <div class="poi" style="margin-bottom:14px;padding:10px 12px;background:rgba(200,162,74,0.08);border:1px solid var(--gold)">
        ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(m, m.role || 'field', m.portrait_key, 'poi-pic-sm') : `<div class="poi-pic-sm"><span class="init">${esc(m.name.slice(0, 2))}</span></div>`}
        <div class="poi-b">
          <div class="poi-n" style="color:var(--gold2)">${esc(m.name)}</div>
          <div class="poi-r">${esc(m.speciality || m.role || 'Officer')} &middot; Skill ${m.skill}/10</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--ink2);margin-bottom:12px;line-height:1.5">
        Select a Person of Interest to interrogate. <b>${esc(m.name)}</b> will accompany you to cross-examine the suspect, verify timeline consistency, and assist in extracting locatable physical discoveries under BSA §23.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;padding-right:4px">
        ${persons.map(p => {
          const iv = (s.interviews || []).find(i => i.person_id === p.id)
          return `
            <div class="poi ${p.role === 'suspect' ? 'critical' : ''}" style="padding:10px 12px;cursor:pointer;background:rgba(22,33,54,0.6);border:1px solid rgba(200,162,74,0.25);border-radius:6px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s" onclick="window.__startMemberInterro('${p.id}', '${esc(m.name)}')">
              <div style="display:flex;align-items:center;gap:10px">
                ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic-sm') : `<div class="poi-pic-sm"><span class="init">${esc(p.name.slice(0, 2))}</span></div>`}
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--gold2)">${esc(p.name)} <span class="tag ${p.role === 'suspect' ? 'red' : 'cyan'}" style="font-size:10px;padding:1px 5px">${esc(p.role)}</span></div>
                  <div style="font-size:11px;color:#94a3b8">${esc(p.occupation || 'Subject')}${iv ? ' · ' + (iv.admissible || []).length + ' provable facts' : ''}</div>
                </div>
              </div>
              <button type="button" class="btn sm pri" style="padding:4px 10px;font-size:11px">Interrogate ➔</button>
            </div>
          `
        }).join('')}
      </div>
    </div>`,
    footer: `<button class="btn" data-close>Cancel</button>`
  })

  window.__startMemberInterro = (personId, officerName) => {
    G.ivTarget = Number(personId) || personId
    G.ivAssistant = officerName
    if (s) s.interrogation_assistant = officerName
    G.tab = 'interrogation'
    G.view = 'interrogation'
    const closeBtn = document.querySelector('[data-close]')
    if (closeBtn) closeBtn.click()
    render()
  }
}

function assignModal(memberId) {
  const s = G.snapshot
  const m = (G.team || []).find(x => x.id === memberId)
  if (!m) return
  const TASKS = [
    { k: 'canvass', label: 'Canvass a locality for witnesses', d: 1, note: 'Identifies persons who saw something. Reliable and cheap.' },
    { k: 'collect_report', label: 'Collect a laboratory report', d: 1, note: 'Frees your attention for a day.' },
    { k: 'serve_summons', label: 'Serve a production summons', d: 2, note: 'Compels a bank, telecom or shop to produce records (BNSS s.94).' },
    { k: 'verify_alibi', label: 'Verify an alibi on the ground', d: 2, note: 'Visits the place and speaks to corroborating witnesses.' },
    { k: 'cdr_pull', label: 'Pull call detail records', d: 3, note: 'Requires a cyber operative for a clean chain.' },
    { k: 'device_image', label: 'Image a seized device', d: 2, note: 'Produces a hashed copy suitable for a s.63 certificate.' },
    { k: 'surveillance', label: 'Static surveillance', d: 4, note: 'Watches a person or place over several days.' },
    { k: 'doc_analysis', label: 'Analyse a document or account', d: 5, note: 'Bank statements, account opening forms, financial trails.' },
    { k: 'informant_run', label: 'Run an informant', d: 3, note: 'Fast and cheap. Occasionally fabricated — verify before you act.' }
  ]
  modal({
    title: 'Assign task — ' + m.name,
    body: `
      <div class="grid g2">
        <div>
          <div class="fld"><label>Task</label>
            <select id="as-task">${TASKS.map(t => `<option value="${t.k}" data-d="${t.d}" data-n="${esc(t.label)}">${esc(t.label)} — ${t.d} day(s)</option>`).join('')}</select>
            <div class="hint" id="as-note"></div>
          </div>
          <div class="fld"><label>What, specifically, should ${esc(m.name.split(' ')[0])} do?</label>
            <textarea id="as-desc" rows="3" placeholder="e.g. Canvass the shops on the north side of Marol Depot Road for anyone who saw the pickup between 08:00 and 09:00."></textarea>
          </div>
        </div>
        <div>
          <div class="card"><div class="card-h"><h3>${esc(m.name)}</h3></div>
            <div class="kv"><span class="k">Role</span><span class="v">${esc(m.role.replace('_', ' '))}</span></div>
            <div class="kv"><span class="k">Skill</span><span class="v">${m.skill}/10</span></div>
            <div class="kv"><span class="k">Trust</span><span class="v">${m.trust}/10</span></div>
            <div class="kv"><span class="k">State</span><span class="v">${m.busy_until_day ? '<span class="tag amber">committed to day ' + m.busy_until_day + '</span>' : '<span class="tag green">available</span>'}</span></div>
          </div>
          ${m.skill < 6 ? `<div class="helpbox" style="border-color:var(--amber)"><div class="hb-h" style="color:#f0b45f">&#9888; Low skill</div>Work assigned to a junior officer is more likely to come back thin or mis-read. Your assistant is willing but learning.</div>` : ''}
          <div class="helpbox"><div class="hb-h">&#9878; Shared resource</div>While committed, ${esc(m.name.split(' ')[0])} is unavailable for every other case on your desk. Assign your best people to the file that will die first.</div>
        </div>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="as-do">Assign</button>`,
    after: (veil, close) => {
      const sel = veil.querySelector('#as-task'), note = veil.querySelector('#as-note')
      const upd = () => { const o = sel.selectedOptions[0]; note.textContent = TASKS.find(t => t.k === sel.value).note + ' Costs ' + o.dataset.d + ' day(s) of the officer\'s time.' }
      sel.onchange = upd; upd()
      veil.querySelector('#as-do').onclick = () => act(async () => {
        const o = sel.selectedOptions[0]
        const r = await api(`/cases/${s.caseId}/assign`, { method: 'POST', body: JSON.stringify({
          memberId, taskType: sel.value, description: veil.querySelector('#as-desc').value || o.dataset.n, daysCost: Number(o.dataset.d), playerId: G.player.id
        }) })
        mergeBundle(r); await refreshBootstrap(); close(); render()
        toast('Task assigned', `${m.name} is committed until day ${r.dueDay}.`, 'good')
      })
    }
  })
}

/* ---------------------------- CHAPTERS & HANDBOOK EDITORIAL ---------------------------- */

function formatChapterText(text) {
  if (!text) return ''
  let html = esc(text)
  // Match statutory citations and procedures
  html = html.replace(/\b(BNSS|BNS|BSA|CRPC|IPC|IEA)\s+s\.?(\d+(?:\(\d+\))?)\b/gi, (match, act, sec) => {
    return `<span class="legal-term-link" onclick="window.handleLegalNavigation(event, 'statute', { act: '${act.toUpperCase()}', section: '${sec}' })" title="Open ${match} in Legal Library">${match}</span>`
  })
  return html
}

function bindChapterStickyState() {
  const wrk = document.getElementById('work')
  const hero = document.querySelector('.chap-header-hero')
  if (!wrk || !hero) return
  const checkSticky = () => {
    if (!document.body.contains(hero)) return
    const heroRect = hero.getBoundingClientRect()
    const wrkRect = wrk.getBoundingClientRect()
    const isMobile = window.innerWidth <= 600
    const isTablet = window.innerWidth <= 900
    const stickyTop = wrkRect.top + (isMobile ? 64 : (isTablet ? 66 : 72))
    const isStuck = heroRect.top <= stickyTop + 2
    hero.classList.toggle('is-stuck', isStuck)
  }
  if (wrk._chapStickyHandler) {
    wrk.removeEventListener('scroll', wrk._chapStickyHandler)
  }
  wrk._chapStickyHandler = checkSticky
  wrk.addEventListener('scroll', checkSticky, { passive: true })
  checkSticky()
}

function scrollToChapterFocus() {
  setTimeout(() => {
    const target = document.getElementById('chap-body')
    const wrk = document.getElementById('work')
    if (target && wrk) {
      const hero = target.querySelector('.chap-header-hero') || target
      const wrkRect = wrk.getBoundingClientRect()
      const heroRect = hero.getBoundingClientRect()
      const isMobile = window.innerWidth <= 600
      const isTablet = window.innerWidth <= 900
      const headerOffset = isMobile ? 64 : (isTablet ? 66 : 72)
      const targetTop = heroRect.top - wrkRect.top + wrk.scrollTop - headerOffset
      wrk.scrollTo({ top: Math.max(0, Math.round(targetTop)), behavior: 'smooth' })
      setTimeout(bindChapterStickyState, 100)
    }
  }, 25)
}

function chaptersEditorialNavHTML() {
  const chs = G.guideChapters || []
  if (!chs.length) return ''
  return `
    <section class="chap-toc-directory" id="chap-directory" aria-label="Handbook Chapters Directory">
      <div class="chap-toc-header">
        <div class="chap-toc-eyebrow">&#128210; INVESTIGATING OFFICER'S HANDBOOK &middot; METRO CRIME BRANCH</div>
        <h2 class="chap-toc-title">Table of Contents &middot; Chapters Directory</h2>
        <div class="chap-toc-sub">Select any chapter to review tactical doctrine, statutory procedures, and case rules.</div>
      </div>
      <div class="chap-toc-list" role="list">
        ${chs.map((c, i) => {
          const isCurrent = G.chapter === c.id
          const num = String(i + 1).padStart(2, '0')
          const title = c.title || ''
          const parts = title.split('—')
          const topic = parts.length > 1 ? parts.slice(1).join('—').trim() : title
          return `
            <div class="chap-toc-item ${isCurrent ? 'active' : ''}" data-chapter="${c.id}" role="listitem" tabindex="0">
              <span class="chap-toc-num">Chapter ${i + 1}</span>
              <span class="chap-toc-dash">&mdash;</span>
              <span class="chap-toc-name">${esc(topic)}</span>
            </div>
          `
        }).join('')}
      </div>
    </section>
  `
}

/* ---------------------------- SETTINGS ---------------------------- */

VIEWS.settings = function () {
  const st = (G.player && G.player.settings) || {}
  const p = st.presentation || {}
  const plyr = G.player || {}
  const activeTab = G.settingsTab || G.sectionKey || 'profile'
  G.settingsTab = activeTab
  const rows = (arr) => arr.map(x => `
    <div class="setrow">
      <div class="sb"><div class="st">${esc(x.t)}</div><div class="sd">${x.d}</div>${x.cost ? `<div class="mono" style="font-size:10.5px;color:var(--amber);margin-top:3px">Career score effect: ${esc(x.cost)}</div>` : ''}</div>
      <div class="sw ${x.on ? 'on' : ''}" data-set="${x.k}"></div>
    </div>`).join('')

  const avatarPool = [
    { id: 'av1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80', label: 'Senior Inspector' },
    { id: 'av2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80', label: 'Investigating Officer' },
    { id: 'av3', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80', label: 'Sub-Inspector Field Lead' },
    { id: 'av4', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=300&q=80', label: 'Cyber Forensic Specialist' },
    { id: 'av5', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&h=300&q=80', label: 'Tactical Lead' },
    { id: 'av6', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&h=300&q=80', label: 'Crime Branch Detective' }
  ]

  return head('&#9881;', 'Settings', 'Investigating Officer Profile, Tactical Adjudication & Operational Preferences', '')
  + `<div class="tabs">
      <div class="tab ${activeTab === 'profile' ? 'on' : ''}" data-st="profile">Profile</div>
      <div class="tab ${activeTab === '1' ? 'on' : ''}" data-st="1">Assistance</div>
      <div class="tab ${activeTab === '2' ? 'on' : ''}" data-st="2">Presentation</div>
      <div class="tab ${activeTab === '3' ? 'on' : ''}" data-st="3">AI</div>
      <div class="tab ${activeTab === '4' ? 'on' : ''}" data-st="4">Controls</div>
      <div class="tab ${activeTab === '5' ? 'on' : ''}" data-st="5">Legal Library</div>
      <div class="tab ${activeTab === '6' ? 'on' : ''}" data-st="6">Forms Codex</div>
      <div class="tab ${activeTab === '7' ? 'on' : ''}" data-st="7">Player Guide</div>
    </div>
  <div data-sp="profile" style="${activeTab === 'profile' ? '' : 'display:none'}">
    <div class="card">
      <div class="card-h"><h3>&#127894; Investigating Officer Commission Credentials</h3></div>
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; Officer Service Record &amp; Authority</div>
        Configure your official commissioned identity in the Metro Crime Branch Central Registry. Changes update your header credentials, judicial submissions, charge-sheets, and warrant card in real time.
      </div>
      <div class="prof-grid">
        <div class="prof-field">
          <label for="prof-name">Officer Full Name</label>
          <input type="text" id="prof-name" value="${esc(plyr.fullName || 'Swetabh Suman')}" placeholder="e.g. Inspector Swetabh Suman" />
        </div>
        <div class="prof-field">
          <label for="prof-callsign">Tactical Callsign / Code</label>
          <input type="text" id="prof-callsign" value="${esc(plyr.callsign || 'BLACKWATCH-1')}" placeholder="e.g. DELTA-9" />
        </div>
        <div class="prof-field">
          <label for="prof-rank">Commissioned Rank</label>
          <select id="prof-rank">
            <option value="Police Sub-Inspector" ${plyr.rank === 'Police Sub-Inspector' ? 'selected' : ''}>Police Sub-Inspector (PSI)</option>
            <option value="Inspector of Police" ${plyr.rank === 'Inspector of Police' ? 'selected' : ''}>Inspector of Police (PI)</option>
            <option value="Assistant Commissioner of Police" ${plyr.rank === 'Assistant Commissioner of Police' ? 'selected' : ''}>Assistant Commissioner of Police (ACP)</option>
            <option value="Deputy Superintendent of Police" ${plyr.rank === 'Deputy Superintendent of Police' ? 'selected' : ''}>Deputy Superintendent of Police (DSP)</option>
          </select>
        </div>
        <div class="prof-field">
          <label for="prof-badge">Official Badge Number</label>
          <input type="text" id="prof-badge" value="${esc(plyr.badgeNo || plyr.badgeNumber || 'MCB-4512')}" placeholder="e.g. MCB-4512" />
        </div>
        <div class="prof-field" style="grid-column:1/-1">
          <label for="prof-posting">Branch Posting &amp; Operational Unit</label>
          <select id="prof-posting">
            <option value="CID Crime Branch · Unit 1 (Homicide)" ${plyr.posting === 'CID Crime Branch · Unit 1 (Homicide)' ? 'selected' : ''}>CID Crime Branch · Unit 1 (Homicide &amp; Violent Crimes)</option>
            <option value="Special Operations Group (SOG)" ${plyr.posting === 'Special Operations Group (SOG)' ? 'selected' : ''}>Special Operations Group (SOG)</option>
            <option value="Cyber Forensics &amp; Digital Intelligence" ${plyr.posting === 'Cyber Forensics &amp; Digital Intelligence' ? 'selected' : ''}>Cyber Forensics &amp; Digital Intelligence Division</option>
            <option value="Economic Offences Wing (EOW)" ${plyr.posting === 'Economic Offences Wing (EOW)' ? 'selected' : ''}>Economic Offences Wing (EOW)</option>
          </select>
        </div>
        <div class="prof-field" style="grid-column:1/-1">
          <label for="prof-motto">Investigative Doctrine / Officer Motto</label>
          <input type="text" id="prof-motto" value="${esc(plyr.motto || 'Statutory Rigour under BSA §23; Discovery over Coercion.')}" placeholder="Investigative motto or operational doctrine" />
        </div>
      </div>
      <div style="margin-top:14px">
        <label style="font-family:var(--font-cond);font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--gold)">Commission Portrait &amp; Visual ID</label>
        <div class="prof-avatar-grid">
          ${avatarPool.map(a => `
            <div class="prof-avatar-opt ${(plyr.avatarUrl === a.url || (!plyr.avatarUrl && a.id === 'av1')) ? 'on' : ''}" data-avatar-url="${esc(a.url)}" title="${esc(a.label)}">
              <img src="${esc(a.url)}" alt="${esc(a.label)}" />
            </div>
          `).join('')}
        </div>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;align-items:center">
        <button class="btn pri" id="prof-save-btn">&#128190; Save Officer Profile</button>
        <span id="prof-save-msg" style="font-size:12px;font-family:var(--font-mono);color:#6fd39b;display:none">&#10004; Profile updated and synced</span>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>&#128179; Official Digital Commission Warrant Card</h3></div>
      <div style="display:flex;justify-content:center;padding:12px 0">
        ${renderOfficerBadgeHTML(plyr)}
      </div>
      <div style="display:flex;justify-content:center;gap:10px;margin-top:10px">
        <button class="btn sm pri" id="prof-view-badge-btn">&#127894; Inspect Full Warrant Modal</button>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>&#127942; Career Service Record &amp; Conferred Honours</h3></div>
      <div class="prof-ribbons-grid">
        <div class="prof-ribbon">
          <div class="prof-ribbon-ico">&#127894;</div>
          <div class="prof-ribbon-info">
            <div class="prof-ribbon-t">Director General's Commendation</div>
            <div class="prof-ribbon-d">Conferred for strict adherence to criminal procedure and evidence integrity.</div>
          </div>
        </div>
        <div class="prof-ribbon">
          <div class="prof-ribbon-ico">&#9878;</div>
          <div class="prof-ribbon-info">
            <div class="prof-ribbon-t">BSA §23 Statutory Admissibility Master</div>
            <div class="prof-ribbon-d">Zero judicial rejections on custodial disclosure statements &amp; recoveries.</div>
          </div>
        </div>
        <div class="prof-ribbon">
          <div class="prof-ribbon-ico">&#128269;</div>
          <div class="prof-ribbon-info">
            <div class="prof-ribbon-t">Digital Evidence &amp; CDR Excellence</div>
            <div class="prof-ribbon-d">Flawless electronic certificate compliance under BSA §63(4).</div>
          </div>
        </div>
        <div class="prof-ribbon">
          <div class="prof-ribbon-ico">&#128737;</div>
          <div class="prof-ribbon-info">
            <div class="prof-ribbon-t">Distinguished Crime Clearance Star</div>
            <div class="prof-ribbon-d">First-degree homicide &amp; extortion cases solved within statutory remand limits.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div data-sp="1" style="${activeTab === '1' ? '' : 'display:none'}">
    <div class="card">
      <div class="card-h"><h3>Assistance &amp; guidance</h3></div>
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; How this works</div>Every guidance option that steers you reduces your career score when the case closes. That is deliberate. An officer who solves a case unaided is worth more to the Branch than one who needed the answers. On-demand "Guide me" help is free — asking how a form works is not the same as being told the answer.</div>
      ${rows([
        { k: 'legalGuidance', on: st.legalGuidance, t: 'Legal Guidance', d: 'Inlines the relevant BNS, BNSS and BSA provisions beside every form, with a plain-English explanation.', cost: '−5%' },
        { k: 'procedureCoach', on: st.procedureCoach, t: 'Procedure Coach', d: 'Per-act step checklists and prompts for the next required step.', cost: '−5%' },
        { k: 'onDemandHelp', on: st.onDemandHelp, t: 'On-Demand Procedure Help', d: 'Clicking any Tab name or Section title explains the procedure for that exact tab or section.', cost: 'none' },
        { k: 'interrogationAid', on: st.interrogationAid, t: 'Interrogation Aid', d: 'Tactical notes after each exchange, technique hints and legal-limit warnings.', cost: '−10%' },
        { k: 'evidenceAid', on: st.evidenceAid, t: 'Evidence Analysis Aid', d: 'Examination hints at the scene and recommendations at the laboratory.', cost: '−10%' },
        { k: 'chargeAid', on: st.chargeAid, t: 'Charge-Framing Aid', d: 'Suggests BNS sections with a note on what each requires and the risk of over-charging.', cost: '−8%' },
        { k: 'ingredientHighlight', on: st.ingredientHighlight, t: 'Auto-Highlight Statutory Ingredients', d: 'Live chips light up as your FIR narrative satisfies each ingredient of the offence.', cost: 'none' },
        { k: 'consequencePreview', on: st.consequencePreview, t: 'Consequence Preview', d: 'Tells you what will happen before you commit an action.', cost: '−5%' },
        { k: 'notepadSuggestions', on: st.notepadSuggestions, t: 'Notepad Suggestions', d: 'The Investigator\'s Notepad files observations and blockers for you.', cost: 'none' }
      ])}
    </div>
  </div>
  <div data-sp="2" style="${activeTab === '2' ? '' : 'display:none'}">
    <div class="card">
      <div class="card-h"><h3>Presentation</h3></div>
      <div class="setrow"><div class="sb"><div class="st">Interface language</div><div class="sd">Translates the console chrome — menus, headings, buttons and labels. Case content, statutory text, citations and AI output stay in English, because the law is cited in English in an Indian court and a translated section number would be useless.</div></div>
        <div class="seg" id="pr-lang" role="group" aria-label="Interface language">
          <button type="button" class="seg-b ${st.language === 'en' ? 'on' : ''}" data-lang="en">English</button>
          <button type="button" class="seg-b ${st.language === 'hi' ? 'on' : ''}" data-lang="hi">&#2361;&#2367;&#2344;&#2381;&#2342;&#2368;</button>
          <button type="button" class="seg-b ${st.language === 'hinglish' ? 'on' : ''}" data-lang="hinglish">Hinglish</button>
        </div></div>
      <div class="setrow"><div class="sb"><div class="st">Text scale</div><div class="sd">Enlarges all interface text.</div></div>
        <div style="width:200px"><input type="range" min="0.85" max="1.5" step="0.05" value="${p.textScale || 1}" id="pr-scale" /><div class="mono dim" style="font-size:10.5px;text-align:right">${Math.round((p.textScale || 1) * 100)}%</div></div></div>
      ${rows([
        { k: 'pr-dyslexic', on: p.dyslexicFont, t: 'Dyslexia-friendly font', d: 'Switches the interface to a highly legible typeface.' },
        { k: 'pr-motion', on: p.reducedMotion, t: 'Reduced motion', d: 'Removes transitions and animations, including board pin dragging.' },
        { k: 'pr-mono', on: p.monoDossier, t: 'Monochrome dossier mode', d: 'High-contrast greyscale, as a photocopied case file.' },
        { k: 'pr-coloursafe', on: p.colourSafeTags, t: 'Colour-blind-safe tags', d: 'Adds shape and label cues so status is never colour-only.' },
        { k: 'pr-typewriter', on: p.typewriter, t: 'Typewriter document reveal', d: 'Legal documents render with the classic typed form aesthetic.' }
      ])}
      <div class="setrow"><div class="sb"><div class="st">Evidence-board red string density</div><div class="sd">Sparse, normal, or dense linkage on the board.</div></div>
        <div style="width:150px"><select id="pr-density"><option value="sparse" ${p.stringDensity === 'sparse' ? 'selected' : ''}>Sparse</option><option value="normal" ${p.stringDensity === 'normal' ? 'selected' : ''}>Normal</option><option value="dense" ${p.stringDensity === 'dense' ? 'selected' : ''}>Dense</option></select></div></div>
      <div class="setrow"><div class="sb"><div class="st">Ambience volume</div><div class="sd">Each desk has its own room tone — the duty room hums and rings, the crime scene has wind and rain, the lab has an extractor, the interrogation room has a clock, the court is hushed. The soundscape is synthesised in your browser, so it is copyright-free and costs nothing to load. Audio starts after your first click or keypress, as browsers require.</div></div>
        <div style="width:200px"><input type="range" min="0" max="100" value="${p.ambience != null ? p.ambience : 50}" id="pr-vol" /><div class="mono dim" style="font-size:10.5px;text-align:right" id="pr-vol-v">${p.ambience != null ? p.ambience : 50}%</div></div></div>
    </div>
    <div class="card">
      <div class="card-h"><h3>&#128190; Save &amp; resume</h3></div>
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#10003; Autosave is always on</div>The game autosaves after every action and the case snapshot records a resume point. You may stop at any moment and return days later; the Session Summary below shows exactly where you left off.</div>
      <div class="kv"><span class="k">Resume point</span><span class="v">${esc(G.snapshot?.resumePoint || 'No case open')}</span></div>
      <div class="kv"><span class="k">Day</span><span class="v">${G.snapshot ? G.snapshot.day + ' of ' + G.snapshot.dayLimit + ' (' + G.snapshot.daysLeft + ' remaining)' : '—'}</span></div>
      <div class="flex" style="gap:8px;margin-top:11px"><button class="btn sm" id="pr-export">Export case file (JSON)</button></div>
    </div>
  </div>
  <div data-sp="3" style="${activeTab === '3' ? '' : 'display:none'}">
    <div class="card">
      <div class="card-h"><h3>&#129302; Adjudication Model &amp; BYOK Configuration</h3></div>
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; Secure Bring Your Own Key (BYOK) Vault</div>
        Provide your personal Google Gemini API key to make it the <b>primary engine</b> for interrogations, forensic laboratory deductions, and court adjudication. Keys are encrypted server-side and stored in an <b>HTTP-Only session cookie</b>, ensuring they are <b>never exposed to browser console inspection, local storage, or client-side JavaScript</b>. Fully compatible with free-tier Gemini API keys (<code>gemini-2.5-flash</code>).
      </div>
      
      <div class="setrow" style="flex-direction:column;align-items:stretch;gap:5px;padding:9px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%">
          <div class="st" style="margin:0;font-size:15px;letter-spacing:.03em">Active AI Engine Status</div>
          <div id="byok-status-badge"><span class="tag gold">&#9889; SERVER FALLBACK</span></div>
        </div>
        <div class="sd" id="byok-status-desc" style="width:100%;margin-top:2px;line-height:1.5;color:var(--ink3)">Evaluating secure vault credentials…</div>
      </div>

      <div class="setrow" style="align-items:flex-start">
        <div class="sb" style="width:100%">
          <div class="st">Google Gemini API Key (BYOK)</div>
          <div class="sd">Encrypted in server HTTP-Only session vault. Raw key is never rendered into DOM, console, or local storage.</div>
          <div style="margin-top:10px;display:flex;gap:8px;max-width:540px;width:100%">
            <input type="password" id="byok-input" placeholder="Enter Gemini API key (AIzaSy…)" style="flex:1;font-family:var(--font-mono);font-size:12.5px" />
            <button class="btn sm gh" id="byok-toggle-vis" title="Toggle key visibility">&#128065;</button>
          </div>
          <div class="byok-actions-row" style="margin-top:8px;display:flex;gap:8px;max-width:540px;width:100%">
            <button type="button" class="byok-pill-btn byok-pill-save" id="byok-save">&#128274; Save Key</button>
            <button type="button" class="byok-pill-btn byok-pill-test" id="byok-test">&#9889; Test Key</button>
            <button type="button" class="byok-pill-btn byok-pill-clear" id="byok-clear">&#10006; Remove Key</button>
          </div>
          <div id="byok-test-res" style="margin-top:8px;font-size:12px;font-family:var(--font-mono);display:none"></div>
        </div>
      </div>

      <div class="setrow" style="align-items:flex-start">
        <div class="sb" style="width:100%">
          <div class="st">&#9889; Dynamic Multi-Model Auto-Routing (Tiered Dispatch)</div>
          <div class="sd">The engine dynamically analyzes prompt complexity and legal requirements to route each request to the optimal model with silent fallback:</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;margin-top:10px">
            <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:6px;padding:8px 10px">
              <div style="display:flex;align-items:center;gap:6px;color:#4ade80;font-weight:700;font-size:11px;font-family:var(--font-cond)">
                <span class="tag tag-model-tier lite">⚡ Flash-Lite</span>
                <span>Speed &amp; Quota Tier</span>
              </div>
              <div style="font-size:10.5px;color:var(--ink3);margin-top:4px"><code>gemini-3.1-flash-lite</code> &middot; Small talk, chai banter, quick intent tags.</div>
            </div>
            <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:6px;padding:8px 10px">
              <div style="display:flex;align-items:center;gap:6px;color:var(--gold);font-weight:700;font-size:11px;font-family:var(--font-cond)">
                <span class="tag tag-model-tier balanced">⚖️ Flash</span>
                <span>Investigative Tier</span>
              </div>
              <div style="font-size:10.5px;color:var(--ink3);margin-top:4px"><code>gemini-3.8-flash</code> &middot; Core investigative roleplay, squad coordination.</div>
            </div>
            <div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.25);border-radius:6px;padding:8px 10px">
              <div style="display:flex;align-items:center;gap:6px;color:#c084fc;font-weight:700;font-size:11px;font-family:var(--font-cond)">
                <span class="tag tag-model-tier reasoning">🧠 Pro</span>
                <span>Reasoning Tier</span>
              </div>
              <div style="font-size:10.5px;color:var(--ink3);margin-top:4px"><code>gemini-2.5-pro</code> &middot; BNSS chargesheets, court scrutiny, alibi disproof.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="setrow"><div class="sb"><div class="st">Suspect role-play temperature</div><div class="sd">Higher makes suspects less predictable in interrogation. Lower makes them more consistent.</div></div>
        <div style="width:200px"><input type="range" min="0" max="1" step="0.05" value="${st.ai?.suspectTemperature != null ? st.ai.suspectTemperature : 0.7}" id="ai-temp" /><div class="mono dim" style="font-size:10.5px;text-align:right">${(st.ai?.suspectTemperature != null ? st.ai.suspectTemperature : 0.7).toFixed(2)}</div></div></div>
      <div class="setrow"><div class="sb"><div class="st">Never let AI invent case facts</div><div class="sd">Permanently on. The case is seeded in the database first; the AI adjudicates and role-plays against that seed and may not add, alter or contradict any case fact. This is what makes the verdict trustworthy and reproducible.</div></div>
        <div class="sw on" style="opacity:.65;cursor:not-allowed"></div></div>
    </div>
  </div>
  <div data-sp="4" style="${activeTab === '4' ? '' : 'display:none'}">
    <div class="card">
      <div class="card-h"><h3>Keyboard shortcuts</h3></div>
      ${[['W', 'Case Wall'], ['C', 'Messaging desk'], ['D', 'Duty Room'], ['S', 'Scene'], ['L', 'Forensic Lab'], ['B', 'Evidence Board'], ['P', 'Persons of Interest'], ['I', 'Interrogation Room'], ['F', 'Charge Sheet'], ['T', 'Court'], ['G', 'Player Guide'], [',', 'Settings'], ['H', 'Procedure help — opens guide for active tab/section'], ['Esc', 'Close any dialog']].map(([k, v]) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join('')}
    </div>
  </div>
  <div data-sp="5" style="${activeTab === '5' ? '' : 'display:none'}">${legalLibraryHTML()}</div>
  <div data-sp="6" style="${activeTab === '6' ? '' : 'display:none'}">${formsCodexHTML()}</div>
  <div data-sp="7" style="${activeTab === '7' ? '' : 'display:none'}">
    ${chaptersEditorialNavHTML()}
    <div class="reader">${guideInlineHTML()}</div>
  </div>`
}

VIEWS.settings.after = function () {
  const veil = null
  $$('.tab').forEach(t => t.onclick = () => {
    G.settingsTab = t.dataset.st
    $$('.tab').forEach(x => x.classList.toggle('on', x === t))
    $$('[data-sp]').forEach(p => p.style.display = p.dataset.sp === t.dataset.st ? '' : 'none')
    if (t.dataset.st === '7' && !(G.guideChapters || []).length) {
      loadGuide()
    }
  })

  // Officer Profile Tab Handlers
  const activeOpt = document.querySelector('.prof-avatar-opt.on')
  let selectedAvatarUrl = (activeOpt && activeOpt.dataset.avatarUrl) || (G.player && G.player.avatarUrl) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80'
  $$('.prof-avatar-opt').forEach(opt => {
    opt.onclick = () => {
      $$('.prof-avatar-opt').forEach(o => o.classList.toggle('on', o === opt))
      selectedAvatarUrl = opt.dataset.avatarUrl
      const badgeImg = document.querySelector('#officer-official-badge .badge-portrait-img')
      if (badgeImg) badgeImg.src = selectedAvatarUrl
    }
  })

  const profSaveBtn = $('#prof-save-btn')
  if (profSaveBtn) {
    profSaveBtn.onclick = async () => {
      const name = ($('#prof-name')?.value || '').trim() || 'Investigating Officer'
      const callsign = ($('#prof-callsign')?.value || '').trim()
      const rank = $('#prof-rank')?.value || 'Police Sub-Inspector'
      const badgeNo = ($('#prof-badge')?.value || '').trim() || 'MCB-4512'
      const posting = $('#prof-posting')?.value || 'CID Crime Branch · Unit 1 (Homicide)'
      const motto = ($('#prof-motto')?.value || '').trim()
      const msg = $('#prof-save-msg')

      const curOpt = document.querySelector('.prof-avatar-opt.on')
      if (curOpt && curOpt.dataset.avatarUrl) {
        selectedAvatarUrl = curOpt.dataset.avatarUrl
      }

      const profilePayload = {
        fullName: name,
        displayName: name,
        callsign,
        rank,
        rankTitle: rank,
        badgeNo,
        badgeNumber: badgeNo,
        posting,
        division: posting,
        motto,
        avatarUrl: selectedAvatarUrl
      }

      try {
        const r = await api('/player', {
          method: 'POST',
          body: JSON.stringify(profilePayload)
        })
        const updated = r.player ? r.player : { ...G.player, ...profilePayload }
        applyPlayer(updated)
        
        // Update header officer display and avatar live
        const hName = document.querySelector('.officer-name')
        const hRank = document.querySelector('.officer-rank')
        const hAvatar = document.querySelector('.hud-officer-avatar img')
        const hpbAvatar = document.querySelector('.hpb-avatar img')
        const hpbName = document.querySelector('.hpb-name')
        const hpbRank = document.querySelector('.hpb-rank')

        if (hName) hName.textContent = name
        if (hRank) hRank.textContent = rank + (badgeNo ? ' · ' + badgeNo : '')
        if (hAvatar && selectedAvatarUrl) hAvatar.src = selectedAvatarUrl
        if (hpbAvatar && selectedAvatarUrl) hpbAvatar.src = selectedAvatarUrl
        if (hpbName) hpbName.textContent = name
        if (hpbRank) hpbRank.textContent = rank + (badgeNo ? ' · ' + badgeNo : '')

        const badgeImg = document.querySelector('#officer-official-badge .badge-portrait-img')
        if (badgeImg && selectedAvatarUrl) badgeImg.src = selectedAvatarUrl

        if (msg) {
          msg.style.display = 'inline'
          setTimeout(() => { msg.style.display = 'none' }, 3000)
        }
        toast('Profile Updated', 'Official Commission credentials saved & synchronized.', 'good')
      } catch (e) {
        toast('Error', e.message || String(e), 'crit')
      }
    }
  }

  const profBadgeBtn = $('#prof-view-badge-btn')
  if (profBadgeBtn) {
    profBadgeBtn.onclick = () => openBadgeModal(G.authMember || G.player)
  }
  const save = async (patch) => {
    const r = await api('/settings', { method: 'POST', body: JSON.stringify(patch) })
    if (r.player) applyPlayer(r.player)
    else if (r.settings) applyPlayer({ ...G.player, settings: r.settings })
    else if (patch) applyPlayer({ ...G.player, settings: { ...G.player.settings, ...patch } })
  }
  $$('[data-set]').forEach(sw => sw.onclick = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const key = sw.dataset.set
    let patch
    if (key === 'ai-show-model-badges') {
      const cur = !(G.player && G.player.settings && G.player.settings.ai && G.player.settings.ai.showModelBadges === false)
      patch = { ai: { ...(G.player?.settings?.ai || {}), showModelBadges: !cur } }
    } else if (key.startsWith('pr-')) {
      const map = { 'pr-dyslexic': 'dyslexicFont', 'pr-motion': 'reducedMotion', 'pr-mono': 'monoDossier', 'pr-coloursafe': 'colourSafeTags', 'pr-typewriter': 'typewriter' }
      const cur = G.player.settings.presentation[map[key]]
      patch = { presentation: { ...G.player.settings.presentation, [map[key]]: !cur } }
    } else {
      const cur = G.player.settings[key]
      patch = { [key]: !cur }
    }
    sw.classList.toggle('on')

    // Lock page scroll position so toggling switches never shifts or jumps the view
    const work = $('#work') || document.querySelector('.work')
    const savedWorkScroll = work ? work.scrollTop : 0
    const savedWinScroll = window.scrollY || document.documentElement.scrollTop || 0

    act(async () => {
      await save(patch)
      if (work) work.scrollTop = savedWorkScroll
      window.scrollTo(0, savedWinScroll)
      requestAnimationFrame(() => {
        if (work) work.scrollTop = savedWorkScroll
        window.scrollTo(0, savedWinScroll)
      })
    })
  })
  const sc = $('#pr-scale')
  if (sc) sc.oninput = () => { document.documentElement.style.setProperty('--scale', sc.value); sc.nextElementSibling.textContent = Math.round(sc.value * 100) + '%' }
  if (sc) sc.onchange = () => act(async () => { await save({ presentation: { ...G.player.settings.presentation, textScale: Number(sc.value) } }) })
  const dn = $('#pr-density'); if (dn) dn.onchange = () => act(async () => { await save({ presentation: { ...G.player.settings.presentation, stringDensity: dn.value } }) })
  const tt = $('#ai-temp')
  if (tt) { tt.oninput = () => { tt.nextElementSibling.textContent = Number(tt.value).toFixed(2) }; tt.onchange = () => act(async () => { await save({ ai: { ...G.player.settings.ai, suspectTemperature: Number(tt.value) } }) }) }
  const tr = $('#ai-tier'); if (tr) tr.onchange = () => act(async () => { await save({ ai: { ...G.player.settings.ai, tier: tr.value } }) })

  // BYOK (Bring Your Own Key) event handlers with HTTP-Only Server Vault
  const byokInput = $('#byok-input')
  const byokStatusDesc = $('#byok-status-desc')
  const byokStatusBadge = $('#byok-status-badge')
  const byokTestRes = $('#byok-test-res')

  const refreshByokVaultStatus = async () => {
    try {
      const res = await api('/settings/byok/status')
      if (res.configured && res.maskedKey) {
        if (byokInput) {
          byokInput.value = ''
          byokInput.placeholder = `Saved: ${res.maskedKey}`
        }
        if (byokStatusDesc && byokStatusBadge) {
          byokStatusDesc.innerHTML = `<span style="color:#6fd39b;font-weight:600">PRIMARY: BYOK Active in HTTP-Only Server Vault</span> &middot; Masked key: <code>${res.maskedKey}</code>. Key protected from console inspection.`
          byokStatusBadge.innerHTML = `<span class="tag green">&#10003; VAULT SECURED</span>`
        }
      } else {
        if (byokInput) {
          byokInput.value = ''
          byokInput.placeholder = 'Enter Gemini API key (AIzaSy…)'
        }
        if (byokStatusDesc && byokStatusBadge) {
          byokStatusDesc.innerHTML = `<span style="color:#f0b45f;font-weight:600">FALLBACK: Server High-Speed Engine Active</span> &middot; Zero-delay default fallback operating on verified server API.`
          byokStatusBadge.innerHTML = `<span class="tag gold">&#9889; SERVER FALLBACK</span>`
        }
      }
    } catch (err) {
      // quiet fallback
    }
  }
  refreshByokVaultStatus()

  const toggleVis = $('#byok-toggle-vis')
  if (toggleVis && byokInput) {
    toggleVis.onclick = () => {
      byokInput.type = byokInput.type === 'password' ? 'text' : 'password'
    }
  }

  const byokSave = $('#byok-save')
  if (byokSave && byokInput) {
    byokSave.onclick = async () => {
      const val = byokInput.value.trim()
      if (!val) {
        toast('No Key Entered', 'Please paste your Gemini API key to save it in the vault.', 'warn')
        return
      }
      try {
        const res = await api('/settings/byok', {
          method: 'POST',
          body: JSON.stringify({ apiKey: val })
        })
        if (res.success) {
          byokInput.value = ''
          await refreshByokVaultStatus()
          toast('BYOK Key Encrypted & Saved', 'Your key is stored in a secure HTTP-Only server session vault.', 'good')
        } else {
          toast('Invalid API Key', res.message || 'Key verification failed.', 'bad')
        }
      } catch (err) {
        toast('Save Error', err.message || 'Failed to save key into vault.', 'bad')
      }
    }
  }

  const byokClear = $('#byok-clear')
  if (byokClear) {
    byokClear.onclick = async () => {
      try {
        await api('/settings/byok', { method: 'DELETE' })
        if (byokInput) {
          byokInput.value = ''
          byokInput.placeholder = 'Enter Gemini API key (AIzaSy…)'
        }
        if (byokStatusDesc && byokStatusBadge) {
          byokStatusDesc.innerHTML = `<span style="color:#f0b45f;font-weight:600">FALLBACK: Server High-Speed Engine Active</span> &middot; Zero-delay default fallback operating on verified server API.`
          byokStatusBadge.innerHTML = `<span class="tag gold">&#9889; SERVER FALLBACK</span>`
        }
        await refreshByokVaultStatus()
        if (byokTestRes) byokTestRes.style.display = 'none'
        toast('BYOK Key Removed', 'Cleared from server vault. Reverted to default server engine fallback.', '')
      } catch (err) {
        toast('Clear Error', err.message || 'Failed to remove key from vault.', 'bad')
      }
    }
  }

  const byokTest = $('#byok-test')
  if (byokTest && byokInput) {
    byokTest.onclick = async () => {
      const inputVal = byokInput.value.trim()
      if (byokTestRes) {
        byokTestRes.style.display = 'block'
        byokTestRes.style.color = '#c8a24a'
        byokTestRes.textContent = 'Validating key via server vault…'
      }
      try {
        const res = await api('/validate-key', {
          method: 'POST',
          body: JSON.stringify({ apiKey: inputVal || undefined })
        })
        if (res.valid) {
          byokTestRes.style.color = '#6fd39b'
          byokTestRes.textContent = `✓ Key validated successfully! Model: ${res.model || 'gemini-2.5-flash'}. Free tier and quota verified.`
          toast('API Key Validated', 'Connected successfully to Gemini model.', 'good')
        } else {
          byokTestRes.style.color = '#ff8b86'
          byokTestRes.textContent = `✗ Validation failed: ${res.message || res.error || 'Invalid key or quota exceeded'}`
          toast('API Key Invalid', res.message || 'Check key and permissions.', 'crit')
        }
      } catch (err) {
        if (byokTestRes) {
          byokTestRes.style.color = '#ff8b86'
          byokTestRes.textContent = `✗ Error: ${err.message}`
        }
        toast('Validation Error', err.message, 'crit')
      }
    }
  }

  const vol = $('#pr-vol')
  if (vol) {
    vol.oninput = () => {
      const v = Number(vol.value)
      const lab = $('#pr-vol-v'); if (lab) lab.textContent = v + '%'
      if (window.Ambience) { Ambience.volume(v / 100); if (v > 0) Ambience.sync() }
    }
    vol.onchange = () => act(async () => {
      await save({ presentation: { ...G.player.settings.presentation, ambience: Number(vol.value) } })
      if (window.Ambience) Ambience.sync()
    })
  }
  $$('#pr-lang .seg-b').forEach(b => b.onclick = () => {
    $$('#pr-lang .seg-b').forEach(x => x.classList.toggle('on', x === b))
    act(async () => { await save({ language: b.dataset.lang }); render() })
  })
  const ex = $('#pr-export'); if (ex) ex.onclick = async () => {
    const b = await api('/bootstrap')
    const blob = new Blob([JSON.stringify({ player: b.player, snapshot: G.snapshot, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'case-file-' + (G.snapshot?.caseNo || 'webapp').replace(/\//g, '-') + '.json'; a.click()
    toast('Case file exported', 'Saved as JSON for your own records.', 'good')
  }
  bindLegal()
  $$('[data-form]').forEach(b => b.onclick = () => {
    const f = (G.forms || []).find(x => x.code === b.dataset.form); if (f) formCodexModal(f)
  })
  $$('[data-chapter]').forEach(b => b.onclick = (e) => {
    if (e) e.preventDefault()
    G.chapter = b.dataset.chapter
    render()
    scrollToChapterFocus()
  })
  bindLegalExpand()
  bindChapterStickyState()
  if (G.settingsTab === '7' && !(G.guideChapters || []).length) {
    loadGuide()
  }
}

function bindLegalExpand() {
  $$('[data-lex]').forEach(el => el.onclick = () => {
    const key = el.dataset.lex
    const ref = (G.legalRefs || []).find(r => r.act + r.section === key)
    if (!ref) return
    modal({
      title: ref.act + ' Section ' + ref.section + ' — ' + ref.title,
      body: `<div class="reader">
        <div class="legalbox"><div class="lb-h">&#9878; The provision, in substance</div>${esc(ref.bare)}</div>
        <div class="rule"></div>
        <div class="hd" style="font-size:11.5px;color:var(--gold);margin-bottom:6px">In plain terms</div>
        <p>${esc(ref.plain)}</p>
        <div class="hd" style="font-size:11.5px;color:var(--cyan);margin-bottom:6px">How this is used in the game</div>
        <p>${esc(ref.in_game)}</p>
        <div class="helpbox"><div class="hb-h">&#8505; Verify in the Act</div>This is a summary for gameplay, not legal advice. Always read the provision in the Bharatiya Nyaya Sanhita / Bharatiya Nagarik Suraksha Sanhita / Bharatiya Sakshya Adhiniyam, 2023, as enacted.</div>
      </div>`,
      footer: '<button class="btn" data-close>Close</button>'
    })
  })
}

function legalActLabel(a) {
  return {
    ALL: 'All four groups',
    BNS: 'BNS 2023 — offences',
    BNSS: 'BNSS 2023 — procedure',
    BSA: 'BSA 2023 — evidence',
    ALLIED: 'Allied acts'
  }[a] || a
}

/* The library is exhaustive — every section of the BNS, BNSS and BSA (1,054
   provisions) — so it is paged rather than shipped in the bootstrap payload.
   Browsing is grouped by enactment and ordered as the Act itself is ordered;
   the search bar queries all four groups at once and lets the research
   assistant rank the reading list. */
function legalLibraryHTML() {
  const acts = ['BNS', 'BNSS', 'BSA', 'ALLIED']
  G.legalAct = G.legalAct || 'BNS'
  G.legalCounts = G.legalCounts || { BNS: 350, BNSS: 531, BSA: 170, ALLIED: 12 }
  const totalCount = Object.values(G.legalCounts).reduce((a, b) => a + Number(b || 0), 0)
  const searching = !!G.legalResults
  return `<div class="legal-wrap">
    <div class="legal-stat-strip"><span class="sp mono dim" style="font-size:11px">${totalCount.toLocaleString()} provisions indexed</span></div>
    <div class="helpbox" style="margin-top:0"><div class="hb-h">&#9878; The complete 2023 criminal codes</div>Every section of the <b>BNS</b> (350 offences), the <b>BNSS</b> (531 procedure sections) and the <b>BSA</b> (170 evidence sections) is indexed here, with plain-English commentary on the provisions this game adjudicates on. Describe what you need and the research assistant assembles a reading list across all four groups. Summaries are for gameplay — always read the Act itself.</div>
    <form id="legal-search" class="legal-search" autocomplete="off" role="search">
      <input id="legal-q" type="search" value="${esc(G.legalQuery || '')}"
             placeholder="Describe what you need — e.g. “may I search a house at night without a warrant?”"
             aria-label="Search all four groups of the legal library" />
      <button class="btn pri" type="submit">Search</button>
      ${searching ? '<button class="btn gh" type="button" id="legal-clear">Clear</button>' : ''}
    </form>
    <div class="legal-acts" role="tablist" aria-label="Enactment">
      ${acts.map(a => `<button class="btn sm ${a === G.legalAct && !searching ? 'pri' : 'gh'}" data-legal-act="${a}" role="tab" aria-selected="${a === G.legalAct}">${esc(legalActLabel(a))}${G.legalCounts && G.legalCounts[a] ? ` <span class="mono dim" style="font-size:9.5px">${G.legalCounts[a]}</span>` : ''}</button>`).join('')}
    </div>
    <div id="legal-body">${searching ? legalResultsHTML() : legalBodyHTML()}</div>
  </div>`
}

function legalEntryHTML(r, why) {
  const isTarget = Boolean(
    (G.targetLegalSection && String(r.section).toLowerCase().trim() === String(G.targetLegalSection).toLowerCase().trim()) &&
    (!G.targetLegalAct || String(r.act).toUpperCase().trim() === String(G.targetLegalAct).toUpperCase().trim())
  )
  const title = esc(r.title || 'Section ' + r.section)
  const chapText = r.chapter ? esc(r.chapter) : ''
  const badge = r.curated ? '<span class="tag gold">commentary</span>' : ''
  const body = r.plain
    ? `<div class="legalbox" style="margin-top:10px"><div class="lb-h">&#9878; The provision, in substance</div>${esc(r.bare || r.gist || '')}</div>
       <div class="hd" style="font-size:11.5px;color:var(--gold);margin:11px 0 5px">In plain terms</div>
       <p style="font-size:13.5px;line-height:1.65;margin:0 0 11px">${esc(r.plain)}</p>
       <div class="hd" style="font-size:11.5px;color:var(--cyan);margin-bottom:5px">How this is used in the game</div>
       <p style="font-size:13.5px;line-height:1.65;margin:0">${esc(r.in_game || '')}</p>`
    : `<p class="legal-gist">${esc(r.gist || 'No summary has been recovered for this provision. Open the Act itself for the full text.')}</p>`

  return `<details class="legal-row ${isTarget ? 'legal-row-flash' : ''}" data-act="${esc(r.act)}" data-sec="${esc(r.section)}" ${isTarget ? 'open' : ''}>
    <summary class="legal-summary-hdr">
      <div class="legal-row-meta">
        <div class="lrm-left">
          <span class="legal-no mono">${esc(r.act)}&nbsp;s.${esc(r.section)}</span>
          ${badge ? `<span class="lrm-sep"></span><div class="lrm-mid">${badge}</div>` : ''}
        </div>
        ${chapText ? `<div class="lrm-chap-wrap"><span class="lrm-sep lrm-desktop-sep"></span><span class="legal-chap-tag mono" title="${chapText}">${chapText}</span></div>` : ''}
      </div>
      <div class="legal-row-title">${title}</div>
    </summary>
    ${why ? `<div class="legal-why"><span class="mono" style="color:var(--gold);font-size:10px">WHY THIS APPLIES</span> ${esc(why)}</div>` : ''}
    <div class="legal-row-body">${body}</div>
  </details>`
}

function legalBodyHTML() {
  const idx = G.legalIndex
  if (!idx) return '<div class="dim legal-pad">Loading the library…</div>'
  if (idx.act !== G.legalAct) return '<div class="dim legal-pad">Loading the library…</div>'
  const rows = idx.rows || idx.sections || []
  if (!rows.length) return '<div class="dim legal-pad">No provisions in this group.</div>'
  let out = '', chap = null
  for (const r of rows) {
    if (r.chapter && r.chapter !== chap) {
      chap = r.chapter
      out += `<div class="legal-chap-h">${esc(chap)}</div>`
    }
    out += legalEntryHTML(r)
  }
  const total = idx.total || rows.length || 0
  const left = total - rows.length
  if (left > 0) {
    out += `<button class="btn gh legal-more" id="legal-more">Load ${Math.min(80, left)} more of ${total.toLocaleString()}</button>`
  } else {
    out += `<div class="dim legal-end">End of ${total.toLocaleString()} provisions in this group.</div>`
  }
  return out
}

function legalResultsHTML() {
  const res = G.legalResults
  if (!res) return ''
  const results = res.results || res.rows || []
  if (!results.length) {
    if (res.mode === 'loading') {
      return `<div class="dim legal-pad">${esc(res.summary || 'Accessing provision in Legal Library…')}</div>`
    }
    return `<div class="legal-summary warn"><div class="ls-h">&#9878; Nothing matched</div>${esc(res.summary || 'No provision in the library matches that requirement.')} Try plainer words — name the offence, the act you want to perform, or the stage of the case.</div>`
  }
  const label = res.mode === 'ai' ? 'Assistant reading list' : res.mode === 'exact' ? 'Statutory Provision' : 'Keyword matches'
  return `<div class="legal-summary"><div class="ls-h">&#9878; ${label} — ${results.length} shown, ${res.candidates || results.length} shortlisted</div>${esc(res.summary || '')}</div>`
    + results.map(r => legalEntryHTML(r, r.why)).join('')
    + (res.related && res.related.length
      ? `<div class="legal-related"><span class="hd" style="font-size:11.5px;color:var(--gold)">Also worth reading</span><div class="legal-related-list">${res.related.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>`
      : '')
}

async function loadLegalIndex(append) {
  const act = G.legalAct
  const curRows = (G.legalIndex && (G.legalIndex.rows || G.legalIndex.sections)) || []
  const off = append && G.legalIndex ? curRows.length : 0
  try {
    const r = await api(`/legal/index?act=${encodeURIComponent(act)}&offset=${off}&limit=80`)
    const newRows = r.rows || r.sections || []
    if (r.total && G.legalCounts) {
      G.legalCounts[act] = r.total
    }
    G.legalIndex = append && G.legalIndex && G.legalIndex.act === act
      ? { ...r, rows: [...curRows, ...newRows] }
      : { ...r, rows: newRows }
  } catch (e) {
    G.legalIndex = { act, rows: [], total: 0, error: true }
  }
}

function paintLegal() {
  const b = $('#legal-body')
  if (!b || !b.isConnected) return
  b.innerHTML = G.legalResults ? legalResultsHTML() : legalBodyHTML()
  bindLegalBody()

  if (G.targetLegalSection && typeof window.scrollToLegalTarget === 'function') {
    window.scrollToLegalTarget()
  }
}

function bindLegalBody() {
  const m = $('#legal-more')
  if (m) m.onclick = () => { m.textContent = 'Loading…'; loadLegalIndex(true).then(paintLegal) }
}

async function runLegalSearch(q) {
  const b = $('#legal-body')
  if (b) b.innerHTML = '<div class="dim legal-pad">Researching across the BNS, BNSS, BSA and allied statutes…</div>'
  try {
    G.legalResults = await api('/legal/search', { method: 'POST', body: JSON.stringify({ q, act: 'ALL' }) })
  } catch (e) {
    G.legalResults = { results: [], candidates: 0, mode: 'error', summary: 'The research assistant is unavailable. Browse the library by group instead.' }
  }
  paintLegal()
}
window.runLegalSearch = runLegalSearch

/* Shared by the full Legal Library view and the Settings → Legal Library tab. */
function bindLegal() {
  // Only trigger background index load if there are NO active search results and NO search query
  if (!G.legalResults && !G.legalQuery && (!G.legalIndex || G.legalIndex.act !== G.legalAct)) {
    G.legalIndex = null
    loadLegalIndex(false).then(() => {
      if (!G.legalResults && !G.legalQuery) paintLegal()
    })
  }
  const f = $('#legal-search')
  if (f) f.onsubmit = (e) => {
    e.preventDefault()
    const q = (($('#legal-q') || {}).value || '').trim()
    if (q.length < 2) { G.legalResults = null; paintLegal(); return }
    G.legalQuery = q
    runLegalSearch(q)
  }
  const clr = $('#legal-clear')
  if (clr) clr.onclick = () => {
    G.legalResults = null; G.legalQuery = ''
    G.targetLegalAct = null; G.targetLegalSection = null
    const i = $('#legal-q'); if (i) i.value = ''
    render()
  }
  $$('[data-legal-act]').forEach(b => b.onclick = () => {
    G.legalAct = b.dataset.legalAct
    G.legalResults = null
    G.legalIndex = null
    G.targetLegalAct = null; G.targetLegalSection = null
    render()
  })
  bindLegalBody()
}

function formsCodexHTML() {
  return `<div class="card">
    <div class="card-h"><h3>Forms Codex</h3><span class="sp mono dim" style="font-size:11px">${(G.forms || []).length} forms</span></div>
    <div class="helpbox" style="margin-top:0"><div class="hb-h">&#128196; Field by field</div>Every document the game puts in your hands, with guidance on each field and the pitfalls that lose cases.</div>
    ${(G.forms || []).map(f => `
      <div style="padding:12px 0;border-bottom:1px dotted rgba(42,52,67,.7)">
        <div class="flex between"><span class="cond" style="font-size:16px;font-weight:600">${esc(f.title)}</span><span class="tag gold">${esc(f.statute)}</span></div>
        <div style="font-size:12.5px;color:var(--ink3);margin-top:5px">When used: ${esc(f.when_used)}</div>
        <button class="btn sm gh" style="margin-top:8px" data-form="${esc(f.code)}">Open field guidance</button>
      </div>`).join('')}
  </div>`
}

function formCodexModal(f) {
  modal({
    cls: 'wide',
    title: f.title,
    body: `<div class="legalbox"><div class="lb-h">&#9878; ${esc(f.statute)}</div>Used: ${esc(f.when_used)}</div>
      <div class="card"><div class="card-h"><h3>Field-by-field guidance</h3></div>
        ${(f.fields || []).map(x => `<div style="padding:9px 0;border-bottom:1px dotted rgba(42,52,67,.7)">
          <div class="flex between"><span class="cond" style="font-size:14.5px;font-weight:600">${esc(x.field)}</span>${x.required ? '<span class="tag red">required</span>' : '<span class="tag grey">optional</span>'}</div>
          <div style="font-size:13px;margin-top:4px;line-height:1.55;color:var(--ink2)">${esc(x.guidance)}</div>
        </div>`).join('')}
      </div>
      <div class="card" style="border-color:var(--red)"><div class="card-h"><h3 style="color:#ff8b86">&#9888; The pitfalls</h3></div><div style="font-size:13px;line-height:1.65">${esc(f.pitfalls || '')}</div></div>`,
    footer: '<button class="btn" data-close>Close</button>'
  })
}

/* ---------------------------- PLAYER GUIDE ---------------------------- */

VIEWS.guide = function () {
  return head('&#128210;', "Investigating Officer's Handbook", 'Metro Crime Branch &middot; 3rd Edition', '')
  + `${chaptersEditorialNavHTML()}
    <div class="grid g21" style="align-items:start">
      <div class="reader">${guideInlineHTML()}</div>
      <div>
        <div class="card">
          <div class="card-h"><h3>Quick reference</h3></div>
          <div class="flex" style="gap:7px;flex-wrap:wrap">
            <button class="btn sm gh" data-nav="legal">Legal Library</button>
            <button class="btn sm gh" data-nav="settings">Forms Codex</button>
          </div>
          <div class="rule"></div>
          <div class="kv"><span class="k">Case target</span><span class="v">105&ndash;130 minutes</span></div>
          <div class="kv"><span class="k">Acts</span><span class="v">10</span></div>
          <div class="kv"><span class="k">Save</span><span class="v">after every action</span></div>
        </div>
      </div>
    </div>`
}

/* The handbook text lives on the server. Nothing else populated G.guideChapters,
   which is why this view sat on "Handbook loading" forever. Load it lazily here
   (not only at boot) so the handbook also recovers if the initial fetch failed. */
async function loadGuide() {
  if (G.guideLoading || (G.guideChapters || []).length) return
  G.guideLoading = true
  try {
    const g = await api('/guide')
    G.guideChapters = g.chapters || []
    if (!G.chapter && G.guideChapters.length) G.chapter = G.guideChapters[0].id
    if (g.forms && !(G.forms || []).length) G.forms = g.forms
    if (g.refs && !(G.legalRefs || []).length) G.legalRefs = g.refs
    if (G.view === 'guide' || G.view === 'settings') render()
  } catch (e) {
    if (G.view === 'guide' || G.view === 'settings') {
      const el = $('#chap-body')
      if (el) el.innerHTML = '<div class="vacant"><i>&#128210;</i><h3>The handbook could not be loaded</h3><p>' + esc(e.message || String(e)) + '</p><button class="btn" id="guide-retry" style="margin-top:12px">Try again</button></div>'
      const r = $('#guide-retry')
      if (r) r.onclick = () => { G.guideLoading = false; loadGuide() }
    }
  } finally {
    G.guideLoading = false
  }
}

VIEWS.guide.after = function () {
  $$('[data-chapter]').forEach(b => b.onclick = (e) => {
    if (e) e.preventDefault()
    G.chapter = b.dataset.chapter
    render()
    scrollToChapterFocus()
  })
  bindChapterStickyState()
  if (!(G.guideChapters || []).length) loadGuide()
}

function guideInlineHTML() {
  const chs = G.guideChapters || []
  if (!chs.length) return '<div class="vacant"><i>&#128210;</i><h3>Handbook loading</h3></div>'
  const currentIndex = chs.findIndex(c => c.id === G.chapter)
  const idx = currentIndex >= 0 ? currentIndex : 0
  const cur = chs[idx] || chs[0]
  const chNum = String(idx + 1).padStart(2, '0')
  const totalCh = String(chs.length).padStart(2, '0')
  
  const titleParts = (cur.title || '').split('—')
  const mainTitle = titleParts.length > 1 ? titleParts.slice(1).join('—').trim() : cur.title

  const prevCh = idx > 0 ? chs[idx - 1] : null
  const nextCh = idx < chs.length - 1 ? chs[idx + 1] : null

  const paragraphs = cur.body.split(/\n\n+/)
  let isFirstParagraph = true

  const renderedContent = paragraphs.map(p => {
    const lines = p.split('\n')
    // Indented directives / statutory rules
    if (lines.every(l => /^\s{2,}[·•]/.test(l) || /^\s{2}\S/.test(l)) && lines.length > 1) {
      return `
        <div class="chap-directive-box">
          <div class="chap-directive-header">
            <span class="chap-directive-badge">&#9878; OPERATIONAL MANDATE</span>
            <span class="chap-directive-icon">&#128203;</span>
          </div>
          <div class="chap-directive-body">
            ${lines.map(l => {
              const clean = l.replace(/^\s{2,}[·•]\s*/, '').trim()
              return `<div class="chap-directive-line"><span class="chap-bullet">&#9670;</span><span>${formatChapterText(clean)}</span></div>`
            }).join('')}
          </div>
        </div>
      `
    }
    if (/^\s{2}\S/.test(p) || /^\s{2}[·•]/m.test(p)) {
      return `
        <div class="chap-directive-box">
          <div class="chap-directive-header">
            <span class="chap-directive-badge">&#9878; PROCEDURAL PROTOCOL</span>
            <span class="chap-directive-icon">&#128203;</span>
          </div>
          <div class="chap-directive-body">
            ${p.split('\n').map(l => {
              const clean = l.replace(/^\s{2,}[·•]\s*/, '').trim()
              return `<div class="chap-directive-line"><span class="chap-bullet">&#9670;</span><span>${formatChapterText(clean)}</span></div>`
            }).join('')}
          </div>
        </div>
      `
    }

    // Lead paragraph with drop-cap
    if (isFirstParagraph && p.trim().length > 30) {
      isFirstParagraph = false
      const trimmed = p.trim()
      const firstChar = trimmed.charAt(0)
      const rest = trimmed.slice(1)
      return `
        <p class="chap-lead-para">
          <span class="chap-dropcap">${esc(firstChar)}</span>${formatChapterText(rest)}
        </p>
      `
    }

    return `<p class="chap-body-para">${formatChapterText(p)}</p>`
  }).join('')

  return `
    <article class="chap-editorial-dossier" id="chap-body">
      <!-- Chapter Header Hero -->
      <header class="chap-header-hero">
        <div class="chap-hero-meta">
          <span class="chap-hero-eyebrow">&#9878; METRO CRIME BRANCH &bull; DOCTRINE &amp; PROTOCOL</span>
          <span class="chap-hero-seq">CHAPTER ${chNum} OF ${totalCh}</span>
        </div>
        <h1 class="chap-hero-title">${esc(mainTitle)}</h1>
        <div class="chap-hero-divider">
          <span class="chap-divider-line"></span>
          <span class="chap-divider-seal">&#9878;</span>
          <span class="chap-divider-line"></span>
        </div>
      </header>

      <!-- Chapter Rich Content -->
      <div class="chap-prose-content">
        ${renderedContent}
      </div>

      <!-- Chapter Editorial Footer Navigation (Pill Bubbles) -->
      <footer class="chap-nav-footer">
        ${prevCh ? `
          <button type="button" class="chap-pill-btn prev" data-chapter="${prevCh.id}" title="${esc(prevCh.title)}">
            <span class="pill-arr">&larr;</span>
            <span class="pill-label">Prev &middot;</span>
            <span class="pill-title">${esc(prevCh.title.replace(/^Chapter\s*\d+\s*[—\-]\s*/i, ''))}</span>
          </button>
        ` : `<div></div>`}
        ${nextCh ? `
          <button type="button" class="chap-pill-btn next" data-chapter="${nextCh.id}" title="${esc(nextCh.title)}">
            <span class="pill-title">${esc(nextCh.title.replace(/^Chapter\s*\d+\s*[—\-]\s*/i, ''))}</span>
            <span class="pill-label">&middot; Next</span>
            <span class="pill-arr">&rarr;</span>
          </button>
        ` : `<div></div>`}
      </footer>
    </article>
  `
}

/* ---------------------------- CAREER ---------------------------- */

VIEWS.career = function () {
  const p = G.player || {}
  const name = typeof toSentenceCase === 'function' ? toSentenceCase(p.fullName || 'Swetabh Suman') : (p.fullName || 'Swetabh Suman')
  const badgeNo = p.badgeNo || p.badgeNumber || 'MCB-4512'
  const loginId = p.loginId || badgeNo
  const rate = p.casesClosed ? Math.round(((p.convictions || 0) / p.casesClosed) * 100) : 0
  return head('&#127894;', 'Career Record', 'Metro Crime Branch — personal file', `
    <button class="btn gold" id="btn-career-view-badge">&#127894; View Commissioned Badge</button>
    <button class="btn warn" id="btn-career-switch-officer" style="margin-left:8px">Switch Officer</button>
  `)
  + `<div class="grid g4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-v">${esc(p.rank || 'PSI (Probation)')}</div><div class="stat-l">Rank</div></div>
      <div class="stat"><div class="stat-v">${p.standing || 85}</div><div class="stat-l">Standing</div></div>
      <div class="stat ${rate >= 60 ? 'v' : rate > 0 ? 'a' : ''}"><div class="stat-v">${rate}%</div><div class="stat-l">Conviction rate</div></div>
      <div class="stat"><div class="stat-v">${p.casesClosed || 0}</div><div class="stat-l">Cases closed</div></div>
    </div>
    <div class="grid g21" style="align-items:start">
      <div>
        <div class="card">
          <div class="card-h"><h3>Service particulars</h3></div>
          <div class="kv"><span class="k">Name</span><span class="v" style="font-weight:600;color:var(--gold2)">${esc(name)}</span></div>
          <div class="kv"><span class="k">Badge No</span><span class="v mono">${esc(badgeNo)}</span></div>
          <div class="kv"><span class="k">Station Login ID</span><span class="v mono" style="color:var(--gold2)">${esc(loginId)}</span></div>
          <div class="kv"><span class="k">Posting</span><span class="v">${esc(p.posting || 'Crime Branch, Malhar Division')}</span></div>
          <div class="kv"><span class="k">Reputation</span><span class="v">${esc(p.reputation || 'Diligent & Methodical')}</span></div>
          <div class="kv"><span class="k">Integrity</span><span class="v">${Math.round(p.integrity || 92)}/100</span></div>
          <div class="kv"><span class="k">Competence</span><span class="v">${Math.round(p.competence || 88)}/100</span></div>
          <div class="kv"><span class="k">Convictions</span><span class="v">${p.convictions || 0}</span></div>
          <div class="kv"><span class="k">Acquittals</span><span class="v">${p.acquittals || 0}</span></div>
        </div>
        <div class="card">
          <div class="card-h"><h3>Promotion track</h3></div>
          ${[['PSI (Probation)', 'Entry grade. Two cases closed with one conviction.'], ['PSI (Direct)', 'Confirmed. Consistent lawful work.'], ['Inspector', 'Three convictions, and a clean handling record.'], ['ACP', 'A career of convictions without a single tainted exhibit.']].map(([r, req], i) => {
            const order = ['PSI (Probation)', 'PSI (Direct)', 'Inspector', 'ACP']
            const mine = order.indexOf(p.rank)
            const done = i <= (mine >= 0 ? mine : 0)
            return `<div class="check ${done ? 'ok' : ''}"><span class="ci">${done ? '&#10003;' : '&#9675;'}</span><span class="cn"><b>${esc(r)}</b><div class="cd">${esc(req)}</div></span></div>`
          }).join('')}
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-h"><h3>Case record</h3></div>
          ${(G.cases || []).length ? G.cases.map(c => `<div class="kv"><span class="k">№${esc(c.case_no)}</span><span class="v">${esc(c.title).slice(0, 44)}<div class="cd mono dim" style="font-size:10.5px">${esc(c.status)}${c.verdict ? ' · ' + esc(c.verdict) : ''}</div></span></div>`).join('') : '<div class="dim">No cases on record.</div>'}
          <button class="btn gold sm" id="btn-career-archive-launch" style="width:100%;margin-top:12px;font-size:12px;font-weight:700">&#128193; Open Case Archive Modal (Closed Cases &amp; Trials)</button>
        </div>
        <div class="card">
          <div class="card-h"><h3>Assistance used</h3></div>
          <div class="dim" style="font-size:12.5px;margin-bottom:8px">Each aid you keep switched on reduces the standing you earn. Turning them off is a legitimate way to build a reputation.</div>
          ${Object.entries({ legalGuidance: 'Legal Guidance', procedureCoach: 'Procedure Coach', interrogationAid: 'Interrogation Aid', evidenceAid: 'Evidence Analysis Aid', chargeAid: 'Charge-Framing Aid', consequencePreview: 'Consequence Preview' }).map(([k, v]) => `<div class="check ${p.settings && p.settings[k] ? 'no' : 'ok'}"><span class="ci">${p.settings && p.settings[k] ? '&#9888;' : '&#10003;'}</span><span class="cn">${esc(v)} — ${p.settings && p.settings[k] ? 'ON (−score)' : 'off (no penalty)'}</span></div>`).join('')}
        </div>
      </div>
    </div>`
}

VIEWS.career.after = function () {
  const vb = $('#btn-career-view-badge')
  if (vb) vb.onclick = () => openBadgeModal(G.authMember || G.player)
  const cal = $('#btn-career-archive-launch')
  if (cal) cal.onclick = () => window.openCaseArchiveModal && window.openCaseArchiveModal()
  const sb = $('#btn-career-switch-officer')
  if (sb) sb.onclick = () => {
    localStorage.removeItem('cfz_current_member')
    G.authMember = null
    G.applyGatewayMode = 'choose'
    go('apply')
    toast('Logged out', 'Returned to Department Clearance Gateway.', '')
  }
}

/* ---------------------------- ACT 0 — RECRUITMENT & INDUCTION GATEWAY ---------------------------- */

VIEWS.apply = function () {
  const p = G.player || {}
  const mode = G.applyGatewayMode || (!G.authMember ? 'choose' : 'inducted')

  // If already authenticated and not in gateway submode
  if (G.authMember && mode === 'inducted') {
    return `<div class="vacant" style="max-width:540px;margin:20px auto">
      <i>&#127894;</i>
      <h3 style="color:var(--gold2);font-size:20px;margin-bottom:8px">Active Commissioned Officer</h3>
      <p style="font-size:14px;color:var(--ink2);line-height:1.6">Officer <b>${esc(toSentenceCase(p.fullName || 'Swetabh Suman'))}</b> &middot; Badge <b class="mono" style="color:var(--gold2)">${esc(p.badgeNo || 'MCB-4512')}</b><br><span style="font-size:12.5px;color:var(--ink3)">Posted to ${esc(p.posting || 'Crime Branch, Malhar Division')}</span></p>
      <div class="vacant-actions">
        <button class="btn pri lg" data-nav="wall">Go to Case Wall</button>
        <button class="btn gold lg" id="btn-view-badge-apply">&#127894; View Official Badge</button>
        <button class="btn gh" id="btn-switch-officer-apply">Switch Officer / Log Out</button>
      </div>
    </div>`
  }

  // 1. GATEWAY SELECTION PORTAL (Option between New Recruit vs Already a Member)
  if (mode === 'choose') {
    return `
    <div class="portal" style="max-width:760px;margin:16px auto">
      <div class="portal-flag" style="text-align:center">
        <div style="margin-bottom:8px">
          <svg viewBox="0 0 100 100" width="60" height="60" aria-hidden="true" style="filter:drop-shadow(0 2px 8px rgba(200,162,74,.3))">
            <circle cx="50" cy="50" r="46" fill="#141a24" stroke="#c8a24a" stroke-width="3"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#c8a24a" stroke-width="1" stroke-dasharray="3 2"/>
            <path d="M50 18 L55 35 L73 35 L59 46 L64 63 L50 52 L36 63 L41 46 L27 35 L45 35 Z" fill="#c8a24a" opacity="0.95"/>
          </svg>
        </div>
        <h1 style="font-size:24px">CASE FILE ZERO &middot; METRO CRIME BRANCH</h1>
        <p style="max-width:560px;margin:0 auto">Central Clearance &amp; Case Management System. Select your departmental standing to access investigative files.</p>
      </div>

      <div class="gateway-options" style="margin-top:20px">
        <div class="gateway-opt-btn" id="opt-new-recruit">
          <div class="gateway-opt-icon">&#128220;</div>
          <div class="gateway-opt-title">New Recruit Induction</div>
          <div class="gateway-opt-desc">Start afresh: Fill out the application form, sit for the objective screening and written assessments, undergo the selection panel interview, and receive your commissioned badge and login ID.</div>
          <button class="btn pri lg" style="width:100%;margin-top:auto">Begin Induction Flow &rarr;</button>
        </div>

        <div class="gateway-opt-btn" id="opt-already-member">
          <div class="gateway-opt-icon">&#127894;</div>
          <div class="gateway-opt-title">Already a Member</div>
          <div class="gateway-opt-desc">Commissioned officers on duty: Enter your name (case-insensitive) to verify your credentials against the central registry and enter your command desk directly.</div>
          <button class="btn gold lg" style="width:100%;margin-top:auto">Officer Name Log In &rarr;</button>
        </div>
      </div>
    </div>`
  }

  // 2. ALREADY A MEMBER: NAME ENTRY CARD (Case non-sensitive)
  if (mode === 'already_member') {
    return `
    <div class="portal" style="max-width:520px;margin:20px auto">
      <div class="card" style="border-color:var(--gold);padding:20px">
        <div class="card-h">
          <h3>&#127894; Officer Verification</h3>
          <span class="sp tag gold">COMMISSIONED</span>
        </div>
        <div class="helpbox" style="margin:12px 0 16px">
          <div class="hb-h">&#8505; Fast-track Terminal Access</div>
          Enter your full name to authenticate. Name lookup is <b>case-insensitive</b> and formatted into sentence case.
        </div>
        <div class="fld" style="margin-top:14px">
          <label>Officer Full Name <span class="req">*</span></label>
          <input type="text" id="member-name-input" class="doc" placeholder="e.g. Swetabh Suman" autofocus style="font-size:15px;padding:10px 12px;font-weight:600;width:100%;box-sizing:border-box" />
          <div class="hint" style="margin-top:6px;font-size:11.5px;line-height:1.5">Default commissioned officer on record: <b style="color:var(--gold2)">Swetabh Suman</b> (Badge: MCB-4512).</div>
        </div>
        <div class="card-actions-stacked">
          <button class="btn pri lg" id="btn-member-login-submit" style="width:100%">Authenticate &amp; Open Workspace</button>
          <button class="btn gh" id="btn-back-to-portal" style="width:100%">Back to Portal Gateway</button>
        </div>
      </div>
    </div>`
  }

  // 3. NEW RECRUIT PIPELINE
  const A = G.apply || { step: 0 }
  return `<div class="portal">
    <div class="portal-flag">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div>
          <h1>METRO POLICE — CRIME BRANCH</h1>
          <p>Recruitment to the post of <b>Police Sub-Inspector (Investigating Officer)</b>. Complete all stages to earn your commissioned badge and login ID.</p>
        </div>
        <button class="btn gh sm" id="btn-recruit-cancel">&#8592; Back to Portal Gateway</button>
      </div>
      <div class="flex" style="gap:8px;margin-top:14px;flex-wrap:wrap">
        ${step('1', 'Application', A.step >= 1, A.step === 0)}
        ${step('2', 'Objective paper', A.step >= 2, A.step === 1)}
        ${step('3', 'Written assessment', A.step >= 3, A.step === 2)}
        ${step('4', 'Integrity instrument', A.step >= 4, A.step === 3)}
        ${step('5', 'Panel interview', A.step >= 5, A.step === 4)}
        ${step('6', 'Commission & Login', A.step >= 6, A.step === 5)}
      </div>
    </div>
    <div id="apply-body" style="margin-top:16px">${applyBody()}</div>
  </div>`
}

function step(n, label, done, active) {
  return `<span class="tag ${done ? 'green' : active ? 'gold' : 'grey'}">${done ? '&#10003;' : n} ${esc(label)}</span>`
}

function applyBody() {
  const A = G.apply || {}
  const s = A.step || 0
  if (s === 0) return `
    <div class="card">
      <div class="card-h"><h3>&#128220; Detailed Application Form</h3></div>
      ${legalBox('Note on the process', 'Your answers are assessed by the Branch recruitment board against four tests: reasoning, knowledge of law, integrity and temperament. Names will be recorded in official sentence case formatting.', null, null)}
      ${form([
        { id: 'a-name', label: 'Candidate Full Name', req: 1, val: G.apply?.tempName || '', ph: 'Enter full name (e.g. Swetabh Suman)' },
        { id: 'a-callsign', label: 'Preferred Callsign / Alias', req: 0, val: G.apply?.tempCallsign || '', ph: 'e.g. SUMAN, FALCON, VANGUARD' },
        { id: 'a-bio', label: 'Background & Motivation — in your own words', req: 1, val: G.apply?.tempBio || '', ph: 'Education, prior service, why policing, and relevant investigative aptitude.', hint: 'This is read closely by the examination board.' }
      ])}
      <button class="btn pri lg" id="a-next">Submit Application &amp; Begin Objective Screening</button>
    </div>`
  if (s === 1) return `
    <div class="card">
      <div class="card-h"><h3>&#128221; Objective screening paper</h3><span class="sp mono dim" style="font-size:11px">${(A.questions || []).length} questions · pass mark 6</span></div>
      ${(A.questions || []).map((q, i) => `
        <div class="qcard"><div class="qn">QUESTION ${i + 1}</div><div class="qq">${esc(q.q)}</div>
          ${(q.opts || []).map((o, j) => `<div class="opt" data-q="${i}" data-o="${j}"><span class="dot"></span><span>${esc(o)}</span></div>`).join('')}
        </div>`).join('')}
      <button class="btn pri lg" id="a-obj">Submit paper</button>
    </div>`
  if (s === 2) return `
    <div class="card">
      <div class="card-h"><h3>&#9997; Written assessment</h3></div>
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; How this is marked</div>This is assessed on reasoning, lawful instinct, integrity and clarity — not on length or eloquence. Write as an investigator would: what you would do, in what order, and why.</div>
      ${(A.prompts || []).map((pr, i) => `
        <div class="qcard"><div class="qn">ANSWER ${i + 1}</div><div class="qq">${esc(pr.q)}</div>
          <textarea id="sub-${pr.key}" class="doc" rows="7" placeholder="Write your answer."></textarea></div>`).join('')}
      <button class="btn pri lg" id="a-sub">Submit written assessment</button>
    </div>`
  if (s === 3) return `
    <div class="card">
      <div class="card-h"><h3>&#129504; Integrity instrument</h3></div>
      <div class="helpbox" style="margin-top:0"><div class="hb-h">&#8505; Answer honestly</div>There is no correct answer. This instrument exists to see whether your account of yourself is consistent with the way you answer the written and objective sections. Answer as you actually are, not as you think you should be.</div>
      ${[
        { k: 'i1', q: 'When a rule gets in the way of a result I believe in, I am comfortable setting it aside.', opts: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'] },
        { k: 'i2', q: 'I would rather lose a case lawfully than win it by breaking a procedure.', opts: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'] },
        { k: 'i3', q: 'If a colleague falsified a record and I found out, I would report it even though it would hurt the unit.', opts: ['Definitely', 'Probably', 'Unsure', 'Probably not', 'No'] },
        { k: 'i4', q: 'A confession is enough to make me confident of a man\'s guilt.', opts: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'] },
        { k: 'i5', q: 'Under pressure from a senior to make a case stronger, I would shade a witness statement.', opts: ['Yes', 'Possibly', 'Unsure', 'Unlikely', 'Never'] },
        { k: 'i6', q: 'Most people who end up in custody put themselves there.', opts: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'] }
      ].map(x => `<div class="qcard"><div class="qn">INSTRUMENT ITEM</div><div class="qq">${esc(x.q)}</div>
        ${x.opts.map((o, j) => `<div class="opt" data-i="${x.k}" data-o="${j}"><span class="dot"></span><span>${esc(o)}</span></div>`).join('')}</div>`).join('')}
      <button class="btn pri lg" id="a-psy">Submit instrument</button>
    </div>`
  if (s === 4) {
    const tx = A.transcript || []
    return `<div class="card">
      <div class="card-h"><h3>&#128220; Selection panel interview</h3><span class="sp mono dim" style="font-size:11px">Panel: DIG K. Ranade · Senior Prosecutor Adv. Mehta · ACP V. Nadkarni</span></div>
      ${legalBox('Before you answer', 'The panel will press on what you have just said. Answer as an investigator, not as a candidate. Where you are unsure of the law, say so honestly; a candid "I would check the provision" is a better answer than a confident wrong one.', null, null)}
      ${tx.length ? tx.map(t => `<div class="examiner"><div class="who">${esc(t.speaker)}</div><div class="said">${nl(t.text)}</div>
        ${t.assessment ? `<div class="dim" style="font-size:12px;margin-top:8px;font-style:italic">${esc(t.assessment)}</div>` : ''}</div>`).join('') : `<div class="examiner"><div class="who">Waiting</div><div class="said">Press "Begin the interview" to be called before the panel.</div></div>`}
      <div class="fld"><label>Your answer</label><textarea id="iv-ans" rows="4" placeholder="Type your answer to the panel."></textarea></div>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        <button class="btn pri" id="a-iv">${tx.length ? 'Answer' : 'Begin the interview'}</button>
        ${tx.length >= 4 ? `<button class="btn gh" id="a-iv-end">Conclude and await the board's decision</button>` : ''}
      </div>
      <div class="dim mono" style="font-size:11px;margin-top:9px">Running panel score: ${A.runningScore ?? '—'}/100 · ${tx.filter(t => t.speaker === 'You').length} answer(s) given</div>
    </div>`
  }
  if (s === 5) {
    const r = A.result || {}
    const officerObj = {
      fullName: A.candidateName || G.player?.fullName || 'Investigating Officer',
      badgeNumber: A.badge || 'MCB-5104',
      loginId: A.loginId || ('MCB-LID-' + Math.floor(100000 + Math.random() * 900000)),
      rank: A.rank || 'PSI (Probation)',
      posting: A.posting || 'Crime Branch, Malhar Division',
      clearanceLevel: 3
    }
    A.loginId = officerObj.loginId

    return `<div class="card" style="border-color:var(--gold)">
      <div class="card-h">
        <h3>&#127894; Official Appointment &amp; Commission Conferred</h3>
        <span class="sp tag green">PASSED &amp; INDUCTED</span>
      </div>

      <div style="margin:20px 0">
        ${renderOfficerBadgeHTML(officerObj)}
      </div>

      <div class="card" style="background:rgba(200,162,74,0.06);border:1px dashed var(--gold);padding:18px;margin:18px 0;text-align:center">
        <div style="font-family:var(--font-head);font-size:16px;color:var(--gold2);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px">
          &#128273; YOUR UNIQUE LOGIN ID
        </div>
        <div style="font-family:var(--font-mono);font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.15em;background:#0d1117;display:inline-block;padding:8px 18px;border:1px solid #c8a24a;border-radius:4px;margin-bottom:8px">
          ${esc(officerObj.loginId)}
        </div>
        <div style="font-size:12.5px;color:var(--ink3)">
          Please retain this Login ID. You must enter it below to authenticate and activate your Crime Branch Command Workspace.
        </div>
      </div>

      <div class="card" style="background:#111620;border:1px solid var(--line2);padding:18px">
        <div class="card-h"><h3 style="font-size:15px">&#128272; Terminal Clearance Login</h3></div>
        <div class="fld">
          <label>Enter Conferred Login ID to Activate Desk</label>
          <input type="text" id="recruit-login-id" class="doc mono" placeholder="Enter ${esc(officerObj.loginId)}" style="font-size:16px;padding:10px 12px;letter-spacing:0.1em" />
        </div>
        <button class="btn pri lg" id="a-recruit-login-btn" style="width:100%;margin-top:10px">Verify Login ID &amp; Open Command Workspace</button>
      </div>
    </div>`
  }
  return '<div class="card"><div class="dim">Application not started.</div></div>'
}

VIEWS.apply.after = async function () {
  const mode = G.applyGatewayMode || (!G.authMember ? 'choose' : 'inducted')

  // Button to view badge if already inducted
  const vb = $('#btn-view-badge-apply')
  if (vb) vb.onclick = () => openBadgeModal(G.authMember || G.player)
  const so = $('#btn-switch-officer-apply')
  if (so) so.onclick = () => {
    localStorage.removeItem('cfz_current_member')
    G.authMember = null
    G.applyGatewayMode = 'choose'
    render()
    toast('Logged out', 'Returned to Department Clearance Gateway.', '')
  }

  // Gateway selection handlers
  const optNew = $('#opt-new-recruit')
  if (optNew) {
    optNew.onclick = () => {
      G.applyGatewayMode = 'new_recruit'
      G.apply = { step: 0 }
      render()
    }
  }

  const optMember = $('#opt-already-member')
  if (optMember) {
    optMember.onclick = () => {
      G.applyGatewayMode = 'already_member'
      render()
    }
  }

  // Already a member login submission
  const memberLoginBtn = $('#btn-member-login-submit')
  if (memberLoginBtn) {
    const handleLogin = () => {
      const inputEl = $('#member-name-input')
      const enteredName = (inputEl ? inputEl.value : '').trim()
      if (!enteredName || enteredName.length < 2) {
        toast('Name Required', 'Please enter your officer name.', 'warn')
        return
      }

      const formattedName = toSentenceCase(enteredName)
      const members = getRegisteredMembers()
      const match = members.find(m => m && m.fullName && m.fullName.toLowerCase() === enteredName.toLowerCase())

      if (match) {
        G.authMember = match
        localStorage.setItem('cfz_current_member', match.fullName)
        applyPlayer({
          ...G.player,
          fullName: match.fullName,
          badgeNo: match.badgeNumber,
          loginId: match.loginId || match.badgeNumber,
          rank: match.rank || 'PSI (Probation)',
          posting: match.posting || 'Crime Branch, Malhar Division',
          applicationState: 'inducted'
        })
        G.applyGatewayMode = 'inducted'
        toast('Officer Verified', `Welcome back, Officer ${match.fullName}. Command desk loaded.`, 'good')
        go('wall')
      } else {
        toast('Officer Record Not Found', `No commissioned file found for "${formattedName}". Please verify spelling or start as a New Recruit.`, 'crit')
      }
    }

    memberLoginBtn.onclick = handleLogin
    const inputEl = $('#member-name-input')
    if (inputEl) {
      inputEl.onkeydown = (e) => { if (e.key === 'Enter') handleLogin() }
    }
  }

  const backToPortalBtn = $('#btn-back-to-portal')
  if (backToPortalBtn) {
    backToPortalBtn.onclick = () => {
      G.applyGatewayMode = 'choose'
      render()
    }
  }

  const cancelRecruitBtn = $('#btn-recruit-cancel')
  if (cancelRecruitBtn) {
    cancelRecruitBtn.onclick = () => {
      G.applyGatewayMode = 'choose'
      render()
    }
  }

  // New Recruit Step Handlers
  const A = G.apply || {}
  if (A.step === 0) {
    const b = $('#a-next')
    if (b) b.onclick = () => act(async () => {
      const rawName = ($('#a-name') || {}).value.trim() || ''
      const callsign = ($('#a-callsign') || {}).value.trim() || ''
      const bio = ($('#a-bio') || {}).value.trim() || ''
      if (rawName.length < 3) { toast('Name required', 'Enter your full name.', 'warn'); return }
      if (bio.length < 20) { toast('Background too brief', 'Please write a brief summary for the board.', 'warn'); return }

      const name = toSentenceCase(rawName)
      G.apply = { ...G.apply, tempName: name, tempCallsign: callsign, tempBio: bio }
      const r = await api('/player', { method: 'POST', body: JSON.stringify({ fullName: name, bio }) })
      if (r) mergeBundle(r)
      const q = await api('/apply/questions')
      G.apply = { ...G.apply, step: 1, candidateName: name, questions: (q.questions || []).map(x => ({ ...x, opts: OBJECTIVE_OPTS(x.i) })) }
      render()
    })
  }

  if (A.step === 1) {
    $$('[data-q]').forEach(el => el.onclick = () => {
      const i = el.dataset.q
      $$(`[data-q="${i}"]`).forEach(x => { x.classList.remove('on'); x.querySelector('.dot').style.background = '' })
      el.classList.add('on')
      el.querySelector('.dot').style.background = 'radial-gradient(circle,var(--gold) 42%,transparent 44%)'
      G.apply.answers = { ...(G.apply.answers || {}), [i]: el.textContent.trim() }
    })
    const b = $('#a-obj')
    if (b) b.onclick = () => act(async () => {
      const r = await api('/apply/objective', { method: 'POST', body: JSON.stringify({ answers: G.apply.answers || {} }) })
      const pr = await api('/apply/subjective')
      G.apply = { ...G.apply, step: 2, prompts: pr.prompts, objResult: r }
      render()
      toast('Paper assessed', `${r.correct || 6} questions assessed.`, 'good')
    })
  }

  if (A.step === 2) {
    const b = $('#a-sub')
    if (b) b.onclick = () => act(async () => {
      const answers = (A.prompts || []).map(p => ({ key: p.key, answer: ($('#sub-' + p.key) || {}).value || '' }))
      toast('Assessing…', 'The recruitment board is reading your written assessment.', '')
      const r = await api('/apply/subjective', { method: 'POST', body: JSON.stringify({ answers }) })
      G.apply = { ...G.apply, step: 3, result: r.result, passed: true }
      render()
      toast('Shortlisted for interview', 'Proceed to the integrity instrument.', 'good')
    })
  }

  if (A.step === 3) {
    const ans = {}
    $$('[data-i]').forEach(el => el.onclick = () => {
      const k = el.dataset.i
      $$(`[data-i="${k}"]`).forEach(x => { x.classList.remove('on'); x.querySelector('.dot').style.background = '' })
      el.classList.add('on')
      el.querySelector('.dot').style.background = 'radial-gradient(circle,var(--gold) 42%,transparent 44%)'
      ans[k] = el.textContent.trim()
    })
    const b = $('#a-psy')
    if (b) b.onclick = () => act(async () => {
      await api('/apply/psychometric', { method: 'POST', body: JSON.stringify(ans) })
      G.apply = { ...G.apply, step: 4, transcript: [], runningScore: 65 }
      render()
    })
  }

  if (A.step === 4) {
    const send = async () => {
      const ta = $('#iv-ans'); const text = ta.value.trim()
      const tx = A.transcript || []
      if (tx.length && text.length < 3) { toast('Answer required', 'The panel is waiting.', 'warn'); return }
      await act(async () => {
        const r = await api('/apply/interview', { method: 'POST', body: JSON.stringify({
          turn: tx.length, transcript: tx.map(t => ({ speaker: t.speaker, text: t.text })),
          lastAnswer: text, asked: tx.filter(t => t.speaker !== 'You').map(t => t.text), runningScore: A.runningScore
        }) })
        const t = r.turn || {
          speaker: 'DIG K. Ranade',
          examiner_reply: 'Your responses reflect solid comprehension of evidentiary requirements.',
          candidate_last_answer_assessment: 'Approved.',
          running_score: 88,
          interview_complete: true,
          acknowledgement: 'Board evaluation completed.'
        }
        const newTx = [...tx]
        if (tx.length) newTx.push({ speaker: 'You', text })
        newTx.push({ speaker: t.speaker, text: t.examiner_reply, assessment: t.candidate_last_answer_assessment })
        G.apply = { ...A, step: 4, transcript: newTx, runningScore: t.running_score, complete: t.interview_complete }
        render()
        toast(t.speaker, (t.acknowledgement || '').slice(0, 140), '')
      })
    }
    const b = $('#a-iv'); if (b) b.onclick = send
    const e = $('#a-iv-end')
    if (e) e.onclick = () => act(async () => {
      toast('Recording the board\'s decision…', 'Commission conferred.', '')
      const r = await api('/apply/finalize', { method: 'POST', body: JSON.stringify({ runningScore: A.runningScore || 80 }) })
      const genBadge = 'MCB-' + Math.floor(1000 + Math.random() * 9000)
      const genLoginId = 'MCB-LID-' + Math.floor(100000 + Math.random() * 900000)
      const candidateName = toSentenceCase(A.candidateName || G.player?.fullName || 'Investigating Officer')

      G.apply = {
        ...A,
        step: 5,
        candidateName,
        badge: r.badge || genBadge,
        loginId: genLoginId,
        rank: r.rank || 'PSI (Probation)',
        posting: r.posting || 'Crime Branch, Malhar Division'
      }
      render()
      toast('Commission Conferred', `Badge ${G.apply.badge} generated. Copy your Login ID to log in.`, 'good')
    })
  }

  if (A.step === 5) {
    const loginInput = $('#recruit-login-id')
    const loginSubmitBtn = $('#a-recruit-login-btn')

    const verifyRecruitLogin = () => act(async () => {
      const enteredId = (loginInput ? loginInput.value : '').trim()
      const expectedId = (A.loginId || '').trim()

      if (!enteredId) {
        toast('Login ID Required', 'Please enter your generated Login ID.', 'warn')
        return
      }

      if (enteredId.toLowerCase() !== expectedId.toLowerCase()) {
        toast('Invalid Login ID', `Entered Login ID does not match "${expectedId}".`, 'crit')
        return
      }

      // Successful login for new recruit
      const newOfficer = {
        fullName: toSentenceCase(A.candidateName || 'Investigating Officer'),
        badgeNumber: A.badge || 'MCB-5104',
        loginId: expectedId,
        rank: A.rank || 'PSI (Probation)',
        posting: A.posting || 'Crime Branch, Malhar Division',
        clearanceLevel: 3,
        standing: 80,
        careerScore: 500,
        casesClosed: 0,
        convictions: 0,
        dateCommissioned: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      }

      saveRegisteredMember(newOfficer)
      localStorage.setItem('cfz_current_member', newOfficer.fullName)
      G.authMember = newOfficer

      applyPlayer({
        ...G.player,
        fullName: newOfficer.fullName,
        badgeNo: newOfficer.badgeNumber,
        loginId: newOfficer.loginId,
        rank: newOfficer.rank,
        posting: newOfficer.posting,
        applicationState: 'inducted'
      })

      const bp = { blueprint: 'flagship', difficulty: 'Sub-Inspector' }
      const r = await api('/cases/new', { method: 'POST', body: JSON.stringify(bp) })
      if (r) mergeBundle(r)
      await refreshBootstrap()

      G.apply = null
      G.applyGatewayMode = 'inducted'
      G.view = 'wall'
      render()
      toast('Induction Complete', `Welcome to the Force, Officer ${newOfficer.fullName}. Your command desk is active.`, 'good')
    })

    if (loginSubmitBtn) loginSubmitBtn.onclick = verifyRecruitLogin
    if (loginInput) loginInput.onkeydown = (e) => { if (e.key === 'Enter') verifyRecruitLogin() }
  }
}

/* Objective paper options — mirrors the server bank, presented as choices. */
function OBJECTIVE_OPTS(i) {
  const BANK = {
    0: ['Yes — theft under BNS s.303 is cognizable, so an FIR must be registered.', 'No — the owner should file a civil suit for recovery.', 'Only if the value exceeds ₹1,00,000.', 'Register it only after the owner produces purchase bills.'],
    1: ['Wait for or arrange a second independent witness before completing the seizure list.', 'Proceed with one witness and note the shortfall later.', 'Have a constable sign as the second witness.', 'Take the shirt without any memo and mention it in the diary.'],
    2: ['Only so much of the information as led to the recovery of the knife, if made before two respectable witnesses.', 'The whole confession, because he was in custody.', 'The whole confession, if read over and signed.', 'Nothing at all, ever.'],
    3: ['A hashed copy and a dual-signed certificate under BSA s.63.', 'A letter from the shop owner identifying the footage.', 'A screenshot printed from the DVR.', 'A statement from the officer who viewed it.'],
    4: ['The accused becomes entitled to default bail.', 'The court grants an automatic extension of 30 days.', 'Nothing — the limitation runs from arrest, not the FIR.', 'The investigation must be handed to another officer.'],
    5: ['No — informer information alone is not proof; you need lawful material and reasonable suspicion.', 'Yes, if the informer signs a statement.', 'Yes, if two persons corroborate the informer.', 'Yes, because informer information is admissible under BSA s.23.'],
    6: ['He becomes hostile; the prosecution loses his evidence and must stand on the rest of the proof.', 'His first statement is automatically accepted as true.', 'The evidence is discarded and the trial collapses.', 'He can be prosecuted for perjury and his evidence retained.'],
    7: ['Obtain a production summons or seek the appropriate process to compel production.', 'File the FIR and let the court order it later.', 'Seize the records without any process.', 'Ask the bank informally and record what you are told.'],
    8: ['Its recovery and identity become doubtful and its weight is heavily reduced.', 'It is still admissible because the object itself is physical.', 'The seizure memo repairs the omission.', 'The laboratory report cures the defect.'],
    9: ['Acquittal — none of that material is admissible.', 'Conviction — the confession is enough.', 'Conviction — the evidence is strong in substance.', 'The court would order further investigation and continue the case.'],
    10: ['The parties, the offences, the witnesses, the exhibits/documents and the brief facts of the case.', 'Only the accused\'s name and the offence.', 'A recommendation of the punishment you consider appropriate.', 'A summary of the interrogation only.'],
    11: ['Refuse and record the account faithfully — fabrication destroys the witness and the case.', 'Record it the way the prosecution needs it, since the substance is true.', 'Tell the witness what to say so the statement is consistent.', 'Leave the statement blank and depose later.'],
    12: ['Unlawful — arrest requires recorded grounds and necessity, and motives must be lawful.', 'Permissible — the arrest is lawful for a cognizable offence.', 'Permissible if a senior approves.', 'Permissible if he is released within 24 hours.'],
    13: ['A provable discovery — admissible to the extent of the fact discovered.', 'An inadmissible confession.', 'Admissible only if he signs it.', 'Relevant only if the property is identified by the owner later.'],
    14: ['Identify the overreach, seek clarification or a re-test, and not build the case on the overreach alone.', 'Accept the conclusion — an expert has said it.', 'Charge the accused on the expert conclusion alone.', 'Suppress the report and rely on other evidence.']
  }
  return BANK[i] || ['Option A', 'Option B', 'Option C', 'Option D']
}

/* ---------------------------- KEYBOARD ---------------------------- */

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) { if (e.key !== 'Escape') return }
  const k = e.key.toLowerCase()

  // Escape unwinds the overlays in the order they were opened: modal, then the
  // open dropdown, then the notepad drawer.
  if (e.key === 'Escape') {
    const v = document.querySelector('.veil')
    if (v) { v.remove(); return }
    if (G.menu) { closeMenus(); return }
    if (G.npOpen) { G.npOpen = false; const n = $('#notepad'); if (n) n.classList.remove('open'); return }
    return
  }
  // '/' focuses the first search box on the screen, as in a case-management tool
  if (k === '/') { const f = document.querySelector('#work input[type=text],#work input[type=search]'); if (f) { e.preventDefault(); f.focus() } return }
  if (k === 'h') { helpForScreen(); return }
  const map = {
    w: 'wall', c: 'chat', d: 'desk', s: 'scene', l: 'labs', b: 'board', p: 'pois',
    i: 'interrogation', f: 'charge', t: 'court', g: 'guide', ',': 'settings',
    y: 'diary', k: 'legal', r: 'career', a: 'team', m: 'apply'
  }
  // route through go() so the FIR guard, the menu close and the section reset
  // all happen exactly as they do for a mouse click
  if (map[k]) { e.preventDefault(); go(map[k]) }
})

/* ---------------------------- AGENT TASK MODAL & QUEUE ---------------------------- */

let _activeTaskTimer = null
window.__cfzTaskTimers = window.__cfzTaskTimers || {}
window.__cfzDirectives = window.__cfzDirectives || {}
window.__cfzActiveDirective = window.__cfzActiveDirective || null

function stopTaskTimer() {
  if (_activeTaskTimer) {
    clearInterval(_activeTaskTimer)
    _activeTaskTimer = null
  }
}

function getDirectiveTaskKey(dir, activeAssign, memberName) {
  if (dir && dir.id) return 'dir_' + dir.id
  if (activeAssign && activeAssign.id) return 'assign_' + activeAssign.id
  if (memberName) return 'member_' + String(memberName).replace(/\s+/g, '_').toLowerCase()
  return 'active_global_task'
}

function resolveAuthoritativeDirective(dirInput, memberId) {
  let parsed = dirInput
  if (typeof parsed === 'string') {
    if (window.__cfzDirectives && window.__cfzDirectives[parsed]) {
      parsed = window.__cfzDirectives[parsed]
    } else {
      try { parsed = JSON.parse(parsed) } catch (e) {}
    }
  }

  const dirId = parsed && parsed.id ? parsed.id : null

  // 1. Check in G.snapshot.directiveQueue
  if (dirId && G.snapshot && Array.isArray(G.snapshot.directiveQueue)) {
    const found = G.snapshot.directiveQueue.find(q => String(q.id) === String(dirId))
    if (found) {
      window.__cfzDirectives[found.id] = found
      return found
    }
  }

  // 2. Check in G.snapshot.assignments
  if (G.snapshot && Array.isArray(G.snapshot.assignments)) {
    if (dirId) {
      const match = G.snapshot.assignments.find(a => a.result_json?.directive?.id === dirId)
      if (match && match.result_json?.directive) {
        window.__cfzDirectives[dirId] = match.result_json.directive
        return match.result_json.directive
      }
    }
    if (memberId) {
      const match = G.snapshot.assignments.find(a => 
        (a.member_id === memberId || a.member === memberId || a.member_id === Number(memberId)) &&
        a.status === 'running'
      )
      if (match && match.result_json?.directive) {
        if (match.result_json.directive.id) window.__cfzDirectives[match.result_json.directive.id] = match.result_json.directive
        return match.result_json.directive
      }
    }
  }

  // 3. Check window.__cfzDirectives
  if (dirId && window.__cfzDirectives && window.__cfzDirectives[dirId]) {
    return window.__cfzDirectives[dirId]
  }

  // 4. Return parsed and register in memory and snapshot
  if (parsed && typeof parsed === 'object') {
    if (parsed.id) {
      window.__cfzDirectives[parsed.id] = parsed
      G.snapshot = G.snapshot || {}
      G.snapshot.directiveQueue = G.snapshot.directiveQueue || []
      if (!G.snapshot.directiveQueue.some(q => q.id === parsed.id)) {
        G.snapshot.directiveQueue.push(parsed)
      }
    }
    return parsed
  }

  return null
}

function isDirectiveActive(dirInput) {
  const dir = resolveAuthoritativeDirective(dirInput)
  if (!dir) return false
  if (dir.status === 'completed') return false
  const subTasks = dir.subTasks || []
  if (subTasks.length > 0 && subTasks.every(s => s.status === 'completed' || s.status === 'completed_by_player')) {
    return false
  }
  if (G.snapshot) {
    if (dir.id && Array.isArray(G.snapshot.directiveQueue)) {
      const queued = G.snapshot.directiveQueue.find(q => String(q.id) === String(dir.id))
      if (queued && (queued.status === 'completed' || (queued.subTasks && queued.subTasks.length > 0 && queued.subTasks.every(s => s.status === 'completed' || s.status === 'completed_by_player')))) {
        return false
      }
    }
    if (Array.isArray(G.snapshot.assignments)) {
      const matchingAssign = G.snapshot.assignments.find(a => (dir.id && a.result_json?.directive?.id === dir.id) || (a.member === dir.memberName && a.description === dir.playerInstruction))
      if (matchingAssign && matchingAssign.status === 'completed') {
        return false
      }
    }
  }
  return true
}
window.isDirectiveActive = isDirectiveActive

function getOrCreateTaskTimer(taskKey, durationSec = 15, currentStepIndex = 0) {
  if (!taskKey) taskKey = 'active_global_task'
  let timerInfo = window.__cfzTaskTimers[taskKey]

  if (!timerInfo) {
    try {
      const saved = localStorage.getItem('cfz_timer_' + taskKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.startTime) {
          const elapsed = (Date.now() - parsed.startTime) / 1000
          if (elapsed < (parsed.totalDurationSec || 15) + 30 && parsed.stepIndex === currentStepIndex) {
            timerInfo = parsed
          }
        }
      }
    } catch (e) {}
  }

  if (!timerInfo || timerInfo.stepIndex !== currentStepIndex) {
    timerInfo = {
      startTime: Date.now(),
      totalDurationSec: durationSec || 15,
      stepIndex: currentStepIndex
    }
  }

  window.__cfzTaskTimers[taskKey] = timerInfo
  try {
    localStorage.setItem('cfz_timer_' + taskKey, JSON.stringify(timerInfo))
  } catch(e) {}

  return timerInfo
}

function applyClientDirectiveEffects(dir, subTask) {
  if (!G.snapshot) return
  const taskLower = ((dir?.playerInstruction || '') + ' ' + (subTask?.description || '') + ' ' + (subTask?.title || '')).toLowerCase()
  const memberName = dir?.memberName || 'Squad Member'

  // Scene Processing
  if (taskLower.includes('cordon') || taskLower.includes('walkthrough') || taskLower.includes('scene') || taskLower.includes('spot') || taskLower.includes('photograph') || taskLower.includes('diagram') || taskLower.includes('canvass') || taskLower.includes('seal') || taskLower.includes('gather') || taskLower.includes('evidence') || taskLower.includes('seiz')) {
    if (G.snapshot.scene) {
      G.snapshot.scene.cordoned = true
      G.snapshot.scene.walkthrough = true
      if (taskLower.includes('photo') || taskLower.includes('core') || taskLower.includes('sweep') || taskLower.includes('evidence') || taskLower.includes('seiz') || taskLower.includes('all')) G.snapshot.scene.photographed = true
      if (taskLower.includes('diag') || taskLower.includes('grid') || taskLower.includes('core') || taskLower.includes('evidence') || taskLower.includes('seiz') || taskLower.includes('all')) G.snapshot.scene.diagrammed = true
      if (taskLower.includes('canvass') || taskLower.includes('witness') || taskLower.includes('all')) G.snapshot.scene.canvassed = true
      if (taskLower.includes('seal') || taskLower.includes('close') || taskLower.includes('finish') || taskLower.includes('file') || taskLower.includes('all')) G.snapshot.scene.sealed = true
    }
  }

  // Exhibits & Seizure Checkboxes
  if (taskLower.includes('exhibit') || taskLower.includes('evidence') || taskLower.includes('seiz') || taskLower.includes('find') || taskLower.includes('gather') || taskLower.includes('collect') || taskLower.includes('recover') || taskLower.includes('sweep') || taskLower.includes('cutter') || taskLower.includes('bag') || taskLower.includes('weapon') || taskLower.includes('malkhana') || taskLower.includes('all')) {
    (G.snapshot.exhibits || []).forEach(e => {
      e.found = true
      e.seized = true
      e.tainted = false
      e.admissibility = 'admissible'
      e.seizureValid = true
      e.seizureMethod = 'Section 105 BNSS videographed seizure'
      e.panchas = (e.panchas && e.panchas.length >= 2) ? e.panchas : ['Panch 1 (Local Independent Trader)', 'Panch 2 (Independent Resident)']
      e.admissibilityNotes = 'Seized before two independent panch witnesses under BNSS s.103 with videography (BNSS s.105).'
      e.weight = e.isDigital ? 30 : 25
      if (e.isDigital) {
        e.s63Certified = true
        e.s63_certified = true
        e.hasCert63 = true
        e.s63SignerA = memberName
        e.s63SignerB = 'Digital Forensics Specialist'
      }
      e.custodyChain = e.custodyChain || []
      if (!e.custodyChain.some(c => c.action && c.action.includes('BNSS s.103'))) {
        e.custodyChain.push({
          date: new Date().toISOString().substring(0, 10),
          handler: memberName,
          action: 'Validly seized and deposited into Malkhana under BNSS s.103'
        })
      }
    })
  }

  // Labs
  if (taskLower.includes('lab') || taskLower.includes('fsl') || taskLower.includes('forensic') || taskLower.includes('ballistic') || taskLower.includes('dna') || taskLower.includes('fingerprint') || taskLower.includes('cctv') || taskLower.includes('cyber')) {
    (G.snapshot.labRequests || []).forEach(lr => {
      lr.status = 'ready'
      lr.result = 'Laboratory test results certified and received under BNSS s.329.'
    });
    (G.snapshot.exhibits || []).forEach(e => {
      if (e.labStatus || e.isDigital) {
        e.labStatus = 'collected'
        e.labResult = 'Forensic laboratory report confirmed admissible.'
        e.weight = (e.weight || 25) + 10
      }
    })
  }

  // Interrogations & Statements
  if (taskLower.includes('interrogat') || taskLower.includes('statement') || taskLower.includes('witness') || taskLower.includes('suspect') || taskLower.includes('examine') || taskLower.includes('alibi')) {
    (G.snapshot.persons || []).forEach(p => {
      p.examined = true
      p.statementRecorded = true
      p.statement = p.statement || `Examination completed by ${memberName} under BNSS s.180.`
    })
    G.snapshot.recoveries = G.snapshot.recoveries || []
    if (G.snapshot.recoveries.length === 0) {
      G.snapshot.recoveries.push({
        id: Date.now(),
        title: 'Section 23 BSA Corroborative Recovery',
        description: 'Locatable weapon/article recovered pursuant to accused disclosure before two independent witnesses.',
        s23_valid: true,
        witnesses: ['Independent Witness A', 'Independent Witness B'],
        weight: 30
      })
    }
  }

  // Acts Progress
  if (Array.isArray(G.snapshot.acts)) {
    const act2 = G.snapshot.acts.find(a => a.act === 2 || a.name?.includes('Scene'))
    if (act2 && G.snapshot.scene && G.snapshot.scene.sealed) {
      act2.done = act2.total || 9
      act2.pct = 100
      act2.state = 'complete'
    }
    const act3 = G.snapshot.acts.find(a => a.act === 3 || a.name?.includes('Evidence'))
    if (act3) {
      const seizedCount = (G.snapshot.exhibits || []).filter(e => e.seized && e.admissibility === 'admissible').length
      act3.done = Math.max(act3.done || 0, seizedCount)
      act3.pct = Math.round((act3.done / (act3.total || 4)) * 100)
      if (act3.pct >= 100) act3.state = 'complete'
    }
  }
}

async function advanceActiveDirectiveStep(dirContext, taskKey, timerTextId, progressBarId) {
  let dir = resolveAuthoritativeDirective(dirContext)
  if (!dir && window.__cfzActiveDirective) {
    dir = resolveAuthoritativeDirective(window.__cfzActiveDirective)
  }
  if (!dir || dir.status === 'completed' || dir._isAdvancing || dir._completing) {
    stopTaskTimer()
    return
  }
  dir._isAdvancing = true

  try {
    const subTasks = dir.subTasks || []
    let activeIdx = subTasks.findIndex(s => s.status === 'running')
    if (activeIdx === -1) {
      activeIdx = subTasks.findIndex(s => s.status === 'pending')
    }

    const caseId = (G.snapshot && G.snapshot.caseId) || (G.player && G.player.activeCaseId) || 2

    if (activeIdx !== -1) {
      subTasks[activeIdx].status = 'completed'
      applyClientDirectiveEffects(dir, subTasks[activeIdx])
    }

    const nextIdx = subTasks.findIndex(s => s.status === 'pending')

    if (nextIdx !== -1) {
      // Advance to next step in sequence
      subTasks[nextIdx].status = 'running'
      dir.status = 'running'
      window.__cfzActiveDirective = dir
      if (dir.id) window.__cfzDirectives[dir.id] = dir
      
      // Reset timer for next step
      const canonicalKey = getDirectiveTaskKey(dir, null, dir.memberName)
      window.__cfzTaskTimers[canonicalKey] = {
        startTime: Date.now(),
        totalDurationSec: 15,
        stepIndex: nextIdx
      }
      try {
        localStorage.setItem('cfz_timer_' + canonicalKey, JSON.stringify(window.__cfzTaskTimers[canonicalKey]))
      } catch(e) {}

      try {
        if (window.playSfx) playSfx('tap')
        toast('Task Step Advanced', `Completed: "${subTasks[activeIdx]?.title || 'Step'}". Now running: "${subTasks[nextIdx]?.title}"`, 'good')
      } catch(e){}

      // Sync step to server
      try {
        api(`/cases/${caseId}/directive/step`, {
          method: 'POST',
          body: JSON.stringify({ directiveId: dir.id, subtaskIndex: activeIdx })
        }).then(res => {
          if (res && res.bundle) {
            mergeBundle(res.bundle)
            render()
          }
        }).catch(err => console.warn('Step sync error:', err))
      } catch(e){}

      // Re-render open modal so the next task comes to the top
      if (document.getElementById('modal-task-view')) {
        openDirectiveTaskModal(dir)
      } else {
        startLiveProgressTimer(timerTextId, progressBarId, canonicalKey, dir)
      }
    } else {
      // All subtasks done -> complete directive cleanly and prevent looping
      dir._completing = true
      dir.status = 'completed'
      stopTaskTimer()
      applyClientDirectiveEffects(dir, null)
      const canonicalKey = getDirectiveTaskKey(dir, null, dir.memberName)
      delete window.__cfzTaskTimers[canonicalKey]
      try {
        localStorage.removeItem('cfz_timer_' + canonicalKey)
      } catch(e) {}

      if (window.__cfzActiveDirective && (window.__cfzActiveDirective.id === dir.id || window.__cfzActiveDirective.status === 'completed')) {
        window.__cfzActiveDirective = null
      }

      const modalEl = document.getElementById('modal-task-view')
      if (modalEl) {
        modalEl.remove()
      }

      if (window.playSfx) playSfx('mile')
      toast('All Tasks Completed & Synced', `All tasks finished for "${dir.playerInstruction || 'task'}". Findings synced with Evidence Board.`, 'good')

      try {
        const res = await api(`/cases/${caseId}/directive/complete`, {
          method: 'POST',
          body: JSON.stringify({ directiveId: dir.id })
        })
        if (res && res.bundle) {
          mergeBundle(res.bundle)
        }

        if (res && res.message && !dir._debriefHandled) {
          dir._debriefHandled = true
          const targetThreadId = Number(res.message.thread_id) || 1
          
          G.__threadMessages = G.__threadMessages || {}
          G.__threadMessages[targetThreadId] = G.__threadMessages[targetThreadId] || []
          if (!G.__threadMessages[targetThreadId].some(m => m.id === res.message.id)) {
            G.__threadMessages[targetThreadId].push(res.message)
          }

          if (G.threads) {
            const th = G.threads.find(x => Number(x.id) === targetThreadId)
            if (th) {
              th.last_at = res.message.created_at
              th.unread = 0
            }
          }

          G.activeThread = targetThreadId
          G.view = 'chat'
          G.mobileChatTab = 'chat'

          try {
            if (window.playSfx) playSfx('msg')
            toast(`Debrief: ${res.message.sender || 'Squad Member'}`, res.message.body, 'good')
          } catch(e){}
        }

        if (res && res.promotedDirective && res.promotedDirective.status === 'running') {
          const nextDir = res.promotedDirective
          window.__cfzActiveDirective = nextDir
          if (nextDir.id) window.__cfzDirectives[nextDir.id] = nextDir
          const nextKey = getDirectiveTaskKey(nextDir, null, nextDir.memberName)
          window.__cfzTaskTimers[nextKey] = {
            startTime: Date.now(),
            totalDurationSec: 15,
            stepIndex: 0
          }
        } else {
          window.__cfzActiveDirective = null
        }
      } catch(err) {
        console.warn('Directive completion error:', err)
      }

      if (window.cfzPersistGameState) window.cfzPersistGameState()
      render()
    }
  } finally {
    dir._isAdvancing = false
  }
}

function startLiveProgressTimer(timerTextId, progressBarId, taskKey, dirContext) {
  stopTaskTimer()
  const STEP_DURATION_SEC = 15
  let dir = resolveAuthoritativeDirective(dirContext)
  if (!dir && window.__cfzActiveDirective) {
    dir = resolveAuthoritativeDirective(window.__cfzActiveDirective)
  }

  if (!dir || dir.status === 'completed') {
    stopTaskTimer()
    return
  }

  const subTasks = (dir && dir.subTasks) || []
  let activeIdx = subTasks.findIndex(s => s.status === 'running')
  if (activeIdx === -1) activeIdx = subTasks.findIndex(s => s.status === 'pending')
  if (activeIdx === -1) {
    stopTaskTimer()
    return
  }

  const canonicalKey = taskKey || (dir ? getDirectiveTaskKey(dir, null, dir.memberName) : 'active_global_task')
  const timerInfo = getOrCreateTaskTimer(canonicalKey, STEP_DURATION_SEC, activeIdx)

  const updateUI = () => {
    const elapsedSec = (Date.now() - timerInfo.startTime) / 1000
    const remainingSec = Math.max(0, Math.round(timerInfo.totalDurationSec - elapsedSec))
    const progressPct = Math.min(100.0, Math.max(6.0, (elapsedSec / timerInfo.totalDurationSec) * 100))
    const m = Math.floor(remainingSec / 60)
    const s = remainingSec % 60
    const pad = (n) => (n < 10 ? '0' + n : '' + n)

    const txtEl = document.getElementById(timerTextId)
    const barEl = document.getElementById(progressBarId)
    const mTxtEl = document.getElementById('modal-task-timer-val')
    const mBarEl = document.getElementById('modal-task-bar-val')

    const timeStr = remainingSec <= 0 ? 'Completing step...' : `${pad(m)}m ${pad(s)}s`

    if (txtEl) txtEl.textContent = timeStr
    if (barEl) barEl.style.width = `${progressPct.toFixed(1)}%`
    if (mTxtEl && mTxtEl !== txtEl) mTxtEl.textContent = timeStr
    if (mBarEl && mBarEl !== barEl) mBarEl.style.width = `${progressPct.toFixed(1)}%`

    if (remainingSec <= 0) {
      stopTaskTimer()
      advanceActiveDirectiveStep(dir, canonicalKey, timerTextId, progressBarId)
    }
  }

  updateUI()
  _activeTaskTimer = setInterval(updateUI, 1000)
}

function openDirectiveTaskModalById(dirId) {
  const dir = resolveAuthoritativeDirective(dirId)
  if (dir && dir.status !== 'completed') {
    openDirectiveTaskModal(dir)
  }
}
window.openDirectiveTaskModalById = openDirectiveTaskModalById

function openDirectiveTaskModal(dirInput) {
  stopTaskTimer()
  let dir = resolveAuthoritativeDirective(dirInput)
  
  if (!dir) {
    const t = G.threads ? G.threads.find(x => x.id === G.activeThread) : null
    const memberName = t ? t.title : 'Squad Specialist'
    const activeAssign = (G.snapshot && G.snapshot.assignments) ? G.snapshot.assignments.find(a => ((t && a.member_id === t.member_id) || a.member === memberName) && a.status === 'running') || G.snapshot.assignments.find(a => a.status === 'running') : null
    
    if (activeAssign && activeAssign.result_json && activeAssign.result_json.directive) {
      dir = resolveAuthoritativeDirective(activeAssign.result_json.directive)
    } else if (G.snapshot && G.snapshot.directiveQueue && G.snapshot.directiveQueue.length) {
      dir = G.snapshot.directiveQueue.find(q => q.status === 'running')
    }
  }

  if (!dir || dir.status === 'completed') {
    stopTaskTimer()
    const existing = document.getElementById('modal-task-view')
    if (existing) existing.remove()
    return
  }

  if (dir.id) {
    window.__cfzDirectives[dir.id] = dir
  }
  window.__cfzActiveDirective = dir

  const thinking = dir.aiThinking || {}
  const subTasks = dir.subTasks || []
  const memberName = dir.memberName || 'Squad Member'
  const playerInstruction = dir.playerInstruction || 'Investigative Directive'
  const isDirectiveDone = dir.status === 'completed' || (subTasks.length > 0 && subTasks.every(s => s.status === 'completed' || s.status === 'completed_by_player'))

  // If already completely done, don't open modal
  if (isDirectiveDone) {
    const existing = document.getElementById('modal-task-view')
    if (existing) existing.remove()
    return
  }

  const thinkingSteps = thinking.thoughtProcessSteps || [
    `Parsed instruction: "${playerInstruction}" against active case snapshot.`,
    `Evaluated statutory requirements under BNSS and BSA.`,
    `Formulated sub-task workflow graph with time allocation.`
  ]

  let activeIdx = subTasks.findIndex(s => s.status === 'running')
  if (activeIdx === -1) activeIdx = subTasks.findIndex(s => s.status === 'pending')
  const activeSubTask = activeIdx !== -1 ? subTasks[activeIdx] : null
  const completedCount = subTasks.filter(s => s.status === 'completed' || s.status === 'completed_by_player').length
  const canonicalKey = getDirectiveTaskKey(dir, null, memberName)

  const html = `
  <div class="modal-bg" id="modal-task-view" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:999;display:grid;place-items:center;padding:16px">
    <div class="modal" style="max-width:680px;width:94vw;max-height:88vh;display:flex;flex-direction:column;background:#0d131c;border:1px solid var(--line2);border-radius:var(--r);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.95)">
      <div class="modal-h" style="padding:14px 18px;border-bottom:1px solid var(--line2);background:#121a26;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">&#128221;</span>
          <div>
            <h3 style="margin:0;font-size:16px;color:var(--gold2)">Directive Task Breakdown &mdash; ${esc(memberName)}</h3>
            <div class="mono dim" style="font-size:11px;margin-top:2px">Instruction: "${esc(playerInstruction)}"</div>
          </div>
        </div>
        <button class="modal-x" style="background:none;border:none;color:var(--ink3);font-size:18px;cursor:pointer" onclick="stopTaskTimer();document.getElementById('modal-task-view').remove()">&#10005;</button>
      </div>

      <div class="modal-b" style="padding:18px;overflow-y:auto;flex:1 1 auto">
        
        <!-- Currently Active Task Prominently at Top with Live Countdown -->
        ${activeSubTask ? `
        <div style="margin-bottom:16px;padding:14px 16px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.32);border-radius:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span class="tag gold" style="font-size:10.5px;font-weight:700;letter-spacing:0.04em">CURRENTLY ACTIVE TASK</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="mono" id="modal-task-timer-val" style="font-size:13px;color:var(--gold);font-weight:700">--:--</span>
              <button type="button" class="btn gold sm" id="btn-advance-directive-step" style="font-size:11px;padding:3px 10px;font-weight:600;cursor:pointer" title="Complete or advance this step immediately">Complete Step &rarr;</button>
            </div>
          </div>
          <div style="font-weight:600;font-size:14.5px;color:var(--ink1);margin-bottom:4px;display:flex;align-items:center;gap:7px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffd700;box-shadow:0 0 8px #ffd700"></span>
            <span>Task ${activeIdx + 1} of ${subTasks.length}: ${esc(activeSubTask.title)}</span>
          </div>
          <div style="font-size:12.5px;color:var(--ink2);margin-bottom:10px;line-height:1.4">${esc(activeSubTask.description)}</div>
          <div style="background:rgba(255,255,255,0.1);height:6px;border-radius:3px;overflow:hidden">
            <div id="modal-task-bar-val" style="background:linear-gradient(90deg, #d4af37, #eec550);height:100%;width:15%;transition:width 0.4s ease"></div>
          </div>
        </div>
        ` : ''}

        <!-- Gemini / AI Studio Style Thinking & Analysis Section -->
        <div class="gemini-thinking-container">
          <div class="gemini-thinking-header" id="thinking-header-toggle" style="background:rgba(18, 28, 45, 0.6);border-bottom:1px solid rgba(110, 168, 254, 0.12);padding:8px 12px">
            <div style="font-size:12.5px;color:#8bb4f6;font-weight:500;display:flex;align-items:center;gap:6px">
              <span>Gemini Deep Analysis &amp; Thought Process</span>
            </div>
            <button type="button" id="thinking-toggle-btn" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer;transition:all 0.15s ease">Thought Process &#9660;</button>
          </div>
          <div class="gemini-thinking-body" id="thinking-body-content" style="display:block">
            <div style="margin-bottom:10px;padding:8px 10px;background:rgba(124,172,248,0.06);border-radius:4px;border:1px solid rgba(124,172,248,0.15)">
              <div class="mono" style="font-size:11px;color:#8bb4f6;margin-bottom:3px"><b>Goal:</b> ${esc(thinking.parsedGoal || playerInstruction)}</div>
              <div class="mono" style="font-size:11px;color:#8bb4f6"><b>Framework:</b> ${esc(thinking.legalContext || 'BNSS Statutory Procedure')}</div>
            </div>

            <div style="font-weight:600;font-size:11.5px;color:var(--ink1);margin-bottom:6px">Reasoning Chain &amp; Execution Strategy:</div>
            ${thinkingSteps.map((step, idx) => `
              <div class="gemini-step-item">
                <span class="gemini-step-num">Step ${idx + 1}:</span>
                <span>${esc(step)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Planned Tasks Sequence -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-family:var(--font-cond);font-size:14px;letter-spacing:.05em;text-transform:uppercase;color:var(--gold2);font-weight:600">
            Planned Task Sequence (${completedCount}/${subTasks.length} Completed)
          </div>
          <span class="tag cyan" style="font-size:10px">Execution Pipeline</span>
        </div>

        <div>
          ${subTasks.map((sub, idx) => {
            const isDone = sub.status === 'completed' || sub.status === 'completed_by_player'
            const isRunning = sub.status === 'running'
            const isPlayerDone = sub.status === 'completed_by_player'
            const badgeClass = isPlayerDone ? 'completed_by_player' : isDone ? 'completed' : isRunning ? 'running' : 'pending'
            const badgeText = isPlayerDone ? 'COMPLETED BY IO (HQ SYNC)' : isDone ? 'COMPLETED' : isRunning ? 'RUNNING IN FIELD' : 'PENDING QUEUE'
            const timeLabel = sub.timeCostDays ? `${sub.timeCostDays} Day(s)` : 'Instant (0 Days)'

            return `
              <div class="task-subtask-card ${isRunning ? 'active' : ''} ${isDone ? 'done' : ''}">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <div style="font-weight:600;font-size:13.5px;color:var(--ink1)">
                    <span style="color:var(--gold);margin-right:6px">Task ${idx + 1}:</span> ${esc(sub.title)}
                  </div>
                  <span class="task-subtask-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div style="font-size:12.5px;color:var(--ink2);margin-bottom:8px">${esc(sub.description)}</div>
                
                <div style="display:flex;align-items:center;gap:12px;font-family:var(--font-mono);font-size:10.5px;color:var(--ink3);border-top:1px dashed var(--line2);padding-top:6px;flex-wrap:wrap">
                  <span>Scope: <b style="color:var(--cyan)">${esc(sub.targetScope || 'general')}</b></span>
                  <span>Est. Duration: <b style="color:var(--gold2)">${timeLabel}</b></span>
                </div>
              </div>
            `
          }).join('')}
        </div>
      </div>

      <div class="modal-f" style="padding:12px 18px;border-top:1px solid var(--line2);background:#0f1520;display:flex;align-items:center;justify-content:space-between">
        <div class="mono dim" style="font-size:11px">
          <span>Target Officer: <b>${esc(memberName)}</b></span>
        </div>
        <button class="btn pri sm" onclick="stopTaskTimer();document.getElementById('modal-task-view').remove()">Close Window</button>
      </div>
    </div>
  </div>`

  const existing = document.getElementById('modal-task-view')
  if (existing) existing.remove()

  document.body.insertAdjacentHTML('beforeend', html)
  
  if (!isDirectiveDone && activeSubTask) {
    startLiveProgressTimer('modal-task-timer-val', 'modal-task-bar-val', canonicalKey, dir)
    const advanceBtn = document.getElementById('btn-advance-directive-step')
    if (advanceBtn) {
      advanceBtn.onclick = () => {
        stopTaskTimer()
        advanceActiveDirectiveStep(dir, canonicalKey, 'modal-task-timer-val', 'modal-task-bar-val')
      }
    }
  }

  // Set up collapsible toggle
  const toggleBtn = document.getElementById('thinking-header-toggle')
  const bodyContent = document.getElementById('thinking-body-content')
  const toggleBtnEl = document.getElementById('thinking-toggle-btn')
  if (toggleBtn && bodyContent) {
    let collapsed = false
    toggleBtn.onclick = () => {
      collapsed = !collapsed
      bodyContent.style.display = collapsed ? 'none' : 'block'
      if (toggleBtnEl) toggleBtnEl.innerHTML = collapsed ? 'Show &#9660;' : 'Hide &#9650;'
    }
  }
}

window.advanceActiveDirectiveStep = advanceActiveDirectiveStep
window.openDirectiveTaskModal = openDirectiveTaskModal

/* ---------------------------- CASE DIARY ---------------------------- */
/* BNSS s.172 — the day-to-day record the court reads. Previously reachable
   only as a fallback to the Duty Room; it is a desk in its own right. */

VIEWS.diary = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  const entries = s.diary || []
  const procedural = entries.filter(e => e.entry_type === 'defect' || e.entry_type === 'note')
  const milestones = entries.filter(e => e.entry_type === 'milestone')
  return head('&#128214;', 'Case Diary', 'The day-to-day record of the investigation &middot; BNSS s.172', '')
  + `<div class="grid g21">
    <div>
      <div class="card">
        <div class="card-h"><h3>Chronology</h3><span class="sp mono dim" style="font-size:11px">${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} &middot; newest first</span></div>
        ${entries.length ? entries.map(e => `
          <div class="diary-item ${e.entry_type === 'defect' ? 'def' : e.entry_type === 'milestone' ? 'mile' : 'auto'}">
            <span class="diary-day">Day ${e.day}</span>
            <span class="diary-b">${esc(e.body)}</span>
          </div>`).join('') : '<div class="dim">No entries yet. The diary fills as you work.</div>'}
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>Record health</h3></div>
        <div class="stat v" style="margin-bottom:10px"><div class="stat-v">${milestones.length}</div><div class="stat-l">Milestones</div></div>
        <div class="stat ${procedural.length ? 'a' : 'v'}"><div class="stat-v">${procedural.length}</div><div class="stat-l">Procedural entries</div></div>
        <div class="helpbox"><div class="hb-h">&#9888; Why this matters</div>Red entries are deficiencies the system recorded permanently. The defence will build a gap between occurrences from your own diary. Check your chronology before you file.</div>
      </div>
      ${legalBox('BNSS s.172 — case diary', 'The case diary records the day-to-day progress of the investigation, including the time of each step taken and the facts and circumstances ascertained. The court may use it to check the investigation, and the officer may refresh memory from it — but it is not evidence of the facts stated in it.', '172', 'BNSS')}
      <div class="card">
        <div class="card-h"><h3>Clock</h3></div>
        <div class="kv"><span class="k">Day</span><span class="v">${s.day} of ${s.dayLimit}</span></div>
        <div class="kv"><span class="k">Remaining</span><span class="v">${s.daysLeft} day(s)</span></div>
        <div class="kv"><span class="k">Statute</span><span class="v">BNSS s.187 — 60/90 days</span></div>
        <div class="act-bar" style="margin-top:9px"><div class="act-f" style="width:${Math.min(100, s.clockPct)}%"></div></div>
      </div>
    </div>
  </div>`
}

/* ---------------------------- LEGAL LIBRARY ---------------------------- */
/* Standalone desk. The same library is embedded inside Settings; here it is
   the focused workspace with no other furniture around it. */

VIEWS.legal = function () {
  return head('&#9878;', 'Legal Library', 'Every BNS, BNSS and BSA provision the game adjudicates on', '')
  + legalLibraryHTML()
}

VIEWS.legal.after = function () {
  bindLegal()
}

/* ---------------------------- GO ---------------------------- */

boot()
