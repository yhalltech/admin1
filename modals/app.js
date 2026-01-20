import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyARficcDI3R1ELfjkQxL-kkFQr-tzOgzgo",
    authDomain: "k-vibez.firebaseapp.com",
    projectId: "k-vibez",
    storageBucket: "k-vibez.firebasestorage.app",
    messagingSenderId: "1060235903242",
    appId: "1:1060235903242:web:4649b48406879fb7fcfaf3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
window.allPayments = [];
let adminData = null;
const { jsPDF } = window.jspdf;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        adminData = JSON.parse(localStorage.getItem('kalenjin_admin') || sessionStorage.getItem('kalenjin_admin'));
        
        if (adminData) {
            document.getElementById('adminName').textContent = adminData.name || 'Administrator';
            document.getElementById('adminEmail').textContent = adminData.email;
            
            await loadPaymentsFromFirestore();
            document.getElementById('loadingOverlay').style.display = 'none';
            
            initializeDashboard();
            setupEventListeners();
            updateDateTime();
            setInterval(updateDateTime, 60000);
        } else {
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Load payments from Firebase
async function loadPaymentsFromFirestore() {
    try {
        console.log('Loading payments from Firestore...');
        
        const paymentsQuery = query(
            collection(db, "payments"),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(paymentsQuery);
        window.allPayments = [];
        
        querySnapshot.forEach((docSnap) => {
            const paymentData = docSnap.data();
            window.allPayments.push({
                id: docSnap.id,
                ...paymentData,
                date: paymentData.createdAt?.toDate() || new Date(),
                amount: parseFloat(paymentData.amount) || 0,
                ticketType: paymentData.ticketType || determineTicketType(paymentData.amount)
            });
        });
        
        console.log(`Loaded ${window.allPayments.length} payments`);
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
    } catch (error) {
        console.error('Error loading payments:', error);
        showError('Failed to load payment data');
        window.allPayments = [];
        updateDashboardStats();
        loadRecentActivity();
    }
}

// Determine ticket type
function determineTicketType(amount) {
    const amt = parseFloat(amount);
    if (amt === 350) return "Early Bird Ticket";
    if (amt === 650) return "Early Bird Couples";
    if (amt === 700) return "Couples Ticket";
    if (amt === 400) return "Regular Ticket";
    return "Unknown";
}

// Get ticket type class
window.getTicketTypeClass = function(ticketType) {
    switch(ticketType) {
        case 'Early Bird Ticket': return 'early-bird-badge';
        case 'Early Bird Couples': return 'early-bird-couples-badge';
        case 'Couples Ticket': return 'couples-badge';
        case 'Regular Ticket': return 'regular-badge';
        default: return '';
    }
}

// Update dashboard stats
function updateDashboardStats() {
    const total = window.allPayments.reduce((sum, p) => sum + p.amount, 0);
    const pending = window.allPayments.filter(p => p.status === 'pending').length;
    const today = new Date().toDateString();
    const verifiedToday = window.allPayments.filter(p => 
        p.status === 'verified' && new Date(p.date).toDateString() === today
    ).length;
    const allVerified = window.allPayments.filter(p => p.status === 'verified').length;
    
    const earlyBirdCount = window.allPayments.filter(p => p.status === 'verified' && p.ticketType === 'Early Bird Ticket').length;
    const earlyBirdCouplesCount = window.allPayments.filter(p => p.status === 'verified' && p.ticketType === 'Early Bird Couples').length;
    const couplesCount = window.allPayments.filter(p => p.status === 'verified' && p.ticketType === 'Couples Ticket').length;
    const regularCount = window.allPayments.filter(p => p.status === 'verified' && p.ticketType === 'Regular Ticket').length;

    const totalRevenueEl = document.getElementById('totalRevenue');
    const pendingCountEl = document.getElementById('pendingCount');
    const verifiedTodayEl = document.getElementById('verifiedToday');
    const allVerifiedCountEl = document.getElementById('allVerifiedCount');
    const earlyBirdCountEl = document.getElementById('earlyBirdCount');
    const earlyBirdCouplesCountEl = document.getElementById('earlyBirdCouplesCount');
    const couplesCountEl = document.getElementById('couplesCount');
    const regularCountEl = document.getElementById('regularCount');

    if (totalRevenueEl) totalRevenueEl.textContent = `KES ${total.toLocaleString()}`;
    if (pendingCountEl) pendingCountEl.textContent = pending;
    if (verifiedTodayEl) verifiedTodayEl.textContent = verifiedToday;
    if (allVerifiedCountEl) allVerifiedCountEl.textContent = allVerified;
    if (earlyBirdCountEl) earlyBirdCountEl.textContent = earlyBirdCount;
    if (earlyBirdCouplesCountEl) earlyBirdCouplesCountEl.textContent = earlyBirdCouplesCount;
    if (couplesCountEl) couplesCountEl.textContent = couplesCount;
    if (regularCountEl) regularCountEl.textContent = regularCount;
}

// Verify payment
window.verifyPayment = async function(id) {
    try {
        const paymentRef = doc(db, "payments", id);
        await updateDoc(paymentRef, {
            status: 'verified',
            verifiedDate: serverTimestamp(),
            verifiedBy: adminData.email
        });
        
        const paymentIndex = window.allPayments.findIndex(p => p.id === id);
        if (paymentIndex !== -1) {
            window.allPayments[paymentIndex].status = 'verified';
            window.allPayments[paymentIndex].verifiedDate = new Date();
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        showSuccess('Payment verified successfully!');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('pendingModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        showError('Failed to verify payment');
    }
}

// Reject payment
window.rejectPayment = async function(id) {
    try {
        const paymentRef = doc(db, "payments", id);
        await updateDoc(paymentRef, {
            status: 'rejected',
            rejectedDate: serverTimestamp(),
            rejectedBy: adminData.email
        });
        
        const paymentIndex = window.allPayments.findIndex(p => p.id === id);
        if (paymentIndex !== -1) {
            window.allPayments[paymentIndex].status = 'rejected';
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        showSuccess('Payment rejected');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('pendingModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('Error rejecting payment:', error);
        showError('Failed to reject payment');
    }
}

// Save cash payment
window.saveCashPayment = async function() {
    const name = document.getElementById('cashCustomerName').value.trim();
    const phone = document.getElementById('cashPhoneNumber').value.trim();
    const email = document.getElementById('cashEmail').value.trim();
    const amount = parseFloat(document.getElementById('cashAmount').value);
    const ticketType = document.getElementById('cashTicketType').value;
    
    if (!name || !phone || !email || !amount || !ticketType) {
        alert('Please fill all fields');
        return;
    }
    
    const transactionCode = 'CASH' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    try {
        const docRef = await addDoc(collection(db, "payments"), {
            fullName: name,
            phoneNumber: phone,
            email: email,
            amount: amount,
            paymentMethod: 'CASH',
            transactionReference: transactionCode,
            ticketType: ticketType,
            status: 'verified',
            bookingType: 'cash',
            createdAt: serverTimestamp(),
            verifiedDate: serverTimestamp(),
            verifiedBy: adminData.email
        });
        
        const newPayment = {
            id: docRef.id,
            fullName: name,
            phoneNumber: phone,
            email: email,
            amount: amount,
            paymentMethod: 'CASH',
            transactionReference: transactionCode,
            ticketType: ticketType,
            status: 'verified',
            date: new Date(),
            verifiedDate: new Date()
        };
        
        window.allPayments.unshift(newPayment);
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
        showSuccess('Cash payment added successfully!');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCashPaymentModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('Error saving cash payment:', error);
        showError('Failed to save cash payment');
    }
}

// Generate PDF
window.generateVerifiedPDF = function() {
    const verifiedPayments = window.allPayments
        .filter(p => p.status === 'verified')
        .sort((a, b) => (a.fullName || a.customerName || '').localeCompare(b.fullName || b.customerName || ''));
    
    if (verifiedPayments.length === 0) {
        alert('No verified payments available');
        return;
    }
    
    const pdf = new jsPDF();
    
    pdf.setFontSize(20);
    pdf.text('Kalenjin Vibes Festival - Verified Attendees', 20, 20);
    
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    pdf.text(`Total Verified: ${verifiedPayments.length}`, 20, 40);
    
    const totalAmount = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
    pdf.text(`Total Revenue: KES ${totalAmount.toLocaleString()}`, 20, 50);
    
    let yPos = 70;
    pdf.setFontSize(14);
    pdf.text('Ticket Type Summary:', 20, yPos);
    yPos += 10;
    
    const ticketTypes = {};
    verifiedPayments.forEach(p => {
        ticketTypes[p.ticketType] = (ticketTypes[p.ticketType] || 0) + 1;
    });
    
    pdf.setFontSize(11);
    for (const [type, count] of Object.entries(ticketTypes)) {
        pdf.text(`${type}: ${count}`, 25, yPos);
        yPos += 7;
    }
    
    yPos += 10;
    
    const headers = [['No.', 'Name', 'Email', 'Phone', 'Ticket Type', 'Amount', 'Transaction', 'Date']];
    
    const tableData = verifiedPayments.map((payment, index) => [
        (index + 1).toString(),
        payment.fullName || payment.customerName || 'Customer',
        payment.email || 'No email',
        payment.phoneNumber || payment.phone || 'N/A',
        payment.ticketType || 'Unknown',
        `KES ${payment.amount.toLocaleString()}`,
        payment.transactionReference || payment.transactionCode || 'N/A',
        new Date(payment.date).toLocaleDateString()
    ]);
    
    pdf.autoTable({
        startY: yPos,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 20 },
            6: { cellWidth: 25 },
            7: { cellWidth: 20 }
        },
        margin: { left: 10, right: 10 }
    });
    
    pdf.save(`Kalenjin_Verified_Attendees_${new Date().toISOString().split('T')[0]}.pdf`);
    showSuccess('PDF generated successfully!');
}

// Show success
function showSuccess(message) {
    const successMessageEl = document.getElementById('successMessage');
    if (successMessageEl) {
        successMessageEl.textContent = message;
        const successModal = document.getElementById('successModal');
        if (successModal) {
            new bootstrap.Modal(successModal).show();
        }
    }
}

// Show error
function showError(message) {
    alert(message);
}

// Logout
window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            localStorage.removeItem('kalenjin_admin');
            sessionStorage.removeItem('kalenjin_admin');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            showError('Failed to logout');
        }
    }
}

// Refresh data
window.refreshData = async function() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    await loadPaymentsFromFirestore();
    document.getElementById('loadingOverlay').style.display = 'none';
    showSuccess('Data refreshed successfully!');
}

// Update date time
function updateDateTime() {
    const now = new Date();
    const dateTimeEl = document.getElementById('currentDateTime');
    if (dateTimeEl) {
        dateTimeEl.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
}

// Show section
window.showSection = function(sectionId) {
    const dashboardContainer = document.getElementById('dashboardContainer');
    const verificationContainer = document.getElementById('verificationContainer');
    const paymentsContainer = document.getElementById('paymentsContainer');
    
    if (dashboardContainer) dashboardContainer.style.display = 'none';
    if (verificationContainer) verificationContainer.style.display = 'none';
    if (paymentsContainer) paymentsContainer.style.display = 'none';
    
    if (sectionId === 'dashboard' && dashboardContainer) {
        dashboardContainer.style.display = 'block';
    } else if (sectionId === 'verification' && verificationContainer) {
        verificationContainer.style.display = 'block';
    } else if (sectionId === 'payments' && paymentsContainer) {
        paymentsContainer.style.display = 'block';
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event?.target) {
        event.target.classList.add('active');
    }
    
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
    }
}

// Toggle quick actions
window.toggleQuickActions = function() {
    const menu = document.getElementById('quickActionsMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Open QR Scanner
window.openQrScanner = function() {
    const modal = document.getElementById('qrScannerModal');
    if (modal) {
        new bootstrap.Modal(modal).show();
        
        setTimeout(() => {
            if (window.html5QrCode) {
                window.html5QrCode.clear();
            }
            
            window.html5QrCode = new Html5Qrcode("qr-reader");
            
            window.html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                window.onQRScanSuccess,
                () => {}
            ).catch(err => console.error("Scanner error:", err));
        }, 500);
    }
}

// QR Scan Success Handler
window.onQRScanSuccess = function(decodedText) {
    try {
        const qrData = JSON.parse(decodedText);
        const payment = window.allPayments.find(p => 
            p.id === qrData.id || 
            p.transactionReference === qrData.transactionCode || 
            p.transactionCode === qrData.transactionCode
        );
        
        if (payment && payment.status === 'verified') {
            payment.attended = true;
            window.showQRResult('success', `✅ Valid Ticket!<br><br>
                Customer: ${payment.fullName || payment.customerName}<br>
                Email: ${payment.email || 'No email'}<br>
                Amount: KES ${payment.amount.toLocaleString()}<br>
                Ticket Type: ${payment.ticketType}<br>
                Status: VERIFIED<br>
                Time: ${new Date().toLocaleTimeString()}`);
        } else {
            window.showQRResult('error', 'Invalid or unverified ticket');
        }
    } catch (e) {
        window.showQRResult('error', 'Invalid QR code format');
    }
    
    if (window.html5QrCode) {
        window.html5QrCode.stop();
    }
}

// Show QR Result
window.showQRResult = function(type, message) {
    const resultDiv = document.getElementById('qrScanResult');
    if (resultDiv) {
        const alertClass = type === 'success' ? 'success' : 'danger';
        resultDiv.innerHTML = `<div class="alert alert-${alertClass}">${message}</div>`;
    }
}

// Open Manual Verification
window.openManualVerification = function() {
    const resultDiv = document.getElementById('manualVerificationResult');
    const codeInput = document.getElementById('manualTransactionCode');
    if (resultDiv) resultDiv.innerHTML = '';
    if (codeInput) codeInput.value = '';
    
    const modal = document.getElementById('manualVerificationModal');
    if (modal) {
        new bootstrap.Modal(modal).show();
    }
}

// Manual Verify Payment
window.manualVerifyPayment = function() {
    const codeInput = document.getElementById('manualTransactionCode');
    if (!codeInput) return;
    
    const code = codeInput.value.trim().toUpperCase();
    const resultDiv = document.getElementById('manualVerificationResult');
    
    if (!resultDiv) return;
    
    if (!code) {
        resultDiv.innerHTML = `<div class="alert alert-warning">Please enter a transaction code</div>`;
        return;
    }
    
    const payment = window.allPayments.find(p => 
        p.transactionReference === code || p.transactionCode === code
    );
    
    if (payment) {
        if (payment.status === 'verified') {
            resultDiv.innerHTML = `<div class="alert alert-success">
                <i class="bi bi-check-circle-fill"></i> Already Verified<br><br>
                <strong>Customer:</strong> ${payment.fullName || payment.customerName}<br>
                <strong>Email:</strong> ${payment.email || 'No email'}<br>
                <strong>Amount:</strong> KES ${payment.amount.toLocaleString()}<br>
                <strong>Ticket Type:</strong> ${payment.ticketType}<br>
                <strong>Status:</strong> <span class="badge bg-success">VERIFIED</span>
            </div>`;
        } else if (payment.status === 'pending') {
            resultDiv.innerHTML = `<div class="alert alert-warning">
                <strong>Customer:</strong> ${payment.fullName || payment.customerName}<br>
                <strong>Amount:</strong> KES ${payment.amount.toLocaleString()}<br>
                <button class="btn btn-sm btn-success mt-2" onclick="verifyPayment('${payment.id}')">
                    <i class="bi bi-check"></i> Verify Now
                </button>
            </div>`;
        }
    } else {
        resultDiv.innerHTML = `<div class="alert alert-danger">Transaction not found: ${code}</div>`;
    }
}

// Open Add Cash Payment
window.openAddManualPayment = function() {
    const fields = ['cashCustomerName', 'cashPhoneNumber', 'cashEmail', 'cashAmount', 'cashTicketType'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    const modal = document.getElementById('addCashPaymentModal');
    if (modal) {
        new bootstrap.Modal(modal).show();
    }
}

// Show Pending Modal
window.showPendingModal = function() {
    const pending = window.allPayments ? window.allPayments.filter(p => p.status === 'pending') : [];
    let html = '';
    
    if (pending.length === 0) {
        html = '<div class="text-center py-5"><i class="bi bi-check-circle fs-1 text-success"></i><p class="text-light mt-3">No pending payments</p></div>';
    } else {
        pending.forEach(p => {
            const ticketTypeClass = window.getTicketTypeClass(p.ticketType);
            
            html += `
                <div class="payment-card pending">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="text-light">${p.fullName || p.customerName || 'Customer'}</h6>
                            <p class="text-muted mb-1">${p.transactionReference || p.transactionCode || 'N/A'}</p>
                            <p class="text-light mb-1">KES ${p.amount.toLocaleString()} <span class="ticket-type-badge ${ticketTypeClass}">${p.ticketType}</span></p>
                            <small class="text-muted">${p.phoneNumber || p.phone || 'N/A'} • ${p.email || 'No email'}</small>
                        </div>
                        <div class="d-flex flex-column gap-2">
                            <button class="btn btn-sm btn-success" onclick="verifyPayment('${p.id}')">
                                <i class="bi bi-check me-1"></i> Verify
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectPayment('${p.id}')">
                                <i class="bi bi-x me-1"></i> Reject
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    const contentDiv = document.getElementById('pendingModalContent');
    if (contentDiv) {
        contentDiv.innerHTML = html;
    }
    
    const modal = document.getElementById('pendingModal');
    if (modal) {
        new bootstrap.Modal(modal).show();
    }
}

// Verify from message
window.verifyFromMessage = function() {
    const messageInput = document.getElementById('mpesaMessage');
    if (!messageInput) return;
    
    const message = messageInput.value;
    const code = extractTransactionCode(message);
    
    const resultDiv = document.getElementById('verificationResult');
    if (!resultDiv) return;
    
    if (code) {
        const payment = window.allPayments.find(p => 
            p.transactionReference === code || p.transactionCode === code
        );
        if (payment) {
            window.verifyPayment(payment.id);
            resultDiv.innerHTML = `<div class="alert alert-success">Payment found: ${payment.fullName || payment.customerName}. Verifying...</div>`;
        } else {
            resultDiv.innerHTML = `<div class="alert alert-warning">Transaction not found. Code: ${code}</div>`;
        }
    } else {
        resultDiv.innerHTML = `<div class="alert alert-danger">No transaction code found in message</div>`;
    }
}

// Extract transaction code
function extractTransactionCode(text) {
    const patterns = [
        /confirmation\s+code\s+is?\s*([A-Z0-9]{10})/i,
        /transaction\s+code\s+is?\s*([A-Z0-9]{10})/i,
        /([A-Z0-9]{10})\s+(has\s+been|completed)/i,
        /(M-PESA|MPESA)\s+([A-Z0-9]{10})/i,
        /([A-Z0-9]{10})/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            for (let i = 1; i < match.length; i++) {
                if (match[i] && /^[A-Z0-9]{10}$/i.test(match[i])) {
                    return match[i].toUpperCase();
                }
            }
        }
    }
    return null;
}

// Filter payments
window.filterPayments = function() {
    const searchInput = document.getElementById('paymentSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll('#paymentsTable tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Setup event listeners
function setupEventListeners() {
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        const menu = document.getElementById('quickActionsMenu');
        const fab = document.querySelector('.floating-action-btn');
        
        if (window.innerWidth < 768 && sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && toggle && !toggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
        
        if (menu && menu.style.display === 'block' && 
            !menu.contains(e.target) && fab && !fab.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
}

// Initialize dashboard
function initializeDashboard() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
            }
        });
    }
}

console.log('✅ Enhanced Admin Dashboard Loaded');
