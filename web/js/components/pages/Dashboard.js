import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, handleError } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";
import { canShowMenuPropusks } from "../../utils/permissions.js";
import { toast } from "../common/Toast.js";

export class DashboardPage {
  constructor(context) {
    this.context = context;
  }

  async loadData(canAccess) {
    if (!canAccess) {
      return { propusks: [], active: 0, draft: 0, revoked: 0 };
    }
    try {
      const [propusks, stats] = await Promise.all([
        apiGet(ENDPOINTS.propusks, { limit: 6 }),
        apiGet(ENDPOINTS.propusksStats)
      ]);
      return {
        propusks,
        active: stats.active || 0,
        draft: stats.draft || 0,
        revoked: stats.revoked || 0
      };
    } catch (err) {
      handleError(err);
      return { propusks: [], active: 0, draft: 0, revoked: 0 };
    }
  }

  async render() {
    const container = document.createElement("div");
    container.className = "section";
    container.innerHTML = `
      <div class="grid three stat-grid" id="stat-grid"></div>
      <div class="md-card">
        <div class="md-toolbar">
          <div>
            <p class="tag">Пропуска</p>
            <h3 style="margin:0;">Последние пропуска</h3>
          </div>
        </div>
        <div class="md-divider"></div>
        <div class="table-wrap desktop-only">
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
        <div class="mobile-cards mobile-only" id="recent-cards"></div>
      </div>
    `;

    const canAccess = canShowMenuPropusks(this.context.state.user);
    const data = await this.loadData(canAccess);
    this.renderStats(container.querySelector("#stat-grid"), data, canAccess);
    this.renderTable(container.querySelector("#recent-table tbody"), data.propusks, canAccess);
    this.renderCards(container.querySelector("#recent-cards"), data.propusks, canAccess);
    return container;
  }

  renderStats(node, { active, draft, revoked }, canAccess) {
    node.addEventListener("click", (e) => {
      const card = e.target.closest("[data-status]");
      if (!card) return;
      if (!canAccess) {
        toast.show("Недостаточно прав", "error");
        return;
      }
      const status = card.dataset.status;
      this.context.setPropuskFilters({ status });
      this.context.emit("navigate", { page: "propusks", filters: { status } });
    });
    node.innerHTML = `
      ${this.statCard("Активные", active, "task_alt", "success", "active")}
      ${this.statCard("Черновики", draft, "pending", "info", "draft")}
      ${this.statCard("Аннулированные", revoked, "block", "error", "revoked")}
    `;
  }

  statCard(label, value, icon, tone, status) {
    return `
      <div class="md-card stat-card animate-fade" data-status="${status}">
        <div class="tag">${label}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-meta">
          <span class="material-icons-round" style="color:var(--md-${tone});">${icon}</span>
          <span>Нажмите, чтобы открыть отфильтрованный список</span>
        </div>
      </div>
    `;
  }

  renderTable(tbody, propusks, canAccess) {
    if (!canAccess) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty">Недостаточно прав</div></td></tr>`;
      return;
    }
    if (!propusks.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty">Нет записей</div></td></tr>`;
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

  renderCards(container, propusks, canAccess) {
    if (!container) return;
    if (!canAccess) {
      container.innerHTML = `<div class="empty">Недостаточно прав</div>`;
      return;
    }
    if (!propusks.length) {
      container.innerHTML = `<div class="empty">Нет записей</div>`;
      return;
    }
    container.innerHTML = propusks
      .map(
        (p) => `
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <div class="mobile-card-title">${p.gos_id}</div>
                <div class="mobile-card-subtitle">ID ${p.id_propusk}</div>
              </div>
              <div>${renderStatusChip(p.status)}</div>
            </div>
            <div class="mobile-card-meta">
              <div class="mobile-card-row"><span>Компания</span><span>${p.org_name || "-"}</span></div>
              <div class="mobile-card-row"><span>Водитель</span><span>${p.abonent_fio || "-"}</span></div>
              <div class="mobile-card-row"><span>До</span><span>${p.valid_until || "-"}</span></div>
            </div>
          </div>
        `
      )
      .join("");
  }
}



