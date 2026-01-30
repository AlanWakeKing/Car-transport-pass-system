package space.kinoteka.guardpass.data.store

class TokenHolder {
    @Volatile private var token: String? = null

    fun get(): String? = token
    fun set(value: String?) { token = value }
}
