class UserManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('UserManager: dependencies required');
        if (!dependencies.db) throw new Error('UserManager: db dependency is required');
        if (!dependencies.ui) throw new Error('UserManager: ui dependency is required');
        if (!dependencies.auth) throw new Error('UserManager: auth dependency is required');

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.users = [];
        this.isInitialized = false;

        console.log('✅ UserManager created');
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('🔄 Initializing UserManager...');
            await this.loadUsers();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ UserManager initialized');
        } catch (error) {
            console.error('❌ UserManager initialization failed:', error);
            throw error;
        }
    }

    async loadUsers() {
        try {
            console.log('👥 Loading users...');
            this.showSectionLoading('Loading users...');

            this.users = await this.db.getUsers() || [];
            console.log(`✅ Loaded ${this.users.length} users`);

            this.renderUsersTable();
            this.showToast('Users loaded successfully', 'success');

        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showToast('Error loading users: ' + error.message, 'error');
            this.users = [];
            this.renderUsersTable();
        } finally {
            this.hideSectionLoading();
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up UserManager event listeners...');

        // Clean up existing listeners first
        this.cleanup();

        // Add User Button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addUserBtn' || e.target.closest('#addUserBtn')) {
                e.preventDefault();
                this.showAddUserModal();
            }

            // Export Users Button
            if (e.target.id === 'exportUsersBtn' || e.target.closest('#exportUsersBtn')) {
                e.preventDefault();
                this.showExportOptions();
            }
        });

        // User Form Submission
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
            userForm._listenerAttached = true;
        }

        // User Search
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => this.searchUsers(e.target.value));
            userSearch._listenerAttached = true;
        }

        // Password toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('.password-toggle')) {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            }
        });

        console.log('✅ UserManager event listeners setup complete');
    }

    showAddUserModal() {
        if (!this.auth.hasPermission('admin')) {
            this.showToast('Insufficient permissions to create users', 'error');
            return;
        }

        this.showModal('userModal');
        
        // Reset form
        setTimeout(() => {
            const form = document.getElementById('userForm');
            const title = document.getElementById('userModalTitle');
            const userId = document.getElementById('editUserId');

            if (title) title.textContent = 'Add User';
            if (userId) userId.value = '';
            if (form) form.reset();

            // Set default values
            const status = document.getElementById('userStatus');
            const role = document.getElementById('userRole');
            if (status) status.value = 'active';
            if (role) role.value = 'user';

            // Clear password placeholders
            const password = document.getElementById('userPassword');
            const confirmPassword = document.getElementById('userConfirmPassword');
            if (password) password.placeholder = 'Enter password';
            if (confirmPassword) confirmPassword.placeholder = 'Confirm password';
        }, 100);
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.error('❌ Users table body not found');
            return;
        }

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-users"></i>
                        <br>No users found
                    </td>
                </tr>
            `;
            return;
        }

        const currentUser = this.auth.getCurrentUser();

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <div class="user-avatar-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff6b35&color=fff" 
                             alt="${user.name}" class="user-avatar-table">
                        <div class="user-info-table">
                            <span class="user-name-table">
                                ${user.name}
                                ${user.id === currentUser?.id ? '<span class="current-user-badge">You</span>' : ''}
                            </span>
                            <span class="user-username-table">@${user.username}</span>
                        </div>
                    </div>
                </td>
                <td>${user.email || '<span class="text-muted">N/A</span>'}</td>
                <td>${user.phone || '<span class="text-muted">N/A</span>'}</td>
                <td>
                    <span class="role-badge role-${user.role}">${this.formatRoleName(user.role)}</span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="app.getManagers().user.editUser('${user.id}')" 
                                ${user.id === currentUser?.id ? 'disabled title="Cannot edit your own account"' : ''}>
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-icon btn-delete" onclick="app.getManagers().user.deleteUser('${user.id}')"
                                ${user.id === currentUser?.id ? 'disabled title="Cannot delete your own account"' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async editUser(userId) {
        if (!this.auth.hasPermission('admin')) {
            this.showToast('Insufficient permissions to edit users', 'error');
            return;
        }

        try {
            this.showLoading('Loading user...');
            const user = this.users.find(u => u.id === userId);

            if (user) {
                // Populate form
                document.getElementById('userModalTitle').textContent = 'Edit User';
                document.getElementById('editUserId').value = user.id;
                document.getElementById('userNameInput').value = user.name;
                document.getElementById('userEmail').value = user.email || '';
                document.getElementById('userPhone').value = user.phone || '';
                document.getElementById('userRole').value = user.role;
                document.getElementById('userStatus').value = user.status || 'active';

                // Clear passwords and set placeholders
                const password = document.getElementById('userPassword');
                const confirmPassword = document.getElementById('userConfirmPassword');
                if (password) {
                    password.value = '';
                    password.placeholder = 'Leave blank to keep current password';
                }
                if (confirmPassword) {
                    confirmPassword.value = '';
                    confirmPassword.placeholder = 'Leave blank to keep current password';
                }

                this.showModal('userModal');
            } else {
                this.showToast('User not found', 'error');
            }
        } catch (error) {
            console.error('❌ Error loading user:', error);
            this.showToast('Error loading user', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleUserSubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin')) {
            this.showToast('Insufficient permissions to manage users', 'error');
            return;
        }

        const userId = document.getElementById('editUserId').value;
        const name = document.getElementById('userNameInput').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;

        // Validation
        if (!name) {
            this.showToast('Name is required', 'error');
            return;
        }

        // For new users, password is required
        if (!userId && !password) {
            this.showToast('Password is required for new users', 'error');
            return;
        }

        // Password validation
        if (password) {
            if (password.length < 6) {
                this.showToast('Password must be at least 6 characters', 'error');
                return;
            }
            if (password !== confirmPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }
        }

        // Email validation
        if (email && !this.validateEmail(email)) {
            this.showToast('Please enter a valid email', 'error');
            return;
        }

        try {
            this.showLoading('Saving user...');

            const userData = {
                name: this.sanitizeInput(name),
                email: email || '',
                phone: phone || '',
                role,
                status,
                updated_at: new Date().toISOString()
            };

            if (userId) {
                // Update existing user
                if (password) {
                    userData.password = password;
                }
                await this.db.update('users', userId, userData);
                this.showToast('User updated successfully', 'success');
            } else {
                // Create new user
                userData.username = this.generateUsername(name);
                userData.password = password;
                userData.created_at = new Date().toISOString();
                userData.id = this.generateId();

                await this.db.create('users', userData);
                this.showToast('User created successfully', 'success');
            }

            this.hideModal('userModal');
            await this.loadUsers(); // Reload users

        } catch (error) {
            console.error('❌ Error saving user:', error);
            this.showToast('Error saving user: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteUser(userId) {
        if (!this.auth.hasPermission('admin')) {
            this.showToast('Insufficient permissions to delete users', 'error');
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showToast('User not found', 'error');
            return;
        }

        const currentUser = this.auth.getCurrentUser();
        if (userId === currentUser?.id) {
            this.showToast('Cannot delete your own account', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.showLoading('Deleting user...');
            await this.db.delete('users', userId);
            this.showToast('User deleted successfully', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showToast('Error deleting user: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    searchUsers(query) {
        if (!query) {
            this.renderUsersTable();
            return;
        }

        const filteredUsers = this.users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase()) ||
            user.phone?.includes(query) ||
            user.role.toLowerCase().includes(query.toLowerCase())
        );

        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            if (filteredUsers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="no-data">
                            <i class="fas fa-search"></i>
                            <br>No users found matching "${query}"
                        </td>
                    </tr>
                `;
            } else {
                // Temporarily replace the table with filtered results
                const currentUser = this.auth.getCurrentUser();
                tbody.innerHTML = filteredUsers.map(user => `
                    <tr>
                        <td>
                            <div class="user-avatar-cell">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff6b35&color=fff" 
                                     alt="${user.name}" class="user-avatar-table">
                                <div class="user-info-table">
                                    <span class="user-name-table">
                                        ${user.name}
                                        ${user.id === currentUser?.id ? '<span class="current-user-badge">You</span>' : ''}
                                    </span>
                                    <span class="user-username-table">@${user.username}</span>
                                </div>
                            </div>
                        </td>
                        <td>${user.email || '<span class="text-muted">N/A</span>'}</td>
                        <td>${user.phone || '<span class="text-muted">N/A</span>'}</td>
                        <td>
                            <span class="role-badge role-${user.role}">${this.formatRoleName(user.role)}</span>
                        </td>
                        <td>${this.formatDate(user.created_at)}</td>
                        <td>
                            <span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon btn-edit" onclick="app.getManagers().user.editUser('${user.id}')" 
                                        ${user.id === currentUser?.id ? 'disabled title="Cannot edit your own account"' : ''}>
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn-icon btn-delete" onclick="app.getManagers().user.deleteUser('${user.id}')"
                                        ${user.id === currentUser?.id ? 'disabled title="Cannot delete your own account"' : ''}>
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    // Export functionality
    showExportOptions() {
        this.showExportModal('users', ['excel', 'pdf']);
    }

    showExportModal(type, allowedFormats = ['excel', 'pdf']) {
        const titles = {
            'users': 'Users'
        };

        const formatOptions = allowedFormats.map(format => {
            const formatInfo = {
                'excel': { icon: 'fa-file-excel', class: 'excel', label: 'Excel' },
                'pdf': { icon: 'fa-file-pdf', class: 'pdf', label: 'PDF' }
            }[format];

            return `
            <div class="export-option" onclick="app.getManagers().user.exportTo${format.toUpperCase()}('${type}')">
                <div class="export-icon ${formatInfo.class}">
                    <i class="fas ${formatInfo.icon}"></i>
                </div>
                <div class="export-info">
                    <h4>Export to ${formatInfo.label}</h4>
                    <p>Download as .${format} file for ${format === 'excel' ? 'data analysis' : 'reporting'}</p>
                </div>
                <div class="export-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `;
        }).join('');

        const exportHtml = `
        <div id="exportModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Export ${titles[type]}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="export-options">
                    ${formatOptions}
                </div>
                
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="app.getManagers().user.closeExportModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(exportHtml, 'exportModal');
    }

    closeExportModal() {
        this.hideModal('exportModal');
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.remove();
        }
    }

    async exportToExcel(type) {
        await this.exportData(type, 'excel');
        this.closeExportModal();
    }

    async exportToPDF(type) {
        await this.exportData(type, 'pdf');
        this.closeExportModal();
    }

    async exportData(type, format = 'excel') {
        try {
            if (!this.auth.hasPermission('admin')) {
                this.showToast('Insufficient permissions to export data', 'error');
                return;
            }

            this.showExportProgress(`Preparing ${type} data...`);

            let data = [];
            let filename = '';
            let title = '';

            switch (type) {
                case 'users':
                    data = this.users;
                    filename = `users_export_${new Date().toISOString().split('T')[0]}`;
                    title = 'Users Report';
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }

            if (data.length === 0) {
                this.showToast(`No ${type} data to export`, 'warning');
                return;
            }

            const exportData = data.map(user => ({
                'Name': user.name,
                'Username': user.username,
                'Email': user.email || '',
                'Phone': user.phone || '',
                'Role': this.formatRoleName(user.role),
                'Status': user.status,
                'Created Date': this.formatDate(user.created_at)
            }));

            // Use the unified export method
            if (window.exportManager) {
                await window.exportManager.exportData(exportData, format, filename, title);
            } else {
                // Fallback to direct Utils
                if (format === 'pdf') {
                    await Utils.exportToPDF(exportData, filename, title);
                } else {
                    Utils.exportToExcel(exportData, filename);
                }
            }

            this.showToast(`${title} exported successfully`, 'success');
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            this.showToast(`Error exporting ${type}: ${error.message}`, 'error');
        } finally {
            this.hideExportProgress();
        }
    }

    showCustomModal(html, modalId) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', html);
        this.showModal(modalId);
    }

    // Utility methods
    formatRoleName(role) {
        const roleNames = {
            'admin': 'Administrator',
            'manager': 'Manager',
            'user': 'User'
        };
        return roleNames[role] || role;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    }

    generateUsername(name) {
        const baseUsername = name.toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '');
        const timestamp = Date.now().toString().slice(-4);
        return `${baseUsername}.${timestamp}`;
    }

    generateId() {
        return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>&"']/g, '');
    }

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

    // UI helper methods
    showToast(message, type = 'info') {
        if (this.ui && this.ui.showToast) {
            this.ui.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    showLoading(message) {
        if (this.ui && this.ui.showLoading) {
            this.ui.showLoading(message);
        } else {
            console.log(`⏳ ${message}`);
        }
    }

    hideLoading() {
        if (this.ui && this.ui.hideLoading) {
            this.ui.hideLoading();
        }
    }

    showSectionLoading(message) {
        if (this.ui && this.ui.showSectionLoading) {
            this.ui.showSectionLoading('usersContent', message);
        }
    }

    hideSectionLoading() {
        if (this.ui && this.ui.hideSectionLoading) {
            this.ui.hideSectionLoading('usersContent');
        }
    }

    showModal(modalId) {
        if (this.ui && this.ui.showModal) {
            this.ui.showModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        if (this.ui && this.ui.hideModal) {
            this.ui.hideModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        }
    }

    showExportProgress(message) {
        if (this.ui && this.ui.showExportProgress) {
            this.ui.showExportProgress(message);
        } else {
            this.showLoading(message);
        }
    }

    hideExportProgress() {
        if (this.ui && this.ui.hideExportProgress) {
            this.ui.hideExportProgress();
        } else {
            this.hideLoading();
        }
    }

    cleanup() {
        // Cleanup event listeners
        const userForm = document.getElementById('userForm');
        if (userForm && userForm._listenerAttached) {
            userForm.removeEventListener('submit', this.handleUserSubmit);
            userForm._listenerAttached = false;
        }

        const userSearch = document.getElementById('userSearch');
        if (userSearch && userSearch._listenerAttached) {
            userSearch.removeEventListener('input', this.searchUsers);
            userSearch._listenerAttached = false;
        }
    }
}

// Make available globally
window.UserManager = UserManager;