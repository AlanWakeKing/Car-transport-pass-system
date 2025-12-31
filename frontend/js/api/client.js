import { API_BASE } from "../config/constants.js";
import { toast } from "../components/common/Toast.js";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (resp.status === 401) {
    throw new Error("Требуется вход. Авторизация истекла.");
  }

  if (!resp.ok) {
    let detail = "Ошибка запроса";
    try {
      const data = await resp.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = await resp.text();
    }
    throw new Error(detail);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return resp.json();
  }
  return resp;
}

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params);
  const suffix = qs.toString() ? `?${qs}` : "";
  return request(`${path}${suffix}`);
}

export function apiPost(path, body) {
  return request(path, { method: "POST", body });
}

export function apiPatch(path, body) {
  return request(path, { method: "PATCH", body });
}

export function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export function handleError(error) {
  console.error(error);
  toast.show(error.message || "Что-то пошло не так", "error");
}
