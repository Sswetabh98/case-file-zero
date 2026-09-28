/* CASE FILE ZERO — interface language layer.
 *
 * Three languages, one switch:
 *   en        English (default)
 *   hi        Hindi — Devanagari
 *   hinglish  Hindi in Roman script, mixed naturally with the English terms an
 *             Indian police officer actually uses in the field
 *
 * WHAT IS TRANSLATED: the interface chrome — menus, categories, section
 * headings, buttons, setting labels. WHAT IS NOT: case content, statutory text,
 * AI output and legal citations stay in English, because the law is cited in
 * English in an Indian court and a translated section number would be useless.
 *
 * `t(english)` returns the current language's rendering, falling back to the
 * English original, so a missing key can never blank out the interface.
 */
(function () {
  var DICT = {
    hi: {
      // --- categories ---
      'Casework': 'केसवर्क', 'Filing': 'दाखिल', 'Force': 'बल', 'Reference': 'संदर्भ',
      // --- casework ---
      'Duty Room': 'ड्यूटी रूम', 'FIR registration': 'एफआईआर दर्ज',
      'Crime Scene': 'घटनास्थल', 'Process and seize': 'प्रक्रिया और ज़ब्ती',
      'Forensic Lab': 'फॉरेंसिक लैब', 'Test and collect': 'जाँच और रिपोर्ट',
      'Evidence Board': 'साक्ष्य बोर्ड', 'Assemble proof': 'साक्ष्य जोड़ें',
      'Persons of Interest': 'संबंधित व्यक्ति', 'Alibi, arrest, TIP': 'अलिबी, गिरफ्तारी, टीआईपी',
      'Interrogation Room': 'पूछताछ कक्ष', 'BSA s.23 disclosures': 'बीएसए धारा 23 प्रकटीकरण',
      // --- filing ---
      'Charge Sheet': 'आरोप पत्र', 'Final report, s.193': 'अंतिम रिपोर्ट, धारा 193',
      'Court': 'न्यायालय', 'Trial and judgment': 'विचारण और निर्णय',
      'Case Diary': 'केस डायरी', 'Chronology, s.172': 'कालक्रम, धारा 172',
      // --- force ---
      'Case Wall': 'केस वॉल', 'All your files': 'आपके सभी केस',
      'Messaging Desk': 'संदेश डेस्क', 'Assistant, seniors, head': 'सहायक, वरिष्ठ, प्रमुख',
      'Team': 'टीम', 'Team': 'टीम', 'Appoint and allocate': 'नियुक्ति और कार्य',
      // --- reference ---
      'Legal Library': 'विधि पुस्तकालय', 'BNS / BNSS / BSA': 'बीएनएस / बीएनएसएस / बीएसए',
      'Player Guide': 'खिलाड़ी मार्गदर्शिका', 'How the game works': 'खेल कैसे चलता है',
      'Settings': 'सेटिंग्स', 'Assistance and presentation': 'सहायता और प्रस्तुति',
      'Career Record': 'करियर रिकॉर्ड', 'Standing and history': 'स्थिति और इतिहास',
      'Applicant': 'आवेदक', 'Recruitment': 'भर्ती',
      // --- chrome ---
      'Console': 'कंसोल', 'Guide me': 'मार्गदर्शन', 'Notepad': 'नोटपैड',
      'Search': 'खोजें', 'Clear': 'हटाएँ', 'Close': 'बंद करें', 'Save': 'सहेजें',
      'Cancel': 'रद्द करें', 'Continue': 'जारी रखें', 'Back': 'पीछे', 'Next': 'आगे',
      'Day': 'दिन', 'Officer': 'अधिकारी', 'Standing': 'स्थिति', 'Case': 'केस',
      'Assistance': 'सहायता', 'Presentation': 'प्रस्तुति', 'Controls': 'नियंत्रण',
      'Legal Library': 'विधि पुस्तकालय', 'Forms Codex': 'प्रपत्र संहिता',
      'Player Guide': 'खिलाड़ी मार्गदर्शिका',
      'Language': 'भाषा', 'Interface language': 'इंटरफ़ेस भाषा',
      'English': 'अंग्रेज़ी', 'Hindi': 'हिन्दी', 'Hinglish': 'हिंग्लिश',
      'Every section the game uses': 'खेल में प्रयुक्त प्रत्येक धारा',
      'Search the library': 'पुस्तकालय में खोजें',
    },
    hinglish: {
      'Casework': 'Casework', 'Filing': 'Filing', 'Force': 'Force', 'Reference': 'Reference',
      'Duty Room': 'Duty Room', 'FIR registration': 'FIR likhna',
      'Crime Scene': 'Crime Scene', 'Process and seize': 'Process aur seizure',
      'Forensic Lab': 'Forensic Lab', 'Test and collect': 'Test aur report',
      'Evidence Board': 'Evidence Board', 'Assemble proof': 'Proof jodna',
      'Persons of Interest': 'Persons of Interest', 'Alibi, arrest, TIP': 'Alibi, arrest, TIP',
      'Interrogation Room': 'Interrogation Room', 'BSA s.23 disclosures': 'BSA s.23 disclosure',
      'Charge Sheet': 'Charge Sheet', 'Final report, s.193': 'Final report, s.193',
      'Court': 'Court', 'Trial and judgment': 'Trial aur judgment',
      'Case Diary': 'Case Diary', 'Chronology, s.172': 'Chronology, s.172',
      'Case Wall': 'Case Wall', 'All your files': 'Aapke saare case',
      'Messaging Desk': 'Messaging Desk', 'Assistant, seniors, head': 'Assistant, senior, head',
      'Team': 'Team', 'Appoint and allocate': 'Appoint aur kaam baanto',
      'Legal Library': 'Legal Library', 'BNS / BNSS / BSA': 'BNS / BNSS / BSA',
      'Player Guide': 'Player Guide', 'How the game works': 'Game kaise chalta hai',
      'Settings': 'Settings', 'Assistance and presentation': 'Assistance aur presentation',
      'Career Record': 'Career Record', 'Standing and history': 'Standing aur history',
      'Applicant': 'Applicant', 'Recruitment': 'Recruitment',
      'Console': 'Console', 'Guide me': 'Guide karo', 'Notepad': 'Notepad',
      'Search': 'Search', 'Clear': 'Clear', 'Close': 'Band', 'Save': 'Save',
      'Cancel': 'Cancel', 'Continue': 'Aage badho', 'Back': 'Peeche', 'Next': 'Aage',
      'Day': 'Din', 'Officer': 'Officer', 'Standing': 'Standing', 'Case': 'Case',
      'Assistance': 'Assistance', 'Presentation': 'Presentation', 'Controls': 'Controls',
      'Forms Codex': 'Forms Codex',
      'Language': 'Bhasha', 'Interface language': 'Interface ki bhasha',
      'English': 'English', 'Hindi': 'Hindi', 'Hinglish': 'Hinglish',
      'Every section the game uses': 'Game ki har dhaara',
      'Search the library': 'Library mein search karo',
    }
  }

  function lang() {
    try {
      // `G` is declared with `const` in game.js, so it lives in global lexical
      // scope and is NOT a property of window. Read the bare binding, with a
      // window fallback so the module also works under test harnesses.
      var g = (typeof G !== 'undefined' && G) ? G : window.G
      return (g && g.player && g.player.settings && g.player.settings.language) || 'en'
    } catch (e) { return 'en' }
  }

  /* Translate one string. Unknown keys fall back to the English original. */
  function t(s) {
    var L = lang()
    if (L === 'en' || !s) return s
    var d = DICT[L]
    return (d && d[s]) || s
  }

  /* Translate every text node under `root` whose text matches a key. Used for
     strings baked into view markup that we do not want to hand-edit. */
  function apply(root) {
    var L = lang()
    var r = root || document
    if (L === 'en') return
    var d = DICT[L]
    if (!d) return
    var walker = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, null)
    var n
    while ((n = walker.nextNode())) {
      var raw = n.nodeValue
      if (!raw || !raw.trim()) continue
      var key = raw.trim()
      if (d[key]) {
        n.nodeValue = raw.replace(key, d[key])
      }
    }
    // translate placeholders and aria-labels in one pass
    var els = r.querySelectorAll ? r.querySelectorAll('[placeholder],[aria-label],[title]') : []
    for (var i = 0; i < els.length; i++) {
      var el = els[i]
      ;['placeholder', 'aria-label', 'title'].forEach(function (attr) {
        var v = el.getAttribute && el.getAttribute(attr)
        if (v && d[v]) el.setAttribute(attr, d[v])
      })
    }
  }

  window.I18N = { t: t, apply: apply, dict: DICT, langs: ['en', 'hi', 'hinglish'] }
  window.t = t
})()
