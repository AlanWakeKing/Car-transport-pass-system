package space.kinoteka.guardpass.data.dto

data class AbonentCreate(
    val surname: String,
    val name: String,
    val otchestvo: String?,
    val id_org: Int,
    val info: String?
)
