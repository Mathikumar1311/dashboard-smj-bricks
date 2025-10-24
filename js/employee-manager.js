class EmployeeManager {
    constructor(dependencies) {
        // ✅ ADD VALIDATION FIRST
        if (!dependencies) {
            throw new Error('EmployeeManager: dependencies object is required');
        }
        if (!dependencies.db) {
            throw new Error('EmployeeManager: db dependency is required');
        }
        if (!dependencies.ui) {
            throw new Error('EmployeeManager: ui dependency is required');
        }
        if (!dependencies.auth) {
            throw new Error('EmployeeManager: auth dependency is required');
        }

        // ✅ SAFELY ASSIGN DEPENDENCIES
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        this.employees = [];
        this.salaryRecords = [];
        this.yearlyAllocations = [];
        this.advancePayments = [];
        this.filteredEmployees = [];
        this.currentSearchTerm = '';
        this.currentDateFilter = 'all';

        // ✅ SAFE METHOD BINDING
        try {
            this.handleSalarySubmit = this.handleSalarySubmit?.bind(this) || (() => { });
            this.handleEmployeeSubmit = this.handleEmployeeSubmit?.bind(this) || (() => { });
            this.handleSearch = this.handleSearch?.bind(this) || (() => { });
            this.clearSearch = this.clearSearch?.bind(this) || (() => { });
            this.handleYearlyAllocation = this.handleYearlyAllocation?.bind(this) || (() => { });
            this.handleAdvancePayment = this.handleAdvancePayment?.bind(this) || (() => { });
            this.confirmAdvancePayment = this.confirmAdvancePayment?.bind(this) || (() => { });
            this.FilteredDexportata = this.exportFilteredData?.bind(this) || (() => { });
            this.applyDateFilter = this.applyDateFilter?.bind(this) || (() => { });
            this.debouncedSearch = this.debounce(this.handleSearch, 300);
        } catch (error) {
            console.warn('Some methods failed to bind:', error);
        }
    }

    // Utility Methods
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

    getCurrentYear() {
        return new Date().getFullYear();
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

    formatDateGroup(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Core Calculation Methods
    getEmployeeYearlyAllocation(employeeId, year = null) {
        const targetYear = year || this.getCurrentYear();
        return this.yearlyAllocations.find(
            allocation => allocation.employee_id === employeeId && allocation.year == targetYear
        );
    }

    calculateAllocationUsage(employeeId, year = null) {
        const targetYear = year || this.getCurrentYear();
        const allocation = this.getEmployeeYearlyAllocation(employeeId, targetYear);

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

    calculateWeeklySummary(employeeId, weekNumber = null, year = null) {
        const targetYear = year || this.getCurrentYear();
        const targetWeek = weekNumber || this.getWeekNumber(new Date());

        const weekSalary = this.salaryRecords
            .filter(record =>
                record.employee_id === employeeId &&
                this.getWeekNumber(new Date(record.record_date)) === targetWeek &&
                new Date(record.record_date).getFullYear() == targetYear
            )
            .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);

        const weekIncentives = this.salaryRecords
            .filter(record =>
                record.employee_id === employeeId &&
                this.getWeekNumber(new Date(record.record_date)) === targetWeek &&
                new Date(record.record_date).getFullYear() == targetYear
            )
            .reduce((sum, record) => sum + parseFloat(record.incentive_amount || 0), 0);

        const weekAdvances = this.advancePayments
            .filter(payment =>
                payment.employee_id === employeeId &&
                payment.confirmed &&
                this.getWeekNumber(new Date(payment.payment_date)) === targetWeek &&
                new Date(payment.payment_date).getFullYear() == targetYear
            )
            .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

        const allocationUsage = this.calculateWeeklyAllocationUsage(employeeId, targetWeek, targetYear);

        return {
            weekNumber: targetWeek,
            year: targetYear,
            salary: weekSalary,
            incentives: weekIncentives,
            advances: weekAdvances,
            allocationUsed: allocationUsage,
            netSalary: weekSalary + weekIncentives - weekAdvances
        };
    }

    calculateWeeklyAllocationUsage(employeeId, weekNumber, year) {
        const salaryUsage = this.salaryRecords
            .filter(record =>
                record.employee_id === employeeId &&
                this.getWeekNumber(new Date(record.record_date)) === weekNumber &&
                new Date(record.record_date).getFullYear() == year
            )
            .reduce((sum, record) => sum + parseFloat(record.allocation_used || 0), 0);

        const advanceUsage = this.advancePayments
            .filter(payment =>
                payment.employee_id === employeeId &&
                payment.confirmed &&
                this.getWeekNumber(new Date(payment.payment_date)) === weekNumber &&
                new Date(payment.payment_date).getFullYear() == year
            )
            .reduce((sum, payment) => sum + parseFloat(payment.allocation_used || 0), 0);

        return salaryUsage + advanceUsage;
    }

    // Data Loading Methods
    async initialize() {
        this.setupEventListeners();
        this.setupModalEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            console.log('🔍 Click event target:', e.target); // Debug log

            if (e.target.id === 'addEmployeeBtn' || e.target.closest('#addEmployeeBtn')) {
                this.showAddEmployeeModal();
                return;
            }

            if (e.target.id === 'exportEmployeesBtn' || e.target.closest('#exportEmployeesBtn')) {
                this.showExportOptions();
                return;
            }

            if (e.target.id === 'exportSalaryBtn' || e.target.closest('#exportSalaryBtn')) {
                this.showSalaryExportOptions();
                return;
            }

            if (e.target.name === 'employeeType' || e.target.closest('input[name="employeeType"]')) {
                this.toggleEmployeeType();
                return;
            }

            // Employee row click for details
            if (e.target.closest('.employee-row') || e.target.closest('.view-details-btn')) {
                const row = e.target.closest('tr');
                if (row) {
                    const employeeId = row.getAttribute('data-employee-id');
                    if (employeeId) {
                        this.showEmployeeDetails(employeeId);
                    }
                }
                return;
            }

            // Search clear button
            if (e.target.id === 'clearSearchBtn' || e.target.closest('#clearSearchBtn')) {
                this.clearSearch();
                return;
            }

            // Date filter buttons
            if (e.target.closest('[data-filter]')) {
                const filter = e.target.closest('[data-filter]').getAttribute('data-filter');
                this.applyDateFilter(filter);
                return;
            }

            // FIXED: Modal close buttons - check both direct click and child elements
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                console.log('🔍 Modal close clicked'); // Debug log
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.ui.hideModal(modal.id);
                }
                return;
            }

            // FIXED: Modal cancel buttons
            if (e.target.classList.contains('modal-cancel') || e.target.closest('.modal-cancel')) {
                console.log('🔍 Modal cancel clicked'); // Debug log
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.ui.hideModal(modal.id);
                }
                return;
            }

            // FIXED: Close modal when clicking outside content (on backdrop)
            if (e.target.classList.contains('modal')) {
                console.log('🔍 Modal backdrop clicked'); // Debug log
                this.ui.hideModal(e.target.id);
                return;
            }
        });

        // Search input event listeners
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.debouncedSearch(e));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        const employeeForm = document.getElementById('employeeForm');
        if (employeeForm) {
            employeeForm.removeEventListener('submit', this.handleEmployeeSubmit);
            employeeForm.addEventListener('submit', (e) => this.handleEmployeeSubmit(e));
        }

        // FIXED: Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    console.log('🔍 Escape key pressed, closing modal'); // Debug log
                    this.ui.hideModal(openModal.id);
                }
            }
        });

        console.log('✅ Event listeners setup completed'); // Debug log
    }

    // FIXED: Proper modal event handling
    setupModalEventListeners() {
        // Handle all modal close events
        document.addEventListener('click', (e) => {
            // Close modal when clicking close button
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.ui.hideModal(modal.id);
                }
            }

            // Close modal when clicking cancel button
            if (e.target.classList.contains('modal-cancel') || e.target.closest('.modal-cancel')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.ui.hideModal(modal.id);
                }
            }

            // Close modal when clicking outside
            if (e.target.classList.contains('modal')) {
                this.ui.hideModal(e.target.id);
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    this.ui.hideModal(openModal.id);
                }
            }
        });
    }

    // FIXED: Safe Data Loading Method
    async loadEmployees() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('👨‍💼 Loading employees...');
            this.ui.showSectionLoading('employeesContent', 'Loading employees...');

            // ADD THIS DEBUG LINE
            await this.debugDataFetch();

            try {
                // Load employees first (this should always work)
                this.employees = await this.db.getEmployees();
                console.log('✅ Employees loaded:', this.employees.length);

                // Then try to load other data with error handling
                try {
                    this.salaryRecords = await this.db.getSalaryRecords();
                    console.log('✅ Salary records loaded:', this.salaryRecords.length);
                } catch (error) {
                    console.warn('⚠️ Could not load salary records:', error.message);
                    this.salaryRecords = [];
                }

                try {
                    this.yearlyAllocations = await this.db.getYearlyAllocations();
                    console.log('✅ Yearly allocations loaded:', this.yearlyAllocations.length);
                } catch (error) {
                    console.warn('⚠️ Could not load yearly allocations:', error.message);
                    this.yearlyAllocations = [];
                }

                try {
                    this.advancePayments = await this.db.getAdvancePayments();
                    console.log('✅ Advance payments loaded:', this.advancePayments.length);
                } catch (error) {
                    console.warn('⚠️ Could not load advance payments:', error.message);
                    this.advancePayments = [];
                }

            } catch (error) {
                console.error('❌ Error loading employee data:', error);
                this.ui.showToast('Error loading employee data', 'error');
                return;
            }

            // Apply current search filter if any
            if (this.currentSearchTerm) {
                this.filteredEmployees = this.employees.filter(employee =>
                    this.employeeMatchesSearch(employee, this.currentSearchTerm)
                );
                this.renderEmployeesTable(this.filteredEmployees);
            } else {
                this.renderEmployeesTable(this.employees);
            }

            this.populateEmployeeSelect(this.employees);
            this.updateSearchResultsCount();

            this.ui.showToast(`Employees loaded successfully (${this.employees.length} found)`, 'success');
        } catch (error) {
            console.error('❌ Error loading employees:', error);
            this.ui.showToast('Error loading employees: ' + error.message, 'error');
        } finally {
            this.ui.hideSectionLoading('employeesContent');
        }
    }

    async loadSalaries() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💰 Loading salary records...');
            this.ui.showSectionLoading('salaryContent', 'Loading salary records...');

            this.salaryRecords = await this.db.getSalaryRecords();
            this.renderSalaryTable(this.salaryRecords);

            this.ui.showToast('Salary records loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading salary records:', error);
            this.ui.showToast('Error loading salary records', 'error');
        } finally {
            this.ui.hideSectionLoading('salaryContent');
        }
    }

    // Search and Filter Methods
    handleSearch() {
        const searchInput = document.getElementById('employeeSearch');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (!searchInput) return;

        const searchTerm = searchInput.value.trim().toLowerCase();
        this.currentSearchTerm = searchTerm;

        if (clearBtn) {
            clearBtn.style.display = searchTerm ? 'block' : 'none';
        }

        if (searchTerm === '') {
            this.clearSearch();
            return;
        }

        this.filteredEmployees = this.employees.filter(employee =>
            this.employeeMatchesSearch(employee, searchTerm)
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
            employee.email?.toLowerCase(),
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
        const clearBtn = document.getElementById('clearSearchBtn');

        if (searchInput) {
            searchInput.value = '';
        }
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }

        this.currentSearchTerm = '';
        this.filteredEmployees = [];
        this.renderEmployeesTable(this.employees);
        this.updateSearchResultsCount();
    }

    applyDateFilter(filter) {
        this.currentDateFilter = filter;

        // Update active filter button
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });

        this.renderSalaryTable(this.salaryRecords);
    }

    filterRecordsByDate(records) {
        const now = new Date();
        switch (this.currentDateFilter) {
            case 'today':
                return records.filter(record =>
                    new Date(record.record_date || record.payment_date).toDateString() === now.toDateString()
                );
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return records.filter(record =>
                    new Date(record.record_date || record.payment_date) >= weekStart
                );
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return records.filter(record =>
                    new Date(record.record_date || record.payment_date) >= monthStart
                );
            default:
                return records;
        }
    }

    updateSearchResultsCount() {
        const resultsCount = document.getElementById('searchResultsCount');
        const totalEmployees = this.employees.length;
        const showingEmployees = this.currentSearchTerm ? this.filteredEmployees.length : totalEmployees;

        if (resultsCount) {
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
    }

    // Render Methods
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
                    <td colspan="9" class="no-data">
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
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = employees.map(emp => {
            const allocation = this.calculateAllocationUsage(emp.id);

            return `
                <tr class="employee-row" data-employee-id="${emp.id}" style="cursor: pointer;">
                    <td><strong>${emp.id || 'N/A'}</strong></td>
                    <td>${emp.name || 'N/A'}</td>
                    <td>${emp.phone || 'N/A'}</td>
                    <td>
                        <span class="badge ${emp.employee_type === 'driver' ? 'badge-driver' : 'badge-employee'}">
                            ${emp.employee_type === 'driver' ? 'Driver' : 'Employee'}
                        </span>
                    </td>
                    <td>${emp.role || 'N/A'}</td>
                    <td>${Utils.formatDate(emp.join_date)}</td>
                    <td>${Utils.formatCurrency(allocation.allocated)}</td>
                    <td>${Utils.formatCurrency(allocation.remaining)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-secondary btn-sm view-details-btn" title="View Details">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.editEmployee('${emp.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.setupYearlyAllocation('${emp.id}')">
                                <i class="fas fa-money-bill"></i> Allocate
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('✅ Employees table rendered successfully');
    }

    renderSalaryTable(salaryRecords) {
        const tbody = document.getElementById('salaryTableBody');
        if (!tbody) return;

        const filteredRecords = this.filterRecordsByDate(salaryRecords);

        if (filteredRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-money-bill-wave"></i>
                        <br>No salary records found
                        ${this.currentDateFilter !== 'all' ? ' for selected filter' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        // Group records by date
        const groupedRecords = this.groupRecordsByDate(filteredRecords);

        tbody.innerHTML = Object.keys(groupedRecords).map(dateGroup => {
            const records = groupedRecords[dateGroup];
            return `
                <tr class="date-group-header">
                    <td colspan="8">
                        <strong>${dateGroup}</strong>
                    </td>
                </tr>
                ${records.map(record => {
                const employee = this.employees.find(emp => emp.id === record.employee_id);
                return `
                        <tr>
                            <td class="time-cell">${this.formatTime(record.record_date)}</td>
                            <td><strong>${record.employee_id || 'N/A'}</strong></td>
                            <td>${employee ? employee.name : 'Unknown Employee'}</td>
                            <td>${Utils.formatCurrency(record.amount)}</td>
                            <td>${Utils.formatCurrency(record.incentive_amount || 0)}</td>
                            <td>${Utils.formatCurrency(record.allocation_used || 0)}</td>
                            <td>Week ${this.getWeekNumber(new Date(record.record_date))}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.deleteSalaryRecord('${record.id}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
            }).join('')}
            `;
        }).join('');
    }
    // Add this method to EmployeeManager class
    async debugDataFetch() {
        console.log('🔍 DEBUG DATA FETCH:');

        try {
            // Test direct database calls
            console.log('1. Testing direct DB calls...');

            const employees = await this.db.getEmployees();
            console.log('📊 Employees from DB:', employees);
            console.log('📊 Employees length:', employees.length);

            const allocations = await this.db.getYearlyAllocations();
            console.log('📊 Allocations from DB:', allocations);
            console.log('📊 Allocations length:', allocations.length);

            // Test direct Supabase query
            console.log('2. Testing direct Supabase query...');
            const { data, error } = await this.db.supabase
                .from('employees')
                .select('*')
                .limit(5);

            console.log('🔍 Direct Supabase query result:', { data, error });

            if (error) {
                console.error('❌ Direct query error:', error);
            } else {
                console.log('✅ Direct query success, found:', data?.length, 'employees');
            }

        } catch (error) {
            console.error('❌ Debug failed:', error);
        }
    }
    groupRecordsByDate(records) {
        const grouped = {};
        records.forEach(record => {
            const dateGroup = this.formatDateGroup(record.record_date || record.payment_date);
            if (!grouped[dateGroup]) {
                grouped[dateGroup] = [];
            }
            grouped[dateGroup].push(record);
        });
        return grouped;
    }

    // Employee Details Modal
    async showEmployeeDetails(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const allocationStatus = this.calculateAllocationUsage(employeeId);
        const salaryRecords = this.salaryRecords.filter(record => record.employee_id === employeeId);
        const advanceRecords = this.advancePayments.filter(payment => payment.employee_id === employeeId);

        const modalHtml = `
            <div id="employeeDetailsModal" class="modal">
                <div class="modal-content" style="max-width: 1200px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-user-tie"></i>
                            Employee Details - ${employee.name} (${employee.id})
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="employee-details-container">
                        <!-- Basic Information -->
                        <div class="details-section">
                            <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
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
                                    <span>${Utils.formatDate(employee.join_date)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Yearly Allocation Summary -->
                        <div class="details-section">
                            <div class="section-header">
                                <h4><i class="fas fa-chart-bar"></i> Yearly Allocation ${this.getCurrentYear()}</h4>
                                <button class="btn-primary btn-sm" onclick="app.getManagers().employee.setupYearlyAllocation('${employee.id}')">
                                    <i class="fas fa-edit"></i> ${allocationStatus.allocation ? 'Modify' : 'Setup'} Allocation
                                </button>
                            </div>
                            
                            ${allocationStatus.allocation ? `
                            <div class="allocation-summary">
                                <div class="allocation-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${allocationStatus.usagePercentage}%"></div>
                                    </div>
                                    <div class="progress-stats">
                                        <span>Used: ${Utils.formatCurrency(allocationStatus.used)}</span>
                                        <span>Remaining: ${Utils.formatCurrency(allocationStatus.remaining)}</span>
                                        <span>Total: ${Utils.formatCurrency(allocationStatus.allocated)}</span>
                                    </div>
                                </div>
                            </div>
                            ` : `
                            <div class="no-data">
                                <i class="fas fa-money-bill-wave"></i>
                                <br>No yearly allocation setup
                                <br>
                                <button class="btn-primary" onclick="app.getManagers().employee.setupYearlyAllocation('${employee.id}')">
                                    <i class="fas fa-plus"></i> Setup Allocation
                                </button>
                            </div>
                            `}
                        </div>

                        <!-- Salary Records -->
                        <div class="details-section">
                            <div class="section-header">
                                <h4><i class="fas fa-history"></i> Salary Payment History</h4>
                                <button class="btn-primary btn-sm" onclick="app.getManagers().employee.addSalaryRecord('${employee.id}')">
                                    <i class="fas fa-plus"></i> Add Payment
                                </button>
                            </div>
                            
                            ${salaryRecords.length > 0 ? `
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Base Salary</th>
                                            <th>Incentive</th>
                                            <th>Allocation Used</th>
                                            <th>Total Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${salaryRecords.map(record => `
                                            <tr>
                                                <td>${Utils.formatDate(record.record_date)}</td>
                                                <td>${Utils.formatCurrency(record.amount)}</td>
                                                <td>${Utils.formatCurrency(record.incentive_amount || 0)}</td>
                                                <td>${Utils.formatCurrency(record.allocation_used || 0)}</td>
                                                <td><strong>${Utils.formatCurrency(parseFloat(record.amount) + parseFloat(record.incentive_amount || 0))}</strong></td>
                                                <td>
                                                    <div class="action-buttons">
                                                        <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.deleteSalaryRecord('${record.id}')">
                                                            <i class="fas fa-trash"></i> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ` : `
                            <div class="no-data">
                                <i class="fas fa-money-bill-wave"></i>
                                <br>No salary records found
                                <br>
                                <button class="btn-primary" onclick="app.getManagers().employee.addSalaryRecord('${employee.id}')">
                                    <i class="fas fa-plus"></i> Add First Payment
                                </button>
                            </div>
                            `}
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeEmployeeDetails()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="btn-success" onclick="app.getManagers().employee.showAdvancePaymentModal('${employee.id}')">
                            <i class="fas fa-plus"></i> Add Advance
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'employeeDetailsModal');
    }

    // Modal Management Methods
    showCustomModal(html, modalId) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', html);
        this.ui.showModal(modalId);
    }

    closeEmployeeDetails() {
        this.ui.hideModal('employeeDetailsModal');
        const modal = document.getElementById('employeeDetailsModal');
        if (modal) {
            modal.remove();
        }
    }

    // Yearly Allocation Methods
    setupYearlyAllocation(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        const currentAllocation = this.getEmployeeYearlyAllocation(employeeId);

        const modalHtml = `
            <div id="allocationModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="allocationModalTitle">${currentAllocation ? 'Modify' : 'Setup'} Yearly Allocation</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <form id="allocationForm" class="modal-form">
                        <input type="hidden" id="allocationEmployeeId" value="${employeeId}">
                        <input type="hidden" id="allocationId" value="${currentAllocation?.id || ''}">
                        
                        <div class="form-group">
                            <label>Employee</label>
                            <input type="text" id="allocationEmployeeName" value="${employee.name} (${employee.id})" readonly class="readonly-field">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Year *</label>
                                <select id="allocationYear" required>
                                    ${Array.from({ length: 5 }, (_, i) => {
            const year = this.getCurrentYear() + i;
            return `<option value="${year}" ${year === this.getCurrentYear() ? 'selected' : ''}>${year}</option>`;
        }).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Salary Type *</label>
                                <div class="radio-group">
                                    <label class="radio-label">
                                        <input type="radio" name="allocationSalaryType" value="daily" ${(!currentAllocation || currentAllocation.salary_type === 'daily') ? 'checked' : ''}>
                                        <i class="fas fa-calendar-day"></i>
                                        <span>Daily</span>
                                    </label>
                                    <label class="radio-label">
                                        <input type="radio" name="allocationSalaryType" value="monthly" ${(currentAllocation && currentAllocation.salary_type === 'monthly') ? 'checked' : ''}>
                                        <i class="fas fa-calendar-alt"></i>
                                        <span>Monthly</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Allocated Amount (₹) *</label>
                            <input type="number" id="allocationAmount" required min="1" step="0.01" 
                                   value="${currentAllocation?.allocated_amount || ''}" 
                                   placeholder="Enter yearly allocation amount">
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="allocationNotes" placeholder="Add notes about this allocation">${currentAllocation?.notes || ''}</textarea>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Save Allocation</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'allocationModal');

        const form = document.getElementById('allocationForm');
        form.addEventListener('submit', (e) => this.handleYearlyAllocation(e));
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
        const resetButton = this.ui.showButtonLoading(button, 'Saving...');

        try {
            const allocationData = {
                employee_id: employeeId,
                year: year,
                allocated_amount: amount,
                salary_type: salaryType,
                notes: notes,
                updated_at: new Date().toISOString()
            };

            if (allocationId) {
                // Update existing allocation
                await this.db.update('yearly_allocations', allocationId, allocationData);
                this.ui.showToast('Yearly allocation updated successfully', 'success');
            } else {
                // Create new allocation
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
            resetButton();
        }
    }

    // Advance Payment Methods
    showAdvancePaymentModal(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        const allocationStatus = this.calculateAllocationUsage(employeeId);

        if (!allocationStatus.allocation) {
            this.ui.showToast('Please setup yearly allocation first', 'error');
            return;
        }

        const modalHtml = `
            <div id="advanceModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-hand-holding-usd"></i> Add Advance Payment</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="advanceForm" class="modal-form">
                        <input type="hidden" id="advanceEmployeeId" value="${employeeId}">
                        
                        <div class="form-group">
                            <label>Employee</label>
                            <input type="text" value="${employee.name} (${employee.id})" readonly class="readonly-field">
                        </div>
                        
                        <div class="form-group">
                            <label>Remaining Allocation</label>
                            <input type="text" value="${Utils.formatCurrency(allocationStatus.remaining)}" readonly class="readonly-field">
                        </div>
                        
                        <div class="form-group">
                            <label>Advance Amount (₹) *</label>
                            <input type="number" id="advanceAmount" required min="1" step="0.01" 
                                   max="${allocationStatus.remaining}" placeholder="Enter advance amount">
                            <small>Maximum: ${Utils.formatCurrency(allocationStatus.remaining)}</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Payment Date *</label>
                            <input type="date" id="advanceDate" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="advanceNotes" placeholder="Add notes about this advance payment"></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Add Advance Payment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'advanceModal');

        const form = document.getElementById('advanceForm');
        form.addEventListener('submit', (e) => this.handleAdvancePayment(e));
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
            this.ui.showToast(`Advance amount cannot exceed remaining allocation of ${Utils.formatCurrency(allocationStatus.remaining)}`, 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Processing...');

        try {
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
            resetButton();
        }
    }

    setupSalaryForm() {
        const salaryForm = document.getElementById('salaryForm');
        if (salaryForm) {
            const newForm = salaryForm.cloneNode(true);
            salaryForm.parentNode.replaceChild(newForm, salaryForm);

            newForm.addEventListener('submit', (e) => this.handleSalarySubmit(e));
            this.initializeSalaryFormCalculation();

            // NEW: Create searchable dropdown
            this.createSearchableEmployeeDropdown();

            console.log('✅ Salary form setup completed with searchable dropdown');
        }
    }

    // NEW: Enhanced salary form calculation
    initializeSalaryFormCalculation() {
        const salaryAmount = document.getElementById('salaryAmount');
        const incentiveAmount = document.getElementById('incentiveAmount');
        const advanceAmount = document.getElementById('advanceAmount');
        const totalAmount = document.getElementById('totalAmount');

        const calculateTotal = () => {
            const base = parseFloat(salaryAmount?.value) || 0;
            const incentive = parseFloat(incentiveAmount?.value) || 0;
            const advance = parseFloat(advanceAmount?.value) || 0;
            const total = base + incentive + advance;
            if (totalAmount) {
                totalAmount.value = Utils.formatCurrency(total);
            }
        };

        if (salaryAmount && incentiveAmount && advanceAmount && totalAmount) {
            salaryAmount.addEventListener('input', calculateTotal);
            incentiveAmount.addEventListener('input', calculateTotal);
            advanceAmount.addEventListener('input', calculateTotal);
            calculateTotal();
        }
    }

    // NEW: Enhanced salary submission with advance and status
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

            const resetButton = this.ui.showButtonLoading(submitButton, 'Adding Salary...');

            try {
                const employee = this.employees.find(emp => emp.id === employeeId);
                if (!employee) {
                    throw new Error('Selected employee not found');
                }

                // Calculate allocation usage (salary + advance deduct from allocation)
                const allocationStatus = this.calculateAllocationUsage(employeeId);
                const totalAllocationUsage = amount + advance;

                if (totalAllocationUsage > allocationStatus.remaining && status === 'paid') {
                    this.ui.showToast(`Total allocation usage (${Utils.formatCurrency(totalAllocationUsage)}) exceeds remaining allocation (${Utils.formatCurrency(allocationStatus.remaining)})`, 'error');
                    return;
                }

                const salaryData = {
                    employee_id: employeeId,
                    employee_name: employee.name,
                    amount: amount,
                    incentive_amount: incentive,
                    advance_amount: advance,
                    total_amount: amount + incentive + advance,
                    allocation_used: status === 'paid' ? totalAllocationUsage : 0, // Only deduct if paid
                    status: status,
                    record_date: date,
                    week_number: this.getWeekNumber(new Date(date)),
                    month_number: this.getMonthNumber(new Date(date)),
                    year: new Date(date).getFullYear(),
                    created_at: new Date().toISOString()
                };

                await this.db.create('salary_records', salaryData);
                this.ui.showToast(`Salary record added successfully (${status})`, 'success');

                // Reset form
                const salaryForm = document.getElementById('salaryForm');
                if (salaryForm) {
                    salaryForm.reset();
                    document.getElementById('salaryStatus').value = 'paid';
                    this.initializeSalaryFormCalculation();
                }

                // Reload data
                await this.loadSalaries();
                await this.loadEmployees();

            } catch (error) {
                console.error('Error adding salary record:', error);
                this.ui.showToast('Error adding salary record: ' + error.message, 'error');
            } finally {
                resetButton();
            }

        } catch (error) {
            console.error('Unexpected error in salary form submission:', error);
            this.ui.showToast('Unexpected error. Please try again.', 'error');
        }
    }

    // NEW: Enhanced salary table rendering with status
    renderSalaryTable(salaryRecords) {
        const tbody = document.getElementById('salaryTableBody');
        if (!tbody) return;

        const filteredRecords = this.filterRecordsByDateAndStatus(salaryRecords);

        if (filteredRecords.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="11" class="no-data">
                    <i class="fas fa-money-bill-wave"></i>
                    <br>No salary records found
                    ${this.currentDateFilter !== 'all' ? ' for selected filter' : ''}
                </td>
            </tr>
        `;
            return;
        }

        // Update summary cards
        this.updateSalarySummaryCards(salaryRecords);

        // Group records by date
        const groupedRecords = this.groupRecordsByDate(filteredRecords);

        tbody.innerHTML = Object.keys(groupedRecords).map(dateGroup => {
            const records = groupedRecords[dateGroup];
            return `
            <tr class="date-group-header">
                <td colspan="11">
                    <strong>${dateGroup}</strong>
                </td>
            </tr>
            ${records.map(record => {
                const employee = this.employees.find(emp => emp.id === record.employee_id);
                const statusBadge = record.status === 'paid' ?
                    '<span class="status-paid">Paid</span>' :
                    '<span class="status-pending">Pending</span>';

                return `
                    <tr class="${record.status === 'pending' ? 'pending-row' : ''}">
                        <td class="time-cell">${this.formatTime(record.record_date)}</td>
                        <td><strong>${record.employee_id || 'N/A'}</strong></td>
                        <td>${employee ? employee.name : 'Unknown Employee'}</td>
                        <td>${Utils.formatCurrency(record.amount)}</td>
                        <td>${Utils.formatCurrency(record.incentive_amount || 0)}</td>
                        <td>${Utils.formatCurrency(record.advance_amount || 0)}</td>
                        <td><strong>${Utils.formatCurrency(record.total_amount || (parseFloat(record.amount) + parseFloat(record.incentive_amount || 0) + parseFloat(record.advance_amount || 0)))}</strong></td>
                        <td>${Utils.formatCurrency(record.allocation_used || 0)}</td>
                        <td>${statusBadge}</td>
                        <td>Week ${this.getWeekNumber(new Date(record.record_date))}</td>
                        <td>
                            <div class="action-buttons">
                                ${record.status === 'pending' ? `
                                    <button class="btn-success btn-sm" onclick="app.getManagers().employee.markAsPaid('${record.id}')" title="Mark as Paid">
                                        <i class="fas fa-check"></i> Pay
                                    </button>
                                ` : ''}
                                <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.deleteSalaryRecord('${record.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('')}
        `;
        }).join('');
    }

    // NEW: Enhanced filtering with status
    filterRecordsByDateAndStatus(records) {
        let filtered = records;

        // Apply status filter
        if (this.currentDateFilter === 'pending') {
            filtered = filtered.filter(record => record.status === 'pending');
        } else if (this.currentDateFilter === 'paid') {
            filtered = filtered.filter(record => record.status === 'paid');
        }

        // Apply date filter
        const now = new Date();
        switch (this.currentDateFilter) {
            case 'today':
                return filtered.filter(record =>
                    new Date(record.record_date).toDateString() === now.toDateString()
                );
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return filtered.filter(record =>
                    new Date(record.record_date) >= weekStart
                );
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return filtered.filter(record =>
                    new Date(record.record_date) >= monthStart
                );
            default:
                return filtered;
        }
    }

    // NEW: Update salary summary cards
    updateSalarySummaryCards(salaryRecords) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyRecords = salaryRecords.filter(record =>
            new Date(record.record_date) >= monthStart && record.status === 'paid'
        );

        const totalPaid = monthlyRecords.reduce((sum, record) =>
            sum + parseFloat(record.amount || 0) + parseFloat(record.incentive_amount || 0) + parseFloat(record.advance_amount || 0), 0
        );

        const pendingCount = salaryRecords.filter(record =>
            record.status === 'pending'
        ).length;

        const totalIncentives = monthlyRecords.reduce((sum, record) =>
            sum + parseFloat(record.incentive_amount || 0), 0
        );

        document.getElementById('totalPaidAmount').textContent = Utils.formatCurrency(totalPaid);
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('totalIncentives').textContent = Utils.formatCurrency(totalIncentives);
    }

    // NEW: Mark salary as paid
    async markAsPaid(recordId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions', 'error');
            return;
        }

        try {
            this.ui.showLoading('Processing payment...');

            const record = this.salaryRecords.find(r => r.id === recordId);
            if (!record) {
                this.ui.showToast('Salary record not found', 'error');
                return;
            }

            // Check allocation before marking as paid
            const allocationStatus = this.calculateAllocationUsage(record.employee_id);
            const totalAllocationUsage = parseFloat(record.amount || 0) + parseFloat(record.advance_amount || 0);

            if (totalAllocationUsage > allocationStatus.remaining) {
                this.ui.showToast(`Cannot mark as paid: allocation usage (${Utils.formatCurrency(totalAllocationUsage)}) exceeds remaining allocation (${Utils.formatCurrency(allocationStatus.remaining)})`, 'error');
                return;
            }

            await this.db.update('salary_records', recordId, {
                status: 'paid',
                allocation_used: totalAllocationUsage,
                updated_at: new Date().toISOString()
            });

            this.ui.showToast('Salary marked as paid successfully', 'success');
            await this.loadSalaries();
            await this.loadEmployees();

        } catch (error) {
            console.error('Error marking salary as paid:', error);
            this.ui.showToast('Error marking salary as paid: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    // NEW: Update applyDateFilter to handle status filters
    applyDateFilter(filter) {
        this.currentDateFilter = filter;

        // Update active filter button
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });

        this.renderSalaryTable(this.salaryRecords);
    }

    // Export Methods
    showExportOptions() {
        const exportHtml = `
            <div id="exportModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Export Employees</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="export-options">
                        <div class="export-option" onclick="app.getManagers().employee.exportEmployeesToExcel()">
                            <div class="export-icon excel">
                                <i class="fas fa-file-excel"></i>
                            </div>
                            <div class="export-info">
                                <h4>Export to Excel</h4>
                                <p>Download as .xlsx file for data analysis</p>
                            </div>
                            <div class="export-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="export-option" onclick="app.getManagers().employee.exportEmployeesToPDF()">
                            <div class="export-icon pdf">
                                <i class="fas fa-file-pdf"></i>
                            </div>
                            <div class="export-info">
                                <h4>Export to PDF</h4>
                                <p>Download as .pdf file for reporting</p>
                            </div>
                            <div class="export-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
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
    }

    showSalaryExportOptions() {
        const exportHtml = `
            <div id="exportSalaryModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Export Salary Records</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="export-options">
                        <div class="export-option" onclick="app.getManagers().employee.exportSalaryToExcel()">
                            <div class="export-icon excel">
                                <i class="fas fa-file-excel"></i>
                            </div>
                            <div class="export-info">
                                <h4>Export to Excel</h4>
                                <p>Download salary data as .xlsx file</p>
                            </div>
                            <div class="export-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="export-option" onclick="app.getManagers().employee.exportSalaryToPDF()">
                            <div class="export-icon pdf">
                                <i class="fas fa-file-pdf"></i>
                            </div>
                            <div class="export-info">
                                <h4>Export to PDF</h4>
                                <p>Download salary report as .pdf file</p>
                            </div>
                            <div class="export-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().employee.closeExportModal()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(exportHtml, 'exportSalaryModal');
    }

    async exportFilteredData() {
        try {
            const filteredData = this.getFilteredDataForExport();
            if (filteredData.length === 0) {
                this.ui.showToast('No data to export for the selected filter', 'warning');
                return;
            }

            const title = `Salary Records - ${this.currentDateFilter}`;
            const filename = `salary_records_${this.currentDateFilter}_${new Date().toISOString().split('T')[0]}`;

            if (window.exportManager) {
                await window.exportManager.exportToExcel(filteredData, filename, title);
            } else {
                Utils.exportToExcel(filteredData, filename, title);
            }

            this.ui.showToast(`Exported ${filteredData.length} records successfully`, 'success');
        } catch (error) {
            console.error('Error exporting filtered data:', error);
            this.ui.showToast('Error exporting data: ' + error.message, 'error');
        }
    }

    getFilteredDataForExport() {
        const filteredRecords = this.filterRecordsByDate(this.salaryRecords);
        return filteredRecords.map(record => {
            const employee = this.employees.find(emp => emp.id === record.employee_id);
            return {
                'Employee ID': record.employee_id,
                'Employee Name': employee?.name || 'Unknown',
                'Date': Utils.formatDate(record.record_date),
                'Base Salary': record.amount,
                'Incentive Amount': record.incentive_amount || 0,
                'Allocation Used': record.allocation_used || 0,
                'Total Amount': parseFloat(record.amount) + parseFloat(record.incentive_amount || 0),
                'Week': `Week ${this.getWeekNumber(new Date(record.record_date))}`,
                'Month': new Date(record.record_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            };
        });
    }

    async exportEmployeeReport(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        try {
            this.ui.showExportProgress('Generating employee report...');

            const allocationStatus = this.calculateAllocationUsage(employeeId);
            const salaryRecords = this.salaryRecords.filter(record => record.employee_id === employeeId);
            const advanceRecords = this.advancePayments.filter(payment => payment.employee_id === employeeId);

            const exportData = this.prepareEmployeeExportData(employee, allocationStatus, salaryRecords, advanceRecords);

            const title = `Employee Report - ${employee.name} (${employee.id})`;
            const filename = `employee_report_${employee.id}_${new Date().toISOString().split('T')[0]}`;

            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, filename, title);
            } else {
                Utils.exportToExcel(exportData, filename, title);
            }

            this.ui.showToast('Employee report exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting employee report:', error);
            this.ui.showToast('Error exporting employee report: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    prepareEmployeeExportData(employee, allocationStatus, salaryRecords, advanceRecords) {
        const data = [];

        // Employee Information
        data.push(
            { 'Section': 'Employee Information', '': '' },
            { 'Employee ID': employee.id, 'Name': employee.name },
            { 'Role': employee.role, 'Type': employee.employee_type },
            { 'Salary Type': allocationStatus.allocation?.salary_type || 'Not Set', 'Join Date': Utils.formatDate(employee.join_date) },
            { '': '', '': '' }
        );

        // Allocation Summary
        data.push(
            { 'Section': 'Allocation Summary', '': '' },
            { 'Year': this.getCurrentYear(), 'Total Allocated': Utils.formatCurrency(allocationStatus.allocated) },
            { 'Amount Used': Utils.formatCurrency(allocationStatus.used), 'Remaining Balance': Utils.formatCurrency(allocationStatus.remaining) },
            { 'Usage Percentage': allocationStatus.usagePercentage.toFixed(2) + '%', '': '' },
            { '': '', '': '' }
        );

        // Salary Records
        if (salaryRecords.length > 0) {
            data.push(
                { 'Section': 'Salary Payment History', '': '' },
                { 'Date': '', 'Base Salary': '', 'Incentive': '', 'Allocation Used': '', 'Total': '', 'Week': '' }
            );

            salaryRecords.forEach(record => {
                data.push({
                    'Date': Utils.formatDate(record.record_date),
                    'Base Salary': Utils.formatCurrency(record.amount),
                    'Incentive': Utils.formatCurrency(record.incentive_amount || 0),
                    'Allocation Used': Utils.formatCurrency(record.allocation_used || 0),
                    'Total': Utils.formatCurrency(parseFloat(record.amount) + parseFloat(record.incentive_amount || 0)),
                    'Week': `Week ${this.getWeekNumber(new Date(record.record_date))}`
                });
            });
            data.push({ '': '', '': '' });
        }

        // Advance Records
        if (advanceRecords.length > 0) {
            data.push(
                { 'Section': 'Advance Payment History', '': '' },
                { 'Date': '', 'Amount': '', 'Allocation Used': '', 'Status': '', 'Week': '' }
            );

            advanceRecords.forEach(payment => {
                data.push({
                    'Date': Utils.formatDate(payment.payment_date),
                    'Amount': Utils.formatCurrency(payment.amount),
                    'Allocation Used': Utils.formatCurrency(payment.allocation_used || 0),
                    'Status': payment.confirmed ? 'Confirmed' : 'Pending',
                    'Week': `Week ${payment.week_number}`
                });
            });
        }

        return data;
    }

    // Utility Methods
    populateEmployeeSelect(employees) {
        const select = document.getElementById('salaryEmployee');
        if (!select) return;

        select.innerHTML = '<option value="">Select Employee</option>' +
            employees.map(emp => {
                const allocation = this.calculateAllocationUsage(emp.id);
                return `
                    <option value="${emp.id}" data-name="${emp.name}">
                        ${emp.id} - ${emp.name} - ${emp.role} (${Utils.formatCurrency(allocation.remaining)} remaining)
                    </option>
                `;
            }).join('');
    }

    toggleEmployeeType() {
        const employeeType = document.querySelector('input[name="employeeType"]:checked');
        const vehicleField = document.getElementById('vehicleNumberField');

        if (employeeType && vehicleField) {
            if (employeeType.value === 'driver') {
                vehicleField.style.display = 'block';
                document.getElementById('employeeVehicleNumber').required = true;
            } else {
                vehicleField.style.display = 'none';
                document.getElementById('employeeVehicleNumber').required = false;
            }
        }
    }

    generateEmployeeId(employeeType, existingEmployees) {
        const prefix = employeeType === 'driver' ? 'DR' : 'EM';
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

    // Existing methods that need to be kept
    showAddEmployeeModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to add employees', 'error');
            return;
        }

        this.ui.showModal('employeeModal');
        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
        document.getElementById('employeeForm').reset();
        document.getElementById('editEmployeeId').value = '';

        document.getElementById('employeeJoinDate').value = new Date().toISOString().split('T')[0];
        document.querySelector('input[name="employeeType"][value="employee"]').checked = true;
        this.toggleEmployeeType();
    }

    async editEmployee(employeeId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to edit employees', 'error');
            return;
        }

        try {
            this.ui.showLoading('Loading employee...');
            const employee = this.employees.find(emp => emp.id === employeeId);

            if (employee) {
                document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
                document.getElementById('editEmployeeId').value = employee.id;
                document.getElementById('employeeName').value = employee.name;
                document.getElementById('employeePhone').value = employee.phone || '';
                document.getElementById('employeeEmail').value = employee.email || '';
                document.getElementById('employeeRole').value = employee.role || '';
                document.getElementById('employeeJoinDate').value = employee.join_date || '';

                const employeeType = employee.employee_type || 'employee';
                document.querySelector(`input[name="employeeType"][value="${employeeType}"]`).checked = true;

                if (employeeType === 'driver') {
                    document.getElementById('employeeVehicleNumber').value = employee.vehicle_number || '';
                }

                // FIXED: Load allocation amount properly with null check
                const allocation = this.getEmployeeYearlyAllocation(employeeId);
                const allocationInput = document.getElementById('employeeAllocation');
                if (allocationInput) {
                    allocationInput.value = allocation?.allocated_amount || '';
                }

                this.toggleEmployeeType();

                // FIXED: Ensure modal is properly shown after data is loaded
                setTimeout(() => {
                    this.ui.showModal('employeeModal');
                }, 100);
            } else {
                this.ui.showToast('Employee not found', 'error');
            }
        } catch (error) {
            console.error('Error loading employee:', error);
            this.ui.showToast('Error loading employee', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }
    // NEW METHOD: Create yearly allocation (only when client explicitly sets amount)
    async createEmployeeAllocation(employeeId, amount) {
        try {
            const allocationData = {
                employee_id: employeeId,
                year: this.getCurrentYear(),
                allocated_amount: amount,
                salary_type: 'monthly', // Default, can be changed later
                notes: 'Initial allocation set during employee creation',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            allocationData.id = `ALLOC_${employeeId}_${this.getCurrentYear()}`;
            await this.db.create('yearly_allocations', allocationData);
            console.log(`✅ Created allocation for ${employeeId}: ${amount}`);
        } catch (error) {
            console.error('Error creating allocation:', error);
            throw error; // Propagate error to handle in calling function
        }
    }

    // NEW METHOD: Update yearly allocation
    async updateEmployeeAllocation(employeeId, amount) {
        try {
            const existingAllocation = this.getEmployeeYearlyAllocation(employeeId);

            if (existingAllocation) {
                // Update existing allocation
                await this.db.update('yearly_allocations', existingAllocation.id, {
                    allocated_amount: amount,
                    updated_at: new Date().toISOString()
                });
            } else {
                // Create new allocation if amount > 0
                if (amount > 0) {
                    await this.createEmployeeAllocation(employeeId, amount);
                }
                // If amount is 0 and no allocation exists, do nothing (client choice)
            }
        } catch (error) {
            console.error('Error updating allocation:', error);
            throw error;
        }
    }
    // NEW: Create searchable employee dropdown
    createSearchableEmployeeDropdown() {
        const salaryEmployeeSelect = document.getElementById('salaryEmployee');
        if (!salaryEmployeeSelect) return;

        // Create search wrapper
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'searchable-dropdown-wrapper';
        searchWrapper.style.position = 'relative';

        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search employees...';
        searchInput.className = 'searchable-dropdown-input';
        searchInput.style.cssText = `
        width: 100%;
        padding: 12px 15px;
        border: 2px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 1rem;
        margin-bottom: 10px;
    `;

        // Create dropdown list
        const dropdownList = document.createElement('div');
        dropdownList.className = 'searchable-dropdown-list';
        dropdownList.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-primary);
        border: 2px solid var(--border-color);
        border-top: none;
        border-radius: 0 0 var(--border-radius) var(--border-radius);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: var(--shadow);
    `;

        // Replace original select
        salaryEmployeeSelect.style.display = 'none';
        salaryEmployeeSelect.parentNode.insertBefore(searchWrapper, salaryEmployeeSelect);
        searchWrapper.appendChild(searchInput);
        searchWrapper.appendChild(dropdownList);

        // Populate dropdown
        this.populateSearchableDropdown();

        // Event listeners
        searchInput.addEventListener('focus', () => {
            dropdownList.style.display = 'block';
            this.filterDropdownOptions(searchInput.value);
        });

        searchInput.addEventListener('input', (e) => {
            this.filterDropdownOptions(e.target.value);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                dropdownList.style.display = 'none';
            }, 200);
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!searchWrapper.contains(e.target)) {
                dropdownList.style.display = 'none';
            }
        });
    }

    // NEW: Populate searchable dropdown
    populateSearchableDropdown() {
        const dropdownList = document.querySelector('.searchable-dropdown-list');
        if (!dropdownList) return;

        dropdownList.innerHTML = '';

        this.employees.forEach(employee => {
            const allocation = this.calculateAllocationUsage(employee.id);
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.style.cssText = `
            padding: 12px 15px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.2s ease;
        `;
            option.innerHTML = `
            <div style="font-weight: 600;">${employee.name}</div>
            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                ${employee.id} - ${employee.role} - ${Utils.formatCurrency(allocation.remaining)} remaining
            </div>
        `;

            option.addEventListener('click', () => {
                const searchInput = document.querySelector('.searchable-dropdown-input');
                const salaryEmployeeSelect = document.getElementById('salaryEmployee');

                searchInput.value = `${employee.name} (${employee.id})`;
                salaryEmployeeSelect.value = employee.id;
                dropdownList.style.display = 'none';
            });

            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = 'var(--bg-tertiary)';
            });

            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = 'transparent';
            });

            dropdownList.appendChild(option);
        });
    }

    // NEW: Filter dropdown options
    filterDropdownOptions(searchTerm) {
        const dropdownList = document.querySelector('.searchable-dropdown-list');
        const options = dropdownList.querySelectorAll('.dropdown-option');

        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }
    addSalaryRecord(employeeId) {
        this.closeEmployeeDetails();

        const employee = this.employees.find(emp => emp.id === employeeId);
        if (employee) {
            document.getElementById('salaryEmployee').value = employeeId;
            document.getElementById('salaryDate').value = new Date().toISOString().split('T')[0];

            this.ui.showSection('salary');
            this.ui.showToast(`Ready to add salary for ${employee.name}`, 'success');
        }
    }

    async deleteSalaryRecord(recordId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to delete salary records', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this salary record?')) {
            return;
        }

        try {
            this.ui.showLoading('Deleting salary record...');
            await this.db.delete('salary_records', recordId);
            this.ui.showToast('Salary record deleted successfully', 'success');
            await this.loadSalaries();
        } catch (error) {
            console.error('Error deleting salary record:', error);
            this.ui.showToast('Error deleting salary record: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async deleteTransaction(recordId, type) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this record?')) {
            return;
        }

        try {
            this.ui.showLoading('Deleting record...');

            if (type === 'salary') {
                await this.db.delete('salary_records', recordId);
            } else {
                await this.db.delete('advance_payments', recordId);
            }

            this.ui.showToast('Record deleted successfully', 'success');
            await this.loadEmployees();

        } catch (error) {
            console.error('Error deleting record:', error);
            this.ui.showToast('Error deleting record: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async confirmAdvancePayment(paymentId) {
        try {
            const payment = this.advancePayments.find(p => p.id === paymentId);
            if (!payment) {
                this.ui.showToast('Payment not found', 'error');
                return;
            }

            if (payment.confirmed) {
                this.ui.showToast('Payment already confirmed', 'warning');
                return;
            }

            const allocationStatus = this.calculateAllocationUsage(payment.employee_id);
            if (payment.amount > allocationStatus.remaining) {
                this.ui.showToast('Cannot confirm payment: amount exceeds remaining allocation', 'error');
                return;
            }

            await this.db.update('advance_payments', paymentId, {
                confirmed: true,
                allocation_used: payment.amount
            });

            this.ui.showToast('Payment confirmed successfully', 'success');
            await this.loadEmployees();

        } catch (error) {
            console.error('Error confirming payment:', error);
            this.ui.showToast('Error confirming payment: ' + error.message, 'error');
        }
    }

    closeExportModal() {
        const modals = ['exportModal', 'exportSalaryModal'];
        modals.forEach(modalId => {
            this.ui.hideModal(modalId);
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });
    }

    async exportEmployeesToExcel() {
        await this.exportEmployees('excel');
        this.closeExportModal();
    }

    async exportEmployeesToPDF() {
        await this.exportEmployees('pdf');
        this.closeExportModal();
    }

    async exportSalaryToExcel() {
        await this.exportSalary('excel');
        this.closeExportModal();
    }

    async exportSalaryToPDF() {
        await this.exportSalary('pdf');
        this.closeExportModal();
    }

    async exportEmployees(format = 'excel') {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Insufficient permissions to export employees', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing employee data...');

            const employees = await this.db.getEmployees();
            if (employees.length === 0) {
                this.ui.showToast('No employees to export', 'warning');
                return;
            }

            const exportData = employees.map(emp => {
                const allocationStatus = this.calculateAllocationUsage(emp.id);
                const employeeRecords = this.salaryRecords.filter(record => record.employee_id === emp.id);

                return {
                    'Employee ID': emp.id,
                    'Name': emp.name,
                    'Phone': emp.phone || '',
                    'Type': emp.employee_type === 'driver' ? 'Driver' : 'Employee',
                    'Vehicle Number': emp.vehicle_number || '',
                    'Role': emp.role,
                    'Join Date': Utils.formatDate(emp.join_date),
                    'Salary Type': allocationStatus.allocation?.salary_type || 'Not Set',
                    'Yearly Allocation': allocationStatus.allocated,
                    'Allocation Used': allocationStatus.used,
                    'Remaining Allocation': allocationStatus.remaining,
                    'Salary Records': employeeRecords.length,
                    'Created Date': Utils.formatDate(emp.created_at)
                };
            });

            const title = 'Employees Report';
            const filename = `employees_report_${new Date().toISOString().split('T')[0]}`;

            if (format === 'pdf') {
                if (window.exportManager) {
                    await window.exportManager.exportToPDF(exportData, filename, title);
                } else {
                    await Utils.exportToPDF(exportData, filename, title);
                }
            } else {
                if (window.exportManager) {
                    await window.exportManager.exportToExcel(exportData, filename, title);
                } else {
                    Utils.exportToExcel(exportData, filename);
                }
            }

            this.ui.showToast(`Employees exported to ${format.toUpperCase()} successfully`, 'success');
        } catch (error) {
            console.error('Error exporting employees:', error);
            this.ui.showToast('Error exporting employees: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportSalary(format = 'excel') {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Insufficient permissions to export salary records', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing salary data...');

            const salaryRecords = await this.db.getSalaryRecords();
            if (salaryRecords.length === 0) {
                this.ui.showToast('No salary records to export', 'warning');
                return;
            }

            const exportData = salaryRecords.map(record => ({
                'Employee ID': record.employee_id,
                'Employee Name': record.employee_name,
                'Date': Utils.formatDate(record.record_date),
                'Base Salary': record.amount,
                'Incentive Amount': record.incentive_amount || 0,
                'Allocation Used': record.allocation_used || 0,
                'Total Amount': parseFloat(record.amount) + parseFloat(record.incentive_amount || 0),
                'Week': `Week ${this.getWeekNumber(new Date(record.record_date))}`,
                'Month': new Date(record.record_date).toLocaleDateString('en-US', { month: 'long' }),
                'Year': new Date(record.record_date).getFullYear(),
                'Created Date': Utils.formatDate(record.created_at)
            }));

            const title = 'Salary Records Report';
            const filename = `salary_records_${new Date().toISOString().split('T')[0]}`;

            if (format === 'pdf') {
                if (window.exportManager) {
                    await window.exportManager.exportToPDF(exportData, filename, title);
                } else {
                    await Utils.exportToPDF(exportData, filename, title);
                }
            } else {
                if (window.exportManager) {
                    await window.exportManager.exportToExcel(exportData, filename, title);
                } else {
                    Utils.exportToExcel(exportData, filename);
                }
            }

            this.ui.showToast(`Salary records exported to ${format.toUpperCase()} successfully`, 'success');
        } catch (error) {
            console.error('Error exporting salary records:', error);
            this.ui.showToast('Error exporting salary records: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }
}

window.EmployeeManager = EmployeeManager;