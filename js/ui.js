class UIManager {
    constructor(dependencies) {
        this.themeManager = dependencies.themeManager;
        this.langManager = dependencies.langManager;
        this.auth = dependencies.auth;
        this.sidebarCollapsed = false;
        this.currentSection = 'dashboard';
    }

    async initialize() {
        console.log('🎨 Initializing UI components...');
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
            }
            
            this.setupEventListeners();
            this.setupModals();
            this.initializeFromSavedState();
            
            console.log('✅ UI components initialized');
            return true;
        } catch (error) {
            console.error('❌ UI initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        console.log('🔗 Setting up UI event listeners...');
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Navigation links
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                e.preventDefault();
                const section = navLink.getAttribute('data-section');
                this.showSection(section);
            }

            // Close modal when clicking outside
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.langManager.switchLanguage(e.target.value);
            });
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    setupModals() {
        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    // Role-based access control
    setupRoleBasedAccess(userRole) {
        console.log(`🔐 Setting up UI for role: ${userRole}`);
        
        const rolePermissions = {
            'admin': ['dashboard', 'users', 'employees', 'salary', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings'],
            'manager': ['dashboard', 'employees', 'salary', 'reports', 'settings'],
            'supervisor': ['dashboard', 'billing', 'customers', 'pending', 'payments', 'reports', 'settings']
        };

        const allowedSections = rolePermissions[userRole] || ['dashboard', 'settings'];
        
        // Hide unauthorized sections
        document.querySelectorAll('.nav-link').forEach(link => {
            const section = link.getAttribute('data-section');
            const parentLi = link.closest('li');
            
            if (!allowedSections.includes(section)) {
                parentLi.style.display = 'none';
            } else {
                parentLi.style.display = 'block';
            }
        });

        this.updateUserInfo();
        console.log(`✅ Role-based access configured for ${userRole}`);
    }

    updateUserInfo(user) {
        const currentUser = user || this.auth?.getCurrentUser?.();
        if (!currentUser) return;

        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');
        const settingsAvatar = document.getElementById('settingsAvatar');
        
        if (userName) userName.textContent = currentUser.name;
        if (userRole) userRole.textContent = currentUser.role;

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff6b35&color=fff&size=128`;
        if (userAvatar) userAvatar.src = avatarUrl;
        if (settingsAvatar) settingsAvatar.src = avatarUrl;
    }

    showAppReady() {
        console.log('🎉 Application UI fully ready');
        this.showToast('Application ready!', 'success');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
            localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
        }
    }

    handleResize() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !this.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                this.sidebarCollapsed = true;
            }
        }
    }

    showSection(sectionName) {
        console.log(`📂 Showing section: ${sectionName}`);
        
        // Hide all content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show the selected section
        const targetSection = document.getElementById(sectionName + 'Content');
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Activate the corresponding nav link
        const targetLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section data via event
        window.dispatchEvent(new CustomEvent('sectionChanged', {
            detail: { section: sectionName }
        }));

        // Update browser history
        history.pushState({ section: sectionName }, '', `#${sectionName}`);
    }

    // FIXED: Modal methods that work with modal IDs
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Create backdrop if needed
            if (!modal.querySelector('.modal-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop';
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                `;
                backdrop.addEventListener('click', () => this.hideModal(modalId));
                modal.appendChild(backdrop);
            }
            
            // Focus first input
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    // FIXED: Proper hideModal method
    hideModal(modalId) {
        let modal;
        if (typeof modalId === 'string') {
            modal = document.getElementById(modalId);
        } else {
            modal = modalId; // Support passing element directly
        }
        
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            
            // Remove backdrop
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            
            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.hideModal(modal.id);
        });
    }

    // FIXED: Toast method
    showToast(message, type = 'success') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        const colors = {
            success: '#28a745',
            error: '#dc3545', 
            warning: '#ffc107',
            info: '#17a2b8'
        };
        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    updateDashboardStats(stats) {
        const elements = {
            'totalBalance': stats.totalSales,
            'gstAmount': stats.totalGST,
            'recentActivity': stats.recentActivity,
            'pendingPayments': stats.pendingPayments,
            'totalCustomers': stats.totalCustomers,
            'totalEmployees': stats.totalEmployees
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('Balance') || id.includes('Amount')) {
                    element.textContent = Utils.formatCurrency(value || 0);
                } else {
                    element.textContent = Utils.formatNumber(value || 0);
                }
            }
        });
    }

    showLoading(message = 'Loading...') {
        Utils.showLoading(message);
    }

    hideLoading() {
        Utils.hideLoading();
    }

    showButtonLoading(button, text = 'Loading...') {
        const originalHTML = button.innerHTML;
        const originalText = button.textContent;
        
        button.disabled = true;
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            ${text}
        `;
        
        return () => {
            button.disabled = false;
            button.innerHTML = originalHTML;
            button.textContent = originalText;
        };
    }

    showSectionLoading(sectionId, message = 'Loading...') {
        const section = document.getElementById(sectionId);
        if (!section) return;

        let loader = section.querySelector('.section-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'section-loader';
            loader.innerHTML = `
                <div class="section-loading-content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>${message}</p>
                </div>
            `;
            loader.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
                border-radius: 8px;
            `;
            section.style.position = 'relative';
            section.appendChild(loader);
        }
        
        loader.style.display = 'flex';
        return loader;
    }

    hideSectionLoading(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const loader = section.querySelector('.section-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    updateDatabaseStatus(connected) {
        let statusElement = document.getElementById('dbStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'dbStatus';
            statusElement.className = `db-status ${connected ? 'connected' : 'disconnected'}`;
            const topbarRight = document.querySelector('.topbar-right');
            if (topbarRight) {
                topbarRight.appendChild(statusElement);
            }
        }
        
        statusElement.className = `db-status ${connected ? 'connected' : 'disconnected'}`;
        statusElement.innerHTML = connected ?
            '<i class="fas fa-database"></i> Online' :
            '<i class="fas fa-database"></i> Offline';
    }

    // Form validation helpers
    validateEmail(email) {
        return Utils.validateEmail(email);
    }

    validatePhone(phone) {
        return Utils.validatePhone(phone);
    }

    showFormError(input, message) {
        this.hideFormError(input);

        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: var(--danger-color);
            font-size: 0.8rem;
            margin-top: 0.25rem;
        `;

        input.style.borderColor = 'var(--danger-color)';
        input.parentNode.appendChild(errorElement);
    }

    hideFormError(input) {
        const existingError = input.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        input.style.borderColor = '';
    }

    // Table helpers
    renderTable(tbodyId, data, rowRenderer) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="100" class="no-data" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                        No data available
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(rowRenderer).join('');
    }

    // Export progress
    showExportProgress(message = 'Exporting...') {
        this.showLoading(message);
    }

    hideExportProgress() {
        this.hideLoading();
    }

    // Initialize from saved state
    initializeFromSavedState() {
        // Restore sidebar state
        const savedSidebarState = localStorage.getItem('sidebarCollapsed');
        if (savedSidebarState === 'true') {
            this.sidebarCollapsed = true;
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.add('collapsed');
            }
        }

        // Restore section from URL hash
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            this.showSection(hash);
        }
    }

    // Cleanup
    cleanup() {
        document.querySelectorAll('.section-loader').forEach(loader => {
            loader.remove();
        });
        
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.remove();
        }
    }
}

// Make UIManager available globally
window.UIManager = UIManager;