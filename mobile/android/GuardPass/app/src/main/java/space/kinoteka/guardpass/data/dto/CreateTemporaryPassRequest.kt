package space.kinoteka.guardpass.data.dto

data class CreateTemporaryPassRequest(
    val gos_id: String,
    val id_org: Int,
    val phone: String? = null,
    val comment: String? = null
)
