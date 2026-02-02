import { ENDPOINTS } from "./config/constants.js";
import { apiPost, handleError, setAuthToken } from "./api/client.js";
import { AppContext } from "./context/AppContext.js";
import { AppShell } from "./components/layout/AppShell.js";
import { renderLoginForm } from "./components/auth/LoginForm.js";
import { toast } from "./components/common/Toast.js";
import { canManageUsers, canShowMenuHome, canShowMenuPropusks, canShowMenuReferences, canShowMenuPrint, canShowMenuReports, canShowMenuUsers, canShowMenuSettings } from "./utils/permissions.js";
import { DashboardPage } from "./components/pages/Dashboard.js";
import { PropusksPage } from "./components/pages/Propusks.js";
import { ReferencesPage } from "./components/pages/References.js";
import { UsersPage } from "./components/pages/Users.js";
import { ReportsPage } from "./components/pages/Reports.js";
import { PrintPage } from "./components/pages/Print.js";
import { SettingsPage } from "./components/pages/Settings.js";
import { TemporaryPassesPage } from "./components/pages/TemporaryPasses.js";

const appRoot = document.getElementById("app");
const context = new AppContext();

const pages = {
  dashboard: new DashboardPage(context),
  temporary: new TemporaryPassesPage(context),
  propusks: new PropusksPage(context),
  references: new ReferencesPage(context),
  print: new PrintPage(context),
  reports: new ReportsPage(context),
  users: new UsersPage(context),
  settings: new SettingsPage(context)
};

let shell = null;

function getFirstAccessiblePage(user) {
  const candidates = [
    { key: "dashboard", ok: canShowMenuHome(user) },
    { key: "temporary", ok: canShowMenuPropusks(user) },
    { key: "propusks", ok: canShowMenuPropusks(user) },
    { key: "references", ok: canShowMenuReferences(user) },
    { key: "print", ok: canShowMenuPrint(user) },
    { key: "reports", ok: canShowMenuReports(user) },
    { key: "users", ok: canManageUsers(user) && canShowMenuUsers(user) },
    { key: "settings", ok: user?.role === "admin" && canShowMenuSettings(user) },
  ];
  const first = candidates.find((c) => c.ok);
  return first ? first.key : "dashboard";
}

function canAccessPage(user, page) {
  switch (page) {
    case "dashboard":
      return canShowMenuHome(user);
    case "temporary":
      return canShowMenuPropusks(user);
    case "propusks":
      return canShowMenuPropusks(user);
    case "references":
      return canShowMenuReferences(user);
    case "print":
      return canShowMenuPrint(user);
    case "reports":
      return canShowMenuReports(user);
    case "users":
      return canManageUsers(user) && canShowMenuUsers(user);
    case "settings":
      return user?.role === "admin" && canShowMenuSettings(user);
    default:
      return false;
  }
}

async function showLogin() {
  appRoot.innerHTML = "";
  const view = renderLoginForm();
  appRoot.appendChild(view);
  const form = view.querySelector("#login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const resp = await apiPost(ENDPOINTS.login, data);
      await context.bootstrapUser();
      toast.show("Добро пожаловать", "success");
      await showApp();
    } catch (err) {
      handleError(err);
    }
  });
}

async function renderPage(name) {
  if (shell) {
    shell.setPage(name);
  }
  const page = pages[name];
  if (!page) return;
  const content = await page.render();
  shell.mountContent(content);
  context.setLastPage(name);
}

function navigateWithFilters(page, filters) {
  if (filters) {
    context.setPropuskFilters(filters);
  }
  renderPage(page);
}

async function showApp() {
  shell = new AppShell(appRoot, {
    onNavigate: (page) => renderPage(page),
    onNavigateWithFilters: (page, filters) => navigateWithFilters(page, filters),
    onLogout: async () => {
      await context.logout();
      await showLogin();
    }
  });
  context.on("navigate", ({ page, filters }) => navigateWithFilters(page, filters));
  shell.user = context.state.user;
  shell.render(context.state.user);
  const lastPage = context.state.ui?.lastPage;
  const fallback = getFirstAccessiblePage(context.state.user);
  const initialPage = lastPage && canAccessPage(context.state.user, lastPage)
    ? lastPage
    : fallback;
  await renderPage(initialPage);
}

async function bootstrap() {
  try {
    await context.bootstrapUser();
    if (context.state.user) {
      await showApp();
      return;
    }
  } catch (err) {
    await context.logout();
  }
  await showLogin();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

function registerAuthExpiredHandler() {
  let handling = false;
  window.addEventListener("auth-expired", async (event) => {
    if (handling) return;
    handling = true;
    const message = event?.detail?.message || "Сессия истекла. Войдите снова.";
    try {
      await context.logout();
    } finally {
      await showLogin();
      toast.show(message, "warning");
      handling = false;
    }
  });
}

registerServiceWorker();
registerAuthExpiredHandler();
bootstrap();
