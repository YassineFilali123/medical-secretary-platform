/**
 * Live Chat realtime server.
 *
 * WHY A SEPARATE PROCESS
 *   The API runs on PHP's built-in server (`php -S`), which handles one request
 *   at a time and closes the connection after each — it physically cannot hold
 *   a WebSocket open. A long-running process is required. Composer is not
 *   installed in this project (there is no vendor/ directory), so a PHP
 *   WebSocket library such as Ratchet is not available; Node already ships with
 *   the toolchain and is what start-dev.js already orchestrates.
 *
 * WHAT THIS PROCESS IS — AND IS NOT
 *   It is a TRANSPORT RELAY. It stores nothing, and it decides nothing.
 *
 *   - Messages are still written by PHP through the existing
 *     POST /api/livechat/message. Persistence is unchanged.
 *   - Authentication is delegated to PHP: the socket's token is verified by
 *     calling GET /api/profile. This process never reads the user table.
 *   - Authorization to join a conversation is delegated to PHP: a subscribe is
 *     accepted only if GET /api/livechat/messages?chatId=N succeeds for that
 *     same token. LiveChatController::canAccessChat() therefore remains the one
 *     and only rule — a patient gets their own chat, the assigned secretary
 *     gets theirs, and any other secretary is refused with a 403 that this
 *     server simply forwards. No authorization logic is duplicated here.
 *
 *   PHP calls POST /publish (shared secret) after it has committed a write, and
 *   this process fans the event out to the sockets subscribed to that chat.
 *
 * Run:  node backend/realtime/server.js
 */

import http from "http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.WS_PORT ?? 8081);
// "localhost" rather than "127.0.0.1": `php -S localhost:8080` binds only the
// IPv6 loopback on Windows, so the IPv4 literal is unreachable.
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8080/api";
/** Shared with PHP so only the local backend can publish. */
const PUBLISH_SECRET = process.env.REALTIME_SECRET ?? "local-dev-realtime-secret";

/** How long a socket may stay silent before we assume it is gone. */
const HEARTBEAT_MS = 30_000;

/** chatId -> Set<socket>. The only state this process keeps. */
const rooms = new Map();

/**
 * Secretaries watching the waiting queue.
 *
 * A patient who has just clicked "chat with a secretary" is in a conversation
 * nobody is subscribed to yet, so a queue update has no room to go to. This is
 * that room. Membership is restricted to the secretary role, which comes from
 * PHP's /api/profile — no role logic is invented here.
 */
const lobby = new Set();

function log(...args) {
  console.log(`[realtime ${new Date().toISOString()}]`, ...args);
}

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

// ---------------------------------------------------------------------------
// Delegated auth / authorization — every decision is PHP's
// ---------------------------------------------------------------------------

async function callApi(path, token) {
  // A backend that is down, slow, or restarting must never take this process
  // with it — an unhandled rejection here would kill every open socket.
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON response; treated as a failure below.
    }

    return { ok: res.ok && body?.success === true, status: res.status, body };
  } catch (err) {
    log(`API unreachable for ${path}: ${err?.message ?? err}`);
    // Fails closed: an unverifiable token is not authenticated, and an
    // unverifiable subscription is not authorised.
    return { ok: false, status: 0, body: null };
  }
}

/** @returns {{id:number, role:string}|null} */
async function authenticate(token) {
  if (!token) return null;

  const { ok, body } = await callApi("/profile", token);
  if (!ok || !body?.profile) return null;

  const roles = body.profile.roles ?? [];
  return {
    id: Number(body.profile.id),
    role: String(roles[0] ?? "").replace("ROLE_", "").toLowerCase(),
  };
}

/**
 * True only if PHP would let this token read this conversation.
 * This is the whole of requirements 11-13, enforced by the existing backend.
 */
async function canAccessChat(token, chatId) {
  const { ok } = await callApi(`/livechat/messages?chatId=${chatId}&since=999999999`, token);
  return ok;
}

// ---------------------------------------------------------------------------
// Room bookkeeping
// ---------------------------------------------------------------------------

function join(socket, chatId) {
  if (!rooms.has(chatId)) rooms.set(chatId, new Set());
  rooms.get(chatId).add(socket);
  socket.chatIds.add(chatId);
}

function leave(socket, chatId) {
  const room = rooms.get(chatId);
  if (!room) return;
  room.delete(socket);
  if (room.size === 0) rooms.delete(chatId);
  socket.chatIds.delete(chatId);
}

function leaveAll(socket) {
  for (const chatId of [...socket.chatIds]) leave(socket, chatId);
  lobby.delete(socket);
}

function broadcastLobby(payload) {
  let delivered = 0;
  for (const socket of lobby) {
    send(socket, payload);
    delivered += 1;
  }
  return delivered;
}

/**
 * Fan an event out to everyone subscribed to a conversation.
 *
 * Membership was authorised at subscribe time by PHP, so this is a plain
 * delivery loop — it does not re-derive who is allowed to see what.
 */
function broadcast(chatId, payload, { exceptUserId } = {}) {
  const room = rooms.get(chatId);
  if (!room) return 0;

  let delivered = 0;
  for (const socket of room) {
    if (exceptUserId && socket.user?.id === exceptUserId) continue;
    send(socket, payload);
    delivered += 1;
  }
  return delivered;
}

// ---------------------------------------------------------------------------
// HTTP: the publish endpoint PHP calls, plus a health probe
// ---------------------------------------------------------------------------

const httpServer = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  if (req.method === "POST" && req.url === "/publish") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // Refuse anything implausibly large rather than buffering it.
      if (raw.length > 64 * 1024) req.destroy();
    });

    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400).end('{"ok":false,"error":"invalid json"}');
        return;
      }

      if (payload.secret !== PUBLISH_SECRET) {
        // Only the local backend may publish.
        res.writeHead(403).end('{"ok":false,"error":"forbidden"}');
        return;
      }

      const chatId = Number(payload.chatId);
      if (!Number.isInteger(chatId) || chatId <= 0) {
        res.writeHead(400).end('{"ok":false,"error":"chatId required"}');
        return;
      }

      const message = {
        type: payload.event ?? "message",
        chatId,
        data: payload.data ?? null,
      };

      // Queue changes go to every watching secretary; everything else goes only
      // to the conversation's authorised subscribers.
      const delivered =
        payload.lobby === true
          ? broadcastLobby(message) + broadcast(chatId, message)
          : broadcast(chatId, message);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, delivered }));
    });
    return;
  }

  res.writeHead(404).end('{"ok":false}');
});

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (socket, request) => {
  socket.user = null;
  socket.chatIds = new Set();
  socket.isAlive = true;

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  // The token may arrive in the query string (browsers cannot set headers on a
  // WebSocket handshake) or in an auth message.
  const url = new URL(request.url ?? "", `http://localhost:${PORT}`);
  const queryToken = url.searchParams.get("token");

  // Authentication is a round-trip to PHP, so a client that subscribes the
  // instant the socket opens would be refused for a reason that is about to
  // stop being true. Anything that arrives first is queued and replayed.
  socket.pending = [];

  const doAuth = async (token) => {
    const user = await authenticate(token);
    if (!user) {
      send(socket, { type: "auth_error", error: "Authentication failed." });
      socket.close(4001, "unauthorized");
      return;
    }
    socket.token = token;
    socket.user = user;
    send(socket, { type: "ready", user: { id: user.id, role: user.role } });
    log(`connected user=${user.id} role=${user.role}`);

    const queued = socket.pending;
    socket.pending = [];
    for (const msg of queued) await handleMessage(socket, msg);
  };

  if (queryToken) void doAuth(queryToken);

  socket.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: "error", error: "Invalid message." });
      return;
    }

    if (msg.type === "auth") {
      await doAuth(msg.token);
      return;
    }

    // Arrived before authentication finished: hold it rather than reject it.
    if (!socket.user) {
      socket.pending.push(msg);
      return;
    }

    await handleMessage(socket, msg);
  });

  async function handleMessage(socket, msg) {

    if (msg.type === "subscribe") {
      const chatId = Number(msg.chatId);
      if (!Number.isInteger(chatId) || chatId <= 0) {
        send(socket, { type: "error", error: "A valid chatId is required." });
        return;
      }

      // PHP decides. A secretary who does not own this conversation is refused
      // here exactly as they would be on the HTTP endpoint.
      const allowed = await canAccessChat(socket.token, chatId);
      if (!allowed) {
        send(socket, { type: "subscribe_error", chatId, error: "Access denied." });
        log(`DENIED subscribe user=${socket.user.id} chat=${chatId}`);
        return;
      }

      join(socket, chatId);
      send(socket, { type: "subscribed", chatId });
      log(`subscribe user=${socket.user.id} chat=${chatId}`);
      return;
    }

    if (msg.type === "subscribe_lobby") {
      // The waiting queue is a secretary screen. The role came from PHP at
      // authentication time.
      if (socket.user.role !== "secretary") {
        send(socket, { type: "subscribe_error", chatId: 0, error: "Access denied." });
        return;
      }
      lobby.add(socket);
      send(socket, { type: "subscribed_lobby" });
      return;
    }

    if (msg.type === "unsubscribe_lobby") {
      lobby.delete(socket);
      return;
    }

    if (msg.type === "unsubscribe") {
      const chatId = Number(msg.chatId);
      if (Number.isInteger(chatId)) leave(socket, chatId);
      send(socket, { type: "unsubscribed", chatId });
      return;
    }

    if (msg.type === "ping") {
      send(socket, { type: "pong" });
      return;
    }

    send(socket, { type: "error", error: `Unknown message type: ${msg.type}` });
  }

  socket.on("close", () => {
    leaveAll(socket);
    if (socket.user) log(`disconnected user=${socket.user.id}`);
  });

  socket.on("error", () => leaveAll(socket));
});

/** Drop sockets that stopped answering, so rooms do not leak. */
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, HEARTBEAT_MS);

wss.on("close", () => clearInterval(heartbeat));

// Last line of defence. A relay that dies takes every connected chat with it,
// so anything unexpected is logged rather than fatal.
process.on("unhandledRejection", (reason) => log("unhandled rejection:", reason));
process.on("uncaughtException", (err) => log("uncaught exception:", err?.message ?? err));

httpServer.listen(PORT, () => {
  log(`listening on ws://localhost:${PORT}/ws (publish on :${PORT}/publish)`);
  log(`delegating auth to ${API_BASE}`);
});
