class ExportManager {
    constructor(dependencies) {
        // ✅ VALIDATION from new version
        if (!dependencies) throw new Error('ExportManager: dependencies required');
        if (!dependencies.ui) throw new Error('ExportManager: ui required');
        
        this.db = dependencies.db;
        this.ui = dependencies.ui;
        this.auth = dependencies.auth;
        
        console.log('✅ ExportManager initialized');
    }

    async initialize() {
        this.setupEventListeners();
        // ✅ CHECK DEPENDENCIES from new version
        this.checkDependencies();
        return Promise.resolve();
    }

    checkDependencies() {
        const deps = {
            XLSX: typeof XLSX !== 'undefined',
            jsPDF: typeof window.jspdf !== 'undefined',
            AutoTable: typeof window.jspdf?.jsPDF?.prototype?.autoTable !== 'undefined',
            Utils: typeof Utils !== 'undefined'
        };
        
        console.log('📦 Export Manager Dependencies:', deps);
        
        if (!deps.XLSX) console.warn('❌ XLSX library not loaded - Excel export will fail');
        if (!deps.jsPDF) console.warn('❌ jsPDF library not loaded - PDF export will fail');
        if (!deps.AutoTable) console.warn('❌ AutoTable plugin not loaded - PDF tables will be basic');
        if (!deps.Utils) console.warn('❌ Utils not available - export functions may fail');
        
        this.dependencies = deps;
        return deps;
    }

    setupEventListeners() {
        console.log('📤 Export manager event listeners setup');
        // Quick export buttons are handled by ReportsManager (from old version)
    }

    // ==================== CORE EXPORT METHODS ====================

    async exportToExcel(data, filename, title = 'Export') {
        try {
            this.ui.showExportProgress('Exporting to Excel...');
            
            this.validateExportData(data);

            // ✅ Use Utils if available, fallback to direct implementation
            if (typeof Utils !== 'undefined' && Utils.exportToExcel) {
                const success = Utils.exportToExcel(data, filename);
                if (!success) throw new Error('Excel export via Utils failed');
            } else {
                this.fallbackExportToExcel(data, filename);
            }
            
            this.ui.showToast(`${title} exported successfully`, 'success');
            return true;
        } catch (error) {
            console.error('Excel export error:', error);
            this.ui.showToast(`Error exporting to Excel: ${error.message}`, 'error');
            throw error;
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportToPDF(data, filename, title = 'Report') {
        try {
            this.ui.showExportProgress('Exporting to PDF...');
            
            this.validateExportData(data);

            // ✅ Use Utils if available, fallback to direct implementation
            if (typeof Utils !== 'undefined' && Utils.exportToPDF) {
                const success = await Utils.exportToPDF(data, filename, title);
                if (!success) throw new Error('PDF export via Utils failed');
            } else {
                await this.fallbackExportToPDF(data, filename, title);
            }
            
            this.ui.showToast(`${title} exported to PDF successfully`, 'success');
            return true;
        } catch (error) {
            console.error('PDF export error:', error);
            this.ui.showToast(`Error exporting to PDF: ${error.message}`, 'error');
            throw error;
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportToCSV(data, filename, title = 'Export') {
        try {
            this.ui.showExportProgress('Exporting to CSV...');
            
            this.validateExportData(data);

            if (typeof Utils !== 'undefined' && Utils.exportToCSV) {
                Utils.exportToCSV(data, filename);
            } else {
                this.fallbackExportToCSV(data, filename);
            }
            
            this.ui.showToast(`${title} exported to CSV successfully`, 'success');
            return true;
        } catch (error) {
            console.error('CSV export error:', error);
            this.ui.showToast(`Error exporting to CSV: ${error.message}`, 'error');
            throw error;
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // ==================== ADVANCED EXPORT FEATURES ====================

    async exportToEnhancedPDF(data, filename, title = 'Report', options = {}) {
        try {
            this.ui.showExportProgress('Creating enhanced PDF...');
            
            if (!this.dependencies.jsPDF) {
                throw new Error('jsPDF library not available');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set document properties
            doc.setProperties({
                title: title,
                subject: 'Business Data Export',
                author: 'Business Dashboard',
                keywords: 'export, business, data',
                creator: 'Business Dashboard App'
            });

            // Add header
            doc.setFontSize(20);
            doc.setTextColor(40);
            doc.text(title, 105, 15, { align: 'center' });
            
            // Add generation info
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
            doc.text(`Records: ${data.length}`, 14, 30);
            
            let startY = 40;

            // Add summary section if options include summary
            if (options.includeSummary && data.length > 0) {
                doc.setFontSize(12);
                doc.setTextColor(40);
                doc.text('Summary', 14, startY);
                startY += 10;
                
                const columns = Object.keys(data[0]);
                doc.setFontSize(8);
                doc.text(`Columns: ${columns.join(', ')}`, 14, startY);
                startY += 5;
                doc.text(`Total Records: ${data.length}`, 14, startY);
                startY += 10;
            }

            // Add table
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                const tableData = data.map(row => headers.map(header => row[header] || ''));
                
                if (this.dependencies.AutoTable) {
                    doc.autoTable({
                        head: [headers],
                        body: tableData,
                        startY: startY,
                        styles: { 
                            fontSize: 8,
                            cellPadding: 2
                        },
                        headStyles: { 
                            fillColor: [255, 107, 53],
                            textColor: 255,
                            fontStyle: 'bold'
                        },
                        alternateRowStyles: {
                            fillColor: [245, 245, 245]
                        },
                        margin: { top: 10 },
                        pageBreak: 'auto'
                    });
                } else {
                    // Basic table without AutoTable
                    this.createBasicPDFTable(doc, headers, tableData, startY);
                }
            } else {
                doc.setFontSize(12);
                doc.setTextColor(100);
                doc.text('No data available', 14, startY);
            }

            // Add footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
                doc.text('Business Dashboard', 14, doc.internal.pageSize.height - 10);
            }

            doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
            return true;
            
        } catch (error) {
            console.error('Enhanced PDF export error:', error);
            throw error;
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // ==================== BATCH EXPORT METHODS ====================

    async exportMultiple(datasets, format = 'excel', baseFilename = 'business_export') {
        try {
            this.ui.showExportProgress('Preparing multiple exports...');
            
            const timestamp = new Date().toISOString().split('T')[0];
            const results = [];
            
            for (const [datasetName, data] of Object.entries(datasets)) {
                if (data && data.length > 0) {
                    const filename = `${baseFilename}_${datasetName}_${timestamp}`;
                    const title = `${this.capitalizeFirstLetter(datasetName)} Export`;
                    
                    try {
                        const result = await this.exportData(data, format, filename, title);
                        results.push({ 
                            datasetName, 
                            success: true, 
                            filename,
                            recordCount: data.length 
                        });
                    } catch (error) {
                        results.push({ 
                            datasetName, 
                            success: false, 
                            error: error.message,
                            recordCount: data.length 
                        });
                        console.error(`Export failed for ${datasetName}:`, error);
                    }
                    
                    // Small delay between exports to avoid overwhelming the system
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            if (successCount === results.length) {
                this.ui.showToast(`All ${results.length} exports completed successfully`, 'success');
            } else {
                this.ui.showToast(`${successCount}/${results.length} exports completed successfully`, 'warning');
            }
            
            return results;
        } catch (error) {
            console.error('Batch export error:', error);
            this.ui.showToast(`Error during batch export: ${error.message}`, 'error');
            throw error;
        } finally {
            this.ui.hideExportProgress();
        }
    }

    async exportCompleteBusinessData(format = 'excel') {
        try {
            this.ui.showExportProgress('Exporting complete business data...');
            
            const datasets = {
                users: await this.db.getUsers(),
                employees: await this.db.getEmployees(),
                customers: await this.db.getCustomers(),
                bills: await this.db.getBills(),
                payments: await this.db.getPayments(),
                salary_records: await this.db.getSalaryRecords()
            };

            // Transform data for export (from old version)
            const exportDatasets = {
                users: datasets.users.map(user => ({
                    'Name': user.name,
                    'Email': user.email || '',
                    'Phone': user.phone || '',
                    'Role': user.role,
                    'Status': user.status,
                    'Created Date': this.formatDate(user.created_at)
                })),
                employees: datasets.employees.map(emp => ({
                    'Name': emp.name,
                    'Phone': emp.phone || '',
                    'Role': emp.role,
                    'Salary': emp.salary,
                    'Join Date': this.formatDate(emp.join_date)
                })),
                customers: datasets.customers.map(customer => ({
                    'Name': customer.name,
                    'Phone': customer.phone,
                    'Email': customer.email || '',
                    'Address': customer.address || ''
                })),
                bills: datasets.bills.map(bill => ({
                    'Bill Number': bill.bill_number,
                    'Customer': bill.customer_name,
                    'Date': this.formatDate(bill.bill_date),
                    'Amount': bill.total_amount,
                    'GST': bill.gst_amount,
                    'Status': bill.status
                })),
                payments: datasets.payments.map(payment => ({
                    'Payment ID': payment.id?.slice(0, 8) || 'N/A',
                    'Bill Number': payment.bill_number,
                    'Customer': payment.customer_name,
                    'Amount': payment.amount,
                    'Date': this.formatDate(payment.payment_date),
                    'Method': payment.payment_method
                })),
                salary_records: datasets.salary_records.map(record => ({
                    'Employee': record.employee_name,
                    'Date': this.formatDate(record.record_date),
                    'Amount': record.amount,
                    'Work Hours': record.work_hours
                }))
            };

            return await this.exportMultiple(exportDatasets, format, 'business_data');
            
        } catch (error) {
            console.error('Complete business data export error:', error);
            this.ui.showToast(`Error exporting business data: ${error.message}`, 'error');
            throw error;
        } finally {
            this.ui.hideExportProgress();
        }
    }

    // ==================== UNIFIED EXPORT METHOD ====================

    async exportData(data, format = 'excel', filename, title = 'Export') {
        this.validateExportData(data);
        
        switch (format.toLowerCase()) {
            case 'excel':
                return await this.exportToExcel(data, filename, title);
            case 'pdf':
                return await this.exportToPDF(data, filename, title);
            case 'csv':
                return await this.exportToCSV(data, filename, title);
            case 'enhanced-pdf':
                return await this.exportToEnhancedPDF(data, filename, title);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    // ==================== ELECTRON SUPPORT ====================

    async handleElectronExport(data, format, filename, title) {
        if (!window.electronAPI) {
            throw new Error('Electron API not available');
        }

        try {
            const config = this.getExportConfig(format);
            const result = await window.electronAPI.showSaveDialog({
                defaultPath: `${filename}.${config.fileExtension}`,
                filters: [
                    { name: `${format.toUpperCase()} Files`, extensions: [config.fileExtension] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                let fileData;
                
                if (format === 'excel') {
                    // For Excel, we need to use the XLSX library
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                    fileData = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
                } else if (format === 'csv') {
                    fileData = this.convertToCSV(data);
                } else if (format === 'pdf') {
                    // PDF would need special handling
                    throw new Error('PDF export not yet implemented for Electron');
                }

                const writeResult = await window.electronAPI.writeFile(result.filePath, fileData);
                if (!writeResult.success) {
                    throw new Error(writeResult.error);
                }
                
                this.ui.showToast(`${title} exported successfully via Electron`, 'success');
                return result.filePath;
            }
            
            return null;
        } catch (error) {
            console.error('Electron export error:', error);
            throw error;
        }
    }

    // ==================== VALIDATION & UTILITIES ====================

    validateExportData(data) {
        if (!data || !Array.isArray(data)) {
            throw new Error('Export data must be a non-empty array');
        }
        
        if (data.length === 0) {
            throw new Error('No data to export');
        }
        
        // Check if all objects have the same structure (from old version)
        const firstKeys = Object.keys(data[0]);
        for (let i = 1; i < data.length; i++) {
            const currentKeys = Object.keys(data[i]);
            if (currentKeys.length !== firstKeys.length || 
                !currentKeys.every(key => firstKeys.includes(key))) {
                console.warn('Inconsistent data structure in export data - export may have issues');
                break;
            }
        }
        
        return true;
    }

    createExportSummary(data, title) {
        const summary = {
            title: title,
            exportDate: new Date().toISOString(),
            recordCount: data.length,
            columns: Object.keys(data[0] || {}),
            dataTypes: {}
        };

        // Analyze data types
        if (data.length > 0) {
            const firstRow = data[0];
            summary.columns.forEach(column => {
                const value = firstRow[column];
                summary.dataTypes[column] = typeof value;
            });
        }

        return summary;
    }

    getExportConfig(format) {
        const configs = {
            excel: {
                fileExtension: 'xlsx',
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            pdf: {
                fileExtension: 'pdf',
                mimeType: 'application/pdf'
            },
            csv: {
                fileExtension: 'csv',
                mimeType: 'text/csv'
            }
        };
        
        return configs[format] || configs.excel;
    }

    // ==================== FALLBACK IMPLEMENTATIONS ====================

    fallbackExportToExcel(data, filename) {
        if (!this.dependencies.XLSX) {
            throw new Error('XLSX library not available for Excel export');
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }

    async fallbackExportToPDF(data, filename, title) {
        if (!this.dependencies.jsPDF) {
            throw new Error('jsPDF library not available for PDF export');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Simple PDF implementation
        doc.text(title, 10, 10);
        let y = 20;
        
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            headers.forEach((header, index) => {
                doc.text(`${header}:`, 10, y + (index * 10));
            });
            
            y += headers.length * 10 + 10;
            
            data.forEach((row, rowIndex) => {
                if (y > 280) { // New page if near bottom
                    doc.addPage();
                    y = 20;
                }
                
                headers.forEach((header, colIndex) => {
                    doc.text(`${row[header] || ''}`, 50 + (colIndex * 40), y);
                });
                y += 10;
            });
        }
        
        doc.save(`${filename}.pdf`);
    }

    fallbackExportToCSV(data, filename) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    const stringValue = String(value);
                    return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
                }).join(',')
            )
        ];
        return csvRows.join('\n');
    }

    createBasicPDFTable(doc, headers, tableData, startY) {
        // Basic table implementation without AutoTable
        const columnWidth = 180 / headers.length;
        let y = startY;
        
        // Headers
        headers.forEach((header, index) => {
            doc.text(header, 10 + (index * columnWidth), y);
        });
        
        y += 10;
        
        // Data
        tableData.forEach(row => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            
            row.forEach((cell, index) => {
                doc.text(String(cell), 10 + (index * columnWidth), y);
            });
            
            y += 10;
        });
    }

    formatDate(date) {
        if (!date) return '';
        if (typeof Utils !== 'undefined' && Utils.formatDate) {
            return Utils.formatDate(date);
        }
        // Fallback date formatting
        return new Date(date).toLocaleDateString();
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

window.ExportManager = ExportManager;