// ============================================================
// firebase.js — Firebase Configuration & Initialization
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

// Firebase Configuration
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

async function signup(email, password, role) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await setDoc(doc(db, "users", user.uid), {
    email: email,
    role: role,
    createdAt: serverTimestamp()
  });
  return user;
}

async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

async function logout() {
  await signOut(auth);
}

async function checkUserRole(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return null;
}

// ============================================================
// TAG NUMBER FUNCTIONS
// ============================================================

async function getNextTagNumber() {
  const counterRef = doc(db, "meta", "tagCounter");
  let newTag = 1;
  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists()) {
      transaction.set(counterRef, { count: 1 });
      newTag = 1;
    } else {
      newTag = counterDoc.data().count + 1;
      transaction.update(counterRef, { count: newTag });
    }
  });
  return newTag;
}

// ============================================================
// LAUNDRY FUNCTIONS
// ============================================================

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

async function getLaundryByUser(userEmail) {
  const q = query(
    collection(db, "laundry"),
    where("userEmail", "==", userEmail)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

function getAllLaundry(callback) {
  const q = query(collection(db, "laundry"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(entries);
  });
}

async function updateStatus(docId, status) {
  await updateDoc(doc(db, "laundry", docId), { status });
}

async function assignShelfNumber(docId, shelfNumber) {
  await updateDoc(doc(db, "laundry", docId), { shelfNumber });
}

// ============================================================
// STUDENT ROOM FUNCTIONS
// ============================================================

async function addStudentRoom(registrationNumber, roomNumber) {
  await setDoc(doc(db, "studentRooms", registrationNumber), {
    registrationNumber,
    roomNumber
  });
}

async function getRoomNumber(registrationNumber) {
  const docRef = doc(db, "studentRooms", registrationNumber);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().roomNumber;
  }
  return null;
}

// ============================================================
// SCHEDULE LOGIC
// ============================================================

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

// ============================================================
// EXPRESS SERVICE FUNCTIONS
// ============================================================

// ============================================================
// EXPRESS SERVICE FUNCTIONS
// ============================================================

async function submitExpressRequest(registrationNumber, userEmail, tagNumber, reason, details, requestedDate, specialInstructions) {
  const docRef = await addDoc(collection(db, "expressRequests"), {
    registrationNumber: registrationNumber,
    userEmail: userEmail,
    tagNumber: parseInt(tagNumber),
    reason: reason,
    details: details || "",
    specialInstructions: specialInstructions || "",
    requestedDate: requestedDate || null,
    status: "pending",
    approvedBy: null,
    approvedAt: null,
    scheduledPickupTime: null,
    scheduledDeliveryTime: null,
    rejectionReason: null,
    expressFee: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return { id: docRef.id, tagNumber };
}

function getAllExpressRequests(callback) {
  const q = query(collection(db, "expressRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
}

async function getStudentExpressRequests(userEmail) {
  const q = query(
    collection(db, "expressRequests"),
    where("userEmail", "==", userEmail),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

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

// ============================================================
// EXPORTS
// ============================================================

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
