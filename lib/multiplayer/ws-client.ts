import type { CarState, ClientMessage, ServerMessage } from "./protocol";

type MessageHandler = (msg: ServerMessage) => void;

let socket: WebSocket | null = null;
let handler: MessageHandler | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let onOpenCallback: (() => void) | null = null;
let onCloseCallback: (() => void) | null = null;

export function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://localhost:8080";
  }
  return "wss://18-201-159-229.sslip.io";
}

let connectionAttempts = 0;

export function setConnectionCallbacks(onOpen: () => void, onClose: () => void): void {
  onOpenCallback = onOpen;
  onCloseCallback = onClose;
}

export function connectWs(onMessage: MessageHandler): void {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  handler = onMessage;
  const url = getWsUrl();
  if (!url) return;

  try {
    socket = new WebSocket(url);
  } catch {
    socket = null;
    onCloseCallback?.();
    scheduleReconnect(onMessage);
    return;
  }
  socket.onopen = () => {
    connectionAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    startPingLoop();
    onOpenCallback?.();
  };
  socket.onmessage = (ev) => {
    try {
      const raw = JSON.parse(ev.data as string) as { type?: string };
      if (raw.type === "pong") {
        currentPingMs = Math.round(performance.now() - lastPingTime);
        return;
      }
      handler?.(raw as ServerMessage);
    } catch { /* ignore parse errors */ }
  };
  socket.onclose = () => {
    stopPingLoop();
    socket = null;
    onCloseCallback?.();
    scheduleReconnect(onMessage);
  };
  socket.onerror = () => {
    socket?.close();
  };
}

function scheduleReconnect(onMessage: MessageHandler): void {
  connectionAttempts += 1;
  const delay = Math.min(10000, 1000 * Math.pow(1.5, connectionAttempts));
  reconnectTimer = setTimeout(() => connectWs(onMessage), delay);
}

export function disconnectWs(): void {
  stopPingLoop();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  handler = null;
  socket?.close();
  socket = null;
}

export function sendMsg(msg: ClientMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export function sendCarState(state: CarState): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 120_000) return;
  sendMsg({ type: "car_state", state });
}

export function isConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN;
}

// Ping tracking
let lastPingTime = 0;
let currentPingMs = 0;
let pingInterval: ReturnType<typeof setInterval> | null = null;

export function getPingMs(): number { return currentPingMs; }

function startPingLoop(): void {
  stopPingLoop();
  pingInterval = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      lastPingTime = performance.now();
      try { socket.send(JSON.stringify({ type: "ping" })); } catch { /* ignore */ }
    }
  }, 2000);
}

function stopPingLoop(): void {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
}

export function getConnectionQuality(): "excellent" | "good" | "fair" | "poor" | "offline" {
  if (!isConnected()) return "offline";
  if (currentPingMs < 50) return "excellent";
  if (currentPingMs < 100) return "good";
  if (currentPingMs < 180) return "fair";
  return "poor";
}
