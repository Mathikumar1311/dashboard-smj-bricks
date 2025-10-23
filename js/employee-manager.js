class EmployeeManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.employees = [];
        this.salaryRecords = [];
        this.filteredEmployees = [];
        this.currentSearchTerm = '';

        // Bind methods
        this.handleSalarySubmit = this.handleSalarySubmit.bind(this);
        this.handleEmployeeSubmit = this.handleEmployeeSubmit.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
        this.debouncedSearch = this.debounce(this.handleSearch, 300);
    }

    // Debounce search to improve performance
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
        this.setupEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addEmployeeBtn' || e.target.closest('#addEmployeeBtn')) {
                this.showAddEmployeeModal();
            }

            if (e.target.id === 'exportEmployeesBtn' || e.target.closest('#exportEmployeesBtn')) {
                this.showExportOptions();
            }

            if (e.target.id === 'exportSalaryBtn' || e.target.closest('#exportSalaryBtn')) {
                this.showSalaryExportOptions();
            }

            if (e.target.name === 'employeeType' || e.target.closest('input[name="employeeType"]')) {
                this.toggleEmployeeType();
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
            }

            // Search clear button
            if (e.target.id === 'clearSearchBtn' || e.target.closest('#clearSearchBtn')) {
                this.clearSearch();
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

        // Modal close events
        const modalClose = document.querySelector('#employeeModal .modal-close');
        const modalCancel = document.querySelector('#employeeModal .modal-cancel');
        if (modalClose) modalClose.addEventListener('click', () => this.ui.hideModal('employeeModal'));
        if (modalCancel) modalCancel.addEventListener('click', () => this.ui.hideModal('employeeModal'));
    }

    // Search functionality
    handleSearch() {
        const searchInput = document.getElementById('employeeSearch');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (!searchInput) return;

        const searchTerm = searchInput.value.trim().toLowerCase();
        this.currentSearchTerm = searchTerm;

        // Show/hide clear button
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

        // Show toast only if there was an active search
        if (this.currentSearchTerm) {
            this.ui.showToast('Search cleared', 'info');
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

    // MISSING METHOD: Get total salary for employee
    getEmployeeTotalSalary(employeeId) {
        const employeeRecords = this.salaryRecords.filter(record => record.employee_id === employeeId);
        return employeeRecords.reduce((total, record) => {
            const baseSalary = parseFloat(record.amount || 0);
            const incentive = parseFloat(record.incentive_amount || 0);
            return total + baseSalary + incentive;
        }, 0);
    }

    async loadEmployees() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('👨‍💼 Loading employees...');
            this.ui.showSectionLoading('employeesContent', 'Loading employees...');

            // Load both employees and salary records
            const [employees, salaryRecords] = await Promise.all([
                this.db.getEmployees(),
                this.db.getSalaryRecords()
            ]);

            this.employees = employees;
            this.salaryRecords = salaryRecords;

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

            this.ui.showToast('Employees loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading employees:', error);
            this.ui.showToast('Error loading employees', 'error');
        } finally {
            this.ui.hideSectionLoading('employeesContent');
        }
    }

    // MISSING METHOD: Load salaries
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

    renderEmployeesTable(employees) {
        const tbody = document.getElementById('employeesTableBody');
        if (!tbody) return;

        if (employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
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

        tbody.innerHTML = employees.map(emp => `
            <tr class="employee-row" data-employee-id="${emp.id}" style="cursor: pointer;">
                <td><strong>${emp.id || 'N/A'}</strong></td>
                <td>${emp.name}</td>
                <td>${emp.phone || 'N/A'}</td>
                <td>
                    <span class="badge ${emp.employee_type === 'driver' ? 'badge-driver' : 'badge-employee'}">
                        ${emp.employee_type === 'driver' ? '🚗 Driver' : '👨‍💼 Employee'}
                    </span>
                </td>
                <td>${emp.role || 'N/A'}</td>
                <td>${Utils.formatDate(emp.join_date)}</td>
                <td>${Utils.formatCurrency(this.getEmployeeTotalSalary(emp.id))}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary btn-sm view-details-btn" title="View Details">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.editEmployee('${emp.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.deleteEmployee('${emp.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // MISSING METHOD: Setup salary form
    setupSalaryForm() {
        const salaryForm = document.getElementById('salaryForm');
        if (salaryForm) {
            // Remove ALL existing listeners to prevent duplicates
            const newForm = salaryForm.cloneNode(true);
            salaryForm.parentNode.replaceChild(newForm, salaryForm);
            
            // Add fresh listener
            newForm.addEventListener('submit', (e) => this.handleSalarySubmit(e));

            // Initialize calculation
            this.initializeSalaryFormCalculation();

            console.log('✅ Salary form setup completed');
        } else {
            console.warn('⚠️ Salary form not found in DOM');
        }
    }

    // MISSING METHOD: Initialize salary form calculation
    initializeSalaryFormCalculation() {
        const salaryAmount = document.getElementById('salaryAmount');
        const incentiveAmount = document.getElementById('incentiveAmount');
        const totalAmount = document.getElementById('totalAmount');

        const calculateTotal = () => {
            const base = parseFloat(salaryAmount?.value) || 0;
            const incentive = parseFloat(incentiveAmount?.value) || 0;
            const total = base + incentive;
            if (totalAmount) {
                totalAmount.value = Utils.formatCurrency(total);
            }
        };

        if (salaryAmount && incentiveAmount && totalAmount) {
            salaryAmount.addEventListener('input', calculateTotal);
            incentiveAmount.addEventListener('input', calculateTotal);
            calculateTotal(); // Initial calculation
        }
    }

    // MISSING METHOD: Toggle employee type
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

    // MISSING METHOD: Generate employee ID
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

    async showEmployeeDetails(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const employeeRecords = this.salaryRecords.filter(record => record.employee_id === employeeId);
        const totalSalary = this.getEmployeeTotalSalary(employeeId);
        const baseSalaryTotal = employeeRecords.reduce((total, record) => total + parseFloat(record.amount || 0), 0);
        const incentiveTotal = employeeRecords.reduce((total, record) => total + parseFloat(record.incentive_amount || 0), 0);

        const modalHtml = `
            <div id="employeeDetailsModal" class="modal">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-user-tie"></i>
                            Employee Details - ${employee.name} (${employee.id})
                        </h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="employee-details-container">
                        <!-- Employee Basic Info -->
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
                                ${employee.vehicle_number ? `
                                <div class="detail-item">
                                    <label>Vehicle Number:</label>
                                    <span>${employee.vehicle_number}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Salary Summary -->
                        <div class="details-section">
                            <h4><i class="fas fa-chart-bar"></i> Salary Summary</h4>
                            <div class="summary-cards">
                                <div class="summary-card total-salary">
                                    <div class="summary-icon">
                                        <i class="fas fa-money-bill-wave"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-label">Total Paid</div>
                                        <div class="summary-value">${Utils.formatCurrency(totalSalary)}</div>
                                    </div>
                                </div>
                                <div class="summary-card base-salary">
                                    <div class="summary-icon">
                                        <i class="fas fa-wallet"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-label">Base Salary</div>
                                        <div class="summary-value">${Utils.formatCurrency(baseSalaryTotal)}</div>
                                    </div>
                                </div>
                                <div class="summary-card incentive">
                                    <div class="summary-icon">
                                        <i class="fas fa-gift"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-label">Incentives</div>
                                        <div class="summary-value">${Utils.formatCurrency(incentiveTotal)}</div>
                                    </div>
                                </div>
                                <div class="summary-card records">
                                    <div class="summary-icon">
                                        <i class="fas fa-receipt"></i>
                                    </div>
                                    <div class="summary-content">
                                        <div class="summary-label">Records</div>
                                        <div class="summary-value">${employeeRecords.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Salary Records Table -->
                        <div class="details-section">
                            <div class="section-header">
                                <h4><i class="fas fa-history"></i> Salary Payment History</h4>
                                <button class="btn-primary btn-sm" onclick="app.getManagers().employee.addSalaryRecord('${employee.id}')">
                                    <i class="fas fa-plus"></i> Add Payment
                                </button>
                            </div>
                            
                            ${employeeRecords.length > 0 ? `
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Base Salary</th>
                                            <th>Incentive</th>
                                            <th>Total Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${employeeRecords.map(record => `
                                            <tr>
                                                <td>${Utils.formatDate(record.record_date)}</td>
                                                <td>${Utils.formatCurrency(record.amount)}</td>
                                                <td>${Utils.formatCurrency(record.incentive_amount || 0)}</td>
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
                            Close
                        </button>
                        <button class="btn-primary" onclick="app.getManagers().employee.exportEmployeeReport('${employee.id}')">
                            <i class="fas fa-download"></i> Export Report
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('employeeDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Setup modal events
        const modal = document.getElementById('employeeDetailsModal');
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeEmployeeDetails());

        // Show modal
        this.ui.showModal('employeeDetailsModal');
    }

    closeEmployeeDetails() {
        this.ui.hideModal('employeeDetailsModal');
        const modal = document.getElementById('employeeDetailsModal');
        if (modal) {
            modal.remove();
        }
    }

    addSalaryRecord(employeeId) {
        this.closeEmployeeDetails();

        // Pre-fill the salary form
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (employee) {
            document.getElementById('salaryEmployee').value = employeeId;
            document.getElementById('salaryDate').value = new Date().toISOString().split('T')[0];

            // Show salary section
            this.ui.showSection('salary');

            this.ui.showToast(`Ready to add salary for ${employee.name}`, 'success');
        }
    }

    // FIXED: Single salary submit handler with proper duplicate prevention
    async handleSalarySubmit(e) {
        e.preventDefault();
        console.log('💰 Handling salary form submission...');

        // Prevent multiple submissions
        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton.disabled) {
            console.log('⏳ Submission already in progress, ignoring...');
            return;
        }

        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Insufficient permissions to manage salary records', 'error');
                return;
            }

            // SAFE ELEMENT ACCESS WITH DEBUGGING
            const getElement = (id) => {
                const element = document.getElementById(id);
                console.log(`🔍 Looking for element #${id}:`, element ? 'FOUND' : 'NOT FOUND');
                return element;
            };

            const salaryEmployee = getElement('salaryEmployee');
            const salaryDate = getElement('salaryDate');
            const salaryAmount = getElement('salaryAmount');
            const incentiveAmount = getElement('incentiveAmount');

            // Check if elements exist
            if (!salaryEmployee || !salaryDate || !salaryAmount) {
                console.error('❌ Missing form elements:', {
                    salaryEmployee: !!salaryEmployee,
                    salaryDate: !!salaryDate,
                    salaryAmount: !!salaryAmount,
                    incentiveAmount: !!incentiveAmount
                });
                this.ui.showToast('Salary form is not properly loaded. Please refresh the page.', 'error');
                return;
            }

            // Get values safely
            const employeeId = salaryEmployee.value;
            const date = salaryDate.value;
            const amount = parseFloat(salaryAmount.value);
            const incentive = incentiveAmount ? parseFloat(incentiveAmount.value) || 0 : 0;

            console.log('📝 Form values:', { employeeId, date, amount, incentive });

            // Validation
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
                    incentive_amount: incentive, // This will now be saved
                    record_date: date,
                    created_at: new Date().toISOString()
                };

                console.log('💾 Saving salary data:', salaryData);
                await this.db.create('salary_records', salaryData);
                this.ui.showToast('Salary record added successfully', 'success');

                // Reset form
                const salaryForm = document.getElementById('salaryForm');
                if (salaryForm) {
                    salaryForm.reset();
                }

                // Reload data
                await this.loadSalaries();
                await this.loadEmployees();

            } catch (error) {
                console.error('❌ Error adding salary record:', error);
                this.ui.showToast('Error adding salary record: ' + error.message, 'error');
            } finally {
                resetButton();
            }

        } catch (error) {
            console.error('❌ Unexpected error in salary form submission:', error);
            this.ui.showToast('Unexpected error. Please try again.', 'error');
        }
    }

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

    showCustomModal(html, modalId) {
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', html);

        // Setup modal events
        const modal = document.getElementById(modalId);
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeExportModal());

        // Show modal
        this.ui.showModal(modalId);
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
                const employeeRecords = this.salaryRecords.filter(record => record.employee_id === emp.id);
                const totalSalary = this.getEmployeeTotalSalary(emp.id);

                return {
                    'Employee ID': emp.id,
                    'Name': emp.name,
                    'Phone': emp.phone || '',
                    'Type': emp.employee_type === 'driver' ? 'Driver' : 'Employee',
                    'Vehicle Number': emp.vehicle_number || '',
                    'Role': emp.role,
                    'Join Date': Utils.formatDate(emp.join_date),
                    'Total Salary Paid': totalSalary,
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
                'Total Amount': parseFloat(record.amount) + parseFloat(record.incentive_amount || 0),
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

    async exportEmployeeReport(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        try {
            this.ui.showExportProgress('Generating employee report...');

            const employeeRecords = this.salaryRecords.filter(record => record.employee_id === employeeId);
            const totalSalary = this.getEmployeeTotalSalary(employeeId);

            const reportData = {
                employee: {
                    id: employee.id,
                    name: employee.name,
                    role: employee.role,
                    type: employee.employee_type,
                    phone: employee.phone,
                    email: employee.email,
                    joinDate: employee.join_date
                },
                summary: {
                    totalRecords: employeeRecords.length,
                    totalSalary: totalSalary,
                    baseSalary: employeeRecords.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0),
                    totalIncentives: employeeRecords.reduce((sum, record) => sum + parseFloat(record.incentive_amount || 0), 0)
                },
                records: employeeRecords.map(record => ({
                    date: record.record_date,
                    baseSalary: record.amount,
                    incentive: record.incentive_amount || 0,
                    total: parseFloat(record.amount) + parseFloat(record.incentive_amount || 0)
                }))
            };

            // You can implement a detailed PDF report here
            this.ui.showToast('Employee report export feature coming soon!', 'info');

        } catch (error) {
            console.error('Error exporting employee report:', error);
            this.ui.showToast('Error exporting employee report: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    populateEmployeeSelect(employees) {
        const select = document.getElementById('salaryEmployee');
        if (!select) return;

        select.innerHTML = '<option value="">Select Employee</option>' +
            employees.map(emp => `
                <option value="${emp.id}" data-name="${emp.name}">
                    ${emp.id} - ${emp.name} - ${emp.role}
                </option>
            `).join('');
    }

    renderSalaryTable(salaryRecords) {
        const tbody = document.getElementById('salaryTableBody');
        if (!tbody) return;

        if (salaryRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-money-bill-wave"></i>
                        <br>No salary records found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = salaryRecords.map(record => `
            <tr>
                <td><strong>${record.employee_id || 'N/A'}</strong></td>
                <td>${record.employee_name || 'Unknown Employee'}</td>
                <td>${Utils.formatDate(record.record_date)}</td>
                <td>${Utils.formatCurrency(record.amount)}</td>
                <td>${Utils.formatCurrency(record.incentive_amount || 0)}</td>
                <td>${Utils.formatCurrency(parseFloat(record.amount) + parseFloat(record.incentive_amount || 0))}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary btn-sm" onclick="app.getManagers().employee.deleteSalaryRecord('${record.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

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

                this.toggleEmployeeType();
                this.ui.showModal('employeeModal');
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
        const vehicleNumber = employeeType === 'driver' ? document.getElementById('employeeVehicleNumber').value.trim() : null;

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

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Saving...');

        try {
            const employeeData = {
                name: Utils.sanitizeInput(name),
                phone: phone ? Utils.sanitizeInput(phone) : null,
                email: email ? Utils.sanitizeInput(email) : null,
                role: Utils.sanitizeInput(role),
                salary: 0,
                join_date: joinDate,
                employee_type: employeeType,
                vehicle_number: vehicleNumber,
                updated_at: new Date().toISOString()
            };

            if (employeeId) {
                // Update existing employee
                await this.db.update('employees', employeeId, employeeData);
                this.ui.showToast('Employee updated successfully', 'success');
            } else {
                // Create new employee with auto-generated ID
                const newEmployeeId = this.generateEmployeeId(employeeType, this.employees);
                employeeData.id = newEmployeeId;
                employeeData.created_at = new Date().toISOString();

                console.log(`🆕 Creating employee with ID: ${newEmployeeId}`, employeeData);
                await this.db.create('employees', employeeData);
                this.ui.showToast(`Employee created successfully with ID: ${newEmployeeId}`, 'success');
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

    async deleteEmployee(employeeId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Insufficient permissions to delete employees', 'error');
            return;
        }

        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${employee.employee_type === 'driver' ? 'driver' : 'employee'} "${employee.name}" (${employee.id})? This action cannot be undone.`)) {
            return;
        }

        try {
            this.ui.showLoading('Deleting employee...');
            await this.db.delete('employees', employeeId);
            this.ui.showToast('Employee deleted successfully', 'success');
            await this.loadEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
            this.ui.showToast('Error deleting employee: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
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
}

window.EmployeeManager = EmployeeManager;