class SalaryManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('SalaryManager: dependencies required');

        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        // All data properties
        this.dailyEmployees = [];
        this.salaryRecords = [];
        this.advanceRecords = [];
        this.attendanceRecords = [];
        this.salaryPayments = [];
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentDateFilter = 'all';

        this.setupEventListeners();
    }

    async initialize() {
        await this.loadDailyEmployees();
        await this.loadAttendanceRecords();
        await this.loadSalaryPayments();
        return Promise.resolve();
    }

    async loadSalaryData() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('manager')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💰 Loading salary data...');
            this.ui.showSectionLoading('salaryContent', 'Loading salary data...');

            // Load all necessary data
            await this.loadDailyEmployees();
            await this.loadAttendanceRecords();

            this.salaryRecords = await this.db.getSalaryRecords() || [];
            this.advanceRecords = await this.db.getAdvanceRecords() || [];
            this.salaryPayments = await this.db.getSalaryPayments() || [];
            this.attendanceRecords = await this.db.getAttendanceRecords() || [];

            this.renderSalaryTable();
            this.setupSalaryForm();
            this.updateSummaryCards();

            this.ui.showToast('Salary data loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading salary data:', error);
            this.ui.showToast('Error loading salary data', 'error');
        } finally {
            this.ui.hideSectionLoading('salaryContent');
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

    /**
         * Initialize salary payments section - CRITICAL MISSING METHOD
         */
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

    /**
     * Load and render salary payments table - CRITICAL MISSING METHOD
     */
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

            // Update summary cards
            this.updateSalaryPaymentsSummary();

        } catch (error) {
            console.error('Error loading salary payments table:', error);
            this.ui.showToast('Error loading salary payments table', 'error');
        }
    }

    /**
     * Setup event listeners for salary payments - CRITICAL MISSING METHOD
     */
    setupSalaryPaymentsEventListeners() {
        console.log('🔧 Setting up salary payments event listeners...');

        // Process salary payment button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'processSalaryBtn' || e.target.closest('#processSalaryBtn')) {
                this.showProcessSalaryModal();
                return;
            }

            if (e.target.id === 'exportSalaryPaymentsBtn' || e.target.closest('#exportSalaryPaymentsBtn')) {
                this.exportSalaryPayments();
                return;
            }

            // Generate payslip buttons
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

    /**
     * Update salary payments summary cards - CRITICAL MISSING METHOD
     */
    updateSalaryPaymentsSummary() {
        const processedCount = this.salaryPayments.length;
        const totalPaid = this.salaryPayments.reduce((sum, payment) =>
            sum + parseFloat(payment.net_salary || 0), 0);
        const payslipsGenerated = this.salaryPayments.filter(p => p.payslip_generated).length;

        // Update DOM elements if they exist
        const processedEl = document.getElementById('processedPaymentsCount');
        const totalPaidEl = document.getElementById('totalSalaryPaid');
        const payslipsEl = document.getElementById('payslipsGenerated');

        if (processedEl) processedEl.textContent = processedCount;
        if (totalPaidEl) totalPaidEl.textContent = Utils.formatCurrency(totalPaid);
        if (payslipsEl) payslipsEl.textContent = payslipsGenerated;
    }


    /**
     * View payment details - CRITICAL MISSING METHOD
     */
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

    /**
     * Export salary payments - CRITICAL MISSING METHOD
     */
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

    getTodaysAttendanceSummary() {
        const today = new Date().toISOString().split('T')[0];
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

    // ==================== SALARY & ADVANCE SYSTEM ====================

    setupSalaryForm() {
        const salaryForm = document.getElementById('salaryForm');
        if (salaryForm) {
            salaryForm.addEventListener('submit', (e) => this.handleSalarySubmit(e));
            this.populateEmployeeDropdown();

            // Set today's date by default
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

            // Save salary if amount > 0
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

            // Save advance if amount > 0
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

            // Reset form but keep date
            e.target.reset();
            salaryDate.value = this.currentDate;

            // Reload data
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

            // Mark advances as deducted
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

        // Get attendance for period
        const periodAttendance = this.attendanceRecords.filter(record =>
            record.employee_id === employeeId &&
            new Date(record.attendance_date) >= new Date(periodStart) &&
            new Date(record.attendance_date) <= new Date(periodEnd)
        );

        // Get advances for period
        const periodAdvances = this.advanceRecords.filter(advance =>
            advance.employee_id === employeeId &&
            advance.status === 'pending' &&
            new Date(advance.record_date) >= new Date(periodStart) &&
            new Date(advance.record_date) <= new Date(periodEnd)
        );

        // Calculate components
        const totalWorkHours = periodAttendance.reduce((sum, record) => sum + (record.work_hours || 0), 0);
        const totalOvertime = periodAttendance.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);
        const totalAdvances = periodAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);

        // Simple daily wage calculation
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

            // Generate A5 format PDF
            await this.generateA5PayslipPDF(payslipData);

            // Update payment record
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

        // A5 dimensions: 148 x 210 mm
        const pageWidth = 148;
        const margin = 10;
        const contentWidth = pageWidth - (2 * margin);

        // Company Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('BUSINESS MANAGER', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Salary Payslip', pageWidth / 2, 22, { align: 'center' });

        // Employee Details
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

        // Salary Breakdown
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

        // Attendance Summary
        yPosition += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance Summary:', margin, yPosition);

        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Work Days: ${payslipData.work_days}`, margin, yPosition);
        doc.text(`Total Hours: ${payslipData.total_hours.toFixed(1)}`, margin + 70, yPosition);

        // Footer
        yPosition = 190;
        doc.setFontSize(8);
        doc.text('Generated on: ' + new Date().toLocaleDateString(), margin, yPosition);
        doc.text('Authorized Signature', pageWidth - margin, yPosition, { align: 'right' });

        // Save PDF
        const fileName = `payslip_${payslipData.employee.id}_${payslipData.payment.payment_date}.pdf`;
        doc.save(fileName);
    }

    /**
     * Load salary payments section data
     */
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

        // Update attendance summary
        document.getElementById('presentTodayCount').textContent = attendanceSummary.present;
        document.getElementById('absentTodayCount').textContent = attendanceSummary.absent;
        document.getElementById('halfDayCount').textContent = attendanceSummary.halfDay;
        document.getElementById('totalEmployeesCount').textContent = attendanceSummary.total;

        // Update salary summary
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

            // A3 dimensions: 297 x 420 mm
            const pageWidth = 420;
            const margin = 15;

            // Title
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Salary Records Report', pageWidth / 2, margin + 10, { align: 'center' });

            // Date
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, margin + 20);

            // Table data
            const tableData = allRecords.map(record => [
                Utils.formatDate(record.record_date),
                record.employee_id,
                record.employee_name,
                record.type === 'advance' ? 'Advance' : 'Salary',
                Utils.formatCurrency(record.amount),
                `Week ${record.week_number}`,
                record.type === 'advance' ? record.status : 'Paid'
            ]);

            // Create table
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

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Attendance button
            if (e.target.id === 'markAttendanceBtn') {
                this.showMarkAttendanceModal();
                return;
            }

            // Salary payment button
            if (e.target.id === 'processSalaryBtn') {
                this.showProcessSalaryModal();
                return;
            }

            // Export button
            if (e.target.id === 'exportSalaryBtn') {
                this.showExportOptions();
                return;
            }

            // Date filter buttons
            if (e.target.closest('[data-filter]')) {
                const filter = e.target.closest('[data-filter]').getAttribute('data-filter');
                this.applyDateFilter(filter);
                return;
            }

            // Payslip generation
            if (e.target.classList.contains('generate-payslip-btn')) {
                const paymentId = e.target.getAttribute('data-payment-id');
                this.generatePayslip(paymentId);
                return;
            }
        });
    }

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

    showCustomModal(html, modalId) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', html);
        this.ui.showModal(modalId);
    }

    cleanup() {
        console.log('Salary Manager cleanup');
    }
}

window.SalaryManager = SalaryManager;