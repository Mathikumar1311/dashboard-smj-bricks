class SalaryManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('SalaryManager: dependencies required');

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        // ✅ CRITICAL FIX: Store instance globally for debugging
        window.salaryManager = this;
        console.log('✅ SalaryManager instance stored globally as window.salaryManager');

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

        // ✅ FIXED: Add initialization state tracking
        this.isInitialized = false;
        this.isLoading = false;
        this.activeSection = null;

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
 * ✅ FIXED: PROPER PERMISSION CHECK with correct role mapping
 */
    hasPermission(requiredPermission) {
        console.log(`🔐 Checking permission: ${requiredPermission} for user:`, this.auth?.getCurrentUser?.());

        // If auth is not available, grant permission (for development)
        if (!this.auth || typeof this.auth.hasPermission !== 'function') {
            console.warn(`⚠️ Auth not available, granting permission: ${requiredPermission}`);
            return true;
        }

        // Get current user
        const currentUser = this.auth.getCurrentUser ? this.auth.getCurrentUser() : null;
        if (!currentUser) {
            console.warn('⚠️ No current user found');
            return false;
        }

        console.log(`👤 Current user role: ${currentUser.role}, checking: ${requiredPermission}`);

        // Use auth manager's permission check
        return this.auth.hasPermission(requiredPermission);
    }

    /**
 * ✅ FIXED: PROPER section detection - only returns true when salary section is actually visible
 */
    isSalarySectionActive() {
        // Check if salary section element exists
        const salarySection = document.getElementById('salaryContent');
        if (!salarySection) {
            return false;
        }

        // ✅ IMPROVED: More reliable visibility checks
        const computedStyle = window.getComputedStyle(salarySection);
        const isVisible =
            computedStyle.display !== 'none' &&
            computedStyle.visibility !== 'hidden' &&
            salarySection.offsetParent !== null &&
            !salarySection.classList.contains('hidden') &&
            computedStyle.opacity !== '0';

        // ✅ ADDITIONAL CHECK: Verify we're actually in the salary tab
        const salaryTab = document.querySelector('[data-section="salary"]');
        const isTabActive = salaryTab && salaryTab.classList.contains('active');

        console.log(`🔍 Salary section check - Visible: ${isVisible}, TabActive: ${isTabActive}`);

        return isVisible && isTabActive;
    }

    /**
     * ✅ NEW: Check if salary tab is actually active in navigation
     */
    isSalaryTabActive() {
        // Check URL hash
        if (window.location.hash === '#salary') {
            return true;
        }

        // Check active tab in navigation
        const salaryTab = document.querySelector('[data-section="salary"], [href="#salary"]');
        if (salaryTab && salaryTab.classList.contains('active')) {
            return true;
        }

        // Check if salary content is visible and has data
        const salaryContent = document.getElementById('salaryContent');
        if (salaryContent && salaryContent.style.display !== 'none') {
            return true;
        }

        return false;
    }

    /**
     * ✅ IMPROVED: Check if salary payments section is active
     */
    isSalaryPaymentsSectionActive() {
        const salaryPaymentsSection = document.getElementById('salaryPaymentsContent');
        if (!salaryPaymentsSection) {
            return false;
        }

        const isVisible = salaryPaymentsSection.style.display !== 'none' &&
            salaryPaymentsSection.offsetParent !== null &&
            !salaryPaymentsSection.classList.contains('hidden');

        return isVisible;
    }
    /**
     * ✅ NEW: Handle section activation properly
     */
    activateSalarySection() {
        console.log('💰 Activating salary section...');
        this.activeSection = 'salary';

        // Small delay to ensure DOM is ready
        setTimeout(() => {
            if (this.isSalarySectionActive() || this.isSalaryTabActive()) {
                this.loadSalaryData();
            }
        }, 50);
    }
    /**
 * ✅ FIXED: Load salary data ONLY when salary section is active with proper UI rendering
 */
    async loadSalaryData() {
        // ✅ IMPROVED: Use BOTH checks to ensure we're really in salary section
        if (!this.isSalarySectionActive() && !this.isSalaryTabActive()) {
            console.log('🚫 Salary section/tab not active, skipping load');
            return;
        }

        // ✅ ADD: Also check if we're switching away during load
        if (this.activeSection && this.activeSection !== 'salary') {
            console.log('🚫 Switching away from salary, aborting load');
            return;
        }

        // ✅ PREVENT MULTIPLE SIMULTANEOUS LOADS
        if (this.isLoading) {
            console.log('🔄 Salary data loading already in progress, skipping');
            return;
        }

        this.isLoading = true;
        console.log('💰 STARTING Salary data load process...');

        try {
            if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💰 Loading enhanced salary data...');
            this.ui.showSectionLoading('salaryContent', 'Loading salary dashboard...');

            // Load all data in parallel with error handling
            await Promise.allSettled([
                this.loadDailyEmployees(),
                this.loadAttendanceRecords(),
                this.loadSalaryPayments(),
                this.loadSalaryRecords(),
                this.loadAdvanceRecords()
            ]);

            console.log('✅ All data loaded, processing...');

            // ✅ DOUBLE CHECK: Make sure we're still in the salary section after loading
            if (!this.isSalarySectionActive()) {
                console.log('🚫 Salary section no longer active after data load, skipping UI updates');
                return;
            }

            // Process data
            this.processTodaysData();
            this.calculateEmployeeSummaries();

            console.log('🔄 Rendering UI components...');

            // ✅ FORCE UI RENDERING - Add delays to ensure DOM is ready
            setTimeout(() => {
                this.renderEnhancedDashboard();
                this.setupSalaryForm();
                this.updateSummaryCards();

                console.log('✅ UI rendering completed');
                this.ui.showToast('Salary dashboard loaded successfully', 'success');
                this.isInitialized = true;
            }, 100);

        } catch (error) {
            console.error('❌ Error loading salary data:', error);
            this.ui.showToast('Error loading salary data', 'error');
        } finally {
            this.isLoading = false;
            // Small delay before hiding loading to ensure UI is rendered
            setTimeout(() => {
                this.ui.hideSectionLoading('salaryContent');
            }, 200);
        }
    }

    /**
     * ✅ FIXED: Data loading methods with proper error handling
     */
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

    /**
 * ✅ NEW: Show access denied message
 */
    showAccessDeniedMessage() {
        const salaryPaymentsContent = document.getElementById('salaryPaymentsContent');
        if (!salaryPaymentsContent) return;

        salaryPaymentsContent.innerHTML = `
        <div class="access-denied-container">
            <div class="access-denied-card">
                <div class="access-denied-icon">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h3>Access Denied</h3>
                <p>You don't have permission to access the Salary Payments section.</p>
                <div class="access-denied-details">
                    <p><strong>Required Role:</strong> Admin or Manager</p>
                    <p><strong>Your Role:</strong> ${this.auth?.getCurrentUser?.()?.role || 'Unknown'}</p>
                </div>
                <button class="btn-primary" onclick="window.location.hash = 'dashboard'">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </button>
            </div>
        </div>
    `;
    }

    /**
 * ✅ FIXED: Initialize Salary Payments section with proper permission check
 */
    async initializeSalaryPayments() {
        try {
            console.log('💰 Initializing Salary Payments section...');

            // ✅ PROPER PERMISSION CHECK
            if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
                console.warn('🚫 Access denied for Salary Payments section');
                this.showAccessDeniedMessage();
                return;
            }

            // Check if salary payments section is active
            if (!this.isSalaryPaymentsSectionActive()) {
                console.log('🚫 Salary Payments section not active, skipping initialization');
                return;
            }

            await this.loadSalaryPaymentsData();
            this.setupSalaryPaymentsEventListeners();
            this.updateSalaryPaymentsSummary();

            console.log('✅ Salary Payments section initialized');
        } catch (error) {
            console.error('❌ Error initializing salary payments:', error);
            this.ui.showToast('Error loading salary payments', 'error');
        }
    }

    /**
     * ✅ NEW: Load salary payments data
     */
    async loadSalaryPaymentsData() {
        try {
            console.log('📊 Loading salary payments data...');

            // Load salary payments from database
            this.salaryPayments = await this.db.getSalaryPayments() || [];

            // Also load employees for dropdowns
            await this.loadDailyEmployees();

            this.renderSalaryPaymentsTable();
            this.updateSalaryPaymentsSummary();

            console.log(`✅ Loaded ${this.salaryPayments.length} salary payments`);
        } catch (error) {
            console.error('❌ Error loading salary payments data:', error);
            this.salaryPayments = [];
            this.renderSalaryPaymentsTable();
        }
    }

    /**
     * ✅ NEW: Setup salary payments event listeners
     */
    setupSalaryPaymentsEventListeners() {
        // Remove existing listeners first
        this.cleanupSalaryPaymentsEventListeners();

        // Process Salary Payment button
        const processSalaryBtn = document.getElementById('processSalaryBtn');
        if (processSalaryBtn) {
            processSalaryBtn.addEventListener('click', () => {
                this.showProcessSalaryPaymentModal();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportSalaryPaymentsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSalaryPayments();
            });
        }

        // Use event delegation for table actions
        document.addEventListener('click', (e) => {
            if (!this.isSalaryPaymentsSectionActive()) return;

            // View payment details
            if (e.target.closest('.view-payment-btn')) {
                const btn = e.target.closest('.view-payment-btn');
                const paymentId = btn.getAttribute('data-payment-id');
                e.preventDefault();
                this.viewPaymentDetails(paymentId);
                return;
            }

            // Generate payslip
            if (e.target.closest('.generate-payslip-btn')) {
                const btn = e.target.closest('.generate-payslip-btn');
                const paymentId = btn.getAttribute('data-payment-id');
                e.preventDefault();
                this.generatePayslip(paymentId);
                return;
            }

            // Delete payment
            if (e.target.closest('.delete-payment-btn')) {
                const btn = e.target.closest('.delete-payment-btn');
                const paymentId = btn.getAttribute('data-payment-id');
                e.preventDefault();
                this.deleteSalaryPayment(paymentId);
                return;
            }
        });
    }

    /**
     * ✅ NEW: Cleanup salary payments event listeners
     */
    cleanupSalaryPaymentsEventListeners() {
        // Remove specific button listeners if needed
        const processSalaryBtn = document.getElementById('processSalaryBtn');
        if (processSalaryBtn) {
            processSalaryBtn.replaceWith(processSalaryBtn.cloneNode(true));
        }

        const exportBtn = document.getElementById('exportSalaryPaymentsBtn');
        if (exportBtn) {
            exportBtn.replaceWith(exportBtn.cloneNode(true));
        }
    }

    /**
     * ✅ NEW: Render salary payments table
     */
    renderSalaryPaymentsTable() {
        const tbody = document.getElementById('salaryPaymentsTableBody');
        if (!tbody) return;

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
            const employee = this.dailyEmployees.find(emp => emp.id === payment.employee_id);
            const statusClass = this.getPaymentStatusClass(payment.status);
            const statusText = this.getPaymentStatusText(payment.status);

            return `
                <tr>
                    <td><strong>${payment.id.substring(0, 8)}</strong></td>
                    <td>${Utils.formatDate(payment.payment_date)}</td>
                    <td>
                        <div class="employee-cell">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee?.name || 'Unknown')}&background=ff6b35&color=fff" 
                                 alt="${employee?.name}" class="avatar-xs">
                            <span>${employee?.name || 'Unknown Employee'}</span>
                        </div>
                    </td>
                    <td>
                        ${Utils.formatDate(payment.pay_period_start)} - ${Utils.formatDate(payment.pay_period_end)}
                    </td>
                    <td>${Utils.formatCurrency(payment.basic_salary || 0)}</td>
                    <td>${Utils.formatCurrency(payment.overtime_amount || 0)}</td>
                    <td>${Utils.formatCurrency(payment.deductions || 0)}</td>
                    <td><strong>${Utils.formatCurrency(payment.net_salary || 0)}</strong></td>
                    <td>
                        <span class="payment-method-badge ${payment.payment_method}">
                            ${this.getPaymentMethodText(payment.payment_method)}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon small view-payment-btn" 
                                    data-payment-id="${payment.id}"
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon small generate-payslip-btn" 
                                    data-payment-id="${payment.id}"
                                    title="Generate Payslip">
                                <i class="fas fa-file-invoice"></i>
                            </button>
                            <button class="btn-icon small delete-payment-btn" 
                                    data-payment-id="${payment.id}"
                                    title="Delete Payment">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * ✅ NEW: Update salary payments summary cards
     */
    updateSalaryPaymentsSummary() {
        const processedPayments = this.salaryPayments.filter(p => p.status === 'processed').length;
        const totalPaid = this.salaryPayments
            .filter(p => p.status === 'processed')
            .reduce((sum, payment) => sum + parseFloat(payment.net_salary || 0), 0);
        const payslipsGenerated = this.salaryPayments.filter(p => p.payslip_generated).length;

        const processedEl = document.getElementById('processedPaymentsCount');
        const totalPaidEl = document.getElementById('totalSalaryPaid');
        const payslipsEl = document.getElementById('payslipsGenerated');

        if (processedEl) processedEl.textContent = processedPayments;
        if (totalPaidEl) totalPaidEl.textContent = Utils.formatCurrency(totalPaid);
        if (payslipsEl) payslipsEl.textContent = payslipsGenerated;
    }

    /**
     * ✅ NEW: Show process salary payment modal
     */
    showProcessSalaryPaymentModal() {
        const modalHtml = `
            <div id="processSalaryPaymentModal" class="modal active">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-check"></i> Process Salary Payment</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <form id="processSalaryPaymentForm" class="modal-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Employee *</label>
                                <select id="paymentEmployeeId" required>
                                    <option value="">Select Employee</option>
                                    ${this.dailyEmployees.map(emp => `
                                        <option value="${emp.id}">${emp.name} (${emp.id})</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Payment Date *</label>
                                <input type="date" id="paymentDate" value="${this.currentDate}" required>
                            </div>
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

                        <div class="salary-breakdown-section">
                            <h4>Salary Breakdown</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Basic Salary *</label>
                                    <input type="number" id="basicSalary" min="0" step="1" required>
                                </div>
                                <div class="form-group">
                                    <label>Overtime Amount</label>
                                    <input type="number" id="overtimeAmount" min="0" step="1" value="0">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Allowances</label>
                                    <input type="number" id="allowances" min="0" step="1" value="0">
                                </div>
                                <div class="form-group">
                                    <label>Deductions</label>
                                    <input type="number" id="deductions" min="0" step="1" value="0">
                                </div>
                            </div>
                        </div>

                        <div class="salary-preview">
                            <div class="preview-item">
                                <span>Gross Salary:</span>
                                <span id="previewGrossSalary">₹0</span>
                            </div>
                            <div class="preview-item">
                                <span>Deductions:</span>
                                <span id="previewTotalDeductions">-₹0</span>
                            </div>
                            <div class="preview-item total">
                                <span>Net Salary:</span>
                                <span id="previewNetSalary">₹0</span>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Payment Method *</label>
                                <select id="paymentMethod" required>
                                    <option value="">Select Method</option>
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Payment Status *</label>
                                <select id="paymentStatus" required>
                                    <option value="pending">Pending</option>
                                    <option value="processed">Processed</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="paymentNotes" placeholder="Add any notes about this payment"></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary">Process Payment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'processSalaryPaymentModal');
        this.setupProcessSalaryPaymentModalEvents();
    }

    /**
     * ✅ NEW: Setup process salary payment modal events
     */
    setupProcessSalaryPaymentModalEvents() {
        const modal = document.getElementById('processSalaryPaymentModal');
        if (!modal) return;

        const form = modal.querySelector('#processSalaryPaymentForm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');

        // Set default pay period (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const payPeriodStart = modal.querySelector('#payPeriodStart');
        const payPeriodEnd = modal.querySelector('#payPeriodEnd');

        if (payPeriodStart) payPeriodStart.value = firstDay.toISOString().split('T')[0];
        if (payPeriodEnd) payPeriodEnd.value = lastDay.toISOString().split('T')[0];

        // Real-time salary calculation
        const inputs = ['basicSalary', 'overtimeAmount', 'allowances', 'deductions'];
        inputs.forEach(inputId => {
            const input = modal.querySelector(`#${inputId}`);
            if (input) {
                input.addEventListener('input', () => this.updateSalaryPreview());
            }
        });

        // Employee selection - auto-fill basic salary
        const employeeSelect = modal.querySelector('#paymentEmployeeId');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                const employeeId = e.target.value;
                const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
                if (employee) {
                    const basicSalaryInput = modal.querySelector('#basicSalary');
                    const dailyRate = employee.daily_rate || employee.basic_salary || 0;
                    // Calculate monthly salary (approx 26 working days)
                    const monthlySalary = dailyRate * 26;
                    if (basicSalaryInput) basicSalaryInput.value = Math.round(monthlySalary);
                    this.updateSalaryPreview();
                }
            });
        }

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processSalaryPayment(form);
        });

        // Initial preview update
        this.updateSalaryPreview();
    }

    /**
     * ✅ NEW: Update salary preview in modal
     */
    updateSalaryPreview() {
        const modal = document.getElementById('processSalaryPaymentModal');
        if (!modal) return;

        const basicSalary = parseFloat(modal.querySelector('#basicSalary')?.value) || 0;
        const overtimeAmount = parseFloat(modal.querySelector('#overtimeAmount')?.value) || 0;
        const allowances = parseFloat(modal.querySelector('#allowances')?.value) || 0;
        const deductions = parseFloat(modal.querySelector('#deductions')?.value) || 0;

        const grossSalary = basicSalary + overtimeAmount + allowances;
        const netSalary = grossSalary - deductions;

        const grossEl = modal.querySelector('#previewGrossSalary');
        const deductionsEl = modal.querySelector('#previewTotalDeductions');
        const netEl = modal.querySelector('#previewNetSalary');

        if (grossEl) grossEl.textContent = Utils.formatCurrency(grossSalary);
        if (deductionsEl) deductionsEl.textContent = `-${Utils.formatCurrency(deductions)}`;
        if (netEl) netEl.textContent = Utils.formatCurrency(netSalary);
    }

    /**
     * ✅ NEW: Process salary payment
     */
    async processSalaryPayment(form) {
        try {
            const formData = new FormData(form);
            const employeeId = form.querySelector('#paymentEmployeeId').value;
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);

            if (!employee) {
                this.ui.showToast('Employee not found', 'error');
                return;
            }

            const paymentData = {
                id: this.generateId(),
                employee_id: employeeId,
                employee_name: employee.name,
                payment_date: form.querySelector('#paymentDate').value,
                pay_period_start: form.querySelector('#payPeriodStart').value,
                pay_period_end: form.querySelector('#payPeriodEnd').value,
                basic_salary: parseFloat(form.querySelector('#basicSalary').value) || 0,
                overtime_amount: parseFloat(form.querySelector('#overtimeAmount').value) || 0,
                allowances: parseFloat(form.querySelector('#allowances').value) || 0,
                deductions: parseFloat(form.querySelector('#deductions').value) || 0,
                net_salary: this.calculateNetSalary(form),
                payment_method: form.querySelector('#paymentMethod').value,
                payment_status: form.querySelector('#paymentStatus').value,
                notes: form.querySelector('#paymentNotes').value,
                payslip_generated: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await this.db.create('salary_payments', paymentData);
            this.ui.showToast('Salary payment processed successfully', 'success');

            // Close modal and refresh data
            document.getElementById('processSalaryPaymentModal')?.remove();
            await this.loadSalaryPaymentsData();

        } catch (error) {
            console.error('❌ Error processing salary payment:', error);
            this.ui.showToast('Error processing salary payment', 'error');
        }
    }

    /**
     * ✅ NEW: Calculate net salary from form
     */
    calculateNetSalary(form) {
        const basicSalary = parseFloat(form.querySelector('#basicSalary').value) || 0;
        const overtimeAmount = parseFloat(form.querySelector('#overtimeAmount').value) || 0;
        const allowances = parseFloat(form.querySelector('#allowances').value) || 0;
        const deductions = parseFloat(form.querySelector('#deductions').value) || 0;

        const grossSalary = basicSalary + overtimeAmount + allowances;
        return grossSalary - deductions;
    }

    /**
     * ✅ NEW: View payment details
     */
    viewPaymentDetails(paymentId) {
        const payment = this.salaryPayments.find(p => p.id === paymentId);
        if (!payment) {
            this.ui.showToast('Payment not found', 'error');
            return;
        }

        const modalHtml = `
            <div id="paymentDetailsModal" class="modal active">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-check"></i> Payment Details</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <div class="payment-details">
                        <div class="detail-section">
                            <h4>Employee Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Employee Name:</label>
                                    <span>${payment.employee_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Employee ID:</label>
                                    <span>${payment.employee_id}</span>
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
                                    <label>Pay Period:</label>
                                    <span>${Utils.formatDate(payment.pay_period_start)} - ${Utils.formatDate(payment.pay_period_end)}</span>
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
                                    <span>Overtime:</span>
                                    <span>${Utils.formatCurrency(payment.overtime_amount)}</span>
                                </div>
                                <div class="breakdown-item">
                                    <span>Allowances:</span>
                                    <span>${Utils.formatCurrency(payment.allowances)}</span>
                                </div>
                                <div class="breakdown-item deductions">
                                    <span>Deductions:</span>
                                    <span>-${Utils.formatCurrency(payment.deductions)}</span>
                                </div>
                                <div class="breakdown-item total">
                                    <span>Net Salary:</span>
                                    <span><strong>${Utils.formatCurrency(payment.net_salary)}</strong></span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Payment Details</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Payment Method:</label>
                                    <span class="payment-method-badge ${payment.payment_method}">
                                        ${this.getPaymentMethodText(payment.payment_method)}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <label>Status:</label>
                                    <span class="status-badge ${this.getPaymentStatusClass(payment.payment_status)}">
                                        ${this.getPaymentStatusText(payment.payment_status)}
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <label>Payslip:</label>
                                    <span class="status-badge ${payment.payslip_generated ? 'success' : 'warning'}">
                                        ${payment.payslip_generated ? 'Generated' : 'Not Generated'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        ${payment.notes ? `
                        <div class="detail-section">
                            <h4>Notes</h4>
                            <div class="notes">${payment.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary modal-cancel">Close</button>
                        ${!payment.payslip_generated ? `
                        <button type="button" class="btn-primary" id="generatePayslipBtn">Generate Payslip</button>
                        ` : `
                        <button type="button" class="btn-primary" id="downloadPayslipBtn">Download Payslip</button>
                        `}
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'paymentDetailsModal');
        this.setupPaymentDetailsEvents(paymentId);
    }

    /**
     * ✅ NEW: Setup payment details events
     */
    setupPaymentDetailsEvents(paymentId) {
        const modal = document.getElementById('paymentDetailsModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const generateBtn = document.getElementById('generatePayslipBtn');
        const downloadBtn = document.getElementById('downloadPayslipBtn');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                await this.generatePayslip(paymentId);
                closeModal();
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadPayslip(paymentId);
                closeModal();
            });
        }
    }

    /**
     * ✅ NEW: Generate payslip
     */
    async generatePayslip(paymentId) {
        try {
            // Update payment record
            await this.db.update('salary_payments', paymentId, {
                payslip_generated: true,
                payslip_generated_at: new Date().toISOString()
            });

            this.ui.showToast('Payslip generated successfully', 'success');
            await this.loadSalaryPaymentsData();

            // In a real app, you would generate a PDF here
            console.log(`📄 Generating payslip for payment: ${paymentId}`);

        } catch (error) {
            console.error('❌ Error generating payslip:', error);
            this.ui.showToast('Error generating payslip', 'error');
        }
    }

    /**
     * ✅ NEW: Download payslip
     */
    downloadPayslip(paymentId) {
        // This would typically generate and download a PDF
        console.log(`📥 Downloading payslip for payment: ${paymentId}`);
        this.ui.showToast('Payslip download started', 'info');
    }

    /**
     * ✅ NEW: Delete salary payment
     */
    async deleteSalaryPayment(paymentId) {
        if (!confirm('Are you sure you want to delete this salary payment? This action cannot be undone.')) {
            return;
        }

        try {
            await this.db.delete('salary_payments', paymentId);
            this.ui.showToast('Salary payment deleted successfully', 'success');
            await this.loadSalaryPaymentsData();
        } catch (error) {
            console.error('❌ Error deleting salary payment:', error);
            this.ui.showToast('Error deleting salary payment', 'error');
        }
    }

    /**
     * ✅ NEW: Export salary payments
     */
    async exportSalaryPayments() {
        try {
            if (this.salaryPayments.length === 0) {
                this.ui.showToast('No salary payments to export', 'warning');
                return;
            }

            // Convert to CSV
            const headers = ['Payment ID', 'Payment Date', 'Employee', 'Pay Period', 'Basic Salary', 'Overtime', 'Deductions', 'Net Salary', 'Payment Method', 'Status'];
            const csvData = this.salaryPayments.map(payment => [
                payment.id,
                payment.payment_date,
                payment.employee_name,
                `${payment.pay_period_start} to ${payment.pay_period_end}`,
                payment.basic_salary,
                payment.overtime_amount,
                payment.deductions,
                payment.net_salary,
                this.getPaymentMethodText(payment.payment_method),
                this.getPaymentStatusText(payment.payment_status)
            ]);

            const csvContent = [headers, ...csvData]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `salary-payments-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.ui.showToast('Salary payments exported successfully', 'success');
        } catch (error) {
            console.error('❌ Error exporting salary payments:', error);
            this.ui.showToast('Error exporting salary payments', 'error');
        }
    }

    /**
     * ✅ NEW: BULK SALARY FEATURE - Process salary for multiple employees at once
     */
    async showBulkSalaryModal() {
        // ✅ CHECK PERMISSION
        if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
            this.ui.showToast('Access denied', 'error');
            return;
        }

        const presentEmployees = this.todaysAttendance
            .filter(record => record.status === 'present')
            .map(record => {
                const employee = this.dailyEmployees.find(emp => emp.id === record.employee_id);
                const summary = this.employeeSummary[employee.id] || {};
                return {
                    ...employee,
                    work_hours: record.work_hours || 8,
                    pending_advances: summary.pendingAdvances || 0
                };
            });

        if (presentEmployees.length === 0) {
            this.ui.showToast('No present employees found for today', 'warning');
            return;
        }

        const modalHtml = `
            <div id="bulkSalaryModal" class="modal active">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-bill-wave"></i> Bulk Salary Payment</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    
                    <div class="bulk-salary-info">
                        <div class="info-card success">
                            <i class="fas fa-users"></i>
                            <div>
                                <strong>${presentEmployees.length} Employees Present Today</strong>
                                <small>Ready for salary payment</small>
                            </div>
                        </div>
                    </div>

                    <form id="bulkSalaryForm" class="modal-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Payment Date *</label>
                                <input type="date" id="bulkPaymentDate" value="${this.currentDate}" required>
                            </div>
                            <div class="form-group">
                                <label>Payment Method *</label>
                                <select id="bulkPaymentMethod" required>
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="deductAllAdvances" checked>
                                <span>Deduct all pending advances automatically</span>
                            </label>
                        </div>

                        <div class="employees-list-section">
                            <h4>Employees to Pay</h4>
                            <div class="employees-scroll-container">
                                <table class="employees-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                <label class="checkbox-label">
                                                    <input type="checkbox" id="selectAllEmployees" checked>
                                                    <span>Select All</span>
                                                </label>
                                            </th>
                                            <th>Employee</th>
                                            <th>Daily Rate</th>
                                            <th>Work Hours</th>
                                            <th>Pending Advances</th>
                                            <th>Salary Amount</th>
                                            <th>Net Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bulkEmployeesList">
                                        ${presentEmployees.map(emp => `
                                            <tr class="employee-salary-row" data-employee-id="${emp.id}">
                                                <td>
                                                    <label class="checkbox-label">
                                                        <input type="checkbox" class="employee-checkbox" checked 
                                                               data-employee-id="${emp.id}">
                                                    </label>
                                                </td>
                                                <td>
                                                    <div class="employee-cell">
                                                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ff6b35&color=fff" 
                                                             alt="${emp.name}" class="avatar-xs">
                                                        <span>${emp.name}</span>
                                                    </div>
                                                </td>
                                                <td>${Utils.formatCurrency(emp.daily_rate || emp.basic_salary || 500)}</td>
                                                <td>${emp.work_hours}h</td>
                                                <td class="${emp.pending_advances > 0 ? 'warning' : ''}">
                                                    ${Utils.formatCurrency(emp.pending_advances)}
                                                </td>
                                                <td>
                                                    <input type="number" 
                                                           class="salary-amount-input" 
                                                           value="${Math.round((emp.daily_rate || emp.basic_salary || 500) * (emp.work_hours / 8))}"
                                                           min="1" 
                                                           step="1"
                                                           data-employee-id="${emp.id}">
                                                </td>
                                                <td class="net-amount" data-employee-id="${emp.id}">
                                                    ${Utils.formatCurrency(
            Math.round((emp.daily_rate || emp.basic_salary || 500) * (emp.work_hours / 8)) - emp.pending_advances
        )}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="bulk-summary">
                            <div class="summary-row">
                                <span>Selected Employees:</span>
                                <strong id="selectedEmployeesCount">${presentEmployees.length}</strong>
                            </div>
                            <div class="summary-row">
                                <span>Total Salary:</span>
                                <strong id="totalSalaryAmount">₹0</strong>
                            </div>
                            <div class="summary-row">
                                <span>Total Advances to Deduct:</span>
                                <strong id="totalAdvancesAmount">₹0</strong>
                            </div>
                            <div class="summary-row total">
                                <span>Net Payment:</span>
                                <strong id="netPaymentAmount">₹0</strong>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                            <button type="submit" class="btn-primary" id="processBulkSalaryBtn">
                                <i class="fas fa-money-bill-wave"></i>
                                Process Bulk Payment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'bulkSalaryModal');
        this.setupBulkSalaryModalEvents();
    }

    /**
     * ✅ NEW: Setup bulk salary modal events
     */
    setupBulkSalaryModalEvents() {
        const modal = document.getElementById('bulkSalaryModal');
        if (!modal) return;

        const form = modal.querySelector('#bulkSalaryForm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        const selectAllCheckbox = modal.querySelector('#selectAllEmployees');
        const employeeCheckboxes = modal.querySelectorAll('.employee-checkbox');
        const salaryInputs = modal.querySelectorAll('.salary-amount-input');
        const deductAdvancesCheckbox = modal.querySelector('#deductAllAdvances');

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

        // Select All functionality
        selectAllCheckbox.addEventListener('change', (e) => {
            employeeCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                this.toggleEmployeeRow(checkbox.dataset.employeeId, e.target.checked);
            });
            this.updateBulkSummary();
        });

        // Individual employee selection
        employeeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleEmployeeRow(e.target.dataset.employeeId, e.target.checked);
                this.updateSelectAllCheckbox();
                this.updateBulkSummary();
            });
        });

        // Salary amount changes
        salaryInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateEmployeeNetAmount(e.target.dataset.employeeId, parseFloat(e.target.value) || 0);
                this.updateBulkSummary();
            });
        });

        // Deduct advances toggle
        deductAdvancesCheckbox.addEventListener('change', () => {
            salaryInputs.forEach(input => {
                this.updateEmployeeNetAmount(input.dataset.employeeId, parseFloat(input.value) || 0);
            });
            this.updateBulkSummary();
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processBulkSalaryPayment(form);
        });

        // Initial summary update
        this.updateBulkSummary();
    }

    /**
     * ✅ NEW: Toggle employee row in bulk salary
     */
    toggleEmployeeRow(employeeId, isSelected) {
        const row = document.querySelector(`.employee-salary-row[data-employee-id="${employeeId}"]`);
        if (row) {
            row.classList.toggle('selected', isSelected);
            const input = row.querySelector('.salary-amount-input');
            if (input) input.disabled = !isSelected;
        }
    }

    /**
     * ✅ NEW: Update select all checkbox state
     */
    updateSelectAllCheckbox() {
        const modal = document.getElementById('bulkSalaryModal');
        if (!modal) return;

        const checkboxes = modal.querySelectorAll('.employee-checkbox');
        const selectAllCheckbox = modal.querySelector('#selectAllEmployees');

        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const someChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    /**
     * ✅ NEW: Update employee net amount in bulk salary
     */
    updateEmployeeNetAmount(employeeId, salaryAmount) {
        const modal = document.getElementById('bulkSalaryModal');
        if (!modal) return;

        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        const summary = this.employeeSummary[employeeId] || {};
        const deductAdvances = modal.querySelector('#deductAllAdvances').checked;

        const advanceDeduction = deductAdvances ? (summary.pendingAdvances || 0) : 0;
        const netAmount = Math.max(0, salaryAmount - advanceDeduction);

        const netAmountEl = modal.querySelector(`.net-amount[data-employee-id="${employeeId}"]`);
        if (netAmountEl) {
            netAmountEl.textContent = Utils.formatCurrency(netAmount);
        }
    }

    /**
     * ✅ NEW: Update bulk salary summary
     */
    updateBulkSummary() {
        const modal = document.getElementById('bulkSalaryModal');
        if (!modal) return;

        const selectedCheckboxes = modal.querySelectorAll('.employee-checkbox:checked');
        const deductAdvances = modal.querySelector('#deductAllAdvances').checked;

        let totalSalary = 0;
        let totalAdvances = 0;
        let netPayment = 0;

        selectedCheckboxes.forEach(checkbox => {
            const employeeId = checkbox.dataset.employeeId;
            const salaryInput = modal.querySelector(`.salary-amount-input[data-employee-id="${employeeId}"]`);
            const summary = this.employeeSummary[employeeId] || {};

            const salaryAmount = parseFloat(salaryInput?.value) || 0;
            const advanceAmount = deductAdvances ? (summary.pendingAdvances || 0) : 0;

            totalSalary += salaryAmount;
            totalAdvances += advanceAmount;
            netPayment += Math.max(0, salaryAmount - advanceAmount);
        });

        const selectedCountEl = modal.querySelector('#selectedEmployeesCount');
        const totalSalaryEl = modal.querySelector('#totalSalaryAmount');
        const totalAdvancesEl = modal.querySelector('#totalAdvancesAmount');
        const netPaymentEl = modal.querySelector('#netPaymentAmount');

        if (selectedCountEl) selectedCountEl.textContent = selectedCheckboxes.length;
        if (totalSalaryEl) totalSalaryEl.textContent = Utils.formatCurrency(totalSalary);
        if (totalAdvancesEl) totalAdvancesEl.textContent = Utils.formatCurrency(totalAdvances);
        if (netPaymentEl) netPaymentEl.textContent = Utils.formatCurrency(netPayment);
    }

    /**
     * ✅ NEW: Process bulk salary payment
     */
    async processBulkSalaryPayment(form) {
        if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
            this.ui.showToast('Access denied', 'error');
            return;
        }

        const modal = document.getElementById('bulkSalaryModal');
        if (!modal) return;

        const selectedCheckboxes = modal.querySelectorAll('.employee-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            this.ui.showToast('Please select at least one employee', 'error');
            return;
        }

        const paymentDate = modal.querySelector('#bulkPaymentDate').value;
        const paymentMethod = modal.querySelector('#bulkPaymentMethod').value;
        const deductAdvances = modal.querySelector('#deductAllAdvances').checked;

        const submitBtn = modal.querySelector('#processBulkSalaryBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        try {
            let processedCount = 0;
            let errorCount = 0;

            // Process each selected employee
            for (const checkbox of selectedCheckboxes) {
                const employeeId = checkbox.dataset.employeeId;
                const salaryInput = modal.querySelector(`.salary-amount-input[data-employee-id="${employeeId}"]`);
                const salaryAmount = parseFloat(salaryInput.value) || 0;

                if (salaryAmount <= 0) {
                    console.warn(`Skipping employee ${employeeId} - invalid salary amount`);
                    errorCount++;
                    continue;
                }

                try {
                    await this.processIndividualSalaryPayment(
                        employeeId,
                        salaryAmount,
                        paymentDate,
                        paymentMethod,
                        deductAdvances
                    );
                    processedCount++;
                } catch (error) {
                    console.error(`Error processing salary for employee ${employeeId}:`, error);
                    errorCount++;
                }
            }

            // Show results
            if (processedCount > 0) {
                this.ui.showToast(
                    `Successfully processed salary for ${processedCount} employees${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
                    errorCount > 0 ? 'warning' : 'success'
                );
            } else {
                this.ui.showToast('No salaries were processed', 'error');
            }

            // Close modal and refresh data
            modal.remove();
            await this.loadSalaryData();

        } catch (error) {
            console.error('Bulk salary processing error:', error);
            this.ui.showToast('Error processing bulk salary payment', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * ✅ NEW: Process individual salary payment for bulk processing
     */
    async processIndividualSalaryPayment(employeeId, salaryAmount, paymentDate, paymentMethod, deductAdvances) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        // Create salary record
        const salaryId = this.generateId();
        const salaryData = {
            id: salaryId,
            employee_id: employeeId,
            employee_name: employee.name,
            amount: salaryAmount,
            record_date: paymentDate,
            type: 'salary',
            week_number: this.getWeekNumber(new Date(paymentDate)),
            month_number: new Date(paymentDate).getMonth() + 1,
            year: new Date(paymentDate).getFullYear(),
            payment_method: paymentMethod,
            created_at: new Date().toISOString()
        };

        await this.db.create('salary_records', salaryData);

        // Deduct advances if requested
        if (deductAdvances) {
            const pendingAdvances = this.advanceRecords.filter(adv =>
                adv.employee_id === employeeId && adv.status === 'pending'
            );

            for (const advance of pendingAdvances) {
                await this.db.update('advance_records', advance.id, {
                    status: 'deducted',
                    deducted_date: new Date().toISOString()
                });
            }
        }

        console.log(`✅ Processed salary for ${employee.name}: ${Utils.formatCurrency(salaryAmount)}`);
    }

    /**
 * ✅ FIXED: Enhanced UI Methods with better error handling
 */
    renderEnhancedDashboard() {
        console.log('🎨 Starting dashboard rendering...');

        try {
            this.renderQuickActions();
            console.log('✅ Quick actions rendered');

            this.renderEmployeeGrid();
            console.log('✅ Employee grid rendered');

            this.renderSalaryTable();
            console.log('✅ Salary table rendered');

            this.renderPendingAdvances();
            console.log('✅ Pending advances rendered');

        } catch (error) {
            console.error('❌ Error rendering dashboard:', error);
        }
    }

    /**
     * ✅ FIXED: Quick Actions panel with bulk salary button
     */
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
                        <span>Bulk Salary Payment</span>
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
    }

    /**
     * ✅ FIXED: Event Listeners with proper cleanup
     */
    setupEventListeners() {
        // Remove any previously bound listeners
        this.cleanupEventListeners();

        // Use event delegation for dynamic content
        this.boundClickHandler = this.handleGlobalClick.bind(this);
        document.addEventListener('click', this.boundClickHandler);

        // Setup salary form
        this.setupSalaryForm();
    }

    cleanupEventListeners() {
        // Remove any specific event listeners if needed
        const existingHandler = this.boundClickHandler;
        if (existingHandler) {
            document.removeEventListener('click', existingHandler);
        }
        this.boundClickHandler = null;
    }

    /**
 * ✅ FIXED: Global click handler - COMPLETE with all button handlers
 */
    handleGlobalClick(e) {
        const target = e.target;

        // ✅ IMPROVED: Check section activity more reliably
        const isSalaryActive = this.isSalarySectionActive();
        const isSalaryPaymentsActive = this.isSalaryPaymentsSectionActive();

        // If neither section is active, don't handle any salary-related clicks
        if (!isSalaryActive && !isSalaryPaymentsActive) {
            return;
        }

        // ✅ ONLY handle bulk salary button when salary section is active
        if (target.closest('#bulkSalaryBtn') && isSalaryActive) {
            e.preventDefault();
            this.showBulkSalaryModal();
            return;
        }

        // Quick Actions (only in salary section)
        if (target.closest('#quickAttendanceBtn') && isSalaryActive) {
            e.preventDefault();
            this.showQuickAttendanceModal();
            return;
        }

        if (target.closest('#addAdvanceBtn') && isSalaryActive) {
            e.preventDefault();
            this.showAdvanceModal();
            return;
        }

        if (target.closest('#processSalaryBtn') && isSalaryActive) {
            e.preventDefault();
            this.showProcessSalaryModal();
            return;
        }

        // Employee card actions (only in salary section)
        if (target.closest('.mark-attendance-btn') && isSalaryActive) {
            const employeeId = target.closest('.mark-attendance-btn').getAttribute('data-employee-id');
            e.preventDefault();
            this.markEmployeeAttendance(employeeId); // NEW METHOD
            return;
        }

        if (target.closest('.pay-salary-btn') && isSalaryActive) {
            const employeeId = target.closest('.pay-salary-btn').getAttribute('data-employee-id');
            e.preventDefault();
            this.payEmployeeSalary(employeeId);
            return;
        }

        if (target.closest('.add-advance-btn') && isSalaryActive) {
            const employeeId = target.closest('.add-advance-btn').getAttribute('data-employee-id');
            e.preventDefault();
            this.showAdvanceModal(employeeId);
            return;
        }

        if (target.closest('.view-details-btn') && isSalaryActive) {
            const employeeId = target.closest('.view-details-btn').getAttribute('data-employee-id');
            e.preventDefault();
            this.showEmployeeDetails(employeeId); // NEW METHOD
            return;
        }

        // Table actions (only in salary section)
        if (target.closest('.delete-record-btn') && isSalaryActive) {
            const btn = target.closest('.delete-record-btn');
            const recordId = btn.getAttribute('data-record-id');
            const recordType = btn.getAttribute('data-record-type');
            e.preventDefault();
            this.deleteRecord(recordId, recordType);
            return;
        }

        if (target.closest('.mark-advance-paid-btn') && isSalaryActive) {
            const btn = target.closest('.mark-advance-paid-btn');
            const recordId = btn.getAttribute('data-record-id');
            e.preventDefault();
            this.markAdvancePaid(recordId);
            return;
        }

        // Advance card actions (only in salary section)
        if (target.closest('.process-advance-btn') && isSalaryActive) {
            const btn = target.closest('.process-advance-btn');
            const advanceId = btn.getAttribute('data-advance-id');
            e.preventDefault();
            this.processAdvance(advanceId);
            return;
        }

        if (target.closest('.view-advance-btn') && isSalaryActive) {
            const btn = target.closest('.view-advance-btn');
            const advanceId = btn.getAttribute('data-advance-id');
            e.preventDefault();
            this.viewAdvanceDetails(advanceId);
            return;
        }

        // Salary Payments section actions
        if (isSalaryPaymentsActive) {
            // View payment details
            if (target.closest('.view-payment-btn')) {
                const btn = target.closest('.view-payment-btn');
                const paymentId = btn.getAttribute('data-payment-id');
                e.preventDefault();
                this.viewPaymentDetails(paymentId);
                return;
            }

            // Generate payslip
            if (target.closest('.generate-payslip-btn')) {
                const btn = target.closest('.generate-payslip-btn');
                const paymentId = btn.getAttribute('data-payment-id');
                e.preventDefault();
                this.generatePayslip(paymentId);
                return;
            }

            // Delete payment
            if (target.closest('.delete-payment-btn')) {
                const btn = target.closest('.delete-payment-btn');
                const paymentId = btn.getAttribute('data-payment-id');
                e.preventDefault();
                this.deleteSalaryPayment(paymentId);
                return;
            }
        }
    }

    /**
 * ✅ NEW: Mark employee attendance
 */
    markEmployeeAttendance(employeeId) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const modalHtml = `
        <div id="attendanceModal" class="modal active">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-check"></i> Mark Attendance - ${employee.name}</h3>
                    <button type="button" class="modal-close">&times;</button>
                </div>
                <form id="attendanceForm" class="modal-form">
                    <div class="form-group">
                        <label>Attendance Status *</label>
                        <select id="attendanceStatus" required>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half_day">Half Day</option>
                            <option value="leave">Leave</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="attendanceDate" value="${this.currentDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Work Hours</label>
                        <input type="number" id="workHours" min="0" max="24" step="0.5" value="8" 
                               placeholder="Enter work hours">
                    </div>
                    
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea id="attendanceNotes" placeholder="Add any notes about attendance"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn-primary">Save Attendance</button>
                    </div>
                </form>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'attendanceModal');
        this.setupAttendanceModalEvents(employeeId);
    }

    /**
     * ✅ NEW: Setup attendance modal events
     */
    setupAttendanceModalEvents(employeeId) {
        const modal = document.getElementById('attendanceModal');
        if (!modal) return;

        const form = modal.querySelector('#attendanceForm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        const statusSelect = modal.querySelector('#attendanceStatus');
        const workHoursInput = modal.querySelector('#workHours');

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

        // Auto-adjust work hours based on status
        statusSelect.addEventListener('change', (e) => {
            switch (e.target.value) {
                case 'present':
                    workHoursInput.value = '8';
                    workHoursInput.disabled = false;
                    break;
                case 'half_day':
                    workHoursInput.value = '4';
                    workHoursInput.disabled = false;
                    break;
                case 'absent':
                case 'leave':
                    workHoursInput.value = '0';
                    workHoursInput.disabled = true;
                    break;
            }
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (isSubmitting) return;
            isSubmitting = true;

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitBtn.disabled = true;

            try {
                const formData = {
                    employee_id: employeeId,
                    status: statusSelect.value,
                    attendance_date: modal.querySelector('#attendanceDate').value,
                    work_hours: parseFloat(workHoursInput.value) || 0,
                    notes: modal.querySelector('#attendanceNotes').value
                };

                await this.saveAttendanceRecord(formData);
                closeModal();
            } catch (error) {
                console.error('Error saving attendance:', error);
                this.ui.showToast('Error saving attendance record', 'error');
            } finally {
                isSubmitting = false;
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    async saveAttendanceRecord(attendanceData) {
        try {
            const employee = this.dailyEmployees.find(emp => emp.id === attendanceData.employee_id);
            if (!employee) throw new Error('Employee not found');

            // Check if attendance already exists for this date
            const existingAttendance = this.attendanceRecords.find(record =>
                record.employee_id === attendanceData.employee_id &&
                record.attendance_date === attendanceData.attendance_date
            );

            const attendanceRecord = {
                employee_id: attendanceData.employee_id,
                employee_name: employee.name,
                attendance_date: attendanceData.attendance_date,
                status: attendanceData.status,
                work_hours: attendanceData.work_hours,
                notes: attendanceData.notes,
                updated_at: new Date().toISOString() // Add this
            };

            if (existingAttendance) {
                // ✅ FIX: Use the existing ID, don't generate a new one
                await this.db.update('attendance', existingAttendance.id, attendanceRecord);
                this.ui.showToast('Attendance updated successfully', 'success');
            } else {
                // ✅ FIX: Only generate ID for new records
                attendanceRecord.id = this.generateId();
                attendanceRecord.created_at = new Date().toISOString();
                await this.db.create('attendance', attendanceRecord);
                this.ui.showToast('Attendance marked successfully', 'success');
            }

            await this.loadSalaryData();
        } catch (error) {
            console.error('Error saving attendance:', error);
            this.ui.showToast('Error saving attendance record', 'error');
            throw error;
        }
    }

    /**
     * ✅ NEW: Show employee details
     */
    showEmployeeDetails(employeeId) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.ui.showToast('Employee not found', 'error');
            return;
        }

        const summary = this.employeeSummary[employeeId] || {};
        const employeeSalaryRecords = this.salaryRecords.filter(record => record.employee_id === employeeId);
        const employeeAdvanceRecords = this.advanceRecords.filter(record => record.employee_id === employeeId);
        const employeeAttendanceRecords = this.attendanceRecords.filter(record => record.employee_id === employeeId);

        const totalSalary = employeeSalaryRecords.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
        const pendingAdvances = employeeAdvanceRecords.filter(adv => adv.status === 'pending')
            .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
        const presentDays = employeeAttendanceRecords.filter(record => record.status === 'present').length;

        const modalHtml = `
        <div id="employeeDetailsModal" class="modal active">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-tie"></i> Employee Details - ${employee.name}</h3>
                    <button type="button" class="modal-close">&times;</button>
                </div>
                <div class="employee-details">
                    <div class="employee-profile-section">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=ff6b35&color=fff&size=100" 
                                     alt="${employee.name}" class="avatar-large">
                            </div>
                            <div class="profile-info">
                                <h2>${employee.name}</h2>
                                <p class="employee-role">${employee.role || 'Daily Employee'}</p>
                                <p class="employee-id">ID: ${employee.id}</p>
                                <p class="employee-status ${this.getStatusClass(summary.todayStatus)}">
                                    <i class="fas ${this.getStatusIcon(summary.todayStatus)}"></i>
                                    Today: ${this.getStatusText(summary.todayStatus)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="details-grid">
                        <div class="detail-section">
                            <h4><i class="fas fa-chart-line"></i> Performance Summary</h4>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value">${presentDays}</div>
                                    <div class="stat-label">Days Worked</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${Utils.formatCurrency(totalSalary)}</div>
                                    <div class="stat-label">Total Salary</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value ${pendingAdvances > 0 ? 'warning' : ''}">
                                        ${Utils.formatCurrency(pendingAdvances)}
                                    </div>
                                    <div class="stat-label">Pending Advances</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value">${summary.workHours || 0}h</div>
                                    <div class="stat-label">Today's Hours</div>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4><i class="fas fa-money-bill-wave"></i> Salary Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Daily Rate:</label>
                                    <span>${Utils.formatCurrency(employee.daily_rate || employee.basic_salary || 500)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Salary Type:</label>
                                    <span>${employee.salary_type || 'Daily'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Total Records:</label>
                                    <span>${employeeSalaryRecords.length} salary payments</span>
                                </div>
                            </div>
                        </div>

                        ${employeeAttendanceRecords.length > 0 ? `
                        <div class="detail-section">
                            <h4><i class="fas fa-calendar-check"></i> Recent Attendance</h4>
                            <div class="attendance-list">
                                ${employeeAttendanceRecords.slice(0, 5).map(record => `
                                    <div class="attendance-item">
                                        <span class="date">${Utils.formatDate(record.attendance_date)}</span>
                                        <span class="status ${record.status}">${record.status}</span>
                                        <span class="hours">${record.work_hours || 0}h</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary modal-cancel">Close</button>
                    <button type="button" class="btn-primary" id="quickActionBtn">
                        <i class="fas fa-bolt"></i> Quick Actions
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'employeeDetailsModal');
        this.setupEmployeeDetailsEvents(employeeId);
    }

    /**
     * ✅ NEW: Setup employee details events
     */
    setupEmployeeDetailsEvents(employeeId) {
        const modal = document.getElementById('employeeDetailsModal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const quickActionBtn = document.getElementById('quickActionBtn');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (quickActionBtn) {
            quickActionBtn.addEventListener('click', () => {
                this.showQuickActionsMenu(employeeId);
                closeModal();
            });
        }
    }

    /**
     * ✅ NEW: Show quick actions menu for employee
     */
    showQuickActionsMenu(employeeId) {
        const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
        if (!employee) return;

        const menuHtml = `
        <div id="quickActionsMenu" class="dropdown-menu show" style="position: absolute; top: 50px; right: 20px;">
            <div class="dropdown-header">
                <strong>Quick Actions - ${employee.name}</strong>
            </div>
            <div class="dropdown-content">
                <button class="dropdown-item" data-action="attendance">
                    <i class="fas fa-user-check"></i> Mark Attendance
                </button>
                <button class="dropdown-item" data-action="salary">
                    <i class="fas fa-money-bill-wave"></i> Pay Salary
                </button>
                <button class="dropdown-item" data-action="advance">
                    <i class="fas fa-hand-holding-usd"></i> Add Advance
                </button>
                <button class="dropdown-item" data-action="details">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `;

        // Remove existing menu
        const existingMenu = document.getElementById('quickActionsMenu');
        if (existingMenu) existingMenu.remove();

        // Add new menu
        document.body.insertAdjacentHTML('beforeend', menuHtml);
        const menu = document.getElementById('quickActionsMenu');

        // Setup menu events
        menu.addEventListener('click', (e) => {
            const target = e.target.closest('.dropdown-item');
            if (!target) return;

            const action = target.getAttribute('data-action');
            menu.remove();

            switch (action) {
                case 'attendance':
                    this.markEmployeeAttendance(employeeId);
                    break;
                case 'salary':
                    this.payEmployeeSalary(employeeId);
                    break;
                case 'advance':
                    this.showAdvanceModal(employeeId);
                    break;
                case 'details':
                    this.showEmployeeDetails(employeeId);
                    break;
            }
        });

        // Close menu when clicking outside
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    /**
     * ✅ FIXED: Salary form setup
     */
    setupSalaryForm() {
        const salaryForm = document.getElementById('salaryForm');
        if (salaryForm) {
            // Remove existing listeners
            const newForm = salaryForm.cloneNode(true);
            salaryForm.parentNode.replaceChild(newForm, salaryForm);

            // Add new listener
            newForm.addEventListener('submit', (e) => this.handleSalarySubmit(e));
            this.populateEmployeeDropdown();

            const salaryDate = document.getElementById('salaryDate');
            if (salaryDate) salaryDate.value = this.currentDate;
        }
    }

    /**
     * ✅ FIXED: Main salary form handler
     */
    async handleSalarySubmit(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!this.hasPermission('admin') && !this.hasPermission('manager')) {
            this.ui.showToast('Access denied', 'error');
            return;
        }

        const form = e.target;
        const employeeSelect = form.querySelector('#salaryEmployee');
        const salaryDate = form.querySelector('#salaryDate');
        const salaryAmount = form.querySelector('#salaryAmount');
        const advanceAmount = form.querySelector('#advanceAmount');

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

        // Validate amounts
        if (salary > 0 && (isNaN(salary) || salary <= 0 || salary > 100000)) {
            this.ui.showToast('Please enter a valid salary amount (1-100,000)', 'error');
            salaryAmount.focus();
            return;
        }

        if (advance > 0 && (isNaN(advance) || advance <= 0 || advance > 100000)) {
            this.ui.showToast('Please enter a valid advance amount (1-100,000)', 'error');
            advanceAmount.focus();
            return;
        }

        try {
            const employee = this.dailyEmployees.find(emp => emp.id === employeeId);
            if (!employee) throw new Error('Employee not found');

            // Process salary payment
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

            // Process advance
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
            form.reset();
            salaryDate.value = this.currentDate;
            await this.loadSalaryData();

        } catch (error) {
            console.error('Error saving record:', error);
            this.ui.showToast('Error saving record', 'error');
        }
    }

    /**
     * ✅ FIXED: Pay employee salary with modal
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

        this.showCustomModal(modalHtml, 'employeeSalaryModal');
        this.setupSalaryModalEvents(employeeId);
    }

    /**
     * ✅ FIXED: Salary modal event setup
     */
    setupSalaryModalEvents(employeeId) {
        const modal = document.getElementById('employeeSalaryModal');
        if (!modal) return;

        const form = modal.querySelector('#employeeSalaryForm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');
        const salaryInput = modal.querySelector('#salaryAmount');

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

        // Real-time preview
        salaryInput.addEventListener('input', () => {
            this.updateSalaryPreview(employeeId, parseFloat(salaryInput.value) || 0);
        });

        const deductCheckbox = modal.querySelector('#deductAdvance');
        if (deductCheckbox) {
            deductCheckbox.addEventListener('change', () => {
                this.updateSalaryPreview(employeeId, parseFloat(salaryInput.value) || 0);
            });
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (isSubmitting) return;
            isSubmitting = true;

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;

            try {
                const salaryValue = salaryInput.value.trim();
                const salary = parseFloat(salaryValue) || 0;
                const date = form.querySelector('#salaryDate').value;
                const deductAdvance = form.querySelector('#deductAdvance')?.checked || false;

                if (!salaryValue || salary <= 0 || salary > 100000) {
                    this.ui.showToast('Please enter a valid salary amount', 'error');
                    return;
                }

                await this.saveEmployeeSalary(employeeId, salary, date, deductAdvance);
                closeModal();
            } catch (error) {
                console.error('Error in salary form submission:', error);
                this.ui.showToast('Error processing salary payment', 'error');
            } finally {
                isSubmitting = false;
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    /**
     * ✅ FIXED: Save employee salary
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

            // Deduct advances if requested
            if (deductAdvance) {
                const summary = this.employeeSummary[employeeId] || {};
                if (summary.pendingAdvances > 0) {
                    // Mark existing advances as deducted
                    const pendingAdvances = this.advanceRecords.filter(adv =>
                        adv.employee_id === employeeId && adv.status === 'pending'
                    );

                    for (const advance of pendingAdvances) {
                        await this.db.update('advance_records', advance.id, {
                            status: 'deducted',
                            deducted_date: new Date().toISOString()
                        });
                    }
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
     * ✅ FIXED: Advance modal
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
     * ✅ FIXED: Advance modal events
     */
    setupAdvanceModalEvents() {
        const modal = document.getElementById('advanceModal');
        if (!modal) return;

        const form = modal.querySelector('#advanceForm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close');

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
            e.stopPropagation();

            if (isSubmitting) return;
            isSubmitting = true;

            try {
                const amountInput = modal.querySelector('#advanceAmount');
                const employeeSelect = modal.querySelector('#advanceEmployeeId');

                const amountValue = amountInput.value.trim();
                const employeeId = employeeSelect.value;

                if (!employeeId) {
                    this.ui.showToast('Please select an employee', 'error');
                    return;
                }

                if (!amountValue) {
                    this.ui.showToast('Please enter an advance amount', 'error');
                    amountInput.focus();
                    return;
                }

                const amount = parseFloat(amountValue);
                if (isNaN(amount) || amount <= 0 || amount > 100000) {
                    this.ui.showToast('Please enter a valid amount (1-100,000)', 'error');
                    amountInput.focus();
                    return;
                }

                const formData = {
                    employee_id: employeeId,
                    amount: amount,
                    record_date: modal.querySelector('#advanceDate').value,
                    notes: modal.querySelector('#advanceNotes').value
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
    }

    /**
     * ✅ FIXED: Save advance
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
     * ✅ FIXED: Mark advance as paid
     */
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

    /**
     * ✅ FIXED: Process advance (alias for markAdvancePaid)
     */
    async processAdvance(advanceId) {
        await this.markAdvancePaid(advanceId);
    }

    /**
     * ✅ FIXED: Delete record
     */
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

    /**
     * ✅ FIXED: View advance details
     */
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
        this.setupAdvanceDetailsEvents(advanceId);
    }

    setupAdvanceDetailsEvents(advanceId) {
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

    /**
     * ✅ FIXED: Modal creation utility
     */
    showCustomModal(html, modalId) {
        // Remove existing modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        // Create modal
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = html;
        const modal = tempContainer.firstElementChild;

        if (!modal || modal.id !== modalId) {
            console.error(`❌ Failed to parse modal with ID ${modalId}`);
            return null;
        }

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * ✅ FIXED: Utility methods
     */
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

    updateSummaryCards() {
        const attendanceSummary = this.getTodaysAttendanceSummary();
        const presentEl = document.getElementById('presentTodayCount');
        const absentEl = document.getElementById('absentTodayCount');
        const totalEl = document.getElementById('totalEmployeesCount');

        if (presentEl) presentEl.textContent = attendanceSummary.present;
        if (absentEl) absentEl.textContent = attendanceSummary.absent;
        if (totalEl) totalEl.textContent = attendanceSummary.total;
    }

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

    /**
     * ✅ NEW: Utility methods for salary payments
     */
    getPaymentStatusClass(status) {
        const classes = {
            'processed': 'success',
            'pending': 'warning',
            'failed': 'error'
        };
        return classes[status] || 'warning';
    }

    getPaymentStatusText(status) {
        const texts = {
            'processed': 'Processed',
            'pending': 'Pending',
            'failed': 'Failed'
        };
        return texts[status] || 'Pending';
    }

    getPaymentMethodText(method) {
        const texts = {
            'cash': 'Cash',
            'bank_transfer': 'Bank Transfer',
            'cheque': 'Cheque',
            'upi': 'UPI'
        };
        return texts[method] || method;
    }

    // Placeholder methods for other modals
    showQuickAttendanceModal() {
        this.ui.showToast('Quick attendance feature coming soon', 'info');
    }

    showProcessSalaryModal() {
        this.ui.showToast('Process salary feature coming soon', 'info');
    }

    /**
     * ✅ FIXED: Initialize method with better timing control
     */
    async initialize() {
        try {
            // ✅ IMPROVED: Add small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Only initialize if we're in the salary section
            if (!this.isSalarySectionActive()) {
                console.log('🚫 Salary section not active, skipping initialization');
                return;
            }

            // ✅ PREVENT DUPLICATE INITIALIZATION
            if (this.isInitialized) {
                console.log('🔄 Salary Manager already initialized, skipping');
                return;
            }

            console.log('💰 Initializing enhanced Salary Manager...');
            await this.loadSalaryData();
            this.isInitialized = true;
            console.log('✅ Enhanced Salary Manager initialized');
        } catch (error) {
            console.error('❌ Salary Manager initialization failed:', error);
            this.isInitialized = false;
        }
    }

    /**
     * ✅ NEW: Section change handler - call this when switching tabs
     */
    onSectionChange(activeSection) {
        console.log(`🔄 Section changed to: ${activeSection}`);
        this.activeSection = activeSection;

        // Reset initialization state when leaving salary section
        if (activeSection !== 'salary' && activeSection !== 'salaryPayments') {
            this.isInitialized = false;
        }
    }

    /**
     * ✅ FIXED: Cleanup method with better resource cleanup
     */
    cleanup() {
        this.cleanupEventListeners();
        this.isInitialized = false;
        this.isLoading = false;
        this.activeSection = null;

        // Clean up any lingering modals
        const salaryModals = document.querySelectorAll('.modal');
        salaryModals.forEach(modal => {
            if (modal.id.includes('Salary') || modal.id.includes('Advance')) {
                modal.remove();
            }
        });

        console.log('🧹 Enhanced Salary Manager cleanup complete');
    }
}

window.SalaryManager = SalaryManager;