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
                    this.deleteFamilyGroup(familyGroupId);
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

    // NEW: Show modal to manage family members
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
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-users-cog"></i>
                            Manage Family Members - ${familyGroup.family_name}
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="family-info-section">
                            <h4>Family Information</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Family Name:</label>
                                    <span>${familyGroup.family_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Primary Member:</label>
                                    <span>${primaryMember ? `${primaryMember.name} (${primaryMember.id})` : 'Not set'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Total Members:</label>
                                    <span>${familyMembers.length}</span>
                                </div>
                            </div>
                        </div>

                        <div class="members-management-section">
                            <div class="section-header">
                                <h4>Family Members (${familyMembers.length})</h4>
                                <button class="btn-primary btn-sm" onclick="app.getManagers().employee.showAddMemberToFamilyModal('${familyGroupId}')">
                                    <i class="fas fa-user-plus"></i> Add Member
                                </button>
                            </div>
                            
                            ${familyMembers.length === 0 ? `
                                <div class="no-data">
                                    <i class="fas fa-user-times"></i>
                                    <br>
                                    No members in this family group
                                </div>
                            ` : `
                                <div class="table-responsive">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Employee ID</th>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th>Type</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${familyMembers.map(member => `
                                                <tr>
                                                    <td><strong>${member.id}</strong></td>
                                                    <td>${member.name}</td>
                                                    <td>${member.role}</td>
                                                    <td>${member.phone || 'N/A'}</td>
                                                    <td>
                                                        <span class="status-badge status-${member.status || 'active'}">
                                                            ${member.status || 'active'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        ${member.id === familyGroup.primary_member_id ?
                '<span class="badge badge-primary">Primary</span>' :
                '<span class="badge badge-secondary">Member</span>'
            }
                                                    </td>
                                                    <td>
                                                        <div class="action-buttons">
                                                            ${member.id !== familyGroup.primary_member_id ? `
                                                                <button class="btn-danger btn-sm remove-family-member-btn" 
                                                                        data-employee-id="${member.id}"
                                                                        data-family-id="${familyGroupId}"
                                                                        title="Remove from Family">
                                                                    <i class="fas fa-user-times"></i> Remove
                                                                </button>
                                                            ` : `
                                                                <span class="text-muted">Primary Member</span>
                                                            `}
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

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
    }

    // NEW: Update primary member
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

    // NEW: Show modal to add members to existing family
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
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-user-plus"></i>
                            Add Member to ${familyGroup.family_name}
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        ${availableEmployees.length === 0 ? `
                            <div class="no-data">
                                <i class="fas fa-user-times"></i>
                                <br>
                                No available employees to add
                                <br>
                                <small>All employees are already in family groups</small>
                            </div>
                        ` : `
                            <div class="form-group">
                                <label>Select Employee to Add</label>
                                <select id="employeeToAdd" class="form-select">
                                    <option value="">Select Employee</option>
                                    ${availableEmployees.map(emp => `
                                        <option value="${emp.id}">
                                            ${emp.name} (${emp.id}) - ${emp.role}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        `}
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeAddMemberToFamily()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        ${availableEmployees.length > 0 ? `
                            <button class="btn-primary" onclick="app.getManagers().employee.addMemberToFamily('${familyGroupId}')">
                                <i class="fas fa-user-plus"></i> Add to Family
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'addMemberToFamilyModal');
    }

    // NEW: Add member to existing family
    async addMemberToFamily(familyGroupId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const employeeId = document.getElementById('employeeToAdd')?.value;
        if (!employeeId) {
            this.ui.showToast('Please select an employee to add', 'error');
            return;
        }

        const familyGroup = this.familyGroups.find(fg => fg.id === familyGroupId);
        const employee = this.employees.find(emp => emp.id === employeeId);

        if (!familyGroup || !employee) {
            this.ui.showToast('Family group or employee not found', 'error');
            return;
        }

        try {
            await this.db.update('employees', employeeId, {
                family_group_id: familyGroupId,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast(`${employee.name} added to ${familyGroup.family_name} successfully`, 'success');

            // Close the add modal and refresh the management modal
            this.closeAddMemberToFamily();
            await this.loadEmployees();
            this.showManageFamilyMembersModal(familyGroupId);

        } catch (error) {
            console.error('Error adding member to family:', error);
            this.ui.showToast('Error adding member to family: ' + error.message, 'error');
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

    // ENHANCED FAMILY GROUP DETAILS MODAL WITH MANAGEMENT OPTIONS
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
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> Family Group Details - ${familyGroup.family_name}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="family-details-container">
                        <div class="details-section">
                            <h4>Family Information</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Family Name:</label>
                                    <span>${familyGroup.family_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Primary Member:</label>
                                    <span>${primaryMember ? `${primaryMember.name} (${primaryMember.id})` : 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Total Members:</label>
                                    <span>${familyMembers.length}</span>
                                </div>
                                ${familyGroup.bank_account_number ? `
                                <div class="detail-item">
                                    <label>Bank Account:</label>
                                    <span>${familyGroup.bank_account_number}</span>
                                </div>
                                ` : ''}
                                ${familyGroup.bank_name ? `
                                <div class="detail-item">
                                    <label>Bank Name:</label>
                                    <span>${familyGroup.bank_name}</span>
                                </div>
                                ` : ''}
                                ${familyGroup.ifsc_code ? `
                                <div class="detail-item">
                                    <label>IFSC Code:</label>
                                    <span>${familyGroup.ifsc_code}</span>
                                </div>
                                ` : ''}
                                <div class="detail-item">
                                    <label>Created Date:</label>
                                    <span>${this.formatDate(familyGroup.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="details-section">
                            <h4>Family Members (${familyMembers.length})</h4>
                            ${familyMembers.length > 0 ? `
                                <div class="members-table">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Employee ID</th>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${familyMembers.map(member => `
                                                <tr>
                                                    <td><strong>${member.id}</strong></td>
                                                    <td>${member.name}</td>
                                                    <td>${member.role}</td>
                                                    <td>${member.phone || 'N/A'}</td>
                                                    <td><span class="status-badge status-${member.status || 'active'}">${member.status || 'active'}</span></td>
                                                    <td>
                                                        ${member.id === familyGroup.primary_member_id ?
                '<span class="badge badge-primary">Primary</span>' :
                '<span class="badge badge-secondary">Member</span>'
            }
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div class="no-data">
                                    <i class="fas fa-user-times"></i>
                                    <br>
                                    No members in this family group
                                </div>
                            `}
                        </div>
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


    // Add this method to handle the manage family members button
    handleManageFamilyMembers(familyGroupId) {
        this.showManageFamilyMembersModal(familyGroupId);
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

    // ENHANCED RENDER FUNCTION WITH FAMILY GROUP SUPPORT
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

            console.log(`👤 Rendering employee ${employee.id}:`, {
                name: employee.name,
                family_group_id: employee.family_group_id,
                familyGroup: familyGroup
            });

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
                                <button class="btn-icon remove-family-group-btn" 
                                        data-employee-id="${employee.id}"
                                        title="Remove from Family Group"
                                        type="button">
                                    <i class="fas fa-times"></i>
                                </button>
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
                        <div class="details-section">
                            <h4>Basic Information</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Employee ID:</label>
                                    <span>${employee.id}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Name:</label>
                                    <span>${employee.name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Role:</label>
                                    <span>${employee.role}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Type:</label>
                                    <span class="badge ${employee.employee_type === 'driver' ? 'badge-driver' : 'badge-employee'}">
                                        ${employee.employee_type === 'driver' ? 'Driver' : 'Employee'}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <label>Phone:</label>
                                    <span>${employee.phone || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Email:</label>
                                    <span>${employee.email || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Join Date:</label>
                                    <span>${this.formatDate(employee.join_date)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Status:</label>
                                    <span class="status-badge status-${employee.status || 'active'}">
                                        ${employee.status || 'active'}
                                    </span>
                                </div>
                                ${employee.vehicle_number ? `
                                <div class="detail-item">
                                    <label>Vehicle Number:</label>
                                    <span>${employee.vehicle_number}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        ${familyGroup ? `
                        <div class="details-section">
                            <h4>Family Group Information</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Family Name:</label>
                                    <span>${familyGroup.family_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Primary Member:</label>
                                    <span>${employee.id === familyGroup.primary_member_id ? 'Yes' : 'No'}</span>
                                </div>
                                ${familyGroup.bank_account_number ? `
                                <div class="detail-item">
                                    <label>Bank Account:</label>
                                    <span>${familyGroup.bank_account_number}</span>
                                </div>
                                ` : ''}
                                ${familyGroup.bank_name ? `
                                <div class="detail-item">
                                    <label>Bank Name:</label>
                                    <span>${familyGroup.bank_name}</span>
                                </div>
                                ` : ''}
                                ${familyGroup.ifsc_code ? `
                                <div class="detail-item">
                                    <label>IFSC Code:</label>
                                    <span>${familyGroup.ifsc_code}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            ${familyMembers.length > 0 ? `
                            <div class="family-members">
                                <h5>Family Members (${familyMembers.length}):</h5>
                                <div class="members-list">
                                    ${familyMembers.map(member => `
                                        <div class="member-item">
                                            <i class="fas fa-user"></i>
                                            <span>${member.name} (${member.id})</span>
                                            <span class="member-role">${member.role}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        ` : ''}

                        <div class="details-section">
                            <h4>Quick Actions</h4>
                            <div class="action-buttons-grid">
                                <button class="btn-primary" onclick="app.getManagers().employee.editEmployee('${employee.id}')">
                                    <i class="fas fa-edit"></i> Edit Employee
                                </button>
                                <button class="btn-secondary" onclick="app.getManagers().attendance.showQuickAttendanceModal('${employee.id}')">
                                    <i class="fas fa-calendar-check"></i> Mark Attendance
                                </button>
                                <button class="btn-secondary" onclick="app.getManagers().salary.showAdvanceModal('${employee.id}')">
                                    <i class="fas fa-money-bill-wave"></i> Add Advance
                                </button>
                                ${!familyGroup ? `
                                <button class="btn-secondary" onclick="app.getManagers().employee.showAddToFamilyModal('${employee.id}')">
                                    <i class="fas fa-users"></i> Add to Family Group
                                </button>
                                ` : `
                                <button class="btn-warning" onclick="app.getManagers().employee.handleRemoveFromFamily('${employee.id}')">
                                    <i class="fas fa-user-times"></i> Remove from Family
                                </button>
                                `}
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

    showManageFamilyGroupsModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const modalHtml = `
            <div id="manageFamilyGroupsModal" class="modal">
                <div class="modal-content" style="max-width: 1000px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> Manage Family Groups</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        ${this.familyGroups.length === 0 ? `
                            <div class="no-data">
                                <i class="fas fa-users"></i>
                                <br>
                                No family groups found
                                <br>
                                <button class="btn-primary btn-sm" onclick="app.getManagers().employee.showFamilyGroupModal()" style="margin-top: 10px;">
                                    <i class="fas fa-plus"></i> Create First Family Group
                                </button>
                            </div>
                        ` : `
                            <div class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Family Name</th>
                                            <th>Primary Member</th>
                                            <th>Total Members</th>
                                            <th>Bank Account</th>
                                            <th>Created Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.familyGroups.map(familyGroup => {
            const primaryMember = this.employees.find(emp => emp.id === familyGroup.primary_member_id);
            const totalMembers = this.employees.filter(emp => emp.family_group_id === familyGroup.id).length;

            return `
                                                <tr>
                                                    <td><strong>${familyGroup.family_name}</strong></td>
                                                    <td>${primaryMember ? `${primaryMember.name} (${primaryMember.id})` : 'N/A'}</td>
                                                    <td>${totalMembers}</td>
                                                    <td>${familyGroup.bank_account_number || 'N/A'}</td>
                                                    <td>${this.formatDate(familyGroup.created_at)}</td>
                                                    <td>
                                                        <div class="action-buttons">
                                                            <button class="btn-secondary btn-sm view-family-group-btn" data-family-id="${familyGroup.id}" title="View Details">
                                                                <i class="fas fa-eye"></i>
                                                            </button>
                                                            <button class="btn-secondary btn-sm edit-family-group-btn" data-family-id="${familyGroup.id}" title="Edit">
                                                                <i class="fas fa-edit"></i>
                                                            </button>
                                                            <button class="btn-danger btn-sm delete-family-group-btn" data-family-id="${familyGroup.id}" title="Delete">
                                                                <i class="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
        }).join('')}
                                    </tbody>
                                </table>
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
    }

    closeManageFamilyGroups() {
        this.ui.hideModal('manageFamilyGroupsModal');
        const modal = document.getElementById('manageFamilyGroupsModal');
        if (modal) {
            modal.remove();
        }
    }

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
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> Family Group Details - ${familyGroup.family_name}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="family-details-container">
                        <div class="details-section">
                            <h4>Family Information</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <label>Family Name:</label>
                                    <span>${familyGroup.family_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Primary Member:</label>
                                    <span>${primaryMember ? `${primaryMember.name} (${primaryMember.id})` : 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Total Members:</label>
                                    <span>${familyMembers.length}</span>
                                </div>
                                ${familyGroup.bank_account_number ? `
                                <div class="detail-item">
                                    <label>Bank Account:</label>
                                    <span>${familyGroup.bank_account_number}</span>
                                </div>
                                ` : ''}
                                ${familyGroup.bank_name ? `
                                <div class="detail-item">
                                    <label>Bank Name:</label>
                                    <span>${familyGroup.bank_name}</span>
                                </div>
                                ` : ''}
                                ${familyGroup.ifsc_code ? `
                                <div class="detail-item">
                                    <label>IFSC Code:</label>
                                    <span>${familyGroup.ifsc_code}</span>
                                </div>
                                ` : ''}
                                <div class="detail-item">
                                    <label>Created Date:</label>
                                    <span>${this.formatDate(familyGroup.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="details-section">
                            <h4>Family Members (${familyMembers.length})</h4>
                            ${familyMembers.length > 0 ? `
                                <div class="members-table">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Employee ID</th>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${familyMembers.map(member => `
                                                <tr>
                                                    <td><strong>${member.id}</strong></td>
                                                    <td>${member.name}</td>
                                                    <td>${member.role}</td>
                                                    <td>${member.phone || 'N/A'}</td>
                                                    <td><span class="status-badge status-${member.status || 'active'}">${member.status || 'active'}</span></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div class="no-data">
                                    <i class="fas fa-user-times"></i>
                                    <br>
                                    No members in this family group
                                </div>
                            `}
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeFamilyGroupDetails()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="btn-primary" onclick="app.getManagers().employee.editFamilyGroup('${familyGroup.id}')">
                            <i class="fas fa-edit"></i> Edit Family Group
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'familyGroupDetailsModal');
    }

    closeFamilyGroupDetails() {
        this.ui.hideModal('familyGroupDetailsModal');
        const modal = document.getElementById('familyGroupDetailsModal');
        if (modal) {
            modal.remove();
        }
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

    cleanup() {
        this.removeEventListeners();
        this.isInitialized = false;
        console.log('🧹 EmployeeManager cleaned up');
    }
}

// Make sure to assign to window
window.EmployeeManager = EmployeeManager;