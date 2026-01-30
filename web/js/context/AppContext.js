import { ENDPOINTS } from "../config/constants.js";
import { apiGet, apiPost, setAuthToken } from "../api/client.js";

export class AppContext {
  constructor() {
    const storedUi = this.readStoredUi();
    this.state = {
      token: null,
      user: null,
      ui: {
        propuskFilters: { status: "" },
        propuskPagination: { page: 1, limit: 50 },
        showPropuskPagination: false,
        temporaryFilters: { status: "" },
        temporaryPagination: { page: 1, limit: 50 },
        driversPagination: { page: 1, limit: 50 },
        ...storedUi
      }
    };
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((fn) => fn(payload));
  }

  setToken(token) {
    this.state.token = token;
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
    this.emit("auth-change", this.state);
  }

  setUser(user) {
    this.state.user = user;
    this.emit("user-change", user);
  }

  setLastPage(page) {
    this.state.ui.lastPage = page;
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  setPropuskFilters(filters) {
    this.state.ui.propuskFilters = { ...this.state.ui.propuskFilters, ...filters };
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  setPropuskPagination(pagination) {
    this.state.ui.propuskPagination = { ...this.state.ui.propuskPagination, ...pagination };
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  setPropuskPaginationVisibility(value) {
    this.state.ui.showPropuskPagination = Boolean(value);
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  setDriversPagination(pagination) {
    this.state.ui.driversPagination = { ...this.state.ui.driversPagination, ...pagination };
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  setTemporaryFilters(filters) {
    this.state.ui.temporaryFilters = { ...this.state.ui.temporaryFilters, ...filters };
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  setTemporaryPagination(pagination) {
    this.state.ui.temporaryPagination = { ...this.state.ui.temporaryPagination, ...pagination };
    this.storeUi();
    this.emit("ui-change", this.state.ui);
  }

  storeUi() {
    try {
      const payload = {
        propuskFilters: this.state.ui.propuskFilters,
        lastPage: this.state.ui.lastPage,
        propuskPagination: this.state.ui.propuskPagination,
        showPropuskPagination: this.state.ui.showPropuskPagination,
        driversPagination: this.state.ui.driversPagination,
        temporaryFilters: this.state.ui.temporaryFilters,
        temporaryPagination: this.state.ui.temporaryPagination
      };
      localStorage.setItem("ui_state", JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  readStoredUi() {
    try {
      const raw = localStorage.getItem("ui_state");
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  async logout() {
    try {
      await apiPost(ENDPOINTS.logout, {});
    } catch {
      // ignore network errors on logout
    }
    this.setToken(null);
    this.setUser(null);
    try {
      localStorage.removeItem("ui_state");
    } catch {
      // ignore storage errors
    }
  }

  async bootstrapUser() {
    const me = await apiGet(ENDPOINTS.me);
    this.setUser(me);
  }
}
