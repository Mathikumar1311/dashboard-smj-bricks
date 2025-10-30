class BillingManager {
    constructor(dependencies) {
        // ✅ VALIDATION
        if (!dependencies) throw new Error('BillingManager: dependencies required');
        if (!dependencies.db) throw new Error('BillingManager: db required');
        if (!dependencies.ui) throw new Error('BillingManager: ui required');
        if (!dependencies.auth) throw new Error('BillingManager: auth required');

        // ✅ ASSIGN DEPENDENCIES
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;

        // ✅ BILLING DATA
        this.employees = []; // ADD THIS LINE
        this.customers = []; // ADD THIS LINE
        this.billItems = [];
        this.bills = [];
        this.payments = [];
        this.products = [];
        this.customProducts = [];
        this.selectedCustomer = null;
        this.editingBillId = null;
        this.currentDateFilter = 'all';

        // ✅ BIND METHODS
        this.handleBillSubmit = this.handleBillSubmit.bind(this);
        this.handleCustomerSearch = this.handleCustomerSearch.bind(this);
        this.addBillItem = this.addBillItem.bind(this);
        this.calculateBillTotal = this.calculateBillTotal.bind(this);

        console.log('✅ BillingManager initialized');
    }

    // ==================== INITIALIZATION ====================

  // ✅ CORRECT - with await
async initialize() {
    await this.loadCustomers(); // ADD AWAIT HERE
    await this.loadProducts();
    this.loadCustomProducts();
    this.setupEventListeners();
    return Promise.resolve();
}
     // ADD THIS METHOD
    async loadCustomers() {
        try {
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager) {
                this.customers = customerManager.customers || [];
            } else {
                this.customers = await this.db.getCustomers() || [];
            }
        } catch (error) {
            console.error('Error loading customers for billing:', error);
            this.customers = [];
        }
    }

    // UPDATE initialize method
   // ✅ CORRECT - with await
async initialize() {
    await this.loadCustomers(); // ADD AWAIT HERE
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

    // ==================== EVENT LISTENERS ====================

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

            // Export buttons
            const exportBillsBtn = document.getElementById('exportBillsBtn');
            if (exportBillsBtn) {
                exportBillsBtn.addEventListener('click', () => this.showExportOptions('bills'));
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

            // Date filter buttons
            document.querySelectorAll('[data-filter]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.getAttribute('data-filter');
                    this.applyDateFilter(filter);
                });
            });

        }, 100);
    }

    // ==================== BILL MANAGEMENT ====================

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
            
            // Show customer balance
            this.showCustomerBalanceForPhone(customer.phone);
        } else {
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('customerEmail').value = '';
            this.hideCustomerBalance();
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

            // Show customer balance
            this.showCustomerBalanceForPhone(bill.customer_phone);

            this.renderBillItems();
            this.calculateBillTotal();
            document.getElementById('billModalTitle').textContent = 'Edit Bill';

        } catch (error) {
            console.error('Error loading bill for edit:', error);
            this.ui.showToast('Error loading bill', 'error');
        }
    }

    // Check if user can edit bill
    canEditBill(bill) {
        const currentUser = this.auth.getCurrentUser();
        if (!currentUser) return false;

        if (currentUser.role === 'admin') return true;

        if (currentUser.role === 'supervisor') {
            const sortedBills = [...this.bills].sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
            const lastBill = sortedBills[0];
            return lastBill && lastBill.id === bill.id;
        }

        return false;
    }

    // ==================== BILL ITEMS MANAGEMENT ====================

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

    // ==================== BILL SUBMISSION ====================

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

            // Validate phone format
            if (!Utils.validatePhone(customerPhone)) {
                this.ui.showToast('Please enter a valid 10-digit phone number', 'error');
                return;
            }

            // Check for duplicate customer phone - AUTO CREATE CUSTOMER IF NOT EXISTS
            if (!this.editingBillId) {
                const customerManager = window.app?.getManagers()?.customer;
                if (customerManager) {
                    const existingCustomer = customerManager.findCustomerByPhone(customerPhone);
                    if (!existingCustomer) {
                        // Auto-create customer if doesn't exist
                        try {
                            const customerData = {
                                name: Utils.sanitizeInput(customerName),
                                phone: Utils.sanitizeInput(customerPhone),
                                email: customerEmail ? Utils.sanitizeInput(customerEmail) : null,
                                created_at: new Date().toISOString()
                            };
                            customerData.id = `CUST_${Date.now()}`;
                            await this.db.create('customers', customerData);
                            this.ui.showToast(`New customer "${customerName}" created automatically`, 'success');
                            
                            // Refresh customer data in customer manager
                            if (customerManager.refreshCustomerData) {
                                await customerManager.refreshCustomerData();
                            }
                        } catch (error) {
                            console.error('Error auto-creating customer:', error);
                            // Continue with bill creation even if customer creation fails
                        }
                    }
                }
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
                await this.db.update('bills', this.editingBillId, billData);
                this.ui.showToast('Bill updated successfully', 'success');
            } else {
                // billData.id = `BILL_${Date.now()}`;
                await this.db.create('bills', billData);
                this.ui.showToast('Bill created successfully', 'success');
            }

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

    // ==================== CUSTOMER SEARCH ====================

    async handleCustomerSearch(query) {
        if (!query || query.length < 2) {
            this.hideCustomerResults();
            return;
        }

        try {
            const customerManager = window.app?.getManagers()?.customer;
            if (!customerManager) return;

            const filteredCustomers = customerManager.customers.filter(customer =>
                customer.name.toLowerCase().includes(query.toLowerCase()) ||
                customer.phone.includes(query)
            );
            this.showCustomerResults(filteredCustomers);
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
            resultsContainer.innerHTML = customers.map(customer => {
                const customerManager = window.app?.getManagers()?.customer;
                const balance = customerManager ? customerManager.calculateCustomerBalance(customer) : 0;
                
                return `
                <div class="customer-result-item" data-customer-id="${customer.id}">
                    <div class="customer-info">
                        <strong>${customer.name}</strong>
                        <span>${customer.phone}</span>
                        ${customer.email ? `<small>${customer.email}</small>` : ''}
                        <div class="customer-balance">${this.formatBalance(balance)}</div>
                    </div>
                    <button type="button" class="btn-secondary btn-sm select-customer-btn" data-customer-id="${customer.id}">
                        Select
                    </button>
                </div>
            `}).join('');
        }

        resultsContainer.style.display = 'block';

        // Add event listeners to select buttons
        setTimeout(() => {
            document.querySelectorAll('.select-customer-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const customerId = e.currentTarget.getAttribute('data-customer-id');
                    this.selectCustomer(customerId);
                });
            });
        }, 100);
    }

    hideCustomerResults() {
        const resultsContainer = document.getElementById('customerResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    async selectCustomer(customerId) {
        try {
            const customerManager = window.app?.getManagers()?.customer;
            if (!customerManager) return;

            const customer = customerManager.customers.find(c => c.id === customerId);
            if (customer) {
                this.selectedCustomer = customer;
                document.getElementById('customerName').value = customer.name;
                document.getElementById('customerPhone').value = customer.phone || '';
                document.getElementById('customerEmail').value = customer.email || '';
                
                // Show customer balance
                const balance = customerManager.calculateCustomerBalance(customer);
                this.showCustomerBalance(balance);
                
                this.hideCustomerResults();
                this.ui.showToast(`Customer ${customer.name} selected`, 'success');
            }
        } catch (error) {
            console.error('Error selecting customer:', error);
            this.ui.showToast('Error selecting customer', 'error');
        }
    }

    // ==================== CUSTOMER BALANCE DISPLAY ====================

    async showCustomerBalanceForPhone(phone) {
        if (!phone) {
            this.hideCustomerBalance();
            return;
        }

        try {
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager) {
                const customer = customerManager.findCustomerByPhone(phone);
                if (customer) {
                    const balance = customerManager.calculateCustomerBalance(customer);
                    this.showCustomerBalance(balance);
                    return;
                }
            }
        } catch (error) {
            console.error('Error getting customer balance:', error);
        }
        
        this.hideCustomerBalance();
    }

    showCustomerBalance(balance) {
        let balanceDisplay = document.getElementById('customerBalanceDisplay');
        
        // Create balance display if it doesn't exist
        if (!balanceDisplay) {
            const customerSection = document.querySelector('.form-section h4');
            if (customerSection) {
                balanceDisplay = document.createElement('div');
                balanceDisplay.id = 'customerBalanceDisplay';
                balanceDisplay.className = 'customer-balance-display';
                customerSection.parentNode.insertBefore(balanceDisplay, customerSection.nextSibling);
            }
        }
        
        if (balanceDisplay) {
            const isPositive = balance >= 0;
            const color = isPositive ? '#10b981' : '#ef4444';
            const sign = isPositive ? '+' : '';
            
            balanceDisplay.innerHTML = `
                <div class="balance-info">
                    <strong>Customer Balance:</strong>
                    <span style="color: ${color}; font-weight: bold;">${sign}${Utils.formatCurrency(balance)}</span>
                </div>
            `;
            balanceDisplay.style.display = 'block';
        }
    }

    hideCustomerBalance() {
        const balanceDisplay = document.getElementById('customerBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.style.display = 'none';
        }
    }

    formatBalance(balance) {
        const isPositive = balance >= 0;
        const color = isPositive ? '#10b981' : '#ef4444';
        const sign = isPositive ? '+' : '';
        return `<span style="color: ${color}; font-weight: bold;">${sign}${Utils.formatCurrency(balance)}</span>`;
    }

    // ==================== BILL VIEW & ACTIONS ====================

    async viewBill(billId) {
        try {
            const bill = this.bills.find(b => b.id === billId);
            if (!bill) {
                this.ui.showToast('Bill not found', 'error');
                return;
            }

            const items = typeof bill.items === 'string' ? JSON.parse(bill.items) : bill.items;
            
            let balance = 0;
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager) {
                const customer = customerManager.findCustomerByPhone(bill.customer_phone);
                balance = customer ? customerManager.calculateCustomerBalance(customer) : 0;
            }

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
                                    <div class="info-row">
                                        <label>Customer Balance:</label>
                                        <span>${this.formatBalance(balance)}</span>
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
                                    <button class="btn-primary" id="editBillBtn">
                                        <i class="fas fa-edit"></i> Edit Bill
                                    </button>
                                ` : ''}
                                ${bill.status === 'pending' ? `
                                    <button class="btn-secondary" id="markPaidBtn">
                                        <i class="fas fa-check"></i> Mark as Paid
                                    </button>
                                ` : ''}
                                <button class="btn-secondary" id="printBillBtn">
                                    <i class="fas fa-print"></i> Print
                                </button>
                            </div>
                        </div>

                        <div class="modal-actions">
                            <button class="btn-secondary" id="closeViewBillBtn">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.showCustomModal(modalHtml, 'viewBillModal');
            
            // Add event listeners
            setTimeout(() => {
                const editBtn = document.getElementById('editBillBtn');
                const markPaidBtn = document.getElementById('markPaidBtn');
                const printBtn = document.getElementById('printBillBtn');
                const closeBtn = document.getElementById('closeViewBillBtn');
                const closeHeaderBtn = document.querySelector('#viewBillModal .modal-close');

                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        this.closeViewBill();
                        this.editBill(billId);
                    });
                }

                if (markPaidBtn) {
                    markPaidBtn.addEventListener('click', () => {
                        this.closeViewBill();
                        this.markAsPaid(billId);
                    });
                }

                if (printBtn) {
                    printBtn.addEventListener('click', () => this.printBill(billId));
                }

                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.closeViewBill());
                }

                if (closeHeaderBtn) {
                    closeHeaderBtn.addEventListener('click', () => this.closeViewBill());
                }
            }, 100);

        } catch (error) {
            console.error('Error viewing bill:', error);
            this.ui.showToast('Error viewing bill details', 'error');
        }
    }

    closeViewBill() {
        this.ui.hideModal('viewBillModal');
        const modal = document.getElementById('viewBillModal');
        if (modal) {
            modal.remove();
        }
    }

    printBill(billId) {
        window.print();
    }

    async showCustomerByBill(billId) {
        const bill = this.bills.find(b => b.id === billId);
        if (bill) {
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager) {
                const customer = customerManager.findCustomerByPhone(bill.customer_phone);
                if (customer) {
                    await customerManager.showCustomerDetails(customer.id);
                } else {
                    this.ui.showToast('Customer not found in records', 'info');
                }
            }
        }
    }

    // ==================== BILL ACTIONS ====================

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

                    await this.db.update('bills', billId, { 
                        status: 'paid',
                        updated_at: new Date().toISOString()
                    });

                    const paymentData = {
                        bill_id: billId,
                        bill_number: bill.bill_number,
                        customer_name: bill.customer_name,
                        customer_phone: bill.customer_phone,
                        amount: bill.total_amount,
                        payment_method: 'cash',
                        payment_date: new Date().toISOString().split('T')[0],
                        created_at: new Date().toISOString()
                    };

                    paymentData.id = `PAY_${billId}_${Date.now()}`;
                    await this.db.create('payments', paymentData);

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

    // ==================== DATA LOADING ====================

    async loadBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            this.ui.showSectionLoading('billingContent', 'Loading bills...');
            this.bills = await this.db.getBills() || [];
            this.renderBillsTable(this.bills);

            // Update customer manager with bills data
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager && customerManager.updateBillsData) {
                customerManager.updateBillsData(this.bills);
            }

        } catch (error) {
            console.error('Error loading bills:', error);
            this.ui.showToast('Error loading bills', 'error');
            this.bills = [];
        } finally {
            this.ui.hideSectionLoading('billingContent');
        }
    }

    async loadPendingBills() {
        try {
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Access denied', 'error');
                return;
            }

            this.ui.showSectionLoading('pendingContent', 'Loading pending bills...');
            const bills = await this.db.getBills() || [];
            const pendingBills = bills.filter(bill => bill.status === 'pending');
            this.renderPendingTable(pendingBills);
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
            this.payments = await this.db.getPayments() || [];
            this.renderPaymentsTable(this.payments);
        } catch (error) {
            console.error('Error loading payments:', error);
            this.ui.showToast('Error loading payments', 'error');
            this.payments = [];
        } finally {
            this.ui.hideSectionLoading('paymentsContent');
        }
    }

    // ==================== RENDER METHODS ====================

    renderBillsTable(bills) {
        const tbody = document.getElementById('billsTableBody');
        if (!tbody) return;

        const filteredBills = this.filterRecordsByDate(bills);

        if (filteredBills.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-file-invoice"></i>
                        <br>No bills found
                        ${this.currentDateFilter !== 'all' ? ' for selected filter' : ''}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredBills.map(bill => {
            let balance = 0;
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager) {
                const customer = customerManager.findCustomerByPhone(bill.customer_phone);
                balance = customer ? customerManager.calculateCustomerBalance(customer) : 0;
            }
            
            return `
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
                <td>${this.formatBalance(balance)}</td>
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
        `}).join('');
    }

    renderPendingTable(bills) {
        const tbody = document.getElementById('pendingTableBody');
        if (!tbody) return;

        if (bills.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">
                        <i class="fas fa-clock"></i>
                        <br>No pending bills found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bills.map(bill => {
            let balance = 0;
            const customerManager = window.app?.getManagers()?.customer;
            if (customerManager) {
                const customer = customerManager.findCustomerByPhone(bill.customer_phone);
                balance = customer ? customerManager.calculateCustomerBalance(customer) : 0;
            }
            
            return `
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
                <td>${this.formatBalance(balance)}</td>
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
        `}).join('');
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

    // ==================== FILTER METHODS ====================

    applyDateFilter(filter) {
        this.currentDateFilter = filter;

        // Update active filter button
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });

        this.renderBillsTable(this.bills);
    }

    filterRecordsByDate(records) {
        const now = new Date();
        switch (this.currentDateFilter) {
            case 'today':
                return records.filter(record =>
                    new Date(record.bill_date).toDateString() === now.toDateString()
                );
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return records.filter(record =>
                    new Date(record.bill_date) >= weekStart
                );
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return records.filter(record =>
                    new Date(record.bill_date) >= monthStart
                );
            default:
                return records;
        }
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

    showExportOptions(type) {
        const titles = {
            'bills': 'Bills',
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
            if (!this.auth.hasPermission('admin') && !this.auth.hasPermission('supervisor')) {
                this.ui.showToast('Insufficient permissions to export data', 'error');
                return;
            }

            this.ui.showExportProgress(`Preparing ${type} data...`);

            let data = [];
            let filename = '';
            let title = '';

            switch (type) {
                case 'bills':
                    data = this.bills;
                    filename = 'bills_export';
                    title = 'Bills Export';
                    break;
                case 'pending':
                    const bills = await this.db.getBills();
                    data = bills.filter(bill => bill.status === 'pending');
                    filename = 'pending_bills_export';
                    title = 'Pending Bills Export';
                    break;
                case 'payments':
                    data = this.payments;
                    filename = 'payments_export';
                    title = 'Payments Export';
                    break;
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }

            if (data.length === 0) {
                this.ui.showToast(`No ${type} data to export`, 'warning');
                return;
            }

            const exportData = data.map(record => {
                switch (type) {
                    case 'bills':
                        return {
                            'Bill Number': record.bill_number,
                            'Customer': record.customer_name,
                            'Date': Utils.formatDate(record.bill_date),
                            'Sub Total': record.sub_total,
                            'GST Amount': record.gst_amount,
                            'Total Amount': record.total_amount,
                            'Status': record.status
                        };
                    case 'pending':
                        return {
                            'Bill Number': record.bill_number,
                            'Customer': record.customer_name,
                            'Amount': record.total_amount,
                            'Date': Utils.formatDate(record.bill_date),
                            'Due Date': Utils.formatDate(record.bill_date)
                        };
                    case 'payments':
                        return {
                            'Payment ID': record.id?.slice(0, 8) || 'N/A',
                            'Bill Number': record.bill_number,
                            'Customer': record.customer_name,
                            'Amount': record.amount,
                            'Date': Utils.formatDate(record.payment_date),
                            'Method': record.payment_method
                        };
                    default:
                        return {};
                }
            });

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

            this.ui.showToast(`${type} exported successfully`, 'success');
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            this.ui.showToast(`Error exporting ${type}: ${error.message}`, 'error');
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // ==================== CLEANUP ====================

    cleanup() {
        console.log('🧹 Cleaning up BillingManager...');
        // Cleanup any event listeners or timeouts if needed
    }
}

window.BillingManager = BillingManager;