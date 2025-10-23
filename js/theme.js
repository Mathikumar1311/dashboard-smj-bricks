class ThemeManager {
    constructor() {
        this.currentTheme = this.getSavedTheme();
        this.currentColor = this.getSavedColor();
        this.init();
    }

    getSavedTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    getSavedColor() {
        return localStorage.getItem('themeColor') || 'orange';
    }

    init() {
        console.log('🎨 Theme manager initializing...');
        this.applyTheme(this.currentTheme, this.currentColor);
        this.bindEvents();
        this.setupThemeToggle();
        console.log('✅ Theme manager initialized');
    }

    bindEvents() {
        // Theme color selection
        document.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const color = themeOption.getAttribute('data-theme');
                this.setColorTheme(color);
            }
        });

        // System theme change listener
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme(e.matches ? 'dark' : 'light', this.currentColor);
                }
            });
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
            this.updateThemeToggleIcon();
        }
    }

    updateThemeToggleIcon() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (this.currentTheme === 'dark') {
                icon.className = 'fas fa-sun';
                themeToggle.title = 'Switch to light mode';
            } else {
                icon.className = 'fas fa-moon';
                themeToggle.title = 'Switch to dark mode';
            }
        }
    }

    applyTheme(theme, color) {
        console.log('🎨 Applying theme:', theme, 'color:', color);
        
        // Set data attributes on body for CSS
        document.body.setAttribute('data-theme', theme);
        document.body.setAttribute('data-color', color);

        this.currentTheme = theme;
        this.currentColor = color;
        
        this.saveTheme(theme, color);
        this.updateThemeToggleIcon();
        this.updateActiveThemeOption(color);

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme, color }
        }));

        console.log('✅ Theme applied successfully');
    }

    updateActiveThemeOption(color) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === color) {
                option.classList.add('active');
            }
        });
    }

    saveTheme(theme, color) {
        localStorage.setItem('theme', theme);
        localStorage.setItem('themeColor', color);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme, this.currentColor);
    }

    setColorTheme(color) {
        this.applyTheme(this.currentTheme, color);
    }

    setTheme(theme) {
        this.applyTheme(theme, this.currentColor);
    }

    getCurrentTheme() {
        return {
            theme: this.currentTheme,
            color: this.currentColor
        };
    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});