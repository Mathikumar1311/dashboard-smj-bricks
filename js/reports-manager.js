class ReportsManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.currentReportData = [];
        this.exportManager = dependencies.exportManager;
    }

    async initialize() {
        this.setupEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        console.log('📊 Setting up reports event listeners...');
        
        setTimeout(() => {
            // Report generation
            const generateReportBtn = document.getElementById('generateReport');
            if (generateReportBtn) {
                generateReportBtn.addEventListener('click', () => this.generateReport());
            }

            // Export buttons
            const exportExcel = document.getElementById('exportExcel');
            const exportPdf = document.getElementById('exportPdf');
            const backupData = document.getElementById('backupData');
            
            if (exportExcel) {
                exportExcel.addEventListener('click', () => this.showExportOptions('excel'));
            }
            
            if (exportPdf) {
                exportPdf.addEventListener('click', () => this.showExportOptions('pdf'));
            }

            if (backupData) {
                backupData.addEventListener('click', () => this.showBackupOptions());
            }

            // Quick export buttons from other sections
            this.setupQuickExportListeners();

            // Set default dates
            this.setDefaultDates();

        }, 100);
    }

    setupQuickExportListeners() {
        // Users export
        const exportUsersBtn = document.getElementById('exportUsersBtn');
        if (exportUsersBtn) {
            exportUsersBtn.addEventListener('click', () => this.quickExportUsers());
        }

        // Employees export
        const exportEmployeesBtn = document.getElementById('exportEmployeesBtn');
        if (exportEmployeesBtn) {
            exportEmployeesBtn.addEventListener('click', () => this.quickExportEmployees());
        }

        // Customers export
        const exportCustomersBtn = document.getElementById('exportCustomersBtn');
        if (exportCustomersBtn) {
            exportCustomersBtn.addEventListener('click', () => this.quickExportCustomers());
        }

        // Bills export
        const exportBillsBtn = document.getElementById('exportBillsBtn');
        if (exportBillsBtn) {
            exportBillsBtn.addEventListener('click', () => this.quickExportBills());
        }

        // Payments export
        const exportPaymentsBtn = document.getElementById('exportPaymentsBtn');
        if (exportPaymentsBtn) {
            exportPaymentsBtn.addEventListener('click', () => this.quickExportPayments());
        }

        // Salary export
        const exportSalaryBtn = document.getElementById('exportSalaryBtn');
        if (exportSalaryBtn) {
            exportSalaryBtn.addEventListener('click', () => this.quickExportSalary());
        }

        // Pending bills export
        const exportPendingBtn = document.getElementById('exportPendingBtn');
        if (exportPendingBtn) {
            exportPendingBtn.addEventListener('click', () => this.quickExportPending());
        }
    }

    setDefaultDates() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // Last month

        const startDateEl = document.getElementById('reportStartDate');
        const endDateEl = document.getElementById('reportEndDate');

        if (startDateEl) startDateEl.value = startDate.toISOString().split('T')[0];
        if (endDateEl) endDateEl.value = endDate.toISOString().split('T')[0];
    }

    async loadReports() {
        try {
            console.log('📊 Loading reports...');
            // Initial report generation when section is loaded
            await this.generateReport();
            await this.loadReportStats();
        } catch (error) {
            console.error('Error loading reports:', error);
            this.ui.showToast('Error loading reports', 'error');
        }
    }

    async generateReport() {
        try {
            this.ui.showSectionLoading('reportsContent', 'Generating report...');
            
            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;

            if (!startDate || !endDate) {
                this.ui.showToast('Please select both start and end dates', 'error');
                return;
            }

            // Get bills from database
            const bills = await this.db.getBills();
            
            // Filter by date range
            const filteredBills = bills.filter(bill => {
                const billDate = new Date(bill.bill_date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include entire end date
                
                return billDate >= start && billDate <= end;
            });

            this.currentReportData = filteredBills;
            this.displayReport(filteredBills);
            await this.loadReportStats();
            
            this.ui.showToast('Report generated successfully', 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.ui.showToast('Error generating report: ' + error.message, 'error');
        } finally {
            this.ui.hideSectionLoading('reportsContent');
        }
    }

    displayReport(bills) {
        // Calculate totals
        const totalSales = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
        const totalGST = bills.reduce((sum, bill) => sum + (bill.gst_amount || 0), 0);
        const totalBills = bills.length;
        const paidBills = bills.filter(bill => bill.status === 'paid').length;
        const pendingBills = bills.filter(bill => bill.status === 'pending').length;

        // Update report table
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (bills.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <i class="fas fa-chart-bar"></i>
                        <br>No data available for the selected period
                    </td>
                </tr>
            `;
            return;
        }

        bills.forEach(bill => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDate(bill.bill_date)}</td>
                <td>${bill.bill_number || 'N/A'}</td>
                <td>${bill.customer_name || 'N/A'}</td>
                <td>${Utils.formatCurrency(bill.total_amount)}</td>
                <td>${Utils.formatCurrency(bill.gst_amount)}</td>
                <td><span class="status-${bill.status}">${bill.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadReportStats() {
        try {
            const statsElement = document.getElementById('reportStats');
            if (!statsElement) return;

            const bills = await this.db.getBills();
            const customers = await this.db.getCustomers();
            const employees = await this.db.getEmployees();
            const payments = await this.db.getPayments();

            // Calculate statistics
            const totalSales = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
            const totalGST = bills.reduce((sum, bill) => sum + (bill.gst_amount || 0), 0);
            const paidBills = bills.filter(bill => bill.status === 'paid').length;
            const pendingBills = bills.filter(bill => bill.status === 'pending').length;
            
            // Current report stats
            const currentSales = this.currentReportData.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
            const currentGST = this.currentReportData.reduce((sum, bill) => sum + (bill.gst_amount || 0), 0);

            statsElement.innerHTML = `
                <div class="stat-item">
                    <span>Total Customers:</span>
                    <strong>${customers.length}</strong>
                </div>
                <div class="stat-item">
                    <span>Total Employees:</span>
                    <strong>${employees.length}</strong>
                </div>
                <div class="stat-item">
                    <span>Total Bills:</span>
                    <strong>${bills.length}</strong>
                </div>
                <div class="stat-item">
                    <span>Paid Bills:</span>
                    <strong>${paidBills}</strong>
                </div>
                <div class="stat-item">
                    <span>Pending Bills:</span>
                    <strong>${pendingBills}</strong>
                </div>
                <div class="stat-item">
                    <span>Total Sales:</span>
                    <strong>${Utils.formatCurrency(totalSales)}</strong>
                </div>
                <div class="stat-item">
                    <span>Total GST:</span>
                    <strong>${Utils.formatCurrency(totalGST)}</strong>
                </div>
                <div class="stat-item" style="border-top: 2px solid var(--primary-color); padding-top: 0.5rem;">
                    <span>Current Report Sales:</span>
                    <strong style="color: var(--primary-color);">${Utils.formatCurrency(currentSales)}</strong>
                </div>
                <div class="stat-item">
                    <span>Current Report GST:</span>
                    <strong style="color: var(--primary-color);">${Utils.formatCurrency(currentGST)}</strong>
                </div>
            `;
        } catch (error) {
            console.error('Error loading report stats:', error);
        }
    }

    // Export Options Modal
    showExportOptions(type = 'excel') {
        const titles = {
            'excel': 'Excel',
            'pdf': 'PDF'
        };

        const exportHtml = `
            <div id="exportReportModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Export Report</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="export-preview">
                        <h4>Preview</h4>
                        <div class="preview-content">
                            ${this.generateExportPreview()}
                        </div>
                    </div>
                    
                    <div class="export-options">
                        <div class="export-option ${type === 'excel' ? 'selected' : ''}" onclick="app.getManagers().reports.exportToExcel()">
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
                        
                        <div class="export-option ${type === 'pdf' ? 'selected' : ''}" onclick="app.getManagers().reports.exportToPDF()">
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
                        <button class="btn-secondary" onclick="app.getManagers().reports.closeExportModal()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(exportHtml, 'exportReportModal');
    }

    generateExportPreview() {
        if (this.currentReportData.length === 0) {
            return '<p class="no-data">No data available for export</p>';
        }

        const previewData = this.currentReportData.slice(0, 5); // Show first 5 rows
        const totalAmount = this.currentReportData.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
        const totalGST = this.currentReportData.reduce((sum, bill) => sum + (bill.gst_amount || 0), 0);

        return `
            <div class="preview-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Bill No</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${previewData.map(bill => `
                            <tr>
                                <td>${Utils.formatDate(bill.bill_date)}</td>
                                <td>${bill.bill_number}</td>
                                <td>${bill.customer_name}</td>
                                <td>${Utils.formatCurrency(bill.total_amount)}</td>
                                <td><span class="status-${bill.status}">${bill.status}</span></td>
                            </tr>
                        `).join('')}
                        ${this.currentReportData.length > 5 ? `
                            <tr>
                                <td colspan="3" style="text-align: center; font-style: italic;">
                                    ... and ${this.currentReportData.length - 5} more records
                                </td>
                                <td colspan="2"></td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            <div class="preview-summary">
                <div class="summary-item">
                    <span>Total Records:</span>
                    <strong>${this.currentReportData.length}</strong>
                </div>
                <div class="summary-item">
                    <span>Total Amount:</span>
                    <strong>${Utils.formatCurrency(totalAmount)}</strong>
                </div>
                <div class="summary-item">
                    <span>Total GST:</span>
                    <strong>${Utils.formatCurrency(totalGST)}</strong>
                </div>
            </div>
        `;
    }

    showCustomModal(html, modalId) {
        // Remove existing modal
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create new modal
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.innerHTML = html;
        document.body.appendChild(modal);

        // Show modal
        modal.style.display = 'flex';

        // Add close handlers
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    closeExportModal() {
        this.ui.hideModal('exportReportModal');
    }

    async exportToExcel() {
        try {
            if (this.currentReportData.length === 0) {
                this.ui.showToast('No data to export. Please generate a report first.', 'warning');
                return;
            }

            this.closeExportModal();
            this.ui.showExportProgress('Exporting to Excel...');

            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;
            const title = `Sales Report (${Utils.formatDate(startDate)} to ${Utils.formatDate(endDate)})`;

            const exportData = this.currentReportData.map(bill => ({
                'Date': Utils.formatDate(bill.bill_date),
                'Bill Number': bill.bill_number,
                'Customer Name': bill.customer_name,
                'Customer Phone': bill.customer_phone || '',
                'Sub Total': bill.sub_total,
                'GST Rate': `${bill.gst_rate}%`,
                'GST Amount': bill.gst_amount,
                'Total Amount': bill.total_amount,
                'Status': bill.status
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'sales_report', title);
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'sales_report', title);
            } else {
                Utils.exportToExcel(exportData, 'sales_report');
            }
            
            this.ui.showToast('Report exported to Excel successfully', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.ui.showToast('Error exporting to Excel: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportToPDF() {
        try {
            if (this.currentReportData.length === 0) {
                this.ui.showToast('No data to export. Please generate a report first.', 'warning');
                return;
            }

            this.closeExportModal();
            this.ui.showExportProgress('Exporting to PDF...');

            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;
            const title = `Sales Report (${Utils.formatDate(startDate)} to ${Utils.formatDate(endDate)})`;

            const exportData = this.currentReportData.map(bill => ({
                'Date': Utils.formatDate(bill.bill_date),
                'Bill Number': bill.bill_number,
                'Customer': bill.customer_name,
                'Amount': Utils.formatCurrency(bill.total_amount),
                'GST': Utils.formatCurrency(bill.gst_amount),
                'Status': bill.status
            }));

            if (this.exportManager) {
                await this.exportManager.exportToPDF(exportData, 'sales_report', title);
            } else if (window.exportManager) {
                await window.exportManager.exportToPDF(exportData, 'sales_report', title);
            } else {
                await Utils.exportToPDF(exportData, 'sales_report', title);
            }
            
            this.ui.showToast('Report exported to PDF successfully', 'success');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            this.ui.showToast('Error exporting to PDF: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // Backup Options Modal
    showBackupOptions() {
        const backupHtml = `
            <div id="backupModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-database"></i> Data Backup</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="backup-options">
                        <div class="backup-option" onclick="app.getManagers().reports.backupAllData()">
                            <div class="backup-icon full">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="backup-info">
                                <h4>Full Backup</h4>
                                <p>Backup all data including users, employees, bills, and customers</p>
                            </div>
                            <div class="backup-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                        
                        <div class="backup-option" onclick="app.getManagers().reports.backupBusinessData()">
                            <div class="backup-icon business">
                                <i class="fas fa-building"></i>
                            </div>
                            <div class="backup-info">
                                <h4>Business Data Only</h4>
                                <p>Backup only business data (bills, customers, payments)</p>
                            </div>
                            <div class="backup-arrow">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="backup-info-section">
                        <h4>Backup Information</h4>
                        <ul>
                            <li>Backups include all your business data</li>
                            <li>Data is exported as JSON format</li>
                            <li>You can restore data from backups</li>
                            <li>Backups are saved with timestamp</li>
                        </ul>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="app.getManagers().reports.closeBackupModal()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(backupHtml, 'backupModal');
    }

    closeBackupModal() {
        this.ui.hideModal('backupModal');
    }

    async backupAllData() {
        try {
            this.closeBackupModal();
            this.ui.showExportProgress('Creating full backup...');

            const allData = {
                timestamp: new Date().toISOString(),
                version: '2.1.0',
                data: {
                    users: await this.db.getUsers(),
                    employees: await this.db.getEmployees(),
                    customers: await this.db.getCustomers(),
                    bills: await this.db.getBills(),
                    payments: await this.db.getPayments(),
                    salaryRecords: await this.db.getSalaryRecords()
                }
            };

            await this.downloadBackup(allData, 'full_backup');
            this.ui.showToast('Full backup created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating backup:', error);
            this.ui.showToast('Error creating backup: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async backupBusinessData() {
        try {
            this.closeBackupModal();
            this.ui.showExportProgress('Creating business data backup...');

            const businessData = {
                timestamp: new Date().toISOString(),
                version: '2.1.0',
                data: {
                    customers: await this.db.getCustomers(),
                    bills: await this.db.getBills(),
                    payments: await this.db.getPayments()
                }
            };

            await this.downloadBackup(businessData, 'business_backup');
            this.ui.showToast('Business data backup created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating business backup:', error);
            this.ui.showToast('Error creating business backup: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async downloadBackup(data, backupType) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `${backupType}_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Quick export methods
    async quickExportUsers() {
        try {
            this.ui.showExportProgress('Exporting users...');
            const users = await this.db.getUsers();
            const exportData = users.map(user => ({
                'Name': user.name,
                'Email': user.email || '',
                'Phone': user.phone || '',
                'Role': user.role,
                'Status': user.status,
                'Created Date': Utils.formatDate(user.created_at)
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'users_export', 'Users Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'users_export', 'Users Export');
            } else {
                Utils.exportToExcel(exportData, 'users_export');
            }
            
            this.ui.showToast('Users exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting users:', error);
            this.ui.showToast('Error exporting users', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportEmployees() {
        try {
            this.ui.showExportProgress('Exporting employees...');
            const employees = await this.db.getEmployees();
            const exportData = employees.map(emp => ({
                'Employee ID': emp.employee_id || 'N/A',
                'Name': emp.name,
                'Phone': emp.phone || '',
                'Email': emp.email || '',
                'Role': emp.role,
                'Type': emp.type || 'employee',
                'Vehicle Number': emp.vehicle_number || 'N/A',
                'Join Date': Utils.formatDate(emp.join_date)
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'employees_export', 'Employees Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'employees_export', 'Employees Export');
            } else {
                Utils.exportToExcel(exportData, 'employees_export');
            }
            
            this.ui.showToast('Employees exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting employees:', error);
            this.ui.showToast('Error exporting employees', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportCustomers() {
        try {
            this.ui.showExportProgress('Exporting customers...');
            const customers = await this.db.getCustomers();
            const exportData = customers.map(customer => ({
                'Name': customer.name,
                'Phone': customer.phone,
                'Email': customer.email || '',
                'Address': customer.address || '',
                'Total Bills': customer.total_bills || 0,
                'Total Amount': customer.total_amount || 0
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'customers_export', 'Customers Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'customers_export', 'Customers Export');
            } else {
                Utils.exportToExcel(exportData, 'customers_export');
            }
            
            this.ui.showToast('Customers exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting customers:', error);
            this.ui.showToast('Error exporting customers', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportBills() {
        try {
            this.ui.showExportProgress('Exporting bills...');
            const bills = await this.db.getBills();
            const exportData = bills.map(bill => ({
                'Bill Number': bill.bill_number,
                'Customer': bill.customer_name,
                'Date': Utils.formatDate(bill.bill_date),
                'Sub Total': bill.sub_total,
                'GST Amount': bill.gst_amount,
                'Total Amount': bill.total_amount,
                'Status': bill.status
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'bills_export', 'Bills Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'bills_export', 'Bills Export');
            } else {
                Utils.exportToExcel(exportData, 'bills_export');
            }
            
            this.ui.showToast('Bills exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting bills:', error);
            this.ui.showToast('Error exporting bills', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportPayments() {
        try {
            this.ui.showExportProgress('Exporting payments...');
            const payments = await this.db.getPayments();
            const exportData = payments.map(payment => ({
                'Payment ID': payment.id?.slice(0, 8) || 'N/A',
                'Bill Number': payment.bill_number,
                'Customer': payment.customer_name,
                'Amount': payment.amount,
                'Date': Utils.formatDate(payment.payment_date),
                'Method': payment.payment_method
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'payments_export', 'Payments Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'payments_export', 'Payments Export');
            } else {
                Utils.exportToExcel(exportData, 'payments_export');
            }
            
            this.ui.showToast('Payments exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting payments:', error);
            this.ui.showToast('Error exporting payments', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportSalary() {
        try {
            this.ui.showExportProgress('Exporting salary records...');
            const salaryRecords = await this.db.getSalaryRecords();
            const exportData = salaryRecords.map(record => ({
                'Employee': record.employee_name,
                'Date': Utils.formatDate(record.record_date),
                'Base Salary': record.base_salary,
                'Incentive': record.incentive_amount,
                'Advance': record.advance_amount,
                'Total Amount': record.total_amount,
                'Status': record.status
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'salary_export', 'Salary Records Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'salary_export', 'Salary Records Export');
            } else {
                Utils.exportToExcel(exportData, 'salary_export');
            }
            
            this.ui.showToast('Salary records exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting salary records:', error);
            this.ui.showToast('Error exporting salary records', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportPending() {
        try {
            this.ui.showExportProgress('Exporting pending bills...');
            const bills = await this.db.getBills();
            const pendingBills = bills.filter(bill => bill.status === 'pending');
            const exportData = pendingBills.map(bill => ({
                'Bill Number': bill.bill_number,
                'Customer': bill.customer_name,
                'Amount': bill.total_amount,
                'Date': Utils.formatDate(bill.bill_date),
                'Due Date': Utils.formatDate(bill.bill_date)
            }));

            if (this.exportManager) {
                await this.exportManager.exportToExcel(exportData, 'pending_bills_export', 'Pending Bills Export');
            } else if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'pending_bills_export', 'Pending Bills Export');
            } else {
                Utils.exportToExcel(exportData, 'pending_bills_export');
            }
            
            this.ui.showToast('Pending bills exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting pending bills:', error);
            this.ui.showToast('Error exporting pending bills', 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }
}

window.ReportsManager = ReportsManager;