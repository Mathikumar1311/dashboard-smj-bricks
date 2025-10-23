class UserManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.users = [];
    }

    async initialize() {
        this.setupEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Add User button
            const addUserBtn = document.getElementById('addUserBtn');
            if (addUserBtn) {
                addUserBtn.addEventListener('click', () => this.showAddUserModal());
            }

            // Export Users button
            const exportUsersBtn = document.getElementById('exportUsersBtn');
            if (exportUsersBtn) {
                exportUsersBtn.addEventListener('click', () => this.exportUsers());
            }

            // User form submission
            const userForm = document.getElementById('userForm');
            if (userForm) {
                userForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
            }
        });
    }

    async loadUsers() {
        try {
            console.log('👥 Loading users...');
            this.ui.showSectionLoading('usersContent', 'Loading users...');
            
            this.users = await this.db.getUsers();
            this.renderUsersTable(this.users);
            
            this.ui.showToast('Users loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.ui.showToast('Error loading users', 'error');
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

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-avatar">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff6b35&color=fff" alt="${user.name}">
                        <span>${user.name}</span>
                        ${user.id === this.auth.getCurrentUser()?.id ? '<span class="current-user-badge">You</span>' : ''}
                    </div>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>
                    <span class="role-badge role-${user.role}">${user.role}</span>
                </td>
                <td>${Utils.formatDate(user.created_at)}</td>
                <td>
                    <span class="status-${user.status}">${user.status || 'active'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary" onclick="app.getManagers().user.editUser('${user.id}')" 
                                ${user.id === this.auth.getCurrentUser()?.id ? 'disabled title="Cannot edit your own account"' : ''}>
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-secondary" onclick="app.getManagers().user.deleteUser('${user.id}')"
                                ${user.id === this.auth.getCurrentUser()?.id ? 'disabled title="Cannot delete your own account"' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showAddUserModal() {
        // Check if user has permission to create users
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
    }

    async editUser(userId) {
        // Check if user has permission to edit users
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

        // Check if user has permission to manage users
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

        if (email && !Utils.validateEmail(email)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (phone && !Utils.validatePhone(phone)) {
            this.ui.showToast('Please enter a valid phone number', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Saving...');

        try {
            const userData = {
                name: Utils.sanitizeInput(name),
                email: email ? Utils.sanitizeInput(email) : null,
                phone: phone ? Utils.sanitizeInput(phone) : null,
                role,
                status
            };

            if (userId) {
                // Update existing user
                await this.db.update('users', userId, userData);
                this.ui.showToast('User updated successfully', 'success');
            } else {
                // Create new user
                userData.username = name.toLowerCase().replace(/\s+/g, '.');
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

    async deleteUser(userId) {
        // Check if user has permission to delete users
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to delete users', 'error');
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.ui.showToast('User not found', 'error');
            return;
        }

        // Prevent self-deletion
        if (userId === this.auth.getCurrentUser()?.id) {
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
            this.ui.showExportProgress('Preparing user data...');
            
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
                'Role': user.role,
                'Status': user.status,
                'Created Date': Utils.formatDate(user.created_at)
            }));

            // Use unified export manager if available, otherwise use Utils
            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'users_export', 'Users Export');
            } else {
                Utils.exportToExcel(exportData, 'users_export');
            }
            
            this.ui.showToast('Users exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting users:', error);
            this.ui.showToast('Error exporting users: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // Search functionality
    searchUsers(query) {
        if (!query) {
            this.renderUsersTable(this.users);
            return;
        }

        const filteredUsers = this.users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase()) ||
            user.phone?.includes(query) ||
            user.role.toLowerCase().includes(query.toLowerCase())
        );

        this.renderUsersTable(filteredUsers);
    }

    // Get user statistics
    async getUserStats() {
        const users = await this.db.getUsers();
        const stats = {
            total: users.length,
            byRole: {},
            byStatus: {}
        };

        users.forEach(user => {
            // Count by role
            stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
            
            // Count by status
            stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
        });

        return stats;
    }
}

// Make UserManager available globally
window.UserManager = UserManager;