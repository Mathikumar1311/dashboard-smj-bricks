class AutoUpdater {
    constructor() {
        this.currentVersion = '1.0.0';
        this.updateCheckInterval = 30 * 60 * 1000; // 30 minutes
        this.githubRepo = 'your-username/your-repo-name'; // Replace with your repo
        this.updateInterval = null;
    }

    async initialize() {
        console.log('🔄 Initializing auto-updater...');
        
        // Check for updates on startup
        await this.checkForUpdates();
        
        // Set up periodic update checks
        this.setupPeriodicChecks();
        
        console.log('✅ Auto-updater initialized');
    }

    setupPeriodicChecks() {
        this.updateInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.updateCheckInterval);
    }

    async checkForUpdates() {
        try {
            console.log('🔍 Checking for updates...');
            
            const latestRelease = await this.getLatestRelease();
            
            if (this.isNewerVersion(latestRelease.tag_name)) {
                console.log(`🎉 New version available: ${latestRelease.tag_name}`);
                this.notifyUpdateAvailable(latestRelease);
            } else {
                console.log('✅ Application is up to date');
            }
        } catch (error) {
            console.warn('⚠️ Could not check for updates:', error.message);
        }
    }

    async getLatestRelease() {
        const response = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases/latest`);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        return await response.json();
    }

    isNewerVersion(latestVersion) {
        // Remove 'v' prefix if present
        const cleanLatest = latestVersion.replace(/^v/, '');
        const cleanCurrent = this.currentVersion.replace(/^v/, '');
        
        const latestParts = cleanLatest.split('.').map(Number);
        const currentParts = cleanCurrent.split('.').map(Number);
        
        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const latestPart = latestParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            
            if (latestPart > currentPart) return true;
            if (latestPart < currentPart) return false;
        }
        
        return false;
    }

    notifyUpdateAvailable(release) {
        // Create update notification
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <h3>🎉 Update Available!</h3>
                <p>Version ${release.tag_name} is available</p>
                <p>${release.body || 'Bug fixes and improvements'}</p>
                <div class="update-actions">
                    <button id="updateNow" class="btn-primary">
                        <i class="fas fa-download"></i> Update Now
                    </button>
                    <button id="updateLater" class="btn-secondary">
                        <i class="fas fa-clock"></i> Later
                    </button>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-primary);
            border: 2px solid var(--primary-color);
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Add event listeners
        document.getElementById('updateNow').addEventListener('click', () => {
            this.downloadAndInstall(release);
            notification.remove();
        });
        
        document.getElementById('updateLater').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 30000);
    }

    async downloadAndInstall(release) {
        try {
            // Show download progress
            this.showDownloadProgress();
            
            // In a real Electron app, you would:
            // 1. Download the new release
            // 2. Verify the download
            // 3. Install the update
            // 4. Restart the application
            
            // For web version, we'll just reload with cache busting
            console.log('⬇️ Downloading update...');
            
            // Simulate download progress
            for (let i = 0; i <= 100; i += 10) {
                await this.delay(200);
                this.updateDownloadProgress(i);
            }
            
            // Install update (reload page with cache busting)
            this.installUpdate();
            
        } catch (error) {
            console.error('❌ Update failed:', error);
            this.showUpdateError(error);
        }
    }

    showDownloadProgress() {
        const progress = document.createElement('div');
        progress.id = 'updateProgress';
        progress.innerHTML = `
            <div class="update-progress-content">
                <h3>⬇️ Downloading Update</h3>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <p id="progressText">0%</p>
            </div>
        `;
        
        progress.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-primary);
            border: 2px solid var(--primary-color);
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            text-align: center;
        `;
        
        document.body.appendChild(progress);
    }

    updateDownloadProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        }
    }

    installUpdate() {
        // For web version: reload with cache busting
        // For Electron: quit and install
        console.log('🔄 Installing update...');
        
        setTimeout(() => {
            // Clear cache and reload
            if (window.electronAPI) {
                // Electron app - restart
                window.electronAPI.restartApp();
            } else {
                // Web app - reload with cache busting
                window.location.reload(true);
            }
        }, 1000);
    }

    showUpdateError(error) {
        const progress = document.getElementById('updateProgress');
        if (progress) {
            progress.innerHTML = `
                <div class="update-error">
                    <h3>❌ Update Failed</h3>
                    <p>${error.message}</p>
                    <button onclick="this.closest('.update-error').remove()" class="btn-primary">
                        Close
                    </button>
                </div>
            `;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Add CSS for update notifications
const updateStyles = `
@keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.update-notification {
    animation: slideIn 0.3s ease;
}

.update-content h3 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.update-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.update-actions button {
    flex: 1;
}

.progress-bar {
    width: 100%;
    height: 20px;
    background: var(--bg-tertiary);
    border-radius: 10px;
    overflow: hidden;
    margin: 1rem 0;
}

.progress-fill {
    height: 100%;
    background: var(--primary-color);
    transition: width 0.3s ease;
    border-radius: 10px;
}

.update-error {
    text-align: center;
}

.update-error h3 {
    color: var(--danger-color);
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = updateStyles;
document.head.appendChild(styleSheet);

window.AutoUpdater = AutoUpdater;