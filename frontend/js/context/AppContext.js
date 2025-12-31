import { ENDPOINTS } from "../config/constants.js";
import { apiGet, setAuthToken } from "../api/client.js";

export class AppContext {
  constructor() {
    this.state = {
      token: localStorage.getItem("auth_token"),
      user: null
    };
    if (this.state.token) {
      setAuthToken(this.state.token);
    }
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
      localStorage.setItem("auth_token", token);
      setAuthToken(token);
    } else {
      localStorage.removeItem("auth_token");
      setAuthToken(null);
    }
    this.emit("auth-change", this.state);
  }

  setUser(user) {
    this.state.user = user;
    this.emit("user-change", user);
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
  }

  async bootstrapUser() {
    if (!this.state.token) return;
    const me = await apiGet(ENDPOINTS.me);
    this.setUser(me);
  }
}
