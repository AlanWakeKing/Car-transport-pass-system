import { canManageUsers, canShowMenuHome, canShowMenuPropusks, canShowMenuTemporary, canShowMenuReferences, canShowMenuPrint, canShowMenuReports, canShowMenuUsers, canShowMenuSettings } from "../../utils/permissions.js";

export class AppShell {
  constructor(root, { onNavigate, onNavigateWithFilters, onLogout }) {
    this.root = root;
    this.onNavigate = onNavigate;
    this.onNavigateWithFilters = onNavigateWithFilters;
    this.onLogout = onLogout;
    this.current = "propusks";
  }

  render(user) {
    this.root.innerHTML = `
      <div class="layout">
        <aside class="sidebar md-card">
          <div class="brand">
            <div class="logo">PT</div>
            <div>
              <div style="font-weight:800;">Пропуска</div>
              <div style="color:var(--md-text-muted);">Автотранспорт</div>
            </div>
          </div>
          <div class="menu" id="app-menu">
            ${canShowMenuHome(user) ? this.menuItem("dashboard", "space_dashboard", "Главная") : ""}
            ${canShowMenuTemporary(user) ? this.menuItem("temporary", "schedule", "Временные пропуска") : ""}
            ${canShowMenuPropusks(user) ? this.menuItem("propusks", "directions_car", "Пропуска") : ""}
            ${canShowMenuReferences(user) ? this.menuItem("references", "storage", "Справочники") : ""}
            ${canShowMenuPrint(user) ? this.menuItem("print", "print", "В печать") : ""}
            ${canShowMenuReports(user) ? this.menuItem("reports", "analytics", "Отчёты") : ""}
            ${canManageUsers(user) && canShowMenuUsers(user) ? this.menuItem("users", "shield_person", "Пользователи") : ""}
            ${user?.role === "admin" && canShowMenuSettings(user) ? this.menuItem("settings", "tune", "Настройки") : ""}
          </div>
          <div class="md-divider"></div>
          <div class="section">
            <div style="font-weight:700;">${user?.full_name || ""}</div>
            <button class="md-btn ghost" id="logout-btn">
              <span class="material-icons-round">logout</span>Выход
            </button>
          </div>
        </aside>
        <main>
          <header class="header">
            <div class="page-title">
              <div>
                <p class="tag">Цифровой пропускной режим</p>
                <h1 style="letter-spacing:-0.01em;">Центр управления доступом</h1>
              </div>
              <div></div>
            </div>
          </header>
          <section class="content" id="content"></section>
        </main>
      </div>
    `;
    this.bindEvents();
  }

  menuItem(page, icon, label) {
    const active = this.current === page ? "active" : "";
    return `
      <div class="menu-item ${active}" data-page="${page}">
        <span class="material-icons-round">${icon}</span>
        <span>${label}</span>
      </div>
    `;
  }

  setPage(page) {
    this.current = page;
    this.updateActive();
  }

  mountContent(node) {
    const content = this.root.querySelector("#content");
    if (content) {
      content.innerHTML = "";
      content.appendChild(node);
    }
  }

  bindEvents() {
    const menu = this.root.querySelector("#app-menu");
    menu?.addEventListener("click", (e) => {
      const target = e.target.closest("[data-page]");
      if (!target) return;
      const page = target.dataset.page;
      this.setPage(page);
      this.onNavigate(page);
    });

    const logout = this.root.querySelector("#logout-btn");
    logout?.addEventListener("click", async () => {
      await this.onLogout();
    });
  }

  updateActive() {
    this.root.querySelectorAll(".menu-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === this.current);
    });
  }
}
