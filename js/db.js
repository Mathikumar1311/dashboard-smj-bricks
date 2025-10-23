class DatabaseManager {
    constructor() {
        this.supabaseUrl = 'https://fhdyvidwiibvhkgfqkbk.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZHl2aWR3aWlidmhrZ2Zxa2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjYxMjAsImV4cCI6MjA3NTk0MjEyMH0.q2TH4O43WaUGJWfQ9yHskPALjfAdECUQcGOl1AHktUQ';
        this.supabase = null;
        this.isOnline = false;
        this.localCache = new Map();
        this.pendingOperations = [];
        this.missingTables = new Set();
        
        this.TABLES = {
            USERS: 'users',
            EMPLOYEES: 'employees',
            CUSTOMERS: 'customers',
            BILLS: 'bills',
            PAYMENTS: 'payments',
            SALARY_RECORDS: 'salary_records'
        };
    }

    async initialize() {
        console.log('🗄️ Initializing database manager...');

        try {
            await this.initializeSupabase();
            this.isOnline = true;
            console.log('✅ Database: Supabase connected');
            await this.checkTableExistence();
        } catch (error) {
            console.warn('⚠️ Database: Supabase failed, using local storage');
            this.initializeLocalStorage();
            this.isOnline = false;
        }

        await this.processPendingOperations();
        this.updateConnectionStatus();
        return this;
    }

    async initializeSupabase() {
        if (typeof supabase === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            document.head.appendChild(script);
            await new Promise((resolve) => { 
                script.onload = resolve; 
                script.onerror = () => reject(new Error('Failed to load Supabase'));
            });
        }

        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);

        // Test connection
        const { error } = await this.supabase
            .from(this.TABLES.USERS)
            .select('id')
            .limit(1);

        if (error && !error.message.includes('does not exist')) {
            throw error;
        }
    }

    async checkTableExistence() {
        const tables = Object.values(this.TABLES);
        console.log('🔍 Checking table existence:', tables);

        for (const table of tables) {
            try {
                const { error } = await this.supabase
                    .from(table)
                    .select('id')
                    .limit(1);

                if (error && error.code === 'PGRST116') {
                    console.warn(`❌ Table '${table}' doesn't exist in Supabase`);
                    this.missingTables.add(table);
                } else {
                    console.log(`✅ Table '${table}' exists and accessible`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not check table '${table}':`, error.message);
                this.missingTables.add(table);
            }
        }
    }

    async create(table, data) {
        if (!Object.values(this.TABLES).includes(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }

        const operation = async () => {
            if (this.isOnline && !this.missingTables.has(table)) {
                const sanitizedData = this.sanitizeDataForTable(table, data);
                
                console.log(`📝 Creating ${table}:`, sanitizedData);
                
                const { data: result, error } = await this.supabase
                    .from(table)
                    .insert([sanitizedData])
                    .select()
                    .single();

                if (error) {
                    console.error(`Supabase create error for ${table}:`, error);
                    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                        this.missingTables.add(table);
                        return this.createLocal(table, data);
                    }
                    throw error;
                }
                console.log(`✅ Created ${table} successfully:`, result);
                return result;
            } else {
                return this.createLocal(table, data);
            }
        };

        return this.executeWithRetry(operation, `create_${table}`);
    }

    sanitizeDataForTable(table, data) {
        const sanitized = { ...data };
        
        // Remove any undefined or null values
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined || sanitized[key] === null) {
                delete sanitized[key];
            }
        });

        switch (table) {
            case 'users':
                const userFields = ['id', 'username', 'password', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!userFields.includes(key)) delete sanitized[key];
                });
                break;
                
            case 'employees':
                // FIXED: Accept custom string IDs for employees
                const employeeFields = ['id', 'name', 'phone', 'email', 'employee_type', 'vehicle_number', 'role', 'salary', 'join_date', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!employeeFields.includes(key)) delete sanitized[key];
                });
                break;
                
            case 'customers':
                const customerFields = ['id', 'name', 'phone', 'email', 'address', 'total_bills', 'total_amount', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!customerFields.includes(key)) delete sanitized[key];
                });
                break;
                
            case 'bills':
                const billFields = ['id', 'bill_number', 'bill_date', 'customer_id', 'customer_name', 'customer_phone', 'customer_email', 'customer_address', 'items', 'sub_total', 'gst_rate', 'gst_amount', 'total_amount', 'status', 'created_at', 'updated_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!billFields.includes(key)) delete sanitized[key];
                });
                break;

            case 'payments':
                const paymentFields = ['id', 'bill_id', 'bill_number', 'customer_id', 'customer_name', 'amount', 'payment_method', 'payment_date', 'created_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!paymentFields.includes(key)) delete sanitized[key];
                });
                break;

            case 'salary_records':
                const salaryFields = ['id', 'employee_id', 'employee_name', 'record_date', 'amount', 'work_hours', 'created_at'];
                Object.keys(sanitized).forEach(key => {
                    if (!salaryFields.includes(key)) delete sanitized[key];
                });
                break;
        }
        
        return sanitized;
    }

    async read(table, query = {}) {
        if (!Object.values(this.TABLES).includes(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }

        if (this.isOnline && this.missingTables.has(table)) {
            return this.readLocal(table, query);
        }

        const operation = async () => {
            if (this.isOnline) {
                let supabaseQuery = this.supabase.from(table).select('*');

                if (query.where) {
                    Object.entries(query.where).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            supabaseQuery = supabaseQuery.eq(key, value);
                        }
                    });
                }

                if (query.orderBy) {
                    supabaseQuery = supabaseQuery.order(query.orderBy, {
                        ascending: query.ascending !== false
                    });
                }

                if (query.limit) {
                    supabaseQuery = supabaseQuery.limit(query.limit);
                }

                const { data, error } = await supabaseQuery;

                if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
                    this.missingTables.add(table);
                    return this.readLocal(table, query);
                }

                if (error) throw error;
                return data || [];
            } else {
                return this.readLocal(table, query);
            }
        };

        return this.executeWithRetry(operation, `read_${table}`);
    }

    async update(table, id, data) {
        if (!Object.values(this.TABLES).includes(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }

        const operation = async () => {
            if (this.isOnline && !this.missingTables.has(table)) {
                const sanitizedData = this.sanitizeDataForTable(table, data);
                
                const { data: result, error } = await this.supabase
                    .from(table)
                    .update(sanitizedData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                        this.missingTables.add(table);
                        return this.updateLocal(table, id, data);
                    }
                    throw error;
                }
                return result;
            } else {
                return this.updateLocal(table, id, data);
            }
        };

        return this.executeWithRetry(operation, `update_${table}`);
    }

    async delete(table, id) {
        if (!Object.values(this.TABLES).includes(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }

        const operation = async () => {
            if (this.isOnline && !this.missingTables.has(table)) {
                const { error } = await this.supabase
                    .from(table)
                    .delete()
                    .eq('id', id);

                if (error) {
                    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                        this.missingTables.add(table);
                        return this.deleteLocal(table, id);
                    }
                    throw error;
                }
                return true;
            } else {
                return this.deleteLocal(table, id);
            }
        };

        return this.executeWithRetry(operation, `delete_${table}`);
    }

    // Local storage operations
    createLocal(table, data) {
        const items = JSON.parse(localStorage.getItem(table) || '[]');
        const newItem = {
            ...data,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        items.push(newItem);
        localStorage.setItem(table, JSON.stringify(items));
        console.log(`💾 Saved to local storage (${table}):`, newItem);
        return newItem;
    }

    readLocal(table, query = {}) {
        let items = JSON.parse(localStorage.getItem(table) || '[]');

        if (query.where) {
            Object.entries(query.where).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    items = items.filter(item => item[key] === value);
                }
            });
        }

        if (query.orderBy) {
            items.sort((a, b) => {
                const aVal = a[query.orderBy];
                const bVal = b[query.orderBy];
                return query.ascending === false ?
                    (bVal < aVal ? -1 : bVal > aVal ? 1 : 0) :
                    (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
            });
        }

        if (query.limit) {
            items = items.slice(0, query.limit);
        }

        return items;
    }

    updateLocal(table, id, data) {
        const items = JSON.parse(localStorage.getItem(table) || '[]');
        const index = items.findIndex(item => item.id === id);

        if (index === -1) throw new Error('Item not found');

        items[index] = { 
            ...items[index], 
            ...data, 
            updated_at: new Date().toISOString() 
        };
        localStorage.setItem(table, JSON.stringify(items));
        return items[index];
    }

    deleteLocal(table, id) {
        const items = JSON.parse(localStorage.getItem(table) || '[]');
        const filtered = items.filter(item => item.id !== id);
        localStorage.setItem(table, JSON.stringify(filtered));
        return true;
    }

    async executeWithRetry(operation, operationId, retries = 3) {
        try {
            return await operation();
        } catch (error) {
            console.warn(`Operation ${operationId} failed:`, error.message);

            if (retries > 0 && this.isOnline) {
                console.warn(`Retrying operation ${operationId}, ${retries} retries left`);
                await this.delay(1000 * (4 - retries));
                return this.executeWithRetry(operation, operationId, retries - 1);
            }

            if (this.isOnline) {
                console.warn('Switching to offline mode for operation:', operationId);
                this.isOnline = false;
                this.updateConnectionStatus();
                return this.executeWithRetry(operation, operationId, 0);
            }

            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async processPendingOperations() {
        while (this.pendingOperations.length > 0) {
            const operation = this.pendingOperations.shift();
            try {
                await operation();
            } catch (error) {
                console.error('Failed to process pending operation:', error);
            }
        }
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('dbStatus');
        if (statusElement) {
            if (this.isOnline) {
                statusElement.className = 'db-status connected';
                statusElement.innerHTML = '<i class="fas fa-database"></i> Online';
                statusElement.title = 'Connected to Supabase';
            } else {
                statusElement.className = 'db-status disconnected';
                statusElement.innerHTML = '<i class="fas fa-database"></i> Offline';
                statusElement.title = 'Using local storage';
            }
        }
    }

    async healthCheck() {
        try {
            if (this.isOnline) {
                const { error } = await this.supabase
                    .from(this.TABLES.USERS)
                    .select('id')
                    .limit(1);
                return !error;
            }
            return true;
        } catch (error) {
            console.warn('Health check failed:', error);
            return false;
        }
    }

    async getDashboardStats() {
        try {
            if (this.isOnline) {
                const [customers, employees, bills] = await Promise.all([
                    this.read(this.TABLES.CUSTOMERS),
                    this.read(this.TABLES.EMPLOYEES),
                    this.read(this.TABLES.BILLS)
                ]);

                const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0);
                const totalGST = bills.reduce((sum, bill) => sum + parseFloat(bill.gst_amount || 0), 0);
                const pendingPayments = bills.filter(bill => bill.status === 'pending').length;

                return {
                    totalCustomers: customers.length,
                    totalEmployees: employees.length,
                    totalSales,
                    totalGST,
                    pendingPayments,
                    recentActivity: bills.length
                };
            } else {
                const customers = this.readLocal(this.TABLES.CUSTOMERS);
                const employees = this.readLocal(this.TABLES.EMPLOYEES);
                const bills = this.readLocal(this.TABLES.BILLS);

                const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0);
                const totalGST = bills.reduce((sum, bill) => sum + parseFloat(bill.gst_amount || 0), 0);
                const pendingPayments = bills.filter(bill => bill.status === 'pending').length;

                return {
                    totalCustomers: customers.length,
                    totalEmployees: employees.length,
                    totalSales,
                    totalGST,
                    pendingPayments,
                    recentActivity: bills.length
                };
            }
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            return {
                totalCustomers: 0,
                totalEmployees: 0,
                totalSales: 0,
                totalGST: 0,
                pendingPayments: 0,
                recentActivity: 0
            };
        }
    }

    async getUsers() {
        return await this.read(this.TABLES.USERS, {
            orderBy: 'created_at',
            ascending: false
        });
    }

    async getEmployees() {
        return await this.read(this.TABLES.EMPLOYEES, {
            orderBy: 'created_at',
            ascending: false
        });
    }

    async getCustomers() {
        return await this.read(this.TABLES.CUSTOMERS, {
            orderBy: 'created_at',
            ascending: false
        });
    }

    async getBills() {
        return await this.read(this.TABLES.BILLS, {
            orderBy: 'bill_date',
            ascending: false
        });
    }

    async getPayments() {
        return await this.read(this.TABLES.PAYMENTS, {
            orderBy: 'payment_date',
            ascending: false
        });
    }

    async getSalaryRecords() {
        return await this.read(this.TABLES.SALARY_RECORDS, {
            orderBy: 'record_date',
            ascending: false
        });
    }

    initializeLocalStorage() {
        Object.values(this.TABLES).forEach(table => {
            if (!localStorage.getItem(table)) {
                localStorage.setItem(table, '[]');
            }
        });
    }

    cleanup() {
        this.pendingOperations = [];
    }
}

window.DatabaseManager = DatabaseManager;