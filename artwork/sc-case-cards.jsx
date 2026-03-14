import { useState } from "react";

const W = 240, H = 340;

// ── GRAIN FILTER ──────────────────────────────────────────────────────────────
function GrainDef({ id, seed = 5 }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.87" numOctaves="4" seed={seed} result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
      <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
      <feComposite in="b" in2="SourceGraphic" operator="in"/>
    </filter>
  );
}

// ── FACTION DEFINITIONS ───────────────────────────────────────────────────────
// Each faction: primary color, secondary color, emblem SVG renderer
const FACTIONS = {
  arizona: {
    name: "Arizona",
    type: "state",
    primary: "#C84010",   // copper-red
    secondary: "#E8A020", // desert gold
    bg: "#1A0A04",
    label: "STATE OF ARIZONA",
    Emblem: ({ cx, cy, r }) => (
      <g>
        {/* Sun with rays — Arizona state motif */}
        <circle cx={cx} cy={cy} r={r * 0.42} fill="#E8A020" opacity="0.65"/>
        {Array.from({length:12},(_,i)=>{
          const a=(i/12)*Math.PI*2, r1=r*0.48, r2=r*0.68;
          return <line key={i}
            x1={cx+r1*Math.cos(a)} y1={cy+r1*Math.sin(a)}
            x2={cx+r2*Math.cos(a)} y2={cy+r2*Math.sin(a)}
            stroke="#E8A020" strokeWidth="2.5" opacity="0.5" strokeLinecap="round"/>;
        })}
        {/* Saguaro cactus */}
        <rect x={cx-3} y={cy-r*0.55} width={6} height={r*0.75} rx="3" fill="#C84010" opacity="0.8"/>
        <path d={`M${cx-3},${cy-r*0.25} L${cx-r*0.32},${cy-r*0.25} L${cx-r*0.32},${cy-r*0.08}`}
          fill="none" stroke="#C84010" strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
        <path d={`M${cx+3},${cy-r*0.18} L${cx+r*0.32},${cy-r*0.18} L${cx+r*0.32},${cy-r*0.04}`}
          fill="none" stroke="#C84010" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r*0.88} fill="none" stroke="#C84010" strokeWidth="1.5" opacity="0.45"/>
        <circle cx={cx} cy={cy} r={r*0.94} fill="none" stroke="#E8A020" strokeWidth="0.6" opacity="0.3"/>
        {/* Stars at cardinal points */}
        {[[0,r*0.75],[-r*0.75,0],[r*0.75,0],[0,-r*0.75]].map(([dx,dy],i)=>(
          <circle key={i} cx={cx+dx} cy={cy+dy} r="2.5" fill="#E8A020" opacity="0.45"/>
        ))}
      </g>
    ),
  },
  california: {
    name: "California",
    type: "state",
    primary: "#1A5C9A",   // Pacific blue
    secondary: "#D4A020", // golden state
    bg: "#060E18",
    label: "STATE OF CALIFORNIA",
    Emblem: ({ cx, cy, r }) => (
      <g>
        {/* Golden bear silhouette */}
        <path d={`M${cx-r*0.38},${cy+r*0.35}
          C${cx-r*0.38},${cy+r*0.05} ${cx-r*0.52},${cy-r*0.1} ${cx-r*0.42},${cy-r*0.3}
          C${cx-r*0.28},${cy-r*0.52} ${cx+r*0.05},${cy-r*0.55} ${cx+r*0.28},${cy-r*0.4}
          C${cx+r*0.52},${cy-r*0.22} ${cx+r*0.48},${cy+r*0.08} ${cx+r*0.38},${cy+r*0.35}
          C${cx+r*0.15},${cy+r*0.52} ${cx-r*0.18},${cy+r*0.52} ${cx-r*0.38},${cy+r*0.35}Z`}
          fill="#D4A020" opacity="0.6"/>
        {/* Bear head */}
        <circle cx={cx+r*0.22} cy={cy-r*0.42} r={r*0.18} fill="#D4A020" opacity="0.6"/>
        {/* Bear ears */}
        <circle cx={cx+r*0.12} cy={cy-r*0.56} r={r*0.07} fill="#D4A020" opacity="0.55"/>
        <circle cx={cx+r*0.34} cy={cy-r*0.54} r={r*0.06} fill="#D4A020" opacity="0.55"/>
        {/* Ocean wave beneath */}
        <path d={`M${cx-r*0.7},${cy+r*0.6} Q${cx-r*0.3},${cy+r*0.42} ${cx},${cy+r*0.6} Q${cx+r*0.3},${cy+r*0.78} ${cx+r*0.7},${cy+r*0.6}`}
          stroke="#1A5C9A" strokeWidth="2.5" fill="none" opacity="0.5"/>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r*0.88} fill="none" stroke="#1A5C9A" strokeWidth="1.5" opacity="0.45"/>
        <circle cx={cx} cy={cy} r={r*0.94} fill="none" stroke="#D4A020" strokeWidth="0.6" opacity="0.3"/>
        {/* Poppy dots */}
        {[[-r*0.72,0],[r*0.72,0]].map(([dx,dy],i)=>(
          <circle key={i} cx={cx+dx} cy={cy+dy} r="3.5" fill="#D4A020" opacity="0.4"/>
        ))}
      </g>
    ),
  },
  nevada: {
    name: "Nevada",
    type: "state",
    primary: "#4A5A6A",   // silver-slate
    secondary: "#B8C8D0", // silver
    bg: "#080C10",
    label: "STATE OF NEVADA",
    Emblem: ({ cx, cy, r }) => (
      <g>
        {/* Mountain silhouette */}
        <path d={`M${cx-r*0.72},${cy+r*0.38}
          L${cx-r*0.44},${cy-r*0.28}
          L${cx-r*0.22},${cy+r*0.0}
          L${cx},${cy-r*0.52}
          L${cx+r*0.24},${cy+r*0.02}
          L${cx+r*0.46},${cy-r*0.22}
          L${cx+r*0.72},${cy+r*0.38}Z`}
          fill="#4A5A6A" opacity="0.7"/>
        {/* Snow caps */}
        <path d={`M${cx-r*0.12},${cy-r*0.35} L${cx},${cy-r*0.52} L${cx+r*0.12},${cy-r*0.35} Z`}
          fill="#B8C8D0" opacity="0.55"/>
        <path d={`M${cx-r*0.5},${cy-r*0.15} L${cx-r*0.44},${cy-r*0.28} L${cx-r*0.36},${cy-r*0.14} Z`}
          fill="#B8C8D0" opacity="0.45"/>
        {/* Silver mine shaft */}
        <rect x={cx-4} y={cy+r*0.1} width={8} height={r*0.3} rx="2"
          fill="#B8C8D0" opacity="0.45"/>
        {/* Star / Nevada Battle Born */}
        <polygon points={`${cx},${cy-r*0.7} ${cx+3},${cy-r*0.62} ${cx+r*0.12},${cy-r*0.62} ${cx+4},${cy-r*0.55} ${cx+r*0.08},${cy-r*0.48} ${cx},${cy-r*0.44} ${cx-r*0.08},${cy-r*0.48} ${cx-4},${cy-r*0.55} ${cx-r*0.12},${cy-r*0.62} ${cx-3},${cy-r*0.62}`}
          fill="#B8C8D0" opacity="0.5"/>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r*0.88} fill="none" stroke="#4A5A6A" strokeWidth="1.5" opacity="0.45"/>
        <circle cx={cx} cy={cy} r={r*0.94} fill="none" stroke="#B8C8D0" strokeWidth="0.6" opacity="0.3"/>
      </g>
    ),
  },
  quechan: {
    name: "Quechan",
    type: "reservation",
    primary: "#8A3010",   // canyon red
    secondary: "#D4882A", // ochre
    bg: "#100804",
    label: "QUECHAN NATION",
    Emblem: ({ cx, cy, r }) => (
      <g>
        {/* Colorado River delta — branching pattern */}
        <path d={`M${cx},${cy+r*0.55} L${cx},${cy} L${cx-r*0.3},${cy-r*0.3}`}
          stroke="#D4882A" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round"/>
        <path d={`M${cx},${cy} L${cx+r*0.32},${cy-r*0.28}`}
          stroke="#D4882A" strokeWidth="2.5" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d={`M${cx-r*0.3},${cy-r*0.3} L${cx-r*0.52},${cy-r*0.52}`}
          stroke="#D4882A" strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round"/>
        <path d={`M${cx-r*0.3},${cy-r*0.3} L${cx-r*0.1},${cy-r*0.55}`}
          stroke="#D4882A" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
        <path d={`M${cx+r*0.32},${cy-r*0.28} L${cx+r*0.56},${cy-r*0.5}`}
          stroke="#D4882A" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
        {/* Traditional diamond pattern around ring */}
        {Array.from({length:8},(_,i)=>{
          const a=(i/8)*Math.PI*2, rc=r*0.78;
          return <rect key={i}
            x={cx+rc*Math.cos(a)-4} y={cy+rc*Math.sin(a)-4}
            width={8} height={8} rx="1"
            fill="#8A3010" opacity="0.5"
            transform={`rotate(45 ${cx+rc*Math.cos(a)} ${cy+rc*Math.sin(a)})`}/>;
        })}
        {/* Outer rings */}
        <circle cx={cx} cy={cy} r={r*0.88} fill="none" stroke="#8A3010" strokeWidth="1.5" opacity="0.5"/>
        <circle cx={cx} cy={cy} r={r*0.72} fill="none" stroke="#D4882A" strokeWidth="0.8" opacity="0.3"/>
      </g>
    ),
  },
  chemehuevi: {
    name: "Chemehuevi",
    type: "reservation",
    primary: "#2A6870",   // desert teal
    secondary: "#C8A050", // basket-weave amber
    bg: "#04100C",
    label: "CHEMEHUEVI TRIBE",
    Emblem: ({ cx, cy, r }) => (
      <g>
        {/* Basket weave geometric — concentric diamond grid */}
        {Array.from({length:4},(_,ring)=>{
          const rc=(ring+1)*r*0.17;
          const pts=Array.from({length:8},(_,i)=>{
            const a=(i/8)*Math.PI*2+(ring%2)*(Math.PI/8);
            return `${cx+rc*Math.cos(a)},${cy+rc*Math.sin(a)}`;
          }).join(' ');
          return <polygon key={ring} points={pts}
            fill="none" stroke="#C8A050" strokeWidth="1"
            opacity={0.4+ring*0.05}/>;
        })}
        {/* Central motif — six-pointed star / flower */}
        {Array.from({length:6},(_,i)=>{
          const a=(i/6)*Math.PI*2;
          return <line key={i}
            x1={cx+r*0.08*Math.cos(a)} y1={cy+r*0.08*Math.sin(a)}
            x2={cx+r*0.32*Math.cos(a)} y2={cy+r*0.32*Math.sin(a)}
            stroke="#2A6870" strokeWidth="3.5" strokeLinecap="round" opacity="0.7"/>;
        })}
        <circle cx={cx} cy={cy} r={r*0.1} fill="#C8A050" opacity="0.65"/>
        {/* Mountain silhouettes at base */}
        <path d={`M${cx-r*0.7},${cy+r*0.52} L${cx-r*0.38},${cy+r*0.12} L${cx-r*0.06},${cy+r*0.42} L${cx+r*0.22},${cy+r*0.0} L${cx+r*0.54},${cy+r*0.42} L${cx+r*0.72},${cy+r*0.52}Z`}
          fill="#2A6870" opacity="0.45"/>
        {/* Outer rings */}
        <circle cx={cx} cy={cy} r={r*0.88} fill="none" stroke="#2A6870" strokeWidth="1.5" opacity="0.45"/>
        <circle cx={cx} cy={cy} r={r*0.94} fill="none" stroke="#C8A050" strokeWidth="0.6" opacity="0.3"/>
      </g>
    ),
  },
  fort_mohave: {
    name: "Fort Mohave",
    type: "reservation",
    primary: "#604090",   // deep purple-indigo
    secondary: "#E08030", // sunset orange
    bg: "#080410",
    label: "FORT MOHAVE TRIBE",
    Emblem: ({ cx, cy, r }) => (
      <g>
        {/* Canyon walls — vertical striations */}
        <path d={`M${cx-r*0.62},${cy+r*0.55} L${cx-r*0.62},${cy-r*0.2} Q${cx-r*0.52},${cy-r*0.38} ${cx-r*0.32},${cy-r*0.45} L${cx-r*0.32},${cy+r*0.55}Z`}
          fill="#604090" opacity="0.55"/>
        <path d={`M${cx+r*0.62},${cy+r*0.55} L${cx+r*0.62},${cy-r*0.18} Q${cx+r*0.52},${cy-r*0.36} ${cx+r*0.32},${cy-r*0.43} L${cx+r*0.32},${cy+r*0.55}Z`}
          fill="#604090" opacity="0.5"/>
        {/* River through canyon */}
        <path d={`M${cx-r*0.32},${cy+r*0.32} Q${cx},${cy+r*0.18} ${cx+r*0.32},${cy+r*0.32}`}
          stroke="#E08030" strokeWidth="4" fill="none" opacity="0.55"/>
        <path d={`M${cx-r*0.32},${cy+r*0.44} Q${cx},${cy+r*0.3} ${cx+r*0.32},${cy+r*0.44}`}
          stroke="#E08030" strokeWidth="2" fill="none" opacity="0.35"/>
        {/* Sunrise / setting sun between canyon walls */}
        <path d={`M${cx-r*0.28},${cy-r*0.1} Q${cx},${cy-r*0.42} ${cx+r*0.28},${cy-r*0.1}Z`}
          fill="#E08030" opacity="0.4"/>
        <circle cx={cx} cy={cy-r*0.12} r={r*0.18} fill="#E08030" opacity="0.5"/>
        {/* Sun rays */}
        {Array.from({length:6},(_,i)=>{
          const a=(i/6)*Math.PI-Math.PI;
          return <line key={i}
            x1={cx+r*0.22*Math.cos(a)} y1={cy-r*0.12+r*0.22*Math.sin(a)}
            x2={cx+r*0.35*Math.cos(a)} y2={cy-r*0.12+r*0.35*Math.sin(a)}
            stroke="#E08030" strokeWidth="1.5" opacity="0.4" strokeLinecap="round"/>;
        })}
        {/* Outer rings */}
        <circle cx={cx} cy={cy} r={r*0.88} fill="none" stroke="#604090" strokeWidth="1.5" opacity="0.45"/>
        <circle cx={cx} cy={cy} r={r*0.94} fill="none" stroke="#E08030" strokeWidth="0.6" opacity="0.3"/>
      </g>
    ),
  },
};

// ── SC CASE CARD COMPONENT ─────────────────────────────────────────────────────
function SCCaseCard({ plaintiffId, defendantId, seed = 1 }) {
  const P = FACTIONS[plaintiffId];
  const D = FACTIONS[defendantId];
  const bothStates = P.type === "state" && D.type === "state";
  const bothRes    = P.type === "reservation" && D.type === "reservation";
  const mixed      = !bothStates && !bothRes;

  // Case number derived from pairing
  const caseNum = `${plaintiffId.slice(0,2).toUpperCase()}-${defendantId.slice(0,2).toUpperCase()}-${1902 + seed}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display:"block", width:"100%", height:"100%" }}>
      <defs>
        <GrainDef id={`g-${plaintiffId}-${defendantId}`} seed={seed * 4 + 7}/>
        {/* Split gradient — plaintiff left, defendant right */}
        <linearGradient id={`split-${plaintiffId}-${defendantId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={P.bg} stopOpacity="1"/>
          <stop offset="48%"  stopColor={P.bg} stopOpacity="1"/>
          <stop offset="52%"  stopColor={D.bg} stopOpacity="1"/>
          <stop offset="100%" stopColor={D.bg} stopOpacity="1"/>
        </linearGradient>
        {/* Vignette */}
        <radialGradient id={`vig-${plaintiffId}-${defendantId}`} cx="50%" cy="50%" r="65%">
          <stop offset="0%"   stopColor="#080808" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.62"/>
        </radialGradient>
      </defs>

      {/* Background split */}
      <rect width={W} height={H} fill={`url(#split-${plaintiffId}-${defendantId})`}/>

      {/* Cross-hatch texture on plaintiff side */}
      {Array.from({length:14},(_,i) => (
        <line key={`ph-${i}`} x1={0} y1={i*20} x2={i*20} y2={0}
          stroke={P.primary} strokeWidth="0.4" opacity="0.07"/>
      ))}
      {/* Cross-hatch texture on defendant side */}
      {Array.from({length:14},(_,i) => (
        <line key={`dh-${i}`} x1={W} y1={i*20} x2={W-i*20} y2={0}
          stroke={D.primary} strokeWidth="0.4" opacity="0.07"/>
      ))}

      {/* Vignette overlay */}
      <rect width={W} height={H} fill={`url(#vig-${plaintiffId}-${defendantId})`}/>

      {/* ── TOP: CASE HEADER BAND ── */}
      <rect x="0" y="0" width={W} height="38" fill="#0A0A0C" opacity="0.92"/>
      <line x1="0" y1="37.5" x2={W} y2="37.5"
        stroke="#C0B040" strokeWidth="1.2" opacity="0.45"/>
      {/* Supreme Court label */}
      <text x="120" y="14" textAnchor="middle" fill="#C0B040"
        fontFamily="Georgia,serif" fontSize="6.5" letterSpacing="4" opacity="0.8"
        fontWeight="bold">SUPREME COURT OF THE UNITED STATES</text>
      <line x1="16" y1="18" x2="224" y2="18" stroke="#C0B040" strokeWidth="0.4" opacity="0.3"/>
      <text x="120" y="29" textAnchor="middle" fill="#C0B0E0"
        fontFamily="monospace" fontSize="7.5" letterSpacing="2" opacity="0.65">
        {`CASE NO. ${caseNum}`}
      </text>

      {/* ── CENTER DIVIDER ── */}
      {/* Vertical slash dividing the two factions */}
      <line x1="120" y1="38" x2="120" y2="258"
        stroke="#C0B040" strokeWidth="1" opacity="0.3" strokeDasharray="4,3"/>

      {/* ── PLAINTIFF SIDE (left) ── */}
      {/* Faction type badge */}
      <rect x="8" y="44" width={P.type === "state" ? 36 : 52} height="11" rx="2"
        fill={P.primary} opacity="0.55"/>
      <text x="12" y="53" fill="#F0ECD8"
        fontFamily="monospace" fontSize="6" letterSpacing="1" opacity="0.9">
        {P.type === "state" ? "STATE" : "RESERVATION"}
      </text>

      {/* Plaintiff emblem circle */}
      <circle cx="60" cy="130" r="46" fill={P.bg} opacity="0.9"/>
      <circle cx="60" cy="130" r="46" fill={P.primary} opacity="0.08"/>
      <P.Emblem cx={60} cy={130} r={44}/>

      {/* Plaintiff name */}
      <text x="60" y="190" textAnchor="middle" fill="#F0ECD8"
        fontFamily="Georgia,serif" fontSize="10" letterSpacing="1.5" fontWeight="bold"
        opacity="0.85">{P.name.toUpperCase()}</text>
      <line x1="16" y1="194" x2="106" y2="194"
        stroke={P.primary} strokeWidth="0.8" opacity="0.4"/>
      <text x="60" y="205" textAnchor="middle" fill={P.secondary}
        fontFamily="monospace" fontSize="6" letterSpacing="1.5" opacity="0.6">PLAINTIFF</text>

      {/* ── DEFENDANT SIDE (right) ── */}
      <rect x={W - 8 - (D.type === "state" ? 36 : 52)} y="44"
        width={D.type === "state" ? 36 : 52} height="11" rx="2"
        fill={D.primary} opacity="0.55"/>
      <text x={W - 12} y="53" textAnchor="end" fill="#F0ECD8"
        fontFamily="monospace" fontSize="6" letterSpacing="1" opacity="0.9">
        {D.type === "state" ? "STATE" : "RESERVATION"}
      </text>

      {/* Defendant emblem circle */}
      <circle cx="180" cy="130" r="46" fill={D.bg} opacity="0.9"/>
      <circle cx="180" cy="130" r="46" fill={D.primary} opacity="0.08"/>
      <D.Emblem cx={180} cy={130} r={44}/>

      {/* Defendant name */}
      <text x="180" y="190" textAnchor="middle" fill="#F0ECD8"
        fontFamily="Georgia,serif" fontSize="10" letterSpacing="1.5" fontWeight="bold"
        opacity="0.85">{D.name.toUpperCase()}</text>
      <line x1="134" y1="194" x2="224" y2="194"
        stroke={D.primary} strokeWidth="0.8" opacity="0.4"/>
      <text x="180" y="205" textAnchor="middle" fill={D.secondary}
        fontFamily="monospace" fontSize="6" letterSpacing="1.5" opacity="0.6">DEFENDANT</text>

      {/* ── "V." SEPARATOR ── */}
      <circle cx="120" cy="130" r="16" fill="#0A0A0C" opacity="0.95"/>
      <circle cx="120" cy="130" r="16" fill="none"
        stroke="#C0B040" strokeWidth="1.5" opacity="0.55"/>
      <text x="120" y="135" textAnchor="middle" fill="#C0B040"
        fontFamily="Georgia,serif" fontSize="13" fontWeight="bold" opacity="0.85">v.</text>

      {/* ── REWARD / PENALTY BANDS ── */}
      <rect x="0" y="215" width={W} height="42" fill="#060608" opacity="0.92"/>
      <line x1="0" y1="215" x2={W} y2="215" stroke="#C0B040" strokeWidth="0.8" opacity="0.3"/>
      <line x1="0" y1="257" x2={W} y2="257" stroke="#C0B040" strokeWidth="0.8" opacity="0.25"/>

      {/* Winner reward */}
      <text x="12" y="228" fill="#C0B040" fontFamily="monospace" fontSize="6.5"
        letterSpacing="2" opacity="0.65" fontWeight="bold">WINNER</text>
      <text x="12" y="240" fill="#D0E8D0" fontFamily="monospace" fontSize="6.5" opacity="0.6">
        +1 water claim  ·  +3 VP  ·  +1 PR
      </text>

      {/* Loser penalty */}
      <text x="12" y="250" fill="#C08080" fontFamily="monospace" fontSize="6.5"
        letterSpacing="2" opacity="0.55" fontWeight="bold">LOSER</text>
      <text x="12" y="261" fill="#E0C0C0" fontFamily="monospace" fontSize="6" opacity="0.5">
        −1 water claim  ·  −$2  ·  −1 PR
      </text>

      {/* Grain */}
      <rect width={W} height={H}
        fill="#C0B040" opacity="0.022"
        filter={`url(#g-${plaintiffId}-${defendantId})`}/>

      {/* ── BOTTOM TITLE BAND ── */}
      <rect x="0" y="277" width={W} height={H-277} fill="#060608" opacity="0.97"/>
      <line x1="0" y1="277" x2={W} y2="277" stroke="#C0B040" strokeWidth="2.5"/>
      <rect x="0" y="277" width={W} height="3"
        fill={mixed ? "#8060A0" : bothStates ? "#2A5C9A" : "#8A4020"} opacity="0.55"/>
      <text x="120" y="295" textAnchor="middle" fill="#C0B0E0"
        fontFamily="Georgia,serif" fontSize="6.5" letterSpacing="4"
        opacity="0.55" fontWeight="bold">SC CASE</text>
      <line x1="24" y1="299" x2="216" y2="299"
        stroke="#C0B040" strokeWidth="0.5" opacity="0.25"/>
      <text x="120" y="311" textAnchor="middle" fill="#F0ECD8"
        fontFamily="Georgia,serif" fontSize="10" letterSpacing="1.5" fontWeight="bold">
        {`${P.name.toUpperCase()} v. ${D.name.toUpperCase()}`}
      </text>
      <text x="120" y="325" textAnchor="middle" fill="#C0B040"
        fontFamily="monospace" fontSize="6" letterSpacing="2" opacity="0.45">
        {mixed ? "STATE v. TRIBAL NATION" : bothStates ? "STATE v. STATE" : "NATION v. NATION"}
      </text>
      <text x="120" y="336" textAnchor="middle" fill="#F0ECD8" opacity="0.3"
        fontFamily="Georgia,serif" fontSize="6" fontStyle="italic" letterSpacing="0.3">
        Colorado River Water Rights
      </text>
    </svg>
  );
}

// ── ALL 15 MATCHUPS ───────────────────────────────────────────────────────────
const ALL_CASES = [
  ["arizona",    "california", 1],
  ["arizona",    "nevada",     2],
  ["arizona",    "quechan",    3],
  ["arizona",    "chemehuevi", 4],
  ["arizona",    "fort_mohave",5],
  ["california", "nevada",     6],
  ["california", "quechan",    7],
  ["california", "chemehuevi", 8],
  ["california", "fort_mohave",9],
  ["nevada",     "quechan",    10],
  ["nevada",     "chemehuevi", 11],
  ["nevada",     "fort_mohave",12],
  ["quechan",    "chemehuevi", 13],
  ["quechan",    "fort_mohave",14],
  ["chemehuevi", "fort_mohave",15],
];

const FACTION_NAMES = {
  arizona:"Arizona", california:"California", nevada:"Nevada",
  quechan:"Quechan", chemehuevi:"Chemehuevi", fort_mohave:"Fort Mohave",
};

const ROTATIONS = [-1.8,1.5,-1.2,1.9,-0.8,1.4,-1.6,0.9,-1.3,1.7,-1.0,1.3,-0.7,1.6,-1.4];

// ── GALLERY ───────────────────────────────────────────────────────────────────
export default function SCCaseGallery() {
  const [focused, setFocused] = useState(null);
  const [filter, setFilter] = useState("all");

  const factionFilters = ["all", ...Object.keys(FACTION_NAMES)];

  const visible = ALL_CASES.filter(([p, d]) =>
    filter === "all" || p === filter || d === filter
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:"#030308",
      fontFamily:"Georgia,'Times New Roman',serif",
      color:"#D0C8B8",
    }}>
      {/* Header */}
      <div style={{ padding:"28px 44px 20px", borderBottom:"1px solid #10100E" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
          <div style={{flex:1, height:1, background:"linear-gradient(to right,transparent,#3A3420)"}}/>
          <span style={{fontSize:9, letterSpacing:"0.35em", color:"#3A3420",
            fontFamily:"monospace", textTransform:"uppercase"}}>
            The Law of the River · Digital Edition
          </span>
          <div style={{flex:1, height:1, background:"linear-gradient(to left,transparent,#3A3420)"}}/>
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:"clamp(18px,3vw,28px)",
          fontWeight:"normal", letterSpacing:"0.1em", color:"#E8E0C8" }}>
          SUPREME COURT CASE CARDS
        </h1>
        <p style={{ margin:0, fontSize:11, color:"#3A3420",
          letterSpacing:"0.12em", textTransform:"uppercase" }}>
          15 cases · C(6,2) all faction pairings · Colorado River water rights
        </p>
      </div>

      {/* Faction filter tabs */}
      <div style={{ padding:"16px 44px 0", display:"flex", gap:8, flexWrap:"wrap" }}>
        {factionFilters.map(f => {
          const fac = FACTIONS[f];
          const isActive = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding:"4px 12px", borderRadius:3, cursor:"pointer",
                border: `1px solid ${isActive ? (fac ? fac.primary : "#C0B040") : "#1A1A18"}`,
                background: isActive ? (fac ? fac.primary + "33" : "#C0B04022") : "transparent",
                color: isActive ? (fac ? fac.secondary : "#C0B040") : "#4A4438",
                fontFamily:"monospace", fontSize:10, letterSpacing:"0.1em",
                textTransform:"uppercase", transition:"all 0.2s",
              }}>
              {f === "all" ? `ALL (${ALL_CASES.length})` : `${FACTION_NAMES[f]} (5)`}
            </button>
          );
        })}
      </div>

      {/* Faction legend */}
      <div style={{ padding:"12px 44px 0", display:"flex", gap:20, flexWrap:"wrap" }}>
        {Object.entries(FACTIONS).map(([id, fac]) => (
          <div key={id} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:"50%",
              background:fac.primary, opacity:0.75 }}/>
            <span style={{ fontSize:9.5, color:"#3A3428", fontFamily:"monospace" }}>
              {fac.name} · {fac.type === "state" ? "State" : "Nation"}
            </span>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ padding:"36px 20px 28px", display:"flex",
        flexWrap:"wrap", gap:24, justifyContent:"center" }}>
        {visible.map(([p, d, seed], i) => {
          const cardId = `${p}-${d}`;
          const isFocused = focused === cardId;
          const rotIdx = ALL_CASES.findIndex(([cp,cd])=>cp===p&&cd===d);
          return (
            <div key={cardId}
              onClick={() => setFocused(isFocused ? null : cardId)}
              style={{
                width: 190,
                cursor:"pointer",
                position:"relative",
                zIndex: isFocused ? 20 : 1,
                transform: isFocused
                  ? "rotate(0deg) scale(1.14) translateY(-10px)"
                  : `rotate(${ROTATIONS[rotIdx]}deg) scale(1)`,
                transition:"transform 0.35s cubic-bezier(.22,.68,0,1.3), box-shadow 0.3s",
                boxShadow: isFocused
                  ? `0 28px 80px rgba(0,0,0,0.99), 0 0 0 2px #C0B040`
                  : "0 4px 20px rgba(0,0,0,0.88)",
                borderRadius:7, overflow:"hidden",
                flexShrink:0,
              }}>
              <div style={{
                position:"absolute", inset:0,
                border:"1px solid #C0B04022",
                borderRadius:7, zIndex:5, pointerEvents:"none",
              }}/>
              <SCCaseCard plaintiffId={p} defendantId={d} seed={seed}/>
            </div>
          );
        })}
      </div>

      {/* Count / rewards reminder */}
      <div style={{ padding:"8px 44px 28px", textAlign:"center" }}>
        <div style={{ display:"inline-block", padding:"10px 20px",
          border:"1px solid #1E1C14", borderRadius:4, fontSize:10,
          color:"#3A3420", fontFamily:"monospace", lineHeight:1.9, letterSpacing:"0.05em" }}>
          All 15 cases share identical rewards&nbsp;&nbsp;·&nbsp;&nbsp;
          Winner: +1 claim · +3 VP · +1 PR&nbsp;&nbsp;·&nbsp;&nbsp;
          Loser: −1 claim · −$2 · −1 PR<br/>
          Click to zoom · Filter by faction above · {visible.length} of 15 shown
        </div>
      </div>
    </div>
  );
}
