class UpdateManager {
    constructor(ui) {
        this.ui = ui;
        this.isChecking = false;
        this.updateDownloaded = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Update status events
        window.electronAPI.onUpdateStatus((event, data) => {
            console.log('Update status:', data.status);
        });

        window.electronAPI.onUpdateAvailable((event, data) => {
            console.log('Update available:', data.version);
            this.showUpdateAvailable(data);
        });

        window.electronAPI.onUpdateNotAvailable((event, data) => {
            console.log('No update available');
            if (this.isChecking) {
                this.ui.showToast('You have the latest version!', 'success');
                this.isChecking = false;
            }
        });

        window.electronAPI.onDownloadProgress((event, data) => {
            this.showDownloadProgress(data.percent);
        });

        window.electronAPI.onUpdateDownloaded((event, data) => {
            console.log('Update downloaded:', data.version);
            this.updateDownloaded = true;
            this.showUpdateReady(data);
        });

        window.electronAPI.onUpdateError((event, error) => {
            console.error('Update error:', error);
            this.ui.showToast('Update failed: ' + error.message, 'error');
            this.isChecking = false;
            this.hideUpdateUI();
        });
    }

    async checkForUpdates() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        this.ui.showToast('Checking for updates...', 'info');
        
        try {
            await window.electronAPI.checkForUpdates();
        } catch (error) {
            console.error('Error checking updates:', error);
            this.ui.showToast('Failed to check for updates', 'error');
            this.isChecking = false;
        }
    }

    showUpdateAvailable(updateInfo) {
        const modalHtml = `
            <div id="updateAvailableModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Update Available</h3>
                    </div>
                    <div class="modal-body">
                        <p><strong>Version ${updateInfo.version}</strong> is available!</p>
                        ${updateInfo.releaseNotes ? `
                            <div class="release-notes">
                                <h4>What's New:</h4>
                                <p>${updateInfo.releaseNotes}</p>
                            </div>
                        ` : ''}
                        <p>The update will download automatically.</p>
                        <div class="download-progress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" id="updateProgressFill"></div>
                            </div>
                            <p id="updateProgressText">0%</p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="cancelUpdate" class="btn-secondary">Later</button>
                        <button id="downloadUpdate" class="btn-primary">
                            <i class="fas fa-download"></i> Download Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showUpdateModal(modalHtml, 'updateAvailableModal');
        
        document.getElementById('downloadUpdate').addEventListener('click', () => {
            this.hideUpdateModal();
            this.showDownloadProgress(0);
        });
        
        document.getElementById('cancelUpdate').addEventListener('click', () => {
            this.hideUpdateModal();
        });
    }

    showDownloadProgress(percent) {
        let progressContainer = document.getElementById('updateProgressContainer');
        
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'updateProgressContainer';
            progressContainer.innerHTML = `
                <div class="update-progress-notification">
                    <h4><i class="fas fa-download"></i> Downloading Update</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" id="updateProgressFill"></div>
                    </div>
                    <p id="updateProgressText">${percent}%</p>
                </div>
            `;
            progressContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--card-bg);
                border: 2px solid var(--primary-color);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                min-width: 250px;
            `;
            document.body.appendChild(progressContainer);
        }

        const progressFill = document.getElementById('updateProgressFill');
        const progressText = document.getElementById('updateProgressText');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}%`;
        
        if (percent >= 100) {
            setTimeout(() => {
                if (progressContainer) progressContainer.remove();
            }, 2000);
        }
    }

    showUpdateReady(updateInfo) {
        const modalHtml = `
            <div id="updateReadyModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-check-circle"></i> Update Ready</h3>
                    </div>
                    <div class="modal-body">
                        <p>Version <strong>${updateInfo.version}</strong> has been downloaded and is ready to install.</p>
                        <p class="warning-text">⚠️ Please save your work before restarting.</p>
                    </div>
                    <div class="modal-actions">
                        <button id="installLater" class="btn-secondary">Later</button>
                        <button id="installNow" class="btn-primary">
                            <i class="fas fa-rocket"></i> Restart & Install
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showUpdateModal(modalHtml, 'updateReadyModal');
        
        document.getElementById('installNow').addEventListener('click', async () => {
            this.ui.showToast('Restarting to install update...', 'info');
            setTimeout(() => {
                window.electronAPI.quitAndInstall();
            }, 1000);
        });
        
        document.getElementById('installLater').addEventListener('click', () => {
            this.hideUpdateModal();
            this.ui.showToast('Update will be installed on next restart', 'info');
        });
    }

    showUpdateModal(html, modalId) {
        this.hideUpdateModal();
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.innerHTML = html;
        document.body.appendChild(modal);
        
        this.ui.showModal(modalId);
    }

    hideUpdateModal() {
        const modals = ['updateAvailableModal', 'updateReadyModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) modal.remove();
        });
    }

    hideUpdateUI() {
        this.hideUpdateModal();
        const progressContainer = document.getElementById('updateProgressContainer');
        if (progressContainer) progressContainer.remove();
    }

    cleanup() {
        window.electronAPI.removeUpdateListeners();
    }
}

class BusinessDashboard {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = null;
        this.managers = {};
        this.updateManager = null;
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = this._initialize();
        return this.initializationPromise;
        
    }

    async _initialize() {
        console.log('🚀 Starting Business Dashboard initialization...');

        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }

            // Initialize core utilities first
            await this.initializeCore();

            // Initialize database
            await this.initializeDatabase();

            // Initialize authentication
            await this.initializeAuth();

            // Initialize UI
            await this.initializeUI();

            // Initialize business managers
            await this.initializeBusinessManagers();

            // Finalize initialization
            await this.finalizeInitialization();
            
            this.initializeUpdateManager();
            this.isInitialized = true;
            
            console.log('✅ Business Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    initializeUpdateManager() {
        this.updateManager = new UpdateManager(this.ui);
        
        // Add update check to menu or settings
        this.addUpdateMenuOption();
    }


    async initializeCore() {
        console.log('📦 Initializing core utilities...');

        // Wait for themeManager and langManager to exist
        await new Promise(resolve => {
            const check = () => {
                if (window.themeManager && window.langManager) resolve();
                else setTimeout(check, 100);
            };
            check();
        });

        console.log('✅ Core utilities initialized');
    }

    async initializeDatabase() {
        console.log('🗄️ Initializing database...');
        this.db = new DatabaseManager();
        await this.db.initialize();
        console.log('✅ Database initialized');
    }

    async initializeAuth() {
        console.log('🔐 Initializing authentication...');
        this.auth = new AuthManager(this.db);
        await this.auth.initialize();
        console.log('✅ Authentication initialized');
    }

    async initializeUI() {
        console.log('🎨 Initializing UI...');
        this.ui = new UIManager({
            themeManager: window.themeManager,
            langManager: window.langManager,
            auth: this.auth
        });
        await this.ui.initialize();
        console.log('✅ UI initialized');
    }

    async initializeBusinessManagers() {
        console.log('👥 Initializing business managers...');

        try {
            const dependencies = {
                db: this.db,
                ui: this.ui,
                auth: this.auth
            };

            this.managers = {
                user: new UserManager(dependencies),
                employee: new EmployeeManager(dependencies),
                billing: new BillingManager(dependencies),
                reports: new ReportsManager(dependencies),
                export: new ExportManager(dependencies)
            };

            await Promise.all([
                this.managers.user.initialize(),
                this.managers.employee.initialize(),
                this.managers.billing.initialize(),
                this.managers.reports.initialize(),
                this.managers.export.initialize()
            ]);

            // Make managers globally accessible
            window.app = this;
            window.exportManager = this.managers.export;

            this.setupSectionListeners();

            console.log('✅ Business managers initialized');
        } catch (error) {
            console.error('❌ Failed to initialize business managers:', error);
            throw error;
        }
    }

    setupSectionListeners() {
        window.addEventListener('sectionChanged', (event) => {
            this.loadSectionData(event.detail.section);
        });

        window.addEventListener('dashboardReady', () => {
            this.loadInitialData();
        });

        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.section) {
                this.ui.showSection(event.state.section);
            }
        });
    }

    addUpdateMenuOption() {
        // Add "Check for Updates" to your app menu or settings
        setTimeout(() => {
            const settingsMenu = document.getElementById('settingsMenu');
            if (settingsMenu) {
                const updateOption = document.createElement('button');
                updateOption.className = 'menu-item';
                updateOption.innerHTML = '<i class="fas fa-sync-alt"></i> Check for Updates';
                updateOption.addEventListener('click', () => {
                    this.updateManager.checkForUpdates();
                });
                settingsMenu.appendChild(updateOption);
            }
        }, 1000);
    }
    async loadInitialData() {
        try {
            console.log('📊 Loading initial dashboard data...');
            await this.updateDashboardStats();
            this.updateOnlineUsers();
            await this.updateDatabaseStatus();
            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadSectionData(sectionId) {
        try {
            console.log(`📊 Loading data for section: ${sectionId}`);

            const currentUser = this.auth && typeof this.auth.getCurrentUser === 'function'
                ? this.auth.getCurrentUser()
                : null;

            if (!currentUser) {
                console.warn('User not authenticated, skipping data load');
                return;
            }

            switch (sectionId) {
                case 'employees':
                    if (this.managers.employee) {
                        await this.managers.employee.loadEmployees();
                    }
                    break;
                case 'salary':
                    if (this.managers.employee) {
                        // Setup salary form when salary section is shown
                        this.managers.employee.setupSalaryForm();
                        await this.managers.employee.loadSalaries();
                    }
                    break;
                case 'customers':
                    if (this.managers.customer) {
                        await this.managers.customer.loadCustomers();
                    }
                    break;
                case 'bills':
                    if (this.managers.bill) {
                        await this.managers.bill.loadBills();
                    }
                    break;
                case 'users':
                    if (this.managers.user) {
                        await this.managers.user.loadUsers();
                    }
                    break;
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading data for ${sectionId}:`, error);
        }
    }

    async updateDashboardStats() {
        try {
            const stats = await this.db.getDashboardStats();
            this.ui.updateDashboardStats(stats);
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    updateOnlineUsers() {
        const onlineCount = Math.floor(Math.random() * 5) + 1;
        const element = document.getElementById('onlineUsersCount');
        if (element) element.textContent = onlineCount;
    }
    sanitizeDataForTable(table, data) {
        const sanitized = { ...data };

        switch (table) {
            case 'users':
                const userFields = ['id', 'username', 'password', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!userFields.includes(key)) delete sanitized[key];
                });
                break;

            case 'employees':
                // FIXED: Accept custom string IDs for employees
                const employeeFields = ['id', 'name', 'phone', 'email', 'employee_type', 'vehicle_number', 'role', 'salary', 'join_date', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!employeeFields.includes(key)) delete sanitized[key];
                });
                break;

            // ... other tables ...
        }

        return sanitized;
    }
    async updateDatabaseStatus() {
        try {
            // Use the healthCheck method that now exists
            const isHealthy = await this.db.healthCheck();
            const statusElement = document.getElementById('dbStatus');

            if (statusElement) {
                if (isHealthy && this.db.isOnline) {
                    statusElement.className = 'db-status connected';
                    statusElement.innerHTML = '<i class="fas fa-database"></i> Online';
                    statusElement.title = 'Connected to Supabase';
                } else {
                    statusElement.className = 'db-status disconnected';
                    statusElement.innerHTML = '<i class="fas fa-database"></i> Offline';
                    statusElement.title = 'Using local storage';
                }
            }
        } catch (error) {
            console.error('Error updating database status:', error);
        }
    }

    async loadSettings() {
        console.log('⚙️ Loading settings...');
    }

    async finalizeInitialization() {
        console.log('🎯 Finalizing initialization...');
        this.setupErrorHandling();
        this.setupCleanup();
        this.ui.initializeFromSavedState();
        this.notifyAppReady();
        console.log('✅ Initialization complete');
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.ui.showToast('An unexpected error occurred', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.ui.showToast('An operation failed', 'error');
            e.preventDefault();
        });

        window.handleGlobalError = (error) => {
            console.error('Global error handler:', error);
            if (this.ui) {
                this.ui.showToast('An error occurred', 'error');
            }
        };
    }

    setupCleanup() {
        window.addEventListener('beforeunload', () => this.cleanup());
        if (window.electronAPI) {
            window.addEventListener('unload', () => this.cleanup());
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up application...');
        if (this.db) this.db.cleanup();
        if (this.ui) this.ui.cleanup?.();
        if (this.auth) this.auth.cleanup?.();
        console.log('✅ Cleanup completed');
    }

    notifyAppReady() {
        this.ui.showAppReady();
        window.dispatchEvent(new CustomEvent('appReady', {
            detail: {
                version: '1.0.0',
                timestamp: new Date().toISOString()
            }
        }));
    }

    handleInitializationError(error) {
        const errorMessage = `Application failed to start. Error: ${error.message}`;
        console.error('💥 Fatal initialization error:', error);

        if (this.ui && typeof this.ui.showFatalError === 'function') {
            this.ui.showFatalError(errorMessage);
        } else {
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h1 style="color: #dc3545;">Application Error</h1>
                    <p>${errorMessage}</p>
                    <button onclick="window.location.reload()">Reload Application</button>
                </div>
            `;
        }
    }

    getManagers() {
        return this.managers;
    }

    isReady() {
        return this.isInitialized;
    }

    static getInstance() {
        return window.app;
    }
}

// Global initialization
let appInstance = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

async function initializeApp() {
    try {
        console.log('🎉 Starting application...');
        appInstance = new BusinessDashboard();
        await appInstance.initialize();
        window.app = appInstance;
        console.log('🎊 Application fully loaded and ready!');
    } catch (error) {
        console.error('💥 Failed to initialize application:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h1>Application Failed to Load</h1>
                <p>Please refresh the page.</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}
