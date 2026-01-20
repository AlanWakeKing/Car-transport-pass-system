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
    reportTemplateVersions: "/api/settings/report-template/versions",
    apiEnabled: "/api/settings/api-enabled",
    docsEnabled: "/api/settings/docs-enabled"
  },
  references: {
    organizations: "/api/references/organizations",
    marks: "/api/references/marks",
    models: "/api/references/models",
    abonents: "/api/references/abonents",
    abonentsPaged: "/api/references/abonents/paged"
  },
  propusks: "/api/propusk",
  propusksStats: "/api/propusk/stats",
  propusksPaged: "/api/propusk/paged"
};
