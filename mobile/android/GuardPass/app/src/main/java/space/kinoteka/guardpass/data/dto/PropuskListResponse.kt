package space.kinoteka.guardpass.data.dto

data class PropuskListResponse(
    val items: List<PropuskResponse>,
    val total: Int,
    val skip: Int,
    val limit: Int
)
