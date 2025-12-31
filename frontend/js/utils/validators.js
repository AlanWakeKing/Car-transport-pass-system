export function requireValue(value, message) {
  if (!value) throw new Error(message || "Заполните поле");
}

export function requireDateOrder(from, to) {
  if (from && to && new Date(to) < new Date(from)) {
    throw new Error("Дата окончания раньше даты выдачи");
  }
}
