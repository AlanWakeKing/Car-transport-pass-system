@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package space.kinoteka.guardpass.ui.navigation

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import space.kinoteka.guardpass.data.auth.MenuPermissionSet
import space.kinoteka.guardpass.data.auth.PermissionSet
import space.kinoteka.guardpass.data.api.AuthApi
import space.kinoteka.guardpass.data.api.PropuskApi
import space.kinoteka.guardpass.data.api.ReferenceApi
import space.kinoteka.guardpass.data.api.SettingsApi
import space.kinoteka.guardpass.data.api.TemporaryPassApi
import space.kinoteka.guardpass.ui.pages.DashboardScreen
import space.kinoteka.guardpass.ui.pages.PlaceholderScreen
import space.kinoteka.guardpass.ui.pages.ReferencesScreen
import space.kinoteka.guardpass.ui.pages.UsersScreen
import space.kinoteka.guardpass.ui.pages.SettingsScreen
import space.kinoteka.guardpass.ui.pages.ReportsScreen
import space.kinoteka.guardpass.ui.propusks.PropusksScreen
import space.kinoteka.guardpass.ui.passes.PassesScreen

private enum class AppScreen(val title: String) {
    HOME("Главная"),
    PROPUSKS("Пропуска"),
    TEMPORARY("Временные"),
    REFERENCES("Справочники"),
    REPORTS("Отчеты"),
    USERS("Пользователи"),
    SETTINGS("Настройки"),
    PRINT("Печать")
}

@Composable
fun AppShell(
    authApi: AuthApi,
    passApi: TemporaryPassApi,
    refApi: ReferenceApi,
    propuskApi: PropuskApi,
    settingsApi: SettingsApi,
    permissions: PermissionSet,
    menuPermissions: MenuPermissionSet,
    busy: Boolean,
    error: String?,
    setBusy: (Boolean) -> Unit,
    setError: (String?) -> Unit,
    onLogout: () -> Unit
) {
    val availableBottomTabs = remember(menuPermissions) {
        buildList {
            if (menuPermissions.home) add(AppScreen.HOME)
            if (menuPermissions.propusks) add(AppScreen.PROPUSKS)
            if (menuPermissions.temporary) add(AppScreen.TEMPORARY)
        }
    }

    val fallback = availableBottomTabs.firstOrNull() ?: AppScreen.TEMPORARY
    var current by rememberSaveable { mutableStateOf(fallback) }
    val allowedScreens = remember(menuPermissions) {
        buildSet {
            if (menuPermissions.home) add(AppScreen.HOME)
            if (menuPermissions.propusks) add(AppScreen.PROPUSKS)
            if (menuPermissions.temporary) add(AppScreen.TEMPORARY)
            if (menuPermissions.references) add(AppScreen.REFERENCES)
            if (menuPermissions.reports) add(AppScreen.REPORTS)
            if (menuPermissions.users) add(AppScreen.USERS)
            if (menuPermissions.settings) add(AppScreen.SETTINGS)
            if (menuPermissions.print) add(AppScreen.PRINT)
        }
    }
    if (current !in allowedScreens) {
        current = fallback
    }

    var showMore by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val moreItems = remember(menuPermissions) {
        buildList {
            if (menuPermissions.references) add(AppScreen.REFERENCES)
            if (menuPermissions.reports) add(AppScreen.REPORTS)
            if (menuPermissions.users) add(AppScreen.USERS)
            if (menuPermissions.settings) add(AppScreen.SETTINGS)
            if (menuPermissions.print) add(AppScreen.PRINT)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(current.title) },
                actions = { TextButtonLogout(onLogout) }
            )
        },
        bottomBar = {
            NavigationBar {
                if (menuPermissions.home) {
                    NavigationBarItem(
                        selected = current == AppScreen.HOME,
                        onClick = { current = AppScreen.HOME },
                        icon = { Icon(Icons.Filled.Home, contentDescription = "Главная") },
                        label = { Text("Главная") }
                    )
                }
                if (menuPermissions.propusks) {
                    NavigationBarItem(
                        selected = current == AppScreen.PROPUSKS,
                        onClick = { current = AppScreen.PROPUSKS },
                        icon = { Icon(Icons.Filled.List, contentDescription = "Пропуска") },
                        label = { Text("Пропуска") }
                    )
                }
                if (menuPermissions.temporary) {
                    NavigationBarItem(
                        selected = current == AppScreen.TEMPORARY,
                        onClick = { current = AppScreen.TEMPORARY },
                        icon = { Icon(Icons.Filled.DirectionsCar, contentDescription = "Временные") },
                        label = { Text("Временные") }
                    )
                }
                NavigationBarItem(
                    selected = current in moreItems,
                    onClick = { showMore = true },
                    icon = { Icon(Icons.Filled.MoreHoriz, contentDescription = "Еще") },
                    label = { Text("Еще") }
                )
            }
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (current) {
                AppScreen.HOME -> DashboardScreen(
                    propuskApi = propuskApi,
                    hasAccess = menuPermissions.home,
                    canViewPropusks = permissions.canViewPropusks
                )
                AppScreen.PROPUSKS -> PropusksScreen(
                    propuskApi = propuskApi,
                    refApi = refApi,
                    permissions = permissions,
                    busy = busy,
                    error = error,
                    setBusy = setBusy,
                    setError = setError
                )
                AppScreen.TEMPORARY -> PassesScreen(
                    passApi = passApi,
                    refApi = refApi,
                    permissions = permissions,
                    busy = busy,
                    error = error,
                    setBusy = setBusy,
                    setError = setError
                )
                AppScreen.REFERENCES -> ReferencesScreen(
                    refApi = refApi,
                    permissions = permissions,
                    hasAccess = menuPermissions.references
                )
                AppScreen.REPORTS -> ReportsScreen(
                    propuskApi = propuskApi,
                    tempApi = passApi,
                    refApi = refApi,
                    hasAccess = menuPermissions.reports
                )
                AppScreen.USERS -> UsersScreen(
                    authApi = authApi,
                    permissions = permissions
                )
                AppScreen.SETTINGS -> SettingsScreen(
                    settingsApi = settingsApi,
                    hasAccess = menuPermissions.settings
                )
                AppScreen.PRINT -> PlaceholderScreen("Печать", menuPermissions.print)
            }
        }
    }

    if (showMore) {
        ModalBottomSheet(
            onDismissRequest = { showMore = false },
            sheetState = sheetState
        ) {
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                if (moreItems.isEmpty()) {
                    Text("Нет доступных разделов")
                } else {
                    if (menuPermissions.references) {
                        MoreItemRow("Справочники", Icons.Filled.MenuBook) {
                            current = AppScreen.REFERENCES
                            showMore = false
                        }
                    }
                    if (menuPermissions.reports) {
                        MoreItemRow("Отчеты", Icons.Filled.Assessment) {
                            current = AppScreen.REPORTS
                            showMore = false
                        }
                    }
                    if (menuPermissions.users) {
                        MoreItemRow("Пользователи", Icons.Filled.Group) {
                            current = AppScreen.USERS
                            showMore = false
                        }
                    }
                    if (menuPermissions.settings) {
                        MoreItemRow("Настройки", Icons.Filled.Settings) {
                            current = AppScreen.SETTINGS
                            showMore = false
                        }
                    }
                    if (menuPermissions.print) {
                        MoreItemRow("Печать", Icons.Filled.Print) {
                            current = AppScreen.PRINT
                            showMore = false
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TextButtonLogout(onLogout: () -> Unit) {
    TextButton(onClick = onLogout) {
        Text("Выйти")
    }
}

@Composable
private fun MoreItemRow(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = { Text(label) },
        leadingContent = { Icon(icon, contentDescription = label) },
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick)
    )
    Divider()
}
