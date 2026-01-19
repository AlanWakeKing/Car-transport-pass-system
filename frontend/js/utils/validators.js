export function requireValue(value, message) {
  if (!value) throw new Error(message || "Введите значение");
}

export function requireDateOrder(from, to) {
  if (from && to && new Date(to) < new Date(from)) {
    throw new Error("Дата окончания должна быть позже даты начала");
  }
}

export const GOS_NUMBER_PATTERN = /^(?:[A-Z]\d{3}[A-Z]{2}\d{2,3}|\d{4}[A-Z]{2}\d{2}|\d{2}[A-Z]{2}\d{4}|\d{6}[A-Z]{2})$/;

export function normalizeGosNumber(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatGosNumber(value) {
  const raw = String(value || "").toUpperCase();
  const clean = normalizeGosNumber(raw);
  if (/^[A-Z]\d{3}[A-Z]{2}\d{2,3}$/.test(clean)) {
    const region = clean.slice(6);
    return `${clean.slice(0, 1)} ${clean.slice(1, 4)} ${clean.slice(4, 6)} ${region}`;
  }
  if (/^\d{4}[A-Z]{2}\d{2}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
  }
  if (/^\d{2}[A-Z]{2}\d{4}$/.test(clean)) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4)}`;
  }
  if (/^\d{6}[A-Z]{2}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
  }
  return raw.replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function requireGosNumber(value) {
  if (!GOS_NUMBER_PATTERN.test(normalizeGosNumber(value))) {
    throw new Error("Форматы: A 888 AA 790 / O 632 CX 77 / 0013 AX 77 / 77 KC 3174 / 9999 99 MM / 77 MM 1147");
  }
}
