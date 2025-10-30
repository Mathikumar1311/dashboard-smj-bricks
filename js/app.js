class UpdateManager {
    constructor(ui) {
        this.ui = ui;
        this.isChecking = false;
        this.updateDownloaded = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!window.electronAPI) {
            console.warn('electronAPI not available - running in browser mode');
            return;
        }

        if (window.electronAPI.onUpdateStatus) {
            window.electronAPI.onUpdateStatus((event, data) => {
                console.log('Update status:', data?.status);
            });
        }

        if (window.electronAPI.onUpdateAvailable) {
            window.electronAPI.onUpdateAvailable((event, data) => {
                console.log('Update available:', data?.version);
                this.showUpdateAvailable(data);
            });
        }

        if (window.electronAPI.onUpdateNotAvailable) {
            window.electronAPI.onUpdateNotAvailable((event, data) => {
                console.log('No update available');
                if (this.isChecking) {
                    this.ui.showToast('You have the latest version!', 'success');
                    this.isChecking = false;
                }
            });
        }

        if (window.electronAPI.onDownloadProgress) {
            window.electronAPI.onDownloadProgress((event, data) => {
                this.showDownloadProgress(data?.percent || 0);
            });
        }

        if (window.electronAPI.onUpdateDownloaded) {
            window.electronAPI.onUpdateDownloaded((event, data) => {
                console.log('Update downloaded:', data?.version);
                this.updateDownloaded = true;
                this.showUpdateReady(data);
            });
        }

        if (window.electronAPI.onUpdateError) {
            window.electronAPI.onUpdateError((event, error) => {
                console.error('Update error:', error);
                this.ui.showToast('Update failed: ' + (error?.message || 'Unknown error'), 'error');
                this.isChecking = false;
                this.hideUpdateUI();
            });
        }
    }

    async checkForUpdates() {
        if (this.isChecking) return;

        if (!window.electronAPI?.checkForUpdates) {
            console.error('❌ electronAPI.checkForUpdates not available');
            this.ui.showToast('Auto-update not available in browser', 'warning');
            return;
        }

        this.isChecking = true;
        this.ui.showToast('Checking for updates...', 'info');
        console.log('🔍 Checking for updates via electronAPI...');

        try {
            const result = await window.electronAPI.checkForUpdates();
            console.log('✅ Update check result:', result);
        } catch (error) {
            console.error('❌ Error checking updates:', error);
            this.ui.showToast('Failed to check for updates', 'error');
            this.isChecking = false;
        }
    }

    showUpdateAvailable(updateInfo) {
        if (!updateInfo) {
            console.error('No update info provided');
            return;
        }

        const modalHtml = `
    <div id="updateAvailableModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-download"></i> Update Available</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Version ${updateInfo.version || 'Unknown'}</strong> is available!</p>
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

        this.showCustomModal(modalHtml, 'updateAvailableModal');

        setTimeout(() => {
            const downloadBtn = document.getElementById('downloadUpdate');
            const cancelBtn = document.getElementById('cancelUpdate');
            const closeBtn = document.querySelector('#updateAvailableModal .modal-close');

            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    this.hideUpdateModal();
                    this.showDownloadProgress(0);
                    // ✅ FIXED: Use the correct IPC call
                    if (window.electronAPI?.downloadUpdate) {
                        window.electronAPI.downloadUpdate();
                    }
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.hideUpdateModal();
                });
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideUpdateModal();
                });
            }
        }, 100);
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
                background: var(--bg-primary);
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
                    <p>Version <strong>${updateInfo.version || 'Unknown'}</strong> has been downloaded.</p>
                    <p class="warning-text">⚠️ Windows may show security warning for unsigned app.</p>
                    <p>Click "Download Manually" if auto-install fails.</p>
                </div>
                <div class="modal-actions">
                    <button id="installLater" class="btn-secondary">Later</button>
                    <button id="downloadManual" class="btn-secondary">
                        <i class="fas fa-download"></i> Download Manually
                    </button>
                    <button id="installNow" class="btn-primary">
                        <i class="fas fa-rocket"></i> Install Anyway
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showUpdateModal(modalHtml, 'updateReadyModal');

        document.getElementById('installNow').addEventListener('click', async () => {
            this.ui.showToast('Installing update...', 'info');
            setTimeout(() => {
                window.electronAPI?.quitAndInstall?.();
            }, 1000);
        });

        document.getElementById('downloadManual').addEventListener('click', () => {
            window.open('https://github.com/Mathikumar1311/dashboard-smj-bricks/releases/latest', '_blank');
            this.hideUpdateModal();
        });

        document.getElementById('installLater').addEventListener('click', () => {
            this.hideUpdateModal();
        });
    }

    showUpdateModal(html, modalId) {
        this.hideUpdateModal();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.innerHTML = html;
        document.body.appendChild(modal);

        modal.style.display = 'flex';

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideUpdateModal();
            }
        });
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
        this.hideUpdateUI();
    }
}

class BusinessDashboard {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = null;
        this.managers = {};
        this.updateManager = null;
        this.db = null;
        this.auth = null;
        this.ui = null;
    }


    // ADD THIS METHOD TO BusinessDashboard class
    updateSidebarVisibility(userRole) {
        console.log('🔧 Updating sidebar visibility for role:', userRole);

        // Define which roles can see which items
        const rolePermissions = {
            'admin-only': ['admin'],
            'admin-manager': ['admin', 'manager'],
            'admin-supervisor': ['admin', 'supervisor', 'manager'] // Allow manager to see supervisor items too
        };

        // Apply visibility rules
        Object.entries(rolePermissions).forEach(([className, allowedRoles]) => {
            const items = document.querySelectorAll(`.${className}`);
            items.forEach(item => {
                const shouldShow = allowedRoles.includes(userRole);
                item.style.display = shouldShow ? 'list-item' : 'none';
                console.log(`📋 ${className}: ${shouldShow ? 'SHOW' : 'HIDE'}`);
            });
        });

        // Always show dashboard, reports, and settings to everyone
        const alwaysShow = ['dashboard', 'reports', 'settings'];
        alwaysShow.forEach(section => {
            const item = document.querySelector(`[data-section="${section}"]`).closest('li');
            if (item) {
                item.style.display = 'list-item';
            }
        });

        console.log('✅ Sidebar visibility updated for role:', userRole);
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
        if (window.electronAPI) {
            this.updateManager = new UpdateManager(this.ui);
            this.addUpdateMenuOption();
            console.log('Electron API methods:', Object.keys(window.electronAPI));
            console.log('Electron API available:', !!window.electronAPI);

            // Add this line to make update manager globally accessible
            window.updateManager = this.updateManager;
        } else {
            console.log('Running in browser mode - auto-update disabled');
            // Create a dummy update manager for browser mode
            this.updateManager = {
                checkForUpdates: () => {
                    this.ui.showToast('Auto-update not available in browser mode', 'info');
                },
                cleanup: () => { }
            };
        }
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

        // ✅ ADD THIS: Update sidebar after auth
        const currentUser = this.auth.getCurrentUser();
        if (currentUser) {
            this.updateSidebarVisibility(currentUser.role);
        }

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
            // ✅ VERIFY ALL DEPENDENCIES EXIST
            if (!this.db) throw new Error('Database manager not initialized');
            if (!this.ui) throw new Error('UI manager not initialized');
            if (!this.auth) throw new Error('Auth manager not initialized');

            const dependencies = {
                db: this.db,
                ui: this.ui,
                auth: this.auth
            };

            console.log('✅ Dependencies verified:', {
                db: !!this.db,
                ui: !!this.ui,
                auth: !!this.auth
            });

            // ✅ INITIALIZE MANAGERS WITH CORRECT NAMES
            // In initializeBusinessManagers method
            this.managers = {
                user: new UserManager(dependencies),
                employee: new EmployeeManager(dependencies),
                salary: new SalaryManager(dependencies), // Make sure this exists
                billing: new BillingManager(dependencies),
                customer: new CustomerManager(dependencies),
                attendance: new AttendanceManager(dependencies),
                reports: new ReportsManager(dependencies),
                export: new ExportManager(dependencies),
                settings: new SettingsManager(dependencies)
            };

            // ✅ SAFE INITIALIZATION
            const initializationPromises = Object.entries(this.managers).map(async ([key, manager]) => {
                try {
                    if (manager && typeof manager.initialize === 'function') {
                        await manager.initialize();
                        console.log(`✅ ${key} manager initialized`);
                    } else {
                        console.log(`⚠️ ${key} manager has no initialize method or is undefined`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to initialize ${key} manager:`, error);
                    throw error;
                }
            });

            await Promise.all(initializationPromises);

            // ✅ MAKE MANAGERS GLOBALLY ACCESSIBLE
            window.app = this;
            window.exportManager = this.managers.export;

            this.setupSectionListeners();

            console.log('✅ All business managers initialized successfully');
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
            this.updateSidebarVisibility(currentUser.role);
            // Check permissions
            if (this.auth.canAccessSection && !this.auth.canAccessSection(sectionId)) {
                this.ui.showToast('You do not have permission to access this section', 'error');
                return;
            }

            // ✅ FIXED: Updated manager map with new managers
            const managerMap = {
                'dashboard': null,
                'users': 'user',
                'employees': 'employee',
                'salary': 'salary',
                'attendance': 'attendance',
                'salary-payments': 'salary', // Use salary manager for salary-payments too
                'billing': 'billing',
                'customers': 'customer',
                'pending': 'billing',
                'payments': 'billing',
                'reports': 'reports',
                'settings': 'settings'
            };

            const managerName = managerMap[sectionId];

            // Handle dashboard separately
            if (sectionId === 'dashboard') {
                await this.loadDashboardData();
                return;
            }

            if (!managerName || !this.managers[managerName]) {
                console.warn(`Manager not available for section: ${sectionId}`);
                this.ui.showToast(`${sectionId} functionality not available`, 'warning');
                return;
            }

            const manager = this.managers[managerName];

            switch (sectionId) {
                case 'users':
                    await manager.loadUsers();
                    break;
                case 'employees':
                    await manager.loadEmployees();
                    break;
                case 'salary':
                    if (manager.setupSalaryForm) {
                        manager.setupSalaryForm();
                    }
                    await manager.loadSalaryData();
                    break;
                case 'attendance':
                    if (manager.loadAttendanceRecords) {
                        await manager.loadAttendanceRecords();
                    }
                    break;
                case 'billing':
                    await manager.loadBills();
                    break;
                case 'customers':
                    await manager.loadCustomers();
                    break;
                case 'pending':
                    await manager.loadPendingBills();
                    break;
                case 'payments':
                    await manager.loadPayments();
                    break;
                case 'reports':
                    await manager.loadReports();
                    break;
                case 'settings':
                    try {
                        console.log('⚙️ Loading settings section...');
                        await this.loadSettings();

                        if (this.managers.settings) {
                            if (typeof this.managers.settings.loadSettings === 'function') {
                                await this.managers.settings.loadSettings();
                            }
                            if (typeof this.managers.settings.setupSettingsForms === 'function') {
                                this.managers.settings.setupSettingsForms();
                            }
                        }
                        console.log('✅ Settings section loaded successfully');
                    } catch (error) {
                        console.error('Error in settings section:', error);
                        this.ui.showToast('Error loading settings', 'error');
                    }
                    break;
                default:
                    console.warn(`Unknown section: ${sectionId}`);
            }
        } catch (error) {
            console.error(`Error loading data for ${sectionId}:`, error);
            this.ui.showToast(`Error loading ${sectionId} data`, 'error');
        }
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');

            // Get all necessary data for dashboard
            const [bills, customers, employees, payments] = await Promise.all([
                this.db.getBills(),
                this.db.getCustomers(),
                this.db.getEmployees(),
                this.db.getPayments()
            ]);

            // Calculate dashboard statistics
            const totalSales = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
            const totalGST = bills.reduce((sum, bill) => sum + (bill.gst_amount || 0), 0);
            const totalBills = bills.length;
            const pendingBills = bills.filter(bill => bill.status === 'pending').length;
            const totalCustomers = customers.length;
            const totalEmployees = employees.length;

            // Update dashboard cards
            const totalBalanceEl = document.getElementById('totalBalance');
            const gstAmountEl = document.getElementById('gstAmount');
            const recentActivityEl = document.getElementById('recentActivity');
            const pendingPaymentsEl = document.getElementById('pendingPayments');
            const totalCustomersEl = document.getElementById('totalCustomers');
            const totalEmployeesEl = document.getElementById('totalEmployees');

            if (totalBalanceEl) totalBalanceEl.textContent = Utils.formatCurrency(totalSales);
            if (gstAmountEl) gstAmountEl.textContent = Utils.formatCurrency(totalGST);
            if (recentActivityEl) recentActivityEl.textContent = totalBills;
            if (pendingPaymentsEl) pendingPaymentsEl.textContent = pendingBills;
            if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
            if (totalEmployeesEl) totalEmployeesEl.textContent = totalEmployees;

            console.log('✅ Dashboard data loaded successfully');
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.ui.showToast('Error loading dashboard data', 'error');
        }
    }

    async updateDashboardStats() {
        try {
            const [bills, customers, employees] = await Promise.all([
                this.db.getBills(),
                this.db.getCustomers(),
                this.db.getEmployees()
            ]);

            const stats = {
                totalSales: bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0),
                totalGST: bills.reduce((sum, bill) => sum + (bill.gst_amount || 0), 0),
                totalBills: bills.length,
                pendingBills: bills.filter(bill => bill.status === 'pending').length,
                totalCustomers: customers.length,
                totalEmployees: employees.length
            };

            // Update UI with stats
            if (this.ui && typeof this.ui.updateDashboardStats === 'function') {
                this.ui.updateDashboardStats(stats);
            }
        } catch (error) {
            console.error('Error updating dashboard stats:', error);
        }
    }

    updateOnlineUsers() {
        const onlineCount = Math.floor(Math.random() * 5) + 1;
        const element = document.getElementById('onlineUsersCount');
        if (element) element.textContent = onlineCount;
    }

    async updateDatabaseStatus() {
        try {
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
        try {
            console.log('⚙️ Loading settings...');

            // Load current user data for settings
            const currentUser = this.auth.getCurrentUser();
            if (currentUser) {
                const settingsAvatar = document.getElementById('settingsAvatar');
                const userName = document.getElementById('userName');

                if (settingsAvatar) {
                    settingsAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff6b35&color=fff`;
                }
                if (userName) {
                    userName.textContent = currentUser.name;
                }
            }

            // Setup theme selector
            this.setupThemeSelector();

            console.log('✅ Settings loaded successfully');
        } catch (error) {
            console.error('Error loading settings:', error);
            this.ui.showToast('Error loading settings', 'error');
        }
    }

    setupThemeSelector() {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                themeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');

                if (window.themeManager) {
                    window.themeManager.setTheme(theme);
                }
            });
        });
    }

    async finalizeInitialization() {
        console.log('🎯 Finalizing initialization...');
        this.setupErrorHandling();
        this.setupCleanup();
        const currentUser = this.auth.getCurrentUser();
        if (currentUser) {
            this.updateSidebarVisibility(currentUser.role);
        }

        this.setupErrorHandling();
        this.setupCleanup();
        // Initialize from saved state
        if (this.ui && typeof this.ui.initializeFromSavedState === 'function') {
            this.ui.initializeFromSavedState();
        }

        this.notifyAppReady();
        console.log('✅ Initialization complete');
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            if (this.ui) {
                this.ui.showToast('An unexpected error occurred', 'error');
            }
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            if (this.ui) {
                this.ui.showToast('An operation failed', 'error');
            }
            e.preventDefault();
        });

        // Global error handler
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

        // Cleanup managers
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.cleanup === 'function') {
                manager.cleanup();
            }
        });

        // Cleanup core components
        if (this.db) this.db.cleanup();
        if (this.ui) this.ui.cleanup?.();
        if (this.auth) this.auth.cleanup?.();
        if (this.updateManager) this.updateManager.cleanup();

        console.log('✅ Cleanup completed');
    }

    notifyAppReady() {
        // Show app ready notification
        if (this.ui && typeof this.ui.showAppReady === 'function') {
            this.ui.showAppReady();
        }

        // Dispatch app ready event
        window.dispatchEvent(new CustomEvent('appReady', {
            detail: {
                version: '2.1.0',
                timestamp: new Date().toISOString(),
                managers: Object.keys(this.managers)
            }
        }));

        console.log('🎊 Application fully loaded and ready!');
    }

    handleInitializationError(error) {
        const errorMessage = `Application failed to start. Error: ${error.message}`;
        console.error('💥 Fatal initialization error:', error);

        if (this.ui && typeof this.ui.showFatalError === 'function') {
            this.ui.showFatalError(errorMessage);
        } else {
            // Fallback error display
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;">
                    <h1 style="color: #dc3545; margin-bottom: 1rem;">Application Error</h1>
                    <p style="margin-bottom: 1.5rem; color: #666;">${errorMessage}</p>
                    <button onclick="window.location.reload()" 
                            style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Reload Application
                    </button>
                </div>
            `;
        }
    }

    // Manager access methods
    getManagers() {
        return this.managers;
    }

    getManager(name) {
        return this.managers[name];
    }

    // Utility methods
    isReady() {
        return this.isInitialized;
    }

    getAppInfo() {
        return {
            version: '2.1.0',
            initialized: this.isInitialized,
            managers: Object.keys(this.managers),
            database: this.db?.isOnline ? 'Online' : 'Offline'
        };
    }

    // Data sanitization methods
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
                const employeeFields = ['id', 'name', 'phone', 'email', 'employee_type', 'vehicle_number', 'role', 'salary', 'join_date', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!employeeFields.includes(key)) delete sanitized[key];
                });
                break;

            case 'bills':
                const billFields = ['id', 'bill_number', 'bill_date', 'customer_name', 'customer_phone', 'customer_email', 'items', 'sub_total', 'gst_rate', 'gst_amount', 'total_amount', 'status', 'created_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!billFields.includes(key)) delete sanitized[key];
                });
                break;

            case 'customers':
                const customerFields = ['id', 'name', 'phone', 'email', 'address', 'total_bills', 'total_amount', 'created_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!customerFields.includes(key)) delete sanitized[key];
                });
                break;
        }

        return sanitized;
    }

    // Export functionality
    async exportData(type, format = 'excel') {
        try {
            let data = [];
            let filename = '';
            let title = '';

            switch (type) {
                case 'users':
                    data = await this.db.getUsers();
                    filename = 'users_export';
                    title = 'Users Export';
                    break;
                case 'employees':
                    data = await this.db.getEmployees();
                    filename = 'employees_export';
                    title = 'Employees Export';
                    break;
                case 'bills':
                    data = await this.db.getBills();
                    filename = 'bills_export';
                    title = 'Bills Export';
                    break;
                case 'customers':
                    data = await this.db.getCustomers();
                    filename = 'customers_export';
                    title = 'Customers Export';
                    break;
                case 'payments':
                    data = await this.db.getPayments();
                    filename = 'payments_export';
                    title = 'Payments Export';
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }

            if (data.length === 0) {
                this.ui.showToast(`No ${type} data to export`, 'warning');
                return;
            }

            // Use export manager if available
            if (window.exportManager && format === 'excel') {
                await window.exportManager.exportToExcel(data, filename, title);
            } else if (window.exportManager && format === 'pdf') {
                await window.exportManager.exportToPDF(data, filename, title);
            } else {
                // Fallback to Utils
                Utils.exportToExcel(data, filename);
            }

            this.ui.showToast(`${type} exported successfully`, 'success');
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            this.ui.showToast(`Error exporting ${type}: ${error.message}`, 'error');
        }
    }

    // Backup functionality
    async backupAllData() {
        try {
            this.ui.showExportProgress('Creating backup...');

            const allData = await this.db.exportAllData();

            if (window.electronAPI && window.electronAPI.exportAllData) {
                const result = await window.electronAPI.exportAllData(allData);
                if (result.success) {
                    this.ui.showToast(`Backup created successfully: ${result.filePath}`, 'success');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Browser fallback - download as JSON
                const dataStr = JSON.stringify(allData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `business_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.ui.showToast('Backup downloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            this.ui.showToast('Error creating backup: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // Static method to get instance
    static getInstance() {
        return window.app;
    }
}

// Global initialization with enhanced error handling
let appInstance = null;

async function initializeApp() {
    try {
        console.log('🎉 Starting application...');

        // Check if required dependencies are available
        if (typeof Utils === 'undefined') {
            throw new Error('Utils library not loaded');
        }

        if (typeof DatabaseManager === 'undefined') {
            throw new Error('DatabaseManager not loaded');
        }

        if (typeof AuthManager === 'undefined') {
            throw new Error('AuthManager not loaded');
        }

        if (typeof UIManager === 'undefined') {
            throw new Error('UIManager not loaded');
        }

        // Create and initialize app instance
        appInstance = new BusinessDashboard();
        await appInstance.initialize();

        // Make app globally accessible
        window.app = appInstance;

        console.log('🎊 Application fully loaded and ready!');

        // Dispatch global ready event
        window.dispatchEvent(new Event('appFullyLoaded'));

    } catch (error) {
        console.error('💥 Failed to initialize application:', error);

        // Enhanced error display
        const errorHtml = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: Arial, sans-serif;
                color: white;
                z-index: 10000;
            ">
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 3rem;
                    border-radius: 15px;
                    text-align: center;
                    max-width: 500px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                ">
                    <h1 style="margin-bottom: 1rem; font-size: 2rem;">🚨 Application Error</h1>
                    <p style="margin-bottom: 1.5rem; font-size: 1.1rem; opacity: 0.9;">
                        The application failed to start properly.
                    </p>
                    <div style="
                        background: rgba(255, 255, 255, 0.2);
                        padding: 1rem;
                        border-radius: 8px;
                        margin-bottom: 2rem;
                        text-align: left;
                        font-family: monospace;
                        font-size: 0.9rem;
                    ">
                        ${error.message}
                    </div>
                    <button onclick="window.location.reload()" 
                            style="
                                padding: 12px 30px;
                                background: rgba(255, 255, 255, 0.2);
                                color: white;
                                border: 2px solid rgba(255, 255, 255, 0.3);
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 1rem;
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.background='rgba(255, 255, 255, 0.3)';"
                            onmouseout="this.style.background='rgba(255, 255, 255, 0.2)';">
                        🔄 Reload Application
                    </button>
                    <div style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.7;">
                        If the problem persists, check the browser console for details.
                    </div>
                </div>
            </div>
        `;

        document.body.innerHTML = errorHtml;
    }
}

// Start initialization based on document ready state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
// app.js - Updated initialization
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Starting Business Dashboard Application...');

    try {
        // Initialize the fixed UI Manager
        const uiManager = new UIManager({
            themeManager: window.themeManager,
            langManager: window.langManager,
            auth: window.auth
        });

        // Initialize UI
        await uiManager.initialize();

        // Store globally for access from other modules
        window.uiManager = uiManager;

        console.log('🎉 Application started successfully!');

    } catch (error) {
        console.error('💥 Application failed to start:', error);
        // Show error to user
        alert('Application failed to load. Please refresh the page.');
    }
});
// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BusinessDashboard, UpdateManager };
}