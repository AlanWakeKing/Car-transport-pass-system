package space.kinoteka.guardpass.data.api

import okhttp3.ResponseBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query
import space.kinoteka.guardpass.data.dto.PropuskCreate
import space.kinoteka.guardpass.data.dto.PropuskListResponse
import space.kinoteka.guardpass.data.dto.PropuskResponse
import space.kinoteka.guardpass.data.dto.PropuskStatsResponse
import space.kinoteka.guardpass.data.dto.PropuskUpdate

interface PropuskApi {
    @GET("api/propusk/paged")
    suspend fun listPaged(
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50
    ): PropuskListResponse

    @GET("api/propusk/stats")
    suspend fun stats(): PropuskStatsResponse

    @POST("api/propusk")
    suspend fun create(@Body body: PropuskCreate): PropuskResponse

    @PATCH("api/propusk/{propusk_id}")
    suspend fun update(
        @Path("propusk_id") propuskId: Int,
        @Body body: PropuskUpdate
    ): PropuskResponse

    @POST("api/propusk/{propusk_id}/activate")
    suspend fun activate(@Path("propusk_id") propuskId: Int)

    @POST("api/propusk/{propusk_id}/revoke")
    suspend fun revoke(@Path("propusk_id") propuskId: Int)

    @POST("api/propusk/{propusk_id}/mark-delete")
    suspend fun markDelete(@Path("propusk_id") propuskId: Int)

    @DELETE("api/propusk/{propusk_id}/archive")
    suspend fun archive(@Path("propusk_id") propuskId: Int)

    @POST("api/propusk/{propusk_id}/restore")
    suspend fun restore(@Path("propusk_id") propuskId: Int)

    @GET("api/propusk/{propusk_id}/pdf")
    suspend fun pdf(@Path("propusk_id") propuskId: Int): ResponseBody

    @GET("api/propusk/reports/org/all/pdf")
    suspend fun reportAllOrgsPdf(): ResponseBody

    @GET("api/propusk/reports/org/{org_id}/pdf")
    suspend fun reportOrgPdf(@Path("org_id") orgId: Int): ResponseBody

    @POST("api/propusk/pdf/batch")
    suspend fun batchPdf(@Body ids: List<Int>): ResponseBody
}
