
import fs from 'fs';
import path from 'path';

function findUnbalancedDivs(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                findUnbalancedDivs(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const openDivs = (content.match(/<div(>| )/g) || []).length;
            const closeDivs = (content.match(/<\/div>/g) || []).length;
            if (openDivs !== closeDivs) {
                console.log(`Unbalanced divs in ${fullPath}: <div ${openDivs}, </div> ${closeDivs}`);
            }
        }
    }
}

function findMissingDataProperty(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                findMissingDataProperty(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Look for patterns like setSomething(response) or setSomething(res) where the response is from an API call
            // This is hard to regex perfectly, but we can look for "await .*API" followed by a setter without .data
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.includes('await') && line.includes('API')) {
                    const match = line.match(/const (\w+) = await/);
                    if (match) {
                        const varName = match[1];
                        // Check next few lines for setter
                        for (let i = 1; i < 5 && (index + i) < lines.length; i++) {
                            const nextLine = lines[index + i];
                            if (nextLine.includes(`set`) && nextLine.includes(`(${varName})`) && !nextLine.includes(`${varName}.data`)) {
                                console.log(`Potential missing .data in ${fullPath} at line ${index + i + 1}: ${nextLine.trim()}`);
                            }
                        }
                    }
                }
            });
        }
    }
}

const targetDir = 'C:\\Users\\DO VIET ANH\\OneDrive\\Máy tính\\project\\client\\app';
console.log('--- Scanning for unbalanced divs ---');
findUnbalancedDivs(targetDir);
console.log('\n--- Scanning for potential missing .data property ---');
findMissingDataProperty(targetDir);
