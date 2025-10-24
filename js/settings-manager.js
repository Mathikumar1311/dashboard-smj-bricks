class SettingsManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.theme = dependencies.theme;
    }

    async initialize() {
        this.setupEventListeners();
        this.loadUserProfile();
        return Promise.resolve();
    }

    setupEventListeners() {
        console.log('⚙️ Setting up settings event listeners...');
        
        setTimeout(() => {
            // Avatar upload
            const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
            if (uploadAvatarBtn) {
                uploadAvatarBtn.addEventListener('click', () => this.showAvatarUpload());
            }

            // Theme selection
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    this.changeTheme(e.currentTarget.dataset.theme);
                });
            });

            // Settings section navigation
            this.setupSettingsNavigation();

        }, 100);
    }

    setupSettingsNavigation() {
        // Create settings navigation if needed
        const settingsContent = document.getElementById('settingsContent');
        if (!settingsContent) return;

        // Add navigation tabs
        const navHtml = `
            <div class="settings-nav">
                <button class="nav-tab active" data-tab="profile">Profile</button>
                <button class="nav-tab" data-tab="appearance">Appearance</button>
                <button class="nav-tab" data-tab="security">Security</button>
                <button class="nav-tab" data-tab="backup">Backup & Restore</button>
            </div>
            <div class="settings-content">
                <div id="profileTab" class="tab-content active">
                    ${this.getProfileTabContent()}
                </div>
                <div id="appearanceTab" class="tab-content">
                    ${this.getAppearanceTabContent()}
                </div>
                <div id="securityTab" class="tab-content">
                    ${this.getSecurityTabContent()}
                </div>
                <div id="backupTab" class="tab-content">
                    ${this.getBackupTabContent()}
                </div>
            </div>
        `;

        // Insert navigation after content header
        const contentHeader = settingsContent.querySelector('.content-header');
        if (contentHeader) {
            contentHeader.insertAdjacentHTML('afterend', navHtml);
        }

        // Add tab click handlers
        this.setupTabHandlers();
    }

    setupTabHandlers() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const tabId = tab.dataset.tab + 'Tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    getProfileTabContent() {
        const currentUser = this.auth.getCurrentUser();
        return `
            <div class="settings-section">
                <h3>Profile Information</h3>
                <div class="avatar-upload-large">
                    <img id="settingsAvatar" class="user-avatar xlarge" 
                         src="${currentUser?.avatar || 'https://ui-avatars.com/api/?name=' + (currentUser?.name || 'User') + '&background=ff6b35&color=fff'}" 
                         alt="User Avatar">
                    <div class="avatar-actions">
                        <button id="uploadAvatarBtn" class="btn-primary">
                            <i class="fas fa-upload"></i> Upload New Avatar
                        </button>
                        <button id="removeAvatarBtn" class="btn-secondary">
                            <i class="fas fa-trash"></i> Remove Avatar
                        </button>
                    </div>
                </div>
                
                <form id="profileForm" class="settings-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" id="profileName" value="${currentUser?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="profileEmail" value="${currentUser?.email || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="profilePhone" value="${currentUser?.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <input type="text" id="profileRole" value="${currentUser?.role || ''}" readonly class="readonly-field">
                        </div>
                    </div>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> Update Profile
                    </button>
                </form>
            </div>
        `;
    }

    getAppearanceTabContent() {
        return `
            <div class="settings-section">
                <h3>Theme Settings</h3>
                <div class="theme-selector">
                    <div class="theme-options">
                        <div class="theme-option active" data-theme="orange">
                            <div class="theme-preview orange-theme"></div>
                            <span>Orange</span>
                        </div>
                        <div class="theme-option" data-theme="blue">
                            <div class="theme-preview blue-theme"></div>
                            <span>Blue</span>
                        </div>
                        <div class="theme-option" data-theme="green">
                            <div class="theme-preview green-theme"></div>
                            <span>Green</span>
                        </div>
                        <div class="theme-option" data-theme="purple">
                            <div class="theme-preview purple-theme"></div>
                            <span>Purple</span>
                        </div>
                        <div class="theme-option" data-theme="dark">
                            <div class="theme-preview dark-theme"></div>
                            <span>Dark</span>
                        </div>
                    </div>
                </div>

                <div class="appearance-options">
                    <h4>Interface Options</h4>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="compactMode" checked>
                            <span class="checkmark"></span>
                            Compact mode (dense tables)
                        </label>
                    </div>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="animations" checked>
                            <span class="checkmark"></span>
                            Enable animations
                        </label>
                    </div>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="soundEffects">
                            <span class="checkmark"></span>
                            Sound effects
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    getSecurityTabContent() {
        return `
            <div class="settings-section">
                <h3>Security Settings</h3>
                
                <div class="security-item">
                    <h4>Change Password</h4>
                    <form id="passwordForm" class="settings-form">
                        <div class="form-group">
                            <label>Current Password *</label>
                            <input type="password" id="currentPassword" required>
                        </div>
                        <div class="form-group">
                            <label>New Password *</label>
                            <input type="password" id="newPassword" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Confirm New Password *</label>
                            <input type="password" id="confirmPassword" required>
                        </div>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                    </form>
                </div>

                <div class="security-item">
                    <h4>Session Management</h4>
                    <div class="session-info">
                        <p>Current session started: <strong>${new Date().toLocaleString()}</strong></p>
                        <button id="logoutAllBtn" class="btn-secondary">
                            <i class="fas fa-sign-out-alt"></i> Logout from all devices
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getBackupTabContent() {
        return `
            <div class="settings-section">
                <h3>Backup & Restore</h3>
                
                <div class="backup-actions">
                    <div class="backup-card">
                        <div class="backup-icon">
                            <i class="fas fa-download"></i>
                        </div>
                        <div class="backup-info">
                            <h4>Create Backup</h4>
                            <p>Export all your data as a backup file</p>
                            <button id="createBackupBtn" class="btn-primary">
                                <i class="fas fa-database"></i> Create Backup
                            </button>
                        </div>
                    </div>

                    <div class="backup-card">
                        <div class="backup-icon">
                            <i class="fas fa-upload"></i>
                        </div>
                        <div class="backup-info">
                            <h4>Restore Backup</h4>
                            <p>Import data from a previous backup</p>
                            <button id="restoreBackupBtn" class="btn-secondary">
                                <i class="fas fa-file-import"></i> Restore Backup
                            </button>
                        </div>
                    </div>
                </div>

                <div class="backup-history">
                    <h4>Recent Backups</h4>
                    <div id="backupList" class="backup-list">
                        <p class="no-data">No backups found</p>
                    </div>
                </div>
            </div>
        `;
    }

    loadUserProfile() {
        const currentUser = this.auth.getCurrentUser();
        if (!currentUser) return;

        // Update avatar
        const avatar = document.getElementById('settingsAvatar');
        if (avatar) {
            avatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff6b35&color=fff`;
        }

        // Update user info in topbar
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = currentUser.name;
        }

        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff6b35&color=fff`;
        }
    }

    showAvatarUpload() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleAvatarUpload(file);
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    async handleAvatarUpload(file) {
        try {
            if (!file.type.startsWith('image/')) {
                this.ui.showToast('Please select a valid image file', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                this.ui.showToast('Image size should be less than 5MB', 'error');
                return;
            }

            this.ui.showLoading('Uploading avatar...');

            // Convert image to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Image = e.target.result;
                    
                    // Update user avatar in database
                    const currentUser = this.auth.getCurrentUser();
                    if (currentUser) {
                        await this.db.update('users', currentUser.id, {
                            avatar: base64Image
                        });

                        // Update current user in auth
                        currentUser.avatar = base64Image;
                        this.auth.setCurrentUser(currentUser);

                        // Update avatars in UI
                        this.loadUserProfile();
                        
                        this.ui.showToast('Avatar updated successfully', 'success');
                    }
                } catch (error) {
                    console.error('Error updating avatar:', error);
                    this.ui.showToast('Error updating avatar', 'error');
                } finally {
                    this.ui.hideLoading();
                }
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.ui.showToast('Error uploading avatar', 'error');
            this.ui.hideLoading();
        }
    }

    changeTheme(themeName) {
        if (this.theme) {
            this.theme.changeTheme(themeName);
        }
        
        // Update active theme in UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-theme="${themeName}"]`).classList.add('active');
        
        this.ui.showToast(`Theme changed to ${themeName}`, 'success');
    }

    async updateProfile(profileData) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                this.ui.showToast('User not found', 'error');
                return;
            }

            await this.db.update('users', currentUser.id, profileData);
            
            // Update current user
            Object.assign(currentUser, profileData);
            this.auth.setCurrentUser(currentUser);
            
            this.loadUserProfile();
            this.ui.showToast('Profile updated successfully', 'success');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            this.ui.showToast('Error updating profile', 'error');
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                this.ui.showToast('User not found', 'error');
                return;
            }

            // Verify current password (in real app, this would be hashed)
            if (currentPassword !== 'demo123') { // This is just for demo
                this.ui.showToast('Current password is incorrect', 'error');
                return;
            }

            // Update password in database
            await this.db.update('users', currentUser.id, {
                password: newPassword // In real app, this should be hashed
            });

            this.ui.showToast('Password updated successfully', 'success');
            
        } catch (error) {
            console.error('Error changing password:', error);
            this.ui.showToast('Error changing password', 'error');
        }
    }

    setupSettingsForms() {
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('profileName').value,
                    email: document.getElementById('profileEmail').value,
                    phone: document.getElementById('profilePhone').value
                };
                this.updateProfile(formData);
            });
        }

        // Password form
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if (newPassword !== confirmPassword) {
                    this.ui.showToast('New passwords do not match', 'error');
                    return;
                }

                this.changePassword(currentPassword, newPassword);
            });
        }

        // Remove avatar button
        const removeAvatarBtn = document.getElementById('removeAvatarBtn');
        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => {
                this.removeAvatar();
            });
        }

        // Backup buttons
        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => {
                if (app.getManagers().reports) {
                    app.getManagers().reports.showBackupOptions();
                }
            });
        }

        // Logout all button
        const logoutAllBtn = document.getElementById('logoutAllBtn');
        if (logoutAllBtn) {
            logoutAllBtn.addEventListener('click', () => {
                this.logoutAllDevices();
            });
        }
    }

    async removeAvatar() {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) return;

            await this.db.update('users', currentUser.id, {
                avatar: null
            });

            currentUser.avatar = null;
            this.auth.setCurrentUser(currentUser);
            this.loadUserProfile();
            
            this.ui.showToast('Avatar removed successfully', 'success');
            
        } catch (error) {
            console.error('Error removing avatar:', error);
            this.ui.showToast('Error removing avatar', 'error');
        }
    }

    logoutAllDevices() {
        this.ui.showToast('This feature will log you out from all devices', 'info');
        // In a real app, this would invalidate all sessions
    }
}

window.SettingsManager = SettingsManager;