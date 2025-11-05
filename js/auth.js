class AuthManager {
    constructor(db = null) {
        this.db = db;
        this.ui = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isInitialized = false;
        
        // Demo users for fallback
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
        
        console.log('✅ AuthManager created');
    }

    setUI(ui) {
        this.ui = ui;
    }

    setDB(db) {
        this.db = db;
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
        console.log('🔧 Setting up AuthManager event listeners...');
        
        // Clean up existing listeners first
        this.cleanup();
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            loginForm._authListenerAttached = true;
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
            logoutBtn._authListenerAttached = true;
        }

        // Password toggles
        document.addEventListener('click', (e) => {
            if (e.target.closest('.password-toggle')) {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('🔐 Handling login...');

        const username = document.getElementById('username')?.value.trim() || '';
        const password = document.getElementById('password')?.value || '';
        const errorDiv = document.getElementById('loginError');

        // Clear previous errors
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }

        // Validation
        if (!username || !password) {
            this.showError('Please enter username and password.');
            return;
        }

        try {
            this.showLoading('Logging in...');
            const user = await this.authenticateUser(username, password);

            if (!user) {
                throw new Error('Invalid username or password');
            }

            // Check if user is active
            if (user.status && user.status !== 'active') {
                throw new Error('Your account is inactive. Please contact administrator.');
            }

            // Login successful
            this.currentUser = user;
            this.isAuthenticated = true;

            // Save session
            await this.saveCurrentUser(user);
            
            // Show dashboard
            this.showDashboard();
            this.showToast(`Welcome ${user.name}!`, 'success');
            console.log(`✅ User ${user.name} (${user.role}) logged in`);

        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showError(error.message || 'Login failed');
        } finally {
            this.hideLoading();
        }
    }

    async authenticateUser(username, password) {
        console.log(`🔐 Authenticating: ${username}`);
        
        // 1. Try database first
        if (this.db && typeof this.db.getUsers === 'function') {
            try {
                const users = await this.db.getUsers();
                if (users && users.length > 0) {
                    const user = users.find(u => 
                        u.username === username && 
                        u.password === password // Plain text for demo
                    );
                    if (user) {
                        console.log('✅ User authenticated from database');
                        const { password: _, ...safeUser } = user;
                        return safeUser;
                    }
                }
            } catch (dbError) {
                console.warn('⚠️ Database auth failed, using demo users:', dbError);
            }
        }

        // 2. Fallback to demo users
        const demoUser = Object.values(this._demoUsers).find(
            user => user.username === username && user.password === password
        );

        if (demoUser) {
            console.log('✅ User authenticated from demo accounts');
            const { password: _, ...safeUser } = demoUser;
            return safeUser;
        }

        console.log('❌ Authentication failed');
        return null;
    }

    async loadCurrentUser() {
        try {
            const saved = localStorage.getItem('currentUser');
            if (!saved) {
                console.log('📭 No saved user session');
                this.showLogin();
                return;
            }

            const user = JSON.parse(saved);
            if (!user || !user.id) {
                localStorage.removeItem('currentUser');
                this.showLogin();
                return;
            }

            // Verify user exists in database
            if (this.db) {
                try {
                    const users = await this.db.getUsers();
                    const userExists = users.some(u => u.id === user.id);
                    if (!userExists) {
                        console.warn('⚠️ Saved user not found in DB');
                        localStorage.removeItem('currentUser');
                        this.showLogin();
                        return;
                    }
                } catch (error) {
                    console.warn('⚠️ Could not verify user in DB, using cached session');
                }
            }

            // Restore session
            this.currentUser = user;
            this.isAuthenticated = true;
            console.log(`🔄 Session restored for ${user.name}`);
            this.showDashboard();

        } catch (error) {
            console.error('❌ Error loading user session:', error);
            localStorage.removeItem('currentUser');
            this.showLogin();
        }
    }

    async saveCurrentUser(user) {
        try {
            const safeUser = { ...user };
            delete safeUser.password; // Never save password
            
            safeUser.updated_at = new Date().toISOString();
            
            // Save to localStorage
            localStorage.setItem('currentUser', JSON.stringify(safeUser));
            console.log('💾 User session saved');

            // Sync to database if available
            if (this.db) {
                try {
                    const users = await this.db.getUsers();
                    const exists = users.some(u => u.id === safeUser.id);
                    
                    if (exists) {
                        await this.db.update('users', safeUser.id, safeUser);
                    } else {
                        await this.db.create('users', safeUser);
                    }
                } catch (dbError) {
                    console.warn('⚠️ Could not sync user to DB:', dbError);
                }
            }

        } catch (error) {
            console.error('❌ Error saving user:', error);
            throw error;
        }
    }

    async handleLogout() {
        if (!confirm('Are you sure you want to logout?')) return;

        console.log('🚪 Logging out...');
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('currentUser');

        this.showLogin();
        this.showToast('Logged out successfully', 'info');
    }

    showDashboard() {
        console.log('🏠 Showing dashboard');
        
        // Hide login, show dashboard
        document.getElementById('loginSection')?.classList.add('hidden');
        document.getElementById('dashboardSection')?.classList.remove('hidden');

        // Update user info
        this.updateUserInterface();

        // Setup role-based access
        this.setupRoleBasedAccess();

        // Notify other components
        window.dispatchEvent(new CustomEvent('userLoggedIn', { 
            detail: { user: this.currentUser } 
        }));
    }

    showLogin() {
        console.log('🔐 Showing login');
        
        // Show login, hide dashboard
        document.getElementById('loginSection')?.classList.remove('hidden');
        document.getElementById('dashboardSection')?.classList.add('hidden');

        // Reset form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();

        // Clear errors
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user name
        const userNameElements = document.querySelectorAll('#userName, .user-name');
        userNameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.name;
        });

        // Update avatars
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=ff6b35&color=fff&size=128`;
        const avatars = document.querySelectorAll('#userAvatar, .user-avatar');
        avatars.forEach(avatar => {
            if (avatar) avatar.src = avatarUrl;
        });

        // Update role
        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(el => {
            if (el) el.textContent = this.formatRoleName(this.currentUser.role);
        });
    }

    setupRoleBasedAccess() {
        if (!this.currentUser) return;

        const role = this.currentUser.role;
        console.log(`🔐 Setting up access for role: ${role}`);

        const permissions = {
            admin: ['dashboard', 'users', 'employees', 'salary', 'attendance', 'billing', 'customers', 'reports', 'settings'],
            manager: ['dashboard', 'employees', 'salary', 'attendance', 'billing', 'customers', 'reports'],
            user: ['dashboard', 'reports', 'settings']
        };

        const allowedSections = permissions[role] || ['dashboard'];

        // Hide/show navigation items
        document.querySelectorAll('.nav-link').forEach(link => {
            const section = link.getAttribute('data-section');
            const listItem = link.closest('li');
            
            if (listItem) {
                if (allowedSections.includes(section)) {
                    listItem.style.display = 'block';
                } else {
                    listItem.style.display = 'none';
                }
            }
        });
    }

    formatRoleName(role) {
        const names = {
            'admin': 'Administrator',
            'manager': 'Manager', 
            'user': 'User'
        };
        return names[role] || role;
    }

    // Permission checking
    hasPermission(requiredRole) {
        if (!this.currentUser) return false;
        
        const hierarchy = { admin: 3, manager: 2, user: 1 };
        const userLevel = hierarchy[this.currentUser.role] || 0;
        const requiredLevel = hierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }

    canAccessSection(sectionName) {
        if (!this.currentUser) return false;

        const permissions = {
            dashboard: ['admin', 'manager', 'user'],
            users: ['admin'],
            employees: ['admin', 'manager'],
            salary: ['admin', 'manager'],
            attendance: ['admin', 'manager'],
            billing: ['admin', 'manager'],
            customers: ['admin', 'manager'],
            reports: ['admin', 'manager', 'user'],
            settings: ['admin', 'manager', 'user']
        };

        const allowedRoles = permissions[sectionName] || [];
        return allowedRoles.includes(this.currentUser.role);
    }

    // Utility methods
    togglePasswordVisibility(toggleBtn) {
        const container = toggleBtn.closest('.password-input-container');
        const input = container?.querySelector('input');
        const icon = toggleBtn?.querySelector('i');

        if (!input || !icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
        this.showToast(message, 'error');
    }

    showLoading(message = 'Loading...') {
        console.log(`⏳ ${message}`);
        // You can implement a proper loading indicator here
    }

    hideLoading() {
        // Hide loading indicator
    }

    showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Simple alert fallback - replace with proper toast
        alert(`${type.toUpperCase()}: ${message}`);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated && this.currentUser !== null;
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

// Make available globally
window.AuthManager = AuthManager;