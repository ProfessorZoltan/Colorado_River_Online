/**
 * App.jsx
 * Root component. Owns the setup → game lifecycle.
 *
 * Screens:
 *   'loading'  — data files loading / validation
 *   'setup'    — faction assignment, player count, seat configuration
 *   'game'     — the main GameTable (imported separately)
 *   'error'    — schema validation failure with message
 */

import { useState, useEffect } from 'react';
import { loadGameData, getFactionOptions } from './dataLoader.js';
import { useGameStore } from '../engine/index.js';
import GameTable from '../ui/GameTable.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap';

function AppStyles() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    document.head.appendChild(link);

    // Base reset
    document.body.style.cssText = [
      'margin:0', 'padding:0', 'background:#0d0b08', 'color:#ecdec6',
      "font-family:'EB Garamond',Georgia,serif", 'overflow:hidden',
    ].join(';');

    return () => { document.head.removeChild(link); };
  }, []);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

const STAT_ICONS = { waterClaim: '◈', money: '$', pr: '★' };
const STAT_COLORS = { waterClaim: '#3d8fa8', money: '#c8a550', pr: '#7eb87e' };

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ fontFamily: "'Playfair Display SC', Georgia, serif",
          fontSize: 13, color: '#c8a550', letterSpacing: '0.18em' }}>
        Law of the River
      </div>
      <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10,
          color: '#4a3820', letterSpacing: '0.12em', textTransform: 'uppercase',
          animation: 'pulse 1.4s ease-in-out infinite' }}>
        Loading data…
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function ErrorScreen({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 14, padding: 40 }}>
      <div style={{ fontFamily: "'Playfair Display SC', Georgia, serif",
          fontSize: 11, color: '#c86060', letterSpacing: '0.14em' }}>
        Schema Error
      </div>
      <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12,
          color: '#7a5e40', maxWidth: 480, textAlign: 'center', lineHeight: 1.6,
          background: '#161310', border: '1px solid #2a2218', padding: '14px 20px', borderRadius: 3 }}>
        {message}
      </div>
      <div style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 11, color: '#4a3820' }}>
        Check the console for details. Fix the JSON file and reload.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEAT ROW  (one player seat in the setup screen)
// ─────────────────────────────────────────────────────────────────────────────

function SeatRow({ seat, factionOptions, takenFactionIds, onChangeName, onChangeFaction, onRemove, isOnly }) {
  const chosen = factionOptions.find(f => f.id === seat.factionId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 220px 28px',
        gap: 8, alignItems: 'center', padding: '8px 0',
        borderBottom: '1px solid #1f1a12' }}>

      {/* Seat number */}
      <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10,
          color: '#4a3820', textAlign: 'center' }}>
        {seat.seatIndex + 1}
      </div>

      {/* Player name input */}
      <input
        value={seat.name}
        onChange={e => onChangeName(seat.seatIndex, e.target.value)}
        placeholder={`Player ${seat.seatIndex + 1}`}
        maxLength={24}
        style={{ background: '#161310', border: '1px solid #29221a', borderRadius: 2,
            color: '#ecdec6', fontFamily: "'EB Garamond', Georgia, serif", fontSize: 13,
            padding: '6px 10px', outline: 'none', width: '100%',
            transition: 'border-color 0.15s' }}
        onFocus={e => (e.target.style.borderColor = '#564835')}
        onBlur={e  => (e.target.style.borderColor = '#29221a')}
      />

      {/* Faction selector */}
      <div style={{ display: 'flex', gap: 4 }}>
        {factionOptions.map(f => {
          const isTaken    = takenFactionIds.has(f.id) && f.id !== seat.factionId;
          const isSelected = f.id === seat.factionId;
          return (
            <button
              key={f.id}
              disabled={isTaken}
              onClick={() => onChangeFaction(seat.seatIndex, f.id)}
              title={`${f.name} (${f.faction_type}) — Start: ◈${f.starting.waterClaim} $${f.starting.money} ★${f.starting.pr}`}
              style={{
                flex: 1, padding: '5px 2px', border: `1px solid ${isSelected ? f.color : '#29221a'}`,
                borderRadius: 2, background: isSelected ? f.color + '22' : '#161310',
                cursor: isTaken ? 'not-allowed' : 'pointer', opacity: isTaken ? 0.25 : 1,
                transition: 'all 0.12s',
              }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: f.color,
                  margin: '0 auto 2px', opacity: isSelected ? 1 : 0.4 }} />
              <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 7,
                  color: isSelected ? f.color : '#4a3820', textAlign: 'center',
                  lineHeight: 1.2, letterSpacing: '0.04em' }}>
                {f.name.slice(0, 3).toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Remove button */}
      <button
        disabled={isOnly}
        onClick={() => onRemove(seat.seatIndex)}
        style={{ background: 'none', border: 'none', color: isOnly ? '#29221a' : '#564835',
            cursor: isOnly ? 'default' : 'pointer', fontSize: 14, lineHeight: 1,
            transition: 'color 0.12s', padding: 0 }}
        title="Remove player">
        ×
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTION STAT PREVIEW  (shown when a faction is hovered/selected)
// ─────────────────────────────────────────────────────────────────────────────

function FactionPreviewPanel({ factionOptions, seats }) {
  // Show stats for all currently selected factions in a comparison grid
  const selected = seats.map(s => factionOptions.find(f => f.id === s.factionId)).filter(Boolean);
  if (selected.length === 0) return null;

  return (
    <div style={{ marginTop: 24, padding: '12px 0 0' }}>
      <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 8,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4a3820', marginBottom: 10 }}>
        Starting Positions
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {selected.map((f, i) => (
          <div key={f.id} style={{ flex: '1 1 100px', padding: '8px 10px',
              border: `1px solid ${f.color}44`, borderRadius: 2,
              background: f.color + '0d' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: f.color }} />
              <span style={{ fontFamily: "'Playfair Display SC', Georgia, serif",
                  fontSize: 9, color: f.color, letterSpacing: '0.06em' }}>
                {f.name}
              </span>
              <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 7,
                  color: '#4a3820', marginLeft: 'auto' }}>
                {f.faction_type === 'state' ? 'State' : 'Reservation'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(f.starting).map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 8,
                      color: STAT_COLORS[k] }}>{STAT_ICONS[k]}</div>
                  <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13,
                      color: '#ecdec6', fontWeight: 700, lineHeight: 1 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function makeDefaultSeats(count, factionOptions) {
  return Array.from({ length: count }, (_, i) => ({
    seatIndex: i,
    name:      '',
    factionId: factionOptions[i]?.id ?? factionOptions[0].id,
  }));
}

function SetupScreen({ factionOptions, onStart }) {
  const [seats, setSeats] = useState(() => makeDefaultSeats(2, factionOptions));
  const [error, setError] = useState('');

  const takenFactionIds = new Set(seats.map(s => s.factionId));

  // ── Seat mutations ────────────────────────────────────────────────────────

  function addSeat() {
    if (seats.length >= MAX_PLAYERS) return;
    const nextFaction = factionOptions.find(f => !takenFactionIds.has(f.id));
    if (!nextFaction) return;
    setSeats(prev => [...prev, {
      seatIndex: prev.length,
      name:      '',
      factionId: nextFaction.id,
    }]);
  }

  function removeSeat(idx) {
    setSeats(prev => {
      const next = prev.filter(s => s.seatIndex !== idx);
      return next.map((s, i) => ({ ...s, seatIndex: i }));
    });
  }

  function changeName(idx, name) {
    setSeats(prev => prev.map(s => s.seatIndex === idx ? { ...s, name } : s));
  }

  function changeFaction(idx, factionId) {
    setSeats(prev => prev.map(s => s.seatIndex === idx ? { ...s, factionId } : s));
  }

  // ── Validation + start ────────────────────────────────────────────────────

  function handleStart() {
    setError('');

    if (seats.length < MIN_PLAYERS) {
      setError(`At least ${MIN_PLAYERS} players required.`); return;
    }

    const factionIds = seats.map(s => s.factionId);
    const uniqueFactions = new Set(factionIds);
    if (uniqueFactions.size !== factionIds.length) {
      setError('Each player must have a unique faction.'); return;
    }

    // Build player configs — blank names get faction name as fallback
    const playerConfigs = seats.map((s, i) => ({
      id:       `p${i + 1}`,
      factionId: s.factionId,
      name:     s.name.trim() || factionOptions.find(f => f.id === s.factionId)?.name || `Player ${i + 1}`,
      isAI:     false,
    }));

    onStart(playerConfigs);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const canAddMore = seats.length < MAX_PLAYERS &&
    factionOptions.some(f => !takenFactionIds.has(f.id));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 540 }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Playfair Display SC', Georgia, serif",
              fontSize: 22, color: '#c8a550', letterSpacing: '0.12em', marginBottom: 4 }}>
            Law of the River
          </div>
          <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 9,
              color: '#4a3820', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Colorado River Water Rights · 2–6 Players · 10 Rounds
          </div>
        </div>

        {/* Section header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 220px 28px',
            gap: 8, padding: '0 0 6px', borderBottom: '1px solid #29221a', marginBottom: 2 }}>
          <div />
          <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 8,
              color: '#4a3820', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Player Name
          </div>
          <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 8,
              color: '#4a3820', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Faction
          </div>
          <div />
        </div>

        {/* Seat rows */}
        {seats.map(seat => (
          <SeatRow
            key={seat.seatIndex}
            seat={seat}
            factionOptions={factionOptions}
            takenFactionIds={takenFactionIds}
            onChangeName={changeName}
            onChangeFaction={changeFaction}
            onRemove={removeSeat}
            isOnly={seats.length <= MIN_PLAYERS}
          />
        ))}

        {/* Add player row */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid #1f1a12' }}>
          <button
            onClick={addSeat}
            disabled={!canAddMore}
            style={{ background: 'none', border: 'none', cursor: canAddMore ? 'pointer' : 'default',
                fontFamily: "'Courier Prime', monospace", fontSize: 10, color: canAddMore ? '#564835' : '#29221a',
                letterSpacing: '0.1em', padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => canAddMore && (e.target.style.color = '#c8a550')}
            onMouseLeave={e => (e.target.style.color = canAddMore ? '#564835' : '#29221a')}>
            + Add Player {seats.length < MAX_PLAYERS ? `(${seats.length}/${MAX_PLAYERS})` : '(max)'}
          </button>
        </div>

        {/* Faction comparison */}
        <FactionPreviewPanel factionOptions={factionOptions} seats={seats} />

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, fontFamily: "'Courier Prime', monospace",
              fontSize: 10, color: '#c86060', padding: '6px 10px',
              border: '1px solid #c8606033', borderRadius: 2, background: '#c860600d' }}>
            {error}
          </div>
        )}

        {/* Start button */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleStart}
            style={{ background: 'none', border: '1px solid #564835', borderRadius: 2,
                color: '#c8a550', fontFamily: "'Playfair Display SC', Georgia, serif",
                fontSize: 11, letterSpacing: '0.18em', padding: '10px 40px',
                cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => {
              e.target.style.background = '#c8a55011';
              e.target.style.borderColor = '#c8a550';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'none';
              e.target.style.borderColor = '#564835';
            }}>
            Begin Session
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]           = useState('loading');
  const [loadError, setLoadError]     = useState('');
  const [factionOptions, setFactions] = useState([]);
  const [gameData, setGameData]       = useState(null);

  const initGame  = useGameStore(s => s.initGame);
  const gameState = useGameStore(s => s.gameState);
  const isGameOver= useGameStore(s => s.isGameOver);

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const data = loadGameData();            // validates synchronously
      const factions = getFactionOptions();   // enriches with colors
      setGameData(data);
      setFactions(factions);
      setScreen('setup');
    } catch (err) {
      console.error('dataLoader error:', err);
      setLoadError(err.message);
      setScreen('error');
    }
  }, []);

  // ── When gameState exists, switch to game screen ──────────────────────────
  useEffect(() => {
    if (gameState && screen === 'setup') setScreen('game');
  }, [gameState]);

  // ── When game ends, show scoring (GameTable renders its own overlay for now) ─
  // Future: setScreen('scores') here once the scoring screen is built

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleStart(playerConfigs) {
    const { cards, playerBoard, sharedBoard } = gameData;
    initGame(playerConfigs, cards, playerBoard, sharedBoard);
    // screen transition handled by the useEffect above watching gameState
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <AppStyles />
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'error'   && <ErrorScreen message={loadError} />}
      {screen === 'setup'   && (
        <SetupScreen factionOptions={factionOptions} onStart={handleStart} />
      )}
      {screen === 'game'    && <GameTable />}
    </>
  );
}
