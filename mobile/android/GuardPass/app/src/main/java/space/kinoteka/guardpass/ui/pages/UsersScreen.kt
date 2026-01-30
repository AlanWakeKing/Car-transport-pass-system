@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package space.kinoteka.guardpass.ui.pages

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import retrofit2.HttpException
import space.kinoteka.guardpass.data.api.AuthApi
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.dto.UserCreate
import space.kinoteka.guardpass.data.dto.UserResponse
import space.kinoteka.guardpass.data.dto.UserUpdate
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

private val userRoles = listOf("admin", "manager", "guard", "viewer")
private data class PermissionItem(val key: String, val label: String)
private data class PermissionGroup(val title: String, val items: List<PermissionItem>)

private val permissionGroups = listOf(
    PermissionGroup(
        "Базовые",
        listOf(
            PermissionItem("view", "Просмотр"),
            PermissionItem("create", "Создание"),
            PermissionItem("edit", "Редактирование"),
            PermissionItem("delete", "Удаление"),
            PermissionItem("annul", "Аннулирование"),
            PermissionItem("mark_delete", "На удаление"),
            PermissionItem("activate", "Активация"),
            PermissionItem("edit_organization", "Редактировать организации"),
            PermissionItem("download_pdf", "Скачивание PDF")
        )
    ),
    PermissionGroup(
        "Меню",
        listOf(
            PermissionItem("menu_home", "Главная"),
            PermissionItem("menu_propusks", "Пропуска"),
            PermissionItem("menu_temporary", "Временные"),
            PermissionItem("menu_references", "Справочники"),
            PermissionItem("menu_print", "Печать"),
            PermissionItem("menu_reports", "Отчеты"),
            PermissionItem("menu_users", "Пользователи"),
            PermissionItem("menu_settings", "Настройки"),
            PermissionItem("menu_create_pass", "Создание пропуска"),
            PermissionItem("menu_edit_pass", "Редактирование пропуска"),
            PermissionItem("menu_history", "История")
        )
    ),
    PermissionGroup(
        "Временные пропуска",
        listOf(
            PermissionItem("temp_create", "Создание"),
            PermissionItem("temp_delete", "Удаление"),
            PermissionItem("temp_download", "Скачивание"),
            PermissionItem("temp_view_all", "Просмотр всех")
        )
    )
)

@Composable
fun UsersScreen(
    authApi: AuthApi,
    permissions: PermissionSet
) {
    val scope = rememberCoroutineScope()

    var users by remember { mutableStateOf<List<UserResponse>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    var showDialog by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<UserResponse?>(null) }

    fun formatError(t: Throwable): String {
        if (t is HttpException) {
            val code = t.code()
            val body = try { t.response()?.errorBody()?.string() } catch (_: Throwable) { null }
            if (!body.isNullOrBlank()) return "HTTP $code: $body"
        }
        return t.message ?: t::class.java.simpleName
    }

    suspend fun loadUsers() {
        busy = true
        error = null
        try {
            users = authApi.users()
        } catch (t: Throwable) {
            error = formatError(t)
        } finally {
            busy = false
        }
    }

    LaunchedEffect(Unit) {
        if (permissions.canManageUsers) loadUsers()
    }

    val padding = adaptiveContentPadding()
    val maxWidth = adaptiveMaxWidth()

    Box(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .then(if (maxWidth != null) Modifier.widthIn(max = maxWidth).align(Alignment.TopCenter) else Modifier)
        ) {
        if (!permissions.canManageUsers) {
            Text("Нет доступа", color = MaterialTheme.colorScheme.error)
            return
        }

        if (error != null) {
            Text("Ошибка: $error", color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
        }

        Button(onClick = { editing = null; showDialog = true }, enabled = !busy) {
            Text("Добавить пользователя")
        }
        Spacer(Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(users) { user ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(user.full_name, style = MaterialTheme.typography.titleMedium)
                        Text("Логин: ${user.username}")
                        Text("Роль: ${user.role}")
                        Text("Активен: ${if (user.is_active) "Да" else "Нет"}")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { editing = user; showDialog = true }) {
                                Text("Изменить")
                            }
                        }
                    }
                }
            }
        }
        }
    }

    if (showDialog) {
        UserDialog(
            editing = editing,
            onDismiss = { showDialog = false },
            onSubmit = { form ->
                scope.launch {
                    busy = true
                    error = null
                    try {
                        if (editing == null) {
                            authApi.createUser(
                                UserCreate(
                                    username = form.username,
                                    full_name = form.fullName,
                                    role = form.role,
                                    tg_user_id = form.tgUserId,
                                    password = form.password,
                                    permissions = form.permissions
                                )
                            )
                        } else {
                            authApi.updateUser(
                                editing!!.id,
                                UserUpdate(
                                    full_name = form.fullName,
                                    role = form.role,
                                    is_active = form.isActive,
                                    password = form.password.ifBlank { null },
                                    tg_user_id = form.tgUserId,
                                    permissions = form.permissions
                                )
                            )
                        }
                        showDialog = false
                        loadUsers()
                    } catch (t: Throwable) {
                        error = formatError(t)
                    } finally {
                        busy = false
                    }
                }
            }
        )
    }
}

private data class UserForm(
    val username: String,
    val fullName: String,
    val role: String,
    val password: String,
    val isActive: Boolean,
    val tgUserId: Long?,
    val permissions: Map<String, Boolean>?
)

@Composable
private fun UserDialog(
    editing: UserResponse?,
    onDismiss: () -> Unit,
    onSubmit: (UserForm) -> Unit
) {
    var username by remember { mutableStateOf(editing?.username ?: "") }
    var fullName by remember { mutableStateOf(editing?.full_name ?: "") }
    var role by remember { mutableStateOf(editing?.role ?: "viewer") }
    var password by remember { mutableStateOf("") }
    var isActive by remember { mutableStateOf(editing?.is_active ?: true) }
    var tgUserId by remember { mutableStateOf(editing?.tg_user_id?.toString() ?: "") }
    val permissions = remember {
        mutableStateMapOf<String, Boolean>().apply {
            val existing = editing?.permissions.orEmpty()
            permissionGroups.flatMap { it.items }.forEach { item ->
                this[item.key] = existing[item.key] == true
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "Новый пользователь" else "Пользователь") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Логин") },
                    enabled = editing == null
                )
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("ФИО") }
                )
                OutlinedTextField(
                    value = role,
                    onValueChange = { role = it },
                    label = { Text("Роль (${userRoles.joinToString(", ")})") }
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text(if (editing == null) "Пароль" else "Новый пароль") }
                )
                OutlinedTextField(
                    value = tgUserId,
                    onValueChange = { tgUserId = it },
                    label = { Text("Telegram ID (опционально)") }
                )
                if (editing != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Активен")
                        Switch(checked = isActive, onCheckedChange = { isActive = it })
                    }
                }
                Text("Права", style = MaterialTheme.typography.titleSmall)
                permissionGroups.forEach { group ->
                    Text(group.title, style = MaterialTheme.typography.labelMedium)
                    group.items.forEach { item ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Checkbox(
                                checked = permissions[item.key] == true,
                                onCheckedChange = { permissions[item.key] = it }
                            )
                            Text(item.label)
                        }
                    }
                }
            }
        },
        confirmButton = {
            val canSubmit = username.isNotBlank() && fullName.isNotBlank() && (editing != null || password.length >= 6)
            Button(
                enabled = canSubmit,
                onClick = {
                    onSubmit(
                        UserForm(
                            username = username.trim(),
                            fullName = fullName.trim(),
                            role = role.trim().ifBlank { "viewer" },
                            password = password,
                            isActive = isActive,
                            tgUserId = tgUserId.toLongOrNull(),
                            permissions = permissions.toMap()
                        )
                    )
                }
            ) { Text("Сохранить") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Отмена") } }
    )
}
