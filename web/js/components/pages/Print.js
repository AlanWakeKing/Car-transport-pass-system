import { ENDPOINTS } from "../../config/constants.js";
import { apiGet, openPostInNewTab, handleError } from "../../api/client.js";
import { renderStatusChip } from "../../utils/statusConfig.js";
import { toast } from "../common/Toast.js";

export class PrintPage {
  constructor(context) {
    this.context = context;
    this.state = {
      orgs: [],
      propusks: [],
      selectedOrg: "",
      selectedIds: new Set()
    };
  }

  async loadData() {
    try {
      const [orgs, propusks] = await Promise.all([
        apiGet(ENDPOINTS.references.organizations),
        apiGet(ENDPOINTS.propusks, { limit: 500 })
      ]);
      this.state.orgs = orgs;
      this.state.propusks = propusks;
    } catch (err) {
      handleError(err);
    }
  }

  async render() {
    await this.loadData();
    const node = document.createElement("div");
    node.className = "section";
    node.innerHTML = `
      <div class="md-card section">
        <div class="md-toolbar toolbar stack">
          <div>
            <p class="tag">Печать</p>
            <h3 style="margin:0;">Пропуска</h3>
          </div>
        </div>
        <div class="tabs" id="print-tabs">
          <button class="tab active" data-tab="org">Организации</button>
          <button class="tab" data-tab="props">Пропуска</button>
        </div>
        <div class="tab-panels">
          <div class="tab-panel active" data-tab="org">
            <div class="md-toolbar toolbar stack">
              <div class="md-field" style="min-width:220px;">
                <label>Организация</label>
                <select class="md-select" id="org-select">
                  <option value="">Выберите организацию</option>
                  ${this.state.orgs.map((o) => `<option value="${o.id_org}">${o.org_name}</option>`).join("")}
                </select>
              </div>
              <div class="toolbar-actions">
                <button class="md-btn secondary" id="print-org">
                  <span class="material-icons-round">picture_as_pdf</span>
                  PDF по организации
                </button>
              </div>
            </div>
            <div class="table-wrap desktop-only">
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
            <div class="mobile-cards mobile-only" id="org-propusk-cards"></div>
          </div>
          <div class="tab-panel" data-tab="props">
            <div class="md-toolbar toolbar stack">
              <div>
                <p class="tag">Множественный выбор</p>
                <h4 style="margin:0;">Пропуска</h4>
              </div>
              <div class="toolbar-actions">
                <button class="md-btn secondary" id="print-selected">
                  <span class="material-icons-round">picture_as_pdf</span>
                  Печать выбранных
                </button>
              </div>
            </div>
            <div class="table-wrap desktop-only">
              <div class="table-scroll">
                <table class="md-table">
                  <thead>
                    <tr>
                      <th><input type="checkbox" id="select-all"></th>
                      <th>ID</th>
                      <th>Госномер</th>
                      <th>Компания</th>
                      <th>ФИО</th>
                      <th>Статус</th>
                      <th>До</th>
                    </tr>
                  </thead>
                  <tbody id="propusk-rows"></tbody>
                </table>
              </div>
            </div>
            <div class="mobile-cards mobile-only" id="propusk-cards"></div>
          </div>
        </div>
      </div>
    `;

    this.renderOrgRows(node.querySelector("#org-propusk-rows"));
    this.renderOrgCards(node.querySelector("#org-propusk-cards"));
    this.renderPropuskRows(node.querySelector("#propusk-rows"));
    this.renderPropuskCards(node.querySelector("#propusk-cards"));
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
            <td>${p.abonent_fio || "—"}</td>
            <td>${renderStatusChip(p.status)}</td>
            <td>${p.valid_until}</td>
          </tr>
        `
      )
      .join("");
  }

  renderOrgCards(container) {
    if (!container) return;
    const filtered = this.state.propusks.filter((p) =>
      this.state.selectedOrg ? String(p.id_org) === String(this.state.selectedOrg) : false
    );
    if (!filtered.length) {
      container.innerHTML = `<div class="empty">Выберите организацию</div>`;
      return;
    }
    container.innerHTML = filtered
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
              <div class="mobile-card-row"><span>Марка/модель</span><span>${(p.mark_name || "")} ${(p.model_name || "")}</span></div>
              <div class="mobile-card-row"><span>ФИО</span><span>${p.abonent_fio || "-"}</span></div>
              <div class="mobile-card-row"><span>До</span><span>${p.valid_until || "-"}</span></div>
            </div>
          </div>
        `
      )
      .join("");
  }

  renderPropuskRows(tbody) {
    if (!this.state.propusks.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Нет данных</div></td></tr>`;
      return;
    }
    tbody.innerHTML = this.state.propusks
      .map(
        (p) => `
          <tr>
            <td><input type="checkbox" data-id="${p.id_propusk}" ${this.state.selectedIds.has(p.id_propusk) ? "checked" : ""}></td>
            <td>${p.id_propusk}</td>
            <td>${p.gos_id}</td>
            <td>${p.org_name || "—"}</td>
            <td>${p.abonent_fio || "—"}</td>
            <td>${renderStatusChip(p.status)}</td>
            <td>${p.valid_until}</td>
          </tr>
        `
      )
      .join("");
  }

  renderPropuskCards(container) {
    if (!container) return;
    if (!this.state.propusks.length) {
      container.innerHTML = `<div class="empty">Нет данных</div>`;
      return;
    }
    container.innerHTML = this.state.propusks
      .map(
        (p) => `
          <div class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <div class="mobile-card-title">${p.gos_id}</div>
                <div class="mobile-card-subtitle">ID ${p.id_propusk}</div>
              </div>
              <label style="display:flex; align-items:center; gap:0.4rem;">
                <input type="checkbox" data-id="${p.id_propusk}" ${this.state.selectedIds.has(p.id_propusk) ? "checked" : ""}>
                <span>${renderStatusChip(p.status)}</span>
              </label>
            </div>
            <div class="mobile-card-meta">
              <div class="mobile-card-row"><span>Компания</span><span>${p.org_name || "—"}</span></div>
              <div class="mobile-card-row"><span>ФИО</span><span>${p.abonent_fio || "—"}</span></div>
              <div class="mobile-card-row"><span>До</span><span>${p.valid_until || "—"}</span></div>
            </div>
          </div>
        `
      )
      .join("");
  }

  bind(node) {
    const tabs = node.querySelector("#print-tabs");
    tabs?.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const tab = btn.dataset.tab;
      tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      node.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === tab));
    });

    node.querySelector("#org-select")?.addEventListener("change", (e) => {
      this.state.selectedOrg = e.target.value;
      this.renderOrgRows(node.querySelector("#org-propusk-rows"));
      this.renderOrgCards(node.querySelector("#org-propusk-cards"));
    });

    node.querySelector("#print-org")?.addEventListener("click", async () => {
      if (!this.state.selectedOrg) {
        toast.show("Выберите организацию", "error");
        return;
      }
      await this.printOrg(this.state.selectedOrg);
    });

    node.querySelector("#propusk-rows")?.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.type !== "checkbox") return;
      const id = Number(cb.dataset.id);
      if (cb.checked) this.state.selectedIds.add(id);
      else this.state.selectedIds.delete(id);
    });

    node.querySelector("#propusk-cards")?.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.type !== "checkbox") return;
      const id = Number(cb.dataset.id);
      if (cb.checked) this.state.selectedIds.add(id);
      else this.state.selectedIds.delete(id);
      this.renderPropuskRows(node.querySelector("#propusk-rows"));
    });

    node.querySelector("#select-all")?.addEventListener("change", (e) => {
      const checked = e.target.checked;
      this.state.selectedIds.clear();
      if (checked) {
        this.state.propusks
          .filter((p) => p.status === "active")
          .forEach((p) => this.state.selectedIds.add(p.id_propusk));
      }
      this.renderPropuskRows(node.querySelector("#propusk-rows"));
      this.renderPropuskCards(node.querySelector("#propusk-cards"));
    });

    node.querySelector("#print-selected")?.addEventListener("click", async () => {
      if (!this.state.selectedIds.size) {
        toast.show("Выберите пропуска для печати", "info");
        return;
      }
      await this.printBatch(Array.from(this.state.selectedIds));
    });
  }

  async printBatch(ids) {
    try {
      await openPostInNewTab(`${ENDPOINTS.propusks}/pdf/batch`, ids);
      toast.show("PDF сформирован", "success");
    } catch (err) {
      handleError(err);
    }
  }

  async printOrg(orgId) {
    try {
      const ids = this.state.propusks
        .filter((p) => String(p.id_org) === String(orgId) && p.status === "active")
        .map((p) => p.id_propusk);
      if (!ids.length) {
        toast.show("Нет активных пропусков для этой организации", "info");
        return;
      }
      await openPostInNewTab(`${ENDPOINTS.propusks}/pdf/batch`, ids);
      toast.show("PDF сформирован", "success");
    } catch (err) {
      handleError(err);
    }
  }
}
