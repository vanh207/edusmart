const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testKey(name, key) {
    if (!key) {
        console.log(`[-] ${name}: No key provided`);
        return;
    }
    const modelsToTry = [
        "models/gemini-2.0-flash",
        "models/gemini-flash-latest",
        "models/gemini-pro-latest",
        "models/gemini-2.0-flash-lite-preview-09-2025"
    ];

    for (const modelName of modelsToTry) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'OK'");
            const response = await result.response;
            console.log(`[+] ${name} (${modelName}): ${response.text().trim()}`);
            return; // Success, move to next key
        } catch (error) {
            console.log(`  [ ] ${name} (${modelName}) failed: ${error.message.substring(0, 100)}`);
        }
    }
    console.log(`[x] ${name}: All models failed.`);
}

async function main() {
    console.log("Testing AI Keys...");
    const keys = [
        { name: "CHAT", key: process.env.GEMINI_KEY_CHAT },
        { name: "PROCTOR", key: process.env.GEMINI_KEY_PROCTOR },
        { name: "CONTENT", key: process.env.GEMINI_KEY_CONTENT },
        { name: "EXPLAIN", key: process.env.GEMINI_KEY_EXPLAIN },
        { name: "SPEAKING", key: process.env.GEMINI_KEY_SPEAKING },
        { name: "PRONUNCIATION", key: process.env.GEMINI_KEY_PRONUNCIATION },
        { name: "WRITING", key: process.env.GEMINI_KEY_WRITING },
    ];

    for (const { name, key } of keys) {
        await testKey(name, key);
    }

    // Also try to list models for the first key
    if (keys[0].key) {
        try {
            console.log("\nListing available models for CHAT key...");
            const genAI = new GoogleGenerativeAI(keys[0].key);
            const results = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keys[0].key}`).then(r => r.json());
            console.log(JSON.stringify(results, null, 2));
        } catch (e) {
            console.log("Error listing models:", e.message);
        }
    }
}

main();
