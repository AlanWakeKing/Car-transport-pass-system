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
  { key: "free_mesto", label: "Свободные места" },
  { key: "report_date", label: "Дата отчета" }
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
  elements: []
};

export class SettingsPage {
  constructor(context) {
    this.context = context;
    this.scale = 4;
    this.state = {
      tab: "report",
      templates: {
        propusk: { ...DEFAULT_PROPUSK_TEMPLATE },
        report: { ...DEFAULT_REPORT_TEMPLATE }
      },
      versions: { propusk: [], report: [] },
      selected: { propusk: null, report: null },
      loaded: { propusk: false, report: false }
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
        const merged = { ...baseTemplate, ...active.data };
        if (isPropusk) {
          merged.meta = { ...DEFAULT_PROPUSK_TEMPLATE.meta, ...(active.data.meta || {}) };
        }
        this.state.templates[tab] = merged;
      }
      this.state.versions[tab] = versions || [];
      this.state.loaded[tab] = true;
    } catch (err) {
      handleError(err);
    }
  }

  getCurrentTemplate() {
    return this.state.templates[this.state.tab];
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
    if (!this.state.loaded[this.state.tab]) {
      await this.loadTab(this.state.tab);
    }
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">Настройки</p>
            <h3 style="margin:0;">Редактор шаблонов</h3>
          </div>
          <div class="inline-actions">
            <button class="md-btn ghost" id="reset-template">Сбросить</button>
            <button class="md-btn" id="save-template">Сохранить</button>
          </div>
        </div>
        <div class="tabs" id="settings-tabs">
          <button class="tab ${this.state.tab === "report" ? "active" : ""}" data-tab="report">Отчет по организациям</button>
          <button class="tab ${this.state.tab === "propusk" ? "active" : ""}" data-tab="propusk">Пропуска</button>
        </div>
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
        </div>
      </div>
    `;

    this.renderCanvas(node.querySelector("#template-canvas"));
    this.renderPanel(node.querySelector("#element-panel"));
    this.bind(node);
    return node;
  }

  renderCanvas(host) {
    if (!host) return;
    const template = this.getCurrentTemplate();
    const { width_mm, height_mm } = template.page;
    host.style.width = `${width_mm * this.scale}px`;
    host.style.height = `${height_mm * this.scale}px`;
    host.style.setProperty("--grid-size", `${template.grid_mm * this.scale}px`);
    host.innerHTML = "";

    template.elements.forEach((el) => {
      const item = document.createElement("div");
      item.className = `template-element ${el.type}`;
      item.dataset.id = el.id;
      item.style.left = `${el.x * this.scale}px`;
      item.style.top = `${el.y * this.scale}px`;
      item.style.width = `${el.width * this.scale}px`;
      item.style.height = `${el.height * this.scale}px`;
      if (el.type === "line") {
        item.style.height = `${Math.max(el.height * this.scale, 2)}px`;
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

  bind(node) {
    const canvas = node.querySelector("#template-canvas");
    const panel = node.querySelector("#element-panel");

    node.querySelector("#settings-tabs")?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab === this.state.tab) return;
      this.state.tab = tab;
      if (!this.state.loaded[tab]) {
        await this.loadTab(tab);
      }
      const replacement = await this.render();
      node.replaceWith(replacement);
    });

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
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = el.x;
      const startTop = el.y;
      const move = (evt) => {
        const dx = (evt.clientX - startX) / this.scale;
        const dy = (evt.clientY - startY) / this.scale;
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
        const merged = { ...base, ...template.data };
        if (this.state.tab === "propusk") {
          merged.meta = { ...DEFAULT_PROPUSK_TEMPLATE.meta, ...(template.data.meta || {}) };
        }
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
