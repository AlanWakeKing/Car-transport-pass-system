PERMISSION_KEYS = [
    "view",
    "create",
    "edit",
    "delete",
    "annul",
    "mark_delete",
    "activate",
    "edit_organization",
    "download_pdf",
    "menu_propusks",
    "menu_home",
    "menu_references",
    "menu_print",
    "menu_reports",
    "menu_users",
    "menu_settings",
    "menu_create_pass",
    "menu_edit_pass",
    "menu_history",
]


def normalize_permissions(payload):
    if payload is None:
        return None
    if isinstance(payload, dict):
        data = {key: bool(payload.get(key, False)) for key in PERMISSION_KEYS}
        return data
    if isinstance(payload, (list, tuple, set)):
        data = {key: False for key in PERMISSION_KEYS}
        for item in payload:
            if item in data:
                data[item] = True
        return data
    return {key: False for key in PERMISSION_KEYS}


ROLE_DEFAULTS = {
    "admin": {key: True for key in PERMISSION_KEYS},
    "manager": {
        "view": True,
        "create": True,
        "edit": True,
        "delete": False,
        "annul": True,
        "mark_delete": True,
        "activate": True,
        "edit_organization": False,
        "download_pdf": True,
        "menu_home": True,
        "menu_propusks": True,
        "menu_references": True,
        "menu_print": True,
        "menu_reports": True,
        "menu_users": False,
        "menu_settings": False,
        "menu_create_pass": False,
        "menu_edit_pass": False,
        "menu_history": False,
    },
    "guard": {
        "view": True,
        "create": False,
        "edit": False,
        "delete": False,
        "annul": False,
        "mark_delete": False,
        "activate": False,
        "edit_organization": False,
        "download_pdf": False,
        "menu_home": True,
        "menu_propusks": True,
        "menu_references": False,
        "menu_print": False,
        "menu_reports": False,
        "menu_users": False,
        "menu_settings": False,
        "menu_create_pass": False,
        "menu_edit_pass": False,
        "menu_history": False,
    },
    "viewer": {
        "view": True,
        "create": False,
        "edit": False,
        "delete": False,
        "annul": False,
        "mark_delete": False,
        "activate": False,
        "edit_organization": False,
        "download_pdf": False,
        "menu_home": True,
        "menu_propusks": True,
        "menu_references": False,
        "menu_print": False,
        "menu_reports": False,
        "menu_users": False,
        "menu_settings": False,
        "menu_create_pass": False,
        "menu_edit_pass": False,
        "menu_history": False,
    },
}


def defaults_for_role(role):
    return ROLE_DEFAULTS.get(role, ROLE_DEFAULTS["viewer"]).copy()
