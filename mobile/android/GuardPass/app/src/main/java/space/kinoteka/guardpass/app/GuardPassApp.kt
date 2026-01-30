package space.kinoteka.guardpass.app

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import space.kinoteka.guardpass.data.auth.MenuPermissionSet
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.api.AuthApi
import space.kinoteka.guardpass.data.api.PropuskApi
import space.kinoteka.guardpass.data.api.ReferenceApi
import space.kinoteka.guardpass.data.api.SettingsApi
import space.kinoteka.guardpass.data.api.TemporaryPassApi
import space.kinoteka.guardpass.data.dto.UserResponse
import space.kinoteka.guardpass.data.store.TokenHolder
import space.kinoteka.guardpass.data.store.TokenStore
import space.kinoteka.guardpass.ui.login.LoginScreen
import space.kinoteka.guardpass.ui.navigation.AppShell

private data class ApiBundle(
    val auth: AuthApi,
    val temp: TemporaryPassApi,
    val ref: ReferenceApi,
    val propusk: PropuskApi,
    val settings: SettingsApi
)

@Composable
fun GuardPassApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val tokenStore = remember { TokenStore(context) }
    val tokenHolder = remember { TokenHolder() }

    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var isAuthed by remember { mutableStateOf(false) }
    var user by remember { mutableStateOf<UserResponse?>(null) }

    val apis = remember {
        val logger = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
        val client = OkHttpClient.Builder()
            .addInterceptor(logger)
            .addInterceptor { chain ->
                val token = tokenHolder.get()
                val req = if (!token.isNullOrBlank()) {
                    chain.request().newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else chain.request()
                chain.proceed(req)
            }
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl("https://parking.kinoteka.space/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        ApiBundle(
            auth = retrofit.create(AuthApi::class.java),
            temp = retrofit.create(TemporaryPassApi::class.java),
            ref = retrofit.create(ReferenceApi::class.java),
            propusk = retrofit.create(PropuskApi::class.java),
            settings = retrofit.create(SettingsApi::class.java)
        )
    }
    val authApi = apis.auth
    val passApi = apis.temp
    val refApi = apis.ref
    val propuskApi = apis.propusk
    val settingsApi = apis.settings

    fun computePermissions(info: UserResponse?): PermissionSet {
        if (info == null) return PermissionSet()
        if (info.role == "admin") {
            return PermissionSet(
                canViewPropusks = true,
                canCreatePropusks = true,
                canEditPropusks = true,
                canActivatePropusks = true,
                canDeletePropusks = true,
                canAnnulPropusks = true,
                canMarkDelete = true,
                canDownloadPropuskPdf = true,
                canEditOrganizations = true,
                canManageUsers = true,
                canViewPasses = true,
                canCreatePass = true,
                canEditPass = true,
                canDownloadPdf = true
            )
        }

        val perms = info.permissions.orEmpty()
        fun has(key: String) = perms[key] == true

        return PermissionSet(
            canViewPropusks = has("view"),
            canCreatePropusks = has("create"),
            canEditPropusks = has("edit"),
            canActivatePropusks = has("activate"),
            canDeletePropusks = has("delete"),
            canAnnulPropusks = has("annul"),
            canMarkDelete = has("mark_delete"),
            canDownloadPropuskPdf = has("download_pdf"),
            canEditOrganizations = has("edit_organization"),
            canManageUsers = info.role == "admin",
            canViewPasses = has("menu_propusks") || has("menu_temporary") || has("temp_view_all") || has("view"),
            canCreatePass = has("temp_create") || has("menu_create_pass") || has("create"),
            canEditPass = has("edit") || has("activate"),
            canDownloadPdf = has("temp_download") || has("download_pdf")
        )
    }

    val permissions = remember(user) { computePermissions(user) }

    fun computeMenuPermissions(info: UserResponse?): MenuPermissionSet {
        if (info == null) return MenuPermissionSet()
        if (info.role == "admin") {
            return MenuPermissionSet(
                home = true,
                propusks = true,
                temporary = true,
                references = true,
                reports = true,
                users = true,
                settings = true,
                print = true
            )
        }
        val perms = info.permissions.orEmpty()
        fun has(key: String) = perms[key] == true
        return MenuPermissionSet(
            home = has("menu_home"),
            propusks = has("menu_propusks"),
            temporary = has("menu_temporary"),
            references = has("menu_references"),
            reports = has("menu_reports"),
            users = has("menu_users"),
            settings = has("menu_settings"),
            print = has("menu_print")
        )
    }

    val menuPermissions = remember(user) { computeMenuPermissions(user) }

    LaunchedEffect(Unit) {
        val saved = tokenStore.get()
        tokenHolder.set(saved)
        if (saved.isNullOrBlank()) {
            isAuthed = false
            user = null
            return@LaunchedEffect
        }

        busy = true
        error = null
        try {
            val info = authApi.me()
            if (!info.is_active) {
                tokenStore.clear()
                tokenHolder.set(null)
                isAuthed = false
                user = null
                error = "Пользователь не активен"
            } else {
                user = info
                isAuthed = true
                error = null
            }
        } catch (t: Throwable) {
            tokenStore.clear()
            tokenHolder.set(null)
            isAuthed = false
            user = null
            error = t.message ?: t::class.java.simpleName
        } finally {
            busy = false
        }
    }

    MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
            if (!isAuthed) {
                LoginScreen(
                    busy = busy,
                    error = error,
                    onLogin = { username, password ->
                        busy = true
                        error = null
                        scope.launch {
                            try {
                                val res = authApi.login(username = username, password = password)
                                tokenStore.save(res.access_token)
                                tokenHolder.set(res.access_token)
                                val info = authApi.me()
                                if (!info.is_active) {
                                    tokenStore.clear()
                                    tokenHolder.set(null)
                                    isAuthed = false
                                    user = null
                                    error = "Пользователь не активен"
                                } else {
                                    user = info
                                    isAuthed = true
                                    error = null
                                }
                            } catch (t: Throwable) {
                                tokenStore.clear()
                                tokenHolder.set(null)
                                user = null
                                error = t.message ?: t::class.java.simpleName
                            } finally {
                                busy = false
                            }
                        }
                    }
                )
            } else {
                AppShell(
                    authApi = authApi,
                    passApi = passApi,
                    refApi = refApi,
                    propuskApi = propuskApi,
                    settingsApi = settingsApi,
                    permissions = permissions,
                    menuPermissions = menuPermissions,
                    busy = busy,
                    error = error,
                    setBusy = { busy = it },
                    setError = { error = it },
                    onLogout = {
                        busy = true
                        error = null
                        scope.launch {
                            try {
                                runCatching { authApi.logout() }
                                tokenStore.clear()
                                tokenHolder.set(null)
                                isAuthed = false
                                user = null
                            } catch (t: Throwable) {
                                error = t.message ?: t::class.java.simpleName
                            } finally {
                                busy = false
                            }
                        }
                    }
                )
            }
        }
    }
}
