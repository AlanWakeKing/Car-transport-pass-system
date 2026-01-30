package space.kinoteka.guardpass.data.auth

data class PermissionSet(
    val canViewPropusks: Boolean = false,
    val canCreatePropusks: Boolean = false,
    val canEditPropusks: Boolean = false,
    val canActivatePropusks: Boolean = false,
    val canDeletePropusks: Boolean = false,
    val canAnnulPropusks: Boolean = false,
    val canMarkDelete: Boolean = false,
    val canDownloadPropuskPdf: Boolean = false,
    val canEditOrganizations: Boolean = false,
    val canManageUsers: Boolean = false,
    val canViewPasses: Boolean = false,
    val canCreatePass: Boolean = false,
    val canEditPass: Boolean = false,
    val canDownloadPdf: Boolean = false
)
