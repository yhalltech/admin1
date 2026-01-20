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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
window.allPayments = [];
window.verificationRecords = [];
let adminData = null;
let html5QrCode = null;
let selectedPayment = null;

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (user) {
        adminData = JSON.parse(localStorage.getItem('kalenjin_admin') || sessionStorage.getItem('kalenjin_admin') || 'null');
        
        if (adminData) {
            document.getElementById('adminName').textContent = adminData.name || 'Administrator';
            document.getElementById('adminEmail').textContent = adminData.email;
            
            await loadPaymentsFromFirestore();
            await loadVerificationRecords();
            document.getElementById('loadingOverlay').style.display = 'none';
            
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

// Load payments from Firestore
async function loadPaymentsFromFirestore() {
    try {
        const paymentsQuery = db.collection("payments").orderBy("createdAt", "desc");
        const querySnapshot = await paymentsQuery.get();
        window.allPayments = [];
        
        querySnapshot.forEach((docSnap) => {
            const paymentData = docSnap.data();
            window.allPayments.push({
                id: docSnap.id,
                ...paymentData,
                date: paymentData.createdAt?.toDate() || new Date(),
                amount: parseFloat(paymentData.amount) || 0,
                numberOfTickets: parseInt(paymentData.numberOfTickets) || 1,
                ticketsUsed: parseInt(paymentData.ticketsUsed) || 0,
                ticketsRemaining: parseInt(paymentData.ticketsRemaining) || (parseInt(paymentData.numberOfTickets) || 1),
                ticketType: paymentData.ticketType || determineTicketType(paymentData.amount)
            });
        });
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
    } catch (error) {
        console.error('Error loading payments:', error);
        alert('Failed to load payment data: ' + error.message);
    }
}

// Load verification records
async function loadVerificationRecords() {
    try {
        const verificationsQuery = db.collection("verifications").orderBy("scannedAt", "desc");
        const querySnapshot = await verificationsQuery.get();
        window.verificationRecords = [];
        
        querySnapshot.forEach((docSnap) => {
            window.verificationRecords.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
    } catch (error) {
        console.error('Error loading verifications:', error);
    }
}

// Determine ticket type from amount
function determineTicketType(amount) {
    const amt = parseFloat(amount);
    if (amt === 350) return "Early Bird Ticket";
    if (amt === 650) return "Early Bird Couples";
    if (amt === 700) return "Couples Ticket";
    if (amt === 400) return "Regular Ticket";
    return "Unknown";
}

// Get ticket type CSS class
window.getTicketTypeClass = function(ticketType) {
    switch(ticketType) {
        case 'Early Bird Ticket': return 'early-bird-badge';
        case 'Early Bird Couples': return 'early-bird-couples-badge';
        case 'Couples Ticket': return 'couples-badge';
        case 'Regular Ticket': return 'regular-badge';
        default: return '';
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    const verified = window.allPayments.filter(p => p.status === 'verified');
    const total = verified.reduce((sum, p) => sum + p.amount, 0);
    const pending = window.allPayments.filter(p => p.status === 'pending').length;
    const today = new Date().toDateString();
    const verifiedToday = verified.filter(p => 
        new Date(p.date).toDateString() === today
    ).length;
    const allVerified = verified.length;
    
    const earlyBirdCount = verified.filter(p => p.ticketType === 'Early Bird Ticket')
        .reduce((sum, p) => sum + (p.numberOfTickets || 1), 0);
    const earlyBirdCouplesCount = verified.filter(p => p.ticketType === 'Early Bird Couples')
        .reduce((sum, p) => sum + (p.numberOfTickets || 1), 0);
    const couplesCount = verified.filter(p => p.ticketType === 'Couples Ticket')
        .reduce((sum, p) => sum + (p.numberOfTickets || 1), 0);
    const regularCount = verified.filter(p => p.ticketType === 'Regular Ticket')
        .reduce((sum, p) => sum + (p.numberOfTickets || 1), 0);

    document.getElementById('totalRevenue').textContent = `KES ${total.toLocaleString()}`;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('verifiedToday').textContent = verifiedToday;
    document.getElementById('allVerifiedCount').textContent = allVerified;
    document.getElementById('earlyBirdCount').textContent = earlyBirdCount;
    document.getElementById('earlyBirdCouplesCount').textContent = earlyBirdCouplesCount;
    document.getElementById('couplesCount').textContent = couplesCount;
    document.getElementById('regularCount').textContent = regularCount;
}

// Load recent activity WITH QUANTITY
window.loadRecentActivity = function() {
    const recent = [...window.allPayments].slice(0, 5);
    let html = '';
    
    if (recent.length === 0) {
        html = '<div class="text-center py-3"><p class="text-muted">No recent activity</p></div>';
    } else {
        recent.forEach(payment => {
            const icon = payment.status === 'verified' ? 'check-circle text-success' :
                        payment.status === 'pending' ? 'clock-history text-warning' :
                        payment.status === 'rejected' ? 'x-circle text-danger' : 'circle text-info';
            
            const ticketTypeClass = window.getTicketTypeClass(payment.ticketType);
            const ticketsCount = payment.numberOfTickets || 1;
            const ticketsUsed = payment.ticketsUsed || 0;
            const ticketsRemaining = payment.ticketsRemaining || ticketsCount;
            
            // Add ticket status badge if verified
            let ticketStatusBadge = '';
            if (payment.status === 'verified') {
                ticketStatusBadge = `<span class="badge bg-info ms-2">${ticketsUsed}/${ticketsCount} used</span>`;
            }
            
            html += `
                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3 mb-3">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${icon} fs-4 me-3"></i>
                        <div>
                            <h6 class="mb-0 text-white">${payment.fullName || payment.customerName || 'Customer'}</h6>
                            <div class="d-flex align-items-center gap-2 mt-1">
                                <small class="text-light">${payment.paymentMethod || 'Unknown'}</small>
                                <span class="ticket-type-badge ${ticketTypeClass}">${payment.ticketType} ×${ticketsCount}</span>
                                ${ticketStatusBadge}
                            </div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="text-white fw-bold">KES ${payment.amount.toLocaleString()}</div>
                        <small class="text-light">${new Date(payment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('recentActivity').innerHTML = html;
}

// Load payments table WITH QUANTITY COLUMN
window.loadPaymentsTable = function() {
    const tableBody = document.getElementById('paymentsTable');
    let html = '';
    
    if (window.allPayments.length === 0) {
        html = '<tr><td colspan="9" class="text-center py-5"><p class="text-light">No payments found</p></td></tr>';
    } else {
        window.allPayments.forEach(p => {
            const statusBadge = p.status === 'verified' ? 'badge-verified' :
                               p.status === 'pending' ? 'badge-pending' :
                               p.status === 'rejected' ? 'badge-rejected' : '';
            
            const ticketTypeClass = window.getTicketTypeClass(p.ticketType);
            const ticketsCount = p.numberOfTickets || 1;
            const ticketsUsed = p.ticketsUsed || 0;
            const ticketsRemaining = p.ticketsRemaining || ticketsCount;
            
            // Add used/remaining info for verified tickets
            let ticketInfo = `×${ticketsCount}`;
            if (p.status === 'verified' && ticketsUsed > 0) {
                ticketInfo = `<span class="text-success">${ticketsUsed}/${ticketsCount}</span> used`;
            }
            
            html += `
                <tr class="payment-row" data-payment-id="${p.id}" onclick="openPaymentModal('${p.id}')">
                    <td>
                        <strong class="text-white">${p.transactionReference || p.transactionCode || 'N/A'}</strong><br>
                        <small class="text-light">${p.paymentMethod || 'N/A'}</small>
                    </td>
                    <td>
                        <span class="text-white">${p.fullName || p.customerName || 'Customer'}</span><br>
                        <small class="text-light">${p.phoneNumber || p.phone || 'N/A'}</small>
                    </td>
                    <td class="text-light">${p.email || 'No email'}</td>
                    <td class="text-white fw-bold">KES ${p.amount.toLocaleString()}</td>
                    <td><span class="ticket-type-badge ${ticketTypeClass}">${p.ticketType}</span></td>
                    <td class="text-center text-white">${ticketInfo}</td>
                    <td><span class="status-badge ${statusBadge}">${p.status}</span></td>
                    <td class="text-light">${new Date(p.date).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openPaymentModal('${p.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    tableBody.innerHTML = html;
}

// Open payment details modal
window.openPaymentModal = async function(paymentId) {
    selectedPayment = window.allPayments.find(p => p.id === paymentId);
    if (!selectedPayment) return;
    
    const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
    const modalContent = document.getElementById('paymentDetailsContent');
    
    const ticketTypeClass = window.getTicketTypeClass(selectedPayment.ticketType);
    const ticketsCount = selectedPayment.numberOfTickets || 1;
    const ticketsUsed = selectedPayment.ticketsUsed || 0;
    const ticketsRemaining = selectedPayment.ticketsRemaining || ticketsCount;
    
    let actionsHtml = '';
    if (selectedPayment.status === 'pending') {
        actionsHtml = `
            <button class="btn btn-lg btn-success w-100 mb-2" onclick="verifyPayment('${selectedPayment.id}')">
                <i class="bi bi-check-lg me-2"></i>Verify Payment
            </button>
            <button class="btn btn-lg btn-danger w-100 mb-2" onclick="rejectPayment('${selectedPayment.id}')">
                <i class="bi bi-x-lg me-2"></i>Reject Payment
            </button>
        `;
    } else if (selectedPayment.status === 'verified') {
        actionsHtml = `
            <button class="btn btn-lg btn-warning w-100 mb-2" onclick="reverifyTicket('${selectedPayment.id}')">
                <i class="bi bi-arrow-repeat me-2"></i>Reverify/Mark as Used
            </button>
        `;
    }
    
    actionsHtml += `
        <button class="btn btn-lg btn-outline-danger w-100" onclick="deletePayment('${selectedPayment.id}')">
            <i class="bi bi-trash me-2"></i>Delete Payment
        </button>
    `;
    
    modalContent.innerHTML = `
        <div class="payment-details">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="text-light mb-1">Customer</h6>
                    <h5 class="text-white">${selectedPayment.fullName || selectedPayment.customerName || 'Customer'}</h5>
                </div>
                <div class="col-md-6 text-end">
                    <h6 class="text-light mb-1">Status</h6>
                    <span class="status-badge ${selectedPayment.status === 'verified' ? 'badge-verified' : selectedPayment.status === 'pending' ? 'badge-pending' : 'badge-rejected'}">
                        ${selectedPayment.status.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6 class="text-light mb-1">Contact</h6>
                    <p class="text-white mb-1">${selectedPayment.phoneNumber || selectedPayment.phone || 'N/A'}</p>
                    <p class="text-light">${selectedPayment.email || 'No email'}</p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-light mb-1">Transaction</h6>
                    <p class="text-white">${selectedPayment.transactionReference || selectedPayment.transactionCode || 'N/A'}</p>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="text-light mb-1">Ticket Details</h6>
                    <div class="d-flex align-items-center gap-2">
                        <span class="ticket-type-badge ${ticketTypeClass}">${selectedPayment.ticketType}</span>
                        <span class="badge bg-light text-dark">×${ticketsCount}</span>
                    </div>
                    ${selectedPayment.status === 'verified' ? `
                        <div class="mt-2">
                            <small class="text-light">Used: ${ticketsUsed} | Remaining: ${ticketsRemaining}</small>
                        </div>
                    ` : ''}
                </div>
                <div class="col-md-6">
                    <h6 class="text-light mb-1">Amount</h6>
                    <h4 class="text-success">KES ${selectedPayment.amount.toLocaleString()}</h4>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <h6 class="text-light mb-1">Payment Method</h6>
                    <p class="text-white">${selectedPayment.paymentMethod || 'Unknown'}</p>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <h6 class="text-light mb-2">Actions</h6>
                    <div class="d-grid gap-2">
                        ${actionsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.show();
}

// Delete payment
window.deletePayment = async function(paymentId) {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) return;
    
    try {
        await db.collection("payments").doc(paymentId).delete();
        
        // Remove from local array
        const paymentIndex = window.allPayments.findIndex(p => p.id === paymentId);
        if (paymentIndex !== -1) {
            window.allPayments.splice(paymentIndex, 1);
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
        if (modal) modal.hide();
        
        showSuccess('Payment deleted successfully!');
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Failed to delete payment: ' + error.message);
    }
}

// Reverify ticket for event entry
window.reverifyTicket = function(paymentId) {
    const payment = window.allPayments.find(p => p.id === paymentId);
    if (!payment) return;
    
    document.getElementById('reverifyPaymentId').value = paymentId;
    document.getElementById('reverifyTicketCount').textContent = payment.numberOfTickets || 1;
    document.getElementById('reverifyTicketType').textContent = payment.ticketType;
    document.getElementById('ticketsUsedInput').max = payment.numberOfTickets || 1;
    document.getElementById('ticketsUsedInput').value = payment.ticketsUsed || 0;
    
    new bootstrap.Modal(document.getElementById('reverifyModal')).show();
}

// Submit reverification
window.submitReverification = async function() {
    const paymentId = document.getElementById('reverifyPaymentId').value;
    const ticketsUsed = parseInt(document.getElementById('ticketsUsedInput').value);
    const payment = window.allPayments.find(p => p.id === paymentId);
    
    if (!payment) return;
    
    const totalTickets = payment.numberOfTickets || 1;
    if (ticketsUsed > totalTickets) {
        alert(`Cannot mark more than ${totalTickets} tickets as used`);
        return;
    }
    
    try {
        // Update tickets used count
        const ticketsRemaining = totalTickets - ticketsUsed;
        
        await db.collection("payments").doc(paymentId).update({
            ticketsUsed: ticketsUsed,
            ticketsRemaining: ticketsRemaining,
            lastVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        payment.ticketsUsed = ticketsUsed;
        payment.ticketsRemaining = ticketsRemaining;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('reverifyModal'));
        if (modal) modal.hide();
        
        // Refresh data
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
        showSuccess(`${ticketsUsed} ticket(s) marked as used! ${ticketsRemaining} remaining.`);
        loadVerificationRecords();
    } catch (error) {
        console.error('Error in reverification:', error);
        alert('Failed to mark tickets as used: ' + error.message);
    }
}

// Verify payment
window.verifyPayment = async function(id) {
    try {
        const payment = window.allPayments.find(p => p.id === id);
        const numberOfTickets = payment?.numberOfTickets || 1;
        
        await db.collection("payments").doc(id).update({
            status: 'verified',
            verifiedDate: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: adminData.email,
            numberOfTickets: numberOfTickets,
            ticketsUsed: 0,
            ticketsRemaining: numberOfTickets
        });
        
        const paymentIndex = window.allPayments.findIndex(p => p.id === id);
        if (paymentIndex !== -1) {
            window.allPayments[paymentIndex].status = 'verified';
            window.allPayments[paymentIndex].numberOfTickets = numberOfTickets;
            window.allPayments[paymentIndex].ticketsUsed = 0;
            window.allPayments[paymentIndex].ticketsRemaining = numberOfTickets;
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        showSuccess('Payment verified successfully!');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
        if (modal) modal.hide();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to verify payment: ' + error.message);
    }
}

// Reject payment
window.rejectPayment = async function(id) {
    if (!confirm('Are you sure you want to reject this payment?')) return;
    
    try {
        await db.collection("payments").doc(id).update({
            status: 'rejected',
            rejectedDate: firebase.firestore.FieldValue.serverTimestamp(),
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
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
        if (modal) modal.hide();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to reject payment');
    }
}

// Show success modal
function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    new bootstrap.Modal(document.getElementById('successModal')).show();
}

// Manual verify payment with ticket details
window.manualVerifyPayment = function() {
    const code = document.getElementById('manualTransactionCode').value.trim().toUpperCase();
    const resultDiv = document.getElementById('manualVerificationResult');
    
    if (!code) {
        resultDiv.innerHTML = '<div class="alert alert-warning">Please enter a transaction code</div>';
        return;
    }
    
    const payment = window.allPayments.find(p => 
        (p.transactionReference && p.transactionReference.toUpperCase() === code) || 
        (p.transactionCode && p.transactionCode.toUpperCase() === code)
    );
    
    if (payment) {
        const ticketTypeClass = window.getTicketTypeClass(payment.ticketType);
        const ticketsCount = payment.numberOfTickets || 1;
        const ticketsUsed = payment.ticketsUsed || 0;
        const ticketsRemaining = payment.ticketsRemaining || ticketsCount;
        
        if (payment.status === 'verified') {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <div class="d-flex align-items-center mb-3">
                        <i class="bi bi-check-circle-fill fs-2 me-3"></i>
                        <div>
                            <h5 class="mb-0">Already Verified</h5>
                            <small>Transaction: ${code}</small>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Customer:</strong> ${payment.fullName || 'Customer'}</p>
                            <p class="mb-1"><strong>Phone:</strong> ${payment.phoneNumber || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Ticket Type:</strong> <span class="ticket-type-badge ${ticketTypeClass}">${payment.ticketType}</span></p>
                            <p class="mb-1"><strong>Quantity:</strong> ×${ticketsCount}</p>
                            <p class="mb-1"><strong>Used:</strong> ${ticketsUsed} | <strong>Remaining:</strong> ${ticketsRemaining}</p>
                            <p class="mb-1"><strong>Amount:</strong> KES ${payment.amount.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <strong>Status:</strong> <span class="badge bg-success">VERIFIED</span>
                        ${payment.verifiedDate ? `<br><small>Verified on: ${new Date(payment.verifiedDate).toLocaleString()}</small>` : ''}
                    </div>
                </div>
            `;
        } else if (payment.status === 'pending') {
            resultDiv.innerHTML = `
                <div class="alert alert-warning">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-2"><strong>Customer:</strong> ${payment.fullName || 'Customer'}</p>
                            <p class="mb-2"><strong>Phone:</strong> ${payment.phoneNumber || 'N/A'}</p>
                            <p class="mb-2"><strong>Email:</strong> ${payment.email || 'No email'}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-2"><strong>Ticket:</strong> <span class="ticket-type-badge ${ticketTypeClass}">${payment.ticketType}</span></p>
                            <p class="mb-2"><strong>Quantity:</strong> ×${ticketsCount}</p>
                            <p class="mb-2"><strong>Amount:</strong> KES ${payment.amount.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 mt-3">
                        <button class="btn btn-success btn-lg" onclick="verifyPayment('${payment.id}')">
                            <i class="bi bi-check-lg me-2"></i> Verify Now
                        </button>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<div class="alert alert-danger">Payment was rejected</div>`;
        }
    } else {
        resultDiv.innerHTML = `<div class="alert alert-danger">Transaction not found: ${code}</div>`;
    }
}

// Open add cash payment modal with ticket quantity
window.openAddManualPayment = function() {
    document.getElementById('cashCustomerName').value = '';
    document.getElementById('cashPhone').value = '';
    document.getElementById('cashEmail').value = '';
    document.getElementById('cashTicketType').value = 'Early Bird Ticket';
    document.getElementById('cashTicketQuantity').value = '1';
    document.getElementById('cashAmount').value = '350';
    new bootstrap.Modal(document.getElementById('addCashPaymentModal')).show();
    closeQuickActions();
}

// Update cash amount when ticket type changes
document.addEventListener('DOMContentLoaded', function() {
    const ticketSelect = document.getElementById('cashTicketType');
    const quantityInput = document.getElementById('cashTicketQuantity');
    const amountInput = document.getElementById('cashAmount');
    
    function updateCashAmount() {
        const prices = {
            'Early Bird Ticket': 350,
            'Early Bird Couples': 650,
            'Couples Ticket': 700,
            'Regular Ticket': 400
        };
        const ticketType = ticketSelect.value;
        const quantity = parseInt(quantityInput.value) || 1;
        const price = prices[ticketType] || 0;
        amountInput.value = price * quantity;
    }
    
    if (ticketSelect && quantityInput && amountInput) {
        ticketSelect.addEventListener('change', updateCashAmount);
        quantityInput.addEventListener('input', updateCashAmount);
    }
});

// Submit cash payment with multiple tickets
window.submitCashPayment = async function() {
    const name = document.getElementById('cashCustomerName').value.trim();
    const phone = document.getElementById('cashPhone').value.trim();
    const email = document.getElementById('cashEmail').value.trim();
    const ticketType = document.getElementById('cashTicketType').value;
    const quantity = parseInt(document.getElementById('cashTicketQuantity').value) || 1;
    const amount = parseFloat(document.getElementById('cashAmount').value);
    
    if (!name || !phone) {
        alert('Please fill in customer name and phone number');
        return;
    }
    
    if (quantity < 1) {
        alert('Please enter a valid quantity (minimum 1)');
        return;
    }
    
    try {
        const paymentData = {
            fullName: name,
            customerName: name,
            phoneNumber: phone,
            phone: phone,
            email: email || 'No email provided',
            ticketType: ticketType,
            numberOfTickets: quantity,
            amount: amount,
            paymentMethod: 'Cash Payment',
            transactionReference: `CASH-${Date.now()}`,
            transactionCode: `CASH-${Date.now()}`,
            status: 'verified',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedDate: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: adminData.email,
            ticketsUsed: 0,
            ticketsRemaining: quantity
        };
        
        await db.collection('payments').add(paymentData);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCashPaymentModal'));
        modal.hide();
        
        await loadPaymentsFromFirestore();
        showSuccess(`${quantity} ${ticketType}(s) added and verified for KES ${amount.toLocaleString()}`);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add payment: ' + error.message);
    }
}

// Enhanced QR Scanner for ticket verification
window.openQrScanner = function() {
    new bootstrap.Modal(document.getElementById('qrScannerModal')).show();
    closeQuickActions();
    
    setTimeout(() => {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }
        
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            onScanSuccess,
            onScanError
        ).catch(err => {
            console.error('QR Scanner error:', err);
            document.getElementById('qrVerificationResult').innerHTML = 
                '<div class="alert alert-danger">Camera access denied or not available</div>';
        });
    }, 500);
}

// QR Scan success handler with ticket verification
async function onScanSuccess(decodedText) {
    stopQrScanner();
    
    try {
        // Parse QR data: TRANSACTION-TICKETNUMBER-TYPE
        const [transactionCode, ticketInfo, ticketType] = decodedText.split('-');
        const ticketNumber = ticketInfo.replace('T', '');
        
        // Find payment
        const payment = window.allPayments.find(p => 
            (p.transactionReference && p.transactionReference === transactionCode) || 
            (p.transactionCode && p.transactionCode === transactionCode)
        );
        
        if (!payment) {
            showVerificationResult('error', 'Ticket not found in system');
            return;
        }
        
        if (payment.status !== 'verified') {
            showVerificationResult('error', 'Payment not verified yet');
            return;
        }
        
        // Check if ticket already used
        const existingVerification = window.verificationRecords.find(v => 
            v.qrData === decodedText
        );
        
        if (existingVerification) {
            showVerificationResult('used', 'Ticket already used', existingVerification, payment);
            return;
        }
        
        // Verify ticket
        await verifyTicketForEntry(decodedText, payment, parseInt(ticketNumber), ticketType);
        
    } catch (error) {
        console.error('QR verification error:', error);
        showVerificationResult('error', 'Invalid QR code format');
    }
}

// Show verification result
function showVerificationResult(type, message, verification = null, payment = null) {
    const resultsDiv = document.getElementById('qrVerificationResult');
    let html = '';
    
    if (type === 'success') {
        html = `
            <div class="alert alert-success">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-check-circle-fill fs-1 me-3"></i>
                    <div>
                        <h4 class="mb-0">Ticket Verified!</h4>
                        <p class="mb-0">Entry granted</p>
                    </div>
                </div>
                ${payment ? `
                    <div class="mt-3">
                        <p><strong>Customer:</strong> ${payment.fullName || 'Customer'}</p>
                        <p><strong>Ticket:</strong> ${payment.ticketType} (Ticket ${verification?.ticketNumber || '1'})</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                        <p><strong>Remaining:</strong> ${(payment.ticketsRemaining || payment.numberOfTickets || 1) - 1} ticket(s)</p>
                    </div>
                ` : ''}
            </div>
        `;
    } else if (type === 'used') {
        html = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-x-circle-fill fs-1 me-3"></i>
                    <div>
                        <h4 class="mb-0">Ticket Already Used!</h4>
                        <p class="mb-0">This ticket has been scanned before</p>
                    </div>
                </div>
                ${verification ? `
                    <div class="mt-3">
                        <p><strong>First used at:</strong> ${new Date(verification.scannedAt?.toDate()).toLocaleString()}</p>
                        <p><strong>Scanned by:</strong> ${verification.scannedBy}</p>
                        <p><strong>Ticket:</strong> ${verification.ticketType} (Ticket ${verification.ticketNumber})</p>
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        html = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill fs-1 me-3"></i>
                    <div>
                        <h4 class="mb-0">Verification Failed</h4>
                        <p class="mb-0">${message}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = html;
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        if (type === 'success' || type === 'used') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('qrScannerModal'));
            if (modal) modal.hide();
        }
    }, 3000);
}

// Verify ticket for entry
async function verifyTicketForEntry(qrData, payment, ticketNumber, ticketType) {
    try {
        // Record verification
        await db.collection("verifications").add({
            paymentId: payment.id,
            transactionCode: payment.transactionReference || payment.transactionCode,
            qrData: qrData,
            ticketType: ticketType,
            ticketNumber: ticketNumber,
            totalTickets: payment.numberOfTickets || 1,
            customerName: payment.fullName || payment.customerName,
            customerEmail: payment.email,
            amount: payment.amount,
            scannedAt: firebase.firestore.FieldValue.serverTimestamp(),
            scannedBy: adminData.email,
            status: 'used'
        });
        
        // Update tickets used count
        const ticketsUsed = (payment.ticketsUsed || 0) + 1;
        const ticketsRemaining = (payment.numberOfTickets || 1) - ticketsUsed;
        
        await db.collection("payments").doc(payment.id).update({
            ticketsUsed: ticketsUsed,
            ticketsRemaining: ticketsRemaining,
            lastVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        payment.ticketsUsed = ticketsUsed;
        payment.ticketsRemaining = ticketsRemaining;
        
        // Add to verification records
        await loadVerificationRecords();
        
        showVerificationResult('success', 'Ticket verified successfully', null, payment);
        
    } catch (error) {
        console.error('Error verifying ticket:', error);
        showVerificationResult('error', 'Failed to verify ticket');
    }
}

// QR Scan error handler
function onScanError(errorMessage) {
    // Ignore scan errors
}

// Stop QR Scanner
window.stopQrScanner = function() {
    if (html5QrCode) {
        html5QrCode.stop().catch(err => console.error('Stop error:', err));
    }
}

// Generate comprehensive PDF export
window.generateVerifiedPDF = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const verified = window.allPayments.filter(p => p.status === 'verified');
    
    if (verified.length === 0) {
        alert('No verified payments to export');
        return;
    }
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('KALENJIN VIBEZ - PAYMENT REPORT', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });
    doc.text(`Generated by: ${adminData.name || 'Admin'}`, 105, 27, { align: 'center' });
    
    let yPos = 35;
    
    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('SUMMARY STATISTICS', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const totalRevenue = verified.reduce((sum, p) => sum + p.amount, 0);
    const totalTickets = verified.reduce((sum, p) => sum + (p.numberOfTickets || 1), 0);
    const totalTicketsUsed = verified.reduce((sum, p) => sum + (p.ticketsUsed || 0), 0);
    const totalTicketsRemaining = verified.reduce((sum, p) => sum + (p.ticketsRemaining || (p.numberOfTickets || 1)), 0);
    
    doc.text(`Total Revenue: KES ${totalRevenue.toLocaleString()}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Verified Payments: ${verified.length}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Tickets Sold: ${totalTickets}`, 14, yPos);
    yPos += 6;
    doc.text(`Tickets Used: ${totalTicketsUsed}`, 14, yPos);
    yPos += 6;
    doc.text(`Tickets Remaining: ${totalTicketsRemaining}`, 14, yPos);
    yPos += 10;
    
    // Ticket Type Breakdown
    doc.setFontSize(12);
    doc.text('TICKET TYPE BREAKDOWN', 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    
    const ticketTypes = {};
    verified.forEach(p => {
        const type = p.ticketType;
        const count = p.numberOfTickets || 1;
        const used = p.ticketsUsed || 0;
        if (!ticketTypes[type]) ticketTypes[type] = { total: 0, used: 0 };
        ticketTypes[type].total += count;
        ticketTypes[type].used += used;
    });
    
    Object.keys(ticketTypes).forEach(type => {
        const data = ticketTypes[type];
        doc.text(`${type}: ${data.total} tickets (${data.used} used, ${data.total - data.used} remaining)`, 14, yPos);
        yPos += 6;
    });
    
    yPos += 5;
    
    // Detailed Payment List
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('DETAILED PAYMENT LIST', 14, yPos);
    yPos += 10;
    
    const tableData = verified.map(p => [
        p.fullName || 'N/A',
        p.phoneNumber || 'N/A',
        p.ticketType,
        p.numberOfTickets || 1,
        p.ticketsUsed || 0,
        p.ticketsRemaining || (p.numberOfTickets || 1),
        `KES ${p.amount.toLocaleString()}`,
        new Date(p.date).toLocaleDateString(),
        (p.transactionReference || 'N/A').substring(0, 12)
    ]);
    
    doc.autoTable({
        startY: yPos,
        head: [['Name', 'Phone', 'Ticket Type', 'Qty', 'Used', 'Remaining', 'Amount', 'Date', 'Trans. Code']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234], textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 22 },
            2: { cellWidth: 28 },
            3: { cellWidth: 12 },
            4: { cellWidth: 12 },
            5: { cellWidth: 15 },
            6: { cellWidth: 22 },
            7: { cellWidth: 20 },
            8: { cellWidth: 25 }
        }
    });
    
    // Add summary page
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setTextColor(102, 126, 234);
    doc.text('PAYMENT SUMMARY', 105, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Revenue Collected: KES ${totalRevenue.toLocaleString()}`, 14, yPos);
    yPos += 8;
    doc.text(`Total Tickets Verified: ${totalTickets}`, 14, yPos);
    yPos += 8;
    doc.text(`Total Tickets Used at Event: ${totalTicketsUsed}`, 14, yPos);
    yPos += 8;
    doc.text(`Total Tickets Remaining: ${totalTicketsRemaining}`, 14, yPos);
    yPos += 8;
    doc.text(`Report Period: Up to ${new Date().toLocaleDateString()}`, 14, yPos);
    yPos += 15;
    
    // Signature line
    doc.line(14, yPos, 80, yPos);
    doc.text('Authorized Signature', 14, yPos + 5);
    doc.line(120, yPos, 186, yPos);
    doc.text('Date', 120, yPos + 5);
    
    doc.save(`Kalenjin-Payments-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    showSuccess('PDF report generated successfully!');
    closeQuickActions();
}

// Filter payments
window.filterPayments = function() {
    const searchTerm = document.getElementById('paymentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#paymentsTable tr.payment-row');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Verify from message
window.verifyFromMessage = function() {
    const message = document.getElementById('mpesaMessage').value.trim();
    const resultDiv = document.getElementById('verificationResult');
    
    if (!message) {
        resultDiv.innerHTML = '<div class="alert alert-warning">Please paste M-Pesa message or transaction code</div>';
        return;
    }
    
    // Extract transaction code from message
    const codeMatch = message.match(/[A-Z0-9]{10,}/);
    if (codeMatch) {
        const code = codeMatch[0];
        const payment = window.allPayments.find(p => 
            (p.transactionReference && p.transactionReference.includes(code)) || 
            (p.transactionCode && p.transactionCode.includes(code))
        );
        
        if (payment) {
            const ticketTypeClass = window.getTicketTypeClass(payment.ticketType);
            const ticketsCount = payment.numberOfTickets || 1;
            const ticketsUsed = payment.ticketsUsed || 0;
            const ticketsRemaining = payment.ticketsRemaining || ticketsCount;
            
            if (payment.status === 'verified') {
                resultDiv.innerHTML = `<div class="alert alert-success">
                    <div class="d-flex align-items-center mb-3">
                        <i class="bi bi-check-circle-fill fs-2 me-3"></i>
                        <div>
                            <h5 class="mb-0">Already Verified</h5>
                            <small>From M-Pesa Message</small>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Customer:</strong> ${payment.fullName}</p>
                            <p><strong>Phone:</strong> ${payment.phoneNumber || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Ticket:</strong> <span class="ticket-type-badge ${ticketTypeClass}">${payment.ticketType}</span></p>
                            <p><strong>Quantity:</strong> ×${ticketsCount}</p>
                            <p><strong>Used/Remaining:</strong> ${ticketsUsed}/${ticketsRemaining}</p>
                            <p><strong>Amount:</strong> KES ${payment.amount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>`;
            } else if (payment.status === 'pending') {
                resultDiv.innerHTML = `<div class="alert alert-warning">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Customer:</strong> ${payment.fullName}</p>
                            <p><strong>Phone:</strong> ${payment.phoneNumber || 'N/A'}</p>
                            <p><strong>From Message:</strong> ${message.substring(0, 50)}...</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Ticket:</strong> <span class="ticket-type-badge ${ticketTypeClass}">${payment.ticketType}</span></p>
                            <p><strong>Quantity:</strong> ×${ticketsCount}</p>
                            <p><strong>Amount:</strong> KES ${payment.amount.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div class="d-grid gap-2 mt-3">
                        <button class="btn btn-success btn-lg" onclick="verifyPayment('${payment.id}')">
                            <i class="bi bi-check-lg me-2"></i> Verify Now
                        </button>
                    </div>
                </div>`;
            }
        } else {
            resultDiv.innerHTML = '<div class="alert alert-danger">Payment not found in system</div>';
        }
    } else {
        resultDiv.innerHTML = '<div class="alert alert-danger">Could not extract transaction code from message</div>';
    }
}

// Toggle quick actions menu
window.toggleQuickActions = function() {
    const menu = document.getElementById('quickActionsMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close quick actions menu
function closeQuickActions() {
    document.getElementById('quickActionsMenu').style.display = 'none';
}

// Show section
window.showSection = function(sectionId) {
    document.getElementById('dashboardContainer').style.display = sectionId === 'dashboard' ? 'block' : 'none';
    document.getElementById('verificationContainer').style.display = sectionId === 'verification' ? 'block' : 'none';
    document.getElementById('paymentsContainer').style.display = sectionId === 'payments' ? 'block' : 'none';
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event?.target?.classList.add('active');
    
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

// Logout
window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await auth.signOut();
            localStorage.removeItem('kalenjin_admin');
            sessionStorage.removeItem('kalenjin_admin');
            window.location.href = 'login.html';
        } catch (error) {
            alert('Failed to logout');
        }
    }
}

// Refresh data
window.refreshData = async function() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    await loadPaymentsFromFirestore();
    await loadVerificationRecords();
    document.getElementById('loadingOverlay').style.display = 'none';
    showSuccess('Data refreshed successfully!');
}

// Update date time
function updateDateTime() {
    const now = new Date();
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth < 768 && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
    
    // Close quick actions on outside click
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('quickActionsMenu');
        const btn = document.querySelector('.floating-action-btn');
        
        if (menu && btn) {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                closeQuickActions();
            }
        }
    });
}

console.log('✅ Admin Dashboard Loaded Successfully')