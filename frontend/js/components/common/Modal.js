class ModalService {
  constructor() {
    this.active = null;
  }

  show({ title = "", content, footer }) {
    this.close();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<h3 style="margin:0;">${title}</h3>`;

    const closeBtn = document.createElement("button");
    closeBtn.className = "md-btn ghost";
    closeBtn.type = "button";
    closeBtn.innerHTML = `<span class="material-icons-round">close</span>Закрыть`;
    closeBtn.addEventListener("click", () => this.close());
    header.appendChild(closeBtn);

    modal.appendChild(header);

    if (content) {
      modal.appendChild(content);
    }

    if (footer) {
      const footerNode = document.createElement("div");
      footerNode.className = "modal-footer";
      footerNode.appendChild(footer);
      modal.appendChild(footerNode);
    }

    backdrop.appendChild(modal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) this.close();
    });

    document.body.appendChild(backdrop);
    this.active = backdrop;
    return { close: () => this.close() };
  }

  close() {
    if (this.active) {
      this.active.remove();
      this.active = null;
    }
  }
}

export const modal = new ModalService();
