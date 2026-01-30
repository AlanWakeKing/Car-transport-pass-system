package space.kinoteka.guardpass.data.dto

data class PropuskResponse(
    val gos_id: String,
    val id_mark_auto: Int,
    val id_model_auto: Int,
    val id_org: Int,
    val pass_type: String,
    val release_date: String,
    val valid_until: String,
    val id_fio: Int,
    val info: String?,
    val id_propusk: Int,
    val status: String,
    val created_by: Int,
    val created_at: String,
    val updated_at: String?,
    val mark_name: String?,
    val model_name: String?,
    val org_name: String?,
    val abonent_fio: String?,
    val creator_name: String?
)
