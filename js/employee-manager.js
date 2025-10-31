class EmployeeManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('EmployeeManager: dependencies required');
        if (!dependencies.db) throw new Error('EmployeeManager: db dependency is required');
        if (!dependencies.ui) throw new Error('EmployeeManager: ui dependency is required');
        if (!dependencies.auth) throw new Error('EmployeeManager: auth dependency is required');

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

        this.familyGroups = [];
        this.attendanceRecords = [];
        this.simpleAdvances = [];
        this.salaryPayments = [];

        this.handleEmployeeSubmit = this.handleEmployeeSubmit.bind(this);
        this.handleSalarySubmit = this.handleSalarySubmit.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
        this.handleYearlyAllocation = this.handleYearlyAllocation.bind(this);
        this.handleAdvancePayment = this.handleAdvancePayment.bind(this);

        console.log('✅ EmployeeManager initialized');
    }

    async initialize() {
        try {
            console.log('🔄 Initializing EmployeeManager...');

            await this.loadEmployees();
            await this.loadOptionalData();

            this.setupEventListeners();
            console.log('✅ EmployeeManager initialization complete');
        } catch (error) {
            console.error('❌ EmployeeManager initialization failed:', error);
        }
        return Promise.resolve();
    }

    // In EmployeeManager - update loadEmployees method
    async loadEmployees() {
        // Prevent duplicate loading
        if (this.isLoading) {
            console.log('🔄 Employee load already in progress, skipping...');
            return;
        }

        try {
            this.isLoading = true;
            console.log('👥 Loading employees...');
            this.ui.showSectionLoading('employeesContent', 'Loading employees...');

            // Only load if we don't have data or need refresh
            if (this.employees.length === 0) {
                this.employees = await this.db.getEmployees() || [];
                console.log('✅ Employees loaded:', this.employees.length);
            }

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
            { name: 'familyGroups', method: () => this.loadFamilyGroups() },
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
            } catch (error) {
                console.warn(`⚠️ ${load.name} not available:`, error.message);
            }
        }
    }

    async loadFamilyGroups() {
        try {
            this.familyGroups = await this.db.getFamilyGroups() || [];
            console.log('✅ Family groups loaded:', this.familyGroups.length);
        } catch (error) {
            console.warn('⚠️ Family groups not available');
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

        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debouncedSearch(e.target.value);
            });
        }

        const employeeForm = document.getElementById('employeeForm');
        if (employeeForm) {
            employeeForm.addEventListener('submit', (e) => this.handleEmployeeSubmit(e));
        }

        const employeeTypeRadios = document.querySelectorAll('input[name="employeeType"]');
        employeeTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleEmployeeTypeChange(e.target.value));
        });

        console.log('✅ Employee event listeners setup complete');
    }

    handleGlobalClick(e) {
        if (e.target.id === 'addEmployeeBtn' || e.target.closest('#addEmployeeBtn')) {
            e.preventDefault();
            this.showAddEmployeeModal();
            return;
        }

        // In EmployeeManager handleGlobalClick method
        if (e.target.id === 'exportEmployeesBtn' || e.target.closest('#exportEmployeesBtn')) {
            e.preventDefault();
            this.showExportOptions(); // Changed from this.exportEmployees()
            return;
        }

        if (e.target.id === 'createFamilyGroupBtn' || e.target.closest('#createFamilyGroupBtn')) {
            e.preventDefault();
            this.showFamilyGroupModal();
            return;
        }

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

        if (e.target.classList.contains('status-toggle-btn')) {
            const employeeId = e.target.getAttribute('data-employee-id');
            const currentStatus = e.target.getAttribute('data-current-status');
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            this.updateEmployeeStatus(employeeId, newStatus);
            return;
        }

        if (e.target.id === 'clearSearchBtn' || e.target.closest('#clearSearchBtn')) {
            this.clearSearch();
            return;
        }
    }

    removeEventListeners() {
        const employeeForm = document.getElementById('employeeForm');
        if (employeeForm) {
            employeeForm.removeEventListener('submit', this.handleEmployeeSubmit);
        }
    }

    showAddEmployeeModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage employees', 'error');
            return;
        }

        this.ui.showModal('employeeModal');
        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
        document.getElementById('employeeForm').reset();
        document.getElementById('editEmployeeId').value = '';
        document.getElementById('employeeJoinDate').value = new Date().toISOString().split('T')[0];

        document.getElementById('vehicleNumberField').style.display = 'none';
    }

    handleEmployeeTypeChange(type) {
        const vehicleField = document.getElementById('vehicleNumberField');
        if (type === 'driver') {
            vehicleField.style.display = 'block';
            document.getElementById('employeeVehicleNumber').required = true;
        } else {
            vehicleField.style.display = 'none';
            document.getElementById('employeeVehicleNumber').required = false;
            document.getElementById('employeeVehicleNumber').value = '';
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
                document.getElementById('employeeName').value = employee.name;
                document.getElementById('employeePhone').value = employee.phone || '';
                document.getElementById('employeeEmail').value = employee.email || '';
                document.getElementById('employeeRole').value = employee.role || '';
                document.getElementById('employeeJoinDate').value = employee.join_date || new Date().toISOString().split('T')[0];

                const employeeType = employee.employee_type || 'employee';
                document.querySelector(`input[name="employeeType"][value="${employeeType}"]`).checked = true;
                this.handleEmployeeTypeChange(employeeType);

                if (employeeType === 'driver') {
                    document.getElementById('employeeVehicleNumber').value = employee.vehicle_number || '';
                }

                const salaryType = employee.salary_type || 'daily';
                document.querySelector(`input[name="salaryType"][value="${salaryType}"]`).checked = true;

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
        const employeeType = document.querySelector('input[name="employeeType"]:checked').value;
        const salaryType = document.querySelector('input[name="salaryType"]:checked').value;
        const vehicleNumber = document.getElementById('employeeVehicleNumber').value.trim();

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
        const resetButton = this.ui.showButtonLoading(button, 'Saving...');

        try {
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
                await this.db.update('employees', employeeId, employeeData);
                this.ui.showToast('Employee updated successfully', 'success');
            } else {
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
            resetButton();
        }
    }

    async updateEmployeeStatus(employeeId, status) {
        try {
            await this.db.update('employees', employeeId, {
                status: status,
                updated_at: new Date().toISOString()
            });
            this.ui.showToast(`Employee status updated to ${status}`, 'success');
            await this.loadEmployees();
        } catch (error) {
            console.error('Error updating employee status:', error);
            this.ui.showToast('Error updating employee status', 'error');
        }
    }

    handleSearch(searchTerm) {
        this.currentSearchTerm = searchTerm.toLowerCase();

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

    debouncedSearch = this.debounce(this.handleSearch, 300);

    employeeMatchesSearch(employee, searchTerm) {
        if (!searchTerm) return true;

        const searchFields = [
            employee.id?.toLowerCase(),
            employee.name?.toLowerCase(),
            employee.phone?.toLowerCase(),
            employee.role?.toLowerCase(),
            employee.employee_type?.toLowerCase()
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
                    <td colspan="10" class="no-data">
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
                        <span class="status-badge status-${employee.status || 'active'}">
                            ${employee.status || 'active'}
                        </span>
                        <button class="btn-icon status-toggle-btn" 
                                data-employee-id="${employee.id}"
                                data-current-status="${employee.status || 'active'}"
                                title="Toggle Status">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </td>
                    <td>${employee.role || 'N/A'}</td>
                    <td>${this.formatDate(employee.join_date)}</td>
                    <td>
                        ${familyGroup ?
                    `<span class="family-badge" title="${familyGroup.family_name}">
                                <i class="fas fa-users"></i> ${familyGroup.family_name}
                            </span>` :
                    '<span class="text-muted">None</span>'
                }
                    </td>
                    <td>${this.formatCurrency(pendingAdvances)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.showEmployeeDetails('${employee.id}')">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.editEmployee('${employee.id}')">
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
        return 0;
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

        select.innerHTML = '<option value="">Select Employee</option>' +
            employees.map(emp => `
                <option value="${emp.id}">
                    ${emp.id} - ${emp.name} - ${emp.role}
                </option>
            `).join('');
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
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

    async showEmployeeDetails(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const modalHtml = `
            <div id="employeeDetailsModal" class="modal">
                <div class="modal-content" style="max-width: 800px;">
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
                            </div>
                        </div>

                        <div class="details-section">
                            <h4>Quick Actions</h4>
                            <div class="action-buttons-grid">
                                <button class="btn-primary" onclick="app.getManagers().employee.editEmployee('${employee.id}')">
                                    <i class="fas fa-edit"></i> Edit Employee
                                </button>
                                <button class="btn-secondary" onclick="app.getManagers().attendance.showQuickAttendanceModal()">
                                    <i class="fas fa-calendar-check"></i> Mark Attendance
                                </button>
                                <button class="btn-secondary" onclick="app.getManagers().salary.showAdvanceModal('${employee.id}')">
                                    <i class="fas fa-money-bill-wave"></i> Add Advance
                                </button>
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

    showFamilyGroupModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to manage family groups', 'error');
            return;
        }

        const modalHtml = `
            <div id="familyGroupModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-users"></i> Create Family Group</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="familyGroupForm" class="modal-form">
                        <div class="form-group">
                            <label>Family Name *</label>
                            <input type="text" id="familyName" required placeholder="Enter family name">
                        </div>
                        <div class="form-group">
                            <label>Primary Member *</label>
                            <select id="primaryMemberId" required>
                                <option value="">Select Primary Member</option>
                                ${this.employees.map(emp => `
                                    <option value="${emp.id}">${emp.name} (${emp.id})</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Bank Account Number</label>
                            <input type="text" id="bankAccountNumber" placeholder="Enter account number">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Bank Name</label>
                                <input type="text" id="bankName" placeholder="Enter bank name">
                            </div>
                            <div class="form-group">
                                <label>IFSC Code</label>
                                <input type="text" id="ifscCode" placeholder="Enter IFSC code">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Create Family Group</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'familyGroupModal');

        document.getElementById('familyGroupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                family_name: document.getElementById('familyName').value,
                primary_member_id: document.getElementById('primaryMemberId').value,
                bank_account_number: document.getElementById('bankAccountNumber').value,
                bank_name: document.getElementById('bankName').value,
                ifsc_code: document.getElementById('ifscCode').value
            };

            await this.createFamilyGroup(formData);
            this.ui.hideModal('familyGroupModal');
        });
    }

    async createFamilyGroup(familyData) {
        try {
            const familyId = `FAM_${Date.now()}`;
            const groupData = {
                id: familyId,
                family_name: familyData.family_name,
                primary_member_id: familyData.primary_member_id,
                bank_account_number: familyData.bank_account_number,
                bank_name: familyData.bank_name,
                ifsc_code: familyData.ifsc_code,
                created_at: new Date().toISOString()
            };

            await this.db.create('family_groups', groupData);

            if (familyData.primary_member_id) {
                await this.db.update('employees', familyData.primary_member_id, {
                    family_group_id: familyId
                });
            }

            this.ui.showToast('Family group created successfully', 'success');
            await this.loadFamilyGroups();
            await this.loadEmployees();
            return familyId;
        } catch (error) {
            console.error('Error creating family group:', error);
            this.ui.showToast('Error creating family group', 'error');
            throw error;
        }
    }
    // In EmployeeManager - update showExportOptions method
    showExportOptions() {
        this.showExportModal('employees', ['excel', 'pdf']); // Now includes PDF
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
            <div class="export-option" onclick="app.getManagers().${type === 'employees' ? 'employee' : 'user'}.exportTo${format.toUpperCase()}('${type}')">
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
                    <button class="btn-secondary" onclick="app.getManagers().${type === 'employees' ? 'employee' : 'user'}.closeExportModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(exportHtml, 'exportModal');
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



    // Update exportData method to handle PDF properly
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
    async exportEmployees() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Insufficient permissions to export employees', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing employee data...');

            if (this.employees.length === 0) {
                this.ui.showToast('No employees to export', 'warning');
                return;
            }

            const exportData = this.employees.map(employee => {
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

            const title = 'Employees Report';
            const filename = `employees_export_${new Date().toISOString().split('T')[0]}`;

            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, filename, title);
            } else {
                Utils.exportToExcel(exportData, filename);
            }

            this.ui.showToast('Employees exported to Excel successfully', 'success');
        } catch (error) {
            console.error('Error exporting employees:', error);
            this.ui.showToast('Error exporting employees: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    showCustomModal(html, modalId) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', html);
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

            const resetButton = this.ui.showButtonLoading(submitButton, 'Adding Salary...');

            try {
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
                resetButton();
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
            resetButton();
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

    cleanup() {
        this.removeEventListeners();
        console.log('🧹 EmployeeManager cleaned up');
    }
}

window.EmployeeManager = EmployeeManager;