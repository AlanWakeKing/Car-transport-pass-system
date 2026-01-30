package space.kinoteka.guardpass.ui.pages

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import java.io.File
import kotlinx.coroutines.launch
import okhttp3.ResponseBody
import retrofit2.HttpException
import space.kinoteka.guardpass.data.api.PropuskApi
import space.kinoteka.guardpass.data.api.ReferenceApi
import space.kinoteka.guardpass.data.api.TemporaryPassApi
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

@Composable
fun ReportsScreen(
    propuskApi: PropuskApi,
    tempApi: TemporaryPassApi,
    refApi: ReferenceApi,
    hasAccess: Boolean
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var orgs by remember { mutableStateOf(emptyList<space.kinoteka.guardpass.data.dto.Organization>()) }
    var selectedOrgId by remember { mutableStateOf<Int?>(null) }
    var orgMenuOpen by remember { mutableStateOf(false) }

    fun formatError(t: Throwable): String {
        if (t is HttpException) {
            val code = t.code()
            val body = try { t.response()?.errorBody()?.string() } catch (_: Throwable) { null }
            if (!body.isNullOrBlank()) return "HTTP $code: $body"
        }
        return t.message ?: t::class.java.simpleName
    }

    fun openPdf(body: ResponseBody, filename: String) {
        val file = File(context.cacheDir, filename)
        file.outputStream().use { out ->
            body.byteStream().use { input -> input.copyTo(out) }
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Открыть PDF"))
    }

    suspend fun loadOrgs() {
        try {
            orgs = refApi.organizations()
            if (selectedOrgId == null && orgs.isNotEmpty()) {
                selectedOrgId = orgs.first().id_org
            }
        } catch (t: Throwable) {
            error = formatError(t)
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

        LaunchedEffect(Unit) {
            loadOrgs()
        }

        if (error != null) {
            Text("Ошибка: $error", color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Отчеты по пропускам", style = MaterialTheme.typography.titleMedium)
                Box(Modifier.fillMaxWidth()) {
                    val selectedLabel = orgs.firstOrNull { it.id_org == selectedOrgId }?.org_name ?: "Выбрать организацию"
                    OutlinedButton(
                        onClick = { orgMenuOpen = true },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text(selectedLabel) }
                    DropdownMenu(
                        expanded = orgMenuOpen,
                        onDismissRequest = { orgMenuOpen = false }
                    ) {
                        orgs.forEach { org ->
                            DropdownMenuItem(
                                text = { Text(org.org_name) },
                                onClick = {
                                    selectedOrgId = org.id_org
                                    orgMenuOpen = false
                                }
                            )
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        enabled = !busy,
                        onClick = {
                            scope.launch {
                                try {
                                    busy = true
                                    val body = propuskApi.reportAllOrgsPdf()
                                    openPdf(body, "propusk_report_all.pdf")
                                } catch (t: Throwable) {
                                    error = formatError(t)
                                } finally {
                                    busy = false
                                }
                            }
                        }
                    ) { Text("Все организации") }
                    OutlinedButton(
                        enabled = !busy,
                        onClick = {
                            scope.launch {
                                try {
                                    busy = true
                                    val orgId = selectedOrgId ?: return@launch
                                    val body = propuskApi.reportOrgPdf(orgId)
                                    openPdf(body, "propusk_report_org_${orgId}.pdf")
                                } catch (t: Throwable) {
                                    error = formatError(t)
                                } finally {
                                    busy = false
                                }
                            }
                        }
                    ) { Text("Отчет") }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Отчеты по временным пропускам", style = MaterialTheme.typography.titleMedium)
                Button(
                    enabled = !busy,
                    onClick = {
                        scope.launch {
                            try {
                                busy = true
                                val body = tempApi.reportAllPdf()
                                openPdf(body, "temporary_report_all.pdf")
                            } catch (t: Throwable) {
                                error = formatError(t)
                            } finally {
                                busy = false
                            }
                        }
                    }
                ) { Text("Скачать отчет") }
            }
        }
        }
    }
}
