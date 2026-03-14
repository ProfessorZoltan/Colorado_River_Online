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

// Shared event bottom band — slightly different feel: bold proclamation strip
function EventBand({ title, subtitle, tagline, accentColor = "#C82020", bgColor = "#0C0404" }) {
  return (
    <>
      <rect x="0" y="278" width={W} height={H - 278} fill={bgColor}/>
      <line x1="0" y1="277.5" x2={W} y2="277.5" stroke={accentColor} strokeWidth="3"/>
      {/* Bold EVENT type label */}
      <rect x="0" y="277" width={W} height="12" fill={accentColor} opacity="0.18"/>
      <text x="120" y="289" textAnchor="middle" fill={accentColor}
        fontFamily="Georgia,serif" fontSize="7" letterSpacing="5" fontWeight="bold"
        opacity="0.9">EVENT</text>
      <line x1="20" y1="293" x2="220" y2="293" stroke={accentColor} strokeWidth="0.6" opacity="0.3"/>
      <text x="120" y="308" textAnchor="middle" fill="#F0ECD8"
        fontFamily="Georgia,serif" fontSize="11.5" letterSpacing="2" fontWeight="bold">{title}</text>
      {subtitle && (
        <text x="120" y="320" textAnchor="middle" fill={accentColor}
          fontFamily="Georgia,serif" fontSize="7" letterSpacing="3" opacity="0.7">{subtitle}</text>
      )}
      <text x="120" y="334" textAnchor="middle" fill="#F0ECD8" opacity="0.4"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic" letterSpacing="0.3">{tagline}</text>
    </>
  );
}

// ── 1. PROTEST A ─────────────────────────────────────────────────────────────
// The city square erupts — massive crowd from above, a speaker on a platform,
// banners filling the air. Most severe: −3 PR for the low-influence player.
// Palette: revolutionary red, crowd black, sky white, banner gold
export function CardProtestA() {
  const crowd = Array.from({ length: 120 }, (_, i) => ({
    x: (i % 15) * 16 + 4 + (Math.sin(i * 1.7) * 5),
    y: 110 + Math.floor(i / 15) * 12 + (Math.cos(i * 2.3) * 3),
    r: 3 + (i % 3),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gPA" seed={9} freq={0.86}/>
        <radialGradient id="vigPA" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#C82020" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#080204" stopOpacity="0.72"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#0C0204"/>
      <rect width={W} height={H} fill="url(#vigPA)"/>

      {/* Sky — dawn of revolt */}
      <rect width={W} height="110" fill="#1A0404" opacity="0.9"/>
      <rect width={W} height="60" fill="#C82020" opacity="0.14"/>

      {/* "×3 PR" penalty mark — large and stark */}
      <text x="198" y="42" textAnchor="middle" fill="#C82020"
        fontFamily="Georgia,serif" fontSize="28" fontWeight="bold" opacity="0.18">−3</text>
      <text x="198" y="62" textAnchor="middle" fill="#C82020"
        fontFamily="Georgia,serif" fontSize="10" letterSpacing="2" opacity="0.18">PR</text>

      {/* BANNERS cutting across sky */}
      {[
        { x1: 0,   y1: 52, x2: 90,  y2: 28, text: "WATER", col: "#C82020" },
        { x1: 80,  y1: 22, x2: 180, y2: 46, text: "IS LIFE", col: "#E8A020" },
        { x1: 162, y1: 40, x2: 240, y2: 20, text: "FIGHT", col: "#C82020" },
      ].map(({ x1, y1, x2, y2, text, col }, i) => {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="10" opacity="0.55"/>
            <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#F0ECD8"
              fontFamily="Georgia,serif" fontSize="7" fontWeight="bold" letterSpacing="2"
              opacity="0.75" transform={`rotate(${angle} ${cx} ${cy})`}>{text}</text>
          </g>
        );
      })}
      {/* Banner strings */}
      {[[14, 0, 14, 52], [90, 0, 90, 28], [180, 0, 180, 46]].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#C82020" strokeWidth="0.8" opacity="0.3"/>
      ))}

      {/* CROWD — dense mass of heads viewed slightly from above */}
      {crowd.map(({ x, y, r }, i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.85}
          fill="#C82020" opacity={0.22 + (i % 5) * 0.05}/>
      ))}

      {/* PLATFORM — speaker stage */}
      <rect x="70" y="95" width="100" height="18" rx="1" fill="#1A0404" opacity="0.9"/>
      <rect x="70" y="93" width="100" height="5" rx="1" fill="#C82020" opacity="0.5"/>
      {/* Platform legs */}
      <rect x="80" y="113" width="8" height="12" fill="#1A0404" opacity="0.7"/>
      <rect x="152" y="113" width="8" height="12" fill="#1A0404" opacity="0.7"/>

      {/* SPEAKER on platform */}
      <ellipse cx="120" cy="82" rx="11" ry="12" fill="#C82020" opacity="0.9"/>
      {/* Body */}
      <path d="M110,93 L112,70 L120,66 L128,70 L130,93Z" fill="#C82020" opacity="0.85"/>
      {/* Raised fist */}
      <path d="M128,76 L148,56 L152,62 L132,82Z" fill="#C82020" opacity="0.85"/>
      <ellipse cx="150" cy="59" rx="7" ry="6" fill="#A81808" opacity="0.9"/>
      {/* Megaphone */}
      <path d="M110,78 L86,68 L84,75 L108,85Z" fill="#E8A020" opacity="0.7"/>
      <path d="M84,68 L72,62 L72,82 L84,78Z" fill="#E8A020" opacity="0.6"/>
      {/* Sound arcs */}
      {[0,1,2].map(i => (
        <path key={i}
          d={`M70,${65+i*8} Q62,${69+i*8} 58,${65+i*8}`}
          stroke="#F0ECD8" strokeWidth={2.2-i*0.5} fill="none"
          opacity={0.45-i*0.1} strokeLinecap="round"/>
      ))}

      {/* Raised fists in crowd */}
      {[[28,118],[60,106],[104,102],[158,108],[192,114],[220,106]].map(([x,y],i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x-2} y2={y-14}
            stroke="#C82020" strokeWidth="3.5" strokeLinecap="round" opacity="0.4"/>
          <ellipse cx={x-2} cy={y-17} rx="5" ry="4.5" fill="#C82020" opacity="0.38"/>
        </g>
      ))}

      {/* "PROTEST" stamp */}
      <text x="120" y="255" textAnchor="middle" fill="#C82020"
        fontFamily="Georgia,serif" fontSize="42" fontWeight="bold"
        opacity="0.055" letterSpacing="-1">PROTEST</text>

      <rect width={W} height={H} fill="#C82020" opacity="0.03" filter="url(#gPA)"/>
      <EventBand title="PROTEST" subtitle="SEVERITY I  ·  PENALTY −3 PR"
        tagline="Lowest influence pays the price." accentColor="#C82020" bgColor="#0C0204"/>
    </svg>
  );
}

// ── 2. PROTEST B ─────────────────────────────────────────────────────────────
// Smaller, rawer street action — a picket line blocking a gate or bridge,
// fewer figures, handmade signs. Dual penalty: −1 PR & −1 water claim.
// Palette: olive protest, worn cream, rust, shadow grey
export function CardProtestB() {
  const pickets = [10, 44, 78, 112, 146, 180, 214];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gPB" seed={23} freq={0.88}/>
        <radialGradient id="vigPB" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#3A3010" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#06060A" stopOpacity="0.7"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#08080A"/>
      <rect width={W} height={H} fill="url(#vigPB)"/>

      {/* Overcast sky */}
      <rect width={W} height="145" fill="#161410" opacity="0.85"/>
      {/* Cloud mass */}
      {[[40,32,52,22],[110,22,64,26],[186,30,44,20]].map(([x,y,rx,ry],i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry}
          fill="#282418" opacity={0.6+i*0.05}/>
      ))}

      {/* BRIDGE / GATE structure being blocked */}
      {/* Bridge deck */}
      <rect x="0" y="140" width={W} height="14" fill="#1A1610" opacity="0.9"/>
      <line x1="0" y1="140" x2={W} y2="140" stroke="#C87820" strokeWidth="1.2" opacity="0.35"/>
      {/* Bridge cables / suspension */}
      {[[60,0],[120,0],[180,0]].map(([x,y],i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x-28} y2={140} stroke="#C87820" strokeWidth="0.8" opacity="0.22"/>
          <line x1={x} y1={y} x2={x+28} y2={140} stroke="#C87820" strokeWidth="0.8" opacity="0.22"/>
          <rect x={x-3} y="0" width="6" height={140} fill="#C87820" opacity="0.06"/>
        </g>
      ))}
      {/* Gate posts */}
      <rect x="8"  y="40" width="14" height="110" fill="#2A2018" opacity="0.85"/>
      <rect x="218" y="40" width="14" height="110" fill="#2A2018" opacity="0.85"/>
      {/* Gate bar — closed across */}
      <rect x="0" y="108" width={W} height="10" rx="2" fill="#A82020" opacity="0.65"/>
      <line x1="0" y1="108" x2={W} y2="108" stroke="#C82020" strokeWidth="0.8" opacity="0.4"/>

      {/* PICKET LINE — figures holding signs */}
      {pickets.map((x, i) => (
        <g key={i}>
          {/* Figure body */}
          <ellipse cx={x+8} cy={190} rx={8} ry={9} fill="#4A5828" opacity="0.75"/>
          <path d={`M${x},200 L${x+2},220 L${x+14},220 L${x+16},200Z`}
            fill="#4A5828" opacity="0.7"/>
          {/* Sign on stick */}
          <line x1={x+14} y1={200} x2={x+14} y2={163}
            stroke="#8A7040" strokeWidth="2" opacity="0.65"/>
          <rect x={x+2} y={152} width={24} height={16} rx="1"
            fill="#E8DCC0" opacity={0.55+(i%3)*0.12}
            transform={`rotate(${(i%3-1)*4} ${x+14} ${158})`}/>
          {/* Sign text — alternating slogans */}
          <text x={x+14} y={163} textAnchor="middle" fill="#A82020"
            fontSize="4.5" fontFamily="monospace" fontWeight="bold"
            opacity="0.65" transform={`rotate(${(i%3-1)*4} ${x+14} ${158})`}>
            {["NO!", "H2O", "OUR"][i%3]}
          </text>
        </g>
      ))}

      {/* WATER DROP with crack — dual penalty symbol */}
      {/* Water drop */}
      <path d="M68,62 C64,50 56,40 56,33 C56,24 62,18 68,18 C74,18 80,24 80,33 C80,40 72,50 68,62Z"
        fill="#2A6AA0" opacity="0.5"/>
      {/* Crack through drop */}
      <path d="M65,22 L68,35 L64,48" stroke="#C82020" strokeWidth="2"
        opacity="0.65" strokeLinecap="round"/>
      {/* PR arrow */}
      <text x="108" y="38" fill="#F0ECD8" fontFamily="Georgia,serif"
        fontSize="22" fontWeight="bold" opacity="0.12">−PR</text>

      {/* Penalty badge */}
      <rect x="148" y="14" width="82" height="36" rx="3" fill="#1A0C04" opacity="0.8"/>
      <rect x="148" y="14" width="82" height="36" rx="3" fill="none"
        stroke="#C82020" strokeWidth="1" opacity="0.5"/>
      <text x="189" y="28" textAnchor="middle" fill="#C82020"
        fontFamily="Georgia,serif" fontSize="8" letterSpacing="1" fontWeight="bold" opacity="0.7">PENALTY</text>
      <text x="189" y="40" textAnchor="middle" fill="#F0ECD8"
        fontFamily="Georgia,serif" fontSize="7.5" opacity="0.6">−1 PR  ·  −1 CLAIM</text>

      {/* Ground */}
      <rect x="0" y="228" width={W} height="52" fill="#0E0E10" opacity="0.85"/>
      <line x1="0" y1="228" x2={W} y2="228" stroke="#4A5828" strokeWidth="0.8" opacity="0.3"/>

      {/* Scattered litter / dropped flyers on ground */}
      {[[18,238,12],[55,242,-8],[98,236,15],[162,240,-12],[204,238,6]].map(([x,y,r],i) => (
        <rect key={i} x={x} y={y} width="22" height="14" rx="1"
          fill="#E8DCC0" opacity="0.1"
          transform={`rotate(${r} ${x+11} ${y+7})`}/>
      ))}

      <rect width={W} height={H} fill="#4A5828" opacity="0.025" filter="url(#gPB)"/>
      <EventBand title="PROTEST" subtitle="SEVERITY II  ·  −1 PR  &  −1 CLAIM"
        tagline="The picket line holds the river." accentColor="#C87820" bgColor="#08080A"/>
    </svg>
  );
}

// ── 3. SEVERE DROUGHT ────────────────────────────────────────────────────────
// The river shrinks to nothing — cracked mud flats, exposed rock, waterline
// far below normal, a d6 die visible tumbling from a cracked sky.
// Palette: bleached bone, sear orange, parched brown, blood-red sun
export function CardSevereDrought() {
  const mudCracks = [
    "M20,185 L38,200 L28,218 L44,230",
    "M50,178 L62,195 L70,212 L82,224",
    "M92,180 L88,198 L100,210 L94,228",
    "M118,176 L122,196 L112,212 L120,230",
    "M144,180 L138,198 L148,215 L140,228",
    "M168,177 L178,194 L168,210 L180,225",
    "M194,182 L202,200 L196,218",
    "M34,192 L46,206 L38,220",
    "M76,188 L84,204 L72,216",
    "M130,183 L126,200 L136,212",
    "M158,186 L164,204 L155,218",
    "M210,180 L218,196 L208,210",
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gSD" seed={7} freq={0.84}/>
        <linearGradient id="droughtSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#380800" stopOpacity="1"/>
          <stop offset="60%" stopColor="#280600" stopOpacity="1"/>
          <stop offset="100%" stopColor="#180600" stopOpacity="1"/>
        </linearGradient>
        <radialGradient id="hotSun" cx="50%" cy="30%" r="38%">
          <stop offset="0%"  stopColor="#E84800" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#E84800" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#100400"/>
      <rect width={W} height="175" fill="url(#droughtSky)"/>
      <rect width={W} height="175" fill="url(#hotSun)"/>

      {/* RELENTLESS SUN */}
      <circle cx="120" cy="56" r="36" fill="#E84800" opacity="0.35"/>
      <circle cx="120" cy="56" r="26" fill="#F06010" opacity="0.4"/>
      <circle cx="120" cy="56" r="16" fill="#F0A020" opacity="0.5"/>
      {/* Heat distortion lines */}
      {Array.from({length:12},(_,i) => {
        const a = (i/12)*Math.PI*2;
        return <line key={i}
          x1={120+28*Math.cos(a)} y1={56+28*Math.sin(a)}
          x2={120+52*Math.cos(a)} y2={56+52*Math.sin(a)}
          stroke="#E84800" strokeWidth="2.5" opacity="0.18" strokeLinecap="round"/>;
      })}

      {/* CRACKED SKY — split down from sun */}
      <path d="M120,90 L108,118 L116,130 L104,150"
        stroke="#E84800" strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M120,90 L132,115 L126,128 L138,148"
        stroke="#E84800" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round"/>
      <path d="M108,118 L96,128" stroke="#E84800" strokeWidth="1.2" fill="none" opacity="0.25"/>
      <path d="M132,115 L144,124" stroke="#E84800" strokeWidth="1.2" fill="none" opacity="0.25"/>

      {/* DIE tumbling from crack — d6 */}
      <rect x="86" y="105" width="28" height="28" rx="4"
        fill="#1A0800" opacity="0.9" transform="rotate(22 100 119)"/>
      <rect x="86" y="105" width="28" height="28" rx="4"
        fill="none" stroke="#E84800" strokeWidth="1.8" opacity="0.7"
        transform="rotate(22 100 119)"/>
      {/* Die face — showing varied dots (subtract = bad) */}
      {[[92,111],[100,111],[108,111],[92,119],[108,119],[100,127]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill="#E84800" opacity="0.65"
          transform="rotate(22 100 119)"/>
      ))}
      {/* d6 label */}
      <text x="148" y="118" fill="#E84800" fontFamily="monospace"
        fontSize="11" fontWeight="bold" opacity="0.35">d6</text>
      <text x="148" y="130" fill="#E84800" fontFamily="monospace"
        fontSize="8" opacity="0.28">−WATER</text>

      {/* DRY RIVERBED */}
      <rect x="0" y="155" width={W} height="120" fill="#3A1C06" opacity="0.95"/>
      {/* Old river ghost — faint ghost of where water once was */}
      <path d="M0,168 Q60,160 120,170 Q180,180 240,166"
        stroke="#2A0E04" strokeWidth="8" fill="none" opacity="0.5"/>
      {/* Exposed river rocks */}
      {[[28,168,16,9],[62,172,12,7],[98,165,18,10],[140,170,14,8],
        [178,167,16,9],[210,172,11,7],[44,185,10,6],[120,188,14,8],[190,183,12,7]].map(([x,y,rx,ry],i)=>(
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry}
          fill="#5A3010" opacity={0.5+i%3*0.08}/>
      ))}
      {/* Mud cracks */}
      {mudCracks.map((d, i) => (
        <path key={i} d={d} stroke="#180800" strokeWidth={1.2+(i%3)*0.4}
          fill="none" opacity="0.65" strokeLinecap="round"/>
      ))}
      {/* Waterline stain — high water mark long gone */}
      <path d="M0,162 Q40,157 80,162 Q130,168 180,160 Q210,156 240,162"
        stroke="#5A2A08" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="6,4"/>
      <text x="8" y="158" fill="#5A2A08" fontFamily="monospace" fontSize="5"
        opacity="0.35" letterSpacing="0.5">← HIGH WATER MARK</text>

      {/* Bleached animal skull */}
      <ellipse cx="182" cy="200" rx="16" ry="12" fill="#C8B890" opacity="0.28"/>
      <ellipse cx="170" cy="202" rx="6" ry="8" fill="#B8A880" opacity="0.22"/>
      {/* Eye socket */}
      <ellipse cx="178" cy="198" rx="4" ry="3" fill="#100400" opacity="0.5"/>

      {/* Heat shimmer on ground */}
      {[30,80,130,190].map((x,i) => (
        <path key={i} d={`M${x},165 Q${x+5},158 ${x+10},165 Q${x+15},172 ${x+20},165`}
          stroke="#E84800" strokeWidth="0.7" fill="none" opacity="0.08"/>
      ))}

      <rect width={W} height={H} fill="#E84800" opacity="0.025" filter="url(#gSD)"/>
      <EventBand title="SEVERE DROUGHT" subtitle="ROLL d6  ·  SUBTRACT FROM SUPPLY"
        tagline="The river gives less than it owes." accentColor="#E84800" bgColor="#100400"/>
    </svg>
  );
}

// ── 4. LARGE SNOW MELT ───────────────────────────────────────────────────────
// Snowcapped peaks shedding torrents, swollen river below, a d6 tumbling
// from a breaking cloudbank. Cold blues, silver melt, rushing foam.
// Palette: glacier white, snowmelt blue, deep slate, silver
export function CardLargeSnowMelt() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gSM" seed={37} freq={0.87}/>
        <linearGradient id="coldSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#08181E" stopOpacity="1"/>
          <stop offset="100%" stopColor="#0E2030" stopOpacity="1"/>
        </linearGradient>
        <radialGradient id="peakGlow" cx="50%" cy="35%" r="45%">
          <stop offset="0%"  stopColor="#A0C8E0" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#A0C8E0" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#060E14"/>
      <rect width={W} height="200" fill="url(#coldSky)"/>
      <rect width={W} height="200" fill="url(#peakGlow)"/>

      {/* MOUNTAIN RANGE — dramatic silhouette */}
      <path d="M0,145 L32,88 L54,110 L88,52 L112,82 L136,44 L160,74 L188,60 L210,92 L240,75 L240,145Z"
        fill="#0E1E28" opacity="0.95"/>
      {/* Snow caps */}
      <path d="M84,52 L88,52 L100,72 L92,78 L80,70 L76,64Z"
        fill="#D0E8F0" opacity="0.55"/>
      <path d="M130,44 L136,44 L150,68 L140,74 L126,66 L122,58Z"
        fill="#D0E8F0" opacity="0.6"/>
      <path d="M184,60 L190,60 L200,78 L194,82 L182,76 L178,70Z"
        fill="#D0E8F0" opacity="0.5"/>
      <path d="M28,88 L34,88 L44,104 L38,108 L26,102 L22,96Z"
        fill="#D0E8F0" opacity="0.45"/>
      {/* Snow sheen on peaks */}
      <path d="M88,54 Q96,50 108,58" stroke="#E0F0F8" strokeWidth="1" fill="none" opacity="0.4"/>
      <path d="M136,46 Q144,42 155,52" stroke="#E0F0F8" strokeWidth="1" fill="none" opacity="0.4"/>

      {/* MELTWATER CASCADES pouring off mountains */}
      {[[90,78,86,140],[110,82,106,144],[138,68,134,140],[162,78,158,140]].map(([x1,y1,x2,y2],i) => (
        <g key={i}>
          <path d={`M${x1},${y1} Q${x1-4+i*2},${(y1+y2)/2} ${x2},${y2}`}
            stroke="#4AA8D0" strokeWidth={2.5+i*0.5} fill="none"
            opacity={0.35+i*0.04} strokeLinecap="round"/>
          <path d={`M${x1+2},${y1} Q${x1-2+i*2},${(y1+y2)/2+5} ${x2+2},${y2}`}
            stroke="#A0D8F0" strokeWidth="1" fill="none"
            opacity={0.2} strokeLinecap="round"/>
        </g>
      ))}

      {/* SWOLLEN RIVER */}
      <path d="M0,148 Q60,138 120,148 Q180,158 240,144 L240,200 L0,200Z"
        fill="#1A5080" opacity="0.85"/>
      {/* River surface waves */}
      {[0,1,2,3].map(i => (
        <path key={i}
          d={`M0,${152+i*10} Q60,${147+i*10} 120,${154+i*10} Q180,${161+i*10} 240,${150+i*10}`}
          stroke="#4AA8D0" strokeWidth="1.5" fill="none" opacity={0.35-i*0.06}/>
      ))}
      {/* River foam / white water */}
      {[[22,154],[68,148],[118,152],[168,150],[212,156]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="12" ry="4"
          fill="#C0E4F4" opacity="0.22"/>
      ))}
      {/* Flood water spilling over banks */}
      <path d="M0,154 Q30,148 50,155 L50,172 L0,168Z" fill="#1A5080" opacity="0.5"/>
      <path d="M240,150 Q210,144 190,152 L190,170 L240,165Z" fill="#1A5080" opacity="0.5"/>
      {/* Waterline high-mark — exceeding banks */}
      <line x1="0" y1="148" x2={W} y2="144"
        stroke="#A0D8F0" strokeWidth="1.2" opacity="0.3" strokeDasharray="8,4"/>
      <text x="8" y="144" fill="#A0D8F0" fontFamily="monospace" fontSize="5"
        opacity="0.4" letterSpacing="0.5">HIGH FLOOD LINE</text>

      {/* CLOUDS breaking, releasing melt */}
      {[[20,20,50,22],[100,14,58,26],[190,18,46,20]].map(([x,y,rx,ry],i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry}
          fill="#1A3040" opacity={0.7+i*0.04}/>
      ))}
      {/* Rain/melt from clouds */}
      {Array.from({length:18},(_,i) => (
        <line key={i}
          x1={8+i*14} y1={34} x2={6+i*14} y2={50}
          stroke="#4AA8D0" strokeWidth="0.8" opacity="0.2" strokeLinecap="round"/>
      ))}

      {/* DIE tumbling from cloud gap */}
      <rect x="140" y="18" width="28" height="28" rx="4"
        fill="#060E14" opacity="0.92" transform="rotate(-18 154 32)"/>
      <rect x="140" y="18" width="28" height="28" rx="4"
        fill="none" stroke="#4AA8D0" strokeWidth="1.8" opacity="0.75"
        transform="rotate(-18 154 32)"/>
      {/* Die face — 4 dots (mid-range add) */}
      {[[146,24],[158,24],[146,36],[158,36]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill="#4AA8D0" opacity="0.65"
          transform="rotate(-18 154 32)"/>
      ))}
      {/* d6 label */}
      <text x="178" y="28" fill="#4AA8D0" fontFamily="monospace"
        fontSize="11" fontWeight="bold" opacity="0.35">d6</text>
      <text x="178" y="40" fill="#4AA8D0" fontFamily="monospace"
        fontSize="8" opacity="0.28">+WATER</text>

      {/* Floating debris in river */}
      {[[40,168,8],[92,162,12],[160,166,9],[208,170,7]].map(([x,y,w],i) => (
        <rect key={i} x={x} y={y} width={w} height={4} rx="1"
          fill="#2A6A90" opacity="0.4" transform={`rotate(${(i%3-1)*10} ${x} ${y})`}/>
      ))}

      {/* Ground below river */}
      <rect x="0" y="200" width={W} height="80" fill="#060E14" opacity="0.9"/>

      <rect width={W} height={H} fill="#4AA8D0" opacity="0.025" filter="url(#gSM)"/>
      <EventBand title="LARGE SNOW MELT" subtitle="ROLL d6  ·  ADD TO SUPPLY"
        tagline="The mountains yield their debt." accentColor="#4AA8D0" bgColor="#060E14"/>
    </svg>
  );
}

// ── 5. SUPREME COURT SESSION ─────────────────────────────────────────────────
// The temple of law descends from above — a towering view looking up at
// the SC building facade, scales of justice backlit, gavel falling.
// Palette: marble white, judicial purple, verdict gold, shadow black
export function CardSCSession() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gSC" seed={53} freq={0.86}/>
        <radialGradient id="judGlow" cx="50%" cy="48%" r="55%">
          <stop offset="0%"  stopColor="#6040A0" stopOpacity="0.22"/>
          <stop offset="55%"  stopColor="#4020A0" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#060210" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="marbleG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1A1828" stopOpacity="1"/>
          <stop offset="100%" stopColor="#0C0A18" stopOpacity="1"/>
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="#060210"/>
      <rect width={W} height={H} fill="url(#judGlow)"/>

      {/* Deep dark sky */}
      <rect width={W} height="60" fill="url(#marbleG)"/>

      {/* PEDIMENT — triangular top of SC building */}
      <path d="M0,60 L120,8 L240,60Z" fill="#161422" opacity="0.95"/>
      <path d="M0,60 L120,8 L240,60Z" fill="none"
        stroke="#9080C0" strokeWidth="1.5" opacity="0.4"/>
      {/* Frieze inscription */}
      <text x="120" y="40" textAnchor="middle" fill="#C0B0E0"
        fontFamily="Georgia,serif" fontSize="6.5" letterSpacing="3" opacity="0.45"
        fontWeight="bold">EQUAL JUSTICE UNDER LAW</text>

      {/* COLUMNS — massive, extreme perspective */}
      {[10, 46, 82, 118, 154, 190, 218].map((x, i) => (
        <g key={i}>
          <rect x={x} y="58" width="22" height="200" rx="1"
            fill="#161422" opacity={0.9}/>
          <rect x={x} y="58" width="22" height="200" rx="1"
            fill="none" stroke="#6040A0" strokeWidth="0.7" opacity={0.3-i%2*0.05}/>
          {/* Column highlight */}
          <rect x={x+2} y="62" width="4" height="192" rx="2"
            fill="#9080C0" opacity="0.07"/>
          {/* Column entasis lines */}
          {[0,1,2].map(j => (
            <line key={j} x1={x+5+j*5} y1="62" x2={x+5+j*5} y2="254"
              stroke="#6040A0" strokeWidth="0.3" opacity="0.12"/>
          ))}
          {/* Capital */}
          <rect x={x-2} y="54" width="26" height="7" rx="1"
            fill="#1E1C2E" opacity="0.95"/>
          <rect x={x-4} y="51" width="30" height="5" rx="1"
            fill="#1E1C2E" opacity="0.9"/>
        </g>
      ))}

      {/* Entablature */}
      <rect x="0" y="48" width={W} height="12" fill="#1A1828" opacity="0.95"/>
      <line x1="0" y1="48" x2={W} y2="48" stroke="#9080C0" strokeWidth="1.2" opacity="0.4"/>
      <line x1="0" y1="59" x2={W} y2="59" stroke="#6040A0" strokeWidth="0.6" opacity="0.25"/>

      {/* INTERIOR GLOW between columns */}
      <rect x="0" y="60" width={W} height="200"
        fill="#6040A0" opacity="0.04"/>

      {/* SCALES OF JUSTICE — center stage, backlit */}
      {/* Staff */}
      <rect x="118" y="72" width="5" height="128" fill="#C0B040" opacity="0.75"/>
      {/* Finial */}
      <circle cx="120" cy="68" r="9" fill="#C0B040" opacity="0.7"/>
      <circle cx="120" cy="68" r="5.5" fill="#0C0A18" opacity="0.9"/>
      <circle cx="120" cy="68" r="2.5" fill="#C0B040" opacity="0.65"/>
      {/* Pivot */}
      <circle cx="120" cy="110" r="7" fill="#C0B040" opacity="0.65"/>
      <circle cx="120" cy="110" r="4" fill="#9040A0" opacity="0.7"/>
      {/* Balance beam — perfectly level */}
      <rect x="42" y="107" width="156" height="7" rx="2"
        fill="#9070B0" opacity="0.6"/>
      <rect x="42" y="107" width="156" height="2" rx="1"
        fill="#C0B040" opacity="0.3"/>
      {/* Left chain */}
      <line x1="52" y1="114" x2="48" y2="158" stroke="#C0B040" strokeWidth="1.5" opacity="0.6"/>
      {/* Right chain */}
      <line x1="188" y1="114" x2="192" y2="158" stroke="#C0B040" strokeWidth="1.5" opacity="0.6"/>
      {/* Left pan */}
      <path d="M28,160 Q48,174 68,160" stroke="#C0B040" strokeWidth="2.5" fill="none"
        strokeLinecap="round" opacity="0.65"/>
      <line x1="28" y1="160" x2="68" y2="160" stroke="#C0B040" strokeWidth="1" opacity="0.4"/>
      {/* Right pan */}
      <path d="M172,160 Q192,174 212,160" stroke="#C0B040" strokeWidth="2.5" fill="none"
        strokeLinecap="round" opacity="0.65"/>
      <line x1="172" y1="160" x2="212" y2="160" stroke="#C0B040" strokeWidth="1" opacity="0.4"/>
      {/* SC case docket card on left pan */}
      <rect x="33" y="144" width="30" height="18" rx="1.5"
        fill="#D0C8A8" opacity="0.55" transform="rotate(3 48 153)"/>
      {[0,1].map(i => (
        <line key={i} x1="36" y1={149+i*6} x2="60" y2={149+i*6}
          stroke="#1A1828" strokeWidth="0.7" opacity="0.35"
          transform="rotate(3 48 153)"/>
      ))}
      {/* VP tokens on right pan */}
      {[[179,150],[192,148],[185,143]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#C0B040" opacity="0.4+i*0.05"/>
      ))}

      {/* GAVEL — descending, motion blur */}
      {/* Handle */}
      <path d="M62,230 L96,192" stroke="#8A5820" strokeWidth="7"
        strokeLinecap="round" opacity="0.75"/>
      {/* Motion lines */}
      <path d="M58,234 L92,196" stroke="#8A5820" strokeWidth="2"
        strokeLinecap="round" opacity="0.2"/>
      <path d="M54,238 L88,200" stroke="#8A5820" strokeWidth="1"
        strokeLinecap="round" opacity="0.1"/>
      {/* Gavel head */}
      <path d="M88,178 L110,198 L98,212 L76,192Z" fill="#5A3010" opacity="0.9"/>
      <path d="M88,178 L110,198 L98,212 L76,192Z" fill="none"
        stroke="#8A5820" strokeWidth="1" opacity="0.5"/>
      {/* Gavel head stripe */}
      <path d="M92,186 L106,200" stroke="#8A5820" strokeWidth="3" opacity="0.35"/>
      {/* Impact ripples from gavel strike point */}
      {[0,1,2].map(i => (
        <ellipse key={i} cx="94" cy="208" rx={14+i*10} ry={5+i*4}
          fill="none" stroke="#C0B040" strokeWidth={1.5-i*0.4}
          opacity={0.25-i*0.07}/>
      ))}

      {/* Stars above columns */}
      {[[24,16],[72,12],[120,10],[168,14],[216,18]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#C0B0E0" opacity="0.25"/>
      ))}

      {/* Staircase steps below columns */}
      {[0,1,2].map(i => (
        <rect key={i} x={i*8} y={258+i*8} width={W-i*16} height="8"
          rx="0.5" fill="#1A1828" opacity={0.7+i*0.05}/>
      ))}

      <rect width={W} height={H} fill="#6040A0" opacity="0.025" filter="url(#gSC)"/>
      <EventBand title="SUPREME COURT SESSION"
        tagline="The docket speaks. The river listens."
        accentColor="#9070B0" bgColor="#060210"/>
    </svg>
  );
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
const CARDS = [
  { id:"protest-a",    Component:CardProtestA,    label:"Protest A",               accent:"#C82020", note:"All activate activists · lowest influence −3 PR",     count:"×1" },
  { id:"protest-b",    Component:CardProtestB,    label:"Protest B",               accent:"#C87820", note:"All activate activists · lowest −1 PR & −1 claim",    count:"×1" },
  { id:"drought",      Component:CardSevereDrought, label:"Severe Drought",        accent:"#E84800", note:"Roll d6 · subtract cubes from water supply",           count:"×2" },
  { id:"snowmelt",     Component:CardLargeSnowMelt, label:"Large Snow Melt",       accent:"#4AA8D0", note:"Roll d6 · add cubes to water supply",                  count:"×1" },
  { id:"sc-session",   Component:CardSCSession,   label:"Supreme Court Session",   accent:"#9070B0", note:"Resolve docket SC case · advance queue",               count:"×4" },
];

const ROTATIONS = [-2.3, 1.7, -1.4, 2.1, -0.8];

export default function EventCardGallery() {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{
      minHeight:"100vh",
      background:"#040408",
      fontFamily:"Georgia,'Times New Roman',serif",
      color:"#D0C8B8",
    }}>
      {/* Header */}
      <div style={{ padding:"30px 44px 22px", borderBottom:"1px solid #10100E" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
          <div style={{flex:1, height:1, background:"linear-gradient(to right,transparent,#2A2418)"}}/>
          <span style={{fontSize:9, letterSpacing:"0.35em", color:"#2A2418",
            fontFamily:"monospace", textTransform:"uppercase"}}>
            The Law of the River · Digital Edition
          </span>
          <div style={{flex:1, height:1, background:"linear-gradient(to left,transparent,#2A2418)"}}/>
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:"clamp(20px,3.5vw,32px)",
          fontWeight:"normal", letterSpacing:"0.1em", color:"#E8E0C8" }}>
          EVENT CARDS
        </h1>
        <p style={{ margin:0, fontSize:11, color:"#2A2418",
          letterSpacing:"0.15em", textTransform:"uppercase" }}>
          5 distinct events · elemental proclamation aesthetic · flipped, not played
        </p>
      </div>

      {/* Deck composition note */}
      <div style={{ padding:"20px 44px 0", display:"flex", gap:16, flexWrap:"wrap" }}>
        {CARDS.map(c => (
          <div key={c.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%",
              background:c.accent, opacity:0.7 }}/>
            <span style={{ fontSize:10, color:"#4A4438", fontFamily:"monospace" }}>
              {c.count} {c.label}
            </span>
          </div>
        ))}
        <span style={{ fontSize:10, color:"#2A2418", fontFamily:"monospace", marginLeft:4 }}>
          = 9 cards total
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding:"44px 28px 32px", display:"flex",
        flexWrap:"wrap", gap:32, justifyContent:"center" }}>
        {CARDS.map((card, i) => {
          const isFocused = focused === card.id;
          return (
            <div key={card.id} style={{ display:"flex", flexDirection:"column",
              alignItems:"center", gap:10 }}>
              <div
                onClick={() => setFocused(isFocused ? null : card.id)}
                style={{
                  width:200,
                  cursor:"pointer",
                  position:"relative",
                  zIndex: isFocused ? 20 : 1,
                  transform: isFocused
                    ? "rotate(0deg) scale(1.13) translateY(-10px)"
                    : `rotate(${ROTATIONS[i]}deg) scale(1)`,
                  transition:"transform 0.35s cubic-bezier(.22,.68,0,1.3), box-shadow 0.3s",
                  boxShadow: isFocused
                    ? `0 28px 80px rgba(0,0,0,0.99), 0 0 0 2px ${card.accent}`
                    : "0 5px 24px rgba(0,0,0,0.88)",
                  borderRadius:7, overflow:"hidden",
                }}>
                <div style={{
                  position:"absolute", inset:0,
                  border:`1px solid ${card.accent}2A`,
                  borderRadius:7, zIndex:5, pointerEvents:"none",
                }}/>
                {/* Count badge */}
                <div style={{
                  position:"absolute", top:8, right:8,
                  background:card.accent, color:"#F0ECD8",
                  fontFamily:"monospace", fontSize:9, fontWeight:"bold",
                  padding:"2px 6px", borderRadius:3, zIndex:6,
                  opacity:0.85, letterSpacing:"0.05em",
                }}>{card.count}</div>
                <card.Component/>
              </div>
              <div style={{ textAlign:"center", maxWidth:210 }}>
                <div style={{ fontSize:9.5, color:"#3A3428", letterSpacing:"0.05em",
                  fontFamily:"monospace", fontStyle:"italic" }}>
                  {card.note}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding:"0 44px 30px", textAlign:"center", fontSize:11,
        color:"#18140C", letterSpacing:"0.08em", lineHeight:1.9 }}>
        Click any card to focus · Deck count shown top-right · 9 total event cards
      </div>
    </div>
  );
}
