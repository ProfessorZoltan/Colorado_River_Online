/**
 * netStore.js
 * P2P multiplayer layer (PeerJS, host-authoritative).
 *
 * Modes:
 *   'local' — pass-and-play on one device (default). mySeats = null = all seats.
 *   'host'  — this browser runs the engine. Guests connect via room code.
 *             Guest action requests are validated (seat ownership + turn)
 *             then executed on the real gameStore; full state is broadcast
 *             to all guests after every store change.
 *   'guest' — gameStore actions are replaced with stubs that forward
 *             {t:'action', name, args} to the host; state arrives via sync.
 *
 * UI contract:
 *   const mode    = useNetStore(s => s.mode);
 *   const mySeats = useNetStore(s => s.mySeats);   // null = all (local)
 *   controlsSeat(pid) = mode === 'local' || (mySeats ?? []).includes(pid)
 *   Host/local only: Advance button, Undo/Redo, Resolve Protest.
 */

import { create } from 'zustand';
import Peer from 'peerjs';
import { useGameStore } from '../engine/gameStore.js';

// Room codes avoid ambiguous characters (0/O, 1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PEER_PREFIX   = 'lotr-cro-';

function makeCode(len = 5) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Strip heavy/secret-free fields before shipping state to guests. */
function serializeGameState(gs) {
  if (!gs) return null;
  return {
    ...gs,
    undoStack: [],
    redoStack: [],
    actionLog: gs.actionLog.slice(-200),
  };
}

// ── Guest-requestable actions + host-side ownership validation ──────────────
// validator(args, ownedSeats, gameState) → true if this sender may run it
const firstArgOwned  = (args, owned) => owned.includes(args[0]);
const activeSeatOwned = (args, owned, gs) =>
  owned.includes(gs.playerOrder[gs.activePlayerIndex]);

const GUEST_ACTIONS = {
  playCardAction:           firstArgOwned,
  placeWaterOnProject:      firstArgOwned,
  acquireLawyer:            firstArgOwned,
  acquireActivist:          firstArgOwned,
  purchasePartnership:      firstArgOwned,
  usePartnershipAbility:    firstArgOwned,
  cancelPartnershipAcquire: firstArgOwned,
  unlockWaterBank:          firstArgOwned,
  withdrawFromWaterBank:    firstArgOwned,
  depositToWaterBank:       firstArgOwned,  // args[0] = depositorId
  placeScInfluence:         firstArgOwned,
  activateProtestActivist:  firstArgOwned,
  passPlayerTurn:           activeSeatOwned,
  endPlayerTurn:            activeSeatOwned,
  resolveChoice: (args, owned) => {
    const data = args[0] ?? {};
    // Protest resolution is table-level — host only
    if (data.subtype === 'protest_activation_round') return false;
    return owned.includes(data.playerId);
  },
};

// Store-action names replaced with forwarding stubs on guests.
// advanceToNextPhase / undo / redo are host-only and stubbed to no-ops.
const GUEST_STUB_NAMES = Object.keys(GUEST_ACTIONS);

let _originalActions = null; // saved gameStore actions for restoring local mode

export const useNetStore = create((set, get) => ({
  mode:        'local',
  roomCode:    null,
  peer:        null,
  hostConn:    null,     // guest → host connection
  connections: {},       // host: { [peerId]: DataConnection }
  peerError:   null,
  connecting:  false,

  // Lobby (pre-game): players claim factions; host starts the game
  lobby: null,           // { players: [{ key, name, factionId, connected }], started }
  myKey: 'host',         // 'host' on host/local, our peerId on guests

  // In-game seat map: { [playerId]: { key, name, connected } }
  seatMap: null,
  mySeats: null,         // playerIds this client controls; null = all (local mode)

  // ── Host ─────────────────────────────────────────────────────────────────

  hostGame(hostName) {
    const code   = makeCode();
    const peerId = PEER_PREFIX + code.toLowerCase();
    set({ connecting: true, peerError: null });

    const peer = new Peer(peerId);

    peer.on('open', () => {
      set({
        mode: 'host', peer, roomCode: code, connecting: false,
        myKey: 'host',
        lobby: {
          players: [{ key: 'host', name: hostName || 'Host', factionId: null, connected: true }],
          started: false,
        },
      });
      get()._watchGameStore();
    });

    peer.on('connection', conn => get()._onGuestConnection(conn));
    peer.on('error', err => {
      console.error('PeerJS host error:', err);
      set({ peerError: err.type === 'unavailable-id'
        ? 'Room code collision — try hosting again.'
        : `Connection error: ${err.type}`, connecting: false });
    });
  },

  /**
   * Re-host a saved online game after a page reload: recreate the room under
   * the SAME code, restore the seat map with all guests marked disconnected,
   * and let them rejoin (the 'hello' name-matching path re-seats them).
   * The game state itself is restored separately by the caller.
   */
  resumeHost(roomCode, seatMap) {
    const peerId = PEER_PREFIX + String(roomCode).toLowerCase();
    set({ connecting: true, peerError: null });

    const peer = new Peer(peerId);

    peer.on('open', () => {
      const restoredSeats = Object.fromEntries(
        Object.entries(seatMap).map(([pid, seat]) =>
          [pid, { ...seat, connected: seat.key === 'host' }])
      );
      set({
        mode: 'host', peer, roomCode, connecting: false, myKey: 'host',
        lobby: { players: [], started: true },
        seatMap: restoredSeats,
        mySeats: Object.entries(restoredSeats)
          .filter(([, s2]) => s2.key === 'host').map(([pid]) => pid),
      });
      get()._watchGameStore();
    });

    peer.on('connection', conn => get()._onGuestConnection(conn));
    peer.on('error', err => {
      console.error('PeerJS resume error:', err);
      set({ peerError: err.type === 'unavailable-id'
        ? 'The old room is still registered — wait ~30s and try again.'
        : `Connection error: ${err.type}`, connecting: false });
    });
  },

  _onGuestConnection(conn) {
    conn.on('open', () => {
      set(s => ({ connections: { ...s.connections, [conn.peer]: conn } }));
    });
    conn.on('data', msg => get()._onHostReceive(conn, msg));
    conn.on('close', () => get()._onGuestDisconnect(conn.peer));
    conn.on('error', () => get()._onGuestDisconnect(conn.peer));
  },

  _onGuestDisconnect(peerId) {
    set(s => {
      const connections = { ...s.connections };
      delete connections[peerId];
      let lobby = s.lobby;
      let seatMap = s.seatMap;
      if (lobby && !lobby.started) {
        lobby = { ...lobby, players: lobby.players.filter(p => p.key !== peerId) };
      }
      if (seatMap) {
        seatMap = Object.fromEntries(Object.entries(seatMap).map(([pid, seat]) =>
          [pid, seat.key === peerId ? { ...seat, connected: false } : seat]));
      }
      return { connections, lobby, seatMap };
    });
    get()._broadcastLobby();
    get().broadcastState();
  },

  _onHostReceive(conn, msg) {
    const s = get();
    if (!msg || typeof msg !== 'object') return;

    switch (msg.t) {
      case 'hello': {
        const name = String(msg.name || 'Guest').slice(0, 24);
        if (s.lobby && !s.lobby.started) {
          set(st => ({
            lobby: {
              ...st.lobby,
              players: [
                ...st.lobby.players.filter(p => p.key !== conn.peer),
                { key: conn.peer, name, factionId: null, connected: true },
              ],
            },
          }));
          get()._broadcastLobby();
        } else if (s.seatMap) {
          // Game in progress — reconnect by matching a disconnected seat's name
          const entry = Object.entries(s.seatMap).find(
            ([, seat]) => !seat.connected && seat.name === name
          );
          if (entry) {
            const [pid, seat] = entry;
            set(st => ({ seatMap: { ...st.seatMap, [pid]: { ...seat, key: conn.peer, connected: true } } }));
            get().broadcastState();
          } else {
            conn.send({ t: 'error', message: 'Game already started — no matching open seat.' });
          }
        }
        break;
      }

      case 'setFaction': {
        if (!s.lobby || s.lobby.started) return;
        const factionId = msg.factionId;
        const taken = s.lobby.players.some(p => p.factionId === factionId && p.key !== conn.peer);
        if (taken && factionId !== null) return;
        set(st => ({
          lobby: { ...st.lobby, players: st.lobby.players.map(p =>
            p.key === conn.peer ? { ...p, factionId } : p) },
        }));
        get()._broadcastLobby();
        break;
      }

      case 'setName': {
        if (!s.lobby || s.lobby.started) return;
        const name = String(msg.name || 'Guest').slice(0, 24);
        set(st => ({
          lobby: { ...st.lobby, players: st.lobby.players.map(p =>
            p.key === conn.peer ? { ...p, name } : p) },
        }));
        get()._broadcastLobby();
        break;
      }

      case 'action': {
        const { name, args = [] } = msg;
        const validator = GUEST_ACTIONS[name];
        if (!validator) {
          conn.send({ t: 'error', message: `Action not allowed: ${name}` });
          return;
        }
        const gs = useGameStore.getState().gameState;
        const owned = get()._seatsOwnedBy(conn.peer);
        if (!gs || !validator(args, owned, gs)) {
          conn.send({ t: 'error', message: `Not your seat/turn for ${name}` });
          return;
        }
        try {
          useGameStore.getState()[name](...args);
        } catch (err) {
          console.error(`Guest action ${name} failed:`, err);
          conn.send({ t: 'error', message: `Action failed: ${name}` });
        }
        break;
      }

      default:
        break;
    }
  },

  _seatsOwnedBy(key) {
    const { seatMap } = get();
    if (!seatMap) return [];
    return Object.entries(seatMap)
      .filter(([, seat]) => seat.key === key)
      .map(([pid]) => pid);
  },

  hostSetFaction(key, factionId) {
    // Host UI sets its own faction (or clears a guest's)
    set(st => ({
      lobby: { ...st.lobby, players: st.lobby.players.map(p =>
        p.key === key ? { ...p, factionId } : p) },
    }));
    get()._broadcastLobby();
  },

  hostSetName(name) {
    set(st => ({
      lobby: { ...st.lobby, players: st.lobby.players.map(p =>
        p.key === 'host' ? { ...p, name: String(name || 'Host').slice(0, 24) } : p) },
    }));
    get()._broadcastLobby();
  },

  /** Host starts the online game from the lobby. */
  startOnlineGame(cards, playerBoardJson, sharedBoardJson) {
    const { lobby } = get();
    const ready = lobby.players.filter(p => p.factionId);
    if (ready.length < 2) { console.warn('startOnlineGame: need ≥2 players with factions'); return; }

    const playerConfigs = ready.map((p, i) => ({
      id: `p${i + 1}`, factionId: p.factionId, name: p.name, isAI: false,
    }));
    const seatMap = {};
    ready.forEach((p, i) => {
      seatMap[`p${i + 1}`] = { key: p.key, name: p.name, connected: true };
    });

    set(st => ({
      lobby: { ...st.lobby, started: true },
      seatMap,
      mySeats: Object.entries(seatMap).filter(([, s2]) => s2.key === 'host').map(([pid]) => pid),
    }));

    useGameStore.getState().initGame(playerConfigs, cards, playerBoardJson, sharedBoardJson);
    get()._broadcastLobby();
    get().broadcastState();
  },

  _watchGameStore() {
    if (get()._unsubGame) return;
    const unsub = useGameStore.subscribe(() => {
      if (get().mode === 'host') get().broadcastState();
    });
    set({ _unsubGame: unsub });
  },

  broadcastState() {
    const s = get();
    if (s.mode !== 'host' || !s.lobby?.started) return;
    const g = useGameStore.getState();
    const payload = {
      gameState:          serializeGameState(g.gameState),
      pendingEffects:     g.pendingEffects,
      isGameOver:         g.isGameOver,
      finalScores:        g.finalScores,
      protestActivations: g.protestActivations,
      seatMap:            s.seatMap,
    };
    for (const conn of Object.values(s.connections)) {
      if (conn.open) conn.send({ t: 'state', payload });
    }
  },

  _broadcastLobby() {
    const s = get();
    if (s.mode !== 'host' || !s.lobby) return;
    for (const conn of Object.values(s.connections)) {
      if (conn.open) conn.send({ t: 'lobby', lobby: s.lobby });
    }
  },

  // ── Guest ────────────────────────────────────────────────────────────────

  joinGame(code, name) {
    const hostId = PEER_PREFIX + String(code).trim().toLowerCase();
    set({ connecting: true, peerError: null });

    const peer = new Peer();
    peer.on('open', () => {
      const conn = peer.connect(hostId, { reliable: true });

      conn.on('open', () => {
        set({
          mode: 'guest', peer, hostConn: conn, connecting: false,
          roomCode: String(code).trim().toUpperCase(),
          myKey: peer.id,
        });
        get()._installGuestStubs();
        conn.send({ t: 'hello', name });
        // Remember for one-click rejoin after a refresh/disconnect
        try {
          localStorage.setItem('lotr-guest', JSON.stringify({
            code: String(code).trim().toUpperCase(), name,
          }));
        } catch { /* storage unavailable */ }
      });

      conn.on('data', msg => get()._onGuestReceive(msg));
      conn.on('close', () => set({ peerError: 'Lost connection to host.', hostConn: null }));
      conn.on('error', () => set({ peerError: 'Connection to host failed.', connecting: false }));
    });
    peer.on('error', err => {
      console.error('PeerJS guest error:', err);
      set({ peerError: err.type === 'peer-unavailable'
        ? 'Room not found — check the code.'
        : `Connection error: ${err.type}`, connecting: false });
    });
  },

  _onGuestReceive(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'lobby':
        set({ lobby: msg.lobby });
        break;
      case 'state': {
        const { gameState, pendingEffects, isGameOver, finalScores, protestActivations, seatMap } = msg.payload;
        useGameStore.setState({ gameState, pendingEffects, isGameOver, finalScores, protestActivations });
        const myKey = get().myKey;
        set({
          seatMap,
          mySeats: Object.entries(seatMap ?? {})
            .filter(([, seat]) => seat.key === myKey)
            .map(([pid]) => pid),
          lobby: { ...(get().lobby ?? { players: [] }), started: true },
        });
        break;
      }
      case 'error':
        console.warn('Host rejected:', msg.message);
        set({ peerError: msg.message });
        setTimeout(() => set({ peerError: null }), 4000);
        break;
      default:
        break;
    }
  },

  guestSetFaction(factionId) {
    get().hostConn?.send({ t: 'setFaction', factionId });
  },

  guestSetName(name) {
    get().hostConn?.send({ t: 'setName', name });
  },

  _installGuestStubs() {
    if (_originalActions) return;
    const g = useGameStore.getState();
    _originalActions = {};
    const stubs = {};
    for (const name of GUEST_STUB_NAMES) {
      _originalActions[name] = g[name];
      stubs[name] = (...args) => {
        const conn = get().hostConn;
        if (conn?.open) conn.send({ t: 'action', name, args });
      };
    }
    // Host-only controls become no-ops on guests
    for (const name of ['advanceToNextPhase', 'undo', 'redo', 'dismissChoiceEffect']) {
      _originalActions[name] = g[name];
      stubs[name] = () => console.warn(`${name}: host only`);
    }
    useGameStore.setState(stubs);
  },

  // ── Shared ───────────────────────────────────────────────────────────────

  leaveGame() {
    const s = get();
    try { s.peer?.destroy(); } catch { /* ignore */ }
    if (s._unsubGame) { s._unsubGame(); }
    if (_originalActions) {
      useGameStore.setState(_originalActions);
      _originalActions = null;
    }
    set({
      mode: 'local', roomCode: null, peer: null, hostConn: null,
      connections: {}, peerError: null, connecting: false,
      lobby: null, seatMap: null, mySeats: null, myKey: 'host',
      _unsubGame: null,
    });
  },
}));

/** Convenience: does this client control the given seat? */
export function controlsSeat(mode, mySeats, playerId) {
  return mode === 'local' || (mySeats ?? []).includes(playerId);
}
