import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, handleError } from "../../api/client.js";
import { toast } from "../common/Toast.js";

const PROPUSK_FIELDS = [
  { key: "gos_id", label: "Гос. номер" },
  { key: "id_propusk", label: "Номер пропуска" },
  { key: "mark_name", label: "Марка" },
  { key: "model_name", label: "Модель" },
  { key: "org_name", label: "Организация" },
  { key: "abonent_fio", label: "ФИО абонента" },
  { key: "valid_until", label: "Действителен до" },
  { key: "release_date", label: "Дата выдачи" },
  { key: "year", label: "Год" }
];

const REPORT_FIELDS = [
  { key: "org_name", label: "Организация" },
  { key: "free_mesto", label: "Гостевые места" },
  { key: "report_date", label: "Дата отчета" },
  { key: "permanent_count", label: "Постоянные места" }
];

const DEFAULT_PROPUSK_TEMPLATE = {
  page: { width_mm: 100, height_mm: 90 },
  grid_mm: 2,
  meta: { year_mode: "release_date", year_value: "" },
  elements: []
};

const DEFAULT_REPORT_TEMPLATE = {
  page: { width_mm: 297, height_mm: 210 },
  grid_mm: 5,
  meta: {},
  elements: [
    {
      id: "r_header_bg",
      type: "rect",
      x: 5,
      y: 5,
      width: 287,
      height: 10,
      stroke: "#2f2f2f",
      stroke_width: 1,
      fill: "#e1e6ec"
    },
    {
      id: "r_header_text",
      type: "text",
      x: 7,
      y: 7,
      width: 90,
      height: 6,
      text: "Сведения о парковке",
      font_size: 10,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_owner_label",
      type: "text",
      x: 5,
      y: 18,
      width: 35,
      height: 6,
      text: "Владелец",
      font_size: 8,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_owner_value",
      type: "field",
      x: 40,
      y: 18,
      width: 252,
      height: 6,
      field: "org_name",
      font_size: 8,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_free_label",
      type: "text",
      x: 5,
      y: 25,
      width: 35,
      height: 6,
      text: "Гостевые места",
      font_size: 8,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_free_value",
      type: "field",
      x: 40,
      y: 25,
      width: 20,
      height: 6,
      field: "free_mesto",
      font_size: 8,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_perm_label",
      type: "text",
      x: 5,
      y: 32,
      width: 35,
      height: 6,
      text: "Постоянные места",
      font_size: 8,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_perm_value",
      type: "field",
      x: 40,
      y: 32,
      width: 20,
      height: 6,
      field: "permanent_count",
      font_size: 8,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_table_header_bg",
      type: "rect",
      x: 5,
      y: 40,
      width: 287,
      height: 8,
      stroke: "#2f2f2f",
      stroke_width: 1,
      fill: "#ededed"
    },
    {
      id: "r_table_body",
      type: "rect",
      x: 5,
      y: 48,
      width: 287,
      height: 120,
      stroke: "#2f2f2f",
      stroke_width: 1,
      fill: ""
    },
    {
      id: "r_th_num",
      type: "text",
      x: 7,
      y: 41,
      width: 20,
      height: 6,
      text: "№ Разрешения",
      font_size: 7,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_th_mark",
      type: "text",
      x: 30,
      y: 41,
      width: 25,
      height: 6,
      text: "Марка А/М",
      font_size: 7,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_th_gos",
      type: "text",
      x: 60,
      y: 41,
      width: 30,
      height: 6,
      text: "ГосНомер А/М",
      font_size: 7,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_th_fio",
      type: "text",
      x: 95,
      y: 41,
      width: 60,
      height: 6,
      text: "ФИО",
      font_size: 7,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_th_info",
      type: "text",
      x: 165,
      y: 41,
      width: 70,
      height: 6,
      text: "Информация",
      font_size: 7,
      align: "left",
      color: "#111827"
    },
    {
      id: "r_th_sign",
      type: "text",
      x: 245,
      y: 41,
      width: 40,
      height: 6,
      text: "Подпись",
      font_size: 7,
      align: "left",
      color: "#111827"
    }
  ]
};

export class SettingsPage {
  constructor(context) {
    this.context = context;
    this.scale = { propusk: 4, report: 2 };
    this.state = {
      tab: "report",
      templates: {
        propusk: { ...DEFAULT_PROPUSK_TEMPLATE },
        report: { ...DEFAULT_REPORT_TEMPLATE }
      },
      versions: { propusk: [], report: [] },
      selected: { propusk: null, report: null },
      loaded: { propusk: false, report: false },
      db: {
        loaded: false,
        values: {
          POSTGRES_DB: "",
          POSTGRES_USER: "",
          POSTGRES_PASSWORD: "",
          POSTGRES_HOST: "",
          POSTGRES_PORT: "",
          DATABASE_URL: ""
        }
      }
    };
  }

  async loadTab(tab) {
    const isPropusk = tab === "propusk";
    const activeEndpoint = isPropusk ? ENDPOINTS.settings.activeTemplate : ENDPOINTS.settings.reportActiveTemplate;
    const versionsEndpoint = isPropusk ? ENDPOINTS.settings.templateVersions : ENDPOINTS.settings.reportTemplateVersions;
    const baseTemplate = isPropusk ? DEFAULT_PROPUSK_TEMPLATE : DEFAULT_REPORT_TEMPLATE;

    try {
      const [active, versions] = await Promise.all([
        apiGet(activeEndpoint).catch(() => null),
        apiGet(versionsEndpoint).catch(() => [])
      ]);

      if (active?.data) {
        this.state.templates[tab] = this.normalizeTemplate(active.data, baseTemplate, isPropusk);
      }
      this.state.versions[tab] = versions || [];
      this.state.loaded[tab] = true;
    } catch (err) {
      handleError(err);
    }
  }

  async loadDbSettings() {
    try {
      const data = await apiGet(ENDPOINTS.settings.dbEnv);
      this.state.db.values = {
        POSTGRES_DB: data?.POSTGRES_DB ?? "",
        POSTGRES_USER: data?.POSTGRES_USER ?? "",
        POSTGRES_PASSWORD: data?.POSTGRES_PASSWORD ?? "",
        POSTGRES_HOST: data?.POSTGRES_HOST ?? "",
        POSTGRES_PORT: data?.POSTGRES_PORT ?? "",
        DATABASE_URL: data?.DATABASE_URL ?? ""
      };
      this.state.db.loaded = true;
    } catch (err) {
      handleError(err);
    }
  }

  getCurrentTemplate() {
    return this.state.templates[this.state.tab];
  }

  normalizeTemplate(data, baseTemplate, isPropusk) {
    const merged = { ...baseTemplate, ...data };
    if (isPropusk) {
      merged.meta = { ...DEFAULT_PROPUSK_TEMPLATE.meta, ...(data.meta || {}) };
    }
    const elements = Array.isArray(merged.elements)
      ? merged.elements.filter((el) => this.isValidElement(el))
      : [];
    const minElements = isPropusk ? 1 : 5;
    const usable = elements.length >= minElements ? elements : [];
    merged.elements = usable.length ? usable : baseTemplate.elements;
    if (!isPropusk) {
      const page = merged.page || {};
      if (!page.width_mm || !page.height_mm || page.width_mm < 200 || page.height_mm < 150) {
        merged.page = baseTemplate.page;
      }
    }
    return merged;
  }

  isValidElement(el) {
    if (!el || typeof el !== "object") return false;
    if (!el.type || !el.id) return false;
    const numeric = ["x", "y", "width", "height"];
    return numeric.every((key) => typeof el[key] === "number" && Number.isFinite(el[key]));
  }

  getScale() {
    return this.state.tab === "propusk" ? this.scale.propusk : this.scale.report;
  }

  setCurrentTemplate(data) {
    this.state.templates[this.state.tab] = data;
  }

  getCurrentSelected() {
    return this.state.selected[this.state.tab];
  }

  setCurrentSelected(value) {
    this.state.selected[this.state.tab] = value;
  }

  getFieldOptions() {
    return this.state.tab === "propusk" ? PROPUSK_FIELDS : REPORT_FIELDS;
  }

  getEndpoints() {
    if (this.state.tab === "propusk") {
      return {
        save: ENDPOINTS.settings.template,
        versions: ENDPOINTS.settings.templateVersions
      };
    }
    return {
      save: ENDPOINTS.settings.reportTemplate,
      versions: ENDPOINTS.settings.reportTemplateVersions
    };
  }

  async render() {
    const isDb = this.state.tab === "db";
    if (isDb) {
      if (!this.state.db.loaded) {
        await this.loadDbSettings();
      }
    } else if (!this.state.loaded[this.state.tab]) {
      await this.loadTab(this.state.tab);
    }
    const node = document.createElement("div");
    node.className = "section";
    const dbSection = isDb ? this.renderDbSection() : "";
    node.innerHTML = `
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">Настройки</p>
            <h3 style="margin:0;">${isDb ? "Подключение к базе данных" : "Редактор шаблонов"}</h3>
          </div>
          ${isDb ? "" : `
          <div class="inline-actions">
            <button class="md-btn ghost" id="reset-template">Сбросить</button>
            <button class="md-btn" id="save-template">Сохранить</button>
          </div>`}
        </div>
        <div class="tabs" id="settings-tabs">
          <button class="tab ${this.state.tab === "report" ? "active" : ""}" data-tab="report">Отчет по организациям</button>
          <button class="tab ${this.state.tab === "propusk" ? "active" : ""}" data-tab="propusk">Пропуска</button>
          <button class="tab ${this.state.tab === "db" ? "active" : ""}" data-tab="db">Подключение БД</button>
        </div>
        ${isDb ? dbSection : `
        <div class="template-layout">
          <div class="md-card template-editor">
            <div class="template-toolbar">
              <select class="md-select" id="field-select">
                ${this.getFieldOptions().map((f) => `<option value="${f.key}">${f.label}</option>`).join("")}
              </select>
              <button class="md-btn secondary" id="add-field">Поле</button>
              <button class="md-btn secondary" id="add-text">Текст</button>
              <button class="md-btn secondary" id="add-line">Линия</button>
              <button class="md-btn secondary" id="add-rect">Рамка</button>
              <label class="md-btn secondary file-btn">
                Логотип
                <input type="file" id="add-logo" accept="image/*" hidden>
              </label>
            </div>
            <div class="template-canvas" id="template-canvas"></div>
          </div>
          <div class="md-card template-panel">
            <h4 style="margin:0;">Параметры</h4>
            <div id="element-panel" class="section"></div>
            ${this.state.tab === "propusk" ? `
            <div class="md-divider"></div>
            <div class="section">
              <label class="tag" style="display:block;">Год</label>
              <select class="md-select" id="year-mode">
                <option value="release_date" ${this.getCurrentTemplate().meta?.year_mode === "release_date" ? "selected" : ""}>По дате выдачи</option>
                <option value="fixed" ${this.getCurrentTemplate().meta?.year_mode === "fixed" ? "selected" : ""}>Фиксированный</option>
              </select>
              <input class="md-input" id="year-value" placeholder="2025" value="${this.getCurrentTemplate().meta?.year_value || ""}">
            </div>` : ""}
            <div class="md-divider"></div>
            <div>
              <label class="tag" style="display:block;">Версии</label>
              <select class="md-select" id="template-version">
                ${this.state.versions[this.state.tab].map((v) => `<option value="${v.id}">Версия ${v.version}</option>`).join("")}
              </select>
              <button class="md-btn ghost" id="load-version" style="margin-top:0.5rem;">Загрузить</button>
            </div>
          </div>
        </div>`}
      </div>
    `;

    if (!isDb) {
      this.renderCanvas(node.querySelector("#template-canvas"));
      this.renderPanel(node.querySelector("#element-panel"));
    }
    this.bind(node);
    return node;
  }

  renderCanvas(host) {
    if (!host) return;
    const template = this.getCurrentTemplate();
    const scale = this.getScale();
    const { width_mm, height_mm } = template.page;
    host.style.width = `${width_mm * scale}px`;
    host.style.height = `${height_mm * scale}px`;
    host.style.setProperty("--grid-size", `${template.grid_mm * scale}px`);
    host.innerHTML = "";

    template.elements.forEach((el) => {
      const item = document.createElement("div");
      item.className = `template-element ${el.type}`;
      item.dataset.id = el.id;
      item.style.left = `${el.x * scale}px`;
      item.style.top = `${el.y * scale}px`;
      item.style.width = `${el.width * scale}px`;
      item.style.height = `${el.height * scale}px`;
      if (el.type === "line") {
        item.style.height = `${Math.max(el.height * scale, 2)}px`;
        item.style.background = el.stroke || "#111827";
      }
      if (el.type === "rect") {
        item.style.border = `1px solid ${el.stroke || "#111827"}`;
        item.style.background = el.fill || "transparent";
      }
      if (el.type === "text") {
        item.textContent = el.text || "Текст";
      }
      if (el.type === "field") {
        const fieldLabel = this.getFieldOptions().find((f) => f.key === el.field)?.label || el.field;
        item.textContent = `{${fieldLabel}}`;
      }
      if (el.type === "logo" && el.data_url) {
        item.style.backgroundImage = `url(${el.data_url})`;
        item.style.backgroundSize = "contain";
        item.style.backgroundRepeat = "no-repeat";
        item.style.backgroundPosition = "center";
      }
      if (this.getCurrentSelected() === el.id) {
        item.classList.add("selected");
      }
      host.appendChild(item);
    });
  }

  renderPanel(host) {
    if (!host) return;
    const template = this.getCurrentTemplate();
    const el = template.elements.find((item) => item.id === this.getCurrentSelected());
    if (!el) {
      host.innerHTML = `<div class="empty">Элемент шаблона не выбран</div>`;
      return;
    }
    host.innerHTML = `
      <div class="form-grid">
        <div class="md-field">
          <label>X (??)</label>
          <input class="md-input" data-field="x" type="number" value="${el.x}">
        </div>
        <div class="md-field">
          <label>Y (??)</label>
          <input class="md-input" data-field="y" type="number" value="${el.y}">
        </div>
        <div class="md-field">
          <label>Ширина (мм)</label>
          <input class="md-input" data-field="width" type="number" value="${el.width}">
        </div>
        <div class="md-field">
          <label>Высота (мм)</label>
          <input class="md-input" data-field="height" type="number" value="${el.height}">
        </div>
      </div>
      ${el.type === "field" ? `
      <div class="md-field">
        <label>Поле</label>
        <select class="md-select" data-field="field">
          ${this.getFieldOptions().map((f) => `<option value="${f.key}" ${f.key === el.field ? "selected" : ""}>${f.label}</option>`).join("")}
        </select>
      </div>` : ""}
      ${el.type === "text" ? `
      <div class="md-field">
        <label>Текст</label>
        <input class="md-input" data-field="text" value="${el.text || ""}">
      </div>` : ""}
      ${el.type === "text" || el.type === "field" ? `
      <div class="form-grid">
        <div class="md-field">
          <label>Размер шрифта</label>
          <input class="md-input" data-field="font_size" type="number" value="${el.font_size || 10}">
        </div>
        <div class="md-field">
          <label>Выравнивание</label>
          <select class="md-select" data-field="align">
            ${["left","center","right"].map((a) => `<option value="${a}" ${a === el.align ? "selected" : ""}>${a}</option>`).join("")}
          </select>
        </div>
        <div class="md-field">
          <label>Цвет</label>
          <input class="md-input" data-field="color" value="${el.color || "#111827"}">
        </div>
      </div>` : ""}
      ${el.type === "rect" || el.type === "line" ? `
      <div class="form-grid">
        <div class="md-field">
          <label>Цвет линии</label>
          <input class="md-input" data-field="stroke" value="${el.stroke || "#111827"}">
        </div>
        <div class="md-field">
          <label>Толщина</label>
          <input class="md-input" data-field="stroke_width" type="number" value="${el.stroke_width || 1}">
        </div>
        ${el.type === "rect" ? `
        <div class="md-field">
          <label>Заливка</label>
          <input class="md-input" data-field="fill" value="${el.fill || ""}">
        </div>` : ""}
      </div>` : ""}
      <button class="md-btn ghost" id="remove-element">Удалить элемент</button>
    `;
  }

  renderDbSection() {
    const values = this.state.db.values;
    return `
      <div class="section">
        <div style="color:var(--md-text-muted); margin-bottom:1rem;">
          После сохранения перезапустите приложение или контейнер.
        </div>
        <div class="form-grid">
          <div class="md-field">
            <label>POSTGRES_DB</label>
            <input class="md-input" id="db-postgres-db" value="${values.POSTGRES_DB || ""}">
          </div>
          <div class="md-field">
            <label>POSTGRES_USER</label>
            <input class="md-input" id="db-postgres-user" value="${values.POSTGRES_USER || ""}">
          </div>
          <div class="md-field">
            <label>POSTGRES_PASSWORD</label>
            <input class="md-input" id="db-postgres-password" type="password" value="${values.POSTGRES_PASSWORD || ""}">
          </div>
          <div class="md-field">
            <label>POSTGRES_HOST</label>
            <input class="md-input" id="db-postgres-host" value="${values.POSTGRES_HOST || ""}">
          </div>
          <div class="md-field">
            <label>POSTGRES_PORT</label>
            <input class="md-input" id="db-postgres-port" type="number" value="${values.POSTGRES_PORT || ""}">
          </div>
        </div>
        <div class="md-divider"></div>
        <div class="md-field">
          <label>DATABASE_URL (опционально)</label>
          <input class="md-input" id="db-database-url" value="${values.DATABASE_URL || ""}">
        </div>
        <div class="inline-actions" style="margin-top:1rem;">
          <button class="md-btn" id="save-db-env">Сохранить</button>
          <button class="md-btn ghost" id="reload-db-env">Обновить</button>
        </div>
      </div>
    `;
  }

  bind(node) {
    node.querySelector("#settings-tabs")?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab === this.state.tab) return;
      this.state.tab = tab;
      const replacement = await this.render();
      node.replaceWith(replacement);
    });

    if (this.state.tab === "db") {
      this.bindDb(node);
      return;
    }

    const canvas = node.querySelector("#template-canvas");
    const panel = node.querySelector("#element-panel");

    canvas.addEventListener("click", (e) => {
      const target = e.target.closest(".template-element");
      if (!target) return;
      this.setCurrentSelected(target.dataset.id);
      this.renderCanvas(canvas);
      this.renderPanel(panel);
    });

    canvas.addEventListener("pointerdown", (e) => {
      const target = e.target.closest(".template-element");
      if (!target) return;
      const id = target.dataset.id;
      const template = this.getCurrentTemplate();
      const el = template.elements.find((item) => item.id === id);
      if (!el) return;
      this.setCurrentSelected(id);
      const scale = this.getScale();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = el.x;
      const startTop = el.y;
      const move = (evt) => {
        const dx = (evt.clientX - startX) / scale;
        const dy = (evt.clientY - startY) / scale;
        const grid = template.grid_mm || 1;
        el.x = Math.max(0, Math.round((startLeft + dx) / grid) * grid);
        el.y = Math.max(0, Math.round((startTop + dy) / grid) * grid);
        this.renderCanvas(canvas);
        this.renderPanel(panel);
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    });

    panel.addEventListener("input", (e) => {
      const field = e.target.dataset.field;
      if (!field) return;
      const template = this.getCurrentTemplate();
      const el = template.elements.find((item) => item.id === this.getCurrentSelected());
      if (!el) return;
      const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      el[field] = value;
      this.renderCanvas(canvas);
    });

    panel.addEventListener("click", (e) => {
      if (e.target.id === "remove-element") {
        const template = this.getCurrentTemplate();
        template.elements = template.elements.filter((item) => item.id !== this.getCurrentSelected());
        this.setCurrentSelected(null);
        this.renderCanvas(canvas);
        this.renderPanel(panel);
      }
    });

    node.querySelector("#add-field")?.addEventListener("click", () => {
      const field = node.querySelector("#field-select").value;
      this.addElement({ type: "field", field });
      this.renderCanvas(canvas);
      this.renderPanel(panel);
    });

    node.querySelector("#add-text")?.addEventListener("click", () => {
      this.addElement({ type: "text", text: "Текст" });
      this.renderCanvas(canvas);
      this.renderPanel(panel);
    });

    node.querySelector("#add-line")?.addEventListener("click", () => {
      this.addElement({ type: "line", width: 30, height: 0 });
      this.renderCanvas(canvas);
      this.renderPanel(panel);
    });

    node.querySelector("#add-rect")?.addEventListener("click", () => {
      this.addElement({ type: "rect", width: 30, height: 10 });
      this.renderCanvas(canvas);
      this.renderPanel(panel);
    });

    node.querySelector("#add-logo")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.addElement({ type: "logo", data_url: reader.result, width: 20, height: 12 });
        this.renderCanvas(canvas);
        this.renderPanel(panel);
      };
      reader.readAsDataURL(file);
    });

    node.querySelector("#save-template")?.addEventListener("click", async () => {
      try {
        const { save } = this.getEndpoints();
        await apiPost(save, { data: this.getCurrentTemplate() });
        toast.show("Шаблон сохранен", "success");
      } catch (err) {
        handleError(err);
      }
    });

    node.querySelector("#reset-template")?.addEventListener("click", () => {
      if (this.state.tab === "propusk") {
        this.state.templates.propusk = { ...DEFAULT_PROPUSK_TEMPLATE, elements: [] };
      } else {
        this.state.templates.report = { ...DEFAULT_REPORT_TEMPLATE, elements: [] };
      }
      this.setCurrentSelected(null);
      this.renderCanvas(canvas);
      this.renderPanel(panel);
    });

    node.querySelector("#load-version")?.addEventListener("click", () => {
      const select = node.querySelector("#template-version");
      const id = Number(select?.value);
      const template = this.state.versions[this.state.tab].find((v) => v.id === id);
      if (template?.data) {
        const base = this.state.tab === "propusk" ? DEFAULT_PROPUSK_TEMPLATE : DEFAULT_REPORT_TEMPLATE;
        const merged = this.normalizeTemplate(template.data, base, this.state.tab === "propusk");
        this.setCurrentTemplate(merged);
        this.setCurrentSelected(null);
        this.renderCanvas(canvas);
        this.renderPanel(panel);
      }
    });

    node.querySelector("#year-mode")?.addEventListener("change", (e) => {
      if (this.state.tab !== "propusk") return;
      this.getCurrentTemplate().meta.year_mode = e.target.value;
    });

    node.querySelector("#year-value")?.addEventListener("input", (e) => {
      if (this.state.tab !== "propusk") return;
      this.getCurrentTemplate().meta.year_value = e.target.value;
    });
  }

  bindDb(node) {
    node.querySelector("#save-db-env")?.addEventListener("click", async () => {
      const payload = {
        POSTGRES_DB: node.querySelector("#db-postgres-db")?.value || "",
        POSTGRES_USER: node.querySelector("#db-postgres-user")?.value || "",
        POSTGRES_PASSWORD: node.querySelector("#db-postgres-password")?.value || "",
        POSTGRES_HOST: node.querySelector("#db-postgres-host")?.value || "",
        POSTGRES_PORT: node.querySelector("#db-postgres-port")?.value || "",
        DATABASE_URL: node.querySelector("#db-database-url")?.value || ""
      };
      try {
        await apiPost(ENDPOINTS.settings.dbEnv, payload);
        this.state.db.loaded = false;
        toast.show("Настройки сохранены. Перезапустите приложение.", "success");
      } catch (err) {
        handleError(err);
      }
    });

    node.querySelector("#reload-db-env")?.addEventListener("click", async () => {
      this.state.db.loaded = false;
      const replacement = await this.render();
      node.replaceWith(replacement);
    });
  }

  addElement(overrides) {
    const id = `el_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const base = {
      id,
      type: "field",
      x: 4,
      y: 4,
      width: 20,
      height: 6,
      font_size: 10,
      align: "left",
      color: "#111827",
      stroke: "#111827",
      stroke_width: 1
    };
    const template = this.getCurrentTemplate();
    template.elements.push({ ...base, ...overrides });
    this.setCurrentSelected(id);
  }
}
