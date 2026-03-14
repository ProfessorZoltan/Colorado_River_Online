import { useState } from "react";

const W = 240, H = 340;

// ── SHARED HELPERS ────────────────────────────────────────────────────────────
function GrainFilter({ id, seed = 5, freq = 0.88 }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="4" seed={seed} result="n"/>
      <feColorMatrix type="saturate" values="0" in="n" result="gn"/>
      <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="b"/>
      <feComposite in="b" in2="SourceGraphic" operator="in"/>
    </filter>
  );
}

export function CardShell({ id, bg, titleBg, accentLine, titleColor, subtitleColor, tagline, title, children }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}>
      <defs><GrainFilter id={`g-${id}`} seed={parseInt(id, 36) % 50 + 2}/></defs>
      <rect width={W} height={H} fill={bg}/>
      {children}
      <rect width={W} height={H} fill={accentLine} opacity="0.035" filter={`url(#g-${id})`}/>
      {/* Bottom band */}
      <rect x="0" y="287" width={W} height={H - 287} fill={titleBg}/>
      <line x1="0" y1="286.5" x2={W} y2="286.5" stroke={accentLine} strokeWidth="2.5"/>
      <text x="120" y="308" textAnchor="middle" fill={titleColor}
        fontFamily="Georgia,serif" fontSize="12" letterSpacing="3" fontWeight="bold">{title}</text>
      <text x="120" y="321" textAnchor="middle" fill={subtitleColor}
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="3">LAWYER</text>
      <text x="120" y="334" textAnchor="middle" fill={titleColor} opacity="0.5"
        fontFamily="Georgia,serif" fontSize="6.5" fontStyle="italic" letterSpacing="0.5">{tagline}</text>
    </svg>
  );
}

// ── CARD 1: ANTI-ENVIRONMENTALIST ─────────────────────────────────────────────
// Silhouetted industrial smokestack against an orange acid-sky.
// Gasmask-wearing figure points at dying river. Slashed leaf motif.
// Palette: acid orange, soot black, bile yellow, pale sky

export function CardAntiEnv() {
  const rays = Array.from({ length: 18 }, (_, i) => i);
  return (
    <CardShell id="antenv" bg="#1A0800" titleBg="#C85000" accentLine="#E85000"
      titleColor="#FFF0D0" subtitleColor="#FFD060" tagline="Progress over preservation."
      title="ANTI-ENVIRONMENTALIST">
      {/* Acid sky gradient */}
      <rect width={W} height="220" fill="#C85000" opacity="0.18"/>
      <rect width={W} y="0" height="120" fill="#E88000" opacity="0.22"/>

      {/* Sun / toxic halo */}
      {rays.map(i => {
        const a = (i / 18) * Math.PI * 2;
        return <line key={i}
          x1={170 + 22 * Math.cos(a)} y1={52 + 22 * Math.sin(a)}
          x2={170 + 55 * Math.cos(a)} y2={52 + 55 * Math.sin(a)}
          stroke="#E88000" strokeWidth="1.2" opacity="0.25"/>;
      })}
      <circle cx="170" cy="52" r="22" fill="#E88000" opacity="0.35"/>
      <circle cx="170" cy="52" r="16" fill="#FFD060" opacity="0.25"/>

      {/* SLASHED LEAF */}
      <path d="M44,38 C44,16 72,10 80,34 C88,58 68,74 44,66 C20,58 44,60 44,38Z"
        fill="#3A6A20" opacity="0.22"/>
      <path d="M44,66 L80,10" stroke="#C85000" strokeWidth="3.5" opacity="0.65" strokeLinecap="round"/>
      <path d="M40,62 L76,14" stroke="#E88000" strokeWidth="1.2" opacity="0.4" strokeLinecap="round"/>

      {/* FACTORY COMPLEX */}
      <rect x="30" y="160" width="80" height="100" fill="#0A0400"/>
      <rect x="52" y="140" width="22" height="22" fill="#0A0400"/>
      <rect x="82" y="150" width="16" height="14" fill="#0A0400"/>
      {/* Windows */}
      {[[36,170],[60,168],[90,168],[36,192],[60,190],[90,190],[36,214],[60,212]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="10" height="8" rx="0.5"
          fill="#FFD060" opacity={0.12 + (i%3)*0.09}/>
      ))}

      {/* SMOKESTACKS */}
      {[[78,68,14,104],[104,55,12,120],[122,72,10,100]].map(([x,y,w,h],i)=>(
        <g key={i}>
          <rect x={x - w/2} y={y} width={w} height={h} fill="#0A0400"/>
          {/* Smoke plume */}
          <path d={`M${x},${y} Q${x-8},${y-24} ${x+4},${y-48} Q${x-5},${y-70} ${x+2},${y-88}`}
            stroke="#E88000" strokeWidth={w * 0.7} fill="none" opacity={0.12 + i*0.03}
            strokeLinecap="round"/>
        </g>
      ))}

      {/* RIVER — dead/polluted */}
      <path d="M0,244 Q60,236 120,244 Q180,252 240,244 L240,290 L0,290Z"
        fill="#3A2800" opacity="0.7"/>
      <path d="M0,258 Q50,252 100,258 Q160,264 240,256 L240,292 L0,292Z"
        fill="#1A1000" opacity="0.75"/>
      {/* Pollution sheen */}
      <path d="M20,248 Q50,243 80,250" stroke="#E88000" strokeWidth="1.5" fill="none" opacity="0.2"/>
      <path d="M130,254 Q160,248 200,255" stroke="#FFD060" strokeWidth="1" fill="none" opacity="0.15"/>

      {/* GAS-MASK FIGURE */}
      <ellipse cx="188" cy="190" rx="14" ry="15" fill="#C85000"/>
      {/* Gasmask lens */}
      <circle cx="183" cy="189" r="5" fill="#0A0400"/>
      <circle cx="183" cy="189" r="3" fill="#E88000" opacity="0.5"/>
      <circle cx="193" cy="189" r="5" fill="#0A0400"/>
      <circle cx="193" cy="189" r="3" fill="#E88000" opacity="0.5"/>
      {/* Mask filter canister */}
      <rect x="182" y="199" width="14" height="6" rx="3" fill="#8A3800"/>
      {/* Body */}
      <path d="M176,204 L174,254 L202,254 L200,204 Z" fill="#C85000"/>
      {/* Pointing arm */}
      <path d="M200,216 L228,228 L225,234 L196,222Z" fill="#C85000"/>
      {/* Pointing finger */}
      <path d="M225,232 L238,236 L236,240 L222,237Z" fill="#C85000"/>
    </CardShell>
  );
}

// ── CARD 2: THE "IT'S A JOB" LAWYER ──────────────────────────────────────────
// Bureaucrat buried under stacks of paper. Clock on wall. Coffee cup.
// Suit jacket on chair-back. Fluorescent-light pallor. Resigned expression.
// Palette: washed-out beige, flat grey, dull mustard, faded blue

export function CardItsAJob() {
  return (
    <CardShell id="itsjob" bg="#1C1810" titleBg="#3A3428" accentLine="#C8A840"
      titleColor="#E8DCC0" subtitleColor="#C8A840" tagline="Not here for the cause."
      title={`"IT'S A JOB" LAWYER`}>
      {/* Office wall — grid of fluorescent panels */}
      <rect width={W} height="250" fill="#181410"/>
      {/* Ceiling tiles */}
      {Array.from({length:6},(_,i)=>(
        <rect key={i} x={i*40} y="0" width="38" height="28" rx="1"
          fill="#C8A840" opacity={0.04 + (i%2)*0.02}/>
      ))}
      {/* Fluorescent tubes */}
      <rect x="8" y="6" width="68" height="6" rx="3" fill="#E0D8B0" opacity="0.18"/>
      <rect x="88" y="6" width="68" height="6" rx="3" fill="#E0D8B0" opacity="0.18"/>
      <rect x="168" y="6" width="64" height="6" rx="3" fill="#E0D8B0" opacity="0.18"/>

      {/* Wall clock */}
      <circle cx="196" cy="62" r="22" fill="#1C1810"/>
      <circle cx="196" cy="62" r="22" fill="none" stroke="#C8A840" strokeWidth="1.8" opacity="0.7"/>
      <circle cx="196" cy="62" r="2.5" fill="#C8A840" opacity="0.8"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{
        const a = (i/12)*Math.PI*2 - Math.PI/2;
        return <line key={i}
          x1={196+14*Math.cos(a)} y1={62+14*Math.sin(a)}
          x2={196+18*Math.cos(a)} y2={62+18*Math.sin(a)}
          stroke="#C8A840" strokeWidth={i%3===0?2:0.8} opacity="0.6"/>;
      })}
      {/* Clock hands — pointing at 5:03 (almost quitting time) */}
      <line x1="196" y1="62" x2="196" y2="46" stroke="#E8DCC0" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      <line x1="196" y1="62" x2="208" y2="64" stroke="#E8DCC0" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>

      {/* DESK surface */}
      <rect x="0" y="200" width={W} height="60" fill="#2A2218" opacity="0.95"/>
      <rect x="0" y="198" width={W} height="4" fill="#C8A840" opacity="0.25"/>

      {/* PAPER STACKS */}
      {/* Left stack */}
      {Array.from({length:8},(_,i)=>(
        <rect key={i} x={18 - i*1.5} y={156 + i*6} width="60" height="8" rx="0.5"
          fill="#E0D8B0" opacity={0.28 - i*0.02}
          transform={`rotate(${(i%3-1)*2} 48 ${156+i*6})`}/>
      ))}
      {/* Center stack */}
      {Array.from({length:10},(_,i)=>(
        <rect key={i} x={88 - i*1.2} y={140 + i*6} width="72" height="8" rx="0.5"
          fill="#E0D8B0" opacity={0.3 - i*0.02}
          transform={`rotate(${(i%4-1.5)*1.5} 124 ${140+i*6})`}/>
      ))}
      {/* Right stack */}
      {Array.from({length:7},(_,i)=>(
        <rect key={i} x={170 - i} y={166 + i*5} width="52" height="8" rx="0.5"
          fill="#E0D8B0" opacity={0.26 - i*0.02}
          transform={`rotate(${(i%2)*3-1} 196 ${166+i*5})`}/>
      ))}

      {/* Text lines on papers (top visible ones) */}
      {[[24,160],[28,168],[92,144],[96,152],[172,170],[176,178]].map(([x,y],i)=>(
        <line key={i} x1={x} y1={y} x2={x+40} y2={y}
          stroke="#3A3428" strokeWidth="1" opacity="0.4"/>
      ))}

      {/* COFFEE MUG */}
      <rect x="150" y="208" width="18" height="20" rx="2" fill="#2A2218"/>
      <rect x="150" y="208" width="18" height="20" rx="2" fill="none" stroke="#C8A840" strokeWidth="1.2" opacity="0.6"/>
      <path d="M168,213 Q177,213 177,218 Q177,223 168,223" fill="none" stroke="#C8A840" strokeWidth="1.2" opacity="0.6"/>
      {/* Coffee steam */}
      <path d="M156,207 Q154,200 157,194 Q155,188 158,183" stroke="#E0D8B0" strokeWidth="0.8"
        fill="none" opacity="0.3" strokeLinecap="round"/>
      <path d="M162,207 Q164,200 161,194 Q163,188 160,183" stroke="#E0D8B0" strokeWidth="0.8"
        fill="none" opacity="0.3" strokeLinecap="round"/>

      {/* BRIEFCASE under desk */}
      <rect x="30" y="242" width="44" height="32" rx="2" fill="#1C1810"/>
      <rect x="30" y="242" width="44" height="32" rx="2" fill="none" stroke="#C8A840" strokeWidth="1" opacity="0.4"/>
      <rect x="42" y="237" width="20" height="7" rx="3.5" fill="none" stroke="#C8A840" strokeWidth="1" opacity="0.4"/>

      {/* SLUMPED LAWYER FIGURE behind the desk */}
      {/* Head (face down, buried in arms) */}
      <ellipse cx="110" cy="194" rx="15" ry="12" fill="#C8A840" opacity="0.6"/>
      {/* Arms/sleeves on desk */}
      <path d="M80,200 Q100,195 110,198 Q120,195 140,200 L138,212 L82,212 Z"
        fill="#3A3428" opacity="0.8"/>
    </CardShell>
  );
}

// ── CARD 3: TEAM PLAYER ───────────────────────────────────────────────────────
// Coalition handshake across a table map, diverse silhouettes standing together,
// banner / ribbon motif, conference room light cone.
// Palette: slate blue-grey, warm cream, olive green, muted gold

export function CardTeamPlayer() {
  const figures = [16, 50, 84, 118, 152, 186, 220];
  const figH   = [108, 100, 112, 105, 110, 104, 108];
  const figW   = [10, 11, 9, 11, 10, 9, 11];

  return (
    <CardShell id="teamplayer" bg="#0E1418" titleBg="#1A3428" accentLine="#6AAA78"
      titleColor="#D8ECD0" subtitleColor="#6AAA78" tagline="Together we hold the river."
      title="TEAM PLAYER">
      {/* Conference-room light cone from above */}
      <path d="M120,0 L60,200 L180,200 Z" fill="#A0B890" opacity="0.07"/>
      <ellipse cx="120" cy="0" rx="18" ry="8" fill="#D8ECD0" opacity="0.12"/>

      {/* MAP outline on table */}
      <ellipse cx="120" cy="210" rx="100" ry="32" fill="#1A2820" opacity="0.85"/>
      {/* River line on map */}
      <path d="M30,208 Q80,196 120,210 Q160,224 210,208"
        stroke="#4A8898" strokeWidth="2.5" fill="none" opacity="0.55"/>
      {/* Map borders / state outlines */}
      <path d="M40,202 L78,194 L78,222 L40,222 Z" fill="none" stroke="#6AAA78" strokeWidth="0.8" opacity="0.3"/>
      <path d="M82,192 L120,184 L120,224 L82,222 Z" fill="none" stroke="#6AAA78" strokeWidth="0.8" opacity="0.3"/>
      <path d="M124,194 L162,188 L162,220 L124,222 Z" fill="none" stroke="#6AAA78" strokeWidth="0.8" opacity="0.3"/>
      <path d="M166,196 L200,204 L200,218 L166,218 Z" fill="none" stroke="#6AAA78" strokeWidth="0.8" opacity="0.3"/>
      {/* Location pins */}
      {[[62,200],[102,198],[142,196],[182,204]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#D8A040" opacity="0.5"/>
          <line x1={x} y1={y} x2={x} y2={y+8} stroke="#D8A040" strokeWidth="1.2" opacity="0.4"/>
        </g>
      ))}

      {/* SILHOUETTED FIGURES */}
      {figures.map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={figH[i]} rx={figW[i]/2} ry={figW[i]/1.8} fill="#6AAA78" opacity="0.55"/>
          <rect x={x - figW[i]/2} y={figH[i] + figW[i]/1.8 - 2} width={figW[i]}
            height={figW[i] * 2.2} rx="1.5" fill="#6AAA78" opacity="0.45"/>
          {/* Raised arm on middle figure */}
          {i === 3 && <line x1={x + 5} y1={figH[i] + 4} x2={x + 18} y2={figH[i] - 10}
            stroke="#6AAA78" strokeWidth="5" strokeLinecap="round" opacity="0.5"/>}
        </g>
      ))}

      {/* HANDSHAKE — center foreground */}
      {/* Left arm */}
      <path d="M30,248 Q70,238 96,248" fill="none" stroke="#D8ECD0" strokeWidth="10"
        strokeLinecap="round" opacity="0.55"/>
      {/* Right arm */}
      <path d="M210,248 Q170,238 144,248" fill="none" stroke="#D8ECD0" strokeWidth="10"
        strokeLinecap="round" opacity="0.55"/>
      {/* Joined hands */}
      <ellipse cx="120" cy="248" rx="28" ry="16" fill="#D8ECD0" opacity="0.5"/>
      <ellipse cx="120" cy="246" rx="22" ry="12" fill="#B8CEB0" opacity="0.45"/>
      {/* Grip lines */}
      <line x1="105" y1="248" x2="135" y2="244" stroke="#0E1418" strokeWidth="1.5" opacity="0.4"/>
      <line x1="105" y1="252" x2="135" y2="248" stroke="#0E1418" strokeWidth="1.5" opacity="0.4"/>

      {/* Banner ribbon at top */}
      <path d="M0,28 L240,28 L228,46 L12,46 Z" fill="#1A3428" opacity="0.7"/>
      <path d="M0,28 L240,28" stroke="#6AAA78" strokeWidth="1.2" opacity="0.5"/>
      <path d="M0,46 L240,46" stroke="#6AAA78" strokeWidth="0.8" opacity="0.3"/>
      <text x="120" y="41" textAnchor="middle" fill="#D8ECD0" opacity="0.6"
        fontFamily="Georgia,serif" fontSize="7.5" letterSpacing="4" fontStyle="italic">UNITED COALITION</text>

      {/* Corner detail marks */}
      {[[10,56],[230,56],[10,275],[230,275]].map(([x,y],i)=>(
        <g key={i}>
          <line x1={x} y1={y} x2={x + (i%2===0?10:-10)} y2={y} stroke="#6AAA78" strokeWidth="0.8" opacity="0.35"/>
          <line x1={x} y1={y} x2={x} y2={y+(i<2?10:-10)} stroke="#6AAA78" strokeWidth="0.8" opacity="0.35"/>
        </g>
      ))}
    </CardShell>
  );
}

// ── CARD 4: WORKAHOLIC ────────────────────────────────────────────────────────
// Midnight oil burning — lone desk light in darkness, stacks of filed briefs,
// multiple clocks reading different hours, exhausted silhouette.
// Palette: near-black, amber, ash white, deep blood red accent

export function CardWorkaholic() {
  return (
    <CardShell id="workaholic" bg="#0C0806" titleBg="#8A1C08" accentLine="#E07818"
      titleColor="#F0E8D0" subtitleColor="#E07818" tagline="Sleep is for opposing counsel."
      title="WORKAHOLIC">
      {/* Dark void */}
      <rect width={W} height="290" fill="#0C0806"/>

      {/* MULTIPLE CLOCKS on wall — each showing a different exhausted hour */}
      {[
        { cx: 38,  cy: 48,  r: 28, h: 2,   m: 15 },  // 2:15 AM
        { cx: 120, cy: 40,  r: 24, h: 3,   m: 42 },  // 3:42 AM
        { cx: 198, cy: 52,  r: 26, h: 4,   m: 58 },  // 4:58 AM
      ].map(({ cx, cy, r, h, m }, idx) => {
        const hAngle = ((h % 12) / 12 + m / 720) * Math.PI * 2 - Math.PI / 2;
        const mAngle = (m / 60) * Math.PI * 2 - Math.PI / 2;
        return (
          <g key={idx}>
            <circle cx={cx} cy={cy} r={r} fill="#160E06"/>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E07818" strokeWidth="1.5" opacity="0.55"/>
            {Array.from({length:12},(_,i)=>{
              const a=(i/12)*Math.PI*2-Math.PI/2;
              return <line key={i}
                x1={cx+(r-6)*Math.cos(a)} y1={cy+(r-6)*Math.sin(a)}
                x2={cx+(r-2)*Math.cos(a)} y2={cy+(r-2)*Math.sin(a)}
                stroke="#E07818" strokeWidth={i%3===0?1.5:0.6} opacity="0.5"/>;
            })}
            <circle cx={cx} cy={cy} r="2" fill="#E07818" opacity="0.7"/>
            {/* Hour hand */}
            <line x1={cx} y1={cy}
              x2={cx + (r-10) * Math.cos(hAngle)} y2={cy + (r-10) * Math.sin(hAngle)}
              stroke="#F0E8D0" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
            {/* Minute hand */}
            <line x1={cx} y1={cy}
              x2={cx + (r-6) * Math.cos(mAngle)} y2={cy + (r-6) * Math.sin(mAngle)}
              stroke="#E07818" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
          </g>
        );
      })}

      {/* LAMP CONE (only light source) */}
      <path d="M120,90 L60,210 L180,210 Z" fill="#E07818" opacity="0.12"/>
      <path d="M120,90 L72,210 L168,210 Z" fill="#E07818" opacity="0.06"/>
      <rect x="108" y="78" width="24" height="14" rx="3" fill="#2A1808"/>
      <rect x="108" y="78" width="24" height="14" rx="3" fill="none" stroke="#E07818" strokeWidth="1.2" opacity="0.6"/>
      <rect x="112" y="84" width="16" height="8" rx="1" fill="#E07818" opacity="0.6"/>
      {/* Lamp arm */}
      <line x1="120" y1="78" x2="120" y2="62" stroke="#E07818" strokeWidth="2.5" opacity="0.5"/>
      <line x1="120" y1="62" x2="148" y2="52" stroke="#E07818" strokeWidth="2.5" opacity="0.5"/>
      <circle cx="148" cy="50" r="4" fill="#E07818" opacity="0.4"/>

      {/* DESK */}
      <rect x="0" y="210" width={W} height="55" fill="#160E06"/>
      <rect x="0" y="208" width={W} height="4" fill="#E07818" opacity="0.18"/>

      {/* BRIEF STACKS — chaotic, many */}
      {Array.from({length:22},(_,i)=>(
        <rect key={i}
          x={(i*23 % 200) + 10 - i*0.5}
          y={178 + (i%5)*5 - 3}
          width={42 + (i%4)*6} height="7" rx="0.5"
          fill="#E0D0B0"
          opacity={0.18 + (i%4)*0.04}
          transform={`rotate(${(i%7-3)*2.5} ${(i*23%200)+31} ${178+(i%5)*5})`}/>
      ))}

      {/* EXHAUSTED SILHOUETTE — head on arms */}
      <ellipse cx="120" cy="200" rx="18" ry="14" fill="#8A1C08" opacity="0.7"/>
      {/* Dark circles under eyes (barely visible, implied) */}
      <ellipse cx="113" cy="199" rx="5" ry="3.5" fill="#0C0806" opacity="0.5"/>
      <ellipse cx="127" cy="199" rx="5" ry="3.5" fill="#0C0806" opacity="0.5"/>
      {/* Arms spread on desk */}
      <path d="M70,210 Q95,205 108,208 Q120,205 132,208 Q148,205 170,210 L168,218 L72,218 Z"
        fill="#8A1C08" opacity="0.6"/>

      {/* Empty coffee cups */}
      {[[38,222],[192,224]].map(([x,y],i)=>(
        <g key={i}>
          <rect x={x} y={y} width="14" height="16" rx="1.5" fill="#2A1808"/>
          <rect x={x} y={y} width="14" height="16" rx="1.5" fill="none"
            stroke="#E07818" strokeWidth="1" opacity="0.45"/>
          <path d={`M${x+14},${y+4} Q${x+20},${y+4} ${x+20},${y+9} Q${x+20},${y+14} ${x+14},${y+14}`}
            fill="none" stroke="#E07818" strokeWidth="1" opacity="0.45"/>
          <text x={x+7} y={y+10} textAnchor="middle" fill="#E07818" fontSize="5.5"
            opacity="0.4" fontFamily="monospace">EMPTY</text>
        </g>
      ))}

      {/* Red-eye redness dots */}
      <circle cx="111" cy="199" r="2" fill="#8A1C08" opacity="0.55"/>
      <circle cx="125" cy="199" r="2" fill="#8A1C08" opacity="0.55"/>
    </CardShell>
  );
}

// ── CARD 5: RIDER OF COAT-TAILS ───────────────────────────────────────────────
// Tiny figure clinging to the back of a giant's coat-tails mid-stride.
// Crowd blur motion lines behind the giant. Trophy/gold cup passed hand-to-hand.
// Palette: deep indigo, gold leaf, chalk white, shadow black

export function CardRiderCoattails() {
  return (
    <CardShell id="ridercoat" bg="#080B18" titleBg="#0C1030" accentLine="#C8A820"
      titleColor="#F0ECD8" subtitleColor="#C8A820" tagline="Why work when others will?"
      title="RIDER OF COAT-TAILS">
      {/* Velocity / motion lines */}
      {Array.from({length:18},(_,i)=>(
        <line key={i}
          x1={0} y1={28 + i*14}
          x2={100 - (i%3)*20} y2={28 + i*14}
          stroke="#C8A820" strokeWidth="0.6" opacity={0.06 + (i%4)*0.03}/>
      ))}

      {/* GIANT STRIDING FIGURE */}
      {/* Giant's leg (mid-stride) */}
      <path d="M105,100 Q130,180 110,280 L130,280 Q152,180 155,100Z" fill="#2A3868"/>
      <path d="M155,100 Q180,170 200,260 L220,255 Q198,170 175,100Z" fill="#2A3868"/>
      {/* Giant shoe — left */}
      <path d="M110,275 Q100,285 85,285 L80,278 Q95,276 112,265 Z" fill="#181828"/>
      {/* Giant shoe — right */}
      <path d="M196,255 Q210,270 225,265 L228,257 Q212,258 196,248 Z" fill="#181828"/>
      {/* Giant torso */}
      <path d="M100,52 L105,100 L175,100 L172,52 Z" fill="#2A3868"/>
      {/* Giant coat lapels */}
      <path d="M118,52 L126,80 L138,72 L142,52Z" fill="#181828" opacity="0.6"/>
      <path d="M138,72 L138,98 L132,98 L132,72Z" fill="#C8A820" opacity="0.4"/>
      {/* Giant head */}
      <ellipse cx="138" cy="38" rx="22" ry="24" fill="#2A3868"/>
      {/* Giant collar */}
      <path d="M120,50 L138,64 L156,50 L152,60 L138,70 L124,60Z" fill="#181828" opacity="0.7"/>
      {/* Giant arm up (winner) */}
      <path d="M172,58 L215,38 L220,50 L175,72Z" fill="#2A3868"/>

      {/* TROPHY — held aloft by giant */}
      <path d="M218,18 Q228,22 226,34 Q224,44 218,46 L218,52 L226,54 L210,54 L218,52 L218,46 Q212,44 210,34 Q208,22 218,18Z"
        fill="#C8A820" opacity="0.75"/>
      <rect x="212" y="14" width="12" height="6" rx="1" fill="#C8A820" opacity="0.6"/>
      {/* Trophy gleam */}
      <line x1="220" y1="18" x2="225" y2="13" stroke="#F0ECD8" strokeWidth="1.5" opacity="0.5"/>
      <line x1="222" y1="22" x2="229" y2="19" stroke="#F0ECD8" strokeWidth="1" opacity="0.35"/>

      {/* COAT-TAILS — flowing behind giant */}
      <path d="M105,100 Q88,140 70,200 Q60,240 68,280 L80,278 Q74,242 84,204 Q100,146 118,106Z"
        fill="#1A2448" opacity="0.85"/>
      <path d="M175,100 Q188,138 196,188 Q200,228 188,278 L200,280 Q212,232 208,188 Q200,140 182,102Z"
        fill="#1A2448" opacity="0.85"/>
      {/* Coat-tail seam / hem line */}
      <path d="M70,200 Q82,192 92,200 Q102,208 110,200"
        stroke="#C8A820" strokeWidth="0.8" fill="none" opacity="0.3"/>

      {/* TINY FIGURE clinging to coat-tail */}
      <ellipse cx="80" cy="216" rx="7" ry="7.5" fill="#C8A820" opacity="0.75"/>
      {/* Tiny hands gripping the coat-tail */}
      <line x1="72" y1="222" x2="64" y2="218" stroke="#C8A820" strokeWidth="3"
        strokeLinecap="round" opacity="0.7"/>
      <line x1="88" y1="222" x2="96" y2="218" stroke="#C8A820" strokeWidth="3"
        strokeLinecap="round" opacity="0.7"/>
      {/* Tiny legs dangling */}
      <line x1="76" y1="222" x2="72" y2="240" stroke="#C8A820" strokeWidth="3"
        strokeLinecap="round" opacity="0.6"/>
      <line x1="84" y1="222" x2="88" y2="240" stroke="#C8A820" strokeWidth="3"
        strokeLinecap="round" opacity="0.6"/>
      {/* Tiny grinning mouth */}
      <path d="M76,218 Q80,222 84,218" fill="none" stroke="#080B18" strokeWidth="1" opacity="0.7"/>

      {/* Stars of triumph */}
      {[[52,35],[24,68],[16,100]].map(([x,y],i)=>(
        <polygon key={i}
          points={`${x},${y-6} ${x+2},${y-2} ${x+7},${y-2} ${x+3},${y+2} ${x+4.5},${y+7} ${x},${y+4} ${x-4.5},${y+7} ${x-3},${y+2} ${x-7},${y-2} ${x-2},${y-2}`}
          fill="#C8A820" opacity={0.15 + i*0.08}/>
      ))}
    </CardShell>
  );
}

// ── CARD 6: IN IT FOR GLORY ───────────────────────────────────────────────────
// Podium / victory stand, dramatic spotlight, laurel wreath, raised arms.
// Courtroom gallery crowd as silhouettes. SC building dome as shadow behind.
// Palette: deep magenta-black, victory gold, triumph white, shadow plum

export function CardInItForGlory() {
  const crowd = Array.from({length:16}, (_, i) => ({
    x: i * 16 + 4,
    y: 232 + (i % 3) * 5,
    w: 9, h: 12,
  }));

  return (
    <CardShell id="initforglory" bg="#10060E" titleBg="#6A1848" accentLine="#C8A020"
      titleColor="#F8F0D8" subtitleColor="#C8A020" tagline="Glory doesn't come cheap."
      title="IN IT FOR GLORY">
      {/* Spotlight cone from above */}
      <path d="M120,0 L44,235 L196,235 Z" fill="#C8A020" opacity="0.10"/>
      <path d="M120,0 L72,235 L168,235 Z" fill="#C8A020" opacity="0.07"/>
      <ellipse cx="120" cy="5" rx="16" ry="7" fill="#F8F0D8" opacity="0.18"/>

      {/* SUPREME COURT DOME — shadow behind */}
      <ellipse cx="120" cy="92" rx="72" ry="28" fill="#6A1848" opacity="0.12"/>
      <rect x="54" y="90" width="132" height="120" fill="#6A1848" opacity="0.08"/>
      {/* Dome columns */}
      {[66,84,102,120,138,156].map((x,i)=>(
        <rect key={i} x={x-3} y="88" width="6" height="55" fill="#6A1848" opacity="0.15"/>
      ))}
      <rect x="48" y="143" width="144" height="5" fill="#6A1848" opacity="0.18"/>

      {/* LAUREL WREATH (ring of leaves around podium scene) */}
      {Array.from({length:28},(_,i)=>{
        const a = (i/28)*Math.PI*2;
        const r = 76;
        const lx = 120 + r * Math.cos(a);
        const ly = 152 + r * Math.sin(a);
        return <ellipse key={i} cx={lx} cy={ly} rx="8" ry="4"
          fill="#3A6828" opacity="0.35"
          transform={`rotate(${(i/28)*360 + 90} ${lx} ${ly})`}/>;
      })}
      <circle cx="120" cy="152" r="68" fill="none" stroke="#C8A020" strokeWidth="0.8" opacity="0.22"/>

      {/* PODIUM / VICTORY STAND */}
      {/* 1st place center */}
      <rect x="88" y="175" width="64" height="60" rx="2" fill="#2A1838"/>
      <rect x="88" y="175" width="64" height="60" rx="2" fill="none" stroke="#C8A020" strokeWidth="1.8" opacity="0.7"/>
      <text x="120" y="210" textAnchor="middle" fill="#C8A020"
        fontFamily="Georgia,serif" fontSize="22" fontWeight="bold" opacity="0.65">1</text>
      {/* 2nd place left */}
      <rect x="38" y="192" width="52" height="43" rx="2" fill="#1E1228"/>
      <rect x="38" y="192" width="52" height="43" rx="2" fill="none" stroke="#C8A020" strokeWidth="1" opacity="0.4"/>
      <text x="64" y="220" textAnchor="middle" fill="#C8A020"
        fontFamily="Georgia,serif" fontSize="16" opacity="0.35">2</text>
      {/* 3rd place right */}
      <rect x="150" y="200" width="52" height="35" rx="2" fill="#1A1024"/>
      <rect x="150" y="200" width="52" height="35" rx="2" fill="none" stroke="#C8A020" strokeWidth="1" opacity="0.3"/>
      <text x="176" y="224" textAnchor="middle" fill="#C8A020"
        fontFamily="Georgia,serif" fontSize="14" opacity="0.28">3</text>

      {/* WINNER FIGURE on podium — arms raised triumphantly */}
      <ellipse cx="120" cy="148" rx="16" ry="18" fill="#C8A020" opacity="0.8"/>
      {/* Body */}
      <path d="M106,164 L108,178 L132,178 L134,164 Z" fill="#C8A020" opacity="0.7"/>
      {/* Left arm raised */}
      <path d="M108,168 L78,140 L82,133 L112,162Z" fill="#C8A020" opacity="0.7"/>
      {/* Right arm raised */}
      <path d="M132,168 L162,140 L166,133 L128,162Z" fill="#C8A020" opacity="0.7"/>
      {/* Fist hands */}
      <ellipse cx="80" cy="136" rx="7" ry="6" fill="#C8A020" opacity="0.75"/>
      <ellipse cx="162" cy="136" rx="7" ry="6" fill="#C8A020" opacity="0.75"/>

      {/* Gold medal on winner */}
      <circle cx="120" cy="172" r="6" fill="#C8A020" opacity="0.85"/>
      <circle cx="120" cy="172" r="4" fill="none" stroke="#10060E" strokeWidth="1"/>
      <line x1="118" y1="164" x2="120" y2="168" stroke="#C8A020" strokeWidth="1.5" opacity="0.8"/>
      <line x1="122" y1="164" x2="120" y2="168" stroke="#C8A020" strokeWidth="1.5" opacity="0.8"/>

      {/* Stars / sparkles */}
      {[[48,132],[192,128],[68,96],[172,100],[120,68]].map(([x,y],i)=>(
        <g key={i}>
          <line x1={x-6} y1={y} x2={x+6} y2={y} stroke="#C8A020" strokeWidth="1" opacity={0.2+i*0.07}/>
          <line x1={x} y1={y-6} x2={x} y2={y+6} stroke="#C8A020" strokeWidth="1" opacity={0.2+i*0.07}/>
          <line x1={x-4} y1={y-4} x2={x+4} y2={y+4} stroke="#C8A020" strokeWidth="0.7" opacity={0.15+i*0.05}/>
          <line x1={x+4} y1={y-4} x2={x-4} y2={y+4} stroke="#C8A020" strokeWidth="0.7" opacity={0.15+i*0.05}/>
        </g>
      ))}

      {/* CROWD silhouettes */}
      {crowd.map(({x,y,w,h},i)=>(
        <g key={i}>
          <ellipse cx={x+w/2} cy={y-2} rx={w/2} ry={w/2} fill="#6A1848" opacity="0.45"/>
          <rect x={x} y={y} width={w} height={h} rx="1" fill="#6A1848" opacity="0.38"/>
        </g>
      ))}
    </CardShell>
  );
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
const CARDS = [
  { id: "anti-env",       Component: CardAntiEnv,        label: "Anti-Environmentalist",     accent: "#E85000", cost: 5, prReq: "PR ≤ 1" },
  { id: "its-a-job",      Component: CardItsAJob,         label: `"It's a Job" Lawyer`,        accent: "#C8A840", cost: 2, prReq: null },
  { id: "team-player",    Component: CardTeamPlayer,      label: "Team Player",                accent: "#6AAA78", cost: 3, prReq: null },
  { id: "workaholic",     Component: CardWorkaholic,      label: "Workaholic",                 accent: "#E07818", cost: 1, prReq: null },
  { id: "rider-coattails",Component: CardRiderCoattails,  label: "Rider of Coat-tails",        accent: "#C8A820", cost: 1, prReq: null },
  { id: "in-it-for-glory",Component: CardInItForGlory,    label: "In it for Glory",            accent: "#C8A020", cost: 2, prReq: "PR ≤ 7" },
];

const ROTATIONS = [-2.1, 1.6, -1.3, 2.4, -0.9, 1.8];

export default function LawyerCardsGallery2() {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080608",
      fontFamily: "Georgia, 'Times New Roman', serif",
      color: "#E8DCC8",
    }}>
      {/* HEADER */}
      <div style={{ padding: "32px 44px 24px", borderBottom: "1px solid #1E1810" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
          <div style={{flex:1, height:"1px", background:"linear-gradient(to right, transparent, #6A4A10)"}}/>
          <span style={{fontSize:9, letterSpacing:"0.35em", color:"#6A4A10", fontFamily:"monospace", textTransform:"uppercase"}}>
            The Law of the River · Digital Edition
          </span>
          <div style={{flex:1, height:"1px", background:"linear-gradient(to left, transparent, #6A4A10)"}}/>
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:"clamp(20px, 3.5vw, 32px)", fontWeight:"normal", letterSpacing:"0.1em", color:"#F0E4C8" }}>
          LAWYER CARDS — SERIES II
        </h1>
        <p style={{ margin:0, fontSize:11, color:"#5A4832", letterSpacing:"0.15em", textTransform:"uppercase" }}>
          6 remaining archetypes · gritty realism · limited palettes
        </p>
      </div>

      {/* GRID */}
      <div style={{ padding:"44px 28px 40px", display:"flex", flexWrap:"wrap", gap:32, justifyContent:"center" }}>
        {CARDS.map((card, i) => {
          const isFocused = focused === card.id;
          return (
            <div key={card.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
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
                  position:"absolute", inset:0,
                  border:`1px solid ${card.accent}33`,
                  borderRadius:7, zIndex:5, pointerEvents:"none",
                }}/>
                <card.Component/>
              </div>
              {/* Card label below */}
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#8A7A5A", letterSpacing:"0.1em",
                  textTransform:"uppercase", fontFamily:"monospace" }}>
                  Cost: ${card.cost}{card.prReq ? ` · ${card.prReq}` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding:"0 44px 36px", textAlign:"center", fontSize:11,
        color:"#3A3020", letterSpacing:"0.08em", lineHeight:1.9 }}>
        Click any card to focus · Pure SVG — grain filters, layered opacity, hand-composed paths
      </div>
    </div>
  );
}
