import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, handleError } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";

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
            <p class="tag">??????????</p>
            <h3 style="margin:0;">????????? ????????</h3>
          </div>
        </div>
        <div class="md-divider"></div>
        <div class="table-scroll">
          <table class="md-table" id="recent-table">
            <thead>
              <tr>
                <th>????????</th>
                <th>????????</th>
                <th>????????</th>
                <th>??????</th>
                <th>??</th>
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
    node.addEventListener("click", (e) => {
      const card = e.target.closest("[data-status]");
      if (!card) return;
      const status = card.dataset.status;
      this.context.setPropuskFilters({ status });
      this.context.emit("navigate", { page: "propusks", filters: { status } });
    });
    node.innerHTML = `
      ${this.statCard("????????", active, "task_alt", "success", "active")}
      ${this.statCard("?????????", draft, "pending", "info", "draft")}
      ${this.statCard("??????????????", revoked, "block", "error", "revoked")}
    `;
  }

  statCard(label, value, icon, tone, status) {
    return `
      <div class="md-card stat-card animate-fade" data-status="${status}">
        <div class="tag">${label}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-meta">
          <span class="material-icons-round" style="color:var(--md-${tone});">${icon}</span>
          <span>?????????? ?????? ? ???????? ???????</span>
        </div>
      </div>
    `;
  }

  renderTable(tbody, propusks) {
    if (!propusks.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty">??? ??????</div></td></tr>`;
      return;
    }

    tbody.innerHTML = propusks
      .map(
        (p) => `
          <tr>
            <td><strong>${p.gos_id}</strong><br><span class="tag">ID ${p.id_propusk}</span></td>
            <td>${p.org_name || "-"}</td>
            <td>${p.abonent_fio || "-"}</td>
            <td>${renderStatusChip(p.status)}</td>
            <td>${p.valid_until}</td>
          </tr>
        `
      )
      .join("");
  }
}
