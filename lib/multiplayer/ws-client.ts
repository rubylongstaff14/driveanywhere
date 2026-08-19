import type { CarState, ClientMessage, ServerMessage } from "./protocol";

type MessageHandler = (msg: ServerMessage) => void;

let socket: WebSocket | null = null;
let handler: MessageHandler | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.hostname}:8080`;
}

export function connectWs(onMessage: MessageHandler): void {
  if (socket?.readyState === WebSocket.OPEN) return;
  handler = onMessage;
  const url = getWsUrl();
  if (!url) return;

  socket = new WebSocket(url);
  socket.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
  socket.onmessage = (ev) => {
    try {
      const msg: ServerMessage = JSON.parse(ev.data as string);
      handler?.(msg);
    } catch { /* ignore parse errors */ }
  };
  socket.onclose = () => {
    socket = null;
    reconnectTimer = setTimeout(() => connectWs(onMessage), 3000);
  };
  socket.onerror = () => {
    socket?.close();
  };
}

export function disconnectWs(): void {
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
  sendMsg({ type: "car_state", state });
}

export function isConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN;
}
