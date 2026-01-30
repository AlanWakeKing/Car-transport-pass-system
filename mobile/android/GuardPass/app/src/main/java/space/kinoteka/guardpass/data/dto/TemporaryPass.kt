package space.kinoteka.guardpass.data.dto

data class TemporaryPass(
    val id: Int,
    val gos_id: String,
    val id_org: Int,
    val phone: String?,
    val comment: String?,
    val valid_from: String,
    val valid_until: String,
    val created_by: Int,
    val created_at: String,
    val revoked_at: String?,
    val revoked_by: Int?,
    val entered_at: String?,
    val exited_at: String?,
    val entered_by: Int?,
    val exited_by: Int?,
    val status: String,
    val org_name: String,
    val creator_name: String,
    val exited_by_name: String?
)
