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
            admin: ['dashboard', 'users', 'employees', 'salary', 'salary-payments', 'attendance', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
            manager: ['dashboard', 'employees', 'salary', 'salary-payments', 'attendance', 'billing', 'customers', 'reports'],
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

    // Enhanced Permission checking system
    hasPermission(requiredPermission) {
        if (!this.currentUser) {
            console.log('🔐 No current user for permission check');
            return false;
        }
        
        console.log(`🔐 Checking permission: ${requiredPermission} for role: ${this.currentUser.role}`);
        
        // Define comprehensive permissions for each role
        const rolePermissions = {
            admin: [
                // Role hierarchy
                'admin', 'manager', 'supervisor', 'user',
                
                // Sections
                'dashboard', 'users', 'employees', 'salary', 'salary-payments',
                'attendance', 'billing', 'customers', 'pending', 'payments', 
                'reports', 'settings',
                
                // Actions
                'create', 'read', 'update', 'delete', 'export', 'import'
            ],
            manager: [
                // Role hierarchy
                'manager', 'supervisor', 'user',
                
                // Sections
                'dashboard', 'employees', 'salary', 'salary-payments',
                'attendance', 'billing', 'customers', 'reports',
                
                // Actions
                'create', 'read', 'update', 'export'
            ],
            user: [
                // Role hierarchy
                'user',
                
                // Sections
                'dashboard', 'reports', 'settings',
                
                // Actions
                'read'
            ]
        };

        const userPermissions = rolePermissions[this.currentUser.role] || [];
        const hasAccess = userPermissions.includes(requiredPermission);
        
        console.log(`🔐 ${this.currentUser.role} access to ${requiredPermission}: ${hasAccess}`);
        return hasAccess;
    }

    // Section access control
    canAccessSection(sectionName) {
        if (!this.currentUser) {
            console.log('🔐 No current user for section access check');
            return false;
        }

        console.log(`🔐 Checking section access: ${sectionName} for role: ${this.currentUser.role}`);

        const sectionPermissions = {
            dashboard: ['admin', 'manager', 'user'],
            users: ['admin'],
            employees: ['admin', 'manager'],
            salary: ['admin', 'manager'],
            'salary-payments': ['admin', 'manager'], // ✅ FIXED: Added salary-payments
            attendance: ['admin', 'manager'],
            billing: ['admin', 'manager'],
            customers: ['admin', 'manager'],
            pending: ['admin', 'manager'],
            payments: ['admin', 'manager'],
            reports: ['admin', 'manager', 'user'],
            settings: ['admin', 'manager', 'user']
        };

        const allowedRoles = sectionPermissions[sectionName] || [];
        const canAccess = allowedRoles.includes(this.currentUser.role);
        
        console.log(`🔐 ${this.currentUser.role} access to section ${sectionName}: ${canAccess}`);
        return canAccess;
    }

    // Check if user can perform specific actions
    canPerformAction(action, resource = null) {
        if (!this.currentUser) return false;

        const actionPermissions = {
            admin: ['create', 'read', 'update', 'delete', 'export', 'import', 'manage_users'],
            manager: ['create', 'read', 'update', 'export', 'manage_employees'],
            user: ['read']
        };

        const allowedActions = actionPermissions[this.currentUser.role] || [];
        return allowedActions.includes(action);
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
        if (this.ui && typeof this.ui.showLoading === 'function') {
            this.ui.showLoading(message);
        }
    }

    hideLoading() {
        // Hide loading indicator
        if (this.ui && typeof this.ui.hideLoading === 'function') {
            this.ui.hideLoading();
        }
    }

    showToast(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        if (this.ui && typeof this.ui.showToast === 'function') {
            this.ui.showToast(message, type);
        } else {
            // Fallback to alert
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated && this.currentUser !== null;
    }

    // Get user role with hierarchy
    getUserRole() {
        return this.currentUser?.role || null;
    }

    // Check if user has at least the specified role level
    hasRole(minimumRole) {
        if (!this.currentUser) return false;
        
        const roleHierarchy = {
            'admin': 4,
            'manager': 3,
            'supervisor': 2,
            'user': 1
        };
        
        const userLevel = roleHierarchy[this.currentUser.role] || 0;
        const requiredLevel = roleHierarchy[minimumRole] || 0;
        
        return userLevel >= requiredLevel;
    }

    // Debug method to check all permissions
    debugPermissions() {
        console.group('🔐 DEBUG AuthManager Permissions');
        console.log('Current User:', this.currentUser);
        
        if (this.currentUser) {
            // Check section permissions
            const sections = [
                'dashboard', 'users', 'employees', 'salary', 'salary-payments',
                'attendance', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'
            ];
            
            console.group('📊 Section Access:');
            sections.forEach(section => {
                console.log(`- ${section}: ${this.canAccessSection(section)}`);
            });
            console.groupEnd();
            
            // Check action permissions
            const actions = ['create', 'read', 'update', 'delete', 'export'];
            console.group('⚡ Action Permissions:');
            actions.forEach(action => {
                console.log(`- ${action}: ${this.canPerformAction(action)}`);
            });
            console.groupEnd();
            
            // Check role-based permissions
            console.group('👥 Role Permissions:');
            console.log(`- Has admin permission: ${this.hasPermission('admin')}`);
            console.log(`- Has manager permission: ${this.hasPermission('manager')}`);
            console.log(`- Has salary-payments permission: ${this.hasPermission('salary-payments')}`);
            console.groupEnd();
        } else {
            console.log('❌ No user logged in');
        }
        
        console.groupEnd();
    }

    // Session management
    getSessionInfo() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.currentUser,
            loginTime: this.currentUser?.updated_at,
            permissions: this.getUserPermissions()
        };
    }

    getUserPermissions() {
        if (!this.currentUser) return [];
        
        const rolePermissions = {
            admin: ['all'],
            manager: ['employees', 'salary', 'attendance', 'billing', 'customers', 'reports'],
            user: ['dashboard', 'reports']
        };
        
        return rolePermissions[this.currentUser.role] || [];
    }

    // Cleanup method
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

    // Password strength checker (utility method)
    checkPasswordStrength(password) {
        if (!password) return 'weak';
        
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Complexity checks
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        if (strength <= 2) return 'weak';
        if (strength <= 4) return 'medium';
        return 'strong';
    }

    // Validate user data
    validateUserData(userData) {
        const errors = [];
        
        if (!userData.username || userData.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }
        
        if (!userData.name || userData.name.length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!userData.role || !['admin', 'manager', 'user'].includes(userData.role)) {
            errors.push('Invalid role specified');
        }
        
        if (userData.email && !/\S+@\S+\.\S+/.test(userData.email)) {
            errors.push('Invalid email format');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Make available globally
window.AuthManager = AuthManager;