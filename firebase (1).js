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
 * getNextTagNumber() — Auto-increments tag number safely using Firestore transaction
 * Uses a "meta/tagCounter" document to keep track of the last tag number
 */
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

/**
 * addLaundry() — Submits a new laundry entry for a student
 */
async function addLaundry(registrationNumber, userEmail) {
  const tagNumber = await getNextTagNumber();
  const docRef = await addDoc(collection(db, "laundry"), {
    registrationNumber: registrationNumber,
    userEmail: userEmail,
    tagNumber: tagNumber,
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
}
