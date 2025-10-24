class BillingManager {
    constructor(dependencies) {
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        this.billItems = [];
        this.customers = [];
        this.bills = [];
        this.payments = [];
        this.products = [];
        this.customProducts = [];
        this.selectedCustomer = null;
        this.editingBillId = null;
    }

    async initialize() {
        await this.loadProducts();
        this.loadCustomProducts();
        this.setupEventListeners();
        return Promise.resolve();
    }

    async loadProducts() {
        try {
            const products = await this.db.getProducts();
            this.products = products || [];

            if (this.products.length === 0) {
                this.products = [
                    { id: '1', name: 'Cement', unit: 'bag' },
                    { id: '2', name: 'Bricks', unit: 'piece' },
                    { id: '3', name: 'Hollow Blocks', unit: 'piece' }
                ];
            }

            console.log('📦 Products loaded:', this.products.length);
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = [
                { id: '1', name: 'Cement', unit: 'bag' },
                { id: '2', name: 'Bricks', unit: 'piece' },
                { id: '3', name: 'Hollow Blocks', unit: 'piece' }
            ];
        }
    }

    loadCustomProducts() {
        try {
            const saved = localStorage.getItem('customProducts');
            this.customProducts = saved ? JSON.parse(saved) : [];
        } catch (error) {
            this.customProducts = [];
        }
    }

    saveCustomProducts() {
        try {
            localStorage.setItem('customProducts', JSON.stringify(this.customProducts));
        } catch (error) {
            console.error('Error saving custom products:', error);
        }
    }

    addCustomProduct(productName, unit = 'piece') {
        const existing = this.customProducts.find(p =>
            p.name.toLowerCase() === productName.toLowerCase()
        );

        if (!existing) {
            const newProduct = {
                id: `custom_${Date.now()}`,
                name: productName,
                unit: unit,
                is_custom: true
            };

            this.customProducts.push(newProduct);
            this.saveCustomProducts();
        }

        return existing || this.customProducts[this.customProducts.length - 1];
    }

    setupEventListeners() {
        console.log('🔗 Setting up billing event listeners...');

        setTimeout(() => {
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

            // Customer search
            const customerSearch = document.getElementById('customerSearch');
            if (customerSearch) {
                customerSearch.addEventListener('input', (e) => this.handleCustomerSearch(e.target.value));
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

            // Export buttons - show export options modal
            const exportBillsBtn = document.getElementById('exportBillsBtn');
            if (exportBillsBtn) {
                exportBillsBtn.addEventListener('click', () => this.showExportOptions('bills'));
            }

            const exportCustomersBtn = document.getElementById('exportCustomersBtn');
            if (exportCustomersBtn) {
                exportCustomersBtn.addEventListener('click', () => this.showExportOptions('customers'));
            }

            const exportPendingBtn = document.getElementById('exportPendingBtn');
            if (exportPendingBtn) {
                exportPendingBtn.addEventListener('click', () => this.showExportOptions('pending'));
            }

            const exportPaymentsBtn = document.getElementById('exportPaymentsBtn');
            if (exportPaymentsBtn) {
                exportPaymentsBtn.addEventListener('click', () => this.showExportOptions('payments'));
            }

            // GST rate change listener
            const billGstInput = document.getElementById('billGst');
            if (billGstInput) {
                billGstInput.addEventListener('input', () => this.calculateBillTotal());
            }

        }, 100);
    }

    // Check if user can edit bill
    canEditBill(bill) {
        const currentUser = this.auth.getCurrentUser();
        if (!currentUser) return false;

        // Admin can edit any bill
        if (currentUser.role === 'admin') return true;

        // Supervisor can only edit last bill (most recent)
        if (currentUser.role === 'supervisor') {
            const sortedBills = [...this.bills].sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
            const lastBill = sortedBills[0];
            return lastBill && lastBill.id === bill.id;
        }

        return false;
    }

    showAddBillModal(customer = null) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to create bills', 'error');
            return;
        }

        this.ui.showModal('billModal');
        this.billItems = [];
        this.selectedCustomer = customer;
        this.editingBillId = null;
        this.renderBillItems();
        this.calculateBillTotal();

        // Generate bill number
        const billNumber = `BILL-${Date.now().toString().slice(-6)}`;
        document.getElementById('billNumber').value = billNumber;
        document.getElementById('billDate').value = new Date().toISOString().split('T')[0];

        // Set customer fields if customer provided
        if (customer) {
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerEmail').value = customer.email || '';
        } else {
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('customerEmail').value = '';
        }

        // Reset customer search
        const customerSearch = document.getElementById('customerSearch');
        if (customerSearch) customerSearch.value = '';

        this.hideCustomerResults();
        document.getElementById('billModalTitle').textContent = 'Add Bill';
    }

    async editBill(billId) {
        try {
            const bill = this.bills.find(b => b.id === billId);
            if (!bill) {
                this.ui.showToast('Bill not found', 'error');
                return;
            }

            // Check permissions
            if (!this.canEditBill(bill)) {
                this.ui.showToast('You do not have permission to edit this bill', 'error');
                return;
            }

            this.ui.showModal('billModal');
            this.billItems = [];
            this.editingBillId = billId;

            // Load bill items
            if (bill.items && typeof bill.items === 'string') {
                const items = JSON.parse(bill.items);
                this.billItems = items.map(item => ({
                    id: Utils.generateId(),
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                    amount: item.amount,
                    is_custom: item.is_custom,
                    custom_product_name: item.custom_product_name
                }));
            }

            // Fill form fields
            document.getElementById('billNumber').value = bill.bill_number;
            document.getElementById('billDate').value = bill.bill_date;
            document.getElementById('customerName').value = bill.customer_name;
            document.getElementById('customerPhone').value = bill.customer_phone || '';
            document.getElementById('customerEmail').value = bill.customer_email || '';
            document.getElementById('billGst').value = bill.gst_rate;

            this.renderBillItems();
            this.calculateBillTotal();
            document.getElementById('billModalTitle').textContent = 'Edit Bill';

        } catch (error) {
            console.error('Error loading bill for edit:', error);
            this.ui.showToast('Error loading bill', 'error');
        }
    }

    // Customer Management with Add Sale option
    async showCustomerDetails(customerId) {
        try {
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) {
                this.ui.showToast('Customer not found', 'error');
                return;
            }

            // Get customer's bills
            const customerBills = this.bills.filter(bill =>
                bill.customer_phone === customer.phone ||
                bill.customer_name === customer.name
            );

            const modalHtml = `
                <div id="customerDetailsModal" class="modal">
                    <div class="modal-content" style="max-width: 700px;">
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
                                <label>Total Bills:</label>
                                <span>${customer.total_bills || 0}</span>
                            </div>
                            <div class="detail-row">
                                <label>Total Amount:</label>
                                <span>${Utils.formatCurrency(customer.total_amount || 0)}</span>
                            </div>
                        </div>

                        <div class="customer-actions" style="margin: 1.5rem 0;">
                            <button class="btn-primary" onclick="app.getManagers().billing.addSaleToCustomer('${customer.id}')">
                                <i class="fas fa-plus"></i> Add New Sale
                            </button>
                            <button class="btn-secondary" onclick="app.getManagers().billing.editCustomer('${customer.id}')">
                                <i class="fas fa-edit"></i> Edit Customer
                            </button>
                        </div>

                        <div class="customer-bills">
                            <h4>Recent Bills</h4>
                            ${customerBills.length === 0 ?
                    '<p class="no-data">No bills found</p>' :
                    `<div class="bills-list">
                                    ${customerBills.slice(0, 5).map(bill => `
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
                                                <button class="btn-icon" onclick="app.getManagers().billing.viewBill('${bill.id}')">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                ${this.canEditBill(bill) ? `
                                                    <button class="btn-icon" onclick="app.getManagers().billing.editBill('${bill.id}')">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>`
                }
                        </div>

                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="app.getManagers().billing.closeCustomerDetails()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showCustomModal(modalHtml, 'customerDetailsModal');
        } catch (error) {
            console.error('Error showing customer details:', error);
            this.ui.showToast('Error loading customer details', 'error');
        }
    }

    addSaleToCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            this.closeCustomerDetails();
            this.showAddBillModal(customer);
        }
    }

    closeCustomerDetails() {
        this.ui.hideModal('customerDetailsModal');
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

    // Simplified Bill Items - Manual Price Input
    addBillItem() {
        const itemId = Utils.generateId();
        this.billItems.push({
            id: itemId,
            product_id: '',
            product_name: '',
            quantity: 1,
            price: 0,
            amount: 0,
            is_custom: false,
            custom_product_name: ''
        });
        this.renderBillItems();
    }

    renderBillItems() {
        const container = document.getElementById('billItems');
        if (!container) return;

        container.innerHTML = this.billItems.map((item, index) => {
            const allProducts = [...this.products, ...this.customProducts];
            const showCustomInput = item.is_custom || (!item.product_id && item.custom_product_name);

            return `
            <div class="bill-item" data-item-id="${item.id}">
                <div class="form-row">
                    <!-- Product Selection -->
                    <div class="form-group">
                        <label>Product *</label>
                        <select class="product-select" data-item-id="${item.id}" required>
                            <option value="">Select Product</option>
                            ${allProducts.map(product => `
                                <option value="${product.id}" 
                                        ${item.product_id === product.id ? 'selected' : ''}
                                        data-unit="${product.unit}">
                                    ${product.name} (${product.unit})
                                </option>
                            `).join('')}
                            <option value="custom" ${item.is_custom ? 'selected' : ''}>Others (Custom Product)</option>
                        </select>
                    </div>
                    
                    <!-- Custom Product Input -->
                    <div class="form-group custom-product-group" style="${showCustomInput ? '' : 'display: none;'}">
                        <label>Custom Product Name *</label>
                        <input type="text" 
                               class="custom-product-input"
                               data-item-id="${item.id}"
                               value="${item.custom_product_name || ''}" 
                               placeholder="Enter product name"
                               ${showCustomInput ? 'required' : ''}>
                    </div>
                    
                    <!-- Quantity -->
                    <div class="form-group">
                        <label>Quantity *</label>
                        <input type="number" 
                               class="quantity-input"
                               data-item-id="${item.id}"
                               value="${item.quantity}" 
                               min="1"
                               required>
                    </div>
                    
                    <!-- Price - MANUAL INPUT -->
                    <div class="form-group">
                        <label>Price (₹) *</label>
                        <input type="number" 
                               class="price-input"
                               data-item-id="${item.id}"
                               value="${item.price}" 
                               step="0.01" 
                               min="0"
                               placeholder="Enter price"
                               required>
                    </div>
                    
                    <!-- Amount (Auto-calculated) -->
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="text" 
                               class="amount-display"
                               data-item-id="${item.id}"
                               value="${Utils.formatCurrency(item.amount)}" 
                               readonly>
                    </div>
                    
                    <!-- Remove Button -->
                    <div class="form-group">
                        <button type="button" 
                                class="btn-secondary remove-item-btn"
                                data-item-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        this.attachItemEventListeners();
    }

    attachItemEventListeners() {
        // Use event delegation for dynamic elements
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-select')) {
                const itemId = e.target.getAttribute('data-item-id');
                const productId = e.target.value;
                this.handleProductChange(itemId, productId);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                const itemId = e.target.getAttribute('data-item-id');
                const value = e.target.value;
                this.updateBillItem(itemId, 'quantity', parseFloat(value) || 0);
            }

            if (e.target.classList.contains('price-input')) {
                const itemId = e.target.getAttribute('data-item-id');
                const value = e.target.value;
                this.updateBillItem(itemId, 'price', parseFloat(value) || 0);
            }

            if (e.target.classList.contains('custom-product-input')) {
                const itemId = e.target.getAttribute('data-item-id');
                const value = e.target.value;
                this.updateBillItem(itemId, 'custom_product_name', value);

                if (value.trim()) {
                    const item = this.billItems.find(i => i.id === itemId);
                    if (item && !item.is_custom) {
                        item.is_custom = true;
                        const select = document.querySelector(`.product-select[data-item-id="${itemId}"]`);
                        if (select) select.value = 'custom';
                    }
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
                const button = e.target.classList.contains('remove-item-btn') ? e.target : e.target.closest('.remove-item-btn');
                const itemId = button.getAttribute('data-item-id');
                this.removeBillItem(itemId);
            }
        });
    }

    handleProductChange(itemId, productId) {
        const item = this.billItems.find(i => i.id === itemId);
        if (!item) return;

        const allProducts = [...this.products, ...this.customProducts];

        if (productId === 'custom') {
            item.is_custom = true;
            item.product_id = '';
            item.product_name = '';

            const customGroup = document.querySelector(`.custom-product-group[data-item-id="${itemId}"]`) ||
                document.querySelector(`[data-item-id="${itemId}"] .custom-product-group`);
            if (customGroup) customGroup.style.display = 'block';

        } else {
            item.is_custom = false;
            item.custom_product_name = '';

            const product = allProducts.find(p => p.id === productId);
            if (product) {
                item.product_id = product.id;
                item.product_name = product.name;

                const customGroup = document.querySelector(`.custom-product-group[data-item-id="${itemId}"]`) ||
                    document.querySelector(`[data-item-id="${itemId}"] .custom-product-group`);
                if (customGroup) customGroup.style.display = 'none';
            }
        }

        this.updateAmountDisplay(itemId);
        this.calculateBillTotal();
    }

    updateBillItem(itemId, field, value) {
        const item = this.billItems.find(i => i.id === itemId);
        if (!item) return;

        item[field] = value;

        if (field === 'quantity' || field === 'price') {
            item.amount = (item.quantity || 0) * (item.price || 0);
            this.updateAmountDisplay(itemId);
            this.calculateBillTotal();
        }
    }

    updateAmountDisplay(itemId) {
        const item = this.billItems.find(i => i.id === itemId);
        if (!item) return;

        const amountDisplay = document.querySelector(`.amount-display[data-item-id="${itemId}"]`);
        if (amountDisplay) {
            amountDisplay.value = Utils.formatCurrency(item.amount);
        }
    }

    removeBillItem(itemId) {
        this.billItems = this.billItems.filter(item => item.id !== itemId);
        this.renderBillItems();
        this.calculateBillTotal();
    }

    calculateBillTotal() {
        const subTotal = this.billItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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
        const resetButton = this.ui.showButtonLoading(button, 'Saving Bill...');

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

            // Validate all items
            for (const item of this.billItems) {
                if (!item.product_id && !item.is_custom) {
                    this.ui.showToast('Please select a product for all items', 'error');
                    return;
                }

                if (item.is_custom && !item.custom_product_name) {
                    this.ui.showToast('Please enter custom product name', 'error');
                    return;
                }

                if (item.quantity <= 0) {
                    this.ui.showToast('Please enter valid quantity for all items', 'error');
                    return;
                }

                if (item.price <= 0) {
                    this.ui.showToast('Please enter valid price for all items', 'error');
                    return;
                }
            }

            // Process custom products
            const customItems = this.billItems.filter(item => item.is_custom);
            for (const item of customItems) {
                if (item.custom_product_name) {
                    this.addCustomProduct(item.custom_product_name);
                }
            }

            const subTotal = this.billItems.reduce((sum, item) => sum + (item.amount || 0), 0);
            const gstAmount = (subTotal * gstRate) / 100;
            const totalAmount = subTotal + gstAmount;

            // Prepare items for storage
            const itemsForStorage = this.billItems.map(item => ({
                product_id: item.product_id,
                product_name: item.is_custom ? item.custom_product_name : item.product_name,
                description: item.is_custom ? item.custom_product_name : item.product_name,
                quantity: item.quantity,
                price: item.price,
                amount: item.amount,
                is_custom: item.is_custom,
                custom_product_name: item.custom_product_name
            }));

            const billData = {
                bill_number: billNumber,
                bill_date: billDate,
                customer_name: Utils.sanitizeInput(customerName),
                customer_phone: Utils.sanitizeInput(customerPhone),
                customer_email: customerEmail ? Utils.sanitizeInput(customerEmail) : null,
                items: JSON.stringify(itemsForStorage),
                sub_total: subTotal,
                gst_rate: gstRate,
                gst_amount: gstAmount,
                total_amount: totalAmount,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            if (this.editingBillId) {
                // Update existing bill
                await this.db.update('bills', this.editingBillId, billData);
                this.ui.showToast('Bill updated successfully', 'success');
            } else {
                // Create new bill
                await this.db.create('bills', billData);
                this.ui.showToast('Bill created successfully', 'success');
            }

            this.ui.hideModal('billModal');
            await this.loadBills();
            await this.loadPendingBills();
            await this.loadCustomers();

        } catch (error) {
            console.error('Error saving bill:', error);
            this.ui.showToast('Error saving bill: ' + error.message, 'error');
        } finally {
            resetButton();
        }
    }

    // Export Options Modal
    showExportOptions(type) {
        const titles = {
            'bills': 'Bills',
            'customers': 'Customers',
            'pending': 'Pending Bills',
            'payments': 'Payments'
        };

        const exportHtml = `
            <div id="exportModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Export ${titles[type]}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="export-options">
                        <div class="export-option" onclick="app.getManagers().billing.exportToExcel('${type}')">
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
                        
                        <div class="export-option" onclick="app.getManagers().billing.exportToPDF('${type}')">
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
                        <button class="btn-secondary" onclick="app.getManagers().billing.closeExportModal()">
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
    }

    async exportToExcel(type) {
        this.closeExportModal();

        switch (type) {
            case 'bills':
                await this.exportBills();
                break;
            case 'customers':
                await this.exportCustomers();
                break;
            case 'pending':
                await this.exportPendingBills();
                break;
            case 'payments':
                await this.exportPayments();
                break;
        }
    }

    async exportToPDF(type) {
        this.closeExportModal();
        this.ui.showToast('PDF export feature coming soon', 'info');
    }

    // Enhanced View Bill with Styled Modal
    async viewBill(billId) {
        try {
            const bill = this.bills.find(b => b.id === billId);
            if (!bill) {
                this.ui.showToast('Bill not found', 'error');
                return;
            }

            const items = typeof bill.items === 'string' ? JSON.parse(bill.items) : bill.items;

            const modalHtml = `
                <div id="viewBillModal" class="modal">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-file-invoice"></i> Bill Details - ${bill.bill_number}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        
                        <div class="bill-view">
                            <!-- Bill Header -->
                            <div class="bill-header">
                                <div class="bill-info">
                                    <div class="info-row">
                                        <label>Bill Number:</label>
                                        <span>${bill.bill_number}</span>
                                    </div>
                                    <div class="info-row">
                                        <label>Date:</label>
                                        <span>${Utils.formatDate(bill.bill_date)}</span>
                                    </div>
                                    <div class="info-row">
                                        <label>Status:</label>
                                        <span class="status-badge status-${bill.status}">${bill.status}</span>
                                    </div>
                                </div>
                                <div class="customer-info">
                                    <div class="info-row">
                                        <label>Customer:</label>
                                        <span>${bill.customer_name}</span>
                                    </div>
                                    <div class="info-row">
                                        <label>Phone:</label>
                                        <span>${bill.customer_phone || 'N/A'}</span>
                                    </div>
                                    <div class="info-row">
                                        <label>Email:</label>
                                        <span>${bill.customer_email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Bill Items Table -->
                            <div class="bill-items-table">
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map(item => `
                                            <tr>
                                                <td>${item.product_name || item.description}</td>
                                                <td>${item.quantity}</td>
                                                <td>${Utils.formatCurrency(item.price)}</td>
                                                <td>${Utils.formatCurrency(item.amount)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Bill Summary -->
                            <div class="bill-summary-view">
                                <div class="summary-row">
                                    <span>Sub Total:</span>
                                    <span>${Utils.formatCurrency(bill.sub_total)}</span>
                                </div>
                                <div class="summary-row">
                                    <span>GST (${bill.gst_rate}%):</span>
                                    <span>${Utils.formatCurrency(bill.gst_amount)}</span>
                                </div>
                                <div class="summary-row total">
                                    <span>Total Amount:</span>
                                    <span>${Utils.formatCurrency(bill.total_amount)}</span>
                                </div>
                            </div>

                            <!-- Bill Actions -->
                            <div class="bill-actions-view">
                                ${this.canEditBill(bill) ? `
                                    <button class="btn-primary" onclick="app.getManagers().billing.editBill('${bill.id}')">
                                        <i class="fas fa-edit"></i> Edit Bill
                                    </button>
                                ` : ''}
                                ${bill.status === 'pending' ? `
                                    <button class="btn-secondary" onclick="app.getManagers().billing.markAsPaid('${bill.id}')">
                                        <i class="fas fa-check"></i> Mark as Paid
                                    </button>
                                ` : ''}
                                <button class="btn-secondary" onclick="app.getManagers().billing.printBill('${bill.id}')">
                                    <i class="fas fa-print"></i> Print
                                </button>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="app.getManagers().billing.closeViewBill()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showCustomModal(modalHtml, 'viewBillModal');
        } catch (error) {
            console.error('Error viewing bill:', error);
            this.ui.showToast('Error viewing bill details', 'error');
        }
    }

    closeViewBill() {
        this.ui.hideModal('viewBillModal');
    }

    printBill(billId) {
        // Simple print functionality
        window.print();
    }

    // Update renderBillsTable to include edit buttons and customer click
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
                <td>
                    <a href="javascript:void(0)" 
                       onclick="app.getManagers().billing.showCustomerByBill('${bill.id}')"
                       class="customer-link">
                       ${bill.customer_name || 'N/A'}
                    </a>
                </td>
                <td>${Utils.formatCurrency(bill.total_amount)}</td>
                <td>${Utils.formatCurrency(bill.gst_amount)}</td>
                <td>${Utils.formatDate(bill.bill_date)}</td>
                <td>
                    <span class="status-badge status-${bill.status}">${bill.status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="app.getManagers().billing.viewBill('${bill.id}')" title="View Bill">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${this.canEditBill(bill) ? `
                            <button class="btn-icon" onclick="app.getManagers().billing.editBill('${bill.id}')" title="Edit Bill">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${bill.status === 'pending' ? `
                            <button class="btn-icon" onclick="app.getManagers().billing.markAsPaid('${bill.id}')" title="Mark as Paid">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-danger" onclick="app.getManagers().billing.deleteBill('${bill.id}')" title="Delete Bill">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async showCustomerByBill(billId) {
        const bill = this.bills.find(b => b.id === billId);
        if (bill) {
            // Find customer by phone or name
            const customer = this.customers.find(c =>
                c.phone === bill.customer_phone || c.name === bill.customer_name
            );
            if (customer) {
                await this.showCustomerDetails(customer.id);
            } else {
                this.ui.showToast('Customer not found in records', 'info');
            }
        }
    }

    // Customer search functionality
    async handleCustomerSearch(query) {
        if (!query || query.length < 2) {
            this.hideCustomerResults();
            return;
        }

        try {
            const customers = await this.db.searchCustomers(query);
            this.showCustomerResults(customers);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }

    showCustomerResults(customers) {
        const resultsContainer = document.getElementById('customerResults');
        if (!resultsContainer) return;

        if (customers.length === 0) {
            resultsContainer.innerHTML = '<div class="customer-result-item">No customers found</div>';
        } else {
            resultsContainer.innerHTML = customers.map(customer => `
                <div class="customer-result-item" data-customer-id="${customer.id}">
                    <div class="customer-info">
                        <strong>${customer.name}</strong>
                        <span>${customer.phone}</span>
                        ${customer.email ? `<small>${customer.email}</small>` : ''}
                    </div>
                    <button type="button" class="btn-secondary btn-sm" onclick="app.getManagers().billing.selectCustomer('${customer.id}')">
                        Select
                    </button>
                </div>
            `).join('');
        }

        resultsContainer.style.display = 'block';
    }

    hideCustomerResults() {
        const resultsContainer = document.getElementById('customerResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    async selectCustomer(customerId) {
        try {
            const customer = this.customers.find(c => c.id === customerId);
            if (customer) {
                this.selectedCustomer = customer;
                document.getElementById('customerName').value = customer.name;
                document.getElementById('customerPhone').value = customer.phone || '';
                document.getElementById('customerEmail').value = customer.email || '';
                this.hideCustomerResults();
                this.ui.showToast(`Customer ${customer.name} selected`, 'success');
            }
        } catch (error) {
            console.error('Error selecting customer:', error);
            this.ui.showToast('Error selecting customer', 'error');
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
            await this.db.delete('customers', customerId);
            this.ui.showToast('Customer deleted successfully', 'success');
            await this.loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            this.ui.showToast('Error deleting customer: ' + error.message, 'error');
        }
    }

    // Add this method to your BillingManager class
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

        const modal = this.showCustomModal(modalHtml, 'confirmationModal');

        // Add event listeners
        const confirmBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const closeBtn = modal.querySelector('.modal-close');

        const closeModal = () => {
            modal.remove();
            if (cancelCallback) cancelCallback();
        };

        confirmBtn.addEventListener('click', () => {
            modal.remove();
            confirmCallback();
        });

        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        return modal;
    }

    // Update all delete methods to use custom confirmation
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

    async deleteBill(billId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to delete bills', 'error');
            return;
        }

        const bill = this.bills.find(b => b.id === billId);
        if (!bill) {
            this.ui.showToast('Bill not found', 'error');
            return;
        }

        this.showConfirmationModal(
            'Delete Bill',
            `Are you sure you want to delete bill "<strong>${bill.bill_number}</strong>" for customer "<strong>${bill.customer_name}</strong>"? This action cannot be undone.`,
            async () => {
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
        );
    }

    async markAsPaid(billId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to update bills', 'error');
            return;
        }

        const bill = this.bills.find(b => b.id === billId);
        if (!bill) {
            this.ui.showToast('Bill not found', 'error');
            return;
        }

        this.showConfirmationModal(
            'Mark as Paid',
            `Are you sure you want to mark bill "<strong>${bill.bill_number}</strong>" as paid?`,
            async () => {
                try {
                    this.ui.showLoading('Updating bill...');

                    // Update bill status
                    await this.db.update('bills', billId, { status: 'paid' });

                    // Create payment record
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
        );
    }

    // Data loading methods
    async loadBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            this.ui.showSectionLoading('billingContent', 'Loading bills...');
            this.bills = await this.db.getBills();
            this.renderBillsTable(this.bills);
            this.ui.showToast('Bills loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading bills:', error);
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

            this.ui.showSectionLoading('customersContent', 'Loading customers...');
            this.customers = await this.db.getCustomers();
            this.renderCustomersTable(this.customers);
            this.ui.showToast('Customers loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading customers:', error);
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

            this.ui.showSectionLoading('pendingContent', 'Loading pending bills...');
            const bills = await this.db.getBills();
            const pendingBills = bills.filter(bill => bill.status === 'pending');
            this.renderPendingTable(pendingBills);
            this.ui.showToast('Pending bills loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading pending bills:', error);
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

            this.ui.showSectionLoading('paymentsContent', 'Loading payments...');
            this.payments = await this.db.getPayments();
            this.renderPaymentsTable(this.payments);
            this.ui.showToast('Payments loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading payments:', error);
            this.ui.showToast('Error loading payments', 'error');
        } finally {
            this.ui.hideSectionLoading('paymentsContent');
        }
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
                <td>
                    <a href="javascript:void(0)" 
                       onclick="app.getManagers().billing.showCustomerDetails('${customer.id}')"
                       class="customer-link">
                       ${customer.name}
                    </a>
                </td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.total_bills || 0}</td>
                <td>${Utils.formatCurrency(customer.total_amount || 0)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="app.getManagers().billing.editCustomer('${customer.id}')" title="Edit Customer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="app.getManagers().billing.deleteCustomer('${customer.id}')" title="Delete Customer">
                            <i class="fas fa-trash"></i>
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
                <td>
                    <a href="javascript:void(0)" 
                       onclick="app.getManagers().billing.showCustomerByBill('${bill.id}')"
                       class="customer-link">
                       ${bill.customer_name || 'N/A'}
                    </a>
                </td>
                <td>${Utils.formatCurrency(bill.total_amount)}</td>
                <td>${Utils.formatDate(bill.bill_date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="app.getManagers().billing.markAsPaid('${bill.id}')" title="Mark as Paid">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-icon" onclick="app.getManagers().billing.viewBill('${bill.id}')" title="View Bill">
                            <i class="fas fa-eye"></i>
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

    async markAsPaid(billId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to update bills', 'error');
            return;
        }

        if (!confirm('Mark this bill as paid?')) return;

        try {
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
        }
    }

    async deleteBill(billId) {
        if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
            this.ui.showToast('Insufficient permissions to delete bills', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this bill?')) return;

        try {
            await this.db.delete('bills', billId);
            this.ui.showToast('Bill deleted successfully', 'success');
            await this.loadBills();
            await this.loadPendingBills();
        } catch (error) {
            console.error('Error deleting bill:', error);
            this.ui.showToast('Error deleting bill: ' + error.message, 'error');
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
                'Total Bills': customer.total_bills || 0,
                'Total Amount': customer.total_amount || 0
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
}

window.BillingManager = BillingManager;