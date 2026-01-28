import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiDelete, handleError, openFileInNewTab } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";
import { toast } from "../common/Toast.js";
import { canCreateTempPass, canDeleteTempPass, canDownloadTempPass } from "../../utils/permissions.js";
import { requireValue, formatGosNumber, requireGosNumber } from "../../utils/validators.js";
import { modal } from "../common/Modal.js";

export class TemporaryPassesPage {
  constructor(context) {
    this.context = context;
    this.state = {
      passes: [],
      filters: { status: "", gos_id: "", id_org: "" },
      references: null,
      pagination: { page: 1, limit: 50, total: 0 }
    };
    const storedPagination = this.context.state.ui?.temporaryPagination;
    if (storedPagination) {
      this.state.pagination.page = storedPagination.page || 1;
      this.state.pagination.limit = storedPagination.limit || 50;
    }
    const storedFilters = this.context.state.ui?.temporaryFilters;
    if (storedFilters) {
      this.state.filters = { ...this.state.filters, ...storedFilters };
    }
    this.searchTimer = null;
  }

  async loadReferences() {
    if (this.state.references) return this.state.references;
    try {
      const orgs = await apiGet(ENDPOINTS.references.organizations);
      this.state.references = { orgs };
    } catch (err) {
      handleError(err);
    }
    return this.state.references;
  }

  async refreshReferences() {
    try {
      const orgs = await apiGet(ENDPOINTS.references.organizations);
      this.state.references = { orgs };
    } catch (err) {
      handleError(err);
    }
    return this.state.references;
  }

  async loadData() {
    const { page, limit } = this.state.pagination;
    const skip = (page - 1) * limit;
    const params = { skip, limit };
    if (this.state.filters.status) params.status_filter = this.state.filters.status;
    if (this.state.filters.id_org) params.id_org = this.state.filters.id_org;
    if (this.state.filters.gos_id) params.gos_id = this.state.filters.gos_id;
    try {
      const response = await apiGet(ENDPOINTS.temporaryPasses, params);
      this.state.passes = response.items || [];
      this.state.pagination.total = response.total || 0;
      this.context.setTemporaryPagination({
        page: this.state.pagination.page,
        limit: this.state.pagination.limit
      });
      if (!this.state.passes.length && this.state.pagination.total && page > 1) {
        const lastPage = Math.max(1, Math.ceil(this.state.pagination.total / limit));
        if (lastPage !== page) {
          this.state.pagination.page = lastPage;
          this.context.setTemporaryPagination({ page: lastPage });
          await this.loadData();
        }
      }
    } catch (err) {
      handleError(err);
    }
  }

  formatDateTime(value) {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString("ru-RU");
  }

  async render() {
    await this.loadReferences();
    await this.loadData();
    const orgOptions = this.renderOrgDatalistOptions();
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card">
        <div class="toolbar">
          <div>
            <p class="tag">Временные пропуска</p>
            <h3 style="margin:0;">Журнал гостей</h3>
          </div>
          <div class="filters single-row">
            <input class="md-input" id="filter-gos" placeholder="\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0433\u043e\u0441\u043d\u043e\u043c\u0435\u0440\u0443" value="${this.state.filters.gos_id || ""}">
            <select class="md-select" id="filter-status">
              <option value="">\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b</option>
              <option value="active">\u0410\u043a\u0442\u0438\u0432\u0435\u043d</option>
              <option value="expired">\u0418\u0441\u0442\u0435\u043a</option>
              <option value="revoked">\u041e\u0442\u043e\u0437\u0432\u0430\u043d</option>
            </select>
            ${canCreateTempPass(this.context.state.user) ? `
            <button class="md-btn" id="new-temp-pass">
              <span class="material-icons-round">add_circle</span>\u0412\u044b\u0434\u0430\u0442\u044c
            </button>` : ""}
          </div>
        </div>
        <div class="md-divider"></div>
        <div class="table-scroll">
          <table class="md-table">
            <thead>
              <tr>
                <th>Госномер</th>
                <th>Компания</th>
                <th>Время заезда</th>
                <th>Время выезда</th>
                <th>Телефон</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody id="temp-pass-rows"></tbody>
          </table>
        </div>
        <div class="pagination" id="temp-pass-pagination">
          <button class="md-btn ghost" data-page="prev">Назад</button>
          <div class="pagination-info" id="temp-pass-page-info"></div>
          <button class="md-btn ghost" data-page="next">Вперёд</button>
        </div>
      </div>
    `;

    this.renderRows(node.querySelector("#temp-pass-rows"));
    this.renderPagination(node);
    this.bind(node);
    const statusSelect = node.querySelector("#filter-status");
    if (statusSelect) statusSelect.value = this.state.filters.status || "";
    this.updateOrgInfo(node, this.state.filters.id_org);
    return node;
  }

  getTimeAccessState() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const blocked = minutes < 8 * 60 || minutes >= 20 * 60;
    const timeLabel = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return { blocked, timeLabel };
  }

  getTotalPages() {
    const { limit, total } = this.state.pagination;
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }

  renderPagination(node) {
    const info = node.querySelector("#temp-pass-page-info");
    const prevBtn = node.querySelector("[data-page='prev']");
    const nextBtn = node.querySelector("[data-page='next']");
    const { page, limit, total } = this.state.pagination;
    const totalPages = this.getTotalPages();
    if (info) {
      info.textContent = `Страница ${Math.min(page, totalPages)} из ${totalPages} • Всего: ${total}`;
    }
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages || total === 0;
  }

  renderRows(tbody) {
    if (!this.state.passes.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Временные пропуска не найдены</div></td></tr>`;
      return;
    }
    tbody.innerHTML = this.state.passes
      .map(
        (p) => `
          <tr data-id="${p.id}">
            <td><strong>${p.gos_id}</strong><br><span class="tag">#${p.id}</span></td>
            <td>${p.org_name || "-"}</td>
            <td>${this.formatDateTime(p.entered_at)}</td>
            <td>${this.formatDateTime(p.exited_at)}</td>
            <td>${p.phone || "-"}</td>
            <td>${renderStatusChip(p.status)}</td>
            <td>
              <div class="table-actions">
                ${canCreateTempPass(this.context.state.user) && !p.entered_at ? `<button class="md-btn ghost" data-action="enter">Заехал</button>` : ""}
                ${canCreateTempPass(this.context.state.user) && p.entered_at && !p.exited_at ? `<button class="md-btn ghost" data-action="exit">Выехал</button>` : ""}
                ${canDeleteTempPass(this.context.state.user) ? `<button class="md-btn ghost" data-action="delete">Удалить</button>` : ""}
                ${canDeleteTempPass(this.context.state.user) && p.status === "active" ? `<button class="md-btn ghost" data-action="revoke">Отозвать</button>` : ""}
                ${canDownloadTempPass(this.context.state.user) ? `<button class="md-btn secondary" data-action="pdf">PDF</button>` : ""}
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  bind(node) {
    const applyFilters = async () => {
      const gos_id = node.querySelector("#filter-gos").value;
      const status = node.querySelector("#filter-status").value;
      this.state.filters = { gos_id, status, id_org: "" };
      this.context.setTemporaryFilters(this.state.filters);
      this.state.pagination.page = 1;
      this.context.setTemporaryPagination({ page: 1 });
      await this.loadData();
      this.renderRows(node.querySelector("#temp-pass-rows"));
      this.renderPagination(node);
      this.updateOrgInfo(node, "");
    };

    const scheduleApply = () => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(async () => {
        await applyFilters();
      }, 350);
    };

    node.querySelector("#filter-gos")?.addEventListener("input", scheduleApply);
    node.querySelector("#filter-status")?.addEventListener("change", scheduleApply);

    node.querySelector("#temp-pass-rows")?.addEventListener("click", async (e) => {
      const actionBtn = e.target.closest("button[data-action]");
      if (!actionBtn) return;
      const tr = actionBtn.closest("tr");
      const id = tr?.dataset.id;
      if (!id) return;
      try {
        if (actionBtn.dataset.action === "enter") {
          await apiPost(`${ENDPOINTS.temporaryPasses}/${id}/enter`, {});
          toast.show("\u0412\u044a\u0435\u0437\u0434 \u043e\u0442\u043c\u0435\u0447\u0435\u043d", "success");
          await this.loadData();
          await this.refreshReferences();
          this.renderRows(document.querySelector("#temp-pass-rows"));
          this.renderPagination(document);
          return;
        }
        if (actionBtn.dataset.action === "exit") {
          await apiPost(`${ENDPOINTS.temporaryPasses}/${id}/exit`, {});
          toast.show("\u0412\u044b\u0435\u0437\u0434 \u043e\u0442\u043c\u0435\u0447\u0435\u043d", "success");
          await this.loadData();
          await this.refreshReferences();
          this.renderRows(document.querySelector("#temp-pass-rows"));
          this.renderPagination(document);
          return;
        }
        if (actionBtn.dataset.action === "revoke") {
          await this.confirmRevoke(id);
          return;
        }
        if (actionBtn.dataset.action === "delete") {
          await this.confirmDelete(id);
          return;
        }
        if (actionBtn.dataset.action === "pdf") {
          await this.downloadPdf(id);
          return;
        }
      } catch (err) {
        handleError(err);
      }
    });

    node.querySelector("#new-temp-pass")?.addEventListener("click", async () => {
      await this.openCreateModal();
    });

    node.querySelector("#temp-pass-pagination")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-page]");
      if (!btn) return;
      const totalPages = this.getTotalPages();
      if (btn.dataset.page === "prev" && this.state.pagination.page > 1) {
        this.state.pagination.page -= 1;
      }
      if (btn.dataset.page === "next" && this.state.pagination.page < totalPages) {
        this.state.pagination.page += 1;
      }
      this.context.setTemporaryPagination({ page: this.state.pagination.page });
      await this.loadData();
      this.renderRows(node.querySelector("#temp-pass-rows"));
      this.renderPagination(node);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  }

  async openCreateModal() {
    await this.refreshReferences();
    const orgOptions = this.renderOrgDatalistOptions();
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="tag" id="temp-pass-time-warning" style="display:none; background:#fee2e2; color:#991b1b;">
        \u0412\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u0430 \u043c\u043e\u0436\u043d\u043e \u0432\u044b\u0434\u0430\u0432\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0441 08:00 \u0434\u043e 20:00.
      </div>
      <div class="form-grid">
        <div class="md-field" style="grid-column:1/-1;">
          <label>Госномер</label>
          <input class="md-input" name="gos_id" placeholder="A 888 AA 790 / O 632 CX 77 / 0013 AX 77" maxlength="12" required>
        </div>
        <div class="md-field" style="grid-column:1/-1;">
          <label>Компания</label>
          <input class="md-input" name="org_name" list="temp-org-options-create" placeholder="Начните вводить название" required>
          <datalist id="temp-org-options-create">
            ${orgOptions}
          </datalist>
          <input type="hidden" name="id_org">
        </div>
        <div class="md-field">
          <label>Гостевые места</label>
          <div class="tag" id="org-guest-info">-</div>
        </div>
        <div class="md-field">
          <label>Свободные места</label>
          <div class="tag" id="org-free-info">-</div>
        </div>
        <div class="md-field">
          <label>Телефон (необязательно)</label>
          <input class="md-input" name="phone" placeholder="+7 999 000-00-00">
        </div>
        <div class="md-field" style="grid-column:1/-1;">
          <label>Комментарий</label>
          <textarea class="md-textarea" name="comment" placeholder="Примечание"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-create">Отмена</button>
        <button class="md-btn" type="submit" id="submit-temp-pass">Выдать</button>
      </div>
    `;

    const instance = modal.show({ title: "Временный пропуск", content: form });
    const gosInput = form.querySelector('[name="gos_id"]');
    const orgNameInput = form.querySelector('[name="org_name"]');
    const orgIdInput = form.querySelector('[name="id_org"]');
    const warning = form.querySelector("#temp-pass-time-warning");
    const submitBtn = form.querySelector("#submit-temp-pass");
    if (warning) {
      const { timeLabel } = this.getTimeAccessState();
      warning.style.display = "block";
      warning.textContent = `\u0412\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u0430 \u043c\u043e\u0436\u043d\u043e \u0432\u044b\u0434\u0430\u0432\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0441 08:00 \u0434\u043e 20:00. \u0421\u0435\u0439\u0447\u0430\u0441: ${timeLabel}`;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.title = "";
      }
    }
    gosInput?.addEventListener("input", () => {
      gosInput.value = gosInput.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    });
    gosInput?.addEventListener("blur", () => {
      gosInput.value = formatGosNumber(gosInput.value);
    });
    if (gosInput) gosInput.value = formatGosNumber(gosInput.value);
    if (orgNameInput && orgIdInput) {
      orgNameInput.addEventListener("input", () => {
        const orgId = this.resolveOrgId(orgNameInput.value);
        orgIdInput.value = orgId ? String(orgId) : "";
        this.updateOrgInfo(form, orgId);
      });
    }
    this.updateOrgInfo(form, orgIdInput?.value);

    form.querySelector("#cancel-create")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        data.gos_id = formatGosNumber(data.gos_id);
        requireValue(data.gos_id, "Введите госномер");
        requireGosNumber(data.gos_id);
        if (!data.id_org) {
          const orgId = this.resolveOrgId(data.org_name);
          data.id_org = orgId ? String(orgId) : "";
        }
        requireValue(data.id_org, "Выберите организацию");
        data.id_org = Number(data.id_org);
        await apiPost(ENDPOINTS.temporaryPasses, data);
        toast.show("Временный пропуск создан", "success");
        await this.refreshReferences();
        instance.close();
        await this.loadData();
        this.renderRows(document.querySelector("#temp-pass-rows"));
        this.renderPagination(document);
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmRevoke(id) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Отозвать временный пропуск #${id}?</p>
      <div class="md-field" style="margin-top:12px;">
        <label>Комментарий</label>
        <textarea class="md-textarea" id="revoke-comment" placeholder="Причина (необязательно)"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-revoke">Отмена</button>
        <button type="button" class="md-btn" id="confirm-revoke">Отозвать</button>
      </div>
    `;
    const instance = modal.show({ title: "Отзыв пропуска", content });
    content.querySelector("#cancel-revoke")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-revoke")?.addEventListener("click", async () => {
      const comment = content.querySelector("#revoke-comment").value;
      try {
        await apiPost(`${ENDPOINTS.temporaryPasses}/${id}/revoke`, { comment });
        toast.show("Пропуск отозван", "success");
        await this.refreshReferences();
        instance.close();
        await this.loadData();
        this.renderRows(document.querySelector("#temp-pass-rows"));
        this.renderPagination(document);
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmDelete(id) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить временный пропуск #${id}? Операция безвозвратна.</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-delete">Отмена</button>
        <button type="button" class="md-btn" id="confirm-delete">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удалить пропуск", content });
    content.querySelector("#cancel-delete")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-delete")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.temporaryPasses}/${id}`);
        toast.show("Пропуск удалён", "success");
        await this.refreshReferences();
        instance.close();
        await this.loadData();
        this.renderRows(document.querySelector("#temp-pass-rows"));
        this.renderPagination(document);
      } catch (err) {
        handleError(err);
      }
    });
  }

  async downloadPdf(id) {
    try {
      await openFileInNewTab(`${ENDPOINTS.temporaryPasses}/${id}/pdf`);
      toast.show("PDF открыт", "success");
    } catch (err) {
      handleError(err);
    }
  }

  renderOrgDatalistOptions(query = "") {
    const orgs = this.state.references?.orgs || [];
    return orgs
      .filter((o) => {
        if (!query) return true;
        return (o.org_name || "").toLowerCase().includes(query);
      })
      .map((o) => {
        const safeName = this.escapeHtml(o.org_name || "");
        const free = Number.isFinite(Number(o.free_mesto)) ? Number(o.free_mesto) : 0;
        const limit = Number.isFinite(Number(o.free_mesto_limit)) ? Number(o.free_mesto_limit) : free;
        return `<option value="${safeName} (мест: ${limit}, свободно: ${free})"></option>`;
      })
      .join("");
  }

  resolveOrgId(name) {
    const query = (name || "").trim().toLowerCase();
    if (!query) return null;
    const normalized = query.replace(/\s*\(.*\)\s*$/, "").trim();
    const org = (this.state.references?.orgs || []).find((o) => {
      const orgName = (o.org_name || "").toLowerCase();
      return orgName === query || orgName === normalized;
    });
    return org ? org.id_org : null;
  }

  getOrgById(id) {
    if (!id) return null;
    return (this.state.references?.orgs || []).find((o) => String(o.id_org) === String(id));
  }

  updateOrgInfo(root, orgId) {
    const guestInfo = root.querySelector("#org-guest-info");
    const freeInfo = root.querySelector("#org-free-info");
    const info = root.querySelector("#filter-org-info");
    if (!guestInfo && !freeInfo && !info) return;
    if (!orgId) {
      if (guestInfo) guestInfo.textContent = "-";
      if (freeInfo) freeInfo.textContent = "-";
      if (info) info.textContent = "-";
      return;
    }
    const org = this.getOrgById(orgId);
    const free = org ? Number(org.free_mesto || 0) : 0;
    const limit = org ? Number.isFinite(Number(org.free_mesto_limit)) ? Number(org.free_mesto_limit) : free : 0;
    if (guestInfo) guestInfo.textContent = `Гостевых мест: ${limit}`;
    if (freeInfo) freeInfo.textContent = `Свободных мест: ${free}`;
    if (info) info.textContent = `Гостевых мест: ${limit}`;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}