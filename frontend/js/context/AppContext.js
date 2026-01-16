import { ENDPOINTS } from "../config/constants.js";
import { apiGet, apiPost, setAuthToken } from "../api/client.js";

export class AppContext {
  constructor() {
    this.state = {
      token: null,
      user: null,
      ui: {
        propuskFilters: { status: "" }
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

  setPropuskFilters(filters) {
    this.state.ui.propuskFilters = { ...this.state.ui.propuskFilters, ...filters };
    this.emit("ui-change", this.state.ui);
  }

  async logout() {
    try {
      await apiPost(ENDPOINTS.logout, {});
    } catch {
      // ignore network errors on logout
    }
    this.setToken(null);
    this.setUser(null);
  }

  async bootstrapUser() {
    const me = await apiGet(ENDPOINTS.me);
    this.setUser(me);
  }
}
