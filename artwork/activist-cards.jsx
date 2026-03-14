import { useState } from "react";

const W = 240, H = 340;

// ── SHARED GRAIN FILTER ───────────────────────────────────────────────────────
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

// ── CARD A: THE DIVERTER ──────────────────────────────────────────────────────
// Controls the flow — figure crouched at a massive pipe valve, river visible
// through an industrial grate, water rushing or being cut off.
// Palette: deep teal-black, pipe-iron grey, turbulent blue, rust orange accent
function CardActivistA() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display:"block", width:"100%", height:"100%" }}>
      <defs>
        <GrainDef id="gA" seed={13} freq={0.86}/>
        <radialGradient id="vigA" cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor="#082838" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#020C10" stopOpacity="0.75"/>
        </radialGradient>
        <pattern id="grate" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="none"/>
          <line x1="0" y1="0" x2="12" y2="0" stroke="#1A4858" strokeWidth="1.5" opacity="0.5"/>
          <line x1="0" y1="6" x2="12" y2="6" stroke="#1A4858" strokeWidth="0.8" opacity="0.3"/>
          <line x1="0" y1="0" x2="0" y2="12" stroke="#1A4858" strokeWidth="1.5" opacity="0.5"/>
          <line x1="6" y1="0" x2="6" y2="12" stroke="#1A4858" strokeWidth="0.8" opacity="0.3"/>
        </pattern>
      </defs>

      <rect width={W} height={H} fill="#050F14"/>
      <rect width={W} height={H} fill="url(#vigA)"/>

      {/* Background — underground tunnel / pipe chamber */}
      <rect x="0" y="80" width={W} height="180" fill="#0A1E28" opacity="0.6"/>
      {/* Curved tunnel arch */}
      <path d="M-10,160 Q120,60 250,160" fill="none" stroke="#1A4858" strokeWidth="2" opacity="0.3"/>
      {/* Riveted wall panels */}
      {[[12,90,48,80],[70,90,48,80],[128,90,48,80],[186,90,48,80],
        [12,180,48,80],[70,180,48,80],[128,180,48,80],[186,180,48,80]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h} rx="1"
          fill="none" stroke="#1A4858" strokeWidth="0.8" opacity="0.2"/>
      ))}
      {/* Rivet dots */}
      {[14,62,110,158,206].map((x,i)=>([92,170].map((y,j)=>(
        <circle key={`r-${i}-${j}`} cx={x} cy={y} r="2" fill="#1A4858" opacity="0.3"/>
      ))))}

      {/* WATER FLOWING THROUGH GRATE — bottom */}
      <rect x="30" y="228" width="180" height="44" fill="url(#grate)"/>
      {/* Water shimmer beneath grate */}
      {[0,1,2,3].map(i=>(
        <path key={i}
          d={`M30,${236+i*8} Q90,${231+i*8} 150,${236+i*8} Q200,${241+i*8} 230,${236+i*8}`}
          stroke="#2A8AB8" strokeWidth="1.8" fill="none" opacity={0.4-i*0.06}/>
      ))}

      {/* MAIN PIPE — horizontal crossing */}
      <rect x="0" y="138" width="240" height="36" rx="4" fill="#1C2E38"/>
      <rect x="0" y="138" width="240" height="36" rx="4" fill="none"
        stroke="#2A4858" strokeWidth="2" opacity="0.7"/>
      {/* Pipe highlight */}
      <rect x="0" y="140" width="240" height="6" rx="3" fill="#3A6878" opacity="0.2"/>
      {/* Pipe seams */}
      {[60,120,180].map((x,i)=>(
        <rect key={i} x={x-2} y="136" width="4" height="40" rx="1"
          fill="#0A1820" opacity="0.7"/>
      ))}
      {/* Flow direction arrow inside pipe */}
      <path d="M80,156 L110,156 L104,150 M110,156 L104,162"
        stroke="#2A8AB8" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
      <path d="M130,156 L160,156 L154,150 M160,156 L154,162"
        stroke="#2A8AB8" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>

      {/* VALVE — large central wheel */}
      <circle cx="120" cy="156" r="32" fill="#0A1820"/>
      <circle cx="120" cy="156" r="32" fill="none" stroke="#C87020" strokeWidth="2.5" opacity="0.8"/>
      <circle cx="120" cy="156" r="24" fill="none" stroke="#C87020" strokeWidth="1.2" opacity="0.5"/>
      <circle cx="120" cy="156" r="8" fill="#C87020" opacity="0.6"/>
      {/* Valve spokes */}
      {[0,1,2,3,4,5].map(i=>{
        const a = (i/6)*Math.PI*2;
        return <line key={i}
          x1={120+8*Math.cos(a)} y1={156+8*Math.sin(a)}
          x2={120+24*Math.cos(a)} y2={156+24*Math.sin(a)}
          stroke="#C87020" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>;
      })}
      {/* Valve shine */}
      <circle cx="114" cy="149" r="4" fill="#E89040" opacity="0.25"/>

      {/* FIGURE — crouched at valve, both hands gripping */}
      {/* Body crouched low */}
      <path d="M78,192 Q86,175 104,172 Q118,170 132,175 Q148,180 154,198 L140,202 Q128,188 120,188 Q112,188 100,202Z"
        fill="#2A7848"/>
      {/* Head */}
      <ellipse cx="120" cy="163" rx="14" ry="15" fill="#2A7848"/>
      {/* Hard hat */}
      <ellipse cx="120" cy="155" rx="17" ry="8" fill="#C87020" opacity="0.85"/>
      <rect x="103" y="151" width="34" height="6" rx="1" fill="#C87020" opacity="0.7"/>
      {/* Left arm reaching to valve */}
      <path d="M100,178 Q106,166 112,158 L116,162 Q111,170 106,182Z" fill="#2A7848"/>
      {/* Right arm */}
      <path d="M140,178 Q134,166 128,158 L124,162 Q129,170 134,182Z" fill="#2A7848"/>
      {/* Hands on valve */}
      <ellipse cx="112" cy="160" rx="6" ry="5" fill="#1A5838" opacity="0.9"/>
      <ellipse cx="128" cy="160" rx="6" ry="5" fill="#1A5838" opacity="0.9"/>
      {/* Legs */}
      <path d="M96,200 L88,228 L100,230 L108,208Z" fill="#2A7848"/>
      <path d="M144,200 L152,228 L140,230 L132,208Z" fill="#2A7848"/>
      {/* Boots */}
      <path d="M88,228 Q82,238 80,240 L102,240 L100,228Z" fill="#1A2830"/>
      <path d="M152,228 Q158,238 160,240 L138,240 L140,228Z" fill="#1A2830"/>

      {/* Water drops / splash at valve */}
      {[[95,132],[132,128],[108,122],[148,135]].map(([x,y],i)=>(
        <path key={i}
          d={`M${x},${y+7} C${x-4},${y+2} ${x-4},${y-2} ${x-4},${y-3} C${x-4},${y-7} ${x},${y-7} C${x+4},${y-7} ${x+4},${y-3} ${x+4},${y-2} C${x+4},${y+2} ${x},${y+7}Z`}
          fill="#2A8AB8" opacity={0.35+i*0.07}/>
      ))}

      {/* Grain overlay */}
      <rect width={W} height={H} fill="#2A8AB8" opacity="0.03" filter="url(#gA)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H-287} fill="#0A2030"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#C87020" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#2A8AB8" opacity="0.5"/>
      <text x="120" y="307" textAnchor="middle" fill="#D0F0E8"
        fontFamily="Georgia,serif" fontSize="13.5" letterSpacing="3.5" fontWeight="bold">ACTIVIST</text>
      <text x="120" y="320" textAnchor="middle" fill="#C87020"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">THE DIVERTER</text>
      <text x="120" y="334" textAnchor="middle" fill="#D0F0E8" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Turn the flow. Shift the claim.</text>
    </svg>
  );
}

// ── CARD B: THE AGITATOR ──────────────────────────────────────────────────────
// Protest escalation — figure on a soapbox, megaphone raised, crowd behind,
// adding a match to a powder keg (protest card to deck). Urgent red/black energy.
// Palette: near-black, agitation red, rally cream, smouldering orange
function CardActivistB() {
  const crowd = [10,28,46,64,84,104,124,144,164,184,204,224];
  const crowdH = [242,238,245,240,243,237,244,241,246,239,244,241];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display:"block", width:"100%", height:"100%" }}>
      <defs>
        <GrainDef id="gB" seed={19} freq={0.89}/>
        <radialGradient id="vigB" cx="48%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#380808" stopOpacity="0.05"/>
          <stop offset="100%" stopColor="#080202" stopOpacity="0.8"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#0C0404"/>
      <rect width={W} height={H} fill="url(#vigB)"/>

      {/* Sky — agitation gradient */}
      <rect width={W} height="200" fill="#380808" opacity="0.22"/>
      <rect width={W} y="0" height="100" fill="#C82020" opacity="0.1"/>

      {/* LARGE FIST SILHOUETTE — background watermark */}
      <path
        d="M68,20 C64,8 72,2 82,6 C88,2 96,4 98,12 C104,8 112,10 112,20 C118,16 126,20 124,30
           L122,60 L116,68 L96,72 L76,72 L62,62 L58,44 C54,36 58,22 68,20Z"
        fill="#C82020" opacity="0.06"/>

      {/* Radial energy lines from speaker figure */}
      {Array.from({length:22},(_,i)=>{
        const a = (i/22)*Math.PI*2;
        return <line key={i}
          x1={120+28*Math.cos(a)} y1={128+28*Math.sin(a)}
          x2={120+100*Math.cos(a)} y2={128+100*Math.sin(a)}
          stroke="#C82020" strokeWidth="0.7" opacity="0.1"/>;
      })}

      {/* SOAPBOX */}
      <rect x="84" y="198" width="72" height="30" rx="2" fill="#2A1808"/>
      <rect x="84" y="198" width="72" height="30" rx="2" fill="none"
        stroke="#C87020" strokeWidth="1.5" opacity="0.5"/>
      {/* Soapbox text */}
      <text x="120" y="217" textAnchor="middle" fill="#C87020"
        fontFamily="Georgia,serif" fontSize="7" letterSpacing="2" opacity="0.55">PEOPLE'S RIVER</text>

      {/* SPEAKER FIGURE */}
      {/* Body */}
      <path d="M100,196 L102,170 L120,165 L138,170 L140,196Z" fill="#C82020"/>
      {/* Head */}
      <ellipse cx="120" cy="154" rx="16" ry="17" fill="#C82020"/>
      {/* Open mouth (speaking) */}
      <path d="M113,158 Q120,164 127,158" fill="#0C0404" opacity="0.7"/>
      {/* RIGHT ARM raised — holding megaphone */}
      <path d="M138,175 L168,140 L174,147 L145,183Z" fill="#C82020"/>

      {/* MEGAPHONE */}
      {/* Body */}
      <path d="M166,130 L190,112 L200,132 L178,148Z" fill="#E8A020"/>
      {/* Bell */}
      <path d="M190,110 L215,94 L224,120 L198,134Z" fill="#E8A020" opacity="0.85"/>
      {/* Handle */}
      <rect x="160" y="136" width="22" height="8" rx="3" fill="#C87020"/>
      {/* Sound waves */}
      {[0,1,2].map(i=>(
        <path key={i}
          d={`M222,${98+i*12} Q232,${104+i*12} 238,${98+i*12}`}
          stroke="#E8F0D0" strokeWidth={2.5-i*0.6} fill="none"
          opacity={0.5-i*0.12} strokeLinecap="round"/>
      ))}

      {/* LEFT ARM — pointing at crowd / holding up protest card */}
      <path d="M102,175 L72,155 L68,163 L98,185Z" fill="#C82020"/>
      {/* PROTEST CARD being held */}
      <rect x="46" y="142" width="28" height="20" rx="2"
        fill="#E8F0D0" opacity="0.88" transform="rotate(-12 60 152)"/>
      {/* Flame icon on protest card */}
      <path d="M60,155 C58,150 56,146 57,143 C58,140 60,139 61,139 C62,139 64,140 65,143 C66,146 64,150 62,155Z"
        fill="#C82020" opacity="0.7" transform="rotate(-12 60 152)"/>

      {/* CROWD silhouettes */}
      {crowd.map((x,i)=>(
        <g key={i}>
          <ellipse cx={x+6} cy={crowdH[i]-10} rx="7" ry="7.5" fill="#C82020" opacity="0.38"/>
          <rect x={x} y={crowdH[i]-2} width="12" height="18" rx="1.5" fill="#C82020" opacity="0.30"/>
          {/* Some raised fists */}
          {i%4===1 && <line x1={x+9} y1={crowdH[i]-10} x2={x+15} y2={crowdH[i]-22}
            stroke="#C82020" strokeWidth="4" strokeLinecap="round" opacity="0.35"/>}
          {i%4===3 && <line x1={x+3} y1={crowdH[i]-10} x2={x-3} y2={crowdH[i]-22}
            stroke="#C82020" strokeWidth="4" strokeLinecap="round" opacity="0.35"/>}
        </g>
      ))}

      {/* Ground line */}
      <line x1="0" y1="262" x2={W} y2="262" stroke="#C82020" strokeWidth="0.8" opacity="0.25"/>

      {/* "PROTEST" headline text — torn-poster style */}
      <text x="26" y="68" fill="#C82020" fontFamily="Georgia,serif" fontSize="38"
        fontWeight="bold" letterSpacing="-1" opacity="0.09">RISE</text>

      {/* Stars / sparks */}
      {[[170,68],[40,88],[200,100],[28,110],[188,48]].map(([x,y],i)=>(
        <g key={i}>
          <line x1={x-5} y1={y} x2={x+5} y2={y} stroke="#E8A020" strokeWidth="1" opacity={0.2+i*0.06}/>
          <line x1={x} y1={y-5} x2={x} y2={y+5} stroke="#E8A020" strokeWidth="1" opacity={0.2+i*0.06}/>
        </g>
      ))}

      <rect width={W} height={H} fill="#C82020" opacity="0.03" filter="url(#gB)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H-287} fill="#200404"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#E8A020" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#C82020" opacity="0.7"/>
      <text x="120" y="307" textAnchor="middle" fill="#F0E8D8"
        fontFamily="Georgia,serif" fontSize="13.5" letterSpacing="3.5" fontWeight="bold">ACTIVIST</text>
      <text x="120" y="320" textAnchor="middle" fill="#E8A020"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">THE AGITATOR</text>
      <text x="120" y="334" textAnchor="middle" fill="#F0E8D8" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Light the spark. Feed the flame.</text>
    </svg>
  );
}

// ── CARD C: THE STRATEGIST ────────────────────────────────────────────────────
// Intelligence gatherer — hooded figure illuminated by a single lamp, studying
// a spread of strategy cards face-up on a table. Filing cabinet. Map on wall.
// Palette: ink black, lantern amber, parchment, moss green accent
function CardActivistC() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display:"block", width:"100%", height:"100%" }}>
      <defs>
        <GrainDef id="gC" seed={7} freq={0.91}/>
        <radialGradient id="lampC" cx="50%" cy="38%" r="50%">
          <stop offset="0%" stopColor="#C87820" stopOpacity="0.28"/>
          <stop offset="65%" stopColor="#C87820" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#C87820" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#080604"/>
      {/* Lamp warm glow */}
      <rect width={W} height={H} fill="url(#lampC)"/>

      {/* MAP ON WALL — faint topographic lines */}
      <rect x="12" y="14" width="130" height="90" rx="2" fill="#0E0C08" opacity="0.9"/>
      <rect x="12" y="14" width="130" height="90" rx="2" fill="none"
        stroke="#C87820" strokeWidth="0.8" opacity="0.3"/>
      {/* Topo contour lines */}
      {[
        "M30,40 Q60,32 90,42 Q110,50 138,40",
        "M22,54 Q55,44 88,56 Q115,64 140,52",
        "M18,68 Q52,58 86,70 Q118,78 140,66",
        "M20,82 Q56,74 90,84 Q120,90 138,82",
        "M24,94 Q62,88 96,96 Q124,100 138,95",
      ].map((d,i)=>(
        <path key={i} d={d} stroke="#C87820" strokeWidth="0.6" fill="none" opacity={0.18+i*0.02}/>
      ))}
      {/* River line on map */}
      <path d="M40,35 Q70,60 100,90" stroke="#3A7AB8" strokeWidth="1.8"
        fill="none" opacity="0.4" strokeLinecap="round"/>
      {/* Pins on map */}
      {[[52,46],[78,68],[105,85]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#C82020" opacity="0.55"/>
          <line x1={x} y1={y} x2={x} y2={y+6} stroke="#C82020" strokeWidth="1" opacity="0.45"/>
        </g>
      ))}
      {/* Map label */}
      <text x="76" y="26" textAnchor="middle" fill="#C87820" fontSize="5.5"
        letterSpacing="2" opacity="0.4" fontFamily="monospace">WATERSHED MAP</text>

      {/* FILING CABINET — right side */}
      <rect x="178" y="80" width="50" height="150" rx="2" fill="#0E0C08"/>
      <rect x="178" y="80" width="50" height="150" rx="2" fill="none"
        stroke="#C87820" strokeWidth="1" opacity="0.35"/>
      {/* Drawer separators */}
      {[80,128,176].map((y,i)=>(
        <g key={i}>
          <line x1="178" y1={y+48} x2="228" y2={y+48}
            stroke="#C87820" strokeWidth="0.8" opacity="0.3"/>
          {/* Drawer handle */}
          <rect x="196" y={y+20} width="16" height="5" rx="2.5"
            fill="none" stroke="#C87820" strokeWidth="1" opacity="0.45"/>
          {/* Drawer label */}
          <text x="202" y={y+12} fill="#C87820" fontSize="4.5"
            letterSpacing="1" opacity="0.3" fontFamily="monospace">
            {["A–F","G–M","N–Z"][i]}
          </text>
        </g>
      ))}

      {/* DESK SURFACE */}
      <rect x="0" y="210" width={W} height="60" fill="#0E0C08"/>
      <rect x="0" y="208" width={W} height="4" fill="#C87820" opacity="0.15"/>

      {/* STRATEGY CARDS SPREAD ON TABLE */}
      {[
        { x:18,  y:186, rot:-18 },
        { x:52,  y:180, rot:-6  },
        { x:88,  y:178, rot:4   },
        { x:124, y:182, rot:14  },
        { x:156, y:188, rot:24  },
      ].map(({x,y,rot},i)=>(
        <g key={i}>
          <rect x={x} y={y} width="36" height="26" rx="2"
            fill="#E8DCC0" opacity={0.55 + (i===1||i===2?0.25:0)}
            transform={`rotate(${rot} ${x+18} ${y+13})`}/>
          {/* Card lines */}
          {[0,1,2].map(j=>(
            <line key={j} x1={x+4} y1={y+7+j*6} x2={x+32} y2={y+7+j*6}
              stroke="#0E0C08" strokeWidth="0.9" opacity="0.35"
              transform={`rotate(${rot} ${x+18} ${y+13})`}/>
          ))}
          {/* Highlight 2 "face-up" cards */}
          {(i===1||i===2) && (
            <rect x={x} y={y} width="36" height="26" rx="2" fill="none"
              stroke="#C87820" strokeWidth="1.2" opacity="0.6"
              transform={`rotate(${rot} ${x+18} ${y+13})`}/>
          )}
        </g>
      ))}

      {/* HOODED FIGURE leaning over cards */}
      {/* Hood / cloak */}
      <path d="M76,178 Q88,148 120,142 Q152,148 164,178 L158,195 Q136,185 120,185 Q104,185 82,195Z"
        fill="#3A5828" opacity="0.85"/>
      {/* Head under hood — mostly shadow */}
      <ellipse cx="120" cy="152" rx="16" ry="16" fill="#1A2A18" opacity="0.9"/>
      {/* Face barely visible — just spectacle glint */}
      <ellipse cx="113" cy="153" rx="5" ry="3.5" fill="none"
        stroke="#C87820" strokeWidth="0.8" opacity="0.45"/>
      <ellipse cx="127" cy="153" rx="5" ry="3.5" fill="none"
        stroke="#C87820" strokeWidth="0.8" opacity="0.45"/>
      <line x1="118" y1="153" x2="122" y2="153" stroke="#C87820" strokeWidth="0.8" opacity="0.35"/>
      {/* Lens gleam */}
      <circle cx="111" cy="151" r="1.5" fill="#C87820" opacity="0.35"/>
      <circle cx="125" cy="151" r="1.5" fill="#C87820" opacity="0.35"/>
      {/* Cloak arm — left hand pointing at cards */}
      <path d="M82,192 Q72,196 62,208 L70,214 Q80,204 92,198Z" fill="#3A5828" opacity="0.8"/>
      <ellipse cx="66" cy="211" rx="7" ry="5.5" fill="#2A4020" opacity="0.9"/>
      {/* Pointing finger */}
      <line x1="64" y1="209" x2="54" y2="203" stroke="#2A4020" strokeWidth="4"
        strokeLinecap="round" opacity="0.9"/>

      {/* Lamp / candle on desk */}
      <rect x="164" y="190" width="12" height="20" rx="1" fill="#1A1408"/>
      <rect x="161" y="188" width="18" height="4" rx="1" fill="#2A2010"/>
      {/* Flame */}
      <path d="M170,188 C168,182 167,178 168,175 C169,172 170,171 170,171 C170,171 171,172 172,175 C173,178 172,182 170,188Z"
        fill="#E87820" opacity="0.85"/>
      <path d="M170,185 C169,181 169,178 170,176 C171,178 171,181 170,185Z"
        fill="#F8E080" opacity="0.7"/>

      <rect width={W} height={H} fill="#C87820" opacity="0.03" filter="url(#gC)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H-287} fill="#0E1A0A"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#C87820" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#3A5828" opacity="0.8"/>
      <text x="120" y="307" textAnchor="middle" fill="#E8ECD8"
        fontFamily="Georgia,serif" fontSize="13.5" letterSpacing="3.5" fontWeight="bold">ACTIVIST</text>
      <text x="120" y="320" textAnchor="middle" fill="#C87820"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4">THE STRATEGIST</text>
      <text x="120" y="334" textAnchor="middle" fill="#E8ECD8" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Know their hand. Play yours.</text>
    </svg>
  );
}

// ── CARD D: THE PAMPHLETEER ───────────────────────────────────────────────────
// Information as power — figure scattering leaflets from a rooftop / fire escape,
// papers catching the wind over a city street. Strategy cards as printed sheets.
// Palette: olive night, newsprint cream, protest red, sky blue accent
function CardActivistD() {
  const leaflets = [
    { x:42,  y:96,  rot:-22, vy:1 },
    { x:78,  y:80,  rot:8,   vy:0 },
    { x:110, y:70,  rot:-14, vy:-1 },
    { x:146, y:88,  rot:18,  vy:1 },
    { x:175, y:75,  rot:-6,  vy:0 },
    { x:28,  y:128, rot:30,  vy:1 },
    { x:65,  y:140, rot:-28, vy:-1 },
    { x:104, y:118, rot:15,  vy:0 },
    { x:142, y:130, rot:-20, vy:1 },
    { x:190, y:108, rot:12,  vy:-1 },
    { x:210, y:140, rot:-8,  vy:0 },
    { x:18,  y:162, rot:24,  vy:1 },
    { x:168, y:160, rot:-16, vy:-1 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display:"block", width:"100%", height:"100%" }}>
      <defs>
        <GrainDef id="gD" seed={23} freq={0.87}/>
        <radialGradient id="vigD" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#1A2808" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#060A04" stopOpacity="0.72"/>
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#080C04"/>
      <rect width={W} height={H} fill="url(#vigD)"/>

      {/* Night sky texture — faint stars */}
      {[[18,22],[55,14],[88,30],[132,18],[168,26],[205,12],[230,35],[42,42],[195,44]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.2" fill="#D8E8C0" opacity={0.15+i%3*0.08}/>
      ))}

      {/* CITYSCAPE SILHOUETTE */}
      {/* Buildings */}
      <path d="M0,200 L0,160 L24,160 L24,148 L32,148 L32,140 L40,140 L40,160
               L52,160 L52,132 L60,132 L60,125 L68,125 L68,132 L76,132 L76,160
               L88,160 L88,145 L96,145 L96,136 L104,136 L104,145 L116,145 L116,160
               L128,160 L128,138 L136,138 L136,128 L144,128 L144,138 L156,138 L156,160
               L168,160 L168,144 L176,144 L176,136 L184,136 L184,130 L192,130 L192,136
               L200,136 L200,160 L212,160 L212,148 L220,148 L220,142 L228,142 L228,160 L240,160 L240,200Z"
        fill="#0E1808" opacity="0.95"/>
      {/* Building windows */}
      {[[28,154],[28,166],[56,138],[64,148],[64,162],[92,150],[100,140],[100,152],
        [132,144],[140,132],[140,146],[148,144],[172,148],[180,138],[180,150],[188,134],
        [216,152],[224,146]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="6" height="5" rx="0.5"
          fill="#D8A830" opacity={0.12+(i%4)*0.07}/>
      ))}

      {/* FIRE ESCAPE platform */}
      <rect x="80" y="178" width="80" height="8" rx="1" fill="#2A3818"/>
      <rect x="80" y="178" width="80" height="8" rx="1" fill="none"
        stroke="#4A6028" strokeWidth="1" opacity="0.6"/>
      {/* Fire escape railing */}
      <line x1="80" y1="166" x2="80" y2="178" stroke="#4A6028" strokeWidth="1.5" opacity="0.55"/>
      <line x1="160" y1="166" x2="160" y2="178" stroke="#4A6028" strokeWidth="1.5" opacity="0.55"/>
      <line x1="80" y1="170" x2="160" y2="170" stroke="#4A6028" strokeWidth="1" opacity="0.4"/>
      {/* Railing posts */}
      {[96,112,128,144].map((x,i)=>(
        <line key={i} x1={x} y1="166" x2={x} y2="178"
          stroke="#4A6028" strokeWidth="1" opacity="0.4"/>
      ))}
      {/* Ladder going down */}
      <line x1="154" y1="186" x2="154" y2="228" stroke="#4A6028" strokeWidth="1.5" opacity="0.35"/>
      <line x1="162" y1="186" x2="162" y2="228" stroke="#4A6028" strokeWidth="1.5" opacity="0.35"/>
      {[198,210,222].map((y,i)=>(
        <line key={i} x1="154" y1={y} x2="162" y2={y}
          stroke="#4A6028" strokeWidth="1" opacity="0.3"/>
      ))}

      {/* FLOATING LEAFLETS / STRATEGY CARDS */}
      {leaflets.map(({x,y,rot,vy},i)=>(
        <g key={i}>
          <rect x={x} y={y} width="28" height="20" rx="1.5"
            fill="#E8E0C0" opacity={0.35+(i%4)*0.08}
            transform={`rotate(${rot} ${x+14} ${y+10})`}/>
          {/* Text lines on leaflet */}
          {[0,1,2].map(j=>(
            <line key={j} x1={x+3} y1={y+5+j*5} x2={x+25} y2={y+5+j*5}
              stroke="#2A3818" strokeWidth="0.7" opacity="0.4"
              transform={`rotate(${rot} ${x+14} ${y+10})`}/>
          ))}
          {/* Some have red headline */}
          {i%3===0 && (
            <line x1={x+3} y1={y+5} x2={x+22} y2={y+5}
              stroke="#C82020" strokeWidth="1.2" opacity="0.5"
              transform={`rotate(${rot} ${x+14} ${y+10})`}/>
          )}
        </g>
      ))}

      {/* PAMPHLETEER FIGURE on fire escape */}
      {/* Body */}
      <path d="M102,176 L104,160 L120,156 L136,160 L138,176Z" fill="#4A7838"/>
      {/* Head */}
      <ellipse cx="120" cy="148" rx="14" ry="15" fill="#4A7838"/>
      {/* Beret */}
      <ellipse cx="120" cy="140" rx="15" ry="6" fill="#C82020" opacity="0.8"/>
      <ellipse cx="125" cy="138" rx="3" ry="3" fill="#C82020" opacity="0.6"/>
      {/* RIGHT ARM — scattering leaflets high */}
      <path d="M136,164 L168,134 L174,141 L142,172Z" fill="#4A7838"/>
      <ellipse cx="170" cy="137" rx="8" ry="6" fill="#3A6028" opacity="0.9"/>
      {/* Leaflet bundle in right hand */}
      <rect x="162" y="126" width="20" height="14" rx="1"
        fill="#E8E0C0" opacity="0.75" transform="rotate(-25 172 133)"/>
      {/* LEFT ARM — braced on railing */}
      <path d="M104,168 L80,176 L80,185 L90,185 L108,178Z" fill="#4A7838"/>
      {/* Legs */}
      <path d="M108,176 L104,196 L116,197 L120,180Z" fill="#4A7838"/>
      <path d="M132,176 L136,196 L124,197 L120,180Z" fill="#4A7838"/>

      {/* Ground — leaflets on street */}
      <rect x="0" y="228" width={W} height="52" fill="#0A0E06" opacity="0.9"/>
      <line x1="0" y1="228" x2={W} y2="228" stroke="#4A6028" strokeWidth="0.8" opacity="0.3"/>
      {/* Leaflets on ground */}
      {[[22,238,12],[62,234,22],[102,240,8],[148,236,18],[188,242,6],[220,236,16]].map(([x,y,rot],i)=>(
        <rect key={i} x={x} y={y} width="28" height="18" rx="1"
          fill="#E8E0C0" opacity={0.15+i%3*0.06}
          transform={`rotate(${rot} ${x+14} ${y+9})`}/>
      ))}

      {/* "FREE THE RIVER" stencil on wall (partial) */}
      <text x="10" y="225" fill="#C82020" fontFamily="Georgia,serif" fontSize="11"
        fontWeight="bold" letterSpacing="0.5" opacity="0.12">FREE THE RIVER</text>

      <rect width={W} height={H} fill="#4A7838" opacity="0.03" filter="url(#gD)"/>

      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H-287} fill="#0E1A06"/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke="#D8A830" strokeWidth="2.5"/>
      <rect x="0" y="287" width={W} height="3" fill="#4A7838" opacity="0.8"/>
      <text x="120" y="307" textAnchor="middle" fill="#E0ECD0"
        fontFamily="Georgia,serif" fontSize="13.5" letterSpacing="3.5" fontWeight="bold">ACTIVIST</text>
      <text x="120" y="320" textAnchor="middle" fill="#D8A830"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3.5">THE PAMPHLETEER</text>
      <text x="120" y="334" textAnchor="middle" fill="#E0ECD0" opacity="0.45"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic">Let the words do the work.</text>
    </svg>
  );
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
const CARDS = [
  { id:"activist-a", Component:CardActivistA, label:"The Diverter",     accent:"#C87020", vp:0,  actions:["N: Adjust water claim ±1","C: +1 protest influence"] },
  { id:"activist-b", Component:CardActivistB, label:"The Agitator",     accent:"#E8A020", vp:1,  actions:["N: Add protest card to event deck","C: +2 protest influence"] },
  { id:"activist-c", Component:CardActivistC, label:"The Strategist",   accent:"#C87820", vp:1,  actions:["C: Look at 2 strategy cards — keep 1"] },
  { id:"activist-d", Component:CardActivistD, label:"The Pamphleteer",  accent:"#D8A830", vp:0,  actions:["N: Gain 1 strategy card","C: +1 protest influence"] },
];

const ROTATIONS = [-2.4, 1.9, -1.5, 2.2];

export default function ActivistCardGallery() {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{
      minHeight:"100vh",
      background:"#060804",
      fontFamily:"Georgia,'Times New Roman',serif",
      color:"#D8ECC8",
    }}>
      {/* Header */}
      <div style={{ padding:"32px 44px 24px", borderBottom:"1px solid #141E0C" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
          <div style={{flex:1, height:1, background:"linear-gradient(to right,transparent,#3A5820)"}}/>
          <span style={{fontSize:9, letterSpacing:"0.35em", color:"#3A5820",
            fontFamily:"monospace", textTransform:"uppercase"}}>
            The Law of the River · Digital Edition
          </span>
          <div style={{flex:1, height:1, background:"linear-gradient(to left,transparent,#3A5820)"}}/>
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:"clamp(20px,3.5vw,32px)",
          fontWeight:"normal", letterSpacing:"0.1em", color:"#E0F0D0" }}>
          ACTIVIST CARDS
        </h1>
        <p style={{ margin:0, fontSize:11, color:"#304820",
          letterSpacing:"0.15em", textTransform:"uppercase" }}>
          4 archetypes · grassroots resistance · earthy street-poster palette
        </p>
      </div>

      {/* Card grid */}
      <div style={{ padding:"48px 28px 36px", display:"flex",
        flexWrap:"wrap", gap:36, justifyContent:"center" }}>
        {CARDS.map((card, i) => {
          const isFocused = focused === card.id;
          return (
            <div key={card.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div
                onClick={() => setFocused(isFocused ? null : card.id)}
                style={{
                  width:210,
                  cursor:"pointer",
                  position:"relative",
                  zIndex: isFocused ? 20 : 1,
                  transform: isFocused
                    ? "rotate(0deg) scale(1.12) translateY(-8px)"
                    : `rotate(${ROTATIONS[i]}deg) scale(1)`,
                  transition:"transform 0.35s cubic-bezier(.22,.68,0,1.3), box-shadow 0.3s",
                  boxShadow: isFocused
                    ? `0 28px 80px rgba(0,0,0,0.98), 0 0 0 2px ${card.accent}`
                    : "0 6px 28px rgba(0,0,0,0.85)",
                  borderRadius:7, overflow:"hidden",
                }}>
                <div style={{
                  position:"absolute", inset:0,
                  border:`1px solid ${card.accent}33`,
                  borderRadius:7, zIndex:5, pointerEvents:"none",
                }}/>
                <card.Component/>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#3A5820", letterSpacing:"0.1em",
                  textTransform:"uppercase", fontFamily:"monospace" }}>
                  {card.vp > 0 ? `${card.vp} VP` : "0 VP"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding:"0 44px 32px", textAlign:"center", fontSize:11,
        color:"#1E2C10", letterSpacing:"0.08em", lineHeight:1.9 }}>
        Click any card to focus · Pure SVG — grain filters, radial glows, hand-composed paths
      </div>
    </div>
  );
}
