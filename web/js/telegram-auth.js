const loginStep = document.getElementById("step-login");
const linkStep = document.getElementById("step-link");
const successStep = document.getElementById("step-success");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const linkError = document.getElementById("link-error");
const linkSubmit = document.getElementById("link-submit");
const loginSubmit = document.getElementById("login-submit");
const tgInput = document.getElementById("tg-user-id");
const tgHint = document.getElementById("tg-hint");
const closeNow = document.getElementById("close-now");
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

const webApp = window.Telegram?.WebApp;
const tgUser = webApp?.initDataUnsafe?.user || null;
const tgUserId = tgUser?.id || null;

if (webApp) {
  webApp.ready();
  webApp.expand();
}

function showStep(step) {
  loginStep.classList.toggle("hidden", step !== "login");
  linkStep.classList.toggle("hidden", step !== "link");
  successStep.classList.toggle("hidden", step !== "success");
}

function showError(target, message) {
  if (!message) {
    target.hidden = true;
    target.textContent = "";
    return;
  }
  target.textContent = message;
  target.hidden = false;
}

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Подождите..." : button.dataset.label;
}

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

loginSubmit.dataset.label = loginSubmit.textContent;
linkSubmit.dataset.label = linkSubmit.textContent;

if (tgUserId) {
  tgInput.value = tgUserId;
  tgInput.readOnly = true;
  tgHint.textContent = "Telegram ID получен автоматически.";
} else {
  tgHint.textContent = "Откройте страницу из Telegram, либо введите ID вручную.";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(loginError, "");
  const formData = new FormData(loginForm);
  const payload = {
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || ""),
  };
  if (!payload.username || !payload.password) {
    showError(loginError, "Заполните логин и пароль.");
    return;
  }
  setLoading(loginSubmit, true);
  try {
    const response = await fetch("/api/auth/login-json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Неверный логин или пароль");
    }
    showStep("link");
  } catch (error) {
    showError(loginError, error.message || "Ошибка авторизации");
  } finally {
    setLoading(loginSubmit, false);
  }
});

linkSubmit.addEventListener("click", async () => {
  showError(linkError, "");
  const tgValue = Number(tgInput.value);
  if (!tgValue) {
    showError(linkError, "Укажите корректный Telegram ID.");
    return;
  }
  setLoading(linkSubmit, true);
  try {
    const headers = { "content-type": "application/json" };
    addCsrfHeader(headers);
    const response = await fetch("/api/auth/link-telegram", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ tg_user_id: tgValue }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Не удалось привязать Telegram ID");
    }
    showStep("success");
    if (webApp) {
      webApp.HapticFeedback?.notificationOccurred("success");
      setTimeout(() => webApp.close(), 1400);
    }
  } catch (error) {
    showError(linkError, error.message || "Ошибка привязки");
  } finally {
    setLoading(linkSubmit, false);
  }
});

closeNow.addEventListener("click", () => {
  if (webApp) {
    webApp.close();
  } else {
    window.close();
  }
});

showStep("login");
