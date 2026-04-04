// ============================================================
// firebase.js — Firebase Configuration & Initialization
// ============================================================
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create a new project → Add a Web App
// STEP 3: Copy your firebaseConfig object and paste it below
// STEP 4: Enable Email/Password Authentication in Firebase Console
//         (Authentication → Sign-in method → Email/Password → Enable)
// STEP 5: Create Firestore Database in Firebase Console
//         (Firestore Database → Create database → Start in test mode)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️ REPLACE THIS ENTIRE OBJECT WITH YOUR FIREBASE CONFIG ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyAdY967h56_3Js_z6vRMr7ilBjkJw93E_U",
  authDomain: "dhobidesk.firebaseapp.com",
  projectId: "dhobidesk",
  storageBucket: "dhobidesk.firebasestorage.app",
  messagingSenderId: "216057931395",
  appId: "1:216057931395:web:c4ed3b0e54bbb9921b9db6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// AUTH FUNCTIONS
// ============================================================

/**
 * signup() — Registers a new user with email, password, and role
 * Stores user role in Firestore under "users" collection
 */
async function signup(email, password, role) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  // Store role in Firestore
  await setDoc(doc(db, "users", user.uid), {
    email: email,
    role: role,
    createdAt: serverTimestamp()
  });
  return user;
}

/**
 * login() — Logs in an existing user with email and password
 */
async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * logout() — Signs out the current user
 */
async function logout() {
  await signOut(auth);
}

/**
 * checkUserRole() — Fetches the role of a user from Firestore
 * Returns "student" or "worker"
 */
async function checkUserRole(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return null;
}

// ============================================================
// LAUNDRY FUNCTIONS
// ============================================================



/**
 * addLaundry() — Submits a new laundry entry for a student
 */
async function addLaundry(registrationNumber, userEmail, tagNumber) {
  
  const docRef = await addDoc(collection(db, "laundry"), {
    registrationNumber: registrationNumber,
    userEmail: userEmail,
    tagNumber: parseInt(tagNumber),
    status: "Submitted",
    shelfNumber: "",
    timestamp: serverTimestamp()
  });
  return { id: docRef.id, tagNumber };
}

/**
 * getLaundryByUser() — Fetches all laundry entries for a specific student
 */
async function getLaundryByUser(userEmail) {
  const q = query(
    collection(db, "laundry"),
    where("userEmail", "==", userEmail)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * getAllLaundry() — Fetches all laundry entries (for worker dashboard)
 * Returns real-time listener — call with a callback
 */
function getAllLaundry(callback) {
  const q = query(collection(db, "laundry"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(entries);
  });
}

/**
 * updateStatus() — Updates the status of a laundry entry
 * status can be: "Submitted", "Processing", "Completed"
 */
async function updateStatus(docId, status) {
  await updateDoc(doc(db, "laundry", docId), { status });
}

/**
 * assignShelfNumber() — Assigns a shelf number to a laundry entry
 */
async function assignShelfNumber(docId, shelfNumber) {
  await updateDoc(doc(db, "laundry", docId), { shelfNumber });
}

// ============================================================
// SCHEDULE LOGIC
// ============================================================

/**
 * isSubmissionAllowed() — Checks if a student is allowed to submit today
 * based on the weekly schedule
 */
async function isSubmissionAllowed(registrationNumber) {
  const roomNumber = await getRoomNumber(registrationNumber);

  if (!roomNumber) {
    return { allowed: false, message: "Registration number not found. Contact admin." };
  }

  const schedule = {
    1: [101, 140],
    2: [201, 240],
    3: [301, 340],
    4: [401, 440],
    5: [501, 540],
    6: [601, 640],
    0: [701, 740]
  };

  const today = new Date().getDay();
  const range = schedule[today];

  if (!range) return { allowed: false, message: "Invalid schedule" };

  const allowed = roomNumber >= range[0] && roomNumber <= range[1];

  return {
    allowed,
    message: allowed
      ? "Allowed to submit today"
      : `Not your day. Your room (${roomNumber}) is scheduled on another day`
  };
}

// Export everything for use in other files
export {
  auth,
  db,
  signup,
  login,
  logout,
  checkUserRole,
  addLaundry,
  getLaundryByUser,
  getAllLaundry,
  updateStatus,
  assignShelfNumber,
  isSubmissionAllowed,
  onAuthStateChanged,
  addStudentRoom,
  getRoomNumber
};

// Map student to room
async function addStudentRoom(registrationNumber, roomNumber) {
  await setDoc(doc(db, "studentRooms", registrationNumber), {
    registrationNumber,
    roomNumber
  });
}

// Get room from registration number
async function getRoomNumber(registrationNumber) {
  const docRef = doc(db, "studentRooms", registrationNumber);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().roomNumber;
  }
  return null;

  // ============================================================
// EXPRESS SERVICE FUNCTIONS
// ============================================================

/**
 * submitExpressRequest() - Student submits express laundry request
 */
async function submitExpressRequest(registrationNumber, userEmail, reason, specialInstructions, requestedDate) {
  const tagNumber = await getNextTagNumber();
  
  const docRef = await addDoc(collection(db, "expressRequests"), {
    registrationNumber: registrationNumber,
    userEmail: userEmail,
    tagNumber: tagNumber,
    reason: reason,
    specialInstructions: specialInstructions || "",
    requestedDate: requestedDate || null,
    status: "pending", // pending, approved, processing, completed, rejected
    approvedBy: null,
    approvedAt: null,
    scheduledPickupTime: null,
    scheduledDeliveryTime: null,
    expressFee: 100, // ₹100 for express service
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return { id: docRef.id, tagNumber };
}

/**
 * getAllExpressRequests() - Get all express requests for admin/worker
 */
function getAllExpressRequests(callback) {
  const q = query(collection(db, "expressRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
}

/**
 * getStudentExpressRequests() - Get express requests for a specific student
 */
async function getStudentExpressRequests(userEmail) {
  const q = query(
    collection(db, "expressRequests"),
    where("userEmail", "==", userEmail),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * approveExpressRequest() - Admin approves express request with pickup time
 */
async function approveExpressRequest(requestId, scheduledPickupTime, scheduledDeliveryTime, adminEmail) {
  const requestRef = doc(db, "expressRequests", requestId);
  await updateDoc(requestRef, {
    status: "approved",
    approvedBy: adminEmail,
    approvedAt: serverTimestamp(),
    scheduledPickupTime: scheduledPickupTime,
    scheduledDeliveryTime: scheduledDeliveryTime,
    updatedAt: serverTimestamp()
  });
}

/**
 * rejectExpressRequest() - Admin rejects express request
 */
async function rejectExpressRequest(requestId, rejectionReason, adminEmail) {
  const requestRef = doc(db, "expressRequests", requestId);
  await updateDoc(requestRef, {
    status: "rejected",
    approvedBy: adminEmail,
    approvedAt: serverTimestamp(),
    rejectionReason: rejectionReason,
    updatedAt: serverTimestamp()
  });
}

/**
 * updateExpressStatus() - Update processing status of express request
 */
async function updateExpressStatus(requestId, status, shelfNumber = null) {
  const requestRef = doc(db, "expressRequests", requestId);
  const updateData = { 
    status: status,
    updatedAt: serverTimestamp()
  };
  if (shelfNumber) {
    updateData.shelfNumber = shelfNumber;
  }
  await updateDoc(requestRef, updateData);
}
  import { 
  getAllExpressRequests, approveExpressRequest, rejectExpressRequest, updateExpressStatus 
} from './firebase.js';

let expressRequests = [];
let expressUnsubscribe = null;

// Start listening to express requests
function startExpressRequestsListener() {
  if (expressUnsubscribe) expressUnsubscribe();
  
  expressUnsubscribe = getAllExpressRequests((requests) => {
    expressRequests = requests;
    renderExpressRequests(requests);
    
    // Update pending count
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    document.getElementById('pendingCount').textContent = pendingCount;
  });
}

function renderExpressRequests(requests) {
  const container = document.getElementById('expressRequestsList');
  const loader = document.getElementById('expressRequestsLoader');
  
  if (loader) loader.style.display = 'none';
  
  if (requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <h3>No express requests</h3>
        <p>Students will request express service here when needed.</p>
      </div>`;
    return;
  }
  
  container.innerHTML = requests.map(req => renderExpressRequestCard(req)).join('');
  
  // Attach event listeners for each request
  requests.forEach(req => {
    const approveBtn = document.getElementById(`approve-${req.id}`);
    const rejectBtn = document.getElementById(`reject-${req.id}`);
    const updateStatusBtn = document.getElementById(`update-status-${req.id}`);
    
    if (approveBtn) {
      approveBtn.onclick = () => showApproveModal(req);
    }
    if (rejectBtn) {
      rejectBtn.onclick = () => showRejectModal(req);
    }
    if (updateStatusBtn) {
      updateStatusBtn.onclick = () => updateExpressRequestStatus(req);
    }
  });
}

function renderExpressRequestCard(req) {
  const statusColors = {
    'pending': 'var(--orange)',
    'approved': 'var(--blue)',
    'processing': 'var(--amber)',
    'completed': 'var(--green)',
    'rejected': 'var(--red)'
  };
  
  const requestDate = req.createdAt?.toDate?.() 
    ? req.createdAt.toDate().toLocaleString('en-IN')
    : '—';
  
  return `
    <div class="express-card" style="border:1px solid var(--gray-200); border-radius:var(--radius); padding:1rem; margin-bottom:1rem; background:var(--white);">
      <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
        <div>
          <span style="font-weight:800; font-size:1.1rem;">Tag #${req.tagNumber}</span>
          <span style="background:${statusColors[req.status]}; color:white; padding:2px 8px; border-radius:12px; font-size:0.7rem; margin-left:0.5rem;">
            ${req.status.toUpperCase()}
          </span>
        </div>
        <div style="font-size:0.75rem; color:var(--gray-400);">${requestDate}</div>
      </div>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:0.5rem; margin-bottom:0.75rem;">
        <div><strong>Student:</strong> ${req.userEmail}</div>
        <div><strong>Reg Number:</strong> ${req.registrationNumber}</div>
        <div><strong>Reason:</strong> ${req.reason}</div>
      </div>
      
      <div style="background:var(--gray-100); padding:0.75rem; border-radius:var(--radius); margin-bottom:0.75rem;">
        <strong>📝 Request Details:</strong>
        <p style="margin-top:0.25rem; font-size:0.85rem;">${req.specialInstructions || req.details || 'No additional details'}</p>
        ${req.requestedDate ? `<p style="margin-top:0.25rem; font-size:0.8rem;"><strong>Needed by:</strong> ${new Date(req.requestedDate).toLocaleString('en-IN')}</p>` : ''}
      </div>
      
      ${req.status === 'pending' ? `
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          <button class="btn btn-green btn-sm" id="approve-${req.id}">✅ Approve</button>
          <button class="btn btn-orange btn-sm" id="reject-${req.id}">❌ Reject</button>
        </div>
      ` : ''}
      
      ${req.status === 'approved' ? `
        <div style="margin-top:0.5rem;">
          <button class="btn btn-primary btn-sm" id="update-status-${req.id}">⚙️ Start Processing</button>
        </div>
      ` : ''}
      
      ${req.status === 'processing' ? `
        <div style="margin-top:0.5rem;">
          <button class="btn btn-green btn-sm" id="update-status-${req.id}">✅ Mark Completed</button>
        </div>
      ` : ''}
      
      ${(req.status === 'approved' || req.status === 'processing' || req.status === 'completed') && req.scheduledPickupTime ? `
        <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--gray-200); font-size:0.8rem;">
          <div><strong>📅 Scheduled Pickup:</strong> ${new Date(req.scheduledPickupTime).toLocaleString('en-IN')}</div>
          <div><strong>🎯 Scheduled Delivery:</strong> ${new Date(req.scheduledDeliveryTime).toLocaleString('en-IN')}</div>
        </div>
      ` : ''}
      
      ${req.status === 'completed' && req.shelfNumber ? `
        <div style="margin-top:0.5rem; background:var(--green-lt); padding:0.5rem; border-radius:var(--radius);">
          📦 Ready for pickup at <strong>Shelf #${req.shelfNumber}</strong>
        </div>
      ` : ''}
    </div>
  `;
}

// Modals for approve/reject
function showApproveModal(req) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>✅ Approve Express Request</h3>
      <p>Request from: <strong>${req.userEmail}</strong></p>
      <p>Reason: ${req.reason}</p>
      
      <div class="form-group">
        <label>Pickup Date & Time *</label>
        <input type="datetime-local" id="pickupTime" class="modal-input" />
      </div>
      
      <div class="form-group">
        <label>Expected Delivery Time *</label>
        <input type="datetime-local" id="deliveryTime" class="modal-input" />
      </div>
      
      <div style="display:flex; gap:0.5rem; margin-top:1rem;">
        <button class="btn btn-green" id="confirmApprove">Confirm Approval</button>
        <button class="btn btn-outline" id="closeModal">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('confirmApprove').onclick = async () => {
    const pickupTime = document.getElementById('pickupTime').value;
    const deliveryTime = document.getElementById('deliveryTime').value;
    
    if (!pickupTime || !deliveryTime) {
      alert('Please fill in both pickup and delivery times');
      return;
    }
    
    await approveExpressRequest(req.id, pickupTime, deliveryTime, auth.currentUser.email);
    modal.remove();
  };
  
  document.getElementById('closeModal').onclick = () => modal.remove();
}

function showRejectModal(req) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>❌ Reject Express Request</h3>
      <p>Request from: <strong>${req.userEmail}</strong></p>
      
      <div class="form-group">
        <label>Rejection Reason *</label>
        <textarea id="rejectReason" rows="3" placeholder="Why is this request being rejected?" class="modal-input"></textarea>
      </div>
      
      <div style="display:flex; gap:0.5rem; margin-top:1rem;">
        <button class="btn btn-orange" id="confirmReject">Confirm Rejection</button>
        <button class="btn btn-outline" id="closeModal">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('confirmReject').onclick = async () => {
    const reason = document.getElementById('rejectReason').value;
    if (!reason) {
      alert('Please provide a rejection reason');
      return;
    }
    await rejectExpressRequest(req.id, reason, auth.currentUser.email);
    modal.remove();
  };
  
  document.getElementById('closeModal').onclick = () => modal.remove();
}

async function updateExpressRequestStatus(req) {
  let newStatus;
  if (req.status === 'approved') newStatus = 'processing';
  else if (req.status === 'processing') newStatus = 'completed';
  else return;
  
  let shelfNumber = null;
  if (newStatus === 'completed') {
    shelfNumber = prompt('Enter shelf number for pickup:', '1-5');
    if (!shelfNumber) return;
  }
  
  await updateExpressStatus(req.id, newStatus, shelfNumber);
}

// Call startExpressRequestsListener() in onAuthStateChanged after user auth

export {
  // Auth
  auth,
  db,
  signup,
  login,
  logout,
  checkUserRole,
  onAuthStateChanged,
  
  // Laundry
  addLaundry,
  getLaundryByUser,
  getAllLaundry,
  updateStatus,
  assignShelfNumber,
  getNextTagNumber,
  
  // Schedule & Rooms
  isSubmissionAllowed,
  addStudentRoom,
  getRoomNumber,
  
  // Express Service
  submitExpressRequest,
  getAllExpressRequests,
  getStudentExpressRequests,
  approveExpressRequest,
  rejectExpressRequest,
  updateExpressStatus
};
  

