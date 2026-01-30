package space.kinoteka.guardpass.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import space.kinoteka.guardpass.data.dto.ApiTogglePayload
import space.kinoteka.guardpass.data.dto.ApiToggleResponse
import space.kinoteka.guardpass.data.dto.DocsTogglePayload
import space.kinoteka.guardpass.data.dto.DocsToggleResponse
import space.kinoteka.guardpass.data.dto.PropuskTemplatePayload
import space.kinoteka.guardpass.data.dto.PropuskTemplateResponse

interface SettingsApi {
    @GET("api/settings/api-enabled")
    suspend fun getApiEnabled(): ApiToggleResponse

    @PUT("api/settings/api-enabled")
    suspend fun setApiEnabled(@Body body: ApiTogglePayload): ApiToggleResponse

    @GET("api/settings/docs-enabled")
    suspend fun getDocsEnabled(): DocsToggleResponse

    @PUT("api/settings/docs-enabled")
    suspend fun setDocsEnabled(@Body body: DocsTogglePayload): DocsToggleResponse

    @GET("api/settings/propusk-template/active")
    suspend fun activePropuskTemplate(): PropuskTemplateResponse

    @GET("api/settings/propusk-template/versions")
    suspend fun propuskTemplateVersions(): List<PropuskTemplateResponse>

    @POST("api/settings/propusk-template")
    suspend fun createPropuskTemplate(@Body body: PropuskTemplatePayload): PropuskTemplateResponse

    @GET("api/settings/temporary-pass-template/active")
    suspend fun activeTemporaryTemplate(): PropuskTemplateResponse

    @GET("api/settings/temporary-pass-template/versions")
    suspend fun temporaryTemplateVersions(): List<PropuskTemplateResponse>

    @POST("api/settings/temporary-pass-template")
    suspend fun createTemporaryTemplate(@Body body: PropuskTemplatePayload): PropuskTemplateResponse

    @GET("api/settings/report-template/active")
    suspend fun activeReportTemplate(): PropuskTemplateResponse

    @GET("api/settings/report-template/versions")
    suspend fun reportTemplateVersions(): List<PropuskTemplateResponse>

    @POST("api/settings/report-template")
    suspend fun createReportTemplate(@Body body: PropuskTemplatePayload): PropuskTemplateResponse

    @GET("api/settings/temporary-pass-report-template/active")
    suspend fun activeTemporaryReportTemplate(): PropuskTemplateResponse

    @GET("api/settings/temporary-pass-report-template/versions")
    suspend fun temporaryReportTemplateVersions(): List<PropuskTemplateResponse>

    @POST("api/settings/temporary-pass-report-template")
    suspend fun createTemporaryReportTemplate(@Body body: PropuskTemplatePayload): PropuskTemplateResponse
}
