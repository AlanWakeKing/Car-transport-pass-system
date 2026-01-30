package space.kinoteka.guardpass.data.dto

data class UserCreate(
    val username: String,
    val full_name: String,
    val role: String = "viewer",
    val tg_user_id: Long?,
    val password: String,
    val permissions: Map<String, Boolean>?
)
