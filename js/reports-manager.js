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
        
        // Use event delegation for better performance
        document.addEventListener('click', (e) => {
            // Report generation
            if (e.target.id === 'generateReport' || e.target.closest('#generateReport')) {
                this.generateReport();
            }
            
            // Export buttons
            if (e.target.id === 'exportExcel' || e.target.closest('#exportExcel')) {
                this.showExportOptions('excel');
            }
            
            if (e.target.id === 'exportPdf' || e.target.closest('#exportPdf')) {
                this.showExportOptions('pdf');
            }

            if (e.target.id === 'backupData' || e.target.closest('#backupData')) {
                this.showBackupOptions();
            }
        });

        // Setup quick export listeners
        this.setupQuickExportListeners();

        // Set default dates
        this.setDefaultDates();
    }

    setupQuickExportListeners() {
        const quickExportButtons = {
            'exportUsersBtn': () => this.quickExportUsers(),
            'exportEmployeesBtn': () => this.quickExportEmployees(),
            'exportCustomersBtn': () => this.quickExportCustomers(),
            'exportBillsBtn': () => this.quickExportBills(),
            'exportPaymentsBtn': () => this.quickExportPayments(),
            'exportSalaryBtn': () => this.quickExportSalary(),
            'exportPendingBtn': () => this.quickExportPending()
        };

        document.addEventListener('click', (e) => {
            for (const [buttonId, handler] of Object.entries(quickExportButtons)) {
                if (e.target.id === buttonId || e.target.closest(`#${buttonId}`)) {
                    handler();
                    break;
                }
            }
        });
    }

    setDefaultDates() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const startDateEl = document.getElementById('reportStartDate');
        const endDateEl = document.getElementById('reportEndDate');

        if (startDateEl) {
            startDateEl.value = startDate.toISOString().split('T')[0];
            startDateEl.addEventListener('change', () => this.validateDates());
        }
        if (endDateEl) {
            endDateEl.value = endDate.toISOString().split('T')[0];
            endDateEl.addEventListener('change', () => this.validateDates());
        }
    }

    validateDates() {
        const startDateEl = document.getElementById('reportStartDate');
        const endDateEl = document.getElementById('reportEndDate');
        
        if (!startDateEl || !endDateEl) return;

        const startDate = new Date(startDateEl.value);
        const endDate = new Date(endDateEl.value);

        if (startDate > endDate) {
            this.ui.showToast('Start date cannot be after end date', 'error');
            endDateEl.value = startDateEl.value;
        }
    }

    async loadReports() {
        try {
            console.log('📊 Loading reports...');
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
                this.ui.hideSectionLoading('reportsContent');
                return;
            }

            // Validate date range
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start > end) {
                this.ui.showToast('Start date cannot be after end date', 'error');
                this.ui.hideSectionLoading('reportsContent');
                return;
            }

            // Get bills from database
            const bills = await this.db.getBills();
            
            // Filter by date range
            const filteredBills = bills.filter(bill => {
                if (!bill.bill_date) return false;
                
                const billDate = new Date(bill.bill_date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                
                return billDate >= start && billDate <= end;
            });

            this.currentReportData = filteredBills;
            this.displayReport(filteredBills);
            await this.loadReportStats();
            
            this.ui.showToast(`Report generated: ${filteredBills.length} records found`, 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.ui.showToast('Error generating report: ' + error.message, 'error');
        } finally {
            this.ui.hideSectionLoading('reportsContent');
        }
    }

    displayReport(bills) {
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) {
            console.error('Reports table body not found');
            return;
        }

        tbody.innerHTML = '';

        if (!bills || bills.length === 0) {
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
                <td>${Utils.formatDate(bill.bill_date) || 'N/A'}</td>
                <td>${bill.bill_number || 'N/A'}</td>
                <td>${bill.customer_name || 'N/A'}</td>
                <td>${Utils.formatCurrency(bill.total_amount || 0)}</td>
                <td>${Utils.formatCurrency(bill.gst_amount || 0)}</td>
                <td><span class="status-${bill.status || 'pending'}">${bill.status || 'pending'}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadReportStats() {
        try {
            const statsElement = document.getElementById('reportStats');
            if (!statsElement) return;

            const [bills, customers, employees, payments] = await Promise.all([
                this.db.getBills().catch(() => []),
                this.db.getCustomers().catch(() => []),
                this.db.getEmployees().catch(() => []),
                this.db.getPayments().catch(() => [])
            ]);

            // Calculate statistics with safe defaults
            const totalSales = bills.reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);
            const totalGST = bills.reduce((sum, bill) => sum + (parseFloat(bill.gst_amount) || 0), 0);
            const paidBills = bills.filter(bill => bill.status === 'paid').length;
            const pendingBills = bills.filter(bill => bill.status === 'pending').length;
            
            // Current report stats
            const currentSales = this.currentReportData.reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);
            const currentGST = this.currentReportData.reduce((sum, bill) => sum + (parseFloat(bill.gst_amount) || 0), 0);

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
            statsElement.innerHTML = '<div class="error-message">Error loading statistics</div>';
        }
    }

    // Export Options Modal
    showExportOptions(type = 'excel') {
        if (this.currentReportData.length === 0) {
            this.ui.showToast('No data to export. Please generate a report first.', 'warning');
            return;
        }

        const exportHtml = `
            <div id="exportReportModal" class="modal">
                <div class="modal-backdrop"></div>
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
                        <div class="export-option ${type === 'excel' ? 'selected' : ''}" data-action="excel">
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
                        
                        <div class="export-option ${type === 'pdf' ? 'selected' : ''}" data-action="pdf">
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
                        <button class="btn-secondary" data-action="cancel">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(exportHtml, 'exportReportModal');
        this.setupExportModalHandlers();
    }

    setupExportModalHandlers() {
        const modal = document.getElementById('exportReportModal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.getAttribute('data-action');
            
            switch (action) {
                case 'excel':
                    this.exportToExcel();
                    break;
                case 'pdf':
                    this.exportToPDF();
                    break;
                case 'cancel':
                    this.closeExportModal();
                    break;
            }
        });
    }

    generateExportPreview() {
        if (!this.currentReportData || this.currentReportData.length === 0) {
            return '<p class="no-data">No data available for export</p>';
        }

        const previewData = this.currentReportData.slice(0, 5);
        const totalAmount = this.currentReportData.reduce((sum, bill) => sum + (parseFloat(bill.total_amount) || 0), 0);
        const totalGST = this.currentReportData.reduce((sum, bill) => sum + (parseFloat(bill.gst_amount) || 0), 0);

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
                                <td>${Utils.formatDate(bill.bill_date) || 'N/A'}</td>
                                <td>${bill.bill_number || 'N/A'}</td>
                                <td>${bill.customer_name || 'N/A'}</td>
                                <td>${Utils.formatCurrency(bill.total_amount || 0)}</td>
                                <td><span class="status-${bill.status || 'pending'}">${bill.status || 'pending'}</span></td>
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
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }, 10);

        return modal;
    }

    closeExportModal() {
        const modal = document.getElementById('exportReportModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    async exportToExcel() {
        try {
            if (!this.currentReportData || this.currentReportData.length === 0) {
                this.ui.showToast('No data to export. Please generate a report first.', 'warning');
                return;
            }

            this.closeExportModal();
            this.ui.showExportProgress('Exporting to Excel...');

            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;
            const title = `Sales Report (${Utils.formatDate(startDate)} to ${Utils.formatDate(endDate)})`;

            const exportData = this.currentReportData.map(bill => ({
                'Date': Utils.formatDate(bill.bill_date) || 'N/A',
                'Bill Number': bill.bill_number || 'N/A',
                'Customer Name': bill.customer_name || 'N/A',
                'Customer Phone': bill.customer_phone || '',
                'Sub Total': parseFloat(bill.sub_total) || 0,
                'GST Rate': bill.gst_rate ? `${bill.gst_rate}%` : '0%',
                'GST Amount': parseFloat(bill.gst_amount) || 0,
                'Total Amount': parseFloat(bill.total_amount) || 0,
                'Status': bill.status || 'pending'
            }));

            // Use available export manager
            if (this.exportManager && typeof this.exportManager.exportToExcel === 'function') {
                await this.exportManager.exportToExcel(exportData, 'sales_report', title);
            } else if (window.exportManager && typeof window.exportManager.exportToExcel === 'function') {
                await window.exportManager.exportToExcel(exportData, 'sales_report', title);
            } else if (typeof Utils.exportToExcel === 'function') {
                Utils.exportToExcel(exportData, 'sales_report');
            } else {
                throw new Error('No export method available');
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
            if (!this.currentReportData || this.currentReportData.length === 0) {
                this.ui.showToast('No data to export. Please generate a report first.', 'warning');
                return;
            }

            this.closeExportModal();
            this.ui.showExportProgress('Exporting to PDF...');

            const startDate = document.getElementById('reportStartDate')?.value;
            const endDate = document.getElementById('reportEndDate')?.value;
            const title = `Sales Report (${Utils.formatDate(startDate)} to ${Utils.formatDate(endDate)})`;

            const exportData = this.currentReportData.map(bill => ({
                'Date': Utils.formatDate(bill.bill_date) || 'N/A',
                'Bill Number': bill.bill_number || 'N/A',
                'Customer': bill.customer_name || 'N/A',
                'Amount': Utils.formatCurrency(bill.total_amount || 0),
                'GST': Utils.formatCurrency(bill.gst_amount || 0),
                'Status': bill.status || 'pending'
            }));

            // Use available export manager
            if (this.exportManager && typeof this.exportManager.exportToPDF === 'function') {
                await this.exportManager.exportToPDF(exportData, 'sales_report', title);
            } else if (window.exportManager && typeof window.exportManager.exportToPDF === 'function') {
                await window.exportManager.exportToPDF(exportData, 'sales_report', title);
            } else if (typeof Utils.exportToPDF === 'function') {
                await Utils.exportToPDF(exportData, 'sales_report', title);
            } else {
                throw new Error('No PDF export method available');
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
                <div class="modal-backdrop"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-database"></i> Data Backup</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="backup-options">
                        <div class="backup-option" data-action="full-backup">
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
                        
                        <div class="backup-option" data-action="business-backup">
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
                        <button class="btn-secondary" data-action="cancel">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(backupHtml, 'backupModal');
        this.setupBackupModalHandlers();
    }

    setupBackupModalHandlers() {
        const modal = document.getElementById('backupModal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.getAttribute('data-action');
            
            switch (action) {
                case 'full-backup':
                    this.backupAllData();
                    break;
                case 'business-backup':
                    this.backupBusinessData();
                    break;
                case 'cancel':
                    this.closeBackupModal();
                    break;
            }
        });
    }

    closeBackupModal() {
        const modal = document.getElementById('backupModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    async backupAllData() {
        try {
            this.closeBackupModal();
            this.ui.showExportProgress('Creating full backup...');

            const allData = {
                timestamp: new Date().toISOString(),
                version: '2.1.0',
                backupType: 'full',
                data: {
                    users: await this.db.getUsers().catch(() => []),
                    employees: await this.db.getEmployees().catch(() => []),
                    customers: await this.db.getCustomers().catch(() => []),
                    bills: await this.db.getBills().catch(() => []),
                    payments: await this.db.getPayments().catch(() => []),
                    salaryRecords: await this.db.getSalaryRecords().catch(() => [])
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
                backupType: 'business',
                data: {
                    customers: await this.db.getCustomers().catch(() => []),
                    bills: await this.db.getBills().catch(() => []),
                    payments: await this.db.getPayments().catch(() => [])
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
        try {
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const link = document.createElement('a');
            link.href = url;
            link.download = `${backupType}_${timestamp}.json`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
        } catch (error) {
            console.error('Error downloading backup:', error);
            throw error;
        }
    }

    // Quick export methods
    async quickExportUsers() {
        try {
            this.ui.showExportProgress('Exporting users...');
            const users = await this.db.getUsers().catch(() => []);
            
            if (!users || users.length === 0) {
                this.ui.showToast('No users data available for export', 'warning');
                return;
            }

            const exportData = users.map(user => ({
                'Name': user.name || 'N/A',
                'Email': user.email || '',
                'Phone': user.phone || '',
                'Role': user.role || 'user',
                'Status': user.status || 'active',
                'Created Date': Utils.formatDate(user.created_at) || 'N/A'
            }));

            await this.performExport(exportData, 'users_export', 'Users Export');
            this.ui.showToast('Users exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting users:', error);
            this.ui.showToast('Error exporting users: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportEmployees() {
        try {
            this.ui.showExportProgress('Exporting employees...');
            const employees = await this.db.getEmployees().catch(() => []);
            
            if (!employees || employees.length === 0) {
                this.ui.showToast('No employees data available for export', 'warning');
                return;
            }

            const exportData = employees.map(emp => ({
                'Employee ID': emp.employee_id || 'N/A',
                'Name': emp.name || 'N/A',
                'Phone': emp.phone || '',
                'Email': emp.email || '',
                'Role': emp.role || 'N/A',
                'Type': emp.type || 'employee',
                'Vehicle Number': emp.vehicle_number || 'N/A',
                'Join Date': Utils.formatDate(emp.join_date) || 'N/A'
            }));

            await this.performExport(exportData, 'employees_export', 'Employees Export');
            this.ui.showToast('Employees exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting employees:', error);
            this.ui.showToast('Error exporting employees: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportCustomers() {
        try {
            this.ui.showExportProgress('Exporting customers...');
            const customers = await this.db.getCustomers().catch(() => []);
            
            if (!customers || customers.length === 0) {
                this.ui.showToast('No customers data available for export', 'warning');
                return;
            }

            const exportData = customers.map(customer => ({
                'Name': customer.name || 'N/A',
                'Phone': customer.phone || 'N/A',
                'Email': customer.email || '',
                'Address': customer.address || '',
                'Total Bills': parseInt(customer.total_bills) || 0,
                'Total Amount': parseFloat(customer.total_amount) || 0
            }));

            await this.performExport(exportData, 'customers_export', 'Customers Export');
            this.ui.showToast('Customers exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting customers:', error);
            this.ui.showToast('Error exporting customers: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportBills() {
        try {
            this.ui.showExportProgress('Exporting bills...');
            const bills = await this.db.getBills().catch(() => []);
            
            if (!bills || bills.length === 0) {
                this.ui.showToast('No bills data available for export', 'warning');
                return;
            }

            const exportData = bills.map(bill => ({
                'Bill Number': bill.bill_number || 'N/A',
                'Customer': bill.customer_name || 'N/A',
                'Date': Utils.formatDate(bill.bill_date) || 'N/A',
                'Sub Total': parseFloat(bill.sub_total) || 0,
                'GST Amount': parseFloat(bill.gst_amount) || 0,
                'Total Amount': parseFloat(bill.total_amount) || 0,
                'Status': bill.status || 'pending'
            }));

            await this.performExport(exportData, 'bills_export', 'Bills Export');
            this.ui.showToast('Bills exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting bills:', error);
            this.ui.showToast('Error exporting bills: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportPayments() {
        try {
            this.ui.showExportProgress('Exporting payments...');
            const payments = await this.db.getPayments().catch(() => []);
            
            if (!payments || payments.length === 0) {
                this.ui.showToast('No payments data available for export', 'warning');
                return;
            }

            const exportData = payments.map(payment => ({
                'Payment ID': payment.id?.slice(0, 8) || 'N/A',
                'Bill Number': payment.bill_number || 'N/A',
                'Customer': payment.customer_name || 'N/A',
                'Amount': parseFloat(payment.amount) || 0,
                'Date': Utils.formatDate(payment.payment_date) || 'N/A',
                'Method': payment.payment_method || 'cash'
            }));

            await this.performExport(exportData, 'payments_export', 'Payments Export');
            this.ui.showToast('Payments exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting payments:', error);
            this.ui.showToast('Error exporting payments: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportSalary() {
        try {
            this.ui.showExportProgress('Exporting salary records...');
            const salaryRecords = await this.db.getSalaryRecords().catch(() => []);
            
            if (!salaryRecords || salaryRecords.length === 0) {
                this.ui.showToast('No salary records available for export', 'warning');
                return;
            }

            const exportData = salaryRecords.map(record => ({
                'Employee': record.employee_name || 'N/A',
                'Date': Utils.formatDate(record.record_date) || 'N/A',
                'Base Salary': parseFloat(record.base_salary) || 0,
                'Incentive': parseFloat(record.incentive_amount) || 0,
                'Advance': parseFloat(record.advance_amount) || 0,
                'Total Amount': parseFloat(record.total_amount) || 0,
                'Status': record.status || 'pending'
            }));

            await this.performExport(exportData, 'salary_export', 'Salary Records Export');
            this.ui.showToast('Salary records exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting salary records:', error);
            this.ui.showToast('Error exporting salary records: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async quickExportPending() {
        try {
            this.ui.showExportProgress('Exporting pending bills...');
            const bills = await this.db.getBills().catch(() => []);
            const pendingBills = bills.filter(bill => bill.status === 'pending');
            
            if (pendingBills.length === 0) {
                this.ui.showToast('No pending bills available for export', 'warning');
                return;
            }

            const exportData = pendingBills.map(bill => ({
                'Bill Number': bill.bill_number || 'N/A',
                'Customer': bill.customer_name || 'N/A',
                'Amount': parseFloat(bill.total_amount) || 0,
                'Date': Utils.formatDate(bill.bill_date) || 'N/A',
                'Due Date': Utils.formatDate(bill.due_date) || 'N/A'
            }));

            await this.performExport(exportData, 'pending_bills_export', 'Pending Bills Export');
            this.ui.showToast('Pending bills exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting pending bills:', error);
            this.ui.showToast('Error exporting pending bills: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async performExport(data, filename, title) {
        // Try available export methods in order
        if (this.exportManager && typeof this.exportManager.exportToExcel === 'function') {
            await this.exportManager.exportToExcel(data, filename, title);
        } else if (window.exportManager && typeof window.exportManager.exportToExcel === 'function') {
            await window.exportManager.exportToExcel(data, filename, title);
        } else if (typeof Utils.exportToExcel === 'function') {
            Utils.exportToExcel(data, filename);
        } else {
            // Fallback to simple CSV export
            this.exportAsCSV(data, filename);
        }
    }

    exportAsCSV(data, filename) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
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

    // Utility method to check if we're in reports section
    isReportsSectionActive() {
        const reportsSection = document.getElementById('reportsContent');
        return reportsSection && reportsSection.classList.contains('active');
    }

    // Cleanup method
    destroy() {
        // Remove any event listeners if needed
        this.currentReportData = [];
    }
}

// Make sure Utils is available
if (typeof Utils === 'undefined') {
    console.warn('Utils is not defined. Some features may not work properly.');
}

window.ReportsManager = ReportsManager;