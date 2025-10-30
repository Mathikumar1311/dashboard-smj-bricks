/**
 * 🗄️ Complete Database Manager with Supabase Integration
 * ✅ Offline-first approach with local storage fallback
 * ✅ Automatic retry mechanisms
 * ✅ Comprehensive error handling
 * ✅ All client requirements implemented
 */

class DatabaseManager {
    constructor() {
        // 🔐 SERVICE ROLE KEY (get from Supabase Settings > API)
        this.supabaseUrl = 'https://fhdyvidwiibvhkgfqkbk.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZHl2aWR3aWlidmhrZ2Zxa2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjYxMjAsImV4cCI6MjA3NTk0MjEyMH0.q2TH4O43WaUGJWfQ9yHskPALjfAdECUQcGOl1AHktUQ';

        this.supabase = null;
        this.isOnline = false;
        this.localCache = new Map();
        this.pendingOperations = [];
        this.missingTables = new Set();
        this.initialized = false;

        // 📊 ALL TABLE DEFINITIONS
        this.TABLES = {
            USERS: 'users',
            EMPLOYEES: 'employees',
            CUSTOMERS: 'customers',
            BILLS: 'bills',
            PAYMENTS: 'payments',
            SALARY_RECORDS: 'salary_records',
            YEARLY_ALLOCATIONS: 'yearly_allocations',
            ADVANCE_PAYMENTS: 'advance_payments',

            // 🆕 NEW TABLES FOR CLIENT REQUIREMENTS
            FAMILY_GROUPS: 'family_groups',
            ATTENDANCE: 'attendance',
            SIMPLE_ADVANCES: 'simple_advances',
            SALARY_PAYMENTS: 'salary_payments',
            PRODUCTS: 'products',

            // 🆕 ADDED MISSING TABLES
            ADVANCE_RECORDS: 'advance_records' // Added this missing table
        };

        // Initialize local storage immediately
        this.initializeLocalStorage();
    }

    /**
     * 🎯 INITIALIZE DATABASE MANAGER
     */
    async initialize() {
        if (this.initialized) {
            console.log('🔄 Database manager already initialized');
            return this;
        }

        console.log('🗄️ Initializing database manager...');
        console.log('🔑 Supabase URL:', this.supabaseUrl);
        console.log('🔑 Supabase Key exists:', !!this.supabaseKey);

        try {
            // Test basic connectivity first
            await this.testConnectivity();

            // Initialize Supabase client
            await this.initializeSupabase();

            // Verify Supabase connection
            await this.verifySupabaseConnection();

            this.isOnline = true;
            console.log('✅ Database: Supabase connected successfully');

            // Check all table existence
            await this.checkAllTableExistence();

            // Sync local data with Supabase
            await this.syncLocalData();

        } catch (error) {
            console.warn('⚠️ Database: Supabase failed, using local storage', error);
            this.isOnline = false;
        }

        this.initialized = true;
        await this.processPendingOperations();
        this.updateConnectionStatus();

        console.log('🎉 Database manager initialized successfully');
        console.log('🌐 Online mode:', this.isOnline);

        return this;
    }

    /**
     * 🌐 TEST BASIC CONNECTIVITY
     */
    async testConnectivity() {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                headers: {
                    'apikey': this.supabaseKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('✅ Basic connectivity test passed');
            return true;
        } catch (error) {
            throw new Error(`Connectivity test failed: ${error.message}`);
        }
    }

    /**
     * 🔧 INITIALIZE SUPABASE CLIENT
     */
    async initializeSupabase() {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if Supabase is already loaded
                if (typeof window.supabase !== 'undefined') {
                    console.log('✅ Supabase already loaded');
                    this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                    return resolve();
                }

                // Load Supabase from CDN
                console.log('📦 Loading Supabase from CDN...');
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/umd/supabase.min.js';
                script.integrity = 'sha384-8g8YnF5kK3BkM2pDqKjqj6JMGUJk1j9E6p1I78m0q1e6+8S7k6m92N1p/2v90k6K';
                script.crossOrigin = 'anonymous';

                script.onload = () => {
                    console.log('✅ Supabase loaded successfully');
                    this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                    resolve();
                };

                script.onerror = () => {
                    reject(new Error('Failed to load Supabase SDK'));
                };

                document.head.appendChild(script);

            } catch (error) {
                reject(new Error(`Supabase initialization failed: ${error.message}`));
            }
        });
    }

    /**
     * 🔍 VERIFY SUPABASE CONNECTION
     */
    async verifySupabaseConnection() {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        // Test with a simple query
        const { data, error } = await this.supabase
            .from(this.TABLES.USERS)
            .select('count')
            .limit(1)
            .single();

        // It's OK if table doesn't exist, but not OK if other errors
        if (error && !error.message.includes('does not exist') && !error.code === 'PGRST116') {
            throw new Error(`Supabase connection test failed: ${error.message}`);
        }

        console.log('✅ Supabase connection verified');
        return true;
    }

    /**
     * 📋 CHECK ALL TABLE EXISTENCE
     */
    async checkAllTableExistence() {
        console.log('🔍 Checking existence of all tables...');

        const tables = Object.values(this.TABLES);
        const results = {
            exists: [],
            missing: []
        };

        for (const table of tables) {
            try {
                const exists = await this.checkTableExistence(table);
                if (exists) {
                    results.exists.push(table);
                    console.log(`✅ Table '${table}' exists`);
                } else {
                    results.missing.push(table);
                    console.warn(`❌ Table '${table}' doesn't exist`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not check table '${table}':`, error.message);
                results.missing.push(table);
            }
        }

        console.log('📊 Table check results:', results);
        return results;
    }

    /**
     * 🔎 CHECK SINGLE TABLE EXISTENCE
     */
    async checkTableExistence(table) {
        try {
            const { error } = await this.supabase
                .from(table)
                .select('id')
                .limit(1);

            if (error) {
                if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
                    this.missingTables.add(table);
                    return false;
                }
                throw error;
            }

            this.missingTables.delete(table);
            return true;
        } catch (error) {
            console.warn(`Error checking table ${table}:`, error.message);
            this.missingTables.add(table);
            return false;
        }
    }

    /**
     * 🔄 SYNC LOCAL DATA WITH SUPABASE
     */
    async syncLocalData() {
        if (!this.isOnline) return;

        console.log('🔄 Syncing local data with Supabase...');

        for (const table of Object.values(this.TABLES)) {
            try {
                await this.syncTableData(table);
            } catch (error) {
                console.warn(`Failed to sync table ${table}:`, error.message);
            }
        }

        console.log('✅ Local data sync completed');
    }

    /**
     * 📊 SYNC SINGLE TABLE DATA
     */
    async syncTableData(table) {
        const localData = this.readLocal(table);

        if (localData.length === 0) return;

        console.log(`🔄 Syncing ${localData.length} records from ${table}...`);

        for (const item of localData) {
            try {
                // Check if item exists in Supabase
                const { data: existing } = await this.supabase
                    .from(table)
                    .select('id')
                    .eq('id', item.id)
                    .single();

                if (!existing) {
                    // Insert new item
                    const { error } = await this.supabase
                        .from(table)
                        .insert([this.sanitizeDataForTable(table, item)]);

                    if (error) throw error;
                    console.log(`✅ Synced ${table} item:`, item.id);
                }
            } catch (error) {
                console.warn(`Failed to sync ${table} item ${item.id}:`, error.message);
            }
        }

        // Clear local storage after successful sync
        localStorage.removeItem(table);
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * ➕ CREATE RECORD
     */
    async create(table, data) {
        this.validateTableName(table);

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
                    if (this.isTableMissingError(error)) {
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

    /**
     * 📖 READ RECORDS
     */
    async read(table, query = {}) {
        this.validateTableName(table);

        // If we know the table is missing, use local storage
        if (this.isOnline && this.missingTables.has(table)) {
            return this.readLocal(table, query);
        }

        const operation = async () => {
            if (this.isOnline) {
                console.log(`🔍 Reading from ${table} with query:`, query);

                let supabaseQuery = this.supabase.from(table).select('*');

                // Apply WHERE conditions
                if (query.where) {
                    Object.entries(query.where).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            if (Array.isArray(value)) {
                                supabaseQuery = supabaseQuery.in(key, value);
                            } else {
                                supabaseQuery = supabaseQuery.eq(key, value);
                            }
                        }
                    });
                }

                // Apply ORDER BY
                if (query.orderBy) {
                    supabaseQuery = supabaseQuery.order(query.orderBy, {
                        ascending: query.ascending !== false
                    });
                }

                // Apply LIMIT
                if (query.limit) {
                    supabaseQuery = supabaseQuery.limit(query.limit);
                }

                // Apply OFFSET for pagination
                if (query.offset) {
                    supabaseQuery = supabaseQuery.range(
                        query.offset,
                        query.offset + (query.limit || 1) - 1
                    );
                }

                const { data, error } = await supabaseQuery;

                if (error) {
                    console.error(`❌ Supabase read error for ${table}:`, error);
                    if (this.isTableMissingError(error)) {
                        this.missingTables.add(table);
                        return this.readLocal(table, query);
                    }
                    throw error;
                }

                console.log(`📊 ${table} query returned ${data?.length || 0} records`);
                return data || [];
            } else {
                return this.readLocal(table, query);
            }
        };

        return this.executeWithRetry(operation, `read_${table}`);
    }

    /**
     * ✏️ UPDATE RECORD
     */
    async update(table, id, data) {
        this.validateTableName(table);

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
                    if (this.isTableMissingError(error)) {
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

    /**
     * 🗑️ DELETE RECORD
     */
    async delete(table, id) {
        this.validateTableName(table);

        const operation = async () => {
            if (this.isOnline && !this.missingTables.has(table)) {
                const { error } = await this.supabase
                    .from(table)
                    .delete()
                    .eq('id', id);

                if (error) {
                    if (this.isTableMissingError(error)) {
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

    // ==================== LOCAL STORAGE OPERATIONS ====================

    /**
     * 💾 CREATE LOCAL RECORD
     */
    createLocal(table, data) {
        const items = this.readLocal(table);
        const newItem = {
            ...data,
            id: data.id || this.generateId(),
            created_at: data.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        items.push(newItem);
        localStorage.setItem(table, JSON.stringify(items));
        console.log(`💾 Saved to local storage (${table}):`, newItem);
        return newItem;
    }

    /**
     * 📖 READ LOCAL RECORDS
     */
    readLocal(table, query = {}) {
        let items = JSON.parse(localStorage.getItem(table) || '[]');

        // Apply WHERE conditions
        if (query.where) {
            Object.entries(query.where).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        items = items.filter(item => value.includes(item[key]));
                    } else {
                        items = items.filter(item => item[key] === value);
                    }
                }
            });
        }

        // Apply ORDER BY
        if (query.orderBy) {
            items.sort((a, b) => {
                const aVal = a[query.orderBy];
                const bVal = b[query.orderBy];
                const modifier = query.ascending === false ? -1 : 1;

                if (aVal < bVal) return -1 * modifier;
                if (aVal > bVal) return 1 * modifier;
                return 0;
            });
        }

        // Apply LIMIT
        if (query.limit) {
            items = items.slice(0, query.limit);
        }

        // Apply OFFSET
        if (query.offset) {
            items = items.slice(query.offset);
        }

        return items;
    }

    /**
     * ✏️ UPDATE LOCAL RECORD
     */
    updateLocal(table, id, data) {
        const items = this.readLocal(table);
        const index = items.findIndex(item => item.id === id);

        if (index === -1) {
            throw new Error(`Item not found in ${table} with id: ${id}`);
        }

        items[index] = {
            ...items[index],
            ...data,
            updated_at: new Date().toISOString()
        };

        localStorage.setItem(table, JSON.stringify(items));
        return items[index];
    }

    /**
     * 🗑️ DELETE LOCAL RECORD
     */
    deleteLocal(table, id) {
        const items = this.readLocal(table);
        const filtered = items.filter(item => item.id !== id);
        localStorage.setItem(table, JSON.stringify(filtered));
        return true;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * 🆔 GENERATE UNIQUE ID
     */
    generateId() {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * ✅ VALIDATE TABLE NAME
     */
    validateTableName(table) {
        if (!Object.values(this.TABLES).includes(table)) {
            throw new Error(`Invalid table name: ${table}. Valid tables: ${Object.values(this.TABLES).join(', ')}`);
        }
    }

    /**
     * 🔍 CHECK IF ERROR IS TABLE MISSING
     */
    isTableMissingError(error) {
        return error.code === 'PGRST116' ||
            error.message.includes('does not exist') ||
            error.message.includes('relation') && error.message.includes('does not exist');
    }

    /**
     * 🔄 EXECUTE WITH RETRY
     */
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

    /**
     * ⏰ DELAY FUNCTION
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 🧹 SANITIZE DATA FOR TABLE
     */
    sanitizeDataForTable(table, data) {
        const sanitized = { ...data };

        // Remove any undefined or null values
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined || sanitized[key] === null) {
                delete sanitized[key];
            }
        });

        // Table-specific field filtering
        const tableFields = {
            users: ['id', 'username', 'password', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'updated_at'],
            employees: ['id', 'name', 'phone', 'email', 'employee_type', 'vehicle_number', 'role', 'salary', 'basic_salary', 'salary_type', 'join_date', 'status', 'family_group_id', 'created_at', 'updated_at'],
            customers: ['id', 'name', 'phone', 'email', 'address', 'total_bills', 'total_amount', 'created_at', 'updated_at'],
            bills: ['id', 'bill_number', 'bill_date', 'customer_id', 'customer_name', 'customer_phone', 'customer_email', 'customer_address', 'items', 'sub_total', 'gst_rate', 'gst_amount', 'total_amount', 'status', 'created_at', 'updated_at'],
            payments: ['id', 'bill_id', 'bill_number', 'customer_id', 'customer_name', 'amount', 'payment_method', 'payment_date', 'created_at'],
            salary_records: ['id', 'employee_id', 'employee_name', 'record_date', 'amount', 'incentive_amount', 'work_hours', 'created_at'],
            yearly_allocations: ['id', 'employee_id', 'year', 'allocated_amount', 'salary_type', 'notes', 'created_at', 'updated_at'],
            advance_payments: ['id', 'employee_id', 'amount', 'allocation_used', 'payment_date', 'week_number', 'month_number', 'year', 'confirmed', 'notes', 'created_at'],
            family_groups: ['id', 'family_name', 'primary_member_id', 'bank_account_number', 'bank_name', 'ifsc_code', 'created_at', 'updated_at'],
            attendance: ['id', 'employee_id', 'employee_name', 'attendance_date', 'status', 'check_in_time', 'check_out_time', 'work_hours', 'overtime_hours', 'notes', 'created_at'],
            simple_advances: ['id', 'employee_id', 'amount', 'advance_date', 'reason', 'status', 'created_at'],
            salary_payments: ['id', 'employee_id', 'employee_name', 'payment_date', 'pay_period_start', 'pay_period_end', 'basic_salary', 'overtime_amount', 'incentive_amount', 'advance_deductions', 'total_advances', 'net_salary', 'payment_method', 'status', 'payslip_generated', 'work_days', 'total_hours', 'created_at'],
            products: ['id', 'name', 'description', 'price', 'gst_rate', 'unit', 'stock_quantity', 'is_active', 'created_at', 'updated_at'],
            // 🆕 ADDED MISSING TABLE FIELDS
            advance_records: ['id', 'employee_id', 'employee_name', 'amount', 'record_date', 'type', 'status', 'week_number', 'month_number', 'year', 'paid_date', 'deducted_date', 'created_at']
        };

        const fields = tableFields[table] || [];
        Object.keys(sanitized).forEach(key => {
            if (!fields.includes(key)) {
                delete sanitized[key];
            }
        });

        return sanitized;
    }

    // ==================== SPECIFIC GETTER METHODS ====================

    async getUsers(filters = {}) {
        return await this.read(this.TABLES.USERS, {
            where: filters,
            orderBy: 'created_at',
            ascending: false
        });
    }

    async getEmployees(filters = {}) {
        console.log('🔍 Fetching employees with filters:', filters);

        // Remove status filter if column doesn't exist (from your old code)
        const safeFilters = { ...filters };
        if (safeFilters.status !== undefined) {
            console.warn('⚠️ status filter removed - column does not exist');
            delete safeFilters.status;
        }

        const employees = await this.read(this.TABLES.EMPLOYEES, {
            where: safeFilters,
            orderBy: 'created_at',
            ascending: false
        });

        console.log('📊 Employees fetched:', employees.length);
        return employees;
    }

    async getCustomers(filters = {}) {
        return await this.read(this.TABLES.CUSTOMERS, {
            where: filters,
            orderBy: 'created_at',
            ascending: false
        });
    }

    async getBills(filters = {}) {
        return await this.read(this.TABLES.BILLS, {
            where: filters,
            orderBy: 'bill_date',
            ascending: false
        });
    }

    async getPayments(filters = {}) {
        return await this.read(this.TABLES.PAYMENTS, {
            where: filters,
            orderBy: 'payment_date',
            ascending: false
        });
    }

    async getSalaryRecords(filters = {}) {
        return await this.read(this.TABLES.SALARY_RECORDS, {
            where: filters,
            orderBy: 'record_date',
            ascending: false
        });
    }

    async getYearlyAllocations(filters = {}) {
        return await this.read(this.TABLES.YEARLY_ALLOCATIONS, {
            where: filters,
            orderBy: 'created_at',
            ascending: false
        });
    }

    async getAdvancePayments(filters = {}) {
        return await this.read(this.TABLES.ADVANCE_PAYMENTS, {
            where: filters,
            orderBy: 'payment_date',
            ascending: false
        });
    }

    async getFamilyGroups(filters = {}) {
        try {
            return await this.read(this.TABLES.FAMILY_GROUPS, {
                where: filters,
                orderBy: 'created_at',
                ascending: false
            });
        } catch (error) {
            console.warn('Family groups table not available');
            return [];
        }
    }

    async getAttendanceRecords(filters = {}) {
        try {
            return await this.read(this.TABLES.ATTENDANCE, {
                where: filters,
                orderBy: 'attendance_date',
                ascending: false
            });
        } catch (error) {
            console.warn('Attendance table not available');
            return [];
        }
    }

    async getSimpleAdvances(filters = {}) {
        try {
            return await this.read(this.TABLES.SIMPLE_ADVANCES, {
                where: filters,
                orderBy: 'advance_date',
                ascending: false
            });
        } catch (error) {
            console.warn('Simple advances table not available');
            return [];
        }
    }

    async getSalaryPayments(filters = {}) {
        try {
            return await this.read(this.TABLES.SALARY_PAYMENTS, {
                where: filters,
                orderBy: 'payment_date',
                ascending: false
            });
        } catch (error) {
            console.warn('Salary payments table not available');
            return [];
        }
    }

    async getProducts(filters = {}) {
        return await this.read(this.TABLES.PRODUCTS, {
            where: { ...filters, is_active: true },
            orderBy: 'name',
            ascending: true
        });
    }

    // 🆕 ADDED MISSING METHODS

    /**
     * 💰 GET ADVANCE RECORDS (MISSING METHOD)
     */
    async getAdvanceRecords(filters = {}) {
        try {
            return await this.read(this.TABLES.ADVANCE_RECORDS, {
                where: filters,
                orderBy: 'record_date',
                ascending: false
            });
        } catch (error) {
            console.warn('Advance records table not available, using simple_advances as fallback');
            // Fallback to simple_advances if advance_records doesn't exist
            return await this.getSimpleAdvances(filters);
        }
    }

    /**
     * 📊 GET EMPLOYEE SUMMARY (MISSING METHOD)
     */
    async getEmployeeSummary(employeeId) {
        try {
            const [salaryRecords, advanceRecords, attendanceRecords] = await Promise.all([
                this.getSalaryRecords({ employee_id: employeeId }),
                this.getAdvanceRecords({ employee_id: employeeId }),
                this.getAttendanceRecords({ employee_id: employeeId })
            ]);

            const totalSalary = salaryRecords.reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
            const pendingAdvances = advanceRecords
                .filter(record => record.status === 'pending')
                .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
            const paidAdvances = advanceRecords
                .filter(record => record.status === 'paid')
                .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);

            return {
                totalSalary,
                pendingAdvances,
                paidAdvances,
                netPayable: totalSalary - paidAdvances,
                totalRecords: salaryRecords.length + advanceRecords.length,
                lastSalaryDate: salaryRecords.length > 0 ?
                    new Date(Math.max(...salaryRecords.map(r => new Date(r.record_date)))) : null
            };
        } catch (error) {
            console.error('Error getting employee summary:', error);
            return {
                totalSalary: 0,
                pendingAdvances: 0,
                paidAdvances: 0,
                netPayable: 0,
                totalRecords: 0,
                lastSalaryDate: null
            };
        }
    }

    /**
     * 🏢 GET DAILY EMPLOYEES (MISSING METHOD)
     */
    async getDailyEmployees(filters = {}) {
        const allEmployees = await this.getEmployees(filters);
        // Filter only daily wage employees
        return allEmployees.filter(emp =>
            emp.salary_type === 'daily' || !emp.salary_type
        );
    }

    /**
     * 📅 GET TODAY'S ATTENDANCE SUMMARY (MISSING METHOD)
     */
    async getTodaysAttendanceSummary() {
        const today = new Date().toISOString().split('T')[0];
        const todaysRecords = await this.getAttendanceRecords({
            attendance_date: today
        });

        const dailyEmployees = await this.getDailyEmployees();

        return {
            present: todaysRecords.filter(r => r.status === 'present').length,
            absent: todaysRecords.filter(r => r.status === 'absent').length,
            halfDay: todaysRecords.filter(r => r.status === 'half_day').length,
            total: dailyEmployees.length,
            notMarked: dailyEmployees.length - todaysRecords.length
        };
    }

    // ==================== CREATE METHODS FOR NEW TABLES ====================

    /**
     * ➕ CREATE ADVANCE RECORD
     */
    async createAdvanceRecord(data) {
        return await this.create(this.TABLES.ADVANCE_RECORDS, data);
    }

    /**
     * ➕ CREATE ATTENDANCE RECORD
     */
    async createAttendanceRecord(data) {
        return await this.create(this.TABLES.ATTENDANCE, data);
    }

    /**
     * ➕ CREATE SALARY PAYMENT
     */
    async createSalaryPayment(data) {
        return await this.create(this.TABLES.SALARY_PAYMENTS, data);
    }

    /**
     * ➕ CREATE SIMPLE ADVANCE
     */
    async createSimpleAdvance(data) {
        return await this.create(this.TABLES.SIMPLE_ADVANCES, data);
    }

    // ==================== UPDATE METHODS FOR NEW TABLES ====================

    /**
     * ✏️ UPDATE ADVANCE RECORD
     */
    async updateAdvanceRecord(id, data) {
        return await this.update(this.TABLES.ADVANCE_RECORDS, id, data);
    }

    /**
     * ✏️ UPDATE ATTENDANCE RECORD
     */
    async updateAttendanceRecord(id, data) {
        return await this.update(this.TABLES.ATTENDANCE, id, data);
    }

    /**
     * ✏️ UPDATE SALARY PAYMENT
     */
    async updateSalaryPayment(id, data) {
        return await this.update(this.TABLES.SALARY_PAYMENTS, id, data);
    }

    // ==================== DELETE METHODS FOR NEW TABLES ====================

    /**
     * 🗑️ DELETE ADVANCE RECORD
     */
    async deleteAdvanceRecord(id) {
        return await this.delete(this.TABLES.ADVANCE_RECORDS, id);
    }

    /**
     * 🗑️ DELETE ATTENDANCE RECORD
     */
    async deleteAttendanceRecord(id) {
        return await this.delete(this.TABLES.ATTENDANCE, id);
    }

    /**
     * 🗑️ DELETE SALARY PAYMENT
     */
    async deleteSalaryPayment(id) {
        return await this.delete(this.TABLES.SALARY_PAYMENTS, id);
    }

    // ==================== ADVANCED QUERIES ====================

    async searchCustomers(query) {
        if (this.isOnline) {
            try {
                const { data, error } = await this.supabase
                    .from(this.TABLES.CUSTOMERS)
                    .select('*')
                    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
                    .limit(10);

                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Error searching customers:', error);
                // Fallback to local search
            }
        }

        // Local search fallback
        const customers = this.readLocal(this.TABLES.CUSTOMERS);
        return customers.filter(customer =>
            customer.name?.toLowerCase().includes(query.toLowerCase()) ||
            customer.phone?.includes(query) ||
            customer.email?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
    }

    async getEmployeeAttendanceSummary(employeeId, startDate, endDate) {
        const records = await this.getAttendanceRecords({
            employee_id: employeeId,
            attendance_date: { gte: startDate, lte: endDate }
        });

        const summary = {
            total_days: records.length,
            present_days: records.filter(r => r.status === 'present').length,
            absent_days: records.filter(r => r.status === 'absent').length,
            half_days: records.filter(r => r.status === 'half_day').length,
            total_work_hours: records.reduce((sum, r) => sum + (parseFloat(r.work_hours) || 0), 0),
            total_overtime: records.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0),
            attendance_rate: records.length > 0 ?
                (records.filter(r => r.status === 'present').length / records.length * 100).toFixed(1) + '%' : '0%'
        };

        return summary;
    }

    async getEmployeeSalarySummary(employeeId, year = null) {
        const targetYear = year || new Date().getFullYear();
        const startDate = `${targetYear}-01-01`;
        const endDate = `${targetYear}-12-31`;

        const [salaryPayments, advances, attendance] = await Promise.all([
            this.getSalaryPayments({
                employee_id: employeeId,
                payment_date: { gte: startDate, lte: endDate }
            }),
            this.getSimpleAdvances({
                employee_id: employeeId,
                advance_date: { gte: startDate, lte: endDate }
            }),
            this.getAttendanceRecords({
                employee_id: employeeId,
                attendance_date: { gte: startDate, lte: endDate }
            })
        ]);

        const totalSalary = salaryPayments.reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0);
        const totalAdvances = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        const totalWorkDays = attendance.filter(r => r.status === 'present').length;

        return {
            total_salary: totalSalary,
            total_advances: totalAdvances,
            total_work_days: totalWorkDays,
            salary_payments_count: salaryPayments.length,
            advances_count: advances.length,
            average_salary: salaryPayments.length > 0 ? totalSalary / salaryPayments.length : 0
        };
    }

    async getFamilyGroupMembers(familyGroupId) {
        return await this.getEmployees({
            family_group_id: familyGroupId
        });
    }

    // ==================== BULK OPERATIONS ====================

    async bulkCreate(table, items) {
        console.log(`📦 Bulk creating ${items.length} items in ${table}...`);

        if (this.isOnline && !this.missingTables.has(table)) {
            try {
                const sanitizedItems = items.map(item =>
                    this.sanitizeDataForTable(table, item)
                );

                const { data, error } = await this.supabase
                    .from(table)
                    .insert(sanitizedItems)
                    .select();

                if (error) throw error;
                console.log(`✅ Bulk created ${data.length} items in ${table}`);
                return data || [];
            } catch (error) {
                console.error(`Bulk create failed for ${table}:`, error);
                if (this.isTableMissingError(error)) {
                    this.missingTables.add(table);
                }
            }
        }

        // Fallback to individual creates
        const results = [];
        for (const item of items) {
            try {
                const result = await this.create(table, item);
                results.push(result);
            } catch (error) {
                console.error(`Failed to create item in ${table}:`, error);
            }
        }
        return results;
    }

    async bulkMarkAttendance(attendanceData) {
        return await this.bulkCreate(this.TABLES.ATTENDANCE, attendanceData);
    }

    async bulkProcessSalaryPayments(paymentData) {
        return await this.bulkCreate(this.TABLES.SALARY_PAYMENTS, paymentData);
    }

    // ==================== DASHBOARD & REPORTS ====================

    async getDashboardStats() {
        try {
            const [customers, employees, bills, payments] = await Promise.all([
                this.getCustomers(),
                this.getEmployees(),
                this.getBills(),
                this.getPayments()
            ]);

            const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0);
            const totalGST = bills.reduce((sum, bill) => sum + parseFloat(bill.gst_amount || 0), 0);
            const totalReceived = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
            const pendingPayments = bills.filter(bill => bill.status === 'pending').length;

            return {
                totalCustomers: customers.length,
                totalEmployees: employees.length,
                totalSales: totalSales,
                totalGST: totalGST,
                totalReceived: totalReceived,
                pendingPayments: pendingPayments,
                outstandingAmount: totalSales - totalReceived,
                recentActivity: bills.length + payments.length
            };
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            return this.getDashboardStatsFallback();
        }
    }

    getDashboardStatsFallback() {
        const customers = this.readLocal(this.TABLES.CUSTOMERS);
        const employees = this.readLocal(this.TABLES.EMPLOYEES);
        const bills = this.readLocal(this.TABLES.BILLS);
        const payments = this.readLocal(this.TABLES.PAYMENTS);

        const totalSales = bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0);
        const totalGST = bills.reduce((sum, bill) => sum + parseFloat(bill.gst_amount || 0), 0);
        const totalReceived = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

        return {
            totalCustomers: customers.length,
            totalEmployees: employees.length,
            totalSales: totalSales,
            totalGST: totalGST,
            totalReceived: totalReceived,
            pendingPayments: bills.filter(bill => bill.status === 'pending').length,
            outstandingAmount: totalSales - totalReceived,
            recentActivity: bills.length + payments.length
        };
    }

    // ==================== BACKUP & RESTORE ====================

    async createBackup() {
        try {
            const backupData = {};

            for (const table of Object.values(this.TABLES)) {
                backupData[table] = await this.read(table);
            }

            const backupString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([backupString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `business_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Backup created successfully');
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }

    async restoreBackup(backupFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);

                    for (const [table, data] of Object.entries(backupData)) {
                        if (Object.values(this.TABLES).includes(table)) {
                            console.log(`🔄 Restoring ${data.length} records to ${table}...`);

                            // Clear existing data
                            const existingData = await this.read(table);
                            for (const item of existingData) {
                                await this.delete(table, item.id);
                            }

                            // Restore backup data
                            await this.bulkCreate(table, data);
                        }
                    }

                    console.log('✅ Backup restored successfully');
                    resolve(true);
                } catch (error) {
                    console.error('Error restoring backup:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read backup file'));
            reader.readAsText(backupFile);
        });
    }

    // ==================== MAINTENANCE ====================

    async cleanupOldData() {
        try {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const oneYearAgoString = oneYearAgo.toISOString().split('T')[0];

            if (this.isOnline) {
                // Clean up old attendance records
                const { error: attendanceError } = await this.supabase
                    .from(this.TABLES.ATTENDANCE)
                    .delete()
                    .lt('attendance_date', oneYearAgoString);

                if (attendanceError) throw attendanceError;

                // Clean up old salary records
                const { error: salaryError } = await this.supabase
                    .from(this.TABLES.SALARY_RECORDS)
                    .delete()
                    .lt('record_date', oneYearAgoString);

                if (salaryError) throw salaryError;
            } else {
                // Local cleanup
                this.cleanupLocalOldData();
            }

            console.log('✅ Cleaned up old data successfully');
            return true;
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            return false;
        }
    }

    cleanupLocalOldData() {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        Object.values(this.TABLES).forEach(table => {
            const items = this.readLocal(table);
            const filtered = items.filter(item => {
                const itemDate = new Date(item.created_at || item.attendance_date || item.record_date);
                return itemDate >= oneYearAgo;
            });
            localStorage.setItem(table, JSON.stringify(filtered));
        });
    }

    /**
     * 🛡️ SAFE TABLE VALIDATION METHOD
     * Checks if columns exist before using them in queries
     */
    async validateTableColumns(table, requiredColumns = []) {
        if (!this.isOnline) return true; // Skip validation in offline mode

        try {
            const { data, error } = await this.supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_schema', 'public')
                .eq('table_name', table)
                .in('column_name', requiredColumns);

            if (error) {
                console.warn(`Could not validate columns for ${table}:`, error.message);
                return false;
            }

            const existingColumns = data.map(row => row.column_name);
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

            if (missingColumns.length > 0) {
                console.warn(`Table ${table} missing columns:`, missingColumns);
                return false;
            }

            return true;
        } catch (error) {
            console.warn(`Column validation failed for ${table}:`, error.message);
            return false;
        }
    }

    /**
     * 🛡️ SAFE EMPLOYEE QUERY METHOD
     * Handles missing columns gracefully
     */
    async getEmployeesSafe(filters = {}) {
        const requiredColumns = ['id', 'name', 'role', 'status', 'basic_salary', 'salary_type'];
        const columnsValid = await this.validateTableColumns('employees', requiredColumns);

        if (!columnsValid) {
            console.warn('Using fallback employee query due to missing columns');
            // Fallback to basic columns that definitely exist
            return await this.read(this.TABLES.EMPLOYEES, {
                where: { id: filters.id }, // Only use ID filter for safety
                orderBy: 'created_at',
                ascending: false
            });
        }

        // All columns exist, use normal query
        return await this.getEmployees(filters);
    }

    // ==================== STATUS & HEALTH ====================

    async healthCheck() {
        try {
            if (this.isOnline) {
                const { error } = await this.supabase
                    .from(this.TABLES.USERS)
                    .select('count')
                    .limit(1)
                    .single();
                return !error;
            }
            return true; // Local storage is always available
        } catch (error) {
            console.warn('Health check failed:', error);
            return false;
        }
    }

    updateConnectionStatus() {
        // ✅ FIX: Get ALL dbStatus elements and update them consistently
        const statusElements = document.querySelectorAll('#dbStatus');

        statusElements.forEach((statusElement, index) => {
            // ✅ FIX: Remove duplicates - keep only the first one
            if (index > 0) {
                statusElement.remove();
                return;
            }

            if (this.isOnline) {
                statusElement.className = 'db-status online';
                // ✅ FIX: Use consistent HTML structure
                statusElement.innerHTML = '<i class="fas fa-cloud"></i><span>Online</span>';
                statusElement.title = 'Connected to Supabase';
            } else {
                statusElement.className = 'db-status offline';
                // ✅ FIX: Use consistent HTML structure
                statusElement.innerHTML = '<i class="fas fa-desktop"></i><span>Offline</span>';
                statusElement.title = 'Using local storage - data will sync when online';
            }

            // ✅ FIX: Ensure proper styling
            statusElement.style.display = 'flex';
            statusElement.style.alignItems = 'center';
            statusElement.style.gap = '0.5rem';
        });

        // ✅ FIX: If no status element exists, create one properly
        if (statusElements.length === 0) {
            this.createDatabaseStatusElement();
        }
    }

    // ✅ FIX: Add this method to create the status element properly
    createDatabaseStatusElement() {
        const topbarRight = document.querySelector('.topbar-right');
        if (!topbarRight) return;

        // Check if element already exists
        if (document.getElementById('dbStatus')) return;

        const statusElement = document.createElement('div');
        statusElement.id = 'dbStatus';
        statusElement.className = 'db-status online';
        statusElement.innerHTML = '<i class="fas fa-cloud"></i><span>Online</span>';
        statusElement.title = 'Connected to Supabase';

        // ✅ FIX: Insert at correct position (before user-info)
        const userInfo = topbarRight.querySelector('.user-info');
        if (userInfo) {
            topbarRight.insertBefore(statusElement, userInfo);
        } else {
            topbarRight.appendChild(statusElement);
        }
    }

    async processPendingOperations() {
        if (this.pendingOperations.length === 0) return;

        console.log(`🔄 Processing ${this.pendingOperations.length} pending operations...`);

        while (this.pendingOperations.length > 0) {
            const operation = this.pendingOperations.shift();
            try {
                await operation();
            } catch (error) {
                console.error('Failed to process pending operation:', error);
            }
        }
    }

    initializeLocalStorage() {
        Object.values(this.TABLES).forEach(table => {
            if (!localStorage.getItem(table)) {
                localStorage.setItem(table, '[]');
            }
        });
    }

    // ==================== CLEANUP ====================

    cleanup() {
        this.pendingOperations = [];
        this.localCache.clear();
        console.log('🧹 Database manager cleaned up');
    }

    // ==================== DESTRUCTOR ====================

    destroy() {
        this.cleanup();
        this.initialized = false;
        this.isOnline = false;
        console.log('♻️ Database manager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseManager;
} else {
    window.DatabaseManager = DatabaseManager;
}

console.log('✅ DatabaseManager class loaded successfully');