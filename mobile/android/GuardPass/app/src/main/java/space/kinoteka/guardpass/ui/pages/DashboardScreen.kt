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
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import retrofit2.HttpException
import space.kinoteka.guardpass.data.api.PropuskApi
import space.kinoteka.guardpass.data.dto.PropuskResponse
import space.kinoteka.guardpass.data.dto.PropuskStatsResponse
import space.kinoteka.guardpass.ui.common.adaptiveContentPadding
import space.kinoteka.guardpass.ui.common.adaptiveMaxWidth

private fun statusLabel(status: String): String = when (status) {
    "draft" -> "Черновик"
    "active" -> "Активен"
    "pending_delete" -> "На удаление"
    "revoked" -> "Аннулирован"
    else -> status
}

@Composable
fun DashboardScreen(
    propuskApi: PropuskApi,
    hasAccess: Boolean,
    canViewPropusks: Boolean
) {
    var stats by remember { mutableStateOf<PropuskStatsResponse?>(null) }
    var recent by remember { mutableStateOf<List<PropuskResponse>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }

    fun formatError(t: Throwable): String {
        if (t is HttpException) {
            val code = t.code()
            val body = try { t.response()?.errorBody()?.string() } catch (_: Throwable) { null }
            if (!body.isNullOrBlank()) return "HTTP $code: $body"
        }
        return t.message ?: t::class.java.simpleName
    }

    LaunchedEffect(hasAccess, canViewPropusks) {
        if (!hasAccess || !canViewPropusks) return@LaunchedEffect
        error = null
        try {
            stats = propuskApi.stats()
            val response = propuskApi.listPaged(skip = 0, limit = 6)
            recent = response.items
        } catch (t: Throwable) {
            error = formatError(t)
        }
    }

    val padding = adaptiveContentPadding()
    val maxWidth = adaptiveMaxWidth()

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
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

        if (!canViewPropusks) {
            Text("Нет прав на просмотр пропусков", color = MaterialTheme.colorScheme.error)
            return
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatCard("Активные", stats?.active ?: 0, Modifier.weight(1f))
            StatCard("Черновики", stats?.draft ?: 0, Modifier.weight(1f))
            StatCard("Аннулир.", stats?.revoked ?: 0, Modifier.weight(1f))
        }

        Spacer(Modifier.height(12.dp))

        Text("Последние пропуска", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))

        if (recent.isEmpty()) {
            Text("Нет записей")
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(recent) { item ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Text("№ ${item.gos_id}", style = MaterialTheme.typography.titleMedium)
                            Text("Компания: ${item.org_name ?: "-"}")
                            Text("Водитель: ${item.abonent_fio ?: "-"}")
                            Text("Статус: ${statusLabel(item.status)}")
                            Text("Действует до: ${item.valid_until}")
                        }
                    }
                }
            }
        }
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: Int,
    modifier: Modifier = Modifier
) {
    Card(modifier) {
        Column(Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium)
            Text(value.toString(), style = MaterialTheme.typography.titleLarge)
        }
    }
}
