import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiPatch, apiDelete, handleError } from "../../api/client.js";
import { toast } from "../common/Toast.js";
import { canEditOrganizations, canManageUsers } from "../../utils/permissions.js";
import { modal } from "../common/Modal.js";

export class ReferencesPage {
  constructor(context) {
    this.context = context;
    this.state = {
      orgs: [],
      marks: [],
      models: [],
      abonents: [],
      driversPagination: { page: 1, limit: 50, total: 0 },
      driversSort: { key: "", dir: "asc" }
    };
    const storedPagination = this.context.state.ui?.driversPagination;
    if (storedPagination) {
      this.state.driversPagination.page = storedPagination.page || 1;
      this.state.driversPagination.limit = storedPagination.limit || 50;
    }
    this.host = null;
  }

  async load() {
    try {
      const [orgs, marks, models] = await Promise.all([
        apiGet(ENDPOINTS.references.organizations),
        apiGet(ENDPOINTS.references.marks),
        apiGet(ENDPOINTS.references.models)
      ]);
      this.state.orgs = orgs;
      this.state.marks = marks;
      this.state.models = models;
      await this.loadDriversPage();
    } catch (err) {
      handleError(err);
    }
  }

  async loadDriversPage() {
    const { page, limit } = this.state.driversPagination;
    const skip = (page - 1) * limit;
    const response = await apiGet(ENDPOINTS.references.abonentsPaged, { skip, limit });
    this.state.abonents = response.items || [];
    this.state.driversPagination.total = response.total || 0;
    this.context.setDriversPagination({
      page: this.state.driversPagination.page,
      limit: this.state.driversPagination.limit
    });
    if (!this.state.abonents.length && this.state.driversPagination.total && page > 1) {
      const lastPage = Math.max(1, Math.ceil(this.state.driversPagination.total / limit));
      if (lastPage !== page) {
        this.state.driversPagination.page = lastPage;
        this.context.setDriversPagination({ page: lastPage });
        await this.loadDriversPage();
      }
    }
  }

  async render() {
    await this.load();
    const node = document.createElement("div");
    this.host = node;
    node.className = "section";
    node.innerHTML = `
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">Справочники</p>
            <h3 style="margin:0;">Справочники</h3>
          </div>
        </div>
        <div class="tabs" id="ref-tabs">
          <button class="tab active" data-tab="orgs">Организации</button>
          <button class="tab" data-tab="marks">Марки</button>
          <button class="tab" data-tab="models">Модели</button>
          <button class="tab" data-tab="drivers">Водители</button>
        </div>
        <div class="tab-panels">
          <div class="tab-panel active" data-tab="orgs">
            <div class="md-toolbar">
              <h4 style="margin:0;">Организации</h4>
              ${canEditOrganizations(this.context.state.user) ? `<button class="md-btn" data-add="org"><span class="material-icons-round">add</span></button>` : ""}
            </div>
            <div class="table-wrap desktop-only">
              <div class="table-scroll">
                <table class="md-table">
                <thead>
                  <tr>
                    <th>Организация</th>
                    <th>Гостевые места</th>
                    <th>Свободные места</th>
                    <th>Комментарий</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody id="org-tbody"></tbody>
                </table>
              </div>
            </div>
            <div class="mobile-cards mobile-only" id="org-cards"></div>
          </div>
          <div class="tab-panel" data-tab="marks">
            <div class="md-toolbar">
              <h4 style="margin:0;">Марки</h4>
              ${canManageUsers(this.context.state.user) ? `<button class="md-btn" data-add="mark"><span class="material-icons-round">add</span></button>` : ""}
            </div>
            <div class="table-wrap desktop-only">
              <div class="table-scroll">
                <table class="md-table">
                <thead>
                  <tr>
                    <th>Марка</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody id="mark-tbody"></tbody>
                </table>
              </div>
            </div>
            <div class="mobile-cards mobile-only" id="mark-cards"></div>
          </div>
          <div class="tab-panel" data-tab="models">
            <div class="md-toolbar">
              <h4 style="margin:0;">Модели</h4>
              ${canManageUsers(this.context.state.user) ? `<button class="md-btn" data-add="model"><span class="material-icons-round">add</span></button>` : ""}
            </div>
            <div class="table-wrap desktop-only">
              <div class="table-scroll">
                <table class="md-table">
                <thead>
                  <tr>
                    <th>Марка</th>
                    <th>Модель</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody id="model-tbody"></tbody>
                </table>
              </div>
            </div>
            <div class="mobile-cards mobile-only" id="model-cards"></div>
          </div>
          <div class="tab-panel" data-tab="drivers">
            <div class="md-toolbar">
              <h4 style="margin:0;">Водители</h4>
              ${canEditOrganizations(this.context.state.user) ? `<button class="md-btn" data-add="driver"><span class="material-icons-round">add</span></button>` : ""}
            </div>
            <div class="table-wrap desktop-only">
              <div class="table-scroll">
                <table class="md-table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th data-sort="org_name" data-label="Организация">Организация</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody id="driver-tbody"></tbody>
                </table>
              </div>
            </div>
            <div class="mobile-cards mobile-only" id="driver-cards"></div>
            <div class="pagination" id="driver-pagination">
              <button class="md-btn ghost" data-page="prev">Назад</button>
              <div class="pagination-info" id="driver-page-info"></div>
              <button class="md-btn ghost" data-page="next">Вперёд</button>
              <select class="md-select" id="driver-limit">
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderTables();
    this.renderDriverPagination();
    this.updateDriverSortHeader();

    const tabs = node.querySelector("#ref-tabs");
    tabs?.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      node.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === tab));
    });

    node.querySelector("[data-tab='drivers'] thead")?.addEventListener("click", (e) => {
      const th = e.target.closest("th[data-sort]");
      if (!th) return;
      const key = th.dataset.sort;
      let dir = "asc";
      if (this.state.driversSort.key === key) {
        dir = this.state.driversSort.dir === "asc" ? "desc" : "asc";
      }
      this.state.driversSort = { key, dir };
      this.renderTables();
      this.updateDriverSortHeader();
    });

    if (canEditOrganizations(this.context.state.user)) {
      node.querySelector("[data-add='org']")?.addEventListener("click", () => this.openOrgModal());
      node.querySelector("#org-tbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const org = this.state.orgs.find((o) => String(o.id_org) === String(btn.dataset.id));
        if (!org) return;
        if (btn.dataset.action === "edit") this.openOrgModal(org);
        if (btn.dataset.action === "delete") this.confirmOrgDelete(org);
      });
      node.querySelector("#org-cards")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const org = this.state.orgs.find((o) => String(o.id_org) === String(btn.dataset.id));
        if (!org) return;
        if (btn.dataset.action === "edit") this.openOrgModal(org);
        if (btn.dataset.action === "delete") this.confirmOrgDelete(org);
      });
    }

    if (canManageUsers(this.context.state.user)) {
      node.querySelector("[data-add='mark']")?.addEventListener("click", () => this.openMarkModal());
      node.querySelector("[data-add='model']")?.addEventListener("click", () => this.openModelModal());

      node.querySelector("#mark-tbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const mark = this.state.marks.find((m) => String(m.id_mark) === String(btn.dataset.id));
        if (!mark) return;
        if (btn.dataset.action === "edit") this.openMarkModal(mark);
        if (btn.dataset.action === "delete") this.confirmMarkDelete(mark);
      });
      node.querySelector("#mark-cards")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const mark = this.state.marks.find((m) => String(m.id_mark) === String(btn.dataset.id));
        if (!mark) return;
        if (btn.dataset.action === "edit") this.openMarkModal(mark);
        if (btn.dataset.action === "delete") this.confirmMarkDelete(mark);
      });

      node.querySelector("#model-tbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const model = this.state.models.find((m) => String(m.id_model) === String(btn.dataset.id));
        if (!model) return;
        if (btn.dataset.action === "edit") this.openModelModal(model);
        if (btn.dataset.action === "delete") this.confirmModelDelete(model);
      });
      node.querySelector("#model-cards")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const model = this.state.models.find((m) => String(m.id_model) === String(btn.dataset.id));
        if (!model) return;
        if (btn.dataset.action === "edit") this.openModelModal(model);
        if (btn.dataset.action === "delete") this.confirmModelDelete(model);
      });
    }

    if (canEditOrganizations(this.context.state.user)) {
      node.querySelector("[data-add='driver']")?.addEventListener("click", () => this.openDriverModal());
      node.querySelector("#driver-tbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const driver = this.state.abonents.find((a) => String(a.id_fio) === String(btn.dataset.id));
        if (!driver) return;
        if (btn.dataset.action === "edit") this.openDriverModal(driver);
        if (btn.dataset.action === "delete") this.confirmDriverDelete(driver);
      });
      node.querySelector("#driver-cards")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const driver = this.state.abonents.find((a) => String(a.id_fio) === String(btn.dataset.id));
        if (!driver) return;
        if (btn.dataset.action === "edit") this.openDriverModal(driver);
        if (btn.dataset.action === "delete") this.confirmDriverDelete(driver);
      });
    }

    node.querySelector("#driver-pagination")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      const totalPages = this.getDriverTotalPages();
      if (btn.dataset.page === "prev" && this.state.driversPagination.page > 1) {
        this.state.driversPagination.page -= 1;
      }
      if (btn.dataset.page === "next" && this.state.driversPagination.page < totalPages) {
        this.state.driversPagination.page += 1;
      }
      this.context.setDriversPagination({ page: this.state.driversPagination.page });
      await this.loadDriversPage();
      this.renderTables();
    });

    node.querySelector("#driver-limit")?.addEventListener("change", async (e) => {
      const value = Number(e.target.value);
      if (!Number.isFinite(value) || value <= 0) return;
      this.state.driversPagination.limit = value;
      this.state.driversPagination.page = 1;
      this.context.setDriversPagination({ page: 1, limit: value });
      await this.loadDriversPage();
      this.renderTables();
    });

    return node;
  }

  getDriverTotalPages() {
    const { limit, total } = this.state.driversPagination;
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }

  renderDriverPagination() {
    if (!this.host) return;
    const info = this.host.querySelector("#driver-page-info");
    const prevBtn = this.host.querySelector("#driver-pagination [data-page='prev']");
    const nextBtn = this.host.querySelector("#driver-pagination [data-page='next']");
    const limitSelect = this.host.querySelector("#driver-limit");
    const { page, limit, total } = this.state.driversPagination;
    const totalPages = this.getDriverTotalPages();
    if (info) {
      info.textContent = `Страница ${Math.min(page, totalPages)} из ${totalPages}. Всего: ${total}`;
    }
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages || total === 0;
    if (limitSelect) limitSelect.value = String(limit);
  }

  renderTables() {
    if (!this.host) return;
    const orgTbody = this.host.querySelector("#org-tbody");
    const markTbody = this.host.querySelector("#mark-tbody");
    const modelTbody = this.host.querySelector("#model-tbody");
    const driverTbody = this.host.querySelector("#driver-tbody");
    const orgCards = this.host.querySelector("#org-cards");
    const markCards = this.host.querySelector("#mark-cards");
    const modelCards = this.host.querySelector("#model-cards");
    const driverCards = this.host.querySelector("#driver-cards");

    if (orgTbody) {
      orgTbody.innerHTML = this.state.orgs.length
        ? this.state.orgs.map((o) => this.orgRow(o)).join("")
        : `<tr><td colspan="6"><div class="empty">Нет записей</div></td></tr>`;
    }
    if (orgCards) {
      orgCards.innerHTML = this.state.orgs.length
        ? this.state.orgs.map((o) => this.orgCard(o)).join("")
        : `<div class="empty">Нет записей</div>`;
    }

    if (markTbody) {
      markTbody.innerHTML = this.state.marks.length
        ? this.state.marks.map((m) => this.markRow(m)).join("")
        : `<tr><td colspan="3"><div class="empty">Нет записей</div></td></tr>`;
    }
    if (markCards) {
      markCards.innerHTML = this.state.marks.length
        ? this.state.marks.map((m) => this.markCard(m)).join("")
        : `<div class="empty">Нет записей</div>`;
    }

    if (modelTbody) {
      modelTbody.innerHTML = this.state.models.length
        ? this.state.models.map((m) => this.modelRow(m)).join("")
        : `<tr><td colspan="4"><div class="empty">Нет записей</div></td></tr>`;
    }
    if (modelCards) {
      modelCards.innerHTML = this.state.models.length
        ? this.state.models.map((m) => this.modelCard(m)).join("")
        : `<div class="empty">Нет записей</div>`;
    }

    if (driverTbody) {
      const drivers = this.getSortedDrivers();
      driverTbody.innerHTML = drivers.length
        ? drivers.map((a) => this.driverRow(a)).join("")
        : `<tr><td colspan="4"><div class="empty">Нет записей</div></td></tr>`;
    }
    if (driverCards) {
      const drivers = this.getSortedDrivers();
      driverCards.innerHTML = drivers.length
        ? drivers.map((a) => this.driverCard(a)).join("")
        : `<div class="empty">Нет записей</div>`;
    }

    this.renderDriverPagination();
  }

  getSortedDrivers() {
    const { key, dir } = this.state.driversSort || {};
    if (!key) return [...this.state.abonents];
    const order = dir === "desc" ? -1 : 1;
    const items = [...this.state.abonents];
    return items.sort((a, b) => {
      const aVal = a.org_name || a.id_org || "";
      const bVal = b.org_name || b.id_org || "";
      return String(aVal).localeCompare(String(bVal), "ru-RU", { sensitivity: "base" }) * order;
    });
  }

  updateDriverSortHeader() {
    if (!this.host) return;
    const headers = this.host.querySelectorAll("[data-tab='drivers'] th[data-sort]");
    headers.forEach((th) => {
      const label = th.dataset.label || th.textContent || "";
      const isActive = this.state.driversSort.key === th.dataset.sort;
      if (!isActive) {
        th.textContent = label;
        return;
      }
      th.textContent = `${label} ${this.state.driversSort.dir === "asc" ? "^" : "v"}`;
    });
  }

  orgRow(org) {
    const limit = org.free_mesto_limit ?? org.free_mesto ?? 0;
    return `
      <tr>
        <td>${org.org_name}</td>
        <td>${limit}</td>
        <td>${org.free_mesto ?? 0}</td>
        <td>${org.comment || "-"}</td>
        <td>${org.id_org}</td>
        <td>
          ${canEditOrganizations(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${org.id_org}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${org.id_org}">Удалить</button>
          </div>` : "-"}
        </td>
      </tr>
    `;
  }

  markRow(mark) {
    return `
      <tr>
        <td>${mark.mark_name}</td>
        <td>${mark.id_mark}</td>
        <td>
          ${canManageUsers(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${mark.id_mark}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${mark.id_mark}">Удалить</button>
          </div>` : "-"}
        </td>
      </tr>
    `;
  }

  modelRow(model) {
    return `
      <tr>
        <td>${model.model_name}</td>
        <td>${model.mark_name || model.id_mark}</td>
        <td>${model.id_model}</td>
        <td>
          ${canManageUsers(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${model.id_model}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${model.id_model}">Удалить</button>
          </div>` : "-"}
        </td>
      </tr>
    `;
  }

  driverRow(driver) {
    const fullName = `${driver.surname} ${driver.name}${driver.otchestvo ? " " + driver.otchestvo : ""}`;
    return `
      <tr>
        <td>${fullName}</td>
        <td>${driver.org_name || driver.id_org || "-"}</td>
        <td>${driver.id_fio}</td>
        <td>
          ${canEditOrganizations(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${driver.id_fio}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${driver.id_fio}">Удалить</button>
          </div>` : "-"}
        </td>
      </tr>
    `;
  }

  orgCard(org) {
    const limit = org.free_mesto_limit ?? org.free_mesto ?? 0;
    const actions = canEditOrganizations(this.context.state.user)
      ? `
        <button class="md-btn ghost" data-action="edit" data-id="${org.id_org}">Редактировать</button>
        <button class="md-btn ghost" data-action="delete" data-id="${org.id_org}">Удалить</button>
      `
      : "";
    return `
      <div class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <div class="mobile-card-title">${org.org_name}</div>
            <div class="mobile-card-subtitle">ID ${org.id_org}</div>
          </div>
        </div>
        <div class="mobile-card-meta">
          <div class="mobile-card-row"><span>Гостевые места</span><span>${limit}</span></div>
          <div class="mobile-card-row"><span>Свободные места</span><span>${org.free_mesto ?? 0}</span></div>
          <div class="mobile-card-row"><span>Комментарий</span><span>${org.comment || "-"}</span></div>
        </div>
        ${actions ? `<div class="mobile-card-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  markCard(mark) {
    const actions = canManageUsers(this.context.state.user)
      ? `
        <button class="md-btn ghost" data-action="edit" data-id="${mark.id_mark}">Редактировать</button>
        <button class="md-btn ghost" data-action="delete" data-id="${mark.id_mark}">Удалить</button>
      `
      : "";
    return `
      <div class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <div class="mobile-card-title">${mark.mark_name}</div>
            <div class="mobile-card-subtitle">ID ${mark.id_mark}</div>
          </div>
        </div>
        ${actions ? `<div class="mobile-card-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  modelCard(model) {
    const actions = canManageUsers(this.context.state.user)
      ? `
        <button class="md-btn ghost" data-action="edit" data-id="${model.id_model}">Редактировать</button>
        <button class="md-btn ghost" data-action="delete" data-id="${model.id_model}">Удалить</button>
      `
      : "";
    return `
      <div class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <div class="mobile-card-title">${model.model_name}</div>
            <div class="mobile-card-subtitle">ID ${model.id_model}</div>
          </div>
        </div>
        <div class="mobile-card-meta">
          <div class="mobile-card-row"><span>Марка</span><span>${model.mark_name || model.id_mark}</span></div>
        </div>
        ${actions ? `<div class="mobile-card-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  driverCard(driver) {
    const fullName = `${driver.surname} ${driver.name}${driver.otchestvo ? " " + driver.otchestvo : ""}`;
    const actions = canEditOrganizations(this.context.state.user)
      ? `
        <button class="md-btn ghost" data-action="edit" data-id="${driver.id_fio}">Редактировать</button>
        <button class="md-btn ghost" data-action="delete" data-id="${driver.id_fio}">Удалить</button>
      `
      : "";
    return `
      <div class="mobile-card">
        <div class="mobile-card-header">
          <div>
            <div class="mobile-card-title">${fullName}</div>
            <div class="mobile-card-subtitle">ID ${driver.id_fio}</div>
          </div>
        </div>
        <div class="mobile-card-meta">
          <div class="mobile-card-row"><span>Организация</span><span>${driver.org_name || driver.id_org || "-"}</span></div>
        </div>
        ${actions ? `<div class="mobile-card-actions">${actions}</div>` : ""}
      </div>
    `;
  }


  openOrgModal(org) {
    const isEdit = Boolean(org);
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="md-field">
        <label>Организация</label>
        <input class="md-input" name="org_name" value="${org?.org_name || ""}" required>
      </div>
      <div class="md-field">
        <label>Гостевые места</label>
        <input class="md-input" name="free_mesto_limit" type="number" value="${org?.free_mesto_limit ?? org?.free_mesto ?? 0}">
      </div>
      <div class="md-field">
        <label>Свободные места</label>
        <input class="md-input" name="free_mesto" type="number" value="${org?.free_mesto ?? org?.free_mesto_limit ?? 0}">
      </div>
      <div class="md-field">
        <label>Комментарий</label>
        <textarea class="md-textarea" name="comment" placeholder="Комментарий">${org?.comment || ""}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-org">Отмена</button>
        <button class="md-btn" type="submit">Сохранить</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактирование организации" : "Новая организация", content: form });
    form.querySelector("#cancel-org")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.free_mesto !== undefined) {
        data.free_mesto = data.free_mesto === "" ? 0 : Number(data.free_mesto);
      }
      if (data.free_mesto_limit !== undefined) {
        data.free_mesto_limit = data.free_mesto_limit === "" ? 0 : Number(data.free_mesto_limit);
      }
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.organizations}/${org.id_org}`, data);
          toast.show("Организация сохранена", "success");
        } else {
          await apiPost(ENDPOINTS.references.organizations, data);
          toast.show("Организация добавлена", "success");
        }
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmOrgDelete(org) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить организацию <strong>${org.org_name}</strong>?</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-del">Отмена</button>
        <button type="button" class="md-btn" id="confirm-del">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удаление", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.organizations}/${org.id_org}`);
        toast.show("Готово", "success");
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }


  openMarkModal(mark) {
    const isEdit = Boolean(mark);
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="md-field">
        <label>Марка</label>
        <input class="md-input" name="mark_name" value="${mark?.mark_name || ""}" required>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-mark">Отмена</button>
        <button class="md-btn" type="submit">Сохранить</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактирование марки" : "Новая марка", content: form });
    form.querySelector("#cancel-mark")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.marks}/${mark.id_mark}`, data);
          toast.show("Марка сохранена", "success");
        } else {
          await apiPost(ENDPOINTS.references.marks, data);
          toast.show("Марка добавлена", "success");
        }
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmMarkDelete(mark) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить марку <strong>${mark.mark_name}</strong>?</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-del">Отмена</button>
        <button type="button" class="md-btn" id="confirm-del">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удаление", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.marks}/${mark.id_mark}`);
        toast.show("Готово", "success");
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }


  openModelModal(model) {
    const isEdit = Boolean(model);
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="md-field">
        <label>Марка</label>
        <select class="md-select" name="id_mark" required>
          <option value="">Выберите марку</option>
          ${this.state.marks.map((m) => `<option value="${m.id_mark}" ${model?.id_mark === m.id_mark ? "selected":""}>${m.mark_name}</option>`).join("")}
        </select>
      </div>
      <div class="md-field">
        <label>Модель</label>
        <input class="md-input" name="model_name" value="${model?.model_name || ""}" required>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-model">Отмена</button>
        <button class="md-btn" type="submit">Сохранить</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактирование модели" : "Новая модель", content: form });
    form.querySelector("#cancel-model")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.id_mark = Number(data.id_mark);
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.models}/${model.id_model}`, { id_mark: data.id_mark, model_name: data.model_name });
          toast.show("Модель сохранена", "success");
        } else {
          await apiPost(ENDPOINTS.references.models, { id_mark: data.id_mark, model_name: data.model_name });
          toast.show("Модель добавлена", "success");
        }
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }


  openDriverModal(driver) {
    const isEdit = Boolean(driver);
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="form-grid">
        <div class="md-field">
          <label>Фамилия</label>
          <input class="md-input" name="surname" value="${driver?.surname || ""}" required>
        </div>
        <div class="md-field">
          <label>Имя</label>
          <input class="md-input" name="name" value="${driver?.name || ""}" required>
        </div>
        <div class="md-field">
          <label>Отчество</label>
          <input class="md-input" name="otchestvo" value="${driver?.otchestvo || ""}">
        </div>
        <div class="md-field">
          <label>Организация</label>
          <select class="md-select" name="id_org" required>
            <option value="">Выберите организацию</option>
            ${this.state.orgs.map((o) => `<option value="${o.id_org}" ${String(driver?.id_org) === String(o.id_org) ? "selected":""}>${o.org_name}</option>`).join("")}
          </select>
        </div>
        <div class="md-field" style="grid-column:1/-1;">
          <label>Информация</label>
          <input class="md-input" name="info" value="${driver?.info || ""}">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-driver">Отмена</button>
        <button class="md-btn" type="submit">Сохранить</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактирование водителя" : "Новый водитель", content: form });
    form.querySelector("#cancel-driver")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.id_org = Number(data.id_org);
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.abonents}/${driver.id_fio}`, data);
          toast.show("Водитель сохранён", "success");
        } else {
          await apiPost(ENDPOINTS.references.abonents, data);
          toast.show("Водитель добавлен", "success");
        }
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmDriverDelete(driver) {
    const fullName = `${driver.surname} ${driver.name}${driver.otchestvo ? " " + driver.otchestvo : ""}`;
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить водителя <strong>${fullName}</strong>?</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-del">Отмена</button>
        <button type="button" class="md-btn" id="confirm-del">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удаление", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.abonents}/${driver.id_fio}`);
        toast.show("Готово", "success");
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmModelDelete(model) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить модель <strong>${model.model_name}</strong>?</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-del">Отмена</button>
        <button type="button" class="md-btn" id="confirm-del">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удаление", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.models}/${model.id_model}`);
        toast.show("Готово", "success");
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }

}
