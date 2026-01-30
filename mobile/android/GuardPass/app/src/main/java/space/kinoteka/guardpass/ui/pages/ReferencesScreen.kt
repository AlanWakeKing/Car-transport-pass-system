@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package space.kinoteka.guardpass.ui.pages

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import retrofit2.HttpException
import space.kinoteka.guardpass.data.api.ReferenceApi
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.dto.AbonentCreate
import space.kinoteka.guardpass.data.dto.AbonentResponse
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
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

private enum class RefTab(val title: String) {
    ORGS("Организации"),
    DRIVERS("Водители"),
    MARKS("Марки"),
    MODELS("Модели")
}

@Composable
fun ReferencesScreen(
    refApi: ReferenceApi,
    permissions: PermissionSet,
    hasAccess: Boolean
) {
    val scope = rememberCoroutineScope()

    var selected by remember { mutableStateOf(RefTab.ORGS) }
    var orgs by remember { mutableStateOf<List<Organization>>(emptyList()) }
    var marks by remember { mutableStateOf<List<MarkAutoResponse>>(emptyList()) }
    var models by remember { mutableStateOf<List<ModelAutoResponse>>(emptyList()) }
    val driversPages = remember { androidx.compose.runtime.mutableStateMapOf<Int, List<AbonentResponse>>() }
    var driversTotal by remember { mutableStateOf(0) }
    val driversLimit = 20
    val driversPageCount = remember(driversTotal) {
        kotlin.math.max(1, kotlin.math.ceil(driversTotal / driversLimit.toDouble()).toInt())
    }
    val driversPagerState = rememberPagerState(initialPage = 0, pageCount = { driversPageCount })

    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    var showOrgDialog by remember { mutableStateOf(false) }
    var editOrg by remember { mutableStateOf<Organization?>(null) }

    var showMarkDialog by remember { mutableStateOf(false) }
    var editMark by remember { mutableStateOf<MarkAutoResponse?>(null) }

    var showModelDialog by remember { mutableStateOf(false) }
    var editModel by remember { mutableStateOf<ModelAutoResponse?>(null) }

    var showDriverDialog by remember { mutableStateOf(false) }
    var editDriver by remember { mutableStateOf<AbonentResponse?>(null) }

    fun formatError(t: Throwable): String {
        if (t is HttpException) {
            val code = t.code()
            val body = try { t.response()?.errorBody()?.string() } catch (_: Throwable) { null }
            if (!body.isNullOrBlank()) return "HTTP $code: $body"
        }
        return t.message ?: t::class.java.simpleName
    }

    suspend fun loadAll() {
        busy = true
        error = null
        try {
            orgs = refApi.organizations()
            marks = refApi.marks()
            models = refApi.models()
        } catch (t: Throwable) {
            error = formatError(t)
        } finally {
            busy = false
        }
    }

    suspend fun loadDriversPage(page: Int) {
        try {
            val resp = refApi.abonentsPaged(skip = page * driversLimit, limit = driversLimit)
            driversPages[page] = resp.items
            driversTotal = resp.total
        } catch (t: Throwable) {
            error = formatError(t)
        }
    }

    LaunchedEffect(hasAccess) {
        if (hasAccess) {
            loadAll()
            loadDriversPage(0)
        }
    }

    LaunchedEffect(driversPagerState.currentPage, hasAccess) {
        if (hasAccess) {
            loadDriversPage(driversPagerState.currentPage)
        }
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
        if (!hasAccess) {
            Text("Нет доступа", color = MaterialTheme.colorScheme.error)
            return
        }

        if (error != null) {
            Text("Ошибка: $error", color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
        }

        ScrollableTabRow(
            selectedTabIndex = selected.ordinal,
            edgePadding = 0.dp
        ) {
            RefTab.values().forEach { tab ->
                Tab(
                    selected = selected == tab,
                    onClick = { selected = tab },
                    text = { Text(tab.title) }
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        when (selected) {
            RefTab.ORGS -> {
                if (permissions.canEditOrganizations) {
                    Button(onClick = { editOrg = null; showOrgDialog = true }) {
                        Text("Добавить организацию")
                    }
                    Spacer(Modifier.height(8.dp))
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(orgs) { org ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(org.org_name, style = MaterialTheme.typography.titleMedium)
                                Text("Свободно: ${org.free_mesto} из ${org.free_mesto_limit ?: "-"}")
                                if (!org.comment.isNullOrBlank()) Text("Комментарий: ${org.comment}")
                                if (permissions.canEditOrganizations) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { editOrg = org; showOrgDialog = true }) {
                                            Text("Изменить")
                                        }
                                        OutlinedButton(onClick = {
                                            scope.launch {
                                                try {
                                                    refApi.deleteOrganization(org.id_org)
                                                    loadAll()
                                                } catch (t: Throwable) {
                                                    error = formatError(t)
                                                }
                                            }
                                        }) { Text("Удалить") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            RefTab.MARKS -> {
                if (permissions.canManageUsers) {
                    Button(onClick = { editMark = null; showMarkDialog = true }) {
                        Text("Добавить марку")
                    }
                    Spacer(Modifier.height(8.dp))
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(marks) { mark ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(mark.mark_name, style = MaterialTheme.typography.titleMedium)
                                Text("ID ${mark.id_mark}")
                                if (permissions.canManageUsers) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { editMark = mark; showMarkDialog = true }) {
                                            Text("Изменить")
                                        }
                                        OutlinedButton(onClick = {
                                            scope.launch {
                                                try {
                                                    refApi.deleteMark(mark.id_mark)
                                                    loadAll()
                                                } catch (t: Throwable) {
                                                    error = formatError(t)
                                                }
                                            }
                                        }) { Text("Удалить") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            RefTab.MODELS -> {
                if (permissions.canManageUsers) {
                    Button(onClick = { editModel = null; showModelDialog = true }) {
                        Text("Добавить модель")
                    }
                    Spacer(Modifier.height(8.dp))
                }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(models) { model ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(model.model_name, style = MaterialTheme.typography.titleMedium)
                                Text("Марка: ${model.mark_name ?: "ID ${model.id_mark}"}")
                                Text("ID ${model.id_model}")
                                if (permissions.canManageUsers) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { editModel = model; showModelDialog = true }) {
                                            Text("Изменить")
                                        }
                                        OutlinedButton(onClick = {
                                            scope.launch {
                                                try {
                                                    refApi.deleteModel(model.id_model)
                                                    loadAll()
                                                } catch (t: Throwable) {
                                                    error = formatError(t)
                                                }
                                            }
                                        }) { Text("Удалить") }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            RefTab.DRIVERS -> {
                if (permissions.canEditOrganizations) {
                    Button(onClick = { editDriver = null; showDriverDialog = true }) {
                        Text("Добавить водителя")
                    }
                    Spacer(Modifier.height(8.dp))
                }
                val currentPage = driversPagerState.currentPage + 1
                Text("Страница $currentPage из $driversPageCount")
                Spacer(Modifier.height(8.dp))

                HorizontalPager(state = driversPagerState) { page ->
                    val pageDrivers = driversPages[page] ?: emptyList()
                    if (pageDrivers.isEmpty() && !busy) {
                        Text("Нет записей")
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(pageDrivers) { driver ->
                                Card(Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(12.dp)) {
                                        Text(driver.full_name, style = MaterialTheme.typography.titleMedium)
                                        Text("Организация: ${driver.org_name ?: "-"}")
                                        Text("Комментарий: ${driver.info ?: "-"}")
                                        if (permissions.canEditOrganizations) {
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                OutlinedButton(onClick = { editDriver = driver; showDriverDialog = true }) {
                                                    Text("Изменить")
                                                }
                                                OutlinedButton(onClick = {
                                                    scope.launch {
                                                        try {
                                                            refApi.deleteAbonent(driver.id_fio)
                                                            loadDriversPage(driversPagerState.currentPage)
                                                        } catch (t: Throwable) {
                                                            error = formatError(t)
                                                        }
                                                    }
                                                }) { Text("Удалить") }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        }
    }

    if (showOrgDialog) {
        OrganizationDialog(
            editing = editOrg,
            onDismiss = { showOrgDialog = false },
            onSubmit = { name, free, limit, comment ->
                scope.launch {
                    try {
                        if (editOrg == null) {
                            refApi.createOrganization(OrganizCreate(name, free, limit, comment))
                        } else {
                            refApi.updateOrganization(editOrg!!.id_org, OrganizUpdate(name, free, limit, comment))
                        }
                        showOrgDialog = false
                        loadAll()
                    } catch (t: Throwable) {
                        error = formatError(t)
                    }
                }
            }
        )
    }

    if (showMarkDialog) {
        SimpleNameDialog(
            title = if (editMark == null) "Новая марка" else "Марка",
            value = editMark?.mark_name ?: "",
            onDismiss = { showMarkDialog = false },
            onSubmit = { name ->
                scope.launch {
                    try {
                        if (editMark == null) {
                            refApi.createMark(MarkAutoCreate(name))
                        } else {
                            refApi.updateMark(editMark!!.id_mark, MarkAutoUpdate(name))
                        }
                        showMarkDialog = false
                        loadAll()
                    } catch (t: Throwable) {
                        error = formatError(t)
                    }
                }
            }
        )
    }

    if (showModelDialog) {
        ModelDialog(
            editing = editModel,
            marks = marks,
            onDismiss = { showModelDialog = false },
            onSubmit = { markId, name ->
                scope.launch {
                    try {
                        if (editModel == null) {
                            refApi.createModel(ModelAutoCreate(markId, name))
                        } else {
                            refApi.updateModel(editModel!!.id_model, ModelAutoUpdate(markId, name))
                        }
                        showModelDialog = false
                        loadAll()
                    } catch (t: Throwable) {
                        error = formatError(t)
                    }
                }
            }
        )
    }

    if (showDriverDialog) {
        DriverDialog(
            editing = editDriver,
            orgs = orgs,
            onDismiss = { showDriverDialog = false },
            onSubmit = { surname, name, otchestvo, orgId, info ->
                scope.launch {
                    try {
                        if (editDriver == null) {
                            refApi.createAbonent(AbonentCreate(surname, name, otchestvo, orgId, info))
                        } else {
                            refApi.updateAbonent(
                                editDriver!!.id_fio,
                                AbonentUpdate(surname, name, otchestvo, orgId, info)
                            )
                        }
                        showDriverDialog = false
                        loadAll()
                    } catch (t: Throwable) {
                        error = formatError(t)
                    }
                }
            }
        )
    }
}

@Composable
private fun OrganizationDialog(
    editing: Organization?,
    onDismiss: () -> Unit,
    onSubmit: (String, Int, Int?, String?) -> Unit
) {
    var name by remember { mutableStateOf(editing?.org_name ?: "") }
    var free by remember { mutableStateOf(editing?.free_mesto?.toString() ?: "0") }
    var limit by remember { mutableStateOf(editing?.free_mesto_limit?.toString() ?: "") }
    var comment by remember { mutableStateOf(editing?.comment ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "Новая организация" else "Организация") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Название") })
                OutlinedTextField(value = free, onValueChange = { free = it }, label = { Text("Свободно") })
                OutlinedTextField(value = limit, onValueChange = { limit = it }, label = { Text("Лимит") })
                OutlinedTextField(value = comment, onValueChange = { comment = it }, label = { Text("Комментарий") })
            }
        },
        confirmButton = {
            Button(onClick = {
                val freeInt = free.toIntOrNull() ?: 0
                val limitInt = limit.toIntOrNull()
                onSubmit(name.trim(), freeInt, limitInt, comment.trim().ifBlank { null })
            }) { Text("Сохранить") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Отмена") } }
    )
}

@Composable
private fun SimpleNameDialog(
    title: String,
    value: String,
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit
) {
    var name by remember { mutableStateOf(value) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Название") }) },
        confirmButton = { Button(onClick = { onSubmit(name.trim()) }) { Text("Сохранить") } },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Отмена") } }
    )
}

@Composable
private fun ModelDialog(
    editing: ModelAutoResponse?,
    marks: List<MarkAutoResponse>,
    onDismiss: () -> Unit,
    onSubmit: (Int, String) -> Unit
) {
    var name by remember { mutableStateOf(editing?.model_name ?: "") }
    var markId by remember { mutableStateOf(editing?.id_mark ?: marks.firstOrNull()?.id_mark) }
    var markMenuOpen by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "Новая модель" else "Модель") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Модель") })
                Box(Modifier.fillMaxWidth()) {
                    val selected = marks.firstOrNull { it.id_mark == markId }?.mark_name ?: "Выбрать марку"
                    OutlinedTextField(
                        value = selected,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Марка") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    DropdownMenu(
                        expanded = markMenuOpen,
                        onDismissRequest = { markMenuOpen = false }
                    ) {
                        marks.forEach { mark ->
                            DropdownMenuItem(
                                text = { Text(mark.mark_name) },
                                onClick = {
                                    markId = mark.id_mark
                                    markMenuOpen = false
                                }
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable { markMenuOpen = true }
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(markId ?: 0, name.trim()) }) { Text("Сохранить") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Отмена") } }
    )
}

@Composable
private fun DriverDialog(
    editing: AbonentResponse?,
    orgs: List<Organization>,
    onDismiss: () -> Unit,
    onSubmit: (String, String, String?, Int, String?) -> Unit
) {
    var surname by remember { mutableStateOf(editing?.surname ?: "") }
    var name by remember { mutableStateOf(editing?.name ?: "") }
    var otchestvo by remember { mutableStateOf(editing?.otchestvo ?: "") }
    var info by remember { mutableStateOf(editing?.info ?: "") }
    var orgId by remember { mutableStateOf(editing?.id_org ?: orgs.firstOrNull()?.id_org) }
    var orgMenuOpen by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "Новый водитель" else "Водитель") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = surname, onValueChange = { surname = it }, label = { Text("Фамилия") })
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Имя") })
                OutlinedTextField(value = otchestvo, onValueChange = { otchestvo = it }, label = { Text("Отчество") })
                OutlinedTextField(value = info, onValueChange = { info = it }, label = { Text("Комментарий") })
                Box(Modifier.fillMaxWidth()) {
                    val selected = orgs.firstOrNull { it.id_org == orgId }?.org_name ?: "Выбрать организацию"
                    OutlinedTextField(
                        value = selected,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Организация") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    DropdownMenu(
                        expanded = orgMenuOpen,
                        onDismissRequest = { orgMenuOpen = false }
                    ) {
                        orgs.forEach { org ->
                            DropdownMenuItem(
                                text = { Text(org.org_name) },
                                onClick = {
                                    orgId = org.id_org
                                    orgMenuOpen = false
                                }
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable { orgMenuOpen = true }
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                onSubmit(
                    surname.trim(),
                    name.trim(),
                    otchestvo.trim().ifBlank { null },
                    orgId ?: 0,
                    info.trim().ifBlank { null }
                )
            }) { Text("Сохранить") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Отмена") } }
    )
}
