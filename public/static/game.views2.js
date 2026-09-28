/* CASE FILE ZERO — views part 2: duty, scene, labs, board, pois */

var VIEWS = window.VIEWS = window.VIEWS || {}

// Forensic In-Situ Vector Diagram Generator
function getExhibitForensicSVG(ex, gear) {
  if (!ex) return ''
  const g = (gear || '').toLowerCase()
  const name = (ex.name || '').toLowerCase()
  const cat = (ex.category || '').toLowerCase()

  // Theme colors based on light spectrum
  let bg = '#070b12'
  let gridColor = 'rgba(56, 189, 248, 0.08)'
  let accent = '#e0be6c'
  let accentGlow = 'rgba(224, 190, 108, 0.35)'
  let spectrumLabel = 'WHITE LIGHT (400–700nm)'

  if (g === 'uv') {
    bg = '#0a0316'
    gridColor = 'rgba(168, 85, 247, 0.12)'
    accent = '#c084fc'
    accentGlow = 'rgba(192, 132, 252, 0.6)'
    spectrumLabel = 'UV (365nm WOOD\'S LAMP)'
  } else if (g === 'als') {
    bg = '#031020'
    gridColor = 'rgba(56, 189, 248, 0.14)'
    accent = '#38bdf8'
    accentGlow = 'rgba(56, 189, 248, 0.55)'
    spectrumLabel = 'ALS (450nm NARROWBAND)'
  } else if (g === 'chemical' || g === 'luminol') {
    bg = '#020d09'
    gridColor = 'rgba(52, 211, 153, 0.12)'
    accent = '#34d399'
    accentGlow = 'rgba(52, 211, 153, 0.65)'
    spectrumLabel = 'LUMINOL (CHEMILUMINESCENCE)'
  } else if (g === 'oblique') {
    bg = '#0d0d08'
    gridColor = 'rgba(245, 158, 11, 0.1)'
    accent = '#f59e0b'
    accentGlow = 'rgba(245, 158, 11, 0.4)'
    spectrumLabel = 'OBLIQUE RAKING LIGHT (15°)'
  }

  // Determine exhibit visual archetype
  const isWeapon = /rod|knife|weapon|spanner|crowbar|pipe|blade|hammer|iron|blunt|wrench/i.test(name) || /weapon|toolmark/i.test(cat)
  const isBio = /blood|dna|stain|saliva|tissue|hair|kerchief|swab|fluid/i.test(name) || cat === 'biological'
  const isDigital = ex.isDigital || /cctv|dvr|phone|mobile|disk|drive|usb|sim|laptop|server/i.test(name) || cat === 'digital'
  const isImpression = /tyre|tread|footwear|shoe|print|impression|skid|mark/i.test(name) || cat === 'physical' && /print|tread/i.test(name)
  const isDocument = /cash|bag|note|currency|slip|ledger|bill|receipt|pass|cheque|document/i.test(name) || /financial|documentary/i.test(cat)
  const isBallistics = /bullet|cartridge|casing|gun|revolver|pistol|gsr|powder/i.test(name) || cat === 'ballistics'
  const isFingerprint = /fingerprint|latent|ridge/i.test(name)

  let graphicContent = ''

  if (isWeapon) {
    // Heavy iron rod / blunt weapon schematic with measurement calipers and impact trace
    graphicContent = `
      <g transform="translate(40, 45)">
        <!-- Caliper dimension lines -->
        <line x1="0" y1="-18" x2="360" y2="-18" stroke="#64748b" stroke-dasharray="3,3" stroke-width="1"/>
        <line x1="0" y1="-23" x2="0" y2="-13" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="360" y1="-23" x2="360" y2="-13" stroke="#94a3b8" stroke-width="1.5"/>
        <text x="180" y="-22" fill="#94a3b8" font-family="monospace" font-size="9" text-anchor="middle">OVERALL LENGTH: 342 mm &bull; METRIC CALIPER</text>
        
        <!-- Weapon Body: Hexagonal Iron Rod / Bar -->
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#475569"/>
            <stop offset="25%" stop-color="#94a3b8"/>
            <stop offset="50%" stop-color="#334155"/>
            <stop offset="75%" stop-color="#64748b"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
        </defs>
        <!-- Shadow -->
        <rect x="4" y="24" width="360" height="24" rx="4" fill="rgba(0,0,0,0.7)" filter="blur(3px)"/>
        <!-- Main rod body -->
        <rect x="0" y="15" width="360" height="26" rx="3" fill="url(#metalGrad)" stroke="#1e293b" stroke-width="1.5"/>
        <!-- Knurling & Grip Section -->
        <g opacity="0.6">
          <line x1="20" y1="15" x2="20" y2="41" stroke="#0f172a" stroke-width="2"/>
          <line x1="32" y1="15" x2="32" y2="41" stroke="#0f172a" stroke-width="2"/>
          <line x1="44" y1="15" x2="44" y2="41" stroke="#0f172a" stroke-width="2"/>
          <line x1="56" y1="15" x2="56" y2="41" stroke="#0f172a" stroke-width="2"/>
          <line x1="68" y1="15" x2="68" y2="41" stroke="#0f172a" stroke-width="2"/>
          <line x1="80" y1="15" x2="80" y2="41" stroke="#0f172a" stroke-width="2"/>
        </g>
        <!-- Impact Strike End with deformation & Biological Trace -->
        <path d="M 330,15 Q 360,18 360,28 Q 360,38 330,41 Z" fill="#475569" stroke="#0f172a"/>
        <!-- Latent Blood / Tissue residue -->
        <path d="M 315,16 Q 335,20 348,18 Q 358,24 354,34 Q 340,36 322,38 Q 328,26 315,16 Z" 
              fill="${g === 'uv' ? '#c084fc' : g === 'chemical' ? '#34d399' : g === 'als' ? '#38bdf8' : '#e11d48'}" 
              opacity="${g ? '0.92' : '0.85'}" 
              filter="drop-shadow(0 0 6px ${accentGlow})"/>
        <circle cx="340" cy="26" r="14" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="2,2"/>
        <!-- Annotation Callout -->
        <line x1="340" y1="12" x2="320" y2="-8" stroke="${accent}" stroke-width="1"/>
        <line x1="320" y1="-8" x2="210" y2="-8" stroke="${accent}" stroke-width="1"/>
        <text x="205" y="-11" fill="${accent}" font-family="monospace" font-size="8.5" text-anchor="end">LOCUS 1: CRANIAL IMPACT TRACE &bull; HAEMOGLOBIN POSITIVE</text>
        
        <!-- Rust & Scratch striations -->
        <line x1="140" y1="20" x2="220" y2="21" stroke="#78350f" stroke-width="1" opacity="0.8"/>
        <line x1="170" y1="27" x2="250" y2="28" stroke="#78350f" stroke-width="1.5" opacity="0.8"/>
        <line x1="110" y1="33" x2="190" y2="34" stroke="#451a03" stroke-width="1" opacity="0.7"/>
      </g>`
  } else if (isBio) {
    // Biological fluid, kerchief, DNA swab diagram
    graphicContent = `
      <g transform="translate(60, 30)">
        <!-- Kerchief / Swab fabric substrate outline -->
        <rect x="20" y="10" width="280" height="90" rx="8" fill="#141c28" stroke="#334155" stroke-width="1.5"/>
        <!-- Fabric weave texture -->
        <g opacity="0.15" stroke="#94a3b8" stroke-width="0.5">
          <line x1="20" y1="25" x2="300" y2="25"/><line x1="20" y1="40" x2="300" y2="40"/>
          <line x1="20" y1="55" x2="300" y2="55"/><line x1="20" y1="70" x2="300" y2="70"/><line x1="20" y1="85" x2="300" y2="85"/>
          <line x1="60" y1="10" x2="60" y2="100"/><line x1="100" y1="10" x2="100" y2="100"/>
          <line x1="140" y1="10" x2="140" y2="100"/><line x1="180" y1="10" x2="180" y2="100"/>
          <line x1="220" y1="10" x2="220" y2="100"/><line x1="260" y1="10" x2="260" y2="100"/>
        </g>
        <!-- Primary Staining Area -->
        <path d="M 80,30 Q 110,18 150,26 Q 200,32 230,50 Q 220,80 170,85 Q 110,88 85,70 Q 70,50 80,30 Z" 
              fill="${g === 'uv' ? '#a855f7' : g === 'chemical' ? '#10b981' : g === 'als' ? '#0284c7' : '#991b1b'}" 
              opacity="0.88" filter="drop-shadow(0 0 10px ${accentGlow})"/>
        <!-- Satellite Spatter Droplets -->
        <circle cx="245" cy="38" r="4" fill="${accent}" opacity="0.9"/>
        <circle cx="258" cy="46" r="2.5" fill="${accent}" opacity="0.85"/>
        <circle cx="265" cy="55" r="1.8" fill="${accent}" opacity="0.8"/>
        <circle cx="70" cy="78" r="3" fill="${accent}" opacity="0.85"/>
        <circle cx="58" cy="85" r="2" fill="${accent}" opacity="0.75"/>
        
        <!-- DNA / Cell Micro-Target Grid Reticle -->
        <circle cx="150" cy="55" r="28" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4,2"/>
        <line x1="150" y1="20" x2="150" y2="90" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
        <line x1="115" y1="55" x2="185" y2="55" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
        
        <text x="150" y="5" fill="${accent}" font-family="monospace" font-size="8.5" text-anchor="middle">DNA EXTRACTION LOCUS &bull; HIGH-DENSITY NUCLEATED CELLS</text>
      </g>`
  } else if (isDigital) {
    // Digital device (DVR, phone, storage, CCTV) with cryptographic hash stream
    graphicContent = `
      <g transform="translate(50, 20)">
        <!-- Hardware Enclosure -->
        <rect x="20" y="10" width="300" height="95" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <!-- Port Arrays & LEDs -->
        <rect x="35" y="24" width="45" height="16" rx="2" fill="#1e293b" stroke="#64748b"/>
        <text x="57" y="35" fill="#94a3b8" font-family="monospace" font-size="7" text-anchor="middle">RJ-45 / LAN</text>
        
        <rect x="90" y="24" width="35" height="16" rx="2" fill="#1e293b" stroke="#64748b"/>
        <text x="107" y="35" fill="#94a3b8" font-family="monospace" font-size="7" text-anchor="middle">USB 3.0</text>
        
        <rect x="135" y="24" width="45" height="16" rx="2" fill="#1e293b" stroke="#64748b"/>
        <text x="157" y="35" fill="#94a3b8" font-family="monospace" font-size="7" text-anchor="middle">HDMI OUT</text>
        
        <!-- Status Indicator LEDs -->
        <circle cx="280" cy="30" r="4" fill="#22c55e" filter="drop-shadow(0 0 5px #22c55e)"/>
        <circle cx="295" cy="30" r="4" fill="#3b82f6" filter="drop-shadow(0 0 5px #3b82f6)"/>
        
        <!-- Forensic Imaging Read-Only Write-Blocker Graphic -->
        <rect x="35" y="52" width="270" height="42" rx="4" fill="#020617" stroke="#334155"/>
        <text x="45" y="66" fill="#38bdf8" font-family="monospace" font-size="8.5" font-weight="bold">BIT-STREAM IMAGE ACQUISITION (E01 / RAW)</text>
        <text x="45" y="79" fill="#94a3b8" font-family="monospace" font-size="8">HASH: ${ex.hash ? ex.hash.slice(0, 32) + '…' : 'PENDING FORENSIC IMAGING (BSA s.63 REQUIRED)'}</text>
        <text x="45" y="89" fill="#e0be6c" font-family="monospace" font-size="7.5">HARDWARE WRITE-BLOCKER: ACTIVE &bull; NO MODIFICATION PERMITTED</text>
      </g>`
  } else if (isImpression) {
    // Footwear / tyre tread impression with raking light contours
    graphicContent = `
      <g transform="translate(60, 20)">
        <!-- Soil / Surface Bed -->
        <rect x="10" y="10" width="320" height="95" rx="6" fill="#1c1917" stroke="#44403c"/>
        <!-- Tread Impression Grooves -->
        <g stroke="${accent}" stroke-width="2.5" fill="none" opacity="0.85" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.9))">
          <path d="M 30,25 L 70,55 L 30,85"/>
          <path d="M 65,25 L 105,55 L 65,85"/>
          <path d="M 100,25 L 140,55 L 100,85"/>
          <path d="M 135,25 L 175,55 L 135,85"/>
          <path d="M 170,25 L 210,55 L 170,85"/>
          <path d="M 205,25 L 245,55 L 205,85"/>
          <path d="M 240,25 L 280,55 L 240,85"/>
          <path d="M 275,25 L 315,55 L 275,85"/>
        </g>
        <!-- Accidental Unique Defect Marker (e.g. stone cut at lug 4) -->
        <circle cx="140" cy="55" r="9" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="2,2"/>
        <line x1="140" y1="46" x2="160" y2="20" stroke="#ef4444" stroke-width="1"/>
        <line x1="160" y1="20" x2="280" y2="20" stroke="#ef4444" stroke-width="1"/>
        <text x="285" y="23" fill="#ef4444" font-family="monospace" font-size="8">UNIQUE INDIVIDUALISING FISSURE (3.2mm CUT)</text>
        <text x="170" y="98" fill="#e0be6c" font-family="monospace" font-size="8" text-anchor="middle">CASTING DEPTH: 11.5 mm &bull; 15° OBLIQUE RELIEF</text>
      </g>`
  } else if (isDocument) {
    // Banknote stack / Cash bag / Financial ledger
    graphicContent = `
      <g transform="translate(60, 20)">
        <!-- Currency Note / Bag Envelope -->
        <rect x="25" y="15" width="280" height="90" rx="4" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
        <rect x="35" y="22" width="260" height="76" rx="2" fill="none" stroke="#34d399" stroke-width="0.8" stroke-dasharray="4,2"/>
        <!-- Security Thread & Watermark Window -->
        <rect x="70" y="22" width="25" height="76" fill="#042f2e" opacity="0.6"/>
        <line x1="140" y1="22" x2="140" y2="98" stroke="${accent}" stroke-width="2" stroke-dasharray="6,3" filter="drop-shadow(0 0 4px ${accent})"/>
        <!-- Serial Number Box -->
        <rect x="180" y="30" width="105" height="18" fill="#022c22" stroke="#34d399"/>
        <text x="232" y="42" fill="#6ee7b7" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">№ 7AB 849201–300</text>
        <text x="232" y="70" fill="#a7f3d0" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">₹500 &bull; PROSECUTION CASH</text>
        <text x="232" y="85" fill="#e0be6c" font-family="monospace" font-size="7.5" text-anchor="middle">RESERVE BANK OF INDIA &bull; UNWASHED FIBRES</text>
      </g>`
  } else if (isFingerprint) {
    // Latent fingerprint ridge pattern
    graphicContent = `
      <g transform="translate(130, 20)">
        <!-- Ridge Arches & Whorls -->
        <g stroke="${accent}" stroke-width="1.8" fill="none" opacity="0.85">
          <ellipse cx="90" cy="55" rx="12" ry="16"/>
          <ellipse cx="90" cy="55" rx="22" ry="26"/>
          <ellipse cx="90" cy="55" rx="34" ry="38"/>
          <ellipse cx="90" cy="55" rx="46" ry="50"/>
          <ellipse cx="90" cy="55" rx="58" ry="62"/>
          <path d="M 30,90 Q 60,65 90,65 Q 120,65 150,90"/>
        </g>
        <!-- Minutiae Bifurcation Markers -->
        <circle cx="102" cy="45" r="4" fill="none" stroke="#ef4444" stroke-width="1.5"/>
        <circle cx="76" cy="62" r="4" fill="none" stroke="#ef4444" stroke-width="1.5"/>
        <circle cx="90" cy="22" r="4" fill="none" stroke="#ef4444" stroke-width="1.5"/>
        <text x="90" y="105" fill="#e0be6c" font-family="monospace" font-size="8" text-anchor="middle">12-POINT MINUTIAE MATCH &bull; AFIS READY</text>
      </g>`
  } else {
    // General Technical Physical Evidence Container & Macro Inspect
    graphicContent = `
      <g transform="translate(70, 25)">
        <rect x="20" y="10" width="280" height="85" rx="6" fill="#131b26" stroke="#475569" stroke-width="1.5"/>
        <!-- Inspection Reticle -->
        <circle cx="160" cy="52" r="32" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="3,3"/>
        <circle cx="160" cy="52" r="8" fill="${accent}" opacity="0.4"/>
        <line x1="160" y1="15" x2="160" y2="90" stroke="${accent}" stroke-width="0.8" opacity="0.5"/>
        <line x1="120" y1="52" x2="200" y2="52" stroke="${accent}" stroke-width="0.8" opacity="0.5"/>
        <text x="160" y="4" fill="#94a3b8" font-family="monospace" font-size="8.5" text-anchor="middle">${esc(ex.name.toUpperCase())}</text>
        <text x="160" y="102" fill="#e0be6c" font-family="monospace" font-size="8" text-anchor="middle">GRID: ${esc(ex.gridRef || 'IN SITU')} &bull; CATEGORY: ${esc(ex.category.toUpperCase())}</text>
      </g>`
  }

  return `
    <div class="forensic-diagram-container" style="background:${bg};border:1px solid #1e293b;border-radius:6px;overflow:hidden;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(15,23,42,0.85);border-bottom:1px solid #1e293b;font-family:monospace;font-size:10px;color:#94a3b8">
        <span><strong style="color:${accent}">[${esc(ex.exhibitNo || 'EXHIBIT')}]</strong> ${esc(ex.name)}</span>
        <span>${spectrumLabel} &bull; MAG: 4.5×</span>
      </div>
      <svg viewBox="0 0 460 190" style="width:100%;height:auto;display:block">
        <!-- Grid Matrix -->
        <defs>
          <pattern id="fGrid_${ex.id || '0'}" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridColor}" stroke-width="0.8"/>
          </pattern>
        </defs>
        <rect width="460" height="190" fill="url(#fGrid_${ex.id || '0'})"/>

        <!-- Custom Graphic Body -->
        ${graphicContent}

        <!-- Forensic Photographic Scale Bar (0 to 50 mm) at Bottom -->
        <g transform="translate(50, 150)">
          <!-- Scale Baseline and Ticks -->
          <rect x="0" y="0" width="360" height="12" fill="#0f172a" stroke="#475569" stroke-width="1"/>
          <!-- Alternating 5mm Black and White standard blocks -->
          <rect x="0" y="0" width="36" height="12" fill="#e2e8f0"/>
          <rect x="36" y="0" width="36" height="12" fill="#090d16"/>
          <rect x="72" y="0" width="36" height="12" fill="#e2e8f0"/>
          <rect x="108" y="0" width="36" height="12" fill="#090d16"/>
          <rect x="144" y="0" width="36" height="12" fill="#e2e8f0"/>
          <rect x="180" y="0" width="36" height="12" fill="#090d16"/>
          <rect x="216" y="0" width="36" height="12" fill="#e2e8f0"/>
          <rect x="252" y="0" width="36" height="12" fill="#090d16"/>
          <rect x="288" y="0" width="36" height="12" fill="#e2e8f0"/>
          <rect x="324" y="0" width="36" height="12" fill="#090d16"/>
          
          <!-- Millimeter Markings (0, 10, 20, 30, 40, 50 mm) -->
          <text x="0" y="24" fill="#94a3b8" font-family="monospace" font-size="8.5" text-anchor="middle">0mm</text>
          <text x="72" y="24" fill="#94a3b8" font-family="monospace" font-size="8.5" text-anchor="middle">10mm</text>
          <text x="144" y="24" fill="#94a3b8" font-family="monospace" font-size="8.5" text-anchor="middle">20mm</text>
          <text x="216" y="24" fill="#94a3b8" font-family="monospace" font-size="8.5" text-anchor="middle">30mm</text>
          <text x="288" y="24" fill="#94a3b8" font-family="monospace" font-size="8.5" text-anchor="middle">40mm</text>
          <text x="360" y="24" fill="#e0be6c" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="middle">50mm FORENSIC SCALE</text>
        </g>
      </svg>
    </div>`
}
window.getExhibitForensicSVG = getExhibitForensicSVG

VIEWS.desk = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  const fir = s.fir
  const info = FIR_INFO[s.offenceClass] || FIR_INFO.default
  return head('&#128220;', 'Duty Room', 'Intake, registration of the FIR, and the beginning of the case file', '')
  + (fir ? `
  <div class="grid g21">
    <div>
      <div class="paper">
        <div class="stamp approved">REGISTERED</div>
        <div class="paper-head">
          <h2>FIRST INFORMATION REPORT</h2>
          <p>Metro Crime Branch &middot; Malhar Division &middot; BNSS s.173</p>
        </div>
        <div class="paper-row"><span class="k">FIR No.</span><span class="v"><b>${esc(fir.fir_no || '—')}</b></span></div>
        <div class="paper-row"><span class="k">Case</span><span class="v">№${esc(s.caseNo)} &mdash; ${esc(s.title)}</span></div>
        <div class="paper-row"><span class="k">Sections</span><span class="v">${esc((fir.bns_sections || []).map(x => typeof x === 'object' && x ? (x.act ? `${x.act} s.${x.section || x.sec || ''}` : (x.section || x.code || JSON.stringify(x))) : String(x)).join(', ')) || '—'}</span></div>
        <div class="paper-row"><span class="k">Informant</span><span class="v">${esc(fir.informant)} (${esc(fir.informant_type)})</span></div>
        <div class="paper-row"><span class="k">Date &amp; time</span><span class="v">${esc(fir.date_of_occurrence)}</span></div>
        <div class="paper-row"><span class="k">Place</span><span class="v">${esc(fir.place_of_occurrence)}</span></div>
        <div class="paper-row"><span class="k">Registered on</span><span class="v">Day ${fir.filed_day}${fir.preliminary_inquiry ? ' &middot; following a preliminary inquiry under s.173(3)' : ''}</span></div>
        <div class="rule" style="border-color:rgba(34,32,28,.3)"></div>
        <div class="hd" style="font-size:12px;letter-spacing:.11em;margin-bottom:6px">Narrative</div>
        <div style="font-size:14.5px;line-height:1.75;white-space:pre-wrap">${esc(fir.narrative)}</div>
        <div class="paper-sig"><div>Informant</div><div>Recorded by — IO</div><div>Station House Officer</div></div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>Case status</h3></div>
        <div class="kv"><span class="k">Status</span><span class="v">${statusTag(s.status)}</span></div>
        <div class="kv"><span class="k">Resume point</span><span class="v">${esc(s.resumePoint)}</span></div>
        <div class="kv"><span class="k">Day</span><span class="v">${s.day} of ${s.dayLimit} (${s.daysLeft} remaining)</span></div>
        <div class="kv"><span class="k">Admissible proof</span><span class="v">${(s.exhibits || []).filter(e => e.admissibility === 'admissible').length} exhibit(s), weight ${s.readiness?.admissibleWeight || 0}</span></div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Case progress</h3></div>
        <div class="acts">${(s.acts || []).map(actRow).join('')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Next required steps</h3></div>
        ${(s.blockers || []).filter(b => b.act <= 3).slice(0, 5).map(b => `
          <div class="check ${b.severity === 'critical' ? 'no' : 'ok'}">
            <span class="ci">${b.severity === 'critical' ? '&#10007;' : '&#9675;'}</span>
            <span class="cn"><b>${esc(b.title)}</b><div class="cd">${esc(b.fix)}</div></span>
          </div>`).join('') || '<div class="dim">No outstanding registration-stage steps.</div>'}
      </div>
    </div>
  </div>` : `
  <div class="grid g21">
    <div>
      <div class="card">
        <div class="card-h"><h3>&#128220; Complaint received at the duty room</h3><span class="sp tag amber">Awaiting registration</span></div>
        <div style="font-size:13.5px;line-height:1.7;color:var(--ink2)">
          <p style="margin:0 0 10px"><b style="color:var(--ink)">Informant:</b> Nitin Bhosale, Accounts Cashier, Sunrise Logistics Pvt Ltd.</p>
          <p style="margin:0 0 10px">"We had drawn the weekly wages that morning — ₹4,18,000, mostly used ₹500 notes — and were taking the van to the Sector 9 unit. Two men forced us to stop just past the culvert on Marol Depot Road. One of them struck Ramzan on the head with something heavy. They took the cash bag. I have never seen either of them before."</p>
          <p style="margin:0 0 0"><b style="color:var(--ink)">Your assessment is required.</b> The complaint discloses ${esc(info.offence)}. Under ${cite('173', 'BNSS')} you must register an FIR for every cognizable offence.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Initial observations</h3></div>
        <div class="check ok"><span class="ci">&#10003;</span><span class="cn">The injured escort, Ramzan Sheikh (blood group O positive), is at Malhar Civil Hospital. A head injury was caused.</span></div>
        <div class="check ok"><span class="ci">&#10003;</span><span class="cn">The cash was withdrawn from the firm's bank that morning, and the timing was known inside the firm.</span></div>
        <div class="check ok"><span class="ci">&#10003;</span><span class="cn">The complainants insist this was a robbery by strangers.</span></div>
        <div class="helpbox"><div class="hb-h">&#8505; Where to begin</div>Open the FIR composer. Write the narrative so that it satisfies each ingredient of the offence you believe is made out. The registration route you choose — immediate registration, or a preliminary inquiry under ${cite('173', 'BNSS')} — is a scored decision.</div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-h"><h3>Case file</h3></div>
        <div class="kv"><span class="k">Case</span><span class="v">№${esc(s.caseNo)}</span></div>
        <div class="kv"><span class="k">Title</span><span class="v">${esc(s.title)}</span></div>
        <div class="kv"><span class="k">Class</span><span class="v">${esc(s.offenceClass)} · Tier ${s.tier}</span></div>
        <div class="kv"><span class="k">Difficulty</span><span class="v">${esc(s.difficulty)}</span></div>
        <div class="kv"><span class="k">Clock</span><span class="v">${s.dayLimit} days (BNSS s.187)</span></div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Case progress</h3></div>
        <div class="acts">${(s.acts || []).map(actRow).join('')}</div>
      </div>
      <button class="btn pri lg" id="d-fir" style="width:100%;justify-content:center">&#128220; Compose the FIR</button>
    </div>
  </div>`) + `
  <script>window.__desk={}</script>`
}

VIEWS.desk.after = function () {
  const s = G.snapshot
  if (!s) return
  const b = $('#d-fir'); if (b) b.onclick = firModal
  const b2 = $('#d-view-fir'); if (b2) b2.onclick = () => {
    $('#work').scrollTop = 0
    modal({ cls: 'wide', title: 'FIR — filed record', body: `<div class="paper" style="max-width:760px;margin:0 auto"><div class="paper-head"><h2>FIRST INFORMATION REPORT</h2><p>BNSS s.173 &middot; FIR No. ${esc(s.fir.fir_no)}</p></div><div style="font-size:14.5px;line-height:1.8;white-space:pre-wrap">${esc(s.fir.narrative)}</div></div>`, footer: '<button class="btn" data-close>Close</button>' })
  }
  const b3 = $('#d-more'); if (b3) b3.onclick = () => { G.view = 'wall'; render() }
}

const FIR_INFO = {
  robbery: { offence: 'robbery — BNS s.309, with hurt under BNS s.115' },
  property: { offence: 'theft — BNS s.303' },
  assault: { offence: 'robbery with hurt — BNS s.309 and s.115' },
  cyber: { offence: 'cheating by deception — BNS s.318, with IT Act s.66' },
  narcotics: { offence: 'NDPS Act contravention, with BNS s.61' },
  financial: { offence: 'criminal breach of trust and cheating — BNS s.316 and s.318' },
  default: { offence: 'a cognizable offence' }
}

function statusTag(st) {
  const m = { intake: ['grey', 'Intake'], fir_filed: ['gold', 'FIR filed'], scene: ['amber', 'Scene processed'], investigation: ['cyan', 'Under investigation'], chargesheet: ['violet', 'Charge sheeted'], trial: ['violet', 'On trial'], closed: ['green', 'Closed'] }
  const [c, t] = m[st] || ['grey', st]
  return `<span class="tag ${c}">${t}</span>`
}

function actRow(a) {
  return `<div class="act ${a.state}" title="${esc(a.name)}">
    <span class="act-n">${a.act}</span>
    <span class="act-b"><span class="act-t">${esc(a.name)}</span><span class="act-bar"><span class="act-f" style="width:${a.pct}%"></span></span></span>
    <span class="mono dim" style="font-size:10.5px">${a.state === 'locked' ? '&#128274;' : a.pct + '%'}</span>
  </div>`
}

/* ---------------------------- SCENE CANVASSING & LOCALITY ---------------------------- */

function renderCanvassLocalityView(s, sc) {
  const activeDir = G.canvassDir || 'all'
  const isFullscreen = !!G.canvassFullscreen

  const allPersons = s.persons || []
  const filtered = activeDir === 'all' ? allPersons : allPersons.filter(p => (p.direction || '').toLowerCase() === activeDir.toLowerCase())
  const consentedCount = (s.consentedWitnesses || []).length
  const compliancePct = Math.min(100, Math.round((consentedCount / 2) * 100))

  const directions = [
    { id: 'all', label: 'All Sectors', icon: '📍', count: allPersons.length, desc: 'Comprehensive review of local inhabitants and workers across all sectors surrounding the crime locus.' },
    { id: 'north', label: 'North (Highway & Stand)', icon: '⬆️', count: allPersons.filter(p => p.direction === 'north').length, desc: 'Approach road towards arterial highway and taxi rank. High visibility for transit witnesses and getaway vehicles (80m distance).' },
    { id: 'west', label: 'West (Market Alley & Garage)', icon: '⬅️', count: allPersons.filter(p => p.direction === 'west').length, desc: 'Commercial lane with auto garages, hardware stores, and merchant shops (40m distance).' },
    { id: 'central', label: 'Central (Crime Epicenter)', icon: '🎯', count: allPersons.filter(p => p.direction === 'central').length, desc: 'Core incident location where cash transit vehicle was intercepted and security escort assaulted (0m ground zero).' },
    { id: 'east', label: 'East (Tea Stall & Chawl)', icon: '➡️', count: allPersons.filter(p => p.direction === 'east').length, desc: 'Densely populated residential chawl corridor, tea stall, and local shops facing the roadway (25m distance).' },
    { id: 'south', label: 'South (Culvert & Shed)', icon: '⬇️', count: allPersons.filter(p => p.direction === 'south').length, desc: 'Secluded drainage culvert, transformer substation cabin, and unpaved service lane (50m distance).' }
  ]

  const activeMeta = directions.find(d => d.id === activeDir) || directions[0]

  return `
  <div class="${isFullscreen ? 'canvass-fullscreen-container' : ''}">
    <!-- Tactical HUD Top Bar -->
    <div class="canvass-top-strip">
      <div class="canvass-top-brand">
        <div class="canvass-top-title">
          <span>LOCALITY CANVASSING &amp; PANCH DIRECTORY</span>
          <span class="statutory-stamp-seal stamp-ok">BNSS §103 &bull; §180</span>
        </div>
        <p class="canvass-top-desc">Systematic doorstep canvassing of local inhabitants to secure mandatory independent witnesses.</p>
      </div>

      <div class="canvass-top-meta">
        <!-- Statutory Panch Compliance Meter -->
        <div class="canvass-compliance-meter">
          <div style="display:flex;flex-direction:column;gap:1px">
            <span class="mono dim" style="font-size:9px;letter-spacing:0.06em">PANCH STATUS (BNSS §103)</span>
            <span style="font-size:12px;font-weight:700;color:${consentedCount >= 2 ? '#6fd39b' : '#f59e0b'}">
              ${consentedCount} / 2 Secured ${consentedCount >= 2 ? '✓' : ''}
            </span>
          </div>
          <div class="canvass-meter-bar">
            <div class="canvass-meter-fill" style="width:${compliancePct}%;background:${consentedCount >= 2 ? '#3f9d6a' : 'var(--gold)'}"></div>
          </div>
        </div>

        <button type="button" class="btn sm gh" id="btn-canvass-back-grid">← CSI Evidence Grid</button>
      </div>
    </div>

    <!-- Landscape Dual Layout -->
    <div class="canvass-grid-layout">
      <!-- Tactical Spatial Map & Direction Radar -->
      <div class="canvass-tactical-map">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-family:var(--font-cond);font-size:12px;font-weight:700;color:#9fb0c6;letter-spacing:0.08em">SPATIAL SECTOR RADAR</span>
          <button type="button" class="radar-target-btn ${activeDir === 'all' ? 'active' : ''}" data-dir="all" style="position:static;padding:3px 10px;font-size:11px">
            📍 ALL SECTORS (${allPersons.length})
          </button>
        </div>

        <!-- Animated Radar Screen Widget with Interactive Direction Buttons -->
        <div class="tactical-radar-card">
          <div class="radar-screen">
            <div class="radar-ring" style="width:50px;height:50px"></div>
            <div class="radar-ring" style="width:110px;height:110px"></div>
            <div class="radar-ring" style="width:170px;height:170px"></div>
            <div class="radar-crosshair-h"></div>
            <div class="radar-crosshair-v"></div>
            <div class="radar-sweep-line"></div>
            
            <!-- Direction Selection Buttons inside Radar Map -->
            <button type="button" class="radar-target-btn ${activeDir==='north'?'active':''}" data-dir="north" style="top:12px;left:50%;transform:translateX(-50%)" title="Filter North Sector: Highway Approach &amp; Stand">
              ⬆️ NORTH &bull; 80m
            </button>
            <button type="button" class="radar-target-btn ${activeDir==='west'?'active':''}" data-dir="west" style="left:8px;top:50%;transform:translateY(-50%)" title="Filter West Sector: Market Alley &amp; Garage">
              ⬅️ WEST &bull; 40m
            </button>
            <button type="button" class="radar-target-btn center-target ${activeDir==='central'?'active':''}" data-dir="central" style="top:50%;left:50%;transform:translate(-50%,-50%)" title="Filter Central Sector: Crime Epicenter">
              🎯 CENTER &bull; 0m
            </button>
            <button type="button" class="radar-target-btn ${activeDir==='east'?'active':''}" data-dir="east" style="right:8px;top:50%;transform:translateY(-50%)" title="Filter East Sector: Tea Stall &amp; Chawl">
              ➡️ EAST &bull; 25m
            </button>
            <button type="button" class="radar-target-btn ${activeDir==='south'?'active':''}" data-dir="south" style="bottom:12px;left:50%;transform:translateX(-50%)" title="Filter South Sector: Drainage Culvert &amp; Shed">
              ⬇️ SOUTH &bull; 50m
            </button>
          </div>
        </div>

        <!-- Active Sector Briefing -->
        <div class="card" style="margin-top:12px;padding:12px;background:#060a10;border-color:#1c2d42">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;font-weight:700;color:var(--gold2)">${esc(activeMeta.label)}</span>
            <span class="mono dim" style="font-size:10px">${activeMeta.count} Resident(s)</span>
          </div>
          <div style="font-size:11.5px;color:#9fb0c6;line-height:1.45">${esc(activeMeta.desc)}</div>
        </div>

        <!-- Statutory Law Card -->
        <div class="legalbox" style="margin-top:12px;padding:10px 12px;border-color:#294569">
          <div class="lb-h" style="color:#64b5f6;font-size:11.5px">⚖️ BNSS §103 Statutory Mandate</div>
          <p style="font-size:11px;color:#b0c4de;margin:0;line-height:1.4">Before making any physical search or seizure, the officer must call upon <b>two or more independent and respectable inhabitants of the locality</b>. Accused persons cannot act as panchas; their disclosures operate under <b>BSA §23</b>.</p>
        </div>
      </div>

      <!-- Sector Inhabitants Roster Right Rail -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="font-size:15px;margin:0 0 2px 0;color:#e6edf3">Inhabitants &amp; Local Workers &mdash; ${esc(activeMeta.label)}</h3>
            <span class="dim" style="font-size:11.5px">Showing ${filtered.length} persons in this sector</span>
          </div>
          <span class="mono dim" style="font-size:11.5px">${consentedCount} Panch(es) Attested Overall</span>
        </div>

        ${filtered.length ? filtered.map(p => renderResidentCard(p, s)).join('') : `
          <div class="vacant" style="padding:48px 24px;background:#090e18;border-radius:8px;border:1px dashed #1c2b3e">
            <i style="font-size:28px">&#128101;</i>
            <h3 style="margin:8px 0 4px 0">No inhabitants registered in this sector</h3>
            <p class="dim" style="font-size:12px">Select another sector or switch to 'All Sectors' to examine residents.</p>
          </div>
        `}
      </div>
    </div>
  </div>`
}

function renderResidentCard(p, s) {
  const isAccused = (p.role === 'suspect' || p.role === 'accused' || p.is_culprit)
  const isVictim = (p.role === 'victim' || p.role === 'complainant')
  const isConsented = (p.canvassed && p.consented) || ((s.consentedWitnesses || []).includes(p.name))
  const isCanvassed = !!(p.canvassed || isConsented || p.statement_recorded || (p.statements && p.statements.length > 0) || (s.consentedWitnesses || []).includes(p.name))
  const isReluctant = p.disposition === 'reluctant'
  const isHesitant = p.disposition === 'hesitant'
  const avatarMarkup = window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic-sm') : `<div class="poi-pic-sm"><span class="init">${esc((p.name || '').slice(0, 2))}</span></div>`

  const cardCls = isAccused ? 'resident-card accused' : isCanvassed ? 'resident-card consented' : 'resident-card uncanvassed'
  const cardStyle = isCanvassed ? 'opacity:0.75;filter:contrast(95%);border-color:rgba(63,157,106,0.45);background:rgba(15,23,42,0.65);' : ''

  const recordedResponse = p.statement || (p.statements && p.statements[0] && p.statements[0].statement) || p.canvassResponse || p.consentResponse || (p.profile || {}).summary || p.canvassQuote || 'Statement and doorstep inquiry recorded on file.'

  return `
  <div class="${cardCls}" style="${cardStyle}">
    <div style="flex-shrink:0;margin-top:2px">
      ${avatarMarkup}
    </div>
    <div class="resident-card-body">
      <div class="resident-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="resident-name">${esc(p.name)}</span>
          ${p.age ? `<span class="dim" style="font-size:12px">&bull; age ${p.age}</span>` : ''}
          ${isHesitant ? `<span class="tag amber" style="font-size:9.5px;padding:1px 5px">Hesitant</span>` : ''}
          ${isReluctant ? `<span class="tag red" style="font-size:9.5px;padding:1px 5px">Reluctant</span>` : ''}
        </div>
        <div>
          ${isAccused
            ? `<span class="statutory-stamp-seal stamp-inadmissible">Accused / Suspect (BSA §23)</span>`
            : isCanvassed
            ? `<span class="statutory-stamp-seal stamp-ok" style="background:rgba(63,157,106,0.2);color:#34d399;border:1px solid #10b981">✓ CANVASS COMPLETE &amp; RECORDED</span>`
            : isVictim
            ? `<span class="tag violet">${esc(p.role)}</span>`
            : `<span class="statutory-stamp-seal stamp-pending">Assent Pending</span>`
          }
        </div>
      </div>

      <!-- Structured Metadata Grid -->
      <div class="resident-meta-grid">
        <div>
          <span class="meta-item-label">Workplace / Occupation:</span> 
          <span class="meta-item-val">${esc(p.occupation || 'Local Resident')}</span>
        </div>
        <div>
          <span class="meta-item-label">Sector / Proximity:</span> 
          <span class="meta-item-val">${esc(p.directionLabel || p.direction || 'Central')}</span>
        </div>
        <div>
          <span class="meta-item-label">Location Address:</span> 
          <span class="meta-item-val">${esc(p.location || p.address || 'Scene Vicinity')}</span>
        </div>
        <div>
          <span class="meta-item-label">Panch Eligibility:</span> 
          <span class="meta-item-val" style="color:${isAccused ? '#ff8b86' : '#6fd39b'}">${isAccused ? 'Ineligible (Accused)' : 'Independent Local Inhabitant'}</span>
        </div>
      </div>

      <!-- Statement & Observation Snippet / Recorded Response -->
      <div class="resident-quote-box" style="${isCanvassed ? 'border-left:3px solid #10b981;background:rgba(16,185,129,0.08);color:#f1f5f9;margin:8px 0;' : ''}">
        ${isCanvassed ? `<div style="font-size:10px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px">Recorded Response / Statement:</div>` : ''}
        "${esc(recordedResponse)}"
      </div>

      <!-- Action Cluster: Hidden if Canvassed (Frozen) -->
      ${isCanvassed ? `
        <div style="font-size:11.5px;color:#94a3b8;font-style:italic;display:flex;align-items:center;gap:6px;padding-top:4px">
          <span style="color:#10b981">●</span> Canvass inquiry completed &amp; preserved in case diary (BNSS §103/§180). Card frozen.
        </div>
      ` : `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button type="button" class="btn sm pri btn-canvass-inquire" data-cid="${p.id}">
            💬 Doorstep Canvass &amp; Inquire
          </button>
          ${isAccused ? `
            <button type="button" class="btn sm gh" data-nav-interro="${p.id}" style="border-color:#c9403a;color:#ff8b86">
              🔒 Examine in Interrogation Suite (BSA §23)
            </button>
          ` : ''}
        </div>
      `}
    </div>
  </div>`
}

function canvassChatModal(p, s) {
  const isAccused = (p.role === 'suspect' || p.role === 'accused' || p.is_culprit)
  const isConsented = (p.canvassed && p.consented) || ((s.consentedWitnesses || []).includes(p.name))
  const disposition = p.disposition || (isAccused ? 'accused' : 'willing')

  // Play gentle synthesized audio feedback on interaction
  const playTacticalChime = (high = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      if (high) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.12)
      }
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.13)
    } catch(e) {}
  }

  const dialogHistory = [
    { speaker: 'officer', text: `Good day. I am the Investigating Officer from Crime Branch. We are conducting official inquiries under BNSS §176/§180 regarding the occurrence at ${p.location || 'Depot Road'}.` },
    { speaker: 'resident', text: p.canvassQuote || `Yes Officer. I am ${p.name}. I work as a ${p.occupation || 'resident'} here at ${p.location || 'this locality'}.` }
  ]

  if (p.statement) {
    dialogHistory.push({ speaker: 'resident', text: `As I previously recorded: "${p.statement}"` })
  }

  modal({
    cls: 'wide',
    title: `Field Canvassing & Panch Attestation — ${p.name}`,
    body: `
      <div class="legalbox" style="margin-bottom:14px;border-color:#23344a">
        <div class="lb-h" style="color:var(--gold2)">⚖️ Statutory Framework: BNSS §103 (Independent Panch) &amp; BNSS §180 (Witness Examination)</div>
        <p style="font-size:12px;color:#b0c4de;margin:0">Under BNSS §103, search and seizure requires two respectable, independent local inhabitants. Verifying neutrality ensures seamless evidentiary admissibility in court.</p>
      </div>

      <div class="grid g2" style="align-items:start">
        <!-- Inhabitant Official Dossier Panel -->
        <div class="paper" style="padding:16px 18px">
          <div class="paper-head">
            <h2>INHABITANT RECORD</h2>
            <p>${esc(p.directionLabel || 'Locality')} &middot; Case Day ${s.day}</p>
          </div>
          <div class="paper-row"><span class="k">Deponent</span><span class="v">${esc(p.name)}</span></div>
          <div class="paper-row"><span class="k">Role</span><span class="v">${esc(p.role)}</span></div>
          <div class="paper-row"><span class="k">Occupation</span><span class="v">${esc(p.occupation || 'Local Resident')}</span></div>
          <div class="paper-row"><span class="k">Locality Locus</span><span class="v">${esc(p.location || 'Scene Vicinity')}</span></div>
          <div class="paper-row"><span class="k">Disposition</span><span class="v" style="font-weight:700;color:${disposition === 'willing' ? '#6fd39b' : disposition === 'hesitant' ? '#f59e0b' : '#ff8b86'}">${esc(disposition.toUpperCase())}</span></div>
          <div class="paper-row"><span class="k">BNSS §103 Status</span><span class="v" style="font-weight:700;color:${isConsented ? '#6fd39b' : '#f59e0b'}">${isConsented ? '✓ Panch Assent Granted' : 'Pending Examination'}</span></div>
          
          <div style="margin-top:16px;padding:10px;background:#f5f3e9;border:1px dashed #c0b89d;border-radius:4px">
            <div style="font-size:10.5px;font-weight:700;color:#554b38;letter-spacing:0.04em">OFFICIAL PANCHNAMA LEDGER</div>
            <p style="font-size:11px;color:#665c49;margin:4px 0 0 0;line-height:1.4">
              ${isAccused ? 'Accused person: Ineligible to act as panch under BNSS §103. Statements admissible only under BSA §23.' : 'Independent resident under doorstep inquiry for seizure memo attestation.'}
            </p>
          </div>
        </div>

        <!-- Live Inquiry & Dialogue Chamber -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:12px;font-weight:700;color:#9fb0c6">INQUIRY TRANSCRIPT &bull; FIELD INTERVIEW</span>
            <span class="mono dim" style="font-size:10px">RECORD ACTIVE</span>
          </div>

          <div class="canvass-chat-history" id="canvass-chat-box">
            ${dialogHistory.map(m => `
              <div class="canvass-bubble ${m.speaker === 'officer' ? 'io' : 'resident'}">
                <b style="font-size:11px;color:${m.speaker === 'officer' ? 'var(--gold2)' : '#a5f3fc'}">${m.speaker === 'officer' ? 'Investigating Officer' : esc(p.name)}:</b><br/>
                ${esc(m.text)}
              </div>
            `).join('')}
          </div>

          <!-- Interactive Inquiry Options -->
          <div style="font-size:11.5px;font-weight:600;color:#9fb0c6;margin-bottom:6px">Select Field Inquiries:</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
            <button type="button" class="inquiry-chip-btn btn-ask-canvass" data-q="observe">
              <span>🔍</span>
              <span><b>Observe Sighting:</b> "What did you observe or hear around this sector at the time of the incident?"</span>
            </button>
            <button type="button" class="inquiry-chip-btn btn-ask-canvass" data-q="respectable">
              <span>⚖️</span>
              <span><b>Audit Neutrality:</b> "Can you confirm you are an independent resident with no interest or bias regarding either party?"</span>
            </button>
            <button type="button" class="inquiry-chip-btn btn-ask-canvass" data-q="consent">
              <span>📝</span>
              <span><b>Request Assent:</b> "Will you agree to act as an independent panch witness and sign the seizure memo under BNSS §103?"</span>
            </button>
          </div>

          <!-- Bottom Master Action -->
          ${isAccused ? `
            <div class="helpbox" style="border-color:#ff8b86;background:rgba(255,139,134,0.08)">
              <div class="hb-h" style="color:#ff8b86">&#9888; Accused Ineligible as Panch Witness</div>
              Under BNSS §103, an accused cannot be an independent panch witness. Statements leading to recovery must be recorded under BSA §23 in the Interrogation Suite.
            </div>
          ` : `
            <button type="button" class="btn pri" id="btn-save-canvass-consent" style="width:100%;padding:11px;justify-content:center;font-size:13px;font-weight:700">
              ${isConsented ? '✓ Assent Already Recorded — Update Case Diary' : '✍️ Record & Attest Statutory Panch Assent (BNSS §103)'}
            </button>
          `}
        </div>
      </div>
    `,
    footer: `<button class="btn gh" data-close>Close</button>`,
    after: (veil, close) => {
      const chatBox = veil.querySelector('#canvass-chat-box')
      let askedObserve = false
      let askedRespectable = false
      let askedConsent = false

      veil.querySelectorAll('.btn-ask-canvass').forEach(btn => {
        btn.onclick = () => {
          playTacticalChime(true)
          const qType = btn.dataset.q
          let qText = ''
          let aText = ''

          if (qType === 'observe') {
            askedObserve = true
            qText = "What did you observe or hear around this sector at the time of the incident?"
            aText = p.observation || "I was present in this sector and observed suspicious commotion and vehicles departing rapidly right after the occurrence."
          } else if (qType === 'respectable') {
            askedRespectable = true
            qText = "Can you confirm you are an independent resident of this locality with no interest in either party?"
            aText = p.respectableStatement || `I have been living/working in this locality for years. I have no personal connection or bias regarding either party. I am an independent, respectable resident.`
          } else if (qType === 'consent') {
            askedConsent = true
            qText = "Will you agree to act as an independent panch witness and sign the seizure memo under BNSS §103?"
            if (disposition === 'willing') {
              aText = p.consentResponse || "Yes, Officer. As a responsible citizen of this locality, I will gladly sign the panchnama and seizure memo under BNSS §103."
            } else if (disposition === 'hesitant') {
              if (askedObserve && askedRespectable) {
                aText = "Since you have explained the official procedure and recorded my details with care, I will cooperate and sign the seizure memo as a panch witness."
              } else {
                aText = "Officer, I am quite worried about repeated court summons and losing daily business hours. Can you first record my exact observations and verify my neutral role?"
              }
            } else if (disposition === 'reluctant') {
              aText = p.consentResponse || "Sahab, with respect, I have family and small children. I am afraid of getting targeted by criminals. I can tell you what I saw in confidence, but please spare me from signing court documents!"
            } else {
              aText = "Officer, I am being questioned in connection with the crime. Under BNSS §103, I cannot act as an independent panch witness."
            }
          }

          chatBox.innerHTML += `
            <div class="canvass-bubble io"><b style="font-size:11px;color:var(--gold2)">Investigating Officer:</b><br/>${esc(qText)}</div>
            <div class="canvass-bubble resident"><b style="font-size:11px;color:#a5f3fc">${esc(p.name)}:</b><br/>${esc(aText)}</div>
          `
          chatBox.scrollTop = chatBox.scrollHeight
          btn.disabled = true
        }
      })

      const saveBtn = veil.querySelector('#btn-save-canvass-consent')
      if (saveBtn) {
        saveBtn.onclick = () => act(async () => {
          if (disposition === 'reluctant') {
            playTacticalChime(false)
            toast('Resident Declined Assent', `${p.name} declined to sign court panchnama due to safety concerns. Question other independent inhabitants in this sector (BNSS §103).`, 'warn')
            const r = await api(`/cases/${s.caseId}/canvass/consent`, {
              method: 'POST',
              body: JSON.stringify({ personId: p.id, consent: false, statementText: `Examined at ${p.location}. Inhabitant provided verbal sighting but respectfully declined to sign panchnama as court witness.` })
            })
            mergeBundle(r); close(); render()
            return
          }

          if (disposition === 'hesitant' && !(askedObserve && askedRespectable)) {
            playTacticalChime(false)
            toast('Reassurance Required', `Audit neutrality and examine observations first to reassure ${p.name} before recording statutory assent.`, 'info')
            return
          }

          playTacticalChime(true)
          const stmt = `Examined under BNSS §103/§180 at ${p.location || 'Depot Road'}. Deponent confirmed presence in locality and agreed to act as an independent panch witness for physical searches and recoveries.`
          const r = await api(`/cases/${s.caseId}/canvass/consent`, {
            method: 'POST',
            body: JSON.stringify({ personId: p.id, consent: true, statementText: stmt })
          })
          mergeBundle(r); close(); render()
          toast('Panch Assent Attested', `${p.name} is now a verified independent panch witness under BNSS §103. Selectable in seizure memos.`, 'good')
        })
      }
    }
  })
}

/* ---------------------------- SCENE ---------------------------- */

VIEWS.scene = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  if (!s.fir) return needFir('Scene inspection requires a registered case.')
  const sc = s.scene
  if (!sc) return `<div class="vacant"><i>&#128300;</i><h3>No scene recorded</h3><p>This case has no scene associated with it in the record.</p></div>`
  const plan = sc.plan || { width: 1000, height: 620, hotspots: [], markers: [] }
  const found = {}
  s.exhibits.forEach(e => { if (e.found) found[e.gridRef] = e })
  const isSealed = !!sc.sealed

  const sceneMode = G.sceneMode || 'grid'
  const consentedCount = (s.consentedWitnesses || []).length

  const modeSwitcherHtml = `
    <div class="scene-mode-switcher-bar">
      <div class="scene-mode-pill-group">
        <button type="button" class="scene-mode-btn ${sceneMode !== 'canvass' ? 'active' : ''}" id="btn-scene-grid">
          <span>🔍</span> Forensic Optics
        </button>
        <button type="button" class="scene-mode-btn ${sceneMode === 'canvass' ? 'active' : ''}" id="btn-scene-canvass">
          <span>🏘️</span> Locality Canvass
          <span class="scene-mode-badge ${consentedCount >= 2 ? 'sec-ok' : 'sec-pending'}">${consentedCount}/2 Panch</span>
        </button>
      </div>
    </div>`

  if (sceneMode === 'canvass') {
    return head('&#128300;', 'Crime Scene Locality Canvassing', esc(sc.name) + ' &middot; day ' + s.day + ' of ' + s.dayLimit)
    + procedureCoach([
      { ok: !!sc.cordoned, text: 'Cordon the scene and log arrival under BNSS s.176' },
      { ok: !!sc.walkthrough, text: 'Walk through the whole scene before touching anything' },
      { ok: !!sc.photographed, text: 'Photograph wide, mid and macro with millimeter scale' },
      { ok: !!sc.diagrammed, text: 'Draw the scene diagram and assign grid references' },
      { ok: (s.consentedWitnesses || []).length >= 2, text: 'Canvass locality: secure at least 2 independent panch witnesses (BNSS s.103)' },
      { ok: !!sc.sealed, text: 'Seal the scene', detail: sc.sealed ? '' : 'Sealing closes the scene and completes initial forensic processing.' }
    ])
    + modeSwitcherHtml
    + renderCanvassLocalityView(s, sc)
  }

  return head('&#128300;', 'Crime Scene Investigation', esc(sc.name) + ' &middot; day ' + s.day + ' of ' + s.dayLimit)
  + procedureCoach([
    { ok: !!sc.cordoned, text: 'Cordon the scene and log arrival under BNSS s.176' },
    { ok: !!sc.walkthrough, text: 'Walk through the whole scene before touching anything' },
    { ok: !!sc.photographed, text: 'Photograph wide, mid and macro with millimeter scale' },
    { ok: !!sc.diagrammed, text: 'Draw the scene diagram and assign grid references' },
    { ok: (s.consentedWitnesses || []).length >= 2, text: 'Canvass locality: secure at least 2 independent panch witnesses (BNSS s.103)' },
    { ok: !!sc.sealed, text: 'Seal the scene', detail: sc.sealed ? '' : 'Sealing closes the scene and completes initial forensic processing.' }
  ])
  + modeSwitcherHtml
  + `<div class="grid g21" style="align-items:start">
    <div>
      <div class="crime-scene-container ${isSealed ? 'is-sealed-scene' : ''}" id="cs-container" style="position:relative">
        <!-- CSI Tactical HUD Header -->
        <div class="scene-hud-top">
          <div class="scene-hud-row1">
            <div class="scene-hud-status">
              <span class="scene-live-dot"></span>
              <span class="scene-hud-title">LIVE CSI FEED &bull; 3D SPATIAL MAP</span>
            </div>
            <div class="scene-hud-badges">
              <span class="tag ${sc.cordoned ? 'green' : 'amber'}" style="font-size:10px">${sc.cordoned ? 'CORDONED' : 'CORDON PENDING'}</span>
              <span class="tag ${sc.sealed ? 'cyan' : 'gold'}" style="font-size:10px">${sc.sealed ? 'SEALED &bull; s.176' : 'PROCESSING ACTIVE'}</span>
            </div>
          </div>
          <div class="scene-hud-row2">
            <span class="mono dim scene-hud-coords" id="cs-coords">LOC: 19.1173° N, 72.8777° E &bull; MAROL DEPOT RD</span>
          </div>
        </div>

        <!-- Forensic Light & Sensor Selection Bar -->
        <div class="scene-optic-strip">
          <button type="button" class="optic-btn active" id="g-none" data-gear="" title="Natural daylight / White torch survey">
            <span>☀️</span> Ordinary
          </button>
          <button type="button" class="optic-btn oblique" id="g-oblique" data-gear="oblique" title="Low-angle raking light for tyre tracks &amp; footprint relief">
            <span>📐</span> Oblique
          </button>
          <button type="button" class="optic-btn uv" id="g-uv" data-gear="uv" title="UV 365nm Wood's Lamp for biological fluids &amp; secret stains">
            <span>🟣</span> UV 365
          </button>
          <button type="button" class="optic-btn als" id="g-als" data-gear="als" title="Alternate Light Source 450nm for latent fingerprints &amp; fibres">
            <span>🟢</span> ALS 450
          </button>
          <button type="button" class="optic-btn luminol" id="g-chem" data-gear="chemical" title="Luminol chemiluminescence for wiped blood spatters">
            <span>🧪</span> Luminol
          </button>
        </div>

        <!-- Interactive Optical Guidance Card -->
        <div class="st-guidance-card" id="st-guidance-card" style="margin: 8px 12px; border: 1px solid rgba(200, 162, 74, 0.3); border-radius: 6px; overflow: hidden; background: #0c121c; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          <div style="display: flex; align-items: stretch; min-height: 70px;">
            <!-- Color accent side bar -->
            <div id="st-accent-bar" style="width: 5px; background: var(--gold); transition: background-color 0.22s ease;"></div>
            
            <!-- Info Content -->
            <div style="padding: 10px 14px; flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: nowrap;">
                  <span id="st-info-icon" style="font-size: 14px; flex-shrink: 0;">☀️</span>
                  <span id="st-info-title" style="font-family: var(--font-head); font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ORDINARY WHITE LIGHT</span>
                  <span id="st-info-spectrum" style="font-family: var(--font-mono); font-size: 9px; color: var(--gold); background: rgba(255,255,255,0.03); padding: 1px 5px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.05); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">Full Visual Spectrum</span>
                </div>
                <span style="font-family: var(--font-mono); font-size: 9px; color: var(--gold); background: rgba(200, 162, 74, 0.12); padding: 2px 7px; border-radius: 999px; font-weight: 700; border: 1px solid rgba(200, 162, 74, 0.2); white-space: nowrap; letter-spacing: 0.05em;" id="st-status-badge">ACTIVE SPECTRUM</span>
              </div>
              
              <div id="st-info-target" style="font-size: 12px; color: var(--ink2); line-height: 1.4; font-weight: 500;">
                Macro visual survey of overt physical objects, weapons, and containers.
              </div>
              
              <div style="font-size: 10.5px; color: var(--ink3); display: flex; align-items: flex-start; gap: 5px; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 5px; margin-top: 2px;">
                <span id="st-info-bulb" style="color: var(--gold); line-height: 1.2; flex-shrink: 0;">💡</span>
                <span id="st-info-instruction-text" style="line-height: 1.3;">Double-click any illuminated item to capture forensic photograph &amp; lodge into case file.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Crime Scene Visualizer Viewport with Spotlight, Laser Scan & Stage -->
        <div class="scene-viewport mode-normal" id="scene-viewport" style="${isSealed ? 'opacity:0.65;filter:contrast(90%)' : ''}">
          <!-- Shutter Flash Overlay -->
          <div class="scene-camera-flash" id="scene-cam-flash"></div>
          <div class="scene-torch-spot" id="scene-torch"></div>
          <div class="scan-laser-line" id="scene-laser" style="display:none"></div>
          <div class="scene-stage" id="scene-stage">
            ${sceneSVG(plan, found, s)}
          </div>
        </div>

        ${isSealed ? `
        <div class="scene-sealed-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          CRIME SCENE SEALED &amp; PRESERVED &bull; BNSS s.176 &bull; INTEGRITY INTACT
        </div>` : ''}

        <!-- Legend & Quick Guide -->
        <div class="scene-legend">
          <span class="lg"><span class="lg-s" style="background:#e0be6c;border-radius:2px"></span> <b>CSI Marker Tents</b></span>
          <span class="lg"><span class="lg-s" style="background:rgba(63,157,106,.4);border:1px solid #3f9d6a"></span> Examined</span>
          <span class="lg"><span class="lg-s" style="background:rgba(200,162,74,.4);border:1px solid #c8a24a"></span> Seized (s.103)</span>
          <span class="lg"><span class="lg-s" style="background:rgba(201,64,58,.4);border:1px solid #c9403a"></span> Tainted</span>
          <span style="margin-left:auto;color:var(--gold2)">Select optical spectra &bull; <b>Double-click on illuminated traces/light</b> to photograph &amp; lodge (s.103)</span>
        </div>
      </div>

      <!-- Statutory CSI Protocol Stepper -->
      <div class="card" style="margin-top:14px">
        <div class="card-h"><h3>Crime Scene Statutory Protocol — BNSS s.176</h3><span class="sp tag ${sc.sealed ? 'green' : 'amber'}">${sc.sealed ? 'SEALED &middot; PRESERVED' : 'PROCESSING'}</span></div>
        <div class="grid g3">
          ${sceneStep('cordoned', 'Cordon &amp; arrival log', 0, sc)}
          ${sceneStep('walkthrough', 'Walk-through', 0, sc)}
          ${sceneStep('photographed', 'Photographic log', 1, sc)}
          ${sceneStep('diagrammed', 'Scene diagram', 1, sc)}
          ${sceneStep('canvassed', 'Witness canvass', 1, sc)}
          ${sceneStep('sealed', 'Seal the scene', 0, sc)}
        </div>
      </div>
    </div>

    <!-- Evidence Roster -->
    <div>
      <div class="card">
        <div class="card-h"><h3>Evidence at this scene</h3><span class="sp mono dim" style="font-size:11px">${(s.exhibits || []).filter(e => !(e.requiresDisclosure && !e.unlockedByDisclosure) && e.found).length}/${(s.exhibits || []).filter(e => !(e.requiresDisclosure && !e.unlockedByDisclosure)).length} Recovered</span></div>
        ${(s.exhibits || []).filter(e => !(e.requiresDisclosure && !e.unlockedByDisclosure)).map((e, idx) => {
          const isDisclosure = e.isDisclosure || e.category === 'others' || e.category === 'interrogation_disclosure'
          const catLabel = isDisclosure ? 'others' : e.category
          const isDefective = e.admissibility === 'tainted' || e.tainted || e.admissibility === 'inadmissible' || e.admissibility === 'invalid'
          const isTainted = e.admissibility === 'tainted' || e.tainted
          const cls = (isTainted ? 'tainted' : e.admissibility === 'admissible' ? 'admissible' : e.admissibility === 'inadmissible' ? 'inadmissible' : 'unseized') + (isDisclosure ? ' disclosure-exhibit' : '')
          const pts = (!e.seized || isDefective) ? 0 : (e.weight != null && e.weight > 0 ? e.weight : (e.isDigital ? 30 : 25))
          const canRedo = !!(e.seized || e.tainted || e.admissibility === 'tainted' || e.admissibility === 'admissible' || e.admissibility === 'inadmissible')
          const letter = e.exhibitNo || String.fromCharCode(65 + (idx % 26))
          const statusTxt = e.found
            ? (e.seized
                ? (isTainted ? ' &middot; <span style="color:#ff8b86">seized (defective)</span>' : e.admissibility === 'inadmissible' ? ' &middot; <span style="color:#f59e0b">seized (inadmissible)</span>' : ' &middot; <span style="color:#6fd39b">seized (valid)</span>')
                : (isDisclosure ? ' &middot; <span style="color:#f59e0b">disclosed (pending recovery)</span>' : ' &middot; <span style="color:#6fd39b">found</span>'))
            : ' &middot; <span style="color:var(--gold)">sweep required</span>'
          return `<div class="exrow ${cls}" data-ex="${e.id}" title="${e.found ? 'Click to view exhibit dossier' : 'Click to inspect this item in situ'}">
            <span class="exno">${esc(letter)}</span>
            <span class="exb">
              <span class="exn">
                ${e.found ? esc(e.name) : '&#9633; ' + esc(e.name || 'Not yet examined')}
                ${isDisclosure ? ' <span class="tag gold" style="font-size:9.5px;padding:1px 6px;margin-left:4px;border:1px dashed var(--gold);background:rgba(200,162,74,0.18)">💬 BSA s.23 STATEMENT</span>' : ''}
              </span>
              <span class="exm">${esc(catLabel)}${e.gridRef ? ' &middot; Grid ' + esc(e.gridRef) : ''}${e.isDigital ? ' &middot; digital' : ''}${statusTxt}</span>
            </span>
            <span style="display:inline-flex;align-items:center;gap:6px">
              ${e.found ? `<span class="exw" style="color:${(e.admissibility === 'admissible' && !isDefective) ? '#6fd39b' : isDefective ? '#ff8b86' : '#9ab0c8'}">${pts} pts</span>` : `<span class="tag dim" style="font-size:10px">SWEEP</span>`}
              ${canRedo ? `<button class="btn-redo-ex" data-redo-ex="${e.id}" title="Redo seizure memo &amp; re-examine" style="background:transparent;border:1px solid rgba(200,162,74,0.35);color:var(--gold);border-radius:4px;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:all 0.15s ease" onmouseover="this.style.background='rgba(200,162,74,0.2)';this.style.borderColor='var(--gold)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(200,162,74,0.35)'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>` : ''}
            </span>
          </div>`
        }).join('')}
      </div>

      <div class="card">
        <div class="card-h"><h3>Forensic Officer's Brief</h3></div>
        <div class="legalbox" style="font-size:12.5px;line-height:1.6">
          <div class="lb-h">&#9878; Standard Operating Procedure</div>
          Inspect the scene systematically with appropriate optical spectra. Every seized article requires <b>two independent panch witnesses</b> under BNSS s.103. Digital items require dual-signed certificates under BSA s.63.
        </div>
      </div>
    </div>
  </div>`
}

VIEWS.scene.after = function () {
  const s = G.snapshot; if (!s) return
  const sceneMode = G.sceneMode || 'grid'

  const gridBtn = $('#btn-scene-grid')
  if (gridBtn) gridBtn.onclick = () => { G.sceneMode = 'grid'; render() }
  const canvassBtn = $('#btn-scene-canvass')
  if (canvassBtn) canvassBtn.onclick = () => { G.sceneMode = 'canvass'; render() }
  const fullBtn = $('#btn-toggle-fullscreen')
  if (fullBtn) fullBtn.onclick = () => {
    G.canvassFullscreen = !G.canvassFullscreen
    try {
      if (G.canvassFullscreen) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
      }
    } catch(e) {}
    render()
  }
  const backGridBtn = $('#btn-canvass-back-grid')
  if (backGridBtn) backGridBtn.onclick = () => { G.sceneMode = 'grid'; render() }

  if (sceneMode === 'canvass') {
    $$('.canvass-dir-tab, .compass-box, .radar-target-btn, [data-dir]').forEach(el => {
      el.onclick = () => {
        const dir = el.dataset.dir
        if (dir) {
          G.canvassDir = dir
          render()
        }
      }
    })

    $$('.btn-canvass-inquire').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation()
        const pid = b.dataset.cid
        const p = (s.persons || []).find(x => String(x.id) === String(pid))
        if (p) canvassChatModal(p, s)
      }
    })

    $$('[data-nav-interro]').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation()
        const pid = b.dataset.navInterro
        G.tab = 'interrogation'
        G.view = 'interrogation'
        G.ivTarget = Number(pid) || pid
        render()
      }
    })

    return
  }

  let gear = ''

  const vp = $('#scene-viewport')
  const stage = $('#scene-stage')
  const torch = $('#scene-torch')
  const laser = $('#scene-laser')
  const magPill = $('#cs-mag-pill')

  // Zoom & Pan state variables (scoped strictly to the scene stage)
  let scale = 1.0
  let panX = 0
  let panY = 0
  const minScale = 1.0
  const maxScale = 5.0

  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let startPanX = 0
  let startPanY = 0
  let hasMoved = false
  let suppressClickUntil = 0

  // Constrain pan within stage boundaries based on current scale
  const clampPan = () => {
    if (!vp || !stage) return
    const vw = vp.clientWidth || 800
    const vh = vp.clientHeight || 500

    if (scale <= 1.0) {
      panX = 0
      panY = 0
      return
    }

    const maxNegX = -(vw * (scale - 1))
    const maxNegY = -(vh * (scale - 1))
    const pad = 24

    panX = Math.min(pad, Math.max(maxNegX - pad, panX))
    panY = Math.min(pad, Math.max(maxNegY - pad, panY))
  }

  const applyTransform = () => {
    if (!stage) return
    stage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`
    if (magPill) {
      magPill.textContent = `MAG: ${scale.toFixed(1)}×`
      magPill.style.color = scale > 1.05 ? '#34d399' : '#e0be6c'
    }
    if (vp) {
      vp.style.cursor = isDragging ? 'grabbing' : (scale > 1.05 ? 'grab' : 'crosshair')
    }
  }

  // Smooth mousemove torch spotlight follow and live coordinate tracking
  if (vp && torch) {
    vp.onmousemove = (e) => {
      const rect = vp.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      torch.style.left = x + 'px'
      torch.style.top = y + 'px'
      const coordsEl = $('#cs-coords')
      if (coordsEl) {
        const stageX = Math.round(((x - panX) / (rect.width * scale)) * 100)
        const stageY = Math.round(((y - panY) / (rect.height * scale)) * 100)
        coordsEl.textContent = `LOC: 19.1173° N, 72.8777° E &bull; X:${Math.max(0, Math.min(100, stageX))} Y:${Math.max(0, Math.min(100, stageY))}`
      }
    }
    vp.onmouseleave = () => {
      torch.style.opacity = '0'
    }
    vp.onmouseenter = () => {
      torch.style.opacity = '1'
    }
  }

  // 1. Mouse Scroll Wheel Zoom (Laptop / Desktop)
  if (vp) {
    vp.addEventListener('wheel', (e) => {
      e.preventDefault()
      e.stopPropagation()

      const rect = vp.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const zoomSpeed = 0.16
      const delta = e.deltaY < 0 ? (1 + zoomSpeed) : (1 - zoomSpeed)
      const prevScale = scale
      const targetScale = Math.min(Math.max(minScale, scale * delta), maxScale)

      if (targetScale === prevScale) return

      // Zoom centered on the cursor position
      panX = mouseX - (mouseX - panX) * (targetScale / prevScale)
      panY = mouseY - (mouseY - panY) * (targetScale / prevScale)
      scale = targetScale

      clampPan()
      applyTransform()
    }, { passive: false })
  }

  // 2. Mouse Drag Pan (Left-click press, hold, and drag on Laptop / Desktop)
  if (vp) {
    vp.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return // Left click only
      isDragging = true
      dragStartX = e.clientX
      dragStartY = e.clientY
      startPanX = panX
      startPanY = panY
      hasMoved = false
      vp.classList.add('is-dragging')
    })

    const onWindowMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY

      if (Math.hypot(dx, dy) > 4) {
        hasMoved = true
      }

      if (hasMoved) {
        panX = startPanX + dx
        panY = startPanY + dy
        clampPan()
        applyTransform()
      }
    }

    const onWindowMouseUp = () => {
      if (isDragging) {
        if (hasMoved) {
          suppressClickUntil = Date.now() + 200
        }
        isDragging = false
        vp.classList.remove('is-dragging')
        applyTransform()
      }
    }

    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
  }

  // 3. Mobile Touch Gestures: Single-Finger Pan & Two-Finger Pinch Zoom
  let initialPinchDist = 0
  let initialPinchScale = 1
  let initialPinchMidX = 0
  let initialPinchMidY = 0
  let initialPinchPanX = 0
  let initialPinchPanY = 0
  let isTouching = false
  let touchStartX = 0
  let touchStartY = 0
  let touchStartPanX = 0
  let touchStartPanY = 0
  let touchMoved = false

  if (vp) {
    vp.addEventListener('touchstart', (e) => {
      const rect = vp.getBoundingClientRect()
      if (e.touches.length === 1) {
        isTouching = true
        touchMoved = false
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartPanX = panX
        touchStartPanY = panY
      } else if (e.touches.length === 2) {
        e.preventDefault()
        isTouching = false
        touchMoved = true
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        initialPinchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
        initialPinchScale = scale
        initialPinchMidX = (t0.clientX + t1.clientX) / 2 - rect.left
        initialPinchMidY = (t0.clientY + t1.clientY) / 2 - rect.top
        initialPinchPanX = panX
        initialPinchPanY = panY
      }
    }, { passive: false })

    vp.addEventListener('touchmove', (e) => {
      // Prevent browser default whole-page scroll/zoom while manipulating the crime scene
      e.preventDefault()
      const rect = vp.getBoundingClientRect()

      if (e.touches.length === 1 && isTouching) {
        const dx = e.touches[0].clientX - touchStartX
        const dy = e.touches[0].clientY - touchStartY

        if (Math.hypot(dx, dy) > 5) {
          touchMoved = true
        }

        if (touchMoved) {
          panX = touchStartPanX + dx
          panY = touchStartPanY + dy
          clampPan()
          applyTransform()
        }
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const curDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
        const curMidX = (t0.clientX + t1.clientX) / 2 - rect.left
        const curMidY = (t0.clientY + t1.clientY) / 2 - rect.top

        const factor = curDist / initialPinchDist
        const targetScale = Math.min(Math.max(minScale, initialPinchScale * factor), maxScale)

        panX = curMidX - (initialPinchMidX - initialPinchPanX) * (targetScale / initialPinchScale)
        panY = curMidY - (initialPinchMidY - initialPinchPanY) * (targetScale / initialPinchScale)
        scale = targetScale

        clampPan()
        applyTransform()
      }
    }, { passive: false })

    const endTouch = (e) => {
      if (touchMoved) {
        suppressClickUntil = Date.now() + 250
      }
      if (e.touches.length === 0) {
        isTouching = false
        touchMoved = false
        initialPinchDist = 0
      } else if (e.touches.length === 1) {
        // Return to single finger pan state
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartPanX = panX
        touchStartPanY = panY
        isTouching = true
        initialPinchDist = 0
      }
      clampPan()
      applyTransform()
    }

    vp.addEventListener('touchend', endTouch)
    vp.addEventListener('touchcancel', endTouch)
  }

  const gearDetails = {
    '': {
      title: 'ORDINARY WHITE LIGHT',
      spectrum: 'Full Spectrum (380-740nm)',
      target: 'Macro visual survey of overt physical objects, weapons, and containers in natural daylight.',
      instruction: 'Double-click any highlighted area/object to capture forensic evidence and lodge it under BNSS §176/BSA §103.',
      color: 'var(--gold)',
      bg: 'rgba(200, 162, 74, 0.08)',
      icon: '☀️'
    },
    'oblique': {
      title: 'OBLIQUE 15° RAKING LIGHT',
      spectrum: 'Low-Angle Directional',
      target: 'Footprint relief, tyre track impressions, and floor surface dust patterns casting high-contrast shadows.',
      instruction: 'Tilted light casts high-contrast shadows. Double-click illuminated impression in Grid H4 to capture.',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      icon: '📐'
    },
    'uv': {
      title: 'UV 365nm BLACKLIGHT',
      spectrum: 'Longwave Ultraviolet',
      target: 'Fluorescent biological fluids, semen/saliva, organic stains, and trace evidence.',
      instruction: 'Fluorescent stains glow brightly under UV. Double-click illuminated trace in Grid F5/H6 to document.',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.08)',
      icon: '🟣'
    },
    'als': {
      title: 'ALS 450nm BLUE OPTIC',
      spectrum: 'Narrowband Blue Excitation',
      target: 'Latent sebaceous fingerprints, skin oils, and microscopic fibers on smooth surfaces.',
      instruction: 'Blue excitation reveals latent oil ridges. Double-click fingerprint in Grid E4 to capture.',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.08)',
      icon: '🟢'
    },
    'chemical': {
      title: 'LUMINOL CHEMILUMINESCENCE',
      spectrum: 'Self-Luminous Catalysis',
      target: 'Wiped, washed, or latent blood pools, splatters, and trailing patterns.',
      instruction: 'Catalytic iron reaction glows in total darkness. Double-click glowing drag trail in Grid G5 to capture.',
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.08)',
      icon: '🧪'
    }
  }

  const setGear = (g) => {
    gear = g
    $$('.optic-btn').forEach(x => x.classList.toggle('active', x.dataset.gear === g))
    if (vp) {
      vp.className = 'scene-viewport ' + (g ? 'mode-' + g : 'mode-normal') + (g === 'chemical' ? ' mode-luminol' : '')
    }
    
    // Update the high-fidelity guidance card dynamically
    const info = gearDetails[g] || gearDetails['']
    
    const cardEl = $('#st-guidance-card')
    const accentEl = $('#st-accent-bar')
    const iconEl = $('#st-info-icon')
    const titleEl = $('#st-info-title')
    const spectrumEl = $('#st-info-spectrum')
    const statusEl = $('#st-status-badge')
    const targetEl = $('#st-info-target')
    const instructionEl = $('#st-info-instruction-text')
    const bulbEl = $('#st-info-bulb')
    
    if (cardEl) {
      cardEl.style.borderColor = info.color + '55' // semi-transparent border
    }
    if (accentEl) {
      accentEl.style.backgroundColor = info.color
    }
    if (iconEl) {
      iconEl.textContent = info.icon
    }
    if (titleEl) {
      titleEl.textContent = info.title
    }
    if (spectrumEl) {
      spectrumEl.textContent = info.spectrum
      spectrumEl.style.borderColor = info.color + '44'
      spectrumEl.style.color = info.color
    }
    if (statusEl) {
      statusEl.style.color = info.color
      statusEl.style.backgroundColor = info.color + '22'
      statusEl.style.borderColor = info.color + '44'
    }
    if (targetEl) {
      targetEl.textContent = info.target
    }
    if (instructionEl) {
      instructionEl.textContent = info.instruction
    }
    if (bulbEl) {
      bulbEl.style.color = info.color
    }

    const coordsEl = $('#cs-coords')
    if (coordsEl) {
      const gName = g === 'uv' ? 'UV 365nm' : g === 'als' ? 'ALS 450nm' : g === 'oblique' ? 'OBLIQUE 15°' : g === 'chemical' ? 'LUMINOL BIO' : 'ORDINARY LIGHT'
      coordsEl.textContent = `LOC: 19.1173° N, 72.8777° E • OPTIC: ${gName}`
    }
  }
  setGear('')
  $$('.optic-btn').forEach(x => x.onclick = () => setGear(x.dataset.gear))
  window.__gear = () => gear

  $$('[data-step]').forEach(b => b.onclick = () => act(async () => {
    const step = b.dataset.step
    if (step === 'canvassed') {
      G.sceneMode = 'canvass'
      render()
      toast('Canvass locality', 'Select sectors and interview local inhabitants to obtain statutory panch assent (BNSS s.103).', 'info')
      return
    }
    const r = await api(`/cases/${s.caseId}/scene/step`, { method: 'POST', body: JSON.stringify({ step: b.dataset.step }) })
    mergeBundle(r); render()
    if (step === 'sealed') toast('Crime scene sealed', 'Scene secured and sealed. You can still inspect evidence and prepare seizure memos.', 'good')
    else toast('Protocol step recorded', 'Entered into the master case diary.', 'good')
  }))

  const triggerCameraFlash = () => {
    const flashEl = $('#scene-cam-flash')
    if (flashEl) {
      flashEl.classList.remove('flashing')
      void flashEl.offsetWidth
      flashEl.classList.add('flashing')
      setTimeout(() => flashEl.classList.remove('flashing'), 180)
    }
  }

  const getActiveSpectrumItem = () => {
    if (gear === 'uv') {
      return { name: 'Latent Blood Spatter (Escort Impact)', grid: 'F5', cat: 'biological', desc: 'Arterial impact spatter droplets matching victim Ramzan Sheikh (O+).', sig: 'Establishes exact point of impact and physical violence under BNS s.309.' }
    } else if (gear === 'als') {
      return { name: 'Latent Fingerprint on Van Latch', grid: 'E4', cat: 'physical', desc: 'Friction ridge pattern deposited in sweat/sebum on metallic rear cash vault latch.', sig: 'AFIS 12-point individualising match linking accused to forcible vault opening.' }
    } else if (gear === 'oblique') {
      return { name: 'Footwear Impression with 3.2mm Lug Cut', grid: 'H4', cat: 'physical', desc: 'Deep mud impression from size 9 combat boot with accidental 3.2mm stone cut at heel.', sig: 'Unique physical match to footwear seized from suspect accused.' }
    } else if (gear === 'chemical') {
      return { name: 'Wiped Chemiluminescent Drag Track', grid: 'G5', cat: 'biological', desc: 'Diluted catalytic hemoglobin reaction trail showing direction of suspect flight.', sig: 'Direct physical link proving suspect fled across Marol culvert embankment.' }
    } else {
      return { name: 'Bloodstained Hexagonal Iron Rod', grid: 'F4', cat: 'physical', desc: '342mm modified steel rod with knurled grip and impact end deformed with hair and tissue.', sig: 'Primary weapon of offence causing grevious hurt under BNS s.115 and robbery s.309.' }
    }
  }

  const gearMatches = (req, active) => {
    req = (req || '').toLowerCase()
    active = (active || 'ordinary').toLowerCase()
    if (!req || req === 'white' || req === 'ordinary' || req === 'none') {
      return !active || active === 'ordinary' || active === 'white' || active === 'none'
    }
    if (req === 'uv') return active === 'uv' || active === 'chemical' || active === 'luminol'
    if (req === 'chemical' || req === 'luminol') return active === 'chemical' || active === 'luminol' || active === 'uv'
    if (req === 'als') return active === 'als'
    if (req === 'oblique') return active === 'oblique'
    return req === active
  }

  const triggerInSituEvidence = async (target) => {
    if (!target) return

    if (!s.scene.walkthrough) {
      toast('Process the scene first', 'Complete the cordon and walk-through before examining individual items — otherwise you risk trampling the scene.', 'warn')
      return
    }

    // Check if matching exhibit already exists in state
    let ex = (s.exhibits || []).find(e => 
      (target.grid && e.gridRef && e.gridRef.toUpperCase() === target.grid.toUpperCase()) ||
      (target.name && e.name && e.name.toLowerCase().includes(target.name.toLowerCase()))
    )

    // 1. Interrogation disclosure gating check
    if (ex && ex.requiresDisclosure && !ex.unlockedByDisclosure && !ex.disclosed) {
      toast('Evidence Not Disclosed', 'This item is concealed and can only be discovered at the crime scene once a suspect/POI discloses its location under BSA §23 during interrogation.', 'warn')
      return
    }

    // 2. Optical spectrum light matching check
    const reqGear = (target.gearReq || (ex ? ex.requiredLight : '') || '').toLowerCase()
    const activeGear = (gear || 'ordinary').toLowerCase()

    if (reqGear && !gearMatches(reqGear, activeGear)) {
      const reqLabel = reqGear === 'uv' ? 'UV 365nm' : reqGear === 'als' ? 'ALS 450nm' : reqGear === 'oblique' ? 'Oblique 15°' : reqGear === 'chemical' ? 'Luminol Bio' : 'Ordinary White Light'
      const activeLabel = activeGear === 'uv' ? 'UV 365nm' : activeGear === 'als' ? 'ALS 450nm' : activeGear === 'oblique' ? 'Oblique 15°' : activeGear === 'chemical' ? 'Luminol Bio' : 'Ordinary White Light'
      toast('Optical Spectrum Mismatch', `Trace is invisible under ${activeLabel}. Switch optical light spectrum to ${reqLabel} to illuminate and photograph this trace.`, 'warn')
      return
    }

    triggerCameraFlash()

    if (laser) {
      laser.style.display = 'block'
      setTimeout(() => { if (laser) laser.style.display = 'none' }, 1800)
    }

    await act(async () => {
      const payload = {
        exhibitId: ex ? ex.id : undefined,
        name: target.name || (ex ? ex.name : 'Latent Crime Scene Trace'),
        category: target.cat || (ex ? ex.category : 'physical'),
        gridRef: target.grid || (ex ? ex.gridRef : 'G3'),
        described: target.desc || (ex ? ex.described : 'Forensic trace isolated in-situ.'),
        significance: target.sig || (ex ? ex.significance : 'Material evidence linked to crime locus.'),
        gear: gear || 'ordinary',
        gearUsed: gear ? [gear] : [],
        caseNo: s.caseNo,
        title: s.title,
        day: s.day
      }
      const r = await api(`/cases/${s.caseId}/scene/examine`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      mergeBundle(r)
      render()

      const freshEx = (G.snapshot.exhibits || []).find(e => 
        (target.grid && e.gridRef && e.gridRef.toUpperCase() === target.grid.toUpperCase()) ||
        (target.name && e.name && e.name.toLowerCase().includes(target.name.toLowerCase())) ||
        (ex && e.id === ex.id)
      ) || ex

      const e = r.examination || {
        observation: `In-situ optical recovery: ${target.name || freshEx?.name}.\n${target.desc || freshEx?.described || ''}`,
        confidence: 92,
        latent_clues: [{ clue: target.sig || freshEx?.significance || 'Forensic link isolated at crime scene.', strength: 'strong', how_to_confirm: 'FSL Analysis' }],
        leads_generated: [`Exhibit ${freshEx?.exhibitNo || '—'}: Photographed in-situ with scale. Ready for seizure memo under BNSS s.103.`]
      }

      toast('Forensic Photo Captured', `LODGED: ${freshEx?.name || target.name} (Grid ${target.grid || freshEx?.gridRef}). Image recorded in evidence dossier.`, 'good')

      if (freshEx) {
        modal({
          cls: 'wide',
          title: `Macro In-Situ Examination — ${freshEx.name}`,
          body: `<div class="grid g12">
            <div>
              <div class="card" style="border-top:3px solid var(--gold)">
                <div class="card-h">
                  <h3>Forensic Observation (${gear ? gear.toUpperCase() : 'Ordinary White Light'})</h3>
                  <span class="tag green">Confidence ${e.confidence}%</span>
                </div>
                <div class="macro-inspect-box" style="margin-bottom:12px;padding:10px">
                  ${getExhibitForensicSVG(freshEx, gear)}
                  <div style="font-size:13.5px;line-height:1.65;color:#e6edf3;margin-top:8px">${nl(e.observation)}</div>
                </div>
                ${e.caution ? `<div class="legalbox" style="border-color:var(--amber)"><div class="lb-h" style="color:#f0b45f">&#9888; Procedural Caution</div>${esc(e.caution)}</div>` : ''}
                <div class="rule"></div>
                <div class="kv"><span class="k">Grid Reference</span><span class="v">${esc(freshEx.gridRef || target.grid || 'In-Situ')}</span></div>
                <div class="kv"><span class="k">Light Spectrum</span><span class="v">${esc(gear ? gear.toUpperCase() : 'Ordinary Light')}</span></div>
                <div class="kv"><span class="k">Target Laboratory</span><span class="v">${esc(e.requires?.expert || 'Forensic Science Laboratory')}</span></div>
              </div>
            </div>
            <div>
              <div class="card">
                <div class="card-h"><h3>Evidentiary Value &amp; Latent Clues</h3></div>
                ${(e.latent_clues || []).map(c => `
                  <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px dotted #23344a">
                    <span class="tag ${c.strength === 'strong' ? 'green' : c.strength === 'moderate' ? 'amber' : 'grey'}">${esc(c.strength)}</span>
                    <div style="font-size:13.5px;margin-top:6px;color:#cfdcea">${esc(c.clue)}</div>
                    <div class="cd mono dim" style="font-size:11px;margin-top:4px">Confirm by: ${esc(c.how_to_confirm)}</div>
                  </div>`).join('') || '<div class="dim">No specific latent inference recorded.</div>'}
              </div>
              ${(e.leads_generated || []).length ? `
                <div class="card">
                  <div class="card-h"><h3>Investigation Leads</h3></div>
                  ${e.leads_generated.map(l => `<div class="check ok"><span class="ci">&#8594;</span><span class="cn">${esc(l)}</span></div>`).join('')}
                </div>` : ''}
            </div>
          </div>`,
          footer: `<button class="btn left pri" id="em-seize">Record Seizure Memo (BNSS s.103)</button><button class="btn" data-close>Close</button>`,
          after: (veil, close) => {
            const b = veil.querySelector('#em-seize')
            if (b) b.onclick = () => { close(); seizureModal(freshEx) }
          }
        })
      }
    })
  }

  const triggerExamineExhibit = async (ex) => {
    if (!ex) return

    if (!s.scene.walkthrough) {
      toast('Process the scene first', 'Complete the cordon and walk-through before examining individual items — otherwise you risk trampling the scene.', 'warn')
      return
    }

    if (ex.requiresDisclosure && !ex.unlockedByDisclosure) {
      toast('Evidence Not Disclosed', 'This item is concealed and can only be discovered at the crime scene once a suspect/POI discloses its location under BSA §23 during interrogation.', 'warn')
      return
    }

    const reqGear = (ex.requiredLight || '').toLowerCase()
    const activeGear = (gear || 'ordinary').toLowerCase()
    if (reqGear && !gearMatches(reqGear, activeGear)) {
      const reqLabel = reqGear === 'uv' ? 'UV 365nm' : reqGear === 'als' ? 'ALS 450nm' : reqGear === 'oblique' ? 'Oblique 15°' : reqGear === 'chemical' ? 'Luminol Bio' : 'Ordinary White Light'
      const activeLabel = activeGear === 'uv' ? 'UV 365nm' : activeGear === 'als' ? 'ALS 450nm' : activeGear === 'oblique' ? 'Oblique 15°' : activeGear === 'chemical' ? 'Luminol Bio' : 'Ordinary White Light'
      toast('Optical Spectrum Mismatch', `Trace is invisible under ${activeLabel}. Switch optical light spectrum to ${reqLabel} to illuminate and photograph this trace.`, 'warn')
      return
    }

    triggerCameraFlash()

    // Trigger laser sweep animation
    if (laser) {
      laser.style.display = 'block'
      setTimeout(() => { if (laser) laser.style.display = 'none' }, 2200)
    }

    await act(async () => {
      const r = await api(`/cases/${s.caseId}/scene/examine`, {
        method: 'POST',
        body: JSON.stringify({
          exhibitId: ex.id,
          gear: gear,
          gearUsed: gear ? [gear] : [],
          caseNo: s.caseNo,
          title: s.title,
          day: s.day
        })
      })
      mergeBundle(r)
      render()
      const e = r.examination || {
        observation: `In-situ recovery: ${ex.name}.\n${ex.described || ''}`,
        confidence: 88,
        latent_clues: [{ clue: ex.significance || 'Forensic connection isolated at crime scene.', strength: 'strong', how_to_confirm: 'FSL Analysis' }],
        leads_generated: [`Exhibit ${ex.exhibitNo || '—'}: Ready for seizure under BNSS s.103.`]
      }

      modal({
        cls: 'wide',
        title: 'Macro In-Situ Examination — ' + ex.name,
        body: `<div class="grid g12">
          <div>
            <div class="card" style="border-top:3px solid var(--gold)">
              <div class="card-h">
                <h3>Forensic Observation (${gear ? gear.toUpperCase() : 'Ordinary White Light'})</h3>
                <span class="tag green">Confidence ${e.confidence}%</span>
              </div>
              <div class="macro-inspect-box" style="margin-bottom:12px;padding:10px">
                ${getExhibitForensicSVG(ex, gear)}
                <div style="font-size:13.5px;line-height:1.65;color:#e6edf3;margin-top:8px">${nl(e.observation)}</div>
              </div>
              ${e.caution ? `<div class="legalbox" style="border-color:var(--amber)"><div class="lb-h" style="color:#f0b45f">&#9888; Procedural Caution</div>${esc(e.caution)}</div>` : ''}
              <div class="rule"></div>
              <div class="kv"><span class="k">Grid Reference</span><span class="v">${esc(ex.gridRef || 'Recorded in situ')}</span></div>
              <div class="kv"><span class="k">Spectrum Used</span><span class="v">${esc(gear ? gear.toUpperCase() : 'Ordinary Light')}</span></div>
              <div class="kv"><span class="k">Target Laboratory</span><span class="v">${esc(e.requires?.expert || 'Forensic Science Laboratory')}</span></div>
            </div>
          </div>
          <div>
            <div class="card">
              <div class="card-h"><h3>Evidentiary Value &amp; Latent Clues</h3></div>
              ${(e.latent_clues || []).map(c => `
                <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px dotted #23344a">
                  <span class="tag ${c.strength === 'strong' ? 'green' : c.strength === 'moderate' ? 'amber' : 'grey'}">${esc(c.strength)}</span>
                  <div style="font-size:13.5px;margin-top:6px;color:#cfdcea">${esc(c.clue)}</div>
                  <div class="cd mono dim" style="font-size:11px;margin-top:4px">Confirm by: ${esc(c.how_to_confirm)}</div>
                </div>`).join('') || '<div class="dim">No specific latent inference recorded.</div>'}
            </div>
            ${(e.leads_generated || []).length ? `
              <div class="card">
                <div class="card-h"><h3>Investigation Leads</h3></div>
                ${e.leads_generated.map(l => `<div class="check ok"><span class="ci">&#8594;</span><span class="cn">${esc(l)}</span></div>`).join('')}
              </div>` : ''}
          </div>
        </div>`,
        footer: `<button class="btn left pri" id="em-seize">Record Seizure Memo (BNSS s.103)</button><button class="btn" data-close>Close</button>`,
        after: (veil, close) => {
          const b = veil.querySelector('#em-seize')
          if (b) b.onclick = () => {
            close()
            const freshEx = (G.snapshot.exhibits || []).find(x => String(x.id) === String(ex.id)) || ex
            seizureModal(freshEx)
          }
        }
      })
    })
  }

  // Double-Click and Double-Tap Handler on the Crime Scene Viewport
  const handleSceneDblClick = (e, clientX, clientY) => {
    if (e) {
      e.preventDefault?.()
      e.stopPropagation?.()
    }
    const targetItem = getActiveSpectrumItem()
    triggerInSituEvidence(targetItem)
  }

  if (vp) {
    // Desktop Double Click on Viewport or Light Beam
    vp.ondblclick = (e) => {
      handleSceneDblClick(e, e.clientX, e.clientY)
    }

    // Touch Double-Tap on Viewport or Light Beam
    let lastTouchTime = 0
    let lastTouchX = 0, lastTouchY = 0
    vp.addEventListener('touchend', (e) => {
      const now = Date.now()
      const touch = e.changedTouches ? e.changedTouches[0] : null
      if (touch) {
        const timeDiff = now - lastTouchTime
        const dist = Math.hypot(touch.clientX - lastTouchX, touch.clientY - lastTouchY)
        if (timeDiff < 380 && dist < 32) {
          handleSceneDblClick(e, touch.clientX, touch.clientY)
          lastTouchTime = 0
          return
        }
        lastTouchTime = now
        lastTouchX = touch.clientX
        lastTouchY = touch.clientY
      }
    }, { passive: true })
  }

  // Double Click / Single Click on SVG In-Situ Evidence Elements
  $$('[data-insitu]').forEach(el => {
    el.ondblclick = (e) => {
      e.stopPropagation()
      const target = {
        name: el.dataset.name,
        grid: el.dataset.grid,
        cat: el.dataset.cat,
        desc: el.dataset.desc,
        sig: el.dataset.sig
      }
      triggerInSituEvidence(target)
    }
    el.onclick = (e) => {
      e.stopPropagation()
      if (Date.now() < suppressClickUntil || hasMoved || touchMoved) return
      const target = {
        name: el.dataset.name,
        grid: el.dataset.grid,
        cat: el.dataset.cat,
        desc: el.dataset.desc,
        sig: el.dataset.sig
      }
      triggerInSituEvidence(target)
    }
  })

  // Redo Seizure Button Click Handler on Evidence Rows
  $$('[data-redo-ex]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation()
      const exId = btn.dataset.redoEx
      const ex = (s.exhibits || []).find(x => String(x.id) === String(exId))
      if (!ex) return
      act(async () => {
        const r = await api(`/cases/${s.caseId}/exhibits/${ex.id}/reset`, { method: 'POST', body: '{}' })
        mergeBundle(r)
        render()
        toast('Exhibit seizure reset', `Exhibit ${ex.exhibitNo || ex.name} unseized. Ready to record fresh independent panch witnesses under BNSS s.103.`, 'good')
        setTimeout(() => {
          const freshEx = (G.snapshot.exhibits || []).find(x => String(x.id) === String(exId)) || { ...ex, seized: false, manuallyReset: true }
          freshEx.seized = false
          freshEx.manuallyReset = true
          seizureModal(freshEx)
        }, 80)
      })
    }
  })

  // Right-hand exhibit list click handler
  $$('.exrow[data-ex]').forEach(row => {
    row.onclick = () => {
      const exId = row.dataset.ex
      const ex = (s.exhibits || []).find(e => String(e.id) === String(exId))
      if (!ex) return
      if (ex.found) {
        exhibitModal(ex)
      } else {
        triggerExamineExhibit(ex)
      }
    }
  })

  // Landmark Marker inspection (with drag threshold check)
  $$('[data-mk]').forEach(el => el.onclick = () => {
    if (Date.now() < suppressClickUntil || hasMoved || touchMoved) return
    const mkId = el.dataset.mk || ''
    const label = el.dataset.label || mkId
    const markerExhibits = (s.exhibits || []).filter(e => e.gridRef && (e.gridRef.toLowerCase() === mkId.toLowerCase() || label.toLowerCase().includes(e.name.toLowerCase())))

    modal({
      title: 'Scene Landmark Inspection — ' + label,
      body: `<div class="paper" style="padding:18px 22px">
        <div class="paper-head"><h2>LANDMARK IN SITU RECORD</h2><p>Feature: ${esc(label)} &bull; Reference ${esc(mkId.toUpperCase())}</p></div>
        <div style="font-size:14px;line-height:1.7;margin-top:10px">
          <strong>Observation:</strong> Landmark ${esc(label)} inspected and recorded on the master scene diagram.
        </div>
        <div class="kv" style="margin-top:12px"><span class="k">Active Spectrum</span><span class="v">${gear ? esc(gear.toUpperCase()) : 'Ordinary Light'}</span></div>
        ${markerExhibits.length ? `
          <div class="rule"></div>
          <div class="hd" style="font-size:11px;color:var(--gold);margin-bottom:8px">Associated Evidence at this Landmark</div>
          ${markerExhibits.map(e => `<div class="exrow ${e.found ? 'admissible' : 'unseized'}" style="margin-top:6px">
            <span class="exno">${esc(e.exhibitNo || '?')}</span>
            <span class="exb"><span class="exn">${esc(e.name)}</span><span class="exm">${esc(e.category)} &middot; ${e.found ? 'Examined' : 'Pending sweep'}</span></span>
          </div>`).join('')}
        ` : `
          <div class="dim" style="font-size:12px;margin-top:12px">No physical evidence logged directly under this landmark marker. Sweep adjacent CSI marker tents (#1 to #7).</div>
        `}
      </div>`,
      footer: `<button class="btn" data-close>Close</button>`
    })
  })

  // CSI Evidence Marker Tent & Hotspots Click Handlers (with drag threshold check)
  $$('[data-hot]').forEach(el => el.onclick = () => {
    if (Date.now() < suppressClickUntil || hasMoved || touchMoved) return
    const grid = (el.dataset.grid || '').trim()
    const allExAtGrid = (s.exhibits || []).filter(e => e.gridRef && e.gridRef.toUpperCase() === grid.toUpperCase())

    if (!allExAtGrid.length) {
      toast('Grid ' + grid + ' — Inspection Sweep',
        'Swept under ' + (gear ? gear.toUpperCase() : 'ordinary') + ' light. No latent traces responded to this wavelength.', '')
      return
    }

    // Match exhibits based on selected light mode
    const isBioLight = gear === 'uv' || gear === 'chemical'
    const isTraceLight = gear === 'als' || gear === 'oblique'

    let targetEx = null
    if (isBioLight) {
      targetEx = allExAtGrid.find(e => !e.found && (e.category === 'biological' || /blood|dna|stain|saliva|tissue|hair|kerchief/i.test(e.name)))
    } else if (isTraceLight) {
      targetEx = allExAtGrid.find(e => !e.found && (e.category === 'physical' || /tyre|impression|paint|fibre|fingerprint|tool|mark/i.test(e.name)))
    } else {
      targetEx = allExAtGrid.find(e => !e.found && e.category !== 'biological')
    }

    if (!targetEx) {
      targetEx = allExAtGrid.find(e => !e.found)
    }

    if (targetEx) {
      triggerExamineExhibit(targetEx)
      return
    }

    // If already examined, view dossier
    if (allExAtGrid.length === 1) {
      exhibitModal(allExAtGrid[0])
    } else {
      modal({
        title: `Grid ${grid} — Recovered Exhibits (${allExAtGrid.length})`,
        body: `<div style="font-size:13px;color:var(--ink2);margin-bottom:12px">Multiple exhibits recovered at grid <strong>${esc(grid)}</strong>:</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${allExAtGrid.map(e => `
            <div class="exrow ${e.admissibility === 'admissible' ? 'admissible' : 'unseized'}" style="margin-bottom:0">
              <span class="exno">${esc(e.exhibitNo || '?')}</span>
              <span class="exb">
                <span class="exn">${esc(e.name)}</span>
                <span class="exm">${esc(e.category)} &middot; Found on day ${e.examined_day || s.day} under ${esc(e.examined_gear || 'ordinary light')}</span>
              </span>
              <button class="btn sm" id="btn-view-ex-${e.id}">View Dossier</button>
            </div>`).join('')}
        </div>`,
        footer: `<button class="btn" data-close>Close</button>`,
        after: (veil, close) => {
          allExAtGrid.forEach(e => {
            const b = veil.querySelector('#btn-view-ex-' + e.id)
            if (b) b.onclick = () => { close(); exhibitModal(e) }
          })
        }
      })
    }
  })
}

function sceneStep(step, label, days, sc) {
  const key = step === 'inquest' ? 'inquest_done' : step
  const done = !!sc[key]
  const isSealed = !!sc.sealed && step !== 'sealed'
  return `<button class="btn sm ${done ? 'gh' : ''} ${isSealed ? 'step-btn-sealed' : ''}" data-step="${step}" ${done || isSealed ? 'disabled' : ''} style="justify-content:center">
    ${done ? '&#10003; ' : ''}${label}${!done && days ? ` <span class="dim">+${days}d</span>` : ''}</button>`
}

function sceneSVG(plan, found, s) {
  const w = plan.width || 1000, h = plan.height || 620

  const isExhibitUnlocked = (nameMatch, grid) => {
    const list = s.exhibits || []
    const ex = list.find(e => {
      const matchGrid = grid && e.gridRef && e.gridRef.toUpperCase() === grid.toUpperCase()
      const matchName = nameMatch && (e.name || '').toLowerCase().includes(nameMatch.toLowerCase())
      return matchGrid || matchName
    })
    if (!ex) return false
    if (ex.isBasic) return true
    if (!ex.requiresDisclosure) return true
    return !!ex.unlockedByDisclosure || !!ex.disclosed
  }

  // Render CSI Evidence Marker Tents & Quadrant Grids (only for zones with currently unlocked exhibits)
  const hot = (plan.hotspots || []).map((hp, idx) => {
    const items = (s.exhibits || []).filter(e => {
      if (e.requiresDisclosure && !e.unlockedByDisclosure && !e.disclosed) return false
      return e.gridRef && e.gridRef.toUpperCase() === hp.id.toUpperCase()
    })
    if (items.length === 0) return ''
    const allFound = items.length > 0 && items.every(e => e.found)
    const someFound = items.some(e => e.found)
    const allSeized = items.length > 0 && items.every(e => e.seized)
    const tainted = items.some(e => e.admissibility === 'tainted' || e.admissibility === 'inadmissible')
    const ex1 = items[0]
    const tentNum = ex1 ? (ex1.exhibitNo || (idx + 1)) : (idx + 1)

    // Center coordinates for CSI Marker Tent
    const cx = hp.x + hp.w / 2
    const cy = hp.y + hp.h / 2

    const tentFill = tainted ? '#ff4d4f' : allSeized ? '#e0be6c' : someFound ? '#34d399' : '#f59e0b'
    const statusCls = allSeized ? 'seized' : someFound ? 'found' : 'unfound'

    return `<g class="hot marker-tent ${statusCls}" data-hot="${ex1 ? ex1.id : ''}" data-grid="${hp.id}">
      <title>CSI Marker #${tentNum} &bull; Grid ${esc(hp.id)}: ${esc(hp.label || 'Search Zone')} &bull; ${items.length} item(s)</title>
      
      <!-- Quadrant search box -->
      <rect class="hotrect ${tainted ? 'tainted' : allSeized ? 'seized' : someFound ? 'found' : ''}" x="${hp.x}" y="${hp.y}" width="${hp.w}" height="${hp.h}" rx="4"/>
      
      <!-- 3D CSI Yellow Evidence Marker Tent -->
      <g transform="translate(${cx - 16}, ${cy - 22})">
        <!-- Shadow -->
        <ellipse cx="16" cy="32" rx="18" ry="5" fill="rgba(0,0,0,0.6)"/>
        <!-- Tent Left Face -->
        <polygon points="16,4 4,28 16,30" fill="${tentFill}" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
        <!-- Tent Right Face -->
        <polygon points="16,4 16,30 28,28" fill="${allSeized ? '#c8a24a' : someFound ? '#059669' : '#d97706'}"/>
        <!-- Tent Ridge Line -->
        <line x1="16" y1="4" x2="16" y2="30" stroke="#000000" stroke-width="0.8" opacity="0.4"/>
        <!-- Number on tent -->
        <text x="16" y="24" text-anchor="middle" font-family="Oswald, Impact, sans-serif" font-size="14" font-weight="700" fill="#000000">${tentNum}</text>
      </g>

      <!-- Grid Label -->
      <text class="hotlabel" x="${hp.x + 8}" y="${hp.y + 16}">${hp.id}</text>
      ${items.length ? `<text x="${hp.x + 8}" y="${hp.y + hp.h - 8}" style="font-family:IBM Plex Mono;font-size:11px;font-weight:600" fill="${tainted ? '#ff8b86' : allSeized ? '#e0be6c' : someFound ? '#6fd39b' : '#f59e0b'}">${items.map(e => e.found ? (e.exhibitNo ? 'Ex.' + e.exhibitNo : 'Found') : 'Pending').join(' &middot; ')}</text>` : ''}
    </g>`
  }).join('')

  // Landmark Markers (Cash Van, Road Verge, Culvert, Tea Stall)
  const markers = (plan.markers || []).map(m => {
    const col = m.kind === 'vehicle' ? '#38bdf8' : m.kind === 'body' ? '#f87171' : m.kind === 'path' ? '#94a3b8' : '#fbbf24'
    return `<g class="mk" data-mk="${esc(m.id || '')}" data-label="${esc(m.label || '')}" style="cursor:pointer">
      <title>${esc(m.label || '')} (Click to inspect landmark)</title>
      <circle cx="${m.x}" cy="${m.y}" r="12" fill="${col}" opacity=".25"/>
      <circle cx="${m.x}" cy="${m.y}" r="5" fill="${col}" stroke="#ffffff" stroke-width="1.5"/>
      <rect x="${m.x + 12}" y="${m.y - 12}" width="${esc(m.label).length * 8 + 14}" height="22" rx="3" fill="rgba(10,14,20,0.85)" stroke="${col}" stroke-width="0.8"/>
      <text x="${m.x + 19}" y="${m.y + 3}" style="font-family:IBM Plex Mono;font-size:11px;font-weight:600" fill="${col}">${esc(m.label)}</text>
    </g>`
  }).join('')

  return `<svg class="scene-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Crime Scene Diagram">
    <defs>
      <!-- Asphalt Gritty Surface Texture -->
      <pattern id="asphalt-pat" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#0d1118"/>
        <circle cx="3" cy="4" r="1.1" fill="#18202d"/>
        <circle cx="11" cy="9" r="1.3" fill="#080a0f"/>
        <circle cx="17" cy="15" r="0.9" fill="#20293a"/>
        <circle cx="6" cy="16" r="1.2" fill="#141a24"/>
      </pattern>
      <!-- Caution Police Tape Ribbon Pattern -->
      <pattern id="police-tape" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="14" height="28" fill="#eab308"/>
        <rect x="14" width="14" height="28" fill="#090d14"/>
      </pattern>
      <!-- 3D Van Metal Gradient -->
      <linearGradient id="vanBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="50%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <!-- Water Culvert Gradient -->
      <linearGradient id="culvertGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0c1920"/>
        <stop offset="50%" stop-color="#081016"/>
        <stop offset="100%" stop-color="#04080b"/>
      </linearGradient>
    </defs>

    <!-- Base Terrain Ground Plane -->
    <rect width="${w}" height="${h}" fill="url(#asphalt-pat)"/>

    <!-- Upper Roadside Earth & Stall Verge (y: 0 to 200) -->
    <rect x="0" y="0" width="${w}" height="200" fill="#121720"/>
    <!-- Grass / Weeds micro-strokes on Verge -->
    <g stroke="#1b2936" stroke-width="1.2" opacity="0.4">
      <line x1="50" y1="190" x2="52" y2="178"/><line x1="54" y1="190" x2="57" y2="176"/>
      <line x1="180" y1="190" x2="178" y2="175"/><line x1="184" y1="190" x2="188" y2="177"/>
      <line x1="380" y1="190" x2="382" y2="176"/><line x1="520" y1="190" x2="525" y2="174"/>
    </g>

    <!-- Main Asphalt Roadway with Perspective Taper (y: 200 to 450) -->
    <path d="M0 200 L${w} 200 L${w} 450 L0 450 Z" fill="#151c27" stroke="#253245" stroke-width="2"/>
    <!-- Yellow Dashed Road Centerline -->
    <line x1="0" y1="325" x2="${w}" y2="325" stroke="#facc15" stroke-width="3.5" stroke-dasharray="28 20" opacity="0.75"/>
    <!-- White Shoulder Edge Lines -->
    <line x1="0" y1="205" x2="${w}" y2="205" stroke="#64748b" stroke-width="2" opacity="0.6"/>
    <line x1="0" y1="445" x2="${w}" y2="445" stroke="#64748b" stroke-width="2" opacity="0.6"/>

    <!-- Realistic 3D Deceleration Tyre Skid Marks with Friction Shadow -->
    <g opacity="0.82">
      <path d="M 90,295 Q 210,312 360,318" stroke="#06090e" stroke-width="14" stroke-linecap="round" filter="blur(1.5px)"/>
      <path d="M 95,345 Q 215,358 365,364" stroke="#06090e" stroke-width="14" stroke-linecap="round" filter="blur(1.5px)"/>
      <path d="M 90,295 Q 210,312 360,318" stroke="#1c2430" stroke-width="8" stroke-linecap="round" stroke-dasharray="12 4" opacity="0.6"/>
      <path d="M 95,345 Q 215,358 365,364" stroke="#1c2430" stroke-width="8" stroke-linecap="round" stroke-dasharray="12 4" opacity="0.6"/>
    </g>

    <!-- Lower Culvert Overflow & Soft Muddy Shoulder (y: 450 to 620) -->
    <rect x="0" y="450" width="${w}" height="170" fill="url(#culvertGrad)"/>
    <line x1="0" y1="450" x2="${w}" y2="450" stroke="#334155" stroke-width="4"/>
    <!-- Mud Silt Ripple Lines -->
    <path d="M 0,490 Q 250,520 500,495 T ${w},510" fill="none" stroke="#172633" stroke-width="2" opacity="0.7"/>
    <path d="M 0,540 Q 300,565 600,545 T ${w},555" fill="none" stroke="#101c27" stroke-width="2" opacity="0.6"/>
    <text x="36" y="590" style="font-family:IBM Plex Mono;font-size:11.5px;letter-spacing:0.12em" fill="#475569">NATURAL CULVERT EMBANKMENT &bull; SOFT SILT DRAINAGE</text>

    <!-- Krishna Tea Stall Structure (Upper Right) -->
    <g transform="translate(670, 35)">
      <!-- Stall Shadow -->
      <rect x="8" y="14" width="290" height="140" rx="4" fill="rgba(0,0,0,0.7)" filter="blur(4px)"/>
      <!-- Wooden Floor Platform -->
      <rect x="0" y="8" width="290" height="135" rx="4" fill="#1c1917" stroke="#44403c" stroke-width="1.5"/>
      <!-- Corrugated Tin Roof Canopy -->
      <rect x="-5" y="-5" width="300" height="42" fill="#292524" stroke="#78716c" stroke-width="1"/>
      <line x1="30" y1="-5" x2="30" y2="37" stroke="#44403c" stroke-width="1.5"/>
      <line x1="90" y1="-5" x2="90" y2="37" stroke="#44403c" stroke-width="1.5"/>
      <line x1="150" y1="-5" x2="150" y2="37" stroke="#44403c" stroke-width="1.5"/>
      <line x1="210" y1="-5" x2="210" y2="37" stroke="#44403c" stroke-width="1.5"/>
      <line x1="270" y1="-5" x2="270" y2="37" stroke="#44403c" stroke-width="1.5"/>
      <!-- Signboard -->
      <rect x="25" y="45" width="240" height="24" rx="3" fill="#0f172a" stroke="#e0be6c" stroke-width="1"/>
      <text x="145" y="61" text-anchor="middle" style="font-family:Oswald;font-size:12px;font-weight:700;letter-spacing:1.2px" fill="#e0be6c">KRISHNA TEA STALL &bull; EYEWITNESS LOCUS</text>
      <!-- Serving Counter Table -->
      <rect x="25" y="80" width="240" height="24" rx="2" fill="#2e261f" stroke="#574838" stroke-width="1"/>
      <circle cx="60" cy="92" r="5" fill="#94a3b8" stroke="#cbd5e1" stroke-width="0.8"/> <!-- Chai Kettle -->
      <!-- Eyewitness Wooden Stool -->
      <circle cx="210" cy="120" r="10" fill="#443428" stroke="#78593a" stroke-width="1.5"/>
      <text x="210" y="123" text-anchor="middle" font-family="monospace" font-size="7.5" fill="#e0be6c">PANJA</text>
    </g>

    <!-- 3D Armoured Cash Logistics Van Vector Graphic (Angled at 7°) -->
    <g transform="translate(320, 235) rotate(7)">
      <!-- Heavy Cast Drop Shadow -->
      <rect x="6" y="12" width="240" height="110" rx="14" fill="rgba(0,0,0,0.85)" filter="blur(6px)"/>
      <!-- Main Armoured Van Hull -->
      <rect x="0" y="0" width="240" height="106" rx="10" fill="url(#vanBody)" stroke="#38bdf8" stroke-width="2"/>
      
      <!-- Front Driver & Escort Cabin Windows (Reflective Blue Glass) -->
      <rect x="16" y="14" width="62" height="78" rx="5" fill="#0c2340" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M 22,20 L 68,78" stroke="#38bdf8" stroke-width="1" opacity="0.4"/>
      <!-- Escort Seat Headrest -->
      <rect x="30" y="30" width="16" height="24" rx="3" fill="#1e293b"/>
      <rect x="52" y="30" width="16" height="24" rx="3" fill="#1e293b"/>
      
      <!-- Company Branding Logo -->
      <text x="96" y="58" style="font-family:Oswald;font-size:12px;font-weight:700;letter-spacing:1px" fill="#38bdf8">SUNRISE LOGISTICS</text>
      <text x="96" y="72" style="font-family:IBM Plex Mono;font-size:8.5px" fill="#94a3b8">CASH TRANSIT UNIT № 04</text>
      
      <!-- Rear Armoured Strongroom Locker Compartment -->
      <rect x="175" y="10" width="55" height="86" rx="4" fill="#090d16" stroke="#facc15" stroke-width="1.5" stroke-dasharray="5 3"/>
      <!-- Rear Door Forced Open Angle (Swing Door) -->
      <path d="M 230,14 L 255,25 L 255,95 L 230,88 Z" fill="#1e293b" stroke="#facc15" stroke-width="1.5"/>
      <text x="180" y="57" style="font-family:IBM Plex Mono;font-size:8.5px;font-weight:bold" fill="#facc15">VAULT</text>
      
      <!-- Ballistic / Impact Strike Trajectory Vector -->
      <line x1="-70" y1="52" x2="16" y2="52" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 3"/>
      <circle cx="16" cy="52" r="3.5" fill="#ef4444" filter="drop-shadow(0 0 4px #ef4444)"/>
    </g>

    <!-- Police Cordon Caution Tape Ribbons (Crossing Scene) -->
    <polygon points="0,194 250,194 250,208 0,208" fill="url(#police-tape)" opacity="0.88"/>
    <polygon points="730,194 ${w},194 ${w},208 730,208" fill="url(#police-tape)" opacity="0.88"/>
    <polygon points="0,442 290,442 290,456 0,456" fill="url(#police-tape)" opacity="0.88"/>
    <polygon points="710,442 ${w},442 ${w},456 710,456" fill="url(#police-tape)" opacity="0.88"/>

    <!-- ================================================================= -->
    <!-- REALISTIC CASE-SPECIFIC IN-SITU EVIDENCE LAYERS (LIGHT SENSITIVE)  -->
    <!-- Visible dynamically under matching forensic spectra (UV, ALS, etc)-->
    <!-- ================================================================= -->

    <!-- 1. LATENT BIOLOGICAL BLOOD SPATTER ON ASPHALT (Grid F5 / x:475, y:425) -->
    <!-- Visible primarily under UV 365nm and Luminol Chemiluminescence -->
    ${isExhibitUnlocked('blood spatter', 'F5') ? `
    <g class="spectrum-item spectrum-uv-only spectrum-luminol-only" 
       data-insitu="true" data-grid="F5" data-name="Latent Blood Spatter (Escort Impact)" 
       data-cat="biological" data-gear-req="uv"
       data-desc="Arterial impact spatter droplets matching victim Ramzan Sheikh (O+). High DNA yield."
       data-sig="Establishes exact point of impact and physical violence under BNS s.309.">
      <title>UV / Luminol: Latent Blood Spatter (Grid F5) &bull; Double-click to Photograph &amp; Lodge</title>
      <circle cx="475" cy="425" r="16" fill="#4ade80" opacity="0.95"/>
      <circle cx="498" cy="434" r="10" fill="#22c55e" opacity="0.9"/>
      <circle cx="458" cy="442" r="8" fill="#4ade80" opacity="0.9"/>
      <circle cx="515" cy="446" r="6" fill="#86efac" opacity="0.85"/>
      <!-- Target ring indicator for discovery -->
      <circle cx="480" cy="430" r="32" fill="none" stroke="#4ade80" stroke-width="2" stroke-dasharray="4 3"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(390, 385)">
        <rect width="180" height="22" rx="4" fill="rgba(6, 78, 59, 0.94)" stroke="#4ade80" stroke-width="1.2"/>
        <text x="90" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#a7f3d0" letter-spacing="0.5">🟣 UV: BLOOD SPATTER &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- 2. LATENT SEBACEOUS FINGERPRINT ON REAR VAN LOCKER (Grid E4 / x:580, y:280) -->
    <!-- Visible primarily under ALS 450nm Alternate Light Source (Unlocked via Interrogation / Witness Disclosure) -->
    ${isExhibitUnlocked('fingerprint', 'E4') ? `
    <g class="spectrum-item spectrum-als-only" 
       data-insitu="true" data-grid="E4" data-name="Latent Fingerprint on Van Latch" 
       data-cat="physical" data-gear-req="als"
       data-desc="Friction ridge pattern deposited in sweat/sebum on metallic rear cash vault latch."
       data-sig="AFIS 12-point individualising match linking accused to forcible vault opening.">
      <title>ALS 450nm: Latent Friction Ridge Fingerprint (Grid E4) &bull; Double-click to Photograph &amp; Lodge</title>
      <!-- Fingerprint whorl loops -->
      <ellipse cx="580" cy="280" rx="10" ry="14" fill="none" stroke="#38bdf8" stroke-width="2.2"/>
      <ellipse cx="580" cy="280" rx="18" ry="22" fill="none" stroke="#38bdf8" stroke-width="1.8"/>
      <ellipse cx="580" cy="280" rx="26" ry="30" fill="none" stroke="#38bdf8" stroke-width="1.4"/>
      <circle cx="580" cy="280" r="36" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="5 3"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(488, 236)">
        <rect width="185" height="22" rx="4" fill="rgba(8, 47, 73, 0.94)" stroke="#38bdf8" stroke-width="1.2"/>
        <text x="92" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#bae6fd" letter-spacing="0.5">🟢 ALS: LATENT RIDGE &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- 3. DEEP TYRE TREAD & SUSPECT FOOTWEAR IMPRESSION (Grid H4 / x:210, y:500) -->
    <!-- Visible with High Contrast under 15° Oblique Raking Light (Unlocked via Interrogation / Witness Disclosure) -->
    ${isExhibitUnlocked('footwear', 'H4') ? `
    <g class="spectrum-item spectrum-oblique-only" 
       data-insitu="true" data-grid="H4" data-name="Footwear Impression with 3.2mm Lug Cut" 
       data-cat="physical" data-gear-req="oblique"
       data-desc="Deep mud impression from size 9 combat boot with accidental 3.2mm stone cut at heel."
       data-sig="Unique physical match to footwear seized from suspect accused.">
      <title>Oblique 15°: Footwear / Tyre Impression Relief (Grid H4) &bull; Double-click to Photograph &amp; Lodge</title>
      <!-- Tread deep grooves with intense shadow relief -->
      <g stroke="#fbbf24" stroke-width="3" fill="none">
        <path d="M 185,480 L 225,505 L 185,530"/>
        <path d="M 210,480 L 250,505 L 210,530"/>
        <path d="M 235,480 L 275,505 L 235,530"/>
      </g>
      <!-- Unique flaw marker -->
      <circle cx="250" cy="505" r="8" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="2 2"/>
      <circle cx="230" cy="505" r="42" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="4 3"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(135, 455)">
        <rect width="190" height="22" rx="4" fill="rgba(69, 26, 3, 0.94)" stroke="#f59e0b" stroke-width="1.2"/>
        <text x="95" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#fde68a" letter-spacing="0.5">📐 OBLIQUE: BOOT LUG CUT &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- 4. WIPED LATENT BLOOD TRAIL TOWARDS TEA STALL (Grid G5 / x:560, y:470) -->
    <!-- Glowing Luminescence under Luminol (Unlocked via Interrogation / Witness Disclosure) -->
    ${isExhibitUnlocked('drag track', 'G5') ? `
    <g class="spectrum-item spectrum-luminol-only" 
       data-insitu="true" data-grid="G5" data-name="Wiped Chemiluminescent Drag Track" 
       data-cat="biological" data-gear-req="chemical"
       data-desc="Diluted catalytic hemoglobin reaction trail showing direction of suspect flight."
       data-sig="Direct physical link proving suspect fled across Marol culvert embankment.">
      <title>Luminol: Chemiluminescent Wiped Blood Track (Grid G5) &bull; Double-click to Photograph &amp; Lodge</title>
      <path d="M 520,440 Q 550,470 590,490 T 650,520" fill="none" stroke="#22d3ee" stroke-width="10" stroke-linecap="round" stroke-dasharray="14 8"/>
      <circle cx="590" cy="490" r="38" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="5 3"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(495, 425)">
        <rect width="195" height="22" rx="4" fill="rgba(8, 51, 68, 0.94)" stroke="#22d3ee" stroke-width="1.2"/>
        <text x="97" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#cffafe" letter-spacing="0.5">🧪 LUMINOL: DRAG TRACK &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- 5. DISCARDED STAINED KERCHIEF ON GRASS VERGE (Grid H6 / x:690, y:510) -->
    <!-- Biological Specimen Glowing in UV (Unlocked via Interrogation / Witness Disclosure) -->
    ${isExhibitUnlocked('kerchief', 'H6') ? `
    <g class="spectrum-item spectrum-uv-only" 
       data-insitu="true" data-grid="H6" data-name="Stained Cotton Kerchief (Suspect DNA)" 
       data-cat="biological" data-gear-req="uv"
       data-desc="Cotton handkerchief impregnated with epithelial cells and facial sweat. STR profiling ready."
       data-sig="Provides individualising autosomal DNA profile of the second unapprehended assailant.">
      <title>UV 365nm: Stained Cotton Kerchief (Grid H6) &bull; Double-click to Photograph &amp; Lodge</title>
      <rect x="675" y="495" width="35" height="28" rx="4" fill="#a855f7" opacity="0.9" stroke="#c084fc" stroke-width="2"/>
      <circle cx="692" cy="509" r="28" fill="none" stroke="#c084fc" stroke-width="1.8" stroke-dasharray="4 2"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(605, 465)">
        <rect width="180" height="22" rx="4" fill="rgba(59, 7, 100, 0.94)" stroke="#c084fc" stroke-width="1.2"/>
        <text x="90" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#f3e8ff" letter-spacing="0.5">🟣 UV: STAINED KERCHIEF &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- 6. HEAVY BLUNT WEAPON / IRON ROD (Grid F4 / x:390, y:430) -->
    <!-- Normal Survey Object with Caliper Overlay -->
    ${isExhibitUnlocked('iron rod', 'F4') ? `
    <g class="spectrum-item spectrum-normal-only" 
       data-insitu="true" data-grid="F4" data-name="Bloodstained Hexagonal Iron Rod" 
       data-cat="physical" data-gear-req=""
       data-desc="342mm modified steel rod with knurled grip and impact end deformed with hair and tissue."
       data-sig="Primary weapon of offence causing grevious hurt under BNS s.115 and robbery s.309.">
      <title>Ordinary Light: Discarded Weapon of Offence (Grid F4) &bull; Double-click to Photograph &amp; Lodge</title>
      <rect x="365" y="425" width="70" height="9" rx="2" fill="#475569" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="430" cy="429" r="6" fill="#991b1b" opacity="0.9"/>
      <circle cx="400" cy="429" r="32" fill="none" stroke="#e0be6c" stroke-width="1.8" stroke-dasharray="4 3"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(310, 390)">
        <rect width="180" height="22" rx="4" fill="rgba(15, 23, 42, 0.94)" stroke="#e0be6c" stroke-width="1.2"/>
        <text x="90" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#fde68a" letter-spacing="0.5">☀️ ORDINARY: IRON ROD &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- 7. DROPPED RBI CURRENCY NOTE SLIP (Grid D3 / x:305, y:285) -->
    <!-- Physical Money Evidence -->
    ${isExhibitUnlocked('currency note', 'D3') ? `
    <g class="spectrum-item spectrum-normal-only" 
       data-insitu="true" data-grid="D3" data-name="RBI ₹500 Currency Note (№ 7AB 849201)" 
       data-cat="financial" data-gear-req=""
       data-desc="Used ₹500 banknote bearing bank teller rubber stamp and sequence matching Sunrise Logistics payroll."
       data-sig="Directly identifies the stolen movable property required to prove theft/robbery under BNS s.309.">
      <title>Ordinary Light: Dropped Prosecution Banknote (Grid D3) &bull; Double-click to Photograph &amp; Lodge</title>
      <rect x="290" y="278" width="34" height="18" rx="2" fill="#064e3b" stroke="#34d399" stroke-width="1.2"/>
      <text x="307" y="290" text-anchor="middle" font-family="monospace" font-size="7" fill="#6ee7b7">₹500</text>
      <circle cx="307" cy="287" r="26" fill="none" stroke="#34d399" stroke-width="1.8" stroke-dasharray="3 2"/>
      <!-- Pulsing Callout Badge -->
      <g class="insitu-tag-box" transform="translate(225, 245)">
        <rect width="170" height="22" rx="4" fill="rgba(6, 78, 59, 0.94)" stroke="#34d399" stroke-width="1.2"/>
        <text x="85" y="15" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" font-weight="700" fill="#a7f3d0" letter-spacing="0.5">☀️ ORDINARY: ₹500 NOTE &bull; 2&times; CLICK</text>
      </g>
    </g>` : ''}

    <!-- Interactive CSI Marker Tents -->
    ${hot}

    <!-- Landmarks -->
    ${markers}

    <!-- Master Plan Header Badge -->
    <g transform="translate(18, 18)">
      <rect width="310" height="54" fill="rgba(8,12,18,0.94)" stroke="#23344a" rx="4"/>
      <text x="14" y="24" style="font-family:Oswald;font-size:14px;font-weight:700;letter-spacing:1px" fill="#e0be6c">CRIME SCENE PLAN &bull; CASE №${esc(s.caseNo)}</text>
      <text x="14" y="43" style="font-family:IBM Plex Mono;font-size:10.5px" fill="#94a3b8">MAROL DEPOT ROAD &bull; 3D FORENSIC SCAN</text>
    </g>
  </svg>`
}

/* ---------------------------- LABS ---------------------------- */

// Persistent simulation state for Forensic Lab queue & countdown timers
window.CFZ_LAB_SIM = window.CFZ_LAB_SIM || {
  intervalId: null,
  getSim(caseId) {
    try {
      const raw = localStorage.getItem('cfz_lab_sim_' + caseId)
      return raw ? JSON.parse(raw) : {}
    } catch (e) { return {} }
  },
  saveSim(caseId, simMap) {
    try {
      localStorage.setItem('cfz_lab_sim_' + caseId, JSON.stringify(simMap))
    } catch (e) {}
  },
  getDuration(testCode, turnaround, isRushed, isTainted) {
    let base = 14
    if (turnaround) base = Math.max(10, Math.min(28, Math.round(turnaround * 3)))
    if (/dna|ballistics|toxicology|viscera/i.test(testCode || '')) base += 6
    if (/cyber|digital|phone|device/i.test(testCode || '')) base += 4
    if (isTainted) base += 3
    if (isRushed) base = Math.max(6, Math.round(base * 0.5))
    return base
  },
  sync(s) {
    if (!s || !s.labRequests) return {}
    const simMap = this.getSim(s.caseId)
    let changed = false
    const now = Date.now()

    s.labRequests.forEach(req => {
      if (!simMap[req.id]) {
        const ex = (s.exhibits || []).find(e => e.id === req.exhibit_id)
        const dur = this.getDuration(req.test_code, req.turnaround || 5, req.rushed, ex && ex.admissibility === 'tainted')
        simMap[req.id] = {
          id: req.id,
          totalSec: dur,
          status: req.status === 'collected' ? 'collected' : req.status === 'ready' ? 'ready' : 'queued',
          startedAt: null,
          completedAt: req.status === 'collected' || req.status === 'ready' ? now : null
        }
        changed = true
      } else if (req.status === 'collected' && simMap[req.id].status !== 'collected') {
        simMap[req.id].status = 'collected'
        changed = true
      }
    })

    // Process running requests and see if any completed
    Object.values(simMap).forEach(m => {
      if (m.status === 'processing') {
        const elapsed = (now - m.startedAt) / 1000
        if (elapsed >= m.totalSec) {
          m.status = 'ready'
          m.completedAt = now
          changed = true
          const req = s.labRequests.find(r => r.id === m.id)
          if (req && req.status === 'pending') req.status = 'ready'
        }
      }
    })

    // Max 3 concurrent requests running
    const running = Object.values(simMap).filter(m => m.status === 'processing').length
    const slotsFree = Math.max(0, 3 - running)
    if (slotsFree > 0) {
      // Find oldest requests that are still in queued status
      const queuedList = s.labRequests
        .filter(r => simMap[r.id] && simMap[r.id].status === 'queued')
        .slice(0, slotsFree)

      queuedList.forEach(r => {
        simMap[r.id].status = 'processing'
        simMap[r.id].startedAt = now
        changed = true
      })
    }

    if (changed) {
      this.saveSim(s.caseId, simMap)
    }
    return simMap
  }
}

VIEWS.labs = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  if (!s.fir) return needFir('Forensic examination requires a registered case.')
  const cat = G.labCatalogue || []
  const seized = s.exhibits.filter(e => e.seized)
  const submitted = s.exhibits.filter(e => e.seized && e.admissibility !== 'tainted')

  const simMap = window.CFZ_LAB_SIM.sync(s)
  const allReqs = (s.labRequests || []).slice().reverse() // First / newest on top

  const runningCount = Object.values(simMap).filter(m => m.status === 'processing').length
  const queuedCount = Object.values(simMap).filter(m => m.status === 'queued').length
  const readyCount = Object.values(simMap).filter(m => m.status === 'ready').length

  return head('&#129514;', 'Forensic Laboratory', 'Requests, turnaround and the statutory clock &middot; day ' + s.day + ' of ' + s.dayLimit)
  + procedureCoach([
    { ok: (s.labRequests || []).length > 0, text: 'Send at least one exhibit for examination', detail: 'Untested evidence carries little weight.' },
    { ok: (s.labRequests || []).some(l => l.status === 'collected'), text: 'Collect completed reports' },
    { ok: (s.exhibits || []).filter(e => e.isDigital).every(e => e.s63Certified), text: 'Certify every electronic record under BSA s.63', detail: 'Digital evidence without a dual-signed certificate is inadmissible.' },
    { ok: (s.labRequests || []).length > 0, text: 'Log every movement of an exhibit to and from the laboratory', detail: cite('57', 'BSA') }
  ])
  + `<!-- Top Section: Send an Exhibit for Examination & Digital Evidence Integrity -->
  <div class="grid g2" style="align-items:start;margin-bottom:22px">
    <div>
      <div class="card" style="border-top:3px solid var(--gold)">
        <div class="card-h">
          <h3>Send an exhibit for examination</h3>
          <span class="tag gold">Bench Limit: 3 Max Active</span>
        </div>
        ${seized.length ? `
        <div class="fld"><label>Exhibit to Examine</label>
          <select id="lb-ex">${seized.map(e => `<option value="${e.id}">${e.exhibitNo ? 'Ex. ' + e.exhibitNo + ' — ' : ''}${esc(e.name)}${e.admissibility === 'tainted' ? '  [TAINTED]' : ''}</option>`).join('')}</select>
          <div class="hint">A tainted exhibit can still be tested, but the handling defect limits what the laboratory can establish.</div>
        </div>
        <div class="fld"><label>Forensic Examination Type</label>
          <select id="lb-test"></select>
          <div class="hint" id="lb-hint"></div>
        </div>
        <div class="fld" style="margin-top:12px;margin-bottom:14px">
          <label style="display:flex;gap:10px;align-items:center;cursor:pointer;font-family:var(--font-ui);font-size:13px;color:var(--ink2);user-select:none">
            <input type="checkbox" id="lb-rush" style="width:16px;height:16px;accent-color:var(--gold);cursor:pointer">
            <span><strong>Rushed analysis:</strong> Halve the turnaround, at the cost of confidence. Rushed work is more easily attacked.</span>
          </label>
        </div>
        <button class="btn pri" id="lb-send" style="width:100%;justify-content:center;padding:11px 18px;font-size:14px">Send to laboratory</button>
        <div class="helpbox" style="margin-top:12px"><div class="hb-h">&#9201; The statutory clock</div>Every turnaround is added to your day counter. Up to 3 requests process simultaneously; extra requests queue in sequence. Choose what goes to the heart of the offence.</div>
        ` : '<div class="vacant" style="padding:24px"><i>&#8681;</i><h3>Nothing seized yet</h3><p>An exhibit must be seized under a memo with two independent witnesses before it can go to a laboratory.</p></div>'}
      </div>
    </div>

    <div>
      <div class="card" style="border-top:3px solid var(--cyan)">
        <div class="card-h"><h3>Digital evidence integrity</h3>${cite('63', 'BSA')}</div>
        ${s.exhibits.filter(e => e.isDigital && e.found).length ? s.exhibits.filter(e => e.isDigital && e.found).map(e => `
          <div style="padding:10px 0;border-bottom:1px dotted rgba(42,52,67,.7)">
            <div class="flex between"><span class="cond" style="font-size:14px">${esc(e.exhibitNo ? 'Ex. ' + e.exhibitNo + ' — ' : '')}${esc(e.name)}</span>
            <span class="tag ${e.s63Certified ? 'green' : 'red'}">${e.s63Certified ? 's.63 certified' : 'CERTIFICATE MISSING'}</span></div>
            <div class="mono dim" style="font-size:10.5px;margin-top:3px">${e.hash ? 'SHA-256 ' + esc(e.hash.slice(0, 24)) + '…' : 'no hash taken'}</div>
            <div class="flex" style="gap:6px;margin-top:8px">
              ${!e.hash ? `<button class="btn sm gh" data-hash="${e.id}">Take image &amp; hash</button>` : ''}
              ${!e.s63Certified ? `<button class="btn sm" data-s63="${e.id}">Complete s.63 certificate</button>` : ''}
            </div>
          </div>`).join('') : '<div class="dim" style="font-size:12.5px;padding:8px 0">No electronic exhibits recovered yet. CCTV, call detail records and device extractions will appear here once recovered.</div>'}
      </div>
    </div>
  </div>

  <!-- Following Section: Requests in the system -->
  <div class="card">
    <div class="card-h" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <h3 style="display:inline-block;margin-right:10px">Requests in the system</h3>
        <span class="sp mono dim" style="font-size:11px">${allReqs.length} total logged</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span class="tag gold" style="font-size:10.5px">Active: ${runningCount}/3 Bench Slots</span>
        ${queuedCount > 0 ? `<span class="tag dim" style="font-size:10.5px">${queuedCount} Queued</span>` : ''}
        ${readyCount > 0 ? `<span class="tag green" style="font-size:10.5px">${readyCount} Ready</span>` : ''}
      </div>
    </div>

    ${allReqs.length ? `
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:6px">
        ${allReqs.map(l => labCard(l, s, simMap[l.id])).join('')}
      </div>
    ` : `
      <div class="vacant" style="padding:28px 20px">
        <i>&#129514;</i>
        <h3>No examinations requested yet</h3>
        <p>Untested evidence carries little weight. Choose the tests from above that go to the heart of the offence — newly submitted requests will appear here in sequence.</p>
      </div>
    `}
  </div>`
}

VIEWS.labs.after = async function () {
  const s = G.snapshot; if (!s) return

  // Clean up any existing simulation timer
  if (window.CFZ_LAB_SIM.intervalId) {
    clearInterval(window.CFZ_LAB_SIM.intervalId)
    window.CFZ_LAB_SIM.intervalId = null
  }

  // Set up live countdown ticker
  window.CFZ_LAB_SIM.intervalId = setInterval(() => {
    const activeView = G.view
    if (activeView !== 'labs') {
      clearInterval(window.CFZ_LAB_SIM.intervalId)
      window.CFZ_LAB_SIM.intervalId = null
      return
    }
    const currentSnap = G.snapshot
    if (!currentSnap || !currentSnap.labRequests || !currentSnap.labRequests.length) return

    const simMap = window.CFZ_LAB_SIM.getSim(currentSnap.caseId)
    const now = Date.now()
    let needsFullRender = false

    currentSnap.labRequests.forEach(req => {
      const sim = simMap[req.id]
      if (!sim) return

      if (sim.status === 'processing' && sim.startedAt) {
        const elapsed = ((now - sim.startedAt) / 1000) * 5
        const rem = Math.max(0, Math.ceil(sim.totalSec - elapsed))
        const pct = Math.min(100, Math.max(0, Math.round((elapsed / sim.totalSec) * 100)))

        // Update live DOM elements if present
        const node = $(`[data-lab-card="${req.id}"]`)
        if (node) {
          const txt = node.querySelector('.timer-text')
          if (txt) txt.textContent = rem + 's'
          const progCircle = node.querySelector('.timer-prog')
          if (progCircle) {
            // stroke-dasharray is circumference ~100
            progCircle.setAttribute('stroke-dasharray', `${pct}, 100`)
          }
          const bar = node.querySelector('.lab-progress-bar')
          if (bar) bar.style.width = pct + '%'
        }

        if (rem <= 0) {
          sim.status = 'ready'
          sim.completedAt = now
          if (req.status === 'pending') req.status = 'ready'
          needsFullRender = true
        }
      }
    })

    if (needsFullRender) {
      window.CFZ_LAB_SIM.saveSim(currentSnap.caseId, simMap)
      window.CFZ_LAB_SIM.sync(currentSnap)
      render()
      toast('Laboratory analysis complete', 'An examination report is ready for formal collection.', 'good')
    }
  }, 400)

  $$('[data-hash]').forEach(b => b.onclick = () => act(async () => {
    const r = await api(`/cases/${s.caseId}/exhibits/${b.dataset.hash}/digital`, { method: 'POST', body: '{}' })
    mergeBundle(r); render(); toast('Forensic image taken', 'Hash recorded for integrity.', 'good')
  }))
  $$('[data-s63]').forEach(b => b.onclick = () => {
    const ex = s.exhibits.find(e => String(e.id) === String(b.dataset.s63)); if (ex) s63Modal(ex)
  })
  $$('[data-collect]').forEach(b => b.onclick = () => act(async () => {
    const r = await api(`/cases/${s.caseId}/lab/collect`, { method: 'POST', body: JSON.stringify({ requestId: Number(b.dataset.collect) }) })
    const simMap = window.CFZ_LAB_SIM.getSim(s.caseId)
    if (simMap[b.dataset.collect]) {
      simMap[b.dataset.collect].status = 'collected'
      window.CFZ_LAB_SIM.saveSim(s.caseId, simMap)
    }
    mergeBundle(r); render()
    const res = r.result || (req => {
      const lr = (s.labRequests || []).find(x => x.id === Number(b.dataset.collect))
      return { test: lr?.test_name || 'Forensic Analysis', exhibit: 'Seized Exhibit', conclusion_strength: 'conclusive', confidence: 92, finding: 'Report filed and recorded in case diary.' }
    })()
    modal({ cls: 'wide', title: 'Laboratory report — ' + esc(res.test || 'Forensic Analysis'), body: reportHTML(res), footer: '<button class="btn" data-close>Close</button>' })
    toast('Report collected', 'The exhibit returned to the malkhana and the custody log was updated.', 'good')
  }))

  // Click-to-expand / collapse on collected report cards
  $$('[data-lab-card]').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return
      const rpt = card.querySelector('.rpt-collapsible')
      if (!rpt) return

      const isExpanded = card.classList.contains('expanded')

      // Collapse all other open cards
      $$('.labcard.expanded').forEach(other => {
        if (other !== card) {
          other.classList.remove('expanded')
          other.setAttribute('aria-expanded', 'false')
          const oRpt = other.querySelector('.rpt-collapsible')
          if (oRpt) oRpt.style.display = 'none'
        }
      })

      if (isExpanded) {
        card.classList.remove('expanded')
        card.setAttribute('aria-expanded', 'false')
        rpt.style.display = 'none'
      } else {
        card.classList.add('expanded')
        card.setAttribute('aria-expanded', 'true')
        rpt.style.display = 'block'
      }
    }
  })

  // Global listener for clicking outside cards to collapse
  if (!window._labOutsideClickBound) {
    window._labOutsideClickBound = true
    document.addEventListener('click', (e) => {
      if (G.view !== 'labs') return
      if (!e.target.closest('.labcard')) {
        $$('.labcard.expanded').forEach(c => {
          c.classList.remove('expanded')
          c.setAttribute('aria-expanded', 'false')
          const r = c.querySelector('.rpt-collapsible')
          if (r) r.style.display = 'none'
          const icon = c.querySelector('.expand-icon')
          if (icon) icon.innerHTML = '&#9662;'
          const tag = c.querySelector('.lab-expand-tag')
          if (tag) tag.textContent = 'TAP TO EXPAND'
        })
      }
    })
  }

  const sel = $('#lb-test'), hint = $('#lb-hint'), exSel = $('#lb-ex')
  if (!sel) return
  try {
    const c = await api(`/cases/${s.caseId}/lab/catalogue`)
    G.labCatalogue = c.catalogue || []
    const sel2 = $('#lb-test'), hint2 = $('#lb-hint'), exSel2 = $('#lb-ex'), send2 = $('#lb-send')
    if (!sel2 || !sel2.isConnected || !send2) return
    sel2.innerHTML = (G.labCatalogue || []).map(t => `<option value="${esc(t.code)}" data-turn="${t.turnaround}" data-name="${esc(t.name)}">${esc(t.name)} — about ${t.turnaround} days</option>`).join('')
    const upd = () => { const o = sel2.selectedOptions[0]; if (o && hint2) hint2.textContent = `Turnaround about ${o.dataset.turn} days, added to your statutory clock.` }
    sel2.onchange = upd; upd()
    if (exSel2) exSel2.onchange = () => {}
    send2.onclick = () => act(async () => {
      const o = sel2.selectedOptions[0]
      const r = await api(`/cases/${s.caseId}/lab/request`, { method: 'POST', body: JSON.stringify({
        exhibitId: Number(exSel2.value), testCode: sel2.value, testName: o.dataset.name,
        turnaround: Number(o.dataset.turn), rushed: !!($('#lb-rush') || {}).checked
      }) })
      mergeBundle(r); render()
      toast('Exhibit sent to laboratory', `Added to laboratory queue. Expected on day ${r.readyDay}. Confidence ~${r.confidence}%.${r.contaminated ? ' Handling defects limit finding.' : ''}`, r.contaminated ? 'warn' : 'good')
    })
  } catch (e) {}
}

function labCard(l, s, sim) {
  const isCollected = l.status === 'collected' || (sim && sim.status === 'collected')
  const isReady = !isCollected && (l.status === 'ready' || (sim && sim.status === 'ready'))
  const isProcessing = !isCollected && !isReady && sim && sim.status === 'processing'
  const isQueued = !isCollected && !isReady && !isProcessing

  let cardCls = isCollected ? 'done collected-expandable' : isReady ? 'ready' : isProcessing ? 'processing' : 'queued'
  const ex = s.exhibits.find(e => e.id === l.exhibit_id)

  let remainingSec = 0
  let progressPct = 0
  if (isProcessing && sim && sim.startedAt) {
    const elapsed = (Date.now() - sim.startedAt) / 1000
    remainingSec = Math.max(0, Math.ceil(sim.totalSec - elapsed))
    progressPct = Math.min(100, Math.max(0, Math.round((elapsed / sim.totalSec) * 100)))
  }

  // Ensure result outcome object exists for collected reports
  const res = l.result || (isCollected ? {
    test: l.test_name || 'Forensic Analysis',
    exhibit: ex ? (ex.exhibitNo ? 'Exhibit ' + ex.exhibitNo + ' — ' : '') + ex.name : 'Seized Exhibit',
    conclusion_strength: 'conclusive',
    confidence: Math.round(l.confidence || 85),
    finding: 'Scientific examination complete. Findings authenticated and entered into forensic registry.',
    expert_opinion: 'Trace materials consistent with primary crime locus.',
    supports: 'Prosecution proof established under statutory forensic standards (BSA s.39).'
  } : null)

  return `<div class="labcard ${cardCls}" data-lab-card="${l.id}" ${isCollected ? 'role="button" tabindex="0" aria-expanded="false"' : ''}>
    <div class="labcard-main">
      <!-- Circular Bubble Status Indicator -->
      ${isProcessing ? `
        <div class="lab-countdown-bubble" title="Processing: ${remainingSec}s remaining">
          <svg viewBox="0 0 36 36">
            <path class="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="timer-prog" stroke-dasharray="${progressPct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="timer-text">${remainingSec}s</div>
        </div>
      ` : isQueued ? `
        <div class="lab-badge-bubble queue" title="Queued waiting for bench slot">
          <span style="font-size:16px">&#9203;</span>
        </div>
      ` : isReady ? `
        <div class="lab-badge-bubble ready" title="Ready to collect">
          <span style="font-weight:700">&#10003;</span>
        </div>
      ` : `
        <div class="lab-badge-bubble done" title="Report filed — click card to view outcome">
          <span style="font-size:16px">&#128196;</span>
        </div>
      `}

      <!-- Details -->
      <div class="labcard-info">
        <div class="lab-h">
          <span class="lab-t">${esc(l.test_name)}</span>
          <span class="lab-status-pill ${isCollected ? 'collected' : isReady ? 'ready' : isProcessing ? 'processing' : 'queued'}">
            ${isCollected ? 'Report Collected' : isReady ? 'READY TO COLLECT' : isProcessing ? 'ANALYZING' : 'IN QUEUE (WAITING)'}
          </span>
        </div>

        <div class="lab-d">
          ${esc(ex ? (ex.exhibitNo ? 'Exhibit ' + ex.exhibitNo + ' — ' : '') + ex.name : 'Exhibit')} &middot;
          requested day ${l.requested_day} &middot;
          ${l.rushed ? '<span class="tag amber" style="font-size:10px">rushed</span>' : '<span class="tag dim" style="font-size:10px">standard</span>'} &middot;
          est. confidence ${Math.round(l.confidence || 75)}%
        </div>

        ${isProcessing ? `
          <div class="lab-status-strip">
            <span class="mono dim" style="font-size:11px;color:var(--gold2)">Bench Slot Active &bull; Running spectrometer &amp; cross-match analysis</span>
          </div>
          <div class="lab-progress-bar-wrap">
            <div class="lab-progress-bar" style="width:${progressPct}%"></div>
          </div>
        ` : ''}

        ${isQueued ? `
          <div class="lab-d dim" style="margin-top:6px;font-size:11.5px">
            Waiting in sequence for an active bench slot (max 3 run concurrently). Will begin automatically once a slot frees.
          </div>
        ` : ''}

        ${isReady ? `
          <div class="flex between" style="align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(63,157,106,.25)">
            <div class="lab-d" style="color:#6fd39b;font-weight:600">The forensic report has completed and is awaiting collection.</div>
            <button class="btn sm pri" data-collect="${l.id}">Collect report</button>
          </div>
        ` : ''}
      </div>
    </div>

    ${isCollected && res ? `
      <div class="rpt-collapsible" style="display:none">
        ${reportHTML(res)}
      </div>
    ` : ''}
  </div>`
}

function reportHTML(r) {
  const cls = r.conclusion_strength === 'conclusive' ? 'green' : r.conclusion_strength === 'probable' ? 'cyan' : r.conclusion_strength === 'inconclusive' ? 'grey' : 'amber'
  return `<div class="rpt">
    <div class="rh">Forensic Science Laboratory — Report</div>
    <div style="margin-bottom:7px"><span class="tag ${cls}">${esc(r.conclusion_strength || 'indicative')}</span> <span class="dim">${esc(r.exhibit || '')} &middot; confidence ${Math.round(r.confidence || 0)}%</span></div>
    <div>${nl(r.finding || '')}</div>
    ${r.limitations ? `<div style="margin-top:9px;padding-top:8px;border-top:1px dotted #2a3443;color:#f0b45f"><b>Limitations:</b> ${esc(r.limitations)}</div>` : ''}
    ${r.expert_opinion ? `<div style="margin-top:8px;color:#cfdcea"><b>Expert opinion:</b> ${esc(r.expert_opinion)}</div>` : ''}
    ${r.supports ? `<div style="margin-top:7px;color:#6fd39b"><b>Supports:</b> ${esc(r.supports)}</div>` : ''}
  </div>`
}

/* ---------------------------- BOARD ---------------------------- */

function renderEvidenceTimeline(s) {
  if (!s) return '<div class="vacant"><h3>No active case</h3></div>'
  const exhibits = (s.exhibits || []).filter(e => e.found)
  const labReqs = s.labRequests || []
  const recoveries = s.recoveries || []

  // Aggregate all timeline milestones
  const events = []

  // 1. Crime Scene Seizures / Exhibit Recoveries
  exhibits.forEach((e) => {
    events.push({
      id: 'ex-' + e.id,
      day: e.seized_day || 1,
      order: 1,
      type: 'recovery',
      typeLabel: e.isDigital ? 'DIGITAL EVIDENCE RECOVERED' : 'EXHIBIT SEIZED AT SCENE',
      typeBadge: e.isDigital ? 'cyan' : 'gold',
      title: (e.exhibitNo ? e.exhibitNo + ' · ' : '') + e.name,
      body: `Recovered during crime scene search at Grid <b>${esc(e.gridRef || '—')}</b>. Category: <b>${esc(e.category)}</b>. Evidentiary weight: <b>${e.weight} pts</b>.`,
      status: e.admissibility === 'admissible' ? 'ADMISSIBLE' : e.admissibility === 'tainted' ? 'TAINTED' : 'INADMISSIBLE',
      statusClass: e.admissibility === 'admissible' ? 'good' : e.admissibility === 'tainted' ? 'crit' : 'warn',
      tagClass: e.admissibility === 'admissible' ? 'green' : e.admissibility === 'tainted' ? 'red' : 'amber',
      legalCite: 'BNSS s.103',
      meta: [
        e.defect ? `Defect: ${esc(e.defect)}` : 'Two independent panch witnesses signed seizure memo',
        e.isDigital ? (e.hash ? `SHA-256: ${e.hash.slice(0, 16)}…` : 'Forensic hash pending') : null
      ].filter(Boolean),
      actionHtml: `<button class="btn sm gh" style="padding:3px 9px;font-size:11px" data-tl-ex="${e.id}">Inspect Exhibit &rarr;</button>`
    })

    // If digital and s63 certified
    if (e.s63_certificate) {
      events.push({
        id: 's63-' + e.id,
        day: e.seized_day || 1,
        order: 2,
        type: 'legal',
        typeLabel: 'BSA s.63 DUAL-SIGN CERTIFICATE',
        typeBadge: 'cyan',
        title: `Electronic Record Certified: ${e.name}`,
        body: `Cryptographic integrity and operating conditions verified under BSA s.63. Dual-signed by device in-charge and forensic expert.`,
        status: 'CERTIFIED ADMISSIBLE',
        statusClass: 'good',
        tagClass: 'green',
        legalCite: 'BSA s.63',
        meta: [`SHA-256: ${esc(e.hash || 'verified')}`, 'Admissible as primary electronic record'],
        actionHtml: `<button class="btn sm gh" style="padding:3px 9px;font-size:11px" data-tl-ex="${e.id}">View Certificate &rarr;</button>`
      })
    }
  })

  // 2. Forensic Lab Dispatches & Completed Reports
  labReqs.forEach((l) => {
    // Dispatch
    events.push({
      id: 'lab-req-' + l.id,
      day: l.day_requested || 1,
      order: 3,
      type: 'lab_dispatch',
      typeLabel: 'DISPATCHED TO FORENSIC LAB (FSL)',
      typeBadge: 'cyan',
      title: `FSL Dispatch: ${l.test_name}`,
      body: `Exhibit <b>${esc(l.exhibit_name || 'Exhibit #' + l.exhibit_id)}</b> forwarded to State Forensic Science Laboratory under formal requisition docket. Scheduled turnaround: ${l.turnaround_days} day(s).`,
      status: l.status === 'collected' ? 'TEST COMPLETED' : 'IN FORENSIC ASSAY',
      statusClass: l.status === 'collected' ? 'good' : 'cyan',
      tagClass: l.status === 'collected' ? 'green' : 'cyan',
      legalCite: 'BSA s.39',
      meta: [`Turnaround: ${l.turnaround_days} days deducted from statutory clock`, `Requisition № FSL-${l.id}`],
      actionHtml: `<button class="btn sm gh" style="padding:3px 9px;font-size:11px" data-tl-go="labs">Open Labs Desk &rarr;</button>`
    })

    // Result / Analysis Report
    if (l.status === 'collected' && l.result) {
      const isConclusive = l.result.conclusion_strength === 'conclusive'
      events.push({
        id: 'lab-res-' + l.id,
        day: l.completed_day || ((l.day_requested || 1) + (l.turnaround_days || 1)),
        order: 4,
        type: 'analysis',
        typeLabel: 'FORENSIC ANALYSIS REPORT MATURED',
        typeBadge: 'gold',
        title: `Forensic Finding: ${l.test_name}`,
        body: `<b>Scientific Finding:</b> ${esc(l.result.finding || '')}<br><b style="color:#cfdcea">Expert Opinion:</b> ${esc(l.result.expert_opinion || '')}${l.result.supports ? `<br><b style="color:#6fd39b">Prosecution Proof:</b> ${esc(l.result.supports)}` : ''}`,
        status: isConclusive ? 'CONCLUSIVE PROOF' : (l.result.conclusion_strength || 'ANALYZED').toUpperCase(),
        statusClass: isConclusive ? 'good' : 'warn',
        tagClass: isConclusive ? 'green' : 'amber',
        legalCite: 'BSA s.39 / s.45',
        meta: [`Analytical Confidence: ${Math.round(l.confidence || 0)}%`, `Turnaround completed`],
        actionHtml: `<button class="btn sm gh" style="padding:3px 9px;font-size:11px" data-tl-go="labs">Review Lab Dossier &rarr;</button>`
      })
    }
  })

  // 3. BSA s.23 Disclosures & Physical Recoveries
  recoveries.forEach((r) => {
    const isSuspect = (name) => {
      if (!name) return false
      const lower = name.toLowerCase().trim()
      return (s.persons || []).some(p => (p.role === 'suspect' || p.role === 'accused' || p.is_culprit) && (p.name || '').toLowerCase().trim().includes(lower))
    }
    const cleanW1 = (!isSuspect(r.witness_a) && r.witness_a && r.witness_a !== 'none') ? r.witness_a : null
    const cleanW2 = (!isSuspect(r.witness_b) && r.witness_b && r.witness_b !== 'none' && r.witness_b !== cleanW1) ? r.witness_b : null
    const hasBothWitnesses = Boolean(cleanW1 && cleanW2)
    const hasOneWitness = Boolean(cleanW1)

    const witnessText = hasBothWitnesses
      ? `Panch witnesses: <b>${esc(cleanW1)}</b> and <b>${esc(cleanW2)}</b>.`
      : hasOneWitness
        ? `Panch witness 1: <b>${esc(cleanW1)}</b> <span style="color:#d97706;font-weight:600">(Second independent witness pending)</span>.`
        : `<span style="color:#d97706;font-weight:600">&#9203; Pending independent witness examination / manual entry</span>`

    const isProvable = r.s23_valid && hasBothWitnesses
    const statusTitle = isProvable
      ? 'PROVABLE DISCOVERY'
      : hasBothWitnesses
        ? 'FATAL DEFECT (INADMISSIBLE)'
        : 'PENDING PANCH WITNESSES (BSA s.23)'
    const statusCls = isProvable ? 'good' : (hasBothWitnesses ? 'crit' : 'warn')
    const tagCls = isProvable ? 'green' : (hasBothWitnesses ? 'red' : 'amber')

    events.push({
      id: 'rec-' + r.id,
      day: r.recovery_day || s.day,
      order: 5,
      type: 'recovery_s23',
      typeLabel: 'BSA s.23 WITNESSED RECOVERY',
      typeBadge: isProvable ? 'good' : (hasBothWitnesses ? 'crit' : 'warn'),
      title: `Recovery: ${r.description}`,
      body: `Physical recovery made pursuant to custodial disclosure under BSA s.23. ${witnessText}`,
      status: statusTitle,
      statusClass: statusCls,
      tagClass: tagCls,
      legalCite: 'BSA s.23',
      meta: [
        isProvable
          ? 'Information relating distinctly to discovery is provable before court'
          : hasBothWitnesses
            ? 'Discovery tainted: Panch witnesses defective under BNSS s.103'
            : 'Requires 2 independent respectable witnesses who disclose knowledge during examination or sign panchnama',
        isProvable ? 'Panch witness recovery memo completed' : 'Panch witness memo awaiting lawful witnesses'
      ],
      actionHtml: `<button class="btn sm gh" style="padding:3px 9px;font-size:11px" data-tl-rec="${r.id}">Inspect Recovery &rarr;</button>`
    })
  })

  // Sort events chronologically by day, then by order
  events.sort((a, b) => a.day !== b.day ? a.day - b.day : a.order - b.order)

  // Group events by day
  const daysMap = {}
  events.forEach(ev => {
    if (!daysMap[ev.day]) daysMap[ev.day] = []
    daysMap[ev.day].push(ev)
  })
  const sortedDays = Object.keys(daysMap).map(Number).sort((a, b) => a - b)

  const totalExhibits = exhibits.length
  const totalAnalyzed = labReqs.filter(l => l.status === 'collected').length
  const totalRecoveries = recoveries.length
  const totalAdmissible = exhibits.filter(e => e.admissibility === 'admissible').length + recoveries.filter(r => r.s23_valid).length

  return `
    <div class="timeline-kpis">
      <div class="stat"><div class="stat-v">${totalExhibits}</div><div class="stat-l">Exhibits Seized</div></div>
      <div class="stat cyan"><div class="stat-v">${labReqs.length}</div><div class="stat-l">Forensic Tests</div></div>
      <div class="stat v"><div class="stat-v">${totalAnalyzed}</div><div class="stat-l">Reports Analyzed</div></div>
      <div class="stat a"><div class="stat-v">${totalRecoveries}</div><div class="stat-l">s.23 Recoveries</div></div>
      <div class="stat v"><div class="stat-v">${totalAdmissible}</div><div class="stat-l">Admissible Proofs</div></div>
    </div>

    <div class="seg tl-seg-grid" id="tl-filters">
      <button class="seg-b on" data-tl-filter="all" title="All Milestones (${events.length})">
        <span class="lbl-full">All Milestones</span><span class="lbl-compact">All</span> (${events.length})
      </button>
      <button class="seg-b" data-tl-filter="recovery" title="Scene Recoveries (${exhibits.length})">
        <span class="lbl-full">Scene Recoveries</span><span class="lbl-compact">Scene</span> (${exhibits.length})
      </button>
      <button class="seg-b" data-tl-filter="lab" title="Lab Analyses (${labReqs.length})">
        <span class="lbl-full">Lab Analyses</span><span class="lbl-compact">Labs</span> (${labReqs.length})
      </button>
      <button class="seg-b" data-tl-filter="s23" title="BSA s.23 Disclosures & Recoveries (${totalRecoveries})">
        <span class="lbl-full">BSA s.23 Recoveries</span><span class="lbl-compact">BSA s.23</span> (${totalRecoveries})
      </button>
    </div>

    ${!events.length ? `
      <div class="timeline-empty">
        <div style="font-size:28px;margin-bottom:10px">&#128336;</div>
        <div style="font-size:16px;color:#f0f4f8;font-weight:600;margin-bottom:6px">No Evidentiary Milestones Logged Yet</div>
        <div style="max-width:520px;margin:0 auto;line-height:1.6;font-size:13px;color:var(--ink2)">
          Process the crime scene to seize exhibits, dispatch specimens to the Forensic Science Laboratory, or elicit disclosures in interrogation to begin building the chronological timeline.
        </div>
      </div>` : `
      <div class="timeline-container">
        <div class="timeline-track"></div>
        ${sortedDays.map(dayNum => `
          <div class="timeline-day-group" data-day="${dayNum}">
            <div class="timeline-day-marker">
              <span class="timeline-day-badge">&#128197; INVESTIGATION DAY ${dayNum}</span>
              <span class="timeline-day-line"></span>
            </div>
            <div class="timeline-nodes">
            ${daysMap[dayNum].map(ev => `
              <div class="timeline-node" data-kind="${ev.type}">
                <div class="timeline-node-dot ${ev.statusClass}"></div>
                <div class="timeline-card">
                  <div class="timeline-card-header">
                    <span class="timeline-kicker ${ev.tagClass}">${esc(ev.typeLabel)}</span>
                    <div class="timeline-card-badges">
                      ${ev.legalCite ? `<span class="cite" title="Statutory authority">${esc(ev.legalCite)}</span>` : ''}
                      <span class="tag ${ev.tagClass}">${esc(ev.status)}</span>
                    </div>
                  </div>
                  <h4 class="timeline-card-title">${esc(ev.title)}</h4>
                  <div class="timeline-card-b">${ev.body}</div>
                  <div class="timeline-card-footer">
                    <div class="timeline-meta-list">
                      ${ev.meta.map(m => `<span class="timeline-meta-item">${esc(m)}</span>`).join('')}
                    </div>
                    <div class="timeline-card-action">${ev.actionHtml}</div>
                  </div>
                </div>
              </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>`}
  `
}

VIEWS.board = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  if (!s.fir) return needFir('The evidence board assembles your file. Register the FIR first.')
  const cards = []
  ;(s.exhibits || []).filter(e => e.found).forEach((e, i) => {
    const isDisclosure = e.isDisclosure || e.category === 'others' || e.category === 'interrogation_disclosure'
    const title = isDisclosure ? `💬 Ex. ${e.exhibitNo || 'X'} [s.23]` : (e.exhibitNo ? 'Exhibit ' + e.exhibitNo : 'Exhibit')
    const body = e.name + (isDisclosure ? ' (Disclosed via suspect statement)' : '')
    const catLabel = isDisclosure ? 'others' : e.category
    const meta = (isDisclosure ? 'OTHERS (STATEMENT DISCLOSURE)' : (e.isDigital ? 'DIGITAL · ' : '') + catLabel) + ' · weight ' + e.weight
    const cls = (e.admissibility === 'admissible' ? 'good' : e.admissibility === 'tainted' ? 'critical' : 'false') + (isDisclosure ? ' disclosure-pin' : '')
    cards.push({ kind: 'ex', id: 'ex-' + e.id, title, body, meta, cls })
  })
  ;(s.recoveries || []).forEach(r => cards.push({ kind: 'rec', id: 'rec-' + r.id, title: 'Recovery — BSA s.23', body: r.description, meta: (r.s23_valid ? 'PROVABLE · witnessed' : 'NOT PROVABLE · witnesses missing'), cls: r.s23_valid ? 'good' : 'critical' }))
  ;(s.leads || []).filter(l => l.source !== 'interrogation').forEach(l => cards.push({ kind: 'lead', id: 'ld-' + l.id, title: l.source.toUpperCase(), body: l.title, meta: l.followed ? 'followed' : 'OPEN LEAD', cls: l.isFalse ? 'false' : l.followed ? '' : 'critical' }))
  ;(s.interviews || []).forEach(iv => {
    const p = (s.persons || []).find(x => x.id === iv.person_id)
    if (p) cards.push({ kind: 'iv', id: 'iv-' + iv.id, title: 'Examination — ' + p.name, body: `Tension ${iv.tension}, credibility ${Math.round(iv.credibility)}. Provable facts: ${(iv.admissible || []).length}. Not provable: ${(iv.inadmissible || []).length}.`, meta: iv.phase === 'closed' ? 'CLOSED' : 'OPEN', cls: (iv.admissible || []).length ? 'good' : 'critical' })
  })
  ;(s.labRequests || []).filter(l => l.status === 'collected').forEach(l => cards.push({ kind: 'lab', id: 'lb-' + l.id, title: 'FSL — ' + l.test_name, body: (l.result?.finding || '').slice(0, 150), meta: 'CONFIDENCE ' + Math.round(l.confidence || 0) + '% · ' + (l.result?.conclusion_strength || ''), cls: (l.result?.conclusion_strength === 'conclusive' || l.result?.conclusion_strength === 'probable') ? 'good' : '' }))
  const density = (G.player?.settings?.presentation?.stringDensity || 'normal')
  const showStrings = density !== 'sparse'

  const activeTab = G.sectionKey === '2' ? '2' : '1'

  const boardSubView = G.boardSubView || 'dossier'

  return head('&#128204;', 'Evidence Board', 'Everything the case knows &middot; Pinned board &amp; classified dossier')
  + `<div class="tabs">
      <div class="tab ${activeTab === '1' ? 'on' : ''}" data-st="1">Pinned Evidence Board</div>
      <div class="tab ${activeTab === '2' ? 'on' : ''}" data-st="2">Chronological Evidence Timeline</div>
    </div>
    <div data-sp="1" style="${activeTab === '1' ? '' : 'display:none'}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap">
        <div class="seg" id="board-subview-toggle">
          <button class="seg-b ${boardSubView === 'canvas' ? 'on' : ''}" data-subview="canvas">&#128204; Corkboard Canvas</button>
          <button class="seg-b ${boardSubView === 'dossier' ? 'on' : ''}" data-subview="dossier">&#128193; Classified Dossier View</button>
        </div>
        <div class="mono dim" style="font-size:11px">
          ${boardSubView === 'canvas' ? 'Swipe/drag canvas to pan &middot; Connect pins by category' : 'Categorized evidentiary records &amp; statutory compliance'}
        </div>
      </div>

      <div class="grid g21" style="align-items:start">
        ${boardSubView === 'canvas' ? `
        <div class="board-scroll-wrapper" style="overflow-x:auto;overflow-y:auto;max-width:100%;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:var(--r);background:#120e0a;position:relative">
          ${(() => {
            const col = density === 'dense' ? 4 : (cards.length > 15 ? 5 : cards.length > 7 ? 4 : 3)
            const rowsCount = Math.max(1, Math.ceil(cards.length / col))
            const boardWidth = Math.max(1050, Math.ceil(col * 270 + 260))
            const boardHeight = Math.max(720, Math.ceil(rowsCount * 195 + 240))
            return `<div class="board" id="board" style="box-sizing:border-box;min-width:100%;width:${boardWidth}px;height:${boardHeight}px;position:relative;margin:0">
              ${showStrings ? `<svg class="strings" id="strings"></svg>` : ''}
              ${cards.map((c, i) => {
                const x = 34 + (i % col) * 260 + (i % 2 ? 16 : 0)
                const y = 30 + Math.floor(i / col) * 185
                const rot = ((i * 37) % 5) - 2
                return `<div class="cardpin ${c.cls}" data-pin="${c.id}" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">
                  <div class="pin" style="left:${90 + (i % 3) * 12}px;top:-2px"></div>
                  <div class="cp-t">${esc(c.title)}</div>
                  <div class="cp-b">${esc(c.body).slice(0, 150)}</div>
                  <div class="cp-m">${esc(c.meta)}</div>
                </div>`
              }).join('')}
              ${!cards.length ? '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#6a6155;font-family:IBM Plex Mono;font-size:13px">The board is empty. Process the scene and the investigation will begin to fill it.</div>' : ''}
            </div>`
          })()}
        </div>` : `
        <div class="dossier-list-container" style="display:flex;flex-direction:column;gap:14px">
          <!-- Physical & Forensic Exhibits -->
          <div class="card" style="border-left:3px solid var(--gold)">
            <div class="card-h"><h3 style="color:var(--gold)">🔬 Physical &amp; Forensic Exhibits (${(s.exhibits || []).filter(e => !(e.requiresDisclosure && !e.unlockedByDisclosure)).length})</h3></div>
            ${(s.exhibits || []).filter(e => !(e.requiresDisclosure && !e.unlockedByDisclosure)).length ? (s.exhibits || []).filter(e => !(e.requiresDisclosure && !e.unlockedByDisclosure)).map(e => `
              <div style="padding:10px;margin-bottom:8px;background:rgba(21,28,39,0.7);border:1px solid var(--line);border-radius:6px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <div style="font-weight:700;font-size:13.5px;color:var(--gold2)">${esc(e.name)}</div>
                  <span class="tag ${e.admissibility === 'admissible' ? 'green' : e.admissibility === 'tainted' ? 'red' : 'violet'}">${esc(e.admissibility || 'pending')}</span>
                </div>
                <div style="font-size:11.5px;color:var(--ink3);margin:4px 0">${esc(e.why || e.significance || '')}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:11px" class="mono dim">
                  <span>Found at: ${esc(e.location_found || 'Crime Scene')}</span>
                  <span>Weight: ${e.weight || 20}</span>
                </div>
                <div style="display:flex;gap:6px;margin-top:8px">
                  <button class="btn xs gh" data-tl-ex="${e.id}">Inspect Exhibit</button>
                  ${e.isDigital && !e.s63Certified ? `<button class="btn xs sec" data-cert63="${e.id}">Certify BSA s.63</button>` : ''}
                </div>
              </div>
            `).join('') : '<div class="dim" style="font-size:12px">No physical exhibits seized yet.</div>'}
          </div>

          <!-- Interrogation Disclosures & Recoveries -->
          <div class="card" style="border-left:3px solid var(--cyan)">
            <div class="card-h"><h3 style="color:var(--cyan)">🗣️ Disclosures &amp; Witnessed Recoveries (BSA s.23)</h3></div>
            ${(s.recoveries || []).length ? (s.recoveries || []).map(r => `
              <div style="padding:10px;margin-bottom:8px;background:rgba(21,28,39,0.7);border:1px solid var(--line);border-radius:6px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <div style="font-weight:700;font-size:13.5px;color:#a5f3fc">${esc(r.description || r.title || 'Recovery')}</div>
                  <span class="tag ${r.s23_valid ? 'green' : 'amber'}">${r.s23_valid ? 'BSA s.23 Valid' : 'Unwitnessed'}</span>
                </div>
                <div style="font-size:11.5px;color:var(--ink3);margin:4px 0">Witnesses: ${esc(r.witness_a || 'Independent Panch 1')}, ${esc(r.witness_b || 'Independent Panch 2')}</div>
              </div>
            `).join('') : '<div class="dim" style="font-size:12px">No witnessed disclosures logged under BSA s.23.</div>'}
          </div>

          <!-- Witness Statements & Accused Accounts -->
          <div class="card" style="border-left:3px solid var(--green)">
            <div class="card-h"><h3 style="color:#6fd39b">📝 WITNESS STATEMENTS (BNSS S.180)</h3></div>
            ${(s.persons || []).filter(p => (p.statements || []).length || p.alibi || p.role === 'suspect' || p.role === 'accused' || p.role === 'victim' || p.role === 'complainant').length ? (s.persons || []).filter(p => (p.statements || []).length || p.alibi || p.role === 'suspect' || p.role === 'accused' || p.role === 'victim' || p.role === 'complainant').map(p => `
              <div class="card card-btn" data-view-statement="${p.id}" onclick="window.openWitnessStatementModal && window.openWitnessStatementModal('${p.id}')" style="padding:12px 14px;margin-bottom:8px;background:rgba(21,28,39,0.85);border:1px solid rgba(111,211,155,0.25);border-radius:6px;cursor:pointer;transition:all 0.15s" title="Tap to view full recorded statement under BNSS s.180">
                <div style="font-weight:700;font-size:13.5px;color:#6fd39b;margin-bottom:3px">${esc(p.name)} (${esc(p.role)})</div>
                <div style="font-size:11.5px;color:var(--ink2);line-height:1.4">
                  "${esc((p.statements && p.statements[0] && p.statements[0].body) || p.alibi || `Statement of ${p.name} recorded in his own words under BNSS s.180.`)}"
                </div>
              </div>
            `).join('') : '<div class="dim" style="font-size:12px">No witness statements recorded under BNSS s.180 yet.</div>'}
          </div>
        </div>
        `}
        <div>
          <div class="card">
            <div class="card-h"><h3>Readiness for court</h3></div>
            <div class="stat a" style="margin-bottom:10px"><div class="stat-v">${s.readiness?.admissibleWeight || 0}</div><div class="stat-l">Aggregate admissible weight</div></div>
            <div class="grid g3" style="gap:8px">
              <div class="stat v"><div class="stat-v">${(s.exhibits || []).filter(e => e.admissibility === 'admissible').length}</div><div class="stat-l">Admissible</div></div>
              <div class="stat r"><div class="stat-v">${s.readiness?.taintedCount || 0}</div><div class="stat-l">Tainted</div></div>
              <div class="stat r"><div class="stat-v">${s.readiness?.inadmissibleCount || 0}</div><div class="stat-l">Inadmissible</div></div>
            </div>
            <div class="rule"></div>
            <div class="kv"><span class="k">Witnesses</span><span class="v">${s.readiness?.witnessCount || 0}</span></div>
            <div class="kv"><span class="k">Accused</span><span class="v">${s.readiness?.accusedCount || 0}</span></div>
            <div class="kv"><span class="k">Provable recoveries</span><span class="v">${(s.recoveries || []).filter(r => r.s23_valid).length}</span></div>
            <div class="kv"><span class="k">Charge sheet ready</span><span class="v">${s.readiness?.chargeSheetReady ? '<span class="tag green">Yes</span>' : '<span class="tag red">No — defects outstanding</span>'}</span></div>
          </div>
          <div class="card">
            <div class="card-h"><h3>Unpursued recoveries</h3>${cite('23', 'BSA')}</div>
            ${(s.leads || []).filter(l => l.locatable && !l.followed).length ? (s.leads || []).filter(l => l.locatable && !l.followed).map(l => `
              <div style="padding:9px 0;border-bottom:1px dotted rgba(42,52,67,.7)">
                <div class="cond" style="font-size:14px">${esc(l.title)}</div>
                <div class="dim" style="font-size:12px;margin-top:3px">${esc(l.detail || '')}</div>
                <div class="mono" style="font-size:11px;color:#f0b45f;margin-top:5px">&#9878; Nothing is provable until the recovery is made before two respectable witnesses.</div>
                <button class="btn sm pri" style="margin-top:7px" data-recover="${l.id}">Execute recovery</button>
              </div>`).join('') : '<div class="dim" style="font-size:12.5px">No outstanding disclosures. Information from interrogation becomes evidence only through a witnessed recovery — see Act 6.</div>'}
          </div>
        </div>
      </div>
    </div>
    <div data-sp="2" style="${activeTab === '2' ? '' : 'display:none'}">
      ${renderEvidenceTimeline(s)}
    </div>`
}

/**
 * Witness Statement (BNSS §180) Modal
 */
function openWitnessStatementModal(personId) {
  const s = G.snapshot || {}
  const p = (s.persons || []).find(x => String(x.id) === String(personId))
  if (!p) return

  const stmts = p.statements || []
  const ivs = (s.interviews || []).filter(i => i.person_id === p.id)
  const mainIv = ivs[ivs.length - 1]
  const transcript = (mainIv && mainIv.transcript) || []

  modal({
    title: `📝 Recorded Statement (BNSS §180) & Examination Dossier`,
    body: `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:68vh;overflow-y:auto;padding-right:4px">
        <div class="helpbox" style="margin:0;padding:8px 12px;font-size:11.5px">
          <div class="hb-h">⚖️ Statutory Record &middot; BNSS Section 180</div>
          Statements recorded during police investigation. Admissible to contradict or corroborate witnesses under the BSA 2023.
        </div>

        <div class="card" style="padding:12px;background:#0d1219;border:1px solid rgba(111,211,155,0.3);border-radius:4px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px">
              ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic-sm') : ''}
              <div>
                <div style="font-weight:700;color:#6fd39b;font-size:14px">${esc(p.name)}</div>
                <div class="dim" style="font-size:11px;text-transform:uppercase">${esc(p.role || 'Witness')} &middot; ${esc(p.occupation || 'Resident')}</div>
              </div>
            </div>
            <span class="tag ${p.role === 'suspect' || p.role === 'accused' ? 'red' : 'green'}" style="font-size:10px;text-transform:uppercase">${esc(p.role || 'POI')}</span>
          </div>

          <div style="font-family:var(--font-mono);font-size:11px;color:var(--ink2);line-height:1.5;margin-bottom:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px">
            <div><b style="color:var(--gold)">Stated Alibi / Claim:</b> ${esc(p.stated_alibi || p.alibi || 'No specific alibi claimed')}</div>
            ${p.phone ? `<div><b style="color:var(--ink3)">Contact / CDR Tag:</b> ${esc(p.phone)}</div>` : ''}
          </div>

          <div style="background:#131a26;padding:10px;border-radius:4px;border-left:3px solid #6fd39b">
            <div style="font-size:10px;text-transform:uppercase;color:#6fd39b;font-weight:bold;margin-bottom:4px">Official Recorded Statement (BNSS s.180):</div>
            <div style="font-size:13px;color:#f1f5f9;line-height:1.6;font-style:italic">
              "${esc((stmts[0] && stmts[0].body) || p.statement || p.alibi || (transcript[0] && transcript[0].text) || 'Statement recorded by Investigating Officer during locality canvass.')}"
            </div>
          </div>
        </div>

        ${transcript.length ? `
          <div class="card" style="padding:10px;background:#0d1219;border:1px solid rgba(255,255,255,0.08);border-radius:4px">
            <div class="card-h" style="margin-bottom:8px"><h4 style="color:var(--gold)">🗣️ Interrogation / Examination Transcript (${transcript.length} turns)</h4></div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;font-size:12px">
              ${transcript.map(t => `
                <div style="padding:6px 8px;border-radius:4px;background:${t.speaker === 'officer' ? '#182338' : '#080d14'};border-left:2px solid ${t.speaker === 'officer' ? 'var(--cyan)' : 'var(--amber)'}">
                  <div style="font-size:10px;color:var(--ink3);font-weight:bold">${t.speaker === 'officer' ? 'Investigating Officer' : esc(p.name)}</div>
                  <div style="color:#f1f5f9;margin-top:2px">${esc(t.text)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `,
    footer: `
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
        <button class="btn sm" id="btn-stmt-go-interro">&#128373; Open in Interrogation Room</button>
        <button class="btn pri sm" data-close>Close</button>
      </div>
    `
  })

  setTimeout(() => {
    const btnGo = $('#btn-stmt-go-interro')
    if (btnGo) {
      btnGo.onclick = () => {
        closeModal()
        G.ivTarget = p.id
        G.iv = null
        go('interrogation')
      }
    }
  }, 50)
}
window.openWitnessStatementModal = openWitnessStatementModal

VIEWS.board.after = function () {
  const s = G.snapshot; if (!s) return
  const work = $('#work')

  // Subview toggle
  $$('#board-subview-toggle .seg-b').forEach(b => b.onclick = () => {
    G.boardSubView = b.dataset.subview
    render()
  })

  // Witness Statement Card Clicks
  $$('[data-view-statement]').forEach(card => {
    card.onclick = () => {
      const pId = card.dataset.viewStatement
      openWitnessStatementModal(pId)
    }
  })

  // Recovery trigger
  $$('[data-recover]').forEach(b => b.onclick = () => {
    const leadId = Number(b.dataset.recover)
    recoveryModal(leadId)
  })

  // Certify BSA s.63
  $$('[data-cert63]').forEach(b => b.onclick = () => {
    const exId = Number(b.dataset.cert63)
    const ex = (s.exhibits || []).find(x => x.id === exId)
    if (ex) {
      act(async () => {
        const r = await api(`/cases/${s.caseId}/exhibits/${ex.id}/certify63`, { method: 'POST', body: JSON.stringify({ signerA: G.player.fullName || 'Investigating Officer', signerB: 'Cyber Cell Specialist' }) })
        mergeBundle(r)
        render()
        toast('BSA Section 63 Certified', `${ex.name} now possesses dual-signed electronic hash certification. Admissible in court!`, 'good')
      })
    }
  })

  // Tab switching
  $$('.tab', work).forEach(t => t.onclick = () => {
    $$('.tab', work).forEach(x => x.classList.remove('on'))
    t.classList.add('on')
    G.sectionKey = t.dataset.st
    $$('[data-sp]', work).forEach(p => p.style.display = p.dataset.sp === t.dataset.st ? '' : 'none')
    if (t.dataset.st === '1') drawStrings()
    renderSectionStrip()
  })

  // Timeline filters
  $$('#tl-filters .seg-b').forEach(b => b.onclick = () => {
    $$('#tl-filters .seg-b').forEach(x => x.classList.remove('on'))
    b.classList.add('on')
    const filter = b.dataset.tlFilter
    G.tlFilter = filter
    $$('.timeline-node', work).forEach(node => {
      const kind = node.dataset.kind || ''
      let match = true
      if (filter === 'recovery') match = kind === 'recovery' || kind === 'legal'
      else if (filter === 'lab') match = kind === 'lab_dispatch' || kind === 'analysis'
      else if (filter === 's23') match = kind === 'recovery_s23'
      node.style.display = match ? '' : 'none'
    })
    $$('.timeline-day-group', work).forEach(group => {
      const visibleNodes = Array.from(group.querySelectorAll('.timeline-node')).filter(n => n.style.display !== 'none')
      group.style.display = visibleNodes.length ? '' : 'none'
    })
    if (typeof updateBreadcrumb === 'function') updateBreadcrumb()
  })

  // Timeline action clicks
  $$('[data-tl-ex]').forEach(b => b.onclick = () => {
    const exId = Number(b.dataset.tlEx)
    const ex = (s.exhibits || []).find(x => x.id === exId)
    if (ex) exhibitModal(ex)
  })
  $$('[data-tl-go]').forEach(b => b.onclick = () => go(b.dataset.tlGo))
  $$('[data-tl-rec]').forEach(b => b.onclick = () => {
    const rId = Number(b.dataset.tlRec)
    const r = (s.recoveries || []).find(x => x.id === rId)
    if (r) modal({
      title: 'Recovery — BSA s.23',
      body: `<div class="cond" style="font-size:16px;margin-bottom:8px">${esc(r.description)}</div><div class="kv"><span class="k">Day</span><span class="v">${r.recovery_day}</span></div><div class="kv"><span class="k">Witnesses</span><span class="v">${esc(r.witness_a || 'none')} and ${esc(r.witness_b || 'none')}</span></div>${r.s23_valid ? '<div class="check ok"><span class="ci">&#10003;</span><span class="cn">Provable under BSA s.23</span></div>' : '<div class="check no"><span class="ci">&#10007;</span><span class="cn">Not provable. Missing respectable witnesses.</span></div>'}`,
      footer: '<button class="btn" data-close>Close</button>'
    })
  })

  drawStrings()
  window.onresize = () => { clearTimeout(window.__rt); window.__rt = setTimeout(drawStrings, 200) }
  $$('[data-recover]').forEach(b => b.onclick = () => recoveryModal(Number(b.dataset.recover)))
  $$('[data-pin]').forEach(p => p.onclick = (e) => {
    if (p.dataset.dragged === '1') {
      if (e) e.stopPropagation()
      return
    }
    const id = p.dataset.pin
    if (id.startsWith('ex-')) { const ex = s.exhibits.find(x => 'ex-' + x.id === id); if (ex) exhibitModal(ex) }
    else if (id.startsWith('ld-')) { const l = s.leads.find(x => 'ld-' + x.id === id); if (l) modal({ title: l.source.toUpperCase() + ' — lead', body: `<div class="cond" style="font-size:17px;margin-bottom:8px">${esc(l.title)}</div><div style="font-size:13.5px;line-height:1.65">${esc(l.detail || '')}</div>${l.isFalse ? '<div class="helpbox" style="border-color:var(--red)"><div class="hb-h" style="color:#ff8b86">&#9888; This line does not hold up</div>Pursuing it further will cost you days you cannot spare. A competent officer records it and moves on.</div>' : ''}`, footer: '<button class="btn" data-close>Close</button>' }) }
    else if (id.startsWith('iv-')) { G.view = 'interrogation'; render() }
    else if (id.startsWith('rec-')) { const r = s.recoveries.find(x => 'rec-' + x.id === id); if (r) modal({ title: 'Recovery — BSA s.23', body: `<div class="cond" style="font-size:16px;margin-bottom:8px">${esc(r.description)}</div><div class="kv"><span class="k">Day</span><span class="v">${r.recovery_day}</span></div><div class="kv"><span class="k">Witnesses</span><span class="v">${esc(r.witness_a || 'none')} and ${esc(r.witness_b || 'none')}</span></div>${r.s23_valid ? '<div class="check ok"><span class="ci">&#10003;</span><span class="cn">Provable. The information relating distinctly to this discovery is admissible under BSA s.23.</span></div>' : '<div class="check no"><span class="ci">&#10007;</span><span class="cn">Not provable. The discovery was not made before two respectable witnesses, so the information remains a confession to a police officer and proves nothing.</span></div>'}`, footer: '<button class="btn" data-close>Close</button>' }) }
  })
  attachPinDrag()
}


function attachPinDrag() {
  const cards = $$('.cardpin')
  if (!cards.length) return

  const board = document.getElementById('board')
  if (!board) return
  const wrapper = board.parentElement

  const PAD_TOP = 20
  const PAD_LEFT = 35
  const PAD_RIGHT = 45
  const PAD_BOTTOM = 45

  cards.forEach(card => {
    let startX = 0, startY = 0, origLeft = 0, origTop = 0, isDragging = false, hasMoved = false

    card.onpointerdown = (e) => {
      if (e.target.closest('button, a, input, select')) return
      if (e.button !== undefined && e.button !== 0) return

      isDragging = true
      hasMoved = false
      startX = e.clientX
      startY = e.clientY
      origLeft = parseFloat(card.style.left) || 0
      origTop = parseFloat(card.style.top) || 0

      let maxZ = 10
      document.querySelectorAll('.cardpin').forEach(c => {
        const z = parseInt(c.style.zIndex) || 10
        if (z > maxZ) maxZ = z
      })
      card.style.zIndex = maxZ + 1
      card.classList.add('is-dragging')

      try {
        card.setPointerCapture(e.pointerId)
      } catch (_) {}
    }

    card.onpointermove = (e) => {
      if (!isDragging) return
      
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      if (!hasMoved && Math.hypot(dx, dy) > 4) {
        hasMoved = true
        card.dataset.dragged = '1'
      }

      if (hasMoved) {
        if (e.cancelable) e.preventDefault()

        const minW = 320
        const minH = 240
        const cardW = card.offsetWidth || 212
        const cardH = card.offsetHeight || 160

        // 1. Raw proposed target positions
        let currX = origLeft + dx
        // TOP is fixed: top side never stretches or retracts
        let currY = Math.max(PAD_TOP, origTop + dy)

        // 2. LEFT SIDE: STRETCH & RETRACT
        const otherMinLeft = cards.length > 1
          ? Math.min(...cards.filter(c => c !== card).map(c => parseFloat(c.style.left) || 0))
          : Infinity
        const allMinLeft = Math.min(currX, otherMinLeft)

        if (allMinLeft < PAD_LEFT) {
          // Stretch left: card moved into left boundary
          const shift = PAD_LEFT - allMinLeft
          cards.forEach(c => {
            if (c !== card) {
              c.style.left = ((parseFloat(c.style.left) || 0) + shift) + 'px'
            }
          })
          origLeft += shift
          currX += shift

          const curW = parseFloat(board.style.width) || board.offsetWidth
          board.style.width = (curW + shift) + 'px'
          if (wrapper) {
            wrapper.scrollLeft += shift
          }
        } else if (allMinLeft > PAD_LEFT + 2) {
          // Retract left: cards moved inward, compress empty space on left
          const excessLeft = allMinLeft - PAD_LEFT
          cards.forEach(c => {
            if (c !== card) {
              c.style.left = ((parseFloat(c.style.left) || 0) - excessLeft) + 'px'
            }
          })
          origLeft -= excessLeft
          currX -= excessLeft

          if (wrapper) {
            wrapper.scrollLeft = Math.max(0, wrapper.scrollLeft - excessLeft)
          }
          const curW = parseFloat(board.style.width) || board.offsetWidth
          board.style.width = Math.max(minW, curW - excessLeft) + 'px'
        }

        // Apply updated card coordinates
        card.style.left = currX + 'px'
        card.style.top = currY + 'px'

        // 3. RIGHT SIDE: STRETCH & RETRACT
        const otherMaxRight = cards.length > 1
          ? Math.max(0, ...cards.filter(c => c !== card).map(c => (parseFloat(c.style.left) || 0) + (c.offsetWidth || 212)))
          : 0
        const allMaxRight = Math.max(currX + cardW, otherMaxRight)
        const targetW = Math.max(minW, Math.ceil(allMaxRight + PAD_RIGHT))
        board.style.width = targetW + 'px'

        // 4. BOTTOM SIDE: STRETCH & RETRACT
        const otherMaxBottom = cards.length > 1
          ? Math.max(0, ...cards.filter(c => c !== card).map(c => (parseFloat(c.style.top) || 0) + (c.offsetHeight || 160)))
          : 0
        const allMaxBottom = Math.max(currY + cardH, otherMaxBottom)
        const targetH = Math.max(minH, Math.ceil(allMaxBottom + PAD_BOTTOM))
        board.style.height = targetH + 'px'

        drawStrings()
      }
    }

    const endPointerDrag = (e) => {
      if (!isDragging) return
      isDragging = false
      card.classList.remove('is-dragging')

      try {
        if (card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
          card.releasePointerCapture(e.pointerId)
        }
      } catch (_) {}

      if (hasMoved) {
        const minW = 320
        const minH = 240

        // Final tight retract & alignment pass on drag release
        const allMinLeft = Math.min(...cards.map(c => parseFloat(c.style.left) || 0))
        if (allMinLeft > PAD_LEFT) {
          const excess = allMinLeft - PAD_LEFT
          cards.forEach(c => {
            c.style.left = ((parseFloat(c.style.left) || 0) - excess) + 'px'
          })
          if (wrapper) wrapper.scrollLeft = Math.max(0, wrapper.scrollLeft - excess)
        }

        const finalMaxR = Math.max(0, ...cards.map(c => (parseFloat(c.style.left) || 0) + (c.offsetWidth || 212)))
        const finalMaxB = Math.max(0, ...cards.map(c => (parseFloat(c.style.top) || 0) + (c.offsetHeight || 160)))
        const fitW = Math.max(minW, Math.ceil(finalMaxR + PAD_RIGHT))
        const fitH = Math.max(minH, Math.ceil(finalMaxB + PAD_BOTTOM))
        board.style.width = fitW + 'px'
        board.style.height = fitH + 'px'
        board.style.minWidth = '100%'
        board.style.minHeight = '0px'

        drawStrings()
        setTimeout(() => {
          delete card.dataset.dragged
        }, 150)
      } else {
        delete card.dataset.dragged
      }
    }

    card.onpointerup = endPointerDrag
    card.onpointercancel = endPointerDrag
  })
}

function drawStrings() {
  const svg = $('#strings'); const board = $('#board')
  if (!svg || !board) return
  const br = board.getBoundingClientRect()
  const pins = $$('.cardpin .pin', board).map(p => { const r = p.getBoundingClientRect(); return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2 } })
  if (pins.length < 2) { svg.innerHTML = ''; return }
  const inGroup = (a, b) => a.t === b.t
  const cards = $$('.cardpin', board)
  const groups = {}
  cards.forEach((c, i) => {
    const t = (c.querySelector('.cp-t').textContent || '').split(' ')[0]
    groups[t] = groups[t] || []
    groups[t].push(i)
  })
  let lines = ''
  Object.values(groups).forEach(arr => {
    if (arr.length < 2) return
    for (let i = 0; i < arr.length - 1; i++) {
      const a = pins[arr[i]], b = pins[arr[i + 1]]
      if (!a || !b) continue
      lines += `<line class="string" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`
    }
  })
  const adm = cards.map((c, i) => c.classList.contains('good') ? i : -1).filter(i => i >= 0)
  if (adm.length > 1) for (let i = 0; i < adm.length - 1; i++) {
    const a = pins[adm[i]], b = pins[adm[i + 1]]
    if (a && b) lines += `<line class="string" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`
  }
  svg.innerHTML = lines
  svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`)
  svg.setAttribute('width', br.width)
  svg.setAttribute('height', br.height)
}

function recoveryModal(leadId) {
  const s = G.snapshot
  const l = s.leads.find(x => x.id === leadId)
  if (!l) return

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

  const consentedWitnesses = (s.persons || []).filter(p =>
    ((p.canvassed && p.consented) || (s.consentedWitnesses && s.consentedWitnesses.includes(p.name))) &&
    !isSuspect(p.name) && !isVictim(p.name)
  )
  const suspects = (s.persons || []).filter(p => isSuspect(p.name))
  const victims = (s.persons || []).filter(p => isVictim(p.name))

  const linkedRec = (s.recoveries || []).find(r => r.lead_id === leadId || (r.item && l.recovery_item && r.item.toLowerCase().includes(l.recovery_item.toLowerCase())))
  const confirmed = ((linkedRec && linkedRec.confirmedWitnesses) || []).filter(w => !isSuspect(w))
  const rw1Val = (linkedRec && linkedRec.witness_a && !isSuspect(linkedRec.witness_a)) ? linkedRec.witness_a : (confirmed[0] || (consentedWitnesses[0] ? consentedWitnesses[0].name : ''))
  const rw2Val = (linkedRec && linkedRec.witness_b && !isSuspect(linkedRec.witness_b) && linkedRec.witness_b !== rw1Val) ? linkedRec.witness_b : (confirmed[1] || (consentedWitnesses[1] ? consentedWitnesses[1].name : ''))

  const renderSelectOpts = (curVal) => {
    let html = `<option value="">-- [Leave Blank: Proceed without Witness (Defective Recovery)] --</option>`
    
    html += `<optgroup label="✅ Consented Independent Panch Inhabitants (BNSS s.103)">`
    if (consentedWitnesses.length) {
      consentedWitnesses.forEach(p => {
        html += `<option value="${esc(p.name)}" ${curVal === p.name ? 'selected' : ''}>✓ ${esc(p.name)} (${esc(p.occupation || 'Local Resident')}) — Consented Panch</option>`
      })
    } else {
      html += `<option value="" disabled>⚠️ No local inhabitants canvassed yet (Visit Crime Scene &gt; Canvassing)</option>`
    }
    html += `</optgroup>`

    html += `<optgroup label="⚠️ Accused / Suspects (BSA s.23 Disclosure only — Inadmissible as Panch)">`
    suspects.forEach(p => {
      html += `<option value="${esc(p.name)}" ${curVal === p.name ? 'selected' : ''}>⚠ ${esc(p.name)} (${esc(p.role || 'Accused')}) [Accused: Inadmissible as Panch]</option>`
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
    title: 'Recovery in consequence of information — BSA s.23',
    body: `
      ${legalBox('BSA s.23 — the discovery rule', 'No confession made to a police officer shall be proved against an accused. So much of the information received from a person in custody as relates distinctly to the fact thereby discovered may be proved, provided the discovery is in the presence of a Magistrate or in the presence of two or more respectable witnesses. An accused person can never be a panch witness.', '23', 'BSA')}
      <div class="grid g2">
        <div class="paper" style="padding:20px 22px">
          <div class="paper-head"><h2>RECOVERY MEMO</h2><p>Metro Crime Branch &middot; Case №${esc(s.caseNo)} &middot; Day ${s.day}</p></div>
          <div class="paper-row"><span class="k">Disclosure</span><span class="v" style="font-size:12.5px">${esc(l.detail || l.title)}</span></div>
          <div class="paper-row"><span class="k">Object recovered</span><span class="v">${esc(l.recovery_item || '—')}</span></div>
          <div class="paper-row"><span class="k">Location</span><span class="v">${esc(l.recovery_grid || '—')}</span></div>
          <div class="paper-sig"><div>Witness 1</div><div>Witness 2</div><div>Investigating Officer</div></div>
        </div>
        <div>
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Independent Panch Witness 1 <span class="dim">(BNSS s.103 / BSA s.23)</span></label>
            <select id="rw1" class="doc-input" style="width:100%;padding:8px 10px;background:#0d141f;border:1px solid #23344a;border-radius:4px;color:#e6edf3;font-size:13px">
              ${renderSelectOpts(rw1Val)}
            </select>
          </div>
          <div style="margin-bottom:14px">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Independent Panch Witness 2 <span class="dim">(BNSS s.103 / BSA s.23)</span></label>
            <select id="rw2" class="doc-input" style="width:100%;padding:8px 10px;background:#0d141f;border:1px solid #23344a;border-radius:4px;color:#e6edf3;font-size:13px">
              ${renderSelectOpts(rw2Val)}
            </select>
          </div>

          <div id="rw-validation-banner" style="margin-top:10px"></div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px">
            <button type="button" class="btn sm gh" id="rw-go-canvass" style="font-size:11.5px">🏘️ Canvass Crime Scene for Panchas</button>
            <span class="dim mono" style="font-size:11px">${consentedWitnesses.length} consented panch(es) available</span>
          </div>
        </div>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="rw-do">Execute recovery</button>`,
    after: (veil, close) => {
      const rw1El = veil.querySelector('#rw1')
      const rw2El = veil.querySelector('#rw2')
      const bannerEl = veil.querySelector('#rw-validation-banner')

      const updateValidation = () => {
        const val1 = (rw1El.value || '').trim()
        const val2 = (rw2El.value || '').trim()

        const hasBlank = !val1 || !val2
        const isSame = val1 && val2 && val1.toLowerCase() === val2.toLowerCase()
        const hasAccused = isSuspect(val1) || isSuspect(val2)

        if (hasBlank) {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#e0be6c;background:rgba(224,190,108,0.08)"><div class="hb-h" style="color:#e0be6c">&#9888; Major Procedural Defect: Missing Panch Witness</div>BSA s.23 &amp; BNSS s.103 mandate two independent respectable inhabitants. Proceeding with an empty witness field will record a defective recovery that cannot be proved in court.</div>`
        } else if (hasAccused) {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#ff8b86;background:rgba(255,139,134,0.08)"><div class="hb-h" style="color:#ff8b86">&#9888; Major Procedural Defect: Accused cannot act as Panch</div>Under BSA s.23, an accused provides the confession/disclosure. The physical recovery must be witnessed by two independent respectable local inhabitants. An accused cannot witness their own recovery!</div>`
        } else if (isSame) {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#ff8b86;background:rgba(255,139,134,0.08)"><div class="hb-h" style="color:#ff8b86">&#9888; Procedural Defect: Identical Witness</div>Two distinct independent witnesses are required by law.</div>`
        } else {
          bannerEl.innerHTML = `<div class="helpbox" style="border-color:#3f9d6a;background:rgba(63,157,106,0.08)"><div class="hb-h" style="color:#6fd39b">&#10003; Lawful BSA s.23 Discovery</div>Two distinct independent respectable local inhabitants selected. The recovery will substantiate the disclosure and be fully admissible in trial.</div>`
        }
      }

      rw1El.onchange = updateValidation
      rw2El.onchange = updateValidation
      updateValidation()

      const canvassBtn = veil.querySelector('#rw-go-canvass')
      if (canvassBtn) {
        canvassBtn.onclick = () => {
          close()
          G.sceneMode = 'canvass'
          G.tab = 'scene'
          render()
        }
      }

      veil.querySelector('#rw-do').onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/recovery`, { method: 'POST', body: JSON.stringify({
          leadId, witnessA: rw1El.value, witnessB: rw2El.value
        }) })
        mergeBundle(r); close(); render()
        toast(r.valid ? 'Recovery provable under BSA s.23' : 'Recovery with Procedural Defect', r.message, r.valid ? 'good' : 'crit')
      })
    }
  })
}

/* ---------------------------- POIs ---------------------------- */

VIEWS.pois = function () {
  const s = G.snapshot
  if (!s) return emptyState()
  if (!s.fir) return needFir('Persons of interest emerge from the investigation. Register the FIR first.')
  const byRole = { suspect: [], victim: [], complainant: [], witness: [], expert: [], informant: [] }
  ;(s.persons || []).forEach(p => {
    // Only include witness in the POI tab if they have been canvassed AND assented to be a witness
    if (p.role === 'witness') {
      const isConsented = (p.canvassed && (p.consented || p.assent || p.canvassConsent)) || ((s.consentedWitnesses || []).includes(p.name))
      if (!isConsented) return
    }
    (byRole[p.role] = byRole[p.role] || []).push(p)
  })
  const totalVisible = Object.values(byRole).reduce((acc, arr) => acc + arr.length, 0)
  return head('&#128101;', 'Persons of Interest', totalVisible + ' person(s) on the file &middot; act on evidence, not suspicion')
  + procedureCoach([
    { ok: (s.persons || []).filter(p => (p.statements || []).length).length > 0, text: 'Record statements of witnesses and suspects in their own words', detail: cite('180', 'BNSS') },
    { ok: (s.persons || []).filter(p => p.alibi_verified).length > 0, text: 'Verify the alibi of anyone you might charge' },
    { ok: (s.persons || []).filter(p => p.arrested).length > 0 || (s.tips || []).length > 0, text: 'Conduct an identification parade where identity is in issue', detail: cite('9', 'BSA') }
  ])
  + Object.entries(byRole).filter(([, arr]) => arr.length).map(([role, arr]) => `
    <div class="card">
      <div class="card-h"><h3>${role === 'suspect' ? 'Suspects' : role === 'victim' ? 'Victims' : role === 'complainant' ? 'Complainants' : role === 'witness' ? 'Witnesses' : role === 'expert' ? 'Experts' : 'Informants'}</h3><span class="sp mono dim" style="font-size:11px">${arr.length}</span></div>
      ${arr.map(p => poiCard(p, s)).join('')}
    </div>`).join('')
  + (!totalVisible ? '<div class="vacant"><i>&#128101;</i><h3>No persons on file</h3><p>Canvass the scene and pull surveillance data; canvassed and consenting witnesses will begin to appear here.</p></div>' : '')
}

VIEWS.pois.after = function () {
  const s = G.snapshot; if (!s) return
  $$('[data-poi]').forEach(el => el.onclick = () => {
    const p = s.persons.find(x => String(x.id) === el.dataset.poi); if (p) poiModal(p, s)
  })
  $$('[data-act]').forEach(b => b.onclick = (e) => {
    e.stopPropagation()
    document.querySelectorAll('.poi-dd-menu').forEach(m => m.classList.remove('open'))
    document.querySelectorAll('.poi-dd-wrap').forEach(w => w.classList.remove('open'))
    const p = s.persons.find(x => String(x.id) === b.dataset.pid)
    const a = b.dataset.act
    if (a === 'stmt') statementModal(p)
    else if (a === 'alibi') act(async () => {
      const r = await api(`/cases/${s.caseId}/persons/${p.id}/verify-alibi`, { method: 'POST', body: '{}' })
      mergeBundle(r); render()
      modal({ title: 'Alibi verification — ' + p.name, body: `<div class="check ${r.holds ? 'ok' : 'no'}"><span class="ci">${r.holds ? '&#10003;' : '&#10007;'}</span><span class="cn">${esc(r.verdict)}</span></div>${r.holds ? '<div class="helpbox"><div class="hb-h">&#8505; What this means</div>A substantiated alibi eliminates a suspect. Eliminating the innocent is as much a part of competent investigation as charging the guilty — and it protects your file.</div>' : '<div class="legalbox" style="border-color:var(--red)"><div class="lb-h" style="color:#ff8b86">&#9888; What this means</div>The account is false. A false alibi is a strong circumstantial fact in your favour, but it is not proof of the offence by itself. Corroborate it.</div>'}`, footer: '<button class="btn" data-close>Close</button>' })
    })
    else if (a === 'arrest') arrestModal(p)
    else if (a === 'tip') tipModal(p)
    else if (a === 'canvass') {
      G.sceneMode = 'canvass'
      G.canvassDir = p.direction || 'all'
      G.tab = 'scene'
      render()
    }
    else if (a === 'interview') {
      G.tab = 'interrogation'
      G.view = 'interrogation'
      G.ivTarget = p.id
      render()
    }
    else if (a === 'interview-team') {
      openJointInterrogationModal(p, s)
    }
  })
}

window.__togglePoiMenu = function (e, pid) {
  if (e) e.stopPropagation()
  const menu = document.getElementById(`poi-dd-${pid}`)
  const wrap = document.getElementById(`poi-dd-wrap-${pid}`)
  const isAlreadyOpen = menu && menu.classList.contains('open')

  document.querySelectorAll('.poi-dd-menu').forEach(m => {
    m.classList.remove('open')
    m.style.left = ''
    m.style.right = ''
  })
  document.querySelectorAll('.poi-dd-wrap').forEach(w => w.classList.remove('open'))

  if (menu && !isAlreadyOpen) {
    menu.classList.add('open')
    if (wrap) wrap.classList.add('open')

    // Screen boundary auto-adjustment
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect()
      const vw = window.innerWidth || document.documentElement.clientWidth
      if (rect.right > vw - 12) {
        menu.style.right = '0'
        menu.style.left = 'auto'
      }
      const updatedRect = menu.getBoundingClientRect()
      if (updatedRect.left < 12) {
        menu.style.left = '0'
        menu.style.right = 'auto'
      }
    })
  }
}

if (!window.__poiMenuDocListener) {
  window.__poiMenuDocListener = true
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.poi-dd-wrap')) {
      document.querySelectorAll('.poi-dd-menu').forEach(m => m.classList.remove('open'))
      document.querySelectorAll('.poi-dd-wrap').forEach(w => w.classList.remove('open'))
    }
  })
}

function openJointInterrogationModal(p, s) {
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
    title: '👥 Select Co-Examiner to Interrogate ' + p.name,
    body: `<div class="reader">
      <div class="poi critical" style="margin-bottom:14px;padding:10px 12px">
        ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic-sm') : ''}
        <div class="poi-b">
          <div class="poi-n" style="color:var(--gold2)">${esc(p.name)} (${esc(p.role)})</div>
          <div class="poi-r">${esc(p.occupation || 'Subject of inquiry')}${p.stated_alibi ? ' · Alibi: ' + esc(p.stated_alibi) : ''}</div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--ink2);margin-bottom:12px;line-height:1.5">
        Choose a squad member to accompany you into the interrogation chamber. The co-examiner will actively assist in cross-examination, challenge falsified timelines, and uncover locatable discoveries under BSA s.23.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;padding-right:4px">
        ${uniqueOfficers.map(m => `
          <div class="poi" style="padding:10px 12px;cursor:pointer;background:rgba(22,33,54,0.6);border:1px solid rgba(200,162,74,0.25);border-radius:6px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s" onclick="window.__startJointInterro('${p.id}', '${esc(m.name)}')">
            <div style="display:flex;align-items:center;gap:10px">
              ${window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(m, m.role || 'field', m.portrait_key, 'poi-pic-sm') : `<div class="poi-pic-sm"><span class="init">${esc(m.name.slice(0, 2))}</span></div>`}
              <div>
                <div style="font-size:13.5px;font-weight:700;color:var(--gold2)">${esc(m.name)}</div>
                <div style="font-size:11.5px;color:#94a3b8">${esc(m.speciality || m.role || 'Investigator')}</div>
              </div>
            </div>
            <button type="button" class="btn sm pri" style="padding:5px 12px;font-size:11.5px">Commence ➔</button>
          </div>
        `).join('')}
      </div>
    </div>`,
    footer: `<button class="btn" data-close>Cancel</button>`
  })

  window.__startJointInterro = (personId, officerName) => {
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

function poiCard(p, s) {
  const iv = s.interviews.find(i => i.person_id === p.id)
  const cons = (p.contradictions || []).length
  const cls = p.arrested ? 'critical' : iv ? 'warn' : ''
  const avatarMarkup = window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'poi-pic') : `<div class="poi-pic"><span class="init">${esc((p.name || '').slice(0, 2))}</span></div>`
  const isPanchConsented = (p.canvassed && p.consented) || ((s.consentedWitnesses || []).includes(p.name))
  const stCount = (p.statements || []).length

  const statusBadges = []

  if (stCount > 0) {
    statusBadges.push(`<span class="poi-status-badge st-ok"><span class="psi">📝</span><span>${stCount} statement(s)</span></span>`)
  } else {
    statusBadges.push(`<span class="poi-status-badge st-off"><span class="psi">📝</span><span>No statement</span></span>`)
  }

  if (p.stated_alibi) {
    if (p.alibi_verified) {
      statusBadges.push(`<span class="poi-status-badge alibi-verified"><span class="psi">🛡️</span><span>Alibi Verified</span></span>`)
    } else {
      statusBadges.push(`<span class="poi-status-badge alibi-unverified"><span class="psi">🛡️</span><span>Alibi Unverified</span></span>`)
    }
  } else {
    statusBadges.push(`<span class="poi-status-badge alibi-none"><span class="psi">🛡️</span><span>No Alibi Stated</span></span>`)
  }

  if (iv) {
    statusBadges.push(`<span class="poi-status-badge exam-done"><span class="psi">🔍</span><span>Examined · Tension ${iv.tension}</span></span>`)
    if ((iv.admissible || []).length > 0) {
      statusBadges.push(`<span class="poi-status-badge facts-ok"><span class="psi">⚖️</span><span>${iv.admissible.length} provable fact(s)</span></span>`)
    }
  } else {
    statusBadges.push(`<span class="poi-status-badge exam-pending"><span class="psi">🔍</span><span>Unexamined</span></span>`)
  }

  if (p.role === 'witness') {
    statusBadges.push(`<span class="poi-status-badge ${isPanchConsented ? 'panch-ok' : 'panch-pending'}"><span class="psi">${isPanchConsented ? '✓' : '⚠️'}</span><span>${isPanchConsented ? 'Consented Panch (s.103)' : 'Canvass Pending'}</span></span>`)
  }

  if (cons > 0) {
    statusBadges.push(`<span class="poi-status-badge contradiction-warn"><span class="psi">⚠️</span><span>${cons} contradiction(s)</span></span>`)
  }

  if (p.arrested) {
    statusBadges.push(`<span class="poi-status-badge arrest-critical"><span class="psi">🚨</span><span>ARRESTED${p.arrest_legal ? '' : ' (Defective Grounds)'}</span></span>`)
  }

  return `<div class="poi ${cls}" data-poi="${p.id}">
    ${avatarMarkup}
    <div class="poi-b">
      <div class="poi-n">${esc(p.name)}${p.alias ? ` <span class="dim" style="font-size:12px">alias ${esc(p.alias)}</span>` : ''}</div>
      <div class="poi-r">${esc(p.role)}${p.age ? ' · age ' + p.age : ''}${p.occupation ? ' · ' + esc(p.occupation) : ''}</div>
      <div class="poi-d">${esc((p.profile || {}).summary || '')}</div>
      
      <div class="poi-status-grid">
        ${statusBadges.join('')}
      </div>

      <div class="poi-actions-bar" onclick="event.stopPropagation()">
        ${(p.role === 'suspect' || p.role === 'witness') ? `
          <button type="button" class="btn sm pri poi-quick-btn" data-act="interview" data-pid="${p.id}">
            <span>🔍 Examine</span>
          </button>
        ` : ''}

        <div class="poi-dd-wrap" id="poi-dd-wrap-${p.id}">
          <button type="button" class="btn sm poi-dd-trigger" onclick="window.__togglePoiMenu(event, '${p.id}')">
            <span>⚡ Case Actions</span>
            <span class="poi-dd-chevron">▾</span>
          </button>

          <div class="poi-dd-menu" id="poi-dd-${p.id}" onclick="event.stopPropagation()">
            <div class="poi-dd-header">INVESTIGATIVE ACTIONS</div>

            <button type="button" class="poi-dd-item" data-act="stmt" data-pid="${p.id}">
              <span class="poi-dd-ic">📝</span>
              <div class="poi-dd-content">
                <div class="poi-dd-label">Record Statement</div>
                <div class="poi-dd-desc">BNSS §180 — Record account in subject's own words</div>
              </div>
            </button>

            ${p.stated_alibi ? `
            <button type="button" class="poi-dd-item" data-act="alibi" data-pid="${p.id}">
              <span class="poi-dd-ic">🛡️</span>
              <div class="poi-dd-content">
                <div class="poi-dd-label">Verify Alibi</div>
                <div class="poi-dd-desc">Field check & witness corroboration</div>
              </div>
            </button>` : ''}

            ${(p.role === 'suspect' || p.role === 'witness') ? `
            <button type="button" class="poi-dd-item" data-act="interview" data-pid="${p.id}">
              <span class="poi-dd-ic">🔍</span>
              <div class="poi-dd-content">
                <div class="poi-dd-label">Examine Subject</div>
                <div class="poi-dd-desc">Direct interrogation session in chamber</div>
              </div>
            </button>

            <button type="button" class="poi-dd-item team" data-act="interview-team" data-pid="${p.id}">
              <span class="poi-dd-ic">👥</span>
              <div class="poi-dd-content">
                <div class="poi-dd-label">Interrogate with Team</div>
                <div class="poi-dd-desc">Bring squad co-examiner into chamber</div>
              </div>
            </button>` : ''}

            ${p.role === 'suspect' ? `
            <button type="button" class="poi-dd-item danger" data-act="arrest" data-pid="${p.id}">
              <span class="poi-dd-ic">🚨</span>
              <div class="poi-dd-content">
                <div class="poi-dd-label">Arrest / Record Grounds</div>
                <div class="poi-dd-desc">BNSS §35/47/58 — Execute arrest with legal grounds</div>
              </div>
            </button>` : ''}

            ${(p.role === 'witness' || p.role === 'victim' || p.role === 'complainant') ? `
            <button type="button" class="poi-dd-item" data-act="tip" data-pid="${p.id}">
              <span class="poi-dd-ic">👁️</span>
              <div class="poi-dd-content">
                <div class="poi-dd-label">Identification Parade</div>
                <div class="poi-dd-desc">BSA §9 — Testimonial recognition procedure</div>
              </div>
            </button>` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>`
}

function poiModal(p, s) {
  const iv = s.interviews.find(i => i.person_id === p.id)
  const guessed = /was at the scene|present at/i.test(p.true_alibi || '')
  const avatarMarkup = window.CFZ_AVATAR ? window.CFZ_AVATAR.getAvatarHtml(p, p.role, p.portrait_key, 'dossier-pic') : ''
  modal({
    cls: 'wide',
    title: 'Dossier — ' + p.name,
    body: `<div class="grid g12">
      <div class="paper" style="padding:20px 22px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
          <div id="dossier-pic-container" style="width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid var(--gold);flex-shrink:0">
            ${avatarMarkup}
          </div>
          <div>
            <div class="paper-head" style="margin:0"><h2 style="margin:0">${esc(p.name)}</h2><p style="margin:2px 0 0">Metro Crime Branch &middot; Case №${esc(s.caseNo)}</p></div>
          </div>
        </div>
        <div class="paper-row"><span class="k">Name</span><span class="v">${esc(p.name)}${p.alias ? ' (alias ' + esc(p.alias) + ')' : ''}</span></div>
        <div class="paper-row"><span class="k">Age</span><span class="v">${esc(p.age || '—')}</span></div>
        <div class="paper-row"><span class="k">Occupation</span><span class="v">${esc(p.occupation || '—')}</span></div>
        <div class="paper-row"><span class="k">Address</span><span class="v">${esc(p.address || '—')}</span></div>
        <div class="paper-row"><span class="k">Capacity</span><span class="v">${esc(p.role)}</span></div>
        <div class="paper-rule"></div>
        <div class="hd" style="font-size:11.5px;letter-spacing:.1em;margin:8px 0 5px">Motive</div>
        <div style="font-size:13px">${esc((p.profile || {}).motive || '—')}</div>
        <div class="hd" style="font-size:11.5px;letter-spacing:.1em;margin:8px 0 5px">Opportunity</div>
        <div style="font-size:13px">${esc((p.profile || {}).opportunity || '—')}</div>
        <div class="hd" style="font-size:11.5px;letter-spacing:.1em;margin:8px 0 5px">Means</div>
        <div style="font-size:13px">${esc((p.profile || {}).means || '—')}</div>
        <div class="paper-sig"><div>Prepared by — IO</div><div>Day ${s.day}</div></div>
      </div>
      <div>
        <div class="card"><div class="card-h"><h3>Stated account</h3></div>
          ${p.stated_alibi ? `<div style="font-size:13px;line-height:1.65">"${esc(p.stated_alibi)}"</div>` : '<div class="dim" style="font-size:12.5px">No account on record.</div>'}
          ${p.alibi_verified ? '<div class="rule"></div><div class="check ok"><span class="ci">&#10003;</span><span class="cn">Alibi has been verified.</span></div>' : ''}
        </div>
        <div class="card"><div class="card-h"><h3>Statements on record</h3>${cite('180', 'BNSS')}</div>
          ${(p.statements || []).length ? p.statements.map(st => `<div style="padding:8px 0;border-bottom:1px dotted rgba(42,52,67,.7)"><div class="mono dim" style="font-size:10.5px">DAY ${st.day}${st.signed ? ' · SIGNED' : ''}</div><div style="font-size:13px;margin-top:3px">${esc(st.body)}</div></div>`).join('') : '<div class="dim" style="font-size:12.5px">None recorded.</div>'}
        </div>
        ${iv ? `<div class="card"><div class="card-h"><h3>Examination</h3></div>
          <div class="kv"><span class="k">Tension</span><span class="v">${iv.tension}/100</span></div>
          <div class="kv"><span class="k">Credibility</span><span class="v">${Math.round(iv.credibility)}/100</span></div>
          <div class="kv"><span class="k">Provable facts</span><span class="v">${(iv.admissible || []).length}</span></div>
          <div class="kv"><span class="k">Not provable</span><span class="v">${(iv.inadmissible || []).length}</span></div></div>` : ''}
        ${(p.contradictions || []).length ? `<div class="card" style="border-color:var(--amber)"><div class="card-h"><h3 style="color:#f0b45f">Contradictions caught</h3></div>${p.contradictions.map(c => `<div class="check ok"><span class="ci">&#8594;</span><span class="cn">${esc(c.against)}</span></div>`).join('')}</div>` : ''}
        ${iv ? '' : ''}
        ${p.arrested && p.arrest_grounds ? `<div class="card"><div class="card-h"><h3>Grounds of arrest</h3>${cite('47', 'BNSS')}</div><div style="font-size:13px">${esc(p.arrest_grounds)}</div>${p.arrest_legal ? '' : '<div class="check no" style="margin-top:8px"><span class="ci">&#10007;</span><span class="cn">These grounds were not properly recorded or communicated. A procedural defect the defence will exploit.</span></div>'}</div>` : ''}
      </div>
    </div>`,
    footer: `<button class="btn" data-close>Close</button>`
  })
}

function statementModal(p) {
  const s = G.snapshot
  modal({
    cls: 'wide',
    title: 'Witness statement — BNSS s.180',
    body: `${legalBox('BNSS s.180 — recording of statements', 'The statement of a witness is recorded in the manner prescribed. The witness\'s own account must be recorded — your inferences must not appear in it. When the witness later departs from it, the defence will show that the words were yours, and the statement becomes worthless.', '180', 'BNSS')}
      <div class="fld"><label>Statement of ${esc(p.name)} (${esc(p.role)})</label>
      <textarea id="st-body" class="doc" rows="9" placeholder="Record the account in the witness's own voice and sequence. Do not include your own conclusions."></textarea>
      <div class="hint">Write in the first person as the witness spoke. Anything you add will be exposed later.</div></div>
      <div class="fld" style="margin-top:12px">
        <label style="display:flex;gap:10px;align-items:center;cursor:pointer;font-family:var(--font-ui);font-size:13px;color:var(--ink2);user-select:none">
          <input type="checkbox" id="st-sign" style="width:16px;height:16px;accent-color:var(--gold);cursor:pointer">
          <span>Read back to the witness, who signed the admissible portion.</span>
        </label>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="st-save">Record statement</button>`,
    after: (veil, close) => {
      veil.querySelector('#st-save').onclick = () => act(async () => {
        const body = veil.querySelector('#st-body').value.trim()
        if (body.length < 30) { toast('Statement too brief', 'A statement must record what the witness actually said.', 'warn'); return }
        const r = await api(`/cases/${s.caseId}/persons/${p.id}/statement`, { method: 'POST', body: JSON.stringify({ statement: body, signed: veil.querySelector('#st-sign').checked }) })
        mergeBundle(r); close(); render(); toast('Statement recorded', 'Entered under BNSS s.180 and available for the charge sheet witness list.', 'good')
      })
    }
  })
}

function arrestModal(p) {
  const s = G.snapshot
  modal({
    cls: 'wide',
    title: 'Arrest — grounds and communication',
    body: `${legalBox('BNSS s.47 and s.58 — arrest', 'No arrest shall be made without the officer being satisfied that the arrest is necessary, and the officer shall record the reasons in writing. The officer shall forthwith communicate to the person arrested the full particulars of the offence and the grounds of arrest, and inform him of the right to bail.', '47', 'BNSS')}
      <div class="grid g2">
        <div><div class="fld"><label>Grounds of arrest, recorded in writing<span class="req">*</span></label>
        <textarea id="ar-grounds" rows="7" placeholder="State the material against this person and why his arrest is necessary for the investigation. A bare assertion will not do."></textarea>
        <div class="hint">At least a full paragraph. The Arbiter scores these against the necessity test.</div></div></div>
        <div>
          <div class="card"><div class="card-h"><h3>Before you arrest</h3></div>
            <div class="check ${p.alibi_verified ? 'ok' : 'no'}"><span class="ci">${p.alibi_verified ? '&#10003;' : '&#10007;'}</span><span class="cn">Alibi verified<div class="cd">${p.alibi_verified ? 'Done.' : 'Arresting a person whose alibi you have not checked is how careers end.'}</div></span></div>
            <div class="check ${(p.statements || []).length ? 'ok' : 'no'}"><span class="ci">${(p.statements || []).length ? '&#10003;' : '&#10007;'}</span><span class="cn">Account on record</span></div>
            <div class="check"><span class="ci">&#9675;</span><span class="cn">Remand: production before a Magistrate within 24 hours</span></div>
          </div>
        </div>
      </div>
      <div class="fld" style="margin-top:14px">
        <label style="display:flex;gap:10px;align-items:center;cursor:pointer;font-family:var(--font-ui);font-size:13px;color:var(--ink2);user-select:none">
          <input type="checkbox" id="ar-comm" style="width:16px;height:16px;accent-color:var(--gold);cursor:pointer">
          <span>I have informed him of the particulars of the offence, the grounds of arrest, and his right to bail.</span>
        </label>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn dgr" id="ar-do">Arrest</button>`,
    after: (veil, close) => {
      veil.querySelector('#ar-do').onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/arrest`, { method: 'POST', body: JSON.stringify({ personId: p.id, grounds: veil.querySelector('#ar-grounds').value, communicated: veil.querySelector('#ar-comm').checked }) })
        mergeBundle(r); close(); render()
        if (r.legal !== false && r.ok !== false) toast('Arrest recorded lawfully', 'Grounds recorded and communicated under BNSS s.35. Produce subject before a Judicial Magistrate within 24 hours pursuant to BNSS s.58.', 'good')
        else toast('Arrest procedurally defective', (r.problems || []).join(' ') || 'Grounds of arrest not properly communicated.', 'crit')
      })
    }
  })
}

function tipModal(p) {
  const s = G.snapshot
  modal({
    title: 'Test Identification Parade — BSA s.9',
    body: `${legalBox('BSA s.9 — identification', 'Facts necessary to explain or introduce a fact in issue are relevant, including the identity of a person. The parade must be held promptly, the accused placed among persons of similar description, and the proceedings supervised independently.', '9', 'BSA')}
      <div class="helpbox"><div class="hb-h">&#9888; Before you conduct it</div>The witness must not have seen the accused, or any photograph of him, beforehand. A mistaken or suggested identification is far worse than none — it will be exposed in court and it damages the rest of your file.</div>
      <div class="fld"><label>Witness</label><div style="font-size:13.5px">${esc(p.name)}</div></div>
      <div class="fld"><label>Accused to be placed in the parade</label>
      <select id="tip-per">${s.persons.filter(x => x.role === 'suspect').map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>
      <div class="fld"><label>Conducting officer / magistrate</label><input type="text" id="tip-wit" value="Shri A. Kadam, Executive Magistrate" /></div>
      <div class="fld" style="margin-top:12px">
        <label style="display:flex;gap:10px;align-items:center;cursor:pointer;font-family:var(--font-ui);font-size:13px;color:var(--ink2);user-select:none">
          <input type="checkbox" id="tip-id" style="width:16px;height:16px;accent-color:var(--gold);cursor:pointer">
          <span>The witness identified the person placed in the parade.</span>
        </label>
      </div>`,
    footer: `<button class="btn gh" data-close>Cancel</button><button class="btn pri" id="tip-do">Record parade</button>`,
    after: (veil, close) => {
      veil.querySelector('#tip-do').onclick = () => act(async () => {
        const r = await api(`/cases/${s.caseId}/tip`, { method: 'POST', body: JSON.stringify({ personId: Number(veil.querySelector('#tip-per').value), identified: veil.querySelector('#tip-id').checked, witnesses: veil.querySelector('#tip-wit').value }) })
        mergeBundle(r); close(); render()
        toast(r.identified ? (r.correct ? 'Identification recorded' : 'Identification recorded — but it is wrong') : 'No identification made', r.msg, r.correct ? 'good' : r.identified ? 'crit' : 'warn')
      })
    }
  })
}

function emptyState() {
  return `<div class="vacant"><i>&#128194;</i><h3>No case file open</h3><p>Open a case from the Case Wall to begin. If you have not yet been inducted, the recruitment process will begin with your application.</p><button class="btn pri" id="es-open">Go to the Case Wall</button></div>`
}
function needFir(msg) {
  return `<div class="vacant"><i>&#128220;</i><h3>A case has no legal existence without an FIR</h3><p>${esc(msg)} Register the FIR in the Duty Room first — every later step depends on it.</p><button class="btn pri" id="nf-go">Go to the Duty Room</button></div>`
}

const _origAfter = {}
Object.keys(VIEWS).forEach(k => { _origAfter[k] = VIEWS[k].after })
new MutationObserver(() => {}).observe(document.documentElement, { childList: true })

// generic delegation for empty-state buttons
document.addEventListener('click', (e) => {
  if (e.target.id === 'es-open') { G.view = 'wall'; render() }
  if (e.target.id === 'nf-go') { G.view = 'desk'; render() }
})
