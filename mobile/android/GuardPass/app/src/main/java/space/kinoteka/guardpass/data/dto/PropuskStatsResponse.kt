package space.kinoteka.guardpass.data.dto

data class PropuskStatsResponse(
    val active: Int,
    val draft: Int,
    val revoked: Int,
    val pending_delete: Int,
    val total: Int
)
