// js/auth-init.js
/**
 * Authentication Initialization
 * Initialize AuthManager, AuthUI, and LoginModal on page load
 */

import { initFirebase } from './config/firebase-init.js';
import { authManager } from './features/authentication/auth-manager.js';
import { AuthUI } from './features/authentication/auth-ui.js';
import { LoginModal } from './features/authentication/login-modal.js';

/**
 * Initialize authentication system
 */
async function initAuth() {
  try {
    // Wait for Firebase to be fully initialized
    await initFirebase();

    // Initialize AuthManager (sets up auth state listener)
    await authManager.init();

    // Initialize AuthUI in navbar
    const authUI = new AuthUI('authUIContainer');

    // Initialize LoginModal
    const loginModal = new LoginModal('loginModal');

    // Export for debugging
    window.authDebug = {
      authManager,
      authUI,
      loginModal
    };
  } catch (error) {
    // Show fallback login button if initialization fails
    const container = document.getElementById('authUIContainer');
    if (container) {
      container.innerHTML = `
        <a href="/login.html" class="auth-login-btn" aria-label="Login to your account">
          <i class="fas fa-user" aria-hidden="true"></i>
          <span>Login</span>
        </a>
      `;
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  // DOM already loaded
  initAuth();
}

export { initAuth };
