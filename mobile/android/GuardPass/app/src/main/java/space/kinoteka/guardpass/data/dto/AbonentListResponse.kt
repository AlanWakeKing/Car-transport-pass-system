package space.kinoteka.guardpass.data.dto

data class AbonentListResponse(
    val items: List<AbonentResponse>,
    val total: Int,
    val skip: Int,
    val limit: Int
)
