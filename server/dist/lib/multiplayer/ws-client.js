let socket = null;
let handler = null;
let reconnectTimer = null;
let onOpenCallback = null;
let onCloseCallback = null;
export function getWsUrl() {
    if (typeof window === "undefined")
        return "";
    const env = process.env.NEXT_PUBLIC_WS_URL;
    if (env)
        return env;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "ws://localhost:8080";
    }
    return "wss://18-201-159-229.sslip.io";
}
let connectionAttempts = 0;
export function setConnectionCallbacks(onOpen, onClose) {
    onOpenCallback = onOpen;
    onCloseCallback = onClose;
}
export function connectWs(onMessage) {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING)
        return;
    handler = onMessage;
    const url = getWsUrl();
    if (!url)
        return;
    try {
        socket = new WebSocket(url);
    }
    catch {
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
            const raw = JSON.parse(ev.data);
            if (raw.type === "pong") {
                currentPingMs = Math.round(performance.now() - lastPingTime);
                return;
            }
            handler?.(raw);
        }
        catch { /* ignore parse errors */ }
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
function scheduleReconnect(onMessage) {
    connectionAttempts += 1;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, connectionAttempts));
    reconnectTimer = setTimeout(() => connectWs(onMessage), delay);
}
export function disconnectWs() {
    stopPingLoop();
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    handler = null;
    socket?.close();
    socket = null;
}
export function sendMsg(msg) {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
    }
}
export function sendCarState(state) {
    if (!socket || socket.readyState !== WebSocket.OPEN)
        return;
    if (socket.bufferedAmount > 120_000)
        return;
    sendMsg({ type: "car_state", state });
}
export function isConnected() {
    return socket?.readyState === WebSocket.OPEN;
}
// Ping tracking
let lastPingTime = 0;
let currentPingMs = 0;
let pingInterval = null;
export function getPingMs() { return currentPingMs; }
function startPingLoop() {
    stopPingLoop();
    pingInterval = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
            lastPingTime = performance.now();
            try {
                socket.send(JSON.stringify({ type: "ping" }));
            }
            catch { /* ignore */ }
        }
    }, 2000);
}
function stopPingLoop() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
}
export function getConnectionQuality() {
    if (!isConnected())
        return "offline";
    if (currentPingMs < 50)
        return "excellent";
    if (currentPingMs < 100)
        return "good";
    if (currentPingMs < 180)
        return "fair";
    return "poor";
}
