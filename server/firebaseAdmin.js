const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
let isInitialized = false;

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
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
    console.error("[Firebase] THIẾU FILE: serviceAccountKey.json");
    console.error("Vui lòng tải file Private Key từ Firebase Console và lưu vào: " + serviceAccountPath);
    console.log("-----------------------------------------");
}

admin.isInitialized = isInitialized;
module.exports = admin;
