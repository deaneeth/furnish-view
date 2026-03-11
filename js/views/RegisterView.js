/**
 * FurnishView — Register View
 *
 * Renders the registration screen with full form validation, role selection,
 * real-time username availability checking, and password strength indication.
 *
 * HCI Principles:
 * - Nielsen Heuristic #1 (Visibility): Loading states, real-time validation feedback
 * - Nielsen Heuristic #5 (Error Prevention): Submit disabled until all fields valid
 * - Nielsen Heuristic #9 (Help users recognise errors): Inline field-level errors
 * - Accessibility: Labels, aria attributes, keyboard navigation, focus management
 *
 * @file js/views/RegisterView.js
 * @module views/RegisterView
 */

import { register } from '../auth/auth.js';
import { isUsernameTaken } from '../utils/storage.js';

/** Debounce delay for username availability check (ms) */
const USERNAME_CHECK_DELAY = 400;

/** Minimum password length */
const MIN_PASSWORD_LENGTH = 6;

/**
 * RegisterView class
 * Manages the registration form UI, validation, and role selection
 */
class RegisterView {
    /**
     * Create a RegisterView instance
     * @param {Object} options - View configuration
     * @param {Function} options.onRegisterSuccess - Callback after successful registration
     * @param {Function} options.onSwitchToLogin - Callback to navigate to login view
     */
    constructor({ onRegisterSuccess = () => {}, onSwitchToLogin = () => {} } = {}) {
        this.onRegisterSuccess = onRegisterSuccess;
        this.onSwitchToLogin = onSwitchToLogin;
        this.container = null;
        this.form = null;
        this.isLoading = false;
        this.selectedRole = null;
        this._usernameCheckTimer = null;
        this._fieldState = {
            fullName: false,
            email: false,
            username: false,
            password: false,
            confirmPassword: false,
            role: false
        };
    }

    /**
     * Render the register view into a container
     * @param {HTMLElement} container - The DOM element to render into
     */
    render(container) {
        if (!container) return;
        this.container = container;

        container.innerHTML = `
            <div class="login-container">
                <div class="login-card register-card">
                    <header class="login-header">
                        <h1 class="login-logo">Furnish<span class="login-logo-accent">View</span></h1>
                        <p class="login-subtitle">Create your account</p>
                    </header>

                    <form id="register-form" class="login-form register-form" novalidate>
                        <!-- Full Name -->
                        <div class="form-group login-input-group">
                            <label class="form-label" for="register-fullname">Full Name</label>
                            <div class="login-input-wrapper">
                                <span class="login-input-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </span>
                                <input
                                    type="text"
                                    id="register-fullname"
                                    name="fullName"
                                    class="form-input login-input"
                                    placeholder="Enter your full name"
                                    autocomplete="name"
                                    required
                                >
                            </div>
                            <span class="register-field-msg" id="fullname-msg"></span>
                        </div>

                        <!-- Email -->
                        <div class="form-group login-input-group">
                            <label class="form-label" for="register-email">Email</label>
                            <div class="login-input-wrapper">
                                <span class="login-input-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                </span>
                                <input
                                    type="email"
                                    id="register-email"
                                    name="email"
                                    class="form-input login-input"
                                    placeholder="you@example.com"
                                    autocomplete="email"
                                    required
                                >
                            </div>
                            <span class="register-field-msg" id="email-msg"></span>
                        </div>

                        <!-- Username -->
                        <div class="form-group login-input-group">
                            <label class="form-label" for="register-username">Username</label>
                            <div class="login-input-wrapper">
                                <span class="login-input-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                </span>
                                <input
                                    type="text"
                                    id="register-username"
                                    name="username"
                                    class="form-input login-input"
                                    placeholder="Choose a username"
                                    autocomplete="username"
                                    autocapitalize="none"
                                    spellcheck="false"
                                    required
                                >
                                <span class="register-username-status" id="username-status" aria-live="polite"></span>
                            </div>
                            <span class="register-field-msg" id="username-msg"></span>
                        </div>

                        <!-- Password -->
                        <div class="form-group login-input-group">
                            <label class="form-label" for="register-password">Password</label>
                            <div class="login-input-wrapper">
                                <span class="login-input-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </span>
                                <input
                                    type="password"
                                    id="register-password"
                                    name="password"
                                    class="form-input login-input"
                                    placeholder="Minimum 6 characters"
                                    autocomplete="new-password"
                                    required
                                >
                            </div>
                            <div class="register-strength" id="password-strength">
                                <div class="register-strength__bar">
                                    <span class="register-strength__segment" data-level="1"></span>
                                    <span class="register-strength__segment" data-level="2"></span>
                                    <span class="register-strength__segment" data-level="3"></span>
                                    <span class="register-strength__segment" data-level="4"></span>
                                </div>
                                <span class="register-strength__label" id="strength-label"></span>
                            </div>
                        </div>

                        <!-- Confirm Password -->
                        <div class="form-group login-input-group">
                            <label class="form-label" for="register-confirm">Confirm Password</label>
                            <div class="login-input-wrapper">
                                <span class="login-input-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                </span>
                                <input
                                    type="password"
                                    id="register-confirm"
                                    name="confirmPassword"
                                    class="form-input login-input"
                                    placeholder="Re-enter your password"
                                    autocomplete="new-password"
                                    required
                                >
                            </div>
                            <span class="register-field-msg" id="confirm-msg"></span>
                        </div>

                        <!-- Role Selector -->
                        <div class="form-group">
                            <label class="form-label">I am a...</label>
                            <div class="register-roles" id="register-roles">
                                <button
                                    type="button"
                                    class="register-role-card"
                                    data-role="admin"
                                    aria-pressed="false"
                                >
                                    <span class="register-role-card__icon">
                                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                        </svg>
                                    </span>
                                    <span class="register-role-card__title">Designer</span>
                                    <span class="register-role-card__desc">Create professional room designs for customers</span>
                                </button>
                                <button
                                    type="button"
                                    class="register-role-card"
                                    data-role="user"
                                    aria-pressed="false"
                                >
                                    <span class="register-role-card__icon">
                                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                            <polyline points="9 22 9 12 15 12 15 22"/>
                                        </svg>
                                    </span>
                                    <span class="register-role-card__title">Customer</span>
                                    <span class="register-role-card__desc">Design your own room and browse furniture</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            id="register-submit"
                            class="login-submit"
                            disabled
                        >
                            <span class="login-submit-text">Create Account</span>
                            <span class="login-submit-loading" aria-hidden="true"></span>
                        </button>
                    </form>

                    <div id="register-error" class="login-error" role="alert" aria-live="polite"></div>

                    <footer class="login-footer">
                        <div class="login-footer-links">
                            Already have an account? <button type="button" class="register-switch-link login-footer-link login-footer-link--bold" id="register-switch-login">Sign In</button>
                        </div>
                    </footer>
                </div>

                <p class="login-academic-footer">PUSL3122 — HCI &amp; Computer Graphics</p>
            </div>
        `;

        this._cacheElements();
        this._attachListeners();

        requestAnimationFrame(() => {
            this._els.fullName?.focus();
        });
    }

    /**
     * Cache frequently accessed DOM elements
     * @private
     */
    _cacheElements() {
        this.form = this.container.querySelector('#register-form');
        this._els = {
            fullName: this.container.querySelector('#register-fullname'),
            email: this.container.querySelector('#register-email'),
            username: this.container.querySelector('#register-username'),
            password: this.container.querySelector('#register-password'),
            confirm: this.container.querySelector('#register-confirm'),
            submit: this.container.querySelector('#register-submit'),
            error: this.container.querySelector('#register-error'),
            usernameStatus: this.container.querySelector('#username-status'),
            strengthLabel: this.container.querySelector('#strength-label'),
            strengthSegments: this.container.querySelectorAll('.register-strength__segment'),
            roleCards: this.container.querySelectorAll('.register-role-card'),
            switchLogin: this.container.querySelector('#register-switch-login'),
            fullNameMsg: this.container.querySelector('#fullname-msg'),
            emailMsg: this.container.querySelector('#email-msg'),
            usernameMsg: this.container.querySelector('#username-msg'),
            confirmMsg: this.container.querySelector('#confirm-msg')
        };
    }

    /**
     * Attach all event listeners for form validation and interaction
     * @private
     */
    _attachListeners() {
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });

        this._els.fullName?.addEventListener('input', () => this._validateFullName());
        this._els.email?.addEventListener('input', () => this._validateEmail());
        this._els.username?.addEventListener('input', () => this._handleUsernameInput());
        this._els.password?.addEventListener('input', () => {
            this._validatePassword();
            if (this._els.confirm?.value) this._validateConfirm();
        });
        this._els.confirm?.addEventListener('input', () => this._validateConfirm());

        this._els.roleCards.forEach(card => {
            card.addEventListener('click', () => this._selectRole(card.dataset.role));
        });

        this._els.switchLogin?.addEventListener('click', () => this.onSwitchToLogin());

        // Clear global error on any input change
        const inputs = [this._els.fullName, this._els.email, this._els.username, this._els.password, this._els.confirm];
        inputs.forEach(input => {
            input?.addEventListener('input', () => this._clearError());
        });
    }

    /**
     * Validate full name field
     * @private
     */
    _validateFullName() {
        const value = this._els.fullName?.value.trim() || '';
        const valid = value.length >= 2;
        this._fieldState.fullName = valid;
        this._setFieldFeedback(this._els.fullName, this._els.fullNameMsg, valid, valid ? '' : 'Name must be at least 2 characters');
        this._updateSubmitState();
    }

    /**
     * Validate email field with basic format check
     * @private
     */
    _validateEmail() {
        const value = this._els.email?.value.trim() || '';
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const valid = emailPattern.test(value);
        this._fieldState.email = valid;
        this._setFieldFeedback(this._els.email, this._els.emailMsg, valid, valid ? '' : 'Please enter a valid email address');
        this._updateSubmitState();
    }

    /**
     * Handle username input with debounced availability check
     * @private
     */
    _handleUsernameInput() {
        const value = this._els.username?.value.trim() || '';

        if (this._usernameCheckTimer) {
            clearTimeout(this._usernameCheckTimer);
        }

        if (value.length < 3) {
            this._fieldState.username = false;
            this._setUsernameStatus('', '');
            this._setFieldFeedback(this._els.username, this._els.usernameMsg, false, value.length > 0 ? 'Username must be at least 3 characters' : '');
            this._updateSubmitState();
            return;
        }

        const alphanumericPattern = /^[a-zA-Z0-9_]+$/;
        if (!alphanumericPattern.test(value)) {
            this._fieldState.username = false;
            this._setUsernameStatus('', '');
            this._setFieldFeedback(this._els.username, this._els.usernameMsg, false, 'Only letters, numbers, and underscores');
            this._updateSubmitState();
            return;
        }

        this._setUsernameStatus('Checking...', 'checking');
        this._setFieldFeedback(this._els.username, this._els.usernameMsg, null, '');

        this._usernameCheckTimer = setTimeout(() => {
            const taken = isUsernameTaken(value);
            if (taken) {
                this._fieldState.username = false;
                this._setUsernameStatus('Taken', 'taken');
                this._setFieldFeedback(this._els.username, this._els.usernameMsg, false, 'This username is already in use');
            } else {
                this._fieldState.username = true;
                this._setUsernameStatus('Available', 'available');
                this._setFieldFeedback(this._els.username, this._els.usernameMsg, true, '');
            }
            this._updateSubmitState();
        }, USERNAME_CHECK_DELAY);
    }

    /**
     * Update the username availability status indicator
     * @param {string} text - Status text
     * @param {string} state - 'checking', 'available', 'taken', or ''
     * @private
     */
    _setUsernameStatus(text, state) {
        const el = this._els.usernameStatus;
        if (!el) return;
        el.textContent = text;
        el.className = 'register-username-status';
        if (state) el.classList.add(`register-username-status--${state}`);
    }

    /**
     * Validate password and update strength indicator
     * @private
     */
    _validatePassword() {
        const value = this._els.password?.value || '';
        const strength = this._calculatePasswordStrength(value);

        this._fieldState.password = value.length >= MIN_PASSWORD_LENGTH;
        this._updateStrengthBar(strength);
        this._updateSubmitState();
    }

    /**
     * Calculate password strength score (0-4)
     * @param {string} password - The password to evaluate
     * @returns {number} Strength score from 0 to 4
     * @private
     */
    _calculatePasswordStrength(password) {
        let score = 0;
        if (password.length === 0) return 0;
        if (password.length >= MIN_PASSWORD_LENGTH) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
        return score;
    }

    /**
     * Update the visual password strength bar and label
     * @param {number} score - Strength score (0-4)
     * @private
     */
    _updateStrengthBar(score) {
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['', 'weak', 'fair', 'good', 'strong'];

        this._els.strengthSegments.forEach((seg, i) => {
            seg.className = 'register-strength__segment';
            if (i < score) seg.classList.add(`register-strength__segment--${colors[score]}`);
        });

        if (this._els.strengthLabel) {
            this._els.strengthLabel.textContent = labels[score] || '';
            this._els.strengthLabel.className = 'register-strength__label';
            if (score > 0) this._els.strengthLabel.classList.add(`register-strength__label--${colors[score]}`);
        }
    }

    /**
     * Validate confirm password matches password
     * @private
     */
    _validateConfirm() {
        const password = this._els.password?.value || '';
        const confirm = this._els.confirm?.value || '';
        const valid = confirm.length > 0 && confirm === password;
        this._fieldState.confirmPassword = valid;
        this._setFieldFeedback(
            this._els.confirm,
            this._els.confirmMsg,
            confirm.length === 0 ? null : valid,
            valid || confirm.length === 0 ? '' : 'Passwords do not match'
        );
        this._updateSubmitState();
    }

    /**
     * Select a user role
     * @param {string} role - 'admin' or 'user'
     * @private
     */
    _selectRole(role) {
        this.selectedRole = role;
        this._fieldState.role = true;

        this._els.roleCards.forEach(card => {
            const isSelected = card.dataset.role === role;
            card.classList.toggle('register-role-card--selected', isSelected);
            card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });

        this._updateSubmitState();
    }

    /**
     * Set visual feedback on a form field (valid/invalid/neutral)
     * @param {HTMLInputElement} input - The input element
     * @param {HTMLElement} msgEl - The message span element
     * @param {boolean|null} valid - true=valid, false=invalid, null=neutral
     * @param {string} message - Message text to display
     * @private
     */
    _setFieldFeedback(input, msgEl, valid, message) {
        if (input) {
            input.classList.remove('field-valid', 'field-error');
            if (valid === true) input.classList.add('field-valid');
            else if (valid === false && input.value.length > 0) input.classList.add('field-error');
        }
        if (msgEl) {
            msgEl.textContent = message;
            msgEl.className = 'register-field-msg';
            if (valid === false && message) msgEl.classList.add('register-field-msg--error');
            else if (valid === true) msgEl.classList.add('register-field-msg--valid');
        }
    }

    /**
     * Update submit button enabled/disabled state based on all field validations
     * @private
     */
    _updateSubmitState() {
        if (!this._els.submit) return;
        const allValid = Object.values(this._fieldState).every(v => v === true);
        this._els.submit.disabled = !allValid || this.isLoading;
    }

    /**
     * Show a global form-level error message
     * @param {string} message - Error message to display
     * @private
     */
    _showError(message) {
        if (!this._els.error) return;
        this._els.error.textContent = message;
        this._els.error.classList.add('visible');
        this._els.error.classList.remove('shake');
        void this._els.error.offsetWidth;
        this._els.error.classList.add('shake');
    }

    /**
     * Clear the global form-level error message
     * @private
     */
    _clearError() {
        if (!this._els.error) return;
        this._els.error.textContent = '';
        this._els.error.classList.remove('visible');
    }

    /**
     * Set loading state on the submit button
     * @param {boolean} loading - Whether to show loading state
     * @private
     */
    _setLoading(loading) {
        this.isLoading = loading;
        if (!this._els.submit) return;

        if (loading) {
            this._els.submit.classList.add('loading');
            this._els.submit.disabled = true;
            this._els.submit.setAttribute('aria-busy', 'true');
        } else {
            this._els.submit.classList.remove('loading');
            this._els.submit.removeAttribute('aria-busy');
            this._updateSubmitState();
        }
    }

    /**
     * Handle form submission — register user and auto-login
     * @private
     */
    _handleSubmit() {
        if (this.isLoading) return;

        const fullName = this._els.fullName?.value.trim() || '';
        const email = this._els.email?.value.trim() || '';
        const username = this._els.username?.value.trim() || '';
        const password = this._els.password?.value || '';
        const confirmPassword = this._els.confirm?.value || '';
        const role = this.selectedRole;

        if (password !== confirmPassword) {
            this._showError('Passwords do not match');
            return;
        }

        if (!role) {
            this._showError('Please select a role');
            return;
        }

        this._clearError();
        this._setLoading(true);

        setTimeout(() => {
            const result = register(username, password, role, fullName, email);
            this._setLoading(false);

            if (result.success) {
                this.onRegisterSuccess();
            } else {
                this._showError(result.message || 'Registration failed. Please try again.');
            }
        }, 400);
    }

    /**
     * Clean up the view
     */
    destroy() {
        if (this._usernameCheckTimer) {
            clearTimeout(this._usernameCheckTimer);
        }
        this.container = null;
        this.form = null;
        this._els = {};
    }
}

export { RegisterView };
export default RegisterView;
