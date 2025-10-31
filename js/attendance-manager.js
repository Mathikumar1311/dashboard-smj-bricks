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
        this.isLoading = false;

        // Bind methods
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
            // Load data in parallel for better performance
            await Promise.all([
                this.loadEmployees(),
                this.loadAttendanceData()
            ]);
            
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
        if (this.isLoading) return;
        
        try {
            this.employees = await this.db.getEmployees() || [];
            console.log('👥 Loaded', this.employees.length, 'employees');
        } catch (error) {
            console.error('Error loading employees:', error);
            this.employees = [];
        }
    }

    async loadAttendanceData(filters = {}) {
        if (this.isLoading) return [];
        
        this.isLoading = true;
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
            return this.attendanceRecords;
        } catch (error) {
            console.error('Error loading attendance records:', error);
            this.attendanceRecords = [];
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    async refreshAttendanceData() {
        try {
            this.ui.showSectionLoading('attendanceContent', 'Refreshing data...');
            
            // Load data in parallel
            await Promise.all([
                this.loadEmployees(),
                this.loadAttendanceData()
            ]);
            
            this.renderAttendanceTable();
            this.updateAttendanceSummary();
            
            this.ui.showToast('Attendance data refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing attendance data:', error);
            this.ui.showToast('Error refreshing data', 'error');
        } finally {
            this.ui.hideSectionLoading('attendanceContent');
        }
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
        if (this.employees.length === 0) {
            return `
                <div class="no-data">
                    <i class="fas fa-users"></i>
                    <br>No employees found
                </div>
            `;
        }

        return this.employees.map(employee => {
            const todayRecord = todaysRecords.find(r => r.employee_id === employee.id);
            const currentStatus = todayRecord?.status || '';
            const monthlySalary = this.formatSalary(employee.monthly_salary || employee.salary || 0);

            return `
                <div class="attendance-row" data-employee-id="${employee.id}">
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

                    <div class="col-salary">
                        <div class="salary-amount">${monthlySalary}</div>
                    </div>

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

                    <div class="col-actions">
                        <button type="button" class="btn-sm btn-clear" onclick="this.clearEmployeeAttendance('${employee.id}')">
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
            const statusBtn = e.target.closest('.status-option');
            if (statusBtn) {
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
            if (isAbsent) {
                input.value = '';
            } else if (!input.value) {
                if (input.classList.contains('check-in')) input.value = '09:00';
                if (input.classList.contains('check-out')) input.value = status === 'half_day' ? '13:00' : '18:00';
            }
        });

        this.updateEmployeeHours(employeeId);
        this.updateAttendanceStats();
    }

    clearEmployeeAttendance(employeeId) {
        const row = document.querySelector(`.attendance-row[data-employee-id="${employeeId}"]`);
        if (!row) return;

        row.querySelectorAll('.status-option').forEach(btn => {
            btn.classList.remove('active');
        });

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

        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('absentCount').textContent = absentCount;
        document.getElementById('halfDayCount').textContent = halfDayCount;
        document.getElementById('pendingCount').textContent = pendingCount;
    }

    async saveBulkAttendance() {
        const today = new Date().toISOString().split('T')[0];
        const attendanceData = [];
        const errors = [];

        document.querySelectorAll('.attendance-row').forEach(row => {
            const employeeId = row.getAttribute('data-employee-id');
            const activeStatus = row.querySelector('.status-option.active');

            if (!activeStatus) return;

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

            const validationErrors = this.validateAttendanceData(recordData);
            if (validationErrors.length > 0) {
                const employee = this.getEmployeeById(employeeId);
                errors.push(`${employee?.name}: ${validationErrors.join(', ')}`);
                return;
            }

            attendanceData.push(recordData);
        });

        if (attendanceData.length === 0) {
            this.ui.showToast('No attendance data to save', 'warning');
            return;
        }

        if (errors.length > 0) {
            this.ui.showToast(`Please fix errors: ${errors.join('; ')}`, 'error');
            return;
        }

        try {
            this.ui.showLoading('Saving attendance...');

            // Save records in parallel for better performance
            await Promise.all(
                attendanceData.map(record => this.markAttendance(record))
            );

            this.ui.hideLoading();
            this.hideModal('quickAttendanceModal');
            this.ui.showToast(`✅ Attendance saved for ${attendanceData.length} employees`, 'success');

            // Refresh data
            await this.refreshAttendanceData();

        } catch (error) {
            this.ui.hideLoading();
            this.ui.showToast('Error saving attendance', 'error');
            console.error('Error saving bulk attendance:', error);
        }
    }

    // ==================== DATABASE OPERATIONS ====================

    async markAttendance(attendanceData) {
        try {
            const validationErrors = this.validateAttendanceData(attendanceData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }

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

            // Check for existing record
            const existing = await this.getAttendanceRecords({
                employee_id: attendanceData.employee_id,
                attendance_date: attendanceData.attendance_date
            });

            let result;
            if (existing && existing.length > 0) {
                // Update existing
                const existingRecord = existing[0];
                if (this.db.updateAttendanceRecord) {
                    result = await this.db.updateAttendanceRecord(existingRecord.id, recordToSave);
                } else {
                    result = await this.db.update('attendance', existingRecord.id, recordToSave);
                }
            } else {
                // Create new
                if (this.db.createAttendanceRecord) {
                    result = await this.db.createAttendanceRecord(recordToSave);
                } else {
                    result = await this.db.create('attendance', recordToSave);
                }
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

                this.ui.showToast('Attendance record deleted', 'success');
                await this.refreshAttendanceData();
            }
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            this.ui.showToast('Error deleting record', 'error');
        }
    }

    // ==================== FILTERS & QUERIES ====================

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

    // ==================== VALIDATION ====================

    validateAttendanceData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!data.employee_id) errors.push('Employee ID required');
            if (!data.attendance_date) errors.push('Date required');
        }

        if (data.status && !['present', 'absent', 'half_day'].includes(data.status)) {
            errors.push('Invalid status');
        }

        if (data.working_hours && (data.working_hours < 0 || data.working_hours > 24)) {
            errors.push('Invalid working hours');
        }

        return errors;
    }

    // ==================== UI RENDERING ====================

    updateAttendanceSummary() {
        const today = new Date().toISOString().split('T')[0];
        const todaysAttendance = this.getAttendanceRecords({ attendance_date: today });

        const presentCount = todaysAttendance.filter(r => r.status === 'present').length;
        const absentCount = todaysAttendance.filter(r => r.status === 'absent').length;
        const halfDayCount = todaysAttendance.filter(r => r.status === 'half_day').length;
        const totalEmployees = this.employees.length;

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

        if (dateFilter && dateFilter !== 'all') {
            filteredRecords = filteredRecords.filter(record =>
                record.attendance_date === dateFilter
            );
        }

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
                        <br>No attendance records found
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
                        <button class="btn-secondary btn-sm" onclick="app.getManagers().attendance.deleteAttendance('${record.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==================== UTILITIES ====================

    calculateWorkHours(checkInTime, checkOutTime) {
        if (!checkInTime || !checkOutTime) return 0;

        try {
            const [inHours, inMinutes] = checkInTime.split(':').map(Number);
            const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

            const checkIn = new Date();
            checkIn.setHours(inHours, inMinutes, 0, 0);

            const checkOut = new Date();
            checkOut.setHours(outHours, outMinutes, 0, 0);

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

    formatSalary(amount) {
        if (!amount) return '₹0';
        return '₹' + parseInt(amount).toLocaleString('en-IN');
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

    getEmployeeById(employeeId) {
        return this.employees.find(emp => emp.id === employeeId);
    }

    // ==================== EVENT HANDLERS ====================

    handleClick(e) {
        if (e.target.id === 'quickAttendanceBtn' || e.target.closest('#quickAttendanceBtn')) {
            this.showQuickAttendanceModal();
            return;
        }

        if (e.target.id === 'refreshAttendance' || e.target.closest('#refreshAttendance')) {
            this.refreshAttendanceData();
            return;
        }

        if (e.target.closest('[data-filter]')) {
            const filter = e.target.closest('[data-filter]').getAttribute('data-filter');
            this.applyDateFilter(filter);
            return;
        }
    }

    handleKeydown(e) {
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            this.showQuickAttendanceModal();
        }
    }

    setupEventListeners() {
        this.removeEventListeners();

        document.addEventListener('click', this.handleClick);
        document.addEventListener('keydown', this.handleKeydown);

        // Filter listeners
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
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', html);

        const modal = document.getElementById(modalId);
        const closeBtn = modal?.querySelector('.modal-close');

        const closeModal = () => this.hideModal(modalId);

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        setTimeout(() => {
            modal?.classList.add('active');
        }, 10);
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
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

// CSS Styles (optimized)
const attendanceCSS = `
.attendance-container { padding: 1rem; }

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

.hours-display {
    padding: 0.4rem 0.75rem;
    background: #f8f9fa;
    border-radius: 4px;
    font-weight: 600;
    color: #495057;
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
}

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

.no-data {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
    grid-column: 1 / -1;
}

.no-data i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

@media (max-width: 768px) {
    .attendance-stats { grid-template-columns: repeat(2, 1fr); }
    .employee-attendance-grid { overflow-x: auto; }
    .grid-header, .attendance-row { min-width: 1000px; }
    .time-inputs { flex-direction: column; }
    .time-input { width: 100%; }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = attendanceCSS;
document.head.appendChild(style);

// Make available globally
window.AttendanceManager = AttendanceManager;