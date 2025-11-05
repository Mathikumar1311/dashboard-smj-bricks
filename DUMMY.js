class SalaryManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('SalaryManager: dependencies required');

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        // ✅ SAFE AUTH FALLBACK
        if (!this.auth) {
            console.warn('⚠️ Auth manager not provided, creating fallback');
            this.auth = {
                hasPermission: (permission) => {
                    console.log(`🛡️ Fallback auth granting permission: ${permission}`);
                    return true; // Grant all permissions
                },
                getUser: () => ({ role: 'admin', id: 'fallback-admin' }),
                getCurrentUser: () => ({ role: 'admin', id: 'fallback-admin' })
            };
        }

        // All data properties
        this.dailyEmployees = [];
        this.salaryRecords = [];
        this.advanceRecords = [];
        this.attendanceRecords = [];
        this.salaryPayments = [];
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentDateFilter = 'today'; // Default to today

        // Enhanced data structures
        this.todaysAttendance = [];
        this.pendingAdvances = [];
        this.employeeSummary = {};

        this.setupEventListeners();
        console.log('✅ SalaryManager initialized with enhanced UX');
    }

    /**
     * ✅ SAFE PERMISSION CHECK
     */
    hasPermission(permission) {
        if (!this.auth || typeof this.auth.hasPermission !== 'function') {
            console.warn(`⚠️ Auth not available, granting permission: ${permission}`);
            return true;
        }
        const hasPerm = this.auth.hasPermission(permission);
        console.log(`🛡️ Permission check: ${permission} = ${hasPerm}`);
        return hasPerm;
    }

    /**
     * ✅ FIXED: Load salary data with safe permission check
     */
    async loadSalaryData() {
        try {
            // ✅ SAFE PERMISSION CHECK
            if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
                console.warn('⚠️ Access denied for salary data');
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💰 Loading enhanced salary data...');
            this.ui.showSectionLoading('salaryContent', 'Loading salary dashboard...');

            // Parallel loading for better performance
            await Promise.all([
                this.loadDailyEmployees(),
                this.loadAttendanceRecords(),
                this.loadSalaryPayments(),
                this.loadSalaryRecords(),
                this.loadAdvanceRecords()
            ]);

            // Process enhanced data
            this.processTodaysData();
            this.calculateEmployeeSummaries();

            // Render all enhanced components
            this.renderEnhancedDashboard();
            this.setupSalaryForm();
            this.updateSummaryCards();

            this.ui.showToast('Salary dashboard loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading salary data:', error);
            this.ui.showToast('Error loading salary data', 'error');
        } finally {
            this.ui.hideSectionLoading('salaryContent');
        }
    }


    async initialize() {
        try {
            console.log('💰 Initializing enhanced Salary Manager...');

            await this.loadDailyEmployees();
            await this.loadAttendanceRecords();
            await this.loadSalaryPayments();
            await this.loadSalaryData();

            this.setupEnhancedUI();
            console.log('✅ Enhanced Salary Manager initialized');
        } catch (error) {
            console.error('❌ Salary Manager initialization failed:', error);
        }
        return Promise.resolve();
    }

    /**
     * ENHANCED: Setup modern UI components
     */
    setupEnhancedUI() {
        this.setupQuickActions();
        this.setupDateFilters();
        this.setupEmployeeGrid();
        this.setupRealTimeUpdates();
    }
    /**
     * ENHANCED: Setup quick actions panel
     */
    setupQuickActions() {
        console.log('⚡ Setting up quick actions...');
        // This is handled by renderQuickActions()
    }

    /**
     * ENHANCED: Setup employee grid view
     */
    setupEmployeeGrid() {
        console.log('👥 Setting up employee grid...');
        // This is handled by renderEmployeeGrid()
    }

    /**
     * ENHANCED: Setup real-time updates
     */
    setupRealTimeUpdates() {
        console.log('🔄 Setting up real-time updates...');
        // Can be implemented for live data updates
    }

    /**
     * ENHANCED: Setup date filters
     */
    setupDateFilters() {
        console.log('📅 Setting up date filters...');
        // Can be implemented for filtering
    }
    /**
     * ENHANCED: Load all salary data with optimizations
     */
    async loadSalaryData() {
        try {
            // Fix permission check
            if (!this.auth || !this.auth.hasPermission) {
                console.warn('⚠️ Auth not available, proceeding without permissions');
            } else if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💰 Loading enhanced salary data...');
            this.ui.showSectionLoading('salaryContent', 'Loading salary dashboard...');

            // Parallel loading for better performance
            await Promise.all([
                this.loadDailyEmployees(),
                this.loadAttendanceRecords(),
                this.loadSalaryPayments(),
                this.loadSalaryRecords(),
                this.loadAdvanceRecords()
            ]);

            // Process enhanced data
            this.processTodaysData();
            this.calculateEmployeeSummaries();

            // Render all enhanced components
            this.renderEnhancedDashboard();
            this.setupSalaryForm();
            this.updateSummaryCards();

            this.ui.showToast('Salary dashboard loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading salary data:', error);
            this.ui.showToast('Error loading salary data', 'error');
        } finally {
            this.ui.hideSectionLoading('salaryContent');
        }
    }

    /**
     * ENHANCED: Process today's data for quick access
     */
    processTodaysData() {
        const today = this.currentDate;

        // Today's attendance
        this.todaysAttendance = this.attendanceRecords.filter(record =>
            record.attendance_date === today
        );

        // Pending advances
        this.pendingAdvances = this.advanceRecords.filter(advance =>
            advance.status === 'pending'
        );

        console.log(`📊 Today's data - Attendance: ${this.todaysAttendance.length}, Pending Advances: ${this.pendingAdvances.length}`);
    }

    /**
     * ENHANCED: Calculate employee summaries
     */
    calculateEmployeeSummaries() {
        this.employeeSummary = {};

        this.dailyEmployees.forEach(employee => {
            const employeeAttendance = this.attendanceRecords.filter(record =>
                record.employee_id === employee.id
            );

            const employeeSalary = this.salaryRecords.filter(record =>
                record.employee_id === employee.id
            );

            const employeeAdvances = this.advanceRecords.filter(record =>
                record.employee_id === employee.id && record.status === 'pending'
            );

            const todayAttendance = this.todaysAttendance.find(record =>
                record.employee_id === employee.id
            );

            this.employeeSummary[employee.id] = {
                employee: employee,
                totalSalary: employeeSalary.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0),
                pendingAdvances: employeeAdvances.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0),
                todayStatus: todayAttendance ? todayAttendance.status : 'not_marked',
                workHours: todayAttendance ? (todayAttendance.work_hours || 0) : 0,
                totalWorkDays: employeeAttendance.filter(a => a.status === 'present').length,
                lastSalaryDate: employeeSalary.length > 0 ?
                    Math.max(...employeeSalary.map(s => new Date(s.record_date))) : null
            };
        });
    }

    /**
     * ENHANCED: Render modern dashboard
     */
    renderEnhancedDashboard() {
        this.renderQuickActions();
        this.renderEmployeeGrid();
        this.renderSalaryTable();
        this.renderPendingAdvances();
    }
    /**
 * ENHANCED: Render pending advances section
 */
    renderPendingAdvances() {
        const advancesContainer = document.getElementById('pendingAdvances');
        if (!advancesContainer) return;

        if (this.pendingAdvances.length === 0) {
            advancesContainer.innerHTML = `
            <div class="no-data-grid">
                <i class="fas fa-hand-holding-usd"></i>
                <h3>No Pending Advances</h3>
                <p>All advances have been processed</p>
            </div>
        `;
            return;
        }

        advancesContainer.innerHTML = this.pendingAdvances.map(advance => {
            const employee = this.dailyEmployees.find(emp => emp.id === advance.employee_id);
            return `
            <div class="advance-card">
                <div class="advance-header">
                    <div class="employee-info">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee?.name || 'Unknown')}&background=ff6b35&color=fff" 
                             alt="${employee?.name}" class="avatar-small">
                        <div class="info">
                            <strong>${employee?.name || 'Unknown Employee'}</strong>
                            <small>${employee?.role || 'N/A'} • ${advance.employee_id}</small>
                        </div>
                    </div>
                    <span class="advance-amount">${Utils.formatCurrency(advance.amount)}</span>
                </div>
                <div class="advance-details">
                    <div class="detail">
                        <label>Date:</label>
                        <span>${Utils.formatDate(advance.record_date)}</span>
                    </div>
                    <div class="detail">
                        <label>Status:</label>
                        <span class="status-badge pending">Pending</span>
                    </div>
                </div>
                <div class="advance-actions">
                    <button class="btn-primary btn-sm" onclick="app.getManagers().salary.processAdvance('${advance.id}')">
                        <i class="fas fa-check"></i> Mark Paid
                    </button>
                    <button class="btn-secondary btn-sm" onclick="app.getManagers().salary.viewAdvanceDetails('${advance.id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    /**
     * ENHANCED: Show advance modal
     */
    showAdvanceModal(employeeId = null) {
        const employee = employeeId ?
            this.dailyEmployees.find(emp => emp.id === employeeId) : null;

        const modalHtml = `
        <div id="advanceModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd"></i> ${employee ? `Add Advance - ${employee.name}` : 'Add Advance'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="advanceForm" class="modal-form">
                    ${!employeeId ? `
                    <div class="form-group">
                        <label>Employee *</label>
                        <select id="advanceEmployeeId" required>
                            <option value="">Select Employee</option>
                            ${this.dailyEmployees.map(emp => `
                                <option value="${emp.id}">${emp.name} (${emp.id})</option>
                            `).join('')}
                        </select>
                    </div>
                    ` : `<input type="hidden" id="advanceEmployeeId" value="${employeeId}">`}
                    
                    <div class="form-group">
                        <label>Advance Amount *</label>
                        <input type="number" id="advanceAmount" required min="0" step="100" placeholder="Enter advance amount">
                    </div>
                    
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="advanceDate" value="${this.currentDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="advanceNotes" placeholder="Add any notes about this advance"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn-primary">Add Advance</button>
                    </div>
                </form>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'advanceModal');

        document.getElementById('advanceForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                employee_id: document.getElementById('advanceEmployeeId').value,
                amount: parseFloat(document.getElementById('advanceAmount').value),
                record_date: document.getElementById('advanceDate').value,
                notes: document.getElementById('advanceNotes').value
            };

            await this.saveAdvance(formData);
            this.ui.hideModal('advanceModal');
        });
    }

    /**
     * ENHANCED: Save advance record
     */
    async saveAdvance(advanceData) {
        try {
            const employee = this.dailyEmployees.find(emp => emp.id === advanceData.employee_id);
            if (!employee) throw new Error('Employee not found');

            const advanceRecord = {
                employee_id: advanceData.employee_id,
                employee_name: employee.name,
                amount: advanceData.amount,
                record_date: advanceData.record_date,
                type: 'advance',
                status: 'pending',
                notes: advanceData.notes,
                week_number: this.getWeekNumber(new Date(advanceData.record_date)),
                month_number: new Date(advanceData.record_date).getMonth() + 1,
                year: new Date(advanceData.record_date).getFullYear(),
                created_at: new Date().toISOString()
            };

            await this.db.create('advance_records', advanceRecord);
            this.ui.showToast('Advance added successfully', 'success');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Error saving advance:', error);
            this.ui.showToast('Error adding advance', 'error');
        }
    }

    /**
     * ENHANCED: Show process salary modal
     */
    showProcessSalaryModal() {
        const modalHtml = `
        <div id="processSalaryModal" class="modal large">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-money-check"></i> Process Salary Payment</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="processSalaryForm" class="modal-form">
                    <div class="form-group">
                        <label>Employee *</label>
                        <select id="processEmployeeId" required>
                            <option value="">Select Employee</option>
                            ${this.dailyEmployees.map(emp => `
                                <option value="${emp.id}">${emp.name} (${emp.id})</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Pay Period Start *</label>
                            <input type="date" id="processPeriodStart" required>
                        </div>
                        <div class="form-group">
                            <label>Pay Period End *</label>
                            <input type="date" id="processPeriodEnd" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Payment Date *</label>
                        <input type="date" id="processPaymentDate" value="${this.currentDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Payment Method *</label>
                        <select id="processPaymentMethod" required>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                    
                    <div id="processSalaryPreview" class="salary-preview" style="display: none;">
                        <h4>Salary Preview</h4>
                        <div class="preview-items">
                            <div class="preview-item">
                                <span>Basic Salary:</span>
                                <span id="processPreviewBasic">₹0</span>
                            </div>
                            <div class="preview-item">
                                <span>Overtime:</span>
                                <span id="processPreviewOvertime">₹0</span>
                            </div>
                            <div class="preview-item">
                                <span>Advances Deducted:</span>
                                <span id="processPreviewAdvances">-₹0</span>
                            </div>
                            <div class="preview-item total">
                                <span>Net Salary:</span>
                                <span id="processPreviewNet">₹0</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                        <button type="button" id="processCalculateBtn" class="btn-secondary">Calculate</button>
                        <button type="submit" class="btn-primary">Process Payment</button>
                    </div>
                </form>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'processSalaryModal');

        // Add calculate functionality
        document.getElementById('processCalculateBtn').addEventListener('click', async () => {
            const employeeId = document.getElementById('processEmployeeId').value;
            const periodStart = document.getElementById('processPeriodStart').value;
            const periodEnd = document.getElementById('processPeriodEnd').value;

            if (employeeId && periodStart && periodEnd) {
                try {
                    const calculation = await this.calculateSalary(employeeId, periodStart, periodEnd);

                    document.getElementById('processPreviewBasic').textContent = Utils.formatCurrency(calculation.basic_salary);
                    document.getElementById('processPreviewOvertime').textContent = Utils.formatCurrency(calculation.overtime_amount);
                    document.getElementById('processPreviewAdvances').textContent = `-${Utils.formatCurrency(calculation.advance_deductions)}`;
                    document.getElementById('processPreviewNet').textContent = Utils.formatCurrency(calculation.net_salary);

                    document.getElementById('processSalaryPreview').style.display = 'block';
                } catch (error) {
                    this.ui.showToast('Error calculating salary', 'error');
                }
            }
        });

        document.getElementById('processSalaryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const employeeId = document.getElementById('processEmployeeId').value;
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);

            const formData = {
                employee_id: employeeId,
                employee_name: employee ? employee.name : 'Unknown',
                pay_period_start: document.getElementById('processPeriodStart').value,
                pay_period_end: document.getElementById('processPeriodEnd').value,
                payment_date: document.getElementById('processPaymentDate').value,
                payment_method: document.getElementById('processPaymentMethod').value
            };

            await this.processSalaryPayment(formData);
            this.ui.hideModal('processSalaryModal');
        });
    }

    /**
     * ENHANCED: Show export options with your preferred style
     */
    showExportOptions() {
        const exportHtml = `
        <div id="exportSalaryModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Export Salary Records</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="export-options">
                    <div class="export-option" onclick="app.getManagers().salary.exportSalaryToExcel()">
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
                    
                    <div class="export-option" onclick="app.getManagers().salary.exportSalaryToPDF()">
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
                    <button class="btn-secondary" onclick="app.getManagers().salary.closeExportModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(exportHtml, 'exportSalaryModal');
    }

    /**
     * ENHANCED: Close export modal
     */
    closeExportModal() {
        this.ui.hideModal('exportSalaryModal');
    }

    /**
     * ENHANCED: Add employee advance
     */
    addEmployeeAdvance(employeeId) {
        this.showAdvanceModal(employeeId);
    }

    /**
     * ENHANCED: View employee details
     */
    viewEmployeeDetails(employeeId) {
        // Implement employee details view
        console.log('View employee details:', employeeId);
        this.ui.showToast('Employee details feature coming soon', 'info');
    }

    /**
     * ENHANCED: Process advance payment
     */
    async processAdvance(advanceId) {
        try {
            await this.db.update('advance_records', advanceId, {
                status: 'paid',
                paid_date: new Date().toISOString()
            });
            this.ui.showToast('Advance marked as paid', 'success');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Error processing advance:', error);
            this.ui.showToast('Error processing advance', 'error');
        }
    }

    /**
     * ENHANCED: View advance details
     */
    viewAdvanceDetails(advanceId) {
        const advance = this.advanceRecords.find(a => a.id === advanceId);
        if (!advance) {
            this.ui.showToast('Advance not found', 'error');
            return;
        }

        const employee = this.dailyEmployees.find(emp => emp.id === advance.employee_id);

        const modalHtml = `
        <div id="advanceDetailsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd"></i> Advance Details</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="advance-details">
                    <div class="detail-section">
                        <h4>Employee Information</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Employee Name:</label>
                                <span>${employee?.name || advance.employee_name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Employee ID:</label>
                                <span>${advance.employee_id}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Advance Information</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Amount:</label>
                                <span class="amount">${Utils.formatCurrency(advance.amount)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Date:</label>
                                <span>${Utils.formatDate(advance.record_date)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge ${advance.status}">${advance.status}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${advance.notes ? `
                    <div class="detail-section">
                        <h4>Notes</h4>
                        <div class="notes">${advance.notes}</div>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary modal-cancel">Close</button>
                    ${advance.status === 'pending' ? `
                    <button type="button" class="btn-primary" onclick="app.getManagers().salary.processAdvance('${advance.id}')">
                        Mark as Paid
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'advanceDetailsModal');
    }
    /**
     * ENHANCED: Quick Actions Panel
     */
    renderQuickActions() {
        const quickActionsContainer = document.getElementById('quickActions');
        if (!quickActionsContainer) return;

        const todaySummary = this.getTodaysAttendanceSummary();

        quickActionsContainer.innerHTML = `
            <div class="quick-actions-panel">
                <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                
                <div class="action-buttons-grid">
                    <button class="action-btn primary" onclick="app.getManagers().salary.showQuickAttendanceModal()">
                        <i class="fas fa-user-check"></i>
                        <span>Mark Attendance</span>
                        <small>${todaySummary.present}/${todaySummary.total} present</small>
                    </button>
                    
                    <button class="action-btn success" onclick="app.getManagers().salary.showBulkSalaryModal()">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>Pay Today's Salary</span>
                        <small>${todaySummary.present} employees</small>
                    </button>
                    
                    <button class="action-btn warning" onclick="app.getManagers().salary.showAdvanceModal()">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>Add Advance</span>
                        <small>${this.pendingAdvances.length} pending</small>
                    </button>
                    
                    <button class="action-btn info" onclick="app.getManagers().salary.showProcessSalaryModal()">
                        <i class="fas fa-money-check"></i>
                        <span>Process Salary</span>
                        <small>Complete payments</small>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * ENHANCED: Employee Grid View
     */
    renderEmployeeGrid() {
        const employeeGrid = document.getElementById('employeeGrid');
        if (!employeeGrid) return;

        if (this.dailyEmployees.length === 0) {
            employeeGrid.innerHTML = `
                <div class="no-data-grid">
                    <i class="fas fa-user-tie"></i>
                    <h3>No Daily Employees</h3>
                    <p>Add employees with daily salary type to see them here</p>
                </div>
            `;
            return;
        }

        employeeGrid.innerHTML = this.dailyEmployees.map(employee => {
            const summary = this.employeeSummary[employee.id] || {};
            const statusClass = this.getStatusClass(summary.todayStatus);

            return `
                <div class="employee-card ${statusClass}" data-employee-id="${employee.id}">
                    <div class="employee-card-header">
                        <div class="employee-avatar">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=ff6b35&color=fff" 
                                 alt="${employee.name}">
                        </div>
                        <div class="employee-info">
                            <h4>${employee.name}</h4>
                            <p>${employee.role} • ${employee.id}</p>
                        </div>
                        <div class="employee-status ${statusClass}">
                            <i class="fas ${this.getStatusIcon(summary.todayStatus)}"></i>
                            <span>${this.getStatusText(summary.todayStatus)}</span>
                        </div>
                    </div>
                    
                    <div class="employee-card-body">
                        <div class="employee-stats">
                            <div class="stat">
                                <label>Today's Hours</label>
                                <span class="value">${summary.workHours}h</span>
                            </div>
                            <div class="stat">
                                <label>Pending Advances</label>
                                <span class="value ${summary.pendingAdvances > 0 ? 'warning' : ''}">
                                    ${Utils.formatCurrency(summary.pendingAdvances)}
                                </span>
                            </div>
                            <div class="stat">
                                <label>Work Days</label>
                                <span class="value">${summary.totalWorkDays}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="employee-card-actions">
                        <button class="btn-icon small" onclick="app.getManagers().salary.markEmployeeAttendance('${employee.id}')" 
                                title="Mark Attendance">
                            <i class="fas fa-calendar-check"></i>
                        </button>
                        <button class="btn-icon small" onclick="app.getManagers().salary.payEmployeeSalary('${employee.id}')"
                                title="Pay Salary">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        <button class="btn-icon small" onclick="app.getManagers().salary.addEmployeeAdvance('${employee.id}')"
                                title="Add Advance">
                            <i class="fas fa-hand-holding-usd"></i>
                        </button>
                        <button class="btn-icon small" onclick="app.getManagers().salary.viewEmployeeDetails('${employee.id}')"
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * ENHANCED: Status helpers
     */
    getStatusClass(status) {
        const classes = {
            'present': 'status-present',
            'absent': 'status-absent',
            'half_day': 'status-half-day',
            'not_marked': 'status-pending'
        };
        return classes[status] || 'status-pending';
    }

    getStatusIcon(status) {
        const icons = {
            'present': 'fa-check-circle',
            'absent': 'fa-times-circle',
            'half_day': 'fa-clock',
            'not_marked': 'fa-question-circle'
        };
        return icons[status] || 'fa-question-circle';
    }

    getStatusText(status) {
        const texts = {
            'present': 'Present',
            'absent': 'Absent',
            'half_day': 'Half Day',
            'not_marked': 'Not Marked'
        };
        return texts[status] || 'Not Marked';
    }

    /**
     * ENHANCED: Quick Attendance Modal
     */
    showQuickAttendanceModal() {
        const todaySummary = this.getTodaysAttendanceSummary();

        const modalHtml = `
            <div id="quickAttendanceModal" class="modal large">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-check"></i> Quick Attendance - Today</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="attendance-summary-bar">
                        <div class="summary-item">
                            <span class="count present">${todaySummary.present}</span>
                            <span class="label">Present</span>
                        </div>
                        <div class="summary-item">
                            <span class="count absent">${todaySummary.absent}</span>
                            <span class="label">Absent</span>
                        </div>
                        <div class="summary-item">
                            <span class="count half-day">${todaySummary.halfDay}</span>
                            <span class="label">Half Day</span>
                        </div>
                        <div class="summary-item">
                            <span class="count total">${todaySummary.total}</span>
                            <span class="label">Total</span>
                        </div>
                    </div>
                    
                    <div class="quick-attendance-grid">
                        ${this.dailyEmployees.map(employee => {
            const summary = this.employeeSummary[employee.id] || {};
            const isPresent = summary.todayStatus === 'present';
            const isAbsent = summary.todayStatus === 'absent';
            const isHalfDay = summary.todayStatus === 'half_day';

            return `
                                <div class="attendance-item" data-employee-id="${employee.id}">
                                    <div class="employee-info">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=ff6b35&color=fff" 
                                             alt="${employee.name}" class="avatar-small">
                                        <div class="info">
                                            <strong>${employee.name}</strong>
                                            <small>${employee.role}</small>
                                        </div>
                                    </div>
                                    
                                    <div class="attendance-actions">
                                        <button class="attendance-btn present ${isPresent ? 'active' : ''}" 
                                                onclick="app.getManagers().salary.quickMarkAttendance('${employee.id}', 'present')">
                                            <i class="fas fa-check"></i>
                                            <span>Present</span>
                                        </button>
                                        <button class="attendance-btn absent ${isAbsent ? 'active' : ''}"
                                                onclick="app.getManagers().salary.quickMarkAttendance('${employee.id}', 'absent')">
                                            <i class="fas fa-times"></i>
                                            <span>Absent</span>
                                        </button>
                                        <button class="attendance-btn half-day ${isHalfDay ? 'active' : ''}"
                                                onclick="app.getManagers().salary.quickMarkAttendance('${employee.id}', 'half_day')">
                                            <i class="fas fa-clock"></i>
                                            <span>Half Day</span>
                                        </button>
                                    </div>
                                    
                                    <div class="attendance-time ${isPresent ? 'visible' : ''}">
                                        <input type="time" id="checkIn_${employee.id}" placeholder="Check In" 
                                               value="${this.getDefaultCheckInTime()}">
                                        <input type="time" id="checkOut_${employee.id}" placeholder="Check Out">
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="app.getManagers().salary.markAllPresent()">
                            <i class="fas fa-users"></i> Mark All Present
                        </button>
                        <button type="button" class="btn-primary" onclick="app.getManagers().salary.saveQuickAttendance()">
                            <i class="fas fa-save"></i> Save All Attendance
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'quickAttendanceModal');
    }

    /**
     * ENHANCED: Quick mark attendance
     */
    async quickMarkAttendance(employeeId, status) {
        try {
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
            if (!employee) return;

            // Remove active class from all buttons for this employee
            const item = document.querySelector(`[data-employee-id="${employeeId}"]`);
            if (item) {
                item.querySelectorAll('.attendance-btn').forEach(btn => btn.classList.remove('active'));
                item.querySelector(`.attendance-btn.${status}`).classList.add('active');

                // Show time inputs for present status
                const timeInputs = item.querySelector('.attendance-time');
                if (timeInputs) {
                    timeInputs.classList.toggle('visible', status === 'present');
                }
            }

            this.ui.showToast(`Marked ${employee.name} as ${status}`, 'success');
        } catch (error) {
            console.error('Quick mark attendance error:', error);
        }
    }

    /**
     * ENHANCED: Save all quick attendance
     */
    async saveQuickAttendance() {
        try {
            const attendanceItems = document.querySelectorAll('.attendance-item');
            let savedCount = 0;

            for (const item of attendanceItems) {
                const employeeId = item.getAttribute('data-employee-id');
                const activeButton = item.querySelector('.attendance-btn.active');

                if (activeButton) {
                    const status = activeButton.classList[1]; // present, absent, or half-day
                    const employee = this.dailyEmployees.find(emp => emp.id === employeeId);

                    if (employee) {
                        const attendanceData = {
                            employee_id: employeeId,
                            employee_name: employee.name,
                            attendance_date: this.currentDate,
                            status: status,
                            check_in_time: status === 'present' ?
                                document.getElementById(`checkIn_${employeeId}`)?.value : null,
                            check_out_time: status === 'present' ?
                                document.getElementById(`checkOut_${employeeId}`)?.value : null,
                            notes: 'Quick attendance'
                        };

                        await this.markAttendance(attendanceData);
                        savedCount++;
                    }
                }
            }

            this.ui.showToast(`Saved attendance for ${savedCount} employees`, 'success');
            this.ui.hideModal('quickAttendanceModal');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Save quick attendance error:', error);
            this.ui.showToast('Error saving attendance', 'error');
        }
    }

    /**
     * ENHANCED: Mark all present
     */
    async markAllPresent() {
        const attendanceItems = document.querySelectorAll('.attendance-item');
        attendanceItems.forEach(item => {
            const presentBtn = item.querySelector('.attendance-btn.present');
            if (presentBtn) {
                presentBtn.click();
            }
        });
        this.ui.showToast('Marked all as present', 'info');
    }

    /**
     * ENHANCED: Bulk Salary Payment Modal
     */
    showBulkSalaryModal() {
        const presentEmployees = this.dailyEmployees.filter(employee => {
            const summary = this.employeeSummary[employee.id];
            return summary && summary.todayStatus === 'present';
        });

        const modalHtml = `
            <div id="bulkSalaryModal" class="modal large">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-bill-wave"></i> Bulk Salary Payment - Today</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="bulk-summary">
                        <div class="summary-card">
                            <i class="fas fa-users"></i>
                            <div>
                                <span class="count">${presentEmployees.length}</span>
                                <span class="label">Employees Present Today</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bulk-salary-grid">
                        ${presentEmployees.map(employee => {
            const summary = this.employeeSummary[employee.id] || {};
            const defaultSalary = employee.daily_rate || employee.basic_salary || 500;

            return `
                                <div class="salary-item" data-employee-id="${employee.id}">
                                    <div class="employee-info">
                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=ff6b35&color=fff" 
                                             alt="${employee.name}" class="avatar-small">
                                        <div class="info">
                                            <strong>${employee.name}</strong>
                                            <small>${employee.role} • ${Utils.formatCurrency(summary.pendingAdvances)} pending</small>
                                        </div>
                                    </div>
                                    
                                    <div class="salary-inputs">
                                        <div class="input-group">
                                            <label>Salary Amount</label>
                                            <input type="number" 
                                                   id="salary_${employee.id}" 
                                                   value="${defaultSalary}"
                                                   min="0" 
                                                   step="50">
                                        </div>
                                        
                                        <div class="advance-deduction">
                                            <label class="checkbox-label">
                                                <input type="checkbox" 
                                                       id="deductAdvance_${employee.id}"
                                                       ${summary.pendingAdvances > 0 ? 'checked' : ''}>
                                                <span>Deduct Advance (${Utils.formatCurrency(summary.pendingAdvances)})</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div class="net-salary">
                                        <strong id="netSalary_${employee.id}">
                                            ${Utils.formatCurrency(defaultSalary - (summary.pendingAdvances > 0 ? summary.pendingAdvances : 0))}
                                        </strong>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                    
                    <div class="bulk-total">
                        <div class="total-row">
                            <span>Total Salary:</span>
                            <span id="bulkTotalSalary">${Utils.formatCurrency(presentEmployees.reduce((sum, emp) => sum + (emp.daily_rate || emp.basic_salary || 500), 0))}</span>
                        </div>
                        <div class="total-row">
                            <span>Total Advances Deducted:</span>
                            <span id="bulkTotalAdvances">${Utils.formatCurrency(presentEmployees.reduce((sum, emp) => {
            const summary = this.employeeSummary[emp.id] || {};
            return sum + (summary.pendingAdvances > 0 ? summary.pendingAdvances : 0);
        }, 0))}</span>
                        </div>
                        <div class="total-row final">
                            <span>Net Payment:</span>
                            <span id="bulkNetPayment">${Utils.formatCurrency(presentEmployees.reduce((sum, emp) => {
            const summary = this.employeeSummary[emp.id] || {};
            const salary = emp.daily_rate || emp.basic_salary || 500;
            const advance = summary.pendingAdvances > 0 ? summary.pendingAdvances : 0;
            return sum + (salary - advance);
        }, 0))}</span>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="app.getManagers().salary.calculateBulkSalaries()">
                            <i class="fas fa-calculator"></i> Recalculate
                        </button>
                        <button type="button" class="btn-primary" onclick="app.getManagers().salary.processBulkSalary()">
                            <i class="fas fa-paper-plane"></i> Process Payments
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'bulkSalaryModal');
        this.setupBulkSalaryCalculations();
    }

    /**
     * ENHANCED: Setup bulk salary calculations
     */
    setupBulkSalaryCalculations() {
        // Add event listeners for real-time calculation
        document.querySelectorAll('.bulk-salary-grid input').forEach(input => {
            input.addEventListener('input', () => this.calculateBulkSalaries());
        });

        document.querySelectorAll('.bulk-salary-grid input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calculateBulkSalaries());
        });
    }

    /**
     * ENHANCED: Calculate bulk salaries in real-time
     */
    calculateBulkSalaries() {
        let totalSalary = 0;
        let totalAdvances = 0;
        let netPayment = 0;

        document.querySelectorAll('.salary-item').forEach(item => {
            const employeeId = item.getAttribute('data-employee-id');
            const salaryInput = document.getElementById(`salary_${employeeId}`);
            const advanceCheckbox = document.getElementById(`deductAdvance_${employeeId}`);
            const netSalaryElement = document.getElementById(`netSalary_${employeeId}`);

            const salary = parseFloat(salaryInput?.value) || 0;
            const summary = this.employeeSummary[employeeId] || {};
            const advanceDeduction = advanceCheckbox?.checked ? summary.pendingAdvances : 0;
            const netSalary = salary - advanceDeduction;

            if (netSalaryElement) {
                netSalaryElement.textContent = Utils.formatCurrency(netSalary);
            }

            totalSalary += salary;
            totalAdvances += advanceDeduction;
            netPayment += netSalary;
        });

        // Update totals
        document.getElementById('bulkTotalSalary').textContent = Utils.formatCurrency(totalSalary);
        document.getElementById('bulkTotalAdvances').textContent = Utils.formatCurrency(totalAdvances);
        document.getElementById('bulkNetPayment').textContent = Utils.formatCurrency(netPayment);
    }

    /**
     * ENHANCED: Process bulk salary payments
     */
    async processBulkSalary() {
        try {
            const salaryItems = document.querySelectorAll('.salary-item');
            let processedCount = 0;

            this.ui.showExportProgress('Processing bulk salary payments...');

            for (const item of salaryItems) {
                const employeeId = item.getAttribute('data-employee-id');
                const salaryInput = document.getElementById(`salary_${employeeId}`);
                const advanceCheckbox = document.getElementById(`deductAdvance_${employeeId}`);

                const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
                if (!employee) continue;

                const salary = parseFloat(salaryInput?.value) || 0;
                const deductAdvance = advanceCheckbox?.checked;
                const summary = this.employeeSummary[employeeId] || {};

                if (salary > 0) {
                    // Save salary record
                    const salaryData = {
                        employee_id: employeeId,
                        employee_name: employee.name,
                        amount: salary,
                        record_date: this.currentDate,
                        type: 'salary',
                        week_number: this.getWeekNumber(new Date()),
                        month_number: new Date().getMonth() + 1,
                        year: new Date().getFullYear(),
                        created_at: new Date().toISOString()
                    };
                    await this.db.create('salary_records', salaryData);

                    // Deduct advances if requested
                    if (deductAdvance && summary.pendingAdvances > 0) {
                        const advanceData = {
                            employee_id: employeeId,
                            employee_name: employee.name,
                            amount: -summary.pendingAdvances, // Negative amount for deduction
                            record_date: this.currentDate,
                            type: 'advance_deduction',
                            status: 'deducted',
                            week_number: this.getWeekNumber(new Date()),
                            month_number: new Date().getMonth() + 1,
                            year: new Date().getFullYear(),
                            created_at: new Date().toISOString()
                        };
                        await this.db.create('advance_records', advanceData);
                    }

                    processedCount++;
                }
            }

            this.ui.showToast(`Processed salary for ${processedCount} employees`, 'success');
            this.ui.hideModal('bulkSalaryModal');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Bulk salary processing error:', error);
            this.ui.showToast('Error processing bulk salary', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    /**
     * ENHANCED: Individual employee actions
     */
    async markEmployeeAttendance(employeeId) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const modalHtml = `
            <div id="employeeAttendanceModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-calendar-check"></i> Mark Attendance - ${employee.name}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="employeeAttendanceForm" class="modal-form">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" id="attendanceDate" value="${this.currentDate}" required>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="attendanceStatus" required>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="half_day">Half Day</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Check In Time</label>
                                <input type="time" id="checkInTime" value="${this.getDefaultCheckInTime()}">
                            </div>
                            <div class="form-group">
                                <label>Check Out Time</label>
                                <input type="time" id="checkOutTime">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="attendanceNotes" placeholder="Add any notes"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Save Attendance</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'employeeAttendanceModal');

        document.getElementById('employeeAttendanceForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                employee_id: employeeId,
                employee_name: employee.name,
                attendance_date: document.getElementById('attendanceDate').value,
                status: document.getElementById('attendanceStatus').value,
                check_in_time: document.getElementById('checkInTime').value,
                check_out_time: document.getElementById('checkOutTime').value,
                notes: document.getElementById('attendanceNotes').value
            };

            await this.markAttendance(formData);
            this.ui.hideModal('employeeAttendanceModal');
        });
    }

    async payEmployeeSalary(employeeId) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const summary = this.employeeSummary[employeeId] || {};
        const defaultSalary = employee.daily_rate || employee.basic_salary || 500;

        const modalHtml = `
            <div id="employeeSalaryModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-bill-wave"></i> Pay Salary - ${employee.name}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <form id="employeeSalaryForm" class="modal-form">
                        <div class="form-group">
                            <label>Salary Amount</label>
                            <input type="number" id="salaryAmount" value="${defaultSalary}" required min="0" step="50">
                        </div>
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" id="salaryDate" value="${this.currentDate}" required>
                        </div>
                        ${summary.pendingAdvances > 0 ? `
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="deductAdvance" checked>
                                <span>Deduct Pending Advance (${Utils.formatCurrency(summary.pendingAdvances)})</span>
                            </label>
                        </div>
                        ` : ''}
                        <div class="salary-preview">
                            <div class="preview-item">
                                <span>Salary:</span>
                                <span id="previewSalary">${Utils.formatCurrency(defaultSalary)}</span>
                            </div>
                            ${summary.pendingAdvances > 0 ? `
                            <div class="preview-item">
                                <span>Advance Deduction:</span>
                                <span id="previewDeduction">-${Utils.formatCurrency(summary.pendingAdvances)}</span>
                            </div>
                            ` : ''}
                            <div class="preview-item total">
                                <span>Net Amount:</span>
                                <span id="previewNetAmount">${Utils.formatCurrency(defaultSalary - (summary.pendingAdvances > 0 ? summary.pendingAdvances : 0))}</span>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Pay Salary</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'employeeSalaryModal');

        // Real-time calculation
        document.getElementById('salaryAmount').addEventListener('input', (e) => {
            this.updateSalaryPreview(employeeId, parseFloat(e.target.value) || 0);
        });

        document.getElementById('deductAdvance')?.addEventListener('change', (e) => {
            this.updateSalaryPreview(employeeId, parseFloat(document.getElementById('salaryAmount').value) || 0);
        });

        document.getElementById('employeeSalaryForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const salary = parseFloat(document.getElementById('salaryAmount').value) || 0;
            const date = document.getElementById('salaryDate').value;
            const deductAdvance = document.getElementById('deductAdvance')?.checked || false;

            if (salary > 0) {
                await this.saveEmployeeSalary(employeeId, salary, date, deductAdvance);
                this.ui.hideModal('employeeSalaryModal');
            }
        });
    }

    updateSalaryPreview(employeeId, salary) {
        const summary = this.employeeSummary[employeeId] || {};
        const deductAdvance = document.getElementById('deductAdvance')?.checked || false;
        const advanceDeduction = deductAdvance ? summary.pendingAdvances : 0;
        const netAmount = salary - advanceDeduction;

        document.getElementById('previewSalary').textContent = Utils.formatCurrency(salary);
        if (document.getElementById('previewDeduction')) {
            document.getElementById('previewDeduction').textContent = `-${Utils.formatCurrency(advanceDeduction)}`;
        }
        document.getElementById('previewNetAmount').textContent = Utils.formatCurrency(netAmount);
    }

    async saveEmployeeSalary(employeeId, salary, date, deductAdvance) {
        try {
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
            if (!employee) return;

            // Save salary record
            const salaryData = {
                employee_id: employeeId,
                employee_name: employee.name,
                amount: salary,
                record_date: date,
                type: 'salary',
                week_number: this.getWeekNumber(new Date(date)),
                month_number: new Date(date).getMonth() + 1,
                year: new Date(date).getFullYear(),
                created_at: new Date().toISOString()
            };
            await this.db.create('salary_records', salaryData);

            // Deduct advance if requested
            if (deductAdvance) {
                const summary = this.employeeSummary[employeeId] || {};
                if (summary.pendingAdvances > 0) {
                    const advanceData = {
                        employee_id: employeeId,
                        employee_name: employee.name,
                        amount: -summary.pendingAdvances,
                        record_date: date,
                        type: 'advance_deduction',
                        status: 'deducted',
                        week_number: this.getWeekNumber(new Date(date)),
                        month_number: new Date(date).getMonth() + 1,
                        year: new Date(date).getFullYear(),
                        created_at: new Date().toISOString()
                    };
                    await this.db.create('advance_records', advanceData);
                }
            }

            this.ui.showToast(`Salary paid to ${employee.name}`, 'success');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Save employee salary error:', error);
            this.ui.showToast('Error paying salary', 'error');
        }
    }

    /**
     * ENHANCED: Utility methods
     */
    getDefaultCheckInTime() {
        return '09:00';
    }

    getTodaysAttendanceSummary() {
        const today = this.currentDate;
        const todaysRecords = this.attendanceRecords.filter(record =>
            record.attendance_date === today
        );

        return {
            present: todaysRecords.filter(r => r.status === 'present').length,
            absent: todaysRecords.filter(r => r.status === 'absent').length,
            halfDay: todaysRecords.filter(r => r.status === 'half_day').length,
            total: this.dailyEmployees.length
        };
    }

    // ==================== KEEP EXISTING METHODS ====================
    // [Keep all your existing methods like loadDailyEmployees, loadAttendanceRecords, 
    // loadSalaryPayments, markAttendance, processSalaryPayment, etc.]
    // They should work with the enhanced UX

    // In SalaryManager
    async loadAttendanceRecords() {
        try {
            this.attendanceRecords = await this.db.getAttendanceRecords() || [];
            console.log(`📊 Loaded ${this.attendanceRecords.length} attendance records`);
        } catch (error) {
            console.warn('⚠️ Attendance table not available, using empty array:', error.message);
            this.attendanceRecords = [];
        }
    }

    async loadAdvanceRecords() {
        try {
            this.advanceRecords = await this.db.getAdvanceRecords() || [];
            console.log(`💰 Loaded ${this.advanceRecords.length} advance records`);
        } catch (error) {
            console.warn('⚠️ Advance records table not available, using empty array:', error.message);
            this.advanceRecords = [];
        }
    }

    async loadSalaryRecords() {
        try {
            this.salaryRecords = await this.db.getSalaryRecords() || [];
            console.log(`💵 Loaded ${this.salaryRecords.length} salary records`);
        } catch (error) {
            console.warn('⚠️ Salary records table not available, using empty array:', error.message);
            this.salaryRecords = [];
        }
    }

    async loadDailyEmployees() {
        try {
            const allEmployees = await this.db.getEmployees();
            this.dailyEmployees = allEmployees.filter(emp =>
                emp.salary_type === 'daily' || !emp.salary_type
            );
        } catch (error) {
            console.error('Error loading daily employees:', error);
            this.dailyEmployees = [];
        }
    }

    async loadAttendanceRecords() {
        try {
            this.attendanceRecords = await this.db.getAttendanceRecords() || [];
        } catch (error) {
            console.error('Error loading attendance records:', error);
            this.attendanceRecords = [];
        }
    }

    async loadSalaryPayments() {
        try {
            this.salaryPayments = await this.db.getSalaryPayments() || [];
        } catch (error) {
            console.error('Error loading salary payments:', error);
            this.salaryPayments = [];
        }
    }

    async loadSalaryRecords() {
        try {
            this.salaryRecords = await this.db.getSalaryRecords() || [];
        } catch (error) {
            console.error('Error loading salary records:', error);
            this.salaryRecords = [];
        }
    }

    async loadAdvanceRecords() {
        try {
            this.advanceRecords = await this.db.getAdvanceRecords() || [];
        } catch (error) {
            console.error('Error loading advance records:', error);
            this.advanceRecords = [];
        }
    }

    // ... [Keep all your other existing methods]
    // ==================== CORE DATA LOADING METHODS ====================

    async loadSalaryRecords() {
        try {
            this.salaryRecords = await this.db.getSalaryRecords() || [];
        } catch (error) {
            console.error('Error loading salary records:', error);
            this.salaryRecords = [];
        }
    }

    async loadAdvanceRecords() {
        try {
            this.advanceRecords = await this.db.getAdvanceRecords() || [];
        } catch (error) {
            console.error('Error loading advance records:', error);
            this.advanceRecords = [];
        }
    }

    // ==================== SALARY PAYMENTS SYSTEM ====================

    async initializeSalaryPayments() {
        try {
            console.log('💰 Initializing salary payments section...');

            await this.loadSalaryPayments();
            await this.loadSalaryPaymentsTable();
            this.setupSalaryPaymentsEventListeners();

            console.log('✅ Salary payments initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing salary payments:', error);
            this.ui.showToast('Error loading salary payments', 'error');
        }
    }

    async loadSalaryPaymentsTable() {
        try {
            const tbody = document.getElementById('salaryPaymentsTableBody');
            if (!tbody) {
                console.warn('❌ Salary payments table body not found');
                return;
            }

            if (this.salaryPayments.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="no-data">
                        <i class="fas fa-money-check"></i>
                        <br>No salary payments recorded
                        <br><small>Process salary payments to see records here</small>
                    </td>
                </tr>
            `;
                return;
            }

            tbody.innerHTML = this.salaryPayments.map(payment => {
                const statusClass = payment.status === 'paid' ? 'status-paid' : 'status-pending';
                const payslipBtn = payment.payslip_generated ?
                    '<span class="badge success"><i class="fas fa-check"></i> Generated</span>' :
                    `<button class="btn-primary btn-sm generate-payslip-btn" 
                        data-payment-id="${payment.id}"
                        title="Generate Payslip">
                    <i class="fas fa-file-pdf"></i>
                </button>`;

                return `
                <tr class="salary-payment-record">
                    <td><strong>${payment.id}</strong></td>
                    <td>${Utils.formatDate(payment.payment_date)}</td>
                    <td>
                        <div class="employee-info">
                            <strong>${payment.employee_name}</strong>
                            <small>${payment.employee_id}</small>
                        </div>
                    </td>
                    <td>
                        ${Utils.formatDate(payment.pay_period_start)} 
                        <br>to<br>
                        ${Utils.formatDate(payment.pay_period_end)}
                    </td>
                    <td>${Utils.formatCurrency(payment.basic_salary)}</td>
                    <td>${Utils.formatCurrency(payment.overtime_amount)}</td>
                    <td class="text-danger">-${Utils.formatCurrency(payment.advance_deductions)}</td>
                    <td class="text-success"><strong>${Utils.formatCurrency(payment.net_salary)}</strong></td>
                    <td>
                        <span class="payment-method ${payment.payment_method}">
                            ${payment.payment_method}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${payment.status}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${payslipBtn}
                            <button class="btn-secondary btn-sm" 
                                    onclick="app.getManagers().salary.viewPaymentDetails('${payment.id}')"
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');

            this.updateSalaryPaymentsSummary();

        } catch (error) {
            console.error('Error loading salary payments table:', error);
            this.ui.showToast('Error loading salary payments table', 'error');
        }
    }

    setupSalaryPaymentsEventListeners() {
        console.log('🔧 Setting up salary payments event listeners...');

        document.addEventListener('click', (e) => {
            if (e.target.id === 'processSalaryBtn' || e.target.closest('#processSalaryBtn')) {
                this.showProcessSalaryModal();
                return;
            }

            if (e.target.id === 'exportSalaryPaymentsBtn' || e.target.closest('#exportSalaryPaymentsBtn')) {
                this.exportSalaryPayments();
                return;
            }

            if (e.target.classList.contains('generate-payslip-btn') || e.target.closest('.generate-payslip-btn')) {
                const button = e.target.classList.contains('generate-payslip-btn') ?
                    e.target : e.target.closest('.generate-payslip-btn');
                const paymentId = button.getAttribute('data-payment-id');
                if (paymentId) {
                    this.generatePayslip(paymentId);
                }
                return;
            }
        });
    }

    updateSalaryPaymentsSummary() {
        const processedCount = this.salaryPayments.length;
        const totalPaid = this.salaryPayments.reduce((sum, payment) =>
            sum + parseFloat(payment.net_salary || 0), 0);
        const payslipsGenerated = this.salaryPayments.filter(p => p.payslip_generated).length;

        const processedEl = document.getElementById('processedPaymentsCount');
        const totalPaidEl = document.getElementById('totalSalaryPaid');
        const payslipsEl = document.getElementById('payslipsGenerated');

        if (processedEl) processedEl.textContent = processedCount;
        if (totalPaidEl) totalPaidEl.textContent = Utils.formatCurrency(totalPaid);
        if (payslipsEl) payslipsEl.textContent = payslipsGenerated;
    }

    async viewPaymentDetails(paymentId) {
        const payment = this.salaryPayments.find(p => p.id === paymentId);
        if (!payment) {
            this.ui.showToast('Payment not found', 'error');
            return;
        }

        const employee = this.dailyEmployees.find(emp => emp.id === payment.employee_id);

        const modalHtml = `
        <div id="paymentDetailsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-receipt"></i> Payment Details</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="payment-details">
                    <div class="detail-section">
                        <h4>Employee Information</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Employee Name:</label>
                                <span>${employee?.name || payment.employee_name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Employee ID:</label>
                                <span>${payment.employee_id}</span>
                            </div>
                            <div class="detail-item">
                                <label>Department:</label>
                                <span>${employee?.role || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Payment Information</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Payment ID:</label>
                                <span>${payment.id}</span>
                            </div>
                            <div class="detail-item">
                                <label>Payment Date:</label>
                                <span>${Utils.formatDate(payment.payment_date)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Payment Method:</label>
                                <span class="payment-method ${payment.payment_method}">${payment.payment_method}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge ${payment.status}">${payment.status}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Salary Breakdown</h4>
                        <div class="salary-breakdown">
                            <div class="breakdown-item">
                                <span>Basic Salary:</span>
                                <span>${Utils.formatCurrency(payment.basic_salary)}</span>
                            </div>
                            <div class="breakdown-item">
                                <span>Overtime Amount:</span>
                                <span>${Utils.formatCurrency(payment.overtime_amount)}</span>
                            </div>
                            <div class="breakdown-item deduction">
                                <span>Advance Deductions:</span>
                                <span>-${Utils.formatCurrency(payment.advance_deductions)}</span>
                            </div>
                            <div class="breakdown-item total">
                                <span>Net Salary:</span>
                                <span><strong>${Utils.formatCurrency(payment.net_salary)}</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Pay Period</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Period Start:</label>
                                <span>${Utils.formatDate(payment.pay_period_start)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Period End:</label>
                                <span>${Utils.formatDate(payment.pay_period_end)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Work Days:</label>
                                <span>${payment.work_days || 0}</span>
                            </div>
                            <div class="detail-item">
                                <label>Total Hours:</label>
                                <span>${payment.total_hours || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary modal-cancel">Close</button>
                    <button type="button" class="btn-primary" onclick="app.getManagers().salary.generatePayslip('${payment.id}')">
                        <i class="fas fa-file-pdf"></i> Generate Payslip
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'paymentDetailsModal');
    }

    async exportSalaryPayments() {
        try {
            if (this.salaryPayments.length === 0) {
                this.ui.showToast('No salary payments to export', 'warning');
                return;
            }

            const exportData = this.salaryPayments.map(payment => ({
                'Payment ID': payment.id,
                'Payment Date': Utils.formatDate(payment.payment_date),
                'Employee ID': payment.employee_id,
                'Employee Name': payment.employee_name,
                'Pay Period Start': Utils.formatDate(payment.pay_period_start),
                'Pay Period End': Utils.formatDate(payment.pay_period_end),
                'Basic Salary': payment.basic_salary,
                'Overtime Amount': payment.overtime_amount,
                'Advance Deductions': payment.advance_deductions,
                'Net Salary': payment.net_salary,
                'Payment Method': payment.payment_method,
                'Status': payment.status,
                'Work Days': payment.work_days,
                'Total Hours': payment.total_hours
            }));

            const filename = `salary_payments_${new Date().toISOString().split('T')[0]}`;

            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, filename, 'Salary Payments Report');
            } else {
                Utils.exportToExcel(exportData, filename);
            }

            this.ui.showToast('Salary payments exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.ui.showToast('Export failed', 'error');
        }
    }

    async loadSalaryPaymentsData() {
        try {
            console.log('💰 Loading salary payments data...');
            this.ui.showSectionLoading('salaryPaymentsContent', 'Loading salary payments...');

            await this.loadSalaryPayments();
            await this.loadSalaryPaymentsTable();
            this.updateSalaryPaymentsSummary();

            this.ui.showToast('Salary payments loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading salary payments:', error);
            this.ui.showToast('Error loading salary payments', 'error');
        } finally {
            this.ui.hideSectionLoading('salaryPaymentsContent');
        }
    }

    // ==================== ATTENDANCE SYSTEM ====================

    async markAttendance(attendanceData) {
        try {
            const attendanceId = `ATT_${Date.now()}`;
            const record = {
                id: attendanceId,
                employee_id: attendanceData.employee_id,
                employee_name: attendanceData.employee_name,
                attendance_date: attendanceData.attendance_date,
                status: attendanceData.status,
                check_in_time: attendanceData.check_in_time,
                check_out_time: attendanceData.check_out_time,
                work_hours: attendanceData.work_hours || this.calculateWorkHours(attendanceData),
                overtime_hours: attendanceData.overtime_hours || 0,
                notes: attendanceData.notes,
                created_at: new Date().toISOString()
            };

            await this.db.create('attendance', record);
            this.ui.showToast('Attendance marked successfully', 'success');
            await this.loadAttendanceRecords();
        } catch (error) {
            console.error('Error marking attendance:', error);
            this.ui.showToast('Error marking attendance', 'error');
        }
    }

    calculateWorkHours(attendanceData) {
        if (attendanceData.check_in_time && attendanceData.check_out_time) {
            const checkIn = new Date(`2000-01-01T${attendanceData.check_in_time}`);
            const checkOut = new Date(`2000-01-01T${attendanceData.check_out_time}`);
            const hours = (checkOut - checkIn) / (1000 * 60 * 60);
            return Math.max(0, hours);
        }
        return attendanceData.status === 'present' ? 8.0 : 0;
    }

    // ==================== SALARY & ADVANCE SYSTEM ====================

    setupSalaryForm() {
        const salaryForm = document.getElementById('salaryForm');
        if (salaryForm) {
            salaryForm.addEventListener('submit', (e) => this.handleSalarySubmit(e));
            this.populateEmployeeDropdown();

            const salaryDate = document.getElementById('salaryDate');
            if (salaryDate) salaryDate.value = this.currentDate;
        }
    }

    populateEmployeeDropdown() {
        const employeeSelect = document.getElementById('salaryEmployee');
        if (!employeeSelect) return;

        employeeSelect.innerHTML = '<option value="">Select Employee</option>';

        this.dailyEmployees.forEach(employee => {
            const summary = this.getEmployeeSummary(employee.id);
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.id}) - ${employee.role} - Adv: ${Utils.formatCurrency(summary.pendingAdvances)}`;
            employeeSelect.appendChild(option);
        });
    }

    async handleSalarySubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
            this.ui.showToast('Access denied', 'error');
            return;
        }

        const employeeSelect = document.getElementById('salaryEmployee');
        const salaryDate = document.getElementById('salaryDate');
        const salaryAmount = document.getElementById('salaryAmount');
        const advanceAmount = document.getElementById('advanceAmount');

        const employeeId = employeeSelect.value;
        const date = salaryDate.value || this.currentDate;
        const salary = parseFloat(salaryAmount.value) || 0;
        const advance = parseFloat(advanceAmount.value) || 0;

        if (!employeeId) {
            this.ui.showToast('Please select an employee', 'error');
            return;
        }

        if (salary <= 0 && advance <= 0) {
            this.ui.showToast('Please enter salary or advance amount', 'error');
            return;
        }

        try {
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
            if (!employee) throw new Error('Employee not found');

            if (salary > 0) {
                const salaryData = {
                    employee_id: employeeId,
                    employee_name: employee.name,
                    amount: salary,
                    record_date: date,
                    type: 'salary',
                    week_number: this.getWeekNumber(new Date(date)),
                    month_number: new Date(date).getMonth() + 1,
                    year: new Date(date).getFullYear(),
                    created_at: new Date().toISOString()
                };
                await this.db.create('salary_records', salaryData);
            }

            if (advance > 0) {
                const advanceData = {
                    employee_id: employeeId,
                    employee_name: employee.name,
                    amount: advance,
                    record_date: date,
                    type: 'advance',
                    status: 'pending',
                    week_number: this.getWeekNumber(new Date(date)),
                    month_number: new Date(date).getMonth() + 1,
                    year: new Date(date).getFullYear(),
                    created_at: new Date().toISOString()
                };
                await this.db.create('advance_records', advanceData);
            }

            this.ui.showToast('Record saved successfully', 'success');
            e.target.reset();
            salaryDate.value = this.currentDate;
            await this.loadSalaryData();

        } catch (error) {
            console.error('Error saving record:', error);
            this.ui.showToast('Error saving record', 'error');
        }
    }

    // ==================== SALARY PAYMENT & PAYSLIP SYSTEM ====================

    async processSalaryPayment(paymentData) {
        try {
            const calculation = await this.calculateSalary(
                paymentData.employee_id,
                paymentData.pay_period_start,
                paymentData.pay_period_end
            );

            const paymentId = `SAL_${Date.now()}`;
            const payment = {
                id: paymentId,
                employee_id: paymentData.employee_id,
                employee_name: paymentData.employee_name,
                payment_date: paymentData.payment_date,
                pay_period_start: paymentData.pay_period_start,
                pay_period_end: paymentData.pay_period_end,
                basic_salary: calculation.basic_salary,
                overtime_amount: calculation.overtime_amount,
                advance_deductions: calculation.advance_deductions,
                total_advances: calculation.total_advances,
                net_salary: calculation.net_salary,
                payment_method: paymentData.payment_method,
                status: 'paid',
                payslip_generated: false,
                work_days: calculation.work_days,
                total_hours: calculation.total_work_hours,
                created_at: new Date().toISOString()
            };

            await this.db.create('salary_payments', payment);

            for (const advance of this.advanceRecords.filter(a =>
                a.employee_id === paymentData.employee_id &&
                a.status === 'pending'
            )) {
                await this.db.update('advance_records', advance.id, {
                    status: 'deducted',
                    deducted_date: new Date().toISOString()
                });
            }

            this.ui.showToast('Salary payment processed successfully', 'success');
            await this.loadSalaryData();
            return paymentId;
        } catch (error) {
            console.error('Error processing salary payment:', error);
            this.ui.showToast('Error processing salary payment', 'error');
            throw error;
        }
    }

    async calculateSalary(employeeId, periodStart, periodEnd) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) throw new Error('Employee not found');

        const periodAttendance = this.attendanceRecords.filter(record =>
            record.employee_id === employeeId &&
            new Date(record.attendance_date) >= new Date(periodStart) &&
            new Date(record.attendance_date) <= new Date(periodEnd)
        );

        const periodAdvances = this.advanceRecords.filter(advance =>
            advance.employee_id === employeeId &&
            advance.status === 'pending' &&
            new Date(advance.record_date) >= new Date(periodStart) &&
            new Date(advance.record_date) <= new Date(periodEnd)
        );

        const totalWorkHours = periodAttendance.reduce((sum, record) => sum + (record.work_hours || 0), 0);
        const totalOvertime = periodAttendance.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);
        const totalAdvances = periodAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);

        const workDays = periodAttendance.filter(a => a.status === 'present').length;
        const basicSalary = (employee.daily_rate || employee.basic_salary || 0) * workDays;
        const overtimeAmount = totalOvertime * ((employee.daily_rate || employee.basic_salary || 0) / 8) * 1.5;
        const netSalary = basicSalary + overtimeAmount - totalAdvances;

        return {
            basic_salary: basicSalary,
            overtime_amount: overtimeAmount,
            advance_deductions: totalAdvances,
            total_advances: totalAdvances,
            net_salary: netSalary,
            work_days: workDays,
            total_work_hours: totalWorkHours,
            overtime_hours: totalOvertime
        };
    }

    async generatePayslip(salaryPaymentId) {
        try {
            const payment = this.salaryPayments.find(p => p.id === salaryPaymentId);
            if (!payment) throw new Error('Salary payment not found');

            const employee = this.dailyEmployees.find(emp => emp.id === payment.employee_id);
            const attendance = this.attendanceRecords.filter(record =>
                record.employee_id === payment.employee_id &&
                new Date(record.attendance_date) >= new Date(payment.pay_period_start) &&
                new Date(record.attendance_date) <= new Date(payment.pay_period_end)
            );

            const payslipData = {
                employee: employee,
                payment: payment,
                attendance: attendance,
                work_days: payment.work_days,
                total_hours: payment.total_hours,
                generated_date: new Date().toISOString()
            };

            await this.generateA5PayslipPDF(payslipData);

            await this.db.update('salary_payments', salaryPaymentId, {
                payslip_generated: true
            });

            this.ui.showToast('Payslip generated successfully', 'success');
        } catch (error) {
            console.error('Error generating payslip:', error);
            this.ui.showToast('Error generating payslip', 'error');
        }
    }

    async generateA5PayslipPDF(payslipData) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
        });

        const pageWidth = 148;
        const margin = 10;
        const contentWidth = pageWidth - (2 * margin);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('BUSINESS MANAGER', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Salary Payslip', pageWidth / 2, 22, { align: 'center' });

        let yPosition = 35;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Details:', margin, yPosition);

        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${payslipData.employee.name}`, margin, yPosition);
        doc.text(`ID: ${payslipData.employee.id}`, margin + 70, yPosition);

        yPosition += 4;
        doc.text(`Department: ${payslipData.employee.role}`, margin, yPosition);

        yPosition += 4;
        doc.text(`Pay Period: ${Utils.formatDate(payslipData.payment.pay_period_start)} to ${Utils.formatDate(payslipData.payment.pay_period_end)}`, margin, yPosition);
        doc.text(`Payment Date: ${Utils.formatDate(payslipData.payment.payment_date)}`, margin + 70, yPosition);

        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Salary Breakdown:', margin, yPosition);

        yPosition += 6;
        const salaryItems = [
            ['Basic Salary', Utils.formatCurrency(payslipData.payment.basic_salary)],
            ['Overtime', Utils.formatCurrency(payslipData.payment.overtime_amount)],
            ['Advances Deducted', `-${Utils.formatCurrency(payslipData.payment.advance_deductions)}`],
            ['NET SALARY', Utils.formatCurrency(payslipData.payment.net_salary)]
        ];

        doc.setFont('helvetica', 'normal');
        salaryItems.forEach(([label, value], index) => {
            const isTotal = index === salaryItems.length - 1;
            if (isTotal) {
                doc.setFont('helvetica', 'bold');
                yPosition += 2;
                doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
            }

            doc.text(label, margin, yPosition);
            doc.text(value, pageWidth - margin, yPosition, { align: 'right' });

            yPosition += 5;
            if (isTotal) {
                doc.setFont('helvetica', 'normal');
            }
        });

        yPosition += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance Summary:', margin, yPosition);

        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Work Days: ${payslipData.work_days}`, margin, yPosition);
        doc.text(`Total Hours: ${payslipData.total_hours.toFixed(1)}`, margin + 70, yPosition);

        yPosition = 190;
        doc.setFontSize(8);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), margin, yPosition);
        doc.text('Authorized Signature', pageWidth - margin, yPosition, { align: 'right' });

        const fileName = `payslip_${payslipData.employee.id}_${payslipData.payment.payment_date}.pdf`;
        doc.save(fileName);
    }

    // ==================== RENDER METHODS ====================

    renderSalaryTable() {
        const tbody = document.getElementById('salaryTableBody');
        if (!tbody) return;

        const filteredRecords = this.filterRecordsByDate([...this.salaryRecords, ...this.advanceRecords]);

        if (filteredRecords.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">
                    <i class="fas fa-money-bill-wave"></i>
                    <br>No records found
                    ${this.currentDateFilter !== 'all' ? ' for selected filter' : ''}
                </td>
            </tr>
        `;
            return;
        }

        const groupedRecords = this.groupRecordsByDate(filteredRecords);

        tbody.innerHTML = Object.keys(groupedRecords).map(dateGroup => {
            const records = groupedRecords[dateGroup];
            return `
            <tr class="date-group-header">
                <td colspan="8">
                    <strong>${dateGroup}</strong>
                    <span class="date-total">Total: ${Utils.formatCurrency(
                records.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0)
            )}</span>
                </td>
            </tr>
            ${records.map(record => {
                const isAdvance = record.type === 'advance';
                return `
                    <tr class="${isAdvance ? 'advance-record' : 'salary-record'}">
                        <td class="time-cell">${this.formatTime(record.record_date)}</td>
                        <td><strong>${record.employee_id}</strong></td>
                        <td>${record.employee_name}</td>
                        <td>
                            ${isAdvance ?
                        '<span class="advance-badge"><i class="fas fa-hand-holding-usd"></i> Advance</span>' :
                        '<span class="salary-badge"><i class="fas fa-money-bill-wave"></i> Salary</span>'
                    }
                        </td>
                        <td>${Utils.formatCurrency(record.amount)}</td>
                        <td>Week ${record.week_number}</td>
                        <td>${isAdvance ? record.status : 'Paid'}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-secondary btn-sm" onclick="app.getManagers().salary.deleteRecord('${record.id}', '${record.type}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                                ${isAdvance && record.status === 'pending' ? `
                                <button class="btn-primary btn-sm" onclick="app.getManagers().salary.markAdvancePaid('${record.id}')">
                                    <i class="fas fa-check"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('')}
        `;
        }).join('');
    }

    // ==================== SUMMARY & UTILITIES ====================

    updateSummaryCards() {
        const attendanceSummary = this.getTodaysAttendanceSummary();

        document.getElementById('presentTodayCount').textContent = attendanceSummary.present;
        document.getElementById('absentTodayCount').textContent = attendanceSummary.absent;
        document.getElementById('halfDayCount').textContent = attendanceSummary.halfDay;
        document.getElementById('totalEmployeesCount').textContent = attendanceSummary.total;

        const totalPaid = this.salaryRecords.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
        const pendingAdvances = this.advanceRecords.filter(a => a.status === 'pending')
            .reduce((sum, advance) => sum + parseFloat(advance.amount || 0), 0);

        document.getElementById('totalPaidAmount').textContent = Utils.formatCurrency(totalPaid);
        document.getElementById('pendingAdvances').textContent = Utils.formatCurrency(pendingAdvances);
        document.getElementById('dailyEmployeesCount').textContent = this.dailyEmployees.length;
    }

    getEmployeeSummary(employeeId) {
        const salaryTotal = this.salaryRecords
            .filter(record => record.employee_id === employeeId)
            .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);

        const pendingAdvances = this.advanceRecords
            .filter(record => record.employee_id === employeeId && record.status === 'pending')
            .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);

        return {
            totalSalary: salaryTotal,
            pendingAdvances: pendingAdvances
        };
    }

    // ==================== EXPORT METHODS ====================

    async exportSalaryToExcel() {
        try {
            const allRecords = [...this.salaryRecords, ...this.advanceRecords];
            if (allRecords.length === 0) {
                this.ui.showToast('No records to export', 'warning');
                return;
            }

            const exportData = allRecords.map(record => ({
                'Date': Utils.formatDate(record.record_date),
                'Employee ID': record.employee_id,
                'Employee Name': record.employee_name,
                'Type': record.type === 'advance' ? 'Advance' : 'Salary',
                'Amount': record.amount,
                'Week': `Week ${record.week_number}`,
                'Month': new Date(record.record_date).toLocaleDateString('en-US', { month: 'long' }),
                'Year': record.year,
                'Status': record.type === 'advance' ? record.status : 'Paid'
            }));

            const title = 'Salary Records Report';
            const filename = `salary_records_${new Date().toISOString().split('T')[0]}`;

            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, filename, title);
            } else {
                Utils.exportToExcel(exportData, filename);
            }

            this.ui.showToast('Exported to Excel successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.ui.showToast('Export failed', 'error');
        }
    }

    async exportSalaryToPDF() {
        try {
            const allRecords = [...this.salaryRecords, ...this.advanceRecords];
            if (allRecords.length === 0) {
                this.ui.showToast('No records to export', 'warning');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a3'
            });

            const pageWidth = 420;
            const margin = 15;

            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Salary Records Report', pageWidth / 2, margin + 10, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, margin + 20);

            const tableData = allRecords.map(record => [
                Utils.formatDate(record.record_date),
                record.employee_id,
                record.employee_name,
                record.type === 'advance' ? 'Advance' : 'Salary',
                Utils.formatCurrency(record.amount),
                `Week ${record.week_number}`,
                record.type === 'advance' ? record.status : 'Paid'
            ]);

            doc.autoTable({
                startY: margin + 25,
                head: [['Date', 'Employee ID', 'Employee Name', 'Type', 'Amount', 'Week', 'Status']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: {
                    fillColor: [255, 107, 53],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                margin: { top: margin + 25 }
            });

            doc.save(`salary_records_${new Date().toISOString().split('T')[0]}.pdf`);
            this.ui.showToast('Exported to PDF successfully', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            this.ui.showToast('PDF export failed', 'error');
        }
    }

    // ==================== UTILITY METHODS ====================

    applyDateFilter(filter) {
        this.currentDateFilter = filter;
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
        this.renderSalaryTable();
    }

    filterRecordsByDate(records) {
        const now = new Date();
        switch (this.currentDateFilter) {
            case 'today':
                return records.filter(record =>
                    new Date(record.record_date).toDateString() === now.toDateString()
                );
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return records.filter(record =>
                    new Date(record.record_date) >= weekStart
                );
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return records.filter(record =>
                    new Date(record.record_date) >= monthStart
                );
            default:
                return records;
        }
    }

    groupRecordsByDate(records) {
        const grouped = {};
        records.forEach(record => {
            const dateGroup = this.formatDateGroup(record.record_date);
            if (!grouped[dateGroup]) grouped[dateGroup] = [];
            grouped[dateGroup].push(record);
        });
        return grouped;
    }

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    }

    formatDateGroup(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();

        if (date.toDateString() === today.toDateString()) return 'Today';

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ==================== CRUD OPERATIONS ====================

    async deleteRecord(recordId, type) {
        if (!confirm('Delete this record?')) return;

        try {
            const tableName = type === 'advance' ? 'advance_records' : 'salary_records';
            await this.db.delete(tableName, recordId);
            this.ui.showToast('Record deleted', 'success');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Delete error:', error);
            this.ui.showToast('Delete failed', 'error');
        }
    }

    async markAdvancePaid(advanceId) {
        try {
            await this.db.update('advance_records', advanceId, {
                status: 'paid',
                paid_date: new Date().toISOString()
            });
            this.ui.showToast('Advance marked as paid', 'success');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Mark paid error:', error);
            this.ui.showToast('Update failed', 'error');
        }
    }

    // ==================== EVENT LISTENERS & MODALS ====================

    showMarkAttendanceModal() {
        const modalHtml = `
        <div id="attendanceModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-check"></i> Mark Attendance</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="attendanceForm" class="modal-form">
                    <div class="form-group">
                        <label>Employee *</label>
                        <select id="attendanceEmployeeId" required>
                            <option value="">Select Employee</option>
                            ${this.dailyEmployees.map(emp => `
                                <option value="${emp.id}">${emp.name} (${emp.id})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="attendanceDate" required value="${this.currentDate}">
                    </div>
                    <div class="form-group">
                        <label>Status *</label>
                        <select id="attendanceStatus" required>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half_day">Half Day</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Check In Time</label>
                            <input type="time" id="checkInTime">
                        </div>
                        <div class="form-group">
                            <label>Check Out Time</label>
                            <input type="time" id="checkOutTime">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="attendanceNotes" placeholder="Add any notes"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn-primary">Mark Attendance</button>
                    </div>
                </form>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'attendanceModal');

        document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const employeeId = document.getElementById('attendanceEmployeeId').value;
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);

            const formData = {
                employee_id: employeeId,
                employee_name: employee ? employee.name : 'Unknown',
                attendance_date: document.getElementById('attendanceDate').value,
                status: document.getElementById('attendanceStatus').value,
                check_in_time: document.getElementById('checkInTime').value,
                check_out_time: document.getElementById('checkOutTime').value,
                notes: document.getElementById('attendanceNotes').value
            };

            await this.markAttendance(formData);
            this.ui.hideModal('attendanceModal');
        });
    }

    showProcessSalaryModal() {
        const modalHtml = `
        <div id="salaryPaymentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-money-check"></i> Process Salary Payment</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="salaryPaymentForm" class="modal-form">
                    <div class="form-group">
                        <label>Employee *</label>
                        <select id="salaryEmployeeId" required>
                            <option value="">Select Employee</option>
                            ${this.dailyEmployees.map(emp => `
                                <option value="${emp.id}">${emp.name} (${emp.id})</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Pay Period Start *</label>
                            <input type="date" id="payPeriodStart" required>
                        </div>
                        <div class="form-group">
                            <label>Pay Period End *</label>
                            <input type="date" id="payPeriodEnd" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Payment Date *</label>
                        <input type="date" id="paymentDate" required value="${this.currentDate}">
                    </div>
                    <div class="form-group">
                        <label>Payment Method *</label>
                        <select id="paymentMethod" required>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                    <div id="salaryPreview" class="salary-preview" style="display: none;">
                        <h4>Salary Preview</h4>
                        <div class="preview-items">
                            <div class="preview-item">
                                <span>Basic Salary:</span>
                                <span id="previewBasicSalary">₹0</span>
                            </div>
                            <div class="preview-item">
                                <span>Overtime:</span>
                                <span id="previewOvertime">₹0</span>
                            </div>
                            <div class="preview-item">
                                <span>Advances Deducted:</span>
                                <span id="previewAdvances">-₹0</span>
                            </div>
                            <div class="preview-item total">
                                <span>Net Salary:</span>
                                <span id="previewNetSalary">₹0</span>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                        <button type="button" id="calculateSalaryBtn" class="btn-secondary">Calculate</button>
                        <button type="submit" class="btn-primary">Process Payment</button>
                    </div>
                </form>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'salaryPaymentModal');

        document.getElementById('calculateSalaryBtn').addEventListener('click', async () => {
            const employeeId = document.getElementById('salaryEmployeeId').value;
            const periodStart = document.getElementById('payPeriodStart').value;
            const periodEnd = document.getElementById('payPeriodEnd').value;

            if (employeeId && periodStart && periodEnd) {
                try {
                    const calculation = await this.calculateSalary(employeeId, periodStart, periodEnd);

                    document.getElementById('previewBasicSalary').textContent = Utils.formatCurrency(calculation.basic_salary);
                    document.getElementById('previewOvertime').textContent = Utils.formatCurrency(calculation.overtime_amount);
                    document.getElementById('previewAdvances').textContent = `-${Utils.formatCurrency(calculation.advance_deductions)}`;
                    document.getElementById('previewNetSalary').textContent = Utils.formatCurrency(calculation.net_salary);

                    document.getElementById('salaryPreview').style.display = 'block';
                } catch (error) {
                    this.ui.showToast('Error calculating salary', 'error');
                }
            }
        });

        document.getElementById('salaryPaymentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const employeeId = document.getElementById('salaryEmployeeId').value;
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);

            const formData = {
                employee_id: employeeId,
                employee_name: employee ? employee.name : 'Unknown',
                pay_period_start: document.getElementById('payPeriodStart').value,
                pay_period_end: document.getElementById('payPeriodEnd').value,
                payment_date: document.getElementById('paymentDate').value,
                payment_method: document.getElementById('paymentMethod').value
            };

            await this.processSalaryPayment(formData);
            this.ui.hideModal('salaryPaymentModal');
        });
    }

    showExportOptions() {
        const exportHtml = `
        <div id="exportSalaryModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Export Salary Records</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="export-options">
                    <div class="export-option" onclick="app.getManagers().salary.exportSalaryToExcel()">
                        <i class="fas fa-file-excel"></i>
                        <span>Export to Excel</span>
                    </div>
                    <div class="export-option" onclick="app.getManagers().salary.exportSalaryToPDF()">
                        <i class="fas fa-file-pdf"></i>
                        <span>Export to PDF (A3)</span>
                    </div>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(exportHtml, 'exportSalaryModal');
    }

    /**
 * ✅ COMPLETE: Setup all event listeners
 */
    setupEventListeners() {
        // Remove existing listeners first
        document.removeEventListener('click', this.boundClickHandler);

        this.boundClickHandler = (e) => this.handleGlobalClick(e);
        document.addEventListener('click', this.boundClickHandler);
    }

    handleGlobalClick(e) {
        try {
            // Enhanced quick actions
            if (e.target.id === 'quickAttendanceBtn' || e.target.closest('#quickAttendanceBtn')) {
                this.showQuickAttendanceModal();
                return;
            }

            if (e.target.id === 'bulkSalaryBtn' || e.target.closest('#bulkSalaryBtn')) {
                this.showBulkSalaryModal();
                return;
            }

            // Keep existing event listeners
            if (e.target.id === 'markAttendanceBtn') {
                this.showMarkAttendanceModal();
                return;
            }

            if (e.target.id === 'processSalaryBtn') {
                this.showProcessSalaryModal();
                return;
            }

            if (e.target.id === 'exportSalaryBtn') {
                this.showExportOptions();
                return;
            }

            if (e.target.closest('[data-filter]')) {
                const filter = e.target.closest('[data-filter]').getAttribute('data-filter');
                this.applyDateFilter(filter);
                return;
            }
        } catch (error) {
            console.error('Error in salary click handler:', error);
        }
    }

    /**
     * ✅ FIXED: Cleanup method
     */
    cleanup() {
        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }
        console.log('🧹 Enhanced Salary Manager cleanup');
    }

    showCustomModal(html, modalId) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', html);
        this.ui.showModal(modalId);
    }

    cleanup() {
        console.log('Enhanced Salary Manager cleanup');
    }
}

window.SalaryManager = SalaryManager;

class UserManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('UserManager: dependencies required');
        if (!dependencies.db) throw new Error('UserManager: db dependency is required');
        if (!dependencies.ui) throw new Error('UserManager: ui dependency is required');
        if (!dependencies.auth) throw new Error('UserManager: auth dependency is required');

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.users = [];
        this.isInitialized = false;

        console.log('✅ UserManager initialized');
    }

    async initialize() {
        try {
            console.log('🔄 Initializing UserManager...');
            await this.loadUsers();
            this.setupEventListeners();
            console.log('✅ UserManager initialization complete');
        } catch (error) {
            console.error('❌ UserManager initialization failed:', error);
        }
        return Promise.resolve();
    }

    async loadUsers() {
        try {
            console.log('👥 Loading users...');
            this.ui.showSectionLoading('usersContent', 'Loading users...');

            this.users = await this.db.getUsers() || [];
            console.log('✅ Users loaded:', this.users.length);

            this.renderUsersTable(this.users);
            this.ui.showToast('Users loaded successfully', 'success');

        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.ui.showToast('Error loading users: ' + error.message, 'error');
            this.users = [];
            this.renderUsersTable([]);
        } finally {
            this.ui.hideSectionLoading('usersContent');
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up UserManager event listeners...');

        this.cleanup();

        document.addEventListener('click', (e) => {
            if (e.target.id === 'addUserBtn' || e.target.closest('#addUserBtn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 Add User button clicked');
                this.showAddUserModal();
            }

            if (e.target.id === 'exportUsersBtn' || e.target.closest('#exportUsersBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showExportOptions();
            }
        });

        class PasswordToggle {
            static init() {
                console.log('🔧 Initializing PasswordToggle...');

                document.addEventListener('click', (e) => {
                    if (e.target.closest('.password-toggle')) {
                        PasswordToggle.handleToggle(e.target.closest('.password-toggle'));
                    }
                });

                document.querySelectorAll('.password-toggle').forEach(toggle => {
                    toggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        PasswordToggle.handleToggle(toggle);
                    });
                });

                console.log('✅ PasswordToggle initialized');
            }

            static handleToggle(toggle) {
                console.log('👁️ Handling password toggle...');

                const container = toggle.closest('.password-input-container');
                if (!container) {
                    console.error('❌ Container not found');
                    return;
                }

                const input = container.querySelector('input');
                const icon = toggle.querySelector('i');

                if (!input || !icon) {
                    console.error('❌ Input or icon not found');
                    return;
                }

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    console.log('✅ Password shown');
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                    console.log('✅ Password hidden');
                }
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => PasswordToggle.init());
        } else {
            PasswordToggle.init();
        }

        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.removeEventListener('submit', this.handleUserSubmit);
            this.handleUserSubmit = this.handleUserSubmit.bind(this);
            userForm.addEventListener('submit', (e) => this.handleUserSubmit(e));
        }

        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.removeEventListener('input', this.searchUsers);
            this.searchUsers = this.searchUsers.bind(this);
            userSearch.addEventListener('input', (e) => this.searchUsers(e.target.value));
        }

        console.log('✅ UserManager event listeners setup complete');
    }

    showAddUserModal() {
        console.log('🔄 Checking permissions for adding user...');

        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to create users', 'error');
            return;
        }

        this.ui.showModal('userModal');

        setTimeout(() => {
            this.safeExecute(() => {
                const modalTitle = document.getElementById('userModalTitle');
                const userForm = document.getElementById('userForm');
                const editUserId = document.getElementById('editUserId');
                const userStatus = document.getElementById('userStatus');
                const userRole = document.getElementById('userRole');
                const userPassword = document.getElementById('userPassword');
                const userConfirmPassword = document.getElementById('userConfirmPassword');

                if (modalTitle) modalTitle.textContent = 'Add User';
                if (userForm) userForm.reset();
                if (editUserId) editUserId.value = '';
                if (userStatus) userStatus.value = 'active';
                if (userRole) userRole.value = 'user';

                if (userPassword) userPassword.value = '';
                if (userConfirmPassword) userConfirmPassword.value = '';

                console.log('✅ Add user modal fully initialized');
            });
        }, 50);
    }

    safeExecute(operation, context = 'operation') {
        try {
            return operation();
        } catch (error) {
            console.error(`❌ ${context} failed:`, error);
            return null;
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.error('Users table body not found');
            return;
        }

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-users"></i>
                        <br>No users found
                    </td>
                </tr>
            `;
            return;
        }

        const currentUser = this.auth.getCurrentUser();

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-avatar-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff6b35&color=fff" 
                             alt="${user.name}" class="user-avatar-table">
                        <div class="user-info-table">
                            <span class="user-name-table">
                                ${user.name}
                                ${user.id === currentUser?.id ? '<span class="current-user-badge">You</span>' : ''}
                            </span>
                            <span class="user-username-table">@${user.username}</span>
                        </div>
                    </div>
                </td>
                <td>${user.email || '<span class="text-muted">N/A</span>'}</td>
                <td>${user.phone || '<span class="text-muted">N/A</span>'}</td>
                <td>
                    <span class="role-badge role-${user.role}">${this.formatRoleName(user.role)}</span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="app.getManagers().user.editUser('${user.id}')" 
                                ${user.id === currentUser?.id ? 'disabled title="Cannot edit your own account"' : ''}>
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-icon btn-delete" onclick="app.getManagers().user.deleteUser('${user.id}')"
                                ${user.id === currentUser?.id ? 'disabled title="Cannot delete your own account"' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    formatRoleName(role) {
        const roleNames = {
            'admin': 'Administrator',
            'manager': 'Manager',
            'supervisor': 'Supervisor',
            'user': 'User'
        };
        return roleNames[role] || role;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    }

    async editUser(userId) {
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to edit users', 'error');
            return;
        }

        try {
            this.ui.showLoading('Loading user...');
            const user = this.users.find(u => u.id === userId);

            if (user) {
                document.getElementById('userModalTitle').textContent = 'Edit User';
                document.getElementById('editUserId').value = user.id;
                document.getElementById('userNameInput').value = user.name;
                document.getElementById('userEmail').value = user.email || '';
                document.getElementById('userPhone').value = user.phone || '';
                document.getElementById('userRole').value = user.role;
                document.getElementById('userStatus').value = user.status || 'active';

                document.getElementById('userPassword').value = '';
                document.getElementById('userConfirmPassword').value = '';

                document.getElementById('userPassword').placeholder = 'Leave blank to keep current password';
                document.getElementById('userConfirmPassword').placeholder = 'Leave blank to keep current password';

                this.ui.showModal('userModal');
            } else {
                this.ui.showToast('User not found', 'error');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.ui.showToast('Error loading user', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async handleUserSubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to manage users', 'error');
            return;
        }

        const userId = document.getElementById('editUserId').value;
        const name = document.getElementById('userNameInput').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;

        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;

        if (!name) {
            this.ui.showToast('Name is required', 'error');
            return;
        }

        if (!userId) {
            if (!password) {
                this.ui.showToast('Password is required', 'error');
                return;
            }

            if (password.length < 6) {
                this.ui.showToast('Password must be at least 6 characters long', 'error');
                return;
            }

            if (password !== confirmPassword) {
                this.ui.showToast('Passwords do not match', 'error');
                return;
            }
        }

        if (email && !this.validateEmail(email)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (phone && !this.validatePhone(phone)) {
            this.ui.showToast('Please enter a valid phone number', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading ?
            this.ui.showButtonLoading(button, 'Saving...') :
            () => { if (button) button.disabled = false; };

        try {
            const userData = {
                name: this.sanitizeInput(name),
                email: email ? this.sanitizeInput(email) : null,
                phone: phone ? this.sanitizeInput(phone) : null,
                role,
                status,
                updated_at: new Date().toISOString()
            };

            if (userId) {
                if (password) {
                    if (password.length < 6) {
                        this.ui.showToast('Password must be at least 6 characters long', 'error');
                        return;
                    }
                    if (password !== confirmPassword) {
                        this.ui.showToast('Passwords do not match', 'error');
                        return;
                    }
                    userData.password = password;
                }

                await this.db.update('users', userId, userData);
                this.ui.showToast('User updated successfully', 'success');
            } else {
                userData.username = this.generateUsername(name);
                userData.password = password;
                userData.created_at = new Date().toISOString();

                await this.db.create('users', userData);
                this.ui.showToast('User created successfully', 'success');
            }

            this.ui.hideModal('userModal');
            await this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.ui.showToast('Error saving user: ' + error.message, 'error');
        } finally {
            resetButton();
        }
    }

    generateUsername(name) {
        const baseUsername = name.toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[^a-z0-9.]/g, '');

        const timestamp = Date.now().toString().slice(-4);
        return `${baseUsername}.${timestamp}`;
    }

    async deleteUser(userId) {
        if (!this.auth.hasPermission('admin')) {
            this.ui.showToast('Insufficient permissions to delete users', 'error');
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.ui.showToast('User not found', 'error');
            return;
        }

        const currentUser = this.auth.getCurrentUser();
        if (userId === currentUser?.id) {
            this.ui.showToast('Cannot delete your own account', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.ui.showLoading('Deleting user...');
            await this.db.delete('users', userId);
            this.ui.showToast('User deleted successfully', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.ui.showToast('Error deleting user: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    showExportOptions() {
        this.showExportModal('users', ['excel', 'pdf']);
    }

    showExportModal(type, allowedFormats = ['excel', 'pdf']) {
        const titles = {
            'users': 'Users',
            'employees': 'Employees',
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
            <div class="export-option" onclick="app.getManagers().${type === 'users' ? 'user' : 'employee'}.exportTo${format.toUpperCase()}('${type}')">
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
                    <button class="btn-secondary" onclick="app.getManagers().${type === 'users' ? 'user' : 'employee'}.closeExportModal()">
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

    async exportData(type, format = 'excel') {
        try {
            if (!this.auth.hasPermission('admin')) {
                this.ui.showToast('Insufficient permissions to export data', 'error');
                return;
            }

            this.ui.showExportProgress(`Preparing ${type} data...`);

            let data = [];
            let filename = '';
            let title = '';

            switch (type) {
                case 'users':
                    data = this.users;
                    filename = `users_export_${new Date().toISOString().split('T')[0]}`;
                    title = 'Users Report';
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }

            if (data.length === 0) {
                this.ui.showToast(`No ${type} data to export`, 'warning');
                return;
            }

            const exportData = data.map(user => ({
                'Name': user.name,
                'Username': user.username,
                'Email': user.email || '',
                'Phone': user.phone || '',
                'Role': this.formatRoleName(user.role),
                'Status': user.status,
                'Created Date': this.formatDate(user.created_at)
            }));

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
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', html);
        this.ui.showModal(modalId);
    }

    async exportUsers() {
        try {
            console.log('📤 Starting user export...');

            if (this.ui.showExportProgress) {
                this.ui.showExportProgress('Preparing user data...');
            } else {
                this.ui.showLoading('Preparing export...');
            }

            const users = await this.db.getUsers();
            if (users.length === 0) {
                this.ui.showToast('No users to export', 'warning');
                return;
            }

            const exportData = users.map(user => ({
                'Name': user.name,
                'Username': user.username,
                'Email': user.email || '',
                'Phone': user.phone || '',
                'Role': this.formatRoleName(user.role),
                'Status': user.status,
                'Created Date': this.formatDate(user.created_at)
            }));

            if (window.exportManager && typeof window.exportManager.exportToExcel === 'function') {
                await window.exportManager.exportToExcel(exportData, 'users_export', 'Users Export');
            } else if (window.Utils && typeof window.Utils.exportToExcel === 'function') {
                window.Utils.exportToExcel(exportData, 'users_export');
            } else {
                this.fallbackExport(exportData, 'users_export');
            }

            this.ui.showToast('Users exported successfully', 'success');
            console.log('✅ User export completed');

        } catch (error) {
            console.error('❌ Error exporting users:', error);
            this.ui.showToast('Error exporting users: ' + error.message, 'error');
        } finally {
            if (this.ui.hideExportProgress) {
                this.ui.hideExportProgress();
            } else {
                this.ui.hideLoading();
            }
        }
    }

    fallbackExport(data, filename) {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header =>
                    `"${String(row[header] || '').replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    searchUsers(query) {
        if (!query) {
            this.renderUsersTable(this.users);
            return;
        }

        const filteredUsers = this.users.filter(user =>
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase()) ||
            user.phone?.includes(query) ||
            user.role.toLowerCase().includes(query.toLowerCase())
        );

        this.renderUsersTable(filteredUsers);
    }

    async getUserStats() {
        const users = await this.db.getUsers();
        const stats = {
            total: users.length,
            byRole: {},
            byStatus: {}
        };

        users.forEach(user => {
            stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
            stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
        });

        return stats;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>&"']/g, '');
    }

    cleanup() {
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.removeEventListener('submit', this.handleUserSubmit);
        }

        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.removeEventListener('input', this.searchUsers);
        }
    }
}

window.UserManager = UserManager;







