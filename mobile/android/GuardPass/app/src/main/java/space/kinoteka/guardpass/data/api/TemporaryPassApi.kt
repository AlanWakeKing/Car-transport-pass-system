package space.kinoteka.guardpass.data.api

import okhttp3.ResponseBody
import retrofit2.http.*
import space.kinoteka.guardpass.data.dto.CreateTemporaryPassRequest
import space.kinoteka.guardpass.data.dto.TemporaryPass
import space.kinoteka.guardpass.data.dto.TemporaryPassListResponse

interface TemporaryPassApi {

    @GET("api/temporary-pass")
    suspend fun list(
        @Query("status_filter") statusFilter: String? = null, // active/expired/revoked
        @Query("id_org") idOrg: Int? = null,
        @Query("gos_id") gosId: String? = null,
        @Query("date_from") dateFrom: String? = null,
        @Query("date_to") dateTo: String? = null,
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50
    ): TemporaryPassListResponse

    @POST("api/temporary-pass")
    suspend fun create(@Body req: CreateTemporaryPassRequest): TemporaryPass

    @POST("api/temporary-pass/{pass_id}/enter")
    suspend fun enter(@Path("pass_id") passId: Int): TemporaryPass

    @POST("api/temporary-pass/{pass_id}/exit")
    suspend fun exit(@Path("pass_id") passId: Int): TemporaryPass

    @GET("api/temporary-pass/{pass_id}/pdf")
    @Streaming
    suspend fun pdf(@Path("pass_id") passId: Int): ResponseBody

    @GET("api/temporary-pass/reports/all/pdf")
    @Streaming
    suspend fun reportAllPdf(): ResponseBody
}
