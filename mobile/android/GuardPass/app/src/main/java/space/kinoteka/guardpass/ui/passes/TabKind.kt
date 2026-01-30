package space.kinoteka.guardpass.ui.passes

internal enum class TabKind(val title: String) {
    WAITING("Ожидают"),
    INSIDE("На территории"),
    EXPIRED("Истёкшие"),
    HISTORY("История"),
}
