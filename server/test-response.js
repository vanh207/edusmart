// Quick test to see API response format
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/classes/8/students',
    method: 'GET'
};

console.log('Testing API response format...\n');

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}\n`);
        if (res.statusCode === 200) {
            const json = JSON.parse(data);
            console.log('Response structure:');
            console.log(JSON.stringify(json, null, 2));
            console.log('\nIs students an array?', Array.isArray(json.students));
            console.log('Students count:', json.students?.length);
        } else {
            console.log('Error:', data);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
