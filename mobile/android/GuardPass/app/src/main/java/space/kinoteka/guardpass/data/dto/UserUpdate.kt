package space.kinoteka.guardpass.data.dto

data class UserUpdate(
    val full_name: String?,
    val role: String?,
    val is_active: Boolean?,
    val password: String?,
    val tg_user_id: Long?,
    val permissions: Map<String, Boolean>?
)
