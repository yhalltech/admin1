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
window.scannedTickets = [];
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
            await loadScannedTickets();
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
                ticketType: paymentData.ticketType || determineTicketType(paymentData.amount),
                ticketDetails: paymentData.ticketDetails || []
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

// Load scanned tickets
async function loadScannedTickets() {
    try {
        const ticketsQuery = db.collection("tickets")
            .where("status", "==", "used")
            .orderBy("scannedAt", "desc");
        const querySnapshot = await ticketsQuery.get();
        window.scannedTickets = [];
        
        querySnapshot.forEach((docSnap) => {
            window.scannedTickets.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
    } catch (error) {
        console.error('Error loading scanned tickets:', error);
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
    
    // ✅ CHECK IF TICKETS EXIST
    const ticketsExist = await checkTicketsExist(paymentId);
    
    // Load individual tickets
    let individualTicketsHTML = '';
    let ticketCount = 0;
    try {
        const ticketsQuery = await db.collection("tickets")
            .where("paymentId", "==", paymentId)
            .orderBy("ticketIndex")
            .get();
        
        ticketCount = ticketsQuery.size;
        
        if (!ticketsQuery.empty) {
            individualTicketsHTML = '<div class="mt-4"><h6 class="text-light mb-2">Individual Tickets:</h6><div class="row">';
            ticketsQuery.forEach(doc => {
                const ticket = doc.data();
                const statusClass = ticket.status === 'used' ? 'bg-danger' : 
                                  ticket.status === 'active' ? 'bg-success' : 'bg-secondary';
                individualTicketsHTML += `
                    <div class="col-md-6 mb-2">
                        <div class="p-2 border border-secondary rounded">
                            <div class="d-flex justify-content-between">
                                <span>Ticket #${ticket.ticketIndex}</span>
                                <span class="badge ${statusClass}">${ticket.status || 'active'}</span>
                            </div>
                            <small class="text-light">${ticket.id.substring(0, 20)}...</small>
                        </div>
                    </div>
                `;
            });
            individualTicketsHTML += '</div></div>';
        }
    } catch (error) {
        console.error('Error loading individual tickets:', error);
    }
    
    // ✅ SMART BUTTON LOGIC
    let actionsHtml = '';
    
    if (selectedPayment.status === 'pending') {
        // ✅ CHECK IF TICKETS ALREADY EXIST (safety)
        if (ticketsExist) {
            actionsHtml = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Tickets already generated! Payment status is pending but tickets exist.
                </div>
                <button class="btn btn-lg btn-danger w-100 mb-2" onclick="rejectPayment('${selectedPayment.id}')">
                    <i class="bi bi-x-lg me-2"></i>Reject Payment
                </button>
            `;
        } else {
            actionsHtml = `
                <button class="btn btn-lg btn-success w-100 mb-2" onclick="verifyPayment('${selectedPayment.id}')">
                    <i class="bi bi-check-lg me-2"></i>Verify Payment & Generate Tickets
                </button>
                <button class="btn btn-lg btn-danger w-100 mb-2" onclick="rejectPayment('${selectedPayment.id}')">
                    <i class="bi bi-x-lg me-2"></i>Reject Payment
                </button>
            `;
        }
    } else if (selectedPayment.status === 'verified') {
        actionsHtml = `
            <button class="btn btn-lg btn-warning w-100 mb-2" onclick="reverifyTicket('${selectedPayment.id}')">
                <i class="bi bi-arrow-repeat me-2"></i>Mark Tickets as Used
            </button>
        `;
        
        // ✅ ONLY SHOW REGENERATE IF NO TICKETS EXIST
        if (!ticketsExist || ticketCount === 0) {
            actionsHtml += `
                <button class="btn btn-lg btn-info w-100 mb-2" onclick="generateMissingTickets('${selectedPayment.id}')">
                    <i class="bi bi-ticket-perforated me-2"></i>Generate Missing Tickets
                </button>
            `;
        } else {
            actionsHtml += `
                <div class="alert alert-success mb-2">
                    <i class="bi bi-check-circle me-2"></i>
                    ${ticketCount} ticket(s) already generated ✅
                </div>
                <button class="btn btn-lg btn-outline-warning w-100 mb-2" onclick="generateMissingTickets('${selectedPayment.id}')">
                    <i class="bi bi-exclamation-triangle me-2"></i>Force Regenerate (Delete & Recreate)
                </button>
            `;
        }
        
        // ✅ ADD CHANGE STATUS BUTTON
        actionsHtml += `
            <button class="btn btn-lg btn-secondary w-100 mb-2" onclick="changePaymentStatus('${selectedPayment.id}')">
                <i class="bi bi-pencil me-2"></i>Change Payment Status
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
            
            ${individualTicketsHTML}
            
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

// Generate individual tickets
async function generateIndividualTickets(paymentId) {
  const paymentSnap = await db.collection("payments").doc(paymentId).get();
  if (!paymentSnap.exists) throw new Error("Payment not found");

  const payment = paymentSnap.data();
  const batch = db.batch();

  let globalIndex = 1;

  for (let groupIndex = 0; groupIndex < payment.ticketDetails.length; groupIndex++) {
    const detail = payment.ticketDetails[groupIndex];

    for (let i = 0; i < detail.quantity; i++) {
      const ticketRef = db.collection("tickets").doc(); // 🔥 UNIQUE ID

      batch.set(ticketRef, {
        paymentId,
        transactionReference: payment.transactionReference,

        ticketType: detail.type,
        ticketIndex: globalIndex,
        ticketGroupIndex: groupIndex + 1,

        customerName: payment.fullName,
        customerEmail: payment.email,

        verified: true,
        status: "active",

        qrData: ticketRef.id, // 🔐 KEY CHANGE

        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      globalIndex++;
    }
  }

  await batch.commit();
}


// Generate missing tickets
window.generateMissingTickets = async function(paymentId) {
    try {
        const payment = window.allPayments.find(p => p.id === paymentId);
        
        if (!payment) {
            alert('Payment not found');
            return;
        }
        
        // ✅ EXTRA SAFETY CHECK
        if (payment.ticketsGenerated === true) {
            if (!confirm('⚠️ Tickets appear to already exist. Regenerating will CREATE DUPLICATES. Are you absolutely sure?')) {
                return;
            }
        }
        
        showLoading('Regenerating tickets...');
        
        // Delete existing tickets first
        const existingTickets = await db.collection("tickets")
            .where("paymentId", "==", paymentId)
            .get();
        
        const batch = db.batch();
        existingTickets.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Generate new tickets
        await generateIndividualTickets(paymentId);
        
        // Mark as generated
        await db.collection("payments").doc(paymentId).update({
            ticketsGenerated: true,
            lastRegeneratedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSuccess('✅ Tickets regenerated successfully!');
        
        // Refresh the modal
        openPaymentModal(paymentId);
    } catch (error) {
        console.error('Error generating tickets:', error);
        alert('Failed to generate tickets: ' + error.message);
    } finally {
        hideLoading();
    }
};

// Delete payment
window.deletePayment = async function(paymentId) {
    if (!confirm('Are you sure you want to delete this payment? This will also delete all associated tickets. This action cannot be undone.')) return;
    
    try {
        // First delete associated tickets
        const ticketsQuery = await db.collection("tickets")
            .where("paymentId", "==", paymentId)
            .get();
        
        const batch = db.batch();
        ticketsQuery.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete verifications
        const verificationsQuery = await db.collection("verifications")
            .where("paymentId", "==", paymentId)
            .get();
        
        verificationsQuery.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete payment
        batch.delete(db.collection("payments").doc(paymentId));
        
        await batch.commit();
        
        // Remove from local arrays
        window.allPayments = window.allPayments.filter(p => p.id !== paymentId);
        window.verificationRecords = window.verificationRecords.filter(v => v.paymentId !== paymentId);
        window.scannedTickets = window.scannedTickets.filter(t => t.paymentId !== paymentId);
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
        if (modal) modal.hide();
        
        showSuccess('Payment and all associated data deleted successfully!');
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Failed to delete payment: ' + error.message);
    }
}
async function checkTicketsExist(paymentId) {
    try {
        const ticketsQuery = await db.collection("tickets")
            .where("paymentId", "==", paymentId)
            .limit(1)
            .get();
        
        return !ticketsQuery.empty;
    } catch (error) {
        console.error('Error checking tickets:', error);
        return false;
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

// Verify payment and generate tickets
window.verifyPayment = async function(id) {
    try {
        const payment = window.allPayments.find(p => p.id === id);
        
        if (!payment) {
            alert('Payment not found');
            return;
        }
        
        // ✅ PREVENT DOUBLE VERIFICATION
        if (payment.status === 'verified') {
            alert('⚠️ This payment is already verified! Cannot verify twice.');
            return;
        }
        
        // ✅ CHECK IF TICKETS ALREADY GENERATED
        const ticketsExist = await checkTicketsExist(id);
        if (ticketsExist) {
            alert('⚠️ Tickets already generated for this payment! Cannot regenerate.');
            return;
        }
        
        const numberOfTickets = payment.numberOfTickets || 1;
        
        showLoading('Verifying payment and generating tickets...');
        
        // Update payment status
        await db.collection("payments").doc(id).update({
            status: 'verified',
            verifiedDate: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: adminData.email,
            numberOfTickets: numberOfTickets,
            ticketsUsed: 0,
            ticketsRemaining: numberOfTickets,
            ticketsGenerated: true // ✅ FLAG TO PREVENT REGENERATION
        });
        
        // Generate individual tickets
        await generateIndividualTickets(id);
        
        // Update local data
        const paymentIndex = window.allPayments.findIndex(p => p.id === id);
        if (paymentIndex !== -1) {
            window.allPayments[paymentIndex].status = 'verified';
            window.allPayments[paymentIndex].numberOfTickets = numberOfTickets;
            window.allPayments[paymentIndex].ticketsUsed = 0;
            window.allPayments[paymentIndex].ticketsRemaining = numberOfTickets;
            window.allPayments[paymentIndex].ticketsGenerated = true;
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
        if (modal) modal.hide();
        
        showSuccess(`✅ Payment verified successfully! ${numberOfTickets} ticket(s) generated.`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to verify payment: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Reject payment
window.rejectPayment = async function(id) {
    if (!confirm('Are you sure you want to reject this payment? This will mark all associated tickets as rejected.')) return;
    
    try {
        await db.collection("payments").doc(id).update({
            status: 'rejected',
            rejectedDate: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: adminData.email
        });
        
        // Update ticket statuses
        const ticketsQuery = await db.collection("tickets")
            .where("paymentId", "==", id)
            .get();
        
        const batch = db.batch();
        ticketsQuery.forEach(doc => {
            batch.update(doc.ref, {
                status: 'rejected',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        
        const paymentIndex = window.allPayments.findIndex(p => p.id === id);
        if (paymentIndex !== -1) {
            window.allPayments[paymentIndex].status = 'rejected';
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        showSuccess('Payment rejected and tickets marked as rejected.');
        
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

// Show loading
function showLoading(text = "Loading...") {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (loadingOverlay && loadingText) {
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = text;
    }
}

// Hide loading
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
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
                            <i class="bi bi-check-lg me-2"></i> Verify & Generate Tickets
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
        showLoading('Adding cash payment and generating tickets...');
        
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
        
        // Add payment
        const docRef = await db.collection('payments').add(paymentData);
        
        // Generate individual tickets
        await generateIndividualTickets(docRef.id);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCashPaymentModal'));
        if (modal) modal.hide();
        
        await loadPaymentsFromFirestore();
        showSuccess(`${quantity} ${ticketType}(s) added, verified and tickets generated for KES ${amount.toLocaleString()}`);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add payment: ' + error.message);
    } finally {
        hideLoading();
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
    const ticketRef = db.collection("tickets").doc(decodedText);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      showVerificationResult("error", "Invalid ticket");
      return;
    }

    const ticket = ticketSnap.data();

    if (!ticket.verified) {
      showVerificationResult("error", "Ticket not verified");
      return;
    }

    if (ticket.status === "used") {
      showVerificationResult("used", "Ticket already used", ticket);
      return;
    }

    await verifyIndividualTicket(ticketRef.id, ticket);

  } catch (err) {
    showVerificationResult("error", "Scan failed");
  }
}

// Verify individual ticket

async function verifyIndividualTicket(ticketId, ticket) {
  await db.collection("tickets").doc(ticketId).update({
    status: "used",
    scannedAt: firebase.firestore.FieldValue.serverTimestamp(),
    scannedBy: adminData.email
  });

  await db.collection("verifications").add({
    ticketId,
    paymentId: ticket.paymentId,
    ticketType: ticket.ticketType,
    ticketIndex: ticket.ticketIndex,
    customerName: ticket.customerName,
    scannedAt: firebase.firestore.FieldValue.serverTimestamp(),
    scannedBy: adminData.email
  });

  showVerificationResult("success", "Entry granted", ticket);
}

// Show verification result
function showVerificationResult(type, message, verification = null, payment = null) {
    const resultsDiv = document.getElementById('qrVerificationResult');
    let html = '';
    
    if (type === 'success') {
        const remaining = payment ? payment.ticketsRemaining - 1 : 0;
        
        html = `
            <div class="alert alert-success">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-check-circle-fill fs-1 me-3"></i>
                    <div>
                        <h4 class="mb-0">Ticket Verified!</h4>
                        <p class="mb-0">Entry granted</p>
                    </div>
                </div>
                ${verification ? `
                    <div class="mt-3">
                        <p><strong>Customer:</strong> ${verification.customerName || 'Customer'}</p>
                        <p><strong>Ticket:</strong> ${verification.ticketType} (Ticket ${verification.ticketNumber || '1'})</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                        <p><strong>Remaining:</strong> ${remaining} ticket(s) available</p>
                        <p><strong>Transaction:</strong> ${verification.transactionCode}</p>
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
                        <p><strong>Transaction:</strong> ${verification.transactionCode}</p>
                    </div>
                ` : ''}
            </div>
        `;
    } else if (type === 'expired') {
        html = `
            <div class="alert alert-danger">
                <div class="d-flex align-items-center mb-3">
                    <i class="bi bi-exclamation-triangle-fill fs-1 me-3"></i>
                    <div>
                        <h4 class="mb-0">Ticket Expired!</h4>
                        <p class="mb-0">All tickets from this transaction have been used</p>
                    </div>
                </div>
                ${payment ? `
                    <div class="mt-3">
                        <p><strong>Customer:</strong> ${payment.fullName || 'Customer'}</p>
                        <p><strong>Total Tickets:</strong> ${payment.numberOfTickets || 1}</p>
                        <p><strong>Tickets Used:</strong> ${payment.ticketsUsed || 0}</p>
                        <p><strong>All tickets have been scanned</strong></p>
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
    
    // Auto-close after 3 seconds for success/used/expired
    setTimeout(() => {
        if (type === 'success' || type === 'used' || type === 'expired') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('qrScannerModal'));
            if (modal) modal.hide();
        }
    }, 3000);
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

// Enhanced PDF export with detailed verified list and scanned attendees
window.generateVerifiedPDF = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const verified = window.allPayments.filter(p => p.status === 'verified');
    
    if (verified.length === 0) {
        alert('No verified payments to export');
        return;
    }
    
    showLoading('Generating comprehensive PDF report...');
    
    try {
        // Header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('KALENJIN VIBEZ - COMPREHENSIVE REPORT', 105, 15, { align: 'center' });
        
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
        
        // DETAILED VERIFIED PEOPLE LIST
        doc.addPage();
        yPos = 20;
        doc.setFontSize(16);
        doc.setTextColor(102, 126, 234);
        doc.text('DETAILED VERIFIED PEOPLE LIST', 105, yPos, { align: 'center' });
        yPos += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const detailedTableData = verified.map(p => [
            p.fullName || 'N/A',
            p.phoneNumber || 'N/A',
            p.email || 'N/A',
            p.ticketType,
            p.numberOfTickets || 1,
            p.ticketsUsed || 0,
            p.ticketsRemaining || (p.numberOfTickets || 1),
            `KES ${p.amount.toLocaleString()}`,
            new Date(p.date).toLocaleDateString(),
            (p.transactionReference || 'N/A')
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['Name', 'Phone', 'Email', 'Ticket Type', 'Total', 'Used', 'Remaining', 'Amount', 'Date', 'Transaction Code']],
            body: detailedTableData,
            theme: 'grid',
            headStyles: { fillColor: [102, 126, 234], textColor: 255 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 22 },
                2: { cellWidth: 30 },
                3: { cellWidth: 28 },
                4: { cellWidth: 12 },
                5: { cellWidth: 12 },
                6: { cellWidth: 15 },
                7: { cellWidth: 22 },
                8: { cellWidth: 20 },
                9: { cellWidth: 30 }
            }
        });
        
        // SCANNED ATTENDEES PAGE
        doc.addPage();
        yPos = 20;
        doc.setFontSize(16);
        doc.setTextColor(102, 126, 234);
        doc.text('SCANNED ATTENDEES', 105, yPos, { align: 'center' });
        yPos += 10;
        
        const scannedQuery = await db.collection("verifications")
            .orderBy("scannedAt", "desc")
            .get();
        
        const scannedData = [];
        scannedQuery.forEach((doc) => {
            const data = doc.data();
            scannedData.push([
                data.customerName || 'Guest',
                `${data.ticketType} #${data.ticketNumber}`,
                data.scannedAt?.toDate().toLocaleString() || 'N/A',
                data.scannedBy,
                data.transactionCode?.substring(0, 15) || 'N/A'
            ]);
        });
        
        if (scannedData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Customer', 'Ticket', 'Scanned At', 'Scanned By', 'Transaction Code']],
                body: scannedData,
                theme: 'striped',
                headStyles: { fillColor: [220, 53, 69], textColor: 255 },
                styles: { fontSize: 8 }
            });
        } else {
            doc.text('No scanned attendees yet', 14, yPos);
        }
        
        // TICKETS STATUS PAGE
        doc.addPage();
        yPos = 20;
        doc.setFontSize(16);
        doc.setTextColor(102, 126, 234);
        doc.text('INDIVIDUAL TICKETS STATUS', 105, yPos, { align: 'center' });
        yPos += 10;
        
        const ticketsQuery = await db.collection("tickets")
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();
        
        const ticketsData = [];
        ticketsQuery.forEach((doc) => {
            const data = doc.data();
            ticketsData.push([
                data.customerName || 'Guest',
                `${data.ticketType} #${data.ticketNumber}`,
                data.status || 'active',
                data.scannedAt?.toDate().toLocaleString() || 'Not scanned',
                data.transactionCode?.substring(0, 12) || 'N/A'
            ]);
        });
        
        if (ticketsData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Customer', 'Ticket', 'Status', 'Scanned At', 'Transaction']],
                body: ticketsData,
                theme: 'grid',
                headStyles: { fillColor: [40, 167, 69], textColor: 255 },
                styles: { fontSize: 8 }
            });
        }
        
        // Add summary page
        const lastPage = doc.internal.getNumberOfPages();
        doc.setPage(lastPage);
        
        yPos = doc.internal.pageSize.height - 40;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Report generated: ${new Date().toLocaleString()}`, 14, yPos);
        yPos += 6;
        doc.text(`Total verified customers: ${verified.length}`, 14, yPos);
        yPos += 6;
        doc.text(`Total revenue collected: KES ${totalRevenue.toLocaleString()}`, 14, yPos);
        yPos += 6;
        doc.text(`Total tickets: ${totalTickets} (Used: ${totalTicketsUsed}, Remaining: ${totalTicketsRemaining})`, 14, yPos);
        
        doc.save(`Kalenjin-Complete-Report-${new Date().toISOString().split('T')[0]}.pdf`);
        showSuccess('Comprehensive PDF report generated successfully!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF: ' + error.message);
    } finally {
        hideLoading();
        closeQuickActions();
    }
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

// Show pending modal
window.showPendingModal = function() {
    const pendingPayments = window.allPayments.filter(p => p.status === 'pending');
    const modalContent = document.getElementById('pendingModalContent');
    
    if (pendingPayments.length === 0) {
        modalContent.innerHTML = '<div class="text-center p-5"><p class="text-light">No pending payments</p></div>';
    } else {
        let html = '<div class="row">';
        pendingPayments.forEach(payment => {
            const ticketTypeClass = window.getTicketTypeClass(payment.ticketType);
            const ticketsCount = payment.numberOfTickets || 1;
            
            html += `
                <div class="col-md-6 mb-3">
                    <div class="glass-card p-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="text-white">${payment.fullName || 'Customer'}</h6>
                                <small class="text-light">${payment.phoneNumber || 'N/A'}</small>
                                <div class="mt-2">
                                    <span class="ticket-type-badge ${ticketTypeClass}">${payment.ticketType}</span>
                                    <span class="badge bg-info ms-2">×${ticketsCount}</span>
                                </div>
                                <p class="text-success mb-0 mt-2">KES ${payment.amount.toLocaleString()}</p>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-success" onclick="verifyPayment('${payment.id}')">
                                    <i class="bi bi-check"></i>
                                </button>
                                <button class="btn btn-sm btn-danger mt-1" onclick="rejectPayment('${payment.id}')">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        modalContent.innerHTML = html;
    }
    
    new bootstrap.Modal(document.getElementById('pendingModal')).show();
};

// Show scanned attendees
window.showScannedAttendees = async function() {
    try {
        showLoading('Loading scanned attendees...');
        
        const scannedQuery = await db.collection("verifications")
            .orderBy("scannedAt", "desc")
            .get();
        
        let html = '<div class="table-responsive">';
        html += `
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Ticket</th>
                        <th>Scanned At</th>
                        <th>Scanned By</th>
                        <th>Transaction</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (scannedQuery.empty) {
            html += `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <p class="text-light">No scanned attendees yet</p>
                    </td>
                </tr>
            `;
        } else {
            scannedQuery.forEach((doc) => {
                const data = doc.data();
                const scannedTime = data.scannedAt?.toDate() || new Date();
                
                html += `
                    <tr>
                        <td>${data.customerName || 'Guest'}</td>
                        <td>${data.ticketType} #${data.ticketNumber}</td>
                        <td>${scannedTime.toLocaleString()}</td>
                        <td>${data.scannedBy}</td>
                        <td><small>${data.transactionCode?.substring(0, 12)}...</small></td>
                        <td><span class="badge bg-success">Used</span></td>
                    </tr>
                `;
            });
        }
        
        html += `
                </tbody>
            </table>
        </div>`;
        
        document.getElementById('scannedAttendeesContent').innerHTML = html;
        hideLoading();
        new bootstrap.Modal(document.getElementById('scannedAttendeesModal')).show();
    } catch (error) {
        console.error('Error loading scanned attendees:', error);
        hideLoading();
        alert('Failed to load scanned attendees: ' + error.message);
    }
};

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
    await loadScannedTickets();
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
// ✅ NEW FUNCTION: CHANGE PAYMENT STATUS
window.changePaymentStatus = async function(paymentId) {
    const payment = window.allPayments.find(p => p.id === paymentId);
    if (!payment) return;
    
    const newStatus = prompt(
        `Current status: ${payment.status}\n\nEnter new status (pending/verified/rejected):`,
        payment.status
    );
    
    if (!newStatus || newStatus === payment.status) return;
    
    const validStatuses = ['pending', 'verified', 'rejected'];
    if (!validStatuses.includes(newStatus.toLowerCase())) {
        alert('Invalid status. Must be: pending, verified, or rejected');
        return;
    }
    
    if (!confirm(`Change status from "${payment.status}" to "${newStatus}"?`)) {
        return;
    }
    
    try {
        await db.collection("payments").doc(paymentId).update({
            status: newStatus.toLowerCase(),
            statusChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
            statusChangedBy: adminData.email
        });
        
        // Update local data
        const paymentIndex = window.allPayments.findIndex(p => p.id === paymentId);
        if (paymentIndex !== -1) {
            window.allPayments[paymentIndex].status = newStatus.toLowerCase();
        }
        
        updateDashboardStats();
        loadRecentActivity();
        loadPaymentsTable();
        
        showSuccess(`Status changed to: ${newStatus}`);
        
        // Refresh modal
        openPaymentModal(paymentId);
        
    } catch (error) {
        console.error('Error changing status:', error);
        alert('Failed to change status: ' + error.message);
    }
}

console.log('✅ Admin duplicate prevention loaded');
console.log('✅ Admin Dashboard Loaded Successfully');