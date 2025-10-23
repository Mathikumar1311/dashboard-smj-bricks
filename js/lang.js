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
                billing: 'Billing',
                customers: 'Customers',
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
                
                // Specific
                add_user: 'Add User',
                add_employee: 'Add Employee',
                add_bill: 'Add Bill',
                add_customer: 'Add Customer',
                add_salary: 'Add Salary',
                salary: 'Salary',
                bill_no: 'Bill No',
                customer: 'Customer',
                total_balance: 'Total Sales',
                gst_amount: 'GST Amount',
                recent_activity: 'Total Bills',
                pending_payments: 'Pending Bills',
                total_customers: 'Total Customers',
                total_employees: 'Total Employees',
                work_hours: 'Work Hours',
                join_date: 'Join Date',
                due_date: 'Due Date',
                payment_id: 'Payment ID',
                method: 'Method',
                profile_settings: 'Profile Settings',
                upload_avatar: 'Upload Avatar'
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
                billing: 'பில்லிங்',
                customers: 'வாடிக்கையாளர்கள்',
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
                
                // Specific
                add_user: 'பயனர் சேர்க்க',
                add_employee: 'ஊழியர் சேர்க்க',
                add_bill: 'பில் சேர்க்க',
                add_customer: 'வாடிக்கையாளர் சேர்க்க',
                add_salary: 'சம்பளம் சேர்க்க',
                salary: 'சம்பளம்',
                bill_no: 'பில் எண்',
                customer: 'வாடிக்கையாளர்',
                total_balance: 'மொத்த விற்பனை',
                gst_amount: 'GST தொகை',
                recent_activity: 'மொத்த பில்கள்',
                pending_payments: 'நிலுவை பில்கள்',
                total_customers: 'மொத்த வாடிக்கையாளர்கள்',
                total_employees: 'மொத்த ஊழியர்கள்',
                work_hours: 'வேலை நேரம்',
                join_date: 'சேர்ந்த தேதி',
                due_date: 'கெடு தேதி',
                payment_id: 'கட்டண ஐடி',
                method: 'முறை',
                profile_settings: 'சுயவிவர அமைப்புகள்',
                upload_avatar: 'அவதாரம் பதிவேற்று'
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
                // Handle select options separately if needed
            } else {
                element.textContent = translation;
            }
        });

        // Update language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = lang;
        }

        // Dispatch language change event
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));

        console.log(`✅ Language switched to: ${lang}`);
    }

    getText(key) {
        const translation = this.dictionaries[this.currentLang][key];
        return translation !== undefined ? translation : key;
    }

    switchLanguage(lang) {
        if (this.dictionaries[lang]) {
            this.applyLanguage(lang);
        } else {
            console.warn(`Language '${lang}' not supported`);
        }
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
}

// Initialize language manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.langManager = new LanguageManager();
});