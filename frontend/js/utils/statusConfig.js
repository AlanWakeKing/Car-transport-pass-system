export const statusMap = {
  draft: { label: "Черновик", tone: "info" },
  active: { label: "Активен", tone: "success" },
  pending_delete: { label: "На удаление", tone: "warning" },
  revoked: { label: "Аннулирован", tone: "error" },
  expired: { label: "Истек", tone: "warning" }
};

export function renderStatusChip(status) {
  const cfg = statusMap[status] || { label: status, tone: "info" };
  const toneClass = cfg.tone ? cfg.tone : "info";
  return `<span class="md-chip ${toneClass}">${cfg.label}</span>`;
}
