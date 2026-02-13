import { getAccessToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let shouldReconnect = false;
let activeToken = null;
const subscribers = new Set();

function getWebSocketUrl(token) {
  const base = new URL(API_URL);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${base.host}/ws/realtime/?token=${encodeURIComponent(token)}`;
}

function notifySubscribers(message) {
  subscribers.forEach((cb) => {
    try {
      cb(message);
    } catch {
      // ignore subscriber errors
    }
  });
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (!shouldReconnect || subscribers.size === 0) return;
  clearReconnectTimer();
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
  reconnectTimer = setTimeout(() => {
    connectRealtimeSocket();
  }, delay);
  reconnectAttempts += 1;
}

function teardownSocket() {
  if (socket) {
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
    socket = null;
  }
}

function connectRealtimeSocket() {
  if (!shouldReconnect || subscribers.size === 0) return;

  const token = getAccessToken();
  if (!token) return;

  if (socket && socket.readyState === WebSocket.OPEN && activeToken === token) {
    return;
  }
  if (socket && socket.readyState === WebSocket.CONNECTING && activeToken === token) {
    return;
  }

  activeToken = token;
  teardownSocket();

  try {
    socket = new WebSocket(getWebSocketUrl(token));
  } catch {
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    reconnectAttempts = 0;
    clearReconnectTimer();
  };

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      notifySubscribers(parsed);
    } catch {
      // ignore non-json messages
    }
  };

  socket.onerror = () => {
    if (socket) {
      socket.close();
    }
  };

  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };
}

export function subscribeRealtimeEvents(handler) {
  subscribers.add(handler);
  shouldReconnect = true;
  connectRealtimeSocket();

  return () => {
    subscribers.delete(handler);
    if (subscribers.size === 0) {
      shouldReconnect = false;
      clearReconnectTimer();
      teardownSocket();
    }
  };
}

