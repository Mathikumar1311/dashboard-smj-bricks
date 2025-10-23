class BillingManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.billItems = [];
        this.customers = [];
        this.bills = [];
        this.payments = [];
    }

    async initialize() {
        this.setupEventListeners();
        return Promise.resolve();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Bill management
            const addBillBtn = document.getElementById('addBillBtn');
            if (addBillBtn) {
                addBillBtn.addEventListener('click', () => this.showAddBillModal());
            }

            const billForm = document.getElementById('billForm');
            if (billForm) {
                billForm.addEventListener('submit', (e) => this.handleBillSubmit(e));
            }

            const addItemBtn = document.getElementById('addItemBtn');
            if (addItemBtn) {
                addItemBtn.addEventListener('click', () => this.addBillItem());
            }

            const billGst = document.getElementById('billGst');
            if (billGst) {
                billGst.addEventListener('input', () => this.calculateBillTotal());
            }

            // Customer management
            const addCustomerBtn = document.getElementById('addCustomerBtn');
            if (addCustomerBtn) {
                addCustomerBtn.addEventListener('click', () => this.showAddCustomerModal());
            }

            const customerForm = document.getElementById('customerForm');
            if (customerForm) {
                customerForm.addEventListener('submit', (e) => this.handleCustomerSubmit(e));
            }

            // Export buttons
            const exportBillsBtn = document.getElementById('exportBillsBtn');
            if (exportBillsBtn) {
                exportBillsBtn.addEventListener('click', () => this.exportBills());
            }

            const exportCustomersBtn = document.getElementById('exportCustomersBtn');
            if (exportCustomersBtn) {
                exportCustomersBtn.addEventListener('click', () => this.exportCustomers());
            }

            const exportPendingBtn = document.getElementById('exportPendingBtn');
            if (exportPendingBtn) {
                exportPendingBtn.addEventListener('click', () => this.exportPendingBills());
            }

            const exportPaymentsBtn = document.getElementById('exportPaymentsBtn');
            if (exportPaymentsBtn) {
                exportPaymentsBtn.addEventListener('click', () => this.exportPayments());
            }
        });
    }

    // Bill Management
    async loadBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('🧾 Loading bills...');
            this.ui.showSectionLoading('billingContent', 'Loading bills...');
            
            this.bills = await this.db.getBills();
            this.renderBillsTable(this.bills);
            
            this.ui.showToast('Bills loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading bills:', error);
            this.ui.showToast('Error loading bills', 'error');
        } finally {
            this.ui.hideSectionLoading('billingContent');
        }
    }

    async loadCustomers() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('👥 Loading customers...');
            this.ui.showSectionLoading('customersContent', 'Loading customers...');
            
            this.customers = await this.db.getCustomers();
            this.renderCustomersTable(this.customers);
            
            this.ui.showToast('Customers loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading customers:', error);
            this.ui.showToast('Error loading customers', 'error');
        } finally {
            this.ui.hideSectionLoading('customersContent');
        }
    }

    async loadPendingBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('⏳ Loading pending bills...');
            this.ui.showSectionLoading('pendingContent', 'Loading pending bills...');
            
            const bills = await this.db.getBills();
            const pendingBills = bills.filter(bill => bill.status === 'pending');
            this.renderPendingTable(pendingBills);
            
            this.ui.showToast('Pending bills loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading pending bills:', error);
            this.ui.showToast('Error loading pending bills', 'error');
        } finally {
            this.ui.hideSectionLoading('pendingContent');
        }
    }

    async loadPayments() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            console.log('💳 Loading payments...');
            this.ui.showSectionLoading('paymentsContent', 'Loading payments...');
            
            this.payments = await this.db.getPayments();
            this.renderPaymentsTable(this.payments);
            
            this.ui.showToast('Payments loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Error loading payments:', error);
            this.ui.showToast('Error loading payments', 'error');
        } finally {
            this.ui.hideSectionLoading('paymentsContent');
        }
    }

    renderBillsTable(bills) {
        const tbody = document.getElementById('billsTableBody');
        if (!tbody) return;

        if (bills.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-file-invoice"></i>
                        <br>No bills found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bills.map(bill => `
            <tr>
                <td>${bill.bill_number || 'N/A'}</td>
                <td>${bill.customer_name || 'N/A'}</td>
                <td>${Utils.formatCurrency(bill.total_amount)}</td>
                <td>${Utils.formatCurrency(bill.gst_amount)}</td>
                <td>${Utils.formatDate(bill.bill_date)}</td>
                <td>
                    <span class="status-${bill.status}">${bill.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary" onclick="app.getManagers().billing.viewBill('${bill.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${bill.status === 'pending' ? `
                            <button class="btn-secondary" onclick="app.getManagers().billing.markAsPaid('${bill.id}')">
                                <i class="fas fa-check"></i> Paid
                            </button>
                        ` : ''}
                        <button class="btn-secondary" onclick="app.getManagers().billing.deleteBill('${bill.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderCustomersTable(customers) {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <i class="fas fa-user-friends"></i>
                        <br>No customers found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.total_bills || 0}</td>
                <td>${Utils.formatCurrency(customer.total_amount || 0)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary" onclick="app.getManagers().billing.editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-secondary" onclick="app.getManagers().billing.deleteCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPendingTable(bills) {
        const tbody = document.getElementById('pendingTableBody');
        if (!tbody) return;

        if (bills.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data">
                        <i class="fas fa-clock"></i>
                        <br>No pending bills found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bills.map(bill => `
            <tr>
                <td>${bill.bill_number || 'N/A'}</td>
                <td>${bill.customer_name || 'N/A'}</td>
                <td>${Utils.formatCurrency(bill.total_amount)}</td>
                <td>${Utils.formatDate(bill.bill_date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary" onclick="app.getManagers().billing.markAsPaid('${bill.id}')">
                            <i class="fas fa-check"></i> Mark Paid
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPaymentsTable(payments) {
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;

        if (payments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <i class="fas fa-credit-card"></i>
                        <br>No payments found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.id?.slice(0, 8) || 'N/A'}</td>
                <td>${payment.bill_number || 'N/A'}</td>
                <td>${payment.customer_name || 'N/A'}</td>
                <td>${Utils.formatCurrency(payment.amount)}</td>
                <td>${Utils.formatDate(payment.payment_date)}</td>
                <td>${payment.payment_method || 'cash'}</td>
            </tr>
        `).join('');
    }

    showAddBillModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to create bills', 'error');
            return;
        }

        this.ui.showModal('billModal');
        this.billItems = [];
        this.renderBillItems();
        this.calculateBillTotal();
        
        // Generate bill number
        const billNumber = `BILL-${Date.now().toString().slice(-6)}`;
        document.getElementById('billNumber').value = billNumber;
        document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
    }

    addBillItem() {
        const itemId = Utils.generateId();
        this.billItems.push({
            id: itemId,
            description: '',
            quantity: 1,
            price: 0,
            amount: 0
        });
        this.renderBillItems();
    }

    renderBillItems() {
        const container = document.getElementById('billItems');
        if (!container) return;

        container.innerHTML = this.billItems.map((item, index) => `
            <div class="bill-item" data-item-id="${item.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" value="${item.description}" 
                               oninput="app.getManagers().billing.updateBillItem('${item.id}', 'description', this.value)"
                               placeholder="Item description" required>
                    </div>
                    <div class="form-group">
                        <label>Quantity</label>
                        <input type="number" value="${item.quantity}" min="1"
                               oninput="app.getManagers().billing.updateBillItem('${item.id}', 'quantity', this.value)" required>
                    </div>
                    <div class="form-group">
                        <label>Price (₹)</label>
                        <input type="number" value="${item.price}" step="0.01" min="0"
                               oninput="app.getManagers().billing.updateBillItem('${item.id}', 'price', this.value)" required>
                    </div>
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="text" value="${Utils.formatCurrency(item.amount)}" readonly>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn-secondary" 
                                onclick="app.getManagers().billing.removeBillItem('${item.id}')"
                                style="margin-top: 1.5rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateBillItem(itemId, field, value) {
        const item = this.billItems.find(i => i.id === itemId);
        if (item) {
            item[field] = field === 'quantity' ? parseInt(value) || 0 : 
                         field === 'price' ? parseFloat(value) || 0 : value;
            
            if (field === 'quantity' || field === 'price') {
                item.amount = item.quantity * item.price;
            }
            
            this.renderBillItems();
            this.calculateBillTotal();
        }
    }

    removeBillItem(itemId) {
        this.billItems = this.billItems.filter(item => item.id !== itemId);
        this.renderBillItems();
        this.calculateBillTotal();
    }

    calculateBillTotal() {
        const subTotal = this.billItems.reduce((sum, item) => sum + item.amount, 0);
        const gstRate = parseFloat(document.getElementById('billGst')?.value) || 0;
        const gstAmount = (subTotal * gstRate) / 100;
        const totalAmount = subTotal + gstAmount;

        const subTotalEl = document.getElementById('subTotal');
        const gstAmountInput = document.getElementById('gstAmountInput');
        const totalAmountEl = document.getElementById('totalAmount');

        if (subTotalEl) subTotalEl.textContent = Utils.formatCurrency(subTotal);
        if (gstAmountInput) gstAmountInput.value = Utils.formatCurrency(gstAmount);
        if (totalAmountEl) totalAmountEl.textContent = Utils.formatCurrency(totalAmount);
    }

    async handleBillSubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to create bills', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Creating Bill...');

        try {
            const billNumber = document.getElementById('billNumber').value;
            const billDate = document.getElementById('billDate').value;
            const customerName = document.getElementById('customerName').value.trim();
            const customerPhone = document.getElementById('customerPhone').value.trim();
            const customerEmail = document.getElementById('customerEmail').value.trim();
            const gstRate = parseFloat(document.getElementById('billGst').value) || 0;

            // Validate inputs
            if (this.billItems.length === 0) {
                this.ui.showToast('Please add at least one bill item', 'error');
                return;
            }

            if (!customerName) {
                this.ui.showToast('Customer name is required', 'error');
                return;
            }

            if (!customerPhone) {
                this.ui.showToast('Customer phone is required', 'error');
                return;
            }

            const subTotal = this.billItems.reduce((sum, item) => sum + item.amount, 0);
            const gstAmount = (subTotal * gstRate) / 100;
            const totalAmount = subTotal + gstAmount;

            const billData = {
                bill_number: billNumber,
                bill_date: billDate,
                customer_name: Utils.sanitizeInput(customerName),
                customer_phone: Utils.sanitizeInput(customerPhone),
                customer_email: customerEmail ? Utils.sanitizeInput(customerEmail) : null,
                items: JSON.stringify(this.billItems),
                sub_total: subTotal,
                gst_rate: gstRate,
                gst_amount: gstAmount,
                total_amount: totalAmount,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            await this.db.create('bills', billData);
            this.ui.showToast('Bill created successfully', 'success');

            this.ui.hideModal('billModal');
            await this.loadBills();
            await this.loadPendingBills();
        } catch (error) {
            console.error('Error saving bill:', error);
            this.ui.showToast('Error saving bill: ' + error.message, 'error');
        } finally {
            resetButton();
        }
    }

    async markAsPaid(billId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to update bills', 'error');
            return;
        }

        if (!confirm('Mark this bill as paid?')) return;

        try {
            this.ui.showLoading('Updating bill...');
            
            // Update bill status
            await this.db.update('bills', billId, { status: 'paid' });
            
            // Create payment record
            const bill = this.bills.find(b => b.id === billId);
            
            if (bill) {
                const paymentData = {
                    bill_id: billId,
                    bill_number: bill.bill_number,
                    customer_name: bill.customer_name,
                    amount: bill.total_amount,
                    payment_method: 'cash',
                    payment_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString()
                };
                
                await this.db.create('payments', paymentData);
            }

            this.ui.showToast('Bill marked as paid', 'success');
            await this.loadBills();
            await this.loadPendingBills();
            await this.loadPayments();
        } catch (error) {
            console.error('Error updating bill:', error);
            this.ui.showToast('Error updating bill: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async deleteBill(billId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to delete bills', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this bill?')) return;

        try {
            this.ui.showLoading('Deleting bill...');
            await this.db.delete('bills', billId);
            this.ui.showToast('Bill deleted successfully', 'success');
            await this.loadBills();
            await this.loadPendingBills();
        } catch (error) {
            console.error('Error deleting bill:', error);
            this.ui.showToast('Error deleting bill: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    // Customer Management
    showAddCustomerModal() {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to manage customers', 'error');
            return;
        }

        this.ui.showModal('customerModal');
        document.getElementById('customerModalTitle').textContent = 'Add Customer';
        document.getElementById('customerForm').reset();
        document.getElementById('editCustomerId').value = '';
    }

    async editCustomer(customerId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to edit customers', 'error');
            return;
        }

        try {
            this.ui.showLoading('Loading customer...');
            const customer = this.customers.find(c => c.id === customerId);

            if (customer) {
                document.getElementById('customerModalTitle').textContent = 'Edit Customer';
                document.getElementById('editCustomerId').value = customer.id;
                document.getElementById('customerNameInput').value = customer.name;
                document.getElementById('customerPhoneInput').value = customer.phone || '';
                document.getElementById('customerEmailInput').value = customer.email || '';
                document.getElementById('customerAddress').value = customer.address || '';

                this.ui.showModal('customerModal');
            } else {
                this.ui.showToast('Customer not found', 'error');
            }
        } catch (error) {
            console.error('Error loading customer:', error);
            this.ui.showToast('Error loading customer', 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    async handleCustomerSubmit(e) {
        e.preventDefault();

        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to manage customers', 'error');
            return;
        }

        const customerId = document.getElementById('editCustomerId').value;
        const name = document.getElementById('customerNameInput').value.trim();
        const phone = document.getElementById('customerPhoneInput').value.trim();
        const email = document.getElementById('customerEmailInput').value.trim();
        const address = document.getElementById('customerAddress').value.trim();

        // Validate inputs
        if (!name) {
            this.ui.showToast('Customer name is required', 'error');
            return;
        }

        if (!phone) {
            this.ui.showToast('Customer phone is required', 'error');
            return;
        }

        if (email && !Utils.validateEmail(email)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Saving...');

        try {
            const customerData = {
                name: Utils.sanitizeInput(name),
                phone: Utils.sanitizeInput(phone),
                email: email ? Utils.sanitizeInput(email) : null,
                address: address ? Utils.sanitizeInput(address) : null
            };

            if (customerId) {
                await this.db.update('customers', customerId, customerData);
                this.ui.showToast('Customer updated successfully', 'success');
            } else {
                customerData.created_at = new Date().toISOString();
                await this.db.create('customers', customerData);
                this.ui.showToast('Customer created successfully', 'success');
            }

            this.ui.hideModal('customerModal');
            await this.loadCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            this.ui.showToast('Error saving customer: ' + error.message, 'error');
        } finally {
            resetButton();
        }
    }

    async deleteCustomer(customerId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to delete customers', 'error');
            return;
        }

        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.ui.showToast('Customer not found', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete customer "${customer.name}"?`)) return;

        try {
            this.ui.showLoading('Deleting customer...');
            await this.db.delete('customers', customerId);
            this.ui.showToast('Customer deleted successfully', 'success');
            await this.loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            this.ui.showToast('Error deleting customer: ' + error.message, 'error');
        } finally {
            this.ui.hideLoading();
        }
    }

    // Export methods
    async exportBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Insufficient permissions to export bills', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing bills data...');
            const bills = await this.db.getBills();
            
            if (bills.length === 0) {
                this.ui.showToast('No bills to export', 'warning');
                return;
            }

            const exportData = bills.map(bill => ({
                'Bill Number': bill.bill_number,
                'Customer': bill.customer_name,
                'Date': Utils.formatDate(bill.bill_date),
                'Sub Total': bill.sub_total,
                'GST Amount': bill.gst_amount,
                'Total Amount': bill.total_amount,
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
            this.ui.showToast('Error exporting bills: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportCustomers() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Insufficient permissions to export customers', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing customers data...');
            const customers = await this.db.getCustomers();
            
            if (customers.length === 0) {
                this.ui.showToast('No customers to export', 'warning');
                return;
            }

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
            this.ui.showToast('Error exporting customers: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportPendingBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Insufficient permissions to export pending bills', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing pending bills data...');
            const bills = await this.db.getBills();
            const pendingBills = bills.filter(bill => bill.status === 'pending');
            
            if (pendingBills.length === 0) {
                this.ui.showToast('No pending bills to export', 'warning');
                return;
            }

            const exportData = pendingBills.map(bill => ({
                'Bill Number': bill.bill_number,
                'Customer': bill.customer_name,
                'Amount': bill.total_amount,
                'Date': Utils.formatDate(bill.bill_date),
                'Due Date': Utils.formatDate(bill.bill_date)
            }));
            
            if (window.exportManager) {
                await window.exportManager.exportToExcel(exportData, 'pending_bills_export', 'Pending Bills Export');
            } else {
                Utils.exportToExcel(exportData, 'pending_bills_export');
            }
            
            this.ui.showToast('Pending bills exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting pending bills:', error);
            this.ui.showToast('Error exporting pending bills: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportPayments() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Insufficient permissions to export payments', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing payments data...');
            const payments = await this.db.getPayments();
            
            if (payments.length === 0) {
                this.ui.showToast('No payments to export', 'warning');
                return;
            }

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
            this.ui.showToast('Error exporting payments: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // View bill details
    async viewBill(billId) {
        try {
            const bill = this.bills.find(b => b.id === billId);
            if (!bill) {
                this.ui.showToast('Bill not found', 'error');
                return;
            }

            // Create a simple bill view modal
            const billDetails = `
                <div class="bill-details">
                    <h3>Bill Details - ${bill.bill_number}</h3>
                    <div class="bill-info">
                        <p><strong>Customer:</strong> ${bill.customer_name}</p>
                        <p><strong>Date:</strong> ${Utils.formatDate(bill.bill_date)}</p>
                        <p><strong>Status:</strong> <span class="status-${bill.status}">${bill.status}</span></p>
                    </div>
                    <div class="bill-items">
                        <h4>Items</h4>
                        ${this.renderBillItemsForView(bill)}
                    </div>
                    <div class="bill-summary">
                        <p><strong>Sub Total:</strong> ${Utils.formatCurrency(bill.sub_total)}</p>
                        <p><strong>GST (${bill.gst_rate}%):</strong> ${Utils.formatCurrency(bill.gst_amount)}</p>
                        <p><strong>Total Amount:</strong> ${Utils.formatCurrency(bill.total_amount)}</p>
                    </div>
                </div>
            `;

            // You could create a modal here to display the bill details
            alert(`Bill Details:\n\nCustomer: ${bill.customer_name}\nAmount: ${Utils.formatCurrency(bill.total_amount)}\nStatus: ${bill.status}`);
        } catch (error) {
            console.error('Error viewing bill:', error);
            this.ui.showToast('Error viewing bill details', 'error');
        }
    }

    renderBillItemsForView(bill) {
        try {
            const items = typeof bill.items === 'string' ? JSON.parse(bill.items) : bill.items;
            if (!items || !Array.isArray(items)) return '<p>No items found</p>';

            return `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Description</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Qty</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Price</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
                                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${Utils.formatCurrency(item.price)}</td>
                                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">${Utils.formatCurrency(item.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            return '<p>Error loading items</p>';
        }
    }

    // Get billing statistics
    async getBillingStats() {
        const bills = await this.db.getBills();
        const customers = await this.db.getCustomers();
        const payments = await this.db.getPayments();
        
        const totalSales = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
        const totalGST = bills.reduce((sum, bill) => sum + bill.gst_amount, 0);
        const pendingBills = bills.filter(bill => bill.status === 'pending');
        const totalPending = pendingBills.reduce((sum, bill) => sum + bill.total_amount, 0);

        return {
            totalCustomers: customers.length,
            totalBills: bills.length,
            totalSales,
            totalGST,
            pendingBills: pendingBills.length,
            totalPending,
            totalPayments: payments.length,
            paymentAmount: payments.reduce((sum, payment) => sum + payment.amount, 0)
        };
    }
}

// Make BillingManager available globally
window.BillingManager = BillingManager;