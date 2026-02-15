import { getAccessToken } from "./auth";
import { getEffectiveTenantId } from "./tenant";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let shouldReconnect = false;
let activeToken = null;
let activeTenantId = null;
let tenantListenerAttached = false;
const subscribers = new Set();

function getWebSocketUrl(token, tenantId) {
  const base = new URL(API_URL);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ token });
  if (tenantId) {
    params.set("empresa", String(tenantId));
  }
  return `${protocol}//${base.host}/ws/realtime/?${params.toString()}`;
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
  const tenantId = getEffectiveTenantId();
  if (!token) return;

  if (socket && socket.readyState === WebSocket.OPEN && activeToken === token && activeTenantId === tenantId) {
    return;
  }
  if (socket && socket.readyState === WebSocket.CONNECTING && activeToken === token && activeTenantId === tenantId) {
    return;
  }

  activeToken = token;
  activeTenantId = tenantId;
  teardownSocket();

  try {
    socket = new WebSocket(getWebSocketUrl(token, tenantId));
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

  if (!tenantListenerAttached) {
    window.addEventListener("tenant:changed", connectRealtimeSocket);
    tenantListenerAttached = true;
  }

  connectRealtimeSocket();

  return () => {
    subscribers.delete(handler);
    if (subscribers.size === 0) {
      shouldReconnect = false;
      clearReconnectTimer();
      teardownSocket();
      activeTenantId = null;
      if (tenantListenerAttached) {
        window.removeEventListener("tenant:changed", connectRealtimeSocket);
        tenantListenerAttached = false;
      }
    }
  };
}
