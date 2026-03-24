// js/features/authentication/auth-ui.js
/**
 * Authentication UI Component for Navbar
 * Manages login button and user dropdown in the header
 */

import { authManager } from './auth-manager.js';
import { signOut } from '../auth-helpers.js';
import { formatPhoneForDisplay } from '../../utils/auth-errors.js';

export class AuthUI {
  constructor(containerId = 'authUIContainer') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      return;
    }

    this.isDropdownOpen = false;
    this.unsubscribers = [];

    this.init();
  }

  /**
   * Initialize auth UI
   */
  async init() {
    // Show loading state initially
    this.renderLoading();

    try {
      // Listen to auth state changes
      const unsubscribe = authManager.on('stateChange', (state) => {
        this.render(state);
      });
      this.unsubscribers.push(unsubscribe);

      // Initial render
      const currentState = {
        user: authManager.getUser(),
        userData: authManager.getUserData(),
        loading: authManager.isLoading()
      };
      this.render(currentState);
    } catch (error) {
      // Show fallback login button if initialization fails
      this.renderLoggedOut();
    }
  }

  /**
   * Render loading state
   */
  renderLoading() {
    this.container.innerHTML = `
      <div class="auth-ui-loading">
        <div class="skeleton-button"></div>
      </div>
    `;
  }

  /**
   * Render auth UI based on state
   * @param {Object} state - Auth state { user, userData, loading }
   */
  render(state) {
    if (state.loading) {
      this.renderLoading();
      return;
    }

    if (!state.user) {
      this.renderLoggedOut();
    } else {
      this.renderLoggedIn(state.user, state.userData);
    }
  }

  /**
   * Render logged out state (Login button)
   */
  renderLoggedOut() {
    this.container.innerHTML = `
      <button
        class="auth-login-btn"
        id="authLoginBtn"
        aria-label="Login to your account"
      >
        <i class="fas fa-user" aria-hidden="true"></i>
        <span>Login</span>
      </button>
    `;

    // Bind login button click
    const loginBtn = this.container.querySelector('#authLoginBtn');
    loginBtn?.addEventListener('click', () => this.openLoginModal());
  }

  /**
   * Render logged in state (User avatar + dropdown)
   * @param {Object} user - Firebase user object
   * @param {Object} userData - User data from Firestore
   */
  renderLoggedIn(user, userData) {
    // Get display name or phone
    const displayName =
      user.displayName || (user.phoneNumber ? formatPhoneForDisplay(user.phoneNumber) : 'User');

    // Get avatar initial
    const avatarInitial = this.getAvatarInitial(user);

    // Get avatar image
    const avatarImage = user.photoURL;

    this.container.innerHTML = `
      <div class="auth-user-menu">
        <button
          class="auth-avatar-btn"
          id="authAvatarBtn"
          aria-label="User menu"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <div class="auth-avatar">
            ${
              avatarImage
                ? `<img src="${avatarImage}" alt="${displayName}" class="auth-avatar-img">`
                : `<span class="auth-avatar-initial">${avatarInitial}</span>`
            }
          </div>
          <i class="fas fa-chevron-down auth-avatar-chevron" aria-hidden="true"></i>
        </button>

        <div class="auth-dropdown" id="authDropdown" hidden>
          <div class="auth-dropdown-header">
            <p class="auth-dropdown-name">${displayName}</p>
            ${user.email ? `<p class="auth-dropdown-email">${user.email}</p>` : ''}
          </div>

          <div class="auth-dropdown-menu">
            <a href="/pages/orders.html" class="auth-dropdown-item">
              <i class="fas fa-box" aria-hidden="true"></i>
              <span>My Orders</span>
            </a>
            <a href="/pages/addresses.html" class="auth-dropdown-item">
              <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
              <span>My Addresses</span>
            </a>
            <a href="/pages/profile.html" class="auth-dropdown-item">
              <i class="fas fa-user-circle" aria-hidden="true"></i>
              <span>My Profile</span>
            </a>
          </div>

          <div class="auth-dropdown-divider"></div>

          <button class="auth-dropdown-item auth-logout-btn" id="authLogoutBtn">
            <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    `;

    // Bind events
    this.bindDropdownEvents();
  }

  /**
   * Get avatar initial from user data
   * @param {Object} user - Firebase user
   * @returns {string} Avatar initial (1-2 characters)
   */
  getAvatarInitial(user) {
    if (user.displayName) {
      // Use first letter of display name
      return user.displayName.charAt(0).toUpperCase();
    }

    if (user.email) {
      // Use first letter of email
      return user.email.charAt(0).toUpperCase();
    }

    if (user.phoneNumber) {
      // Use last 2 digits of phone
      const digits = user.phoneNumber.replace(/\D/g, '');
      return digits.slice(-2);
    }

    return 'U';
  }

  /**
   * Bind dropdown events
   */
  bindDropdownEvents() {
    const avatarBtn = this.container.querySelector('#authAvatarBtn');
    const dropdown = this.container.querySelector('#authDropdown');
    const logoutBtn = this.container.querySelector('#authLogoutBtn');

    if (!avatarBtn || !dropdown) return;

    // Toggle dropdown on avatar click
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (this.isDropdownOpen && !this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Handle logout
    logoutBtn?.addEventListener('click', async () => {
      await this.handleLogout();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isDropdownOpen) {
        this.closeDropdown();
        avatarBtn.focus();
      }
    });
  }

  /**
   * Toggle dropdown menu
   */
  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open dropdown menu
   */
  openDropdown() {
    const dropdown = this.container.querySelector('#authDropdown');
    const avatarBtn = this.container.querySelector('#authAvatarBtn');

    if (!dropdown) return;

    dropdown.removeAttribute('hidden');
    dropdown.classList.add('auth-dropdown-open');
    avatarBtn?.setAttribute('aria-expanded', 'true');
    this.isDropdownOpen = true;
  }

  /**
   * Close dropdown menu
   */
  closeDropdown() {
    const dropdown = this.container.querySelector('#authDropdown');
    const avatarBtn = this.container.querySelector('#authAvatarBtn');

    if (!dropdown) return;

    dropdown.classList.remove('auth-dropdown-open');
    avatarBtn?.setAttribute('aria-expanded', 'false');

    // Wait for animation before hiding
    setTimeout(() => {
      dropdown.setAttribute('hidden', '');
    }, 200);

    this.isDropdownOpen = false;
  }

  /**
   * Open login page (redirect to login.html)
   */
  openLoginModal() {
    // Get current page URL for redirect after login
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Redirect to login page with return URL
    // Use absolute path from root to work in both localhost and production
    window.location.href = `/login.html?redirect=${encodeURIComponent(currentPage)}`;
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      this.closeDropdown();

      // Show loading state
      this.renderLoading();

      // Sign out
      await signOut();

      // Show success message
      this.showToast('Logged out successfully');
    } catch (error) {
      this.showToast('Logout failed. Please try again.', 'error');
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type ('success' or 'error')
   */
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.hidden = false;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, 3000);
  }

  /**
   * Destroy auth UI
   */
  destroy() {
    // Unsubscribe from all listeners
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
