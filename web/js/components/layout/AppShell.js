import { canManageUsers, canShowMenuHome, canShowMenuPropusks, canShowMenuTemporary, canShowMenuReferences, canShowMenuPrint, canShowMenuReports, canShowMenuUsers, canShowMenuSettings } from "../../utils/permissions.js";

export class AppShell {
  constructor(root, { onNavigate, onNavigateWithFilters, onLogout }) {
    this.root = root;
    this.onNavigate = onNavigate;
    this.onNavigateWithFilters = onNavigateWithFilters;
    this.onLogout = onLogout;
    this.current = "propusks";
    this.clockTimer = null;
  }

  render(user) {
    const bottomItems = [
      { page: "dashboard", icon: "space_dashboard", label: "Главная", show: canShowMenuHome(user) },
      { page: "temporary", icon: "schedule", label: "Временные пропуска", show: canShowMenuTemporary(user) },
      { page: "propusks", icon: "directions_car", label: "Пропуска", show: canShowMenuPropusks(user) },
      { page: "references", icon: "storage", label: "Справочники", show: canShowMenuReferences(user) },
      { page: "more", icon: "more_horiz", label: "Ещё", show: true }
    ];
    const moreItems = [
      { page: "print", icon: "print", label: "В печать", show: canShowMenuPrint(user) },
      { page: "reports", icon: "analytics", label: "Отчёты", show: canShowMenuReports(user) },
      { page: "users", icon: "shield_person", label: "Пользователи", show: canManageUsers(user) && canShowMenuUsers(user) },
      { page: "settings", icon: "tune", label: "Настройки", show: user?.role === "admin" && canShowMenuSettings(user) }
    ];
    this.root.innerHTML = `
      <div class="layout">
        <aside class="sidebar md-card">
          <div class="brand">
            <div class="logo">PT</div>
            <div>
              <div style="font-weight:800;">Пропуска автотранспорта</div>
              <div style="color:var(--md-text-muted);">Цифровой пропускной режим</div>
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
              <span class="material-icons-round">logout</span>
              Выход
            </button>
          </div>
        </aside>
        <main>
          <header class="header">
            <div class="mobile-brand mobile-only">
              <div class="logo">PT</div>
              <div class="mobile-brand-text">
                <div class="mobile-brand-title">Пропуска автотранспорта</div>
                <div class="mobile-brand-subtitle">Цифровой пропускной режим</div>
              </div>
            </div>
            <div class="page-title">
              <div>
                <p class="tag">  </p>
                <h1 style="letter-spacing:-0.01em;">  </h1>
              </div>
              <div class="tag" id="app-clock"></div>
            </div>
          </header>
          <section class="content" id="content"></section>
        </main>
      </div>
      <nav class="bottom-nav" id="bottom-nav">
        ${bottomItems
          .filter((item) => item.show)
          .map(
            (item) => `
            <div class="bottom-nav-item ${this.current === item.page ? "active" : ""}" data-bottom-page="${item.page}">
              <span class="material-icons-round">${item.icon}</span>
              <span>${item.label}</span>
            </div>
          `
          )
          .join("")}
      </nav>
      <div class="bottom-sheet" id="bottom-sheet">
        <div class="bottom-sheet-backdrop" data-action="close-sheet"></div>
        <div class="bottom-sheet-panel">
          <div class="bottom-sheet-header"></div>
          <div class="bottom-sheet-menu">
            ${moreItems
              .filter((item) => item.show)
              .map(
                (item) => `
                <div class="bottom-sheet-item" data-page="${item.page}">
                  <span class="material-icons-round">${item.icon}</span>
                  <span>${item.label}</span>
                </div>
              `
              )
              .join("")}
            <div class="bottom-sheet-item" data-action="logout">
              <span class="material-icons-round">logout</span>
              <span>Выход</span>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.startClock();
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

    const bottomNav = this.root.querySelector("#bottom-nav");
    bottomNav?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-bottom-page]");
      if (!item) return;
      const page = item.dataset.bottomPage;
      if (page === "more") {
        this.toggleBottomSheet(true);
        return;
      }
      this.setPage(page);
      this.onNavigate(page);
    });

    const bottomSheet = this.root.querySelector("#bottom-sheet");
    bottomSheet?.addEventListener("click", async (e) => {
      const close = e.target.closest("[data-action='close-sheet']");
      if (close) {
        this.toggleBottomSheet(false);
        return;
      }
      const pageItem = e.target.closest("[data-page]");
      if (pageItem) {
        const page = pageItem.dataset.page;
        this.toggleBottomSheet(false);
        this.setPage(page);
        this.onNavigate(page);
        return;
      }
      const logoutItem = e.target.closest("[data-action='logout']");
      if (logoutItem) {
        this.toggleBottomSheet(false);
        await this.onLogout();
      }
    });
  }

  startClock() {
    const clock = this.root.querySelector("#app-clock");
    if (!clock) return;
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    const update = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    };
    update();
    this.clockTimer = setInterval(update, 1000 * 30);
  }

  updateActive() {
    this.root.querySelectorAll(".menu-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === this.current);
    });
    this.root.querySelectorAll(".bottom-nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.bottomPage === this.current);
    });
  }

  toggleBottomSheet(open) {
    const sheet = this.root.querySelector("#bottom-sheet");
    if (!sheet) return;
    sheet.classList.toggle("open", open);
  }
}
