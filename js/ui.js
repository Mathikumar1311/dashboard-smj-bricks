/**
 * 🛡️ BULLETPROOF UI MANAGER - PERSISTENT LOGIN VERSION
 * ✅ Maintains login state after page reload
 * ✅ Secure session management
 * ✅ Auto-login from saved session
 * ✅ Enhanced confirmation dialogs
 */

class UIManager {
    constructor(dependencies = {}) {
        console.log('🛡️ Initializing UI Manager...');

        // 🛡️ SAFE DEPENDENCY INITIALIZATION
        this.themeManager = this.safeGet(dependencies, 'themeManager', this.createThemeManagerFallback());
        this.langManager = this.safeGet(dependencies, 'langManager', this.createLangManagerFallback());
        this.auth = this.safeGet(dependencies, 'auth', this.createAuthFallback());

        // 🛡️ SAFE STATE INITIALIZATION
        this.sidebarCollapsed = this.safeGet(localStorage, 'sidebarCollapsed', 'false') === 'true';
        this.currentSection = this.safeGet(window.location, 'hash', '#dashboard').replace('#', '');
        this.initialized = false;
        this.eventListeners = new Map();

        // ✅ FIX: Check for existing session on initialization
        this.isAuthenticated = this.checkExistingSession();

        console.log('✅ UI Manager initialized - Auth state:', this.isAuthenticated);
    }

    // 🛡️ CHECK FOR EXISTING SESSION
    checkExistingSession() {
        return this.safeExecute(() => {
            const session = localStorage.getItem('userSession');
            if (session) {
                try {
                    const userData = JSON.parse(session);
                    const sessionExpiry = localStorage.getItem('sessionExpiry');

                    // Check if session is still valid
                    if (sessionExpiry && new Date().getTime() < parseInt(sessionExpiry)) {
                        console.log('🔑 Restoring existing session:', userData);

                        // Restore user data in auth manager
                        this.auth.getCurrentUser = () => userData;
                        return true;
                    } else {
                        // Session expired, clear it
                        console.log('🚫 Session expired, clearing...');
                        this.clearSession();
                        return false;
                    }
                } catch (error) {
                    console.error('❌ Invalid session data:', error);
                    this.clearSession();
                    return false;
                }
            }
            return false;
        }, 'Check existing session', false);
    }

    // 🛡️ SAVE SESSION DATA
    saveSession(userData) {
        return this.safeExecute(() => {
            if (!userData) return false;

            // Save user data to localStorage
            localStorage.setItem('userSession', JSON.stringify(userData));

            // Set session expiry (24 hours from now)
            const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000);
            localStorage.setItem('sessionExpiry', expiryTime.toString());

            // Save login timestamp
            localStorage.setItem('loginTime', new Date().toISOString());

            console.log('💾 Session saved for user:', userData.name);
            return true;
        }, 'Save session', false);
    }

    // 🛡️ CLEAR SESSION DATA
    clearSession() {
        return this.safeExecute(() => {
            localStorage.removeItem('userSession');
            localStorage.removeItem('sessionExpiry');
            localStorage.removeItem('loginTime');
            console.log('🧹 Session cleared');
            return true;
        }, 'Clear session', false);
    }

    // 🛡️ ENHANCED CONFIRMATION DIALOG
    async showConfirmation(title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning') {
        return new Promise((resolve) => {
            const modalId = 'confirmationModal';
            
            // Remove existing confirmation modal if any
            const existingModal = document.getElementById(modalId);
            if (existingModal) {
                existingModal.remove();
            }

            const icon = {
                'warning': 'fa-exclamation-triangle',
                'danger': 'fa-exclamation-circle',
                'info': 'fa-info-circle',
                'success': 'fa-check-circle'
            }[type] || 'fa-exclamation-triangle';

            const color = {
                'warning': 'warning',
                'danger': 'danger',
                'info': 'primary',
                'success': 'success'
            }[type] || 'warning';

            const modalHtml = `
                <div id="${modalId}" class="modal">
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3><i class="fas ${icon} text-${color}"></i> ${title}</h3>
                            <button type="button" class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="confirmation-content">
                                <div class="confirmation-icon">
                                    <i class="fas ${icon} text-${color}"></i>
                                </div>
                                <div class="confirmation-message">
                                    ${message}
                                </div>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" id="confirmationCancel">
                                <i class="fas fa-times"></i> ${cancelText}
                            </button>
                            <button type="button" class="btn-${color}" id="confirmationConfirm">
                                <i class="fas fa-check"></i> ${confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById(modalId);
            const confirmBtn = document.getElementById('confirmationConfirm');
            const cancelBtn = document.getElementById('confirmationCancel');
            const closeBtn = modal.querySelector('.modal-close');

            // Show modal
            this.showModal(modalId);

            const cleanup = () => {
                this.hideModal(modalId);
                setTimeout(() => {
                    if (document.getElementById(modalId)) {
                        document.getElementById(modalId).remove();
                    }
                }, 300);
            };

            const confirmAction = () => {
                cleanup();
                resolve(true);
            };

            const cancelAction = () => {
                cleanup();
                resolve(false);
            };

            // Event listeners
            confirmBtn.addEventListener('click', confirmAction);
            cancelBtn.addEventListener('click', cancelAction);
            closeBtn.addEventListener('click', cancelAction);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cancelAction();
                }
            });

            // Escape key to cancel
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cancelAction();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    // 🛡️ CORE SAFETY METHODS
    safeGet(obj, prop, defaultValue = null) {
        try {
            return obj && obj[prop] !== undefined ? obj[prop] : defaultValue;
        } catch (error) {
            console.warn(`⚠️ Safe get failed for ${prop}:`, error);
            return defaultValue;
        }
    }

    safeExecute(operation, context = 'operation', fallback = null) {
        try {
            return operation();
        } catch (error) {
            console.error(`❌ ${context} failed:`, error);
            this.showToast(`${context} failed`, 'error');
            return fallback;
        }
    }

    // 🛡️ FIXED AUTH FALLBACK - WITH SESSION SUPPORT
    createAuthFallback() {
        console.log('🔐 Creating auth manager fallback');
        const self = this;

        return {
            getCurrentUser: () => self.safeExecute(() => {
                // Try to get user from session first
                const session = localStorage.getItem('userSession');
                if (session) {
                    try {
                        return JSON.parse(session);
                    } catch (error) {
                        console.error('❌ Failed to parse user session:', error);
                        return null;
                    }
                }
                return null;
            }, 'Get user', null),

            hasPermission: (permission) => self.safeExecute(() => {
                const user = self.auth.getCurrentUser();

                if (!user) {
                    console.log('❌ No user - permission denied');
                    return false;
                }

                // Complete permission system
                const rolePermissions = {
                    'admin': ['dashboard', 'users', 'employees', 'salary', 'attendance', 'salary-payments', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
                    'manager': ['dashboard', 'employees', 'salary', 'attendance', 'salary-payments', 'reports', 'settings'],
                    'supervisor': ['dashboard', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
                    'user': ['dashboard', 'settings']
                };

                const userRole = user?.role || 'user';
                const allowedSections = rolePermissions[userRole] || ['dashboard', 'settings'];
                const hasPerm = allowedSections.includes(permission);

                console.log(`🔐 Permission result: ${userRole} -> ${permission} = ${hasPerm}`);
                return hasPerm;

            }, 'Check permission', false),

            isAuthenticated: () => self.safeExecute(() => self.isAuthenticated, 'Check auth', false)
        };
    }

    // 🛡️ FIXED INITIALIZATION - CHECK SESSION FIRST
    async initialize() {
        if (this.initialized) {
            console.log('🔄 UI Manager already initialized');
            return true;
        }

        console.log('🎨 Initializing UI components...');

        return this.safeExecute(async () => {
            // Wait for DOM to be completely ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve, { once: true });
                });
            }

            // Additional safety delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // ✅ FIX: Check authentication state and show appropriate screen
            if (this.isAuthenticated) {
                console.log('🔑 User is authenticated, showing dashboard...');
                this.showDashboard();
            } else {
                console.log('🔐 No active session, showing login...');
                this.showLogin();
            }

            this.setupEventListeners();
            this.setupModals();
            this.initializeFromSavedState();

            this.initialized = true;
            console.log('✅ UI components initialized successfully');

            // Show appropriate ready message
            setTimeout(() => {
                if (this.isAuthenticated) {
                    const user = this.auth.getCurrentUser();
                    this.showToast(`Welcome back, ${user?.name || 'User'}!`, 'success', 3000);
                } else {
                    this.showToast('Application ready! Please login.', 'info', 3000);
                }
            }, 1000);

            return true;
        }, 'UI initialization', false);
    }

    // 🛡️ FIXED SHOW LOGIN
    showLogin() {
        return this.safeExecute(() => {
            console.log('🔐 Showing login screen...');

            // Hide dashboard completely
            const dashboardSection = document.getElementById('dashboardSection');
            if (dashboardSection) {
                dashboardSection.classList.add('hidden');
                dashboardSection.style.display = 'none';
            }

            // Show login
            const loginSection = document.getElementById('loginSection');
            if (loginSection) {
                loginSection.classList.remove('hidden');
                loginSection.style.display = 'flex';

                // Clear login form
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.reset();
                }

                // Clear any errors
                const errorElement = document.getElementById('loginError');
                if (errorElement) {
                    errorElement.classList.add('hidden');
                }
            }

            console.log('✅ Login screen shown successfully');
            return true;
        }, 'Show login', false);
    }

    // 🛡️ FIXED SHOW DASHBOARD - AFTER SUCCESSFUL LOGIN
    showDashboard() {
        return this.safeExecute(() => {
            console.log('🚀 Showing dashboard...');

            // Hide login section
            const loginSection = document.getElementById('loginSection');
            if (loginSection) {
                loginSection.classList.add('hidden');
                loginSection.style.display = 'none';
            }

            // Show dashboard section
            const dashboardSection = document.getElementById('dashboardSection');
            if (dashboardSection) {
                dashboardSection.classList.remove('hidden');
                dashboardSection.style.display = 'block';
            }

            // Show dashboard content
            this.showSection('dashboard');

            // Update user info and setup permissions
            this.updateUserInfo();
            this.setupRoleBasedAccess();

            console.log('✅ Dashboard shown successfully');
            return true;
        }, 'Show dashboard', false);
    }

    // 🛡️ FIXED LOGIN HANDLER - SAVE SESSION
    handleSuccessfulLogin(userData) {
        return this.safeExecute(() => {
            console.log('🎉 Handling successful login...', userData);

            // ✅ FIX: Set authentication state
            this.isAuthenticated = true;

            // ✅ FIX: Save session to localStorage
            this.saveSession(userData);

            // ✅ FIX: Update auth manager with user data
            if (userData) {
                this.auth.getCurrentUser = () => userData;
            }

            // ✅ FIX: Show dashboard
            this.showDashboard();

            // ✅ FIX: Show welcome message
            this.showToast(`Welcome back, ${userData?.name || 'User'}!`, 'success');

            console.log('✅ Login handled successfully');
            return true;
        }, 'Handle successful login', false);
    }

    // 🛡️ FIXED LOGOUT HANDLER - CLEAR SESSION
    handleLogout() {
        return this.safeExecute(() => {
            console.log('🚪 Handling logout...');

            // ✅ FIX: Get user name for message before clearing
            const userName = this.auth.getCurrentUser()?.name;

            // ✅ FIX: Reset authentication state
            this.isAuthenticated = false;

            // ✅ FIX: Clear session data
            this.clearSession();

            // ✅ FIX: Show login
            this.showLogin();

            // ✅ FIX: Hide all modals
            this.hideAllModals();

            // ✅ FIX: Reset to dashboard section for next login
            this.currentSection = 'dashboard';

            // ✅ FIX: Clear user data
            this.auth.getCurrentUser = () => null;

            // ✅ FIX: Show logout message
            this.showToast(`Goodbye, ${userName || 'User'}! You have been logged out.`, 'info');

            console.log('✅ Logout handled successfully');
            return true;
        }, 'Handle logout', false);
    }

    // 🛡️ FIXED LOGIN FORM SUBMIT HANDLER
    handleLoginFormSubmit(e) {
        return this.safeExecute(async () => {
            console.log('🔐 Handling login form submit...');

            const form = e.target;
            const formData = new FormData(form);
            const username = formData.get('username');
            const password = formData.get('password');

            // Clear previous errors
            const errorElement = document.getElementById('loginError');
            if (errorElement) {
                errorElement.classList.add('hidden');
            }

            // ✅ FIX: Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const resetLoading = this.showButtonLoading(submitButton, 'Signing in...');

            try {
                // ✅ FIX: Simulate login process
                await new Promise(resolve => setTimeout(resolve, 1500));

                // ✅ FIX: Demo credentials check
                const demoCredentials = {
                    'admin': 'admin123',
                    'manager': 'manager123',
                    'supervisor': 'supervisor123'
                };

                if (demoCredentials[username] && demoCredentials[username] === password) {
                    // ✅ FIX: Successful login - create user data
                    const userData = {
                        name: username.charAt(0).toUpperCase() + username.slice(1) + ' User',
                        role: username,
                        email: `${username}@business.com`,
                        id: `${username}-001`,
                        loginTime: new Date().toISOString()
                    };

                    this.handleSuccessfulLogin(userData);
                } else {
                    // ✅ FIX: Failed login
                    this.showToast('Invalid username or password', 'error');

                    // Show error in form
                    if (errorElement) {
                        errorElement.textContent = 'Invalid username or password';
                        errorElement.classList.remove('hidden');
                    }
                }

            } catch (error) {
                console.error('Login error:', error);
                this.showToast('Login failed. Please try again.', 'error');
            } finally {
                // ✅ FIX: Reset loading state
                resetLoading();
            }

        }, 'Login form submit', false);
    }

    showSection(sectionName) {
        return this.safeExecute(() => {
            console.log(`📂 Attempting to show section: ${sectionName}`);

            // ✅ FIX: Convert section name to match HTML ID format
            let targetId;
            if (sectionName === 'salary-payments') {
                targetId = 'salaryPaymentsContent';
            } else {
                // Convert other section names (like 'salary' to 'salaryContent')
                targetId = sectionName.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + 'Content';
            }

            const targetSection = document.getElementById(targetId);

            if (!targetSection) {
                console.warn(`❌ Section content not found: ${targetId} (from section: ${sectionName})`);
                this.showToast(`Section "${sectionName}" is not available`, 'error');
                return false;
            }

            // ✅ FIX: Improved section hiding
            document.querySelectorAll('.content-section').forEach(section => {
                this.safeExecute(() => {
                    section.classList.remove('active');
                    section.style.display = 'none';
                }, `Hide section: ${section.id}`);
            });

            // Show the selected section
            targetSection.classList.add('active');
            targetSection.style.display = 'block';

            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });

            const targetLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (targetLink) {
                targetLink.classList.add('active');
            }

            this.currentSection = sectionName;

            // Update URL hash
            try {
                history.replaceState({ section: sectionName }, '', `#${sectionName}`);
            } catch (error) {
                console.warn('History replaceState failed:', error);
            }

            // 🆕 **CRITICAL FIX: Trigger data loading after section is shown**
            setTimeout(() => {
                if (window.app && window.app.loadSectionData) {
                    console.log(`📊 Triggering data load for: ${sectionName}`);
                    window.app.loadSectionData(sectionName);
                }
            }, 50);

            console.log(`✅ Section shown: ${sectionName} (ID: ${targetId})`);
            return true;

        }, `Show section: ${sectionName}`, false);
    }

    // 🛡️ FIXED ROLE-BASED ACCESS CONTROL
    setupRoleBasedAccess() {
        return this.safeExecute(() => {
            const user = this.auth.getCurrentUser();
            if (!user) {
                console.warn('❌ No user found for role-based access');
                return false;
            }

            const userRole = user.role;
            console.log(`🔐 Setting up UI for role: ${userRole}`);

            const rolePermissions = {
                'admin': ['dashboard', 'users', 'employees', 'salary', 'attendance', 'salary-payments', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
                'manager': ['dashboard', 'employees', 'salary', 'attendance', 'salary-payments', 'reports', 'settings'],
                'supervisor': ['dashboard', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
                'user': ['dashboard', 'settings']
            };

            const allowedSections = rolePermissions[userRole] || ['dashboard', 'settings'];

            // Hide unauthorized sections
            document.querySelectorAll('.nav-link').forEach(link => {
                const section = link.getAttribute('data-section');
                const parentLi = link.closest('li');

                if (parentLi && section) {
                    if (!allowedSections.includes(section)) {
                        parentLi.style.display = 'none';
                        console.log(`🚫 Hiding section: ${section} for role: ${userRole}`);
                    } else {
                        parentLi.style.display = 'block';
                        console.log(`✅ Showing section: ${section} for role: ${userRole}`);
                    }
                }
            });

            console.log(`✅ Role-based access configured for ${userRole}`);
            return true;

        }, 'Role-based access setup', false);
    }

    // 🛡️ PASSWORD TOGGLE SYSTEM
    setupPasswordToggles() {
        console.log('🔧 Setting up password toggles...');

        // Remove any existing listeners first
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.replaceWith(toggle.cloneNode(true));
        });

        // Add new event listeners
        document.addEventListener('click', (e) => {
            if (e.target.closest('.password-toggle')) {
                e.preventDefault();
                e.stopPropagation();

                const toggle = e.target.closest('.password-toggle');
                this.togglePasswordVisibility(toggle);
            }
        });
    }

    // 🛡️ PASSWORD VISIBILITY TOGGLE
    togglePasswordVisibility(toggleButton) {
        try {
            console.log('👁️ Toggling password visibility...');

            const container = toggleButton.closest('.password-input-container');
            if (!container) {
                console.error('❌ Password container not found');
                return;
            }

            const input = container.querySelector('input');
            const icon = toggleButton.querySelector('i');

            if (!input || !icon) {
                console.error('❌ Input or icon not found');
                return;
            }

            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
                toggleButton.title = 'Hide password';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
                toggleButton.title = 'Show password';
            }

            console.log('✅ Password visibility toggled to:', input.type);
        } catch (error) {
            console.error('❌ Error toggling password:', error);
        }
    }

    // 🛡️ EVENT HANDLING SYSTEM
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');

        this.safeExecute(() => {
            // Sidebar toggle
            this.addEventListener('sidebarToggle', 'click', () => this.toggleSidebar());

            // Navigation links
            this.addGlobalEventListener('.nav-link', 'click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section') ||
                    e.target.closest('[data-section]')?.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });

            // ✅ FIX: Login form handler
            this.addEventListener('loginForm', 'submit', (e) => {
                e.preventDefault();
                this.handleLoginFormSubmit(e);
            });

            // ✅ FIX: Logout button handler
            this.addEventListener('logoutBtn', 'click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });

            // ✅ ADD THIS: Password toggle handlers
            this.addGlobalEventListener('.password-toggle', 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            });

            // Modal handlers
            this.addGlobalEventListener('.modal', 'click', (e) => {
                if (e.target === e.currentTarget) {
                    this.hideModal(e.target.id);
                }
            });

            // Escape key for modals
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideAllModals();
                }
            });

            // Window resize
            this.addEventListener(window, 'resize', () => this.handleResize());

            console.log('✅ Event listeners setup completed');
        }, 'Event listeners setup');
    }

    // 🛡️ EVENT LISTENER MANAGEMENT
    addEventListener(selectorOrElement, event, handler) {
        try {
            const element = typeof selectorOrElement === 'string'
                ? document.getElementById(selectorOrElement)
                : selectorOrElement;

            if (!element) {
                console.warn(`⚠️ Element not found: ${selectorOrElement}`);
                return;
            }

            const wrappedHandler = (e) => this.safeExecute(() => handler(e), `Event: ${event}`);
            element.addEventListener(event, wrappedHandler);

            const key = `${typeof selectorOrElement === 'string' ? selectorOrElement : selectorOrElement.id}-${event}`;
            this.eventListeners.set(key, { element, event, handler: wrappedHandler });

        } catch (error) {
            console.error(`❌ Failed to add event listener for ${selectorOrElement}:`, error);
        }
    }

    addGlobalEventListener(selector, event, handler) {
        try {
            const wrappedHandler = (e) => {
                if (e.target.matches(selector) || e.target.closest(selector)) {
                    this.safeExecute(() => handler(e), `Global event: ${event} on ${selector}`);
                }
            };

            document.addEventListener(event, wrappedHandler);
            this.eventListeners.set(`global-${selector}-${event}`, {
                element: document, event, handler: wrappedHandler
            });

        } catch (error) {
            console.error(`❌ Failed to add global event listener for ${selector}:`, error);
        }
    }

    // 🛡️ MODAL MANAGEMENT SYSTEM
    setupModals() {
        console.log('🪟 Setting up modal system...');
        this.safeExecute(() => {
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        this.hideModal(modal.id);
                    }
                }
            });

            document.addEventListener('click', (e) => {
                const closeBtn = e.target.closest('.modal-close, .modal-cancel');
                if (closeBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const modal = closeBtn.closest('.modal');
                    if (modal) {
                        this.hideModal(modal.id);
                    }
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideAllModals();
                }
            });
        }, 'Modal setup');
    }

    showModal(modalId) {
        return this.safeExecute(() => {
            const modal = document.getElementById(modalId);
            if (!modal) return false;

            this.hideAllModals();
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);

            return true;
        }, `Show modal: ${modalId}`, false);
    }

    hideModal(modalId) {
        return this.safeExecute(() => {
            let modal;
            if (typeof modalId === 'string') {
                modal = document.getElementById(modalId);
            } else {
                modal = modalId;
            }

            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('active');
                modal.style.display = 'none';

                if (document.querySelectorAll('.modal:not(.hidden)').length === 0) {
                    document.body.style.overflow = '';
                }
                return true;
            }
            return false;
        }, `Hide modal: ${modalId}`, false);
    }

    hideAllModals() {
        this.safeExecute(() => {
            document.querySelectorAll('.modal').forEach(modal => {
                this.hideModal(modal.id);
            });
        }, 'Hide all modals');
    }

    // 🛡️ TOAST NOTIFICATION SYSTEM
    showToast(message, type = 'info', duration = 5000) {
        return this.safeExecute(() => {
            let toastContainer = document.getElementById('toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                toastContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                `;
                document.body.appendChild(toastContainer);
            }

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;

            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };

            toast.style.cssText = `
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateX(100%);
                transition: all 0.3s ease;
                background: ${colors[type] || colors.info};
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };

            toast.innerHTML = `
                <i class="${icons[type] || icons.info}"></i>
                <span>${this.escapeHtml(message)}</span>
            `;

            toastContainer.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
            });

            const removeToast = () => {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            };

            setTimeout(removeToast, duration);
            toast.addEventListener('click', removeToast);

            return true;
        }, `Show toast: ${message}`, false);
    }

    // 🛡️ LOADING STATE MANAGEMENT
    showButtonLoading(button, text = 'Loading...') {
        return this.safeExecute(() => {
            if (!button) return () => { };

            const originalHTML = button.innerHTML;
            const originalDisabled = button.disabled;

            button.disabled = true;
            button.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                ${this.escapeHtml(text)}
            `;

            return () => {
                this.safeExecute(() => {
                    button.disabled = originalDisabled;
                    button.innerHTML = originalHTML;
                }, 'Reset button loading');
            };
        }, 'Show button loading', () => () => { });
    }

    showSectionLoading(sectionId, message = 'Loading...') {
        return this.safeExecute(() => {
            const section = document.getElementById(sectionId);
            if (!section) {
                console.warn(`Section not found: ${sectionId}`);
                return null;
            }

            const existingLoader = section.querySelector('.section-loader');
            if (existingLoader) {
                existingLoader.remove();
            }

            const loader = document.createElement('div');
            loader.className = 'section-loader';
            loader.innerHTML = `
                <div class="section-loading-content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;

            loader.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
                border-radius: 8px;
                backdrop-filter: blur(2px);
            `;

            section.style.position = 'relative';
            section.appendChild(loader);

            console.log(`✅ Section loading shown: ${sectionId}`);
            return loader;

        }, `Show section loading: ${sectionId}`, null);
    }

    hideSectionLoading(sectionId) {
        return this.safeExecute(() => {
            const section = document.getElementById(sectionId);
            if (!section) return false;

            const loader = section.querySelector('.section-loader');
            if (loader) {
                loader.remove();
                console.log(`✅ Section loading hidden: ${sectionId}`);
                return true;
            }
            return false;
        }, `Hide section loading: ${sectionId}`, false);
    }

    showLoading(message = 'Loading...') {
        return this.safeExecute(() => {
            let overlay = document.getElementById('loadingOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.innerHTML = `
                    <div class="loading-container">
                        <div class="loading-spinner">
                            <div class="loading-ring"></div>
                            <i class="fas fa-chart-line loader-icon"></i>
                        </div>
                        <p class="loading-text">${this.escapeHtml(message)}</p>
                    </div>
                `;
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    flex-direction: column;
                    backdrop-filter: blur(5px);
                `;
                document.body.appendChild(overlay);
            } else {
                overlay.style.display = 'flex';
                const textElement = overlay.querySelector('.loading-text');
                if (textElement) {
                    textElement.textContent = message;
                }
            }
            return true;
        }, 'Show loading', false);
    }

    hideLoading() {
        return this.safeExecute(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
                return true;
            }
            return false;
        }, 'Hide loading', false);
    }

    // 🛡️ USER INTERFACE UPDATES
    updateUserInfo(user) {
        return this.safeExecute(() => {
            const currentUser = user || this.auth.getCurrentUser();
            if (!currentUser) return false;

            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = currentUser.name;
            }

            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff6b35&color=fff&size=128`;
            document.querySelectorAll('.user-avatar').forEach(avatar => {
                if (avatar.src) {
                    avatar.src = avatarUrl;
                }
            });

            console.log('✅ User info updated');
            return true;
        }, 'Update user info', false);
    }

    toggleSidebar() {
        return this.safeExecute(() => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                this.sidebarCollapsed = !this.sidebarCollapsed;
                sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
                localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
                console.log('✅ Sidebar toggled:', this.sidebarCollapsed ? 'collapsed' : 'expanded');
                return true;
            }
            return false;
        }, 'Toggle sidebar', false);
    }

    handleResize() {
        this.safeExecute(() => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && !this.sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    this.sidebarCollapsed = true;
                }
            }
        }, 'Handle resize');
    }

    // 🛡️ DASHBOARD AND DATA MANAGEMENT
    updateDashboardStats(stats = {}) {
        return this.safeExecute(() => {
            const defaultStats = {
                totalSales: 0,
                totalGST: 0,
                recentActivity: 0,
                pendingPayments: 0,
                totalCustomers: 0,
                totalEmployees: 0
            };

            const safeStats = { ...defaultStats, ...stats };

            const elements = {
                'totalBalance': this.formatCurrency(safeStats.totalSales),
                'gstAmount': this.formatCurrency(safeStats.totalGST),
                'recentActivity': this.formatNumber(safeStats.recentActivity),
                'pendingPayments': this.formatNumber(safeStats.pendingPayments),
                'totalCustomers': this.formatNumber(safeStats.totalCustomers),
                'totalEmployees': this.formatNumber(safeStats.totalEmployees)
            };

            let updatedCount = 0;
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                    updatedCount++;
                }
            });

            console.log(`✅ Dashboard stats updated: ${updatedCount} elements`);
            return updatedCount > 0;

        }, 'Update dashboard stats', false);
    }

    // 🛡️ FORM VALIDATION AND ERROR HANDLING
    showFormError(input, message) {
        return this.safeExecute(() => {
            if (!input || !(input instanceof Element)) {
                console.warn('Invalid input for form error');
                return false;
            }

            this.hideFormError(input);

            const errorElement = document.createElement('div');
            errorElement.className = 'form-error';
            errorElement.textContent = message;
            errorElement.style.cssText = `
                color: #ef4444;
                font-size: 0.8rem;
                margin-top: 0.25rem;
                font-weight: 500;
            `;

            input.style.borderColor = '#ef4444';
            input.parentNode.appendChild(errorElement);

            return true;

        }, 'Show form error', false);
    }

    hideFormError(input) {
        return this.safeExecute(() => {
            if (!input || !(input instanceof Element)) return false;

            const existingError = input.parentNode.querySelector('.form-error');
            if (existingError) {
                existingError.remove();
            }
            input.style.borderColor = '';
            return true;

        }, 'Hide form error', false);
    }

    validateEmail(email) {
        return this.safeExecute(() => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }, 'Validate email', false);
    }

    validatePhone(phone) {
        return this.safeExecute(() => {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
        }, 'Validate phone', false);
    }

    // 🛡️ TABLE RENDERING SYSTEM
    renderTable(tbodyId, data = [], rowRenderer) {
        return this.safeExecute(() => {
            const tbody = document.getElementById(tbodyId);
            if (!tbody) {
                console.warn(`Table body not found: ${tbodyId}`);
                return false;
            }

            if (!Array.isArray(data)) {
                console.warn('Invalid data provided for table render');
                data = [];
            }

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="100" class="no-data" style="text-align: center; padding: 3rem; color: #6b7280;">
                            <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.3;"></i>
                            <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">No data available</div>
                            <div style="font-size: 0.9rem; opacity: 0.7;">There's nothing to display at the moment</div>
                        </td>
                    </tr>
                `;
                return true;
            }

            if (typeof rowRenderer !== 'function') {
                console.warn('Invalid row renderer provided');
                return false;
            }

            try {
                tbody.innerHTML = data.map((row, index) => {
                    try {
                        return rowRenderer(row, index);
                    } catch (error) {
                        console.error(`Row renderer failed for index ${index}:`, error);
                        return `<tr><td colspan="100" style="color: #ef4444;">Error rendering row</td></tr>`;
                    }
                }).join('');

                console.log(`✅ Table rendered: ${tbodyId} with ${data.length} rows`);
                return true;

            } catch (error) {
                console.error('Table rendering failed:', error);
                tbody.innerHTML = `<tr><td colspan="100" style="color: #ef4444;">Error rendering table</td></tr>`;
                return false;
            }

        }, `Render table: ${tbodyId}`, false);
    }

    // 🛡️ DATABASE STATUS INDICATOR
    updateDatabaseStatus(connected) {
        return this.safeExecute(() => {
            let statusElement = document.getElementById('dbStatus');

            if (!statusElement) {
                statusElement = document.createElement('div');
                statusElement.id = 'dbStatus';
                const topbarRight = document.querySelector('.topbar-right') || document.body;
                topbarRight.appendChild(statusElement);
            }

            statusElement.className = `db-status ${connected ? 'connected' : 'disconnected'}`;
            statusElement.innerHTML = connected ?
                '<i class="fas fa-database"></i> Online' :
                '<i class="fas fa-database"></i> Offline';

            statusElement.title = connected ?
                'Connected to cloud database' :
                'Using local storage - data will sync when online';

            console.log(`✅ Database status updated: ${connected ? 'Online' : 'Offline'}`);
            return true;

        }, 'Update database status', false);
    }

    // 🛡️ EXPORT PROGRESS MANAGEMENT
    showExportProgress(message = 'Exporting...') {
        return this.safeExecute(() => {
            this.showLoading(message);
            return true;
        }, 'Show export progress', false);
    }

    hideExportProgress() {
        return this.safeExecute(() => {
            this.hideLoading();
            return true;
        }, 'Hide export progress', false);
    }

    // 🛡️ STATE INITIALIZATION
    initializeFromSavedState() {
        return this.safeExecute(() => {
            if (this.sidebarCollapsed) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.add('collapsed');
                }
            }

            const savedTheme = localStorage.getItem('theme');
            if (savedTheme && this.themeManager.switchTheme) {
                this.themeManager.switchTheme(savedTheme);
            }

            const savedLanguage = localStorage.getItem('language');
            if (savedLanguage && this.langManager.switchLanguage) {
                this.langManager.switchLanguage(savedLanguage);
            }

            console.log('✅ Saved state initialized');
            return true;

        }, 'Initialize from saved state', false);
    }

    // 🛡️ UTILITY METHODS
    formatCurrency(amount) {
        return this.safeExecute(() => {
            if (typeof amount !== 'number') {
                amount = parseFloat(amount) || 0;
            }
            return '₹' + amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }, 'Format currency', '₹0.00');
    }

    formatNumber(number) {
        return this.safeExecute(() => {
            if (typeof number !== 'number') {
                number = parseInt(number) || 0;
            }
            return number.toLocaleString('en-IN');
        }, 'Format number', '0');
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return String(unsafe);
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showAppReady() {
        return this.safeExecute(() => {
            this.showToast('Application ready!', 'success', 2000);
            console.log('🎉 Application UI fully ready');
            return true;
        }, 'Show app ready', false);
    }

    // 🛡️ FALLBACK MANAGERS
    createThemeManagerFallback() {
        return {
            switchTheme: (theme) => this.safeExecute(() => {
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
            }, 'Theme switch'),
            getCurrentTheme: () => this.safeExecute(() =>
                localStorage.getItem('theme') || 'light', 'Get theme', 'light'
            )
        };
    }

    createLangManagerFallback() {
        return {
            switchLanguage: (lang) => this.safeExecute(() => {
                document.documentElement.setAttribute('lang', lang);
                localStorage.setItem('language', lang);
            }, 'Language switch'),
            getCurrentLanguage: () => this.safeExecute(() =>
                localStorage.getItem('language') || 'en', 'Get language', 'en'
            )
        };
    }

    // 🛡️ CLEANUP AND HEALTH CHECK
    cleanup() {
        console.log('🧹 Cleaning up UI manager...');

        this.eventListeners.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (error) {
                console.warn('Failed to remove event listener:', error);
            }
        });
        this.eventListeners.clear();

        this.initialized = false;
        console.log('✅ UI manager cleaned up');
    }

    healthCheck() {
        const checks = {
            initialized: this.initialized,
            authenticated: this.isAuthenticated,
            domReady: document.readyState === 'complete',
            eventListeners: this.eventListeners.size
        };

        const allHealthy = checks.initialized && checks.domReady;

        console.log('🏥 UI Health Check:', {
            status: allHealthy ? 'HEALTHY' : 'UNHEALTHY',
            ...checks
        });

        return allHealthy;
    }
}

// Make UIManager available globally
window.UIManager = UIManager;