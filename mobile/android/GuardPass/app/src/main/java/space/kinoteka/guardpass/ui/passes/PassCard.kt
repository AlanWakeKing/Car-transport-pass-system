package space.kinoteka.guardpass.ui.passes

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
import space.kinoteka.guardpass.data.dto.TemporaryPass

@Composable
fun PassCard(
    pass: TemporaryPass,
    busy: Boolean,
    canEditPass: Boolean,
    canDownloadPdf: Boolean,
    onEnter: () -> Unit,
    onExit: () -> Unit,
    onPdf: () -> Unit
) {
    val canEnter = canEditPass && (pass.revoked_at == null && pass.entered_at == null)
    val canExit = canEditPass && (pass.revoked_at == null && pass.entered_at != null && pass.exited_at == null)

    Card {
        Column(Modifier.padding(14.dp)) {
            Text("№ ${pass.gos_id}", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            Text("Организация: ${pass.org_name}")
            Spacer(Modifier.height(10.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    enabled = !busy && canEnter,
                    onClick = onEnter,
                    modifier = Modifier.weight(1f)
                ) { Text("Заезд") }

                Button(
                    enabled = !busy && canExit,
                    onClick = onExit,
                    modifier = Modifier.weight(1f)
                ) { Text("Выезд") }
            }

            Spacer(Modifier.height(10.dp))

            OutlinedButton(
                enabled = !busy && canDownloadPdf,
                onClick = onPdf,
                modifier = Modifier.fillMaxWidth()
            ) { Text("PDF / Печать") }
        }
    }
}
