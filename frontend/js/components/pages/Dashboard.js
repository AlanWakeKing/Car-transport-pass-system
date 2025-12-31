import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, handleError } from "../../api/client.js";
import { renderStatusChip, statusMap } from "../../utils/statusConfig.js";

export class DashboardPage {
  constructor(context) {
    this.context = context;
  }

  async loadData() {
    try {
      const propusks = await apiGet(ENDPOINTS.propusks, { limit: 6 });
      const active = propusks.filter((p) => p.status === "active").length;
      const draft = propusks.filter((p) => p.status === "draft").length;
      const revoked = propusks.filter((p) => p.status === "revoked").length;
      return { propusks, active, draft, revoked };
    } catch (err) {
      handleError(err);
      return { propusks: [], active: 0, draft: 0, revoked: 0 };
    }
  }

  async render() {
    const container = document.createElement("div");
    container.className = "section";
    container.innerHTML = `
      <div class="grid three" id="stat-grid"></div>
      <div class="md-card">
        <div class="md-toolbar">
          <div>
            <p class="tag">Последние операции</p>
            <h3 style="margin:0;">Недавние пропуска</h3>
          </div>
        </div>
        <div class="md-divider"></div>
        <div class="table-scroll">
          <table class="md-table" id="recent-table">
            <thead>
              <tr>
                <th>Госномер</th>
                <th>Компания</th>
                <th>Водитель</th>
                <th>Статус</th>
                <th>До</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    const data = await this.loadData();
    this.renderStats(container.querySelector("#stat-grid"), data);
    this.renderTable(container.querySelector("#recent-table tbody"), data.propusks);
    return container;
  }

  renderStats(node, { active, draft, revoked }) {
    node.innerHTML = `
      ${this.statCard("Активные", active, "task_alt", "success")}
      ${this.statCard("Черновики", draft, "pending", "info")}
      ${this.statCard("Аннулированы", revoked, "block", "error")}
    `;
  }

  statCard(label, value, icon, tone) {
    return `
      <div class="md-card stat-card animate-fade">
        <div class="tag">${label}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-meta">
          <span class="material-icons-round" style="color:var(--md-${tone});">${icon}</span>
          <span>Мониторинг в реальном времени</span>
        </div>
      </div>
    `;
  }

  renderTable(tbody, propusks) {
    if (!propusks.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty">Нет данных</div></td></tr>`;
      return;
    }

    tbody.innerHTML = propusks
      .map(
        (p) => `
          <tr>
            <td><strong>${p.gos_id}</strong><br><span class="tag">ID ${p.id_propusk}</span></td>
            <td>${p.org_name || "—"}</td>
            <td>${p.abonent_fio || "—"}</td>
            <td>${renderStatusChip(p.status)}</td>
            <td>${p.valid_until}</td>
          </tr>
        `
      )
      .join("");
  }
}
