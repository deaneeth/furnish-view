/**
 * FurnishView — Landing Page View
 * 
 * Apple-inspired landing page with large typography, generous whitespace,
 * scroll-triggered reveals, and a clean monochrome + warm accent palette.
 * 
 * @file js/views/LandingView.js
 * @module views/LandingView
 */

import { login } from '../auth/auth.js';

class LandingView {
    constructor({ onLoginSuccess = () => {} } = {}) {
        this.onLoginSuccess = onLoginSuccess;
        this.container = null;
        this._scrollHandler = null;
        this._keyHandler = null;
        this._intersectionObserver = null;
    }

    render(container) {
        if (!container) return;
        this.container = container;

        container.innerHTML = `
        <div class="lp">
            <!-- ===== NAV ===== -->
            <nav class="lp-nav" id="lp-nav">
                <div class="lp-nav__inner">
                    <a href="#" class="lp-nav__logo">
                        <svg class="lp-nav__logo-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        FurnishView
                    </a>
                    <div class="lp-nav__links" id="lp-nav-links">
                        <a href="#capabilities" class="lp-nav__link">Capabilities</a>
                        <a href="#workflow" class="lp-nav__link">Workflow</a>
                        <a href="#showcase" class="lp-nav__link">Showcase</a>
                    </div>
                    <div class="lp-nav__actions">
                        <button class="lp-nav__cta" id="lp-signin-btn">Sign In</button>
                        <button class="lp-nav__burger" id="lp-burger" aria-label="Toggle menu"><span></span><span></span></button>
                    </div>
                </div>
            </nav>

            <!-- ===== HERO ===== -->
            <section class="lp-hero">
                <div class="lp-hero__bg">
                    <div class="lp-hero__orb lp-hero__orb--1"></div>
                    <div class="lp-hero__orb lp-hero__orb--2"></div>
                    <div class="lp-hero__grid"></div>
                </div>
                <div class="lp-hero__content">
                    <p class="lp-hero__eyebrow">Room Design Visualizer</p>
                    <h1 class="lp-hero__title">
                        Design your space.<br>
                        <span class="lp-hero__title--accent">See it come alive.</span>
                    </h1>
                    <p class="lp-hero__sub">
                        Place furniture in 2D. Preview in real-time 3D. Save, compare, and iterate — all from your browser.
                    </p>
                    <div class="lp-hero__actions">
                        <button class="lp-btn lp-btn--primary" id="lp-hero-cta">
                            Start Designing
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
                <div class="lp-hero__visual">
                    <div class="lp-hero__mockup">
                        <div class="lp-hero__mockup-bar">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="lp-hero__mockup-body">
                            <!-- Stylized abstract floor plan -->
                            <svg viewBox="0 0 480 280" fill="none" class="lp-hero__plan">
                                <!-- Room outline -->
                                <rect x="40" y="30" width="400" height="220" rx="4" fill="#F5F0EB" stroke="#C8BDB2" stroke-width="2"/>

                                <!-- Grid lines -->
                                <line x1="140" y1="30" x2="140" y2="250" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="240" y1="30" x2="240" y2="250" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="340" y1="30" x2="340" y2="250" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="40" y1="100" x2="440" y2="100" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="40" y1="170" x2="440" y2="170" stroke="#E8E0D8" stroke-width="0.5"/>

                                <!-- Sofa -->
                                <rect class="lp-plan-item lp-plan-item--1" x="60" y="50" width="120" height="45" rx="6" fill="#6B7B6E"/>
                                <rect x="65" y="55" width="35" height="35" rx="3" fill="#7D8E80" opacity="0.6"/>
                                <rect x="105" y="55" width="35" height="35" rx="3" fill="#7D8E80" opacity="0.6"/>

                                <!-- Coffee table -->
                                <rect class="lp-plan-item lp-plan-item--2" x="85" y="115" width="70" height="40" rx="4" fill="#A0896E"/>
                                <rect x="92" y="122" width="56" height="26" rx="2" fill="none" stroke="#B8A68E" stroke-width="1"/>

                                <!-- Dining table -->
                                <rect class="lp-plan-item lp-plan-item--3" x="280" y="60" width="100" height="65" rx="5" fill="#8C7A64"/>
                                <rect x="288" y="68" width="84" height="49" rx="2" fill="none" stroke="#A0896E" stroke-width="1"/>
                                <!-- Chairs -->
                                <circle cx="300" cy="48" r="10" fill="#9C8B75"/>
                                <circle cx="360" cy="48" r="10" fill="#9C8B75"/>
                                <circle cx="300" cy="138" r="10" fill="#9C8B75"/>
                                <circle cx="360" cy="138" r="10" fill="#9C8B75"/>

                                <!-- Bed -->
                                <rect class="lp-plan-item lp-plan-item--4" x="280" y="170" width="90" height="60" rx="5" fill="#C9B99A"/>
                                <rect x="283" y="173" width="84" height="15" rx="3" fill="#D4C7AB"/>

                                <!-- Rug -->
                                <rect class="lp-plan-item lp-plan-item--5" x="60" y="160" width="140" height="70" rx="3" fill="#C4956A" opacity="0.35"/>
                                <rect x="68" y="168" width="124" height="54" rx="2" fill="none" stroke="#C4956A" stroke-width="1" opacity="0.5"/>

                                <!-- Bookshelf -->
                                <rect class="lp-plan-item lp-plan-item--6" x="420" y="50" width="15" height="60" rx="2" fill="#7B6B55"/>
                                <line x1="421" y1="70" x2="434" y2="70" stroke="#6B5B45" stroke-width="1"/>
                                <line x1="421" y1="85" x2="434" y2="85" stroke="#6B5B45" stroke-width="1"/>

                                <!-- Dimension labels -->
                                <text x="240" y="268" text-anchor="middle" fill="#9A8F84" font-size="10" font-family="system-ui">6.0m</text>
                                <text x="455" y="145" text-anchor="middle" fill="#9A8F84" font-size="10" font-family="system-ui" transform="rotate(90 455 145)">4.0m</text>
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== CAPABILITIES ===== -->
            <section class="lp-section lp-capabilities" id="capabilities">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Capabilities</p>
                    <h2 class="lp-section__title lp-reveal">
                        Designed for precision.<br>Built for creativity.
                    </h2>

                    <div class="lp-caps">
                        <div class="lp-cap lp-reveal">
                            <div class="lp-cap__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                            </div>
                            <h3>Real-Time 3D</h3>
                            <p>Switch between 2D blueprint and immersive 3D view. WebGL-powered lighting, shadows, and PBR materials.</p>
                        </div>
                        <div class="lp-cap lp-reveal">
                            <div class="lp-cap__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                            </div>
                            <h3>Precise Layouts</h3>
                            <p>Metric grid, snap-to-grid, and boundary clamping. Everything scales to exact centimeter measurements.</p>
                        </div>
                        <div class="lp-cap lp-reveal">
                            <div class="lp-cap__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                            </div>
                            <h3>Rich Catalogue</h3>
                            <p>12 furniture types with procedural textures. Drag, drop, rotate, and customize colours instantly.</p>
                        </div>
                        <div class="lp-cap lp-reveal">
                            <div class="lp-cap__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <h3>Save & Compare</h3>
                            <p>Store designs locally. Compare two layouts side-by-side. Export project JSON for sharing.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== WORKFLOW ===== -->
            <section class="lp-section lp-workflow" id="workflow">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Workflow</p>
                    <h2 class="lp-section__title lp-reveal">Three steps. Zero friction.</h2>

                    <div class="lp-steps">
                        <div class="lp-step lp-reveal">
                            <div class="lp-step__num">01</div>
                            <div class="lp-step__body">
                                <h3>Define your room</h3>
                                <p>Choose rectangular or L-shaped. Set width, depth, and height in meters. Pick wall and floor colours.</p>
                            </div>
                        </div>
                        <div class="lp-step lp-reveal">
                            <div class="lp-step__num">02</div>
                            <div class="lp-step__body">
                                <h3>Place furniture</h3>
                                <p>Select from the toolbar, click to place. Drag to reposition, scroll to rotate. Customize colours per item.</p>
                            </div>
                        </div>
                        <div class="lp-step lp-reveal">
                            <div class="lp-step__num">03</div>
                            <div class="lp-step__body">
                                <h3>Visualize in 3D</h3>
                                <p>Toggle to the 3D view. Orbit, zoom, and pan. See shadows, textures, and lighting in real time.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== SHOWCASE ===== -->
            <section class="lp-section lp-showcase" id="showcase">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Showcase</p>
                    <h2 class="lp-section__title lp-reveal">From blueprint to reality.</h2>
                    <p class="lp-section__sub lp-reveal">Every design starts as a floor plan and ends as a 3D walkthrough — rendered right in your browser.</p>

                    <div class="lp-showcase__grid lp-reveal">
                        <div class="lp-showcase__card">
                            <div class="lp-showcase__card-visual lp-showcase__card-visual--1">
                                <svg viewBox="0 0 200 140" fill="none">
                                    <rect x="10" y="10" width="180" height="120" rx="3" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1.5"/>
                                    <rect x="25" y="25" width="60" height="30" rx="4" fill="#6B7B6E"/>
                                    <rect x="40" y="70" width="45" height="25" rx="3" fill="#A0896E"/>
                                    <rect x="120" y="30" width="50" height="35" rx="3" fill="#C9B99A"/>
                                    <rect x="120" y="80" width="55" height="35" rx="3" fill="#C4956A" opacity="0.4"/>
                                </svg>
                            </div>
                            <h4>2D Blueprint</h4>
                            <p>Top-down floor plan with precise dimensions and grid</p>
                        </div>
                        <div class="lp-showcase__card">
                            <div class="lp-showcase__card-visual lp-showcase__card-visual--2">
                                <svg viewBox="0 0 200 140" fill="none">
                                    <!-- Isometric room -->
                                    <path d="M100 25 L175 65 L175 115 L100 135 L25 115 L25 65 Z" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1.5"/>
                                    <path d="M25 65 L100 85 L175 65" fill="none" stroke="#C8BDB2" stroke-width="1"/>
                                    <path d="M100 85 L100 135" stroke="#C8BDB2" stroke-width="1"/>
                                    <!-- Furniture blocks -->
                                    <rect x="55" y="72" width="30" height="15" rx="2" fill="#6B7B6E" transform="skewX(-15)"/>
                                    <rect x="100" y="80" width="25" height="12" rx="2" fill="#A0896E" transform="skewX(-15)"/>
                                </svg>
                            </div>
                            <h4>3D Preview</h4>
                            <p>Immersive WebGL view with lights, shadows, and textures</p>
                        </div>
                        <div class="lp-showcase__card">
                            <div class="lp-showcase__card-visual lp-showcase__card-visual--3">
                                <svg viewBox="0 0 200 140" fill="none">
                                    <!-- Side-by-side comparison -->
                                    <rect x="10" y="20" width="82" height="100" rx="3" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1"/>
                                    <rect x="108" y="20" width="82" height="100" rx="3" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1"/>
                                    <rect x="20" y="35" width="30" height="15" rx="2" fill="#6B7B6E"/>
                                    <rect x="20" y="60" width="25" height="12" rx="2" fill="#A0896E"/>
                                    <rect x="120" y="35" width="30" height="15" rx="2" fill="#8C7A64"/>
                                    <rect x="120" y="60" width="40" height="20" rx="2" fill="#C9B99A"/>
                                    <text x="100" y="78" text-anchor="middle" fill="#9A8F84" font-size="18" font-family="system-ui">⟷</text>
                                </svg>
                            </div>
                            <h4>Compare Side by Side</h4>
                            <p>Place two designs next to each other and spot differences</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== CTA ===== -->
            <section class="lp-section lp-cta">
                <div class="lp-section__inner">
                    <div class="lp-cta__card lp-reveal">
                        <h2>Ready to design?</h2>
                        <p>Create your first floor plan in under a minute.</p>
                        <button class="lp-btn lp-btn--primary lp-btn--lg" id="lp-cta-signin">
                            Get Started Free
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            </section>

            <!-- ===== FOOTER ===== -->
            <footer class="lp-footer">
                <div class="lp-footer__inner">
                    <div class="lp-footer__brand">
                        <span class="lp-footer__logo">FurnishView</span>
                        <p>PUSL3122 — HCI & Computer Graphics</p>
                    </div>
                    <div class="lp-footer__links">
                        <a href="#capabilities">Capabilities</a>
                        <a href="#workflow">Workflow</a>
                        <a href="#showcase">Showcase</a>
                    </div>
                </div>
                <div class="lp-footer__copy">
                    <p>&copy; 2025 FurnishView. All rights reserved.</p>
                </div>
            </footer>

            <!-- ===== LOGIN MODAL ===== -->
            <div class="lp-modal-overlay" id="lp-modal-overlay">
                <div class="lp-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title">
                    <button class="lp-modal__close" id="lp-modal-close" aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <div class="lp-modal__header">
                        <h2 id="lp-modal-title">Welcome back</h2>
                        <p>Sign in to your design workspace</p>
                    </div>
                    <form id="lp-login-form" class="lp-modal__form" novalidate>
                        <div class="lp-modal__field">
                            <label for="lp-username">Username</label>
                            <input type="text" id="lp-username" placeholder="Enter your username" autocomplete="username" autocapitalize="none" spellcheck="false" required>
                        </div>
                        <div class="lp-modal__field">
                            <label for="lp-password">Password</label>
                            <input type="password" id="lp-password" placeholder="Enter your password" autocomplete="current-password" required>
                        </div>
                        <div id="lp-login-error" class="lp-modal__error" role="alert" aria-live="polite"></div>
                        <button type="submit" id="lp-login-submit" class="lp-btn lp-btn--primary lp-btn--full" disabled>
                            <span class="lp-modal__submit-text">Continue</span>
                            <span class="lp-modal__spinner"></span>
                        </button>
                    </form>
                    <p class="lp-modal__hint">Demo: <strong>designer1</strong> / <strong>password123</strong></p>
                </div>
            </div>
        </div>
        `;

        this._cacheElements();
        this._attachListeners();
        this._initScrollAnimations();
    }

    _cacheElements() {
        this.nav = this.container.querySelector('#lp-nav');
        this.overlay = this.container.querySelector('#lp-modal-overlay');
        this.loginForm = this.container.querySelector('#lp-login-form');
        this.usernameInput = this.container.querySelector('#lp-username');
        this.passwordInput = this.container.querySelector('#lp-password');
        this.submitBtn = this.container.querySelector('#lp-login-submit');
        this.errorEl = this.container.querySelector('#lp-login-error');
        this.burger = this.container.querySelector('#lp-burger');
        this.navLinks = this.container.querySelector('#lp-nav-links');
    }

    _attachListeners() {
        // Sign-In triggers
        [
            this.container.querySelector('#lp-signin-btn'),
            this.container.querySelector('#lp-hero-cta'),
            this.container.querySelector('#lp-cta-signin')
        ].forEach(btn => btn?.addEventListener('click', () => this._openModal()));

        // Close modal
        this.container.querySelector('#lp-modal-close')?.addEventListener('click', () => this._closeModal());
        this.overlay?.addEventListener('click', e => { if (e.target === this.overlay) this._closeModal(); });

        // Escape
        this._keyHandler = e => { if (e.key === 'Escape') this._closeModal(); };
        document.addEventListener('keydown', this._keyHandler);

        // Login form
        this.loginForm?.addEventListener('submit', e => { e.preventDefault(); this._handleLogin(); });

        // Enable/disable submit
        const updateBtn = () => {
            const ok = this.usernameInput?.value.trim() && this.passwordInput?.value.trim();
            if (this.submitBtn) this.submitBtn.disabled = !ok;
        };
        this.usernameInput?.addEventListener('input', updateBtn);
        this.passwordInput?.addEventListener('input', updateBtn);

        // Navbar scroll
        this._scrollHandler = () => this.nav?.classList.toggle('scrolled', window.scrollY > 40);
        window.addEventListener('scroll', this._scrollHandler, { passive: true });
        this._scrollHandler();

        // Smooth scroll anchors
        this.container.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', e => {
                const el = document.querySelector(link.getAttribute('href'));
                if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); this.navLinks?.classList.remove('open'); this.burger?.classList.remove('open'); }
            });
        });

        // Mobile burger
        this.burger?.addEventListener('click', () => {
            this.burger.classList.toggle('open');
            this.navLinks?.classList.toggle('open');
        });
    }

    _openModal() {
        if (this.overlay) {
            this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => this.usernameInput?.focus());
        }
    }

    _closeModal() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
            this._clearError();
        }
    }

    async _handleLogin() {
        const username = this.usernameInput?.value.trim();
        const password = this.passwordInput?.value.trim();
        if (!username || !password) { this._showError('Please enter both fields.'); return; }

        this.submitBtn?.setAttribute('disabled', '');
        this.submitBtn?.classList.add('loading');
        await new Promise(r => setTimeout(r, 400));

        const result = login(username, password);
        this.submitBtn?.classList.remove('loading');

        if (result.success) {
            this._closeModal();
            this.onLoginSuccess();
        } else {
            this._showError(result.message || 'Invalid credentials');
            if (username && password && this.submitBtn) this.submitBtn.removeAttribute('disabled');
        }
    }

    _showError(msg) {
        if (this.errorEl) { this.errorEl.textContent = '⚠ ' + msg; this.errorEl.classList.add('visible'); }
    }

    _clearError() {
        if (this.errorEl) { this.errorEl.textContent = ''; this.errorEl.classList.remove('visible'); }
    }

    _initScrollAnimations() {
        const items = this.container.querySelectorAll('.lp-reveal');
        if (!items.length) return;

        this._intersectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this._intersectionObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        items.forEach(el => this._intersectionObserver.observe(el));
    }

    destroy() {
        if (this._scrollHandler) window.removeEventListener('scroll', this._scrollHandler);
        if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
        if (this._intersectionObserver) this._intersectionObserver.disconnect();
        document.body.style.overflow = '';
    }
}

export { LandingView };
export default LandingView;
