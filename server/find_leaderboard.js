const fs = require('fs');
const content = fs.readFileSync('./index.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('/leaderboard')) {
        console.log(`Line ${index + 1}: ${line}`);
    }
});
