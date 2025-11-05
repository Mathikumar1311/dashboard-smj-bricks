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
        this.loadSettings();
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

            // Remove avatar button
            const removeAvatarBtn = document.getElementById('removeAvatarBtn');
            if (removeAvatarBtn) {
                removeAvatarBtn.addEventListener('click', () => this.removeAvatar());
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
            
            // Settings forms
            this.setupSettingsForms();

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
        const settings = this.getCurrentSettings();
        return `
            <div class="settings-section">
                <h3>Theme Settings</h3>
                <div class="theme-selector">
                    <div class="theme-options">
                        <div class="theme-option ${settings.theme === 'orange' ? 'active' : ''}" data-theme="orange">
                            <div class="theme-preview orange-theme"></div>
                            <span>Orange</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'blue' ? 'active' : ''}" data-theme="blue">
                            <div class="theme-preview blue-theme"></div>
                            <span>Blue</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'green' ? 'active' : ''}" data-theme="green">
                            <div class="theme-preview green-theme"></div>
                            <span>Green</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'purple' ? 'active' : ''}" data-theme="purple">
                            <div class="theme-preview purple-theme"></div>
                            <span>Purple</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                            <div class="theme-preview dark-theme"></div>
                            <span>Dark</span>
                        </div>
                    </div>
                </div>

                <div class="appearance-options">
                    <h4>Interface Options</h4>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="compactMode" ${settings.compactMode ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Compact mode (dense tables)
                        </label>
                    </div>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="animations" ${settings.animations ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Enable animations
                        </label>
                    </div>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="soundEffects" ${settings.soundEffects ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Sound effects
                        </label>
                    </div>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="autoBackup" ${settings.autoBackup ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Auto backup every week
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

                <div class="security-item">
                    <h4>Two-Factor Authentication</h4>
                    <div class="security-status">
                        <div class="status-indicator ${this.is2FAEnabled() ? 'enabled' : 'disabled'}">
                            <i class="fas ${this.is2FAEnabled() ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${this.is2FAEnabled() ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <button id="toggle2FABtn" class="btn-secondary">
                            <i class="fas fa-shield-alt"></i> 
                            ${this.is2FAEnabled() ? 'Disable 2FA' : 'Enable 2FA'}
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

                <div class="backup-settings">
                    <h4>Backup Settings</h4>
                    <div class="checkbox-option">
                        <label class="checkbox-label">
                            <input type="checkbox" id="autoBackupEnabled">
                            <span class="checkmark"></span>
                            Enable automatic backups
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Backup Frequency</label>
                        <select id="backupFrequency">
                            <option value="daily">Daily</option>
                            <option value="weekly" selected>Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <button id="saveBackupSettings" class="btn-primary">
                        <i class="fas fa-save"></i> Save Backup Settings
                    </button>
                </div>
            </div>
        `;
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

        // Appearance settings
        const compactMode = document.getElementById('compactMode');
        if (compactMode) {
            compactMode.addEventListener('change', () => {
                this.saveAppearanceSettings();
            });
        }

        const animations = document.getElementById('animations');
        if (animations) {
            animations.addEventListener('change', () => {
                this.saveAppearanceSettings();
            });
        }

        const soundEffects = document.getElementById('soundEffects');
        if (soundEffects) {
            soundEffects.addEventListener('change', () => {
                this.saveAppearanceSettings();
            });
        }

        const autoBackup = document.getElementById('autoBackup');
        if (autoBackup) {
            autoBackup.addEventListener('change', () => {
                this.saveAppearanceSettings();
            });
        }

        // Backup buttons
        const createBackupBtn = document.getElementById('createBackupBtn');
        if (createBackupBtn) {
            createBackupBtn.addEventListener('click', () => {
                this.createBackup();
            });
        }

        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        if (restoreBackupBtn) {
            restoreBackupBtn.addEventListener('click', () => {
                this.showRestoreBackup();
            });
        }

        // Logout all button
        const logoutAllBtn = document.getElementById('logoutAllBtn');
        if (logoutAllBtn) {
            logoutAllBtn.addEventListener('click', () => {
                this.logoutAllDevices();
            });
        }

        // 2FA button
        const toggle2FABtn = document.getElementById('toggle2FABtn');
        if (toggle2FABtn) {
            toggle2FABtn.addEventListener('click', () => {
                this.toggle2FA();
            });
        }

        // Backup settings
        const saveBackupSettings = document.getElementById('saveBackupSettings');
        if (saveBackupSettings) {
            saveBackupSettings.addEventListener('click', () => {
                this.saveBackupSettings();
            });
        }
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

    loadSettings() {
        const settings = this.getCurrentSettings();
        
        // Update UI with current settings
        const compactMode = document.getElementById('compactMode');
        const animations = document.getElementById('animations');
        const soundEffects = document.getElementById('soundEffects');
        const autoBackup = document.getElementById('autoBackup');
        
        if (compactMode) compactMode.checked = settings.compactMode;
        if (animations) animations.checked = settings.animations;
        if (soundEffects) soundEffects.checked = settings.soundEffects;
        if (autoBackup) autoBackup.checked = settings.autoBackup;
        
        // Update theme options
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        const activeThemeOption = document.querySelector(`[data-theme="${settings.theme}"]`);
        if (activeThemeOption) {
            activeThemeOption.classList.add('active');
        }
        
        // Load backup history
        this.loadBackupHistory();
    }

    getCurrentSettings() {
        const defaultSettings = {
            theme: 'orange',
            compactMode: true,
            animations: true,
            soundEffects: false,
            autoBackup: false,
            backupFrequency: 'weekly',
            twoFactorEnabled: false
        };
        
        try {
            const savedSettings = localStorage.getItem('userSettings');
            if (savedSettings) {
                return { ...defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        
        return defaultSettings;
    }

    saveSettings(settings) {
        try {
            localStorage.setItem('userSettings', JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
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

    changeTheme(themeName) {
        if (this.theme) {
            this.theme.changeTheme(themeName);
        }
        
        // Update settings
        const settings = this.getCurrentSettings();
        settings.theme = themeName;
        this.saveSettings(settings);
        
        // Update active theme in UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-theme="${themeName}"]`).classList.add('active');
        
        this.ui.showToast(`Theme changed to ${themeName}`, 'success');
    }

    saveAppearanceSettings() {
        const settings = this.getCurrentSettings();
        
        settings.compactMode = document.getElementById('compactMode').checked;
        settings.animations = document.getElementById('animations').checked;
        settings.soundEffects = document.getElementById('soundEffects').checked;
        settings.autoBackup = document.getElementById('autoBackup').checked;
        
        if (this.saveSettings(settings)) {
            this.ui.showToast('Appearance settings saved', 'success');
            
            // Apply compact mode if changed
            if (settings.compactMode) {
                document.body.classList.add('compact-mode');
            } else {
                document.body.classList.remove('compact-mode');
            }
        } else {
            this.ui.showToast('Error saving settings', 'error');
        }
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

    logoutAllDevices() {
        this.ui.showConfirmDialog(
            'Logout from all devices?',
            'This will log you out from all devices and invalidate all active sessions.',
            () => {
                // In a real app, this would invalidate all sessions
                this.ui.showToast('Logged out from all devices', 'success');
                // Optionally force logout current session too
                setTimeout(() => {
                    this.auth.logout();
                }, 2000);
            }
        );
    }

    is2FAEnabled() {
        const settings = this.getCurrentSettings();
        return settings.twoFactorEnabled;
    }

    toggle2FA() {
        const settings = this.getCurrentSettings();
        settings.twoFactorEnabled = !settings.twoFactorEnabled;
        
        if (this.saveSettings(settings)) {
            this.ui.showToast(
                `Two-factor authentication ${settings.twoFactorEnabled ? 'enabled' : 'disabled'}`,
                'success'
            );
            
            // Reload security tab to update UI
            this.refreshSecurityTab();
        } else {
            this.ui.showToast('Error updating 2FA settings', 'error');
        }
    }

    refreshSecurityTab() {
        const securityTab = document.getElementById('securityTab');
        if (securityTab) {
            securityTab.innerHTML = this.getSecurityTabContent();
            this.setupSettingsForms();
        }
    }

    async createBackup() {
        try {
            this.ui.showLoading('Creating backup...');
            
            // Get all data from database
            const tables = ['users', 'employees', 'bills', 'customers', 'salary', 'attendance'];
            const backupData = {};
            
            for (const table of tables) {
                try {
                    const data = await this.db.getAll(table);
                    backupData[table] = data;
                } catch (error) {
                    console.warn(`Could not backup table ${table}:`, error);
                    backupData[table] = [];
                }
            }
            
            // Add metadata
            backupData.metadata = {
                version: '1.0.0',
                created: new Date().toISOString(),
                user: this.auth.getCurrentUser()?.name || 'Unknown',
                recordCount: Object.values(backupData).reduce((total, tableData) => total + tableData.length, 0)
            };
            
            // Create download
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `business-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Save backup record
            await this.saveBackupRecord(backupData.metadata);
            
            this.ui.showToast('Backup created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating backup:', error);
            this.ui.showToast('Error creating backup', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async saveBackupRecord(metadata) {
        try {
            const backups = JSON.parse(localStorage.getItem('backupHistory') || '[]');
            backups.unshift({
                id: Date.now().toString(),
                filename: `business-manager-backup-${new Date().toISOString().split('T')[0]}.json`,
                date: metadata.created,
                size: this.formatFileSize(JSON.stringify(metadata).length),
                recordCount: metadata.recordCount
            });
            
            // Keep only last 10 backups
            if (backups.length > 10) {
                backups.splice(10);
            }
            
            localStorage.setItem('backupHistory', JSON.stringify(backups));
            this.loadBackupHistory();
            
        } catch (error) {
            console.error('Error saving backup record:', error);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    loadBackupHistory() {
        const backupList = document.getElementById('backupList');
        if (!backupList) return;
        
        const backups = JSON.parse(localStorage.getItem('backupHistory') || '[]');
        
        if (backups.length === 0) {
            backupList.innerHTML = '<p class="no-data">No backups found</p>';
            return;
        }
        
        backupList.innerHTML = backups.map(backup => `
            <div class="backup-item">
                <div class="backup-item-info">
                    <div class="backup-filename">${backup.filename}</div>
                    <div class="backup-details">
                        <span><i class="fas fa-calendar"></i> ${new Date(backup.date).toLocaleDateString()}</span>
                        <span><i class="fas fa-database"></i> ${backup.recordCount} records</span>
                        <span><i class="fas fa-hdd"></i> ${backup.size}</span>
                    </div>
                </div>
                <div class="backup-item-actions">
                    <button class="btn-icon" onclick="settingsManager.restoreBackup('${backup.id}')" title="Restore this backup">
                        <i class="fas fa-upload"></i>
                    </button>
                    <button class="btn-icon" onclick="settingsManager.deleteBackup('${backup.id}')" title="Delete this backup">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    showRestoreBackup() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleRestoreBackup(file);
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    async handleRestoreBackup(file) {
        try {
            if (!file.name.endsWith('.json')) {
                this.ui.showToast('Please select a valid backup file (.json)', 'error');
                return;
            }

            this.ui.showConfirmDialog(
                'Restore Backup?',
                'This will overwrite all current data. This action cannot be undone. Are you sure you want to continue?',
                async () => {
                    this.ui.showLoading('Restoring backup...');
                    
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const backupData = JSON.parse(e.target.result);
                            
                            // Validate backup file
                            if (!backupData.metadata || !backupData.metadata.version) {
                                throw new Error('Invalid backup file format');
                            }
                            
                            // Restore data table by table
                            for (const [table, data] of Object.entries(backupData)) {
                                if (table !== 'metadata') {
                                    await this.restoreTableData(table, data);
                                }
                            }
                            
                            this.ui.showToast('Backup restored successfully', 'success');
                            
                            // Reload the application to reflect changes
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                            
                        } catch (error) {
                            console.error('Error restoring backup:', error);
                            this.ui.showToast('Error restoring backup: ' + error.message, 'error');
                        } finally {
                            this.ui.hideLoading();
                        }
                    };
                    
                    reader.readAsText(file);
                }
            );
            
        } catch (error) {
            console.error('Error handling backup restore:', error);
            this.ui.showToast('Error processing backup file', 'error');
        }
    }

    async restoreTableData(table, data) {
        try {
            // Clear existing data
            await this.db.clearTable(table);
            
            // Insert backup data
            for (const item of data) {
                await this.db.create(table, item);
            }
        } catch (error) {
            console.error(`Error restoring table ${table}:`, error);
            throw error;
        }
    }

    async restoreBackup(backupId) {
        // This would restore from a previously saved backup
        this.ui.showToast('Backup restoration feature coming soon', 'info');
    }

    async deleteBackup(backupId) {
        this.ui.showConfirmDialog(
            'Delete Backup?',
            'This will permanently delete this backup file.',
            () => {
                const backups = JSON.parse(localStorage.getItem('backupHistory') || '[]');
                const updatedBackups = backups.filter(backup => backup.id !== backupId);
                localStorage.setItem('backupHistory', JSON.stringify(updatedBackups));
                this.loadBackupHistory();
                this.ui.showToast('Backup deleted successfully', 'success');
            }
        );
    }

    saveBackupSettings() {
        const settings = this.getCurrentSettings();
        const autoBackupEnabled = document.getElementById('autoBackupEnabled');
        const backupFrequency = document.getElementById('backupFrequency');
        
        if (autoBackupEnabled && backupFrequency) {
            settings.autoBackup = autoBackupEnabled.checked;
            settings.backupFrequency = backupFrequency.value;
            
            if (this.saveSettings(settings)) {
                this.ui.showToast('Backup settings saved', 'success');
            } else {
                this.ui.showToast('Error saving backup settings', 'error');
            }
        }
    }
}

// Make it available globally
window.SettingsManager = SettingsManager;