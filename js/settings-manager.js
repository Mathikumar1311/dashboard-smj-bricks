class SettingsManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.theme = dependencies.theme;
        this.backupHistory = [];
        this.currentSettings = this.getCurrentSettings();
    }

    async initialize() {
        this.setupEventListeners();
        this.loadUserProfile();
        this.loadSettings();
        await this.loadBackupHistory();
        return Promise.resolve();
    }

    setupEventListeners() {
        console.log('⚙️ Setting up settings event listeners...');
        
        // Use MutationObserver to handle dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.initializeDynamicElements();
                }
            });
        });

        const settingsContent = document.getElementById('settingsContent');
        if (settingsContent) {
            observer.observe(settingsContent, { childList: true, subtree: true });
        }

        this.initializeDynamicElements();
    }

    initializeDynamicElements() {
        // Avatar upload
        const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
        if (uploadAvatarBtn && !uploadAvatarBtn.hasListener) {
            uploadAvatarBtn.addEventListener('click', () => this.showAvatarUpload());
            uploadAvatarBtn.hasListener = true;
        }

        // Remove avatar button
        const removeAvatarBtn = document.getElementById('removeAvatarBtn');
        if (removeAvatarBtn && !removeAvatarBtn.hasListener) {
            removeAvatarBtn.addEventListener('click', () => this.removeAvatar());
            removeAvatarBtn.hasListener = true;
        }

        // Theme selection
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (!option.hasListener) {
                option.addEventListener('click', (e) => {
                    this.changeTheme(e.currentTarget.dataset.theme);
                });
                option.hasListener = true;
            }
        });

        // Settings section navigation
        this.setupSettingsNavigation();
        
        // Settings forms
        this.setupSettingsForms();
    }

    setupSettingsNavigation() {
        const settingsContent = document.getElementById('settingsContent');
        if (!settingsContent) return;

        // Check if navigation already exists
        if (settingsContent.querySelector('.settings-nav')) return;

        const navHtml = `
            <div class="settings-nav">
                <button class="nav-tab active" data-tab="profile">
                    <i class="fas fa-user"></i> Profile
                </button>
                <button class="nav-tab" data-tab="appearance">
                    <i class="fas fa-palette"></i> Appearance
                </button>
                <button class="nav-tab" data-tab="security">
                    <i class="fas fa-shield-alt"></i> Security
                </button>
                <button class="nav-tab" data-tab="backup">
                    <i class="fas fa-database"></i> Backup & Restore
                </button>
                <button class="nav-tab" data-tab="notifications">
                    <i class="fas fa-bell"></i> Notifications
                </button>
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
                <div id="notificationsTab" class="tab-content">
                    ${this.getNotificationsTabContent()}
                </div>
            </div>
        `;

        const contentHeader = settingsContent.querySelector('.content-header');
        if (contentHeader) {
            contentHeader.insertAdjacentHTML('afterend', navHtml);
        }

        this.setupTabHandlers();
    }

    setupTabHandlers() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            if (!tab.hasListener) {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    const tabId = tab.dataset.tab + 'Tab';
                    const tabContent = document.getElementById(tabId);
                    if (tabContent) {
                        tabContent.classList.add('active');
                    }
                });
                tab.hasListener = true;
            }
        });
    }

    getProfileTabContent() {
        const currentUser = this.auth.getCurrentUser();
        return `
            <div class="settings-section">
                <h3><i class="fas fa-user-circle"></i> Profile Information</h3>
                <div class="avatar-upload-large">
                    <div class="avatar-container">
                        <img id="settingsAvatar" class="user-avatar xlarge" 
                             src="${currentUser?.avatar || this.generateAvatarUrl(currentUser?.name || 'User')}" 
                             alt="User Avatar"
                             onerror="this.src='${this.generateAvatarUrl(currentUser?.name || 'User')}'">
                        <div class="avatar-overlay">
                            <i class="fas fa-camera"></i>
                        </div>
                    </div>
                    <div class="avatar-actions">
                        <button id="uploadAvatarBtn" class="btn-primary">
                            <i class="fas fa-upload"></i> Upload New Avatar
                        </button>
                        <button id="removeAvatarBtn" class="btn-secondary">
                            <i class="fas fa-trash"></i> Remove Avatar
                        </button>
                        <div class="avatar-help">
                            <small>Supported: JPG, PNG, GIF • Max: 5MB</small>
                        </div>
                    </div>
                </div>
                
                <form id="profileForm" class="settings-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profileName">Full Name *</label>
                            <input type="text" id="profileName" value="${this.escapeHtml(currentUser?.name || '')}" required>
                            <div class="form-error" id="nameError"></div>
                        </div>
                        <div class="form-group">
                            <label for="profileEmail">Email *</label>
                            <input type="email" id="profileEmail" value="${this.escapeHtml(currentUser?.email || '')}" required>
                            <div class="form-error" id="emailError"></div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profilePhone">Phone</label>
                            <input type="tel" id="profilePhone" value="${this.escapeHtml(currentUser?.phone || '')}" 
                                   pattern="[0-9+\-\s()]{10,}" title="Enter a valid phone number">
                            <div class="form-error" id="phoneError"></div>
                        </div>
                        <div class="form-group">
                            <label for="profileRole">Role</label>
                            <input type="text" id="profileRole" value="${this.escapeHtml(currentUser?.role || '')}" readonly class="readonly-field">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Update Profile
                        </button>
                        <button type="button" class="btn-secondary" onclick="this.form.reset(); settingsManager.resetFormErrors();">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    getAppearanceTabContent() {
        const settings = this.currentSettings;
        return `
            <div class="settings-section">
                <h3><i class="fas fa-palette"></i> Theme Settings</h3>
                <div class="theme-selector">
                    <div class="theme-options">
                        <div class="theme-option ${settings.theme === 'orange' ? 'active' : ''}" data-theme="orange">
                            <div class="theme-preview orange-theme">
                                <div class="preview-header"></div>
                                <div class="preview-sidebar"></div>
                                <div class="preview-content"></div>
                            </div>
                            <span>Orange</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'blue' ? 'active' : ''}" data-theme="blue">
                            <div class="theme-preview blue-theme">
                                <div class="preview-header"></div>
                                <div class="preview-sidebar"></div>
                                <div class="preview-content"></div>
                            </div>
                            <span>Blue</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'green' ? 'active' : ''}" data-theme="green">
                            <div class="theme-preview green-theme">
                                <div class="preview-header"></div>
                                <div class="preview-sidebar"></div>
                                <div class="preview-content"></div>
                            </div>
                            <span>Green</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'purple' ? 'active' : ''}" data-theme="purple">
                            <div class="theme-preview purple-theme">
                                <div class="preview-header"></div>
                                <div class="preview-sidebar"></div>
                                <div class="preview-content"></div>
                            </div>
                            <span>Purple</span>
                        </div>
                        <div class="theme-option ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                            <div class="theme-preview dark-theme">
                                <div class="preview-header"></div>
                                <div class="preview-sidebar"></div>
                                <div class="preview-content"></div>
                            </div>
                            <span>Dark</span>
                        </div>
                    </div>
                </div>

                <div class="appearance-options">
                    <h4><i class="fas fa-sliders-h"></i> Interface Options</h4>
                    <div class="checkbox-grid">
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="compactMode" ${settings.compactMode ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Compact mode</strong>
                                    <small>Denser tables and lists</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="animations" ${settings.animations ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Enable animations</strong>
                                    <small>Smooth transitions and effects</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="soundEffects" ${settings.soundEffects ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Sound effects</strong>
                                    <small>Audible feedback for actions</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="autoBackup" ${settings.autoBackup ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Auto backup</strong>
                                    <small>Automatically backup data weekly</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="highContrast" ${settings.highContrast ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>High contrast</strong>
                                    <small>Improved accessibility</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="reduceMotion" ${settings.reduceMotion ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Reduce motion</strong>
                                    <small>Minimize animations</small>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="appearance-actions">
                    <button id="resetAppearance" class="btn-secondary">
                        <i class="fas fa-undo"></i> Reset to Defaults
                    </button>
                </div>
            </div>
        `;
    }

    getSecurityTabContent() {
        const is2FAEnabled = this.is2FAEnabled();
        const lastPasswordChange = this.getLastPasswordChange();
        
        return `
            <div class="settings-section">
                <h3><i class="fas fa-shield-alt"></i> Security Settings</h3>
                
                <div class="security-item">
                    <h4><i class="fas fa-key"></i> Change Password</h4>
                    <form id="passwordForm" class="settings-form">
                        <div class="form-group">
                            <label for="currentPassword">Current Password *</label>
                            <input type="password" id="currentPassword" required minlength="6">
                            <div class="form-error" id="currentPasswordError"></div>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">New Password *</label>
                            <input type="password" id="newPassword" required minlength="8"
                                   pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
                                   title="Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character">
                            <div class="password-strength">
                                <div class="strength-meter">
                                    <div class="strength-bar" id="passwordStrengthBar"></div>
                                </div>
                                <small id="passwordStrengthText">Password strength</small>
                            </div>
                            <div class="form-error" id="newPasswordError"></div>
                        </div>
                        <div class="form-group">
                            <label for="confirmPassword">Confirm New Password *</label>
                            <input type="password" id="confirmPassword" required>
                            <div class="form-error" id="confirmPasswordError"></div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-key"></i> Change Password
                            </button>
                            ${lastPasswordChange ? `
                                <div class="security-info">
                                    <small>Last changed: ${lastPasswordChange}</small>
                                </div>
                            ` : ''}
                        </div>
                    </form>
                </div>

                <div class="security-item">
                    <h4><i class="fas fa-user-clock"></i> Session Management</h4>
                    <div class="session-info">
                        <div class="session-details">
                            <p><i class="fas fa-desktop"></i> Current device: <strong>${this.getDeviceInfo()}</strong></p>
                            <p><i class="fas fa-clock"></i> Session started: <strong>${new Date().toLocaleString()}</strong></p>
                            <p><i class="fas fa-map-marker-alt"></i> IP Address: <strong>${this.getClientIP()}</strong></p>
                        </div>
                        <div class="session-actions">
                            <button id="logoutAllBtn" class="btn-warning">
                                <i class="fas fa-sign-out-alt"></i> Logout from all devices
                            </button>
                            <button id="viewSessionsBtn" class="btn-secondary">
                                <i class="fas fa-list"></i> View active sessions
                            </button>
                        </div>
                    </div>
                </div>

                <div class="security-item">
                    <h4><i class="fas fa-mobile-alt"></i> Two-Factor Authentication</h4>
                    <div class="security-status">
                        <div class="status-indicator ${is2FAEnabled ? 'enabled' : 'disabled'}">
                            <i class="fas ${is2FAEnabled ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${is2FAEnabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div class="2fa-actions">
                            <button id="toggle2FABtn" class="btn-secondary">
                                <i class="fas fa-shield-alt"></i> 
                                ${is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                            </button>
                            ${is2FAEnabled ? `
                                <button id="backupCodesBtn" class="btn-secondary">
                                    <i class="fas fa-download"></i> Backup Codes
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    ${!is2FAEnabled ? `
                        <div class="security-info">
                            <p><i class="fas fa-info-circle"></i> Two-factor authentication adds an extra layer of security to your account.</p>
                        </div>
                    ` : ''}
                </div>

                <div class="security-item">
                    <h4><i class="fas fa-history"></i> Login History</h4>
                    <div class="login-history">
                        <div id="loginHistoryList" class="history-list">
                            ${this.getLoginHistoryItems()}
                        </div>
                        <button id="clearHistoryBtn" class="btn-secondary">
                            <i class="fas fa-trash"></i> Clear History
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getBackupTabContent() {
        return `
            <div class="settings-section">
                <h3><i class="fas fa-database"></i> Backup & Restore</h3>
                
                <div class="backup-actions">
                    <div class="backup-card">
                        <div class="backup-icon create">
                            <i class="fas fa-download"></i>
                        </div>
                        <div class="backup-info">
                            <h4>Create Backup</h4>
                            <p>Export all your data as a secure backup file</p>
                            <button id="createBackupBtn" class="btn-primary">
                                <i class="fas fa-database"></i> Create Backup Now
                            </button>
                        </div>
                    </div>

                    <div class="backup-card">
                        <div class="backup-icon restore">
                            <i class="fas fa-upload"></i>
                        </div>
                        <div class="backup-info">
                            <h4>Restore Backup</h4>
                            <p>Import data from a previous backup file</p>
                            <button id="restoreBackupBtn" class="btn-secondary">
                                <i class="fas fa-file-import"></i> Restore Backup
                            </button>
                        </div>
                    </div>
                </div>

                <div class="backup-history">
                    <div class="section-header">
                        <h4><i class="fas fa-history"></i> Recent Backups</h4>
                        <button id="refreshBackupsBtn" class="btn-icon" title="Refresh backups">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                    <div id="backupList" class="backup-list">
                        <div class="loading-backups">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading backups...</span>
                        </div>
                    </div>
                </div>

                <div class="backup-settings">
                    <h4><i class="fas fa-cog"></i> Backup Settings</h4>
                    <form id="backupSettingsForm" class="settings-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="autoBackupEnabled">Automatic Backups</label>
                                <div class="checkbox-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="autoBackupEnabled" ${this.currentSettings.autoBackup ? 'checked' : ''}>
                                        <span class="checkmark"></span>
                                        Enable automatic backups
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="backupFrequency">Backup Frequency</label>
                                <select id="backupFrequency">
                                    <option value="daily" ${this.currentSettings.backupFrequency === 'daily' ? 'selected' : ''}>Daily</option>
                                    <option value="weekly" ${this.currentSettings.backupFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                    <option value="monthly" ${this.currentSettings.backupFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="backupRetention">Retention Period</label>
                                <select id="backupRetention">
                                    <option value="7" ${this.currentSettings.backupRetention === 7 ? 'selected' : ''}>1 Week</option>
                                    <option value="30" ${this.currentSettings.backupRetention === 30 ? 'selected' : ''}>1 Month</option>
                                    <option value="90" ${this.currentSettings.backupRetention === 90 ? 'selected' : ''}>3 Months</option>
                                    <option value="365" ${this.currentSettings.backupRetention === 365 ? 'selected' : ''}>1 Year</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="backupEncryption">Encryption</label>
                                <div class="checkbox-option">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="backupEncryption" ${this.currentSettings.backupEncryption ? 'checked' : ''}>
                                        <span class="checkmark"></span>
                                        Encrypt backup files
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Save Backup Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    getNotificationsTabContent() {
        const settings = this.currentSettings;
        return `
            <div class="settings-section">
                <h3><i class="fas fa-bell"></i> Notification Preferences</h3>
                
                <div class="notifications-category">
                    <h4><i class="fas fa-envelope"></i> Email Notifications</h4>
                    <div class="checkbox-grid">
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="emailSecurity" ${settings.notifications?.emailSecurity ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Security alerts</strong>
                                    <small>Password changes, new logins</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="emailBackup" ${settings.notifications?.emailBackup ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Backup reports</strong>
                                    <small>Weekly backup status</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="emailUpdates" ${settings.notifications?.emailUpdates ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>System updates</strong>
                                    <small>New features and maintenance</small>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="notifications-category">
                    <h4><i class="fas fa-desktop"></i> In-App Notifications</h4>
                    <div class="checkbox-grid">
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="inAppTasks" ${settings.notifications?.inAppTasks ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Task reminders</strong>
                                    <small>Due tasks and deadlines</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="inAppSystem" ${settings.notifications?.inAppSystem ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>System messages</strong>
                                    <small>Important system notifications</small>
                                </div>
                            </label>
                        </div>
                        <div class="checkbox-option">
                            <label class="checkbox-label">
                                <input type="checkbox" id="inAppUpdates" ${settings.notifications?.inAppUpdates ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <div class="checkbox-info">
                                    <strong>Update available</strong>
                                    <small>New version notifications</small>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="notifications-category">
                    <h4><i class="fas fa-sliders-h"></i> Notification Settings</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="notificationSound">Notification Sound</label>
                            <select id="notificationSound">
                                <option value="none" ${settings.notificationSound === 'none' ? 'selected' : ''}>None</option>
                                <option value="chime" ${settings.notificationSound === 'chime' ? 'selected' : ''}>Chime</option>
                                <option value="bell" ${settings.notificationSound === 'bell' ? 'selected' : ''}>Bell</option>
                                <option value="digital" ${settings.notificationSound === 'digital' ? 'selected' : ''}>Digital</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="notificationFrequency">Frequency</label>
                            <select id="notificationFrequency">
                                <option value="instant" ${settings.notificationFrequency === 'instant' ? 'selected' : ''}>Instant</option>
                                <option value="hourly" ${settings.notificationFrequency === 'hourly' ? 'selected' : ''}>Hourly Digest</option>
                                <option value="daily" ${settings.notificationFrequency === 'daily' ? 'selected' : ''}>Daily Digest</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button id="saveNotifications" class="btn-primary">
                        <i class="fas fa-save"></i> Save Notification Settings
                    </button>
                    <button id="testNotification" class="btn-secondary">
                        <i class="fas fa-bell"></i> Test Notification
                    </button>
                </div>
            </div>
        `;
    }

    setupSettingsForms() {
        this.setupProfileForm();
        this.setupPasswordForm();
        this.setupAppearanceForm();
        this.setupBackupForm();
        this.setupSecurityForm();
        this.setupNotificationsForm();
    }

    setupProfileForm() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm && !profileForm.hasListener) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
            profileForm.hasListener = true;
        }

        // Real-time validation
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profilePhone = document.getElementById('profilePhone');

        if (profileName) profileName.addEventListener('blur', () => this.validateName());
        if (profileEmail) profileEmail.addEventListener('blur', () => this.validateEmail());
        if (profilePhone) profilePhone.addEventListener('blur', () => this.validatePhone());
    }

    setupPasswordForm() {
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm && !passwordForm.hasListener) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
            passwordForm.hasListener = true;
        }

        // Password strength indicator
        const newPassword = document.getElementById('newPassword');
        if (newPassword) {
            newPassword.addEventListener('input', () => this.updatePasswordStrength());
        }

        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }
    }

    setupAppearanceForm() {
        const compactMode = document.getElementById('compactMode');
        const animations = document.getElementById('animations');
        const soundEffects = document.getElementById('soundEffects');
        const autoBackup = document.getElementById('autoBackup');
        const highContrast = document.getElementById('highContrast');
        const reduceMotion = document.getElementById('reduceMotion');
        const resetAppearance = document.getElementById('resetAppearance');

        [compactMode, animations, soundEffects, autoBackup, highContrast, reduceMotion].forEach(checkbox => {
            if (checkbox && !checkbox.hasListener) {
                checkbox.addEventListener('change', () => this.saveAppearanceSettings());
                checkbox.hasListener = true;
            }
        });

        if (resetAppearance && !resetAppearance.hasListener) {
            resetAppearance.addEventListener('click', () => this.resetAppearanceSettings());
            resetAppearance.hasListener = true;
        }
    }

    setupBackupForm() {
        const createBackupBtn = document.getElementById('createBackupBtn');
        const restoreBackupBtn = document.getElementById('restoreBackupBtn');
        const refreshBackupsBtn = document.getElementById('refreshBackupsBtn');
        const backupSettingsForm = document.getElementById('backupSettingsForm');

        if (createBackupBtn && !createBackupBtn.hasListener) {
            createBackupBtn.addEventListener('click', () => this.createBackup());
            createBackupBtn.hasListener = true;
        }

        if (restoreBackupBtn && !restoreBackupBtn.hasListener) {
            restoreBackupBtn.addEventListener('click', () => this.showRestoreBackup());
            restoreBackupBtn.hasListener = true;
        }

        if (refreshBackupsBtn && !refreshBackupsBtn.hasListener) {
            refreshBackupsBtn.addEventListener('click', () => this.loadBackupHistory());
            refreshBackupsBtn.hasListener = true;
        }

        if (backupSettingsForm && !backupSettingsForm.hasListener) {
            backupSettingsForm.addEventListener('submit', (e) => this.handleBackupSettingsSave(e));
            backupSettingsForm.hasListener = true;
        }
    }

    setupSecurityForm() {
        const logoutAllBtn = document.getElementById('logoutAllBtn');
        const viewSessionsBtn = document.getElementById('viewSessionsBtn');
        const toggle2FABtn = document.getElementById('toggle2FABtn');
        const backupCodesBtn = document.getElementById('backupCodesBtn');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');

        if (logoutAllBtn && !logoutAllBtn.hasListener) {
            logoutAllBtn.addEventListener('click', () => this.logoutAllDevices());
            logoutAllBtn.hasListener = true;
        }

        if (viewSessionsBtn && !viewSessionsBtn.hasListener) {
            viewSessionsBtn.addEventListener('click', () => this.viewActiveSessions());
            viewSessionsBtn.hasListener = true;
        }

        if (toggle2FABtn && !toggle2FABtn.hasListener) {
            toggle2FABtn.addEventListener('click', () => this.toggle2FA());
            toggle2FABtn.hasListener = true;
        }

        if (backupCodesBtn && !backupCodesBtn.hasListener) {
            backupCodesBtn.addEventListener('click', () => this.showBackupCodes());
            backupCodesBtn.hasListener = true;
        }

        if (clearHistoryBtn && !clearHistoryBtn.hasListener) {
            clearHistoryBtn.addEventListener('click', () => this.clearLoginHistory());
            clearHistoryBtn.hasListener = true;
        }
    }

    setupNotificationsForm() {
        const saveNotifications = document.getElementById('saveNotifications');
        const testNotification = document.getElementById('testNotification');

        if (saveNotifications && !saveNotifications.hasListener) {
            saveNotifications.addEventListener('click', () => this.saveNotificationSettings());
            saveNotifications.hasListener = true;
        }

        if (testNotification && !testNotification.hasListener) {
            testNotification.addEventListener('click', () => this.testNotification());
            testNotification.hasListener = true;
        }
    }

    // Validation Methods
    validateName() {
        const nameInput = document.getElementById('profileName');
        const errorElement = document.getElementById('nameError');
        const value = nameInput.value.trim();

        if (!value) {
            this.showFieldError(errorElement, 'Name is required');
            return false;
        }

        if (value.length < 2) {
            this.showFieldError(errorElement, 'Name must be at least 2 characters');
            return false;
        }

        this.clearFieldError(errorElement);
        return true;
    }

    validateEmail() {
        const emailInput = document.getElementById('profileEmail');
        const errorElement = document.getElementById('emailError');
        const value = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!value) {
            this.showFieldError(errorElement, 'Email is required');
            return false;
        }

        if (!emailRegex.test(value)) {
            this.showFieldError(errorElement, 'Please enter a valid email address');
            return false;
        }

        this.clearFieldError(errorElement);
        return true;
    }

    validatePhone() {
        const phoneInput = document.getElementById('profilePhone');
        const errorElement = document.getElementById('phoneError');
        const value = phoneInput.value.trim();

        if (value && !/^[\d+\-\s()]{10,}$/.test(value.replace(/[\s\-()]/g, ''))) {
            this.showFieldError(errorElement, 'Please enter a valid phone number');
            return false;
        }

        this.clearFieldError(errorElement);
        return true;
    }

    updatePasswordStrength() {
        const password = document.getElementById('newPassword')?.value || '';
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');

        if (!strengthBar || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);

        strengthBar.className = 'strength-bar';
        strengthBar.classList.add(strength.class);
        strengthBar.style.width = strength.percentage + '%';
        strengthText.textContent = strength.text;
        strengthText.className = strength.class;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.match(/[a-z]/)) score++;
        if (password.match(/[A-Z]/)) score++;
        if (password.match(/\d/)) score++;
        if (password.match(/[^a-zA-Z\d]/)) score++;

        const strengthMap = {
            0: { class: 'very-weak', text: 'Very Weak', percentage: 20 },
            1: { class: 'weak', text: 'Weak', percentage: 40 },
            2: { class: 'fair', text: 'Fair', percentage: 60 },
            3: { class: 'good', text: 'Good', percentage: 80 },
            4: { class: 'strong', text: 'Strong', percentage: 95 },
            5: { class: 'very-strong', text: 'Very Strong', percentage: 100 }
        };

        return strengthMap[Math.min(score, 5)] || strengthMap[0];
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const errorElement = document.getElementById('confirmPasswordError');

        if (confirmPassword && newPassword !== confirmPassword) {
            this.showFieldError(errorElement, 'Passwords do not match');
            return false;
        }

        this.clearFieldError(errorElement);
        return true;
    }

    showFieldError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    clearFieldError(element) {
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    }

    resetFormErrors() {
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
    }

    // Core Functionality
    async handleProfileUpdate(e) {
        e.preventDefault();

        if (!this.validateName() || !this.validateEmail() || !this.validatePhone()) {
            this.ui.showToast('Please fix the errors in the form', 'error');
            return;
        }

        const formData = {
            name: document.getElementById('profileName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            phone: document.getElementById('profilePhone').value.trim() || null
        };

        await this.updateProfile(formData);
    }

    async updateProfile(profileData) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                this.ui.showToast('User not found', 'error');
                return;
            }

            this.ui.showLoading('Updating profile...');

            // Use the correct user ID format for your database
            const userId = currentUser.id || currentUser.user_id;
            
            if (!userId) {
                throw new Error('User ID not found');
            }

            await this.db.update('users', userId, profileData);
            
            // Update current user in auth
            Object.assign(currentUser, profileData);
            this.auth.setCurrentUser(currentUser);
            
            this.loadUserProfile();
            this.ui.showToast('Profile updated successfully', 'success');
            
        } catch (error) {
            console.error('Error updating profile:', error);
            this.ui.showToast('Error updating profile: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async handlePasswordChange(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!this.validatePasswordMatch()) {
            return;
        }

        await this.changePassword(currentPassword, newPassword);
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const currentUser = this.auth.getCurrentUser();
            if (!currentUser) {
                this.ui.showToast('User not found', 'error');
                return;
            }

            this.ui.showLoading('Changing password...');

            // Verify current password (in real app, this would be hashed and checked against database)
            const isCurrentPasswordValid = await this.verifyCurrentPassword(currentPassword);
            if (!isCurrentPasswordValid) {
                this.ui.showToast('Current password is incorrect', 'error');
                return;
            }

            // Update password in database
            const userId = currentUser.id || currentUser.user_id;
            await this.db.update('users', userId, {
                password: this.hashPassword(newPassword), // Hash the password
                last_password_change: new Date().toISOString()
            });

            // Save password change history
            this.savePasswordChangeHistory();

            // Clear form
            document.getElementById('passwordForm').reset();
            this.updatePasswordStrength();

            this.ui.showToast('Password updated successfully', 'success');
            
        } catch (error) {
            console.error('Error changing password:', error);
            this.ui.showToast('Error changing password: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async verifyCurrentPassword(password) {
        // In a real application, this would verify against the hashed password in the database
        // For demo purposes, we'll use a simple check
        try {
            const currentUser = this.auth.getCurrentUser();
            // This is a simplified check - in production, you'd hash the input and compare
            return password.length >= 6; // Basic validation for demo
        } catch (error) {
            return false;
        }
    }

    hashPassword(password) {
        // In a real application, use a proper hashing algorithm like bcrypt
        // This is a simplified version for demo purposes
        return btoa(unescape(encodeURIComponent(password))); // Base64 encoding (not secure for production)
    }

    saveAppearanceSettings() {
        const settings = this.getCurrentSettings();
        
        settings.compactMode = document.getElementById('compactMode')?.checked || false;
        settings.animations = document.getElementById('animations')?.checked || true;
        settings.soundEffects = document.getElementById('soundEffects')?.checked || false;
        settings.autoBackup = document.getElementById('autoBackup')?.checked || false;
        settings.highContrast = document.getElementById('highContrast')?.checked || false;
        settings.reduceMotion = document.getElementById('reduceMotion')?.checked || false;
        
        if (this.saveSettings(settings)) {
            this.applyAppearanceSettings(settings);
            this.ui.showToast('Appearance settings saved', 'success');
        } else {
            this.ui.showToast('Error saving settings', 'error');
        }
    }

    resetAppearanceSettings() {
        this.ui.showConfirmDialog(
            'Reset Appearance Settings?',
            'This will reset all appearance settings to their default values.',
            () => {
                const defaultSettings = {
                    theme: 'orange',
                    compactMode: true,
                    animations: true,
                    soundEffects: false,
                    autoBackup: false,
                    highContrast: false,
                    reduceMotion: false
                };

                if (this.saveSettings(defaultSettings)) {
                    this.currentSettings = defaultSettings;
                    this.loadSettings();
                    this.applyAppearanceSettings(defaultSettings);
                    this.ui.showToast('Appearance settings reset to defaults', 'success');
                }
            }
        );
    }

    applyAppearanceSettings(settings) {
        // Apply compact mode
        if (settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }

        // Apply high contrast
        if (settings.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }

        // Apply reduced motion
        if (settings.reduceMotion) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    }

    async handleBackupSettingsSave(e) {
        e.preventDefault();
        
        const settings = this.getCurrentSettings();
        settings.autoBackup = document.getElementById('autoBackupEnabled')?.checked || false;
        settings.backupFrequency = document.getElementById('backupFrequency')?.value || 'weekly';
        settings.backupRetention = parseInt(document.getElementById('backupRetention')?.value) || 30;
        settings.backupEncryption = document.getElementById('backupEncryption')?.checked || false;

        if (this.saveSettings(settings)) {
            this.currentSettings = settings;
            this.ui.showToast('Backup settings saved successfully', 'success');
        } else {
            this.ui.showToast('Error saving backup settings', 'error');
        }
    }

    saveNotificationSettings() {
        const settings = this.getCurrentSettings();
        
        if (!settings.notifications) {
            settings.notifications = {};
        }

        settings.notifications.emailSecurity = document.getElementById('emailSecurity')?.checked || false;
        settings.notifications.emailBackup = document.getElementById('emailBackup')?.checked || false;
        settings.notifications.emailUpdates = document.getElementById('emailUpdates')?.checked || false;
        settings.notifications.inAppTasks = document.getElementById('inAppTasks')?.checked || false;
        settings.notifications.inAppSystem = document.getElementById('inAppSystem')?.checked || false;
        settings.notifications.inAppUpdates = document.getElementById('inAppUpdates')?.checked || false;
        
        settings.notificationSound = document.getElementById('notificationSound')?.value || 'chime';
        settings.notificationFrequency = document.getElementById('notificationFrequency')?.value || 'instant';

        if (this.saveSettings(settings)) {
            this.currentSettings = settings;
            this.ui.showToast('Notification settings saved', 'success');
        } else {
            this.ui.showToast('Error saving notification settings', 'error');
        }
    }

    testNotification() {
        this.ui.showToast('This is a test notification', 'info');
        
        // Play test sound if enabled
        if (this.currentSettings.soundEffects) {
            this.playNotificationSound();
        }
    }

    playNotificationSound() {
        // Simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio context not supported');
        }
    }

    // Avatar Management
    showAvatarUpload() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
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
            // Validate file
            if (!file.type.startsWith('image/')) {
                this.ui.showToast('Please select a valid image file (JPEG, PNG, GIF, WebP)', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                this.ui.showToast('Image size should be less than 5MB', 'error');
                return;
            }

            this.ui.showLoading('Uploading and processing avatar...');

            // Compress and resize image
            const processedImage = await this.processImage(file);
            
            // Convert to base64
            const base64Image = await this.fileToBase64(processedImage);
            
            // Update user avatar in database
            const currentUser = this.auth.getCurrentUser();
            if (currentUser) {
                const userId = currentUser.id || currentUser.user_id;
                await this.db.update('users', userId, {
                    avatar: base64Image,
                    avatar_updated: new Date().toISOString()
                });

                // Update current user in auth
                currentUser.avatar = base64Image;
                this.auth.setCurrentUser(currentUser);

                // Update avatars in UI
                this.loadUserProfile();
                
                this.ui.showToast('Avatar updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            this.ui.showToast('Error uploading avatar: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async processImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // Calculate new dimensions (max 200x200)
                let { width, height } = img;
                const maxSize = 200;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async removeAvatar() {
        this.ui.showConfirmDialog(
            'Remove Avatar?',
            'This will remove your current avatar and use the default generated one.',
            async () => {
                try {
                    const currentUser = this.auth.getCurrentUser();
                    if (!currentUser) return;

                    const userId = currentUser.id || currentUser.user_id;
                    await this.db.update('users', userId, {
                        avatar: null,
                        avatar_updated: null
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
        );
    }

    // Theme Management
    changeTheme(themeName) {
        if (this.theme) {
            this.theme.changeTheme(themeName);
        }
        
        // Update settings
        const settings = this.getCurrentSettings();
        settings.theme = themeName;
        this.saveSettings(settings);
        this.currentSettings = settings;
        
        // Update active theme in UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        const activeOption = document.querySelector(`[data-theme="${themeName}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
        
        this.ui.showToast(`Theme changed to ${themeName}`, 'success');
    }

    // Security Features
    logoutAllDevices() {
        this.ui.showConfirmDialog(
            'Logout from all devices?',
            'This will log you out from all devices and invalidate all active sessions. You will need to login again on this device.',
            () => {
                // In a real app, this would call an API to invalidate all sessions
                this.ui.showToast('Logged out from all devices', 'success');
                
                // Add to security log
                this.logSecurityEvent('logout_all_devices', 'User logged out from all devices');
                
                // Logout current session after delay
                setTimeout(() => {
                    this.auth.logout();
                }, 2000);
            }
        );
    }

    viewActiveSessions() {
        this.ui.showToast('Active sessions feature coming soon', 'info');
    }

    is2FAEnabled() {
        const settings = this.getCurrentSettings();
        return settings.twoFactorEnabled || false;
    }

    toggle2FA() {
        if (this.is2FAEnabled()) {
            this.disable2FA();
        } else {
            this.enable2FA();
        }
    }

    enable2FA() {
        this.ui.showConfirmDialog(
            'Enable Two-Factor Authentication?',
            'This will add an extra layer of security to your account. You will need to use an authenticator app on your phone.',
            () => {
                // In a real app, this would generate a secret and show QR code
                const settings = this.getCurrentSettings();
                settings.twoFactorEnabled = true;
                
                if (this.saveSettings(settings)) {
                    this.currentSettings = settings;
                    this.ui.showToast('Two-factor authentication enabled', 'success');
                    this.logSecurityEvent('2fa_enabled', 'User enabled two-factor authentication');
                    this.refreshSecurityTab();
                }
            }
        );
    }

    disable2FA() {
        this.ui.showConfirmDialog(
            'Disable Two-Factor Authentication?',
            'This will remove the extra security layer from your account. Are you sure?',
            () => {
                const settings = this.getCurrentSettings();
                settings.twoFactorEnabled = false;
                
                if (this.saveSettings(settings)) {
                    this.currentSettings = settings;
                    this.ui.showToast('Two-factor authentication disabled', 'warning');
                    this.logSecurityEvent('2fa_disabled', 'User disabled two-factor authentication');
                    this.refreshSecurityTab();
                }
            }
        );
    }

    showBackupCodes() {
        this.ui.showToast('Backup codes feature coming soon', 'info');
    }

    clearLoginHistory() {
        this.ui.showConfirmDialog(
            'Clear Login History?',
            'This will permanently delete your login history. This action cannot be undone.',
            () => {
                localStorage.removeItem('loginHistory');
                this.ui.showToast('Login history cleared', 'success');
                this.refreshSecurityTab();
            }
        );
    }

    // Backup & Restore
    async createBackup() {
        try {
            this.ui.showLoading('Creating backup...');
            
            // Get all data from database
            const tables = ['users', 'employees', 'bills', 'customers', 'salary', 'attendance'];
            const backupData = {};
            let totalRecords = 0;
            
            for (const table of tables) {
                try {
                    const data = await this.db.getAll(table);
                    backupData[table] = data;
                    totalRecords += data.length;
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
                recordCount: totalRecords,
                tables: tables,
                checksum: this.generateChecksum(JSON.stringify(backupData))
            };
            
            // Encrypt if enabled
            let finalData = backupData;
            if (this.currentSettings.backupEncryption) {
                finalData = this.encryptBackup(backupData);
            }
            
            // Create download
            const blob = new Blob([JSON.stringify(finalData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `business-manager-backup-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Save backup record
            await this.saveBackupRecord(backupData.metadata, blob.size);
            
            this.ui.showToast(`Backup created successfully (${totalRecords} records)`, 'success');
            
        } catch (error) {
            console.error('Error creating backup:', error);
            this.ui.showToast('Error creating backup: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    encryptBackup(data) {
        // Simple encryption for demo - in production use proper encryption
        const encrypted = {
            encrypted: true,
            timestamp: new Date().toISOString(),
            data: btoa(unescape(encodeURIComponent(JSON.stringify(data))))
        };
        return encrypted;
    }

    decryptBackup(encryptedData) {
        try {
            if (!encryptedData.encrypted) {
                return encryptedData;
            }
            
            const decrypted = JSON.parse(decodeURIComponent(escape(atob(encryptedData.data))));
            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt backup file');
        }
    }

    generateChecksum(str) {
        // Simple checksum for demo - in production use proper hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    async saveBackupRecord(metadata, fileSize) {
        try {
            const backupRecord = {
                id: this.generateId(),
                filename: `business-manager-backup-${new Date().toISOString().split('T')[0]}.json`,
                date: metadata.created,
                size: this.formatFileSize(fileSize),
                recordCount: metadata.recordCount,
                checksum: metadata.checksum,
                encrypted: this.currentSettings.backupEncryption
            };
            
            this.backupHistory.unshift(backupRecord);
            
            // Keep only last 10 backups
            if (this.backupHistory.length > 10) {
                this.backupHistory.splice(10);
            }
            
            localStorage.setItem('backupHistory', JSON.stringify(this.backupHistory));
            this.loadBackupHistory();
            
        } catch (error) {
            console.error('Error saving backup record:', error);
        }
    }

    async loadBackupHistory() {
        const backupList = document.getElementById('backupList');
        if (!backupList) return;
        
        try {
            this.backupHistory = JSON.parse(localStorage.getItem('backupHistory') || '[]');
            
            if (this.backupHistory.length === 0) {
                backupList.innerHTML = '<p class="no-data">No backups found. Create your first backup to get started.</p>';
                return;
            }
            
            backupList.innerHTML = this.backupHistory.map(backup => `
                <div class="backup-item">
                    <div class="backup-item-info">
                        <div class="backup-filename">
                            <i class="fas fa-file-archive"></i>
                            ${backup.filename}
                            ${backup.encrypted ? '<span class="encryption-badge"><i class="fas fa-lock"></i> Encrypted</span>' : ''}
                        </div>
                        <div class="backup-details">
                            <span><i class="fas fa-calendar"></i> ${new Date(backup.date).toLocaleDateString()}</span>
                            <span><i class="fas fa-database"></i> ${backup.recordCount} records</span>
                            <span><i class="fas fa-hdd"></i> ${backup.size}</span>
                        </div>
                    </div>
                    <div class="backup-item-actions">
                        <button class="btn-icon" onclick="settingsManager.downloadBackup('${backup.id}')" title="Download this backup">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon" onclick="settingsManager.restoreBackup('${backup.id}')" title="Restore this backup">
                            <i class="fas fa-upload"></i>
                        </button>
                        <button class="btn-icon danger" onclick="settingsManager.deleteBackup('${backup.id}')" title="Delete this backup">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading backup history:', error);
            backupList.innerHTML = '<p class="no-data">Error loading backups</p>';
        }
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
                '⚠️ WARNING: This will overwrite all current data. This action cannot be undone. Make sure you have a current backup before proceeding.',
                async () => {
                    await this.performRestoreBackup(file);
                },
                'Restore',
                'btn-warning'
            );
            
        } catch (error) {
            console.error('Error handling backup restore:', error);
            this.ui.showToast('Error processing backup file', 'error');
        }
    }

    async performRestoreBackup(file) {
        this.ui.showLoading('Restoring backup...');
        
        try {
            const fileContent = await this.readFileAsText(file);
            let backupData;
            
            try {
                backupData = JSON.parse(fileContent);
            } catch (parseError) {
                throw new Error('Invalid backup file format');
            }
            
            // Decrypt if necessary
            if (backupData.encrypted) {
                backupData = this.decryptBackup(backupData);
            }
            
            // Validate backup file
            if (!backupData.metadata || !backupData.metadata.version) {
                throw new Error('Invalid backup file: missing metadata');
            }
            
            if (!backupData.metadata.checksum) {
                throw new Error('Backup file integrity check failed');
            }
            
            // Verify checksum
            const currentChecksum = this.generateChecksum(JSON.stringify(backupData));
            if (currentChecksum !== backupData.metadata.checksum) {
                throw new Error('Backup file appears to be corrupted');
            }
            
            // Create a backup before restoring (safety measure)
            await this.createPreRestoreBackup();
            
            // Restore data table by table
            let restoredCount = 0;
            for (const [table, data] of Object.entries(backupData)) {
                if (table !== 'metadata') {
                    const count = await this.restoreTableData(table, data);
                    restoredCount += count;
                }
            }
            
            this.ui.showToast(`Backup restored successfully (${restoredCount} records)`, 'success');
            this.logSecurityEvent('backup_restored', `User restored backup with ${restoredCount} records`);
            
            // Reload the application to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.ui.showToast('Error restoring backup: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async createPreRestoreBackup() {
        // Create a quick backup before restoring for safety
        try {
            const tables = ['users', 'employees', 'bills', 'customers', 'salary', 'attendance'];
            const backupData = {};
            
            for (const table of tables) {
                try {
                    const data = await this.db.getAll(table);
                    backupData[table] = data;
                } catch (error) {
                    console.warn(`Could not backup table ${table} for pre-restore:`, error);
                }
            }
            
            // Store temporarily in localStorage
            localStorage.setItem('preRestoreBackup', JSON.stringify({
                data: backupData,
                timestamp: new Date().toISOString()
            }));
            
        } catch (error) {
            console.warn('Could not create pre-restore backup:', error);
        }
    }

    async restoreTableData(table, data) {
        try {
            // Clear existing data
            await this.db.clearTable(table);
            
            // Insert backup data
            let successCount = 0;
            for (const item of data) {
                try {
                    await this.db.create(table, item);
                    successCount++;
                } catch (error) {
                    console.warn(`Error restoring item in ${table}:`, error);
                }
            }
            
            return successCount;
        } catch (error) {
            console.error(`Error restoring table ${table}:`, error);
            throw error;
        }
    }

    async restoreBackup(backupId) {
        const backup = this.backupHistory.find(b => b.id === backupId);
        if (!backup) {
            this.ui.showToast('Backup not found', 'error');
            return;
        }

        this.ui.showToast('Local backup restoration from history is not yet implemented', 'info');
    }

    async downloadBackup(backupId) {
        this.ui.showToast('Download from backup history is not yet implemented', 'info');
    }

    async deleteBackup(backupId) {
        const backup = this.backupHistory.find(b => b.id === backupId);
        if (!backup) {
            this.ui.showToast('Backup not found', 'error');
            return;
        }

        this.ui.showConfirmDialog(
            'Delete Backup?',
            `This will permanently delete the backup file "${backup.filename}". This action cannot be undone.`,
            () => {
                this.backupHistory = this.backupHistory.filter(b => b.id !== backupId);
                localStorage.setItem('backupHistory', JSON.stringify(this.backupHistory));
                this.loadBackupHistory();
                this.ui.showToast('Backup deleted successfully', 'success');
            },
            'Delete',
            'btn-danger'
        );
    }

    // Utility Methods
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateAvatarUrl(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff6b35&color=fff&size=200`;
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    getCurrentSettings() {
        const defaultSettings = {
            theme: 'orange',
            compactMode: true,
            animations: true,
            soundEffects: false,
            autoBackup: false,
            backupFrequency: 'weekly',
            backupRetention: 30,
            backupEncryption: false,
            twoFactorEnabled: false,
            highContrast: false,
            reduceMotion: false,
            notifications: {
                emailSecurity: true,
                emailBackup: true,
                emailUpdates: false,
                inAppTasks: true,
                inAppSystem: true,
                inAppUpdates: true
            },
            notificationSound: 'chime',
            notificationFrequency: 'instant'
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
            this.currentSettings = settings;
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    loadUserProfile() {
        const currentUser = this.auth.getCurrentUser();
        if (!currentUser) return;

        // Update avatar in settings
        const avatar = document.getElementById('settingsAvatar');
        if (avatar) {
            avatar.src = currentUser.avatar || this.generateAvatarUrl(currentUser.name);
        }

        // Update user info in topbar
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = currentUser.name;
        }

        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            userAvatar.src = currentUser.avatar || this.generateAvatarUrl(currentUser.name);
        }
    }

    loadSettings() {
        this.currentSettings = this.getCurrentSettings();
        
        // Update UI with current settings
        const checkboxes = ['compactMode', 'animations', 'soundEffects', 'autoBackup', 'highContrast', 'reduceMotion'];
        checkboxes.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = this.currentSettings[id];
            }
        });

        // Update theme options
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        const activeThemeOption = document.querySelector(`[data-theme="${this.currentSettings.theme}"]`);
        if (activeThemeOption) {
            activeThemeOption.classList.add('active');
        }
    }

    refreshSecurityTab() {
        const securityTab = document.getElementById('securityTab');
        if (securityTab) {
            securityTab.innerHTML = this.getSecurityTabContent();
            this.setupSecurityForm();
        }
    }

    // Security logging
    logSecurityEvent(type, description) {
        try {
            const events = JSON.parse(localStorage.getItem('securityEvents') || '[]');
            events.unshift({
                type,
                description,
                timestamp: new Date().toISOString(),
                ip: this.getClientIP(),
                userAgent: navigator.userAgent
            });
            
            // Keep only last 100 events
            if (events.length > 100) {
                events.splice(100);
            }
            
            localStorage.setItem('securityEvents', JSON.stringify(events));
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    }

    getClientIP() {
        // This is a simplified version - in production, you'd get this from your backend
        return '127.0.0.1';
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Mobile')) {
            return 'Mobile Device';
        } else if (ua.includes('Tablet')) {
            return 'Tablet';
        } else {
            return 'Desktop';
        }
    }

    getLastPasswordChange() {
        try {
            const history = JSON.parse(localStorage.getItem('passwordChangeHistory') || '[]');
            if (history.length > 0) {
                return new Date(history[0].timestamp).toLocaleDateString();
            }
        } catch (error) {
            console.error('Error getting last password change:', error);
        }
        return null;
    }

    savePasswordChangeHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('passwordChangeHistory') || '[]');
            history.unshift({
                timestamp: new Date().toISOString(),
                ip: this.getClientIP()
            });
            
            if (history.length > 10) {
                history.splice(10);
            }
            
            localStorage.setItem('passwordChangeHistory', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving password change history:', error);
        }
    }

    getLoginHistoryItems() {
        try {
            const history = JSON.parse(localStorage.getItem('loginHistory') || '[]');
            if (history.length === 0) {
                return '<p class="no-data">No login history available</p>';
            }
            
            return history.slice(0, 5).map(entry => `
                <div class="history-item">
                    <div class="history-icon">
                        <i class="fas ${entry.success ? 'fa-check-circle success' : 'fa-times-circle error'}"></i>
                    </div>
                    <div class="history-details">
                        <div class="history-title">${entry.success ? 'Successful login' : 'Failed login attempt'}</div>
                        <div class="history-meta">
                            <span>${new Date(entry.timestamp).toLocaleString()}</span>
                            <span>•</span>
                            <span>${entry.ip}</span>
                            <span>•</span>
                            <span>${entry.device || this.getDeviceInfo()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            return '<p class="no-data">Error loading login history</p>';
        }
    }
}

// Make it available globally
window.SettingsManager = SettingsManager;