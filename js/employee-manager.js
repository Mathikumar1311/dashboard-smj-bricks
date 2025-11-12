class EmployeeManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('EmployeeManager: dependencies required');
        if (!dependencies.db) throw new Error('EmployeeManager: db dependency is required');
        if (!dependencies.ui) throw new Error('EmployeeManager: ui dependency is required');
        if (!dependencies.auth) throw new Error('EmployeeManager: auth dependency is required');

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        // Initialize all data arrays
        this.employees = [];
        this.salaryRecords = [];
        this.yearlyAllocations = [];
        this.advancePayments = [];
        this.filteredEmployees = [];
        this.currentSearchTerm = '';
        this.currentDateFilter = 'all';

        this.familyGroups = [];
        this.attendanceRecords = [];
        this.simpleAdvances = [];
        this.salaryPayments = [];

        // State management
        this.isLoading = false;
        this.isInitialized = false;

        // Bind methods properly
        this.handleEmployeeSubmit = this.handleEmployeeSubmit.bind(this);
        this.handleSalarySubmit = this.handleSalarySubmit.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
        this.handleYearlyAllocation = this.handleYearlyAllocation.bind(this);
        this.handleAdvancePayment = this.handleAdvancePayment.bind(this);
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        this.handleFamilyGroupSubmit = this.handleFamilyGroupSubmit.bind(this);
        this.handleEmployeeTypeChange = this.handleEmployeeTypeChange.bind(this);
        this.handleStatusToggle = this.handleStatusToggle.bind(this);
        this.handleAddToFamilySubmit = this.handleAddToFamilySubmit.bind(this);
        this.handleRemoveFromFamily = this.handleRemoveFromFamily.bind(this);
        this.handleManageFamilyMembers = this.handleManageFamilyMembers.bind(this);

        // Fix debounce with proper binding
        this.debouncedSearch = this.debounce(this.handleSearch.bind(this), 300);

        console.log('✅ EmployeeManager initialized');
    }

    // Fixed debounce implementation
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('🔄 EmployeeManager already initialized');
            return Promise.resolve();
        }

        try {
            console.log('🔄 Initializing EmployeeManager...');
            this.isLoading = true;

            // Load family groups first to ensure data is available
            await this.loadFamilyGroups();
            await this.loadEmployees();
            await this.loadOptionalData();

            this.setupEventListeners();

            this.isInitialized = true;
            console.log('✅ EmployeeManager initialization complete');
        } catch (error) {
            console.error('❌ EmployeeManager initialization failed:', error);
            this.ui.showToast('Failed to initialize employee manager: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
        return Promise.resolve();
    }

    async loadEmployees() {
        if (this.isLoading) {
            console.log('🔄 Employee load already in progress, skipping...');
            return;
        }

        try {
            this.isLoading = true;
            console.log('👥 Loading employees...');
            this.ui.showSectionLoading('employeesContent', 'Loading employees...');

            this.employees = await this.db.getEmployees() || [];
            console.log('✅ Employees loaded:', this.employees.length);

            // Debug: Check family group associations
            this.employees.forEach(employee => {
                if (employee.family_group_id) {
                    console.log(`👨‍👩‍👧‍👦 Employee ${employee.id} has family group: ${employee.family_group_id}`);
                }
            });

            this.renderEmployeesTable(this.employees);
            this.updateSearchResultsCount();
            this.populateEmployeeSelect(this.employees);

        } catch (error) {
            console.error('❌ Error loading employees:', error);
            this.ui.showToast('Error loading employees: ' + error.message, 'error');
            this.employees = [];
            this.renderEmployeesTable([]);
        } finally {
            this.ui.hideSectionLoading('employeesContent');
            this.isLoading = false;
        }
    }

    async loadOptionalData() {
        const optionalLoads = [
            { name: 'simpleAdvances', method: () => this.loadSimpleAdvances() },
            { name: 'attendance', method: () => this.loadAttendanceRecords() },
            { name: 'salaryPayments', method: () => this.loadSalaryPayments() },
            { name: 'salaryRecords', method: () => this.loadSalaryRecords() },
            { name: 'yearlyAllocations', method: () => this.loadYearlyAllocations() },
            { name: 'advancePayments', method: () => this.loadAdvancePayments() }
        ];

        for (const load of optionalLoads) {
            try {
                await load.method();
                console.log(`✅ ${load.name} loaded successfully`);
            } catch (error) {
                console.warn(`⚠️ ${load.name} not available:`, error.message);
                this[load.name] = [];
            }
        }
    }

    async loadFamilyGroups() {
        try {
            console.log('👨‍👩‍👧‍👦 Loading family groups...');
            this.familyGroups = await this.db.getFamilyGroups() || [];
            console.log('✅ Family groups loaded:', this.familyGroups.length);

            // Debug: Log family groups
            this.familyGroups.forEach(group => {
                console.log(`🏠 Family Group: ${group.family_name} (ID: ${group.id}) - Primary: ${group.primary_member_id}`);
            });
        } catch (error) {
            console.warn('⚠️ Family groups not available:', error.message);
            this.familyGroups = [];
        }
    }

    async loadSimpleAdvances() {
        try {
            this.simpleAdvances = await this.db.getSimpleAdvances() || [];
            console.log('✅ Simple advances loaded:', this.simpleAdvances.length);
        } catch (error) {
            console.warn('⚠️ Simple advances not available');
            this.simpleAdvances = [];
        }
    }

    async loadAttendanceRecords() {
        try {
            this.attendanceRecords = await this.db.getAttendanceRecords() || [];
            console.log('✅ Attendance records loaded:', this.attendanceRecords.length);
        } catch (error) {
            console.warn('⚠️ Attendance records not available');
            this.attendanceRecords = [];
        }
    }

    async loadSalaryPayments() {
        try {
            this.salaryPayments = await this.db.getSalaryPayments() || [];
            console.log('✅ Salary payments loaded:', this.salaryPayments.length);
        } catch (error) {
            console.warn('⚠️ Salary payments not available');
            this.salaryPayments = [];
        }
    }

    async loadSalaryRecords() {
        try {
            this.salaryRecords = await this.db.getSalaryRecords() || [];
            console.log('✅ Salary records loaded:', this.salaryRecords.length);
        } catch (error) {
            console.warn('⚠️ Salary records not available');
            this.salaryRecords = [];
        }
    }

    async loadYearlyAllocations() {
        try {
            this.yearlyAllocations = await this.db.getYearlyAllocations() || [];
            console.log('✅ Yearly allocations loaded:', this.yearlyAllocations.length);
        } catch (error) {
            console.warn('⚠️ Yearly allocations not available');
            this.yearlyAllocations = [];
        }
    }

    async loadAdvancePayments() {
        try {
            this.advancePayments = await this.db.getAdvancePayments() || [];
            console.log('✅ Advance payments loaded:', this.advancePayments.length);
        } catch (error) {
            console.warn('⚠️ Advance payments not available');
            this.advancePayments = [];
        }
    }

    setupEventListeners() {
        console.log('🔗 Setting up employee event listeners...');

        this.removeEventListeners();

        // Use event delegation for dynamic content
        document.addEventListener('click', this.handleGlobalClick);

        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debouncedSearch(e.target.value);
            });
        }

        const employeeForm = document.getElementById('employeeForm');
        if (employeeForm) {
            employeeForm.addEventListener('submit', this.handleEmployeeSubmit);
        }

        // Employee type change listeners
        const employeeTypeRadios = document.querySelectorAll('input[name="employeeType"]');
        employeeTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleEmployeeTypeChange(e.target.value));
        });

        console.log('✅ Employee event listeners setup complete');
    }

    handleGlobalClick(e) {
        try {
            // 🚫 PREVENT EVENT CONFLICTS WITH SALARY MANAGER
            // If the click is inside any modal, check if it's a family-related modal first
            const modal = e.target.closest('.modal');
            if (modal) {
                const modalId = modal.id;
                const familyModals = [
                    'familyGroupModal', 'manageFamilyGroupsModal', 'familyGroupDetailsModal',
                    'addToFamilyModal', 'manageFamilyMembersModal', 'employeeDetailsModal'
                ];

                if (familyModals.includes(modalId)) {
                    // This is a family-related modal, EmployeeManager should handle it
                    console.log('👨‍👩‍👧‍👦 Family modal click detected, EmployeeManager handling');
                } else {
                    // Let other managers handle their modals
                    const salaryModals = [
                        'advanceModal', 'employeeSalaryModal', 'quickAttendanceModal',
                        'bulkSalaryModal', 'processSalaryModal', 'exportSalaryModal'
                    ];
                    if (salaryModals.includes(modalId)) {
                        return; // Let SalaryManager handle salary-related modals
                    }
                }
            }

            // 🟢 FAMILY GROUP MANAGEMENT BUTTONS - IMPROVED SELECTORS
            if (e.target.closest('.remove-family-group-btn')) {
                const button = e.target.closest('.remove-family-group-btn');
                const employeeId = button.getAttribute('data-employee-id');
                if (employeeId) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🗑️ Remove from family group clicked for:', employeeId);
                    this.handleRemoveFromFamily(employeeId);
                }
                return;
            }

            if (e.target.closest('.manage-family-members-btn')) {
                const button = e.target.closest('.manage-family-members-btn');
                const familyGroupId = button.getAttribute('data-family-id');
                if (familyGroupId) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('👨‍👩‍👧‍👦 Manage family members clicked for:', familyGroupId);
                    this.showManageFamilyMembersModal(familyGroupId);
                }
                return;
            }

            if (e.target.closest('.remove-family-member-btn')) {
                const button = e.target.closest('.remove-family-member-btn');
                const employeeId = button.getAttribute('data-employee-id');
                const familyGroupId = button.getAttribute('data-family-id');
                if (employeeId && familyGroupId) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('👤 Remove family member clicked:', employeeId, 'from', familyGroupId);
                    this.handleRemoveFamilyMember(employeeId, familyGroupId);
                }
                return;
            }

            // 🟢 STATUS TOGGLE BUTTON
            if (e.target.closest('.status-toggle-btn') || e.target.closest('.fa-sync-alt')) {
                e.preventDefault();
                e.stopPropagation();

                const button = e.target.closest('.status-toggle-btn') ||
                    e.target.closest('.fa-sync-alt')?.closest('.status-toggle-btn');

                if (button) {
                    const employeeId = button.getAttribute('data-employee-id');
                    const currentStatus = button.getAttribute('data-current-status');
                    if (employeeId && currentStatus) {
                        console.log('🔄 Toggling status for:', employeeId);
                        this.handleStatusToggle(employeeId, currentStatus);
                    }
                }
                return;
            }

            // 🟣 OTHER FAMILY GROUP MANAGEMENT BUTTONS
            if (e.target.closest('.edit-family-group-btn')) {
                const button = e.target.closest('.edit-family-group-btn');
                const familyGroupId = button.getAttribute('data-family-id');
                if (familyGroupId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.editFamilyGroup(familyGroupId);
                }
                return;
            }

            if (e.target.closest('.delete-family-group-btn')) {
                const button = e.target.closest('.delete-family-group-btn');
                const familyGroupId = button.getAttribute('data-family-id');
                if (familyGroupId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteFamilyGroupWithConfirmation(familyGroupId);
                }
                return;
            }

            if (e.target.closest('.view-family-group-btn')) {
                const button = e.target.closest('.view-family-group-btn');
                const familyGroupId = button.getAttribute('data-family-id');
                if (familyGroupId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showFamilyGroupDetails(familyGroupId);
                }
                return;
            }

            // 🟢 EMPLOYEE FAMILY GROUP ACTIONS
            if (e.target.closest('.assign-family-group-btn')) {
                const button = e.target.closest('.assign-family-group-btn');
                const employeeId = button.getAttribute('data-employee-id');
                if (employeeId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showAddToFamilyModal(employeeId);
                }
                return;
            }

            // 🟢 EMPLOYEE BUTTONS
            if (e.target.id === 'addEmployeeBtn' || e.target.closest('#addEmployeeBtn')) {
                e.preventDefault();
                this.showAddEmployeeModal();
                return;
            }

            if (e.target.classList.contains('edit-employee-btn') || e.target.closest('.edit-employee-btn')) {
                const employeeId = e.target.closest('[data-employee-id]')?.getAttribute('data-employee-id');
                if (employeeId) {
                    e.preventDefault();
                    this.editEmployee(employeeId);
                }
                return;
            }

            if (e.target.id === 'exportEmployeesBtn' || e.target.closest('#exportEmployeesBtn')) {
                e.preventDefault();
                this.showExportOptions();
                return;
            }

            // 🟣 FAMILY GROUP CREATION / MANAGEMENT
            if (e.target.id === 'createFamilyGroupBtn' || e.target.closest('#createFamilyGroupBtn')) {
                e.preventDefault();
                this.showFamilyGroupModal();
                return;
            }

            if (e.target.id === 'manageFamilyGroupsBtn' || e.target.closest('#manageFamilyGroupsBtn')) {
                e.preventDefault();
                this.showManageFamilyGroupsModal();
                return;
            }

            // 🟢 EMPLOYEE ROW CLICK (View Details)
            if (e.target.closest('.employee-row') || e.target.closest('.view-details-btn')) {
                const row = e.target.closest('.employee-row');
                if (row) {
                    const employeeId = row.getAttribute('data-employee-id');
                    if (employeeId) {
                        this.showEmployeeDetails(employeeId);
                    }
                }
                return;
            }

            // 🟢 VIEW DETAILS BUTTON
            if (e.target.classList.contains('view-details-btn') || e.target.closest('.view-details-btn')) {
                const button = e.target.classList.contains('view-details-btn')
                    ? e.target
                    : e.target.closest('.view-details-btn');
                const employeeId = button.getAttribute('data-employee-id');
                if (employeeId) {
                    this.showEmployeeDetails(employeeId);
                }
                return;
            }

            // 🟡 CLEAR SEARCH BUTTON
            if (e.target.id === 'clearSearchBtn' || e.target.closest('#clearSearchBtn')) {
                e.preventDefault();
                this.clearSearch();
                return;
            }

            // 🔴 MODAL CLOSE BUTTONS
            if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal-cancel')) {
                const modal = e.target.closest('.modal');
                if (modal && this.ui) {
                    this.ui.hideModal(modal.id);
                }
                return;
            }

        } catch (error) {
            console.error('❌ Error in employee manager click handler:', error);
        }
    }

    // ENHANCED: Remove employee from family group with better confirmation
    async handleRemoveFromFamily(employeeId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === employee.family_group_id);
        if (!familyGroup) {
            this.ui.showToast('Employee is not in a family group', 'error');
            return;
        }

        // Check if this is the primary member
        if (familyGroup.primary_member_id === employeeId) {
            this.ui.showToast('Cannot remove primary member from family group. Please assign a new primary member first or delete the entire family group.', 'error');
            return;
        }

        const confirmation = await this.ui.showConfirmation(
            `Remove ${employee.name} from ${familyGroup.family_name}?`,
            `This will remove ${employee.name} from the ${familyGroup.family_name} family group. The employee will no longer be associated with this family.`,
            'Remove from Family',
            'Cancel'
        );

        if (!confirmation) {
            return;
        }

        try {
            await this.db.update('employees', employeeId, {
                family_group_id: null,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast(`${employee.name} removed from ${familyGroup.family_name} family group successfully`, 'success');

            // Reload data
            await this.loadEmployees();

        } catch (error) {
            console.error('Error removing employee from family group:', error);
            this.ui.showToast('Error removing employee from family group: ' + error.message, 'error');
        }
    }

    // NEW: Handle removing family members from management modal
    async handleRemoveFamilyMember(employeeId, familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const employee = this.employees.find(emp => emp.id === employeeId);
        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);

        if (!employee || !familyGroup) {
            this.ui.showToast('Employee or family group not found', 'error');
            return;
        }

        // Check if this is the primary member
        if (familyGroup.primary_member_id === employeeId) {
            this.ui.showToast('Cannot remove primary member. Please assign a new primary member first.', 'error');
            return;
        }

        const confirmation = await this.ui.showConfirmation(
            `Remove ${employee.name} from ${familyGroup.family_name}?`,
            `This will remove ${employee.name} from the family group. The employee will no longer be associated with this family.`,
            'Remove Member',
            'Cancel'
        );

        if (!confirmation) {
            return;
        }

        try {
            await this.db.update('employees', employeeId, {
                family_group_id: null,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast(`${employee.name} removed from family group successfully`, 'success');

            // Reload data and refresh the modal
            await this.loadEmployees();
            this.showManageFamilyMembersModal(familyGroupId); // Refresh the modal

        } catch (error) {
            console.error('Error removing family member:', error);
            this.ui.showToast('Error removing family member: ' + error.message, 'error');
        }
    }

    // ENHANCED: Show modal to manage family members with improved UX
    async showManageFamilyMembersModal(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const familyMembers = this.employees.filter(emp => emp.family_group_id === familyGroupId);
        const primaryMember = this.employees.find(emp => emp.id === familyGroup.primary_member_id);
        const availableEmployees = this.employees.filter(emp =>
            !emp.family_group_id || emp.family_group_id === familyGroupId
        );

        const modalHtml = `
            <div id="manageFamilyMembersModal" class="modal">
                <div class="modal-content" style="max-width: 1000px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-users-cog"></i>
                            Manage Family Members - ${familyGroup.family_name}
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- Family Overview Card -->
                        <div class="family-overview-card">
                            <div class="family-header">
                                <div class="family-avatar">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="family-info">
                                    <h4>${familyGroup.family_name}</h4>
                                    <div class="family-stats">
                                        <span class="stat">
                                            <i class="fas fa-user-shield"></i>
                                            Primary: ${primaryMember ? primaryMember.name : 'Not set'}
                                        </span>
                                        <span class="stat">
                                            <i class="fas fa-users"></i>
                                            Members: ${familyMembers.length}
                                        </span>
                                        <span class="stat">
                                            <i class="fas fa-calendar"></i>
                                            Created: ${this.formatDate(familyGroup.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            ${familyGroup.bank_account_number ? `
                            <div class="bank-info">
                                <i class="fas fa-university"></i>
                                <span>${familyGroup.bank_name || 'Bank'} - ${familyGroup.bank_account_number} ${familyGroup.ifsc_code ? `(${familyGroup.ifsc_code})` : ''}</span>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Quick Actions -->
                        <div class="quick-actions-grid">
                            <button class="quick-action-btn" onclick="app.getManagers().employee.showAddMemberToFamilyModal('${familyGroupId}')">
                                <div class="action-icon add">
                                    <i class="fas fa-user-plus"></i>
                                </div>
                                <span>Add Member</span>
                            </button>
                            <button class="quick-action-btn" onclick="app.getManagers().employee.showFamilyGroupModal('${familyGroupId}')">
                                <div class="action-icon edit">
                                    <i class="fas fa-edit"></i>
                                </div>
                                <span>Edit Family</span>
                            </button>
                            <button class="quick-action-btn" onclick="app.getManagers().employee.exportFamilyGroup('${familyGroupId}')">
                                <div class="action-icon export">
                                    <i class="fas fa-download"></i>
                                </div>
                                <span>Export Data</span>
                            </button>
                        </div>

                        <!-- Members Management Section -->
                        <div class="members-management-section">
                            <div class="section-header">
                                <h4>Family Members (${familyMembers.length})</h4>
                                <div class="member-actions">
                                    <button class="btn-primary btn-sm" onclick="app.getManagers().employee.showAddMemberToFamilyModal('${familyGroupId}')">
                                        <i class="fas fa-user-plus"></i> Add Member
                                    </button>
                                </div>
                            </div>
                            
                            ${familyMembers.length === 0 ? `
                                <div class="no-data-card">
                                    <div class="no-data-icon">
                                        <i class="fas fa-user-times"></i>
                                    </div>
                                    <h4>No Family Members</h4>
                                    <p>This family group doesn't have any members yet.</p>
                                    <button class="btn-primary" onclick="app.getManagers().employee.showAddMemberToFamilyModal('${familyGroupId}')">
                                        <i class="fas fa-user-plus"></i> Add First Member
                                    </button>
                                </div>
                            ` : `
                                <div class="members-grid">
                                    ${familyMembers.map(member => `
                                        <div class="member-card ${member.id === familyGroup.primary_member_id ? 'primary-member' : ''}">
                                            <div class="member-header">
                                                <div class="member-avatar">
                                                    <i class="fas fa-user"></i>
                                                </div>
                                                <div class="member-info">
                                                    <h5>${member.name}</h5>
                                                    <span class="member-id">${member.id}</span>
                                                    <span class="member-role">${member.role}</span>
                                                </div>
                                                ${member.id === familyGroup.primary_member_id ? `
                                                    <div class="primary-badge">
                                                        <i class="fas fa-crown"></i>
                                                        Primary
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div class="member-details">
                                                <div class="detail-item">
                                                    <i class="fas fa-phone"></i>
                                                    <span>${member.phone || 'No phone'}</span>
                                                </div>
                                                <div class="detail-item">
                                                    <i class="fas fa-calendar"></i>
                                                    <span>Joined ${this.formatDate(member.join_date)}</span>
                                                </div>
                                                <div class="detail-item">
                                                    <i class="fas fa-circle status-${member.status || 'active'}"></i>
                                                    <span>${member.status || 'active'}</span>
                                                </div>
                                            </div>
                                            <div class="member-actions">
                                                ${member.id !== familyGroup.primary_member_id ? `
                                                    <button class="btn-danger btn-sm remove-family-member-btn" 
                                                            data-employee-id="${member.id}"
                                                            data-family-id="${familyGroupId}"
                                                            title="Remove from Family">
                                                        <i class="fas fa-user-times"></i> Remove
                                                    </button>
                                                    <button class="btn-warning btn-sm make-primary-btn" 
                                                            data-employee-id="${member.id}"
                                                            data-family-id="${familyGroupId}"
                                                            title="Make Primary Member">
                                                        <i class="fas fa-crown"></i> Make Primary
                                                    </button>
                                                ` : `
                                                    <span class="primary-indicator">Primary Member</span>
                                                `}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>

                        <!-- Change Primary Member Section -->
                        <div class="change-primary-section">
                            <h4>Change Primary Member</h4>
                            <div class="form-group">
                                <select id="newPrimaryMember" class="form-select">
                                    <option value="">Select New Primary Member</option>
                                    ${familyMembers.map(member => `
                                        <option value="${member.id}" ${member.id === familyGroup.primary_member_id ? 'selected disabled' : ''}>
                                            ${member.name} (${member.id}) ${member.id === familyGroup.primary_member_id ? '- Current Primary' : ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <button class="btn-warning" onclick="app.getManagers().employee.updatePrimaryMember('${familyGroupId}')">
                                <i class="fas fa-user-shield"></i> Update Primary Member
                            </button>
                        </div>
                        <!-- Danger Zone -->
${familyMembers.length > 0 ? `
<div class="danger-zone">
    <h4>
        <i class="fas fa-exclamation-triangle"></i>
        Danger Zone
    </h4>
    <div class="danger-zone-content">
        <div class="danger-warning">
            <i class="fas fa-exclamation-circle"></i>
            <div class="warning-text">
                <strong>Delete this family group</strong>
                <p>This will remove all ${familyMembers.length} member${familyMembers.length !== 1 ? 's' : ''} from the family group and delete the family permanently. This action cannot be undone.</p>
            </div>
        </div>
        <button class="btn-danger" onclick="app.getManagers().employee.deleteFamilyGroupFromDetails('${familyGroup.id}')">
            <i class="fas fa-trash"></i> Delete Family Group
        </button>
    </div>
</div>
` : ''}
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeManageFamilyMembers()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="btn-primary" onclick="app.getManagers().employee.showFamilyGroupModal('${familyGroupId}')">
                            <i class="fas fa-edit"></i> Edit Family Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'manageFamilyMembersModal');

        // Add event listeners for the new buttons
        setTimeout(() => {
            document.querySelectorAll('.make-primary-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const employeeId = e.target.closest('.make-primary-btn').getAttribute('data-employee-id');
                    const familyGroupId = e.target.closest('.make-primary-btn').getAttribute('data-family-id');
                    this.updatePrimaryMemberImmediate(familyGroupId, employeeId);
                });
            });
        }, 100);
    }

    // NEW: Update primary member immediately from card button
    async updatePrimaryMemberImmediate(familyGroupId, newPrimaryMemberId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        const newPrimaryMember = this.employees.find(emp => emp.id === newPrimaryMemberId);

        if (!familyGroup || !newPrimaryMember) {
            this.ui.showToast('Family group or member not found', 'error');
            return;
        }

        if (familyGroup.primary_member_id === newPrimaryMemberId) {
            this.ui.showToast('This member is already the primary member', 'warning');
            return;
        }

        const confirmation = await this.ui.showConfirmation(
            'Change Primary Member?',
            `Are you sure you want to make ${newPrimaryMember.name} the primary member of ${familyGroup.family_name}? The current primary member will be demoted to regular member.`,
            'Change Primary',
            'Cancel'
        );

        if (!confirmation) {
            return;
        }

        try {
            await this.db.update('family_groups', familyGroupId, {
                primary_member_id: newPrimaryMemberId,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast(`Primary member updated to ${newPrimaryMember.name}`, 'success');

            // Reload data and refresh modal
            await this.loadFamilyGroups();
            await this.loadEmployees();
            this.showManageFamilyMembersModal(familyGroupId);

        } catch (error) {
            console.error('Error updating primary member:', error);
            this.ui.showToast('Error updating primary member: ' + error.message, 'error');
        }
    }

    // NEW: Show modal to add members to existing family with improved UX
    async showAddMemberToFamilyModal(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const availableEmployees = this.employees.filter(emp =>
            !emp.family_group_id // Only employees without family group
        );

        const modalHtml = `
            <div id="addMemberToFamilyModal" class="modal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-user-plus"></i>
                            Add Member to ${familyGroup.family_name}
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="family-info-banner">
                            <div class="family-avatar">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="family-details">
                                <h4>${familyGroup.family_name}</h4>
                                <p>Select employees to add to this family group</p>
                            </div>
                        </div>

                        ${availableEmployees.length === 0 ? `
                            <div class="no-data-card">
                                <div class="no-data-icon">
                                    <i class="fas fa-user-times"></i>
                                </div>
                                <h4>No Available Employees</h4>
                                <p>All employees are already assigned to family groups.</p>
                                <small>To add employees to this family, first remove them from their current family groups.</small>
                            </div>
                        ` : `
                            <div class="available-employees-section">
                                <h4>Available Employees (${availableEmployees.length})</h4>
                                <div class="employees-search">
                                    <div class="search-box">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="availableEmployeesSearch" placeholder="Search employees by name, ID, or role...">
                                    </div>
                                </div>
                                <div class="available-employees-list">
                                    ${availableEmployees.map(emp => `
                                        <div class="employee-select-card" data-employee-id="${emp.id}">
                                            <div class="employee-checkbox">
                                                <input type="checkbox" id="emp_${emp.id}" value="${emp.id}">
                                            </div>
                                            <div class="employee-info">
                                                <div class="employee-avatar">
                                                    <i class="fas fa-user-tie"></i>
                                                </div>
                                                <div class="employee-details">
                                                    <h5>${emp.name}</h5>
                                                    <div class="employee-meta">
                                                        <span class="employee-id">${emp.id}</span>
                                                        <span class="employee-role">${emp.role}</span>
                                                        <span class="employee-type ${emp.employee_type}">${emp.employee_type}</span>
                                                    </div>
                                                    <div class="employee-contact">
                                                        ${emp.phone ? `<span><i class="fas fa-phone"></i> ${emp.phone}</span>` : ''}
                                                        ${emp.email ? `<span><i class="fas fa-envelope"></i> ${emp.email}</span>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `}
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeAddMemberToFamily()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        ${availableEmployees.length > 0 ? `
                            <button class="btn-primary" onclick="app.getManagers().employee.addSelectedMembersToFamily('${familyGroupId}')">
                                <i class="fas fa-user-plus"></i> Add Selected Members
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'addMemberToFamilyModal');

        // Add search functionality
        setTimeout(() => {
            const searchInput = document.getElementById('availableEmployeesSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const cards = document.querySelectorAll('.employee-select-card');

                    cards.forEach(card => {
                        const employeeId = card.getAttribute('data-employee-id');
                        const employee = this.employees.find(emp => emp.id === employeeId);
                        if (employee) {
                            const matches = employee.name.toLowerCase().includes(searchTerm) ||
                                employee.id.toLowerCase().includes(searchTerm) ||
                                employee.role.toLowerCase().includes(searchTerm);
                            card.style.display = matches ? 'flex' : 'none';
                        }
                    });
                });
            }
        }, 100);
    }

    // NEW: Add multiple selected members to family
    async addSelectedMembersToFamily(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const selectedCheckboxes = document.querySelectorAll('.employee-select-card input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            this.ui.showToast('Please select at least one employee to add', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const selectedEmployeeIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        const selectedEmployees = this.employees.filter(emp => selectedEmployeeIds.includes(emp.id));

        const confirmation = await this.ui.showConfirmation(
            `Add ${selectedEmployees.length} members to ${familyGroup.family_name}?`,
            `This will add ${selectedEmployees.map(emp => emp.name).join(', ')} to the family group.`,
            'Add Members',
            'Cancel'
        );

        if (!confirmation) {
            return;
        }

        try {
            for (const employee of selectedEmployees) {
                await this.db.update('employees', employee.id, {
                    family_group_id: familyGroupId,
                    updated_at: new Date().toISOString()
                });
            }

            this.ui.showToast(`Added ${selectedEmployees.length} members to ${familyGroup.family_name} successfully`, 'success');

            // Close the add modal and refresh the management modal
            this.closeAddMemberToFamily();
            await this.loadEmployees();
            this.showManageFamilyMembersModal(familyGroupId);

        } catch (error) {
            console.error('Error adding members to family:', error);
            this.ui.showToast('Error adding members to family: ' + error.message, 'error');
        }
    }

    // NEW: Export family group data
    async exportFamilyGroup(familyGroupId) {
        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const familyMembers = this.employees.filter(emp => emp.family_group_id === familyGroupId);
        const primaryMember = this.employees.find(emp => emp.id === familyGroup.primary_member_id);

        const exportData = [
            ['Family Group Export', '', '', ''],
            ['Family Name:', familyGroup.family_name, '', ''],
            ['Primary Member:', primaryMember ? `${primaryMember.name} (${primaryMember.id})` : 'Not set', '', ''],
            ['Total Members:', familyMembers.length, '', ''],
            ['Bank Account:', familyGroup.bank_account_number || 'N/A', '', ''],
            ['Bank Name:', familyGroup.bank_name || 'N/A', '', ''],
            ['IFSC Code:', familyGroup.ifsc_code || 'N/A', '', ''],
            ['Created Date:', this.formatDate(familyGroup.created_at), '', ''],
            ['', '', '', ''],
            ['Family Members', '', '', ''],
            ['Employee ID', 'Name', 'Role', 'Phone', 'Status', 'Join Date']
        ];

        familyMembers.forEach(member => {
            exportData.push([
                member.id,
                member.name,
                member.role,
                member.phone || 'N/A',
                member.status || 'active',
                this.formatDate(member.join_date)
            ]);
        });

        try {
            if (window.exportManager) {
                await window.exportManager.exportData(exportData, 'excel', `family_group_${familyGroup.family_name}_${new Date().toISOString().split('T')[0]}`, `${familyGroup.family_name} Family Group`);
            } else {
                Utils.exportToExcel(exportData, `family_group_${familyGroup.family_name}`);
            }
            this.ui.showToast('Family group data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting family group:', error);
            this.ui.showToast('Error exporting family group data', 'error');
        }
    }

    // NEW: Close add member modal
    closeAddMemberToFamily() {
        this.ui.hideModal('addMemberToFamilyModal');
        const modal = document.getElementById('addMemberToFamilyModal');
        if (modal) {
            modal.remove();
        }
    }

    // NEW: Close manage family members modal
    closeManageFamilyMembers() {
        this.ui.hideModal('manageFamilyMembersModal');
        const modal = document.getElementById('manageFamilyMembersModal');
        if (modal) {
            modal.remove();
        }
    }

    // ENHANCED RENDER FUNCTION WITH BETTER FAMILY GROUP MANAGEMENT
    renderEmployeesTable(employees) {
        const tbody = document.getElementById('employeesTableBody');
        if (!tbody) {
            console.error('❌ employeesTableBody not found in DOM');
            return;
        }

        console.log('🎨 Rendering employees table with:', employees.length, 'employees');

        if (employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="no-data">
                        <i class="fas fa-user-tie"></i>
                        <br>
                        ${this.currentSearchTerm ?
                    'No employees found matching your search' :
                    'No employees found'
                }
                        ${this.currentSearchTerm ? `
                            <br>
                            <button class="btn-primary btn-sm" onclick="app.getManagers().employee.clearSearch()" style="margin-top: 10px;">
                                <i class="fas fa-times"></i> Clear Search
                            </button>
                        ` : ''}
                        ${!this.currentSearchTerm ? `
                            <br>
                            <button class="btn-primary btn-sm" onclick="app.getManagers().employee.showAddEmployeeModal()" style="margin-top: 10px;">
                                <i class="fas fa-plus"></i> Add First Employee
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = employees.map(employee => {
            const pendingAdvances = this.calculatePendingAdvances(employee.id);
            const familyGroup = this.familyGroups.find(fg => fg.id === employee.family_group_id);

            return `
                <tr class="employee-row" data-employee-id="${employee.id}">
                    <td><strong>${employee.id || 'N/A'}</strong></td>
                    <td>${employee.name || 'N/A'}</td>
                    <td>${employee.phone || 'N/A'}</td>
                    <td>
                        <span class="badge ${employee.employee_type === 'driver' ? 'badge-driver' : 'badge-employee'}">
                            ${employee.employee_type === 'driver' ? 'Driver' : 'Employee'}
                        </span>
                    </td>
                    <td>
                        <div class="status-container" style="display: flex; align-items: center; gap: 8px;">
                            <span class="status-badge status-${employee.status || 'active'}">
                                ${employee.status || 'active'}
                            </span>
                            <button class="btn-icon status-toggle-btn" 
                                    data-employee-id="${employee.id}"
                                    data-current-status="${employee.status || 'active'}"
                                    title="Toggle Status between Active and Inactive"
                                    type="button">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </td>
                    <td>${employee.role || 'N/A'}</td>
                    <td>${this.formatDate(employee.join_date)}</td>
                    <td>
                        ${familyGroup ?
                    `<div class="family-group-cell">
                                <span class="family-badge" title="${familyGroup.family_name}">
                                    <i class="fas fa-users"></i> ${familyGroup.family_name}
                                </span>
                                ${employee.id !== familyGroup.primary_member_id ? `
                                    <button class="btn-icon remove-family-group-btn" 
                                            data-employee-id="${employee.id}"
                                            title="Remove from Family Group"
                                            type="button">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : `
                                    <span class="primary-badge" title="Primary Member">👑</span>
                                `}
                            </div>` :
                    `<button class="btn-secondary btn-sm assign-family-group-btn" 
                             data-employee-id="${employee.id}"
                             title="Assign to Family Group">
                        <i class="fas fa-user-plus"></i> Assign
                    </button>`
                }
                    </td>
                    <td>${this.formatCurrency(pendingAdvances)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-secondary btn-sm view-details-btn" data-employee-id="${employee.id}" type="button">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.editEmployee('${employee.id}')" type="button">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('✅ Employees table rendered successfully');
    }

    // ENHANCED: Show manage family groups modal with delete functionality
    showManageFamilyGroupsModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const modalHtml = `
            <div id="manageFamilyGroupsModal" class="modal">
                <div class="modal-content" style="max-width: 1200px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> Manage Family Groups</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        ${this.familyGroups.length === 0 ? `
                            <div class="no-data-card">
                                <div class="no-data-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <h4>No Family Groups</h4>
                                <p>You haven't created any family groups yet.</p>
                                <button class="btn-primary" onclick="app.getManagers().employee.showFamilyGroupModal()" style="margin-top: 10px;">
                                    <i class="fas fa-plus"></i> Create First Family Group
                                </button>
                            </div>
                        ` : `
                            <div class="family-groups-header">
                                <div class="summary-stats">
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-users"></i>
                                        </div>
                                        <div class="stat-info">
                                            <div class="stat-value">${this.familyGroups.length}</div>
                                            <div class="stat-label">Total Families</div>
                                        </div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-user-tie"></i>
                                        </div>
                                        <div class="stat-info">
                                            <div class="stat-value">${this.employees.filter(emp => emp.family_group_id).length}</div>
                                            <div class="stat-label">Employees in Families</div>
                                        </div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <div class="stat-info">
                                            <div class="stat-value">${this.employees.filter(emp => !emp.family_group_id).length}</div>
                                            <div class="stat-label">Unassigned Employees</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="family-groups-grid">
                                ${this.familyGroups.map(familyGroup => {
            const primaryMember = this.employees.find(emp => emp.id === familyGroup.primary_member_id);
            const totalMembers = this.employees.filter(emp => emp.family_group_id === familyGroup.id).length;
            const hasBankInfo = familyGroup.bank_account_number || familyGroup.bank_name || familyGroup.ifsc_code;

            return `
                                        <div class="family-group-card">
                                            <div class="family-group-header">
                                                <div class="family-avatar ${totalMembers === 0 ? 'empty' : ''}">
                                                    <i class="fas fa-users"></i>
                                                    ${totalMembers > 0 ? `<span class="member-count">${totalMembers}</span>` : ''}
                                                </div>
                                                <div class="family-group-info">
                                                    <h4>${familyGroup.family_name}</h4>
                                                    <div class="family-group-meta">
                                                        <span class="primary-member">
                                                            <i class="fas fa-user-shield"></i>
                                                            ${primaryMember ? primaryMember.name : 'No primary member'}
                                                        </span>
                                                        <span class="members-count">
                                                            <i class="fas fa-users"></i>
                                                            ${totalMembers} member${totalMembers !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div class="family-group-status ${totalMembers === 0 ? 'empty' : 'active'}">
                                                    ${totalMembers === 0 ? 'Empty' : 'Active'}
                                                </div>
                                            </div>
                                            <div class="family-group-details">
                                                ${hasBankInfo ? `
                                                <div class="bank-info">
                                                    <i class="fas fa-university"></i>
                                                    ${familyGroup.bank_account_number || 'No account'} 
                                                    ${familyGroup.bank_name ? `- ${familyGroup.bank_name}` : ''}
                                                    ${familyGroup.ifsc_code ? `(${familyGroup.ifsc_code})` : ''}
                                                </div>
                                                ` : `
                                                <div class="no-bank-info">
                                                    <i class="fas fa-university"></i>
                                                    No bank information
                                                </div>
                                                `}
                                                <div class="created-date">
                                                    <i class="fas fa-calendar"></i>
                                                    Created ${this.formatDate(familyGroup.created_at)}
                                                </div>
                                            </div>
                                            <div class="family-group-actions">
                                                <button class="btn-secondary btn-sm view-family-group-btn" data-family-id="${familyGroup.id}" title="View Details">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn-secondary btn-sm edit-family-group-btn" data-family-id="${familyGroup.id}" title="Edit Family">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-warning btn-sm manage-members-btn" data-family-id="${familyGroup.id}" title="Manage Members">
                                                    <i class="fas fa-users-cog"></i>
                                                </button>
                                                <button class="btn-danger btn-sm delete-family-group-btn" data-family-id="${familyGroup.id}" title="Delete Family">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        `}
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeManageFamilyGroups()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="btn-primary" onclick="app.getManagers().employee.showFamilyGroupModal()">
                            <i class="fas fa-plus"></i> Create New Family Group
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'manageFamilyGroupsModal');

        // Add event listeners for the new buttons
        setTimeout(() => {
            // Manage members button
            document.querySelectorAll('.manage-members-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const familyGroupId = e.target.closest('.manage-members-btn').getAttribute('data-family-id');
                    this.showManageFamilyMembersModal(familyGroupId);
                });
            });

            // Delete family group button
            document.querySelectorAll('.delete-family-group-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const familyGroupId = e.target.closest('.delete-family-group-btn').getAttribute('data-family-id');
                    this.deleteFamilyGroupWithConfirmation(familyGroupId);
                });
            });
        }, 100);
    }

    // ENHANCED: Delete family group with comprehensive confirmation and proper cleanup
    async deleteFamilyGroupWithConfirmation(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to delete family groups', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const familyMembers = this.employees.filter(emp => emp.family_group_id === familyGroupId);

        // Create confirmation message based on member count
        let confirmationMessage = '';
        let confirmButtonText = 'Delete Family';

        if (familyMembers.length === 0) {
            confirmationMessage = `Are you sure you want to delete the family group "${familyGroup.family_name}"? This family group has no members.`;
            confirmButtonText = 'Delete Empty Family';
        } else {
            const memberNames = familyMembers.slice(0, 3).map(member => member.name).join(', ');
            const moreText = familyMembers.length > 3 ? ` and ${familyMembers.length - 3} more members` : '';
            confirmationMessage = `Are you sure you want to delete the family group "${familyGroup.family_name}"? This will remove <strong>${memberNames}${moreText}</strong> from the family group.`;
            confirmButtonText = `Delete Family (${familyMembers.length} members)`;
        }

        const confirmation = await this.ui.showConfirmation(
            `Delete ${familyGroup.family_name}?`,
            confirmationMessage,
            confirmButtonText,
            'Cancel',
            'warning'
        );

        if (!confirmation) {
            return;
        }

        try {
            // Show loading state
            this.ui.showToast(`Deleting ${familyGroup.family_name}...`, 'info');

            // 🚨 CRITICAL FIX: Remove family group from all employees first
            console.log(`🔄 Removing family group from ${familyMembers.length} employees...`);

            for (const employee of familyMembers) {
                await this.db.update('employees', employee.id, {
                    family_group_id: null,
                    updated_at: new Date().toISOString()
                });
            }

            console.log(`✅ All employees updated, now deleting family group ${familyGroupId}`);

            // 🚨 ADD DELAY to ensure database updates are committed
            await new Promise(resolve => setTimeout(resolve, 500));

            // Delete the family group
            await this.db.delete('family_groups', familyGroupId);

            this.ui.showToast(`Family group "${familyGroup.family_name}" deleted successfully`, 'success');

            // 🚨 CRITICAL: Reload data
            await this.loadFamilyGroups();
            await this.loadEmployees();

            // 🚨 CRITICAL: Refresh the modal
            this.showManageFamilyGroupsModal();

        } catch (error) {
            console.error('❌ Error deleting family group:', error);

            if (error.message.includes('foreign key constraint') || error.message.includes('violates foreign key')) {
                this.ui.showToast('Cannot delete family group: Some employees are still linked. Please refresh and try again.', 'error');

                // Force reload to ensure data consistency
                await this.loadFamilyGroups();
                await this.loadEmployees();
            } else {
                this.ui.showToast('Error deleting family group: ' + error.message, 'error');
            }
        }
    }

    // REAL SOLUTION: Handle missing employees and database constraints
    async deleteFamilyGroupFromDetails(familyGroupId) {
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Admin permissions required for this operation', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const familyMembers = this.employees.filter(emp => emp.family_group_id === familyGroupId);

        const confirmation = await this.ui.showConfirmation(
            `DELETE ${familyGroup.family_name}?`,
            `This will permanently delete the family group. ${familyMembers.length} member${familyMembers.length !== 1 ? 's' : ''} will be unlinked.`,
            `DELETE FAMILY`,
            'Cancel',
            'danger'
        );

        if (!confirmation) return;

        try {
            this.ui.showToast('Deleting family group...', 'info');

            // STEP 1: Remove primary member constraint first
            console.log('🔄 Removing primary member constraint...');
            await this.db.update('family_groups', familyGroupId, {
                primary_member_id: null,
                updated_at: new Date().toISOString()
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            // STEP 2: Unlink ONLY employees that actually exist
            console.log('🔄 Unlinking employees...');
            let successfulUnlinks = 0;

            for (const employee of familyMembers) {
                try {
                    // Check if employee actually exists before trying to update
                    const employeeExists = this.employees.find(emp => emp.id === employee.id);
                    if (!employeeExists) {
                        console.warn(`⚠️ Employee ${employee.id} not found in database, skipping...`);
                        continue;
                    }

                    await this.db.update('employees', employee.id, {
                        family_group_id: null,
                        updated_at: new Date().toISOString()
                    });
                    successfulUnlinks++;
                    console.log(`✅ Unlinked ${employee.id}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to unlink ${employee.id}:`, error.message);
                    // Continue with other employees even if one fails
                }
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            console.log(`✅ Successfully unlinked ${successfulUnlinks} employees`);

            // STEP 3: Try to delete family group
            console.log('🗑️ Deleting family group...');
            try {
                await this.db.delete('family_groups', familyGroupId);
                console.log('✅ Family group deleted successfully');
            } catch (deleteError) {
                console.error('❌ Family group deletion failed:', deleteError);

                // If deletion fails due to constraint, show specific message
                if (deleteError.message.includes('foreign key constraint')) {
                    throw new Error('DATABASE CONSTRAINT: Cannot delete family group. Some employees are still linked in the database. Please contact database administrator.');
                }
                throw deleteError;
            }

            // STEP 4: Verify deletion and update UI
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.loadFamilyGroups();

            const familyGroupStillExists = this.familyGroups.find(fg => fg.id === familyGroupId);
            if (familyGroupStillExists) {
                throw new Error('Family group still exists after deletion. Please refresh and try again.');
            }

            // SUCCESS
            this.ui.showToast(`Family group "${familyGroup.family_name}" deleted successfully`, 'success');

            this.closeFamilyGroupDetails();
            this.closeManageFamilyMembers();

            await this.loadFamilyGroups();
            await this.loadEmployees();

        } catch (error) {
            console.error('💥 Deletion failed:', error);

            if (error.message.includes('DATABASE CONSTRAINT')) {
                this.ui.showToast(error.message, 'error');
            } else if (error.message.includes('foreign key')) {
                this.ui.showToast('Database constraint error. Cannot delete family group while employees are linked.', 'error');
            } else {
                this.ui.showToast('Error deleting family group: ' + error.message, 'error');
            }

            await this.loadFamilyGroups();
            await this.loadEmployees();
        }
    }

    // ENHANCED: Show family group details with delete option
    showFamilyGroupDetails(familyGroupId) {
        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        const primaryMember = this.employees.find(emp => emp.id === familyGroup.primary_member_id);
        const familyMembers = this.employees.filter(emp => emp.family_group_id === familyGroupId);

        const modalHtml = `
            <div id="familyGroupDetailsModal" class="modal">
                <div class="modal-content" style="max-width: 1000px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> Family Group Details - ${familyGroup.family_name}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="family-details-container">
                        <!-- Family Overview -->
                        <div class="family-overview-card">
                            <div class="family-header">
                                <div class="family-avatar large ${familyMembers.length === 0 ? 'empty' : ''}">
                                    <i class="fas fa-users"></i>
                                    ${familyMembers.length > 0 ? `<span class="member-count">${familyMembers.length}</span>` : ''}
                                </div>
                                <div class="family-info">
                                    <h4>${familyGroup.family_name}</h4>
                                    <div class="family-stats">
                                        <span class="stat">
                                            <i class="fas fa-user-shield"></i>
                                            Primary: ${primaryMember ? primaryMember.name : 'Not set'}
                                        </span>
                                        <span class="stat">
                                            <i class="fas fa-users"></i>
                                            Members: ${familyMembers.length}
                                        </span>
                                        <span class="stat">
                                            <i class="fas fa-calendar"></i>
                                            Created: ${this.formatDate(familyGroup.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <div class="family-status ${familyMembers.length === 0 ? 'empty' : 'active'}">
                                    ${familyMembers.length === 0 ? 'Empty Family' : 'Active Family'}
                                </div>
                            </div>
                            ${familyGroup.bank_account_number ? `
                            <div class="bank-info">
                                <i class="fas fa-university"></i>
                                <span>${familyGroup.bank_name || 'Bank'} - ${familyGroup.bank_account_number} ${familyGroup.ifsc_code ? `(${familyGroup.ifsc_code})` : ''}</span>
                            </div>
                            ` : `
                            <div class="no-bank-info">
                                <i class="fas fa-university"></i>
                                <span>No bank information provided</span>
                            </div>
                            `}
                        </div>

                        <!-- Quick Actions -->
                        <div class="quick-actions-grid">
                            <button class="quick-action-btn" onclick="app.getManagers().employee.showManageFamilyMembersModal('${familyGroup.id}')">
                                <div class="action-icon members">
                                    <i class="fas fa-users-cog"></i>
                                </div>
                                <span>Manage Members</span>
                            </button>
                            <button class="quick-action-btn" onclick="app.getManagers().employee.showFamilyGroupModal('${familyGroup.id}')">
                                <div class="action-icon edit">
                                    <i class="fas fa-edit"></i>
                                </div>
                                <span>Edit Family</span>
                            </button>
                            <button class="quick-action-btn" onclick="app.getManagers().employee.exportFamilyGroup('${familyGroup.id}')">
                                <div class="action-icon export">
                                    <i class="fas fa-download"></i>
                                </div>
                                <span>Export Data</span>
                            </button>
                            ${familyMembers.length === 0 ? `
                            <button class="quick-action-btn danger" onclick="app.getManagers().employee.deleteFamilyGroupFromDetails('${familyGroup.id}')">
                                <div class="action-icon delete">
                                    <i class="fas fa-trash"></i>
                                </div>
                                <span>Delete Family</span>
                            </button>
                            ` : ''}
                        </div>

                        <!-- Members Section -->
                        <div class="details-section">
                            <div class="section-header">
                                <h4>Family Members (${familyMembers.length})</h4>
                                <button class="btn-primary btn-sm" onclick="app.getManagers().employee.showAddMemberToFamilyModal('${familyGroup.id}')">
                                    <i class="fas fa-user-plus"></i> Add Member
                                </button>
                            </div>
                            
                            ${familyMembers.length === 0 ? `
                                <div class="no-data-card">
                                    <div class="no-data-icon">
                                        <i class="fas fa-user-times"></i>
                                    </div>
                                    <h4>No Family Members</h4>
                                    <p>This family group doesn't have any members yet.</p>
                                    <div class="no-data-actions">
                                        <button class="btn-primary" onclick="app.getManagers().employee.showAddMemberToFamilyModal('${familyGroup.id}')">
                                            <i class="fas fa-user-plus"></i> Add First Member
                                        </button>
                                        <button class="btn-danger" onclick="app.getManagers().employee.deleteFamilyGroupFromDetails('${familyGroup.id}')">
                                            <i class="fas fa-trash"></i> Delete Empty Family
                                        </button>
                                    </div>
                                </div>
                            ` : `
                                <div class="members-grid compact">
                                    ${familyMembers.map(member => `
                                        <div class="member-card compact ${member.id === familyGroup.primary_member_id ? 'primary-member' : ''}">
                                            <div class="member-header">
                                                <div class="member-avatar">
                                                    <i class="fas fa-user"></i>
                                                </div>
                                                <div class="member-info">
                                                    <h5>${member.name}</h5>
                                                    <span class="member-id">${member.id}</span>
                                                    <span class="member-role">${member.role}</span>
                                                </div>
                                                ${member.id === familyGroup.primary_member_id ? `
                                                    <div class="primary-badge">
                                                        <i class="fas fa-crown"></i>
                                                        Primary
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div class="member-details">
                                                <div class="detail-item">
                                                    <i class="fas fa-phone"></i>
                                                    <span>${member.phone || 'No phone'}</span>
                                                </div>
                                                <div class="detail-item">
                                                    <i class="fas fa-circle status-${member.status || 'active'}"></i>
                                                    <span>${member.status || 'active'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>

                        <!-- Danger Zone -->
${familyMembers.length > 0 ? `
<div class="danger-zone">
    <h4>
        <i class="fas fa-exclamation-triangle"></i>
        Danger Zone
    </h4>
    <div class="danger-zone-content">
        <div class="danger-warning">
            <i class="fas fa-exclamation-circle"></i>
            <div class="warning-text">
                <strong>Delete this family group</strong>
                <p>This will remove all ${familyMembers.length} member${familyMembers.length !== 1 ? 's' : ''} from the family group and delete the family permanently. This action cannot be undone.</p>
            </div>
        </div>
        <button class="btn-danger" onclick="app.getManagers().employee.deleteFamilyGroupFromDetails('${familyGroup.id}')">
            <i class="fas fa-trash"></i> Delete Family Group
        </button>
    </div>
</div>
` : ''}
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeFamilyGroupDetails()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="btn-primary" onclick="app.getManagers().employee.editFamilyGroup('${familyGroup.id}')">
                            <i class="fas fa-edit"></i> Edit Family
                        </button>
                        <button class="btn-warning" onclick="app.getManagers().employee.showManageFamilyMembersModal('${familyGroup.id}')">
                            <i class="fas fa-users-cog"></i> Manage Members
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'familyGroupDetailsModal');
    }

    // ENHANCED: Delete empty family groups in bulk
    async deleteEmptyFamilyGroups() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to delete family groups', 'error');
            return;
        }

        const emptyFamilyGroups = this.familyGroups.filter(familyGroup => {
            const members = this.employees.filter(emp => emp.family_group_id === familyGroup.id);
            return members.length === 0;
        });

        if (emptyFamilyGroups.length === 0) {
            this.ui.showToast('No empty family groups found', 'info');
            return;
        }

        const confirmation = await this.ui.showConfirmation(
            'Delete Empty Family Groups?',
            `This will permanently delete ${emptyFamilyGroups.length} empty family group${emptyFamilyGroups.length !== 1 ? 's' : ''}. This action cannot be undone.`,
            `Delete ${emptyFamilyGroups.length} Empty Families`,
            'Cancel',
            'danger'
        );

        if (!confirmation) {
            return;
        }

        try {
            this.ui.showToast(`Deleting ${emptyFamilyGroups.length} empty family groups...`, 'info');

            for (const familyGroup of emptyFamilyGroups) {
                await this.db.delete('family_groups', familyGroup.id);
            }

            this.ui.showToast(`Successfully deleted ${emptyFamilyGroups.length} empty family groups`, 'success');

            // Reload data
            await this.loadFamilyGroups();
            await this.loadEmployees();

            // Refresh the modal if it's open
            const modal = document.getElementById('manageFamilyGroupsModal');
            if (modal) {
                this.showManageFamilyGroupsModal();
            }

        } catch (error) {
            console.error('Error deleting empty family groups:', error);
            this.ui.showToast('Error deleting empty family groups: ' + error.message, 'error');
        }
    }

    // Add bulk delete option to manage family groups modal
    showFamilyManagementTools() {
        const emptyFamilyCount = this.familyGroups.filter(fg => {
            const members = this.employees.filter(emp => emp.family_group_id === fg.id);
            return members.length === 0;
        }).length;

        const modalHtml = `
            <div id="familyManagementToolsModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-tools"></i> Family Management Tools</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="tools-grid">
                            <div class="tool-card">
                                <div class="tool-icon danger">
                                    <i class="fas fa-trash"></i>
                                </div>
                                <div class="tool-info">
                                    <h4>Delete Empty Families</h4>
                                    <p>Remove all family groups that have no members</p>
                                    <div class="tool-stats">
                                        <span class="stat">${emptyFamilyCount} empty families found</span>
                                    </div>
                                </div>
                                <button class="btn-danger" onclick="app.getManagers().employee.deleteEmptyFamilyGroups()" ${emptyFamilyCount === 0 ? 'disabled' : ''}>
                                    Clean Up
                                </button>
                            </div>

                            <div class="tool-card">
                                <div class="tool-icon export">
                                    <i class="fas fa-download"></i>
                                </div>
                                <div class="tool-info">
                                    <h4>Export All Families</h4>
                                    <p>Download complete family data including all members</p>
                                    <div class="tool-stats">
                                        <span class="stat">${this.familyGroups.length} total families</span>
                                    </div>
                                </div>
                                <button class="btn-primary" onclick="app.getManagers().employee.exportAllFamilyGroups()">
                                    Export All
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeFamilyManagementTools()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'familyManagementToolsModal');
    }

    // Export all family groups
    async exportAllFamilyGroups() {
        try {
            const exportData = [
                ['All Family Groups Export', '', '', '', ''],
                ['Export Date:', new Date().toLocaleDateString(), '', '', ''],
                ['Total Families:', this.familyGroups.length, '', '', ''],
                ['Total Employees in Families:', this.employees.filter(emp => emp.family_group_id).length, '', '', ''],
                ['', '', '', '', ''],
                ['Family Groups', '', '', '', ''],
                ['Family Name', 'Primary Member', 'Total Members', 'Bank Account', 'Created Date']
            ];

            this.familyGroups.forEach(familyGroup => {
                const primaryMember = this.employees.find(emp => emp.id === familyGroup.primary_member_id);
                const totalMembers = this.employees.filter(emp => emp.family_group_id === familyGroup.id).length;

                exportData.push([
                    familyGroup.family_name,
                    primaryMember ? `${primaryMember.name} (${primaryMember.id})` : 'Not set',
                    totalMembers,
                    familyGroup.bank_account_number || 'N/A',
                    this.formatDate(familyGroup.created_at)
                ]);

                // Add members for this family
                if (totalMembers > 0) {
                    exportData.push(['', 'Family Members:', '', '', '']);
                    exportData.push(['Employee ID', 'Name', 'Role', 'Phone', 'Status']);

                    const familyMembers = this.employees.filter(emp => emp.family_group_id === familyGroup.id);
                    familyMembers.forEach(member => {
                        exportData.push([
                            member.id,
                            member.name,
                            member.role,
                            member.phone || 'N/A',
                            member.status || 'active'
                        ]);
                    });

                    exportData.push(['', '', '', '', '']);
                }
            });

            if (window.exportManager) {
                await window.exportManager.exportData(exportData, 'excel', `all_family_groups_${new Date().toISOString().split('T')[0]}`, 'All Family Groups Export');
            } else {
                Utils.exportToExcel(exportData, `all_family_groups`);
            }
            this.ui.showToast('All family groups exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting all family groups:', error);
            this.ui.showToast('Error exporting family groups data', 'error');
        }
    }

    closeFamilyManagementTools() {
        this.ui.hideModal('familyManagementToolsModal');
        const modal = document.getElementById('familyManagementToolsModal');
        if (modal) {
            modal.remove();
        }
    }

    // ENHANCED: Close family group details modal
    closeFamilyGroupDetails() {
        const modal = document.getElementById('familyGroupDetailsModal');
        if (modal) {
            this.ui.hideModal('familyGroupDetailsModal');
            // 🚨 Force remove from DOM to prevent stale data
            modal.remove();
        }
    }

    // ENHANCED: Close manage family groups modal
    closeManageFamilyGroups() {
        const modal = document.getElementById('manageFamilyGroupsModal');
        if (modal) {
            this.ui.hideModal('manageFamilyGroupsModal');
            // 🚨 Force remove from DOM to prevent stale data
            modal.remove();
        }
    }

    async handleStatusToggle(employeeId, currentStatus) {
        console.log('🔄 Toggling status for employee:', employeeId, 'Current status:', currentStatus);

        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to update employee status', 'error');
            return;
        }

        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            console.log('📝 Updating employee status to:', newStatus);

            // Show loading state on the button
            const button = document.querySelector(`.status-toggle-btn[data-employee-id="${employeeId}"]`);
            if (button) {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                button.disabled = true;
            }

            await this.db.update('employees', employeeId, {
                status: newStatus,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast(`Employee status updated to ${newStatus}`, 'success');

            // Update the local data
            const employeeIndex = this.employees.findIndex(emp => emp.id === employeeId);
            if (employeeIndex !== -1) {
                this.employees[employeeIndex].status = newStatus;
                this.employees[employeeIndex].updated_at = new Date().toISOString();
            }

            // Re-render the table
            this.renderEmployeesTable(this.currentSearchTerm ? this.filteredEmployees : this.employees);

        } catch (error) {
            console.error('Error updating employee status:', error);
            this.ui.showToast('Error updating employee status: ' + error.message, 'error');

            // Reset button state on error
            const button = document.querySelector(`.status-toggle-btn[data-employee-id="${employeeId}"]`);
            if (button) {
                button.innerHTML = '<i class="fas fa-sync-alt"></i>';
                button.disabled = false;
            }
        }
    }

    removeEventListeners() {
        document.removeEventListener('click', this.handleGlobalClick);

        const employeeForm = document.getElementById('employeeForm');
        if (employeeForm) {
            employeeForm.removeEventListener('submit', this.handleEmployeeSubmit);
        }

        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.removeEventListener('input', this.debouncedSearch);
        }
    }

    showAddEmployeeModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage employees', 'error');
            return;
        }

        this.ui.showModal('employeeModal');
        document.getElementById('employeeModalTitle').textContent = 'Add Employee';

        const form = document.getElementById('employeeForm');
        if (form) {
            form.reset();
        }

        document.getElementById('editEmployeeId').value = '';

        // Set default join date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('employeeJoinDate').value = today;

        // Initialize employee type
        this.handleEmployeeTypeChange('employee');
    }

    handleEmployeeTypeChange(type) {
        const vehicleField = document.getElementById('vehicleNumberField');
        if (!vehicleField) return;

        if (type === 'driver') {
            vehicleField.style.display = 'block';
            const vehicleInput = document.getElementById('employeeVehicleNumber');
            if (vehicleInput) {
                vehicleInput.required = true;
            }
        } else {
            vehicleField.style.display = 'none';
            const vehicleInput = document.getElementById('employeeVehicleNumber');
            if (vehicleInput) {
                vehicleInput.required = false;
                vehicleInput.value = '';
            }
        }
    }

    async editEmployee(employeeId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to edit employees', 'error');
            return;
        }

        try {
            const employee = this.employees.find(emp => emp.id === employeeId);

            if (employee) {
                document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
                document.getElementById('editEmployeeId').value = employee.id;
                document.getElementById('employeeName').value = employee.name || '';
                document.getElementById('employeePhone').value = employee.phone || '';
                document.getElementById('employeeEmail').value = employee.email || '';
                document.getElementById('employeeRole').value = employee.role || '';
                document.getElementById('employeeJoinDate').value = employee.join_date || new Date().toISOString().split('T')[0];

                // Set employee type
                const employeeType = employee.employee_type || 'employee';
                const typeRadio = document.querySelector(`input[name="employeeType"][value="${employeeType}"]`);
                if (typeRadio) {
                    typeRadio.checked = true;
                }
                this.handleEmployeeTypeChange(employeeType);

                // Set vehicle number for drivers
                if (employeeType === 'driver') {
                    document.getElementById('employeeVehicleNumber').value = employee.vehicle_number || '';
                }

                // Set salary type
                const salaryType = employee.salary_type || 'daily';
                const salaryRadio = document.querySelector(`input[name="salaryType"][value="${salaryType}"]`);
                if (salaryRadio) {
                    salaryRadio.checked = true;
                }

                this.ui.showModal('employeeModal');
            } else {
                this.ui.showToast('Employee not found', 'error');
            }
        } catch (error) {
            console.error('Error loading employee:', error);
            this.ui.showToast('Error loading employee', 'error');
        }
    }

    async handleEmployeeSubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage employees', 'error');
            return;
        }

        const employeeId = document.getElementById('editEmployeeId').value;
        const name = document.getElementById('employeeName').value.trim();
        const phone = document.getElementById('employeePhone').value.trim();
        const email = document.getElementById('employeeEmail').value.trim();
        const role = document.getElementById('employeeRole').value.trim();
        const joinDate = document.getElementById('employeeJoinDate').value;
        const employeeType = document.querySelector('input[name="employeeType"]:checked')?.value || 'employee';
        const salaryType = document.querySelector('input[name="salaryType"]:checked')?.value || 'daily';
        const vehicleNumber = document.getElementById('employeeVehicleNumber').value.trim();

        // Validation
        if (!name) {
            this.ui.showToast('Employee name is required', 'error');
            return;
        }

        if (!role) {
            this.ui.showToast('Employee role is required', 'error');
            return;
        }

        if (!joinDate) {
            this.ui.showToast('Join date is required', 'error');
            return;
        }

        if (employeeType === 'driver' && !vehicleNumber) {
            this.ui.showToast('Vehicle number is required for drivers', 'error');
            return;
        }

        if (email && !this.validateEmail(email)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const employeeData = {
                name: this.sanitizeInput(name),
                phone: phone ? this.sanitizeInput(phone) : null,
                email: email ? this.sanitizeInput(email) : null,
                role: this.sanitizeInput(role),
                employee_type: employeeType,
                salary_type: salaryType,
                join_date: joinDate,
                status: 'active',
                updated_at: new Date().toISOString()
            };

            if (employeeType === 'driver') {
                employeeData.vehicle_number = this.sanitizeInput(vehicleNumber);
            } else {
                employeeData.vehicle_number = null;
            }

            if (employeeId) {
                // Update existing employee
                await this.db.update('employees', employeeId, employeeData);
                this.ui.showToast('Employee updated successfully', 'success');
            } else {
                // Create new employee
                employeeData.id = this.generateEmployeeId(employeeType, this.employees);
                employeeData.created_at = new Date().toISOString();
                await this.db.create('employees', employeeData);
                this.ui.showToast('Employee created successfully', 'success');
            }

            this.ui.hideModal('employeeModal');
            await this.loadEmployees();

        } catch (error) {
            console.error('Error saving employee:', error);
            this.ui.showToast('Error saving employee: ' + error.message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    handleSearch(searchTerm) {
        console.log('🔍 Handling search:', searchTerm);
        this.currentSearchTerm = searchTerm.toLowerCase().trim();

        if (this.currentSearchTerm === '') {
            this.clearSearch();
            return;
        }

        this.filteredEmployees = this.employees.filter(employee =>
            this.employeeMatchesSearch(employee, this.currentSearchTerm)
        );

        this.renderEmployeesTable(this.filteredEmployees);
        this.updateSearchResultsCount();
    }

    employeeMatchesSearch(employee, searchTerm) {
        if (!searchTerm) return true;

        const searchFields = [
            employee.id?.toLowerCase(),
            employee.name?.toLowerCase(),
            employee.phone?.toLowerCase(),
            employee.role?.toLowerCase(),
            employee.employee_type?.toLowerCase(),
            employee.vehicle_number?.toLowerCase()
        ];

        return searchFields.some(field =>
            field && field.includes(searchTerm)
        );
    }

    clearSearch() {
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.value = '';
        }

        this.currentSearchTerm = '';
        this.filteredEmployees = [];
        this.renderEmployeesTable(this.employees);
        this.updateSearchResultsCount();
    }

    updateSearchResultsCount() {
        const resultsCount = document.getElementById('searchResultsCount');
        if (!resultsCount) return;

        const totalEmployees = this.employees.length;
        const showingEmployees = this.currentSearchTerm ? this.filteredEmployees.length : totalEmployees;

        if (this.currentSearchTerm) {
            resultsCount.innerHTML = `
                <span>
                    Showing ${showingEmployees} of ${totalEmployees} employees
                    <span class="search-term">for "${this.currentSearchTerm}"</span>
                </span>
                <button id="clearSearchBtn" class="btn-secondary btn-sm">
                    <i class="fas fa-times"></i> Clear Search
                </button>
            `;
        } else {
            resultsCount.innerHTML = `Showing all ${totalEmployees} employees`;
        }
    }

    calculatePendingAdvances(employeeId) {
        const employeeAdvances = this.simpleAdvances.filter(advance =>
            advance.employee_id === employeeId && !advance.paid
        );

        return employeeAdvances.reduce((total, advance) =>
            total + (parseFloat(advance.amount) || 0), 0
        );
    }

    generateEmployeeId(employeeType, existingEmployees) {
        const prefix = employeeType === 'driver' ? 'DR' : 'EMP';
        const sameTypeEmployees = existingEmployees.filter(emp =>
            emp.employee_type === employeeType &&
            emp.id &&
            emp.id.startsWith(prefix)
        );

        const numbers = sameTypeEmployees.map(emp => {
            const match = emp.id.match(new RegExp(`^${prefix}(\\d+)$`));
            return match ? parseInt(match[1]) : 0;
        }).filter(num => num > 0);

        const highestNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNumber = highestNumber + 1;

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    populateEmployeeSelect(employees) {
        const select = document.getElementById('salaryEmployee');
        if (!select) return;

        const activeEmployees = employees.filter(emp => emp.status === 'active');

        select.innerHTML = '<option value="">Select Employee</option>' +
            activeEmployees.map(emp => `
                <option value="${emp.id}">
                    ${emp.id} - ${emp.name} - ${emp.role}
                </option>
            `).join('');
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN');
        } catch (e) {
            return 'Invalid Date';
        }
    }

    formatCurrency(amount) {
        if (!amount) return '₹0';
        return '₹' + parseInt(amount).toLocaleString('en-IN');
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>&"']/g, '');
    }

    // ENHANCED EMPLOYEE DETAILS MODAL
    async showEmployeeDetails(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === employee.family_group_id);
        const familyMembers = this.employees.filter(emp =>
            emp.family_group_id === employee.family_group_id && emp.id !== employee.id
        );

        const modalHtml = `
            <div id="employeeDetailsModal" class="modal">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-user-tie"></i>
                            Employee Details - ${employee.name}
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="employee-details-container">
                        <div class="employee-overview-card">
                            <div class="employee-header">
                                <div class="employee-avatar large">
                                    <i class="fas fa-user-tie"></i>
                                </div>
                                <div class="employee-info">
                                    <h4>${employee.name}</h4>
                                    <div class="employee-meta">
                                        <span class="employee-id">${employee.id}</span>
                                        <span class="employee-role">${employee.role}</span>
                                        <span class="employee-type ${employee.employee_type}">${employee.employee_type}</span>
                                    </div>
                                    <div class="employee-stats">
                                        <span class="stat">
                                            <i class="fas fa-calendar"></i>
                                            Joined: ${this.formatDate(employee.join_date)}
                                        </span>
                                        <span class="stat">
                                            <i class="fas fa-circle status-${employee.status || 'active'}"></i>
                                            ${employee.status || 'active'}
                                        </span>
                                        ${employee.phone ? `
                                        <span class="stat">
                                            <i class="fas fa-phone"></i>
                                            ${employee.phone}
                                        </span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${familyGroup ? `
                        <div class="family-section">
                            <h4>Family Group</h4>
                            <div class="family-card">
                                <div class="family-header">
                                    <div class="family-avatar">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <div class="family-info">
                                        <h5>${familyGroup.family_name}</h5>
                                        <div class="family-meta">
                                            <span class="member-role ${employee.id === familyGroup.primary_member_id ? 'primary' : 'member'}">
                                                ${employee.id === familyGroup.primary_member_id ? 'Primary Member' : 'Family Member'}
                                            </span>
                                            <span class="members-count">${familyMembers.length + 1} members</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="family-actions">
                                    <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.showFamilyGroupDetails('${familyGroup.id}')">
                                        <i class="fas fa-eye"></i> View Family
                                    </button>
                                    ${employee.id !== familyGroup.primary_member_id ? `
                                    <button class="btn-danger btn-sm" onclick="app.getManagers().employee.handleRemoveFromFamily('${employee.id}')">
                                        <i class="fas fa-user-times"></i> Leave Family
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <div class="quick-actions-section">
                            <h4>Quick Actions</h4>
                            <div class="quick-actions-grid">
                                <button class="quick-action-btn" onclick="app.getManagers().employee.editEmployee('${employee.id}')">
                                    <div class="action-icon edit">
                                        <i class="fas fa-edit"></i>
                                    </div>
                                    <span>Edit Employee</span>
                                </button>
                                <button class="quick-action-btn" onclick="app.getManagers().attendance.showQuickAttendanceModal('${employee.id}')">
                                    <div class="action-icon attendance">
                                        <i class="fas fa-calendar-check"></i>
                                    </div>
                                    <span>Mark Attendance</span>
                                </button>
                                <button class="quick-action-btn" onclick="app.getManagers().salary.showAdvanceModal('${employee.id}')">
                                    <div class="action-icon advance">
                                        <i class="fas fa-money-bill-wave"></i>
                                    </div>
                                    <span>Add Advance</span>
                                </button>
                                ${!familyGroup ? `
                                <button class="quick-action-btn" onclick="app.getManagers().employee.showAddToFamilyModal('${employee.id}')">
                                    <div class="action-icon family">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <span>Add to Family</span>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeEmployeeDetails()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'employeeDetailsModal');
    }

    closeEmployeeDetails() {
        this.ui.hideModal('employeeDetailsModal');
        const modal = document.getElementById('employeeDetailsModal');
        if (modal) {
            modal.remove();
        }
    }

    // ENHANCED FAMILY GROUP MODAL WITH BETTER EMPLOYEE SELECTION
    showFamilyGroupModal(familyGroupId = null) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const isEdit = !!familyGroupId;
        const familyGroup = isEdit ? this.familyGroups.find(fg => fg.id === familyGroupId) : null;

        // Get available employees (those without family group or already in this group)
        const availableEmployees = this.employees.filter(emp =>
            !emp.family_group_id || (isEdit && emp.family_group_id === familyGroupId)
        );

        const modalHtml = `
            <div id="familyGroupModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> ${isEdit ? 'Edit' : 'Create'} Family Group</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="familyGroupForm" class="modal-form">
                        <input type="hidden" id="familyGroupId" value="${familyGroup?.id || ''}">
                        <div class="form-group">
                            <label>Family Name *</label>
                            <input type="text" id="familyName" required placeholder="Enter family name" value="${familyGroup?.family_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Primary Member *</label>
                            <select id="primaryMemberId" required>
                                <option value="">Select Primary Member</option>
                                ${availableEmployees.map(emp => `
                                    <option value="${emp.id}" ${familyGroup?.primary_member_id === emp.id ? 'selected' : ''}>
                                        ${emp.name} (${emp.id}) - ${emp.role}
                                    </option>
                                `).join('')}
                            </select>
                            <small class="form-help">Primary member will be automatically added to this family group</small>
                        </div>
                        <div class="form-group">
                            <label>Bank Account Number</label>
                            <input type="text" id="bankAccountNumber" placeholder="Enter account number" value="${familyGroup?.bank_account_number || ''}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Bank Name</label>
                                <input type="text" id="bankName" placeholder="Enter bank name" value="${familyGroup?.bank_name || ''}">
                            </div>
                            <div class="form-group">
                                <label>IFSC Code</label>
                                <input type="text" id="ifscCode" placeholder="Enter IFSC code" value="${familyGroup?.ifsc_code || ''}">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'} Family Group</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'familyGroupModal');

        // Add form submit handler
        const form = document.getElementById('familyGroupForm');
        if (form) {
            // Remove existing listener to avoid duplicates
            form.removeEventListener('submit', this.handleFamilyGroupSubmit);
            form.addEventListener('submit', (e) => this.handleFamilyGroupSubmit(e, isEdit));
        }
    }

    async handleFamilyGroupSubmit(e, isEdit = false) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const formData = {
            family_name: document.getElementById('familyName').value.trim(),
            primary_member_id: document.getElementById('primaryMemberId').value,
            bank_account_number: document.getElementById('bankAccountNumber').value.trim(),
            bank_name: document.getElementById('bankName').value.trim(),
            ifsc_code: document.getElementById('ifscCode').value.trim()
        };

        const familyGroupId = document.getElementById('familyGroupId')?.value;

        // Validation
        if (!formData.family_name) {
            this.ui.showToast('Family name is required', 'error');
            return;
        }

        if (!formData.primary_member_id) {
            this.ui.showToast('Primary member is required', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEdit ? 'Updating...' : 'Creating...'}`;

            if (isEdit && familyGroupId) {
                await this.updateFamilyGroup(familyGroupId, formData);
            } else {
                await this.createFamilyGroup(formData);
            }

            this.ui.hideModal('familyGroupModal');

        } catch (error) {
            console.error('Error saving family group:', error);
            // Error handling is done in create/update methods
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    // ENHANCED FAMILY GROUP CREATION WITH BETTER ERROR HANDLING
    async createFamilyGroup(familyData) {
        try {
            const familyId = `FAM_${Date.now()}`;

            const groupData = {
                id: familyId,
                family_name: familyData.family_name,
                primary_member_id: familyData.primary_member_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Add optional bank fields
            if (familyData.bank_account_number) {
                groupData.bank_account_number = familyData.bank_account_number;
            }
            if (familyData.bank_name) {
                groupData.bank_name = familyData.bank_name;
            }
            if (familyData.ifsc_code) {
                groupData.ifsc_code = familyData.ifsc_code;
            }

            await this.db.create('family_groups', groupData);

            // Update the primary member's family group association
            if (familyData.primary_member_id) {
                await this.db.update('employees', familyData.primary_member_id, {
                    family_group_id: familyId,
                    updated_at: new Date().toISOString()
                });
            }

            this.ui.showToast('Family group created successfully', 'success');

            // Reload data to ensure consistency
            await this.loadFamilyGroups();
            await this.loadEmployees();

            return familyId;
        } catch (error) {
            console.error('Error creating family group:', error);
            this.ui.showToast('Error creating family group: ' + error.message, 'error');
            throw error;
        }
    }

    async updateFamilyGroup(familyGroupId, familyData) {
        try {
            const updateData = {
                family_name: familyData.family_name,
                primary_member_id: familyData.primary_member_id,
                updated_at: new Date().toISOString()
            };

            // Add optional bank fields
            if (familyData.bank_account_number) {
                updateData.bank_account_number = familyData.bank_account_number;
            } else {
                updateData.bank_account_number = null;
            }
            if (familyData.bank_name) {
                updateData.bank_name = familyData.bank_name;
            } else {
                updateData.bank_name = null;
            }
            if (familyData.ifsc_code) {
                updateData.ifsc_code = familyData.ifsc_code;
            } else {
                updateData.ifsc_code = null;
            }

            await this.db.update('family_groups', familyGroupId, updateData);

            // Update primary member if changed
            const existingGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
            if (existingGroup && existingGroup.primary_member_id !== familyData.primary_member_id) {
                // Remove family group from old primary member
                await this.db.update('employees', existingGroup.primary_member_id, {
                    family_group_id: null,
                    updated_at: new Date().toISOString()
                });

                // Add family group to new primary member
                await this.db.update('employees', familyData.primary_member_id, {
                    family_group_id: familyGroupId,
                    updated_at: new Date().toISOString()
                });
            }

            this.ui.showToast('Family group updated successfully', 'success');

            // Reload data
            await this.loadFamilyGroups();
            await this.loadEmployees();

        } catch (error) {
            console.error('Error updating family group:', error);
            this.ui.showToast('Error updating family group: ' + error.message, 'error');
            throw error;
        }
    }

    async deleteFamilyGroup(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to delete family groups', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        // Check if there are employees in this family group
        const employeesInGroup = this.employees.filter(emp => emp.family_group_id === familyGroupId);

        if (employeesInGroup.length > 0) {
            const confirmMessage = `This family group has ${employeesInGroup.length} employee(s). Are you sure you want to delete it? This will remove all employees from the family group.`;

            if (!confirm(confirmMessage)) {
                return;
            }
        }

        try {
            // Remove family group from all employees
            for (const employee of employeesInGroup) {
                await this.db.update('employees', employee.id, {
                    family_group_id: null,
                    updated_at: new Date().toISOString()
                });
            }

            // Delete the family group
            await this.db.delete('family_groups', familyGroupId);

            this.ui.showToast('Family group deleted successfully', 'success');

            // Reload data
            await this.loadFamilyGroups();
            await this.loadEmployees();

        } catch (error) {
            console.error('Error deleting family group:', error);
            this.ui.showToast('Error deleting family group: ' + error.message, 'error');
        }
    }

    editFamilyGroup(familyGroupId) {
        this.showFamilyGroupModal(familyGroupId);
    }

    showAddToFamilyModal(employeeId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const availableFamilyGroups = this.familyGroups.filter(fg =>
            !this.employees.some(emp => emp.family_group_id === fg.id && emp.id === employeeId)
        );

        const modalHtml = `
            <div id="addToFamilyModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> Add ${employee.name} to Family Group</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="addToFamilyForm" class="modal-form">
                        <input type="hidden" id="addToFamilyEmployeeId" value="${employeeId}">
                        <div class="form-group">
                            <label>Select Family Group</label>
                            <select id="selectedFamilyGroupId" required>
                                <option value="">Select Family Group</option>
                                ${availableFamilyGroups.map(fg => `
                                    <option value="${fg.id}">${fg.family_name} (Primary: ${this.getEmployeeName(fg.primary_member_id)})</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Add to Family</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'addToFamilyModal');

        // Add form submit handler
        const form = document.getElementById('addToFamilyForm');
        if (form) {
            form.addEventListener('submit', this.handleAddToFamilySubmit);
        }
    }

    async handleAddToFamilySubmit(e) {
        e.preventDefault();

        const employeeId = document.getElementById('addToFamilyEmployeeId').value;
        const familyGroupId = document.getElementById('selectedFamilyGroupId').value;

        if (!employeeId || !familyGroupId) {
            this.ui.showToast('Please select a family group', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            await this.db.update('employees', employeeId, {
                family_group_id: familyGroupId,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast('Employee added to family group successfully', 'success');
            this.ui.hideModal('addToFamilyModal');

            // Reload data
            await this.loadEmployees();

        } catch (error) {
            console.error('Error adding employee to family group:', error);
            this.ui.showToast('Error adding employee to family group: ' + error.message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    getEmployeeName(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        return employee ? employee.name : 'Unknown';
    }

    showExportOptions() {
        this.showExportModal('employees', ['excel', 'pdf']);
    }

    showExportModal(type, allowedFormats = ['excel', 'pdf']) {
        const titles = {
            'employees': 'Employees',
            'users': 'Users',
            'bills': 'Bills',
            'pending': 'Pending Bills',
            'payments': 'Payments'
        };

        const formatOptions = allowedFormats.map(format => {
            const formatInfo = {
                'excel': { icon: 'fa-file-excel', class: 'excel', label: 'Excel' },
                'pdf': { icon: 'fa-file-pdf', class: 'pdf', label: 'PDF' }
            }[format];

            return `
            <div class="export-option" data-format="${format}" data-type="${type}">
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
                    <button class="btn-secondary" onclick="app.getManagers().employee.closeExportModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(exportHtml, 'exportModal');

        // Add event listeners for export options
        document.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.getAttribute('data-format');
                const type = e.currentTarget.getAttribute('data-type');

                if (format === 'excel') {
                    this.exportToExcel(type);
                } else if (format === 'pdf') {
                    this.exportToPDF(type);
                }
            });
        });
    }

    closeExportModal() {
        this.ui.hideModal('exportModal');
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
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Insufficient permissions to export data', 'error');
                return;
            }

            this.ui.showExportProgress(`Preparing ${type} data...`);

            let data = [];
            let filename = '';
            let title = '';

            switch (type) {
                case 'employees':
                    data = this.employees;
                    filename = `employees_export_${new Date().toISOString().split('T')[0]}`;
                    title = 'Employees Report';
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }

            if (data.length === 0) {
                this.ui.showToast(`No ${type} data to export`, 'warning');
                return;
            }

            const exportData = data.map(employee => {
                const familyGroup = this.familyGroups.find(fg => fg.id === employee.family_group_id);

                return {
                    'Employee ID': employee.id,
                    'Name': employee.name,
                    'Phone': employee.phone || '',
                    'Email': employee.email || '',
                    'Role': employee.role || '',
                    'Type': employee.employee_type === 'driver' ? 'Driver' : 'Employee',
                    'Vehicle Number': employee.vehicle_number || '',
                    'Salary Type': employee.salary_type === 'monthly' ? 'Monthly' : 'Daily',
                    'Join Date': this.formatDate(employee.join_date),
                    'Status': employee.status || 'active',
                    'Family Group': familyGroup ? familyGroup.family_name : '',
                    'Created Date': this.formatDate(employee.created_at)
                };
            });

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

            this.ui.showToast(`${title} exported successfully`, 'success');
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            this.ui.showToast(`Error exporting ${type}: ${error.message}`, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    showCustomModal(html, modalId) {
        // Remove existing modal if present
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to DOM
        document.body.insertAdjacentHTML('beforeend', html);

        // Show the modal
        this.ui.showModal(modalId);
    }

    async handleSalarySubmit(e) {
        e.preventDefault();

        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton.disabled) {
            return;
        }

        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Insufficient permissions to manage salary records', 'error');
                return;
            }

            const salaryEmployee = document.getElementById('salaryEmployee');
            const salaryDate = document.getElementById('salaryDate');
            const salaryAmount = document.getElementById('salaryAmount');
            const incentiveAmount = document.getElementById('incentiveAmount');
            const advanceAmount = document.getElementById('advanceAmount');
            const salaryStatus = document.getElementById('salaryStatus');

            if (!salaryEmployee || !salaryDate || !salaryAmount || !salaryStatus) {
                this.ui.showToast('Salary form is not properly loaded. Please refresh the page.', 'error');
                return;
            }

            const employeeId = salaryEmployee.value;
            const date = salaryDate.value;
            const amount = parseFloat(salaryAmount.value);
            const incentive = incentiveAmount ? parseFloat(incentiveAmount.value) || 0 : 0;
            const advance = advanceAmount ? parseFloat(advanceAmount.value) || 0 : 0;
            const status = salaryStatus.value;

            if (!employeeId) {
                this.ui.showToast('Please select an employee', 'error');
                return;
            }

            if (!date) {
                this.ui.showToast('Salary date is required', 'error');
                return;
            }

            if (!amount || amount <= 0) {
                this.ui.showToast('Please enter a valid salary amount', 'error');
                return;
            }

            const originalText = submitButton.innerHTML;

            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Salary...';

                const employee = this.employees.find(emp => emp.id === employeeId);
                if (!employee) {
                    throw new Error('Selected employee not found');
                }

                const salaryData = {
                    employee_id: employeeId,
                    employee_name: employee.name,
                    amount: amount,
                    incentive_amount: incentive,
                    advance_amount: advance,
                    total_amount: amount + incentive + advance,
                    allocation_used: status === 'paid' ? amount + advance : 0,
                    status: status,
                    record_date: date,
                    week_number: this.getWeekNumber(new Date(date)),
                    month_number: this.getMonthNumber(new Date(date)),
                    year: new Date(date).getFullYear(),
                    created_at: new Date().toISOString()
                };

                await this.db.create('salary_records', salaryData);
                this.ui.showToast(`Salary record added successfully (${status})`, 'success');

                const salaryForm = document.getElementById('salaryForm');
                if (salaryForm) {
                    salaryForm.reset();
                    document.getElementById('salaryStatus').value = 'paid';
                }

                await this.loadSalaryRecords();
                await this.loadEmployees();

            } catch (error) {
                console.error('Error adding salary record:', error);
                this.ui.showToast('Error adding salary record: ' + error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }

        } catch (error) {
            console.error('Unexpected error in salary form submission:', error);
            this.ui.showToast('Unexpected error. Please try again.', 'error');
        }
    }

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return weekNo;
    }

    getMonthNumber(date) {
        return new Date(date).getMonth() + 1;
    }

    getCurrentYear() {
        return new Date().getFullYear();
    }

    calculateAllocationUsage(employeeId, year = null) {
        const targetYear = year || this.getCurrentYear();
        const allocation = this.yearlyAllocations.find(
            allocation => allocation.employee_id === employeeId && allocation.year == targetYear
        );

        if (!allocation) {
            return {
                allocated: 0,
                used: 0,
                remaining: 0,
                usagePercentage: 0
            };
        }

        const salaryUsage = this.salaryRecords
            .filter(record =>
                record.employee_id === employeeId &&
                new Date(record.record_date).getFullYear() == targetYear
            )
            .reduce((sum, record) => sum + parseFloat(record.allocation_used || 0), 0);

        const advanceUsage = this.advancePayments
            .filter(payment =>
                payment.employee_id === employeeId &&
                payment.confirmed &&
                new Date(payment.payment_date).getFullYear() == targetYear
            )
            .reduce((sum, payment) => sum + parseFloat(payment.allocation_used || 0), 0);

        const totalUsed = salaryUsage + advanceUsage;
        const allocated = parseFloat(allocation.allocated_amount);
        const remaining = allocated - totalUsed;
        const usagePercentage = allocated > 0 ? (totalUsed / allocated) * 100 : 0;

        return {
            allocated,
            used: totalUsed,
            remaining,
            usagePercentage: Math.min(usagePercentage, 100),
            allocation
        };
    }

    getEmployeeYearlyAllocation(employeeId, year = null) {
        const targetYear = year || this.getCurrentYear();
        return this.yearlyAllocations.find(
            allocation => allocation.employee_id === employeeId && allocation.year == targetYear
        );
    }

    async handleYearlyAllocation(e) {
        e.preventDefault();

        const employeeId = document.getElementById('allocationEmployeeId').value;
        const allocationId = document.getElementById('allocationId').value;
        const year = parseInt(document.getElementById('allocationYear').value);
        const amount = parseFloat(document.getElementById('allocationAmount').value);
        const salaryType = document.querySelector('input[name="allocationSalaryType"]:checked').value;
        const notes = document.getElementById('allocationNotes').value;

        if (!amount || amount <= 0) {
            this.ui.showToast('Please enter a valid allocation amount', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const allocationData = {
                employee_id: employeeId,
                year: year,
                allocated_amount: amount,
                salary_type: salaryType,
                notes: notes,
                updated_at: new Date().toISOString()
            };

            if (allocationId) {
                await this.db.update('yearly_allocations', allocationId, allocationData);
                this.ui.showToast('Yearly allocation updated successfully', 'success');
            } else {
                allocationData.id = `ALLOC_${employeeId}_${year}`;
                allocationData.created_at = new Date().toISOString();
                await this.db.create('yearly_allocations', allocationData);
                this.ui.showToast('Yearly allocation created successfully', 'success');
            }

            this.ui.hideModal('allocationModal');
            await this.loadEmployees();

        } catch (error) {
            console.error('Error saving yearly allocation:', error);
            this.ui.showToast('Error saving yearly allocation: ' + error.message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    async handleAdvancePayment(e) {
        e.preventDefault();

        const employeeId = document.getElementById('advanceEmployeeId').value;
        const amount = parseFloat(document.getElementById('advanceAmount').value);
        const paymentDate = document.getElementById('advanceDate').value;
        const notes = document.getElementById('advanceNotes').value;

        if (!amount || amount <= 0) {
            this.ui.showToast('Please enter a valid advance amount', 'error');
            return;
        }

        const allocationStatus = this.calculateAllocationUsage(employeeId);
        if (amount > allocationStatus.remaining) {
            this.ui.showToast(`Advance amount cannot exceed remaining allocation of ${this.formatCurrency(allocationStatus.remaining)}`, 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const paymentData = {
                employee_id: employeeId,
                amount: amount,
                payment_date: paymentDate,
                allocation_used: amount,
                week_number: this.getWeekNumber(new Date(paymentDate)),
                month_number: this.getMonthNumber(new Date(paymentDate)),
                year: new Date(paymentDate).getFullYear(),
                confirmed: true,
                notes: notes,
                created_at: new Date().toISOString()
            };

            paymentData.id = `ADV_${employeeId}_${Date.now()}`;

            await this.db.create('advance_payments', paymentData);
            this.ui.showToast('Advance payment added successfully', 'success');

            this.ui.hideModal('advanceModal');
            await this.loadEmployees();

        } catch (error) {
            console.error('Error processing advance payment:', error);
            this.ui.showToast('Error processing advance payment: ' + error.message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    // NEW: Update primary member (from dropdown)
    async updatePrimaryMember(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const newPrimaryMemberId = document.getElementById('newPrimaryMember')?.value;
        if (!newPrimaryMemberId) {
            this.ui.showToast('Please select a new primary member', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        if (!familyGroup) {
            this.ui.showToast('Family group not found', 'error');
            return;
        }

        if (familyGroup.primary_member_id === newPrimaryMemberId) {
            this.ui.showToast('This member is already the primary member', 'warning');
            return;
        }

        const newPrimaryMember = this.employees.find(emp => emp.id === newPrimaryMemberId);
        if (!newPrimaryMember) {
            this.ui.showToast('Selected member not found', 'error');
            return;
        }

        const confirmation = await this.ui.showConfirmation(
            'Change Primary Member?',
            `Are you sure you want to make ${newPrimaryMember.name} the primary member of ${familyGroup.family_name}?`,
            'Change Primary',
            'Cancel'
        );

        if (!confirmation) {
            return;
        }

        try {
            await this.db.update('family_groups', familyGroupId, {
                primary_member_id: newPrimaryMemberId,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast(`Primary member updated to ${newPrimaryMember.name}`, 'success');

            // Reload data and refresh modal
            await this.loadFamilyGroups();
            await this.loadEmployees();
            this.showManageFamilyMembersModal(familyGroupId);

        } catch (error) {
            console.error('Error updating primary member:', error);
            this.ui.showToast('Error updating primary member: ' + error.message, 'error');
        }
    }

    // Add this method to handle the manage family members button
    handleManageFamilyMembers(familyGroupId) {
        this.showManageFamilyMembersModal(familyGroupId);
    }

    cleanup() {
        this.removeEventListeners();
        this.isInitialized = false;
        console.log('🧹 EmployeeManager cleaned up');
    }
}

// Make sure to assign to window
window.EmployeeManager = EmployeeManager;