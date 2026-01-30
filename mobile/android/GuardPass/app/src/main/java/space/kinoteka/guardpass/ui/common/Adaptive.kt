package space.kinoteka.guardpass.ui.common

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun adaptiveContentPadding(): PaddingValues {
    val width = LocalConfiguration.current.screenWidthDp
    val horizontal = if (width >= 600) 24.dp else 16.dp
    return PaddingValues(horizontal = horizontal, vertical = 16.dp)
}

@Composable
fun adaptiveMaxWidth(): Dp? {
    val width = LocalConfiguration.current.screenWidthDp
    return when {
        width >= 900 -> 720.dp
        width >= 600 -> 600.dp
        else -> null
    }
}
