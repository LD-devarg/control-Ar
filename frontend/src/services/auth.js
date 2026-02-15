import axios from "axios";
import { getEffectiveTenantId } from "./tenant";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_URL,
});

function shouldSkipTenantParam(url = "") {
  const normalized = String(url || "").toLowerCase();
  return normalized.startsWith("/empresas/") || normalized.startsWith("/grupos/");
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = String(config.method || "get").toLowerCase();
  const tenantId = getEffectiveTenantId();
  if (tenantId && (method === "get" || method === "delete") && !shouldSkipTenantParam(config.url)) {
    config.params = config.params || {};
    if (config.params.empresa === undefined) {
      config.params.empresa = tenantId;
    }
  }

  return config;
});

let isRefreshing = false;
let refreshQueue = [];
let refreshTimer = null;

function onRefreshed(newToken) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

function addRefreshSubscriber(cb) {
  refreshQueue.push(cb);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            if (!newToken) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem("access_token", data.access);
        isRefreshing = false;
        onRefreshed(data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshed(null);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  const { data } = await axios.post(`${API_URL}/api/token/refresh/`, {
    refresh: refreshToken,
  });
  localStorage.setItem("access_token", data.access);
  return data.access;
}

export function startTokenRefresh() {
  clearRefreshTimer();
  const token = localStorage.getItem("access_token");
  const payload = parseJwt(token);
  if (!payload?.exp) return;
  const expiresAtMs = payload.exp * 1000;
  const now = Date.now();
  const refreshInMs = Math.max(expiresAtMs - now - 60_000, 5_000);

  refreshTimer = setTimeout(async () => {
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        startTokenRefresh();
      }
    } catch {
      clearRefreshTimer();
    }
  }, refreshInMs);
}

export function stopTokenRefresh() {
  clearRefreshTimer();
}

function parseJwt(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function getCurrentUser() {
  const raw = localStorage.getItem("current_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(accessToken) {
  const { data } = await axios.get(`${API_URL}/usuarios/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function login(username, password) {
  const { data } = await axios.post(`${API_URL}/api/token/`, {
    username,
    password,
  });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  const user = await fetchCurrentUser(data.access);
  if (user) {
    localStorage.setItem("current_user", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("auth:user-changed"));
  }
  startTokenRefresh();
  return user;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_user");
  localStorage.removeItem("clientes_cache");
  localStorage.removeItem("clientes_cache_ts");
  localStorage.removeItem("clientes_dirty");
  localStorage.removeItem("active_tenant_id");
  stopTokenRefresh();
  window.dispatchEvent(new CustomEvent("auth:user-changed"));
}
