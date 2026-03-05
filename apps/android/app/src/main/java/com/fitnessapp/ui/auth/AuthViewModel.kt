package com.fitnessapp.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: Auth
) : ViewModel() {

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            try {
                val session = auth.currentSessionOrNull()
                _isAuthenticated.value = session != null
            } catch (e: Exception) {
                _isAuthenticated.value = false
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                _isAuthenticated.value = true
            } catch (e: Exception) {
                _error.value = e.message ?: "Sign in failed"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                auth.signOut()
            } catch (_: Exception) {}
            _isAuthenticated.value = false
        }
    }

    fun clearError() { _error.value = null }
}
