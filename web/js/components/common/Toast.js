class ToastService {
  constructor() {
    this.container = document.getElementById("toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      document.body.appendChild(this.container);
    }
  }

  show(message, type = "info", duration) {
    const effectiveDuration = typeof duration === "number"
      ? duration
      : (type === "error" ? 10000 : 3200);
    const node = document.createElement("div");
    node.className = `toast ${type} animate-fade`;
    node.innerHTML = `
      <span class="material-icons-round">notifications</span>
      <span>${message}</span>
    `;
    this.container.appendChild(node);
    setTimeout(() => node.remove(), effectiveDuration);
  }
}

export const toast = new ToastService();
