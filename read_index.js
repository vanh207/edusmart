const fs = require('fs');
const content = fs.readFileSync('C:/Users/DO VIET ANH/OneDrive/Máy tính/project/server/index.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(6600, 6660).join('\n'));
