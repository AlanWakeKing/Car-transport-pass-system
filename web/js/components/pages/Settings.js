import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, apiPost, apiPut, handleError } from "../../api/client.js";
import { toast } from "../common/Toast.js";

const PROPUSK_FIELDS = [
  { key: "gos_id", label: "Гос. номер" },
  { key: "id_propusk", label: "Номер пропуска" },
  { key: "mark_name", label: "Марка" },
  { key: "model_name", label: "Модель" },
  { key: "org_name", label: "Организация" },
  { key: "abonent_fio", label: "ФИО абонента" },
  { key: "pass_type", label: "Тип пропуска" },
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



const TEMP_PASS_FIELDS = [
  { key: "user_name", label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c" },
  { key: "org_name", label: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f" },
  { key: "gos_id", label: "\u0413\u043e\u0441\u043d\u043e\u043c\u0435\u0440" },
  { key: "phone", label: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d" },
  { key: "comment", label: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439" },
  { key: "entered_at", label: "\u0414\u0430\u0442\u0430 \u0437\u0430\u0435\u0437\u0434\u0430" },
  { key: "exited_at", label: "\u0414\u0430\u0442\u0430 \u0432\u044b\u0435\u0437\u0434\u0430" },
  { key: "created_at", label: "\u0412\u0440\u0435\u043c\u044f \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0438\u044f" }
];



const TEMP_REPORT_FIELDS = [
  { key: "report_date", label: "\u0414\u0430\u0442\u0430 \u043e\u0442\u0447\u0435\u0442\u0430" },
  { key: "creator_name", label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c (\u0441\u043e\u0437\u0434\u0430\u043b)" },
  { key: "entered_by_name", label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c (\u0437\u0430\u0435\u0437\u0434)" },
  { key: "exited_by_name", label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c (\u0432\u044b\u0435\u0437\u0434)" },
  { key: "gos_id", label: "\u0413\u043e\u0441\u043d\u043e\u043c\u0435\u0440" },
  { key: "org_name", label: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f" },
  { key: "entered_at", label: "\u0412\u0440\u0435\u043c\u044f \u0437\u0430\u0435\u0437\u0434\u0430" },
  { key: "exited_at", label: "\u0412\u0440\u0435\u043c\u044f \u0432\u044b\u0435\u0437\u0434\u0430" }
];

const DEFAULT_PROPUSK_TEMPLATE = {
  page: { width_mm: 100, height_mm: 90 },
  grid_mm: 2,
  meta: { year_mode: "release_date", year_value: "" },
  elements: []
};



const DEFAULT_TEMP_PASS_TEMPLATE = {
  page: { width_mm: 90, height_mm: 50 },
  grid_mm: 2,
  meta: {},
  elements: [
    { id: "t_title", type: "text", x: 4, y: 4, width: 60, height: 6, text: "\u0412\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0439 \u043f\u0440\u043e\u043f\u0443\u0441\u043a", font_size: 10, bold: true },
    { id: "t_user_label", type: "text", x: 4, y: 12, width: 18, height: 4, text: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c:", font_size: 7 },
    { id: "t_user", type: "field", x: 24, y: 12, width: 60, height: 4, field: "user_name", font_size: 7 },
    { id: "t_gos_label", type: "text", x: 4, y: 18, width: 18, height: 4, text: "\u0413\u043e\u0441\u043d\u043e\u043c\u0435\u0440:", font_size: 7 },
    { id: "t_gos", type: "field", x: 24, y: 18, width: 40, height: 4, field: "gos_id", font_size: 8, bold: true },
    { id: "t_phone_label", type: "text", x: 4, y: 24, width: 18, height: 4, text: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d:", font_size: 7 },
    { id: "t_phone", type: "field", x: 24, y: 24, width: 40, height: 4, field: "phone", font_size: 7 },
    { id: "t_comment_label", type: "text", x: 4, y: 30, width: 18, height: 4, text: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439:", font_size: 7 },
    { id: "t_comment", type: "field", x: 24, y: 30, width: 60, height: 4, field: "comment", font_size: 7 },
    { id: "t_enter_label", type: "text", x: 4, y: 36, width: 18, height: 4, text: "\u0417\u0430\u0435\u0437\u0434:", font_size: 7 },
    { id: "t_enter", type: "field", x: 24, y: 36, width: 30, height: 4, field: "entered_at", font_size: 7 },
    { id: "t_exit_label", type: "text", x: 4, y: 42, width: 18, height: 4, text: "\u0412\u044b\u0435\u0437\u0434:", font_size: 7 },
    { id: "t_exit", type: "field", x: 24, y: 42, width: 30, height: 4, field: "exited_at", font_size: 7 },
    { id: "t_created_label", type: "text", x: 4, y: 48, width: 18, height: 4, text: "\u0421\u043e\u0437\u0434\u0430\u043d:", font_size: 7 },
    { id: "t_created", type: "field", x: 24, y: 48, width: 30, height: 4, field: "created_at", font_size: 7 }
  ]
};



const DEFAULT_TEMP_REPORT_TEMPLATE = {
  page: { width_mm: 297, height_mm: 210 },
  grid_mm: 5,
  meta: {
    table_x_mm: 5,
    table_y_mm: 40,
    table_width_mm: 287,
    table_height_mm: 150,
    row_height_mm: 7
  },
  elements: [
    {
      id: "tr_header_text",
      type: "text",
      x: 6,
      y: 6,
      width: 120,
      height: 6,
      text: "\u041e\u0442\u0447\u0435\u0442 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0445 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u043e\u0432",
      font_size: 12,
      align: "left",
      color: "#111827"
    },
    {
      id: "tr_date_label",
      type: "text",
      x: 6,
      y: 14,
      width: 30,
      height: 5,
      text: "\u0414\u0430\u0442\u0430:",
      font_size: 8,
      align: "left"
    },
    {
      id: "tr_date_value",
      type: "field",
      x: 20,
      y: 14,
      width: 50,
      height: 5,
      field: "report_date",
      font_size: 8,
      align: "left"
    },
    {
      id: "tr_table_body",
      type: "rect",
      x: 5,
      y: 40,
      width: 287,
      height: 150,
      stroke: "#2f2f2f",
      stroke_width: 1,
      fill: ""
    },
    {
      id: "tr_th_id",
      type: "text",
      x: 6,
      y: 42,
      width: 10,
      height: 5,
      text: "ID",
      font_size: 7
    },
    {
      id: "tr_th_user_create",
      type: "text",
      x: 16,
      y: 42,
      width: 30,
      height: 5,
      text: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c (\u0441\u043e\u0437\u0434\u0430\u043b)",
      font_size: 7
    },
    {
      id: "tr_th_user_enter",
      type: "text",
      x: 46,
      y: 42,
      width: 30,
      height: 5,
      text: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c (\u0437\u0430\u0435\u0437\u0434)",
      font_size: 7
    },
    {
      id: "tr_th_user_exit",
      type: "text",
      x: 76,
      y: 42,
      width: 30,
      height: 5,
      text: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c (\u0432\u044b\u0435\u0437\u0434)",
      font_size: 7
    },
    {
      id: "tr_th_gos",
      type: "text",
      x: 106,
      y: 42,
      width: 28,
      height: 5,
      text: "\u0413\u043e\u0441\u043d\u043e\u043c\u0435\u0440",
      font_size: 7
    },
    {
      id: "tr_th_org",
      type: "text",
      x: 134,
      y: 42,
      width: 55,
      height: 5,
      text: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f",
      font_size: 7
    },
    {
      id: "tr_th_entered_at",
      type: "text",
      x: 189,
      y: 42,
      width: 52,
      height: 5,
      text: "\u0412\u0440\u0435\u043c\u044f \u0437\u0430\u0435\u0437\u0434\u0430",
      font_size: 7
    },
    {
      id: "tr_th_exited_at",
      type: "text",
      x: 241,
      y: 42,
      width: 52,
      height: 5,
      text: "\u0412\u0440\u0435\u043c\u044f \u0432\u044b\u0435\u0437\u0434\u0430",
      font_size: 7
    },
    {
      id: "tr_line_header_bottom",
      type: "rect",
      x: 5,
      y: 47,
      width: 287,
      height: 0.3,
      stroke: "#2f2f2f",
      stroke_width: 1,
      fill: ""
    },
    { "id": "tr_col_line_1", "type": "rect", "x": 15, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" },
    { "id": "tr_col_line_2", "type": "rect", "x": 45, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" },
    { "id": "tr_col_line_3", "type": "rect", "x": 75, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" },
    { "id": "tr_col_line_4", "type": "rect", "x": 105, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" },
    { "id": "tr_col_line_5", "type": "rect", "x": 133, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" },
    { "id": "tr_col_line_6", "type": "rect", "x": 188, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" },
    { "id": "tr_col_line_7", "type": "rect", "x": 240, "y": 40, "width": 0.3, "height": 150, "stroke": "#2f2f2f", "stroke_width": 1, "fill": "" }
  ]
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
    this.scale = { propusk: 4, report: 2, temp_pass: 4, temp_report: 2 };
    this.state = {
      tab: "report",
      api: { enabled: true, loaded: false },
      docs: { enabled: true, loaded: false },
      ui: { showPropuskPagination: Boolean(this.context.state.ui?.showPropuskPagination) },
      templates: {
        propusk: { ...DEFAULT_PROPUSK_TEMPLATE },
        report: { ...DEFAULT_REPORT_TEMPLATE },
        temp_pass: { ...DEFAULT_TEMP_PASS_TEMPLATE },
        temp_report: { ...DEFAULT_TEMP_REPORT_TEMPLATE }
      },
      versions: { propusk: [], report: [], temp_pass: [], temp_report: [] },
      selected: { propusk: null, report: null, temp_pass: null, temp_report: null },
      loaded: { propusk: false, report: false, temp_pass: false, temp_report: false }
    };
  }

  async loadTab(tab) {
    const isPropusk = tab === "propusk";
    const isTempPass = tab === "temp_pass";
    const isTempReport = tab === "temp_report";
    const activeEndpoint = isPropusk
      ? ENDPOINTS.settings.activeTemplate
      : isTempPass
        ? ENDPOINTS.settings.tempPassActiveTemplate
        : isTempReport
          ? ENDPOINTS.settings.tempPassReportActiveTemplate
          : ENDPOINTS.settings.reportActiveTemplate;
    const versionsEndpoint = isPropusk
      ? ENDPOINTS.settings.templateVersions
      : isTempPass
        ? ENDPOINTS.settings.tempPassTemplateVersions
        : isTempReport
          ? ENDPOINTS.settings.tempPassReportTemplateVersions
          : ENDPOINTS.settings.reportTemplateVersions;
    const baseTemplate = isPropusk
      ? DEFAULT_PROPUSK_TEMPLATE
      : isTempPass
        ? DEFAULT_TEMP_PASS_TEMPLATE
        : isTempReport
          ? DEFAULT_TEMP_REPORT_TEMPLATE
          : DEFAULT_REPORT_TEMPLATE;

    try {
      const [active, versions] = await Promise.all([
        apiGet(activeEndpoint).catch(() => null),
        apiGet(versionsEndpoint).catch(() => [])
      ]);

      if (active?.data) {
        this.state.templates[tab] = this.normalizeTemplate(active.data, baseTemplate, isPropusk, isPropusk || isTempPass);
      }
      this.state.versions[tab] = versions || [];
      this.state.loaded[tab] = true;
    } catch (err) {
      handleError(err);
    }
  }

  async loadApiState() {
    try {
      const data = await apiGet(ENDPOINTS.settings.apiEnabled);
      this.state.api.enabled = Boolean(data?.enabled);
    } catch (err) {
      handleError(err);
    } finally {
      this.state.api.loaded = true;
    }
  }

  async loadDocsState() {
    try {
      const data = await apiGet(ENDPOINTS.settings.docsEnabled);
      this.state.docs.enabled = Boolean(data?.enabled);
    } catch (err) {
      handleError(err);
    } finally {
      this.state.docs.loaded = true;
    }
  }

  getCurrentTemplate() {
    return this.state.templates[this.state.tab];
  }

  normalizeTemplate(data, baseTemplate, isPropusk, isSmallPass = false) {
    const merged = { ...baseTemplate, ...data };
    if (isPropusk) {
      merged.meta = { ...DEFAULT_PROPUSK_TEMPLATE.meta, ...(data.meta || {}) };
    }
    const elements = Array.isArray(merged.elements)
      ? merged.elements.filter((el) => this.isValidElement(el))
      : [];
    const minElements = isSmallPass ? 1 : 5;
    const usable = elements.length >= minElements ? elements : [];
    merged.elements = usable.length ? usable : baseTemplate.elements;
    if (!isSmallPass) {
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
    if (this.state.tab === "propusk") return this.scale.propusk;
    if (this.state.tab === "temp_pass") return this.scale.temp_pass;
    if (this.state.tab === "temp_report") return this.scale.temp_report;
    return this.scale.report;
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
    if (this.state.tab === "propusk") return PROPUSK_FIELDS;
    if (this.state.tab === "temp_pass") return TEMP_PASS_FIELDS;
    if (this.state.tab === "temp_report") return TEMP_REPORT_FIELDS;
    return REPORT_FIELDS;
  }

  getEndpoints() {
    if (this.state.tab === "propusk") {
      return {
        save: ENDPOINTS.settings.template,
        versions: ENDPOINTS.settings.templateVersions
      };
    }
    if (this.state.tab === "temp_pass") {
      return {
        save: ENDPOINTS.settings.tempPassTemplate,
        versions: ENDPOINTS.settings.tempPassTemplateVersions
      };
    }
    if (this.state.tab === "temp_report") {
      return {
        save: ENDPOINTS.settings.tempPassReportTemplate,
        versions: ENDPOINTS.settings.tempPassReportTemplateVersions
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
    if (!this.state.api.loaded) {
      await this.loadApiState();
    }
    if (!this.state.docs.loaded) {
      await this.loadDocsState();
    }
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">Настройки</p>
            <h3 style="margin:0;">Доступ к API</h3>
          </div>
          <div class="pill-switch" id="api-toggle">
            <button data-enabled="true" class="${this.state.api.enabled ? "active" : ""}">Вкл</button>
            <button data-enabled="false" class="${!this.state.api.enabled ? "active" : ""}">Выкл</button>
          </div>
        </div>
        <p class="hint">Отключение API блокирует все /api запросы, кроме входа и включения.</p>
      </div>
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446\u0438\u044f</p>
            <h3 style="margin:0;">\u0414\u043e\u0441\u0442\u0443\u043f \u043a /docs</h3>
          </div>
          <div class="pill-switch" id="docs-toggle">
            <button data-enabled="true" class="${this.state.docs.enabled ? "active" : ""}">\u0412\u043a\u043b</button>
            <button data-enabled="false" class="${!this.state.docs.enabled ? "active" : ""}">\u0412\u044b\u043a\u043b</button>
          </div>
        </div>
        <p class="hint">\u041e\u0442\u043a\u043b\u044e\u0447\u0430\u0435\u0442/\u0432\u043a\u043b\u044e\u0447\u0430\u0435\u0442 \u0440\u0430\u0437\u0434\u0435\u043b Swagger/Redoc \u0432 OpenAPI \u043f\u0440\u043e\u0435\u043a\u0442\u0435.</p>
      </div>
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">Интерфейс</p>
            <h3 style="margin:0;">Пагинация в пропусках</h3>
          </div>
          <div class="pill-switch" id="propusk-pagination-toggle">
            <button data-enabled="true" class="${this.state.ui.showPropuskPagination ? "active" : ""}">Да</button>
            <button data-enabled="false" class="${!this.state.ui.showPropuskPagination ? "active" : ""}">Нет</button>
          </div>
        </div>
        <p class="hint">Показывает блок пагинации в разделе "Пропуска".</p>
      </div>
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
          <button class="tab ${this.state.tab === "temp_pass" ? "active" : ""}" data-tab="temp_pass">\u0412\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0439 \u043f\u0440\u043e\u043f\u0443\u0441\u043a</button>
          <button class="tab ${this.state.tab === "temp_report" ? "active" : ""}" data-tab="temp_report">\u041e\u0442\u0447\u0435\u0442 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0445</button>
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
          <label>X (мм)</label>
          <input class="md-input" data-field="x" type="number" value="${el.x}">
        </div>
        <div class="md-field">
          <label>Y (мм)</label>
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
    node.querySelector("#settings-tabs")?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab === this.state.tab) return;
      this.state.tab = tab;
      const replacement = await this.render();
      node.replaceWith(replacement);
    });

    node.querySelector("#api-toggle")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const enabled = btn.dataset.enabled === "true";
      if (enabled === this.state.api.enabled) return;
      try {
        await apiPut(ENDPOINTS.settings.apiEnabled, { enabled });
        this.state.api.enabled = enabled;
        const replacement = await this.render();
        node.replaceWith(replacement);
      } catch (err) {
        handleError(err);
      }
    });

    node.querySelector("#docs-toggle")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const enabled = btn.dataset.enabled === "true";
      if (enabled === this.state.docs.enabled) return;
      try {
        await apiPut(ENDPOINTS.settings.docsEnabled, { enabled });
        this.state.docs.enabled = enabled;
        const replacement = await this.render();
        node.replaceWith(replacement);
      } catch (err) {
        handleError(err);
      }
    });

    node.querySelector("#propusk-pagination-toggle")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const enabled = btn.dataset.enabled === "true";
      if (enabled === this.state.ui.showPropuskPagination) return;
      this.state.ui.showPropuskPagination = enabled;
      this.context.setPropuskPaginationVisibility(enabled);
      const replacement = await this.render();
      node.replaceWith(replacement);
    });

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
      } else if (this.state.tab === "temp_pass") {
        this.state.templates.temp_pass = { ...DEFAULT_TEMP_PASS_TEMPLATE, elements: [] };
      } else if (this.state.tab === "temp_report") {
        this.state.templates.temp_report = { ...DEFAULT_TEMP_REPORT_TEMPLATE, elements: [] };
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
        const base = this.state.tab === "propusk"
          ? DEFAULT_PROPUSK_TEMPLATE
          : this.state.tab === "temp_pass"
            ? DEFAULT_TEMP_PASS_TEMPLATE
            : this.state.tab === "temp_report"
              ? DEFAULT_TEMP_REPORT_TEMPLATE
              : DEFAULT_REPORT_TEMPLATE;
        const merged = this.normalizeTemplate(
          template.data,
          base,
          this.state.tab === "propusk",
          this.state.tab === "propusk" || this.state.tab === "temp_pass"
        );
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
