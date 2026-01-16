import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiPatch, apiDelete, handleError, openFileInNewTab } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";
import { toast } from "../common/Toast.js";
import { canViewPropusks, canCreatePropusks, canEditPropusks, canActivatePropusks, canDeletePropusks, canAnnulPropusks, canMarkDelete, canDownload } from "../../utils/permissions.js";
import { requireDateOrder, requireValue, formatGosNumber, requireGosNumber } from "../../utils/validators.js";
import { modal } from "../common/Modal.js";

export class PropusksPage {
  constructor(context) {
    this.context = context;
    this.state = { propusks: [], filters: { search: "" }, references: null };
    this.searchTimer = null;
  }

  async loadData() {
    const { filters } = this.state;
    try {
      const params = { limit: 50 };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      const propusks = await apiGet(ENDPOINTS.propusks, params);
      this.state.propusks = propusks;
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
      created: "Создан",
      edited: "Изменён",
      activated: "Активирован",
      marked_delete: "На удаление",
      revoked: "Аннулирован",
      archived: "Архивирован"
    };
    return map[action] || action;
  }

  formatHistoryStatus(status) {
    const map = {
      draft: "Черновик",
      active: "Активен",
      pending_delete: "На удаление",
      revoked: "Аннулирован"
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
      ["gos_id", "Госномер"],
      ["id_mark_auto", "Марка"],
      ["id_model_auto", "Модель"],
      ["id_org", "Организация"],
      ["id_fio", "Водитель"],
      ["status", "Статус"]
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
        `${label}: ${this.resolveHistoryValue(field, oldValue)} → ${this.resolveHistoryValue(field, newValue)}`
      );
    });
    return changes;
  }

  renderHistory(history) {
    if (!history.length) {
      return `<div class="empty">История пуста</div>`;
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
    const nextStatus = this.context.state.ui?.propuskFilters?.status || "";
    if (nextStatus) {
      this.state.filters.status = nextStatus;
      this.context.setPropuskFilters({ status: "" });
    }
    await this.loadReferences();
    await this.loadData();
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card">
        <div class="toolbar">
          <div>
            <p class="tag">Пропуска</p>
            <h3 style="margin:0;">Реестр обращений</h3>
          </div>
          <div class="filters">
            <input class="md-input" id="filter-search" placeholder="Поиск по номеру, ФИО или организации" value="${this.state.filters.search || ""}">
            <select class="md-select" id="filter-status" value="${this.state.filters.status || ""}">
              <option value="">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="pending_delete">На удаление</option>
              <option value="revoked">Аннулирован</option>
            </select>
            <button class="md-btn secondary" id="apply-filters">
              <span class="material-icons-round">search</span>Фильтр
            </button>
            ${canCreatePropusks(this.context.state.user) ? `
            <button class="md-btn" id="new-propusk">
              <span class="material-icons-round">add_circle</span>Новый пропуск
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
                <th>Водитель</th>
                <th>Действует до</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody id="propusk-rows"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderRows(node.querySelector("#propusk-rows"));
    this.bind(node);
    const statusSelect = node.querySelector("#filter-status");
    if (statusSelect) {
      statusSelect.value = this.state.filters.status || "";
    }
    return node;
  }

  renderRows(tbody) {
    if (!this.state.propusks.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Пропуска не найдены</div></td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.propusks
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
  }

  bind(node) {
    const applyFilters = async () => {
      const search = node.querySelector("#filter-search").value;
      const status = node.querySelector("#filter-status").value;
      this.state.filters = { search, status };
      await this.loadData();
      this.renderRows(node.querySelector("#propusk-rows"));
    };

    node.querySelector("#apply-filters")?.addEventListener("click", async () => {
      await applyFilters();
    });

    node.querySelector("#filter-search")?.addEventListener("input", () => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(async () => {
        await applyFilters();
      }, 350);
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
            toast.show("Пропуск активирован", "success");
            break;
          case "edit":
            this.openEditModal(this.state.propusks.find((p) => String(p.id_propusk) === String(id)));
            return;
          case "mark-delete":
            await apiPost(`${ENDPOINTS.propusks}/${id}/mark-delete`, {});
            toast.show("Отмечен на удаление", "info");
            break;
          case "revoke":
            await apiPost(`${ENDPOINTS.propusks}/${id}/revoke`, {});
            toast.show("Пропуск аннулирован", "warning");
            break;
          case "restore":
            await apiPost(`${ENDPOINTS.propusks}/${id}/restore`, {});
            toast.show("Пропуск восстановлен", "success");
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
      } catch (err) {
        handleError(err);
      }
    });

    node.querySelector("#new-propusk")?.addEventListener("click", () => {
      this.openCreateModal();
    });
  }

  fillModels(select) {
    if (!select) return;
    const models = this.state.references?.models || [];
    if (!models.length) {
      select.innerHTML = `<option value="">Сначала выберите марку</option>`;
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = `<option value="">Выберите модель</option>` + models.map((m) => `<option value="${m.id_model}">${m.model_name}</option>`).join("");
  }

  fillDrivers(select, orgId, selectedId = "") {
    if (!select) return;
    if (!orgId) {
      select.innerHTML = `<option value="">Сначала выберите организацию</option>`;
      select.disabled = true;
      return;
    }
    const drivers = (this.state.references?.abonents || []).filter(
      (a) => String(a.id_org) === String(orgId)
    );
    select.disabled = false;
    select.innerHTML = `<option value="">Выберите водителя</option>` + drivers
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
        <label>Тип пропуска</label>
        <div class="pass-type-controls">
          <label class="pass-type-option">
            <input type="checkbox" id="pass-type-parking" ${isParking ? "checked" : ""}>
            На стоянку
          </label>
          <label class="pass-type-option">
            <input type="checkbox" id="pass-type-drive" ${isDrive ? "checked" : ""}>
            Проезд по территории
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
          <label>Госномер</label>
          <input class="md-input" name="gos_id" placeholder="A 888 AA 790" maxlength="11" pattern="[A-Za-z]{1}\\s?[0-9]{3}\\s?[A-Za-z]{2}\\s?[0-9]{3}" title="Формат: A 888 AA 790 (только латиница)" required>
        </div>
        <div class="md-field">
          <label>Марка</label>
          <select class="md-select" name="id_mark_auto" required>
            <option value="">Выберите марку</option>
            ${this.state.references?.marks?.map((m) => `<option value="${m.id_mark}">${m.mark_name}</option>`).join("")}
          </select>
        </div>
        <div class="md-field">
          <label>Модель</label>
          <select class="md-select" name="id_model_auto" required disabled>
            <option value="">Сначала выберите марку</option>
          </select>
        </div>
        <div class="md-field">
          <label>Компания</label>
          <select class="md-select" name="id_org" required>
            <option value="">Выберите организацию</option>
            ${this.state.references?.orgs?.map((o) => `<option value="${o.id_org}">${o.org_name}</option>`).join("")}
          </select>
        </div>
        <div class="md-field">
          <label>Водитель</label>
          <select class="md-select" name="id_fio" required>
            <option value="">Выберите водителя</option>
            ${this.state.references?.abonents?.map((a) => `<option value="${a.id_fio}">${a.surname} ${a.name}${a.otchestvo ? " " + a.otchestvo : ""}</option>`).join("")}
          </select>
        </div>
        <div class="md-field">
          <label>Дата выдачи</label>
          <input type="date" class="md-input" name="release_date" required>
        </div>
        <div class="md-field">
          <label>Действует до</label>
          <input type="date" class="md-input" name="valid_until" required>
        </div>
        <div class="md-field" style="grid-column:1/-1;">
          <label>Комментарий</label>
          <textarea class="md-textarea" name="info" placeholder="Описание условий, номер заявки"></textarea>
        </div>
        ${this.renderPassTypeControls("")}
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-create">Отмена</button>
        <button class="md-btn" type="submit">Создать пропуск</button>
      </div>
    `;

    const instance = modal.show({ title: "Новый пропуск", content: form });
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
          modelSelect.innerHTML = `<option value="">Сначала выберите марку</option>`;
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
        requireValue(data.gos_id, "Введите госномер");
        requireGosNumber(data.gos_id);
        requireDateOrder(data.release_date, data.valid_until);
        data.pass_type = this.getPassTypeValue(form);
        requireValue(data.pass_type, "Выберите тип пропуска");
        await apiPost(ENDPOINTS.propusks, data);
        toast.show("Пропуск создан", "success");
        instance.close();
        await this.loadData();
        this.renderRows(document.querySelector("#propusk-rows"));
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
          <div class="history-title">История редактирования</div>
          ${this.renderHistory(history)}
        </div>
        <div class="form-grid">
          <div class="md-field" style="grid-column:1/-1;">
            <label>Госномер</label>
            <input class="md-input" name="gos_id" value="${propusk.gos_id || ""}" placeholder="A 888 AA 790" maxlength="11" pattern="[A-Za-z]{1}\\s?[0-9]{3}\\s?[A-Za-z]{2}\\s?[0-9]{3}" title="Формат: A 888 AA 790 (только латиница)" required>
          </div>
          <div class="md-field">
            <label>Марка</label>
            <select class="md-select" name="id_mark_auto" required>
              <option value="">Выберите марку</option>
              ${this.state.references?.marks?.map((m) => `<option value="${m.id_mark}" ${String(propusk.id_mark_auto) === String(m.id_mark) ? "selected" : ""}>${m.mark_name}</option>`).join("")}
            </select>
          </div>
          <div class="md-field">
            <label>Модель</label>
            <select class="md-select" name="id_model_auto" required disabled>
              <option value="">Сначала выберите марку</option>
            </select>
          </div>
          <div class="md-field">
            <label>Компания</label>
            <select class="md-select" name="id_org" required>
              <option value="">Выберите организацию</option>
              ${this.state.references?.orgs?.map((o) => `<option value="${o.id_org}" ${String(propusk.id_org) === String(o.id_org) ? "selected" : ""}>${o.org_name}</option>`).join("")}
            </select>
          </div>
          <div class="md-field">
            <label>Водитель</label>
            <select class="md-select" name="id_fio" required>
              <option value="">Выберите водителя</option>
              ${this.state.references?.abonents?.map((a) => `<option value="${a.id_fio}" ${String(propusk.id_fio) === String(a.id_fio) ? "selected" : ""}>${a.surname} ${a.name}${a.otchestvo ? " " + a.otchestvo : ""}</option>`).join("")}
            </select>
          </div>
          <div class="md-field">
            <label>Дата выдачи</label>
            <input type="date" class="md-input" name="release_date" value="${propusk.release_date || ""}" required>
          </div>
          <div class="md-field">
            <label>Действует до</label>
            <input type="date" class="md-input" name="valid_until" value="${propusk.valid_until || ""}" required>
          </div>
          <div class="md-field" style="grid-column:1/-1;">
            <label>Комментарий</label>
            <textarea class="md-textarea" name="info" placeholder="Описание условий, номер заявки">${propusk.info || ""}</textarea>
          </div>
          ${this.renderPassTypeControls(propusk.pass_type || "drive")}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-edit">Отмена</button>
        <button class="md-btn" type="submit">Сохранить</button>
      </div>
    `;

    const instance = modal.show({ title: `Редактировать пропуск #${propusk.id_propusk}`, content: form });
    const toggleBtn = form.querySelector("#toggle-history");
    const editGrid = form.querySelector(".propusk-edit-grid");
    toggleBtn?.addEventListener("click", () => {
      editGrid?.classList.toggle("history-collapsed");
      if (editGrid?.classList.contains("history-collapsed")) {
        toggleBtn.textContent = "История";
      } else {
        toggleBtn.textContent = "Скрыть историю";
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
          modelSelect.innerHTML = `<option value="">Сначала выберите марку</option>`;
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
        requireValue(data.gos_id, "Введите госномер");
        requireGosNumber(data.gos_id);
        requireDateOrder(data.release_date, data.valid_until);
        data.pass_type = this.getPassTypeValue(form);
        requireValue(data.pass_type, "Выберите тип пропуска");
        data.id_mark_auto = Number(data.id_mark_auto);
        data.id_model_auto = Number(data.id_model_auto);
        data.id_org = Number(data.id_org);
        data.id_fio = Number(data.id_fio);
        await apiPatch(`${ENDPOINTS.propusks}/${propusk.id_propusk}`, data);
        toast.show("Пропуск обновлён", "success");
        instance.close();
        await this.loadData();
        this.renderRows(document.querySelector("#propusk-rows"));
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmArchive(id) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить пропуск #${id}? Операция безвозвратна (архивация).</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-archive">Отмена</button>
        <button type="button" class="md-btn" id="confirm-archive">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удалить пропуск", content });
    content.querySelector("#cancel-archive")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-archive")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.propusks}/${id}/archive`);
        toast.show("Пропуск удалён", "success");
        instance.close();
        await this.loadData();
        this.renderRows(document.querySelector("#propusk-rows"));
      } catch (err) {
        handleError(err);
      }
    });
  }

  async downloadPdf(id) {
    try {
      await openFileInNewTab(`${ENDPOINTS.propusks}/${id}/pdf`);
      toast.show("PDF открыт", "success");
    } catch (err) {
      handleError(err);
    }
  }
}
