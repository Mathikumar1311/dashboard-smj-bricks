class ReportsManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.currentReportData = [];
    }

    async initialize() {
        this.setupEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
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
                exportExcel.addEventListener('click', () => this.exportToExcel());
            }
            
            if (exportPdf) {
                exportPdf.addEventListener('click', () => this.exportToPDF());
            }

            if (backupData) {
                backupData.addEventListener('click', () => this.backupAllData());
            }

            // Set default dates
            this.setDefaultDates();
        });
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

    async exportToExcel() {
        try {
            if (this.currentReportData.length === 0) {
                this.ui.showToast('No data to export. Please generate a report first.', 'warning');
                return;
            }

            this.ui.showExportProgress('Exporting to Excel...');

            const exportData = this.currentReportData.map(bill => ({
                'Date': Utils.formatDate(bill.bill_date),
                'Bill Number': bill.bill_number,
                'Customer Name': bill.customer_name,
                'Customer Phone': bill.customer_phone,
                'Sub Total': bill.sub_total,
                'GST Rate': `${bill.gst_rate}%`,
                'GST Amount': bill.gst_amount,
                'Total Amount': bill.total_amount,
                'Status': bill.status
            }));

            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'sales_report', 'Sales Report');
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

            if (window.exportManager) {
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

    async backupAllData() {
        try {
            this.ui.showExportProgress('Creating backup...');

            const allData = await this.db.exportAllData();
            
            if (window.electronAPI) {
                const result = await window.electronAPI.exportAllData(allData);
                if (result.success) {
                    this.ui.showToast(`Backup created successfully: ${result.filePath}`, 'success');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Browser fallback - download as JSON
                const dataStr = JSON.stringify(allData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `business_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.ui.showToast('Backup downloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            this.ui.showToast('Error creating backup: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // Advanced reporting methods
    async generateSalesTrend() {
        try {
            const bills = await this.db.getBills();
            const monthlySales = {};

            bills.forEach(bill => {
                const date = new Date(bill.bill_date);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!monthlySales[monthYear]) {
                    monthlySales[monthYear] = 0;
                }
                monthlySales[monthYear] += bill.total_amount;
            });

            return Object.entries(monthlySales)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, sales]) => ({ month, sales }));
        } catch (error) {
            console.error('Error generating sales trend:', error);
            return [];
        }
    }

    async generateCustomerReport() {
        try {
            const bills = await this.db.getBills();
            const customerStats = {};

            bills.forEach(bill => {
                const customerName = bill.customer_name;
                if (!customerStats[customerName]) {
                    customerStats[customerName] = {
                        totalAmount: 0,
                        billCount: 0,
                        lastPurchase: bill.bill_date
                    };
                }
                
                customerStats[customerName].totalAmount += bill.total_amount;
                customerStats[customerName].billCount += 1;
                
                if (new Date(bill.bill_date) > new Date(customerStats[customerName].lastPurchase)) {
                    customerStats[customerName].lastPurchase = bill.bill_date;
                }
            });

            return Object.entries(customerStats)
                .map(([name, stats]) => ({
                    customer: name,
                    totalSpent: stats.totalAmount,
                    billCount: stats.billCount,
                    lastPurchase: stats.lastPurchase,
                    averageSpent: stats.totalAmount / stats.billCount
                }))
                .sort((a, b) => b.totalSpent - a.totalSpent);
        } catch (error) {
            console.error('Error generating customer report:', error);
            return [];
        }
    }

    async generateGSTReport() {
        try {
            const bills = await this.db.getBills();
            const gstStats = {};

            bills.forEach(bill => {
                const gstRate = bill.gst_rate;
                if (!gstStats[gstRate]) {
                    gstStats[gstRate] = {
                        totalGST: 0,
                        totalSales: 0,
                        billCount: 0
                    };
                }
                
                gstStats[gstRate].totalGST += bill.gst_amount;
                gstStats[gstRate].totalSales += bill.total_amount;
                gstStats[gstRate].billCount += 1;
            });

            return Object.entries(gstStats)
                .map(([rate, stats]) => ({
                    gstRate: `${rate}%`,
                    totalGST: stats.totalGST,
                    totalSales: stats.totalSales,
                    billCount: stats.billCount
                }))
                .sort((a, b) => parseFloat(a.gstRate) - parseFloat(b.gstRate));
        } catch (error) {
            console.error('Error generating GST report:', error);
            return [];
        }
    }

    // Quick export methods for other sections
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

            if (window.exportManager) {
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
                'Name': emp.name,
                'Phone': emp.phone || '',
                'Role': emp.role,
                'Salary': emp.salary,
                'Join Date': Utils.formatDate(emp.join_date)
            }));

            if (window.exportManager) {
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
                'Address': customer.address || ''
            }));

            if (window.exportManager) {
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
                'Amount': bill.total_amount,
                'GST': bill.gst_amount,
                'Status': bill.status
            }));

            if (window.exportManager) {
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

            if (window.exportManager) {
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
                'Amount': record.amount,
                'Work Hours': record.work_hours
            }));

            if (window.exportManager) {
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
}

// Make ReportsManager available globally
window.ReportsManager = ReportsManager;