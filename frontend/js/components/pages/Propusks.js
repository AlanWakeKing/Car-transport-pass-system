import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiPatch, apiDelete, handleError, downloadFile } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";
import { toast } from "../common/Toast.js";
import { canViewPropusks, canCreatePropusks, canEditPropusks, canActivatePropusks, canDeletePropusks, canAnnulPropusks, canMarkDelete, canDownload } from "../../utils/permissions.js";
import { requireDateOrder, requireValue } from "../../utils/validators.js";
import { modal } from "../common/Modal.js";

export class PropusksPage {
  constructor(context) {
    this.context = context;
    this.state = { propusks: [], filters: { search: "" }, references: null };
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
            <input class="md-input" id="filter-search" placeholder="Поиск по номеру или ФИО" value="${this.state.filters.search || ""}">
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
    node.querySelector("#apply-filters")?.addEventListener("click", async () => {
      const search = node.querySelector("#filter-search").value;
      const status = node.querySelector("#filter-status").value;
      this.state.filters = { search, status };
      await this.loadData();
      this.renderRows(node.querySelector("#propusk-rows"));
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
    select.innerHTML = `<option value="">Выберите модель</option>` + models.map((m) => `<option value="${m.id_model}">${m.model_name}</option>`).join("");
  }

  openCreateModal() {
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="form-grid">
        <div class="md-field">
          <label>Госномер</label>
          <input class="md-input" name="gos_id" placeholder="A123BC" required>
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
          <select class="md-select" name="id_model_auto" required></select>
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
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-create">Отмена</button>
        <button class="md-btn" type="submit">Создать пропуск</button>
      </div>
    `;

    const instance = modal.show({ title: "Новый пропуск", content: form });
    const modelSelect = form.querySelector('[name="id_model_auto"]');
    form.addEventListener("change", async (e) => {
      if (e.target.name === "id_mark_auto") {
        await this.fetchModels(e.target.value);
        this.fillModels(modelSelect);
      }
    });

    form.querySelector("#cancel-create")?.addEventListener("click", () => instance.close());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        requireValue(data.gos_id, "Введите госномер");
        requireDateOrder(data.release_date, data.valid_until);
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
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="form-grid">
        <div class="md-field">
          <label>Госномер</label>
          <input class="md-input" name="gos_id" value="${propusk.gos_id || ""}" required>
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
          <select class="md-select" name="id_model_auto" required></select>
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
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-edit">Отмена</button>
        <button class="md-btn" type="submit">Сохранить</button>
      </div>
    `;

    const instance = modal.show({ title: `Редактировать пропуск #${propusk.id_propusk}`, content: form });
    const modelSelect = form.querySelector('[name="id_model_auto"]');

    if (propusk.id_mark_auto) {
      await this.fetchModels(propusk.id_mark_auto);
      this.fillModels(modelSelect);
      if (modelSelect) modelSelect.value = String(propusk.id_model_auto || "");
    }

    form.addEventListener("change", async (e) => {
      if (e.target.name === "id_mark_auto") {
        await this.fetchModels(e.target.value);
        this.fillModels(modelSelect);
      }
    });

    form.querySelector("#cancel-edit")?.addEventListener("click", () => instance.close());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        requireValue(data.gos_id, "Введите госномер");
        requireDateOrder(data.release_date, data.valid_until);
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
      await downloadFile(`${ENDPOINTS.propusks}/${id}/pdf`, `propusk_${id}.pdf`);
      toast.show("PDF выгружен", "success");
    } catch (err) {
      handleError(err);
    }
  }
}
