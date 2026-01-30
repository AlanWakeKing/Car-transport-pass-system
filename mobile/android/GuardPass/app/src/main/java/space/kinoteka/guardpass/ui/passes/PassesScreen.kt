@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package space.kinoteka.guardpass.ui.passes

import android.content.Intent
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Text
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import java.io.File
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.api.ReferenceApi
import space.kinoteka.guardpass.data.api.TemporaryPassApi
import space.kinoteka.guardpass.data.dto.CreateTemporaryPassRequest
import space.kinoteka.guardpass.data.dto.Organization
import space.kinoteka.guardpass.data.dto.TemporaryPass
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

@Composable
fun PassesScreen(
    passApi: TemporaryPassApi,
    refApi: ReferenceApi,
    permissions: PermissionSet,
    busy: Boolean,
    error: String?,
    setBusy: (Boolean) -> Unit,
    setError: (String?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val tabs = remember { TabKind.values().toList() }
    val pagerState = rememberPagerState(initialPage = 0, pageCount = { tabs.size })
    val isTablet = LocalConfiguration.current.screenWidthDp >= 600
    var query by remember { mutableStateOf("") }
    var selectedOrgId by remember { mutableStateOf<Int?>(null) }
    var allPasses by remember { mutableStateOf<List<TemporaryPass>>(emptyList()) }
    var orgs by remember { mutableStateOf<List<Organization>>(emptyList()) }

    var showCreate by remember { mutableStateOf(false) }
    var newGos by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }
    var newComment by remember { mutableStateOf("") }
    var newOrgId by remember { mutableStateOf<Int?>(null) }

    fun bucket(p: TemporaryPass): TabKind = when (p.status) {
        "active" -> TabKind.WAITING
        "on_territory" -> TabKind.INSIDE
        "expired" -> TabKind.EXPIRED
        "revoked" -> TabKind.HISTORY
        else -> TabKind.HISTORY
    }

    fun normPlate(s: String): String = s.uppercase().filter { it.isLetterOrDigit() }

    suspend fun loadPasses() {
        val active = passApi.list(statusFilter = "active", gosId = null, skip = 0, limit = 200).items
        val onTerritory = passApi.list(statusFilter = "on_territory", gosId = null, skip = 0, limit = 200).items
        val expired = passApi.list(statusFilter = "expired", gosId = null, skip = 0, limit = 200).items
        val revoked = passApi.list(statusFilter = "revoked", gosId = null, skip = 0, limit = 200).items

        allPasses = (active + onTerritory + expired + revoked)
            .distinctBy { it.id }
            .sortedByDescending { it.id }
    }

    suspend fun loadOrganizations() {
        orgs = refApi.organizations()
            .sortedBy { it.org_name }
    }

    fun filteredForTab(tab: TabKind): List<TemporaryPass> {
        val q = normPlate(query)
        return allPasses.asSequence()
            .filter { bucket(it) == tab }
            .filter { p -> selectedOrgId == null || p.id_org == selectedOrgId }
            .filter { p -> q.isBlank() || normPlate(p.gos_id).contains(q) }
            .sortedByDescending { it.id }
            .toList()
    }

    val orgOptions = remember(orgs) {
        orgs.sortedBy { it.org_name }
    }

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

    LaunchedEffect(Unit, permissions.canViewPasses) {
        if (!permissions.canViewPasses) {
            return@LaunchedEffect
        }
        setBusy(true)
        setError(null)
        try {
            loadOrganizations()
            loadPasses()
        } catch (t: Throwable) {
            setError(t.message ?: t::class.java.simpleName)
        } finally {
            setBusy(false)
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(15_000)
            if (!busy) runCatching { loadPasses() }
        }
    }

    Box(Modifier.fillMaxSize()) {
        if (showCreate && permissions.canCreatePass) {
            AlertDialog(
                onDismissRequest = { if (!busy) showCreate = false },
                title = { Text("Новый временный пропуск") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = newGos,
                            onValueChange = { newGos = it },
                            label = { Text("Госномер") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        if (orgOptions.isNotEmpty()) {
                            var orgPickOpen by remember { mutableStateOf(false) }

                            val selectedOrg = orgOptions.firstOrNull { it.id_org == newOrgId }
                            val orgLabel = selectedOrg?.let {
                                "${it.org_name} • Свободно: ${it.free_mesto} из ${it.free_mesto_limit}"
                            } ?: "Выбери организацию"

                            ExposedDropdownMenuBox(
                                expanded = orgPickOpen,
                                onExpandedChange = { orgPickOpen = !orgPickOpen }
                            ) {
                                OutlinedTextField(
                                    value = orgLabel,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Организация") },
                                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = orgPickOpen) }
                                )

                                ExposedDropdownMenu(
                                    expanded = orgPickOpen,
                                    onDismissRequest = { orgPickOpen = false }
                                ) {
                                    orgOptions.forEach { org ->
                                        val line = "${org.org_name} • Свободно: ${org.free_mesto} из ${org.free_mesto_limit}"
                                        DropdownMenuItem(
                                            text = { Text(line) },
                                            onClick = {
                                                newOrgId = org.id_org
                                                orgPickOpen = false
                                            }
                                        )
                                    }
                                }
                            }

                            if (selectedOrg != null) {
                                if (selectedOrg.free_mesto <= 0) {
                                    Text(
                                        "Свободных гостевых мест нет — создание запрещено",
                                        color = MaterialTheme.colorScheme.error,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                } else {
                                    Text(
                                        "Свободно сейчас: ${selectedOrg.free_mesto} из ${selectedOrg.free_mesto_limit}",
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                            }
                        } else {
                            Text("Список организаций пуст", color = MaterialTheme.colorScheme.error)
                        }

                        OutlinedTextField(
                            value = newPhone,
                            onValueChange = { newPhone = it },
                            label = { Text("Телефон (необязательно)") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = newComment,
                            onValueChange = { newComment = it },
                            label = { Text("Комментарий (необязательно)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    val selectedOrg = orgOptions.firstOrNull { it.id_org == newOrgId }
                    val canCreate = !busy
                        && newGos.trim().isNotEmpty()
                        && selectedOrg != null
                        && selectedOrg.free_mesto > 0

                    Button(
                        enabled = canCreate,
                        onClick = {
                            val orgId = newOrgId!!
                            setBusy(true)
                            setError(null)
                            scope.launch {
                                try {
                                    val created = passApi.create(
                                        CreateTemporaryPassRequest(
                                            gos_id = newGos.trim(),
                                            id_org = orgId,
                                            phone = newPhone.trim().ifBlank { null },
                                            comment = newComment.trim().ifBlank { null }
                                        )
                                    )

                                    showCreate = false
                                    newGos = ""
                                    newPhone = ""
                                    newComment = ""
                                    newOrgId = null

                                    loadPasses()
                                    loadOrganizations()

                                    if (permissions.canDownloadPdf) {
                                        val body = passApi.pdf(created.id)
                                        val file = File(context.cacheDir, "pass_${created.id}.pdf")
                                        file.outputStream().use { out ->
                                            body.byteStream().use { input -> input.copyTo(out) }
                                        }
                                        openPdfFile(file)
                                    }
                                } catch (t: Throwable) {
                                    setError(t.message ?: t::class.java.simpleName)
                                } finally {
                                    setBusy(false)
                                }
                            }
                        }
                    ) { Text("Создать") }
                },
                dismissButton = {
                    OutlinedButton(
                        enabled = !busy,
                        onClick = { showCreate = false }
                    ) { Text("Отмена") }
                }
            )
        }

        val padding = adaptiveContentPadding()
        val maxWidth = adaptiveMaxWidth()

        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .then(if (maxWidth != null) Modifier.widthIn(max = maxWidth).align(Alignment.TopCenter) else Modifier)
        ) {
            if (error != null) {
                Spacer(Modifier.height(8.dp))
                Text("Ошибка: $error", color = MaterialTheme.colorScheme.error)
            }

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Поиск по госномеру (любая часть)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(Modifier.height(10.dp))

            var orgMenuOpen by remember { mutableStateOf(false) }

            val selectedOrgLabel =
                orgOptions.firstOrNull { it.id_org == selectedOrgId }?.let {
                    "${it.org_name} • Свободно: ${it.free_mesto} из ${it.free_mesto_limit}"
                } ?: "Все организации"

            ExposedDropdownMenuBox(
                expanded = orgMenuOpen,
                onExpandedChange = { orgMenuOpen = !orgMenuOpen }
            ) {
                OutlinedTextField(
                    value = selectedOrgLabel,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Организация") },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = orgMenuOpen) }
                )

                ExposedDropdownMenu(
                    expanded = orgMenuOpen,
                    onDismissRequest = { orgMenuOpen = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Все организации") },
                        onClick = {
                            selectedOrgId = null
                            orgMenuOpen = false
                        }
                    )

                    orgOptions.forEach { org ->
                        val line = "${org.org_name} • Свободно: ${org.free_mesto} из ${org.free_mesto_limit}"
                        DropdownMenuItem(
                            text = { Text(line) },
                            onClick = {
                                selectedOrgId = org.id_org
                                orgMenuOpen = false
                            }
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            ScrollableTabRow(
                selectedTabIndex = pagerState.currentPage,
                edgePadding = 0.dp
            ) {
                tabs.forEachIndexed { index, tab ->
                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = { scope.launch { pagerState.animateScrollToPage(index) } },
                        text = {
                            Text(
                                tab.title,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            if (!permissions.canViewPasses) {
                Text("Нет прав на просмотр пропусков", color = MaterialTheme.colorScheme.error)
            } else {
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.weight(1f)
                ) { page ->
                    val tab = tabs[page]
                    val list = filteredForTab(tab)
                    if (list.isEmpty()) {
                        Text("Нет пропусков в этом разделе")
                    } else {
                        if (isTablet) {
                            LazyVerticalGrid(
                                columns = GridCells.Fixed(2),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.fillMaxSize()
                            ) {
                                items(list) { p ->
                                    PassCard(
                                        pass = p,
                                        busy = busy,
                                        canEditPass = permissions.canEditPass,
                                        canDownloadPdf = permissions.canDownloadPdf,
                                        onEnter = {
                                            setBusy(true)
                                            setError(null)
                                            scope.launch {
                                                try {
                                                    passApi.enter(p.id)
                                                    loadPasses()
                                                    loadOrganizations()
                                                } catch (t: Throwable) {
                                                    setError(t.message ?: t::class.java.simpleName)
                                                } finally {
                                                    setBusy(false)
                                                }
                                            }
                                        },
                                        onExit = {
                                            setBusy(true)
                                            setError(null)
                                            scope.launch {
                                                try {
                                                    passApi.exit(p.id)
                                                    loadPasses()
                                                    loadOrganizations()
                                                } catch (t: Throwable) {
                                                    setError(t.message ?: t::class.java.simpleName)
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
                                                    val body = passApi.pdf(p.id)
                                                    val file = File(context.cacheDir, "pass_${p.id}.pdf")
                                                    file.outputStream().use { out ->
                                                        body.byteStream().use { input -> input.copyTo(out) }
                                                    }
                                                    openPdfFile(file)
                                                } catch (t: Throwable) {
                                                    setError(t.message ?: t::class.java.simpleName)
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
                                items(list) { p ->
                                    PassCard(
                                        pass = p,
                                        busy = busy,
                                        canEditPass = permissions.canEditPass,
                                        canDownloadPdf = permissions.canDownloadPdf,
                                        onEnter = {
                                            setBusy(true)
                                            setError(null)
                                            scope.launch {
                                                try {
                                                    passApi.enter(p.id)
                                                    loadPasses()
                                                    loadOrganizations()
                                                } catch (t: Throwable) {
                                                    setError(t.message ?: t::class.java.simpleName)
                                                } finally {
                                                    setBusy(false)
                                                }
                                            }
                                        },
                                        onExit = {
                                            setBusy(true)
                                            setError(null)
                                            scope.launch {
                                                try {
                                                    passApi.exit(p.id)
                                                    loadPasses()
                                                    loadOrganizations()
                                                } catch (t: Throwable) {
                                                    setError(t.message ?: t::class.java.simpleName)
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
                                                    val body = passApi.pdf(p.id)
                                                    val file = File(context.cacheDir, "pass_${p.id}.pdf")
                                                    file.outputStream().use { out ->
                                                        body.byteStream().use { input -> input.copyTo(out) }
                                                    }
                                                    openPdfFile(file)
                                                } catch (t: Throwable) {
                                                    setError(t.message ?: t::class.java.simpleName)
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
            }
        }

        if (permissions.canCreatePass) {
            FloatingActionButton(
                onClick = { showCreate = true },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(20.dp),
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = "Создать пропуск",
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    }
}
