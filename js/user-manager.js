class UserManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.users = [];
        this.isInitialized = false;
    }

    async initialize() {
        await this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ UserManager initialized');
        return Promise.resolve();
    }

    setupEventListeners() {
        console.log('🔧 Setting up UserManager event listeners...');
        
        // Use event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // Add User button
            if (e.target.id === 'addUserBtn' || e.target.closest('#addUserBtn')) {
                e.preventDefault();
                this.showAddUserModal();
            }
            
            // Export Users button
            if (e.target.id === 'exportUsersBtn' || e.target.closest('#exportUsersBtn')) {
                e.preventDefault();
                this.exportUsers();
            }
        });

        // User form submission
        const userForm = document.getElementById('userForm');
        if (userForm && !userForm._listenerAttached) {
            userForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
            userForm._listenerAttached = true;
        }

        // Search functionality
        const userSearch = document.getElementById('userSearch');
        if (userSearch && !userSearch._listenerAttached) {
            userSearch.addEventListener('input', (e) => this.searchUsers(e.target.value));
            userSearch._listenerAttached = true;
        }

        // Modal close/cancel buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-cancel') || 
                e.target.classList.contains('modal-close')) {
                this.ui.hideModal('userModal');
            }
        });

        console.log('✅ UserManager event listeners setup complete');
    }

    async loadUsers() {
        try {
            console.log('👥 Loading users...');
            this.ui.showSectionLoading('usersContent', 'Loading users...');

            this.users = await this.db.getUsers();
            this.renderUsersTable(this.users);

            this.ui.showToast('Users loaded successfully', 'success');
            return this.users;
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.ui.showToast('Error loading users: ' + error.message, 'error');
            throw error;
        } finally {
            this.ui.hideSectionLoading('usersContent');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.error('Users table body not found');
            return;
        }

        if (users.length === 0) {
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
        
        tbody.innerHTML = users.map(user => `
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

    formatRoleName(role) {
        const roleNames = {
            'admin': 'Administrator',
            'manager': 'Manager',
            'supervisor': 'Supervisor',
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

    showAddUserModal() {
        console.log('🔄 Checking permissions for adding user...');
        
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to create users', 'error');
            return;
        }

        this.ui.showModal('userModal');
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('userForm').reset();
        document.getElementById('editUserId').value = '';

        // Set default values
        document.getElementById('userStatus').value = 'active';
        document.getElementById('userRole').value = 'user';
        
        console.log('✅ Add user modal shown');
    }

    async editUser(userId) {
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to edit users', 'error');
            return;
        }

        try {
            this.ui.showLoading('Loading user...');
            const user = this.users.find(u => u.id === userId);

            if (user) {
                document.getElementById('userModalTitle').textContent = 'Edit User';
                document.getElementById('editUserId').value = user.id;
                document.getElementById('userNameInput').value = user.name;
                document.getElementById('userEmail').value = user.email || '';
                document.getElementById('userPhone').value = user.phone || '';
                document.getElementById('userRole').value = user.role;
                document.getElementById('userStatus').value = user.status || 'active';

                this.ui.showModal('userModal');
            } else {
                this.ui.showToast('User not found', 'error');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.ui.showToast('Error loading user', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async handleUserSubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to manage users', 'error');
            return;
        }

        const userId = document.getElementById('editUserId').value;
        const name = document.getElementById('userNameInput').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;

        // Validate inputs
        if (!name) {
            this.ui.showToast('Name is required', 'error');
            return;
        }

        if (email && !this.validateEmail(email)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (phone && !this.validatePhone(phone)) {
            this.ui.showToast('Please enter a valid phone number', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading ? 
            this.ui.showButtonLoading(button, 'Saving...') : 
            () => { if (button) button.disabled = false; };

        try {
            const userData = {
                name: this.sanitizeInput(name),
                email: email ? this.sanitizeInput(email) : null,
                phone: phone ? this.sanitizeInput(phone) : null,
                role,
                status,
                updated_at: new Date().toISOString()
            };

            if (userId) {
                // Update existing user
                await this.db.update('users', userId, userData);
                this.ui.showToast('User updated successfully', 'success');
            } else {
                // Create new user
                userData.username = this.generateUsername(name);
                userData.password = 'default123'; // Default password
                userData.created_at = new Date().toISOString();

                await this.db.create('users', userData);
                this.ui.showToast('User created successfully', 'success');
            }

            this.ui.hideModal('userModal');
            await this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.ui.showToast('Error saving user: ' + error.message, 'error');
        } finally {
            resetButton();
        }
    }

    generateUsername(name) {
        const baseUsername = name.toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '');

        // Add timestamp to ensure uniqueness
        const timestamp = Date.now().toString().slice(-4);
        return `${baseUsername}.${timestamp}`;
    }

    async deleteUser(userId) {
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to delete users', 'error');
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.ui.showToast('User not found', 'error');
            return;
        }

        const currentUser = this.auth.getCurrentUser();
        if (userId === currentUser?.id) {
            this.ui.showToast('Cannot delete your own account', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.ui.showLoading('Deleting user...');
            await this.db.delete('users', userId);
            this.ui.showToast('User deleted successfully', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.ui.showToast('Error deleting user: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async exportUsers() {
        try {
            console.log('📤 Starting user export...');
            
            // Show export progress
            if (this.ui.showExportProgress) {
                this.ui.showExportProgress('Preparing user data...');
            } else {
                this.ui.showLoading('Preparing export...');
            }

            const users = await this.db.getUsers();
            if (users.length === 0) {
                this.ui.showToast('No users to export', 'warning');
                return;
            }

            const exportData = users.map(user => ({
                'Name': user.name,
                'Username': user.username,
                'Email': user.email || '',
                'Phone': user.phone || '',
                'Role': this.formatRoleName(user.role),
                'Status': user.status,
                'Created Date': this.formatDate(user.created_at)
            }));

            // Try exportManager first, then fallback to Utils
            if (window.exportManager && typeof window.exportManager.exportToExcel === 'function') {
                await window.exportManager.exportToExcel(exportData, 'users_export', 'Users Export');
            } else if (window.Utils && typeof window.Utils.exportToExcel === 'function') {
                window.Utils.exportToExcel(exportData, 'users_export');
            } else {
                // Fallback export implementation
                this.fallbackExport(exportData, 'users_export');
            }

            this.ui.showToast('Users exported successfully', 'success');
            console.log('✅ User export completed');
            
        } catch (error) {
            console.error('❌ Error exporting users:', error);
            this.ui.showToast('Error exporting users: ' + error.message, 'error');
        } finally {
            if (this.ui.hideExportProgress) {
                this.ui.hideExportProgress();
            } else {
                this.ui.hideLoading();
            }
        }
    }

    fallbackExport(data, filename) {
        // Simple CSV export fallback
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    `"${String(row[header] || '').replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    searchUsers(query) {
        if (!query) {
            this.renderUsersTable(this.users);
            return;
        }

        const filteredUsers = this.users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase()) ||
            user.phone?.includes(query) ||
            user.role.toLowerCase().includes(query.toLowerCase())
        );

        this.renderUsersTable(filteredUsers);
    }

    async getUserStats() {
        const users = await this.db.getUsers();
        const stats = {
            total: users.length,
            byRole: {},
            byStatus: {}
        };

        users.forEach(user => {
            stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
            stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
        });

        return stats;
    }

    // Utility methods
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

    cleanup() {
        // Cleanup event listeners if needed
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

window.UserManager = UserManager;