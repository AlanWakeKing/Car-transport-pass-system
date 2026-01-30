package space.kinoteka.guardpass.data.dto

data class OrganizCreate(
    val org_name: String,
    val free_mesto: Int = 0,
    val free_mesto_limit: Int?,
    val comment: String?
)
