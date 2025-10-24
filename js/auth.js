class AuthManager {
    constructor(db) {  // Change this line
        this.db = db;
        this.ui = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isInitialized = false;
        this._demoUsers = {
            admin: {
                id: 'demo-admin',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                name: 'Administrator',
                email: 'admin@business.com',
                phone: '9876543210',
                status: 'active',
                created_at: new Date().toISOString()
            },
            manager: {
                id: 'demo-manager',
                username: 'manager',
                password: 'manager123',
                role: 'manager',
                name: 'Manager User',
                email: 'manager@business.com',
                phone: '9876543211',
                status: 'active',
                created_at: new Date().toISOString()
            },
            supervisor: {
                id: 'demo-supervisor',
                username: 'supervisor',
                password: 'supervisor123',
                role: 'supervisor',
                name: 'Supervisor User',
                email: 'supervisor@business.com',
                phone: '9876543212',
                status: 'active',
                created_at: new Date().toISOString()
            },
            user: {
                id: 'demo-user',
                username: 'user',
                password: 'user123',
                role: 'user',
                name: 'Regular User',
                email: 'user@business.com',
                phone: '9876543213',
                status: 'active',
                created_at: new Date().toISOString()
            }
        };
    }
    setUI(ui) {
        this.ui = ui;
    }
    async initialize() {
        if (this.isInitialized) return;
        console.log('🔐 Initializing AuthManager...');
        this.setupEventListeners();
        await this.loadCurrentUser();
        this.isInitialized = true;
        console.log('✅ AuthManager initialized');
    }

    setupEventListeners() {
        // Login form submit
        const loginForm = document.getElementById('loginForm');
        if (loginForm && !loginForm._authListenerAttached) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            loginForm._authListenerAttached = true;
        }

        // Password toggle button(s) (delegated)
        document.addEventListener('click', (e) => {
            const toggle = e.target.closest('.password-toggle');
            if (toggle) {
                this.togglePasswordVisibility(toggle);
            }
        });

        // Logout button (if exists)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && !logoutBtn._authListenerAttached) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
            logoutBtn._authListenerAttached = true;
        }
    }

    async handleLogin(e) {
        if (e && e.preventDefault) e.preventDefault();

        const usernameEl = document.getElementById('username');
        const passwordEl = document.getElementById('password');
        const errorDiv = document.getElementById('loginError');

        const username = usernameEl ? (usernameEl.value || '').trim() : '';
        const password = passwordEl ? (passwordEl.value || '') : '';

        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }

        if (!username || !password) {
            if (errorDiv) {
                errorDiv.textContent = 'Please enter username and password.';
                errorDiv.classList.remove('hidden');
            }
            return;
        }

        try {
            this.showLoading('Logging in...');
            const user = await this.authenticateUser(username, password);

            if (!user) {
                throw new Error('Invalid username or password');
            }

            // set session
            this.currentUser = user;
            this.isAuthenticated = true;

            // persist and try to sync to db (non-blocking)
            try {
                await this.saveCurrentUser(user);
            } catch (syncErr) {
                console.warn('⚠️ Could not sync user to DB:', syncErr?.message || syncErr);
            }

            this.showDashboard();
            this.showToast(`Welcome ${user.name}!`, 'success');
            console.log(`✅ User ${user.name} (${user.role}) logged in`);

            return { success: true, user };
        } catch (err) {
            console.error('❌ Login failed:', err);
            if (errorDiv) {
                errorDiv.textContent = err.message || 'Login failed';
                errorDiv.classList.remove('hidden');
            }
            this.showToast(err.message || 'Login failed', 'error');
            throw err;
        } finally {
            this.hideLoading();
        }
    }

    async authenticateUser(username, password) {
        // 1) Try to use DB
        try {
            if (this.db && typeof this.db.getUsers === 'function') {
                const users = await this.db.getUsers();
                if (Array.isArray(users) && users.length > 0) {
                    const user = users.find(u =>
                        String(u.username || '').toLowerCase() === String(username).toLowerCase() &&
                        (u.password === password) // NOTE: plaintext for demo; real apps use hashing
                    );

                    if (user) {
                        if (user.status && user.status !== 'active') {
                            throw new Error('Your account is inactive. Please contact administrator.');
                        }
                        const { password: _, ...safeUser } = user;
                        return safeUser;
                    }
                }
            }
        } catch (dbErr) {
            console.warn('⚠️ DB auth attempt failed; falling back to demo users:', dbErr?.message || dbErr);
        }

        // 2) Fallback demo users
        const demoUser = Object.values(this._demoUsers).find(demo => 
            demo.username === username && demo.password === password
        );
        
        if (demoUser) {
            const { password: _, ...safeUser } = demoUser;
            return safeUser;
        }

        return null;
    }

    async loadCurrentUser() {
        try {
            const raw = localStorage.getItem('currentUser');
            if (!raw) return;

            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.id) return;

            // Try to verify existence in DB but do not fail if DB is unavailable.
            try {
                if (this.db && typeof this.db.getUsers === 'function') {
                    const users = await this.db.getUsers();
                    const exists = Array.isArray(users) && users.some(u => u.id === parsed.id);
                    if (exists) {
                        this.currentUser = parsed;
                        this.isAuthenticated = true;
                        console.log('🔄 Restored session for', parsed.name);
                        this.showDashboard();
                        return;
                    } else {
                        console.warn('⚠️ Saved user not found in DB; clearing cached session');
                        localStorage.removeItem('currentUser');
                        this.currentUser = null;
                        this.isAuthenticated = false;
                        return;
                    }
                } else {
                    // DB not available — accept saved user
                    this.currentUser = parsed;
                    this.isAuthenticated = true;
                    console.log('🔄 Restored cached session (DB unavailable) for', parsed.name);
                    this.showDashboard();
                    return;
                }
            } catch (verifyErr) {
                console.warn('⚠️ Could not verify user in DB, continuing with cached user:', verifyErr?.message || verifyErr);
                this.currentUser = parsed;
                this.isAuthenticated = true;
                this.showDashboard();
                return;
            }
        } catch (err) {
            console.error('Error loading current user:', err);
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    async saveCurrentUser(user) {
        try {
            if (!user) throw new Error('No user provided to save');

            const safeUser = { ...user };
            // never persist password in storage
            delete safeUser.password;

            const now = new Date().toISOString();
            if (!safeUser.created_at) safeUser.created_at = now;
            safeUser.updated_at = now;

            // Persist locally
            localStorage.setItem('currentUser', JSON.stringify(safeUser));

            // Try to ensure user exists in DB (don't throw on failure)
            if (this.db && typeof this.db.getUsers === 'function') {
                try {
                    const users = await this.db.getUsers();
                    const exists = Array.isArray(users) && users.some(u => u.id === safeUser.id);
                    if (!exists) {
                        // If DB expects UUIDs and we used a local id, DatabaseManager will sanitize/handle it
                        await this.db.create('users', safeUser);
                    } else {
                        // Update DB record to keep timestamps / names in sync
                        await this.db.update('users', safeUser.id, safeUser);
                    }
                } catch (dbErr) {
                    console.warn('⚠️ Failed to sync user to DB:', dbErr?.message || dbErr);
                }
            }

            // Update in-memory
            this.currentUser = safeUser;
            this.isAuthenticated = true;

            return safeUser;
        } catch (err) {
            console.error('Error in saveCurrentUser:', err);
            throw err;
        }
    }

    async handleLogout() {
        // Confirm for UX (optional)
        if (!confirm('Are you sure you want to logout?')) return;

        console.log('🚪 Logging out', this.currentUser?.name);
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('currentUser');

        // Show login UI and toast
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated && this.currentUser !== null;
    }

    hasPermission(requiredRole) {
        if (!this.currentUser) return false;
        const hierarchy = { admin: 4, manager: 3, supervisor: 2, user: 1 };
        const userLevel = hierarchy[this.currentUser.role] || 0;
        const reqLevel = hierarchy[requiredRole] || 0;
        return userLevel >= reqLevel;
    }

    canAccessSection(sectionName) {
        if (!this.currentUser) return false;

        const map = {
            dashboard: ['admin', 'manager', 'supervisor', 'user'],
            users: ['admin'],
            employees: ['admin', 'manager'],
            salary: ['admin', 'manager'],
            billing: ['admin', 'supervisor'],
            customers: ['admin', 'supervisor'],
            pending: ['admin', 'supervisor'],
            payments: ['admin', 'supervisor'],
            reports: ['admin', 'manager', 'supervisor'],
            settings: ['admin', 'manager', 'supervisor', 'user']
        };

        const allowed = map[sectionName] || [];
        return allowed.includes(this.currentUser.role);
    }

    async createUser(userData) {
        if (!this.hasPermission('admin')) throw new Error('Insufficient permissions to create users');
        if (!userData || !userData.name || !userData.role) throw new Error('Name and role are required');

        if (!userData.username) userData.username = userData.name.toLowerCase().replace(/\s+/g, '.');
        if (!userData.password) userData.password = 'default123';

        const newUser = {
            ...userData,
            id: Utils.generateId(),
            status: 'active',
            created_at: new Date().toISOString()
        };

        return await this.db.create('users', newUser);
    }

    async updateUser(userId, userData) {
        if (!this.hasPermission('admin')) throw new Error('Insufficient permissions to update users');
        return await this.db.update('users', userId, {
            ...userData,
            updated_at: new Date().toISOString()
        });
    }

    async deleteUser(userId) {
        if (!this.hasPermission('admin')) throw new Error('Insufficient permissions to delete users');
        if (this.currentUser && userId === this.currentUser.id) throw new Error('Cannot delete your own account');
        return await this.db.delete('users', userId);
    }

    showDashboard() {
        // Hide login, show dashboard section (SPA style)
        document.getElementById('loginSection')?.classList.add('hidden');
        document.getElementById('dashboardSection')?.classList.remove('hidden');

        // Update UI with user details
        if (this.ui && typeof this.ui.updateUserInfo === 'function') {
            this.ui.updateUserInfo(this.currentUser);
        } else {
            // Minimal fallback updates
            const userName = document.getElementById('userName');
            if (userName && this.currentUser?.name) userName.textContent = this.currentUser.name;

            const avatar = document.getElementById('userAvatar');
            const settingsAvatar = document.getElementById('settingsAvatar');
            if (this.currentUser?.name && (avatar || settingsAvatar)) {
                const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=ff6b35&color=fff&size=128`;
                if (avatar) avatar.src = url;
                if (settingsAvatar) settingsAvatar.src = url;
            }
        }

        // Role-based UI
        if (this.ui && typeof this.ui.setupRoleBasedAccess === 'function') {
            this.ui.setupRoleBasedAccess(this.currentUser.role);
        } else {
            this.setupBasicRoleAccess(this.currentUser.role);
        }

        // Notify app sections to load initial data
        window.dispatchEvent(new CustomEvent('dashboardReady', { detail: { user: this.currentUser } }));
    }

    showLogin() {
        document.getElementById('loginSection')?.classList.remove('hidden');
        document.getElementById('dashboardSection')?.classList.add('hidden');

        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();

        const loginError = document.getElementById('loginError');
        if (loginError) loginError.classList.add('hidden');
    }

    setupBasicRoleAccess(role) {
        const rolePermissions = {
            admin: ['dashboard', 'users', 'employees', 'salary', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
            manager: ['dashboard', 'employees', 'salary', 'reports', 'settings'],
            supervisor: ['dashboard', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
            user: ['dashboard', 'settings']
        };

        const allowed = rolePermissions[role] || ['dashboard', 'settings'];

        document.querySelectorAll('.nav-link').forEach(link => {
            const section = link.getAttribute('data-section');
            const li = link.closest('li');
            if (!li) return;
            if (!allowed.includes(section)) li.style.display = 'none';
            else li.style.display = 'block';
        });
    }

    togglePasswordVisibility(toggleButtonOrElement) {
        let btn = toggleButtonOrElement;
        if (toggleButtonOrElement && toggleButtonOrElement.target) {
            btn = toggleButtonOrElement.target.closest('.password-toggle');
        }
        if (!btn) return;

        const container = btn.closest('.password-input-container') || btn.parentElement;
        if (!container) return;
        const input = container.querySelector('input[type="password"], input[type="text"]');
        const icon = btn.querySelector('i');

        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        if (icon) {
            icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        }

        btn.title = isPassword ? 'Hide password' : 'Show password';
    }

    showLoading(msg = 'Loading...') {
        if (this.ui && typeof this.ui.showLoading === 'function') {
            this.ui.showLoading(msg);
        } else if (typeof Utils !== 'undefined' && Utils.showLoading) {
            Utils.showLoading(msg);
        } else {
            console.debug('Loading:', msg);
        }
    }

    hideLoading() {
        if (this.ui && typeof this.ui.hideLoading === 'function') {
            this.ui.hideLoading();
        } else if (typeof Utils !== 'undefined' && Utils.hideLoading) {
            Utils.hideLoading();
        }
    }

    showToast(msg, type = 'info') {
        if (this.ui && typeof this.ui.showToast === 'function') {
            this.ui.showToast(msg, type);
            return;
        }

        // fallback simple toast
        let toast = document.getElementById('basicToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'basicToast';
            toast.style.cssText = `
                position: fixed; top: 20px; right: 20px;
                padding: 0.9rem 1.2rem; border-radius: 8px;
                color: white; z-index: 3000; transform: translateX(200px);
                transition: transform .3s ease;
            `;
            document.body.appendChild(toast);
        }
        const colors = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#17a2b8' };
        toast.textContent = msg;
        toast.style.background = colors[type] || colors.info;
        toast.style.transform = 'translateX(0)';
        setTimeout(() => {
            toast.style.transform = 'translateX(200px)';
        }, 2800);
    }

    cleanup() {
        // Cleanup event listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm && loginForm._authListenerAttached) {
            loginForm.removeEventListener('submit', this.handleLogin);
            loginForm._authListenerAttached = false;
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && logoutBtn._authListenerAttached) {
            logoutBtn.removeEventListener('click', this.handleLogout);
            logoutBtn._authListenerAttached = false;
        }
    }
}

window.AuthManager = AuthManager;