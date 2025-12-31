export function canManageUsers(user) {
  return user?.role === "admin";
}

export function canManagePropusks(user) {
  return ["admin", "manager_creator", "manager_controller"].includes(user?.role);
}

export function canControlStatus(user) {
  return ["admin", "manager_controller"].includes(user?.role);
}

export function canMarkDelete(user) {
  return ["admin", "manager_creator", "manager_controller", "operator"].includes(user?.role);
}

export function canDownload(user) {
  return Boolean(user);
}
