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
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import retrofit2.HttpException
import space.kinoteka.guardpass.data.api.SettingsApi
import space.kinoteka.guardpass.data.dto.ApiTogglePayload
import space.kinoteka.guardpass.data.dto.DocsTogglePayload
import space.kinoteka.guardpass.data.dto.PropuskTemplatePayload
import space.kinoteka.guardpass.data.dto.PropuskTemplateResponse
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

private enum class TemplateKind(val title: String) {
    PROPUSK("Пропуск"),
    TEMPORARY("Временный пропуск"),
    REPORT("Отчет"),
    TEMP_REPORT("Отчет временных")
}

@Composable
fun SettingsScreen(
    settingsApi: SettingsApi,
    hasAccess: Boolean
) {
    val scope = rememberCoroutineScope()

    var apiEnabled by remember { mutableStateOf(false) }
    var docsEnabled by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    var templates by remember { mutableStateOf<Map<TemplateKind, List<PropuskTemplateResponse>>>(emptyMap()) }
    var showTemplateDialog by remember { mutableStateOf<TemplateKind?>(null) }

    fun formatError(t: Throwable): String {
        if (t is HttpException) {
            val code = t.code()
            val body = try { t.response()?.errorBody()?.string() } catch (_: Throwable) { null }
            if (!body.isNullOrBlank()) return "HTTP $code: $body"
        }
        return t.message ?: t::class.java.simpleName
    }

    suspend fun loadAll() {
        if (!hasAccess) return
        busy = true
        error = null
        try {
            apiEnabled = settingsApi.getApiEnabled().enabled
            docsEnabled = settingsApi.getDocsEnabled().enabled
            val propusk = settingsApi.propuskTemplateVersions()
            val temp = settingsApi.temporaryTemplateVersions()
            val report = settingsApi.reportTemplateVersions()
            val tempReport = settingsApi.temporaryReportTemplateVersions()
            templates = mapOf(
                TemplateKind.PROPUSK to propusk,
                TemplateKind.TEMPORARY to temp,
                TemplateKind.REPORT to report,
                TemplateKind.TEMP_REPORT to tempReport
            )
        } catch (t: Throwable) {
            error = formatError(t)
        } finally {
            busy = false
        }
    }

    LaunchedEffect(hasAccess) {
        loadAll()
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

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("API доступ", style = MaterialTheme.typography.titleMedium)
                    Switch(
                        checked = apiEnabled,
                        onCheckedChange = {
                            scope.launch {
                                try {
                                    apiEnabled = settingsApi.setApiEnabled(ApiTogglePayload(it)).enabled
                                } catch (t: Throwable) {
                                    error = formatError(t)
                                }
                            }
                        }
                    )
                }
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("Документация", style = MaterialTheme.typography.titleMedium)
                    Switch(
                        checked = docsEnabled,
                        onCheckedChange = {
                            scope.launch {
                                try {
                                    docsEnabled = settingsApi.setDocsEnabled(DocsTogglePayload(it)).enabled
                                } catch (t: Throwable) {
                                    error = formatError(t)
                                }
                            }
                        }
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        TemplateSection(TemplateKind.PROPUSK, templates[TemplateKind.PROPUSK].orEmpty()) {
            showTemplateDialog = TemplateKind.PROPUSK
        }
        TemplateSection(TemplateKind.TEMPORARY, templates[TemplateKind.TEMPORARY].orEmpty()) {
            showTemplateDialog = TemplateKind.TEMPORARY
        }
        TemplateSection(TemplateKind.REPORT, templates[TemplateKind.REPORT].orEmpty()) {
            showTemplateDialog = TemplateKind.REPORT
        }
        TemplateSection(TemplateKind.TEMP_REPORT, templates[TemplateKind.TEMP_REPORT].orEmpty()) {
            showTemplateDialog = TemplateKind.TEMP_REPORT
        }
        }
    }

    if (showTemplateDialog != null) {
        TemplateDialog(
            title = showTemplateDialog!!.title,
            onDismiss = { showTemplateDialog = null },
            onSubmit = { jsonText ->
                scope.launch {
                    try {
                        val payload = PropuskTemplatePayload(parseJsonToMap(jsonText))
                        when (showTemplateDialog) {
                            TemplateKind.PROPUSK -> settingsApi.createPropuskTemplate(payload)
                            TemplateKind.TEMPORARY -> settingsApi.createTemporaryTemplate(payload)
                            TemplateKind.REPORT -> settingsApi.createReportTemplate(payload)
                            TemplateKind.TEMP_REPORT -> settingsApi.createTemporaryReportTemplate(payload)
                            null -> {}
                        }
                        showTemplateDialog = null
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
private fun TemplateSection(
    kind: TemplateKind,
    items: List<PropuskTemplateResponse>,
    onAdd: () -> Unit
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(kind.title, style = MaterialTheme.typography.titleMedium)
                Button(onClick = onAdd) { Text("Добавить") }
            }
            if (items.isEmpty()) {
                Text("Нет версий")
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth().wrapContentHeight()) {
                    items(items) { item ->
                        Text("Версия ${item.version} • ${if (item.is_active) "Активна" else "Не активна"}")
                    }
                }
            }
        }
    }
    Spacer(Modifier.height(12.dp))
}

@Composable
private fun TemplateDialog(
    title: String,
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit
) {
    var jsonText by remember { mutableStateOf("{}") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Шаблон: $title") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Вставьте JSON шаблона")
                OutlinedTextField(
                    value = jsonText,
                    onValueChange = { jsonText = it },
                    label = { Text("JSON") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = { Button(onClick = { onSubmit(jsonText) }) { Text("Сохранить") } },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Отмена") } }
    )
}

private fun parseJsonToMap(input: String): Map<String, Any> {
    val trimmed = input.trim()
    if (trimmed.isEmpty()) return emptyMap()
    val json = com.google.gson.JsonParser.parseString(trimmed).asJsonObject
    val map = mutableMapOf<String, Any>()
    for ((k, v) in json.entrySet()) {
        map[k] = if (v.isJsonPrimitive) {
            val p = v.asJsonPrimitive
            when {
                p.isBoolean -> p.asBoolean
                p.isNumber -> p.asNumber
                else -> p.asString
            }
        } else {
            v.toString()
        }
    }
    return map
}
