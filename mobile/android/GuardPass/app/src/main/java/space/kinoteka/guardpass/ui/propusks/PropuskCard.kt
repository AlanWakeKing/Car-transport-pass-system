package space.kinoteka.guardpass.ui.propusks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.dto.PropuskResponse

private fun statusLabel(status: String): String = when (status) {
    "draft" -> "Черновик"
    "active" -> "Активен"
    "pending_delete" -> "На удаление"
    "revoked" -> "Аннулирован"
    else -> status
}

@Composable
fun PropuskCard(
    propusk: PropuskResponse,
    permissions: PermissionSet,
    busy: Boolean,
    onEdit: () -> Unit,
    onActivate: () -> Unit,
    onRestore: () -> Unit,
    onRevoke: () -> Unit,
    onMarkDelete: () -> Unit,
    onArchive: () -> Unit,
    onPdf: () -> Unit
) {
    val canActivate = permissions.canActivatePropusks && propusk.status == "draft"
    val canRevoke = permissions.canAnnulPropusks && propusk.status == "active"
    val canMarkDelete = permissions.canMarkDelete && propusk.status == "active"
    val canArchive = permissions.canDeletePropusks && propusk.status in setOf("pending_delete", "revoked")
    val canEdit = permissions.canEditPropusks
    val canRestore = permissions.canEditPropusks && propusk.status == "revoked"
    val canPdf = permissions.canDownloadPropuskPdf && propusk.status == "active"

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text("№ ${propusk.gos_id}", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text("Компания: ${propusk.org_name ?: "-"}")
            Text("Водитель: ${propusk.abonent_fio ?: "-"}")
            Text("Статус: ${statusLabel(propusk.status)}")
            Text("Действует до: ${propusk.valid_until}")
            Spacer(Modifier.height(10.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (canEdit) {
                    OutlinedButton(enabled = !busy, onClick = onEdit) { Text("Редактировать") }
                }
                if (canRestore) {
                    Button(enabled = !busy, onClick = onRestore) { Text("Восстановить") }
                }
                if (canActivate) {
                    Button(enabled = !busy, onClick = onActivate) { Text("Активировать") }
                }
                if (canRevoke) {
                    OutlinedButton(enabled = !busy, onClick = onRevoke) { Text("Аннулировать") }
                }
            }

            Spacer(Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (canMarkDelete) {
                    OutlinedButton(enabled = !busy, onClick = onMarkDelete) { Text("На удаление") }
                }
                if (canArchive) {
                    OutlinedButton(enabled = !busy, onClick = onArchive) { Text("Архив") }
                }
            }

            Spacer(Modifier.height(8.dp))

            if (canPdf) {
                OutlinedButton(
                    enabled = !busy,
                    onClick = onPdf,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("PDF") }
            }
        }
    }
}
