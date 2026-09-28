/* CASE FILE ZERO — procedural ambience.
 *
 * WHY PROCEDURAL: shipping music or sound-effect files would mean (a) licensing
 * risk, (b) megabytes of payload, and (c) a 404 when a file is missing. So the
 * ambience is SYNTHESISED in the browser with the Web Audio API instead. It is
 * copyright-free by construction — every sound here is generated from noise and
 * oscillators, nothing is sampled — it costs no bytes, and it works offline.
 *
 * SITUATIONAL: each desk has its own bed, so the soundscape tells you where you
 * are without looking at the header.
 *
 *   duty          duty room — fluorescent hum, distant phone, keys
 *   scene         crime scene — outdoors, wind, light rain
 *   lab           forensic lab — extractor whir, glassware
 *   board         evidence board — quiet room, faint paper
 *   interrogation interrogation — bare room tone, a slow clock
 *   court         court — hushed hall, occasional distant cough
 *   office        generic interior
 *
 * Browsers block audio until the user interacts, so the engine stays idle until
 * the first gesture, and it degrades to silence if Web Audio is unavailable.
 */
(function () {
  var ctx = null
  var master = null
  var current = null
  var nodes = []
  var started = false
  var muted = true

  function avail() {
    return typeof window !== 'undefined' &&
      (window.AudioContext || window.webkitAudioContext)
  }

  /* volume comes from settings.presentation.ambience (0..100) */
  function volume() {
    try {
      var g = (typeof G !== 'undefined' && G) ? G : window.G
      var v = g && g.player && g.player.settings && g.player.settings.presentation
        ? g.player.settings.presentation.ambience : 0
      return Math.max(0, Math.min(100, Number(v) || 0)) / 100
    } catch (e) { return 0 }
  }

  function ensure() {
    if (ctx) return true
    if (!avail()) return false
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)
      return true
    } catch (e) { ctx = null; return false }
  }

  /* ---- primitives -------------------------------------------------------- */

  /* A loop of filtered noise — the base of every room bed. */
  function noise(dur, type, freq, q, gain) {
    var len = Math.floor(ctx.sampleRate * dur)
    var buf = ctx.createBuffer(1, len, ctx.sampleRate)
    var d = buf.getChannelData(0)
    var last = 0
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02          // brown-ish noise, softer
      d[i] = last * 3.5
    }
    var src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    var f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    if (q) f.Q.value = q
    var g = ctx.createGain()
    g.gain.value = gain
    src.connect(f); f.connect(g); g.connect(master)
    src.start()
    nodes.push(src, g)
    return { src: src, g: g }
  }

  /* A steady tone — mains hum, extractor, room resonance. */
  function tone(freq, gain, type) {
    var o = ctx.createOscillator()
    o.type = type || 'sine'
    o.frequency.value = freq
    var g = ctx.createGain()
    g.gain.value = gain
    o.connect(g); g.connect(master)
    o.start()
    nodes.push(o, g)
    return { o: o, g: g }
  }

  /* A recurring one-shot — clock tick, phone, cough. */
  function repeat(period, make) {
    var id = setInterval(function () {
      if (!ctx || muted) return
      try { make() } catch (e) { /* never break the bed */ }
    }, period)
    nodes.push({ stop: function () { clearInterval(id) } })
  }

  function blip(freq, dur, gain, type) {
    var o = ctx.createOscillator()
    o.type = type || 'triangle'
    o.frequency.value = freq
    var g = ctx.createGain()
    var t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(master)
    o.start(t); o.stop(t + dur + 0.02)
  }

  /* ---- the beds ---------------------------------------------------------- */

  var BEDS = {
    office: function () {
      noise(4, 'lowpass', 420, 0.7, 0.16)
      tone(100, 0.02, 'sine')
      repeat(9000, function () { blip(760, 0.35, 0.012, 'square') })
    },
    duty: function () {
      noise(4, 'lowpass', 520, 0.8, 0.18)
      tone(100, 0.028, 'sine')       // fluorescent ballast hum
      tone(150, 0.012, 'triangle')
      repeat(11000, function () { blip(690, 0.5, 0.014, 'square') })  // distant phone
      repeat(2600, function () { blip(1500, 0.03, 0.006, 'square') }) // keyboard
    },
    scene: function () {
      noise(5, 'bandpass', 700, 0.5, 0.30)   // wind
      noise(5, 'highpass', 2600, 0.4, 0.10)  // rain hiss
      repeat(4200, function () { blip(3200, 0.05, 0.010, 'sine') })   // drips
      repeat(14000, function () { blip(220, 1.4, 0.012, 'sine') })    // distant traffic
    },
    lab: function () {
      noise(4, 'bandpass', 300, 1.2, 0.13)
      tone(58, 0.035, 'sawtooth')    // extractor
      repeat(5200, function () { blip(1180, 0.22, 0.010, 'triangle') })
      repeat(9000, function () { blip(880, 0.18, 0.008, 'sine') })    // glassware
    },
    board: function () {
      noise(5, 'lowpass', 340, 0.6, 0.10)
      repeat(8000, function () { blip(1400, 0.05, 0.005, 'sine') })   // paper pin
    },
    interrogation: function () {
      noise(5, 'lowpass', 240, 0.7, 0.14)
      tone(72, 0.022, 'sine')
      repeat(2000, function () { blip(1800, 0.028, 0.014, 'square') }) // clock tick
    },
    court: function () {
      noise(5, 'lowpass', 300, 0.6, 0.11)
      tone(90, 0.016, 'sine')
      repeat(17000, function () { blip(300, 0.30, 0.010, 'sawtooth') }) // hushed cough
      repeat(21000, function () { blip(1500, 0.06, 0.006, 'sine' ) })   // papers
    }
  }

  function teardown() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      try { if (n.stop) n.stop() } catch (e) {}
      try { if (n.disconnect) n.disconnect() } catch (e) {}
    }
    nodes = []
  }

  /* ---- public API -------------------------------------------------------- */

  var API = {
    /** Which bed suits this view key. */
    sceneFor: function (view) {
      if (view === 'desk' || view === 'fir' || view === 'wall' || view === 'team' ||
          view === 'chat' || view === 'career' || view === 'apply') return 'duty'
      if (view === 'scene') return 'scene'
      if (view === 'labs') return 'lab'
      if (view === 'board' || view === 'pois' || view === 'diary') return 'board'
      if (view === 'interrogation') return 'interrogation'
      if (view === 'court' || view === 'charge') return 'court'
      return 'office'
    },

    /** Switch the ambience bed. Safe to call on every navigation. */
    play: function (scene) {
      if (!scene || scene === current) return
      if (!ensure()) return
      current = scene
      try {
        if (ctx.state === 'suspended') ctx.resume()
      } catch (e) { /* keep going */ }
      teardown()
      try {
        ;(BEDS[scene] || BEDS.office)()
      } catch (e) { /* silence beats a broken game */ }
      API.volume(volume())
    },

    /** Apply the volume setting (0..1 of the 0..100 slider). */
    volume: function (v) {
      if (!master) return
      try {
        var t = ctx.currentTime
        master.gain.cancelScheduledValues(t)
        master.gain.setValueAtTime(master.gain.value, t)
        master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)) * 0.5, t + 0.4)
      } catch (e) {}
    },

    /** Reflect the current settings value. */
    sync: function () {
      muted = volume() <= 0
      if (muted) { this.volume(0); return }
      if (!ensure()) return
      if (ctx.state === 'suspended') { try { ctx.resume() } catch (e) {} }
      if (!current) { current = 'office'; try { (BEDS.office)() } catch (e) {} }
      this.volume(volume())
    },

    radioSquelch: function () {
      if (!ensure()) return
      try {
        if (ctx.state === 'suspended') ctx.resume()
        var t = ctx.currentTime
        var len = 0.12
        var buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate)
        var d = buf.getChannelData(0)
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15
        var src = ctx.createBufferSource()
        src.buffer = buf
        var flt = ctx.createBiquadFilter()
        flt.type = 'bandpass'
        flt.frequency.value = 1800
        flt.Q.value = 3.5
        var g = ctx.createGain()
        g.gain.setValueAtTime(0.01, t)
        g.gain.linearRampToValueAtTime(0.12, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, t + len)
        src.connect(flt)
        flt.connect(g)
        g.connect(master || ctx.destination)
        src.start(t)
        src.stop(t + len)
      } catch (e) {}
    },

    ready: function () { return !!ctx },
    scene: function () { return current }
  }

  /* Browsers block audio until the first gesture. Arm the engine then. */
  function arm() {
    if (started) return
    started = true
    API.sync()
    var v = API.sceneFor((typeof G !== 'undefined' && G && G.view) || 'desk')
    if (volume() > 0) API.play(v)
  }
  if (typeof document !== 'undefined') {
    ;['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, arm, { once: true, passive: true })
    })
  }

  window.Ambience = API
})()
