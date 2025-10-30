class CustomerManager {
    constructor(dependencies) {
        // ✅ VALIDATION
        if (!dependencies) throw new Error('CustomerManager: dependencies required');
        if (!dependencies.db) throw new Error('CustomerManager: db required');
        if (!dependencies.ui) throw new Error('CustomerManager: ui required');
        if (!dependencies.auth) throw new Error('CustomerManager: auth required');

        // ✅ ASSIGN DEPENDENCIES
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        // ✅ CUSTOMER DATA
        this.employees = []; // ADD THIS LINE
        this.customers = [];
        this.advancePayments = [];
        this.bills = []; // For balance calculations
        this.filteredCustomers = [];
        this.currentSearchTerm = '';

        // ✅ BIND METHODS
        this.handleCustomerSubmit = this.handleCustomerSubmit.bind(this);
        this.handleCustomerSearch = this.handleCustomerSearch.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
        this.handleAdvancePaymentSubmit = this.handleAdvancePaymentSubmit.bind(this);

        console.log('✅ CustomerManager initialized');
    }

    // ==================== INITIALIZATION ====================

    async initialize() {
        await this.loadCustomers();
        await this.loadAdvancePayments();
        this.setupEventListeners();
        return Promise.resolve();
    }

    async loadCustomers() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                return;
            }

            console.log('👥 Loading customers...');
            this.ui.showSectionLoading('customersContent', 'Loading customers...');

            this.customers = await this.db.getCustomers() || [];
            console.log('✅ Customers loaded:', this.customers.length);

            // Apply current search filter if any
            if (this.currentSearchTerm) {
                this.filteredCustomers = this.customers.filter(customer =>
                    this.customerMatchesSearch(customer, this.currentSearchTerm)
                );
                this.renderCustomersTable(this.filteredCustomers);
            } else {
                this.renderCustomersTable(this.customers);
            }

            this.updateSearchResultsCount();

        } catch (error) {
            console.error('❌ Error loading customers:', error);
            this.ui.showToast('Error loading customers', 'error');
            this.customers = [];
        } finally {
            this.ui.hideSectionLoading('customersContent');
        }
    }

    async loadAdvancePayments() {
        try {
            this.advancePayments = await this.db.getAdvancePayments() || [];
            console.log('✅ Advance payments loaded:', this.advancePayments.length);
        } catch (error) {
            console.error('Error loading advance payments:', error);
            this.advancePayments = [];
        }
    }

    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        console.log('🔗 Setting up customer event listeners...');

        setTimeout(() => {
            // Customer management
            const addCustomerBtn = document.getElementById('addCustomerBtn');
            if (addCustomerBtn) {
                addCustomerBtn.addEventListener('click', () => this.showAddCustomerModal());
            }

            const customerForm = document.getElementById('customerForm');
            if (customerForm) {
                customerForm.addEventListener('submit', (e) => this.handleCustomerSubmit(e));
            }

            // Search functionality
            const customerSearch = document.getElementById('customerSearch');
            if (customerSearch) {
                customerSearch.addEventListener('input', (e) => this.handleCustomerSearch(e.target.value));
                customerSearch.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.handleCustomerSearch(e.target.value);
                });
            }

            // Export buttons
            const exportCustomersBtn = document.getElementById('exportCustomersBtn');
            if (exportCustomersBtn) {
                exportCustomersBtn.addEventListener('click', () => this.showExportOptions());
            }

        }, 100);
    }

    // ==================== CUSTOMER MANAGEMENT ====================

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

        if (!Utils.validatePhone(phone)) {
            this.ui.showToast('Please enter a valid 10-digit phone number', 'error');
            return;
        }

        if (email && !Utils.validateEmail(email)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return;
        }

        // Check for duplicate phone (excluding current customer when editing)
        const existingCustomer = this.customers.find(c => 
            c.phone === phone && c.id !== customerId
        );
        if (existingCustomer) {
            this.ui.showToast(`Customer with phone ${phone} already exists`, 'error');
            return;
        }

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Saving...');

        try {
            const customerData = {
                name: Utils.sanitizeInput(name),
                phone: Utils.sanitizeInput(phone),
                email: email ? Utils.sanitizeInput(email) : null,
                address: address ? Utils.sanitizeInput(address) : null,
                updated_at: new Date().toISOString()
            };

            if (customerId) {
                // Update existing customer
                await this.db.update('customers', customerId, customerData);
                this.ui.showToast('Customer updated successfully', 'success');
            } else {
                // Create new customer
                customerData.id = `CUST_${Date.now()}`;
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

    // ==================== CUSTOMER DETAILS & ADVANCE PAYMENTS ====================

    async showCustomerDetails(customerId) {
        try {
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) {
                this.ui.showToast('Customer not found', 'error');
                return;
            }

            // Get customer's bills and advance payments
            const customerBills = this.bills.filter(bill =>
                bill.customer_phone === customer.phone
            );
            
            const customerAdvances = this.advancePayments.filter(adv =>
                adv.customer_phone === customer.phone
            );

            const balance = this.calculateCustomerBalance(customer);
            const totalAdvance = customerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
            const totalPending = customerBills.filter(b => b.status === 'pending')
                .reduce((sum, bill) => sum + bill.total_amount, 0);

            const modalHtml = `
                <div id="customerDetailsModal" class="modal">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-user"></i> ${customer.name}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        
                        <div class="customer-details">
                            <div class="detail-row">
                                <label>Phone:</label>
                                <span>${customer.phone || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <label>Email:</label>
                                <span>${customer.email || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <label>Address:</label>
                                <span>${customer.address || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <label>Total Bills:</label>
                                <span>${customerBills.length}</span>
                            </div>
                            <div class="detail-row">
                                <label>Total Advance:</label>
                                <span style="color: #10b981;">${Utils.formatCurrency(totalAdvance)}</span>
                            </div>
                            <div class="detail-row">
                                <label>Pending Bills:</label>
                                <span style="color: #ef4444;">${Utils.formatCurrency(totalPending)}</span>
                            </div>
                            <div class="detail-row">
                                <label>Current Balance:</label>
                                <span>${this.formatBalance(balance)}</span>
                            </div>
                        </div>

                        <div class="customer-actions" style="margin: 1.5rem 0; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn-primary" id="addSaleBtn">
                                <i class="fas fa-plus"></i> Add New Sale
                            </button>
                            <button class="btn-secondary" id="addAdvanceBtn">
                                <i class="fas fa-money-bill-wave"></i> Add Advance
                            </button>
                            <button class="btn-secondary" id="editCustomerBtn">
                                <i class="fas fa-edit"></i> Edit Customer
                            </button>
                        </div>

                        <!-- Advance Payments Section -->
                        <div class="customer-section">
                            <h4><i class="fas fa-money-bill-wave"></i> Advance Payments</h4>
                            ${customerAdvances.length === 0 ?
                                '<p class="no-data">No advance payments</p>' :
                                `<div class="advance-list">
                                    ${customerAdvances.map(advance => `
                                        <div class="advance-item">
                                            <div class="advance-info">
                                                <strong>${Utils.formatCurrency(advance.amount)}</strong>
                                                <span>${Utils.formatDate(advance.payment_date)}</span>
                                            </div>
                                            <div class="advance-notes">
                                                ${advance.notes || 'No notes'}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>`
                            }
                        </div>

                        <!-- Recent Bills Section -->
                        <div class="customer-section">
                            <h4><i class="fas fa-file-invoice"></i> Recent Bills</h4>
                            ${customerBills.length === 0 ?
                                '<p class="no-data">No bills found</p>' :
                                `<div class="bills-list">
                                    ${customerBills.slice(0, 10).map(bill => `
                                        <div class="bill-item-summary">
                                            <div class="bill-info">
                                                <strong>${bill.bill_number}</strong>
                                                <span>${Utils.formatDate(bill.bill_date)}</span>
                                            </div>
                                            <div class="bill-amount">
                                                ${Utils.formatCurrency(bill.total_amount)}
                                                <span class="status-${bill.status}">${bill.status}</span>
                                            </div>
                                            <div class="bill-actions">
                                                <button class="btn-icon view-bill-btn" data-bill-id="${bill.id}">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>`
                            }
                        </div>

                        <div class="modal-actions">
                            <button class="btn-secondary" id="closeCustomerDetailsBtn">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showCustomModal(modalHtml, 'customerDetailsModal');

            // Add event listeners after modal is shown
            setTimeout(() => {
                const addSaleBtn = document.getElementById('addSaleBtn');
                const addAdvanceBtn = document.getElementById('addAdvanceBtn');
                const editCustomerBtn = document.getElementById('editCustomerBtn');
                const closeBtn = document.getElementById('closeCustomerDetailsBtn');

                if (addSaleBtn) {
                    addSaleBtn.addEventListener('click', () => {
                        this.closeCustomerDetails();
                        // Trigger billing manager to add sale
                        if (window.app && window.app.getManagers().billing) {
                            window.app.getManagers().billing.showAddBillModal(customer);
                        }
                    });
                }

                if (addAdvanceBtn) {
                    addAdvanceBtn.addEventListener('click', () => this.showAddAdvanceModal(customer.id));
                }

                if (editCustomerBtn) {
                    editCustomerBtn.addEventListener('click', () => this.editCustomer(customer.id));
                }

                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.closeCustomerDetails());
                }

                // Add event listeners for bill buttons
                document.querySelectorAll('.view-bill-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const billId = e.currentTarget.getAttribute('data-bill-id');
                        if (window.app && window.app.getManagers().billing) {
                            window.app.getManagers().billing.viewBill(billId);
                        }
                    });
                });

            }, 100);

        } catch (error) {
            console.error('Error showing customer details:', error);
            this.ui.showToast('Error loading customer details', 'error');
        }
    }

    closeCustomerDetails() {
        this.ui.hideModal('customerDetailsModal');
        const modal = document.getElementById('customerDetailsModal');
        if (modal) {
            modal.remove();
        }
    }

    // ==================== ADVANCE PAYMENT MANAGEMENT ====================

    showAddAdvanceModal(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.ui.showToast('Customer not found', 'error');
            return;
        }

        const modalHtml = `
            <div id="advancePaymentModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-money-bill-wave"></i> Add Advance Payment</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <form id="advancePaymentForm">
                        <div class="form-group">
                            <label>Customer</label>
                            <input type="text" value="${customer.name} (${customer.phone})" readonly class="form-control">
                        </div>
                        
                        <div class="form-group">
                            <label>Amount (₹) *</label>
                            <input type="number" id="advanceAmount" step="0.01" min="1" required class="form-control" placeholder="Enter amount">
                        </div>
                        
                        <div class="form-group">
                            <label>Payment Date *</label>
                            <input type="date" id="advanceDate" required class="form-control" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select id="advanceMethod" class="form-control">
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="upi">UPI</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes (Optional)</label>
                            <textarea id="advanceNotes" class="form-control" placeholder="Add any notes about this payment"></textarea>
                        </div>

                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" id="cancelAdvanceBtn">
                                Cancel
                            </button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Save Advance
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'advancePaymentModal');
        
        // Add event listeners after modal is shown
        setTimeout(() => {
            const form = document.getElementById('advancePaymentForm');
            const cancelBtn = document.getElementById('cancelAdvanceBtn');
            const closeBtn = document.querySelector('#advancePaymentModal .modal-close');

            if (form) {
                form.addEventListener('submit', (e) => this.handleAdvancePaymentSubmit(e, customer));
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeAdvanceModal());
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeAdvanceModal());
            }
        }, 100);
    }

    closeAdvanceModal() {
        this.ui.hideModal('advancePaymentModal');
        const modal = document.getElementById('advancePaymentModal');
        if (modal) {
            modal.remove();
        }
    }

    async handleAdvancePaymentSubmit(e, customer) {
        e.preventDefault();

        const button = e.target.querySelector('button[type="submit"]');
        const resetButton = this.ui.showButtonLoading(button, 'Saving Advance...');

        try {
            const amount = parseFloat(document.getElementById('advanceAmount').value);
            const paymentDate = document.getElementById('advanceDate').value;
            const paymentMethod = document.getElementById('advanceMethod').value;
            const notes = document.getElementById('advanceNotes').value;

            if (!amount || amount <= 0) {
                this.ui.showToast('Please enter a valid amount', 'error');
                return;
            }

            const advanceData = {
                customer_id: customer.id,
                customer_name: customer.name,
                customer_phone: customer.phone,
                amount: amount,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                notes: notes ? Utils.sanitizeInput(notes) : null,
                created_at: new Date().toISOString()
            };

            advanceData.id = `ADV_${customer.id}_${Date.now()}`;

            await this.db.create('advance_payments', advanceData);
            
            this.ui.showToast('Advance payment added successfully', 'success');
            this.closeAdvanceModal();
            await this.loadAdvancePayments();
            
            // Refresh customer details if open
            if (document.getElementById('customerDetailsModal')) {
                const currentCustomerId = customer.id;
                this.closeCustomerDetails();
                setTimeout(() => {
                    this.showCustomerDetails(currentCustomerId);
                }, 300);
            }

        } catch (error) {
            console.error('Error saving advance payment:', error);
            this.ui.showToast('Error saving advance payment: ' + error.message, 'error');
        } finally {
            resetButton();
        }
    }

    // ==================== SEARCH & FILTER ====================

    handleCustomerSearch(query) {
        const searchTerm = query.trim().toLowerCase();
        this.currentSearchTerm = searchTerm;

        if (searchTerm === '') {
            this.clearSearch();
            return;
        }

        this.filteredCustomers = this.customers.filter(customer =>
            this.customerMatchesSearch(customer, searchTerm)
        );

        this.renderCustomersTable(this.filteredCustomers);
        this.updateSearchResultsCount();
    }

    customerMatchesSearch(customer, searchTerm) {
        if (!searchTerm) return true;

        const searchFields = [
            customer.name?.toLowerCase(),
            customer.phone?.toLowerCase(),
            customer.email?.toLowerCase(),
            customer.address?.toLowerCase()
        ];

        return searchFields.some(field =>
            field && field.includes(searchTerm)
        );
    }

    clearSearch() {
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            searchInput.value = '';
        }

        this.currentSearchTerm = '';
        this.filteredCustomers = [];
        this.renderCustomersTable(this.customers);
        this.updateSearchResultsCount();
    }

    updateSearchResultsCount() {
        const resultsCount = document.getElementById('searchResultsCount');
        const totalCustomers = this.customers.length;
        const showingCustomers = this.currentSearchTerm ? this.filteredCustomers.length : totalCustomers;

        if (resultsCount) {
            if (this.currentSearchTerm) {
                resultsCount.innerHTML = `
                    <span>
                        Showing ${showingCustomers} of ${totalCustomers} customers
                        <span class="search-term">for "${this.currentSearchTerm}"</span>
                    </span>
                    <button id="clearSearchBtn" class="btn-secondary btn-sm">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                `;

                // Add clear search button listener
                setTimeout(() => {
                    const clearBtn = document.getElementById('clearSearchBtn');
                    if (clearBtn) {
                        clearBtn.addEventListener('click', () => this.clearSearch());
                    }
                }, 100);
            } else {
                resultsCount.innerHTML = `Showing all ${totalCustomers} customers`;
            }
        }
    }

    // ==================== RENDER METHODS ====================

    renderCustomersTable(customers) {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-user-friends"></i>
                        <br>${this.currentSearchTerm ? 'No customers found matching your search' : 'No customers found'}
                        ${this.currentSearchTerm ? `
                            <br>
                            <button class="btn-primary btn-sm" onclick="app.getManagers().customer.clearSearch()" style="margin-top: 10px;">
                                <i class="fas fa-times"></i> Clear Search
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = customers.map(customer => {
            const balance = this.calculateCustomerBalance(customer);
            const customerBills = this.bills.filter(bill => bill.customer_phone === customer.phone);
            const pendingBills = customerBills.filter(bill => bill.status === 'pending');
            
            return `
            <tr class="customer-row" data-customer-id="${customer.id}">
                <td>
                    <a href="javascript:void(0)" 
                       onclick="app.getManagers().customer.showCustomerDetails('${customer.id}')"
                       class="customer-link">
                       ${customer.name}
                    </a>
                </td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customerBills.length}</td>
                <td>${pendingBills.length}</td>
                <td>${this.formatBalance(balance)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="app.getManagers().customer.showCustomerDetails('${customer.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="app.getManagers().customer.editCustomer('${customer.id}')" title="Edit Customer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="app.getManagers().customer.deleteCustomer('${customer.id}')" title="Delete Customer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    // ==================== UTILITY METHODS ====================

    calculateCustomerBalance(customer) {
        if (!this.bills) return 0;
        
        const customerBills = this.bills.filter(bill => 
            bill.customer_phone === customer.phone && bill.status === 'pending'
        );
        const totalPending = customerBills.reduce((sum, bill) => sum + bill.total_amount, 0);
        
        const customerAdvances = this.advancePayments.filter(adv => 
            adv.customer_phone === customer.phone
        );
        const totalAdvance = customerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
        
        return totalAdvance - totalPending;
    }

    formatBalance(balance) {
        const isPositive = balance >= 0;
        const color = isPositive ? '#10b981' : '#ef4444';
        const sign = isPositive ? '+' : '';
        return `<span style="color: ${color}; font-weight: bold;">${sign}${Utils.formatCurrency(balance)}</span>`;
    }

    findCustomerByPhone(phone) {
        return this.customers.find(customer => customer.phone === phone);
    }

    // ==================== MODAL MANAGEMENT ====================

    showCustomModal(html, modalId) {
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', html);
        this.ui.showModal(modalId);
    }

    // ==================== DELETE CUSTOMER ====================

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

        // Check if customer has bills
        const customerBills = this.bills.filter(bill => bill.customer_phone === customer.phone);
        if (customerBills.length > 0) {
            this.ui.showToast('Cannot delete customer with existing bills', 'error');
            return;
        }

        this.showConfirmationModal(
            'Delete Customer',
            `Are you sure you want to delete customer "<strong>${customer.name}</strong>"? This action cannot be undone.`,
            async () => {
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
        );
    }

    showConfirmationModal(title, message, confirmCallback, cancelCallback = null) {
        const modalHtml = `
        <div id="confirmationModal" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="confirmation-body">
                    <div class="confirmation-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="confirmation-message">
                        <p>${message}</p>
                    </div>
                </div>

                <div class="confirmation-actions">
                    <button class="btn-secondary" id="confirmCancelBtn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button class="btn-danger" id="confirmOkBtn">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                </div>
            </div>
        </div>
    `;

        this.showCustomModal(modalHtml, 'confirmationModal');

        // Add event listeners
        setTimeout(() => {
            const confirmBtn = document.getElementById('confirmOkBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');
            const closeBtn = document.querySelector('#confirmationModal .modal-close');

            const closeModal = () => {
                this.ui.hideModal('confirmationModal');
                const modal = document.getElementById('confirmationModal');
                if (modal) modal.remove();
                if (cancelCallback) cancelCallback();
            };

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    closeModal();
                    confirmCallback();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeModal);
            }

            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }
        }, 100);
    }

    // ==================== EXPORT METHODS ====================

    showExportOptions() {
        const exportHtml = `
            <div id="exportModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Export Customers</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="export-options">
                        <div class="export-option" onclick="app.getManagers().customer.exportCustomersToExcel()">
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
                        
                        <div class="export-option" onclick="app.getManagers().customer.exportCustomersToPDF()">
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
                        <button class="btn-secondary" onclick="app.getManagers().customer.closeExportModal()">
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

    async exportCustomersToExcel() {
        await this.exportCustomers('excel');
        this.closeExportModal();
    }

    async exportCustomersToPDF() {
        await this.exportCustomers('pdf');
        this.closeExportModal();
    }

    async exportCustomers(format = 'excel') {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Insufficient permissions to export customers', 'error');
                return;
            }

            this.ui.showExportProgress('Preparing customers data...');

            if (this.customers.length === 0) {
                this.ui.showToast('No customers to export', 'warning');
                return;
            }

            const exportData = this.customers.map(customer => {
                const balance = this.calculateCustomerBalance(customer);
                const customerBills = this.bills.filter(bill => bill.customer_phone === customer.phone);
                
                return {
                    'Name': customer.name,
                    'Phone': customer.phone,
                    'Email': customer.email || '',
                    'Address': customer.address || '',
                    'Total Bills': customerBills.length,
                    'Pending Bills': customerBills.filter(b => b.status === 'pending').length,
                    'Balance': balance,
                    'Created Date': Utils.formatDate(customer.created_at)
                };
            });

            const title = 'Customers Report';
            const filename = `customers_export_${new Date().toISOString().split('T')[0]}`;

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

            this.ui.showToast(`Customers exported to ${format.toUpperCase()} successfully`, 'success');
        } catch (error) {
            console.error('Error exporting customers:', error);
            this.ui.showToast('Error exporting customers: ' + error.message, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // ==================== DATA SYNC METHODS ====================

    updateBillsData(bills) {
        this.bills = bills || [];
    }

    async refreshCustomerData() {
        await this.loadCustomers();
        this.renderCustomersTable(this.customers);
    }

    // ==================== CLEANUP ====================

    cleanup() {
        console.log('🧹 Cleaning up CustomerManager...');
        // Cleanup any event listeners or timeouts if needed
    }
}

window.CustomerManager = CustomerManager;