/**
 * Admin Dashboard JavaScript
 * Handles all admin operations and dashboard functionality
 */

class AdminDashboard {
    constructor() {
        this.currentAdmin = null;
        this.currentSection = 'dashboard';
        this.notifications = [];
        this.systemAlerts = [];
        this.initialize();
    }
    
    async initialize() {
        await this.checkAuthentication();
        this.loadAdminData();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupRealTimeUpdates();
        this.initializeDataTables();
        this.setupAutoSave();
        this.setupSessionManagement();
    }
    
    async checkAuthentication() {
        const session = localStorage.getItem('admin_session');
        
        if (!session) {
            window.location.href = '/admin/login.html';
            return;
        }
        
        try {
            const sessionData = JSON.parse(session);
            const now = Date.now();
            
            // Check if session is expired
            if (now > sessionData.session.expires) {
                this.showSessionExpired();
                return;
            }
            
            this.currentAdmin = sessionData.user;
            
            // Refresh session (extend expiry)
            sessionData.session.expires = now + (24 * 60 * 60 * 1000);
            localStorage.setItem('admin_session', JSON.stringify(sessionData));
            
        } catch (error) {
            console.error('Session error:', error);
            window.location.href = '/admin/login.html';
        }
    }
    
    loadAdminData() {
        // Update UI with admin data
        document.getElementById('adminName').textContent = this.currentAdmin.full_name;
        document.getElementById('adminRole').textContent = this.currentAdmin.role;
        document.getElementById('adminUsername').textContent = this.currentAdmin.username;
        
        // Set page title
        document.title = `${this.currentAdmin.full_name} | Kalenjin Vibes Admin`;
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.loadSection(section);
                this.updateActiveNav(link);
            });
        });
        
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.querySelector('aside').classList.toggle('open');
        });
        
        // Dropdown menus
        this.setupDropdowns();
        
        // Logout buttons
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('mobileLogoutBtn').addEventListener('click', () => this.logout());
        
        // Quick actions
        this.setupQuickActions();
        
        // Modal close
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) {
                this.closeModal();
            }
        });
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setupDropdowns() {
        const dropdowns = [
            { btn: 'profileMenuBtn', panel: 'profileMenu' },
            { btn: 'notificationsBtn', panel: 'notificationsPanel' },
            { btn: 'quickActionsBtn', panel: 'quickActionsPanel' },
            { btn: 'alertsBtn', panel: 'alertsPanel' },
            { btn: 'mobileUserMenuBtn', panel: 'mobileUserMenu' }
        ];
        
        dropdowns.forEach(({ btn, panel }) => {
            const button = document.getElementById(btn);
            const panelEl = document.getElementById(panel);
            
            if (button && panelEl) {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    panelEl.classList.toggle('hidden');
                    
                    // Close other dropdowns
                    dropdowns.forEach(({ panel: otherPanel }) => {
                        if (otherPanel !== panel) {
                            document.getElementById(otherPanel).classList.add('hidden');
                        }
                    });
                });
            }
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            dropdowns.forEach(({ panel }) => {
                document.getElementById(panel).classList.add('hidden');
            });
        });
    }
    
    setupQuickActions() {
        const actions = {
            'newTransaction': () => this.showNewTransactionModal(),
            'addUser': () => this.showAddUserModal(),
            'exportData': () => this.exportData(),
            'systemSettings': () => this.loadSection('settings'),
            'verifyPayment': () => this.showQuickVerifyModal(),
            'addAdmin': () => this.showAddAdminModal(),
            'backup': () => this.initiateBackup()
        };
        
        Object.keys(actions).forEach(actionId => {
            const button = document.querySelector(`[data-action="${actionId}"]`);
            if (button) {
                button.addEventListener('click', actions[actionId]);
            }
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input[type="search"]').focus();
            }
            
            // Ctrl/Cmd + L for logout
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.logout();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeModal();
            }
            
            // F1 for help
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
        });
    }
    
    async loadDashboardData() {
        try {
            // Load stats
            const stats = await this.fetchDashboardStats();
            this.updateStatsCards(stats);
            
            // Load notifications
            this.notifications = await this.fetchNotifications();
            this.updateNotifications();
            
            // Load system alerts
            this.systemAlerts = await this.fetchSystemAlerts();
            this.updateSystemAlerts();
            
            // Load recent activities
            await this.loadRecentActivities();
            
            // Load charts data
            await this.loadChartsData();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async fetchDashboardStats() {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            totalRevenue: 1245800,
            activeUsers: 2847,
            pendingTransactions: 42,
            systemHealth: 94,
            newUsersToday: 127,
            totalTransactions: 1843,
            conversionRate: 4.2,
            avgTransactionValue: 12500
        };
    }
    
    updateStatsCards(stats) {
        // Update revenue card
        const revenueCard = document.querySelector('.stat-card:nth-child(1) h3');
        if (revenueCard) revenueCard.textContent = `Ksh ${stats.totalRevenue.toLocaleString()}`;
        
        // Update users card
        const usersCard = document.querySelector('.stat-card:nth-child(2) h3');
        if (usersCard) usersCard.textContent = stats.activeUsers.toLocaleString();
        
        // Update pending transactions card
        const pendingCard = document.querySelector('.stat-card:nth-child(3) h3');
        if (pendingCard) pendingCard.textContent = stats.pendingTransactions;
        
        // Update system health card
        const healthCard = document.querySelector('.stat-card:nth-child(4) h3');
        if (healthCard) healthCard.textContent = `${stats.systemHealth}%`;
    }
    
    async fetchNotifications() {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return [
            {
                id: 1,
                type: 'payment',
                title: 'New Payment Received',
                message: 'Payment of Ksh 25,000 received from John Doe',
                time: '5 minutes ago',
                read: false,
                important: true
            },
            {
                id: 2,
                type: 'user',
                title: 'New User Registered',
                message: 'Mike Johnson registered as a new user',
                time: '1 hour ago',
                read: false,
                important: false
            },
            {
                id: 3,
                type: 'system',
                title: 'System Update Available',
                message: 'New admin panel update v2.1 is available',
                time: '2 hours ago',
                read: true,
                important: true
            }
        ];
    }
    
    updateNotifications() {
        const container = document.getElementById('notificationsPanel')?.querySelector('.max-h-96');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.notifications.forEach(notification => {
            const notificationEl = document.createElement('div');
            notificationEl.className = `notification-item ${notification.read ? '' : 'unread'}`;
            notificationEl.innerHTML = `
                <div class="flex items-start">
                    <div class="mr-3 mt-1">
                        <i class="fas fa-${this.getNotificationIcon(notification.type)} 
                           text-${this.getNotificationColor(notification.type)}"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-medium">${notification.title}</h4>
                        <p class="text-slate-400 text-sm mt-1">${notification.message}</p>
                        <p class="text-slate-500 text-xs mt-2">${notification.time}</p>
                    </div>
                    ${!notification.read ? 
                        '<span class="w-2 h-2 bg-blue-500 rounded-full mt-2"></span>' : ''}
                </div>
            `;
            container.appendChild(notificationEl);
        });
        
        // Update notification badge
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.querySelector('#notificationsBtn .notification-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            payment: 'credit-card',
            user: 'user',
            system: 'cog',
            warning: 'exclamation-triangle',
            success: 'check-circle'
        };
        return icons[type] || 'bell';
    }
    
    getNotificationColor(type) {
        const colors = {
            payment: 'blue-400',
            user: 'green-400',
            system: 'purple-400',
            warning: 'yellow-400',
            success: 'green-400'
        };
        return colors[type] || 'blue-400';
    }
    
    async fetchSystemAlerts() {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return [
            {
                id: 1,
                type: 'warning',
                message: 'High server load detected',
                details: 'CPU usage at 85%',
                severity: 'medium'
            },
            {
                id: 2,
                type: 'error',
                message: 'Backup overdue',
                details: 'Last backup 48 hours ago',
                severity: 'high'
            }
        ];
    }
    
    updateSystemAlerts() {
        const container = document.getElementById('alertsPanel')?.querySelector('.p-4');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.systemAlerts.forEach(alert => {
            const alertEl = document.createElement('div');
            alertEl.className = `flex items-start mb-3 ${alert.severity === 'high' ? 'border-l-4 border-red-500 pl-3' : ''}`;
            alertEl.innerHTML = `
                <i class="fas fa-${alert.type === 'warning' ? 'exclamation-circle' : 'exclamation-triangle'} 
                   text-${alert.type === 'warning' ? 'yellow' : 'red'}-500 mt-1 mr-3"></i>
                <div>
                    <p class="font-medium">${alert.message}</p>
                    <p class="text-slate-400 text-sm">${alert.details}</p>
                </div>
            `;
            container.appendChild(alertEl);
        });
        
        // Update alert badge
        const alertCount = this.systemAlerts.length;
        const badge = document.querySelector('#alertsBtn span');
        if (badge) {
            badge.textContent = alertCount;
            badge.classList.toggle('hidden', alertCount === 0);
        }
    }
    
    async loadRecentActivities() {
        // Load recent admin activities
        const activities = await this.fetchRecentActivities();
        this.displayRecentActivities(activities);
    }
    
    async fetchRecentActivities() {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 400));
        
        return [
            { admin: 'Super Admin', action: 'Verified payment', time: '10 min ago', type: 'payment' },
            { admin: 'Support Admin', action: 'Processed refund', time: '25 min ago', type: 'refund' },
            { admin: 'Finance Admin', action: 'Exported transactions', time: '1 hour ago', type: 'export' },
            { admin: 'Super Admin', action: 'Updated system settings', time: '2 hours ago', type: 'settings' },
            { admin: 'Moderator', action: 'Approved talent profile', time: '3 hours ago', type: 'talent' }
        ];
    }
    
    displayRecentActivities(activities) {
        const container = document.querySelector('[data-activities-container]');
        if (!container) return;
        
        container.innerHTML = '';
        
        activities.forEach(activity => {
            const activityEl = document.createElement('div');
            activityEl.className = 'flex items-center justify-between py-2 border-b border-slate-700 last:border-0';
            activityEl.innerHTML = `
                <div>
                    <p class="font-medium">${activity.admin}</p>
                    <p class="text-slate-400 text-sm">${activity.action}</p>
                </div>
                <span class="text-slate-500 text-sm">${activity.time}</span>
            `;
            container.appendChild(activityEl);
        });
    }
    
    async loadChartsData() {
        // Initialize or update charts
        this.initializeRevenueChart();
        this.initializeUserGrowthChart();
    }
    
    initializeRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        // Chart is already initialized in inline script
        // This method would update the chart data
    }
    
    initializeUserGrowthChart() {
        const ctx = document.getElementById('userGrowthChart');
        if (!ctx) return;
        
        // Similar to revenue chart initialization
    }
    
    setupRealTimeUpdates() {
        // WebSocket or polling for real-time updates
        setInterval(() => this.checkForUpdates(), 30000); // Every 30 seconds
        
        // Listen for storage events (for cross-tab communication)
        window.addEventListener('storage', (e) => {
            if (e.key === 'admin_updates') {
                this.handleExternalUpdate(e.newValue);
            }
        });
    }
    
    async checkForUpdates() {
        try {
            const updates = await this.fetchUpdates();
            if (updates.hasUpdates) {
                this.showUpdateNotification(updates);
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }
    
    async fetchUpdates() {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            hasUpdates: Math.random() > 0.7, // 30% chance of updates
            newPayments: Math.floor(Math.random() * 5),
            newUsers: Math.floor(Math.random() * 3),
            systemMessages: []
        };
    }
    
    showUpdateNotification(updates) {
        if (updates.newPayments > 0) {
            this.showToast(`${updates.newPayments} new payment(s) require attention`, 'info');
        }
        
        if (updates.newUsers > 0) {
            this.showToast(`${updates.newUsers} new user(s) registered`, 'success');
        }
    }
    
    handleExternalUpdate(updateData) {
        // Handle updates from other tabs
        if (updateData?.type === 'logout') {
            this.showSessionExpired();
        } else if (updateData?.type === 'dataUpdate') {
            this.refreshCurrentSection();
        }
    }
    
    initializeDataTables() {
        // Initialize DataTables for tables
        $('.data-table').DataTable({
            pageLength: 10,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search..."
            },
            dom: '<"flex justify-between items-center mb-4"<"flex items-center"l><"flex items-center"f>>rt<"flex justify-between items-center mt-4"<"flex items-center"i><"flex items-center"p>>'
        });
    }
    
    setupAutoSave() {
        // Auto-save form data
        document.addEventListener('input', (e) => {
            if (e.target.closest('[data-autosave]')) {
                this.debounce(() => this.saveFormData(e.target.closest('form')), 1000);
            }
        });
    }
    
    debounce(func, wait) {
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
    
    async saveFormData(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            // Save to localStorage as backup
            const formId = form.id || 'unsaved_form';
            localStorage.setItem(`form_backup_${formId}`, JSON.stringify(data));
            
            // Show save indicator
            this.showSaveIndicator();
        } catch (error) {
            console.error('Error saving form:', error);
        }
    }
    
    showSaveIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
        indicator.innerHTML = '<i class="fas fa-save mr-2"></i> Changes saved';
        document.body.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 2000);
    }
    
    setupSessionManagement() {
        // Warn before session expires
        const warningTime = 5 * 60 * 1000; // 5 minutes
        
        this.sessionWarningTimeout = setTimeout(() => {
            this.showSessionWarning();
        }, 25 * 60 * 1000); // Warn after 25 minutes
        
        // Reset timer on user activity
        const activities = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activities.forEach(event => {
            document.addEventListener(event, () => {
                clearTimeout(this.sessionWarningTimeout);
                this.sessionWarningTimeout = setTimeout(() => {
                    this.showSessionWarning();
                }, 25 * 60 * 1000);
            });
        });
    }
    
    showSessionWarning() {
        Swal.fire({
            title: 'Session Expiring Soon',
            text: 'Your session will expire in 5 minutes due to inactivity.',
            icon: 'warning',
            timer: 300000, // 5 minutes
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'Stay Logged In',
            showCancelButton: true,
            cancelButtonText: 'Logout',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                // Extend session
                this.extendSession();
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                this.logout();
            }
        });
    }
    
    extendSession() {
        const session = JSON.parse(localStorage.getItem('admin_session'));
        if (session) {
            session.session.expires = Date.now() + (30 * 60 * 1000); // Extend 30 minutes
            localStorage.setItem('admin_session', JSON.stringify(session));
        }
    }
    
    showSessionExpired() {
        Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please login again.',
            icon: 'warning',
            confirmButtonText: 'Login Again',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            localStorage.removeItem('admin_session');
            window.location.href = '/admin/login.html';
        });
    }
    
    loadSection(section) {
        this.currentSection = section;
        
        // Hide all sections
        document.querySelectorAll('[data-section]').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show target section
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        } else {
            // Load section dynamically
            this.loadDynamicSection(section);
        }
        
        // Update URL without reloading
        history.pushState({ section }, '', `/admin/#${section}`);
        
        // Log section change
        this.logActivity(`Navigated to ${section} section`);
    }
    
    async loadDynamicSection(section) {
        const container = document.getElementById('contentSections');
        container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="loading-spinner"></div></div>';
        
        try {
            const content = await this.fetchSectionContent(section);
            container.innerHTML = content;
            this.initializeSectionComponents(section);
        } catch (error) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                    <h3 class="text-xl font-bold mb-2">Failed to load section</h3>
                    <p class="text-slate-400">${error.message}</p>
                    <button onclick="adminDashboard.loadSection('${section}')" 
                            class="mt-4 px-4 py-2 btn-primary rounded-lg">
                        <i class="fas fa-redo mr-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }
    
    async fetchSectionContent(section) {
        // Mock API call - in production, this would fetch from server
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const templates = {
            payments: this.getPaymentsSection(),
            transactions: this.getTransactionsSection(),
            refunds: this.getRefundsSection(),
            users: this.getUsersSection(),
            talents: this.getTalentsSection(),
            events: this.getEventsSection(),
            products: this.getProductsSection(),
            reports: this.getReportsSection(),
            admins: this.getAdminsSection(),
            settings: this.getSettingsSection(),
            backup: this.getBackupSection(),
            logs: this.getLogsSection()
        };
        
        return templates[section] || `<h2 class="text-2xl font-bold">${section.charAt(0).toUpperCase() + section.slice(1)}</h2>`;
    }
    
    getPaymentsSection() {
        return `
            <div class="space-y-6 fade-in">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 class="text-2xl font-bold">Payment Management</h2>
                    <div class="flex flex-wrap gap-3">
                        <button class="px-4 py-2 btn-primary rounded-lg flex items-center">
                            <i class="fas fa-filter mr-2"></i>Filter
                        </button>
                        <button class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center">
                            <i class="fas fa-download mr-2"></i>Export
                        </button>
                        <button class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center" 
                                onclick="adminDashboard.showNewPaymentModal()">
                            <i class="fas fa-plus mr-2"></i>New Payment
                        </button>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
                        <p class="text-blue-300 text-sm">Total Payments</p>
                        <h3 class="text-2xl font-bold mt-2">1,843</h3>
                    </div>
                    <div class="bg-green-900/30 border border-green-700/50 rounded-xl p-4">
                        <p class="text-green-300 text-sm">Verified</p>
                        <h3 class="text-2xl font-bold mt-2">1,756</h3>
                    </div>
                    <div class="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4">
                        <p class="text-yellow-300 text-sm">Pending</p>
                        <h3 class="text-2xl font-bold mt-2">42</h3>
                    </div>
                    <div class="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
                        <p class="text-red-300 text-sm">Rejected</p>
                        <h3 class="text-2xl font-bold mt-2">45</h3>
                    </div>
                </div>
                
                <!-- Filters -->
                <div class="card rounded-xl p-4">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm text-slate-400 mb-2">Status</label>
                            <select class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm text-slate-400 mb-2">Payment Method</label>
                            <select class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                                <option value="">All Methods</option>
                                <option value="mpesa">M-Pesa</option>
                                <option value="paybill">Paybill</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm text-slate-400 mb-2">Date Range</label>
                            <select class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button class="w-full px-4 py-2 btn-primary rounded-lg">
                                <i class="fas fa-search mr-2"></i>Search
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Payments Table -->
                <div class="table-container rounded-xl">
                    <table id="paymentsTable" class="data-table display" style="width:100%">
                        <thead>
                            <tr>
                                <th>Ticket No</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Data will be loaded by DataTables -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    initializeSectionComponents(section) {
        switch(section) {
            case 'payments':
                this.initializePaymentsTable();
                break;
            case 'users':
                this.initializeUsersTable();
                break;
            case 'admins':
                this.initializeAdminsTable();
                break;
            // Add more sections as needed
        }
    }
    
    initializePaymentsTable() {
        $('#paymentsTable').DataTable({
            ajax: {
                url: '/api/admin/payments',
                dataSrc: ''
            },
            columns: [
                { data: 'ticket_number' },
                { 
                    data: 'customer',
                    render: function(data) {
                        return `
                            <div>
                                <div class="font-medium">${data.name}</div>
                                <div class="text-slate-400 text-sm">${data.email}</div>
                            </div>
                        `;
                    }
                },
                { 
                    data: 'amount',
                    render: function(data) {
                        return `Ksh ${parseFloat(data).toLocaleString()}`;
                    }
                },
                { data: 'payment_method' },
                { 
                    data: 'status',
                    render: function(data) {
                        const statusClass = {
                            'pending': 'status-pending',
                            'verified': 'status-completed',
                            'rejected': 'status-failed',
                            'processing': 'status-processing'
                        }[data] || '';
                        
                        return `<span class="status-badge ${statusClass}">${data}</span>`;
                    }
                },
                { 
                    data: 'payment_date',
                    render: function(data) {
                        return new Date(data).toLocaleDateString();
                    }
                },
                { 
                    data: null,
                    orderable: false,
                    render: function(data, type, row) {
                        return `
                            <div class="flex space-x-2">
                                <button class="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-900/20" 
                                        onclick="adminDashboard.verifyPayment(${row.id})"
                                        data-tooltip="Verify">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/20"
                                        onclick="adminDashboard.rejectPayment(${row.id})"
                                        data-tooltip="Reject">
                                    <i class="fas fa-times"></i>
                                </button>
                                <button class="p-2 text-yellow-400 hover:text-yellow-300 rounded-lg hover:bg-yellow-900/20"
                                        onclick="adminDashboard.viewPaymentDetails(${row.id})"
                                        data-tooltip="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="p-2 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-900/20"
                                        onclick="adminDashboard.refundPayment(${row.id})"
                                        data-tooltip="Refund">
                                    <i class="fas fa-undo"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            order: [[5, 'desc']] // Sort by date descending
        });
    }
    
    async verifyPayment(paymentId) {
        try {
            const { value: notes } = await Swal.fire({
                title: 'Verify Payment',
                input: 'textarea',
                inputLabel: 'Verification Notes (Optional)',
                inputPlaceholder: 'Enter any notes about this verification...',
                showCancelButton: true,
                confirmButtonText: 'Verify',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    if (value && value.length > 500) {
                        return 'Notes must be less than 500 characters';
                    }
                }
            });
            
            if (notes !== undefined) {
                // API call to verify payment
                const response = await this.apiCall(`/api/admin/payments/${paymentId}/verify`, 'POST', { notes });
                
                if (response.success) {
                    this.showSuccess('Payment verified successfully');
                    $('#paymentsTable').DataTable().ajax.reload();
                } else {
                    this.showError(response.message || 'Failed to verify payment');
                }
            }
        } catch (error) {
            this.showError('Error verifying payment');
        }
    }
    
    async rejectPayment(paymentId) {
        try {
            const { value: reason } = await Swal.fire({
                title: 'Reject Payment',
                input: 'select',
                inputLabel: 'Select Rejection Reason',
                inputOptions: {
                    'invalid_transaction': 'Invalid Transaction Code',
                    'insufficient_funds': 'Insufficient Funds',
                    'suspected_fraud': 'Suspected Fraud',
                    'wrong_amount': 'Wrong Amount',
                    'other': 'Other Reason'
                },
                inputPlaceholder: 'Select a reason',
                showCancelButton: true,
                confirmButtonText: 'Reject',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Please select a rejection reason';
                    }
                }
            });
            
            if (reason) {
                let customReason = '';
                if (reason === 'other') {
                    const { value: custom } = await Swal.fire({
                        title: 'Enter Rejection Reason',
                        input: 'text',
                        inputLabel: 'Custom Reason',
                        showCancelButton: true,
                        confirmButtonText: 'Submit',
                        cancelButtonText: 'Cancel'
                    });
                    
                    if (!custom) return;
                    customReason = custom;
                }
                
                // API call to reject payment
                const response = await this.apiCall(`/api/admin/payments/${paymentId}/reject`, 'POST', {
                    reason: reason === 'other' ? customReason : reason
                });
                
                if (response.success) {
                    this.showSuccess('Payment rejected successfully');
                    $('#paymentsTable').DataTable().ajax.reload();
                } else {
                    this.showError(response.message || 'Failed to reject payment');
                }
            }
        } catch (error) {
            this.showError('Error rejecting payment');
        }
    }
    
    async viewPaymentDetails(paymentId) {
        try {
            // Show loading
            Swal.fire({
                title: 'Loading Payment Details',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Fetch payment details
            const payment = await this.apiCall(`/api/admin/payments/${paymentId}`);
            
            Swal.close();
            
            // Show details in modal
            this.showModal(`
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-bold">Payment Details</h3>
                        <span class="status-badge ${payment.status === 'verified' ? 'status-completed' : 
                                                   payment.status === 'pending' ? 'status-pending' : 
                                                   'status-failed'}">
                            ${payment.status}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold mb-3 text-slate-400">Transaction Info</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span>Ticket Number:</span>
                                    <span class="font-mono">${payment.ticket_number}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Amount:</span>
                                    <span class="font-bold">Ksh ${parseFloat(payment.amount).toLocaleString()}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Payment Method:</span>
                                    <span>${payment.payment_method.toUpperCase()}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Transaction Code:</span>
                                    <span class="font-mono">${payment.transaction_code}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Date:</span>
                                    <span>${new Date(payment.payment_date).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold mb-3 text-slate-400">Customer Info</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span>Name:</span>
                                    <span>${payment.customer.name}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Email:</span>
                                    <span>${payment.customer.email}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Phone:</span>
                                    <span>${payment.customer.phone}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${payment.notes ? `
                        <div>
                            <h4 class="font-semibold mb-2 text-slate-400">Notes</h4>
                            <p class="text-slate-300">${payment.notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                        <button onclick="adminDashboard.closeModal()" 
                                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                            Close
                        </button>
                        ${payment.status === 'pending' ? `
                            <button onclick="adminDashboard.verifyPayment(${payment.id})" 
                                    class="px-4 py-2 btn-primary rounded-lg">
                                <i class="fas fa-check mr-2"></i>Verify
                            </button>
                            <button onclick="adminDashboard.rejectPayment(${payment.id})" 
                                    class="px-4 py-2 btn-danger rounded-lg">
                                <i class="fas fa-times mr-2"></i>Reject
                            </button>
                        ` : ''}
                    </div>
                </div>
            `);
        } catch (error) {
            Swal.close();
            this.showError('Failed to load payment details');
        }
    }
    
    async refundPayment(paymentId) {
        this.showModal(`
            <div class="space-y-6">
                <h3 class="text-xl font-bold">Process Refund</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-slate-400 mb-2">Refund Amount</label>
                        <input type="number" 
                               class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
                               placeholder="Enter refund amount"
                               id="refundAmount">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-slate-400 mb-2">Refund Reason</label>
                        <textarea 
                            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 h-32"
                            placeholder="Explain why this refund is being processed..."
                            id="refundReason"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-slate-400 mb-2">Refund Method</label>
                        <select class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3" id="refundMethod">
                            <option value="mpesa">M-Pesa</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="credit_card">Credit Card</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <button onclick="adminDashboard.closeModal()" 
                            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                        Cancel
                    </button>
                    <button onclick="adminDashboard.submitRefund(${paymentId})" 
                            class="px-4 py-2 btn-danger rounded-lg">
                        <i class="fas fa-undo mr-2"></i>Process Refund
                    </button>
                </div>
            </div>
        `);
    }
    
    async submitRefund(paymentId) {
        const amount = document.getElementById('refundAmount').value;
        const reason = document.getElementById('refundReason').value;
        const method = document.getElementById('refundMethod').value;
        
        if (!amount || !reason) {
            this.showError('Please fill all required fields');
            return;
        }
        
        try {
            const response = await this.apiCall(`/api/admin/payments/${paymentId}/refund`, 'POST', {
                amount,
                reason,
                method
            });
            
            if (response.success) {
                this.showSuccess('Refund processed successfully');
                this.closeModal();
                $('#paymentsTable').DataTable().ajax.reload();
            } else {
                this.showError(response.message || 'Failed to process refund');
            }
        } catch (error) {
            this.showError('Error processing refund');
        }
    }
    
    updateActiveNav(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }
    
    showModal(content) {
        document.getElementById('modalContent').innerHTML = content;
        document.getElementById('modalOverlay').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
        document.getElementById('modalContent').innerHTML = '';
        document.body.style.overflow = '';
    }
    
    showNewTransactionModal() {
        this.showModal(`
            <div class="space-y-6">
                <h3 class="text-xl font-bold">Create New Transaction</h3>
                <!-- Transaction form -->
            </div>
        `);
    }
    
    showAddUserModal() {
        this.showModal(`
            <div class="space-y-6">
                <h3 class="text-xl font-bold">Add New User</h3>
                <!-- User form -->
            </div>
        `);
    }
    
    showAddAdminModal() {
        this.showModal(`
            <div class="space-y-6">
                <h3 class="text-xl font-bold">Add New Administrator</h3>
                <!-- Admin form -->
            </div>
        `);
    }
    
    showQuickVerifyModal() {
        this.showModal(`
            <div class="space-y-6">
                <h3 class="text-xl font-bold">Quick Payment Verification</h3>
                <!-- Quick verify form -->
            </div>
        `);
    }
    
    async exportData() {
        try {
            const { value: format } = await Swal.fire({
                title: 'Export Data',
                input: 'select',
                inputOptions: {
                    'csv': 'CSV',
                    'excel': 'Excel',
                    'pdf': 'PDF',
                    'json': 'JSON'
                },
                inputPlaceholder: 'Select format',
                showCancelButton: true,
                confirmButtonText: 'Export',
                cancelButtonText: 'Cancel'
            });
            
            if (format) {
                // Show loading
                Swal.fire({
                    title: 'Exporting Data',
                    text: 'Please wait while we prepare your export...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                // Simulate export
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                Swal.close();
                this.showSuccess(`Data exported successfully as ${format.toUpperCase()}`);
            }
        } catch (error) {
            this.showError('Failed to export data');
        }
    }
    
    async initiateBackup() {
        try {
            const { value: backupType } = await Swal.fire({
                title: 'System Backup',
                input: 'select',
                inputOptions: {
                    'full': 'Full Backup',
                    'incremental': 'Incremental Backup',
                    'transaction': 'Transaction Log Backup'
                },
                inputPlaceholder: 'Select backup type',
                showCancelButton: true,
                confirmButtonText: 'Start Backup',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Please select a backup type';
                    }
                }
            });
            
            if (backupType) {
                // Show confirmation
                const { isConfirmed } = await Swal.fire({
                    title: 'Confirm Backup',
                    text: `This will create a ${backupType} backup. The system may be slower during backup.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed',
                    cancelButtonText: 'Cancel'
                });
                
                if (isConfirmed) {
                    // Start backup
                    this.startBackup(backupType);
                }
            }
        } catch (error) {
            this.showError('Failed to initiate backup');
        }
    }
    
    async startBackup(type) {
        Swal.fire({
            title: 'Creating Backup',
            html: `
                <div class="text-center">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p>Creating ${type} backup...</p>
                    <div class="w-full bg-slate-700 rounded-full h-2 mt-4">
                        <div id="backupProgress" class="bg-blue-500 h-2 rounded-full" style="width: 0%"></div>
                    </div>
                    <p id="backupStatus" class="text-sm text-slate-400 mt-2">Initializing...</p>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false
        });
        
        // Simulate backup progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            document.getElementById('backupProgress').style.width = `${progress}%`;
            
            const status = document.getElementById('backupStatus');
            if (progress < 30) status.textContent = 'Preparing files...';
            else if (progress < 60) status.textContent = 'Compressing data...';
            else if (progress < 90) status.textContent = 'Creating backup file...';
            else status.textContent = 'Finalizing...';
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    Swal.close();
                    this.showSuccess('Backup completed successfully!');
                }, 500);
            }
        }, 200);
    }
    
    showHelp() {
        this.showModal(`
            <div class="space-y-6">
                <h3 class="text-xl font-bold">Admin Panel Help</h3>
                
                <div class="space-y-4">
                    <div>
                        <h4 class="font-semibold mb-2">Keyboard Shortcuts</h4>
                        <ul class="space-y-2 text-sm">
                            <li><kbd>Ctrl/Cmd + K</kbd> - Focus search</li>
                            <li><kbd>Ctrl/Cmd + L</kbd> - Logout</li>
                            <li><kbd>F1</kbd> - This help menu</li>
                            <li><kbd>Esc</kbd> - Close modals</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Quick Links</h4>
                        <ul class="space-y-2 text-sm">
                            <li><i class="fas fa-credit-card mr-2"></i>Payments - Manage all transactions</li>
                            <li><i class="fas fa-users mr-2"></i>Users - Customer management</li>
                            <li><i class="fas fa-user-shield mr-2"></i>Administrators - Admin user management</li>
                            <li><i class="fas fa-cogs mr-2"></i>Settings - System configuration</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Support</h4>
                        <p class="text-sm">For technical support, contact:</p>
                        <ul class="text-sm mt-2">
                            <li><i class="fas fa-envelope mr-2"></i>support@kalenjinvibes.com</li>
                            <li><i class="fas fa-phone mr-2"></i>+254 797 265 275</li>
                        </ul>
                    </div>
                </div>
                
                <div class="flex justify-end pt-4 border-t border-slate-700">
                    <button onclick="adminDashboard.closeModal()" 
                            class="px-4 py-2 btn-primary rounded-lg">
                        Close
                    </button>
                </div>
            </div>
        `);
    }
    
    handleResize() {
        // Handle responsive layout adjustments
        if (window.innerWidth < 1024) {
            document.querySelector('aside').classList.add('hidden');
        }
    }
    
    refreshCurrentSection() {
        if (this.currentSection && this.currentSection !== 'dashboard') {
            this.loadSection(this.currentSection);
        }
    }
    
    async apiCall(url, method = 'GET', data = null) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock responses based on endpoint
        if (url.includes('/payments/') && method === 'POST') {
            return { success: true, message: 'Operation completed' };
        }
        
        return { success: false, message: 'API endpoint not implemented' };
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            info: 'blue',
            success: 'green',
            warning: 'yellow',
            error: 'red'
        };
        
        toast.className = `fixed top-4 right-4 bg-${colors[type]}-500 text-white px-4 py-3 rounded-lg shadow-lg z-[1000] fade-in`;
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                 type === 'error' ? 'exclamation-circle' : 
                                 type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mr-3"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('fade-in');
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showWarning(message) {
        this.showToast(message, 'warning');
    }
    
    showInfo(message) {
        this.showToast(message, 'info');
    }
    
    logActivity(action, data = null) {
        const activity = {
            admin_id: this.currentAdmin?.id,
            admin_name: this.currentAdmin?.full_name,
            action,
            data,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1' // In production, get real IP
        };
        
        console.log('[Admin Activity]', activity);
        
        // Store in localStorage for demo
        const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
        activities.unshift(activity);
        if (activities.length > 1000) activities.pop();
        localStorage.setItem('admin_activities', JSON.stringify(activities));
    }
    
    logout() {
        Swal.fire({
            title: 'Confirm Logout',
            text: 'Are you sure you want to logout from the admin panel?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, logout',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                // Clear session
                localStorage.removeItem('admin_session');
                
                // Log logout activity
                this.logActivity('Logged out');
                
                // Redirect to login
                window.location.href = '/admin/login.html';
            }
        });
    }
}

// Initialize admin dashboard
let adminDashboard;

document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
    
    // Make adminDashboard available globally for inline event handlers
    window.adminDashboard = adminDashboard;
    
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.section) {
            adminDashboard.loadSection(event.state.section);
        }
    });
});