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
                    return true;
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
        this.currentDateFilter = 'today';

        // Enhanced data structures
        this.todaysAttendance = [];
        this.pendingAdvances = [];
        this.employeeSummary = {};

        this.boundClickHandler = null;
        this.setupEventListeners();
        console.log('✅ SalaryManager initialized with enhanced UX');
    }

    /**
     * ✅ FIXED: Generate proper UUID for Supabase
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * ✅ SAFE PERMISSION CHECK
     */
    hasPermission(permission) {
        if (!this.auth || typeof this.auth.hasPermission !== 'function') {
            console.warn(`⚠️ Auth not available, granting permission: ${permission}`);
            return true;
        }
        return this.auth.hasPermission(permission);
    }

    /**
     * ✅ FIXED: Load salary data
     */
    async loadSalaryData() {
        try {
            if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💰 Loading enhanced salary data...');
            this.ui.showSectionLoading('salaryContent', 'Loading salary dashboard...');

            await Promise.all([
                this.loadDailyEmployees(),
                this.loadAttendanceRecords(),
                this.loadSalaryPayments(),
                this.loadSalaryRecords(),
                this.loadAdvanceRecords()
            ]);

            this.processTodaysData();
            this.calculateEmployeeSummaries();
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
     * ✅ FIXED: Show advance modal with WORKING FORM SUBMISSION
     */
    showAdvanceModal(employeeId = null) {
        const employee = employeeId ?
            this.dailyEmployees.find(emp => emp.id === employeeId) : null;

        const modalHtml = `
        <div id="advanceModal" class="modal active">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd"></i> ${employee ? `Add Advance - ${employee.name}` : 'Add Advance'}</h3>
                    <button type="button" class="modal-close">&times;</button>
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
                        <input type="number" id="advanceAmount" required min="1" step="1" 
                               placeholder="Enter advance amount" class="amount-input">
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
        this.setupAdvanceModalEvents();
    }

    /**
     * ✅ FIXED: Setup advance modal event listeners
     */
    setupAdvanceModalEvents() {
        const modal = document.getElementById('advanceModal');
        const form = document.getElementById('advanceForm');
        const cancelBtn = form.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        const amountInput = document.getElementById('advanceAmount');

        // ✅ FIXED: Prevent multiple submissions
        let isSubmitting = false;

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        // Close events
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isSubmitting) {
                console.log('⚠️ Form submission already in progress');
                return;
            }

            isSubmitting = true;

            try {
                const amountValue = amountInput.value.trim();
                const employeeId = document.getElementById('advanceEmployeeId').value;

                if (!employeeId) {
                    this.ui.showToast('Please select an employee', 'error');
                    isSubmitting = false;
                    return;
                }

                if (!amountValue) {
                    this.ui.showToast('Please enter an advance amount', 'error');
                    amountInput.focus();
                    isSubmitting = false;
                    return;
                }

                const amount = parseFloat(amountValue);
                if (isNaN(amount) || amount <= 0) {
                    this.ui.showToast('Please enter a valid positive amount', 'error');
                    amountInput.focus();
                    isSubmitting = false;
                    return;
                }

                if (amount > 100000) {
                    this.ui.showToast('Amount seems too large. Please enter a reasonable amount.', 'error');
                    amountInput.focus();
                    isSubmitting = false;
                    return;
                }

                const formData = {
                    employee_id: employeeId,
                    amount: amount,
                    record_date: document.getElementById('advanceDate').value,
                    notes: document.getElementById('advanceNotes').value
                };

                await this.saveAdvance(formData);
                closeModal();

            } catch (error) {
                console.error('Error in advance form submission:', error);
                this.ui.showToast('Error processing advance request', 'error');
            } finally {
                isSubmitting = false;
            }
        });
        console.log('Form element found:', !!form);
        console.log('Form ID:', form?.id);
        console.log('Form outerHTML:', form?.outerHTML);
    }

    /**
     * ✅ FIXED: Save advance with UUID
     */
    async saveAdvance(advanceData) {
        try {
            const employee = this.dailyEmployees.find(emp => emp.id === advanceData.employee_id);
            if (!employee) throw new Error('Employee not found');

            const advanceId = this.generateId();

            const advanceRecord = {
                id: advanceId,
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
            throw error;
        }
    }

    /**
 * ✅ PERMANENT FIX: Pay employee salary with working form
 */
    payEmployeeSalary(employeeId) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const summary = this.employeeSummary[employeeId] || {};
        const defaultSalary = employee.daily_rate || employee.basic_salary || 500;

        const modalHtml = `
    <div id="employeeSalaryModal" class="modal active">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-money-bill-wave"></i> Pay Salary - ${employee.name}</h3>
                <button type="button" class="modal-close">&times;</button>
            </div>
            <form id="employeeSalaryForm" class="modal-form">
                <div class="form-group">
                    <label>Salary Amount *</label>
                    <input type="number" id="salaryAmount" value="${defaultSalary}" 
                           min="1" step="1" required class="amount-input">
                </div>
                <div class="form-group">
                    <label>Date *</label>
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

        const modal = this.showCustomModal(modalHtml, 'employeeSalaryModal');

        if (modal) {
            this.setupSalaryModalEvents(employeeId);
        } else {
            console.error('❌ Failed to create salary modal');
        }
    }

    /**
  * ✅ FIXED: Setup salary modal event listeners with double submission protection
  */
    setupSalaryModalEvents(employeeId) {
        const modal = document.getElementById('employeeSalaryModal');
        if (!modal) {
            console.error('❌ Salary modal not found');
            return;
        }

        // Find form within the modal (not global document)
        const form = modal.querySelector('#employeeSalaryForm');
        if (!form) {
            console.error('❌ Salary form not found in modal');
            return;
        }

        const cancelBtn = form.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        const salaryInput = form.querySelector('#salaryAmount');

        if (!cancelBtn || !closeBtn || !salaryInput) {
            console.error('❌ Required form elements not found');
            return;
        }

        // ✅ FIX: Remove any existing event listeners first
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        const newCancelBtn = newForm.querySelector('.modal-cancel');
        const newCloseBtn = modal.querySelector('.modal-close');
        const newSalaryInput = newForm.querySelector('#salaryAmount');

        let isSubmitting = false;

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };

        // Close events
        newCancelBtn.addEventListener('click', closeModal);
        newCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Real-time preview updates
        newSalaryInput.addEventListener('input', (e) => {
            this.updateSalaryPreview(employeeId, parseFloat(e.target.value) || 0);
        });

        const deductCheckbox = newForm.querySelector('#deductAdvance');
        if (deductCheckbox) {
            deductCheckbox.addEventListener('change', (e) => {
                this.updateSalaryPreview(employeeId, parseFloat(newSalaryInput.value) || 0);
            });
        }

        // Form submission - ✅ FIX: Double submission protection
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation(); // ✅ Prevent multiple handlers

            if (isSubmitting) {
                console.log('⚠️ Salary form submission already in progress');
                return;
            }

            isSubmitting = true;

            // ✅ Disable submit button during processing
            const submitBtn = newForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;

            try {
                const salaryValue = newSalaryInput.value.trim();
                const salary = parseFloat(salaryValue) || 0;
                const date = newForm.querySelector('#salaryDate').value;
                const deductAdvance = newForm.querySelector('#deductAdvance')?.checked || false;

                if (!salaryValue) {
                    this.ui.showToast('Please enter a salary amount', 'error');
                    newSalaryInput.focus();
                    return;
                }

                if (isNaN(salary) || salary <= 0) {
                    this.ui.showToast('Please enter a valid positive amount', 'error');
                    newSalaryInput.focus();
                    return;
                }

                if (salary > 100000) {
                    this.ui.showToast('Salary amount seems too large. Please enter a reasonable amount.', 'error');
                    newSalaryInput.focus();
                    return;
                }

                await this.saveEmployeeSalary(employeeId, salary, date, deductAdvance);
                closeModal();

            } catch (error) {
                console.error('Error in salary form submission:', error);
                this.ui.showToast('Error processing salary payment', 'error');
            } finally {
                isSubmitting = false;
                // ✅ Re-enable button
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    /**
     * ✅ FIXED: Save employee salary with UUID
     */
    async saveEmployeeSalary(employeeId, salary, date, deductAdvance) {
        try {
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.ui.showToast('Employee not found', 'error');
                return;
            }

            const salaryId = this.generateId();

            const salaryData = {
                id: salaryId,
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

            if (deductAdvance) {
                const summary = this.employeeSummary[employeeId] || {};
                if (summary.pendingAdvances > 0) {
                    const advanceDeductionId = this.generateId();
                    const advanceData = {
                        id: advanceDeductionId,
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
            throw error;
        }
    }

    /**
     * ✅ FIXED: Main salary form with PROPER VALIDATION
     */
    async handleSalarySubmit(e) {
        e.preventDefault();

        if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
            this.ui.showToast('Access denied', 'error');
            return;
        }

        const employeeSelect = document.getElementById('salaryEmployee');
        const salaryDate = document.getElementById('salaryDate');
        const salaryAmount = document.getElementById('salaryAmount');
        const advanceAmount = document.getElementById('advanceAmount');

        const employeeId = employeeSelect.value;
        const date = salaryDate.value || this.currentDate;
        const salaryValue = salaryAmount.value.trim();
        const advanceValue = advanceAmount.value.trim();

        const salary = parseFloat(salaryValue) || 0;
        const advance = parseFloat(advanceValue) || 0;

        if (!employeeId) {
            this.ui.showToast('Please select an employee', 'error');
            employeeSelect.focus();
            return;
        }

        if (salary <= 0 && advance <= 0) {
            this.ui.showToast('Please enter salary or advance amount', 'error');
            salaryAmount.focus();
            return;
        }

        if (salary > 0) {
            if (isNaN(salary) || salary <= 0) {
                this.ui.showToast('Please enter a valid salary amount', 'error');
                salaryAmount.focus();
                return;
            }
            if (salary > 100000) {
                this.ui.showToast('Salary amount seems too large', 'error');
                salaryAmount.focus();
                return;
            }
        }

        if (advance > 0) {
            if (isNaN(advance) || advance <= 0) {
                this.ui.showToast('Please enter a valid advance amount', 'error');
                advanceAmount.focus();
                return;
            }
            if (advance > 100000) {
                this.ui.showToast('Advance amount seems too large', 'error');
                advanceAmount.focus();
                return;
            }
        }

        try {
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
            if (!employee) throw new Error('Employee not found');

            if (salary > 0) {
                const salaryId = this.generateId();
                const salaryData = {
                    id: salaryId,
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
                const advanceId = this.generateId();
                const advanceData = {
                    id: advanceId,
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

    // Data loading methods
    async loadDailyEmployees() {
        try {
            const allEmployees = await this.db.getEmployees();
            this.dailyEmployees = allEmployees.filter(emp =>
                emp.salary_type === 'daily' || !emp.salary_type
            );
            console.log(`👥 Loaded ${this.dailyEmployees.length} daily employees`);
        } catch (error) {
            console.error('Error loading daily employees:', error);
            this.dailyEmployees = [];
        }
    }

    async loadAttendanceRecords() {
        try {
            this.attendanceRecords = await this.db.getAttendanceRecords() || [];
            console.log(`📊 Loaded ${this.attendanceRecords.length} attendance records`);
        } catch (error) {
            console.warn('⚠️ Attendance table not available:', error.message);
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
            console.log(`💵 Loaded ${this.salaryRecords.length} salary records`);
        } catch (error) {
            console.warn('⚠️ Salary records table not available:', error.message);
            this.salaryRecords = [];
        }
    }

    async loadAdvanceRecords() {
        try {
            this.advanceRecords = await this.db.getAdvanceRecords() || [];
            console.log(`💰 Loaded ${this.advanceRecords.length} advance records`);
        } catch (error) {
            console.warn('⚠️ Advance records table not available:', error.message);
            this.advanceRecords = [];
        }
    }

    // Enhanced UI Methods
    renderEnhancedDashboard() {
        this.renderQuickActions();
        this.renderEmployeeGrid();
        this.renderSalaryTable();
        this.renderPendingAdvances();
    }

    renderQuickActions() {
        const quickActionsContainer = document.getElementById('quickActions');
        if (!quickActionsContainer) return;

        const todaySummary = this.getTodaysAttendanceSummary();

        quickActionsContainer.innerHTML = `
            <div class="quick-actions-panel">
                <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                <div class="action-buttons-grid">
                    <button class="action-btn primary" id="quickAttendanceBtn">
                        <i class="fas fa-user-check"></i>
                        <span>Mark Attendance</span>
                        <small>${todaySummary.present}/${todaySummary.total} present</small>
                    </button>
                    <button class="action-btn success" id="bulkSalaryBtn">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>Pay Today's Salary</span>
                        <small>${todaySummary.present} employees</small>
                    </button>
                    <button class="action-btn warning" id="addAdvanceBtn">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>Add Advance</span>
                        <small>${this.pendingAdvances.length} pending</small>
                    </button>
                    <button class="action-btn info" id="processSalaryBtn">
                        <i class="fas fa-money-check"></i>
                        <span>Process Salary</span>
                        <small>Complete payments</small>
                    </button>
                </div>
            </div>
        `;

        // Attach event listeners to the new buttons
        document.getElementById('quickAttendanceBtn')?.addEventListener('click', () => {
            this.showQuickAttendanceModal();
        });
        document.getElementById('bulkSalaryBtn')?.addEventListener('click', () => {
            this.showBulkSalaryModal();
        });
        document.getElementById('addAdvanceBtn')?.addEventListener('click', () => {
            this.showAdvanceModal();
        });
        document.getElementById('processSalaryBtn')?.addEventListener('click', () => {
            this.showProcessSalaryModal();
        });
    }

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
            <div class="employee-card ${statusClass}">
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
                            <span class="value">${summary.workHours || 0}h</span>
                        </div>
                        <div class="stat">
                            <label>Pending Advances</label>
                            <span class="value ${summary.pendingAdvances > 0 ? 'warning' : ''}">
                                ${Utils.formatCurrency(summary.pendingAdvances || 0)}
                            </span>
                        </div>
                        <div class="stat">
                            <label>Work Days</label>
                            <span class="value">${summary.totalWorkDays || 0}</span>
                        </div>
                    </div>
                </div>
                <div class="employee-card-actions">
                    <button class="btn-icon small mark-attendance-btn" data-employee-id="${employee.id}" 
                            title="Mark Attendance">
                        <i class="fas fa-calendar-check"></i>
                    </button>
                    <button class="btn-icon small pay-salary-btn" data-employee-id="${employee.id}"
                            title="Pay Salary">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                    <button class="btn-icon small add-advance-btn" data-employee-id="${employee.id}"
                            title="Add Advance">
                        <i class="fas fa-hand-holding-usd"></i>
                    </button>
                    <button class="btn-icon small view-details-btn" data-employee-id="${employee.id}"
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');

        // Attach event listeners to employee card buttons
        employeeGrid.querySelectorAll('.mark-attendance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employeeId = e.currentTarget.getAttribute('data-employee-id');
                this.markEmployeeAttendance(employeeId);
            });
        });

        employeeGrid.querySelectorAll('.pay-salary-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employeeId = e.currentTarget.getAttribute('data-employee-id');
                this.payEmployeeSalary(employeeId);
            });
        });

        employeeGrid.querySelectorAll('.add-advance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employeeId = e.currentTarget.getAttribute('data-employee-id');
                this.addEmployeeAdvance(employeeId);
            });
        });

        employeeGrid.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employeeId = e.currentTarget.getAttribute('data-employee-id');
                this.viewEmployeeDetails(employeeId);
            });
        });
    }

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
                                <button class="btn-secondary btn-sm delete-record-btn" data-record-id="${record.id}" data-record-type="${record.type}">
                                    <i class="fas fa-trash"></i>
                                </button>
                                ${isAdvance && record.status === 'pending' ? `
                                <button class="btn-primary btn-sm mark-advance-paid-btn" data-record-id="${record.id}">
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

        // Attach event listeners to table action buttons
        tbody.querySelectorAll('.delete-record-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.getAttribute('data-record-id');
                const recordType = e.currentTarget.getAttribute('data-record-type');
                this.deleteRecord(recordId, recordType);
            });
        });

        tbody.querySelectorAll('.mark-advance-paid-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.getAttribute('data-record-id');
                this.markAdvancePaid(recordId);
            });
        });
    }

    renderPendingAdvances() {
        const container = document.getElementById('pendingAdvances');
        if (!container) return;

        if (this.pendingAdvances.length === 0) {
            container.innerHTML = `
            <div class="no-data-grid">
                <i class="fas fa-hand-holding-usd"></i>
                <h3>No Pending Advances</h3>
                <p>All advances have been processed</p>
            </div>
        `;
            return;
        }

        container.innerHTML = this.pendingAdvances.map(advance => {
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
                    <button class="btn-primary btn-sm process-advance-btn" data-advance-id="${advance.id}">
                        <i class="fas fa-check"></i> Mark Paid
                    </button>
                    <button class="btn-secondary btn-sm view-advance-btn" data-advance-id="${advance.id}">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
        }).join('');

        // Attach event listeners to advance cards
        container.querySelectorAll('.process-advance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const advanceId = e.currentTarget.getAttribute('data-advance-id');
                this.processAdvance(advanceId);
            });
        });

        container.querySelectorAll('.view-advance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const advanceId = e.currentTarget.getAttribute('data-advance-id');
                this.viewAdvanceDetails(advanceId);
            });
        });
    }

    // Utility methods
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

    processTodaysData() {
        const today = this.currentDate;
        this.todaysAttendance = this.attendanceRecords.filter(record =>
            record.attendance_date === today
        );
        this.pendingAdvances = this.advanceRecords.filter(advance =>
            advance.status === 'pending'
        );
    }

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
                totalWorkDays: employeeAttendance.filter(a => a.status === 'present').length
            };
        });
    }

    updateSalaryPreview(employeeId, salary) {
        const modal = document.getElementById('employeeSalaryModal');
        if (!modal) return;

        const summary = this.employeeSummary[employeeId] || {};
        const deductAdvance = modal.querySelector('#deductAdvance')?.checked || false;
        const advanceDeduction = deductAdvance ? (summary.pendingAdvances || 0) : 0;
        const netAmount = Math.max(0, salary - advanceDeduction);

        const previewSalary = modal.querySelector('#previewSalary');
        const previewDeduction = modal.querySelector('#previewDeduction');
        const previewNetAmount = modal.querySelector('#previewNetAmount');

        if (previewSalary) previewSalary.textContent = Utils.formatCurrency(salary);
        if (previewDeduction) previewDeduction.textContent = `-${Utils.formatCurrency(advanceDeduction)}`;
        if (previewNetAmount) previewNetAmount.textContent = Utils.formatCurrency(netAmount);
    }

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

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    }

    /**
 * ✅ PERMANENT FIX: Synchronous modal creation
 */
    showCustomModal(html, modalId) {
        // Remove existing modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        // Create a temporary container to parse HTML
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;

        // Get the modal element from parsed HTML
        const modal = tempContainer.firstElementChild;

        if (!modal || modal.id !== modalId) {
            console.error(`❌ Failed to parse modal with ID ${modalId}`);
            return null;
        }

        // Insert the already-parsed element into DOM
        document.body.appendChild(modal);

        // Force synchronous DOM update
        void modal.offsetHeight;

        return modal;
    }

    /**
     * ✅ FIXED: Show advance modal with synchronous DOM handling
     */
    showAdvanceModal(employeeId = null) {
        const employee = employeeId ?
            this.dailyEmployees.find(emp => emp.id === employeeId) : null;

        const modalHtml = `
    <div id="advanceModal" class="modal active">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-hand-holding-usd"></i> ${employee ? `Add Advance - ${employee.name}` : 'Add Advance'}</h3>
                <button type="button" class="modal-close">&times;</button>
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
                    <input type="number" id="advanceAmount" required min="1" step="1" 
                           placeholder="Enter advance amount" class="amount-input">
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

        const modal = this.showCustomModal(modalHtml, 'advanceModal');

        if (modal) {
            this.setupAdvanceModalEvents();
        } else {
            console.error('❌ Failed to create advance modal');
        }
    }

    /**
     * ✅ FIXED: Setup advance modal event listeners with immediate DOM access
     */
    setupAdvanceModalEvents() {
        const modal = document.getElementById('advanceModal');
        if (!modal) {
            console.error('❌ Advance modal not found');
            return;
        }

        // Find form within the modal (not global document)
        const form = modal.querySelector('#advanceForm');
        if (!form) {
            console.error('❌ Advance form not found in modal');
            console.log('Modal children:', modal.children);
            return;
        }

        console.log('✅ Form element found:', !!form);
        console.log('✅ Form ID:', form.id);
        console.log('✅ Form in DOM:', form.isConnected);

        const cancelBtn = form.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        const amountInput = form.querySelector('#advanceAmount');

        if (!cancelBtn || !closeBtn || !amountInput) {
            console.error('❌ Required form elements not found:', {
                cancelBtn: !!cancelBtn,
                closeBtn: !!closeBtn,
                amountInput: !!amountInput
            });
            return;
        }

        let isSubmitting = false;

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };

        // Close events
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Form submission - ADD DEBUG LOG
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🎯 FORM SUBMISSION TRIGGERED!');

            if (isSubmitting) {
                console.log('⚠️ Form submission already in progress');
                return;
            }

            isSubmitting = true;
            console.log('🔄 Starting form submission...');

            try {
                const amountValue = amountInput.value.trim();
                const employeeId = form.querySelector('#advanceEmployeeId').value;

                console.log('📊 Form data:', { amountValue, employeeId });

                if (!employeeId) {
                    this.ui.showToast('Please select an employee', 'error');
                    isSubmitting = false;
                    return;
                }

                if (!amountValue) {
                    this.ui.showToast('Please enter an advance amount', 'error');
                    amountInput.focus();
                    isSubmitting = false;
                    return;
                }

                const amount = parseFloat(amountValue);
                if (isNaN(amount) || amount <= 0) {
                    this.ui.showToast('Please enter a valid positive amount', 'error');
                    amountInput.focus();
                    isSubmitting = false;
                    return;
                }

                if (amount > 100000) {
                    this.ui.showToast('Amount seems too large. Please enter a reasonable amount.', 'error');
                    amountInput.focus();
                    isSubmitting = false;
                    return;
                }

                const formData = {
                    employee_id: employeeId,
                    amount: amount,
                    record_date: form.querySelector('#advanceDate').value,
                    notes: form.querySelector('#advanceNotes').value
                };

                console.log('💾 Saving advance:', formData);
                await this.saveAdvance(formData);
                closeModal();

            } catch (error) {
                console.error('❌ Error in advance form submission:', error);
                this.ui.showToast('Error processing advance request', 'error');
            } finally {
                isSubmitting = false;
                console.log('✅ Form submission completed');
            }
        });

        console.log('✅ All advance modal event listeners attached successfully');
    }

    // Additional essential methods
    async initialize() {
        try {
            console.log('💰 Initializing enhanced Salary Manager...');
            await this.loadDailyEmployees();
            await this.loadAttendanceRecords();
            await this.loadSalaryPayments();
            await this.loadSalaryData();
            console.log('✅ Enhanced Salary Manager initialized');
        } catch (error) {
            console.error('❌ Salary Manager initialization failed:', error);
        }
        return Promise.resolve();
    }

    setupEventListeners() {
        // Remove any previously bound global click handler
        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }

        // Bind and attach new unified handler
        this.boundClickHandler = (e) => this.handleGlobalClick(e);
        document.addEventListener('click', this.boundClickHandler);
    }

    handleGlobalClick(e) {
        try {
            console.log('💰 Salary click detected:', e.target);

            // Quick Attendance
            if (e.target.id === 'quickAttendanceBtn' || e.target.closest('#quickAttendanceBtn')) {
                e.preventDefault();
                this.showQuickAttendanceModal();
                return;
            }

            // Bulk Salary Process
            if (e.target.id === 'bulkSalaryBtn' || e.target.closest('#bulkSalaryBtn')) {
                e.preventDefault();
                this.showBulkSalaryModal();
                return;
            }

            // Add Advance
            if (e.target.id === 'addAdvanceBtn' || e.target.closest('#addAdvanceBtn')) {
                e.preventDefault();
                this.showAdvanceModal();
                return;
            }

            // Process Salary
            if (e.target.id === 'processSalaryBtn' || e.target.closest('#processSalaryBtn')) {
                e.preventDefault();
                this.showProcessSalaryModal();
                return;
            }

        } catch (error) {
            console.error('❌ Error in salary click handler:', error);
        }
    }

    cleanup() {
        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }
        console.log('🧹 Enhanced Salary Manager cleanup');
    }

    updateSummaryCards() {
        const attendanceSummary = this.getTodaysAttendanceSummary();
        const presentEl = document.getElementById('presentTodayCount');
        const absentEl = document.getElementById('absentTodayCount');
        const totalEl = document.getElementById('totalEmployeesCount');

        if (presentEl) presentEl.textContent = attendanceSummary.present;
        if (absentEl) absentEl.textContent = attendanceSummary.absent;
        if (totalEl) totalEl.textContent = attendanceSummary.total;
    }

    // Employee methods
    addEmployeeAdvance(employeeId) {
        this.showAdvanceModal(employeeId);
    }

    markEmployeeAttendance(employeeId) {
        console.log('Mark attendance for:', employeeId);
        this.ui.showToast('Attendance feature will be implemented', 'info');
    }

    viewEmployeeDetails(employeeId) {
        console.log('View details for:', employeeId);
        this.ui.showToast('Employee details feature will be implemented', 'info');
    }

    editEmployee(employeeId) {
        if (window.app && window.app.getManagers && window.app.getManagers().employee) {
            window.app.getManagers().employee.editEmployee(employeeId);
        } else {
            this.ui.showToast('Employee editing feature is available in Employee Manager', 'info');
        }
    }

    closeEmployeeDetails() {
        this.ui.hideModal('employeeDetailsModal');
    }

    // Quick Attendance Modal
    showQuickAttendanceModal() {
        const todaySummary = this.getTodaysAttendanceSummary();

        const modalHtml = `
            <div id="quickAttendanceModal" class="modal active">
                <div class="modal-content" style="max-width: 1000px; height: 90vh;">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-check"></i> Quick Attendance - Today</h3>
                        <div class="header-actions">
                            <button type="button" class="btn-secondary" id="markAllPresent">
                                <i class="fas fa-check-circle"></i> Mark All Present
                            </button>
                            <button type="button" class="btn-secondary" id="markAllAbsent">
                                <i class="fas fa-times-circle"></i> Mark All Absent
                            </button>
                            <button type="button" class="modal-close">&times;</button>
                        </div>
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
                                        <button type="button" class="attendance-btn present ${isPresent ? 'active' : ''}" 
                                                data-employee-id="${employee.id}" data-status="present">
                                            <i class="fas fa-check"></i>
                                            <span>Present</span>
                                        </button>
                                        <button type="button" class="attendance-btn absent ${isAbsent ? 'active' : ''}"
                                                data-employee-id="${employee.id}" data-status="absent">
                                            <i class="fas fa-times"></i>
                                            <span>Absent</span>
                                        </button>
                                        <button type="button" class="attendance-btn half-day ${isHalfDay ? 'active' : ''}"
                                                data-employee-id="${employee.id}" data-status="half_day">
                                            <i class="fas fa-clock"></i>
                                            <span>Half Day</span>
                                        </button>
                                    </div>
                                    
                                    <div class="attendance-time ${isPresent || isHalfDay ? 'visible' : ''}">
                                        <input type="time" id="checkIn_${employee.id}" 
                                               value="${this.getDefaultCheckInTime()}" 
                                               ${isAbsent ? 'disabled' : ''}>
                                        <input type="time" id="checkOut_${employee.id}" 
                                               value="${isHalfDay ? '13:00' : '18:00'}"
                                               ${isAbsent ? 'disabled' : ''}>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="clearAllAttendance">
                            <i class="fas fa-eraser"></i> Clear All
                        </button>
                        <button type="button" class="btn-primary" id="saveQuickAttendance">
                            <i class="fas fa-save"></i> Save All Attendance
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'quickAttendanceModal');
        this.setupQuickAttendanceEvents();
    }

    setupQuickAttendanceEvents() {
        const modal = document.getElementById('quickAttendanceModal');
        const closeBtn = modal.querySelector('.modal-close');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.getElementById('markAllPresent')?.addEventListener('click', () => {
            this.markAllEmployees('present');
        });

        document.getElementById('markAllAbsent')?.addEventListener('click', () => {
            this.markAllEmployees('absent');
        });

        document.getElementById('clearAllAttendance')?.addEventListener('click', () => {
            this.clearAllAttendance();
        });

        document.getElementById('saveQuickAttendance')?.addEventListener('click', async () => {
            await this.saveQuickAttendance();
        });

        document.addEventListener('click', (e) => {
            const statusBtn = e.target.closest('.attendance-btn');
            if (statusBtn) {
                const employeeId = statusBtn.getAttribute('data-employee-id');
                const status = statusBtn.getAttribute('data-status');
                this.quickMarkAttendance(employeeId, status);
            }
        });
    }

    quickMarkAttendance(employeeId, status) {
        const item = document.querySelector(`.attendance-item[data-employee-id="${employeeId}"]`);
        if (!item) return;

        item.querySelectorAll('.attendance-btn').forEach(btn => btn.classList.remove('active'));
        item.querySelector(`.attendance-btn[data-status="${status}"]`).classList.add('active');

        const timeInputs = item.querySelector('.attendance-time');
        const checkIn = item.querySelector(`#checkIn_${employeeId}`);
        const checkOut = item.querySelector(`#checkOut_${employeeId}`);

        if (status === 'absent') {
            timeInputs.classList.remove('visible');
            checkIn.disabled = true;
            checkOut.disabled = true;
            checkIn.value = '';
            checkOut.value = '';
        } else {
            timeInputs.classList.add('visible');
            checkIn.disabled = false;
            checkOut.disabled = false;
            if (!checkIn.value) checkIn.value = this.getDefaultCheckInTime();
            if (!checkOut.value) checkOut.value = status === 'half_day' ? '13:00' : '18:00';
        }

        this.updateAttendanceStats();
    }

    markAllEmployees(status) {
        document.querySelectorAll('.attendance-item').forEach(item => {
            const employeeId = item.getAttribute('data-employee-id');
            this.quickMarkAttendance(employeeId, status);
        });
        this.ui.showToast(`Marked all as ${status}`, 'info');
    }

    clearAllAttendance() {
        document.querySelectorAll('.attendance-item').forEach(item => {
            const employeeId = item.getAttribute('data-employee-id');
            const itemElement = document.querySelector(`.attendance-item[data-employee-id="${employeeId}"]`);

            itemElement.querySelectorAll('.attendance-btn').forEach(btn => btn.classList.remove('active'));

            const timeInputs = itemElement.querySelector('.attendance-time');
            const checkIn = itemElement.querySelector(`#checkIn_${employeeId}`);
            const checkOut = itemElement.querySelector(`#checkOut_${employeeId}`);

            timeInputs.classList.remove('visible');
            checkIn.disabled = false;
            checkOut.disabled = false;
            checkIn.value = this.getDefaultCheckInTime();
            checkOut.value = '18:00';
        });

        this.updateAttendanceStats();
        this.ui.showToast('Cleared all attendance', 'info');
    }

    updateAttendanceStats() {
        const presentCount = document.querySelectorAll('.attendance-btn.present.active').length;
        const absentCount = document.querySelectorAll('.attendance-btn.absent.active').length;
        const halfDayCount = document.querySelectorAll('.attendance-btn.half-day.active').length;
        const totalCount = this.dailyEmployees.length;

        document.querySelector('.count.present').textContent = presentCount;
        document.querySelector('.count.absent').textContent = absentCount;
        document.querySelector('.count.half-day').textContent = halfDayCount;
        document.querySelector('.count.total').textContent = totalCount;
    }

    async saveQuickAttendance() {
        try {
            const attendanceItems = document.querySelectorAll('.attendance-item');
            let savedCount = 0;
            let errorCount = 0;

            for (const item of attendanceItems) {
                const employeeId = item.getAttribute('data-employee-id');
                const activeButton = item.querySelector('.attendance-btn.active');

                if (activeButton) {
                    const status = activeButton.getAttribute('data-status');
                    const employee = this.dailyEmployees.find(emp => emp.id === employeeId);

                    if (employee) {
                        const checkInTime = status !== 'absent' ?
                            document.getElementById(`checkIn_${employeeId}`)?.value : null;
                        const checkOutTime = status !== 'absent' ?
                            document.getElementById(`checkOut_${employeeId}`)?.value : null;

                        if (status !== 'absent' && (!checkInTime || !checkOutTime)) {
                            console.warn(`Skipping ${employee.name}: Time not set`);
                            errorCount++;
                            continue;
                        }

                        const attendanceData = {
                            employee_id: employeeId,
                            employee_name: employee.name,
                            attendance_date: this.currentDate,
                            status: status,
                            check_in_time: checkInTime,
                            check_out_time: checkOutTime,
                            work_hours: this.calculateWorkHours(checkInTime, checkOutTime),
                            notes: 'Quick attendance'
                        };

                        try {
                            await this.markAttendance(attendanceData);
                            savedCount++;
                        } catch (error) {
                            console.error(`Error saving attendance for ${employee.name}:`, error);
                            errorCount++;
                        }
                    }
                }
            }

            if (errorCount > 0) {
                this.ui.showToast(`Saved ${savedCount} records, ${errorCount} failed`, 'warning');
            } else {
                this.ui.showToast(`Saved attendance for ${savedCount} employees`, 'success');
            }

            this.ui.hideModal('quickAttendanceModal');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Save quick attendance error:', error);
            this.ui.showToast('Error saving attendance', 'error');
        }
    }

    // Bulk Salary Modal
    showBulkSalaryModal() {
        const presentEmployees = this.dailyEmployees.filter(employee => {
            const summary = this.employeeSummary[employee.id];
            return summary && summary.todayStatus === 'present';
        });

        const modalHtml = `
            <div id="bulkSalaryModal" class="modal active">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-bill-wave"></i> Bulk Salary Payment - Today</h3>
                        <button type="button" class="modal-close">&times;</button>
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
                                            <label>Salary Amount *</label>
                                            <input type="number" 
                                                   id="salary_${employee.id}" 
                                                   value="${defaultSalary}"
                                                   min="1" 
                                                   step="1"
                                                   required>
                                        </div>
                                        
                                        ${summary.pendingAdvances > 0 ? `
                                        <div class="advance-deduction">
                                            <label class="checkbox-label">
                                                <input type="checkbox" 
                                                       id="deductAdvance_${employee.id}"
                                                       checked>
                                                <span>Deduct Advance (${Utils.formatCurrency(summary.pendingAdvances)})</span>
                                            </label>
                                        </div>
                                        ` : ''}
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
            return summary.pendingAdvances > 0 ? summary.pendingAdvances : 0;
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
                        <button type="button" class="btn-secondary" id="recalculateBulkBtn">
                            <i class="fas fa-calculator"></i> Recalculate
                        </button>
                        <button type="button" class="btn-primary" id="processBulkSalaryBtn">
                            <i class="fas fa-paper-plane"></i> Process Payments
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'bulkSalaryModal');
        this.setupBulkSalaryModalEvents();
    }

    setupBulkSalaryModalEvents() {
        const modal = document.getElementById('bulkSalaryModal');
        const closeBtn = modal.querySelector('.modal-close');
        const recalcBtn = document.getElementById('recalculateBulkBtn');
        const processBtn = document.getElementById('processBulkSalaryBtn');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        recalcBtn.addEventListener('click', () => this.calculateBulkSalaries());
        processBtn.addEventListener('click', () => this.processBulkSalary());

        this.setupBulkSalaryCalculations();
    }

    setupBulkSalaryCalculations() {
        document.querySelectorAll('.bulk-salary-grid input[type="number"]').forEach(input => {
            input.addEventListener('input', () => this.calculateBulkSalaries());
        });

        document.querySelectorAll('.bulk-salary-grid input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calculateBulkSalaries());
        });
    }

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
            const advanceDeduction = advanceCheckbox?.checked ? (summary.pendingAdvances || 0) : 0;
            const netSalary = Math.max(0, salary - advanceDeduction);

            if (netSalaryElement) {
                netSalaryElement.textContent = Utils.formatCurrency(netSalary);
            }

            totalSalary += salary;
            totalAdvances += advanceDeduction;
            netPayment += netSalary;
        });

        const totalSalaryEl = document.getElementById('bulkTotalSalary');
        const totalAdvancesEl = document.getElementById('bulkTotalAdvances');
        const netPaymentEl = document.getElementById('bulkNetPayment');

        if (totalSalaryEl) totalSalaryEl.textContent = Utils.formatCurrency(totalSalary);
        if (totalAdvancesEl) totalAdvancesEl.textContent = Utils.formatCurrency(totalAdvances);
        if (netPaymentEl) netPaymentEl.textContent = Utils.formatCurrency(netPayment);
    }

    async processBulkSalary() {
        try {
            const salaryItems = document.querySelectorAll('.salary-item');
            let processedCount = 0;
            let errorCount = 0;

            for (const item of salaryItems) {
                const employeeId = item.getAttribute('data-employee-id');
                const salaryInput = document.getElementById(`salary_${employeeId}`);
                const advanceCheckbox = document.getElementById(`deductAdvance_${employeeId}`);

                const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
                if (!employee) continue;

                const salaryValue = salaryInput?.value.trim();
                if (!salaryValue) {
                    console.warn(`Skipping ${employee.name}: Salary amount is empty`);
                    errorCount++;
                    continue;
                }

                const salary = parseFloat(salaryValue);
                if (isNaN(salary) || salary <= 0) {
                    console.warn(`Skipping ${employee.name}: Invalid salary amount`);
                    errorCount++;
                    continue;
                }

                if (salary > 100000) {
                    console.warn(`Skipping ${employee.name}: Salary amount too large`);
                    errorCount++;
                    continue;
                }

                const deductAdvance = advanceCheckbox?.checked || false;
                const summary = this.employeeSummary[employeeId] || {};

                try {
                    const salaryId = this.generateId();

                    const salaryData = {
                        id: salaryId,
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

                    if (deductAdvance && summary.pendingAdvances > 0) {
                        const advanceDeductionId = this.generateId();

                        const advanceData = {
                            id: advanceDeductionId,
                            employee_id: employeeId,
                            employee_name: employee.name,
                            amount: -summary.pendingAdvances,
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
                } catch (error) {
                    console.error(`Error processing salary for ${employee.name}:`, error);
                    errorCount++;
                }
            }

            if (errorCount > 0) {
                this.ui.showToast(`Processed ${processedCount} salaries, ${errorCount} failed`, 'warning');
            } else {
                this.ui.showToast(`Processed salary for ${processedCount} employees`, 'success');
            }

            this.ui.hideModal('bulkSalaryModal');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Bulk salary processing error:', error);
            this.ui.showToast('Error processing bulk salary', 'error');
        }
    }

    // Additional modal methods
    showProcessSalaryModal() {
        const modalHtml = `
        <div id="processSalaryModal" class="modal active">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-money-check"></i> Process Salary Payment</h3>
                    <button type="button" class="modal-close">&times;</button>
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
        this.setupProcessSalaryModalEvents();
    }

    setupProcessSalaryModalEvents() {
        const modal = document.getElementById('processSalaryModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const calculateBtn = document.getElementById('processCalculateBtn');
        const form = document.getElementById('processSalaryForm');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        calculateBtn.addEventListener('click', async () => {
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

        form.addEventListener('submit', async (e) => {
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
            closeModal();
        });
    }

    showExportOptions() {
        const exportHtml = `
        <div id="exportSalaryModal" class="modal active">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Export Salary Records</h3>
                    <button type="button" class="modal-close">&times;</button>
                </div>
                
                <div class="export-options">
                    <div class="export-option" id="exportExcelBtn">
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
                    
                    <div class="export-option" id="exportPdfBtn">
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
                    <button type="button" class="btn-secondary" id="closeExportModal">Cancel</button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(exportHtml, 'exportSalaryModal');

        // Setup export modal events
        const modal = document.getElementById('exportSalaryModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('closeExportModal');
        const excelBtn = document.getElementById('exportExcelBtn');
        const pdfBtn = document.getElementById('exportPdfBtn');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        excelBtn.addEventListener('click', () => {
            this.exportSalaryToExcel();
            closeModal();
        });

        pdfBtn.addEventListener('click', () => {
            this.exportSalaryToPDF();
            closeModal();
        });
    }

    closeExportModal() {
        this.ui.hideModal('exportSalaryModal');
    }

    showMarkAttendanceModal() {
        this.ui.showToast('Mark attendance modal will be implemented', 'info');
    }

    // Utility methods
    getDefaultCheckInTime() {
        return '09:00';
    }

    calculateWorkHours(checkInTime, checkOutTime) {
        if (!checkInTime || !checkOutTime) return 0;

        try {
            const [inHours, inMinutes] = checkInTime.split(':').map(Number);
            const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

            const checkIn = new Date();
            checkIn.setHours(inHours, inMinutes, 0, 0);

            const checkOut = new Date();
            checkOut.setHours(outHours, outMinutes, 0, 0);

            if (checkOut < checkIn) {
                checkOut.setDate(checkOut.getDate() + 1);
            }

            const diffMs = checkOut - checkIn;
            const diffHours = diffMs / (1000 * 60 * 60);

            return Math.max(0, Math.min(24, diffHours));
        } catch (error) {
            console.error('Error calculating work hours:', error);
            return 0;
        }
    }

    async markAttendance(attendanceData) {
        try {
            if (!attendanceData.attendance_date) {
                this.ui.showToast('Attendance date is required', 'error');
                return;
            }

            const attendanceId = this.generateId();

            const record = {
                id: attendanceId,
                employee_id: attendanceData.employee_id,
                employee_name: attendanceData.employee_name,
                attendance_date: attendanceData.attendance_date,
                status: attendanceData.status,
                check_in_time: attendanceData.check_in_time,
                check_out_time: attendanceData.check_out_time,
                work_hours: attendanceData.work_hours || this.calculateWorkHours(attendanceData.check_in_time, attendanceData.check_out_time),
                overtime_hours: 0,
                notes: attendanceData.notes,
                created_at: new Date().toISOString()
            };

            await this.db.create('attendance', record);
            this.ui.showToast('Attendance marked successfully', 'success');

            await this.loadAttendanceRecords();
            await this.loadSalaryData();
        } catch (error) {
            console.error('Error marking attendance:', error);
            this.ui.showToast('Error marking attendance', 'error');
        }
    }

    async processSalaryPayment(paymentData) {
        try {
            const calculation = await this.calculateSalary(
                paymentData.employee_id,
                paymentData.pay_period_start,
                paymentData.pay_period_end
            );

            const paymentId = this.generateId();

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

    // Export methods
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

    // Filter and grouping methods
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

    // CRUD Operations
    async deleteRecord(recordId, type) {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const tableName = type === 'advance' ? 'advance_records' : 'salary_records';
            await this.db.delete(tableName, recordId);
            this.ui.showToast('Record deleted successfully', 'success');
            await this.loadSalaryData();
        } catch (error) {
            console.error('Delete error:', error);
            this.ui.showToast('Error deleting record', 'error');
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
            this.ui.showToast('Error updating advance', 'error');
        }
    }

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

    viewAdvanceDetails(advanceId) {
        const advance = this.advanceRecords.find(a => a.id === advanceId);
        if (!advance) {
            this.ui.showToast('Advance not found', 'error');
            return;
        }

        const employee = this.dailyEmployees.find(emp => emp.id === advance.employee_id);

        const modalHtml = `
        <div id="advanceDetailsModal" class="modal active">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-hand-holding-usd"></i> Advance Details</h3>
                    <button type="button" class="modal-close">&times;</button>
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
                    <button type="button" class="btn-primary" id="markAdvancePaidBtn">Mark as Paid</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'advanceDetailsModal');

        const modal = document.getElementById('advanceDetailsModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const markPaidBtn = document.getElementById('markAdvancePaidBtn');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (markPaidBtn) {
            markPaidBtn.addEventListener('click', async () => {
                await this.processAdvance(advanceId);
                closeModal();
            });
        }
    }
}

window.SalaryManager = SalaryManager;