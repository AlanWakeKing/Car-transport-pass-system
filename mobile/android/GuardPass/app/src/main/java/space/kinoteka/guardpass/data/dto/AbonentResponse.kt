package space.kinoteka.guardpass.data.dto

data class AbonentResponse(
    val id_fio: Int,
    val surname: String,
    val name: String,
    val otchestvo: String?,
    val id_org: Int,
    val info: String?,
    val full_name: String,
    val org_name: String?,
    val created_at: String
)
