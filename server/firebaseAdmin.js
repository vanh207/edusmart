const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let serviceAccount = null;
let isInitialized = false;

// 1. Try to load from Environment Variable (Recommended for Production/Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("[Firebase] Loading credentials from Environment Variable.");
    } catch (err) {
        console.error("[Firebase] Error parsing FIREBASE_SERVICE_ACCOUNT env var:", err.message);
    }
}
// 2. Fallback: Try to load from file (Local development)
else {
    const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
    if (fs.existsSync(serviceAccountPath)) {
        try {
            serviceAccount = require(serviceAccountPath);
            console.log("[Firebase] Loading credentials from serviceAccountKey.json.");
        } catch (err) {
            console.error("[Firebase] Error loading serviceAccountKey.json:", err.message);
        }
    }
}

if (serviceAccount) {
    try {
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        isInitialized = true;
        console.log("-----------------------------------------");
        console.log("[Firebase] Admin SDK initialized successfully.");
        console.log("-----------------------------------------");
    } catch (err) {
        console.error("[Firebase] Error during initialization:", err.message);
    }
} else {
    console.log("-----------------------------------------");
    console.error("[Firebase] MISSING CREDENTIALS: Set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json");
    console.log("-----------------------------------------");
}

admin.isInitialized = isInitialized;
module.exports = admin;
