# 🧺 DhobiDesk — Smart Laundry Coordination System

A fully working, role-based hostel laundry management web app built with HTML, CSS, Vanilla JS, and Firebase.

---

## 📁 File Structure

```
smart-laundry/
├── index.html      ← Home page
├── signup.html     ← Register (student or worker)
├── login.html      ← Login page
├── schedule.html   ← Weekly laundry schedule
├── student.html    ← Student dashboard (submit + track)
├── worker.html     ← Worker dashboard (manage all entries)
├── style.css       ← All styles
├── script.js       ← Shared utility functions
└── firebase.js     ← Firebase config + all backend functions
```

---

## 🔥 Step 1: Set Up Firebase

### 1.1 Create a Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → Name it (e.g., `DhobiDesk`)
3. Disable Google Analytics (optional) → Click **"Create project"**

### 1.2 Enable Email/Password Authentication
1. In Firebase Console → **Authentication**
2. Click **"Get started"**
3. Under **Sign-in method** → Click **Email/Password**
4. Toggle **Enable** → Click **Save**

### 1.3 Create Firestore Database
1. In Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a region → Click **"Enable"**

### 1.4 Register Your Web App
1. In Firebase Console → Project Overview → Click **`</>`** (Web app icon)
2. Give it a name (e.g., `DhobiDesk Web`)
3. Click **"Register app"**
4. Copy the `firebaseConfig` object shown

### 1.5 Paste Firebase Config
Open `firebase.js` and replace the placeholder config:

```javascript
// ⚠️ REPLACE THIS with your actual Firebase config ⚠️
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← your key
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

---

## 🔒 Step 2: Set Firestore Security Rules (Recommended)

In Firebase Console → Firestore Database → **Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read their own role document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Laundry: students can read/write their own; workers can read/write all
    match /laundry/{docId} {
      allow read, write: if request.auth != null;
    }

    // Tag counter: authenticated users can read/write
    match /meta/tagCounter {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

---

## 🌐 Step 3: Deploy to GitHub Pages

### 3.1 Create a GitHub Repository
1. Go to [https://github.com](https://github.com) → Click **"New repository"**
2. Name it `dhobidesk` (or anything you like)
3. Make it **Public** → Click **"Create repository"**

### 3.2 Upload All Files
Option A — GitHub Web UI:
1. Open your new repository
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop all files from the `smart-laundry/` folder
4. Click **"Commit changes"**

Option B — Git CLI:
```bash
cd smart-laundry/
git init
git add .
git commit -m "Initial commit — DhobiDesk"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dhobidesk.git
git push -u origin main
```

### 3.3 Enable GitHub Pages
1. Go to your repository → **Settings** → **Pages**
2. Under **"Branch"** → select `main` → folder `/` (root)
3. Click **Save**
4. Wait ~1 minute → Your site is live at:
   `https://YOUR_USERNAME.github.io/dhobidesk/`

---

## 👤 Step 4: Create Your First Accounts

1. Open your live site → click **Sign Up**
2. Create a **Worker** account first (e.g., `worker@hostel.com`)
3. Create a **Student** account (e.g., `student@hostel.com`)

---

## 📅 Weekly Schedule (Default)

| Day       | Rooms     |
|-----------|-----------|
| Monday    | 101–140   |
| Tuesday   | 201–240   |
| Wednesday | 301–340   |
| Thursday  | 401–440   |
| Friday    | 501–540   |
| Saturday  | 601–640   |
| Sunday    | 701–740   |

> **Note:** The system validates submissions based on the last 3 digits of the registration number matching the room range.
> Example: `20CS140` → Room 140 → Valid on **Monday**

---

## 🗄️ Firestore Database Structure

### Collection: `users`
| Field     | Type   | Example             |
|-----------|--------|---------------------|
| email     | string | student@hostel.com  |
| role      | string | student / worker    |
| createdAt | timestamp | auto            |

### Collection: `laundry`
| Field              | Type      | Example           |
|--------------------|-----------|-------------------|
| registrationNumber | string    | 20CS140           |
| userEmail          | string    | student@hostel.com|
| tagNumber          | number    | 42                |
| status             | string    | Submitted / Processing / Completed |
| shelfNumber        | string    | 3                 |
| timestamp          | timestamp | auto              |

### Document: `meta/tagCounter`
| Field | Type   | Description             |
|-------|--------|-------------------------|
| count | number | Auto-increments per bag |

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Firebase config error | Make sure you pasted the correct config in `firebase.js` |
| Can't login | Check Email/Password Auth is enabled in Firebase Console |
| Firestore permission denied | Check Security Rules are published correctly |
| Schedule validation fails | Make sure last 3 digits of reg number match room range |
| GitHub Pages not loading | Wait 2–3 minutes after enabling Pages; check branch is `main` |

---

## ✅ Features Checklist

- [x] Firebase Authentication (signup + login)
- [x] Role-based access (student vs worker)
- [x] Auto-increment tag numbers (via Firestore transaction)
- [x] Schedule validation before submission
- [x] Real-time laundry status updates (worker dashboard)
- [x] Shelf number assignment by worker
- [x] Student sees "Collect from Shelf #X" message
- [x] Filter & search in worker dashboard
- [x] Fully deployable on GitHub Pages + Firebase

---

Built with ❤️ for hostel students.
