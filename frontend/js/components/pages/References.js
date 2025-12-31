import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiPatch, apiDelete, handleError } from "../../api/client.js";
import { toast } from "../common/Toast.js";
import { canManagePropusks } from "../../utils/permissions.js";
import { modal } from "../common/Modal.js";

export class ReferencesPage {
  constructor(context) {
    this.context = context;
    this.state = { orgs: [], marks: [], models: [], abonents: [] };
    this.host = null;
  }

  async load() {
    try {
      const [orgs, marks, models, abonents] = await Promise.all([
        apiGet(ENDPOINTS.references.organizations),
        apiGet(ENDPOINTS.references.marks),
        apiGet(ENDPOINTS.references.models),
        apiGet(ENDPOINTS.references.abonents)
      ]);
      this.state = { orgs, marks, models, abonents };
    } catch (err) {
      handleError(err);
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
            <h3 style="margin:0;">Табличный режим</h3>
          </div>
        </div>
        <div class="tabs" id="ref-tabs">
          <button class="tab active" data-tab="orgs">Организации</button>
          <button class="tab" data-tab="marks">Марки</button>
          <button class="tab" data-tab="models">Модели</button>
        </div>
        <div class="tab-panels">
          <div class="tab-panel active" data-tab="orgs">
            <div class="md-toolbar">
              <h4 style="margin:0;">Организации</h4>
              ${canManagePropusks(this.context.state.user) ? `<button class="md-btn" data-add="org"><span class="material-icons-round">add</span>Добавить</button>` : ""}
            </div>
            <div class="table-scroll">
              <table class="md-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Свободных мест</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody id="org-tbody"></tbody>
              </table>
            </div>
          </div>
          <div class="tab-panel" data-tab="marks">
            <div class="md-toolbar">
              <h4 style="margin:0;">Марки</h4>
              ${canManagePropusks(this.context.state.user) ? `<button class="md-btn" data-add="mark"><span class="material-icons-round">add</span>Добавить</button>` : ""}
            </div>
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
          <div class="tab-panel" data-tab="models">
            <div class="md-toolbar">
              <h4 style="margin:0;">Модели</h4>
              ${canManagePropusks(this.context.state.user) ? `<button class="md-btn" data-add="model"><span class="material-icons-round">add</span>Добавить</button>` : ""}
            </div>
            <div class="table-scroll">
              <table class="md-table">
                <thead>
                  <tr>
                    <th>Модель</th>
                    <th>Марка</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody id="model-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderTables();

    const tabs = node.querySelector("#ref-tabs");
    tabs?.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      node.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === tab));
    });

    if (canManagePropusks(this.context.state.user)) {
      node.querySelector("[data-add='org']")?.addEventListener("click", () => this.openOrgModal());
      node.querySelector("[data-add='mark']")?.addEventListener("click", () => this.openMarkModal());
      node.querySelector("[data-add='model']")?.addEventListener("click", () => this.openModelModal());

      node.querySelector("#org-tbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const org = this.state.orgs.find((o) => String(o.id_org) === String(btn.dataset.id));
        if (!org) return;
        if (btn.dataset.action === "edit") this.openOrgModal(org);
        if (btn.dataset.action === "delete") this.confirmOrgDelete(org);
      });

      node.querySelector("#mark-tbody")?.addEventListener("click", (e) => {
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
    }

    return node;
  }

  renderTables() {
    if (!this.host) return;
    const orgTbody = this.host.querySelector("#org-tbody");
    const markTbody = this.host.querySelector("#mark-tbody");
    const modelTbody = this.host.querySelector("#model-tbody");

    if (orgTbody) {
      orgTbody.innerHTML = this.state.orgs.length
        ? this.state.orgs.map((o) => this.orgRow(o)).join("")
        : `<tr><td colspan="4"><div class="empty">Нет организаций</div></td></tr>`;
    }

    if (markTbody) {
      markTbody.innerHTML = this.state.marks.length
        ? this.state.marks.map((m) => this.markRow(m)).join("")
        : `<tr><td colspan="3"><div class="empty">Нет марок</div></td></tr>`;
    }

    if (modelTbody) {
      modelTbody.innerHTML = this.state.models.length
        ? this.state.models.map((m) => this.modelRow(m)).join("")
        : `<tr><td colspan="4"><div class="empty">Нет моделей</div></td></tr>`;
    }
  }

  orgRow(org) {
    return `
      <tr>
        <td>${org.org_name}</td>
        <td>${org.free_mesto ?? 0}</td>
        <td>${org.id_org}</td>
        <td>
          ${canManagePropusks(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${org.id_org}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${org.id_org}">Удалить</button>
          </div>` : "—"}
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
          ${canManagePropusks(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${mark.id_mark}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${mark.id_mark}">Удалить</button>
          </div>` : "—"}
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
          ${canManagePropusks(this.context.state.user) ? `
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${model.id_model}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${model.id_model}">Удалить</button>
          </div>` : "—"}
        </td>
      </tr>
    `;
  }

  openOrgModal(org) {
    const isEdit = Boolean(org);
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="md-field">
        <label>Название</label>
        <input class="md-input" name="org_name" value="${org?.org_name || ""}" required>
      </div>
      <div class="md-field">
        <label>Свободных мест</label>
        <input class="md-input" name="free_mesto" type="number" value="${org?.free_mesto ?? 0}">
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-org">Отмена</button>
        <button class="md-btn" type="submit">${isEdit ? "Сохранить" : "Добавить"}</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактировать организацию" : "Новая организация", content: form });
    form.querySelector("#cancel-org")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.free_mesto) data.free_mesto = Number(data.free_mesto);
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.organizations}/${org.id_org}`, data);
          toast.show("Организация обновлена", "success");
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
    const instance = modal.show({ title: "Удалить организацию", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.organizations}/${org.id_org}`);
        toast.show("Организация удалена", "success");
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
        <button class="md-btn" type="submit">${isEdit ? "Сохранить" : "Добавить"}</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактировать марку" : "Новая марка", content: form });
    form.querySelector("#cancel-mark")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.marks}/${mark.id_mark}`, data);
          toast.show("Марка обновлена", "success");
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
    const instance = modal.show({ title: "Удалить марку", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.marks}/${mark.id_mark}`);
        toast.show("Марка удалена", "success");
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
        <button class="md-btn" type="submit">${isEdit ? "Сохранить" : "Добавить"}</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактировать модель" : "Новая модель", content: form });
    form.querySelector("#cancel-model")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.id_mark = Number(data.id_mark);
      try {
        if (isEdit) {
          await apiPatch(`${ENDPOINTS.references.models}/${model.id_model}`, { id_mark: data.id_mark, model_name: data.model_name });
          toast.show("Модель обновлена", "success");
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
    const instance = modal.show({ title: "Удалить модель", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.references.models}/${model.id_model}`);
        toast.show("Модель удалена", "success");
        instance.close();
        await this.load();
        this.renderTables();
      } catch (err) {
        handleError(err);
      }
    });
  }
}
