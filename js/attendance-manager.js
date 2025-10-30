class AttendanceManager {
    constructor(dependencies) {
        if (!dependencies) throw new Error('AttendanceManager: dependencies required');
        
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        
        this.attendanceRecords = [];
        this.employees = [];
        this.currentDateFilter = 'all';
        this.initialized = false;
        
        // Bind methods for event listeners
        this.handleClick = this.handleClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    async initialize() {
        if (this.initialized) {
            console.log('🔄 Attendance manager already initialized');
            return this;
        }

        console.log('📅 Initializing attendance manager...');

        try {
            await this.loadEmployees();
            await this.loadAttendanceRecords();
            this.setupEventListeners();
            this.initialized = true;
            console.log('✅ Attendance manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize attendance manager:', error);
            throw error;
        }

        return this;
    }

    async loadEmployees() {
        try {
            this.employees = await this.db.getEmployees({ status: 'active' }) || [];
            console.log(`👥 Loaded ${this.employees.length} active employees`);
        } catch (error) {
            console.error('Error loading employees:', error);
            this.employees = [];
        }
    }

    async loadAttendanceRecords(filters = {}) {
        try {
            console.log('📊 Loading attendance records...');
            
            let records;
            if (this.db.getAttendanceRecords) {
                records = await this.db.getAttendanceRecords(filters);
            } else {
                records = await this.db.getAll('attendance');
            }
            
            this.attendanceRecords = records || [];
            console.log('📊 Loaded', this.attendanceRecords.length, 'attendance records');
        } catch (error) {
            console.error('Error loading attendance records:', error);
            this.attendanceRecords = [];
        }
    }

    getAttendanceRecords(filters = {}) {
        let filteredRecords = this.attendanceRecords;

        if (filters.employee_id) {
            filteredRecords = filteredRecords.filter(record =>
                record.employee_id === filters.employee_id
            );
        }
        if (filters.attendance_date) {
            filteredRecords = filteredRecords.filter(record =>
                record.attendance_date === filters.attendance_date
            );
        }
        if (filters.status) {
            filteredRecords = filteredRecords.filter(record =>
                record.status === filters.status
            );
        }
        if (filters.start_date && filters.end_date) {
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.attendance_date);
                return recordDate >= new Date(filters.start_date) &&
                    recordDate <= new Date(filters.end_date);
            });
        }

        return filteredRecords;
    }

    // ==================== QUICK ATTENDANCE MODAL ====================

    showQuickAttendanceModal() {
        const today = new Date().toISOString().split('T')[0];
        const todaysRecords = this.getAttendanceRecords({ attendance_date: today });

        const modalHtml = `
            <div id="quickAttendanceModal" class="modal">
                <div class="modal-content" style="max-width: 1200px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-calendar-check"></i> Mark Attendance - ${today}</h3>
                        <div class="header-actions">
                            <button class="btn-secondary" id="markAllPresent">
                                <i class="fas fa-check-circle"></i> Mark All Present
                            </button>
                            <button class="btn-secondary" id="markAllAbsent">
                                <i class="fas fa-times-circle"></i> Mark All Absent
                            </button>
                            <button class="btn-close modal-close">&times;</button>
                        </div>
                    </div>
                    
                    <div class="attendance-container">
                        <!-- Summary Stats -->
                        <div class="attendance-stats">
                            <div class="stat-card">
                                <div class="stat-value" id="totalEmployees">${this.employees.length}</div>
                                <div class="stat-label">Total Employees</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value present" id="presentCount">0</div>
                                <div class="stat-label">Present</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value absent" id="absentCount">0</div>
                                <div class="stat-label">Absent</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value half-day" id="halfDayCount">0</div>
                                <div class="stat-label">Half Day</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value pending" id="pendingCount">${this.employees.length}</div>
                                <div class="stat-label">Pending</div>
                            </div>
                        </div>

                        <!-- Employee List -->
                        <div class="employee-attendance-grid">
                            <div class="grid-header">
                                <div class="col-employee">Employee Details</div>
                                <div class="col-salary">Monthly Salary</div>
                                <div class="col-status">Attendance Status</div>
                                <div class="col-time">Time Details</div>
                                <div class="col-actions">Actions</div>
                            </div>
                            <div class="grid-body" id="attendanceGridBody">
                                ${this.renderAttendanceGrid(today, todaysRecords)}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="attendance-actions">
                            <button class="btn-secondary" id="clearAllAttendance">
                                <i class="fas fa-eraser"></i> Clear All
                            </button>
                            <button class="btn-primary" id="saveAttendance">
                                <i class="fas fa-save"></i> Save Attendance
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'quickAttendanceModal');
        this.setupQuickAttendanceEvents();
        this.updateAttendanceStats();
    }

    renderAttendanceGrid(today, todaysRecords) {
        return this.employees.map(employee => {
            const todayRecord = todaysRecords.find(r => r.employee_id === employee.id);
            const currentStatus = todayRecord?.status || '';
            const monthlySalary = this.formatSalary(employee.monthly_salary || employee.salary || 0);
            
            return `
                <div class="attendance-row" data-employee-id="${employee.id}">
                    <!-- Employee Details -->
                    <div class="col-employee">
                        <div class="employee-info-compact">
                            <div class="avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="details">
                                <div class="name">${employee.name}</div>
                                <div class="meta">
                                    <span class="id">${employee.id}</span>
                                    <span class="role">${employee.role || 'Employee'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Salary -->
                    <div class="col-salary">
                        <div class="salary-amount">${monthlySalary}</div>
                    </div>

                    <!-- Status -->
                    <div class="col-status">
                        <div class="status-selector">
                            <div class="status-options">
                                <button type="button" class="status-option present ${currentStatus === 'present' ? 'active' : ''}" 
                                        data-status="present">
                                    <i class="fas fa-check"></i>
                                    <span>Present</span>
                                </button>
                                <button type="button" class="status-option absent ${currentStatus === 'absent' ? 'active' : ''}" 
                                        data-status="absent">
                                    <i class="fas fa-times"></i>
                                    <span>Absent</span>
                                </button>
                                <button type="button" class="status-option half-day ${currentStatus === 'half_day' ? 'active' : ''}" 
                                        data-status="half_day">
                                    <i class="fas fa-adjust"></i>
                                    <span>Half Day</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Time Details -->
                    <div class="col-time">
                        <div class="time-inputs">
                            <div class="time-group">
                                <label>Check In</label>
                                <input type="time" class="time-input check-in" 
                                       value="${todayRecord?.check_in_time || '09:00'}" 
                                       ${currentStatus === 'absent' ? 'disabled' : ''}>
                            </div>
                            <div class="time-group">
                                <label>Check Out</label>
                                <input type="time" class="time-input check-out" 
                                       value="${todayRecord?.check_out_time || '18:00'}" 
                                       ${currentStatus === 'absent' ? 'disabled' : ''}>
                            </div>
                            <div class="hours-display">
                                <span class="hours">${this.calculateWorkHours(
                                    todayRecord?.check_in_time || '09:00', 
                                    todayRecord?.check_out_time || '18:00'
                                ).toFixed(1)}h</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="col-actions">
                        <button type="button" class="btn-sm btn-clear" onclick="app.getManagers().attendance.clearEmployeeAttendance('${employee.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupQuickAttendanceEvents() {
        // Mark all buttons
        document.getElementById('markAllPresent')?.addEventListener('click', () => {
            this.markAllEmployees('present');
        });

        document.getElementById('markAllAbsent')?.addEventListener('click', () => {
            this.markAllEmployees('absent');
        });

        document.getElementById('clearAllAttendance')?.addEventListener('click', () => {
            this.clearAllAttendance();
        });

        // Save attendance
        document.getElementById('saveAttendance')?.addEventListener('click', async () => {
            await this.saveBulkAttendance();
        });

        // Individual status buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.status-option')) {
                const statusBtn = e.target.closest('.status-option');
                const row = statusBtn.closest('.attendance-row');
                const employeeId = row.getAttribute('data-employee-id');
                const status = statusBtn.getAttribute('data-status');
                
                this.setEmployeeAttendance(employeeId, status);
            }
        });

        // Time input changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('time-input')) {
                const row = e.target.closest('.attendance-row');
                const employeeId = row.getAttribute('data-employee-id');
                this.updateEmployeeHours(employeeId);
            }
        });
    }

    markAllEmployees(status) {
        document.querySelectorAll('.attendance-row').forEach(row => {
            const employeeId = row.getAttribute('data-employee-id');
            this.setEmployeeAttendance(employeeId, status);
        });
    }

    clearAllAttendance() {
        document.querySelectorAll('.attendance-row').forEach(row => {
            const employeeId = row.getAttribute('data-employee-id');
            this.clearEmployeeAttendance(employeeId);
        });
    }

    setEmployeeAttendance(employeeId, status) {
        const row = document.querySelector(`.attendance-row[data-employee-id="${employeeId}"]`);
        if (!row) return;

        // Update status buttons
        row.querySelectorAll('.status-option').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-status') === status);
        });

        // Enable/disable time inputs
        const timeInputs = row.querySelectorAll('.time-input');
        const isAbsent = status === 'absent';
        
        timeInputs.forEach(input => {
            input.disabled = isAbsent;
        });

        // Set default times based on status
        const checkIn = row.querySelector('.check-in');
        const checkOut = row.querySelector('.check-out');
        
        if (status === 'present') {
            checkIn.value = checkIn.value || '09:00';
            checkOut.value = checkOut.value || '18:00';
        } else if (status === 'half_day') {
            checkIn.value = checkIn.value || '09:00';
            checkOut.value = checkOut.value || '13:00';
        } else if (status === 'absent') {
            checkIn.value = '';
            checkOut.value = '';
        }

        this.updateEmployeeHours(employeeId);
        this.updateAttendanceStats();
    }

    clearEmployeeAttendance(employeeId) {
        const row = document.querySelector(`.attendance-row[data-employee-id="${employeeId}"]`);
        if (!row) return;

        // Clear all status buttons
        row.querySelectorAll('.status-option').forEach(btn => {
            btn.classList.remove('active');
        });

        // Enable time inputs and reset to defaults
        const timeInputs = row.querySelectorAll('.time-input');
        timeInputs.forEach(input => {
            input.disabled = false;
            if (input.classList.contains('check-in')) input.value = '09:00';
            if (input.classList.contains('check-out')) input.value = '18:00';
        });

        this.updateEmployeeHours(employeeId);
        this.updateAttendanceStats();
    }

    updateEmployeeHours(employeeId) {
        const row = document.querySelector(`.attendance-row[data-employee-id="${employeeId}"]`);
        if (!row) return;

        const checkIn = row.querySelector('.check-in').value;
        const checkOut = row.querySelector('.check-out').value;
        const hoursDisplay = row.querySelector('.hours');
        
        if (checkIn && checkOut) {
            const hours = this.calculateWorkHours(checkIn, checkOut);
            hoursDisplay.textContent = `${hours.toFixed(1)}h`;
        } else {
            hoursDisplay.textContent = '0h';
        }
    }

    updateAttendanceStats() {
        const rows = document.querySelectorAll('.attendance-row');
        let presentCount = 0;
        let absentCount = 0;
        let halfDayCount = 0;

        rows.forEach(row => {
            const activeStatus = row.querySelector('.status-option.active');
            if (activeStatus) {
                const status = activeStatus.getAttribute('data-status');
                if (status === 'present') presentCount++;
                else if (status === 'absent') absentCount++;
                else if (status === 'half_day') halfDayCount++;
            }
        });

        const pendingCount = this.employees.length - (presentCount + absentCount + halfDayCount);

        const presentEl = document.getElementById('presentCount');
        const absentEl = document.getElementById('absentCount');
        const halfDayEl = document.getElementById('halfDayCount');
        const pendingEl = document.getElementById('pendingCount');

        if (presentEl) presentEl.textContent = presentCount;
        if (absentEl) absentEl.textContent = absentCount;
        if (halfDayEl) halfDayEl.textContent = halfDayCount;
        if (pendingEl) pendingEl.textContent = pendingCount;
    }

    async saveBulkAttendance() {
        const today = new Date().toISOString().split('T')[0];
        const attendanceData = [];
        const errors = [];

        document.querySelectorAll('.attendance-row').forEach(row => {
            const employeeId = row.getAttribute('data-employee-id');
            const activeStatus = row.querySelector('.status-option.active');
            
            if (!activeStatus) {
                // Skip employees without status
                return;
            }

            const status = activeStatus.getAttribute('data-status');
            const checkInTime = row.querySelector('.check-in').value;
            const checkOutTime = row.querySelector('.check-out').value;

            const recordData = {
                employee_id: employeeId,
                attendance_date: today,
                status: status,
                check_in_time: status === 'absent' ? null : (checkInTime || null),
                check_out_time: status === 'absent' ? null : (checkOutTime || null),
                working_hours: status === 'absent' ? 0 : this.calculateWorkHours(checkInTime, checkOutTime),
                overtime_hours: 0
            };

            // Validate
            const validationErrors = this.validateAttendanceData(recordData);
            if (validationErrors.length > 0) {
                const employee = this.getEmployeeById(employeeId);
                errors.push(`${employee?.name}: ${validationErrors.join(', ')}`);
                return;
            }

            attendanceData.push(recordData);
        });

        if (attendanceData.length === 0) {
            this.ui.showToast('No attendance data to save. Please mark attendance for at least one employee.', 'warning');
            return;
        }

        if (errors.length > 0) {
            this.ui.showToast(`Please fix errors: ${errors.join('; ')}`, 'error');
            return;
        }

        try {
            this.ui.showLoading('Saving attendance data...');
            
            // Save each attendance record
            for (const record of attendanceData) {
                await this.markAttendance(record);
            }
            
            this.ui.hideLoading();
            this.hideModal('quickAttendanceModal');
            this.ui.showToast(`✅ Attendance saved successfully for ${attendanceData.length} employees`, 'success');
            
            // Refresh the data
            await this.loadAttendanceRecords();
            this.renderAttendanceTable();
            this.updateAttendanceSummary();
            
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showToast('Error saving attendance records', 'error');
            console.error('Error saving bulk attendance:', error);
        }
    }

    // ==================== DATABASE OPERATIONS ====================

    async markAttendance(attendanceData) {
        try {
            // Validate required fields
            const validationErrors = this.validateAttendanceData(attendanceData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

            // Format data for database
            const recordToSave = {
                attendance_date: attendanceData.attendance_date,
                employee_id: attendanceData.employee_id,
                status: attendanceData.status,
                check_in_time: attendanceData.check_in_time || null,
                check_out_time: attendanceData.check_out_time || null,
                working_hours: attendanceData.working_hours || 0,
                overtime_hours: attendanceData.overtime_hours || 0,
                notes: attendanceData.notes || null
            };

            // Check for duplicate attendance
            const existing = await this.getAttendanceRecords({
                employee_id: attendanceData.employee_id,
                attendance_date: attendanceData.attendance_date
            });

            let result;
            if (existing && existing.length > 0) {
                // Update existing record
                const existingRecord = existing[0];
                if (this.db.updateAttendanceRecord) {
                    result = await this.db.updateAttendanceRecord(existingRecord.id, recordToSave);
                } else {
                    result = await this.db.update('attendance', existingRecord.id, recordToSave);
                }
                console.log('✅ Attendance updated:', existingRecord.id);
            } else {
                // Create new record
                if (this.db.createAttendanceRecord) {
                    result = await this.db.createAttendanceRecord(recordToSave);
                } else {
                    result = await this.db.create('attendance', recordToSave);
                }
                console.log('✅ Attendance created for:', attendanceData.employee_id);
            }

            return result;
        } catch (error) {
            console.error('❌ Error marking attendance:', error);
            throw error;
        }
    }

    async deleteAttendance(recordId) {
        try {
            if (confirm('Are you sure you want to delete this attendance record?')) {
                if (this.db.deleteAttendanceRecord) {
                    await this.db.deleteAttendanceRecord(recordId);
                } else {
                    await this.db.delete('attendance', recordId);
                }
                
                this.ui.showToast('Attendance record deleted successfully', 'success');
                await this.refreshAttendanceData();
            }
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            this.ui.showToast('Error deleting attendance record', 'error');
        }
    }

    // ==================== VALIDATION METHODS ====================

    validateAttendanceData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.employee_id) {
                errors.push('Employee ID is required');
            }
            if (!data.attendance_date) {
                errors.push('Attendance date is required');
            }
        }

        if (data.status && !['present', 'absent', 'half_day'].includes(data.status)) {
            errors.push('Invalid status. Must be: present, absent, or half_day');
        }

        if (data.working_hours && (data.working_hours < 0 || data.working_hours > 24)) {
            errors.push('Working hours must be between 0 and 24');
        }

        return errors;
    }

    // ==================== UTILITY METHODS ====================

    formatSalary(amount) {
        if (!amount) return '₹0';
        return '₹' + parseInt(amount).toLocaleString('en-IN');
    }

    calculateWorkHours(checkInTime, checkOutTime) {
        if (!checkInTime || !checkOutTime) return 0;

        try {
            const [inHours, inMinutes] = checkInTime.split(':').map(Number);
            const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

            const checkIn = new Date();
            checkIn.setHours(inHours, inMinutes, 0, 0);

            const checkOut = new Date();
            checkOut.setHours(outHours, outMinutes, 0, 0);

            // Handle case where check-out is next day
            if (checkOut < checkIn) {
                checkOut.setDate(checkOut.getDate() + 1);
            }

            const diffMs = checkOut - checkIn;
            const diffHours = diffMs / (1000 * 60 * 60);

            return Math.max(0, Math.min(24, diffHours));
        } catch (error) {
            console.error('Error calculating work hours:', error);
            return 0;
        }
    }

    getEmployeeById(employeeId) {
        return this.employees.find(emp => emp.id === employeeId);
    }

    // ==================== UI METHODS ====================

    async refreshAttendanceData() {
        try {
            await this.loadEmployees();
            await this.loadAttendanceRecords();
            this.updateAttendanceSummary();
            this.renderAttendanceTable();
            this.ui.showToast('Attendance data refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing attendance data:', error);
            this.ui.showToast('Error refreshing attendance data', 'error');
        }
    }

    updateAttendanceSummary() {
        const today = new Date().toISOString().split('T')[0];
        const todaysAttendance = this.getAttendanceRecords({ attendance_date: today });

        const presentCount = todaysAttendance.filter(r => r.status === 'present').length;
        const absentCount = todaysAttendance.filter(r => r.status === 'absent').length;
        const halfDayCount = todaysAttendance.filter(r => r.status === 'half_day').length;
        const totalEmployees = this.employees.length;

        // Update summary cards
        const presentEl = document.getElementById('presentTodayCount');
        const absentEl = document.getElementById('absentTodayCount');
        const halfDayEl = document.getElementById('halfDayTodayCount');
        const totalEl = document.getElementById('totalEmployeesCount');

        if (presentEl) presentEl.textContent = presentCount;
        if (absentEl) absentEl.textContent = absentCount;
        if (halfDayEl) halfDayEl.textContent = halfDayCount;
        if (totalEl) totalEl.textContent = totalEmployees;
    }

    renderAttendanceTable() {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        const dateFilter = document.getElementById('attendanceDateFilter')?.value;
        const statusFilter = document.getElementById('attendanceStatusFilter')?.value;

        let filteredRecords = this.attendanceRecords;

        // Apply date filter
        if (dateFilter && dateFilter !== 'all') {
            filteredRecords = filteredRecords.filter(record =>
                record.attendance_date === dateFilter
            );
        }

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
            filteredRecords = filteredRecords.filter(record =>
                record.status === statusFilter
            );
        }

        if (filteredRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-data">
                        <i class="fas fa-calendar-day"></i>
                        <br>No attendance records found for selected criteria
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredRecords.map(record => {
            const employee = this.getEmployeeById(record.employee_id);
            const statusClass = this.getStatusClass(record.status);
            return `
                <tr class="attendance-record ${statusClass}">
                    <td>${this.formatDate(record.attendance_date)}</td>
                    <td><strong>${employee?.id || record.employee_id}</strong></td>
                    <td>${employee?.name || 'Unknown Employee'}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="fas ${this.getStatusIcon(record.status)}"></i>
                            ${this.formatStatus(record.status)}
                        </span>
                    </td>
                    <td>${record.check_in_time || '-'}</td>
                    <td>${record.check_out_time || '-'}</td>
                    <td>${record.working_hours || '0'} hrs</td>
                    <td>${record.overtime_hours || '0'} hrs</td>
                    <td>${record.notes || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-secondary btn-sm" onclick="app.getManagers().attendance.deleteAttendance('${record.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusClass(status) {
        const statusClasses = {
            'present': 'status-present',
            'absent': 'status-absent',
            'half_day': 'status-half-day'
        };
        return statusClasses[status] || 'status-unknown';
    }

    getStatusIcon(status) {
        const statusIcons = {
            'present': 'fa-check-circle',
            'absent': 'fa-times-circle',
            'half_day': 'fa-clock'
        };
        return statusIcons[status] || 'fa-question-circle';
    }

    formatStatus(status) {
        const statusMap = {
            'present': 'Present',
            'absent': 'Absent',
            'half_day': 'Half Day'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // ==================== EVENT HANDLERS ====================

    handleClick(e) {
        // Quick attendance button
        if (e.target.id === 'quickAttendanceBtn' || e.target.closest('#quickAttendanceBtn')) {
            this.showQuickAttendanceModal();
            return;
        }

        // Refresh button
        if (e.target.id === 'refreshAttendance' || e.target.closest('#refreshAttendance')) {
            this.refreshAttendanceData();
            return;
        }

        // Date filter buttons
        if (e.target.closest('[data-filter]')) {
            const filter = e.target.closest('[data-filter]').getAttribute('data-filter');
            this.applyDateFilter(filter);
            return;
        }
    }

    handleKeydown(e) {
        // Keyboard shortcuts
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            this.showQuickAttendanceModal();
        }
    }

    setupEventListeners() {
        // Remove existing listeners first
        this.removeEventListeners();

        // Add new listeners
        document.addEventListener('click', this.handleClick);
        document.addEventListener('keydown', this.handleKeydown);

        // Filter event listeners
        const dateFilter = document.getElementById('attendanceDateFilter');
        const statusFilter = document.getElementById('attendanceStatusFilter');

        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.renderAttendanceTable());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.renderAttendanceTable());
        }
    }

    removeEventListeners() {
        document.removeEventListener('click', this.handleClick);
        document.removeEventListener('keydown', this.handleKeydown);
    }

    applyDateFilter(filter) {
        this.currentDateFilter = filter;
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
        this.renderAttendanceTable();
    }

    // ==================== MODAL MANAGEMENT ====================

    showCustomModal(html, modalId) {
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', html);

        // Setup modal closing
        const modal = document.getElementById(modalId);
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtns = modal?.querySelectorAll('.modal-cancel');

        const closeModal = () => this.hideModal(modalId);

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtns) {
            cancelBtns.forEach(btn => btn.addEventListener('click', closeModal));
        }

        // Close on background click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        // Show modal with animation
        setTimeout(() => {
            modal?.classList.add('active');
        }, 10);
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    // ==================== ATTENDANCE REPORT ====================

    showAttendanceReport() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const modalHtml = `
            <div id="attendanceReportModal" class="modal">
                <div class="modal-content" style="max-width: 1200px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-chart-bar"></i> Attendance Report</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    
                    <div class="report-container">
                        <!-- Report Controls -->
                        <div class="report-controls">
                            <div class="control-group">
                                <label for="reportPeriod">Report Period:</label>
                                <select id="reportPeriod">
                                    <option value="monthly">Monthly Report</option>
                                    <option value="custom">Custom Period</option>
                                </select>
                            </div>
                            
                            <div class="control-group" id="monthlyControl">
                                <label for="reportMonth">Select Month:</label>
                                <input type="month" id="reportMonth" value="${currentYear}-${currentMonth.toString().padStart(2, '0')}">
                            </div>
                            
                            <div class="control-group" id="customControl" style="display: none;">
                                <label for="startDate">From:</label>
                                <input type="date" id="startDate" value="${this.getFirstDayOfMonth(currentYear, currentMonth)}">
                                
                                <label for="endDate">To:</label>
                                <input type="date" id="endDate" value="${this.getLastDayOfMonth(currentYear, currentMonth)}">
                            </div>
                            
                            <div class="control-group">
                                <label for="departmentFilter">Department:</label>
                                <select id="departmentFilter">
                                    <option value="all">All Departments</option>
                                    ${this.getDepartmentOptions()}
                                </select>
                            </div>
                            
                            <button class="btn-primary" id="generateReport">
                                <i class="fas fa-sync"></i> Generate Report
                            </button>
                            
                            <button class="btn-secondary" id="exportReport">
                                <i class="fas fa-download"></i> Export Excel
                            </button>
                        </div>

                        <!-- Report Summary -->
                        <div class="report-summary" id="reportSummary">
                            ${this.renderReportSummary(currentMonth, currentYear)}
                        </div>

                        <!-- Detailed Report -->
                        <div class="report-details">
                            <div class="section-header">
                                <h4><i class="fas fa-list"></i> Detailed Report</h4>
                                <div class="report-meta" id="reportMeta">
                                    ${this.getReportMeta(currentMonth, currentYear)}
                                </div>
                            </div>
                            
                            <div class="table-container">
                                <table class="data-table report-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>ID</th>
                                            <th>Department</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>Half Days</th>
                                            <th>Total Days</th>
                                            <th>Work Hours</th>
                                            <th>Overtime</th>
                                            <th>Attendance %</th>
                                        </tr>
                                    </thead>
                                    <tbody id="reportTableBody">
                                        ${this.renderReportTable(currentMonth, currentYear)}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Charts Section -->
                        <div class="charts-section">
                            <div class="chart-row">
                                <div class="chart-container">
                                    <h5><i class="fas fa-chart-pie"></i> Attendance Distribution</h5>
                                    <div class="chart-placeholder" id="attendanceChart">
                                        ${this.renderAttendanceChart(currentMonth, currentYear)}
                                    </div>
                                </div>
                                <div class="chart-container">
                                    <h5><i class="fas fa-tachometer-alt"></i> Performance Metrics</h5>
                                    <div class="metrics-grid" id="performanceMetrics">
                                        ${this.renderPerformanceMetrics(currentMonth, currentYear)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showCustomModal(modalHtml, 'attendanceReportModal');
        this.setupReportEvents();
    }

    // Helper methods for date calculations
    getFirstDayOfMonth(year, month) {
        return `${year}-${month.toString().padStart(2, '0')}-01`;
    }

    getLastDayOfMonth(year, month) {
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    }

    getDepartmentOptions() {
        const departments = [...new Set(this.employees.map(emp => emp.department).filter(Boolean))];
        return departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
    }

    // Report generation methods
    generateMonthlyReport(month, year, department = 'all') {
        const startDate = this.getFirstDayOfMonth(year, month);
        const endDate = this.getLastDayOfMonth(year, month);
        
        return this.generateCustomReport(startDate, endDate, department);
    }

    generateCustomReport(startDate, endDate, department = 'all') {
        const periodRecords = this.getAttendanceRecords({
            start_date: startDate,
            end_date: endDate
        });

        // Filter employees by department
        let filteredEmployees = this.employees;
        if (department !== 'all') {
            filteredEmployees = this.employees.filter(emp => emp.department === department);
        }

        const reportData = {
            period: { startDate, endDate },
            summary: this.calculateReportSummary(filteredEmployees, periodRecords, startDate, endDate),
            employees: this.calculateEmployeeStats(filteredEmployees, periodRecords, startDate, endDate),
            charts: this.generateChartData(filteredEmployees, periodRecords)
        };

        return reportData;
    }

    calculateReportSummary(employees, records, startDate, endDate) {
        const totalEmployees = employees.length;
        const totalDays = this.calculateWorkingDays(startDate, endDate);
        const totalPossibleAttendance = totalEmployees * totalDays;
        
        const presentDays = records.filter(r => r.status === 'present').length;
        const absentDays = records.filter(r => r.status === 'absent').length;
        const halfDays = records.filter(r => r.status === 'half_day').length;
        
        const attendanceRate = totalPossibleAttendance > 0 ? 
            ((presentDays + (halfDays * 0.5)) / totalPossibleAttendance * 100) : 0;
        
        const totalHours = records.reduce((sum, r) => sum + (parseFloat(r.working_hours) || 0), 0);
        const overtimeHours = records.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);

        return {
            totalEmployees,
            totalDays,
            presentDays,
            absentDays,
            halfDays,
            totalHours: parseFloat(totalHours.toFixed(1)),
            overtimeHours: parseFloat(overtimeHours.toFixed(1)),
            attendanceRate: parseFloat(attendanceRate.toFixed(1)),
            averageHoursPerDay: totalDays > 0 ? parseFloat((totalHours / totalDays).toFixed(1)) : 0
        };
    }

    calculateEmployeeStats(employees, records, startDate, endDate) {
        const totalDays = this.calculateWorkingDays(startDate, endDate);
        
        return employees.map(employee => {
            const empRecords = records.filter(r => r.employee_id === employee.id);
            
            const presentDays = empRecords.filter(r => r.status === 'present').length;
            const absentDays = empRecords.filter(r => r.status === 'absent').length;
            const halfDays = empRecords.filter(r => r.status === 'half_day').length;
            
            const totalWorkHours = empRecords.reduce((sum, r) => sum + (parseFloat(r.working_hours) || 0), 0);
            const totalOvertime = empRecords.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);
            
            const attendanceRate = totalDays > 0 ? 
                ((presentDays + (halfDays * 0.5)) / totalDays * 100) : 0;

            return {
                employee,
                presentDays,
                absentDays,
                halfDays,
                totalDays: empRecords.length,
                totalWorkHours: parseFloat(totalWorkHours.toFixed(1)),
                totalOvertime: parseFloat(totalOvertime.toFixed(1)),
                attendanceRate: parseFloat(attendanceRate.toFixed(1)),
                requiredDays: totalDays
            };
        });
    }

    calculateWorkingDays(startDate, endDate) {
        let count = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        while (start <= end) {
            const day = start.getDay();
            if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
                count++;
            }
            start.setDate(start.getDate() + 1);
        }
        
        return count;
    }

    generateChartData(employees, records) {
        // Attendance distribution
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;
        const halfDayCount = records.filter(r => r.status === 'half_day').length;
        
        // Department-wise attendance
        const deptAttendance = {};
        employees.forEach(emp => {
            if (!deptAttendance[emp.department]) {
                deptAttendance[emp.department] = { present: 0, absent: 0, halfDay: 0, total: 0 };
            }
            const empRecords = records.filter(r => r.employee_id === emp.id);
            deptAttendance[emp.department].present += empRecords.filter(r => r.status === 'present').length;
            deptAttendance[emp.department].absent += empRecords.filter(r => r.status === 'absent').length;
            deptAttendance[emp.department].halfDay += empRecords.filter(r => r.status === 'half_day').length;
            deptAttendance[emp.department].total += empRecords.length;
        });

        return {
            attendanceDistribution: { presentCount, absentCount, halfDayCount },
            departmentWise: deptAttendance
        };
    }

    // Rendering methods
    renderReportSummary(month, year) {
        const reportData = this.generateMonthlyReport(month, year);
        const summary = reportData.summary;

        return `
            <div class="summary-grid">
                <div class="summary-card primary">
                    <div class="summary-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${summary.totalEmployees}</div>
                        <div class="summary-label">Total Employees</div>
                    </div>
                </div>
                
                <div class="summary-card success">
                    <div class="summary-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${summary.presentDays}</div>
                        <div class="summary-label">Present Days</div>
                    </div>
                </div>
                
                <div class="summary-card danger">
                    <div class="summary-icon">
                        <i class="fas fa-calendar-times"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${summary.absentDays}</div>
                        <div class="summary-label">Absent Days</div>
                    </div>
                </div>
                
                <div class="summary-card warning">
                    <div class="summary-icon">
                        <i class="fas fa-adjust"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${summary.halfDays}</div>
                        <div class="summary-label">Half Days</div>
                    </div>
                </div>
                
                <div class="summary-card info">
                    <div class="summary-icon">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${summary.attendanceRate}%</div>
                        <div class="summary-label">Attendance Rate</div>
                    </div>
                </div>
                
                <div class="summary-card dark">
                    <div class="summary-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${summary.totalHours}h</div>
                        <div class="summary-label">Total Hours</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderReportTable(month, year, department = 'all') {
        const reportData = this.generateMonthlyReport(month, year, department);
        
        if (reportData.employees.length === 0) {
            return `
                <tr>
                    <td colspan="10" class="no-data">
                        <i class="fas fa-chart-bar"></i>
                        <br>No attendance data available for selected period
                    </td>
                </tr>
            `;
        }

        return reportData.employees.map(empData => {
            const attendanceClass = this.getAttendanceRateClass(empData.attendanceRate);
            
            return `
                <tr>
                    <td class="employee-name">
                        <strong>${empData.employee.name}</strong>
                    </td>
                    <td>${empData.employee.id}</td>
                    <td>${empData.employee.department || 'N/A'}</td>
                    <td class="positive">${empData.presentDays}</td>
                    <td class="negative">${empData.absentDays}</td>
                    <td class="warning">${empData.halfDays}</td>
                    <td>${empData.totalDays}/${empData.requiredDays}</td>
                    <td>${empData.totalWorkHours}h</td>
                    <td class="overtime">${empData.totalOvertime}h</td>
                    <td class="attendance-rate ${attendanceClass}">
                        <div class="rate-display">
                            <span class="rate-value">${empData.attendanceRate}%</span>
                            <div class="rate-bar">
                                <div class="rate-fill" style="width: ${Math.min(100, empData.attendanceRate)}%"></div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getAttendanceRateClass(rate) {
        if (rate >= 90) return 'excellent';
        if (rate >= 80) return 'good';
        if (rate >= 70) return 'average';
        return 'poor';
    }

    renderAttendanceChart(month, year) {
        const reportData = this.generateMonthlyReport(month, year);
        const chart = reportData.charts.attendanceDistribution;
        const total = chart.presentCount + chart.absentCount + chart.halfDayCount;
        
        if (total === 0) {
            return '<div class="no-chart-data">No data available for chart</div>';
        }

        const presentPercent = (chart.presentCount / total * 100).toFixed(1);
        const absentPercent = (chart.absentCount / total * 100).toFixed(1);
        const halfDayPercent = (chart.halfDayCount / total * 100).toFixed(1);

        return `
            <div class="chart-bars">
                <div class="chart-bar present" style="height: ${presentPercent}%">
                    <span class="bar-label">Present<br>${presentPercent}%</span>
                </div>
                <div class="chart-bar absent" style="height: ${absentPercent}%">
                    <span class="bar-label">Absent<br>${absentPercent}%</span>
                </div>
                <div class="chart-bar half-day" style="height: ${halfDayPercent}%">
                    <span class="bar-label">Half Day<br>${halfDayPercent}%</span>
                </div>
            </div>
        `;
    }

    renderPerformanceMetrics(month, year) {
        const reportData = this.generateMonthlyReport(month, year);
        const summary = reportData.summary;

        return `
            <div class="metric-card">
                <div class="metric-value">${summary.averageHoursPerDay}h</div>
                <div class="metric-label">Avg Hours/Day</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.overtimeHours}h</div>
                <div class="metric-label">Total Overtime</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.totalDays}</div>
                <div class="metric-label">Working Days</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round(summary.totalHours / summary.totalEmployees)}h</div>
                <div class="metric-label">Avg per Employee</div>
            </div>
        `;
    }

    getReportMeta(month, year) {
        const startDate = this.getFirstDayOfMonth(year, month);
        const endDate = this.getLastDayOfMonth(year, month);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return `
            <span>Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}</span>
            <span>Generated: ${new Date().toLocaleDateString()}</span>
        `;
    }

    // Event handlers for report
    setupReportEvents() {
        // Period type change
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => {
                const isMonthly = e.target.value === 'monthly';
                const monthlyControl = document.getElementById('monthlyControl');
                const customControl = document.getElementById('customControl');
                
                if (monthlyControl) monthlyControl.style.display = isMonthly ? 'block' : 'none';
                if (customControl) customControl.style.display = isMonthly ? 'none' : 'block';
            });
        }

        // Generate report
        const generateReport = document.getElementById('generateReport');
        if (generateReport) {
            generateReport.addEventListener('click', () => {
                this.generateAndDisplayReport();
            });
        }

        // Export report
        const exportReport = document.getElementById('exportReport');
        if (exportReport) {
            exportReport.addEventListener('click', () => {
                this.exportReportToExcel();
            });
        }
    }

    generateAndDisplayReport() {
        const periodType = document.getElementById('reportPeriod')?.value || 'monthly';
        const department = document.getElementById('departmentFilter')?.value || 'all';
        
        let reportData;
        let month, year, startDate, endDate;

        if (periodType === 'monthly') {
            const monthInput = document.getElementById('reportMonth')?.value;
            if (monthInput) {
                [year, month] = monthInput.split('-').map(Number);
                reportData = this.generateMonthlyReport(month, year, department);
            }
        } else {
            startDate = document.getElementById('startDate')?.value;
            endDate = document.getElementById('endDate')?.value;
            if (startDate && endDate) {
                reportData = this.generateCustomReport(startDate, endDate, department);
            }
        }

        if (!reportData) return;

        // Update UI with new report data
        const reportSummary = document.getElementById('reportSummary');
        const reportTableBody = document.getElementById('reportTableBody');
        const attendanceChart = document.getElementById('attendanceChart');
        const performanceMetrics = document.getElementById('performanceMetrics');
        const reportMeta = document.getElementById('reportMeta');

        if (reportSummary) reportSummary.innerHTML = this.renderReportSummary(month, year, department);
        if (reportTableBody) reportTableBody.innerHTML = this.renderReportTable(month, year, department);
        if (attendanceChart) attendanceChart.innerHTML = this.renderAttendanceChart(month, year, department);
        if (performanceMetrics) performanceMetrics.innerHTML = this.renderPerformanceMetrics(month, year, department);
        
        // Update report meta
        if (periodType === 'monthly') {
            if (reportMeta) reportMeta.innerHTML = this.getReportMeta(month, year);
        } else {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (reportMeta) {
                reportMeta.innerHTML = `
                    <span>Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}</span>
                    <span>Generated: ${new Date().toLocaleDateString()}</span>
                `;
            }
        }

        this.ui.showToast('Report generated successfully', 'success');
    }

    exportReportToExcel() {
        const periodType = document.getElementById('reportPeriod')?.value || 'monthly';
        const department = document.getElementById('departmentFilter')?.value || 'all';
        
        let reportData;
        let fileName;

        if (periodType === 'monthly') {
            const monthInput = document.getElementById('reportMonth')?.value;
            if (monthInput) {
                const [year, month] = monthInput.split('-').map(Number);
                reportData = this.generateMonthlyReport(month, year, department);
                fileName = `attendance_report_${year}_${month}.csv`;
            }
        } else {
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            if (startDate && endDate) {
                reportData = this.generateCustomReport(startDate, endDate, department);
                fileName = `attendance_report_${startDate}_to_${endDate}.csv`;
            }
        }

        if (!reportData) {
            this.ui.showToast('No data to export', 'warning');
            return;
        }

        try {
            const csvContent = this.generateCSV(reportData);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.ui.showToast('Report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.ui.showToast('Error exporting report', 'error');
        }
    }

    generateCSV(reportData) {
        const headers = [
            'Employee Name',
            'Employee ID', 
            'Department',
            'Present Days',
            'Absent Days',
            'Half Days',
            'Total Days',
            'Required Days',
            'Work Hours',
            'Overtime Hours',
            'Attendance Rate %'
        ];

        const rows = reportData.employees.map(empData => [
            `"${empData.employee.name}"`,
            empData.employee.id,
            `"${empData.employee.department || 'N/A'}"`,
            empData.presentDays,
            empData.absentDays,
            empData.halfDays,
            empData.totalDays,
            empData.requiredDays,
            empData.totalWorkHours,
            empData.totalOvertime,
            empData.attendanceRate
        ]);

        // Add summary row
        rows.push([]);
        rows.push([
            'SUMMARY',
            '',
            '',
            reportData.summary.presentDays,
            reportData.summary.absentDays,
            reportData.summary.halfDays,
            reportData.summary.totalDays,
            reportData.summary.totalEmployees * reportData.summary.totalDays,
            reportData.summary.totalHours,
            reportData.summary.overtimeHours,
            reportData.summary.attendanceRate
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // ==================== CLEANUP ====================

    destroy() {
        this.removeEventListeners();
        this.attendanceRecords = [];
        this.employees = [];
        this.initialized = false;
        console.log('🧹 Attendance manager destroyed');
    }
}

// Add CSS styles
const attendanceCSS = `
.attendance-container {
    padding: 1rem;
}

.attendance-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    text-align: center;
    border-left: 4px solid #6c757d;
}

.stat-card .stat-value {
    font-size: 1.8rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.stat-card .stat-value.present { color: #28a745; }
.stat-card .stat-value.absent { color: #dc3545; }
.stat-card .stat-value.half-day { color: #ffc107; }
.stat-card .stat-value.pending { color: #6c757d; }

.stat-label {
    font-size: 0.9rem;
    color: #6c757d;
    font-weight: 500;
}

.employee-attendance-grid {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
}

.grid-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1.5fr 2fr 0.5fr;
    background: #2c3e50;
    color: white;
    padding: 1rem;
    font-weight: 600;
    gap: 1rem;
}

.attendance-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1.5fr 2fr 0.5fr;
    padding: 1rem;
    border-bottom: 1px solid #e9ecef;
    gap: 1rem;
    align-items: center;
}

.attendance-row:last-child {
    border-bottom: none;
}

.attendance-row:hover {
    background: #f8f9fa;
}

.employee-info-compact {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #007bff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 0.9rem;
}

.details .name {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.25rem;
}

.details .meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #6c757d;
}

.salary-amount {
    font-weight: 600;
    color: #27ae60;
    font-size: 1rem;
}

.status-options {
    display: flex;
    gap: 0.25rem;
}

.status-option {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #dee2e6;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
}

.status-option:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-option.present.active {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
}

.status-option.absent.active {
    background: #f8d7da;
    border-color: #dc3545;
    color: #721c24;
}

.status-option.half-day.active {
    background: #fff3cd;
    border-color: #ffc107;
    color: #856404;
}

.time-inputs {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.time-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.time-group label {
    font-size: 0.75rem;
    color: #6c757d;
    font-weight: 500;
}

.time-input {
    padding: 0.4rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.85rem;
    width: 90px;
}

.time-input:disabled {
    background-color: #e9ecef;
    opacity: 0.6;
}

.hours-display {
    padding: 0.4rem 0.75rem;
    background: #f8f9fa;
    border-radius: 4px;
    font-weight: 600;
    color: #495057;
    font-size: 0.85rem;
}

.btn-sm {
    padding: 0.4rem 0.75rem;
    border: 1px solid #dc3545;
    background: white;
    color: #dc3545;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-sm:hover {
    background: #dc3545;
    color: white;
}

.attendance-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
}

.header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6c757d;
    padding: 0.25rem;
}

.btn-close:hover {
    color: #495057;
}

/* Report Styles */
.report-container {
    padding: 1rem;
}

.report-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    align-items: end;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-group label {
    font-weight: 600;
    color: #495057;
    font-size: 0.9rem;
}

.control-group select,
.control-group input {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.summary-card {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-radius: 8px;
    color: white;
    gap: 1rem;
}

.summary-card.primary { background: linear-gradient(135deg, #007bff, #0056b3); }
.summary-card.success { background: linear-gradient(135deg, #28a745, #1e7e34); }
.summary-card.danger { background: linear-gradient(135deg, #dc3545, #c82333); }
.summary-card.warning { background: linear-gradient(135deg, #ffc107, #e0a800); }
.summary-card.info { background: linear-gradient(135deg, #17a2b8, #138496); }
.summary-card.dark { background: linear-gradient(135deg, #343a40, #23272b); }

.summary-icon {
    font-size: 2rem;
    opacity: 0.8;
}

.summary-content {
    flex: 1;
}

.summary-value {
    font-size: 1.8rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
}

.summary-label {
    font-size: 0.9rem;
    opacity: 0.9;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e9ecef;
}

.section-header h4 {
    margin: 0;
    color: #495057;
}

.report-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: #6c757d;
}

.table-container {
    overflow-x: auto;
    margin-bottom: 1.5rem;
}

.report-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.report-table th {
    background: #2c3e50;
    color: white;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    border: none;
}

.report-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e9ecef;
}

.report-table tr:hover {
    background: #f8f9fa;
}

.positive { color: #28a745; font-weight: 600; }
.negative { color: #dc3545; font-weight: 600; }
.warning { color: #ffc107; font-weight: 600; }
.overtime { color: #17a2b8; font-weight: 600; }

.attendance-rate.excellent .rate-value { color: #28a745; }
.attendance-rate.good .rate-value { color: #17a2b8; }
.attendance-rate.average .rate-value { color: #ffc107; }
.attendance-rate.poor .rate-value { color: #dc3545; }

.rate-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.rate-bar {
    flex: 1;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
}

.rate-fill {
    height: 100%;
    background: currentColor;
    transition: width 0.3s ease;
}

.charts-section {
    margin-top: 2rem;
}

.chart-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.chart-container {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-container h5 {
    margin: 0 0 1rem 0;
    color: #495057;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.chart-placeholder {
    height: 200px;
    display: flex;
    align-items: end;
    justify-content: center;
    gap: 2rem;
    padding: 1rem;
}

.chart-bars {
    display: flex;
    align-items: end;
    gap: 1rem;
    height: 100%;
}

.chart-bar {
    width: 60px;
    background: #007bff;
    border-radius: 4px 4px 0 0;
    position: relative;
    transition: height 0.3s ease;
}

.chart-bar.present { background: #28a745; }
.chart-bar.absent { background: #dc3545; }
.chart-bar.half-day { background: #ffc107; }

.bar-label {
    position: absolute;
    bottom: -2rem;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.8rem;
    color: #6c757d;
    text-align: center;
    white-space: nowrap;
}

.metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.metric-card {
    text-align: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #007bff;
}

.metric-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #495057;
    margin-bottom: 0.5rem;
}

.metric-label {
    font-size: 0.8rem;
    color: #6c757d;
    font-weight: 500;
}

.no-chart-data {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #6c757d;
    font-style: italic;
}

.no-data {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
}

.no-data i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

/* Responsive design */
@media (max-width: 1200px) {
    .employee-attendance-grid {
        overflow-x: auto;
    }
    
    .grid-header,
    .attendance-row {
        min-width: 1000px;
    }
}

@media (max-width: 768px) {
    .attendance-stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .time-inputs {
        flex-direction: column;
    }
    
    .time-input {
        width: 100%;
    }
    
    .report-controls {
        grid-template-columns: 1fr;
    }
    
    .chart-row {
        grid-template-columns: 1fr;
    }
    
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .summary-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .chart-bars {
        gap: 0.5rem;
    }
    
    .chart-bar {
        width: 40px;
    }
}

/* Status badges */
.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.status-present {
    background: #d4edda;
    color: #155724;
}

.status-absent {
    background: #f8d7da;
    color: #721c24;
}

.status-half-day {
    background: #fff3cd;
    color: #856404;
}

.status-unknown {
    background: #e2e3e5;
    color: #383d41;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-secondary:hover {
    background: #545b62;
}

.btn-primary {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:hover {
    background: #0056b3;
}

.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s;
}

.modal.active {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
}

.modal-content {
    background: white;
    border-radius: 8px;
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
    transform: scale(0.9);
    transition: transform 0.3s;
}

.modal.active .modal-content {
    transform: scale(1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
    margin: 0;
    color: #2c3e50;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = attendanceCSS;
document.head.appendChild(style);

// Make it available globally
window.AttendanceManager = AttendanceManager;