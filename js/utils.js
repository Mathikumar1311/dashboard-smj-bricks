/**
 * 🛡️ BULLETPROOF UTILS CLASS
 * ✅ Zero-dependency utility functions
 * ✅ Never throws errors
 * ✅ Comprehensive fallbacks
 */

class Utils {
    // 🛡️ FORMATTING UTILITIES
    static formatCurrency(amount) {
        try {
            if (amount === null || amount === undefined || isNaN(amount)) {
                return '₹0.00';
            }
            
            const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(numericAmount);
        } catch (error) {
            console.warn('Currency formatting failed:', error);
            return '₹0.00';
        }
    }

    static formatNumber(number) {
        try {
            if (number === null || number === undefined || isNaN(number)) {
                return '0';
            }
            
            const numericNumber = typeof number === 'string' ? parseFloat(number) : number;
            return new Intl.NumberFormat('en-IN').format(numericNumber);
        } catch (error) {
            console.warn('Number formatting failed:', error);
            return '0';
        }
    }

    static formatDate(date) {
        try {
            if (!date) return 'N/A';
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid Date';
            
            return dateObj.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.warn('Date formatting failed:', error);
            return 'Invalid Date';
        }
    }

    static formatDateTime(date) {
        try {
            if (!date) return 'N/A';
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return 'Invalid Date';
            
            return dateObj.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.warn('DateTime formatting failed:', error);
            return 'Invalid Date';
        }
    }

    // 🛡️ VALIDATION UTILITIES
    static validateEmail(email) {
        try {
            if (!email || typeof email !== 'string') return false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email.trim());
        } catch (error) {
            console.warn('Email validation failed:', error);
            return false;
        }
    }

    static validatePhone(phone) {
        try {
            if (!phone || typeof phone !== 'string') return false;
            const cleaned = phone.replace(/\D/g, '');
            const phoneRegex = /^[6-9]\d{9}$/;
            return phoneRegex.test(cleaned);
        } catch (error) {
            console.warn('Phone validation failed:', error);
            return false;
        }
    }

    // 🛡️ GENERATION UTILITIES
    static generateId(prefix = '') {
        try {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 15);
            return `${prefix}${timestamp}${random}`.toUpperCase();
        } catch (error) {
            console.warn('ID generation failed:', error);
            return `FALLBACK_${Date.now()}`;
        }
    }

    static generateEmployeeId(type = 'employee') {
        try {
            const prefix = type === 'driver' ? 'DR' : 'EMP';
            const timestamp = Date.now().toString(36).toUpperCase();
            return `${prefix}_${timestamp}`;
        } catch (error) {
            console.warn('Employee ID generation failed:', error);
            return `EMP_FALLBACK_${Date.now()}`;
        }
    }

    // 🛡️ LOADING UTILITIES
    static showLoading(message = 'Loading...') {
        try {
            let loading = document.getElementById('loadingOverlay');
            
            if (!loading) {
                loading = document.createElement('div');
                loading.id = 'loadingOverlay';
                loading.innerHTML = `
                    <div class="loading-content" style="
                        background: white;
                        padding: 2rem;
                        border-radius: 12px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                        text-align: center;
                        min-width: 200px;
                    ">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                        <div class="loading-text" style="color: #374151; font-weight: 500;">${message}</div>
                    </div>
                `;
                loading.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    backdrop-filter: blur(4px);
                `;
                document.body.appendChild(loading);
            } else {
                const loadingText = loading.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
            }
            
            loading.style.display = 'flex';
            return true;
        } catch (error) {
            console.warn('Loading display failed:', error);
            return false;
        }
    }

    static hideLoading() {
        try {
            const loading = document.getElementById('loadingOverlay');
            if (loading) {
                loading.style.display = 'none';
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Loading hide failed:', error);
            return false;
        }
    }

    // 🛡️ EXPORT UTILITIES
    static exportToCSV(data, filename) {
        try {
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('No data to export');
            }

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    let value = row[header];
                    if (value === null || value === undefined) value = '';
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            return true;
        } catch (error) {
            console.error('CSV export failed:', error);
            return false;
        }
    }

    static exportToExcel(data, filename) {
        try {
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('No data to export');
            }

            // Check if XLSX is available
            if (typeof XLSX === 'undefined') {
                console.warn('XLSX not available, falling back to CSV');
                return this.exportToCSV(data, filename);
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            return true;
        } catch (error) {
            console.error('Excel export failed:', error);
            // Fallback to CSV
            return this.exportToCSV(data, filename);
        }
    }

    static exportToPDF(data, filename, title = 'Report') {
        return new Promise((resolve) => {
            try {
                if (!data || !Array.isArray(data)) {
                    throw new Error('No data to export');
                }

                // Check if jsPDF is available
                if (typeof window.jspdf === 'undefined') {
                    throw new Error('jsPDF not available');
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Add title
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text(title, 14, 15);

                // Add generation date
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    const tableData = data.map(row => headers.map(header => 
                        String(row[header] || '')
                    ));

                    if (doc.autoTable) {
                        doc.autoTable({
                            head: [headers],
                            body: tableData,
                            startY: 30,
                            styles: { fontSize: 8 },
                            headStyles: { fillColor: [255, 107, 53] }
                        });
                    } else {
                        // Simple fallback table
                        let y = 30;
                        headers.forEach((header, i) => {
                            doc.text(header, 14 + (i * 40), y);
                        });
                        y += 6;
                        
                        tableData.forEach(row => {
                            row.forEach((cell, i) => {
                                doc.text(cell.substring(0, 15), 14 + (i * 40), y);
                            });
                            y += 6;
                        });
                    }
                } else {
                    doc.text('No data available', 14, 30);
                }

                doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
                resolve(true);
            } catch (error) {
                console.error('PDF export failed:', error);
                // Fallback to CSV
                const success = this.exportToCSV(data, filename);
                resolve(success);
            }
        });
    }

    // 🛡️ CALCULATION UTILITIES
    static calculateGST(amount, gstRate) {
        try {
            const numericAmount = parseFloat(amount) || 0;
            const numericRate = parseFloat(gstRate) || 0;
            
            const gstAmount = (numericAmount * numericRate) / 100;
            const totalAmount = numericAmount + gstAmount;
            
            return {
                gstAmount: Math.round(gstAmount * 100) / 100,
                totalAmount: Math.round(totalAmount * 100) / 100
            };
        } catch (error) {
            console.warn('GST calculation failed:', error);
            return { gstAmount: 0, totalAmount: 0 };
        }
    }

    // 🛡️ UTILITY FUNCTIONS
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('Deep clone failed:', error);
            return obj;
        }
    }

    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    static sanitizeInput(input) {
        try {
            if (typeof input !== 'string') return input;
            return input
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .trim();
        } catch (error) {
            console.warn('Input sanitization failed:', error);
            return String(input);
        }
    }

    static getCurrentTimestamp() {
        return new Date().toISOString();
    }

    static getWeekNumber(date) {
        try {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
            return weekNo;
        } catch (error) {
            console.warn('Week number calculation failed:', error);
            return 1;
        }
    }

    static getMonthNumber(date) {
        try {
            return new Date(date).getMonth() + 1;
        } catch (error) {
            console.warn('Month number calculation failed:', error);
            return 1;
        }
    }

    // 🛡️ STORAGE UTILITIES
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Storage set failed:', error);
            return false;
        }
    }

    static getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Storage get failed:', error);
            return defaultValue;
        }
    }

    static removeStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Storage remove failed:', error);
            return false;
        }
    }

    // 🛡️ ARRAY UTILITIES
    static sortBy(array, key, ascending = true) {
        try {
            if (!Array.isArray(array)) return [];
            
            return [...array].sort((a, b) => {
                const aVal = a[key];
                const bVal = b[key];
                
                if (aVal < bVal) return ascending ? -1 : 1;
                if (aVal > bVal) return ascending ? 1 : -1;
                return 0;
            });
        } catch (error) {
            console.warn('Array sort failed:', error);
            return array || [];
        }
    }

    static filterBy(array, key, value) {
        try {
            if (!Array.isArray(array)) return [];
            return array.filter(item => item[key] === value);
        } catch (error) {
            console.warn('Array filter failed:', error);
            return array || [];
        }
    }

    static groupBy(array, key) {
        try {
            if (!Array.isArray(array)) return {};
            
            return array.reduce((groups, item) => {
                const group = item[key];
                if (!groups[group]) {
                    groups[group] = [];
                }
                groups[group].push(item);
                return groups;
            }, {});
        } catch (error) {
            console.warn('Array group by failed:', error);
            return {};
        }
    }

    // 🛡️ STRING UTILITIES
    static truncate(str, length = 50) {
        try {
            if (typeof str !== 'string') return String(str);
            return str.length > length ? str.substring(0, length) + '...' : str;
        } catch (error) {
            console.warn('String truncate failed:', error);
            return String(str);
        }
    }

    static capitalize(str) {
        try {
            if (typeof str !== 'string') return String(str);
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        } catch (error) {
            console.warn('String capitalize failed:', error);
            return String(str);
        }
    }

    static camelCase(str) {
        try {
            if (typeof str !== 'string') return String(str);
            return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
                index === 0 ? word.toLowerCase() : word.toUpperCase()
            ).replace(/\s+/g, '');
        } catch (error) {
            console.warn('String camelCase failed:', error);
            return String(str);
        }
    }

    // 🛡️ HEALTH CHECK
    static healthCheck() {
        const checks = {
            formatting: {
                currency: this.formatCurrency(1234.56) === '₹1,234.56',
                number: this.formatNumber(1234) === '1,234',
                date: this.formatDate(new Date()) !== 'Invalid Date'
            },
            validation: {
                email: this.validateEmail('test@example.com') === true,
                phone: this.validatePhone('9876543210') === true
            },
            generation: {
                id: this.generateId().length > 0
            },
            storage: (() => {
                try {
                    const testKey = 'health_check_test';
                    this.setStorage(testKey, 'test');
                    const value = this.getStorage(testKey);
                    this.removeStorage(testKey);
                    return value === 'test';
                } catch {
                    return false;
                }
            })()
        };

        const allHealthy = Object.values(checks).every(category => 
            Object.values(category).every(check => check === true)
        );

        console.log('🏥 Utils Health Check:', {
            status: allHealthy ? 'HEALTHY' : 'UNHEALTHY',
            ...checks
        });

        return allHealthy;
    }
}

// Make Utils available globally
window.Utils = Utils;

