import { API_BASE } from "../config/constants.js";
import { toast } from "../components/common/Toast.js";

let authToken = null;
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function getCookie(name) {
  const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function addCsrfHeader(headers) {
  const csrf = getCookie(CSRF_COOKIE_NAME);
  if (csrf) {
    headers[CSRF_HEADER_NAME] = csrf;
  }
}

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
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCookie(CSRF_COOKIE_NAME);
    if (csrf) {
      headers[CSRF_HEADER_NAME] = csrf;
    }
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });

  if (resp.status === 401) {
    let detail = "Сессия истекла. Войдите снова.";
    const raw = await resp.text();
    if (raw) {
      try {
        const data = JSON.parse(raw);
        detail = data.detail || JSON.stringify(data);
      } catch {
        detail = raw;
      }
    }
    window.dispatchEvent(
      new CustomEvent("auth-expired", { detail: { message: detail } })
    );
    throw new Error(detail);
  }

  if (!resp.ok) {
    let detail = "Неизвестная ошибка";
    const raw = await resp.text();
    if (raw) {
      try {
        const data = JSON.parse(raw);
        detail = data.detail || JSON.stringify(data);
      } catch {
        detail = raw;
      }
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

export function apiPut(path, body) {
  return request(path, { method: "PUT", body });
}

export function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export function handleError(error) {
  console.error(error);
  toast.show(error.message || "Что-то пошло не так", "error");
}

export async function downloadFile(path, filename = "file") {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const resp = await fetch(`${API_BASE}${path}`, { headers, credentials: "include" });
  if (!resp.ok) {
    let detail = await resp.text();
    throw new Error(detail || "Не удалось открыть файл");
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function openFileInNewTab(path) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  // Open window synchronously to avoid popup blockers in PWA.
  const popup = window.open("", "_blank", "noopener");
  try {
    const resp = await fetch(`${API_BASE}${path}`, { headers, credentials: "include" });
    if (!resp.ok) {
      let detail = await resp.text();
      throw new Error(detail || "Не удалось скачать файл");
    }
    const disposition = resp.headers.get("content-disposition") || "";
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    if (popup && !popup.closed) {
      popup.location = url;
    } else {
      // Fallback: download if popup is blocked/unavailable.
      const nameMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(disposition);
      const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : "report.pdf";
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    // do not revoke immediately, allow browser to load
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    if (popup) popup.close();
    throw err;
  }
}

export async function downloadPost(path, body, filename = "file.pdf") {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  addCsrfHeader(headers);
  headers["Content-Type"] = "application/json";
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
    credentials: "include"
  });
  if (!resp.ok) {
    let detail = await resp.text();
    throw new Error(detail || "Не удалось скачать файл");
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function openPostInNewTab(path, body) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  addCsrfHeader(headers);
  headers["Content-Type"] = "application/json";
  // Open window synchronously to avoid popup blockers in PWA.
  const popup = window.open("", "_blank", "noopener");
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {}),
      credentials: "include"
    });
    if (!resp.ok) {
      let detail = await resp.text();
      throw new Error(detail || "Не удалось открыть файл");
    }
    const disposition = resp.headers.get("content-disposition") || "";
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    if (popup && !popup.closed) {
      popup.location = url;
    } else {
      // Fallback: download if popup is blocked/unavailable.
      const nameMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(disposition);
      const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : "report.pdf";
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    if (popup) popup.close();
    throw err;
  }
}


