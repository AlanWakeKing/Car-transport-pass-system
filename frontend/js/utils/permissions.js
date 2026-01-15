function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const perms = user.permissions || {};
  return Boolean(perms[key]);
}

function hasMenuPermission(user, key) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const perms = user.permissions || {};
  return Boolean(perms[key]);
}

export function canManageUsers(user) {
  return user?.role === "admin";
}

export function canViewPropusks(user) {
  return hasPermission(user, "view");
}

export function canCreatePropusks(user) {
  return hasPermission(user, "create");
}

export function canEditPropusks(user) {
  return hasPermission(user, "edit");
}

export function canActivatePropusks(user) {
  return hasPermission(user, "activate");
}

export function canDeletePropusks(user) {
  return hasPermission(user, "delete");
}

export function canAnnulPropusks(user) {
  return hasPermission(user, "annul");
}

export function canMarkDelete(user) {
  return hasPermission(user, "mark_delete");
}

export function canEditOrganizations(user) {
  return hasPermission(user, "edit_organization");
}

export function canDownload(user) {
  return hasPermission(user, "download_pdf");
}

export function canShowMenuPropusks(user) {
  return hasMenuPermission(user, "menu_propusks") && hasPermission(user, "view");
}

export function canShowMenuHome(user) {
  return hasMenuPermission(user, "menu_home");
}

export function canShowMenuReferences(user) {
  return hasMenuPermission(user, "menu_references");
}

export function canShowMenuPrint(user) {
  return hasMenuPermission(user, "menu_print");
}

export function canShowMenuReports(user) {
  return hasMenuPermission(user, "menu_reports");
}

export function canShowMenuUsers(user) {
  return hasMenuPermission(user, "menu_users");
}

export function canShowMenuSettings(user) {
  return hasMenuPermission(user, "menu_settings");
}
