/**
 * Admin Login System JavaScript
 * Handles authentication, password reset, and security features
 */

class AdminLoginSystem {
    constructor() {
        this.currentTab = 'login';
        this.failedAttempts = 0;
        this.maxAttempts = 5;
        this.lockDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.checkRememberedUser();
        this.setupSecurityMonitoring();
        this.initializeSessionTimer();
    }
    
    setupEventListeners() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('resetTab').addEventListener('click', () => this.switchTab('reset'));
        
        // Password visibility toggles
        document.getElementById('togglePassword').addEventListener('click', () => this.togglePasswordVisibility('loginPassword'));
        document.getElementById('toggleNewPassword').addEventListener('click', () => this.togglePasswordVisibility('newPassword'));
        
        // Form submissions
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('adminResetForm').addEventListener('submit', (e) => this.handlePasswordReset(e));
        
        // Navigation buttons
        document.getElementById('switchToReset').addEventListener('click', () => this.switchTab('reset'));
        document.getElementById('switchToLogin').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('goToLogin').addEventListener('click', () => this.switchTab('login'));
        
        // Password confirmation validation
        document.getElementById('newPassword').addEventListener('input', () => this.validatePasswordConfirmation());
        document.getElementById('confirmPassword').addEventListener('input', () => this.validatePasswordConfirmation());
        
        // Security question loading
        document.getElementById('resetUsername').addEventListener('blur', () => this.loadSecurityQuestion());
        
        // Session timeout warning
        document.addEventListener('mousemove', () => this.resetSessionTimer());
        document.addEventListener('keydown', () => this.resetSessionTimer());
        
        // Prevent form autofill manipulation
        this.preventAutofillManipulation();
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.getElementById('loginTab').classList.toggle('active', tab === 'login');
        document.getElementById('resetTab').classList.toggle('active', tab === 'reset');
        
        // Show/hide forms
        document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
        document.getElementById('resetForm').classList.toggle('hidden', tab !== 'reset');
        document.getElementById('loginSuccess').classList.add('hidden');
        document.getElementById('resetSuccess').classList.add('hidden');
        
        // Reset forms when switching
        if (tab === 'login') {
            this.resetLoginForm();
            document.getElementById('loginUsername').focus();
        } else {
            this.resetResetForm();
            document.getElementById('resetUsername').focus();
        }
        
        // Log tab switch activity
        this.logActivity(`Switched to ${tab} tab`);
    }
    
    resetLoginForm() {
        document.getElementById('adminLoginForm').reset();
        document.getElementById('twoFactorSection').classList.add('hidden');
        document.getElementById('loginPassword').type = 'password';
        document.getElementById('togglePassword').querySelector('i').className = 'fas fa-eye';
    }
    
    resetResetForm() {
        document.getElementById('adminResetForm').reset();
        document.getElementById('securityQuestionDisplay').textContent = 'Enter username to load security question';
        document.getElementById('securityAnswer').disabled = true;
        document.getElementById('newPassword').disabled = true;
        document.getElementById('confirmPassword').disabled = true;
        document.getElementById('passwordMatch').classList.add('hidden');
        document.getElementById('passwordMismatch').classList.add('hidden');
        document.getElementById('resetSubmit').disabled = true;
    }
    
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const toggleBtn = document.querySelector(`#toggle${inputId === 'loginPassword' ? 'Password' : 'NewPassword'}`);
        const icon = toggleBtn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
        
        // Focus back on input
        input.focus();
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Basic validation
        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }
        
        // Check if account is locked
        if (this.isAccountLocked(username)) {
            this.showError('Account is temporarily locked. Please try again later or reset your password.');
            return;
        }
        
        // Show loading state
        const submitBtn = document.querySelector('#adminLoginForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i>AUTHENTICATING...';
        submitBtn.disabled = true;
        
        try {
            // Simulate API call
            const response = await this.mockLoginApi(username, password);
            
            if (response.success) {
                if (response.requires2FA) {
                    // Show 2FA input
                    this.showTwoFactorAuthentication();
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                } else {
                    this.handleSuccessfulLogin(response);
                }
            } else {
                this.handleFailedLogin(username, response.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            this.showError('Network error. Please check your connection.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async mockLoginApi(username, password) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock validation
        const validCredentials = username === 'admin' && password === 'Admin123!';
        
        if (validCredentials) {
            return {
                success: true,
                requires2FA: Math.random() > 0.5, // 50% chance
                user: {
                    id: 1,
                    username: 'admin',
                    full_name: 'Super Administrator',
                    role: 'super_admin',
                    permissions: ['*']
                },
                session: {
                    token: 'mock_session_token_' + Date.now(),
                    expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
                }
            };
        } else {
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }
    }
    
    showTwoFactorAuthentication() {
        const twoFactorSection = document.getElementById('twoFactorSection');
        twoFactorSection.classList.remove('hidden');
        document.getElementById('twoFactorCode').focus();
        
        // Update form submission to handle 2FA
        const form = document.getElementById('adminLoginForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.handleTwoFactorAuthentication();
        };
    }
    
    async handleTwoFactorAuthentication() {
        const code = document.getElementById('twoFactorCode').value.trim();
        
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            this.showError('Please enter a valid 6-digit code');
            return;
        }
        
        const submitBtn = document.querySelector('#adminLoginForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i>VERIFYING 2FA...';
        submitBtn.disabled = true;
        
        // Simulate 2FA verification
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock 2FA validation (always succeeds for demo)
        if (code === '123456' || true) {
            this.handleSuccessfulLogin({
                success: true,
                user: {
                    id: 1,
                    username: 'admin',
                    full_name: 'Super Administrator',
                    role: 'super_admin',
                    permissions: ['*']
                },
                session: {
                    token: 'mock_session_token_' + Date.now(),
                    expires: Date.now() + 24 * 60 * 60 * 1000
                }
            });
        } else {
            this.showError('Invalid 2FA code');
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-3"></i>ACCESS ADMIN PANEL';
            submitBtn.disabled = false;
        }
    }
    
    handleSuccessfulLogin(response) {
        // Reset failed attempts
        this.failedAttempts = 0;
        
        // Store session data (in production, use secure methods)
        localStorage.setItem('admin_session', JSON.stringify({
            user: response.user,
            session: response.session,
            loginTime: Date.now()
        }));
        
        // Store "remember me" preference
        if (document.getElementById('rememberMe').checked) {
            localStorage.setItem('remembered_admin', response.user.username);
        } else {
            localStorage.removeItem('remembered_admin');
        }
        
        // Log successful login
        this.logActivity('Successful login', response.user.id);
        
        // Show success animation
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('loginSuccess').classList.remove('hidden');
        
        // Animate progress bar
        this.animateProgressBar();
    }
    
    animateProgressBar() {
        let progress = 0;
        const progressBar = document.getElementById('progressBar');
        const interval = setInterval(() => {
            progress += 2;
            progressBar.style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
                // Redirect to admin dashboard
                setTimeout(() => {
                    window.location.href = '/admin/dashboard.html';
                }, 500);
            }
        }, 50);
    }
    
    handleFailedLogin(username, message) {
        this.failedAttempts++;
        
        if (this.failedAttempts >= this.maxAttempts) {
            this.lockAccount(username);
            this.showError(`Account locked due to ${this.maxAttempts} failed attempts. Please try again in 15 minutes or reset your password.`);
        } else {
            this.showError(`${message} (Attempt ${this.failedAttempts}/${this.maxAttempts})`);
        }
        
        // Log failed attempt
        this.logActivity(`Failed login attempt for username: ${username}`);
        
        // Shake form for visual feedback
        this.shakeElement(document.getElementById('adminLoginForm'));
    }
    
    isAccountLocked(username) {
        const lockData = localStorage.getItem(`lock_${username}`);
        if (lockData) {
            const { lockedUntil } = JSON.parse(lockData);
            if (Date.now() < lockedUntil) {
                return true;
            } else {
                localStorage.removeItem(`lock_${username}`);
            }
        }
        return false;
    }
    
    lockAccount(username) {
        const lockedUntil = Date.now() + this.lockDuration;
        localStorage.setItem(`lock_${username}`, JSON.stringify({
            lockedUntil,
            lockedAt: Date.now()
        }));
        
        // Log account lock
        this.logActivity(`Account locked for username: ${username}`);
    }
    
    async loadSecurityQuestion() {
        const username = document.getElementById('resetUsername').value.trim();
        
        if (!username) {
            return;
        }
        
        // Show loading
        const questionDisplay = document.getElementById('securityQuestionDisplay');
        const originalText = questionDisplay.textContent;
        questionDisplay.textContent = 'Loading security question...';
        questionDisplay.classList.add('italic', 'text-gray-500');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock security question (in production, fetch from backend)
        const mockQuestions = {
            'admin': "What is your mother's maiden name?",
            'superadmin': "What city were you born in?",
            'moderator': "What was the name of your first pet?",
            'support': "What is your favorite book?",
            'finance': "What was your childhood nickname?"
        };
        
        const question = mockQuestions[username.toLowerCase()] || 
                        "What is your security answer?";
        
        questionDisplay.textContent = question;
        questionDisplay.classList.remove('text-gray-500');
        
        // Enable answer input
        document.getElementById('securityAnswer').disabled = false;
        document.getElementById('newPassword').disabled = false;
        document.getElementById('confirmPassword').disabled = false;
        document.getElementById('resetSubmit').disabled = true;
        
        // Focus on security answer
        document.getElementById('securityAnswer').focus();
        
        // Log security question request
        this.logActivity(`Requested security question for username: ${username}`);
    }
    
    validatePasswordConfirmation() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const passwordMatch = document.getElementById('passwordMatch');
        const passwordMismatch = document.getElementById('passwordMismatch');
        const resetSubmit = document.getElementById('resetSubmit');
        
        if (!newPassword || !confirmPassword) {
            passwordMatch.classList.add('hidden');
            passwordMismatch.classList.add('hidden');
            resetSubmit.disabled = true;
            return;
        }
        
        if (newPassword === confirmPassword) {
            passwordMatch.classList.remove('hidden');
            passwordMismatch.classList.add('hidden');
            
            // Validate password strength
            const isStrong = this.validatePasswordStrength(newPassword);
            resetSubmit.disabled = !isStrong;
        } else {
            passwordMatch.classList.add('hidden');
            passwordMismatch.classList.remove('hidden');
            resetSubmit.disabled = true;
        }
    }
    
    validatePasswordStrength(password) {
        // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    }
    
    async handlePasswordReset(event) {
        event.preventDefault();
        
        const username = document.getElementById('resetUsername').value.trim();
        const securityAnswer = document.getElementById('securityAnswer').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        
        // Validation
        if (!username || !securityAnswer || !newPassword) {
            this.showError('Please fill all required fields');
            return;
        }
        
        if (!this.validatePasswordStrength(newPassword)) {
            this.showError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            return;
        }
        
        // Show loading
        const submitBtn = document.querySelector('#adminResetForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i>RESETTING...';
        submitBtn.disabled = true;
        
        try {
            // Simulate API call
            const response = await this.mockResetPasswordApi(username, securityAnswer, newPassword);
            
            if (response.success) {
                this.handleSuccessfulPasswordReset();
            } else {
                this.showError(response.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async mockResetPasswordApi(username, securityAnswer, newPassword) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock validation (always succeeds for demo)
        const isValid = username && securityAnswer && newPassword;
        
        return {
            success: isValid,
            message: isValid ? 'Password reset successful' : 'Invalid security answer',
            timestamp: Date.now()
        };
    }
    
    handleSuccessfulPasswordReset() {
        // Show success
        document.getElementById('resetForm').classList.add('hidden');
        document.getElementById('resetSuccess').classList.remove('hidden');
        
        // Log password reset
        this.logActivity('Password reset successful');
        
        // Clear any account locks
        const username = document.getElementById('resetUsername').value.trim();
        localStorage.removeItem(`lock_${username}`);
        
        // Reset failed attempts
        this.failedAttempts = 0;
    }
    
    checkRememberedUser() {
        const rememberedAdmin = localStorage.getItem('remembered_admin');
        if (rememberedAdmin) {
            document.getElementById('loginUsername').value = rememberedAdmin;
            document.getElementById('rememberMe').checked = true;
            document.getElementById('loginPassword').focus();
        }
    }
    
    setupSecurityMonitoring() {
        // Monitor for suspicious activity
        document.addEventListener('copy', (e) => {
            if (e.target.type === 'password') {
                this.logActivity('Attempted to copy password field');
            }
        });
        
        document.addEventListener('contextmenu', (e) => {
            if (e.target.type === 'password') {
                e.preventDefault();
                this.logActivity('Right-click on password field prevented');
            }
        });
        
        // Detect browser extensions that might interfere
        this.detectBrowserExtensions();
    }
    
    detectBrowserExtensions() {
        // Check for common password manager extensions
        setTimeout(() => {
            const hasPasswordManager = 
                typeof window.__LASTPASS__ !== 'undefined' ||
                typeof window.__1PASSWORD__ !== 'undefined' ||
                document.querySelector('input[name="lastpass-disable-search"]');
            
            if (hasPasswordManager) {
                this.logActivity('Password manager extension detected');
            }
        }, 1000);
    }
    
    initializeSessionTimer() {
        this.sessionTimer = setTimeout(() => {
            this.showSessionTimeoutWarning();
        }, 10 * 60 * 1000); // 10 minutes
    }
    
    resetSessionTimer() {
        clearTimeout(this.sessionTimer);
        this.initializeSessionTimer();
    }
    
    showSessionTimeoutWarning() {
        if (this.currentTab === 'login' && !document.getElementById('loginSuccess').classList.contains('hidden')) {
            return; // Don't show warning during login redirect
        }
        
        Swal.fire({
            icon: 'warning',
            title: 'Session Timeout Warning',
            text: 'Your session will expire in 1 minute due to inactivity.',
            timer: 60000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'Stay Logged In',
            showCancelButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                this.resetSessionTimer();
            }
        });
    }
    
    preventAutofillManipulation() {
        // Add hidden fields to prevent autofill
        const loginForm = document.getElementById('adminLoginForm');
        const fakeUsername = document.createElement('input');
        fakeUsername.type = 'text';
        fakeUsername.style.display = 'none';
        fakeUsername.name = 'fake_username';
        loginForm.appendChild(fakeUsername);
        
        const fakePassword = document.createElement('input');
        fakePassword.type = 'password';
        fakePassword.style.display = 'none';
        fakePassword.name = 'fake_password';
        loginForm.appendChild(fakePassword);
    }
    
    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }
    
    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }
    
    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }
    
    logActivity(action, adminId = null) {
        const timestamp = new Date().toISOString();
        const activity = {
            timestamp,
            action,
            adminId,
            ip: '127.0.0.1', // In production, get real IP
            userAgent: navigator.userAgent,
            currentTab: this.currentTab
        };
        
        // Store in localStorage for demo (in production, send to server)
        const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
        activities.unshift(activity);
        if (activities.length > 100) activities.pop(); // Keep only last 100
        localStorage.setItem('admin_activities', JSON.stringify(activities));
        
        console.log(`[Admin Activity] ${timestamp}: ${action}`);
    }
    
    // Utility function to check if running in iframe (potential clickjacking)
    isInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }
    
    // Add shake animation style
    addShakeAnimation() {
        if (!document.getElementById('shake-animation-style')) {
            const style = document.createElement('style');
            style.id = 'shake-animation-style';
            style.textContent = `
                .shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                
                @keyframes shake {
                    10%, 90% { transform: translateX(-1px); }
                    20%, 80% { transform: translateX(2px); }
                    30%, 50%, 70% { transform: translateX(-4px); }
                    40%, 60% { transform: translateX(4px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const adminLoginSystem = new AdminLoginSystem();
    adminLoginSystem.addShakeAnimation();
    
    // Prevent clickjacking
    if (adminLoginSystem.isInIframe()) {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: white;">
                <h1 style="color: #ef4444;">Security Warning</h1>
                <p>This page cannot be loaded in an iframe for security reasons.</p>
                <p>Please access the admin panel directly.</p>
            </div>
        `;
    }
    
    // Add CSS for shake animation
    const shakeStyle = document.createElement('style');
    shakeStyle.textContent = `
        .shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        @keyframes shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
        }
    `;
    document.head.appendChild(shakeStyle);
});