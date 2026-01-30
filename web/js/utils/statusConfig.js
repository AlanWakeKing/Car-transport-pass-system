export const statusMap = {
  draft: { label: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a", tone: "info" },
  active: { label: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439", tone: "success" },
  on_territory: { label: "\u041d\u0430 \u0442\u0435\u0440\u0440\u0438\u0442\u043e\u0440\u0438\u0438", tone: "info" },
  pending_delete: { label: "\u041d\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0435", tone: "warning" },
  revoked: { label: "\u0410\u043d\u043d\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u043d", tone: "error" },
  expired: { label: "\u0418\u0441\u0442\u0451\u043a", tone: "warning" }
};

export function renderStatusChip(status) {
  const raw = status == null ? "" : String(status);
  const key = raw.trim().toLowerCase();
  const cfg = statusMap[key] || { label: raw, tone: "info" };
  const toneClass = cfg.tone ? cfg.tone : "info";
  return `<span class="md-chip ${toneClass}">${cfg.label}</span>`;
}
