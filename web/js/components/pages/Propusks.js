import { ENDPOINTS } from "../../config/constants.js";

import { apiGet, apiPost, apiPatch, apiDelete, handleError, openFileInNewTab } from "../../api/client.js";

import { renderStatusChip } from "../../utils/statusConfig.js";

import { toast } from "../common/Toast.js";

import {

  canViewPropusks,

  canCreatePropusks,

  canEditPropusks,

  canActivatePropusks,

  canDeletePropusks,

  canAnnulPropusks,

  canMarkDelete,

  canDownload

} from "../../utils/permissions.js";

import { requireDateOrder, requireValue, formatGosNumber, requireGosNumber } from "../../utils/validators.js";

import { modal } from "../common/Modal.js";



export class PropusksPage {

  constructor(context) {

    this.context = context;

    this.state = {

      propusks: [],

      filters: { search: "", status: "" },

      sort: { key: "", dir: "asc" },

      references: null,

      pagination: { page: 1, limit: 50, total: 0 },

      loadingMore: false,

      hasMore: true,

      usePagination: Boolean(this.context.state.ui?.showPropuskPagination)

    };

    const storedPagination = this.context.state.ui?.propuskPagination;

    if (storedPagination && this.state.usePagination) {

      this.state.pagination.page = storedPagination.page || 1;

    }

    const storedFilters = this.context.state.ui?.propuskFilters;

    if (storedFilters?.status) {

      this.state.filters.status = storedFilters.status;

    }

    this.searchTimer = null;

    this.scrollObserver = null;

    this.host = null;

  }



  async loadData({ append = false } = {}) {

    const { filters } = this.state;

    try {

      const { page, limit } = this.state.pagination;

      const skip = (page - 1) * limit;

      const params = { limit, skip };

      if (filters.search) params.search = filters.search;

      if (filters.status) params.status = filters.status;

      const response = await apiGet(ENDPOINTS.propusksPaged, params);

      const items = response.items || [];

      this.state.propusks = append ? [...this.state.propusks, ...items] : items;

      this.state.pagination.total = response.total || 0;

      this.state.hasMore = this.state.propusks.length < this.state.pagination.total;

      this.context.setPropuskPagination({

        page: this.state.pagination.page,

        limit: this.state.pagination.limit

      });

      if (!append && !this.state.propusks.length && this.state.pagination.total && page > 1) {

        const lastPage = Math.max(1, Math.ceil(this.state.pagination.total / limit));

        if (lastPage !== page) {

          this.state.pagination.page = lastPage;

          this.context.setPropuskPagination({ page: lastPage });

          await this.loadData();

        }

      }

    } catch (err) {

      handleError(err);

    }

  }



  async loadReferences() {

    if (this.state.references) return this.state.references;

    try {

      const [orgs, marks, abonents] = await Promise.all([

        apiGet(ENDPOINTS.references.organizations),

        apiGet(ENDPOINTS.references.marks),

        apiGet(ENDPOINTS.references.abonents)

      ]);

      this.state.references = { orgs, marks, abonents, models: [] };

    } catch (err) {

      handleError(err);

    }

    return this.state.references;

  }



  async fetchModels(markId) {

    const models = await apiGet(ENDPOINTS.references.models, { mark_id: markId });

    this.state.references.models = models;

  }



  async loadHistory(propuskId) {

    try {

      return await apiGet(`${ENDPOINTS.propusks}/${propuskId}/history`);

    } catch (err) {

      handleError(err);

      return [];

    }

  }



  async ensureHistoryModels() {

    if (this.state.references?.modelsAll) return;

    try {

      const models = await apiGet(ENDPOINTS.references.models);

      this.state.references = {

        ...(this.state.references || {}),

        modelsAll: models

      };

    } catch (err) {

      handleError(err);

    }

  }



  parseHistoryPayload(payload) {

    if (!payload) return {};

    try {

      const data = JSON.parse(payload);

      return data && typeof data === "object" ? data : {};

    } catch {

      return {};

    }

  }



  formatHistoryAction(action) {

    const map = {

      created: "",

      edited: "",

      activated: "",

      marked_delete: " ",

      revoked: "",

      archived: ""

    };

    return map[action] || action;

  }



  formatHistoryStatus(status) {

    const map = {

      draft: "",

      active: "",

      pending_delete: " ",

      revoked: ""

    };

    return map[status] || status;

  }



  resolveHistoryValue(field, value) {

    if (value === null || value === undefined || value === "") return "—";

    if (field === "status") return this.formatHistoryStatus(String(value));

    if (field === "id_org") {

      const org = (this.state.references?.orgs || []).find((o) => String(o.id_org) === String(value));

      return org ? org.org_name : `ID ${value}`;

    }

    if (field === "id_mark_auto") {

      const mark = (this.state.references?.marks || []).find((m) => String(m.id_mark) === String(value));

      return mark ? mark.mark_name : `ID ${value}`;

    }

    if (field === "id_model_auto") {

      const model =

        (this.state.references?.models || []).find((m) => String(m.id_model) === String(value)) ||

        (this.state.references?.modelsAll || []).find((m) => String(m.id_model) === String(value));

      return model ? model.model_name : `ID ${value}`;

    }

    if (field === "id_fio") {

      const driver = (this.state.references?.abonents || []).find((a) => String(a.id_fio) === String(value));

      if (driver) {

        return `${driver.surname} ${driver.name}${driver.otchestvo ? " " + driver.otchestvo : ""}`;

      }

      return `ID ${value}`;

    }

    return String(value);

  }



  getHistoryChanges(item) {

    const oldData = this.parseHistoryPayload(item.old_values);

    const newData = this.parseHistoryPayload(item.new_values);

    const fields = [

      ["gos_id", ""],

      ["id_mark_auto", ""],

      ["id_model_auto", ""],

      ["id_org", ""],

      ["id_fio", ""],

      ["status", ""]

    ];

    const changes = [];

    fields.forEach(([field, label]) => {

      const oldHas = Object.prototype.hasOwnProperty.call(oldData, field);

      const newHas = Object.prototype.hasOwnProperty.call(newData, field);

      if (!oldHas && !newHas) return;

      const oldValue = oldData[field];

      const newValue = newData[field];

      const oldNorm = oldValue === null || oldValue === undefined ? null : String(oldValue);

      const newNorm = newValue === null || newValue === undefined ? null : String(newValue);

      if (oldNorm === newNorm) return;

      changes.push(

        `${label}: ${this.resolveHistoryValue(field, oldValue)} > ${this.resolveHistoryValue(field, newValue)}`

      );

    });

    return changes;

  }



  renderHistory(history) {

    if (!history.length) {

      return `<div class="empty"> </div>`;

    }

    return history.map((item) => {

      const time = item.timestamp ? new Date(item.timestamp).toLocaleString("ru-RU") : "-";

      const user = item.user_name || `ID ${item.changed_by}`;

      const changes = this.getHistoryChanges(item);

      const changesBlock = changes.length

        ? `<div class="history-changes">${changes.map((c) => `<div>${c}</div>`).join("")}</div>`

        : "";

      const comment = item.comment ? `<div class="history-comment">${item.comment}</div>` : "";

      return `

        <div class="propusk-history-item">

          <div class="history-row">

            <strong>${this.formatHistoryAction(item.action)}</strong>

            <span class="history-meta">${time}</span>

          </div>

          <div class="history-meta">${user}</div>

          ${changesBlock}

          ${comment}

        </div>

      `;

    }).join("");

  }



  async render() {

    this.state.usePagination = Boolean(this.context.state.ui?.showPropuskPagination);

    const nextStatus = this.context.state.ui?.propuskFilters?.status || "";

    if (nextStatus) {

      this.state.filters.status = nextStatus;

      this.context.setPropuskFilters({ status: "" });

    }

    await this.loadReferences();

    await this.loadData();

    const node = document.createElement("div");

    this.host = node;

    node.className = "section";

    node.innerHTML = `

      <div class="md-card">

        <div class="toolbar">

          <div>

            <p class="tag"></p>

            <h3 style="margin:0;"> </h3>

          </div>

          <div class="filters single-row">

            <input class="md-input" id="filter-search" placeholder="\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043d\u043e\u043c\u0435\u0440\u0443, \u0424\u0418\u041e \u0438\u043b\u0438 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438" value="${this.state.filters.search || ""}">

            <select class="md-select" id="filter-status" value="${this.state.filters.status || ""}">

              <option value="">\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b</option>

              <option value="draft">\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a</option>

              <option value="active">\u0410\u043a\u0442\u0438\u0432\u0435\u043d</option>

              <option value="pending_delete">\u041d\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0435</option>

              <option value="revoked">\u0410\u043d\u043d\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u043d</option>

            </select>

            ${canCreatePropusks(this.context.state.user) ? `

            <button class="md-btn" id="new-propusk">

              <span class="material-icons-round">add_circle</span>\u041d\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u043f\u0443\u0441\u043a

            </button>` : ""}

          </div>

        </div>

        <div class="md-divider"></div>

        <div class="table-wrap desktop-only">

          <div class="table-scroll">

          <table class="md-table">

            <thead>

              <tr>

                <th data-sort="gos_id" data-label=""></th>

                <th data-sort="org_name" data-label=""></th>

                <th data-sort="abonent_fio" data-label=""></th>

                <th data-sort="valid_until" data-label=" "> </th>

                <th></th>

                <th></th>

              </tr>

            </thead>

            <tbody id="propusk-rows"></tbody>

          </table>

        </div>

        </div>

        <div class="mobile-cards mobile-only" id="propusk-cards"></div>

        <div id="propusk-sentinel" style="height:1px;"></div>

        <div class="pagination" id="propusk-pagination" style="${this.state.usePagination ? "" : "display:none;"}">

          <button class="md-btn ghost" data-page="prev">Назад</button>

          <div class="pagination-info" id="propusk-page-info"></div>

          <button class="md-btn ghost" data-page="next">Вперёд</button>

        </div>

      </div>

    `;



    this.renderRows(node.querySelector("#propusk-rows"));

    if (this.state.usePagination) {

      this.renderPagination(node);

    }

    this.updateSortHeaders(node);

    this.bind(node);

    const statusSelect = node.querySelector("#filter-status");

    if (statusSelect) {

      statusSelect.value = this.state.filters.status || "";

    }

    return node;

  }



  getTotalPages() {

    const { limit, total } = this.state.pagination;

    if (!total) return 1;

    return Math.max(1, Math.ceil(total / limit));

  }



  renderPagination(node) {

    const info = node.querySelector("#propusk-page-info");

    const prevBtn = node.querySelector("[data-page='prev']");

    const nextBtn = node.querySelector("[data-page='next']");

    const { page, limit, total } = this.state.pagination;

    const totalPages = this.getTotalPages();

    if (info) {

      info.textContent = ` ${Math.min(page, totalPages)}  ${totalPages}  : ${total}`;

    }

    if (prevBtn) prevBtn.disabled = page <= 1;

    if (nextBtn) nextBtn.disabled = page >= totalPages || total === 0;

  }



  renderRows(tbody) {

    const cards = this.host?.querySelector("#propusk-cards");

    if (!this.state.propusks.length) {

      tbody.innerHTML = `<tr><td colspan="6"><div class="empty">  </div></td></tr>`;

      if (cards) {

        cards.innerHTML = `<div class="empty">  </div>`;

      }

      return;

    }



    const items = this.getSortedPropusks();

    tbody.innerHTML = items

      .map(

        (p) => `

          <tr data-id="${p.id_propusk}">

            <td><strong>${p.gos_id}</strong><br><span class="tag">${p.id_propusk}</span></td>

            <td>${p.org_name || "—"}</td>

            <td>${p.abonent_fio || "—"}</td>

            <td>${p.valid_until}</td>

            <td>${renderStatusChip(p.status)}</td>

            <td>

              <div class="table-actions">

                ${canEditPropusks(this.context.state.user) && ["draft","active","pending_delete"].includes(p.status) ? `<button class="md-btn ghost" data-action="edit">Редактировать</button>` : ""}

                ${canActivatePropusks(this.context.state.user) && p.status === "draft" ? `<button class="md-btn tonal" data-action="activate">Активировать</button>` : ""}

                ${canMarkDelete(this.context.state.user) && p.status === "active" ? `<button class="md-btn ghost" data-action="mark-delete">На удаление</button>` : ""}

                ${canAnnulPropusks(this.context.state.user) && ["active","pending_delete"].includes(p.status) ? `<button class="md-btn ghost" data-action="revoke">Аннулировать</button>` : ""}

                ${canAnnulPropusks(this.context.state.user) && p.status === "revoked" ? `<button class="md-btn ghost" data-action="restore">Восстановить</button>` : ""}

                ${canDeletePropusks(this.context.state.user) ? `<button class="md-btn ghost" data-action="archive">Удалить</button>` : ""}

                ${canDownload(this.context.state.user) && p.status === "active" ? `<button class="md-btn secondary" data-action="pdf">PDF</button>` : ""}

              </div>

            </td>

          </tr>

        `

      )

      .join("");

    this.renderCards(cards, items);

  }



  getSortedPropusks() {

    const { key, dir } = this.state.sort || {};

    if (!key) return [...this.state.propusks];

    const order = dir === "desc" ? -1 : 1;

    const items = [...this.state.propusks];

    const compareText = (a, b) =>

      String(a || "").localeCompare(String(b || ""), "ru-RU", { sensitivity: "base" });

    return items.sort((a, b) => {

      if (key === "valid_until") {

        const aTime = new Date(a.valid_until || "").getTime();

        const bTime = new Date(b.valid_until || "").getTime();

        const aVal = Number.isNaN(aTime) ? 0 : aTime;

        const bVal = Number.isNaN(bTime) ? 0 : bTime;

        return (aVal - bVal) * order;

      }

      return compareText(a[key], b[key]) * order;

    });

  }



  updateSortHeaders(node) {

    const headers = node.querySelectorAll("th[data-sort]");

    headers.forEach((th) => {

      const label = th.dataset.label || th.textContent || "";

      const isActive = this.state.sort.key === th.dataset.sort;

      if (!isActive) {

        th.textContent = label;

        return;

      }

      th.textContent = `${label} ${this.state.sort.dir === "asc" ? "^" : "v"}`;

    });

  }



  async loadMore() {

    if (this.state.loadingMore || !this.state.hasMore) return;

    this.state.loadingMore = true;

    this.state.pagination.page += 1;

    this.context.setPropuskPagination({ page: this.state.pagination.page });

    try {

      await this.loadData({ append: true });

      if (this.host) {

        this.renderRows(this.host.querySelector("#propusk-rows"));

        this.updateSortHeaders(this.host);

      }

    } catch (err) {

      handleError(err);

    } finally {

      this.state.loadingMore = false;

    }

  }



  setupScrollObserver() {

    if (this.scrollObserver) {

      this.scrollObserver.disconnect();

    }

    if (!this.host || this.state.usePagination) return;

    const sentinel = this.host.querySelector("#propusk-sentinel");

    if (!sentinel) return;

    this.scrollObserver = new IntersectionObserver(

      (entries) => {

        if (entries.some((entry) => entry.isIntersecting)) {

          this.loadMore();

        }

      },

      { root: null, rootMargin: "200px", threshold: 0 }

    );

    this.scrollObserver.observe(sentinel);

  }



  bind(node) {

    const applyFilters = async () => {

      const search = node.querySelector("#filter-search").value;

      const status = node.querySelector("#filter-status").value;

      this.state.filters = { search, status };

      this.state.pagination.page = 1;

      this.context.setPropuskPagination({ page: 1 });

      await this.loadData();

      this.renderRows(node.querySelector("#propusk-rows"));

      if (this.state.usePagination) {

        this.renderPagination(node);

      } else {

        this.setupScrollObserver();

      }

    };



    const scheduleApply = () => {

      if (this.searchTimer) clearTimeout(this.searchTimer);

      this.searchTimer = setTimeout(async () => {

        await applyFilters();

      }, 350);

    };



    node.querySelector("#filter-search")?.addEventListener("input", scheduleApply);

    node.querySelector("#filter-status")?.addEventListener("change", scheduleApply);



    node.querySelector("thead")?.addEventListener("click", (e) => {

      const th = e.target.closest("th[data-sort]");

      if (!th) return;

      const key = th.dataset.sort;

      let dir = "asc";

      if (this.state.sort.key === key) {

        dir = this.state.sort.dir === "asc" ? "desc" : "asc";

      }

      this.state.sort = { key, dir };

      this.renderRows(node.querySelector("#propusk-rows"));

      this.updateSortHeaders(node);

    });



    node.querySelector("#propusk-rows")?.addEventListener("click", async (e) => {

      const actionBtn = e.target.closest("button[data-action]");

      if (!actionBtn) return;

      const tr = actionBtn.closest("tr");

      const id = tr?.dataset.id;

      if (!id) return;



      try {

        switch (actionBtn.dataset.action) {

          case "activate":

            await apiPost(`${ENDPOINTS.propusks}/${id}/activate`, {});

    node.querySelector("#propusk-cards")?.addEventListener("click", async (e) => {

      const actionBtn = e.target.closest("button[data-action]");

      if (!actionBtn) return;

      const id = actionBtn.dataset.id;

      if (!id) return;



      try {

        switch (actionBtn.dataset.action) {

          case "activate":

            await apiPost(`${ENDPOINTS.propusks}/${id}/activate`, {});

            toast.show(" ", "success");

            break;

          case "edit":

            this.openEditModal(this.state.propusks.find((p) => String(p.id_propusk) === String(id)));

            return;

          case "mark-delete":

            await apiPost(`${ENDPOINTS.propusks}/${id}/mark-delete`, {});

            toast.show("  ", "info");

            break;

          case "revoke":

            await apiPost(`${ENDPOINTS.propusks}/${id}/revoke`, {});

            toast.show(" ", "warning");

            break;

          case "restore":

            await apiPost(`${ENDPOINTS.propusks}/${id}/restore`, {});

            toast.show(" ", "success");

            break;

          case "archive":

            await this.confirmArchive(id);

            return;

          case "pdf":

            await this.downloadPdf(id);

            return;

        }

        await this.loadData();

        this.renderRows(node.querySelector("#propusk-rows"));

        this.renderPagination(node);

      } catch (err) {

        handleError(err);

      }

    });

            toast.show(" ", "success");

            break;

          case "edit":

            this.openEditModal(this.state.propusks.find((p) => String(p.id_propusk) === String(id)));

            return;

          case "mark-delete":

            await apiPost(`${ENDPOINTS.propusks}/${id}/mark-delete`, {});

            toast.show("  ", "info");

            break;

          case "revoke":

            await apiPost(`${ENDPOINTS.propusks}/${id}/revoke`, {});

            toast.show(" ", "warning");

            break;

          case "restore":

            await apiPost(`${ENDPOINTS.propusks}/${id}/restore`, {});

            toast.show(" ", "success");

            break;

          case "archive":

            await this.confirmArchive(id);

            return;

          case "pdf":

            await this.downloadPdf(id);

            return;

        }

        await this.loadData();

        this.renderRows(node.querySelector("#propusk-rows"));

        this.renderPagination(node);

      } catch (err) {

        handleError(err);

      }

    });



    node.querySelector("#new-propusk")?.addEventListener("click", () => {

      this.openCreateModal();

    });



    node.querySelector("#propusk-pagination")?.addEventListener("click", async (e) => {

      if (!this.state.usePagination) return;

      const btn = e.target.closest("button[data-page]");

      if (!btn) return;

      const totalPages = this.getTotalPages();

      if (btn.dataset.page === "prev" && this.state.pagination.page > 1) {

        this.state.pagination.page -= 1;

      }

      if (btn.dataset.page === "next" && this.state.pagination.page < totalPages) {

        this.state.pagination.page += 1;

      }

      this.context.setPropuskPagination({ page: this.state.pagination.page });

      await this.loadData();

      this.renderRows(node.querySelector("#propusk-rows"));

      this.renderPagination(node);

      window.scrollTo({ top: 0, behavior: "smooth" });

    });



  }



  fillModels(select) {

    if (!select) return;

    const models = this.state.references?.models || [];

    if (!models.length) {

      select.innerHTML = `<option value="">  </option>`;

      select.disabled = true;

      return;

    }

    select.disabled = false;

    select.innerHTML = `<option value=""> </option>` + models.map((m) => `<option value="${m.id_model}">${m.model_name}</option>`).join("");

  }



  fillDrivers(select, orgId, selectedId = "") {

    if (!select) return;

    if (!orgId) {

      select.innerHTML = `<option value="">  </option>`;

      select.disabled = true;

      return;

    }

    const drivers = (this.state.references?.abonents || []).filter(

      (a) => String(a.id_org) === String(orgId)

    );

    select.disabled = false;

    select.innerHTML = `<option value=""> </option>` + drivers

      .map((a) => {

        const name = `${a.surname} ${a.name}${a.otchestvo ? " " + a.otchestvo : ""}`;

        const selected = String(selectedId) === String(a.id_fio) ? "selected" : "";

        return `<option value="${a.id_fio}" ${selected}>${name}</option>`;

      })

      .join("");

  }



  renderPassTypeControls(passType) {

    const isParking = passType === "parking";

    const isDrive = passType === "drive";

    return `

      <div class="md-field" style="grid-column:1/-1;">

        <label> </label>

        <div class="pass-type-controls">

          <label class="pass-type-option">

            <input type="checkbox" id="pass-type-parking" ${isParking ? "checked" : ""}>

             

          </label>

          <label class="pass-type-option">

            <input type="checkbox" id="pass-type-drive" ${isDrive ? "checked" : ""}>

              

          </label>

        </div>

      </div>

    `;

  }



  bindPassTypeControls(form) {

    const parkingBox = form.querySelector("#pass-type-parking");

    const driveBox = form.querySelector("#pass-type-drive");

    const sync = (source, other) => {

      if (source.checked) {

        other.checked = false;

        other.disabled = true;

      } else {

        other.disabled = false;

      }

    };

    if (parkingBox && driveBox) {

      sync(parkingBox, driveBox);

      sync(driveBox, parkingBox);

      parkingBox.addEventListener("change", () => sync(parkingBox, driveBox));

      driveBox.addEventListener("change", () => sync(driveBox, parkingBox));

    }

  }



  getPassTypeValue(form) {

    const parkingBox = form.querySelector("#pass-type-parking");

    const driveBox = form.querySelector("#pass-type-drive");

    if (parkingBox?.checked) return "parking";

    if (driveBox?.checked) return "drive";

    return "";

  }



  openCreateModal() {

    const form = document.createElement("form");

    form.className = "section";

    form.innerHTML = `

      <div class="form-grid">

        <div class="md-field" style="grid-column:1/-1;">

          <label></label>

          <input class="md-input" name="gos_id" placeholder="A 888 AA 790 / O 632 CX 77 / 0013 AX 77" maxlength="12" required>

        </div>

        <div class="md-field">

          <label></label>

          <select class="md-select" name="id_mark_auto" required>

            <option value=""> </option>

            ${this.state.references?.marks?.map((m) => `<option value="${m.id_mark}">${m.mark_name}</option>`).join("")}

          </select>

        </div>

        <div class="md-field">

          <label></label>

          <select class="md-select" name="id_model_auto" required disabled>

            <option value="">  </option>

          </select>

        </div>

        <div class="md-field">

          <label></label>

          <select class="md-select" name="id_org" required>

            <option value=""> </option>

            ${this.state.references?.orgs?.map((o) => `<option value="${o.id_org}">${o.org_name}</option>`).join("")}

          </select>

        </div>

        <div class="md-field">

          <label></label>

          <select class="md-select" name="id_fio" required>

            <option value=""> </option>

            ${this.state.references?.abonents?.map((a) => `<option value="${a.id_fio}">${a.surname} ${a.name}${a.otchestvo ? " " + a.otchestvo : ""}</option>`).join("")}

          </select>

        </div>

        <div class="md-field">

          <label> </label>

          <input type="date" class="md-input" name="release_date" required>

        </div>

        <div class="md-field">

          <label> </label>

          <input type="date" class="md-input" name="valid_until" required>

        </div>

        <div class="md-field" style="grid-column:1/-1;">

          <label></label>

          <textarea class="md-textarea" name="info" placeholder=" ,  "></textarea>

        </div>

        ${this.renderPassTypeControls("")}

      </div>

      <div class="modal-footer">

        <button type="button" class="md-btn ghost" id="cancel-create">Отмена</button>

        <button class="md-btn" type="submit">Сохранить</button>

      </div>

    `;



    const instance = modal.show({ title: " ", content: form });

    const gosInput = form.querySelector('[name="gos_id"]');

    const modelSelect = form.querySelector('[name="id_model_auto"]');

    const orgSelect = form.querySelector('[name="id_org"]');

    const driverSelect = form.querySelector('[name="id_fio"]');

    this.fillDrivers(driverSelect, orgSelect?.value);

    this.bindPassTypeControls(form);

    gosInput?.addEventListener("input", () => {

      gosInput.value = gosInput.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");

    });

    gosInput?.addEventListener("blur", () => {

      gosInput.value = formatGosNumber(gosInput.value);

    });

    if (gosInput) gosInput.value = formatGosNumber(gosInput.value);

    form.addEventListener("change", async (e) => {

      if (e.target.name === "id_mark_auto") {

        if (!e.target.value) {

          this.state.references.models = [];

          modelSelect.innerHTML = `<option value="">  </option>`;

          modelSelect.disabled = true;

        } else {

          await this.fetchModels(e.target.value);

          this.fillModels(modelSelect);

        }

      }

      if (e.target.name === "id_org") {

        this.fillDrivers(driverSelect, e.target.value);

      }

    });



    form.querySelector("#cancel-create")?.addEventListener("click", () => instance.close());



    form.addEventListener("submit", async (e) => {

      e.preventDefault();

      const data = Object.fromEntries(new FormData(form).entries());

      try {

        data.gos_id = formatGosNumber(data.gos_id);

        requireValue(data.gos_id, " ");

        requireGosNumber(data.gos_id);

        requireDateOrder(data.release_date, data.valid_until);

        data.pass_type = this.getPassTypeValue(form);

        requireValue(data.pass_type, "  ");

        await apiPost(ENDPOINTS.propusks, data);

        toast.show(" ", "success");

        instance.close();

        await this.loadData();

        this.renderRows(document.querySelector("#propusk-rows"));

        this.renderPagination(document);

      } catch (err) {

        handleError(err);

      }

    });

  }



  async openEditModal(propusk) {

    if (!propusk) return;

    await this.ensureHistoryModels();

    const history = await this.loadHistory(propusk.id_propusk);

    const form = document.createElement("form");

    form.className = "section";

    form.innerHTML = `

      <div class="history-controls">

        <button class="md-btn ghost" type="button" id="toggle-history">История</button>

      </div>

      <div class="propusk-edit-grid history-collapsed">

        <div class="propusk-history">

          <div class="history-title"> </div>

          ${this.renderHistory(history)}

        </div>

        <div class="form-grid">

          <div class="md-field" style="grid-column:1/-1;">

            <label></label>

          <input class="md-input" name="gos_id" value="${propusk.gos_id || ""}" placeholder="A 888 AA 790 / O 632 CX 77 / 0013 AX 77" maxlength="12" required>

          </div>

          <div class="md-field">

            <label></label>

            <select class="md-select" name="id_mark_auto" required>

              <option value=""> </option>

              ${this.state.references?.marks?.map((m) => `<option value="${m.id_mark}" ${String(propusk.id_mark_auto) === String(m.id_mark) ? "selected" : ""}>${m.mark_name}</option>`).join("")}

            </select>

          </div>

          <div class="md-field">

            <label></label>

            <select class="md-select" name="id_model_auto" required disabled>

              <option value="">  </option>

            </select>

          </div>

          <div class="md-field">

            <label></label>

            <select class="md-select" name="id_org" required>

              <option value=""> </option>

              ${this.state.references?.orgs?.map((o) => `<option value="${o.id_org}" ${String(propusk.id_org) === String(o.id_org) ? "selected" : ""}>${o.org_name}</option>`).join("")}

            </select>

          </div>

          <div class="md-field">

            <label></label>

            <select class="md-select" name="id_fio" required>

              <option value=""> </option>

              ${this.state.references?.abonents?.map((a) => `<option value="${a.id_fio}" ${String(propusk.id_fio) === String(a.id_fio) ? "selected" : ""}>${a.surname} ${a.name}${a.otchestvo ? " " + a.otchestvo : ""}</option>`).join("")}

            </select>

          </div>

          <div class="md-field">

            <label> </label>

            <input type="date" class="md-input" name="release_date" value="${propusk.release_date || ""}" required>

          </div>

          <div class="md-field">

            <label> </label>

            <input type="date" class="md-input" name="valid_until" value="${propusk.valid_until || ""}" required>

          </div>

          <div class="md-field" style="grid-column:1/-1;">

            <label></label>

            <textarea class="md-textarea" name="info" placeholder=" ,  ">${propusk.info || ""}</textarea>

          </div>

          ${this.renderPassTypeControls(propusk.pass_type || "drive")}

        </div>

      </div>

      <div class="modal-footer">

        <button type="button" class="md-btn ghost" id="cancel-edit">Отмена</button>

        <button class="md-btn" type="submit">Сохранить</button>

      </div>

    `;



    const instance = modal.show({ title: `  #${propusk.id_propusk}`, content: form });

    const toggleBtn = form.querySelector("#toggle-history");

    const editGrid = form.querySelector(".propusk-edit-grid");

    toggleBtn?.addEventListener("click", () => {

      editGrid?.classList.toggle("history-collapsed");

      if (editGrid?.classList.contains("history-collapsed")) {

        toggleBtn.textContent = "";

      } else {

        toggleBtn.textContent = " ";

      }

    });

    const gosInput = form.querySelector('[name="gos_id"]');

    const modelSelect = form.querySelector('[name="id_model_auto"]');

    const orgSelect = form.querySelector('[name="id_org"]');

    const driverSelect = form.querySelector('[name="id_fio"]');



    gosInput?.addEventListener("input", () => {

      gosInput.value = gosInput.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");

    });

    gosInput?.addEventListener("blur", () => {

      gosInput.value = formatGosNumber(gosInput.value);

    });



    if (propusk.id_mark_auto) {

      await this.fetchModels(propusk.id_mark_auto);

      this.fillModels(modelSelect);

      if (modelSelect) modelSelect.value = String(propusk.id_model_auto || "");

    }

    this.fillDrivers(driverSelect, orgSelect?.value, propusk.id_fio);

    this.bindPassTypeControls(form);



    form.addEventListener("change", async (e) => {

      if (e.target.name === "id_mark_auto") {

        if (!e.target.value) {

          this.state.references.models = [];

          modelSelect.innerHTML = `<option value="">  </option>`;

          modelSelect.disabled = true;

        } else {

          await this.fetchModels(e.target.value);

          this.fillModels(modelSelect);

        }

      }

      if (e.target.name === "id_org") {

        this.fillDrivers(driverSelect, e.target.value);

      }

    });



    form.querySelector("#cancel-edit")?.addEventListener("click", () => instance.close());



    form.addEventListener("submit", async (e) => {

      e.preventDefault();

      const data = Object.fromEntries(new FormData(form).entries());

      try {

        data.gos_id = formatGosNumber(data.gos_id);

        requireValue(data.gos_id, " ");

        requireGosNumber(data.gos_id);

        requireDateOrder(data.release_date, data.valid_until);

        data.pass_type = this.getPassTypeValue(form);

        requireValue(data.pass_type, "  ");

        data.id_mark_auto = Number(data.id_mark_auto);

        data.id_model_auto = Number(data.id_model_auto);

        data.id_org = Number(data.id_org);

        data.id_fio = Number(data.id_fio);

        await apiPatch(`${ENDPOINTS.propusks}/${propusk.id_propusk}`, data);

        toast.show(" ", "success");

        instance.close();

        await this.loadData();

        this.renderRows(document.querySelector("#propusk-rows"));

        this.renderPagination(document);

      } catch (err) {

        handleError(err);

      }

    });

  }



  confirmArchive(id) {

    const content = document.createElement("div");

    content.className = "section";

    content.innerHTML = `

      <p>  #${id}?   ().</p>

      <div class="modal-footer">

        <button type="button" class="md-btn ghost" id="cancel-archive">Отмена</button>

        <button type="button" class="md-btn" id="confirm-archive">Удалить</button>

      </div>

    `;

    const instance = modal.show({ title: " ", content });

    content.querySelector("#cancel-archive")?.addEventListener("click", () => instance.close());

    content.querySelector("#confirm-archive")?.addEventListener("click", async () => {

      try {

        await apiDelete(`${ENDPOINTS.propusks}/${id}/archive`);

        toast.show(" ", "success");

        instance.close();

        await this.loadData();

        this.renderRows(document.querySelector("#propusk-rows"));

        this.renderPagination(document);

      } catch (err) {

        handleError(err);

      }

    });

  }



  async downloadPdf(id) {

    try {

      await openFileInNewTab(`${ENDPOINTS.propusks}/${id}/pdf`);

      toast.show("PDF ", "success");

    } catch (err) {

      handleError(err);

    }

  }

  renderCards(container, items) {

    if (!container) return;

    if (!items.length) {

      container.innerHTML = `<div class="empty">  </div>`;

      return;

    }

    container.innerHTML = items

      .map((p) => {

        const actions = `

          <div class="mobile-card-actions">

            ${canEditPropusks(this.context.state.user) && ["draft","active","pending_delete"].includes(p.status) ? `<button class="md-btn ghost" data-action="edit" data-id="${p.id_propusk}">Редактировать</button>` : ""}

            ${canActivatePropusks(this.context.state.user) && p.status === "draft" ? `<button class="md-btn tonal" data-action="activate" data-id="${p.id_propusk}">Активировать</button>` : ""}

            ${canMarkDelete(this.context.state.user) && p.status === "active" ? `<button class="md-btn ghost" data-action="mark-delete" data-id="${p.id_propusk}">На удаление</button>` : ""}

            ${canAnnulPropusks(this.context.state.user) && ["active","pending_delete"].includes(p.status) ? `<button class="md-btn ghost" data-action="revoke" data-id="${p.id_propusk}">Аннулировать</button>` : ""}

            ${canAnnulPropusks(this.context.state.user) && p.status === "revoked" ? `<button class="md-btn ghost" data-action="restore" data-id="${p.id_propusk}">Восстановить</button>` : ""}

            ${canDeletePropusks(this.context.state.user) ? `<button class="md-btn ghost" data-action="archive" data-id="${p.id_propusk}">Удалить</button>` : ""}

            ${canDownload(this.context.state.user) && p.status === "active" ? `<button class="md-btn secondary" data-action="pdf" data-id="${p.id_propusk}">PDF</button>` : ""}

          </div>

        `;

        return `

          <div class="mobile-card">

            <div class="mobile-card-header">

              <div>

                <div class="mobile-card-title">${p.gos_id}</div>

                <div class="mobile-card-subtitle">ID ${p.id_propusk}</div>

              </div>

              ${renderStatusChip(p.status)}

            </div>

            <div class="mobile-card-meta">

              <div class="mobile-card-row"><span></span><span>${p.org_name || ""}</span></div>

              <div class="mobile-card-row"><span></span><span>${p.abonent_fio || ""}</span></div>

              <div class="mobile-card-row"><span> </span><span>${p.valid_until || "-"}</span></div>

            </div>

            ${actions}

          </div>

        `;

      })

      .join("");

  }

}







