package space.kinoteka.guardpass.data.auth

data class MenuPermissionSet(
    val home: Boolean = false,
    val propusks: Boolean = false,
    val temporary: Boolean = false,
    val references: Boolean = false,
    val reports: Boolean = false,
    val users: Boolean = false,
    val settings: Boolean = false,
    val print: Boolean = false
)
