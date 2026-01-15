import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, openFileInNewTab } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";
import { toast } from "../common/Toast.js";

export class ReportsPage {
  constructor(context) {
    this.context = context;
    this.state = {
      orgs: [],
      propusks: [],
      selectedOrg: ""
    };
  }

  async loadData() {
    try {
      const [orgs, propusks] = await Promise.all([
        apiGet(ENDPOINTS.references.organizations),
        apiGet(ENDPOINTS.propusks, { limit: 300 })
      ]);
      this.state.orgs = orgs;
      this.state.propusks = propusks;
    } catch (err) {
      toast.show(err.message || "Не удалось загрузить данные", "error");
    }
  }

  async render() {
    await this.loadData();
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card section">
        <div class="md-toolbar">
          <div>
            <p class="tag">Отчёты</p>
            <h3 style="margin:0;">Отчёт по организациям</h3>
          </div>
        </div>
        <div class="md-toolbar">
          <div class="md-field" style="min-width:220px;">
            <label>Организация</label>
            <select class="md-select" id="org-select">
              <option value="">Выберите организацию</option>
              ${this.state.orgs.map((o) => `<option value="${o.id_org}">${o.org_name}</option>`).join("")}
            </select>
          </div>
          <div class="inline-actions">
            <button class="md-btn secondary" id="print-org">
              <span class="material-icons-round">picture_as_pdf</span>
              PDF по организации
            </button>
            <button class="md-btn" id="print-all-orgs">
              <span class="material-icons-round">description</span>
              PDF по всем организациям
            </button>
          </div>
        </div>
        <div class="table-scroll">
          <table class="md-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Госномер</th>
                <th>Марка/модель</th>
                <th>ФИО</th>
                <th>Статус</th>
                <th>До</th>
              </tr>
            </thead>
            <tbody id="org-propusk-rows"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderOrgRows(node.querySelector("#org-propusk-rows"));
    this.bind(node);
    return node;
  }

  renderOrgRows(tbody) {
    const filtered = this.state.propusks.filter((p) =>
      this.state.selectedOrg ? String(p.id_org) === String(this.state.selectedOrg) : false
    );
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Выберите организацию</div></td></tr>`;
      return;
    }
    tbody.innerHTML = filtered
      .map(
        (p) => `
          <tr>
            <td>${p.id_propusk}</td>
            <td>${p.gos_id}</td>
            <td>${p.mark_name || ""} ${p.model_name || ""}</td>
            <td>${p.abonent_fio || ""}</td>
            <td>${renderStatusChip(p.status)}</td>
            <td>${p.valid_until}</td>
          </tr>
        `
      )
      .join("");
  }

  bind(node) {
    node.querySelector("#org-select")?.addEventListener("change", (e) => {
      this.state.selectedOrg = e.target.value;
      this.renderOrgRows(node.querySelector("#org-propusk-rows"));
    });

    node.querySelector("#print-org")?.addEventListener("click", async () => {
      if (!this.state.selectedOrg) {
        toast.show("Выберите организацию", "error");
        return;
      }
      try {
        await openFileInNewTab(`${ENDPOINTS.propusks}/reports/org/${this.state.selectedOrg}/pdf`);
        toast.show("PDF готов", "success");
      } catch (err) {
        toast.show(err.message || "Не удалось сформировать PDF", "error");
      }
    });

    node.querySelector("#print-all-orgs")?.addEventListener("click", async () => {
      try {
        await openFileInNewTab(`${ENDPOINTS.propusks}/reports/org/all/pdf`);
        toast.show("PDF готов", "success");
      } catch (err) {
        toast.show(err.message || "Не удалось сформировать PDF", "error");
      }
    });
  }
}
