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

// ── CARD 1: FARMER A ─────────────────────────────────────────────────────────
// WPA harvest mural — farmer silhouette knee-deep in irrigated rows, arms wide
// beneath a massive golden sun. Water channels run between the furrows.
// Palette: harvest gold, earth brown, irrigation blue, sky amber
function CardFarmerA() {
  const furrows = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gF" seed={9} freq={0.85}/>
        <radialGradient id="sunF" cx="50%" cy="28%" r="55%">
          <stop offset="0%"   stopColor="#E8B820" stopOpacity="0.55"/>
          <stop offset="55%"  stopColor="#C87808" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#C87808" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#1A0E04"/>
      {/* Sky */}
      <rect width={W} height="195" fill="#3A1E04" opacity="0.85"/>
      <rect width={W} height="195" fill="url(#sunF)"/>

      {/* SUN — large, bold, WPA style */}
      <circle cx="120" cy="68" r="46" fill="#E8B820" opacity="0.22"/>
      <circle cx="120" cy="68" r="36" fill="#E8B820" opacity="0.3"/>
      <circle cx="120" cy="68" r="26" fill="#E8B820" opacity="0.55"/>
      {/* Sun rays — blocky WPA style */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r1 = 38, r2 = 58;
        return <line key={i}
          x1={120 + r1 * Math.cos(a)} y1={68 + r1 * Math.sin(a)}
          x2={120 + r2 * Math.cos(a)} y2={68 + r2 * Math.sin(a)}
          stroke="#E8B820" strokeWidth="3.5" opacity="0.28" strokeLinecap="round"/>;
      })}
      {/* Inner sun disc */}
      <circle cx="120" cy="68" r="20" fill="#E8C840" opacity="0.7"/>
      <circle cx="120" cy="68" r="12" fill="#F0DC80" opacity="0.6"/>

      {/* WHEAT STALKS — left and right flanks */}
      {[18, 30, 42, 196, 208, 220].map((x, i) => {
        const flip = x > 120;
        const h1 = 60 + (i % 3) * 15;
        return (
          <g key={i}>
            <line x1={x} y1={195} x2={x + (flip ? -4 : 4)} y2={195 - h1}
              stroke="#C89820" strokeWidth="2" opacity="0.55"/>
            {/* Wheat head */}
            <ellipse cx={x + (flip ? -5 : 5)} cy={195 - h1}
              rx="4" ry="10" fill="#C89820" opacity="0.5"
              transform={`rotate(${flip ? 15 : -15} ${x} ${195 - h1})`}/>
            {[0, 1, 2].map(j => (
              <line key={j}
                x1={x + (flip ? -4 : 4)} y1={195 - h1 + 4 + j * 5}
                x2={x + (flip ? -12 : 12)} y2={195 - h1 + 2 + j * 5}
                stroke="#C89820" strokeWidth="1.2" opacity="0.4"/>
            ))}
          </g>
        );
      })}

      {/* IRRIGATION FURROWS — converging perspective */}
      {furrows.map(i => {
        const y = 195 + i * 9;
        const spread = 8 + i * 14;
        return (
          <g key={i}>
            {/* Earth row */}
            <path d={`M${120 - spread},${y} Q120,${y - 3} ${120 + spread},${y}`}
              fill="#3A1E04" stroke="#5A3210" strokeWidth="0.8" opacity="0.7"/>
            {/* Water channel between furrows */}
            <path d={`M${120 - spread + 4},${y + 4} Q120,${y + 1} ${120 + spread - 4},${y + 4}`}
              stroke="#3A78A8" strokeWidth="1.4" fill="none" opacity={0.35 - i * 0.02}/>
          </g>
        );
      })}

      {/* FARMER FIGURE — standing in field, arms wide */}
      {/* Legs in furrows */}
      <path d="M108,278 L104,232 L120,228 L136,232 L132,278Z" fill="#C87808" opacity="0.85"/>
      {/* Boots */}
      <path d="M104,274 Q96,284 94,287 L116,287 L116,274Z" fill="#3A1E04"/>
      <path d="M136,274 Q144,284 146,287 L124,287 L124,274Z" fill="#3A1E04"/>
      {/* Body / overalls */}
      <path d="M96,228 L100,190 L120,185 L140,190 L144,228Z" fill="#3A5878" opacity="0.9"/>
      {/* Bib */}
      <rect x="110" y="188" width="20" height="24" rx="2" fill="#2A4868" opacity="0.8"/>
      {/* Suspenders */}
      <line x1="110" y1="188" x2="100" y2="210" stroke="#2A4868" strokeWidth="3" opacity="0.7"/>
      <line x1="130" y1="188" x2="140" y2="210" stroke="#2A4868" strokeWidth="3" opacity="0.7"/>
      {/* Left arm — wide open */}
      <path d="M100,200 L58,176 L54,186 L96,214Z" fill="#C87808" opacity="0.85"/>
      <ellipse cx="54" cy="181" rx="9" ry="7" fill="#A86808" opacity="0.9"/>
      {/* Right arm — wide open */}
      <path d="M140,200 L182,176 L186,186 L144,214Z" fill="#C87808" opacity="0.85"/>
      <ellipse cx="186" cy="181" rx="9" ry="7" fill="#A86808" opacity="0.9"/>
      {/* Head */}
      <ellipse cx="120" cy="176" rx="18" ry="19" fill="#C87808" opacity="0.9"/>
      {/* Straw hat */}
      <ellipse cx="120" cy="162" rx="24" ry="7" fill="#E8B820" opacity="0.75"/>
      <path d="M102,162 Q120,152 138,162" fill="#C89820" opacity="0.65"/>
      <rect x="108" y="155" width="24" height="8" rx="1" fill="#C89820" opacity="0.6"/>
      {/* Hat band */}
      <rect x="108" y="162" width="24" height="3" rx="1" fill="#3A1E04" opacity="0.5"/>
      {/* Simple face */}
      <line x1="114" y1="179" x2="120" y2="183" stroke="#3A1E04" strokeWidth="1.2"
        opacity="0.5" strokeLinecap="round"/>
      <line x1="126" y1="179" x2="120" y2="183" stroke="#3A1E04" strokeWidth="1.2"
        opacity="0.5" strokeLinecap="round"/>

      {/* Water channels running toward viewer */}
      {[72, 120, 168].map((x, i) => (
        <path key={i} d={`M${x},195 L${x + (x < 120 ? -10 : x > 120 ? 10 : 0)},290`}
          stroke="#3A78A8" strokeWidth="2" fill="none" opacity="0.22"/>
      ))}

      {/* Grain */}
      <rect width={W} height={H} fill="#E8B820" opacity="0.025" filter="url(#gF)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#3A1E04"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#E8B820" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#C87808" opacity="0.6"/>
      <text x="120" y="307" textAnchor="middle" fill="#F0DCA0"
        fontFamily="Georgia,serif" fontSize="13.5" letterSpacing="3.5" fontWeight="bold">FARMER</text>
      <text x="120" y="320" textAnchor="middle" fill="#E8B820"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">CITIZEN · 4 VP</text>
      <text x="120" y="334" textAnchor="middle" fill="#F0DCA0" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">The land drinks. The land gives.</text>
    </svg>
  );
}

// ── CARD 2: SERVICE WORKER A ──────────────────────────────────────────────────
// Commerce of the community — figure behind a market counter, scales of trade,
// shelves stocked behind them, coins on the counter. Warm market-day energy.
// Palette: warm terracotta, market amber, cream, slate blue
function CardServiceWorkerA() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gSA" seed={15} freq={0.87}/>
        <radialGradient id="warmSA" cx="50%" cy="42%" r="60%">
          <stop offset="0%"   stopColor="#C86820" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#180A04" stopOpacity="0.0"/>
        </radialGradient>
        <pattern id="tilesSA" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#3A1A08" strokeWidth="0.4" opacity="0.2"/>
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#180A04"/>
      <rect width={W} height={H} fill="url(#warmSA)"/>

      {/* Tiled floor */}
      <rect x="0" y="230" width={W} height="60" fill="url(#tilesSA)" opacity="0.8"/>
      <rect x="0" y="230" width={W} height="60" fill="#2A1208" opacity="0.7"/>

      {/* MARKET STALL AWNING */}
      <path d="M0,60 L0,44 L240,44 L240,60Z" fill="#C86820" opacity="0.8"/>
      {/* Awning stripes */}
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 30} y="44" width="15" height="16"
          fill="#A84810" opacity="0.5"/>
      ))}
      <line x1="0" y1="60" x2={W} y2="60" stroke="#E8A040" strokeWidth="1.5" opacity="0.6"/>
      {/* Hanging fringe */}
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1={5 + i * 10} y1="60" x2={3 + i * 10} y2="72"
          stroke="#E8A040" strokeWidth="1.2" opacity="0.35" strokeLinecap="round"/>
      ))}

      {/* SHELVES BEHIND COUNTER */}
      {[84, 124, 164].map((y, si) => (
        <g key={si}>
          <rect x="8" y={y} width="224" height="5" rx="1" fill="#3A1A08" opacity="0.85"/>
          {/* Items on shelf */}
          {Array.from({ length: 8 }, (_, i) => {
            const shapes = [
              <rect key="r" x={14 + i * 27} y={y - 22} width="14" height="22" rx="2"
                fill="#8A4828" opacity={0.5 + (i % 3) * 0.1}/>,
              <ellipse key="e" cx={14 + i * 27 + 7} cy={y - 12} rx="7" ry="10"
                fill="#5A7828" opacity={0.5 + (i % 3) * 0.1}/>,
              <path key="p" d={`M${14 + i * 27},${y} L${14 + i * 27 + 7},${y - 20} L${14 + i * 27 + 14},${y}Z`}
                fill="#7A5820" opacity={0.5 + (i % 3) * 0.1}/>,
            ];
            return shapes[(i + si) % 3];
          })}
        </g>
      ))}

      {/* COUNTER */}
      <rect x="0" y="208" width={W} height="22" rx="0" fill="#5A2A10"/>
      <rect x="0" y="206" width={W} height="5" rx="1" fill="#7A3A18" opacity="0.9"/>
      <rect x="0" y="228" width={W} height="3" fill="#3A1608" opacity="0.9"/>
      {/* Counter edge detail */}
      <line x1="0" y1="207" x2={W} y2="207" stroke="#E8A040" strokeWidth="0.8" opacity="0.3"/>

      {/* COINS on counter */}
      {[[38, 212], [56, 210], [72, 213], [168, 211], [186, 213], [202, 210]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="7" fill="#E8A040" opacity="0.45"/>
          <circle cx={x} cy={y} r="5" fill="none" stroke="#C88020" strokeWidth="1" opacity="0.4"/>
          <text x={x} y={y + 2.5} textAnchor="middle" fill="#C88020"
            fontSize="6" opacity="0.55" fontFamily="Georgia,serif">$</text>
        </g>
      ))}

      {/* TRADE SCALES on counter */}
      <line x1="118" y1="170" x2="118" y2="208" stroke="#E8A040" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="118" cy="168" r="4" fill="#E8A040" opacity="0.55"/>
      {/* Beam */}
      <rect x="94" y="176" width="48" height="4" rx="1" fill="#C88020" opacity="0.6"
        transform="rotate(5 118 178)"/>
      {/* Left pan */}
      <path d="M88,192 Q98,198 108,192" stroke="#E8A040" strokeWidth="2" fill="none"
        strokeLinecap="round" transform="rotate(5 118 178)" opacity="0.6"/>
      <line x1="97" y1="182" x2="97" y2="192" stroke="#E8A040" strokeWidth="1" opacity="0.5"
        transform="rotate(5 118 178)"/>
      {/* Right pan */}
      <path d="M126,188 Q136,194 146,188" stroke="#E8A040" strokeWidth="2" fill="none"
        strokeLinecap="round" transform="rotate(5 118 178)" opacity="0.6"/>
      <line x1="137" y1="178" x2="137" y2="188" stroke="#E8A040" strokeWidth="1" opacity="0.5"
        transform="rotate(5 118 178)"/>

      {/* SERVICE WORKER FIGURE — behind counter */}
      {/* Body */}
      <path d="M94,206 L96,170 L120,164 L144,170 L146,206Z" fill="#C86820" opacity="0.88"/>
      {/* Apron */}
      <path d="M106,168 L108,204 L132,204 L134,168 Q120,162 106,168Z" fill="#E8D0A0" opacity="0.55"/>
      {/* Apron ties */}
      <line x1="108" y1="172" x2="96" y2="178" stroke="#E8D0A0" strokeWidth="1.5" opacity="0.4"/>
      <line x1="132" y1="172" x2="144" y2="178" stroke="#E8D0A0" strokeWidth="1.5" opacity="0.4"/>
      {/* Head */}
      <ellipse cx="120" cy="152" rx="18" ry="19" fill="#C86820" opacity="0.9"/>
      {/* Hair / bun */}
      <ellipse cx="120" cy="137" rx="14" ry="8" fill="#3A1A08" opacity="0.7"/>
      <ellipse cx="130" cy="134" rx="7" ry="7" fill="#3A1A08" opacity="0.6"/>
      {/* Friendly expression */}
      <path d="M112,155 Q120,162 128,155" fill="none" stroke="#3A1A08"
        strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
      <circle cx="114" cy="151" r="1.5" fill="#3A1A08" opacity="0.4"/>
      <circle cx="126" cy="151" r="1.5" fill="#3A1A08" opacity="0.4"/>
      {/* Left hand extended over counter */}
      <path d="M96,180 L70,192 L68,200 L94,190Z" fill="#C86820" opacity="0.85"/>
      <ellipse cx="66" cy="196" rx="9" ry="6.5" fill="#A85818" opacity="0.9"/>
      {/* Right hand */}
      <path d="M144,182 L168,190 L166,200 L146,192Z" fill="#C86820" opacity="0.85"/>

      {/* Discard warning — PR threshold band */}
      <rect x="4" y="73" width="80" height="9" rx="2" fill="#8A1808" opacity="0.55"/>
      <text x="44" y="80" textAnchor="middle" fill="#F0C0A0"
        fontFamily="monospace" fontSize="5.5" letterSpacing="1" opacity="0.8">DISCARD IF PR ≤ 4</text>

      {/* Grain */}
      <rect width={W} height={H} fill="#C86820" opacity="0.028" filter="url(#gSA)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#3A1208"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#E8A040" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#C86820" opacity="0.65"/>
      <text x="120" y="306" textAnchor="middle" fill="#F0E0C0"
        fontFamily="Georgia,serif" fontSize="11" letterSpacing="2.5" fontWeight="bold">SERVICE WORKER</text>
      <text x="120" y="319" textAnchor="middle" fill="#E8A040"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">CITIZEN · 2 VP</text>
      <text x="120" y="334" textAnchor="middle" fill="#F0E0C0" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Commerce flows where water does.</text>
    </svg>
  );
}

// ── CARD 3: SERVICE WORKER B ──────────────────────────────────────────────────
// The community organizer — service worker who moonlights as a protest
// instigator. Figure pinning a notice to a community board, crowd gathering.
// Palette: deep plum-grey, protest red, community cream, muted olive
function CardServiceWorkerB() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gSB" seed={21} freq={0.90}/>
        <radialGradient id="lampSB" cx="56%" cy="35%" r="48%">
          <stop offset="0%"   stopColor="#C87820" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#C87820" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#100C10"/>
      <rect width={W} height={H} fill="url(#lampSB)"/>

      {/* COMMUNITY NOTICE BOARD — main composition element */}
      <rect x="18" y="18" width="168" height="188" rx="3" fill="#2A1E08" opacity="0.9"/>
      <rect x="18" y="18" width="168" height="188" rx="3" fill="none"
        stroke="#8A6828" strokeWidth="2" opacity="0.55"/>
      {/* Cork texture — small dots */}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={28 + (i % 8) * 20} cy={28 + Math.floor(i / 8) * 30}
          r="1.5" fill="#6A4818" opacity={0.15 + (i % 3) * 0.08}/>
      ))}

      {/* PINNED NOTICES on board */}
      {[
        { x: 24, y: 22, w: 54, h: 38, rot: -3, col: "#E8DCC0", headline: true },
        { x: 86, y: 25, w: 46, h: 32, rot: 5,  col: "#D0C8A8", headline: false },
        { x: 138, y: 20, w: 42, h: 44, rot: -6, col: "#E0D4B0", headline: false },
        { x: 22, y: 70, w: 48, h: 55, rot: 2,  col: "#C8DCC0", headline: false },
        { x: 80, y: 68, w: 56, h: 42, rot: -4, col: "#E8DCC0", headline: true  },
        { x: 144, y: 74, w: 38, h: 48, rot: 6,  col: "#DCD0B0", headline: false },
        { x: 24, y: 138, w: 62, h: 44, rot: -2, col: "#D8D0B0", headline: false },
        { x: 96, y: 132, w: 44, h: 50, rot: 4,  col: "#F0E4C8", headline: true  },
        { x: 148, y: 134, w: 36, h: 52, rot: -5, col: "#E4D8B8", headline: false },
      ].map(({ x, y, w, h, rot, col, headline }, i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="1.5"
            fill={col} opacity={0.55 + (headline ? 0.2 : 0)}
            transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}/>
          {/* Text lines */}
          {Array.from({ length: Math.floor(h / 9) - 1 }, (_, j) => (
            <line key={j} x1={x + 4} y1={y + 10 + j * 8} x2={x + w - 4} y2={y + 10 + j * 8}
              stroke="#3A2A10" strokeWidth={j === 0 && headline ? 1.8 : 0.7}
              opacity={j === 0 && headline ? 0.6 : 0.25}
              transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}/>
          ))}
          {/* Headline red bar on featured notices */}
          {headline && (
            <rect x={x + 2} y={y + 2} width={w - 4} height="7" rx="1"
              fill="#A81808" opacity="0.45"
              transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}/>
          )}
          {/* Thumbtack */}
          <circle cx={x + w / 2} cy={y} r="3" fill="#C87820" opacity="0.7"
            transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}/>
        </g>
      ))}

      {/* ACTIVE PROTEST NOTICE — freshly pinned, center */}
      <rect x="54" y="84" width="76" height="55" rx="2"
        fill="#C81808" opacity="0.82" transform="rotate(-1 92 111)"/>
      <text x="92" y="102" textAnchor="middle" fill="#F8E8D0"
        fontFamily="Georgia,serif" fontSize="9" fontWeight="bold" letterSpacing="1.5"
        transform="rotate(-1 92 111)">PROTEST</text>
      <text x="92" y="114" textAnchor="middle" fill="#F8E8D0"
        fontFamily="Georgia,serif" fontSize="7" letterSpacing="1"
        transform="rotate(-1 92 111)">RIVER AT RISK</text>
      {[0, 1, 2].map(j => (
        <line key={j} x1="60" y1={122 + j * 7} x2="124" y2={122 + j * 7}
          stroke="#F8E8D0" strokeWidth="0.8" opacity="0.3"
          transform="rotate(-1 92 111)"/>
      ))}
      {/* Thumbtack on protest notice */}
      <circle cx="92" cy="84" r="4" fill="#E8A020" opacity="0.85"
        transform="rotate(-1 92 111)"/>

      {/* FIGURE — pinning notice to board */}
      {/* Standing at right edge of board */}
      <path d="M182,266 L185,218 L200,214 L215,218 L218,266Z" fill="#5A3868" opacity="0.9"/>
      <ellipse cx="200" cy="204" rx="16" ry="17" fill="#5A3868" opacity="0.9"/>
      {/* Work uniform collar */}
      <path d="M186,216 L196,228 L200,224 L204,228 L214,216 L210,222 L200,230 L190,222Z"
        fill="#3A2048" opacity="0.7"/>
      {/* Left arm reaching to board */}
      <path d="M186,224 L168,204 L165,212 L183,232Z" fill="#5A3868" opacity="0.88"/>
      <ellipse cx="164" cy="208" rx="8" ry="6" fill="#4A2858" opacity="0.9"/>
      {/* Right arm at side */}
      <path d="M214,224 L232,240 L228,248 L212,234Z" fill="#5A3868" opacity="0.88"/>
      {/* Hair */}
      <ellipse cx="200" cy="192" rx="16" ry="7" fill="#1C0C18" opacity="0.8"/>
      {/* Face — looking at board */}
      <circle cx="193" cy="205" r="2" fill="#1C0C18" opacity="0.4"/>

      {/* Small crowd gathering below */}
      {[12, 34, 54, 72, 90].map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={254 + (i % 2) * 4} rx="8" ry="8.5" fill="#5A3868" opacity="0.3"/>
          <rect x={x - 7} y={262 + (i % 2) * 4} width="14" height="16" rx="1.5"
            fill="#5A3868" opacity="0.24"/>
        </g>
      ))}

      {/* Discard warning */}
      <rect x="196" y="73" width="36" height="9" rx="2" fill="#8A1808" opacity="0.5"/>
      <text x="214" y="80" textAnchor="middle" fill="#F0C0A0"
        fontFamily="monospace" fontSize="4.5" letterSpacing="0.5" opacity="0.75">PR ≤ 0 → DISCARD</text>

      {/* Grain */}
      <rect width={W} height={H} fill="#5A3868" opacity="0.025" filter="url(#gSB)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#1E1020"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#C87820" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#A81808" opacity="0.6"/>
      <text x="120" y="306" textAnchor="middle" fill="#E8DCD0"
        fontFamily="Georgia,serif" fontSize="11" letterSpacing="2.5" fontWeight="bold">SERVICE WORKER</text>
      <text x="120" y="319" textAnchor="middle" fill="#C87820"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">CITIZEN · 1 VP</text>
      <text x="120" y="334" textAnchor="middle" fill="#E8DCD0" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Every community has a breaking point.</text>
    </svg>
  );
}

// ── CARD 4: FIREFIGHTER A ─────────────────────────────────────────────────────
// Heroic silhouette against a wall of fire, water hose arcing overhead.
// Fellow firefighters in the background. Bold WPA propaganda energy.
// Palette: deep soot-black, fire orange, hose-water blue, ash white
function CardFirefighterA() {
  const flames = [
    "M20,195 C14,170 18,150 28,140 C22,155 32,165 30,180 C38,160 44,140 50,125 C48,148 58,162 54,185 C62,158 72,138 76,118 C72,145 80,162 78,188",
    "M76,188 C78,158 88,132 98,110 C94,138 104,155 100,180 C110,152 118,128 122,105 C118,132 128,152 124,178",
    "M124,178 C126,150 136,126 146,108 C142,136 152,152 148,176 C158,148 168,124 172,106 C168,132 176,152 174,178",
    "M174,178 C178,155 188,132 196,115 C192,140 200,158 196,182 C204,158 214,138 220,122 C216,148 222,165 218,192",
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <GrainDef id="gFF" seed={11} freq={0.86}/>
        <radialGradient id="fireGlow" cx="50%" cy="65%" r="58%">
          <stop offset="0%"   stopColor="#E84808" stopOpacity="0.45"/>
          <stop offset="65%"  stopColor="#C83808" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#080402" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#080402"/>
      <rect width={W} height={H} fill="url(#fireGlow)"/>

      {/* Smoke sky */}
      <rect width={W} height="160" fill="#180C04" opacity="0.7"/>
      {/* Smoke billows */}
      {[[40, 30, 50], [110, 20, 60], [185, 35, 45]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.6}
          fill="#1A1208" opacity={0.4 + i * 0.05}/>
      ))}

      {/* BUILDING — on fire */}
      <rect x="44" y="80" width="152" height="160" fill="#1A0C04" opacity="0.95"/>
      {/* Windows — some glowing orange */}
      {[
        [56, 94, true], [80, 94, false], [104, 94, true], [128, 94, false],
        [152, 94, true], [176, 94, false],
        [56, 128, false], [80, 128, true], [104, 128, false], [128, 128, true],
        [152, 128, false], [176, 128, true],
        [56, 162, true], [80, 162, false], [104, 162, true], [128, 162, false],
      ].map(([x, y, fire], i) => (
        <rect key={i} x={x} y={y} width="16" height="14" rx="1"
          fill={fire ? "#E84808" : "#1A1208"}
          opacity={fire ? 0.65 : 0.3}/>
      ))}
      {/* Door */}
      <rect x="102" y="216" width="36" height="24" rx="1" fill="#0C0602" opacity="0.9"/>

      {/* FIRE WALL — bottom of building */}
      {flames.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke={i % 2 === 0 ? "#E84808" : "#E8A020"}
          strokeWidth="12" opacity={0.35 - i * 0.02}
          strokeLinecap="round"/>
      ))}
      {flames.map((d, i) => (
        <path key={`f2-${i}`} d={d} fill="none"
          stroke="#F8D040" strokeWidth="4" opacity={0.15}
          strokeLinecap="round"/>
      ))}

      {/* WATER ARC — hose arcing over the fire */}
      <path d="M8,235 Q80,80 240,185"
        stroke="#3A8AB8" strokeWidth="5" fill="none" opacity="0.65"
        strokeLinecap="round"/>
      <path d="M8,237 Q82,82 240,187"
        stroke="#6AB8E0" strokeWidth="2" fill="none" opacity="0.35"
        strokeLinecap="round"/>
      {/* Water spray droplets at impact */}
      {[[210, 172], [224, 178], [232, 190], [218, 194], [205, 183]].map(([x, y], i) => (
        <path key={i}
          d={`M${x},${y + 6} C${x - 3},${y + 2} ${x - 3},${y - 1} ${x},${y - 5} C${x + 3},${y - 1} ${x + 3},${y + 2} ${x},${y + 6}Z`}
          fill="#6AB8E0" opacity={0.4 + i * 0.05}/>
      ))}

      {/* BACKGROUND FIREFIGHTERS — silhouettes */}
      {[[28, 230], [52, 226], [186, 228], [210, 232]].map(([x, y], i) => (
        <g key={i} opacity="0.35">
          <ellipse cx={x} cy={y - 32} rx="10" ry="11" fill="#E84808"/>
          {/* Helmet */}
          <path d={`M${x - 14},${y - 38} Q${x},${y - 50} ${x + 14},${y - 38} L${x + 14},${y - 34} L${x - 14},${y - 34}Z`}
            fill="#C83808"/>
          <rect x={x - 7} y={y - 20} width="14" height="20" rx="1" fill="#E84808"/>
        </g>
      ))}

      {/* HERO FIREFIGHTER — foreground, facing fire */}
      {/* Legs */}
      <path d="M96,282 L98,240 L120,236 L142,240 L144,282Z" fill="#3A2818" opacity="0.95"/>
      {/* Boots */}
      <path d="M98,276 Q90,286 88,290 L110,290 L110,276Z" fill="#1A0C04"/>
      <path d="M142,276 Q150,286 152,290 L130,290 L130,276Z" fill="#1A0C04"/>
      {/* Coat body */}
      <path d="M86,238 L90,200 L120,195 L150,200 L154,238Z" fill="#3A2818" opacity="0.95"/>
      {/* Reflective stripes */}
      <path d="M88,224 L152,224" stroke="#E8A020" strokeWidth="3" opacity="0.5"/>
      <path d="M90,214 L150,214" stroke="#E8A020" strokeWidth="2" opacity="0.35"/>
      {/* Coat collar / flap */}
      <path d="M104,198 L110,212 L120,208 L130,212 L136,198 L132,206 L120,213 L108,206Z"
        fill="#2A1A0C" opacity="0.75"/>
      {/* Arms — one raised holding hose nozzle */}
      <path d="M90,210 L54,188 L50,198 L86,222Z" fill="#3A2818" opacity="0.9"/>
      <ellipse cx="50" cy="193" rx="10" ry="7.5" fill="#2A1A0C" opacity="0.95"/>
      {/* HOSE NOZZLE */}
      <path d="M38,192 L54,190 L58,197 L42,198Z" fill="#5A5850" opacity="0.9"/>
      <ellipse cx="38" cy="195" rx="5" ry="4" fill="#3A3830" opacity="0.8"/>
      {/* Right arm — braced on hose */}
      <path d="M150,212 L172,196 L176,204 L154,220Z" fill="#3A2818" opacity="0.9"/>
      {/* Head */}
      <ellipse cx="120" cy="184" rx="18" ry="18" fill="#5A4030" opacity="0.9"/>
      {/* HELMET */}
      <path d="M100,182 Q120,164 140,182 L140,188 L100,188Z" fill="#C83808" opacity="0.9"/>
      <rect x="98" y="186" width="44" height="5" rx="1" fill="#A82808" opacity="0.8"/>
      {/* Brim */}
      <path d="M92,188 L148,188 L150,192 L90,192Z" fill="#C83808" opacity="0.7"/>
      {/* Visor */}
      <path d="M102,188 Q120,183 138,188" fill="none" stroke="#E8A020"
        strokeWidth="1.5" opacity="0.5"/>
      {/* Face — determined, eyes barely visible through smoke */}
      <rect x="108" y="185" width="24" height="7" rx="2" fill="#4A3020" opacity="0.65"/>

      {/* Ember sparks */}
      {[[68, 88], [148, 72], [192, 60], [36, 112], [220, 100], [164, 48]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5 + (i % 3)}
          fill="#E8A020" opacity={0.25 + (i % 3) * 0.1}/>
      ))}

      {/* Grain */}
      <rect width={W} height={H} fill="#E84808" opacity="0.028" filter="url(#gFF)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H - 287} fill="#180804"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#E8A020" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#E84808" opacity="0.65"/>
      <text x="120" y="307" textAnchor="middle" fill="#F0E4D0"
        fontFamily="Georgia,serif" fontSize="13.5" letterSpacing="3.5" fontWeight="bold">FIREFIGHTER</text>
      <text x="120" y="320" textAnchor="middle" fill="#E8A020"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">CITIZEN</text>
      <text x="120" y="334" textAnchor="middle" fill="#F0E4D0" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Water saves. Water protects.</text>
    </svg>
  );
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
const CARDS = [
  {
    id: "farmer-a",
    Component: CardFarmerA,
    label: "Farmer A",
    accent: "#E8B820",
    vp: "4 VP",
    note: "C: +2 VP on fully watered farms",
  },
  {
    id: "service-worker-a",
    Component: CardServiceWorkerA,
    label: "Service Worker A",
    accent: "#E8A040",
    vp: "2 VP",
    note: "Discard if PR ≤ 4",
  },
  {
    id: "service-worker-b",
    Component: CardServiceWorkerB,
    label: "Service Worker B",
    accent: "#C87820",
    vp: "1 VP",
    note: "Discard if PR ≤ 0",
  },
  {
    id: "firefighter-a",
    Component: CardFirefighterA,
    label: "Firefighter A",
    accent: "#E8A020",
    vp: "—",
    note: "C: 1 VP per Firefighter in tableau",
  },
];

const ROTATIONS = [-2.2, 1.7, -1.4, 2.5];

export default function CitizenCardGallery() {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080604",
      fontFamily: "Georgia, 'Times New Roman', serif",
      color: "#E8DCC8",
    }}>
      {/* Header */}
      <div style={{ padding: "32px 44px 24px", borderBottom: "1px solid #1E180C" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #5A4010)" }}/>
          <span style={{ fontSize: 9, letterSpacing: "0.35em", color: "#5A4010",
            fontFamily: "monospace", textTransform: "uppercase" }}>
            The Law of the River · Digital Edition
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #5A4010)" }}/>
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: "clamp(20px,3.5vw,32px)",
          fontWeight: "normal", letterSpacing: "0.1em", color: "#F0E4C8" }}>
          CITIZEN CARDS
        </h1>
        <p style={{ margin: 0, fontSize: 11, color: "#4A3810",
          letterSpacing: "0.15em", textTransform: "uppercase" }}>
          4 community archetypes · WPA mural aesthetic · earned by completing projects
        </p>
      </div>

      {/* Cards */}
      <div style={{ padding: "48px 28px 36px", display: "flex",
        flexWrap: "wrap", gap: 36, justifyContent: "center" }}>
        {CARDS.map((card, i) => {
          const isFocused = focused === card.id;
          return (
            <div key={card.id} style={{ display: "flex", flexDirection: "column",
              alignItems: "center", gap: 10 }}>
              <div
                onClick={() => setFocused(isFocused ? null : card.id)}
                style={{
                  width: 210,
                  cursor: "pointer",
                  position: "relative",
                  zIndex: isFocused ? 20 : 1,
                  transform: isFocused
                    ? "rotate(0deg) scale(1.12) translateY(-8px)"
                    : `rotate(${ROTATIONS[i]}deg) scale(1)`,
                  transition: "transform 0.35s cubic-bezier(.22,.68,0,1.3), box-shadow 0.3s",
                  boxShadow: isFocused
                    ? `0 28px 80px rgba(0,0,0,0.98), 0 0 0 2px ${card.accent}`
                    : "0 6px 28px rgba(0,0,0,0.85)",
                  borderRadius: 7,
                  overflow: "hidden",
                }}>
                <div style={{
                  position: "absolute", inset: 0,
                  border: `1px solid ${card.accent}33`,
                  borderRadius: 7, zIndex: 5, pointerEvents: "none",
                }}/>
                <card.Component/>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#5A4010", letterSpacing: "0.1em",
                  textTransform: "uppercase", fontFamily: "monospace" }}>
                  {card.vp} · {card.note}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "0 44px 32px", textAlign: "center", fontSize: 11,
        color: "#2A200C", letterSpacing: "0.08em", lineHeight: 1.9 }}>
        Click any card to focus · Earned by completing citizen projects · Pure SVG art
      </div>
    </div>
  );
}
