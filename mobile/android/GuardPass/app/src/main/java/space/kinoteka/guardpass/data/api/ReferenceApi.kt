package space.kinoteka.guardpass.data.api

import retrofit2.http.GET
import retrofit2.http.Query
import retrofit2.http.POST
import retrofit2.http.PATCH
import retrofit2.http.DELETE
import retrofit2.http.Path
import space.kinoteka.guardpass.data.dto.AbonentResponse
import space.kinoteka.guardpass.data.dto.AbonentCreate
import space.kinoteka.guardpass.data.dto.AbonentUpdate
import space.kinoteka.guardpass.data.dto.MarkAutoCreate
import space.kinoteka.guardpass.data.dto.MarkAutoResponse
import space.kinoteka.guardpass.data.dto.MarkAutoUpdate
import space.kinoteka.guardpass.data.dto.ModelAutoCreate
import space.kinoteka.guardpass.data.dto.ModelAutoResponse
import space.kinoteka.guardpass.data.dto.ModelAutoUpdate
import space.kinoteka.guardpass.data.dto.OrganizCreate
import space.kinoteka.guardpass.data.dto.OrganizUpdate
import space.kinoteka.guardpass.data.dto.Organization

interface ReferenceApi {
    @GET("api/references/organizations")
    suspend fun organizations(
        @Query("search") search: String? = null
    ): List<Organization>

    @POST("api/references/organizations")
    suspend fun createOrganization(@retrofit2.http.Body body: OrganizCreate): Organization

    @PATCH("api/references/organizations/{org_id}")
    suspend fun updateOrganization(
        @Path("org_id") orgId: Int,
        @retrofit2.http.Body body: OrganizUpdate
    ): Organization

    @DELETE("api/references/organizations/{org_id}")
    suspend fun deleteOrganization(@Path("org_id") orgId: Int)

    @GET("api/references/marks")
    suspend fun marks(): List<MarkAutoResponse>

    @POST("api/references/marks")
    suspend fun createMark(@retrofit2.http.Body body: MarkAutoCreate): MarkAutoResponse

    @PATCH("api/references/marks/{mark_id}")
    suspend fun updateMark(
        @Path("mark_id") markId: Int,
        @retrofit2.http.Body body: MarkAutoUpdate
    ): MarkAutoResponse

    @DELETE("api/references/marks/{mark_id}")
    suspend fun deleteMark(@Path("mark_id") markId: Int)

    @GET("api/references/models")
    suspend fun models(
        @Query("mark_id") markId: Int? = null
    ): List<ModelAutoResponse>

    @POST("api/references/models")
    suspend fun createModel(@retrofit2.http.Body body: ModelAutoCreate): ModelAutoResponse

    @PATCH("api/references/models/{model_id}")
    suspend fun updateModel(
        @Path("model_id") modelId: Int,
        @retrofit2.http.Body body: ModelAutoUpdate
    ): ModelAutoResponse

    @DELETE("api/references/models/{model_id}")
    suspend fun deleteModel(@Path("model_id") modelId: Int)

    @GET("api/references/abonents")
    suspend fun abonents(): List<AbonentResponse>

    @GET("api/references/abonents/paged")
    suspend fun abonentsPaged(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50
    ): space.kinoteka.guardpass.data.dto.AbonentListResponse

    @POST("api/references/abonents")
    suspend fun createAbonent(@retrofit2.http.Body body: AbonentCreate): AbonentResponse

    @PATCH("api/references/abonents/{abonent_id}")
    suspend fun updateAbonent(
        @Path("abonent_id") abonentId: Int,
        @retrofit2.http.Body body: AbonentUpdate
    ): AbonentResponse

    @DELETE("api/references/abonents/{abonent_id}")
    suspend fun deleteAbonent(@Path("abonent_id") abonentId: Int)
}
