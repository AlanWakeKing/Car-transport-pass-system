import { canManageUsers } from "../../utils/permissions.js";

export class AppShell {
  constructor(root, { onNavigate, onLogout }) {
    this.root = root;
    this.onNavigate = onNavigate;
    this.onLogout = onLogout;
    this.current = "dashboard";
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
            ${this.menuItem("dashboard", "dashboard", "Обзор")}
            ${this.menuItem("propusks", "directions_car", "Пропуска")}
            ${this.menuItem("references", "storage", "Справочники")}
            ${canManageUsers(user) ? this.menuItem("users", "shield_person", "Пользователи") : ""}
          </div>
          <div class="md-divider"></div>
          <div class="section">
            <div style="font-weight:700;">${user?.full_name || ""}</div>
            <div class="tag">${user?.role || ""}</div>
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
              <div class="pill-switch" id="quick-switch">
                <button data-page="dashboard" class="${this.current === "dashboard" ? "active" : ""}">Обзор</button>
                <button data-page="propusks" class="${this.current === "propusks" ? "active" : ""}">Пропуска</button>
              </div>
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
    this.render(this.user);
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
      this.current = page;
      this.onNavigate(page);
    });

    const switcher = this.root.querySelector("#quick-switch");
    switcher?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      const page = btn.dataset.page;
      this.current = page;
      this.onNavigate(page);
    });

    const logout = this.root.querySelector("#logout-btn");
    logout?.addEventListener("click", () => this.onLogout());
  }
}
