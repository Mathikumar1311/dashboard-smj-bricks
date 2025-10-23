// Enhanced utilities for Electron app
class ElectronUtils {
    static async exportData(data, defaultFilename) {
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.showSaveDialog({
                    defaultPath: defaultFilename,
                    filters: [
                        { name: 'CSV Files', extensions: ['csv'] },
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled && result.filePath) {
                    const fileExtension = result.filePath.split('.').pop().toLowerCase();
                    let fileData;

                    if (fileExtension === 'json') {
                        fileData = JSON.stringify(data, null, 2);
                    } else {
                        // CSV format
                        const headers = Object.keys(data[0]);
                        const csvContent = [
                            headers.join(','),
                            ...data.map(row => headers.map(header => {
                                const value = row[header];
                                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
                            }).join(','))
                        ].join('\n');
                        fileData = csvContent;
                    }

                    const writeResult = await window.electronAPI.writeFile(result.filePath, fileData);
                    return writeResult.success;
                }
            } catch (error) {
                console.error('Export error:', error);
                return false;
            }
        } else {
            // Fallback to browser download
            return this.browserExport(data, defaultFilename);
        }
    }

    static browserExport(data, filename) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
    }

    static convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
                }).join(',')
            )
        ];
        return csvRows.join('\n');
    }

    static async backupAppData() {
        if (!window.electronAPI) return false;

        try {
            // Get all data from different sections
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                users: await app.db.getUsers(),
                employees: await app.db.getEmployees(),
                customers: await app.db.getCustomers(),
                bills: await app.db.getBills(),
                payments: await app.db.getPayments(),
                salaryRecords: await app.db.getSalaryRecords()
            };

            const result = await window.electronAPI.showSaveDialog({
                defaultPath: `business-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                const writeResult = await window.electronAPI.writeFile(
                    result.filePath, 
                    JSON.stringify(backupData, null, 2)
                );
                return writeResult.success;
            }
        } catch (error) {
            console.error('Backup error:', error);
            return false;
        }
    }
}