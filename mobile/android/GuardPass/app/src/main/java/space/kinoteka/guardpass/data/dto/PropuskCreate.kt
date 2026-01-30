package space.kinoteka.guardpass.data.dto

data class PropuskCreate(
    val gos_id: String,
    val id_mark_auto: Int,
    val id_model_auto: Int,
    val id_org: Int,
    val pass_type: String = "drive",
    val release_date: String,
    val valid_until: String,
    val id_fio: Int,
    val info: String?
)
