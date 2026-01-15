export function requireValue(value, message) {
  if (!value) throw new Error(message || "Заполните поле");
}

export function requireDateOrder(from, to) {
  if (from && to && new Date(to) < new Date(from)) {
    throw new Error("Дата окончания раньше даты выдачи");
  }
}

export const GOS_NUMBER_PATTERN = /^[A-Z]\s?\d{3}\s?[A-Z]{2}\s?\d{3}$/;

export function normalizeGosNumber(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatGosNumber(value) {
  const clean = normalizeGosNumber(value);
  const parts = [];
  if (clean.length > 0) parts.push(clean.slice(0, 1));
  if (clean.length > 1) parts.push(clean.slice(1, 4));
  if (clean.length > 4) parts.push(clean.slice(4, 6));
  if (clean.length > 6) parts.push(clean.slice(6, 9));
  return parts.join(" ");
}

export function requireGosNumber(value) {
  if (!GOS_NUMBER_PATTERN.test(String(value || "").toUpperCase())) {
    throw new Error("Госномер в формате A 888 AA 790 (только латиница)");
  }
}
