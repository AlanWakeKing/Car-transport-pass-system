package space.kinoteka.guardpass.data.dto

import com.google.gson.annotations.SerializedName

data class Organization(
    @SerializedName("id_org") val id_org: Int,
    @SerializedName("org_name") val org_name: String,

    // В ответе сейчас free_mesto: 0, free_mesto_limit: 0
    @SerializedName("free_mesto") val free_mesto: Int = 0,
    @SerializedName("free_mesto_limit") val free_mesto_limit: Int = 0,

    @SerializedName("comment") val comment: String? = null,
    @SerializedName("created_at") val created_at: String? = null
)
