const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const key = process.env.GEMINI_KEY_CHAT;

if (!key) {
    console.error("GEMINI_KEY_CHAT not found in .env");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.models) {
                const filtered = parsed.models
                    .map(m => m.name)
                    .filter(name => name.startsWith('models/gemini-'));
                console.log(filtered.join('\n'));
            } else {
                console.log(data);
            }
        } catch (e) {
            console.log(data);
        }
    });
}).on("error", (err) => {
    console.error("Error: " + err.message);
});
