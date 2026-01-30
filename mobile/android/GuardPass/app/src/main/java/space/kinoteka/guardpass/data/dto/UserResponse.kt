package space.kinoteka.guardpass.data.dto

data class UserResponse(
    val username: String,
    val full_name: String,
    val role: String = "viewer",
    val tg_user_id: Long?,
    val id: Int,
    val is_active: Boolean,
    val created_at: String,
    val permissions: Map<String, Boolean>?
)
