package space.kinoteka.guardpass.data.api

import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PATCH
import retrofit2.http.Path
import space.kinoteka.guardpass.data.dto.AuthResponse
import space.kinoteka.guardpass.data.dto.UserResponse
import space.kinoteka.guardpass.data.dto.UserCreate
import space.kinoteka.guardpass.data.dto.UserUpdate

interface AuthApi {
    @FormUrlEncoded
    @POST("api/auth/login")
    suspend fun login(
        @Field("grant_type") grantType: String = "",
        @Field("username") username: String,
        @Field("password") password: String,
        @Field("scope") scope: String = "",
        @Field("client_id") clientId: String = "",
        @Field("client_secret") clientSecret: String = ""
    ): AuthResponse

    @GET("api/auth/me")
    suspend fun me(): UserResponse

    @POST("api/auth/logout")
    suspend fun logout()

    @GET("api/auth/users")
    suspend fun users(): List<UserResponse>

    @POST("api/auth/users")
    suspend fun createUser(@retrofit2.http.Body body: UserCreate): UserResponse

    @PATCH("api/auth/users/{user_id}")
    suspend fun updateUser(
        @Path("user_id") userId: Int,
        @retrofit2.http.Body body: UserUpdate
    ): UserResponse
}
