import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiPatch, apiDelete, handleError } from "../../api/client.js";
import { toast } from "../common/Toast.js";
import { canManageUsers } from "../../utils/permissions.js";
import { modal } from "../common/Modal.js";

const PERMISSIONS = [
  { key: "view", label: "Просмотр" },
  { key: "create", label: "Создание" },
  { key: "edit", label: "Редактирование пропуска" },
  { key: "menu_create_pass", label: "TG: Создание пропуска" },
  { key: "menu_edit_pass", label: "TG: Редактирование пропуска" },
  { key: "menu_history", label: "TG: История пропуска" },
  { key: "activate", label: "Активация" },
  { key: "delete", label: "Удаление" },
  { key: "annul", label: "Аннулирование" },
  { key: "mark_delete", label: "На удаление" },
  { key: "edit_organization", label: "Редактирование организации" },
  { key: "download_pdf", label: "Скачивание PDF" }
];

const MENU_PERMISSIONS = [
  { key: "menu_home", label: "Главная" },
  { key: "menu_propusks", label: "Пропуска" },
  { key: "menu_references", label: "Справочники" },
  { key: "menu_print", label: "В печать" },
  { key: "menu_reports", label: "Отчёты" },
  { key: "menu_users", label: "Пользователи" },
  { key: "menu_settings", label: "Настройки" }
];

function normalizePermissions(data) {
  const perms = {};
  PERMISSIONS.forEach((p) => { perms[p.key] = Boolean(data?.[p.key]); });
  MENU_PERMISSIONS.forEach((p) => { perms[p.key] = Boolean(data?.[p.key]); });
  return perms;
}

export class UsersPage {
  constructor(context) {
    this.context = context;
    this.state = { users: [] };
  }

  async load() {
    try {
      this.state.users = await apiGet(ENDPOINTS.users);
    } catch (err) {
      handleError(err);
    }
  }

  async render() {
    await this.load();
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card">
        <div class="md-toolbar">
          <div>
            <p class="tag">Команда</p>
            <h3 style="margin:0;">Пользователи</h3>
          </div>
          ${canManageUsers(this.context.state.user) ? `<button class="md-btn" id="add-user"><span class="material-icons-round">add</span>Добавить</button>` : ""}
        </div>
        <div class="md-divider"></div>
        <div class="table-scroll">
          <table class="md-table">
            <thead>
              <tr>
                <th>Логин</th>
                <th>Имя</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody id="user-rows">
              ${this.state.users.map((u) => this.row(u)).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (canManageUsers(this.context.state.user)) {
      node.querySelector("#add-user")?.addEventListener("click", () => this.openUserModal());
      node.querySelector("#user-rows")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const user = this.state.users.find((u) => String(u.id) === String(id));
        if (!user) return;
        if (btn.dataset.action === "edit") this.openUserModal(user);
        if (btn.dataset.action === "delete") this.confirmDelete(user);
      });
    }

    return node;
  }

  row(user) {
    return `
      <tr>
        <td>${user.username}</td>
        <td>${user.full_name}</td>
        <td><span class="md-chip info">${user.role}</span></td>
        <td>${user.is_active ? "<span class='md-chip success'>Активен</span>" : "<span class='md-chip error'>Отключен</span>"}</td>
        <td>
          <div class="inline-actions">
            <button class="md-btn ghost" data-action="edit" data-id="${user.id}">Редактировать</button>
            <button class="md-btn ghost" data-action="delete" data-id="${user.id}">Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }

  openUserModal(user) {
    const isEdit = Boolean(user);
    const permissions = normalizePermissions(user?.permissions);
    if (user?.role === "admin") {
      PERMISSIONS.forEach((p) => { permissions[p.key] = true; });
    }
    const form = document.createElement("form");
    form.className = "section";
    form.innerHTML = `
      <div class="form-grid">
        <div class="md-field">
          <label>Логин</label>
          <input class="md-input" name="username" value="${user?.username || ""}" ${isEdit ? "disabled" : ""} required>
        </div>
        <div class="md-field">
          <label>Пароль${isEdit ? " (не менять — оставьте пустым)" : ""}</label>
          <input class="md-input" name="password" type="password">
        </div>
        <div class="md-field">
          <label>ФИО</label>
          <input class="md-input" name="full_name" value="${user?.full_name || ""}" required>
        </div>
        <div class="md-field">
          <label>Роль</label>
          <select class="md-select" name="role" required>
            ${["viewer","admin","manager","guard"].map(r => `<option value="${r}" ${user?.role===r?"selected":""}>${r}</option>`).join("")}
          </select>
        </div>
        <div class="md-field">
          <label>Активен</label>
          <select class="md-select" name="is_active">
            <option value="true" ${user?.is_active !== false ? "selected":""}>Да</option>
            <option value="false" ${user?.is_active === false ? "selected":""}>Нет</option>
          </select>
        </div>
      </div>
      <div class="permissions-grid">
        ${PERMISSIONS.map((p) => `
          <label class="perm-chip">
            <input type="checkbox" name="perm_${p.key}" ${permissions[p.key] ? "checked" : ""}>
            <span>${p.label}</span>
          </label>
        `).join("")}
      </div>
      <div class="md-divider"></div>
      <div class="permissions-grid">
        ${MENU_PERMISSIONS.map((p) => `
          <label class="perm-chip">
            <input type="checkbox" name="perm_${p.key}" ${permissions[p.key] ? "checked" : ""}>
            <span>${p.label}</span>
          </label>
        `).join("")}
      </div>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-user">Отмена</button>
        <button class="md-btn" type="submit">${isEdit ? "Сохранить" : "Создать"}</button>
      </div>
    `;
    const instance = modal.show({ title: isEdit ? "Редактировать пользователя" : "Новый пользователь", content: form });

    form.querySelector("#cancel-user")?.addEventListener("click", () => instance.close());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const permissions = {};
      [...PERMISSIONS, ...MENU_PERMISSIONS].forEach((p) => {
        permissions[p.key] = Boolean(data[`perm_${p.key}`]);
      });
      if (data.role === "admin") {
        [...PERMISSIONS, ...MENU_PERMISSIONS].forEach((p) => { permissions[p.key] = true; });
      }
      try {
        if (isEdit) {
          const payload = {
            full_name: data.full_name,
            role: data.role,
            is_active: data.is_active === "true",
            permissions
          };
          if (data.password) payload.password = data.password;
          await apiPatch(`${ENDPOINTS.users}/${user.id}`, payload);
          toast.show("Пользователь обновлён", "success");
        } else {
          const payload = {
            username: data.username,
            password: data.password,
            full_name: data.full_name,
            role: data.role,
            permissions
          };
          await apiPost(ENDPOINTS.users, payload);
          toast.show("Пользователь создан", "success");
        }
        instance.close();
        await this.load();
        document.querySelector("#user-rows").innerHTML = this.state.users.map((u) => this.row(u)).join("");
      } catch (err) {
        handleError(err);
      }
    });
  }

  confirmDelete(user) {
    const content = document.createElement("div");
    content.className = "section";
    content.innerHTML = `
      <p>Удалить пользователя <strong>${user.username}</strong>?</p>
      <div class="modal-footer">
        <button type="button" class="md-btn ghost" id="cancel-del">Отмена</button>
        <button type="button" class="md-btn" id="confirm-del">Удалить</button>
      </div>
    `;
    const instance = modal.show({ title: "Удалить пользователя", content });
    content.querySelector("#cancel-del")?.addEventListener("click", () => instance.close());
    content.querySelector("#confirm-del")?.addEventListener("click", async () => {
      try {
        await apiDelete(`${ENDPOINTS.users}/${user.id}`);
        toast.show("Пользователь удалён", "success");
        instance.close();
        await this.load();
        document.querySelector("#user-rows").innerHTML = this.state.users.map((u) => this.row(u)).join("");
      } catch (err) {
        handleError(err);
      }
    });
  }
}
