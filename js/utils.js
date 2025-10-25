class Utils {
    static formatCurrency(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    static formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatDateTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

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

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }


    static showLoading(message = 'Loading...') {
        const loading = document.getElementById('loadingOverlay');
        const loadingText = document.querySelector('.loading-text');
        if (loading && loadingText) {
            loadingText.textContent = message;
            loading.classList.remove('hidden');
        }
    }

    static hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    static exportToCSV(data, filename) {
        if (!data || data.length === 0) {
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
    }

    static exportToExcel(data, filename) {
        if (!data || data.length === 0) {
            throw new Error('No data to export');
        }

        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Excel export failed, falling back to CSV:', error);
            this.exportToCSV(data, filename);
        }
    }

    static exportToPDF(data, filename, title = 'Report') {
        return new Promise((resolve, reject) => {
            try {
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

                if (data && data.length > 0) {
                    const headers = Object.keys(data[0]);
                    const tableData = data.map(row => headers.map(header => row[header] || ''));

                    doc.autoTable({
                        head: [headers],
                        body: tableData,
                        startY: 30,
                        styles: { fontSize: 8 },
                        headStyles: { fillColor: [255, 107, 53] }
                    });
                } else {
                    doc.text('No data available', 14, 30);
                }

                doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    }
    static formatNumber(number) {
        return new Intl.NumberFormat('en-IN').format(number);
    }

    static calculateGST(amount, gstRate) {
        const gstAmount = (amount * gstRate) / 100;
        const totalAmount = amount + gstAmount;
        return { gstAmount, totalAmount };
    }

    static getCurrentTimestamp() {
        return new Date().toISOString();
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static isEmpty(obj) {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string') return obj.trim() === '';
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }


}

// Make Utils available globally
window.Utils = Utils;