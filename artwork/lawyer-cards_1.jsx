import { useState } from "react";

const W = 240, H = 340;

// ── CARD 1: THE ADJUDICATOR ──────────────────────────────────────
// Scales of justice, robed lawyer silhouette, legal-paper ruled bg
// Palette: near-black brown, deep crimson, antique gold, parchment

export function CardAdjudicator() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <filter id="gA" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.88" numOctaves="4" seed="3" result="n"/>
          <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
          <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
          <feComposite in="b" in2="SourceGraphic" operator="in"/>
        </filter>
        <radialGradient id="vigA" cx="50%" cy="45%" r="62%">
          <stop offset="0%" stopColor="#2A1005" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0C0703" stopOpacity="0.7"/>
        </radialGradient>
        <pattern id="rulesA" width="240" height="9" patternUnits="userSpaceOnUse">
          <line x1="0" y1="8.5" x2="240" y2="8.5" stroke="#B82018" strokeWidth="0.35" opacity="0.18"/>
        </pattern>
      </defs>

      {/* Base + ruled bg */}
      <rect width={W} height={H} fill="#1C1008"/>
      <rect width={W} height={H} fill="url(#rulesA)"/>
      <rect width={W} height={H} fill="url(#vigA)"/>

      {/* Faint courthouse dome */}
      <ellipse cx="120" cy="122" rx="64" ry="30" fill="#B82018" opacity="0.07"/>
      <rect x="74" y="122" width="92" height="60" fill="#B82018" opacity="0.05"/>
      <rect x="82" y="118" width="14" height="22" fill="#B82018" opacity="0.04"/>
      <rect x="144" y="118" width="14" height="22" fill="#B82018" opacity="0.04"/>

      {/* Radiating lines behind scales */}
      {[...Array(24)].map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <line key={i}
          x1={120 + 30 * Math.cos(a)} y1={92 + 30 * Math.sin(a)}
          x2={120 + 90 * Math.cos(a)} y2={92 + 90 * Math.sin(a)}
          stroke="#E0A818" strokeWidth="0.5" opacity="0.12"/>;
      })}

      {/* SCALES OF JUSTICE */}
      {/* Staff */}
      <rect x="118" y="44" width="4" height="120" fill="#E0A818"/>
      {/* Finial */}
      <circle cx="120" cy="38" r="11" fill="#E0A818"/>
      <circle cx="120" cy="38" r="7" fill="#1C1008"/>
      <circle cx="120" cy="38" r="3" fill="#E0A818"/>
      <line x1="109" y1="38" x2="131" y2="38" stroke="#E0A818" strokeWidth="1.5"/>
      <line x1="120" y1="27" x2="120" y2="49" stroke="#E0A818" strokeWidth="1.5"/>
      {/* Pivot */}
      <circle cx="120" cy="90" r="6" fill="#E0A818"/>
      <circle cx="120" cy="90" r="3.5" fill="#B82018"/>
      {/* Beam — tilted left-heavy */}
      <rect x="38" y="86" width="164" height="5" fill="#B82018" rx="1"
        transform="rotate(7 120 88)"/>
      <rect x="38" y="86" width="164" height="1.5" fill="#E0A818" rx="0.5" opacity="0.4"
        transform="rotate(7 120 88)"/>
      {/* Left chain */}
      <line x1="46" y1="93" x2="43" y2="140" stroke="#E0A818" strokeWidth="1.5"/>
      {/* Right chain */}
      <line x1="192" y1="80" x2="196" y2="124" stroke="#E0A818" strokeWidth="1.5"/>
      {/* Left pan (heavy/low) */}
      <path d="M23,142 Q43,156 63,142" stroke="#E0A818" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <line x1="23" y1="142" x2="63" y2="142" stroke="#E0A818" strokeWidth="1.2"/>
      {/* Water drop in left pan */}
      <path d="M43,130 C41,123 37,118 37,114 C37,109 40,106 43,106 C46,106 49,109 49,114 C49,118 45,123 43,130Z"
        fill="#E0A818" opacity="0.65"/>
      {/* Right pan (light/high) */}
      <path d="M176,126 Q196,140 216,126" stroke="#E0A818" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <line x1="176" y1="126" x2="216" y2="126" stroke="#E0A818" strokeWidth="1.2"/>
      {/* Coins in right pan */}
      <circle cx="190" cy="121" r="5.5" fill="none" stroke="#E0A818" strokeWidth="1.8" opacity="0.6"/>
      <circle cx="201" cy="119" r="5.5" fill="none" stroke="#E0A818" strokeWidth="1.8" opacity="0.6"/>

      {/* ROBED LAWYER FIGURE */}
      {/* Head */}
      <ellipse cx="120" cy="187" rx="16" ry="18" fill="#B82018"/>
      {/* White bands/jabot collar */}
      <rect x="113" y="200" width="5" height="11" rx="1" fill="#F0E0C0"/>
      <rect x="122" y="200" width="5" height="11" rx="1" fill="#F0E0C0"/>
      {/* Robe — wide, tapered */}
      <path d="M72,212 L100,205 L120,210 L140,205 L168,212 L162,280 L78,280 Z" fill="#B82018"/>
      {/* Robe lapel shadow */}
      <path d="M100,205 L113,222 L120,215 L127,222 L140,205 L136,218 L120,228 L104,218Z"
        fill="#0C0703" opacity="0.45"/>
      {/* Left arm */}
      <path d="M72,212 L50,268 L64,274 L84,220 Z" fill="#B82018"/>
      {/* Right arm */}
      <path d="M168,212 L184,268 L170,274 L156,220 Z" fill="#B82018"/>
      {/* Briefcase */}
      <rect x="168" y="266" width="28" height="20" rx="2" fill="#B82018"/>
      <rect x="168" y="266" width="28" height="20" rx="2" fill="none" stroke="#E0A818" strokeWidth="1.4"/>
      <rect x="175" y="261" width="14" height="6" rx="3" fill="none" stroke="#E0A818" strokeWidth="1.4"/>
      <line x1="168" y1="275" x2="196" y2="275" stroke="#E0A818" strokeWidth="0.7" opacity="0.6"/>
      <line x1="181" y1="266" x2="181" y2="286" stroke="#E0A818" strokeWidth="0.7" opacity="0.6"/>
      {/* Lock icon */}
      <rect x="177" y="270" width="8" height="6" rx="1" fill="#E0A818" opacity="0.5"/>

      {/* Ground shadow */}
      <ellipse cx="120" cy="286" rx="54" ry="5.5" fill="#060402" opacity="0.9"/>

      {/* Grain overlay */}
      <rect width={W} height={H} fill="#B82018" opacity="0.04" filter="url(#gA)"/>

      {/* Bottom title band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#B82018"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#E0A818" strokeWidth="2.5"/>

      <text x="120" y="308" textAnchor="middle" fill="#F0E0C0"
        fontFamily="Georgia,serif" fontSize="12.5" letterSpacing="3.5" fontWeight="bold">THE ADJUDICATOR</text>
      <text x="120" y="321" textAnchor="middle" fill="#E0A818"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3">LAWYER</text>
      <text x="120" y="334" textAnchor="middle" fill="#F0E0C0" opacity="0.5"
        fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" letterSpacing="0.5">Justice has its price.</text>
    </svg>
  );
}

// ── CARD 2: PRO BONO ATTORNEY ────────────────────────────────────
// Raised fist w/ scroll, crowd silhouettes, river waves, stars
// Palette: deep navy, burnt orange, acid yellow, cream

export function CardProBono() {
  const stars = [[30,22],[68,14],[155,18],[192,28],[212,42],[20,50],[38,8],[204,12],[170,35]];
  const crowd = [14,36,56,76,96,116,134,154,174,196,218];
  const crowdOff = [0, 3, 1, 4, 0, 2, 3, 1, 4, 0, 2];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <filter id="gB" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="7" result="n"/>
          <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
          <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
          <feComposite in="b" in2="SourceGraphic" operator="in"/>
        </filter>
        <radialGradient id="vigB" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#1A3A60" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#040E1E" stopOpacity="0.7"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#09192E"/>
      <rect width={W} height={H} fill="url(#vigB)"/>

      {/* Stars */}
      {stars.map(([x, y], i) => (
        <polygon key={i}
          points={`${x},${y-4} ${x+1.2},${y-1} ${x+4.5},${y-1} ${x+2},${y+1.5} ${x+2.8},${y+5} ${x},${y+2.5} ${x-2.8},${y+5} ${x-2},${y+1.5} ${x-4.5},${y-1} ${x-1.2},${y-1}`}
          fill="#E8D030" opacity="0.45"/>
      ))}

      {/* Crowd silhouettes */}
      {crowd.map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={218 + crowdOff[i] * 4} rx="8" ry="9" fill="#C85020" opacity="0.5"/>
          <rect x={x - 7} y={227 + crowdOff[i] * 4} width="14" height="16" rx="1" fill="#C85020" opacity="0.4"/>
          {/* Raised arm on some */}
          {i % 3 === 0 && <line x1={x + 5} y1={216 + crowdOff[i] * 4} x2={x + 12} y2={205 + crowdOff[i] * 4}
            stroke="#C85020" strokeWidth="4" strokeLinecap="round" opacity="0.4"/>}
        </g>
      ))}

      {/* River waves */}
      <path d="M0,248 Q30,239 60,248 Q90,257 120,248 Q150,239 180,248 Q210,257 240,248 L240,290 L0,290 Z"
        fill="#1A4A7A" opacity="0.35"/>
      <path d="M0,260 Q40,252 80,260 Q120,268 160,260 Q200,252 240,260 L240,295 L0,295 Z"
        fill="#0D2E52" opacity="0.4"/>

      {/* Radiating energy lines from fist center */}
      {[...Array(20)].map((_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return <line key={i}
          x1={120 + 50 * Math.cos(a)} y1={145 + 50 * Math.sin(a)}
          x2={120 + 115 * Math.cos(a)} y2={145 + 115 * Math.sin(a)}
          stroke="#E8D030" strokeWidth="0.6" opacity="0.15"/>;
      })}

      {/* RAISED ARM + FIST */}
      {/* Sleeve */}
      <path d="M96,290 L96,196 Q101,183 120,183 Q139,183 144,196 L144,290" fill="#C85020"/>
      {/* Cuff */}
      <rect x="90" y="196" width="60" height="16" rx="2" fill="#8A3010"/>
      <rect x="90" y="194" width="60" height="5" rx="1.5" fill="#7A2808"/>
      {/* Cufflinks */}
      <circle cx="95" cy="196.5" r="3.5" fill="#E8D030"/>
      <circle cx="145" cy="196.5" r="3.5" fill="#E8D030"/>

      {/* Fist */}
      <rect x="96" y="148" width="52" height="52" rx="9" fill="#C85020"/>
      {/* Knuckle lines */}
      <line x1="96" y1="166" x2="148" y2="166" stroke="#8A3010" strokeWidth="1.8" opacity="0.7"/>
      <line x1="96" y1="178" x2="148" y2="178" stroke="#8A3010" strokeWidth="1.8" opacity="0.7"/>
      {/* Thumb */}
      <path d="M148,158 Q162,162 162,172 Q162,181 150,183 L148,179" fill="#C85020"/>
      <path d="M148,158 Q162,162 162,172 Q162,181 150,183 L148,179" fill="none" stroke="#8A3010" strokeWidth="1.2"/>

      {/* SCROLL / DOCUMENT */}
      <rect x="105" y="86" width="38" height="64" rx="3" fill="#EEE4C8"
        transform="rotate(-9 124 118)"/>
      {/* Text lines on scroll */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <line key={i} x1="109" y1={93 + i * 9} x2="139" y2={91 + i * 9}
          stroke="#C85020" strokeWidth={i === 0 ? 2 : 1} opacity={i === 0 ? 0.7 : 0.35}
          transform="rotate(-9 124 118)"/>
      ))}
      <text x="124" y="101" textAnchor="middle" fill="#B82018" fontSize="5" letterSpacing="0.5"
        fontFamily="Georgia,serif" fontWeight="bold" transform="rotate(-9 124 118)">WATER</text>
      <text x="124" y="109" textAnchor="middle" fill="#B82018" fontSize="5" letterSpacing="0.5"
        fontFamily="Georgia,serif" fontWeight="bold" transform="rotate(-9 124 118)">RIGHTS</text>
      <text x="124" y="117" textAnchor="middle" fill="#B82018" fontSize="4"
        fontFamily="Georgia,serif" transform="rotate(-9 124 118)">ACT OF 1902</text>
      {/* Scroll top curl */}
      <path d="M105,88 Q114,78 124,88" fill="none" stroke="#C8B898" strokeWidth="1.8"
        strokeLinecap="round" transform="rotate(-9 124 118)"/>
      {/* Scroll bottom curl */}
      <path d="M105,150 Q114,160 124,150" fill="none" stroke="#C8B898" strokeWidth="1.8"
        strokeLinecap="round" transform="rotate(-9 124 118)"/>

      {/* Grain overlay */}
      <rect width={W} height={H} fill="#C85020" opacity="0.04" filter="url(#gB)"/>

      {/* Bottom title band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#09192E"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#E8D030" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#C85020" opacity="0.6"/>

      <text x="120" y="308" textAnchor="middle" fill="#EEE8D8"
        fontFamily="Georgia,serif" fontSize="14" letterSpacing="3.5" fontWeight="bold">PRO BONO</text>
      <text x="120" y="321" textAnchor="middle" fill="#E8D030"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3">ATTORNEY</text>
      <text x="120" y="334" textAnchor="middle" fill="#EEE8D8" opacity="0.5"
        fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" letterSpacing="0.5">The river belongs to everyone.</text>
    </svg>
  );
}

// ── CARD 3: CORPORATE COUNSEL ────────────────────────────────────
// Looming suit torso from below, industrial skyline, smoke, coins
// Palette: dark forest green, antique gold, near-black

export function CardCorporateCounsel() {
  const winRows = 3, winCols = 4;
  const b1win = [[0.3,0.06,0.28,0.32],[0.1,0.30,0.07,0.22],[0.26,0.16,0.30,0.10]];
  const b2win = [[0.3,0.20],[0.08,0.28],[0.22,0.12],[0.30,0.08],[0.18,0.24]];
  const b3win = [[0.25,0.08,0.32],[0.10,0.28,0.14],[0.30,0.08,0.22],[0.12,0.24,0.08]];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <filter id="gC" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.90" numOctaves="4" seed="11" result="n"/>
          <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
          <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
          <feComposite in="b" in2="SourceGraphic" operator="in"/>
        </filter>
        <radialGradient id="vigC" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1A3010" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#040804" stopOpacity="0.7"/>
        </radialGradient>
        <pattern id="pstripe" x="0" y="0" width="7" height="1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="1" stroke="#C8A018" strokeWidth="0.5" opacity="0.12"/>
        </pattern>
        <pattern id="pstripe2" x="0" y="0" width="7" height="1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="1" stroke="#C8A018" strokeWidth="0.4" opacity="0.18"/>
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#101C0C"/>
      <rect x="0" y="0" width={W} height="220" fill="url(#pstripe)"/>
      <rect width={W} height={H} fill="url(#vigC)"/>

      {/* FACTORY SKYLINE */}
      {/* Building 1 — wide low industrial */}
      <rect x="8" y="148" width="46" height="100" fill="#060F04"/>
      <rect x="20" y="132" width="7" height="20" fill="#060F04"/>
      <rect x="33" y="138" width="7" height="14" fill="#060F04"/>
      {b1win.map((row, r) => row.map((op, c) => (
        <rect key={`b1-${r}-${c}`} x={14 + c * 10} y={155 + r * 20} width="6" height="8"
          fill="#C8A018" opacity={op} rx="0.5"/>
      )))}

      {/* Building 2 — tall tower */}
      <rect x="60" y="104" width="38" height="145" fill="#060F04"/>
      <rect x="70" y="87" width="6" height="20" fill="#060F04"/>
      <rect x="82" y="93" width="6" height="15" fill="#060F04"/>
      {b2win.map((row, r) => row.map((op, c) => (
        <rect key={`b2-${r}-${c}`} x={66 + c * 15} y={110 + r * 22} width="8" height="10"
          fill="#C8A018" opacity={op} rx="0.5"/>
      )))}

      {/* Building 3 — right side */}
      <rect x="155" y="124" width="48" height="125" fill="#060F04"/>
      <rect x="164" y="106" width="6" height="22" fill="#060F04"/>
      <rect x="177" y="112" width="6" height="16" fill="#060F04"/>
      <rect x="189" y="116" width="5" height="13" fill="#060F04"/>
      {b3win.map((row, r) => row.map((op, c) => (
        <rect key={`b3-${r}-${c}`} x={160 + c * 13} y={130 + r * 22} width="8" height="10"
          fill="#C8A018" opacity={op} rx="0.5"/>
      )))}

      {/* Smoke plumes */}
      {[[23,129,8],[36,135,6],[73,84,7],[84,90,5],[167,103,7],[180,109,5]].map(([x,y,w],i) => (
        <path key={i}
          d={`M${x},${y} Q${x - 5},${y - 20} ${x + 3},${y - 40} Q${x - 4},${y - 58} ${x},${y - 75}`}
          stroke="#C8A018" strokeWidth={w} fill="none" opacity="0.07"
          strokeLinecap="round"/>
      ))}

      {/* Floating coins */}
      {[[50,46,9],[95,28,7],[178,36,10],[212,58,8],[32,58,6]].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#C8A018" opacity="0.22"/>
          <circle cx={x} cy={y} r={r - 2} fill="none" stroke="#C8A018" strokeWidth="1" opacity="0.3"/>
          <text x={x} y={y + r * 0.45} textAnchor="middle" fill="#C8A018" fontSize={r * 1.3}
            opacity="0.38" fontFamily="Georgia,serif">$</text>
        </g>
      ))}

      {/* SUIT TORSO — looming from below */}
      {/* Jacket body */}
      <path d="M55,330 L55,218 Q62,208 80,206 Q100,200 120,205 Q140,200 160,206 Q178,208 185,218 L185,330 Z"
        fill="#C8A018"/>
      {/* Pinstripe on suit */}
      <path d="M55,330 L55,218 Q62,208 80,206 Q100,200 120,205 Q140,200 160,206 Q178,208 185,218 L185,330 Z"
        fill="url(#pstripe2)" opacity="1.2"/>
      {/* Lapel shadow */}
      <path d="M80,206 L100,228 L120,220 L140,228 L160,206 L155,220 L120,234 L85,220Z"
        fill="#060F04" opacity="0.55"/>
      {/* Tie */}
      <path d="M114,220 L116,310 L120,316 L124,310 L126,220 L120,216Z" fill="#060F04"/>
      {[0,1,2,3,4,5,6,7].map(i => (
        <line key={i} x1="116" y1={228 + i * 11} x2="124" y2={226 + i * 11}
          stroke="#C8A018" strokeWidth="0.8" opacity="0.18"/>
      ))}
      {/* Pocket square */}
      <path d="M158,234 L172,234 L169,245 L161,242 Z" fill="#ECD8A0" opacity="0.8"/>
      {/* Lapel pin */}
      <circle cx="90" cy="228" r="3" fill="#C8A018" opacity="0.6"/>
      <circle cx="90" cy="228" r="1.5" fill="#060F04"/>

      {/* BRIEFCASE — foreground */}
      <rect x="58" y="256" width="56" height="42" rx="3" fill="#060F04"/>
      <rect x="58" y="256" width="56" height="42" rx="3" fill="none" stroke="#C8A018" strokeWidth="1.8"/>
      <rect x="75" y="249" width="22" height="9" rx="4.5" fill="none" stroke="#C8A018" strokeWidth="1.8"/>
      <line x1="58" y1="276" x2="114" y2="276" stroke="#C8A018" strokeWidth="1" opacity="0.45"/>
      <line x1="85" y1="256" x2="85" y2="298" stroke="#C8A018" strokeWidth="1" opacity="0.45"/>
      {/* Briefcase lock */}
      <rect x="80" y="270" width="10" height="8" rx="1.5" fill="#C8A018" opacity="0.55"/>
      <rect x="82" y="268" width="6" height="4" rx="3" fill="none" stroke="#C8A018" strokeWidth="1"/>

      {/* Grain overlay */}
      <rect width={W} height={H} fill="#C8A018" opacity="0.035" filter="url(#gC)"/>

      {/* Bottom title band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#060F04"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#C8A018" strokeWidth="2.5"/>

      <text x="120" y="307" textAnchor="middle" fill="#ECD8A0"
        fontFamily="Georgia,serif" fontSize="11.5" letterSpacing="3" fontWeight="bold">CORPORATE COUNSEL</text>
      <text x="120" y="321" textAnchor="middle" fill="#C8A018"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3">LAWYER</text>
      <text x="120" y="334" textAnchor="middle" fill="#ECD8A0" opacity="0.5"
        fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" letterSpacing="0.5">Industry always finds a way.</text>
    </svg>
  );
}

// ── CARD 4: WATER RIGHTS SPECIALIST ──────────────────────────────
// Dam cross-section schematic, blueprint grid, measurement arrows, specialist figure
// Palette: deep slate-teal, steel blue, off-white, burnt rust

export function CardWaterSpecialist() {
  const drops = [[38,52],[172,96],[212,132],[28,198],[222,196],[148,58],[70,168]];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <filter id="gD" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.87" numOctaves="4" seed="17" result="n"/>
          <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
          <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
          <feComposite in="b" in2="SourceGraphic" operator="in"/>
        </filter>
        <radialGradient id="vigD" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#0D3050" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#030C15" stopOpacity="0.72"/>
        </radialGradient>
        <pattern id="bpgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 L 0 20" stroke="#1A7AB8" strokeWidth="0.35" fill="none" opacity="0.22"/>
        </pattern>
        <pattern id="bpgrid2" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 L 0 100" stroke="#1A7AB8" strokeWidth="0.6" fill="none" opacity="0.1"/>
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#071520"/>
      <rect width={W} height={H} fill="url(#bpgrid)"/>
      <rect width={W} height={H} fill="url(#bpgrid2)"/>
      <rect width={W} height={H} fill="url(#vigD)"/>

      {/* Large watermark text */}
      <text x="120" y="165" textAnchor="middle" fill="#1A7AB8" opacity="0.055"
        fontFamily="Georgia,serif" fontSize="44" fontWeight="bold" letterSpacing="-2">WATER</text>
      <text x="120" y="208" textAnchor="middle" fill="#1A7AB8" opacity="0.055"
        fontFamily="Georgia,serif" fontSize="44" fontWeight="bold" letterSpacing="-2">RIGHTS</text>

      {/* RESERVOIR (left side) */}
      <rect x="0" y="72" width="98" height="180" fill="#1A7AB8" opacity="0.10"/>
      {/* Reservoir waves */}
      {[0,1,2,3,4].map(i => (
        <path key={i}
          d={`M0,${88 + i * 22} Q24,${81 + i * 22} 48,${88 + i * 22} Q72,${95 + i * 22} 98,${88 + i * 22}`}
          stroke="#1A7AB8" strokeWidth="1.3" fill="none" opacity={0.35 - i * 0.04}/>
      ))}
      {/* High water mark */}
      <line x1="4" y1="76" x2="94" y2="76" stroke="#D0ECF8" strokeWidth="0.8"
        strokeDasharray="7,3" opacity="0.5"/>
      <text x="6" y="72" fill="#D0ECF8" fontSize="5" opacity="0.45" fontFamily="monospace">HIGH WATER MARK</text>

      {/* DAM WALL */}
      <path d="M94,52 L122,52 L138,286 L78,286 Z" fill="#D0ECF8" opacity="0.12"/>
      <path d="M94,52 L122,52 L138,286 L78,286 Z" fill="none" stroke="#D0ECF8" strokeWidth="1.6" opacity="0.55"/>
      {/* Concrete block joints */}
      {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
        <line key={i}
          x1={78 + i * 2.5} y1={52 + i * 21.5}
          x2={78 + i * 2.5 + 62} y2={52 + i * 21.5}
          stroke="#071520" strokeWidth="1.3" opacity="0.45"/>
      ))}
      {/* Cross-bracing lines in dam */}
      <line x1="86" y1="52" x2="130" y2="286" stroke="#D0ECF8" strokeWidth="0.4" opacity="0.2"/>
      <line x1="116" y1="52" x2="84" y2="286" stroke="#D0ECF8" strokeWidth="0.4" opacity="0.2"/>
      {/* DAM label (vertical) */}
      <text x="108" y="100" textAnchor="middle" fill="#D0ECF8" fontSize="6" opacity="0.55"
        fontFamily="monospace" letterSpacing="1.5" transform="rotate(90 108 170)">CONCRETE DAM</text>

      {/* Control gate */}
      <rect x="96" y="252" width="26" height="22" fill="#071520"/>
      <rect x="96" y="252" width="26" height="22" fill="none" stroke="#1A7AB8" strokeWidth="1.8" opacity="0.9"/>
      <rect x="100" y="256" width="18" height="14" fill="#1A7AB8" opacity="0.25"/>
      <line x1="109" y1="252" x2="109" y2="274" stroke="#1A7AB8" strokeWidth="0.8" opacity="0.5"/>
      {/* Gate control rod */}
      <line x1="109" y1="240" x2="109" y2="254" stroke="#D0ECF8" strokeWidth="2" opacity="0.6"/>
      <circle cx="109" cy="238" r="4" fill="none" stroke="#D0ECF8" strokeWidth="1.5" opacity="0.6"/>

      {/* Downstream flow (right side) */}
      {[0,1,2].map(i => (
        <path key={i}
          d={`M140,${262 + i * 9} Q165,${255 + i * 9} 195,${262 + i * 9} Q215,${267 + i * 9} 240,${260 + i * 9}`}
          stroke="#1A7AB8" strokeWidth="1.5" fill="none" opacity={0.38 - i * 0.08}/>
      ))}

      {/* Elevation gauge on left */}
      <line x1="28" y1="74" x2="28" y2="252" stroke="#D84020" strokeWidth="1" opacity="0.55" strokeDasharray="4,2"/>
      <polygon points="28,70 24,80 32,80" fill="#D84020" opacity="0.55"/>
      <polygon points="28,256 24,246 32,246" fill="#D84020" opacity="0.55"/>
      {[0,1,2,3].map(i => (
        <g key={i}>
          <line x1="22" y1={80 + i * 45} x2="34" y2={80 + i * 45} stroke="#D0ECF8" strokeWidth="0.8" opacity="0.4"/>
          <text x="36" y={83 + i * 45} fill="#D0ECF8" fontSize="5.5" opacity="0.4" fontFamily="monospace">{(4-i)*5}m</text>
        </g>
      ))}
      <text x="16" y="168" fill="#D84020" fontSize="5.5" opacity="0.5" fontFamily="monospace"
        transform="rotate(-90 16 168)">WATER LEVEL ΔH</text>

      {/* Water droplets */}
      {drops.map(([x, y], i) => (
        <path key={i}
          d={`M${x},${y+9} C${x-5},${y+3} ${x-5},${y-3} ${x-5},${y-4} C${x-5},${y-9} ${x},${y-9} C${x+5},${y-9} ${x+5},${y-4} ${x+5},${y-3} C${x+5},${y+3} ${x},${y+9}Z`}
          fill="#1A7AB8" opacity="0.22"/>
      ))}

      {/* SPECIALIST FIGURE (small, lower right) */}
      <ellipse cx="202" cy="225" rx="9" ry="10" fill="#D84020"/>
      <rect x="195" y="234" width="14" height="24" rx="2" fill="#D84020"/>
      {/* Left arm + clipboard */}
      <path d="M195,238 L180,252 L183,258 L196,245" fill="#D84020"/>
      <rect x="171" y="248" width="16" height="20" rx="1.5" fill="#D0ECF8" opacity="0.88"/>
      {[0,1,2,3].map(i => (
        <line key={i} x1="173" y1={252 + i * 4} x2="185" y2={252 + i * 4}
          stroke="#1A7AB8" strokeWidth="0.9" opacity="0.55"/>
      ))}
      <rect x="177" y="246" width="8" height="4" rx="1" fill="#1A7AB8" opacity="0.6"/>
      {/* Right arm */}
      <path d="M209,238 L220,248 L217,254 L207,244" fill="#D84020"/>

      {/* Grain overlay */}
      <rect width={W} height={H} fill="#1A7AB8" opacity="0.035" filter="url(#gD)"/>

      {/* Bottom title band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#D84020"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#D0ECF8" strokeWidth="2.5"/>

      <text x="120" y="307" textAnchor="middle" fill="#F2F8F8"
        fontFamily="Georgia,serif" fontSize="12" letterSpacing="3" fontWeight="bold">WATER RIGHTS</text>
      <text x="120" y="321" textAnchor="middle" fill="#D0ECF8"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3">SPECIALIST</text>
      <text x="120" y="334" textAnchor="middle" fill="#F2F8F8" opacity="0.5"
        fontFamily="Georgia,serif" fontSize="7" fontStyle="italic" letterSpacing="0.5">Every drop has its owner.</text>
    </svg>
  );
}

// ── GALLERY ──────────────────────────────────────────────────────

const CARDS = [
  { id: "adjudicator", Component: CardAdjudicator, label: "The Adjudicator",   accent: "#B82018" },
  { id: "probono",     Component: CardProBono,     label: "Pro Bono",          accent: "#C85020" },
  { id: "corporate",  Component: CardCorporateCounsel, label: "Corporate Counsel", accent: "#C8A018" },
  { id: "specialist", Component: CardWaterSpecialist,  label: "Water Rights Specialist", accent: "#D84020" },
];

const rotations = [-2.2, 1.8, -1.4, 2.5];

export default function LawyerCardGallery() {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0805",
      fontFamily: "Georgia, 'Times New Roman', serif",
      color: "#E8DCC8",
      userSelect: "none",
    }}>
      {/* HEADER */}
      <div style={{
        borderBottom: "1px solid #2A1F10",
        padding: "36px 48px 28px",
      }}>
        {/* Broadsheet-style masthead */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          marginBottom: 12,
        }}>
          <div style={{flex:1, height:1, background: "linear-gradient(to right, transparent, #8B6014)"}}/>
          <div style={{
            fontSize: 9, letterSpacing: "0.35em", color: "#8B6014",
            fontFamily: "monospace", textTransform: "uppercase",
          }}>The Law of the River · Digital Edition</div>
          <div style={{flex:1, height:1, background: "linear-gradient(to left, transparent, #8B6014)"}}/>
        </div>
        <h1 style={{
          margin: "0 0 6px",
          fontSize: "clamp(22px, 4vw, 36px)",
          fontWeight: "normal",
          letterSpacing: "0.08em",
          color: "#F0E0C0",
          lineHeight: 1.1,
        }}>LAWYER CARDS</h1>
        <p style={{
          margin: 0, fontSize: 12, color: "#7A6A54", letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>Series I · Gritty Realism · Four Archetypes</p>
      </div>

      {/* CARD GALLERY */}
      <div style={{
        padding: "52px 32px 48px",
        display: "flex",
        flexWrap: "wrap",
        gap: 36,
        justifyContent: "center",
        alignItems: "center",
      }}>
        {CARDS.map((card, i) => {
          const isFocused = focused === card.id;
          return (
            <div key={card.id}
              onClick={() => setFocused(isFocused ? null : card.id)}
              style={{
                width: 220,
                flexShrink: 0,
                cursor: "pointer",
                position: "relative",
                zIndex: isFocused ? 20 : 1,
                transform: isFocused
                  ? "rotate(0deg) scale(1.1)"
                  : `rotate(${rotations[i]}deg) scale(1)`,
                transition: "transform 0.35s cubic-bezier(.22,.68,0,1.3), box-shadow 0.3s ease",
                boxShadow: isFocused
                  ? `0 24px 72px rgba(0,0,0,0.95), 0 0 0 2px ${card.accent}`
                  : "0 8px 32px rgba(0,0,0,0.85)",
                borderRadius: 8,
                overflow: "hidden",
              }}>
              {/* Thin decorative border */}
              <div style={{
                position: "absolute", inset: 0,
                border: `1px solid ${card.accent}44`,
                borderRadius: 8,
                zIndex: 5,
                pointerEvents: "none",
              }}/>
              <card.Component/>
            </div>
          );
        })}
      </div>

      {/* FOOTER NOTE */}
      <div style={{
        padding: "0 48px 40px",
        textAlign: "center",
        fontSize: 11,
        color: "#4A3E2C",
        letterSpacing: "0.08em",
        lineHeight: 1.8,
      }}>
        Click any card to focus · Each illustration uses SVG grain filters, limited activist-poster palettes,<br/>
        and hand-crafted compositions — no raster images
      </div>
    </div>
  );
}
