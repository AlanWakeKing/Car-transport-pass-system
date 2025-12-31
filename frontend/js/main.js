import { ENDPOINTS } from "./config/constants.js";
import { apiPost, handleError, setAuthToken } from "./api/client.js";
import { AppContext } from "./context/AppContext.js";
import { AppShell } from "./components/layout/AppShell.js";
import { renderLoginForm } from "./components/auth/LoginForm.js";
import { toast } from "./components/common/Toast.js";
import { DashboardPage } from "./components/pages/Dashboard.js";
import { PropusksPage } from "./components/pages/Propusks.js";
import { ReferencesPage } from "./components/pages/References.js";
import { UsersPage } from "./components/pages/Users.js";

const appRoot = document.getElementById("app");
const context = new AppContext();

const pages = {
  dashboard: new DashboardPage(context),
  propusks: new PropusksPage(context),
  references: new ReferencesPage(context),
  users: new UsersPage(context)
};

let shell = null;

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
      context.setToken(resp.access_token);
      await context.bootstrapUser();
      toast.show("Добро пожаловать", "success");
      await showApp();
    } catch (err) {
      handleError(err);
    }
  });
}

async function renderPage(name) {
  const page = pages[name];
  if (!page) return;
  const content = await page.render();
  shell.mountContent(content);
}

async function showApp() {
  shell = new AppShell(appRoot, {
    onNavigate: (page) => renderPage(page),
    onLogout: () => {
      context.logout();
      showLogin();
    }
  });
  shell.user = context.state.user;
  shell.render(context.state.user);
  await renderPage("dashboard");
}

async function bootstrap() {
  if (context.state.token) {
    try {
      await context.bootstrapUser();
      await showApp();
      return;
    } catch (err) {
      context.logout();
    }
  }
  await showLogin();
}

bootstrap();
