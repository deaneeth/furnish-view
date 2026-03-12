/**
 * FurnishView — Landing Page View
 * 
 * Apple-inspired landing page with large typography, generous whitespace,
 * scroll-triggered reveals, and a clean monochrome + warm accent palette.
 * 
 * @file js/views/LandingView.js
 * @module views/LandingView
 */

import { login, register } from '../auth/auth.js';
import { isUsernameTaken } from '../utils/storage.js';

class LandingView {
    constructor({ onLoginSuccess = () => {} } = {}) {
        this.onLoginSuccess = onLoginSuccess;
        this.container = null;
        this._scrollHandler = null;
        this._keyHandler = null;
        this._intersectionObserver = null;
        this._usernameCheckTimer = null;
        this._currentPanel = 'login';
        this._selectedRole = null;
        this._regFieldState = {
            fullName: false,
            email: false,
            username: false,
            password: false,
            confirmPassword: false,
            role: false
        };
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
                        <a href="#demo" class="lp-nav__link">How It Works</a>
                        <a href="#gallery" class="lp-nav__link">Gallery</a>
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
                    <div class="lp-hero__orb lp-hero__orb--3"></div>
                    <div class="lp-hero__grid"></div>
                </div>
                <div class="lp-hero__content">
                    <div class="lp-hero__badge">
                        <span class="lp-hero__badge-pulse"></span>
                        Room Design Visualizer — Now with Real-Time 3D
                    </div>
                    <h1 class="lp-hero__title">
                        Design your space.<br>
                        <span class="lp-hero__title--accent">See it come alive.</span>
                    </h1>
                    <p class="lp-hero__sub">
                        Place furniture in 2D. Preview in real-time 3D. Save, compare, and iterate — all from your browser.
                    </p>
                    <div class="lp-hero__actions">
                        <button class="lp-btn lp-btn--primary" id="lp-hero-cta">
                            Start Designing Free
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                        <a href="#demo" class="lp-btn lp-btn--ghost">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
                            See how it works
                        </a>
                    </div>
                    <div class="lp-hero__trust">
                        <div class="lp-hero__trust-avatars">
                            <span class="lp-hero__trust-av" style="--av-bg:#B8864E">D</span>
                            <span class="lp-hero__trust-av" style="--av-bg:#6B7B6E">S</span>
                            <span class="lp-hero__trust-av" style="--av-bg:#8C7A64">M</span>
                            <span class="lp-hero__trust-av" style="--av-bg:#C9A88A;--av-fg:#5c4a2f">A</span>
                            <span class="lp-hero__trust-av" style="--av-bg:#9B8E7C">+</span>
                        </div>
                        <div class="lp-hero__trust-info">
                            <div class="lp-hero__trust-stars">★★★★★</div>
                            <div class="lp-hero__trust-label">Loved by 5,000+ designers &amp; homeowners</div>
                        </div>
                    </div>
                </div>
                <div class="lp-hero__visual">
                    <div class="lp-hero__mockup">
                        <div class="lp-hero__mockup-bar">
                            <span></span><span></span><span></span>
                            <span class="lp-hero__mockup-url">furnishview.app/design/living-room</span>
                        </div>
                        <div class="lp-hero__mockup-body">
                            <svg viewBox="0 0 480 280" fill="none" class="lp-hero__plan">
                                <rect x="40" y="30" width="400" height="220" rx="4" fill="#F5F0EB" stroke="#C8BDB2" stroke-width="2"/>
                                <line x1="140" y1="30" x2="140" y2="250" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="240" y1="30" x2="240" y2="250" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="340" y1="30" x2="340" y2="250" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="40" y1="100" x2="440" y2="100" stroke="#E8E0D8" stroke-width="0.5"/>
                                <line x1="40" y1="170" x2="440" y2="170" stroke="#E8E0D8" stroke-width="0.5"/>
                                <rect class="lp-plan-item lp-plan-item--1" x="60" y="50" width="120" height="45" rx="6" fill="#6B7B6E"/>
                                <rect x="65" y="55" width="35" height="35" rx="3" fill="#7D8E80" opacity="0.6"/>
                                <rect x="105" y="55" width="35" height="35" rx="3" fill="#7D8E80" opacity="0.6"/>
                                <rect class="lp-plan-item lp-plan-item--2" x="85" y="115" width="70" height="40" rx="4" fill="#A0896E"/>
                                <rect x="92" y="122" width="56" height="26" rx="2" fill="none" stroke="#B8A68E" stroke-width="1"/>
                                <rect class="lp-plan-item lp-plan-item--3" x="280" y="60" width="100" height="65" rx="5" fill="#8C7A64"/>
                                <rect x="288" y="68" width="84" height="49" rx="2" fill="none" stroke="#A0896E" stroke-width="1"/>
                                <circle cx="300" cy="48" r="10" fill="#9C8B75"/>
                                <circle cx="360" cy="48" r="10" fill="#9C8B75"/>
                                <circle cx="300" cy="138" r="10" fill="#9C8B75"/>
                                <circle cx="360" cy="138" r="10" fill="#9C8B75"/>
                                <rect class="lp-plan-item lp-plan-item--4" x="280" y="170" width="90" height="60" rx="5" fill="#C9B99A"/>
                                <rect x="283" y="173" width="84" height="15" rx="3" fill="#D4C7AB"/>
                                <rect class="lp-plan-item lp-plan-item--5" x="60" y="160" width="140" height="70" rx="3" fill="#C4956A" opacity="0.35"/>
                                <rect x="68" y="168" width="124" height="54" rx="2" fill="none" stroke="#C4956A" stroke-width="1" opacity="0.5"/>
                                <rect class="lp-plan-item lp-plan-item--6" x="420" y="50" width="15" height="60" rx="2" fill="#7B6B55"/>
                                <line x1="421" y1="70" x2="434" y2="70" stroke="#6B5B45" stroke-width="1"/>
                                <line x1="421" y1="85" x2="434" y2="85" stroke="#6B5B45" stroke-width="1"/>
                                <text x="240" y="268" text-anchor="middle" fill="#9A8F84" font-size="10" font-family="system-ui">6.0m</text>
                                <text x="455" y="145" text-anchor="middle" fill="#9A8F84" font-size="10" font-family="system-ui" transform="rotate(90 455 145)">4.0m</text>
                            </svg>
                        </div>
                        <div class="lp-hero__mockup-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                            3D View Ready
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

            <!-- ===== 2D → 3D DEMO ===== -->
            <section class="lp-section lp-demo" id="demo">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Live Transformation</p>
                    <h2 class="lp-section__title lp-reveal">Watch your blueprint come to life.</h2>
                    <p class="lp-section__sub lp-reveal">Every design starts as a precise 2D floor plan and transforms into an immersive 3D space — rendered live in your browser.</p>
                    <div class="lp-demo__stage lp-reveal">
                        <div class="lp-demo__panel">
                            <div class="lp-demo__panel-tag">
                                <span class="lp-demo__panel-dot" style="background:#6B7B6E"></span>
                                2D Blueprint
                            </div>
                            <div class="lp-demo__canvas">
                                <svg viewBox="0 0 320 200" fill="none">
                                    <rect x="20" y="15" width="280" height="170" rx="3" fill="#F5F0EB" stroke="#C8BDB2" stroke-width="1.5"/>
                                    <line x1="113" y1="15" x2="113" y2="185" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <line x1="206" y1="15" x2="206" y2="185" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <line x1="20" y1="78" x2="300" y2="78" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <line x1="20" y1="137" x2="300" y2="137" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <rect x="35" y="28" width="68" height="38" rx="5" fill="#6B7B6E"/>
                                    <rect x="40" y="32" width="20" height="29" rx="2" fill="#7D8E80" opacity="0.6"/>
                                    <rect x="64" y="32" width="20" height="29" rx="2" fill="#7D8E80" opacity="0.6"/>
                                    <rect x="46" y="76" width="48" height="32" rx="3" fill="#A0896E"/>
                                    <rect x="51" y="81" width="38" height="22" rx="1.5" fill="none" stroke="#B8A68E" stroke-width="0.8"/>
                                    <rect x="162" y="26" width="72" height="48" rx="4" fill="#8C7A64"/>
                                    <rect x="167" y="31" width="62" height="38" rx="2" fill="none" stroke="#A0896E" stroke-width="0.8"/>
                                    <circle cx="176" cy="19" r="7" fill="#9C8B75"/>
                                    <circle cx="222" cy="19" r="7" fill="#9C8B75"/>
                                    <circle cx="176" cy="82" r="7" fill="#9C8B75"/>
                                    <circle cx="222" cy="82" r="7" fill="#9C8B75"/>
                                    <rect x="162" y="120" width="68" height="52" rx="4" fill="#C9B99A"/>
                                    <rect x="165" y="123" width="62" height="14" rx="2" fill="#D4C7AB"/>
                                    <rect x="35" y="118" width="106" height="56" rx="3" fill="#C4956A" opacity="0.25"/>
                                    <text x="160" y="197" text-anchor="middle" fill="#9A8F84" font-size="8" font-family="system-ui">4.0m × 3.0m</text>
                                </svg>
                            </div>
                        </div>
                        <div class="lp-demo__arrow">
                            <div class="lp-demo__arrow-flow">
                                <span class="lp-demo__arrow-dot"></span>
                                <span class="lp-demo__arrow-dot"></span>
                                <span class="lp-demo__arrow-dot"></span>
                            </div>
                            <div class="lp-demo__arrow-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                            <span class="lp-demo__arrow-label">Transform</span>
                        </div>
                        <div class="lp-demo__panel lp-demo__panel--3d">
                            <div class="lp-demo__panel-tag">
                                <span class="lp-demo__panel-dot" style="background:#B8864E"></span>
                                3D Preview
                            </div>
                            <div class="lp-demo__canvas lp-demo__canvas--perspective">
                                <!-- 1-point perspective interior: VP at (160, 91) -->
                                <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <!-- Ceiling -->
                                    <polygon points="0,0 320,0 244,38 76,38" fill="#F4ECE2"/>
                                    <!-- Back wall -->
                                    <rect x="76" y="38" width="168" height="107" fill="#EDE5D8"/>
                                    <!-- Left wall -->
                                    <polygon points="0,0 0,200 76,145 76,38" fill="#DDD0BC"/>
                                    <!-- Right wall -->
                                    <polygon points="320,0 320,200 244,145 244,38" fill="#DDD0BC"/>
                                    <!-- Floor -->
                                    <polygon points="0,200 320,200 244,145 76,145" fill="#C8A678"/>
                                    <!-- Floor wood planks (perspective lines converging to VP) -->
                                    <line x1="0" y1="200" x2="76" y2="145" stroke="#B08C5E" stroke-width="0.6" opacity="0.5"/>
                                    <line x1="64" y1="200" x2="100" y2="145" stroke="#B08C5E" stroke-width="0.6" opacity="0.35"/>
                                    <line x1="128" y1="200" x2="124" y2="145" stroke="#B08C5E" stroke-width="0.6" opacity="0.35"/>
                                    <line x1="192" y1="200" x2="148" y2="145" stroke="#B08C5E" stroke-width="0.6" opacity="0.35"/>
                                    <line x1="256" y1="200" x2="172" y2="145" stroke="#B08C5E" stroke-width="0.6" opacity="0.35"/>
                                    <line x1="320" y1="200" x2="244" y2="145" stroke="#B08C5E" stroke-width="0.6" opacity="0.5"/>
                                    <!-- Ceiling cornice lines -->
                                    <line x1="0" y1="0" x2="76" y2="38" stroke="#E6DDD2" stroke-width="0.8" opacity="0.7"/>
                                    <line x1="320" y1="0" x2="244" y2="38" stroke="#E6DDD2" stroke-width="0.8" opacity="0.7"/>
                                    <!-- Window on back wall -->
                                    <rect x="106" y="50" width="108" height="72" rx="2" fill="#A8C4DC"/>
                                    <rect x="110" y="54" width="48" height="64" rx="1" fill="#C4E0F4" opacity="0.78"/>
                                    <rect x="162" y="54" width="48" height="64" rx="1" fill="#C4E0F4" opacity="0.78"/>
                                    <line x1="158" y1="50" x2="158" y2="122" stroke="#8AAEC6" stroke-width="1.5"/>
                                    <line x1="106" y1="86" x2="214" y2="86" stroke="#8AAEC6" stroke-width="1.5"/>
                                    <!-- Sunlight shaft on floor -->
                                    <polygon points="106,145 214,145 250,200 70,200" fill="#D8BE8A" opacity="0.18"/>
                                    <!-- Wall art frame (right of window) -->
                                    <rect x="194" y="54" width="36" height="28" rx="2" fill="#8C7454"/>
                                    <rect x="198" y="58" width="28" height="20" rx="1" fill="#A88C68" opacity="0.7"/>
                                    <!-- Baseboard left -->
                                    <polygon points="0,198 0,200 76,147 76,145" fill="#C0AE98" opacity="0.6"/>
                                    <!-- Baseboard right -->
                                    <polygon points="320,198 320,200 244,147 244,145" fill="#C0AE98" opacity="0.6"/>
                                    <!-- ===== SOFA (near front, trapezoid perspective) ===== -->
                                    <!-- Sofa back panel -->
                                    <path d="M52,154 L268,154 L263,144 L57,144 Z" fill="#7A8E7E"/>
                                    <!-- Sofa seat -->
                                    <path d="M38,186 L282,186 L268,154 L52,154 Z" fill="#697D6C"/>
                                    <!-- Left arm -->
                                    <path d="M38,186 L52,154 L52,141 L41,141 L30,172 Z" fill="#5A6D5D"/>
                                    <!-- Right arm -->
                                    <path d="M282,186 L268,154 L268,141 L279,141 L290,172 Z" fill="#5A6D5D"/>
                                    <!-- Cushion dividers -->
                                    <line x1="103" y1="144" x2="106" y2="154" stroke="#8C9E8F" stroke-width="1.2"/>
                                    <line x1="160" y1="144" x2="160" y2="154" stroke="#8C9E8F" stroke-width="1.2"/>
                                    <line x1="217" y1="144" x2="214" y2="154" stroke="#8C9E8F" stroke-width="1.2"/>
                                    <!-- Sofa back top edge -->
                                    <line x1="41" y1="141" x2="279" y2="141" stroke="#8C9E8F" stroke-width="1" opacity="0.5"/>
                                    <!-- Sofa legs -->
                                    <rect x="55" y="183" width="5" height="5" rx="1" fill="#3C2C18" opacity="0.55"/>
                                    <rect x="262" y="183" width="5" height="5" rx="1" fill="#3C2C18" opacity="0.55"/>
                                    <!-- ===== COFFEE TABLE ===== -->
                                    <!-- Table top surface -->
                                    <path d="M120,153 L200,153 L196,145 L124,145 Z" fill="#CAA870"/>
                                    <!-- Table apron (front face) -->
                                    <path d="M124,145 L196,145 L196,153 L120,153 Z" fill="#B8966A" opacity="0.0"/>
                                    <path d="M120,153 L200,153 L200,162 L118,162 Z" fill="#B89060"/>
                                    <!-- Legs -->
                                    <line x1="124" y1="162" x2="122" y2="170" stroke="#9A7840" stroke-width="1.5"/>
                                    <line x1="198" y1="162" x2="200" y2="170" stroke="#9A7840" stroke-width="1.5"/>
                                    <!-- Items on table -->
                                    <circle cx="152" cy="150" r="4" fill="#D4A86A" opacity="0.75"/>
                                    <rect x="162" y="148" width="14" height="4" rx="1" fill="#B88850" opacity="0.65"/>
                                    <!-- ===== FLOOR LAMP (right corner) ===== -->
                                    <rect x="234" y="148" width="6" height="3" rx="1" fill="#5C4428"/>
                                    <line x1="237" y1="148" x2="238" y2="116" stroke="#6C5438" stroke-width="1.5"/>
                                    <line x1="238" y1="116" x2="241" y2="108" stroke="#6C5438" stroke-width="1.5"/>
                                    <path d="M234,108 L248,108 L245,116 L237,116 Z" fill="#ECC458" opacity="0.9"/>
                                    <!-- Lamp glow -->
                                    <ellipse cx="241" cy="120" rx="18" ry="9" fill="#F0D870" opacity="0.1"/>
                                    <!-- ===== PLANT (left corner) ===== -->
                                    <rect x="4" y="185" width="16" height="13" rx="2" fill="#7A5C3A"/>
                                    <circle cx="12" cy="179" r="11" fill="#5C7A4A" opacity="0.82"/>
                                    <circle cx="5" cy="174" r="7" fill="#6A8A58" opacity="0.68"/>
                                    <circle cx="19" cy="175" r="8" fill="#6A8A58" opacity="0.68"/>
                                    <!-- ===== CEILING PENDANT ===== -->
                                    <line x1="160" y1="0" x2="160" y2="37" stroke="#C8B898" stroke-width="1" opacity="0.55"/>
                                    <path d="M153,37 L167,37 L164,44 L156,44 Z" fill="#F0DC80" opacity="0.75"/>
                                    <!-- Pendant glow on ceiling -->
                                    <ellipse cx="160" cy="38" rx="40" ry="10" fill="#F5E890" opacity="0.08"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== WORKFLOW ===== -->
            <section class="lp-section lp-workflow" id="workflow">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Workflow</p>
                    <h2 class="lp-section__title lp-reveal">Three steps. Zero friction.</h2>
                    <p class="lp-section__sub lp-workflow__sub lp-reveal">From blank canvas to furnished room in minutes. No downloads, no training, no hassle.</p>

                    <div class="lp-steps">
                        <div class="lp-step lp-reveal">
                            <div class="lp-step__card">
                                <div class="lp-step__num-wrap">
                                    <div class="lp-step__num">01</div>
                                    <div class="lp-step__num-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                                    </div>
                                </div>
                                <div class="lp-step__body">
                                    <h3>Define your room</h3>
                                    <p>Choose rectangular or L-shaped. Set width, depth, and height in meters. Pick wall and floor colours.</p>
                                </div>
                                <div class="lp-step__visual">
                                    <svg viewBox="0 0 120 72" fill="none">
                                        <rect x="8" y="8" width="104" height="56" rx="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="4 3"/>
                                        <line x1="60" y1="8" x2="60" y2="64" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
                                        <line x1="8" y1="36" x2="112" y2="36" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
                                        <text x="60" y="40" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="7" font-family="system-ui">6.0m × 4.0m</text>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="lp-step-connector lp-reveal">
                            <div class="lp-step-connector__line"></div>
                        </div>
                        <div class="lp-step lp-reveal">
                            <div class="lp-step__card">
                                <div class="lp-step__num-wrap">
                                    <div class="lp-step__num">02</div>
                                    <div class="lp-step__num-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                                    </div>
                                </div>
                                <div class="lp-step__body">
                                    <h3>Place furniture</h3>
                                    <p>Select from the toolbar, click to place. Drag to reposition, scroll to rotate. Customize colours per item.</p>
                                </div>
                                <div class="lp-step__visual">
                                    <svg viewBox="0 0 120 72" fill="none">
                                        <rect x="8" y="8" width="104" height="56" rx="3" fill="rgba(255,255,255,0.03)"/>
                                        <rect x="15" y="15" width="38" height="24" rx="3" fill="rgba(107,123,110,0.55)"/>
                                        <rect x="63" y="19" width="30" height="20" rx="3" fill="rgba(140,122,100,0.45)"/>
                                        <rect x="15" y="48" width="78" height="12" rx="2" fill="rgba(196,149,106,0.3)"/>
                                        <circle cx="22" cy="13" r="5" fill="rgba(156,139,117,0.5)"/>
                                        <circle cx="50" cy="13" r="5" fill="rgba(156,139,117,0.5)"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="lp-step-connector lp-reveal">
                            <div class="lp-step-connector__line"></div>
                        </div>
                        <div class="lp-step lp-reveal">
                            <div class="lp-step__card">
                                <div class="lp-step__num-wrap">
                                    <div class="lp-step__num">03</div>
                                    <div class="lp-step__num-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                                    </div>
                                </div>
                                <div class="lp-step__body">
                                    <h3>Visualize in 3D</h3>
                                    <p>Toggle to the 3D view. Orbit, zoom, and pan. See shadows, textures, and lighting in real time.</p>
                                </div>
                                <div class="lp-step__visual">
                                    <svg viewBox="0 0 120 72" fill="none">
                                        <path d="M60 12 L100 32 L100 58 L60 70 L20 58 L20 32 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                                        <path d="M20 32 L60 50 L100 32" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
                                        <rect x="34" y="35" width="22" height="11" rx="2" fill="rgba(107,123,110,0.5)" transform="skewX(-10)"/>
                                        <rect x="64" y="39" width="16" height="9" rx="2" fill="rgba(140,122,100,0.4)" transform="skewX(-10)"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== INSPIRATION GALLERY ===== -->
            <section class="lp-section lp-gallery" id="gallery">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Inspiration Gallery</p>
                    <h2 class="lp-section__title lp-reveal">Rooms designed by our community.</h2>
                    <p class="lp-section__sub lp-reveal">Browse stunning layouts created in FurnishView. Hover to explore each room.</p>

                    <div class="lp-gallery__grid lp-reveal">
                        <div class="lp-gallery__card">
                            <div class="lp-gallery__thumb">
                                <svg viewBox="0 0 360 260" fill="none">
                                    <rect width="360" height="260" fill="#F2EDE7"/>
                                    <line x1="120" y1="0" x2="120" y2="260" stroke="#EAE3DC" stroke-width="0.8"/>
                                    <line x1="240" y1="0" x2="240" y2="260" stroke="#EAE3DC" stroke-width="0.8"/>
                                    <line x1="0" y1="100" x2="360" y2="100" stroke="#EAE3DC" stroke-width="0.8"/>
                                    <line x1="0" y1="180" x2="360" y2="180" stroke="#EAE3DC" stroke-width="0.8"/>
                                    <!-- L-shaped sofa -->
                                    <rect x="28" y="24" width="130" height="52" rx="8" fill="#7A9B8A"/>
                                    <rect x="28" y="24" width="36" height="52" rx="6" fill="#8AAB9A" opacity="0.7"/>
                                    <rect x="68" y="24" width="36" height="52" rx="6" fill="#8AAB9A" opacity="0.7"/>
                                    <rect x="108" y="24" width="36" height="52" rx="6" fill="#8AAB9A" opacity="0.7"/>
                                    <rect x="28" y="68" width="52" height="50" rx="6" fill="#7A9B8A"/>
                                    <!-- Coffee table -->
                                    <rect x="72" y="90" width="68" height="44" rx="5" fill="#B8996A"/>
                                    <rect x="78" y="96" width="56" height="32" rx="3" fill="none" stroke="#C9AA80" stroke-width="1.2"/>
                                    <!-- Rug -->
                                    <ellipse cx="100" cy="138" rx="72" ry="40" fill="#D4956A" opacity="0.2"/>
                                    <!-- TV unit -->
                                    <rect x="248" y="18" width="90" height="22" rx="4" fill="#5C4E3A"/>
                                    <rect x="254" y="24" width="78" height="10" rx="2" fill="#3E3228" opacity="0.5"/>
                                    <!-- Plants -->
                                    <circle cx="316" cy="70" r="14" fill="#6B8C5E" opacity="0.8"/>
                                    <circle cx="316" cy="62" r="10" fill="#7CA36D" opacity="0.6"/>
                                    <rect x="312" y="82" width="8" height="12" rx="2" fill="#8B6F47"/>
                                    <!-- Dining set -->
                                    <rect x="210" y="108" width="110" height="76" rx="6" fill="#9B836A"/>
                                    <rect x="217" y="115" width="96" height="62" rx="3" fill="none" stroke="#B09A80" stroke-width="1"/>
                                    <circle cx="228" cy="100" r="11" fill="#B09A80"/>
                                    <circle cx="266" cy="100" r="11" fill="#B09A80"/>
                                    <circle cx="304" cy="100" r="11" fill="#B09A80"/>
                                    <circle cx="228" cy="193" r="11" fill="#B09A80"/>
                                    <circle cx="266" cy="193" r="11" fill="#B09A80"/>
                                    <circle cx="304" cy="193" r="11" fill="#B09A80"/>
                                    <!-- Bookshelf -->
                                    <rect x="28" y="200" width="18" height="52" rx="2" fill="#7B6B55"/>
                                    <line x1="29" y1="216" x2="45" y2="216" stroke="#6B5B45" stroke-width="1.2"/>
                                    <line x1="29" y1="228" x2="45" y2="228" stroke="#6B5B45" stroke-width="1.2"/>
                                    <line x1="29" y1="240" x2="45" y2="240" stroke="#6B5B45" stroke-width="1.2"/>
                                    <!-- Dimension label -->
                                    <text x="180" y="252" text-anchor="middle" fill="#B0A898" font-size="9" font-family="system-ui">6.0m × 5.2m</text>
                                </svg>
                            </div>
                            <div class="lp-gallery__info">
                                <span class="lp-gallery__name">Modern Living Room</span>
                            </div>
                            <div class="lp-gallery__overlay">
                                <div class="lp-gallery__overlay-content">
                                    <h3>Modern Living Room</h3>
                                    <div class="lp-gallery__tags">
                                        <span class="lp-gallery__tag">Contemporary</span>
                                        <span class="lp-gallery__tag">Warm Tones</span>
                                        <span class="lp-gallery__tag">Open Plan</span>
                                    </div>
                                    <p class="lp-gallery__desc">A warm, open-plan living space with L-shaped sofa, artisan coffee table, and statement plants.</p>
                                    <div class="lp-gallery__meta">
                                        <span>6.0m × 5.2m</span>
                                        <span>·</span>
                                        <span>31 sq m</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="lp-gallery__card">
                            <div class="lp-gallery__thumb">
                                <svg viewBox="0 0 360 260" fill="none">
                                    <rect width="360" height="260" fill="#F6F2EF"/>
                                    <line x1="120" y1="0" x2="120" y2="260" stroke="#EEE9E4" stroke-width="0.8"/>
                                    <line x1="240" y1="0" x2="240" y2="260" stroke="#EEE9E4" stroke-width="0.8"/>
                                    <line x1="0" y1="100" x2="360" y2="100" stroke="#EEE9E4" stroke-width="0.8"/>
                                    <line x1="0" y1="180" x2="360" y2="180" stroke="#EEE9E4" stroke-width="0.8"/>
                                    <!-- King bed -->
                                    <rect x="76" y="48" width="134" height="110" rx="8" fill="#E8DFDA"/>
                                    <rect x="80" y="52" width="126" height="26" rx="5" fill="#C9B8B0"/>
                                    <rect x="86" y="82" width="114" height="70" rx="4" fill="#F0E8E2"/>
                                    <!-- Pillows -->
                                    <rect x="88" y="54" width="44" height="20" rx="4" fill="#D9CCCA"/>
                                    <rect x="154" y="54" width="44" height="20" rx="4" fill="#D9CCCA"/>
                                    <!-- Rug -->
                                    <rect x="52" y="160" width="182" height="72" rx="4" fill="#E8D4CA" opacity="0.5"/>
                                    <rect x="58" y="166" width="170" height="60" rx="2" fill="none" stroke="#D4B8AE" stroke-width="1" opacity="0.6"/>
                                    <!-- Nightstands -->
                                    <rect x="24" y="72" width="48" height="42" rx="5" fill="#C8A97A"/>
                                    <circle cx="48" cy="93" r="5" fill="#B09060" opacity="0.6"/>
                                    <rect x="214" y="72" width="48" height="42" rx="5" fill="#C8A97A"/>
                                    <circle cx="238" cy="93" r="5" fill="#B09060" opacity="0.6"/>
                                    <!-- Wardrobe -->
                                    <rect x="268" y="18" width="78" height="130" rx="4" fill="#D4C4B0"/>
                                    <line x1="307" y1="18" x2="307" y2="148" stroke="#C4B0A0" stroke-width="1"/>
                                    <circle cx="298" cy="83" r="3.5" fill="#B09A7A"/>
                                    <circle cx="316" cy="83" r="3.5" fill="#B09A7A"/>
                                    <!-- Dressing table -->
                                    <rect x="18" y="172" width="72" height="40" rx="4" fill="#C8A97A"/>
                                    <rect x="22" y="140" width="64" height="28" rx="3" fill="#B09880" opacity="0.7"/>
                                    <!-- Plant -->
                                    <circle cx="328" cy="178" r="16" fill="#8BA87A" opacity="0.7"/>
                                    <rect x="323" y="192" width="10" height="14" rx="2" fill="#8B6F47"/>
                                    <text x="180" y="252" text-anchor="middle" fill="#B8A898" font-size="9" font-family="system-ui">4.5m × 4.0m</text>
                                </svg>
                            </div>
                            <div class="lp-gallery__info">
                                <span class="lp-gallery__name">Scandinavian Bedroom</span>
                            </div>
                            <div class="lp-gallery__overlay">
                                <div class="lp-gallery__overlay-content">
                                    <h3>Scandinavian Bedroom</h3>
                                    <div class="lp-gallery__tags">
                                        <span class="lp-gallery__tag">Scandinavian</span>
                                        <span class="lp-gallery__tag">Minimalist</span>
                                        <span class="lp-gallery__tag">Natural Light</span>
                                    </div>
                                    <p class="lp-gallery__desc">Clean lines, light oak accents, and a neutral palette create a serene sleep sanctuary.</p>
                                    <div class="lp-gallery__meta">
                                        <span>4.5m × 4.0m</span>
                                        <span>·</span>
                                        <span>18 sq m</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="lp-gallery__card">
                            <div class="lp-gallery__thumb">
                                <svg viewBox="0 0 360 260" fill="none">
                                    <rect width="360" height="260" fill="#F0EDE8"/>
                                    <line x1="120" y1="0" x2="120" y2="260" stroke="#E8E2DA" stroke-width="0.8"/>
                                    <line x1="240" y1="0" x2="240" y2="260" stroke="#E8E2DA" stroke-width="0.8"/>
                                    <line x1="0" y1="100" x2="360" y2="100" stroke="#E8E2DA" stroke-width="0.8"/>
                                    <line x1="0" y1="180" x2="360" y2="180" stroke="#E8E2DA" stroke-width="0.8"/>
                                    <!-- L-shaped desk -->
                                    <rect x="22" y="18" width="160" height="38" rx="4" fill="#5C4E3A"/>
                                    <rect x="22" y="18" width="40" height="90" rx="4" fill="#5C4E3A"/>
                                    <!-- Monitor(s) -->
                                    <rect x="72" y="26" width="52" height="30" rx="3" fill="#2A2420"/>
                                    <rect x="78" y="30" width="40" height="22" rx="1.5" fill="#1A1410" opacity="0.9"/>
                                    <rect x="92" y="54" width="12" height="4" rx="1" fill="#3A3028"/>
                                    <!-- Second monitor -->
                                    <rect x="136" y="26" width="40" height="26" rx="3" fill="#2A2420"/>
                                    <rect x="140" y="29" width="32" height="18" rx="1.5" fill="#1A1410" opacity="0.9"/>
                                    <!-- Keyboard -->
                                    <rect x="64" y="40" width="62" height="12" rx="2" fill="#7A6A58"/>
                                    <!-- Chair -->
                                    <circle cx="108" cy="120" r="30" fill="#3A3028" opacity="0.5"/>
                                    <rect x="90" y="106" width="36" height="28" rx="5" fill="#4A3C2C"/>
                                    <!-- Tall bookshelf -->
                                    <rect x="294" y="18" width="52" height="220" rx="3" fill="#8B7560"/>
                                    <line x1="295" y1="60" x2="345" y2="60" stroke="#7A6448" stroke-width="1.2"/>
                                    <line x1="295" y1="100" x2="345" y2="100" stroke="#7A6448" stroke-width="1.2"/>
                                    <line x1="295" y1="140" x2="345" y2="140" stroke="#7A6448" stroke-width="1.2"/>
                                    <line x1="295" y1="180" x2="345" y2="180" stroke="#7A6448" stroke-width="1.2"/>
                                    <rect x="298" y="62" width="20" height="36" rx="1" fill="#6B9080" opacity="0.4"/>
                                    <rect x="320" y="68" width="22" height="30" rx="1" fill="#9B7060" opacity="0.4"/>
                                    <rect x="298" y="102" width="44" height="36" rx="1" fill="#7A8B60" opacity="0.3"/>
                                    <!-- Side cabinet -->
                                    <rect x="186" y="18" width="88" height="52" rx="4" fill="#8B7560"/>
                                    <rect x="190" y="22" width="38" height="44" rx="2" fill="#7A6448" opacity="0.4"/>
                                    <rect x="232" y="22" width="38" height="44" rx="2" fill="#7A6448" opacity="0.4"/>
                                    <!-- Desk lamp -->
                                    <circle cx="60" cy="32" r="6" fill="#D4A84E" opacity="0.7"/>
                                    <!-- Plant -->
                                    <circle cx="234" cy="92" r="18" fill="#6B8C5E" opacity="0.65"/>
                                    <circle cx="234" cy="82" r="12" fill="#7CA36D" opacity="0.5"/>
                                    <rect x="230" y="108" width="9" height="14" rx="2" fill="#8B6F47"/>
                                    <text x="180" y="252" text-anchor="middle" fill="#B0A898" font-size="9" font-family="system-ui">3.8m × 3.2m</text>
                                </svg>
                            </div>
                            <div class="lp-gallery__info">
                                <span class="lp-gallery__name">Creative Home Office</span>
                            </div>
                            <div class="lp-gallery__overlay">
                                <div class="lp-gallery__overlay-content">
                                    <h3>Creative Home Office</h3>
                                    <div class="lp-gallery__tags">
                                        <span class="lp-gallery__tag">Minimal</span>
                                        <span class="lp-gallery__tag">Productive</span>
                                        <span class="lp-gallery__tag">Dark Wood</span>
                                    </div>
                                    <p class="lp-gallery__desc">Dual-monitor L-desk setup with wall-to-wall shelving. Designed for deep work and creativity.</p>
                                    <div class="lp-gallery__meta">
                                        <span>3.8m × 3.2m</span>
                                        <span>·</span>
                                        <span>12 sq m</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== SHOWCASE ===== -->
            <section class="lp-section lp-showcase" id="showcase">
                <div class="lp-section__inner">
                    <p class="lp-section__eyebrow lp-reveal">Showcase</p>
                    <h2 class="lp-section__title lp-reveal">Every view. One platform.</h2>
                    <p class="lp-section__sub lp-reveal">Every design starts as a floor plan and ends as a 3D walkthrough — rendered right in your browser.</p>

                    <div class="lp-showcase__grid lp-reveal">
                        <div class="lp-showcase__card">
                            <div class="lp-showcase__card-visual lp-showcase__card-visual--1">
                                <div class="lp-showcase__card-badge">Top-Down</div>
                                <svg viewBox="0 0 200 140" fill="none">
                                    <rect x="10" y="10" width="180" height="120" rx="3" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1.5"/>
                                    <line x1="70" y1="10" x2="70" y2="130" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <line x1="130" y1="10" x2="130" y2="130" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <line x1="10" y1="55" x2="190" y2="55" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <line x1="10" y1="90" x2="190" y2="90" stroke="#E8E0D8" stroke-width="0.5"/>
                                    <rect x="18" y="18" width="44" height="28" rx="4" fill="#6B7B6E"/>
                                    <rect x="23" y="22" width="14" height="20" rx="2" fill="#7D8E80" opacity="0.6"/>
                                    <rect x="40" y="22" width="14" height="20" rx="2" fill="#7D8E80" opacity="0.6"/>
                                    <rect x="26" y="58" width="34" height="22" rx="3" fill="#A0896E"/>
                                    <rect x="98" y="18" width="40" height="28" rx="3" fill="#C9B99A"/>
                                    <rect x="103" y="23" width="30" height="18" rx="1.5" fill="#D4C7AB"/>
                                    <rect x="98" y="60" width="82" height="28" rx="3" fill="#C4956A" opacity="0.3"/>
                                </svg>
                            </div>
                            <div class="lp-showcase__card-body">
                                <h4>2D Blueprint</h4>
                                <p>Top-down floor plan with precise dimensions and grid</p>
                            </div>
                        </div>
                        <div class="lp-showcase__card">
                            <div class="lp-showcase__card-visual lp-showcase__card-visual--2">
                                <div class="lp-showcase__card-badge">Isometric</div>
                                <svg viewBox="0 0 200 140" fill="none">
                                    <path d="M100 18 L178 58 L178 108 L100 130 L22 108 L22 58 Z" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1.5"/>
                                    <path d="M22 58 L100 80 L178 58" fill="none" stroke="#D8D0C8" stroke-width="1"/>
                                    <path d="M100 80 L100 130" stroke="#D8D0C8" stroke-width="0.8"/>
                                    <rect x="40" y="64" width="36" height="16" rx="2" fill="#6B7B6E" transform="skewX(-14)"/>
                                    <rect x="40" y="78" width="36" height="8" rx="1" fill="#556358" transform="skewX(-14)"/>
                                    <rect x="90" y="72" width="28" height="12" rx="2" fill="#A0896E" transform="skewX(-14)"/>
                                    <rect x="90" y="82" width="28" height="6" rx="1" fill="#8A7358" transform="skewX(-14)"/>
                                    <rect x="126" y="60" width="30" height="20" rx="2" fill="#C9B99A" transform="skewX(-14)"/>
                                </svg>
                            </div>
                            <div class="lp-showcase__card-body">
                                <h4>3D Preview</h4>
                                <p>Immersive WebGL view with lights, shadows, and textures</p>
                            </div>
                        </div>
                        <div class="lp-showcase__card">
                            <div class="lp-showcase__card-visual lp-showcase__card-visual--3">
                                <div class="lp-showcase__card-badge">Compare</div>
                                <svg viewBox="0 0 200 140" fill="none">
                                    <rect x="8" y="16" width="82" height="108" rx="3" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1"/>
                                    <rect x="110" y="16" width="82" height="108" rx="3" fill="#F0EBE5" stroke="#C8BDB2" stroke-width="1"/>
                                    <rect x="16" y="28" width="28" height="14" rx="2" fill="#6B7B6E"/>
                                    <rect x="16" y="52" width="22" height="11" rx="2" fill="#A0896E"/>
                                    <rect x="16" y="76" width="60" height="32" rx="2" fill="#C4956A" opacity="0.25"/>
                                    <rect x="118" y="28" width="28" height="14" rx="2" fill="#8C7A64"/>
                                    <rect x="118" y="52" width="38" height="18" rx="2" fill="#C9B99A"/>
                                    <rect x="118" y="76" width="66" height="32" rx="2" fill="#B8864E" opacity="0.2"/>
                                    <path d="M97 70 L103 70 M100 66 L104 70 L100 74" stroke="#9A8F84" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="lp-showcase__card-body">
                                <h4>Compare Side by Side</h4>
                                <p>Place two designs next to each other and spot differences</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ===== CTA ===== -->
            <section class="lp-section lp-cta">
                <div class="lp-section__inner">
                    <div class="lp-cta__card lp-reveal">
                        <div class="lp-cta__orb lp-cta__orb--1"></div>
                        <div class="lp-cta__orb lp-cta__orb--2"></div>
                        <p class="lp-cta__eyebrow">Start for free. No card required.</p>
                        <h2>Ready to design your perfect space?</h2>
                        <p>Create your first floor plan in under a minute. Join thousands of designers and homeowners.</p>
                        <div class="lp-cta__actions">
                            <button class="lp-btn lp-btn--primary lp-btn--lg" id="lp-cta-signin">
                                Get Started Free
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                        <div class="lp-cta__features">
                            <span>✓ Free forever</span>
                            <span>✓ No download needed</span>
                            <span>✓ 12 furniture types</span>
                            <span>✓ Real-time 3D</span>
                        </div>
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
                        <a href="#demo">How It Works</a>
                        <a href="#gallery">Gallery</a>
                        <a href="#showcase">Showcase</a>
                    </div>
                </div>
                <div class="lp-footer__copy">
                    <p>&copy; 2025 FurnishView. All rights reserved.</p>
                </div>
            </footer>

            <!-- ===== AUTH MODAL ===== -->
            <div class="lp-modal-overlay" id="lp-modal-overlay">
                <div class="lp-modal lp-modal--auth" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title">
                    <button class="lp-modal__close" id="lp-modal-close" aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>

                    <!-- LOGIN PANEL -->
                    <div class="lp-modal__panel" id="lp-login-panel">
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
                        <p class="lp-modal__switch">Don't have an account? <button type="button" class="lp-modal__switch-link" id="lp-switch-register">Sign Up</button></p>
                    </div>

                    <!-- REGISTER PANEL -->
                    <div class="lp-modal__panel lp-modal__panel--hidden" id="lp-register-panel">
                        <div class="lp-modal__header">
                            <h2>Create your account</h2>
                            <p>Join FurnishView to start designing</p>
                        </div>
                        <form id="lp-register-form" class="lp-modal__form" novalidate>
                            <div class="lp-modal__field">
                                <label for="lp-reg-fullname">Full Name</label>
                                <input type="text" id="lp-reg-fullname" placeholder="Enter your full name" autocomplete="name" required>
                                <span class="lp-modal__field-msg" id="lp-reg-fullname-msg"></span>
                            </div>
                            <div class="lp-modal__field">
                                <label for="lp-reg-email">Email</label>
                                <input type="email" id="lp-reg-email" placeholder="you@example.com" autocomplete="email" required>
                                <span class="lp-modal__field-msg" id="lp-reg-email-msg"></span>
                            </div>
                            <div class="lp-modal__field">
                                <label for="lp-reg-username">Username</label>
                                <div class="lp-modal__field-input-wrap">
                                    <input type="text" id="lp-reg-username" placeholder="Choose a username" autocomplete="username" autocapitalize="none" spellcheck="false" required>
                                    <span class="lp-reg-username-status" id="lp-reg-username-status" aria-live="polite"></span>
                                </div>
                                <span class="lp-modal__field-msg" id="lp-reg-username-msg"></span>
                            </div>
                            <div class="lp-modal__field">
                                <label for="lp-reg-password">Password</label>
                                <input type="password" id="lp-reg-password" placeholder="Minimum 6 characters" autocomplete="new-password" required>
                                <div class="lp-reg-strength" id="lp-reg-strength">
                                    <div class="lp-reg-strength__bar">
                                        <span class="lp-reg-strength__seg" data-level="1"></span>
                                        <span class="lp-reg-strength__seg" data-level="2"></span>
                                        <span class="lp-reg-strength__seg" data-level="3"></span>
                                        <span class="lp-reg-strength__seg" data-level="4"></span>
                                    </div>
                                    <span class="lp-reg-strength__label" id="lp-reg-strength-label"></span>
                                </div>
                            </div>
                            <div class="lp-modal__field">
                                <label for="lp-reg-confirm">Confirm Password</label>
                                <input type="password" id="lp-reg-confirm" placeholder="Re-enter your password" autocomplete="new-password" required>
                                <span class="lp-modal__field-msg" id="lp-reg-confirm-msg"></span>
                            </div>
                            <div class="lp-modal__field lp-modal__field--roles">
                                <label>I am a...</label>
                                <div class="lp-reg-roles" id="lp-reg-roles">
                                    <button type="button" class="lp-reg-role-card" data-role="admin" aria-pressed="false">
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                        <span class="lp-reg-role-card__title">Designer</span>
                                        <span class="lp-reg-role-card__desc">Create designs for customers</span>
                                    </button>
                                    <button type="button" class="lp-reg-role-card" data-role="user" aria-pressed="false">
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                        <span class="lp-reg-role-card__title">Customer</span>
                                        <span class="lp-reg-role-card__desc">Design your own room</span>
                                    </button>
                                </div>
                            </div>
                            <div id="lp-register-error" class="lp-modal__error" role="alert" aria-live="polite"></div>
                            <button type="submit" id="lp-register-submit" class="lp-btn lp-btn--primary lp-btn--full" disabled>
                                <span class="lp-modal__submit-text">Create Account</span>
                                <span class="lp-modal__spinner"></span>
                            </button>
                        </form>
                        <p class="lp-modal__switch">Already have an account? <button type="button" class="lp-modal__switch-link" id="lp-switch-login">Sign In</button></p>
                    </div>
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
        this.burger = this.container.querySelector('#lp-burger');
        this.navLinks = this.container.querySelector('#lp-nav-links');

        // Login panel elements
        this.loginPanel = this.container.querySelector('#lp-login-panel');
        this.loginForm = this.container.querySelector('#lp-login-form');
        this.usernameInput = this.container.querySelector('#lp-username');
        this.passwordInput = this.container.querySelector('#lp-password');
        this.submitBtn = this.container.querySelector('#lp-login-submit');
        this.errorEl = this.container.querySelector('#lp-login-error');

        // Register panel elements
        this.registerPanel = this.container.querySelector('#lp-register-panel');
        this._reg = {
            form: this.container.querySelector('#lp-register-form'),
            fullName: this.container.querySelector('#lp-reg-fullname'),
            email: this.container.querySelector('#lp-reg-email'),
            username: this.container.querySelector('#lp-reg-username'),
            password: this.container.querySelector('#lp-reg-password'),
            confirm: this.container.querySelector('#lp-reg-confirm'),
            submit: this.container.querySelector('#lp-register-submit'),
            error: this.container.querySelector('#lp-register-error'),
            usernameStatus: this.container.querySelector('#lp-reg-username-status'),
            strengthLabel: this.container.querySelector('#lp-reg-strength-label'),
            strengthSegs: this.container.querySelectorAll('.lp-reg-strength__seg'),
            roleCards: this.container.querySelectorAll('.lp-reg-role-card'),
            fullNameMsg: this.container.querySelector('#lp-reg-fullname-msg'),
            emailMsg: this.container.querySelector('#lp-reg-email-msg'),
            usernameMsg: this.container.querySelector('#lp-reg-username-msg'),
            confirmMsg: this.container.querySelector('#lp-reg-confirm-msg')
        };
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

        // Panel toggles
        this.container.querySelector('#lp-switch-register')?.addEventListener('click', () => this._showRegisterPanel());
        this.container.querySelector('#lp-switch-login')?.addEventListener('click', () => this._showLoginPanel());

        // Login form
        this.loginForm?.addEventListener('submit', e => { e.preventDefault(); this._handleLogin(); });

        // Enable/disable login submit
        const updateBtn = () => {
            const ok = this.usernameInput?.value.trim() && this.passwordInput?.value.trim();
            if (this.submitBtn) this.submitBtn.disabled = !ok;
        };
        this.usernameInput?.addEventListener('input', updateBtn);
        this.passwordInput?.addEventListener('input', updateBtn);

        // ---- Register form listeners ----
        this._reg.form?.addEventListener('submit', e => { e.preventDefault(); this._handleRegister(); });
        this._reg.fullName?.addEventListener('input', () => this._regValidateFullName());
        this._reg.email?.addEventListener('input', () => this._regValidateEmail());
        this._reg.username?.addEventListener('input', () => this._regHandleUsernameInput());
        this._reg.password?.addEventListener('input', () => {
            this._regValidatePassword();
            if (this._reg.confirm?.value) this._regValidateConfirm();
        });
        this._reg.confirm?.addEventListener('input', () => this._regValidateConfirm());
        this._reg.roleCards.forEach(card => {
            card.addEventListener('click', () => this._regSelectRole(card.dataset.role));
        });

        // Clear register error on any input
        [this._reg.fullName, this._reg.email, this._reg.username, this._reg.password, this._reg.confirm].forEach(input => {
            input?.addEventListener('input', () => this._regClearError());
        });

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

    /**
     * Toggle the modal to show the login panel
     * @private
     */
    _showLoginPanel() {
        this._currentPanel = 'login';
        if (this.loginPanel) this.loginPanel.classList.remove('lp-modal__panel--hidden');
        if (this.registerPanel) this.registerPanel.classList.add('lp-modal__panel--hidden');
        requestAnimationFrame(() => this.usernameInput?.focus());
    }

    /**
     * Toggle the modal to show the register panel
     * @private
     */
    _showRegisterPanel() {
        this._currentPanel = 'register';
        if (this.loginPanel) this.loginPanel.classList.add('lp-modal__panel--hidden');
        if (this.registerPanel) this.registerPanel.classList.remove('lp-modal__panel--hidden');
        requestAnimationFrame(() => this._reg.fullName?.focus());
    }

    /**
     * Validate full name in register form
     * @private
     */
    _regValidateFullName() {
        const val = this._reg.fullName?.value.trim() || '';
        const valid = val.length >= 2;
        this._regFieldState.fullName = valid;
        this._regSetFieldMsg(this._reg.fullName, this._reg.fullNameMsg, valid, valid ? '' : 'Name must be at least 2 characters');
        this._regUpdateSubmit();
    }

    /**
     * Validate email in register form
     * @private
     */
    _regValidateEmail() {
        const val = this._reg.email?.value.trim() || '';
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        this._regFieldState.email = valid;
        this._regSetFieldMsg(this._reg.email, this._reg.emailMsg, valid, valid ? '' : 'Please enter a valid email');
        this._regUpdateSubmit();
    }

    /**
     * Handle username input with debounced availability check in register form
     * @private
     */
    _regHandleUsernameInput() {
        const val = this._reg.username?.value.trim() || '';
        if (this._usernameCheckTimer) clearTimeout(this._usernameCheckTimer);

        if (val.length < 3) {
            this._regFieldState.username = false;
            this._regSetUsernameStatus('', '');
            this._regSetFieldMsg(this._reg.username, this._reg.usernameMsg, false, val.length > 0 ? 'At least 3 characters' : '');
            this._regUpdateSubmit();
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(val)) {
            this._regFieldState.username = false;
            this._regSetUsernameStatus('', '');
            this._regSetFieldMsg(this._reg.username, this._reg.usernameMsg, false, 'Letters, numbers, underscores only');
            this._regUpdateSubmit();
            return;
        }

        this._regSetUsernameStatus('Checking...', 'checking');
        this._regSetFieldMsg(this._reg.username, this._reg.usernameMsg, null, '');

        this._usernameCheckTimer = setTimeout(() => {
            const taken = isUsernameTaken(val);
            this._regFieldState.username = !taken;
            this._regSetUsernameStatus(taken ? 'Taken' : 'Available', taken ? 'taken' : 'available');
            this._regSetFieldMsg(this._reg.username, this._reg.usernameMsg, !taken, taken ? 'Username is already in use' : '');
            this._regUpdateSubmit();
        }, 400);
    }

    /**
     * Update username status indicator in register form
     * @param {string} text - Status text
     * @param {string} state - CSS modifier class
     * @private
     */
    _regSetUsernameStatus(text, state) {
        const el = this._reg.usernameStatus;
        if (!el) return;
        el.textContent = text;
        el.className = 'lp-reg-username-status';
        if (state) el.classList.add(`lp-reg-username-status--${state}`);
    }

    /**
     * Validate password and update strength bar in register form
     * @private
     */
    _regValidatePassword() {
        const val = this._reg.password?.value || '';
        let score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val) && /[^a-zA-Z0-9]/.test(val)) score++;

        this._regFieldState.password = val.length >= 6;
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['', 'weak', 'fair', 'good', 'strong'];

        this._reg.strengthSegs.forEach((seg, i) => {
            seg.className = 'lp-reg-strength__seg';
            if (i < score) seg.classList.add(`lp-reg-strength__seg--${colors[score]}`);
        });
        if (this._reg.strengthLabel) {
            this._reg.strengthLabel.textContent = labels[score] || '';
            this._reg.strengthLabel.className = 'lp-reg-strength__label';
            if (score > 0) this._reg.strengthLabel.classList.add(`lp-reg-strength__label--${colors[score]}`);
        }
        this._regUpdateSubmit();
    }

    /**
     * Validate confirm password in register form
     * @private
     */
    _regValidateConfirm() {
        const pass = this._reg.password?.value || '';
        const conf = this._reg.confirm?.value || '';
        const valid = conf.length > 0 && conf === pass;
        this._regFieldState.confirmPassword = valid;
        this._regSetFieldMsg(this._reg.confirm, this._reg.confirmMsg, conf.length === 0 ? null : valid, valid || conf.length === 0 ? '' : 'Passwords do not match');
        this._regUpdateSubmit();
    }

    /**
     * Select a role in register form
     * @param {string} role - 'admin' or 'user'
     * @private
     */
    _regSelectRole(role) {
        this._selectedRole = role;
        this._regFieldState.role = true;
        this._reg.roleCards.forEach(card => {
            const sel = card.dataset.role === role;
            card.classList.toggle('lp-reg-role-card--selected', sel);
            card.setAttribute('aria-pressed', sel ? 'true' : 'false');
        });
        this._regUpdateSubmit();
    }

    /**
     * Set feedback message on a register form field
     * @param {HTMLInputElement} input - The input element
     * @param {HTMLElement} msgEl - The message element
     * @param {boolean|null} valid - Validation state
     * @param {string} message - Message text
     * @private
     */
    _regSetFieldMsg(input, msgEl, valid, message) {
        if (input) {
            input.classList.remove('lp-field-valid', 'lp-field-error');
            if (valid === true) input.classList.add('lp-field-valid');
            else if (valid === false && input.value.length > 0) input.classList.add('lp-field-error');
        }
        if (msgEl) {
            msgEl.textContent = message;
            msgEl.className = 'lp-modal__field-msg';
            if (valid === false && message) msgEl.classList.add('lp-modal__field-msg--error');
            else if (valid === true) msgEl.classList.add('lp-modal__field-msg--valid');
        }
    }

    /**
     * Update submit button state for register form
     * @private
     */
    _regUpdateSubmit() {
        if (!this._reg.submit) return;
        const allValid = Object.values(this._regFieldState).every(v => v === true);
        this._reg.submit.disabled = !allValid;
    }

    /**
     * Show error message in register form
     * @param {string} msg - Error message
     * @private
     */
    _regShowError(msg) {
        if (this._reg.error) { this._reg.error.textContent = msg; this._reg.error.classList.add('visible'); }
    }

    /**
     * Clear error message in register form
     * @private
     */
    _regClearError() {
        if (this._reg.error) { this._reg.error.textContent = ''; this._reg.error.classList.remove('visible'); }
    }

    /**
     * Handle registration form submission
     * @private
     */
    async _handleRegister() {
        const fullName = this._reg.fullName?.value.trim() || '';
        const email = this._reg.email?.value.trim() || '';
        const username = this._reg.username?.value.trim() || '';
        const password = this._reg.password?.value || '';
        const confirmPw = this._reg.confirm?.value || '';
        const role = this._selectedRole;

        if (password !== confirmPw) { this._regShowError('Passwords do not match'); return; }
        if (!role) { this._regShowError('Please select a role'); return; }

        this._regClearError();
        if (this._reg.submit) { this._reg.submit.disabled = true; this._reg.submit.classList.add('loading'); }
        await new Promise(r => setTimeout(r, 400));

        const result = register(username, password, role, fullName, email);

        if (this._reg.submit) this._reg.submit.classList.remove('loading');

        if (result.success) {
            this._closeModal();
            this.onLoginSuccess();
        } else {
            this._regShowError(result.message || 'Registration failed');
            this._regUpdateSubmit();
        }
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
        if (this._usernameCheckTimer) clearTimeout(this._usernameCheckTimer);
        document.body.style.overflow = '';
    }
}

export { LandingView };
export default LandingView;
