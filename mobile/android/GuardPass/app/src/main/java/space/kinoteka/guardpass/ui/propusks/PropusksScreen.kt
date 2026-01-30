@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package space.kinoteka.guardpass.ui.propusks

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
//import androidx.compose.foundation.layout.matchParentSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import java.io.File
import kotlin.math.ceil
import kotlin.math.max
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import retrofit2.HttpException
import space.kinoteka.guardpass.data.api.PropuskApi
import space.kinoteka.guardpass.data.api.ReferenceApi
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.dto.AbonentResponse
import space.kinoteka.guardpass.data.dto.MarkAutoResponse
import space.kinoteka.guardpass.data.dto.ModelAutoResponse
import space.kinoteka.guardpass.data.dto.Organization
import space.kinoteka.guardpass.data.dto.PropuskCreate
import space.kinoteka.guardpass.data.dto.PropuskResponse
import space.kinoteka.guardpass.data.dto.PropuskUpdate
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

private val statusLabels = mapOf(
    "draft" to "Черновик",
    "active" to "Активен",
    "pending_delete" to "На удаление",
    "revoked" to "Аннулирован"
)

@Composable
fun PropusksScreen(
    propuskApi: PropuskApi,
    refApi: ReferenceApi,
    permissions: PermissionSet,
    busy: Boolean,
    error: String?,
    setBusy: (Boolean) -> Unit,
    setError: (String?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var search by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf<String?>(null) }
    var statusMenuOpen by remember { mutableStateOf(false) }

    var orgs by remember { mutableStateOf<List<Organization>>(emptyList()) }
    var marks by remember { mutableStateOf<List<MarkAutoResponse>>(emptyList()) }
    var models by remember { mutableStateOf<List<ModelAutoResponse>>(emptyList()) }
    var abonents by remember { mutableStateOf<List<AbonentResponse>>(emptyList()) }

    var showForm by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<PropuskResponse?>(null) }

    val pageItems = remember { mutableStateMapOf<Int, List<PropuskResponse>>() }
    var total by remember { mutableStateOf(0) }
    val limit = 50
    val pageCount = remember(total) { max(1, ceil(total / limit.toDouble()).toInt()) }
    val pagerState = rememberPagerState(initialPage = 0, pageCount = { pageCount })
    val isTablet = LocalConfiguration.current.screenWidthDp >= 600

    fun openPdfFile(file: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
        val pm = context.packageManager

        val googleIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            setPackage("com.google.android.apps.pdfviewer")
        }

        if (googleIntent.resolveActivity(pm) != null) {
            context.startActivity(googleIntent)
        } else {
            val chooser = Intent.createChooser(
                Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/pdf")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                },
                "Open PDF"
            )
            if (chooser.resolveActivity(pm) != null) {
                context.startActivity(chooser)
            } else {
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(share, "Share PDF"))
            }
        }
    }

    fun formatError(t: Throwable): String {
        if (t is HttpException) {
            val code = t.code()
            val body = try { t.response()?.errorBody()?.string() } catch (_: Throwable) { null }
            if (!body.isNullOrBlank()) {
                return "HTTP $code: $body"
            }
        }
        return t.message ?: t::class.java.simpleName
    }

    suspend fun loadPage(page: Int) {
        if (!permissions.canViewPropusks) return
        setBusy(true)
        setError(null)
        try {
            val skip = page * limit
            val response = propuskApi.listPaged(
                status = statusFilter,
                search = search.trim().ifBlank { null },
                skip = skip,
                limit = limit
            )
            total = response.total
            pageItems[page] = response.items
        } catch (t: Throwable) {
            setError(formatError(t))
        } finally {
            setBusy(false)
        }
    }

    suspend fun loadReferences() {
        try {
            orgs = refApi.organizations()
            marks = refApi.marks()
            abonents = refApi.abonents()
        } catch (t: Throwable) {
            setError(formatError(t))
        }
    }

    suspend fun loadModels(markId: Int?) {
        if (markId == null) {
            models = emptyList()
            return
        }
        try {
            models = refApi.models(markId)
        } catch (t: Throwable) {
            setError(formatError(t))
        }
    }

    LaunchedEffect(statusFilter, search) {
        pageItems.clear()
        total = 0
        pagerState.scrollToPage(0)
        loadPage(0)
    }

    LaunchedEffect(pagerState.currentPage) {
        val page = pagerState.currentPage
        if (!pageItems.containsKey(page)) {
            loadPage(page)
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(15_000)
            if (!busy) {
                val page = pagerState.currentPage
                loadPage(page)
            }
        }
    }

    LaunchedEffect(Unit) {
        loadReferences()
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
            if (error != null) {
                Text("Ошибка: $error", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
            }

        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            label = { Text("Поиск по номеру или ФИО") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(10.dp))

        Box(Modifier.fillMaxWidth()) {
            val statusLabel = statusFilter?.let { statusLabels[it] } ?: "Все статусы"
            OutlinedTextField(
                value = statusLabel,
                onValueChange = {},
                readOnly = true,
                label = { Text("Статус") },
                modifier = Modifier.fillMaxWidth()
            )
            DropdownMenu(
                expanded = statusMenuOpen,
                onDismissRequest = { statusMenuOpen = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Все статусы") },
                    onClick = {
                        statusFilter = null
                        statusMenuOpen = false
                    }
                )
                statusLabels.forEach { (value, label) ->
                    DropdownMenuItem(
                        text = { Text(label) },
                        onClick = {
                            statusFilter = value
                            statusMenuOpen = false
                        }
                    )
                }
            }
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .clickable { statusMenuOpen = true }
            )
        }

        Spacer(Modifier.height(12.dp))

        if (!permissions.canViewPropusks) {
            Text("Нет прав на просмотр пропусков", color = MaterialTheme.colorScheme.error)
            return
        }

        val currentPage = pagerState.currentPage + 1
        Text("Страница $currentPage из $pageCount")
        Spacer(Modifier.height(8.dp))

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f)
        ) { page ->
            val itemsForPage = pageItems[page] ?: emptyList()
            if (itemsForPage.isEmpty() && !busy) {
                Text("Нет пропусков")
            } else {
                if (isTablet) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(itemsForPage) { item ->
                            PropuskCard(
                                propusk = item,
                                permissions = permissions,
                                busy = busy,
                                onEdit = {
                                    editing = item
                                    scope.launch { loadModels(item.id_mark_auto) }
                                    showForm = true
                                },
                                onActivate = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.activate(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onRestore = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.restore(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onRevoke = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.revoke(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onMarkDelete = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.markDelete(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onArchive = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.archive(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onPdf = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            val body = propuskApi.pdf(item.id_propusk)
                                            val file = File(context.cacheDir, "propusk_${item.id_propusk}.pdf")
                                            file.outputStream().use { out ->
                                                body.byteStream().use { input -> input.copyTo(out) }
                                            }
                                            openPdfFile(file)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                }
                            )
                        }
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(itemsForPage) { item ->
                            PropuskCard(
                                propusk = item,
                                permissions = permissions,
                                busy = busy,
                                onEdit = {
                                    editing = item
                                    scope.launch { loadModels(item.id_mark_auto) }
                                    showForm = true
                                },
                                onActivate = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.activate(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onRestore = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.restore(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onRevoke = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.revoke(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onMarkDelete = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.markDelete(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onArchive = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            propuskApi.archive(item.id_propusk)
                                            loadPage(page)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                },
                                onPdf = {
                                    setBusy(true)
                                    setError(null)
                                    scope.launch {
                                        try {
                                            val body = propuskApi.pdf(item.id_propusk)
                                            val file = File(context.cacheDir, "propusk_${item.id_propusk}.pdf")
                                            file.outputStream().use { out ->
                                                body.byteStream().use { input -> input.copyTo(out) }
                                            }
                                            openPdfFile(file)
                                        } catch (t: Throwable) {
                                            setError(formatError(t))
                                        } finally {
                                            setBusy(false)
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OutlinedButton(
                enabled = pagerState.currentPage > 0,
                onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } }
            ) { Text("Назад") }

            Button(
                enabled = pagerState.currentPage < pageCount - 1,
                onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) } }
            ) { Text("Вперёд") }
        }

        }

        if (permissions.canCreatePropusks) {
            FloatingActionButton(
                onClick = {
                    editing = null
                    showForm = true
                },
                modifier = Modifier
                    .align(androidx.compose.ui.Alignment.BottomEnd)
                    .padding(8.dp)
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Создать пропуск")
            }
        }
    }

    if (showForm) {
        PropuskFormDialog(
            editing = editing,
            orgs = orgs,
            marks = marks,
            models = models,
            abonents = abonents,
            onDismiss = { showForm = false },
            onMarkSelected = { markId -> scope.launch { loadModels(markId) } },
            onSubmit = { form ->
                setBusy(true)
                setError(null)
                scope.launch {
                    try {
                        if (form.id != null) {
                            propuskApi.update(
                                form.id,
                                PropuskUpdate(
                                    gos_id = form.gosId,
                                    id_mark_auto = form.markId,
                                    id_model_auto = form.modelId,
                                    id_org = form.orgId,
                                    pass_type = "drive",
                                    release_date = form.releaseDate,
                                    valid_until = form.validUntil,
                                    id_fio = form.abonentId,
                                    info = form.info
                                )
                            )
                        } else {
                            propuskApi.create(
                                PropuskCreate(
                                    gos_id = form.gosId ?: "",
                                    id_mark_auto = form.markId ?: 0,
                                    id_model_auto = form.modelId ?: 0,
                                    id_org = form.orgId ?: 0,
                                    release_date = form.releaseDate ?: "",
                                    valid_until = form.validUntil ?: "",
                                    id_fio = form.abonentId ?: 0,
                                    info = form.info
                                )
                            )
                        }
                        showForm = false
                        loadPage(pagerState.currentPage)
                    } catch (t: Throwable) {
                        setError(formatError(t))
                    } finally {
                        setBusy(false)
                    }
                }
            }
        )
    }
}

private data class PropuskFormState(
    val id: Int? = null,
    val gosId: String? = null,
    val orgId: Int? = null,
    val markId: Int? = null,
    val modelId: Int? = null,
    val abonentId: Int? = null,
    val releaseDate: String? = null,
    val validUntil: String? = null,
    val info: String? = null
)

@Composable
private fun PropuskFormDialog(
    editing: PropuskResponse?,
    orgs: List<Organization>,
    marks: List<MarkAutoResponse>,
    models: List<ModelAutoResponse>,
    abonents: List<AbonentResponse>,
    onDismiss: () -> Unit,
    onMarkSelected: (Int?) -> Unit,
    onSubmit: (PropuskFormState) -> Unit
) {
    var gosId by remember { mutableStateOf(editing?.gos_id ?: "") }
    var orgId by remember { mutableStateOf(editing?.id_org) }
    var markId by remember { mutableStateOf(editing?.id_mark_auto) }
    var modelId by remember { mutableStateOf(editing?.id_model_auto) }
    var abonentId by remember { mutableStateOf(editing?.id_fio) }
    var releaseDate by remember { mutableStateOf(editing?.release_date ?: "") }
    var validUntil by remember { mutableStateOf(editing?.valid_until ?: "") }
    var info by remember { mutableStateOf(editing?.info ?: "") }

    var pickOrg by remember { mutableStateOf(false) }
    var pickMark by remember { mutableStateOf(false) }
    var pickModel by remember { mutableStateOf(false) }
    var pickAbonent by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "Новый пропуск" else "Редактирование") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = gosId,
                    onValueChange = { gosId = it },
                    label = { Text("Госномер") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                PickerField(
                    label = "Организация",
                    value = orgs.firstOrNull { it.id_org == orgId }?.org_name ?: "Выбрать",
                    onClick = { pickOrg = true }
                )

                PickerField(
                    label = "Марка",
                    value = marks.firstOrNull { it.id_mark == markId }?.mark_name ?: "Выбрать",
                    onClick = { pickMark = true }
                )

                PickerField(
                    label = "Модель",
                    value = models.firstOrNull { it.id_model == modelId }?.model_name ?: "Выбрать",
                    onClick = { pickModel = true }
                )

                PickerField(
                    label = "Водитель",
                    value = abonents.firstOrNull { it.id_fio == abonentId }?.full_name ?: "Выбрать",
                    onClick = { pickAbonent = true }
                )

                OutlinedTextField(
                    value = releaseDate,
                    onValueChange = { releaseDate = it },
                    label = { Text("Дата начала (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = validUntil,
                    onValueChange = { validUntil = it },
                    label = { Text("Действует до (YYYY-MM-DD)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = info,
                    onValueChange = { info = it },
                    label = { Text("Комментарий") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            val canSubmit = gosId.isNotBlank() && orgId != null && markId != null &&
                modelId != null && abonentId != null && releaseDate.isNotBlank() && validUntil.isNotBlank()
            Button(
                enabled = canSubmit,
                onClick = {
                    onSubmit(
                        PropuskFormState(
                            id = editing?.id_propusk,
                            gosId = gosId.trim(),
                            orgId = orgId,
                            markId = markId,
                            modelId = modelId,
                            abonentId = abonentId,
                            releaseDate = releaseDate.trim(),
                            validUntil = validUntil.trim(),
                            info = info.trim().ifBlank { null }
                        )
                    )
                }
            ) { Text("Сохранить") }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text("Отмена") }
        }
    )

    if (pickOrg) {
        PickerDialog(
            title = "Организация",
            items = orgs.map { it.id_org to it.org_name },
            onSelect = {
                orgId = it
                pickOrg = false
            },
            onDismiss = { pickOrg = false }
        )
    }

    if (pickMark) {
        PickerDialog(
            title = "Марка",
            items = marks.map { it.id_mark to it.mark_name },
            onSelect = {
                markId = it
                modelId = null
                pickMark = false
                onMarkSelected(it)
            },
            onDismiss = { pickMark = false }
        )
    }

    if (pickModel) {
        PickerDialog(
            title = "Модель",
            items = models.map { it.id_model to it.model_name },
            onSelect = {
                modelId = it
                pickModel = false
            },
            onDismiss = { pickModel = false }
        )
    }

    if (pickAbonent) {
        PickerDialog(
            title = "Водитель",
            items = abonents.map { it.id_fio to it.full_name },
            onSelect = {
                abonentId = it
                pickAbonent = false
            },
            onDismiss = { pickAbonent = false }
        )
    }
}

@Composable
private fun PickerField(label: String, value: String, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Text("$label: $value")
    }
}

@Composable
private fun PickerDialog(
    title: String,
    items: List<Pair<Int, String>>,
    onSelect: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(items, query) {
        if (query.isBlank()) items
        else items.filter { it.second.contains(query, ignoreCase = true) }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Поиск") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.fillMaxWidth().wrapContentHeight()) {
                    items(filtered) { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(item.first) }
                                .padding(vertical = 8.dp, horizontal = 4.dp)
                        ) {
                            Text(item.second)
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text("Закрыть") }
        }
    )
}
