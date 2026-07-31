/**
 * App.jsx
 * Root component. Owns the menu → setup/lobby → game lifecycle.
 *
 * Screens:
 *   'loading'    — data files loading / validation
 *   'menu'       — choose: local pass-and-play, host online, join online
 *   'setup'      — local: faction assignment, player count, seat configuration
 *   'host_lobby' — online host: room code + connected players + start
 *   'join'       — online guest: enter code, then wait in lobby
 *   'game'       — the main GameTable (imported separately)
 *   'error'      — schema validation failure with message
 */

import { useState, useEffect } from 'react';
import { loadGameData, getFactionOptions } from './dataLoader.js';
import { useGameStore } from '../engine/index.js';
import { useNetStore } from '../net/netStore.js';
import GameTable from '../ui/GameTable.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

function AppStyles() {
  useEffect(() => {
    // Fonts are loaded from index.html; this only applies the base reset.
    document.body.style.cssText = [
      'margin:0', 'padding:0', 'background:#0d0b08', 'color:#ecdec6',
      "font-family:'EB Garamond',Georgia,serif", 'overflow:auto',
    ].join(';');
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

const MONO    = "'Courier Prime', monospace";
const DISPLAY = "'Playfair Display SC', Georgia, serif";
const BODY    = "'EB Garamond', Georgia, serif";

// ─────────────────────────────────────────────────────────────────────────────
// SAVE / RESUME  (refresh-proofing: a reload must never destroy a live game)
// ─────────────────────────────────────────────────────────────────────────────

const SAVE_KEY = 'lotr-save';

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (save?.v !== 1 || !save.game?.gameState) return null;
    return save;
  } catch { return null; }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

function writeSave() {
  const g   = useGameStore.getState();
  const net = useNetStore.getState();
  if (!g.gameState) return;
  if (net.mode === 'guest') return;   // guests re-sync from the host instead
  const save = {
    v: 1,
    savedAt: Date.now(),
    game: {
      gameState: { ...g.gameState, undoStack: [], redoStack: [] },
      pendingEffects:         g.pendingEffects,
      pendingIncomeModifiers: g.pendingIncomeModifiers,
      protestActivations:     g.protestActivations,
      isGameOver:             g.isGameOver,
      finalScores:            g.finalScores,
    },
    net: net.mode === 'host'
      ? { mode: 'host', roomCode: net.roomCode, seatMap: net.seatMap }
      : { mode: 'local' },
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TitleBlock({ subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 22, color: '#c8a550',
          letterSpacing: '0.12em', marginBottom: 4 }}>
        Law of the River
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: '#4a3820',
          letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        {subtitle}
      </div>
    </div>
  );
}

function BigButton({ label, hint, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: 'none', border: '1px solid #564835', borderRadius: 2,
          color: disabled ? '#4a3820' : '#c8a550', fontFamily: DISPLAY,
          fontSize: 12, letterSpacing: '0.14em', padding: '14px 20px',
          cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
          width: '100%', textAlign: 'center', opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = '#c8a55011'; e.currentTarget.style.borderColor = '#c8a550'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#564835'; }}>
      {label}
      {hint && (
        <div style={{ fontFamily: MONO, fontSize: 9, color: '#7a5e40',
            letterSpacing: '0.08em', marginTop: 5, textTransform: 'none' }}>
          {hint}
        </div>
      )}
    </button>
  );
}

function BackLink({ onClick, label = '← Back' }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#564835',
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em',
          cursor: 'pointer', padding: 0, marginBottom: 18 }}
      onMouseEnter={e => (e.target.style.color = '#c8a550')}
      onMouseLeave={e => (e.target.style.color = '#564835')}>
      {label}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, maxLength = 24, style = {} }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{ background: '#161310', border: '1px solid #29221a', borderRadius: 2,
          color: '#ecdec6', fontFamily: BODY, fontSize: 13,
          padding: '8px 12px', outline: 'none', width: '100%',
          transition: 'border-color 0.15s', boxSizing: 'border-box', ...style }}
      onFocus={e => (e.target.style.borderColor = '#564835')}
      onBlur={e  => (e.target.style.borderColor = '#29221a')}
    />
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 10, color: '#c86060',
        padding: '6px 10px', border: '1px solid #c8606033', borderRadius: 2,
        background: '#c860600d' }}>
      {children}
    </div>
  );
}

/** Row of faction buttons (used by lobby screens). */
function FactionPicker({ factionOptions, takenIds, selectedId, onPick, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {factionOptions.map(f => {
        const isTaken    = takenIds.has(f.id) && f.id !== selectedId;
        const isSelected = f.id === selectedId;
        const blocked    = disabled || isTaken;
        return (
          <button
            key={f.id}
            disabled={blocked}
            onClick={() => onPick(f.id)}
            title={`${f.name} (${f.faction_type}) — Start: ◈${f.starting.waterClaim} $${f.starting.money} ★${f.starting.pr}`}
            style={{
              flex: 1, padding: '5px 2px',
              border: `1px solid ${isSelected ? f.color : '#29221a'}`,
              borderRadius: 2, background: isSelected ? f.color + '22' : '#161310',
              cursor: blocked ? 'not-allowed' : 'pointer',
              opacity: isTaken ? 0.25 : disabled ? 0.6 : 1,
              transition: 'all 0.12s',
            }}>
            <div style={{ width: 8, height: 8, borderRadius: 1, background: f.color,
                margin: '0 auto 2px', opacity: isSelected ? 1 : 0.4 }} />
            <div style={{ fontFamily: MONO, fontSize: 7,
                color: isSelected ? f.color : '#4a3820', textAlign: 'center',
                lineHeight: 1.2, letterSpacing: '0.04em' }}>
              {f.name.slice(0, 3).toUpperCase()}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ fontFamily: DISPLAY,
          fontSize: 13, color: '#c8a550', letterSpacing: '0.18em' }}>
        Law of the River
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10,
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
      <div style={{ fontFamily: DISPLAY,
          fontSize: 11, color: '#c86060', letterSpacing: '0.14em' }}>
        Schema Error
      </div>
      <div style={{ fontFamily: MONO, fontSize: 12,
          color: '#7a5e40', maxWidth: 480, textAlign: 'center', lineHeight: 1.6,
          background: '#161310', border: '1px solid #2a2218', padding: '14px 20px', borderRadius: 3 }}>
        {message}
      </div>
      <div style={{ fontFamily: BODY, fontSize: 11, color: '#4a3820' }}>
        Check the console for details. Fix the JSON file and reload.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function MenuScreen({ onLocal, onHost, onJoin, onResume }) {
  const [save, setSave] = useState(() => readSave());
  const resumable = save && !save.game.isGameOver;
  const roundLabel = resumable
    ? `Round ${save.game.gameState.round}/10 · ${save.net.mode === 'host'
        ? `online room ${save.net.roomCode}` : 'pass & play'}`
    : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <TitleBlock subtitle="Colorado River Water Rights · 2–6 Players · 10 Rounds" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {resumable && (
            <div style={{ position: 'relative' }}>
              <BigButton
                label="Resume Game"
                hint={roundLabel}
                onClick={() => onResume(save)}
              />
              <button
                onClick={() => { clearSave(); setSave(null); }}
                title="Discard the saved game"
                style={{ position: 'absolute', top: 6, right: 8, background: 'none',
                    border: 'none', color: '#564835', fontSize: 13, cursor: 'pointer',
                    padding: 2 }}>
                ×
              </button>
            </div>
          )}
          <BigButton
            label="Play Online — Host"
            hint="Runs the game in your browser; friends join with a room code"
            onClick={onHost}
          />
          <BigButton
            label="Play Online — Join"
            hint="Enter a room code from the host"
            onClick={onJoin}
          />
          <BigButton
            label="Pass & Play (Local)"
            hint="Everyone shares this screen"
            onClick={onLocal}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEAT ROW  (one player seat in the local setup screen)
// ─────────────────────────────────────────────────────────────────────────────

function SeatRow({ seat, factionOptions, takenFactionIds, onChangeName, onChangeFaction, onRemove, isOnly }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 220px 28px',
        gap: 8, alignItems: 'center', padding: '8px 0',
        borderBottom: '1px solid #1f1a12' }}>

      {/* Seat number */}
      <div style={{ fontFamily: MONO, fontSize: 10,
          color: '#4a3820', textAlign: 'center' }}>
        {seat.seatIndex + 1}
      </div>

      {/* Player name input */}
      <TextInput
        value={seat.name}
        onChange={v => onChangeName(seat.seatIndex, v)}
        placeholder={`Player ${seat.seatIndex + 1}`}
        style={{ fontSize: 13, padding: '6px 10px' }}
      />

      {/* Faction selector */}
      <FactionPicker
        factionOptions={factionOptions}
        takenIds={takenFactionIds}
        selectedId={seat.factionId}
        onPick={fid => onChangeFaction(seat.seatIndex, fid)}
      />

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

function FactionPreviewPanel({ factionOptions, selectedIds }) {
  const selected = selectedIds
    .map(id => factionOptions.find(f => f.id === id))
    .filter(Boolean);
  if (selected.length === 0) return null;

  return (
    <div style={{ marginTop: 24, padding: '12px 0 0' }}>
      <div style={{ fontFamily: MONO, fontSize: 8,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4a3820', marginBottom: 10 }}>
        Starting Positions
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {selected.map(f => (
          <div key={f.id} style={{ flex: '1 1 100px', padding: '8px 10px',
              border: `1px solid ${f.color}44`, borderRadius: 2,
              background: f.color + '0d' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: f.color }} />
              <span style={{ fontFamily: DISPLAY,
                  fontSize: 9, color: f.color, letterSpacing: '0.06em' }}>
                {f.name}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 7,
                  color: '#4a3820', marginLeft: 'auto' }}>
                {f.faction_type === 'state' ? 'State' : 'Reservation'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(f.starting).map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: MONO, fontSize: 8,
                      color: STAT_COLORS[k] }}>{STAT_ICONS[k]}</div>
                  <div style={{ fontFamily: MONO, fontSize: 13,
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
// LOCAL SETUP SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function makeDefaultSeats(count, factionOptions) {
  return Array.from({ length: count }, (_, i) => ({
    seatIndex: i,
    name:      '',
    factionId: factionOptions[i]?.id ?? factionOptions[0].id,
  }));
}

function SetupScreen({ factionOptions, onStart, onBack }) {
  const [seats, setSeats] = useState(() => makeDefaultSeats(2, factionOptions));
  const [error, setError] = useState('');

  const takenFactionIds = new Set(seats.map(s => s.factionId));

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

    const playerConfigs = seats.map((s, i) => ({
      id:       `p${i + 1}`,
      factionId: s.factionId,
      name:     s.name.trim() || factionOptions.find(f => f.id === s.factionId)?.name || `Player ${i + 1}`,
      isAI:     false,
    }));

    onStart(playerConfigs);
  }

  const canAddMore = seats.length < MAX_PLAYERS &&
    factionOptions.some(f => !takenFactionIds.has(f.id));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <BackLink onClick={onBack} />
        <TitleBlock subtitle="Pass & Play · Everyone shares this screen" />

        {/* Section header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 220px 28px',
            gap: 8, padding: '0 0 6px', borderBottom: '1px solid #29221a', marginBottom: 2 }}>
          <div />
          <div style={{ fontFamily: MONO, fontSize: 8,
              color: '#4a3820', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Player Name
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8,
              color: '#4a3820', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Faction
          </div>
          <div />
        </div>

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

        <div style={{ padding: '10px 0', borderBottom: '1px solid #1f1a12' }}>
          <button
            onClick={addSeat}
            disabled={!canAddMore}
            style={{ background: 'none', border: 'none', cursor: canAddMore ? 'pointer' : 'default',
                fontFamily: MONO, fontSize: 10, color: canAddMore ? '#564835' : '#29221a',
                letterSpacing: '0.1em', padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => canAddMore && (e.target.style.color = '#c8a550')}
            onMouseLeave={e => (e.target.style.color = canAddMore ? '#564835' : '#29221a')}>
            + Add Player {seats.length < MAX_PLAYERS ? `(${seats.length}/${MAX_PLAYERS})` : '(max)'}
          </button>
        </div>

        <FactionPreviewPanel factionOptions={factionOptions}
          selectedIds={seats.map(s => s.factionId)} />

        <ErrorNote>{error}</ErrorNote>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleStart}
            style={{ background: 'none', border: '1px solid #564835', borderRadius: 2,
                color: '#c8a550', fontFamily: DISPLAY,
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
// ONLINE — HOST LOBBY
// ─────────────────────────────────────────────────────────────────────────────

function HostLobbyScreen({ factionOptions, gameData, onBack }) {
  const roomCode   = useNetStore(s => s.roomCode);
  const connecting = useNetStore(s => s.connecting);
  const peerError  = useNetStore(s => s.peerError);
  const lobby      = useNetStore(s => s.lobby);
  const hostSetFaction   = useNetStore(s => s.hostSetFaction);
  const hostSetName      = useNetStore(s => s.hostSetName);
  const startOnlineGame  = useNetStore(s => s.startOnlineGame);

  const players  = lobby?.players ?? [];
  const takenIds = new Set(players.map(p => p.factionId).filter(Boolean));
  const ready    = players.filter(p => p.factionId);
  const canStart = ready.length >= MIN_PLAYERS && ready.length <= MAX_PLAYERS;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <BackLink onClick={onBack} label="← Leave room" />
        <TitleBlock subtitle="Hosting an online game" />

        {/* Room code */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#4a3820',
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Room code — share with your friends
          </div>
          <div style={{ fontFamily: MONO, fontSize: 34, color: '#c8a550',
              letterSpacing: '0.35em', fontWeight: 700, paddingLeft: '0.35em' }}>
            {connecting ? '·····' : roomCode ?? '—'}
          </div>
          <div style={{ fontFamily: BODY, fontSize: 11, color: '#7a5e40', marginTop: 6 }}>
            They open this site, choose “Play Online — Join”, and enter the code.
          </div>
        </div>

        {/* Players */}
        <div style={{ borderTop: '1px solid #29221a' }}>
          {players.map(p => (
            <div key={p.key} style={{ display: 'grid',
                gridTemplateColumns: '1fr 220px', gap: 8, alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #1f1a12' }}>
              {p.key === 'host' ? (
                <TextInput value={p.name} onChange={hostSetName} placeholder="Your name"
                  style={{ fontSize: 13, padding: '6px 10px' }} />
              ) : (
                <div style={{ fontFamily: BODY, fontSize: 13, color: '#ecdec6' }}>
                  {p.name}
                  <span style={{ fontFamily: MONO, fontSize: 8, color: '#4a3820', marginLeft: 8 }}>
                    connected
                  </span>
                </div>
              )}
              <FactionPicker
                factionOptions={factionOptions}
                takenIds={takenIds}
                selectedId={p.factionId}
                onPick={fid => p.key === 'host' && hostSetFaction('host', fid)}
                disabled={p.key !== 'host'}
              />
            </div>
          ))}
          {players.length === 1 && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#4a3820',
                padding: '14px 0', textAlign: 'center', letterSpacing: '0.08em' }}>
              Waiting for players to join…
            </div>
          )}
        </div>

        <FactionPreviewPanel factionOptions={factionOptions}
          selectedIds={players.map(p => p.factionId).filter(Boolean)} />

        <ErrorNote>{peerError}</ErrorNote>
        {!canStart && players.length > 1 && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#7a5e40', marginTop: 12 }}>
            Everyone must pick a faction before the game can start.
          </div>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => canStart && startOnlineGame(gameData.cards, gameData.playerBoard, gameData.sharedBoard)}
            disabled={!canStart}
            style={{ background: 'none', border: '1px solid #564835', borderRadius: 2,
                color: canStart ? '#c8a550' : '#4a3820', fontFamily: DISPLAY,
                fontSize: 11, letterSpacing: '0.18em', padding: '10px 40px',
                cursor: canStart ? 'pointer' : 'default', transition: 'all 0.15s' }}
            onMouseEnter={e => { if (canStart) { e.target.style.background = '#c8a55011'; e.target.style.borderColor = '#c8a550'; } }}
            onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.borderColor = '#564835'; }}>
            Start Game ({ready.length} player{ready.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE — JOIN / GUEST LOBBY
// ─────────────────────────────────────────────────────────────────────────────

function JoinScreen({ factionOptions, onBack }) {
  // Prefill from the last joined room for one-click rejoin after a refresh
  const [remembered] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lotr-guest') ?? 'null'); }
    catch { return null; }
  });
  const [name, setName] = useState(remembered?.name ?? '');
  const [code, setCode] = useState(remembered?.code ?? '');

  const mode       = useNetStore(s => s.mode);
  const connecting = useNetStore(s => s.connecting);
  const peerError  = useNetStore(s => s.peerError);
  const lobby      = useNetStore(s => s.lobby);
  const myKey      = useNetStore(s => s.myKey);
  const joinGame        = useNetStore(s => s.joinGame);
  const guestSetFaction = useNetStore(s => s.guestSetFaction);

  const joined   = mode === 'guest';
  const players  = lobby?.players ?? [];
  const me       = players.find(p => p.key === myKey);
  const takenIds = new Set(players.map(p => p.factionId).filter(Boolean));

  const canJoin = code.trim().length >= 4 && name.trim().length >= 1 && !connecting;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <BackLink onClick={onBack} label={joined ? '← Leave room' : '← Back'} />
        <TitleBlock subtitle="Join an online game" />

        {!joined && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput value={name} onChange={setName} placeholder="Your name" />
            <TextInput value={code} onChange={v => setCode(v.toUpperCase())}
              placeholder="Room code (e.g. K7Q2M)" maxLength={8}
              style={{ fontFamily: MONO, letterSpacing: '0.3em', textTransform: 'uppercase' }} />
            <BigButton
              label={connecting ? 'Connecting…' : 'Join Room'}
              onClick={() => canJoin && joinGame(code, name.trim())}
              disabled={!canJoin}
            />
          </div>
        )}

        {joined && (
          <>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#7eb87e',
                letterSpacing: '0.12em', textAlign: 'center', marginBottom: 20 }}>
              ✓ Connected to room {useNetStore.getState().roomCode}
            </div>

            {/* Player list */}
            <div style={{ borderTop: '1px solid #29221a' }}>
              {players.map(p => (
                <div key={p.key} style={{ display: 'grid',
                    gridTemplateColumns: '1fr 220px', gap: 8, alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #1f1a12' }}>
                  <div style={{ fontFamily: BODY, fontSize: 13,
                      color: p.key === myKey ? '#c8a550' : '#ecdec6' }}>
                    {p.name}{p.key === myKey ? ' (you)' : ''}
                    {p.key === 'host' && (
                      <span style={{ fontFamily: MONO, fontSize: 8, color: '#4a3820', marginLeft: 8 }}>
                        host
                      </span>
                    )}
                  </div>
                  <FactionPicker
                    factionOptions={factionOptions}
                    takenIds={takenIds}
                    selectedId={p.factionId}
                    onPick={fid => p.key === myKey && guestSetFaction(fid)}
                    disabled={p.key !== myKey}
                  />
                </div>
              ))}
            </div>

            {!me?.factionId && (
              <div style={{ fontFamily: MONO, fontSize: 9, color: '#c8a550', marginTop: 14 }}>
                Pick your faction above.
              </div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#4a3820',
                marginTop: 14, textAlign: 'center', letterSpacing: '0.08em',
                animation: 'pulse 1.6s ease-in-out infinite' }}>
              Waiting for the host to start the game…
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:1} }`}</style>
          </>
        )}

        <ErrorNote>{peerError}</ErrorNote>
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

  const hostGame  = useNetStore(s => s.hostGame);
  const leaveGame = useNetStore(s => s.leaveGame);

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const data = loadGameData();            // validates synchronously
      const factions = getFactionOptions();   // enriches with colors
      setGameData(data);
      setFactions(factions);
      setScreen('menu');
    } catch (err) {
      console.error('dataLoader error:', err);
      setLoadError(err.message);
      setScreen('error');
    }
  }, []);

  // ── When gameState exists (local start, host start, or guest sync) → game ──
  useEffect(() => {
    if (gameState && screen !== 'game' && screen !== 'loading' && screen !== 'error') {
      setScreen('game');
    }
  }, [gameState, screen]);

  // ── Autosave: persist every host/local state change so a refresh resumes ──
  useEffect(() => {
    const unsub = useGameStore.subscribe(() => writeSave());
    return unsub;
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleLocalStart(playerConfigs) {
    const { cards, playerBoard, sharedBoard } = gameData;
    initGame(playerConfigs, cards, playerBoard, sharedBoard);
  }

  function handleResume(save) {
    useGameStore.setState({
      ...save.game,
      boardTemplate:      gameData.playerBoard.board_template,
      pendingTurnAdvance: false,
      undoPending:        [],
      redoPending:        [],
    });
    if (save.net.mode === 'host') {
      useNetStore.getState().resumeHost(save.net.roomCode, save.net.seatMap);
    }
    setScreen('game');
  }

  function backToMenu() {
    leaveGame();
    setScreen('menu');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <AppStyles />
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'error'   && <ErrorScreen message={loadError} />}
      {screen === 'menu'    && (
        <MenuScreen
          onLocal={() => setScreen('setup')}
          onHost={() => { hostGame(); setScreen('host_lobby'); }}
          onJoin={() => setScreen('join')}
          onResume={handleResume}
        />
      )}
      {screen === 'setup'   && (
        <SetupScreen factionOptions={factionOptions} onStart={handleLocalStart} onBack={backToMenu} />
      )}
      {screen === 'host_lobby' && (
        <HostLobbyScreen factionOptions={factionOptions} gameData={gameData} onBack={backToMenu} />
      )}
      {screen === 'join' && (
        <JoinScreen factionOptions={factionOptions} onBack={backToMenu} />
      )}
      {screen === 'game'    && <GameTable />}
    </>
  );
}
