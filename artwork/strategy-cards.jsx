import { useState } from "react";

const W = 240, H = 340;

function GrainDef({ id, seed = 5, freq = 0.88 }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="4" seed={seed} result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
      <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
      <feComposite in="b" in2="SourceGraphic" operator="in"/>
    </filter>
  );
}

// Shared bottom band
function Band({ title, subtitle, tagline, titleColor = "#F0ECD8", accentColor = "#8A9AB8", bgColor = "#060810" }) {
  return (
    <>
      <rect x="0" y="287" width={W} height={H - 287} fill={bgColor}/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke={accentColor} strokeWidth="2.5"/>
      <text x="120" y="307" textAnchor="middle" fill={titleColor}
        fontFamily="Georgia,serif" fontSize="11" letterSpacing="2.5" fontWeight="bold">{title}</text>
      <text x="120" y="320" textAnchor="middle" fill={accentColor}
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3.5">STRATEGY</text>
      <text x="120" y="334" textAnchor="middle" fill={titleColor} opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic" letterSpacing="0.3">{tagline}</text>
    </>
  );
}

// ── 1. DEAL WITH FEDERAL GOVERNMENT ─────────────────────────────────────────
// Two silhouettes shaking hands across a mahogany table, government seal on wall,
// water pipe blueprint spread open, dollar bills sliding across.
// Palette: ink navy, bureaucratic gold, parchment, mahogany
function CardDealFederal() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g1" seed={3} freq={0.87}/>
        <radialGradient id="vg1" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#1A2840" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#020408" stopOpacity="0.75"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#060810"/>
      <rect width={W} height={H} fill="url(#vg1)"/>

      {/* Room panelling */}
      {[0, 80, 160].map((x, i) => (
        <rect key={i} x={x} y="0" width="78" height="240" fill="none"
          stroke="#1A2840" strokeWidth="0.6" opacity="0.3"/>
      ))}
      {[40, 120].map((y, i) => (
        <line key={i} x1="0" y1={y} x2={W} y2={y}
          stroke="#1A2840" strokeWidth="0.5" opacity="0.25"/>
      ))}

      {/* GOVERNMENT SEAL on wall */}
      <circle cx="120" cy="80" r="42" fill="none" stroke="#8A7828" strokeWidth="1.5" opacity="0.35"/>
      <circle cx="120" cy="80" r="35" fill="none" stroke="#8A7828" strokeWidth="0.8" opacity="0.22"/>
      <circle cx="120" cy="80" r="20" fill="#8A7828" opacity="0.12"/>
      {/* Eagle silhouette (simplified) */}
      <path d="M120,62 L126,72 L138,68 L130,78 L136,90 L120,84 L104,90 L110,78 L102,68 L114,72Z"
        fill="#8A7828" opacity="0.35"/>
      {/* Stars ring */}
      {Array.from({ length: 13 }, (_, i) => {
        const a = (i / 13) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={120 + 29 * Math.cos(a)} cy={80 + 29 * Math.sin(a)}
          r="2" fill="#8A7828" opacity="0.3"/>;
      })}

      {/* TABLE */}
      <path d="M10,212 Q120,198 230,212 L230,240 L10,240Z" fill="#2A1408" opacity="0.95"/>
      <path d="M10,210 Q120,196 230,210" stroke="#5A2E10" strokeWidth="2" fill="none" opacity="0.8"/>
      {/* Table sheen */}
      <path d="M40,212 Q120,200 200,212" stroke="#6A3A18" strokeWidth="0.8" fill="none" opacity="0.35"/>

      {/* BLUEPRINT spread on table */}
      <rect x="60" y="194" width="120" height="22" rx="1" fill="#1A3858" opacity="0.75"
        transform="rotate(-2 120 205)"/>
      {/* Blueprint lines */}
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1="66" y1={198 + i * 5} x2="174" y2={198 + i * 5}
          stroke="#4A8AB8" strokeWidth="0.6" opacity="0.4"
          transform="rotate(-2 120 205)"/>
      ))}
      {/* Pipe diagram on blueprint */}
      <path d="M74,202 L100,202 L100,194 L140,194 L140,202 L164,202"
        stroke="#7AB8D8" strokeWidth="1.2" fill="none" opacity="0.5"
        transform="rotate(-2 120 205)"/>

      {/* DOLLAR BILLS sliding across */}
      {[[55, 207], [75, 204], [158, 208]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="30" height="14" rx="1"
            fill="#2A4A20" opacity="0.6" transform={`rotate(${-3 + i * 2} ${x + 15} ${y + 7})`}/>
          <line x1={x + 3} y1={y + 7} x2={x + 27} y2={y + 7}
            stroke="#5A8A40" strokeWidth="0.6" opacity="0.4"
            transform={`rotate(${-3 + i * 2} ${x + 15} ${y + 7})`}/>
          <text x={x + 15} y={y + 10} textAnchor="middle" fill="#5A8A40"
            fontSize="6" opacity="0.5" fontFamily="Georgia,serif"
            transform={`rotate(${-3 + i * 2} ${x + 15} ${y + 7})`}>$</text>
        </g>
      ))}

      {/* FIGURE LEFT — government official */}
      <path d="M28,240 L30,200 L52,195 L74,200 L76,240Z" fill="#1A2840" opacity="0.9"/>
      <ellipse cx="52" cy="186" rx="16" ry="17" fill="#1A2840" opacity="0.9"/>
      {/* Tie */}
      <path d="M47,200 L49,228 L52,232 L55,228 L57,200 L52,196Z" fill="#060810" opacity="0.7"/>
      {/* LEFT ARM — handshake, reaching right */}
      <path d="M74,206 L116,213 L114,222 L72,216Z" fill="#1A2840" opacity="0.88"/>

      {/* FIGURE RIGHT — lobbyist */}
      <path d="M164,240 L162,200 L186,195 L210,200 L212,240Z" fill="#2A1A08" opacity="0.88"/>
      <ellipse cx="187" cy="186" rx="16" ry="17" fill="#2A1A08" opacity="0.9"/>
      {/* RIGHT ARM — handshake, reaching left */}
      <path d="M164,207 L122,213 L124,222 L166,216Z" fill="#2A1A08" opacity="0.88"/>

      {/* HANDSHAKE */}
      <ellipse cx="120" cy="217" rx="22" ry="11" fill="#3A3028" opacity="0.85"/>
      <line x1="104" y1="217" x2="136" y2="213" stroke="#060810" strokeWidth="1.8" opacity="0.5"/>
      <line x1="106" y1="221" x2="138" y2="217" stroke="#060810" strokeWidth="1.8" opacity="0.5"/>

      <rect width={W} height={H} fill="#1A2840" opacity="0.025" filter="url(#g1)"/>
      <Band title="DEAL WITH FEDERAL GOVT" tagline="Every deal has a cost." accentColor="#8A7828" bgColor="#06080E"/>
    </svg>
  );
}

// ── 2. QUID PRO QUO ──────────────────────────────────────────────────────────
// Two hands — one with a fat stack of coins, one with a water cube —
// meeting in the centre under a single dingy overhead bulb. Shadow play.
// Palette: near-black, coin gold, water teal, shadow grey
function CardQuidProQuo() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g2" seed={17} freq={0.89}/>
        <radialGradient id="bulb2" cx="50%" cy="35%" r="50%">
          <stop offset="0%"  stopColor="#D8B840" stopOpacity="0.35"/>
          <stop offset="60%" stopColor="#C89820" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#C89820" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#060608"/>
      <rect width={W} height={H} fill="url(#bulb2)"/>

      {/* Overhead bare bulb */}
      <line x1="120" y1="0" x2="120" y2="42" stroke="#C89820" strokeWidth="1.5" opacity="0.4"/>
      <ellipse cx="120" cy="50" rx="10" ry="12" fill="#D8B840" opacity="0.55"/>
      <ellipse cx="120" cy="50" rx="6" ry="8" fill="#F0E080" opacity="0.5"/>
      {/* Bulb filament */}
      <path d="M117,52 Q120,46 123,52" stroke="#F0E080" strokeWidth="0.8" fill="none" opacity="0.7"/>

      {/* Cone of light */}
      <path d="M120,62 L40,230 L200,230Z" fill="#C89820" opacity="0.06"/>
      <path d="M120,62 L60,230 L180,230Z" fill="#C89820" opacity="0.05"/>

      {/* Table surface */}
      <rect x="0" y="220" width={W} height="70" fill="#0E0C08" opacity="0.95"/>
      <line x1="0" y1="220" x2={W} y2="220" stroke="#C89820" strokeWidth="1" opacity="0.2"/>

      {/* SHADOW of the exchange on back wall */}
      <ellipse cx="120" cy="170" rx="70" ry="30" fill="#0A0808" opacity="0.5"/>

      {/* LEFT HAND — holding coin stack */}
      <path d="M10,270 Q40,240 68,228 L80,238 Q52,252 24,282Z" fill="#3A2818" opacity="0.9"/>
      <ellipse cx="74" cy="233" rx="14" ry="10" fill="#2A1A0E" opacity="0.9"/>
      {/* COIN STACK */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <ellipse key={i} cx="74" cy={226 - i * 6} rx="12" ry="4"
          fill="#C89820" opacity={0.55 - i * 0.04}/>
      ))}
      {/* Coin edges */}
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x="62" y={218 - i * 6} width="24" height="6"
          fill="#A87818" opacity="0.35"/>
      ))}
      <text x="74" y="228" textAnchor="middle" fill="#C89820"
        fontSize="5" opacity="0.6" fontFamily="Georgia,serif">$$$</text>

      {/* RIGHT HAND — holding water cube */}
      <path d="M230,270 Q200,240 172,228 L160,238 Q188,252 216,282Z" fill="#1A2838" opacity="0.9"/>
      <ellipse cx="166" cy="233" rx="14" ry="10" fill="#0E1A28" opacity="0.9"/>
      {/* WATER CUBE */}
      {/* Front face */}
      <rect x="152" y="204" width="28" height="28" rx="2" fill="#2A6A9A" opacity="0.75"/>
      {/* Top face */}
      <path d="M152,204 L164,196 L192,196 L180,204Z" fill="#3A8AB8" opacity="0.6"/>
      {/* Right face */}
      <path d="M180,204 L192,196 L192,224 L180,232Z" fill="#1A4A78" opacity="0.65"/>
      {/* Cube shine */}
      <rect x="155" y="207" width="8" height="8" rx="1" fill="#5AB0D8" opacity="0.3"/>
      {/* Water ripple inside */}
      <path d="M155,220 Q166,216 177,220" stroke="#5AB0D8" strokeWidth="1"
        fill="none" opacity="0.35"/>

      {/* Latin text watermark */}
      <text x="120" y="148" textAnchor="middle" fill="#C89820"
        fontFamily="Georgia,serif" fontSize="28" fontWeight="bold"
        opacity="0.06" letterSpacing="2">QUID</text>
      <text x="120" y="176" textAnchor="middle" fill="#C89820"
        fontFamily="Georgia,serif" fontSize="28" fontWeight="bold"
        opacity="0.06" letterSpacing="2">PRO QUO</text>

      {/* "This for that" line connecting hands */}
      <line x1="86" y1="223" x2="154" y2="221" stroke="#C89820" strokeWidth="0.8"
        strokeDasharray="5,4" opacity="0.3"/>
      <polygon points="150,218 157,221 150,224" fill="#C89820" opacity="0.3"/>
      <polygon points="90,218 83,221 90,224" fill="#C89820" opacity="0.3"/>

      <rect width={W} height={H} fill="#C89820" opacity="0.025" filter="url(#g2)"/>
      <Band title="QUID PRO QUO" tagline="This for that. Always." accentColor="#C89820" bgColor="#080806"/>
    </svg>
  );
}

// ── 3. LOBBY FEDERAL GOVERNMENT ──────────────────────────────────────────────
// Lobbyist ascending grand marble steps of a federal building, briefcase
// in one hand, water-claim document rolled in the other. Columns tower above.
// Palette: marble white, shadow charcoal, bureaucratic gold, cold blue sky
function CardLobbyFederal() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g3" seed={29} freq={0.86}/>
        <linearGradient id="skyG3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1828" stopOpacity="1"/>
          <stop offset="100%" stopColor="#1A2A3A" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#060A10"/>
      <rect width={W} height="200" fill="url(#skyG3)"/>

      {/* COLUMNS — monumental */}
      {[20, 62, 104, 136, 178, 210].map((x, i) => (
        <g key={i}>
          {/* Column shaft */}
          <rect x={x} y="42" width="18" height="180" rx="1"
            fill="#D0C8B0" opacity={0.12 + (i % 2) * 0.04}/>
          {/* Fluting lines */}
          {[0, 1, 2].map(j => (
            <line key={j} x1={x + 4 + j * 4} y1="50" x2={x + 4 + j * 4} y2="218"
              stroke="#A8A090" strokeWidth="0.4" opacity="0.2"/>
          ))}
          {/* Capital */}
          <rect x={x - 2} y="38" width="22" height="8" rx="1"
            fill="#D0C8B0" opacity={0.18 + (i % 2) * 0.04}/>
        </g>
      ))}

      {/* Entablature / lintel */}
      <rect x="0" y="30" width={W} height="12" fill="#D0C8B0" opacity="0.18"/>
      <rect x="0" y="28" width={W} height="4" fill="#C0B8A0" opacity="0.22"/>
      {/* Pediment */}
      <path d="M0,30 L120,4 L240,30Z" fill="none" stroke="#C0B8A0" strokeWidth="1.2" opacity="0.2"/>

      {/* GRAND STEPS */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <g key={i}>
          <rect x={0 + i * 10} y={218 + i * 10} width={W - i * 20} height="10"
            rx="0.5" fill="#C0B8A0" opacity={0.1 + i * 0.02}/>
          <line x1={0 + i * 10} y1={218 + i * 10} x2={W - i * 10} y2={218 + i * 10}
            stroke="#D0C8B0" strokeWidth="0.5" opacity="0.2"/>
        </g>
      ))}

      {/* Stars above pediment */}
      {[[42, 14], [96, 10], [120, 8], [144, 10], [198, 14]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#D0C8B0" opacity="0.25"/>
      ))}

      {/* LOBBYIST FIGURE — mid-ascent on steps */}
      {/* Legs on steps */}
      <path d="M102,278 L105,240 L120,236 L135,240 L138,278Z" fill="#0A1828" opacity="0.95"/>
      <path d="M105,272 Q97,282 95,286 L117,286 L117,272Z" fill="#060A10"/>
      <path d="M135,272 Q143,282 145,286 L123,286 L123,272Z" fill="#060A10"/>
      {/* Coat */}
      <path d="M94,238 L98,202 L120,197 L142,202 L146,238Z" fill="#0A1828" opacity="0.95"/>
      {/* Lapels */}
      <path d="M108,200 L114,216 L120,212 L126,216 L132,200 L128,210 L120,218 L112,210Z"
        fill="#060A10" opacity="0.75"/>

      {/* LEFT ARM — briefcase */}
      <path d="M98,214 L72,236 L68,246 L94,226Z" fill="#0A1828" opacity="0.9"/>
      {/* BRIEFCASE */}
      <rect x="50" y="240" width="30" height="22" rx="2" fill="#0A1828" opacity="0.95"/>
      <rect x="50" y="240" width="30" height="22" rx="2" fill="none"
        stroke="#8A9AB8" strokeWidth="1.5" opacity="0.6"/>
      <rect x="59" y="235" width="12" height="7" rx="3.5" fill="none"
        stroke="#8A9AB8" strokeWidth="1.2" opacity="0.55"/>
      <line x1="50" y1="250" x2="80" y2="250" stroke="#8A9AB8" strokeWidth="0.6" opacity="0.3"/>
      <rect x="62" y="248" width="6" height="4" rx="1" fill="#8A9AB8" opacity="0.4"/>

      {/* RIGHT ARM — rolled document */}
      <path d="M142,214 L168,228 L172,238 L146,226Z" fill="#0A1828" opacity="0.9"/>
      {/* ROLLED DOCUMENT / WATER CLAIM */}
      <rect x="165" y="218" width="12" height="30" rx="5" fill="#E8DCC0" opacity="0.65"
        transform="rotate(-20 171 233)"/>
      <path d="M165,222 Q171,218 177,222" stroke="#C8B890" strokeWidth="1"
        fill="none" opacity="0.5" transform="rotate(-20 171 233)"/>
      {/* Wax seal */}
      <circle cx="171" cy="242" r="4" fill="#8A1808" opacity="0.6"
        transform="rotate(-20 171 233)"/>

      {/* Head */}
      <ellipse cx="120" cy="186" rx="16" ry="17" fill="#0A1828" opacity="0.9"/>
      {/* Top hat */}
      <rect x="108" y="162" width="24" height="20" rx="1" fill="#060A10" opacity="0.95"/>
      <rect x="104" y="180" width="32" height="5" rx="1" fill="#060A10" opacity="0.9"/>
      <rect x="106" y="162" width="28" height="3" rx="1" fill="#1A2840" opacity="0.8"/>

      <rect width={W} height={H} fill="#1A2840" opacity="0.025" filter="url(#g3)"/>
      <Band title="LOBBY FEDERAL GOVT" tagline="Access is everything." accentColor="#8A9AB8" bgColor="#060A10"/>
    </svg>
  );
}

// ── 4. SCORCHED EARTH NEGOTIATING ────────────────────────────────────────────
// Cracked, bone-dry riverbed stretching to the horizon. Figure standing
// in the centre, arms folded, letting rivals suffer. Oppressive sun.
// Palette: bone white, scorch orange, shadow black, dried-blood red
function CardScorchedEarth() {
  const cracks = [
    "M40,195 L55,210 L48,228 L62,240 L70,225",
    "M80,200 L88,218 L100,212 L108,230",
    "M130,198 L122,215 L135,224 L128,238",
    "M160,202 L172,216 L168,232 L180,240",
    "M195,195 L188,214 L200,222",
    "M55,170 L68,185 L62,198",
    "M100,172 L112,188 L106,200",
    "M148,168 L158,182 L165,170",
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g4" seed={7} freq={0.85}/>
        <linearGradient id="sky4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#200800" stopOpacity="1"/>
          <stop offset="60%" stopColor="#380C00" stopOpacity="1"/>
          <stop offset="100%" stopColor="#2A1000" stopOpacity="1"/>
        </linearGradient>
        <radialGradient id="sun4" cx="50%" cy="30%" r="35%">
          <stop offset="0%"  stopColor="#E84800" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#E84800" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#100400"/>
      <rect width={W} height="180" fill="url(#sky4)"/>
      <rect width={W} height="180" fill="url(#sun4)"/>

      {/* Scorched sun */}
      <circle cx="120" cy="68" r="28" fill="#E84800" opacity="0.4"/>
      <circle cx="120" cy="68" r="18" fill="#F06020" opacity="0.45"/>
      {/* Heat shimmer lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={60 + i * 20} y1="95" x2={58 + i * 20} y2="130"
          stroke="#E84800" strokeWidth="0.6" opacity="0.1" strokeLinecap="round"/>
      ))}

      {/* DRY RIVERBED */}
      <rect x="0" y="155" width={W} height="135" fill="#3A2408" opacity="0.9"/>
      {/* Cracked earth texture */}
      <rect x="0" y="155" width={W} height="135" fill="#4A3010" opacity="0.6"/>
      {cracks.map((d, i) => (
        <path key={i} d={d} stroke="#1A0C04" strokeWidth={1.5 + (i % 3) * 0.5}
          fill="none" opacity={0.6 + (i % 3) * 0.1} strokeLinecap="round"/>
      ))}
      {/* Horizon line */}
      <line x1="0" y1="155" x2={W} y2="155" stroke="#6A3818" strokeWidth="1.5" opacity="0.5"/>
      {/* Old river ghost — dried water stain marks */}
      <path d="M0,170 Q80,162 160,170 Q200,174 240,168"
        stroke="#2A1808" strokeWidth="3" fill="none" opacity="0.4"/>

      {/* Dead trees at horizon */}
      {[[22, 152], [52, 148], [186, 150], [214, 154]].map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y - 28} stroke="#1A0C04" strokeWidth="2.5" opacity="0.5"/>
          <line x1={x} y1={y - 18} x2={x - 12} y2={y - 30} stroke="#1A0C04" strokeWidth="1.5" opacity="0.4"/>
          <line x1={x} y1={y - 22} x2={x + 10} y2={y - 32} stroke="#1A0C04" strokeWidth="1.5" opacity="0.4"/>
        </g>
      ))}

      {/* FIGURE — standing arms folded, surveying scorched domain */}
      <path d="M104,280 L106,248 L120,244 L134,248 L136,280Z" fill="#3A0800" opacity="0.9"/>
      <path d="M106,276 Q98,284 96,288 L118,288 L118,276Z" fill="#200400"/>
      <path d="M134,276 Q142,284 144,288 L122,288 L122,276Z" fill="#200400"/>
      {/* Coat */}
      <path d="M96,246 L100,214 L120,209 L140,214 L144,246Z" fill="#3A0800" opacity="0.95"/>
      {/* Folded arms */}
      <path d="M100,226 L80,232 L80,240 L100,238Z" fill="#3A0800" opacity="0.88"/>
      <path d="M140,226 L160,232 L160,240 L140,238Z" fill="#3A0800" opacity="0.88"/>
      <path d="M80,232 L160,232 L160,238 L80,238Z" fill="#2A0600" opacity="0.8"/>
      {/* Head */}
      <ellipse cx="120" cy="200" rx="18" ry="19" fill="#3A0800" opacity="0.9"/>
      {/* Hat brim */}
      <ellipse cx="120" cy="186" rx="22" ry="7" fill="#200400" opacity="0.9"/>
      <rect x="110" y="178" width="20" height="10" rx="1" fill="#200400" opacity="0.9"/>
      {/* Dust cloud */}
      {[[28, 172], [204, 168]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="18" ry="8" fill="#6A3818" opacity="0.12"/>
      ))}

      <rect width={W} height={H} fill="#E84800" opacity="0.025" filter="url(#g4)"/>
      <Band title="SCORCHED EARTH" tagline="Let them feel the drought." accentColor="#E84800" bgColor="#100400"/>
    </svg>
  );
}

// ── 5. WATER BRIBE ───────────────────────────────────────────────────────────
// Under-table exchange — one gloved hand passes a water cube under a table,
// the other scoops up a fan of bills. Extreme low-angle under the tablecloth.
// Palette: ink black, bribe gold, cold water blue, felt green
function CardWaterBribe() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g5" seed={33} freq={0.90}/>
        <radialGradient id="vg5" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#1A3020" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#020604" stopOpacity="0.8"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#040806"/>
      <rect width={W} height={H} fill="url(#vg5)"/>

      {/* TABLE UNDERSIDE — green felt */}
      <rect x="0" y="0" width={W} height="120" fill="#1A3010" opacity="0.85"/>
      <rect x="0" y="118" width={W} height="6" fill="#0A1A08" opacity="0.9"/>
      <line x1="0" y1="120" x2={W} y2="120" stroke="#3A5828" strokeWidth="1.5" opacity="0.5"/>
      {/* Wood grain on table edge */}
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M${i * 60},0 Q${i * 60 + 30},60 ${i * 60 + 8},120`}
          stroke="#2A4818" strokeWidth="0.5" fill="none" opacity="0.15"/>
      ))}

      {/* TABLE LEGS visible at corners */}
      <rect x="0" y="120" width="18" height="168" fill="#2A1A08" opacity="0.7"/>
      <rect x="222" y="120" width="18" height="168" fill="#2A1A08" opacity="0.7"/>

      {/* "UNDER THE TABLE" label — stencilled */}
      <text x="120" y="80" textAnchor="middle" fill="#3A5828"
        fontFamily="Georgia,serif" fontSize="9" letterSpacing="4"
        fontWeight="bold" opacity="0.3">UNDER THE TABLE</text>

      {/* Shadow of exchange on floor */}
      <ellipse cx="120" cy="230" rx="80" ry="22" fill="#040806" opacity="0.7"/>

      {/* LEFT GLOVED HAND — pushing water cube */}
      <path d="M0,260 Q38,235 70,228 L82,240 Q50,250 18,276Z" fill="#1A2818" opacity="0.9"/>
      <ellipse cx="76" cy="234" rx="15" ry="10" fill="#0E1A10" opacity="0.95"/>
      {/* WATER CUBE */}
      <rect x="60" y="196" width="30" height="30" rx="2" fill="#2A5A8A" opacity="0.8"/>
      <path d="M60,196 L72,187 L102,187 L90,196Z" fill="#3A7AB0" opacity="0.65"/>
      <path d="M90,196 L102,187 L102,217 L90,226Z" fill="#1A3A68" opacity="0.7"/>
      <rect x="63" y="199" width="8" height="8" rx="1" fill="#5AB0D8" opacity="0.35"/>
      <path d="M63,218 Q75,213 87,218" stroke="#5AB0D8" strokeWidth="0.9"
        fill="none" opacity="0.4"/>

      {/* RIGHT GLOVED HAND — raking in bills */}
      <path d="M240,260 Q202,235 170,228 L158,240 Q190,250 222,276Z" fill="#2A1808" opacity="0.9"/>
      <ellipse cx="164" cy="234" rx="15" ry="10" fill="#1A1008" opacity="0.95"/>

      {/* FAN OF BILLS */}
      {[-20, -10, 0, 10, 20].map((rot, i) => (
        <g key={i}>
          <rect x="136" y="175" width="36" height="20" rx="1.5"
            fill="#2A4818" opacity={0.55 + i * 0.05}
            transform={`rotate(${rot} 154 185)`}/>
          <line x1="139" y1="185" x2="169" y2="185"
            stroke="#5A8840" strokeWidth="0.6" opacity="0.4"
            transform={`rotate(${rot} 154 185)`}/>
          <text x="154" y="188" textAnchor="middle" fill="#5A8840"
            fontSize="7" opacity="0.5" fontFamily="Georgia,serif"
            transform={`rotate(${rot} 154 185)`}>$</text>
        </g>
      ))}

      {/* Whisper lines between hands */}
      <path d="M90,228 Q120,218 152,228" stroke="#3A5828" strokeWidth="0.8"
        strokeDasharray="4,3" fill="none" opacity="0.3"/>

      {/* Eye peeking under tablecloth */}
      <ellipse cx="120" cy="130" rx="16" ry="8" fill="#0A1A08" opacity="0.8"/>
      <ellipse cx="120" cy="130" rx="10" ry="5" fill="#040806" opacity="0.9"/>
      <ellipse cx="120" cy="130" rx="5" ry="3" fill="#2A6A40" opacity="0.5"/>
      <ellipse cx="119" cy="129" rx="2" ry="1.5" fill="#080C08" opacity="0.9"/>
      <circle cx="118" cy="128" r="0.8" fill="#8AB8A0" opacity="0.4"/>

      <rect width={W} height={H} fill="#2A4818" opacity="0.02" filter="url(#g5)"/>
      <Band title="WATER BRIBE" tagline="Your water, their cash." accentColor="#5A8840" bgColor="#040806"/>
    </svg>
  );
}

// ── 6. RED HERRING CASE ───────────────────────────────────────────────────────
// A massive vivid red herring fish laid across a stack of legal papers,
// two confused lawyer silhouettes staring at it. Absurdist noir.
// Palette: fish red, parchment, ink black, sardonic gold
function CardRedHerring() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g6" seed={41} freq={0.88}/>
        <radialGradient id="vg6" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="#300808" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#060202" stopOpacity="0.7"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#080204"/>
      <rect width={W} height={H} fill="url(#vg6)"/>

      {/* DESK SURFACE */}
      <rect x="0" y="188" width={W} height="100" fill="#1A0E06" opacity="0.95"/>
      <line x1="0" y1="188" x2={W} y2="188" stroke="#5A2E10" strokeWidth="1.5" opacity="0.4"/>

      {/* SCATTERED LEGAL PAPERS on desk */}
      {[
        { x: 12,  y: 170, w: 70, h: 50, rot: -8  },
        { x: 60,  y: 166, w: 64, h: 46, rot: 4   },
        { x: 108, y: 162, w: 72, h: 52, rot: -3  },
        { x: 158, y: 168, w: 66, h: 48, rot: 7   },
        { x: 180, y: 172, w: 52, h: 44, rot: -5  },
      ].map(({ x, y, w, h, rot }, i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="1"
            fill="#E8DCC0" opacity={0.35 + (i % 3) * 0.08}
            transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}/>
          {Array.from({ length: 4 }, (_, j) => (
            <line key={j} x1={x + 4} y1={y + 10 + j * 9} x2={x + w - 4} y2={y + 10 + j * 9}
              stroke="#3A2A10" strokeWidth="0.7" opacity="0.25"
              transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}/>
          ))}
          {/* "CASE" stamp on some */}
          {i % 2 === 0 && (
            <text x={x + w / 2} y={y + 14} textAnchor="middle" fill="#8A1808"
              fontSize="6" letterSpacing="1.5" fontFamily="monospace" opacity="0.5"
              transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>CASE NO.</text>
          )}
        </g>
      ))}

      {/* THE RED HERRING — large, draped across papers */}
      {/* Body */}
      <path d="M20,196 Q60,172 120,168 Q180,164 215,184 Q230,192 224,202 Q220,212 200,218 Q140,234 80,228 Q40,222 24,210 Q16,204 20,196Z"
        fill="#A81808" opacity="0.85"/>
      {/* Scales texture */}
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 10 }, (_, col) => (
          <ellipse key={`${row}-${col}`}
            cx={42 + col * 18} cy={188 + row * 7}
            rx="7" ry="4"
            fill="none" stroke="#C82020" strokeWidth="0.5" opacity="0.3"/>
        ))
      )}
      {/* Belly highlight */}
      <path d="M30,206 Q80,222 140,220 Q185,218 210,208"
        stroke="#D84040" strokeWidth="2" fill="none" opacity="0.3"/>
      {/* Tail fin */}
      <path d="M215,184 L238,172 L238,192 L224,202Z"
        fill="#A81808" opacity="0.75"/>
      <path d="M215,184 L238,168 L242,176 L228,194 L238,196 L224,202Z"
        fill="#8A1008" opacity="0.6"/>
      {/* Eye */}
      <circle cx="46" cy="196" r="7" fill="#D84040" opacity="0.7"/>
      <circle cx="46" cy="196" r="4" fill="#080204" opacity="0.9"/>
      <circle cx="44" cy="194" r="1.5" fill="#E8E0D0" opacity="0.5"/>
      {/* Mouth open, absurd */}
      <path d="M22,200 Q18,196 22,192" fill="none" stroke="#C82020"
        strokeWidth="1.5" opacity="0.65" strokeLinecap="round"/>
      {/* Fins */}
      <path d="M100,170 L108,150 L125,168" fill="#8A1008" opacity="0.5"/>
      <path d="M150,168 L162,148 L175,168" fill="#8A1008" opacity="0.4"/>

      {/* CONFUSED LAWYER SILHOUETTES staring at fish */}
      {/* Left lawyer */}
      <ellipse cx="44" cy="246" rx="14" ry="15" fill="#0A1020" opacity="0.85"/>
      {/* Question mark above head */}
      <text x="44" y="228" textAnchor="middle" fill="#C89820"
        fontFamily="Georgia,serif" fontSize="14" fontWeight="bold" opacity="0.5">?</text>
      <rect x="32" y="260" width="24" height="28" rx="1.5" fill="#0A1020" opacity="0.8"/>
      {/* Right lawyer */}
      <ellipse cx="194" cy="246" rx="14" ry="15" fill="#0A1020" opacity="0.85"/>
      <text x="194" y="228" textAnchor="middle" fill="#C89820"
        fontFamily="Georgia,serif" fontSize="14" fontWeight="bold" opacity="0.5">?</text>
      <rect x="182" y="260" width="24" height="28" rx="1.5" fill="#0A1020" opacity="0.8"/>

      {/* "Hmm" / thought dots */}
      {[[56, 238], [60, 231], [65, 226]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.8 - i * 0.4} fill="#C89820" opacity="0.35"/>
      ))}
      {[[182, 238], [178, 231], [173, 226]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.8 - i * 0.4} fill="#C89820" opacity="0.35"/>
      ))}

      <rect width={W} height={H} fill="#A81808" opacity="0.02" filter="url(#g6)"/>
      <Band title="RED HERRING CASE" tagline="Send them chasing smoke." accentColor="#C82020" bgColor="#080204"/>
    </svg>
  );
}

// ── 7. DONATE TO SUPREME COURT JUSTICE ──────────────────────────────────────
// A gloved hand slipping a thick envelope through a gap in a courtroom door.
// Docket cards visible through the gap — being reshuffled. Scales tipping.
// Palette: court mahogany, judicial purple, wax-seal red, cream
function CardDonateSCJustice() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g7" seed={13} freq={0.91}/>
        <radialGradient id="vg7" cx="52%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#2A1040" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#060210" stopOpacity="0.78"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#060210"/>
      <rect width={W} height={H} fill="url(#vg7)"/>

      {/* COURTROOM DOOR — massive, takes up most of card */}
      <rect x="28" y="16" width="184" height="260" rx="3" fill="#1A0C08" opacity="0.95"/>
      <rect x="28" y="16" width="184" height="260" rx="3" fill="none"
        stroke="#5A3820" strokeWidth="2.5" opacity="0.65"/>
      {/* Door panels */}
      <rect x="40" y="28" width="76" height="80" rx="2" fill="none"
        stroke="#3A2010" strokeWidth="1.2" opacity="0.5"/>
      <rect x="124" y="28" width="76" height="80" rx="2" fill="none"
        stroke="#3A2010" strokeWidth="1.2" opacity="0.5"/>
      <rect x="40" y="120" width="76" height="80" rx="2" fill="none"
        stroke="#3A2010" strokeWidth="1.2" opacity="0.5"/>
      <rect x="124" y="120" width="76" height="80" rx="2" fill="none"
        stroke="#3A2010" strokeWidth="1.2" opacity="0.5"/>
      {/* Door knob */}
      <circle cx="205" cy="148" r="8" fill="#8A6828" opacity="0.7"/>
      <circle cx="205" cy="148" r="5" fill="#C89840" opacity="0.5"/>
      <circle cx="205" cy="148" r="2" fill="#1A0C08" opacity="0.8"/>

      {/* "SUPREME COURT" engraved */}
      <text x="120" y="222" textAnchor="middle" fill="#5A3820"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="2.5"
        fontWeight="bold" opacity="0.55">SUPREME COURT</text>
      <line x1="40" y1="226" x2="200" y2="226" stroke="#5A3820" strokeWidth="0.5" opacity="0.3"/>

      {/* MAIL SLOT at bottom of door */}
      <rect x="88" y="248" width="64" height="12" rx="2" fill="#0A0608"/>
      <rect x="88" y="248" width="64" height="12" rx="2" fill="none"
        stroke="#8A6828" strokeWidth="1.5" opacity="0.6"/>
      {/* Slot shadow */}
      <rect x="92" y="250" width="56" height="4" rx="1" fill="#8A6828" opacity="0.15"/>

      {/* LIGHT THROUGH DOOR GAP — slightly ajar */}
      <path d="M28,16 L22,20 L22,268 L28,272Z" fill="#8A5820" opacity="0.25"/>
      {/* Visible docket cards through the gap — being reordered */}
      <rect x="14" y="80" width="20" height="28" rx="1" fill="#E8DCC0" opacity="0.55"
        transform="rotate(-6 24 94)"/>
      <rect x="10" y="108" width="20" height="28" rx="1" fill="#E8DCC0" opacity="0.48"
        transform="rotate(-10 20 122)"/>
      <rect x="16" y="136" width="20" height="28" rx="1" fill="#D8C8A8" opacity="0.42"
        transform="rotate(-4 26 150)"/>
      {/* Arrow showing swap */}
      <path d="M4,100 Q0,112 4,124" stroke="#C89820" strokeWidth="1.2"
        fill="none" opacity="0.5" strokeLinecap="round"/>
      <polygon points="4,96 0,103 8,103" fill="#C89820" opacity="0.45"/>
      <polygon points="4,128 0,121 8,121" fill="#C89820" opacity="0.45"/>

      {/* GLOVED HAND — slipping envelope through slot */}
      <path d="M0,272 Q32,256 72,254 L76,264 Q36,268 4,284Z" fill="#1A0C08" opacity="0.9"/>
      <ellipse cx="74" cy="259" rx="14" ry="9" fill="#0E0808" opacity="0.95"/>
      {/* ENVELOPE */}
      <rect x="60" y="240" width="44" height="30" rx="1.5" fill="#E8DCC0" opacity="0.82"/>
      {/* Envelope flap */}
      <path d="M60,240 L82,256 L104,240Z" fill="#D0C0A0" opacity="0.6"/>
      {/* Wax seal */}
      <circle cx="82" cy="254" r="6" fill="#8A1808" opacity="0.7"/>
      <circle cx="82" cy="254" r="3.5" fill="#A82010" opacity="0.5"/>
      {/* $ on seal */}
      <text x="82" y="256.5" textAnchor="middle" fill="#E8D0B0"
        fontSize="5" fontFamily="Georgia,serif" opacity="0.7">$</text>
      {/* Address lines */}
      <line x1="64" y1="263" x2="96" y2="263" stroke="#8A7850" strokeWidth="0.7" opacity="0.4"/>
      <line x1="64" y1="267" x2="88" y2="267" stroke="#8A7850" strokeWidth="0.7" opacity="0.3"/>

      <rect width={W} height={H} fill="#2A1040" opacity="0.025" filter="url(#g7)"/>
      <Band title="DONATE TO SC JUSTICE" tagline="The docket bends for gold." accentColor="#C89820" bgColor="#060210"/>
    </svg>
  );
}

// ── 8. PROTECT OUR INTERESTS ─────────────────────────────────────────────────
// A massive iron shield emblazoned with a corporate crest blocking an
// incoming volley of cards/effects. Figure bracing behind it, immovable.
// Palette: iron grey, impact red, fortress black, gold crest
function CardProtectInterests() {
  const bolts = [
    { x1: 12,  y1: 40,  x2: 85,  y2: 120 },
    { x1: 30,  y1: 20,  x2: 90,  y2: 105 },
    { x1: 190, y1: 35,  x2: 120, y2: 118 },
    { x1: 210, y1: 18,  x2: 140, y2: 112 },
    { x1: 115, y1: 10,  x2: 115, y2: 105 },
    { x1: 65,  y1: 12,  x2: 100, y2: 108 },
    { x1: 170, y1: 14,  x2: 130, y2: 110 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="g8" seed={47} freq={0.87}/>
        <radialGradient id="impact8" cx="50%" cy="42%" r="52%">
          <stop offset="0%" stopColor="#C82008" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#080202" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="shieldG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A5060" stopOpacity="1"/>
          <stop offset="100%" stopColor="#2A2E38" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#060808"/>
      <rect width={W} height={H} fill="url(#impact8)"/>

      {/* INCOMING PROJECTILES — cards flying at shield */}
      {bolts.map(({ x1, y1, x2, y2 }, i) => {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        return (
          <g key={i}>
            {/* Card body */}
            <rect x={x1 - 10} y={y1 - 7} width="20" height="14" rx="1.5"
              fill="#E8DCC0" opacity={0.28 + (i % 3) * 0.06}
              transform={`rotate(${Math.atan2(dy, dx) * 180 / Math.PI} ${x1} ${y1})`}/>
            {/* Motion trail */}
            <line x1={x1} y1={y1} x2={x1 - dx * 0.4} y2={y1 - dy * 0.4}
              stroke="#C82008" strokeWidth="1" opacity="0.18" strokeLinecap="round"/>
          </g>
        );
      })}

      {/* IMPACT SPARKS at shield face */}
      {[[80, 118], [102, 108], [130, 112], [148, 120], [116, 104]].map(([x, y], i) => (
        <g key={i}>
          {[0, 1, 2, 3].map(j => {
            const a = (j / 4) * Math.PI * 2 + i;
            return <line key={j}
              x1={x} y1={y}
              x2={x + 8 * Math.cos(a)} y2={y + 8 * Math.sin(a)}
              stroke="#C82008" strokeWidth="1.2" opacity="0.3" strokeLinecap="round"/>;
          })}
          <circle cx={x} cy={y} r="2" fill="#E84020" opacity="0.4"/>
        </g>
      ))}

      {/* THE GREAT SHIELD */}
      {/* Shield body */}
      <path d="M60,108 L60,188 Q60,220 120,238 Q180,220 180,188 L180,108 Q155,98 120,96 Q85,98 60,108Z"
        fill="url(#shieldG)" opacity="0.92"/>
      {/* Shield border */}
      <path d="M60,108 L60,188 Q60,220 120,238 Q180,220 180,188 L180,108 Q155,98 120,96 Q85,98 60,108Z"
        fill="none" stroke="#8A9AB0" strokeWidth="2.5" opacity="0.6"/>
      {/* Shield inner border */}
      <path d="M68,112 L68,186 Q68,214 120,230 Q172,214 172,186 L172,112 Q150,104 120,102 Q90,104 68,112Z"
        fill="none" stroke="#6A7A90" strokeWidth="1" opacity="0.35"/>
      {/* Shield face bands */}
      <path d="M60,138 Q120,130 180,138" stroke="#8A9AB0" strokeWidth="1" fill="none" opacity="0.2"/>
      <path d="M62,165 Q120,158 178,165" stroke="#8A9AB0" strokeWidth="1" fill="none" opacity="0.2"/>
      {/* Shield boss / centre crest */}
      <circle cx="120" cy="168" r="28" fill="#2A2E38" opacity="0.95"/>
      <circle cx="120" cy="168" r="28" fill="none" stroke="#C89820" strokeWidth="2" opacity="0.6"/>
      {/* Crest — stylised scales of justice blocked */}
      <path d="M120,154 L120,182" stroke="#C89820" strokeWidth="2" opacity="0.65"/>
      <path d="M108,160 Q120,156 132,160" stroke="#C89820" strokeWidth="2" fill="none" opacity="0.6"/>
      {/* Crossed out / negated symbol */}
      <line x1="106" y1="154" x2="134" y2="182" stroke="#C82008"
        strokeWidth="2.5" opacity="0.55" strokeLinecap="round"/>
      <line x1="134" y1="154" x2="106" y2="182" stroke="#C82008"
        strokeWidth="2.5" opacity="0.55" strokeLinecap="round"/>
      {/* Shield studs */}
      {[[72, 120], [168, 120], [72, 190], [168, 190], [120, 104]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#8A9AB0" opacity="0.5"/>
      ))}

      {/* FIGURE bracing behind shield */}
      {/* Legs spread wide, planted */}
      <path d="M90,286 L94,248 L120,244 L146,248 L150,286Z" fill="#1A2030" opacity="0.9"/>
      <path d="M94,280 Q86,288 84,290 L108,290 L108,280Z" fill="#0E1418"/>
      <path d="M146,280 Q154,288 156,290 L132,290 L132,280Z" fill="#0E1418"/>
      {/* Both arms pushing shield */}
      <path d="M96,248 L74,230 L68,238 L92,258Z" fill="#1A2030" opacity="0.88"/>
      <path d="M144,248 L166,230 L172,238 L148,258Z" fill="#1A2030" opacity="0.88"/>
      {/* Head barely visible above shield */}
      <ellipse cx="120" cy="106" rx="14" ry="12" fill="#1A2030" opacity="0.7"/>
      {/* Eyes — determined, peeking over */}
      <line x1="113" y1="108" x2="118" y2="108" stroke="#8A9AB0" strokeWidth="1.5"
        opacity="0.5" strokeLinecap="round"/>
      <line x1="122" y1="108" x2="127" y2="108" stroke="#8A9AB0" strokeWidth="1.5"
        opacity="0.5" strokeLinecap="round"/>

      <rect width={W} height={H} fill="#8A9AB0" opacity="0.02" filter="url(#g8)"/>
      <Band title="PROTECT OUR INTERESTS" tagline="Nothing gets through." accentColor="#8A9AB0" bgColor="#060808"/>
    </svg>
  );
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
const CARDS = [
  { id: "deal-federal",    Component: CardDealFederal,     label: "Deal with Federal Govt",    accent: "#8A7828", effect: "Lose 1 claim → +$3" },
  { id: "quid-pro-quo",    Component: CardQuidProQuo,      label: "Quid Pro Quo",              accent: "#C89820", effect: "Pay $4 → +2 water" },
  { id: "lobby-federal",   Component: CardLobbyFederal,    label: "Lobby Federal Govt",        accent: "#8A9AB8", effect: "Pay $3 → +1 claim" },
  { id: "scorched-earth",  Component: CardScorchedEarth,   label: "Scorched Earth",            accent: "#E84800", effect: "Pay $2+PR → opp. lose water" },
  { id: "water-bribe",     Component: CardWaterBribe,      label: "Water Bribe",               accent: "#5A8840", effect: "Give water → opp. gives $3" },
  { id: "red-herring",     Component: CardRedHerring,      label: "Red Herring Case",          accent: "#C82020", effect: "Lock 2 enemy lawyers" },
  { id: "donate-sc",       Component: CardDonateSCJustice, label: "Donate to SC Justice",      accent: "#C89820", effect: "Swap 2 docket card positions" },
  { id: "protect",         Component: CardProtectInterests,label: "Protect Our Interests",     accent: "#8A9AB0", effect: "Negate 1 card or lawyer effect" },
];

const ROTATIONS = [-2.1, 1.8, -1.5, 2.4, -0.9, 2.0, -1.8, 1.3];

export default function StrategyCardGallery() {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030408",
      fontFamily: "Georgia,'Times New Roman',serif",
      color: "#D0C8B0",
    }}>
      {/* Header */}
      <div style={{ padding: "30px 44px 22px", borderBottom: "1px solid #12100C" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #3A3218)" }}/>
          <span style={{ fontSize: 9, letterSpacing: "0.35em", color: "#3A3218",
            fontFamily: "monospace", textTransform: "uppercase" }}>
            The Law of the River · Digital Edition
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #3A3218)" }}/>
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: "clamp(20px,3.5vw,32px)",
          fontWeight: "normal", letterSpacing: "0.1em", color: "#E0D8C0" }}>
          STRATEGY CARDS
        </h1>
        <p style={{ margin: 0, fontSize: 11, color: "#3A3218",
          letterSpacing: "0.15em", textTransform: "uppercase" }}>
          8 schemes · noir backroom-deal aesthetic · played from hand
        </p>
      </div>

      {/* Grid */}
      <div style={{ padding: "40px 24px 32px", display: "flex",
        flexWrap: "wrap", gap: 28, justifyContent: "center" }}>
        {CARDS.map((card, i) => {
          const isFocused = focused === card.id;
          return (
            <div key={card.id} style={{ display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8 }}>
              <div
                onClick={() => setFocused(isFocused ? null : card.id)}
                style={{
                  width: 200,
                  cursor: "pointer",
                  position: "relative",
                  zIndex: isFocused ? 20 : 1,
                  transform: isFocused
                    ? "rotate(0deg) scale(1.13) translateY(-10px)"
                    : `rotate(${ROTATIONS[i]}deg) scale(1)`,
                  transition: "transform 0.35s cubic-bezier(.22,.68,0,1.3), box-shadow 0.3s",
                  boxShadow: isFocused
                    ? `0 28px 80px rgba(0,0,0,0.99), 0 0 0 2px ${card.accent}`
                    : "0 5px 24px rgba(0,0,0,0.88)",
                  borderRadius: 7, overflow: "hidden",
                }}>
                <div style={{
                  position: "absolute", inset: 0,
                  border: `1px solid ${card.accent}2A`,
                  borderRadius: 7, zIndex: 5, pointerEvents: "none",
                }}/>
                <card.Component/>
              </div>
              <div style={{ textAlign: "center", maxWidth: 200 }}>
                <div style={{ fontSize: 9.5, color: "#3A3218", letterSpacing: "0.05em",
                  fontFamily: "monospace", fontStyle: "italic" }}>
                  {card.effect}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "0 44px 30px", textAlign: "center", fontSize: 11,
        color: "#1A1810", letterSpacing: "0.08em", lineHeight: 1.9 }}>
        Click any card to focus · Pure SVG — no raster images
      </div>
    </div>
  );
}
