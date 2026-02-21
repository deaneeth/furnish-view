/**
 * FurnishView — Landing Page View
 * 
 * Premium landing/hero page with full-width hero image, animated sections,
 * feature showcase, process timeline, gallery, CTA, and integrated login modal.
 * 
 * @file js/views/LandingView.js
 * @module views/LandingView
 */

import { login } from '../auth/auth.js';

/**
 * LandingView class
 * Renders the full landing page and handles login modal interactions
 */
class LandingView {
    /**
     * @param {Object} options
     * @param {Function} options.onLoginSuccess - Callback after successful sign-in
     */
    constructor({ onLoginSuccess = () => {} } = {}) {
        this.onLoginSuccess = onLoginSuccess;
        this.container = null;
        this._scrollHandler = null;
        this._keyHandler = null;
        this._intersectionObserver = null;
        this._statObserver = null;
    }

    /**
     * Render the landing page into the given container
     * @param {HTMLElement} container
     */
    render(container) {
        if (!container) return;
        this.container = container;

        container.innerHTML = `
        <div class="landing-page">
            <!-- ===== NAVBAR ===== -->
            <nav class="landing-nav" id="landing-nav">
                <div class="landing-nav-inner">
                    <a href="#" class="landing-logo">
                        <span class="landing-logo-icon">
                            <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
                                <rect x="10" y="60" width="80" height="30" rx="6" fill="#3B82F6"/>
                                <rect x="20" y="40" width="60" height="25" rx="5" fill="#60A5FA"/>
                                <circle cx="25" cy="55" r="4" fill="#93C5FD"/>
                                <circle cx="75" cy="55" r="4" fill="#93C5FD"/>
                            </svg>
                        </span>
                        Furnish <span class="landing-logo-accent">View</span>
                    </a>
                    <div class="landing-nav-links" id="landing-nav-links">
                        <a href="#features" class="landing-nav-link">Features</a>
                        <a href="#how-it-works" class="landing-nav-link">How It Works</a>
                        <a href="#gallery" class="landing-nav-link">Gallery</a>
                    </div>
                    <div class="landing-nav-actions">
                        <button class="landing-nav-signin" id="landing-signin-btn">Sign In</button>
                        <button class="landing-nav-hamburger" id="landing-hamburger" aria-label="Toggle menu">
                            <span></span><span></span><span></span>
                        </button>
                    </div>
                </div>
            </nav>

            <!-- ===== HERO ===== -->
            <section class="landing-hero">
                <div class="landing-hero-bg">
                    <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1920&q=80&auto=format"
                         alt="Modern living room interior"
                         class="landing-hero-img" />
                    <div class="landing-hero-overlay"></div>
                </div>
                <div class="landing-hero-inner">
                    <div class="landing-hero-content">
                        <p class="landing-hero-badge">✨ Room Design Visualizer</p>
                        <h1 class="landing-hero-title">
                            Craft Your <span class="landing-hero-highlight">Dream<br>Space</span>
                        </h1>
                        <p class="landing-hero-subtitle">
                            Design and visualize furniture layouts in real time,<br>
                            bringing your perfect room to life in stunning 3D.
                        </p>
                        <div class="landing-hero-cta">
                            <button class="landing-btn-primary" id="landing-hero-cta">
                                Get Started
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </button>
                            <a href="#features" class="landing-btn-ghost">
                                Learn More
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Stats overlay at bottom of hero -->
                <div class="landing-stats">
                    <div class="landing-stats-inner">
                        <div class="landing-stat" data-target="138" data-suffix="+">
                            <span class="landing-stat-number" data-count="0">0</span>
                            <span class="landing-stat-label">Designs Created</span>
                        </div>
                        <div class="landing-stat-divider"></div>
                        <div class="landing-stat" data-target="14" data-suffix="+">
                            <span class="landing-stat-number" data-count="0">0</span>
                            <span class="landing-stat-label">Furni Full Colors</span>
                        </div>
                        <div class="landing-stat-divider"></div>
                        <div class="landing-stat" data-target="1" data-suffix="D">
                            <span class="landing-stat-number" data-count="0">0</span>
                            <span class="landing-stat-label">Visual Mode</span>
                        </div>
                        <div class="landing-stat-divider"></div>
                        <div class="landing-stat" data-target="27" data-suffix="%">
                            <span class="landing-stat-number" data-count="0">0</span>
                            <span class="landing-stat-label">Client Lite</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== FEATURES ===== -->
            <section class="landing-features" id="features">
                <div class="landing-section-inner">
                    <div class="landing-section-header">
                        <span class="landing-section-badge">Features</span>
                        <h2 class="landing-section-title">Design with Precision</h2>
                        <p class="landing-section-desc">Powerful tools to create, customize, and visualize your ideal space.</p>
                    </div>

                    <div class="landing-features-grid">
                        <div class="landing-feature-card landing-animate-on-scroll">
                            <div class="landing-feature-icon landing-feature-icon--blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                            </div>
                            <h3 class="landing-feature-title">Room Customization</h3>
                            <p class="landing-feature-desc">Define exact dimensions, shapes, and floor colors to fit any room type.</p>
                        </div>
                        <div class="landing-feature-card landing-animate-on-scroll">
                            <div class="landing-feature-icon landing-feature-icon--amber">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            </div>
                            <h3 class="landing-feature-title">3D Visualization</h3>
                            <p class="landing-feature-desc">Instantly preview your layout in photorealistic 3D with lighting and rendering.</p>
                        </div>
                        <div class="landing-feature-card landing-animate-on-scroll">
                            <div class="landing-feature-icon landing-feature-icon--green">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            </div>
                            <h3 class="landing-feature-title">Perfect Scaling</h3>
                            <p class="landing-feature-desc">Real-world dimensions mapped to pixel-perfect canvas — accurate every time.</p>
                        </div>
                        <div class="landing-feature-card landing-animate-on-scroll">
                            <div class="landing-feature-icon landing-feature-icon--rose">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><polyline points="16 3 12 7 8 3"/></svg>
                            </div>
                            <h3 class="landing-feature-title">Furniture Catalogue</h3>
                            <p class="landing-feature-desc">Choose from chairs, tables, sofas, bookshelves and more — drag and drop onto your canvas.</p>
                        </div>
                        <div class="landing-feature-card landing-animate-on-scroll">
                            <div class="landing-feature-icon landing-feature-icon--purple">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            </div>
                            <h3 class="landing-feature-title">Save & Edit Designs</h3>
                            <p class="landing-feature-desc">Save your work locally, modify, fine-tune, critically, and iterate across as inspiration.</p>
                        </div>
                        <div class="landing-feature-card landing-animate-on-scroll">
                            <div class="landing-feature-icon landing-feature-icon--cyan">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                            </div>
                            <h3 class="landing-feature-title">Design Comparison</h3>
                            <p class="landing-feature-desc">Compare two layouts side by side — help clients choose their favourite option.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== HOW IT WORKS ===== -->
            <section class="landing-process" id="how-it-works">
                <div class="landing-section-inner">
                    <div class="landing-section-header">
                        <span class="landing-section-badge">How It Works</span>
                        <h2 class="landing-section-title">Streamlined Design Process</h2>
                        <p class="landing-section-desc">From room specs to 3D visualization — in three easy steps.</p>
                    </div>

                    <div class="landing-process-steps">
                        <div class="landing-process-step landing-animate-on-scroll">
                            <div class="landing-process-number">1</div>
                            <div class="landing-process-content">
                                <h3>Enter Room Details</h3>
                                <p>Specify your room dimensions, shape, and colour scheme — or pick from our presets.</p>
                            </div>
                        </div>
                        <div class="landing-process-connector"><div class="landing-process-connector-line"></div></div>
                        <div class="landing-process-step landing-animate-on-scroll">
                            <div class="landing-process-number">2</div>
                            <div class="landing-process-content">
                                <h3>Place Furniture</h3>
                                <p>Drag furniture from the catalogue, re-position, and customize colours, and size options.</p>
                            </div>
                        </div>
                        <div class="landing-process-connector"><div class="landing-process-connector-line"></div></div>
                        <div class="landing-process-step landing-animate-on-scroll">
                            <div class="landing-process-number">3</div>
                            <div class="landing-process-content">
                                <h3>View In 2D</h3>
                                <p>Toggle to a different edit, 2D + 3D view, orbit, zoom, and present to your client.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== GALLERY / SHOWCASE ===== -->
            <section class="landing-gallery" id="gallery">
                <div class="landing-section-inner">
                    <div class="landing-section-header landing-section-header--light">
                        <span class="landing-section-badge landing-section-badge--light">Gallery</span>
                        <h2 class="landing-section-title landing-section-title--light">Inspiration Gallery</h2>
                        <p class="landing-section-desc landing-section-desc--light">Explore more projects created by in-store designers.</p>
                    </div>

                    <div class="landing-gallery-grid">
                        <div class="landing-gallery-card landing-animate-on-scroll">
                            <div class="landing-gallery-preview">
                                <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80&auto=format" alt="Modern Living Room" loading="lazy" />
                            </div>
                            <div class="landing-gallery-info">
                                <h4>Modern Living Room</h4>
                                <p>5 x 5m — Contemporary Style</p>
                            </div>
                        </div>
                        <div class="landing-gallery-card landing-animate-on-scroll">
                            <div class="landing-gallery-preview">
                                <img src="https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80&auto=format" alt="Warm Dining Room" loading="lazy" />
                            </div>
                            <div class="landing-gallery-info">
                                <h4>Warm Dining Room</h4>
                                <p>4 x 4.5m — Friendly Elegance</p>
                            </div>
                        </div>
                        <div class="landing-gallery-card landing-animate-on-scroll">
                            <div class="landing-gallery-preview">
                                <img src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80&auto=format" alt="Home Office" loading="lazy" />
                            </div>
                            <div class="landing-gallery-info">
                                <h4>Home Office</h4>
                                <p>4 x 4m — Modern of Minimal</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== CTA ===== -->
            <section class="landing-cta">
                <div class="landing-cta-inner">
                    <div class="landing-cta-card">
                        <h2>Ready to Design Your Space?</h2>
                        <p>Create beautiful furniture layouts that bring your client's vision to life.</p>
                        <button class="landing-cta-btn" id="landing-cta-signin">
                            Sign In and Design
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            </section>

            <!-- ===== FOOTER ===== -->
            <footer class="landing-footer">
                <div class="landing-footer-inner">
                    <div class="landing-footer-brand">
                        <span class="landing-logo landing-logo--footer">
                            <span class="landing-logo-icon">
                                <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                                    <rect x="10" y="60" width="80" height="30" rx="6" fill="#3B82F6"/>
                                    <rect x="20" y="40" width="60" height="25" rx="5" fill="#60A5FA"/>
                                </svg>
                            </span>
                            Furnish <span class="landing-logo-accent">View</span>
                        </span>
                        <p class="landing-footer-tagline">PUSL3122 — HCI & Computer Graphics</p>
                    </div>
                    <div class="landing-footer-links">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">Process</a>
                        <a href="#gallery">Gallery</a>
                    </div>
                    <div class="landing-footer-sparkle" aria-hidden="true">
                        <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                            <path d="M50 0 L56 44 L100 50 L56 56 L50 100 L44 56 L0 50 L44 44 Z" fill="rgba(255,255,255,0.08)"/>
                        </svg>
                    </div>
                </div>
                <div class="landing-footer-bottom">
                    <p>&copy; 2025 FurnishView. All rights reserved.</p>
                </div>
            </footer>

            <!-- ===== LOGIN MODAL ===== -->
            <div class="landing-modal-backdrop" id="landing-modal-backdrop">
                <div class="landing-modal" role="dialog" aria-modal="true" aria-labelledby="landing-modal-title">
                    <button class="landing-modal-close" id="landing-modal-close" aria-label="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <div class="landing-modal-header">
                        <h2 id="landing-modal-title" class="landing-modal-title">Welcome Back</h2>
                        <p class="landing-modal-subtitle">Sign in to your design workspace</p>
                    </div>
                    <form id="landing-login-form" class="landing-modal-form" novalidate>
                        <div class="landing-modal-field">
                            <label for="landing-username">Username</label>
                            <div class="landing-modal-input-wrap">
                                <svg class="landing-modal-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <input type="text" id="landing-username" placeholder="Enter your username" autocomplete="username" autocapitalize="none" spellcheck="false" required>
                            </div>
                        </div>
                        <div class="landing-modal-field">
                            <label for="landing-password">Password</label>
                            <div class="landing-modal-input-wrap">
                                <svg class="landing-modal-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <input type="password" id="landing-password" placeholder="Enter your password" autocomplete="current-password" required>
                            </div>
                        </div>
                        <div id="landing-login-error" class="landing-modal-error" role="alert" aria-live="polite"></div>
                        <button type="submit" id="landing-login-submit" class="landing-modal-submit" disabled>
                            <span class="landing-modal-submit-text">Sign In</span>
                            <span class="landing-modal-submit-spinner"></span>
                        </button>
                    </form>
                    <p class="landing-modal-hint">Test: <strong>designer1</strong> / <strong>password123</strong></p>
                </div>
            </div>
        </div>
        `;

        this._cacheElements();
        this._attachListeners();
        this._initScrollAnimations();
        this._initStatCounters();
    }

    /** Cache frequently accessed DOM elements */
    _cacheElements() {
        this.nav = this.container.querySelector('#landing-nav');
        this.backdrop = this.container.querySelector('#landing-modal-backdrop');
        this.loginForm = this.container.querySelector('#landing-login-form');
        this.usernameInput = this.container.querySelector('#landing-username');
        this.passwordInput = this.container.querySelector('#landing-password');
        this.submitBtn = this.container.querySelector('#landing-login-submit');
        this.errorEl = this.container.querySelector('#landing-login-error');
        this.hamburger = this.container.querySelector('#landing-hamburger');
        this.navLinks = this.container.querySelector('#landing-nav-links');
    }

    /** Wire up all event listeners */
    _attachListeners() {
        // Sign-In buttons → open modal
        const signinBtns = [
            this.container.querySelector('#landing-signin-btn'),
            this.container.querySelector('#landing-hero-cta'),
            this.container.querySelector('#landing-cta-signin')
        ];
        signinBtns.forEach(btn => {
            if (btn) btn.addEventListener('click', () => this._openModal());
        });

        // Close modal
        this.container.querySelector('#landing-modal-close')
            ?.addEventListener('click', () => this._closeModal());
        this.backdrop?.addEventListener('click', (e) => {
            if (e.target === this.backdrop) this._closeModal();
        });

        // Escape key closes modal
        this._keyHandler = (e) => {
            if (e.key === 'Escape') this._closeModal();
        };
        document.addEventListener('keydown', this._keyHandler);

        // Login form
        this.loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleLogin();
        });

        // Enable/disable submit
        const updateBtn = () => {
            const hasValues = this.usernameInput?.value.trim() && this.passwordInput?.value.trim();
            if (this.submitBtn) this.submitBtn.disabled = !hasValues;
        };
        this.usernameInput?.addEventListener('input', updateBtn);
        this.passwordInput?.addEventListener('input', updateBtn);

        // Navbar scroll effect
        this._scrollHandler = () => {
            if (this.nav) {
                this.nav.classList.toggle('scrolled', window.scrollY > 40);
            }
        };
        window.addEventListener('scroll', this._scrollHandler, { passive: true });
        this._scrollHandler();

        // Smooth scroll for anchor links
        this.container.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Close mobile menu if open
                    this.navLinks?.classList.remove('open');
                    this.hamburger?.classList.remove('open');
                }
            });
        });

        // Mobile hamburger toggle
        this.hamburger?.addEventListener('click', () => {
            this.hamburger.classList.toggle('open');
            this.navLinks?.classList.toggle('open');
        });
    }

    /** Open the login modal */
    _openModal() {
        if (this.backdrop) {
            this.backdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => this.usernameInput?.focus());
        }
    }

    /** Close the login modal */
    _closeModal() {
        if (this.backdrop) {
            this.backdrop.classList.remove('active');
            document.body.style.overflow = '';
            this._clearError();
        }
    }

    /** Handle login form submission */
    async _handleLogin() {
        const username = this.usernameInput?.value.trim();
        const password = this.passwordInput?.value.trim();

        if (!username || !password) {
            this._showError('Please enter both fields.');
            return;
        }

        // Show loading
        this.submitBtn?.setAttribute('disabled', '');
        this.submitBtn?.classList.add('loading');

        // Small delay to show the spinner UX
        await new Promise(r => setTimeout(r, 400));

        const result = login(username, password);

        this.submitBtn?.classList.remove('loading');

        if (result.success) {
            this._closeModal();
            this.onLoginSuccess();
        } else {
            this._showError(result.message || 'Invalid credentials');
            const hasValues = username && password;
            if (this.submitBtn && hasValues) this.submitBtn.removeAttribute('disabled');
        }
    }

    /** Show error message */
    _showError(msg) {
        if (this.errorEl) {
            this.errorEl.textContent = '⚠ ' + msg;
            this.errorEl.classList.add('visible');
        }
    }

    /** Clear error message */
    _clearError() {
        if (this.errorEl) {
            this.errorEl.textContent = '';
            this.errorEl.classList.remove('visible');
        }
    }

    /** Initialize IntersectionObserver for scroll-triggered animations */
    _initScrollAnimations() {
        const items = this.container.querySelectorAll('.landing-animate-on-scroll');
        if (!items.length) return;

        this._intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this._intersectionObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        items.forEach(el => this._intersectionObserver.observe(el));
    }

    /** Animate stat counters when visible */
    _initStatCounters() {
        const stats = this.container.querySelectorAll('.landing-stat');
        if (!stats.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const numEl = el.querySelector('.landing-stat-number');
                    const target = parseInt(el.dataset.target, 10);
                    const suffix = el.dataset.suffix || '';
                    this._animateCounter(numEl, target, suffix);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        stats.forEach(s => observer.observe(s));
        this._statObserver = observer;
    }

    /** Smoothly counts a number element from 0 to target */
    _animateCounter(el, target, suffix) {
        if (!el) return;
        const duration = 1800;
        const start = performance.now();

        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = current + suffix;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /** Clean up all listeners and observers */
    destroy() {
        if (this._scrollHandler) window.removeEventListener('scroll', this._scrollHandler);
        if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
        if (this._intersectionObserver) this._intersectionObserver.disconnect();
        if (this._statObserver) this._statObserver.disconnect();
        document.body.style.overflow = '';
    }
}

export { LandingView };
export default LandingView;
