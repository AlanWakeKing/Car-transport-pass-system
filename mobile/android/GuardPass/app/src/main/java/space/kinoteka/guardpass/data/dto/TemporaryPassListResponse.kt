package space.kinoteka.guardpass.data.dto

data class TemporaryPassListResponse(
    val items: List<TemporaryPass>,
    val total: Int,
    val skip: Int,
    val limit: Int
)
