const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const aiConfigs = {
    chat: process.env.GEMINI_KEY_CHAT,
    proctoring: process.env.GEMINI_KEY_PROCTOR,
    content: process.env.GEMINI_KEY_CONTENT,
    explain: process.env.GEMINI_KEY_EXPLAIN,
    speaking: process.env.GEMINI_KEY_SPEAKING,
    pronunciation: process.env.GEMINI_KEY_PRONUNCIATION,
    writing: process.env.GEMINI_KEY_WRITING,
};

const aiInstances = {};
Object.keys(aiConfigs).forEach((feature) => {
    if (aiConfigs[feature]) {
        aiInstances[feature] = new GoogleGenerativeAI(aiConfigs[feature]);
    }
});

const keyPool = Object.values(aiConfigs).filter(Boolean);
const poolInstances = keyPool.map(key => new GoogleGenerativeAI(key));

const mainGenAI = aiInstances.chat || poolInstances[0];

async function generateWithAI(prompt, imagePart = null, feature = "content") {
    const modelsToTry = [
        "models/gemini-2.0-flash",
        "models/gemini-flash-latest",
        "models/gemini-1.5-flash",
        "models/gemini-pro-latest",
    ];

    const primaryAI = aiInstances[feature] || mainGenAI;
    const allAIs = [primaryAI, ...poolInstances.filter(inst => inst.apiKey !== primaryAI.apiKey)];

    console.log(`Starting test for feature: ${feature}`);
    console.log(`Key pool size: ${allAIs.length}`);

    let lastQuotaError = null;

    for (const genAI of allAIs) {
        for (const modelName of modelsToTry) {
            try {
                console.log(`  - Trying ${modelName} with key ${genAI.apiKey.substring(0, 10)}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([prompt]);
                const response = await result.response;
                const text = response.text();

                if (text) {
                    console.log(`  [+] SUCCESS with ${modelName}`);
                    return text;
                }
            } catch (error) {
                console.log(`  [x] FAILED ${modelName}: ${error.message.substring(0, 50)}`);
                if (error.message.includes("429") || error.message.includes("quota")) {
                    lastQuotaError = "Quota error detected";
                }
            }
        }
    }
    throw new Error(lastQuotaError || "All models failed");
}

(async () => {
    try {
        const res = await generateWithAI("Xin chào, bạn là ai?", null, "chat");
        console.log("Final Result:", res);
    } catch (err) {
        console.error("Test failed:", err.message);
    }
})();
