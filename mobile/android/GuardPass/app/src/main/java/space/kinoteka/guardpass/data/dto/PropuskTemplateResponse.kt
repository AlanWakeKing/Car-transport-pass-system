package space.kinoteka.guardpass.data.dto

data class PropuskTemplateResponse(
    val id: Int,
    val version: Int,
    val data: Map<String, Any>,
    val created_at: String,
    val created_by: Int,
    val is_active: Boolean
)
