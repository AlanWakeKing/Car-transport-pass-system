export const API_BASE = "";

export const ENDPOINTS = {
  login: "/api/auth/login-json",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
  users: "/api/auth/users",
  settings: {
    template: "/api/settings/propusk-template",
    activeTemplate: "/api/settings/propusk-template/active",
    templateVersions: "/api/settings/propusk-template/versions",
    reportTemplate: "/api/settings/report-template",
    reportActiveTemplate: "/api/settings/report-template/active",
    reportTemplateVersions: "/api/settings/report-template/versions"
  },
  references: {
    organizations: "/api/references/organizations",
    marks: "/api/references/marks",
    models: "/api/references/models",
    abonents: "/api/references/abonents"
  },
  propusks: "/api/propusk"
};
