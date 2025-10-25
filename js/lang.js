class LanguageManager {
    constructor() {
        this.dictionaries = {
            en: {
                // Login
                login_title: 'Business Dashboard',
                username: 'Username',
                password: 'Password',
                login: 'Login',
                
                // Navigation
                dashboard_title: 'Business Dashboard',
                dashboard: 'Dashboard',
                users: 'Users',
                employees: 'Employees',
                salary: 'Salary',
                billing: 'Billing',
                customers: 'Customers',
                pending: 'Pending',
                payments: 'Payments',
                reports: 'Reports',
                settings: 'Settings',
                logout: 'Logout',
                
                // Common
                save: 'Save',
                cancel: 'Cancel',
                delete: 'Delete',
                edit: 'Edit',
                actions: 'Actions',
                add: 'Add',
                name: 'Name',
                phone: 'Phone',
                email: 'Email',
                amount: 'Amount',
                date: 'Date',
                status: 'Status',
                role: 'Role',
                type: 'Type',
                export: 'Export',
                search: 'Search',
                clear: 'Clear',
                confirm: 'Confirm',
                loading: 'Loading',
                error: 'Error',
                success: 'Success',
                warning: 'Warning',
                info: 'Information',
                
                // Dashboard
                total_balance: 'Total Sales',
                gst_amount: 'GST Amount',
                recent_activity: 'Total Bills',
                pending_payments: 'Pending Bills',
                total_customers: 'Total Customers',
                total_employees: 'Total Employees',
                users_online: 'Users online:',
                
                // Forms
                add_user: 'Add User',
                add_employee: 'Add Employee',
                add_bill: 'Add Bill',
                add_customer: 'Add Customer',
                add_salary: 'Add Salary',
                edit_user: 'Edit User',
                edit_employee: 'Edit Employee',
                edit_bill: 'Edit Bill',
                edit_customer: 'Edit Customer',
                
                // Table Headers
                bill_no: 'Bill No',
                customer: 'Customer',
                gst: 'GST',
                total_bills: 'Total Bills',
                total_amount: 'Total Amount',
                due_date: 'Due Date',
                payment_id: 'Payment ID',
                method: 'Method',
                employee_id: 'Employee ID',
                join_date: 'Join Date',
                work_hours: 'Work Hours',
                
                // Settings
                profile_settings: 'Profile Settings',
                upload_avatar: 'Upload Avatar',
                theme_settings: 'Theme Settings',
                security_settings: 'Security Settings',
                backup_restore: 'Backup & Restore',
                
                // Status
                active: 'Active',
                inactive: 'Inactive',
                paid: 'Paid',
                pending: 'Pending',
                completed: 'Completed',
                cancelled: 'Cancelled',
                
                // Roles
                administrator: 'Administrator',
                manager: 'Manager',
                supervisor: 'Supervisor',
                user: 'User',
                
                // Messages
                confirm_delete: 'Are you sure you want to delete this item?',
                delete_success: 'Item deleted successfully',
                save_success: 'Saved successfully',
                update_success: 'Updated successfully',
                login_success: 'Login successful',
                logout_success: 'Logout successful',
                error_occurred: 'An error occurred',
                no_data: 'No data available',
                loading_data: 'Loading data...',
                
                // Search & Filters
                search_employees_placeholder: 'Search by ID, name, phone, role...',
                search_users_placeholder: 'Search users...',
                filter_all: 'All',
                filter_today: 'Today',
                filter_week: 'This Week',
                filter_month: 'This Month',
                
                // Export
                export_excel: 'Export to Excel',
                export_pdf: 'Export to PDF',
                export_data: 'Export Data',
                exporting: 'Exporting...',
                
                // Validation
                required_field: 'This field is required',
                invalid_email: 'Please enter a valid email',
                invalid_phone: 'Please enter a valid phone number',
                invalid_amount: 'Please enter a valid amount'
            },
            ta: {
                // Login
                login_title: 'வணிக டாஷ்போர்டு',
                username: 'பயனர்பெயர்',
                password: 'கடவுச்சொல்',
                login: 'உள்நுழைய',
                
                // Navigation
                dashboard_title: 'வணிக டாஷ்போர்டு',
                dashboard: 'டாஷ்போர்டு',
                users: 'பயனர்கள்',
                employees: 'ஊழியர்கள்',
                salary: 'சம்பளம்',
                billing: 'பில்லிங்',
                customers: 'வாடிக்கையாளர்கள்',
                pending: 'நிலுவை',
                payments: 'கட்டணங்கள்',
                reports: 'அறிக்கைகள்',
                settings: 'அமைப்புகள்',
                logout: 'வெளியேறு',
                
                // Common
                save: 'சேமிக்க',
                cancel: 'ரத்து செய்',
                delete: 'நீக்கு',
                edit: 'திருத்து',
                actions: 'செயல்கள்',
                add: 'சேர்க்க',
                name: 'பெயர்',
                phone: 'தொலைபேசி',
                email: 'மின்னஞ்சல்',
                amount: 'தொகை',
                date: 'தேதி',
                status: 'நிலை',
                role: 'பங்கு',
                type: 'வகை',
                export: 'ஏற்றுமதி',
                search: 'தேடு',
                clear: 'அழி',
                confirm: 'உறுதிப்படுத்து',
                loading: 'ஏற்றுகிறது',
                error: 'பிழை',
                success: 'வெற்றி',
                warning: 'எச்சரிக்கை',
                info: 'தகவல்',
                
                // Dashboard
                total_balance: 'மொத்த விற்பனை',
                gst_amount: 'GST தொகை',
                recent_activity: 'மொத்த பில்கள்',
                pending_payments: 'நிலுவை பில்கள்',
                total_customers: 'மொத்த வாடிக்கையாளர்கள்',
                total_employees: 'மொத்த ஊழியர்கள்',
                users_online: 'ஆன்லைனில் பயனர்கள்:',
                
                // Forms
                add_user: 'பயனர் சேர்க்க',
                add_employee: 'ஊழியர் சேர்க்க',
                add_bill: 'பில் சேர்க்க',
                add_customer: 'வாடிக்கையாளர் சேர்க்க',
                add_salary: 'சம்பளம் சேர்க்க',
                edit_user: 'பயனர் திருத்து',
                edit_employee: 'ஊழியர் திருத்து',
                edit_bill: 'பில் திருத்து',
                edit_customer: 'வாடிக்கையாளர் திருத்து',
                
                // Table Headers
                bill_no: 'பில் எண்',
                customer: 'வாடிக்கையாளர்',
                gst: 'GST',
                total_bills: 'மொத்த பில்கள்',
                total_amount: 'மொத்த தொகை',
                due_date: 'கெடு தேதி',
                payment_id: 'கட்டண ஐடி',
                method: 'முறை',
                employee_id: 'ஊழியர் ஐடி',
                join_date: 'சேர்ந்த தேதி',
                work_hours: 'வேலை நேரம்',
                
                // Settings
                profile_settings: 'சுயவிவர அமைப்புகள்',
                upload_avatar: 'அவதாரம் பதிவேற்று',
                theme_settings: 'தீம் அமைப்புகள்',
                security_settings: 'பாதுகாப்பு அமைப்புகள்',
                backup_restore: 'காப்பு & மீட்டமைப்பு',
                
                // Status
                active: 'செயலில்',
                inactive: 'செயலற்ற',
                paid: 'செலுத்தப்பட்டது',
                pending: 'நிலுவையில்',
                completed: 'முடிந்தது',
                cancelled: 'ரத்து செய்யப்பட்டது',
                
                // Roles
                administrator: 'நிர்வாகி',
                manager: 'மேலாளர்',
                supervisor: 'மேற்பார்வையாளர்',
                user: 'பயனர்',
                
                // Messages
                confirm_delete: 'இந்த உருப்படியை நிச்சயமாக நீக்க விரும்புகிறீர்களா?',
                delete_success: 'உருப்படி வெற்றிகரமாக நீக்கப்பட்டது',
                save_success: 'வெற்றிகரமாக சேமிக்கப்பட்டது',
                update_success: 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
                login_success: 'உள்நுழைவு வெற்றிகரமானது',
                logout_success: 'வெளியேறுதல் வெற்றிகரமானது',
                error_occurred: 'ஒரு பிழை ஏற்பட்டது',
                no_data: 'தரவு இல்லை',
                loading_data: 'தரவு ஏற்றுகிறது...',
                
                // Search & Filters
                search_employees_placeholder: 'ஐடி, பெயர், தொலைபேசி, பங்கு மூலம் தேடு...',
                search_users_placeholder: 'பயனர்களை தேடு...',
                filter_all: 'அனைத்தும்',
                filter_today: 'இன்று',
                filter_week: 'இந்த வாரம்',
                filter_month: 'இந்த மாதம்',
                
                // Export
                export_excel: 'எக்செலுக்கு ஏற்றுமதி',
                export_pdf: 'PDFக்கு ஏற்றுமதி',
                export_data: 'தரவை ஏற்றுமதி செய்க',
                exporting: 'ஏற்றுமதி செய்கிறது...',
                
                // Validation
                required_field: 'இந்த புலம் தேவையானது',
                invalid_email: 'செல்லுபடியான மின்னஞ்சலை உள்ளிடவும்',
                invalid_phone: 'செல்லுபடியான தொலைபேசி எண்ணை உள்ளிடவும்',
                invalid_amount: 'செல்லுபடியான தொகையை உள்ளிடவும்'
            }
        };
        
        this.currentLang = this.getSavedLanguage();
        this.init();
    }

    getSavedLanguage() {
        return localStorage.getItem('preferredLanguage') || 'en';
    }

    init() {
        this.applyLanguage(this.currentLang);
        this.setupLanguageSelector();
    }

    setupLanguageSelector() {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.currentLang;
            languageSelect.addEventListener('change', (e) => {
                this.switchLanguage(e.target.value);
            });
        }
    }

    applyLanguage(lang) {
        if (!this.dictionaries[lang]) {
            console.warn(`Language '${lang}' not found, defaulting to English`);
            lang = 'en';
        }
        
        this.currentLang = lang;
        localStorage.setItem('preferredLanguage', lang);

        // Update all elements with data-lang attribute
        document.querySelectorAll('[data-lang]').forEach(element => {
            const key = element.getAttribute('data-lang');
            const translation = this.getText(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else if (element.tagName === 'SELECT') {
                // Handle select options
                const option = element.querySelector(`option[data-lang-value="${key}"]`);
                if (option) {
                    option.textContent = translation;
                }
            } else {
                element.textContent = translation;
            }
        });

        // Update language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = lang;
        }

        // Update page title
        const pageTitle = this.getText('dashboard_title');
        document.title = pageTitle;

        // Dispatch language change event
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));

        console.log(`✅ Language switched to: ${lang}`);
    }

    getText(key) {
        // Handle nested keys (e.g., "messages.welcome")
        const keys = key.split('.');
        let translation = this.dictionaries[this.currentLang];
        
        for (const k of keys) {
            translation = translation?.[k];
            if (translation === undefined) break;
        }
        
        return translation !== undefined ? translation : `[${key}]`;
    }

    switchLanguage(lang) {
        if (this.dictionaries[lang]) {
            this.applyLanguage(lang);
            
            // Show notification
            this.showLanguageNotification(lang);
        } else {
            console.warn(`Language '${lang}' not supported`);
        }
    }

    showLanguageNotification(lang) {
        const languageNames = {
            en: 'English',
            ta: 'தமிழ்'
        };
        
        const languageName = languageNames[lang] || lang;
        this.showToast(`Language changed to ${languageName}`, 'success');
    }

    showToast(message, type = 'info') {
        // Create or use existing toast element
        let toast = document.getElementById('languageToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'languageToast';
            toast.className = 'toast hidden';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    // Method to dynamically add translations
    addTranslations(lang, translations) {
        if (!this.dictionaries[lang]) {
            this.dictionaries[lang] = {};
        }
        Object.assign(this.dictionaries[lang], translations);
    }

    // Method to format numbers based on language
    formatNumber(number, options = {}) {
        const formatter = new Intl.NumberFormat(this.currentLang === 'ta' ? 'ta-IN' : 'en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options
        });
        return formatter.format(number);
    }

    // Method to format currency based on language
    formatCurrency(amount, currency = 'INR') {
        const formatter = new Intl.NumberFormat(this.currentLang === 'ta' ? 'ta-IN' : 'en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formatter.format(amount);
    }

    // Method to format date based on language
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        const formatter = new Intl.DateTimeFormat(this.currentLang === 'ta' ? 'ta-IN' : 'en-IN', {
            ...defaultOptions,
            ...options
        });
        return formatter.format(new Date(date));
    }

    // Method to get direction (LTR/RTL) for current language
    getTextDirection() {
        return this.currentLang === 'ta' ? 'ltr' : 'ltr'; // Tamil also uses LTR
    }
}

// Initialize language manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.langManager = new LanguageManager();
    
    // Add CSS for toast notifications
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            max-width: 300px;
        }
        .toast.hidden {
            opacity: 0;
            transform: translateY(-20px);
            pointer-events: none;
        }
        .toast-success {
            background: #10b981;
        }
        .toast-error {
            background: #ef4444;
        }
        .toast-warning {
            background: #f59e0b;
        }
        .toast-info {
            background: #3b82f6;
        }
    `;
    document.head.appendChild(style);
});