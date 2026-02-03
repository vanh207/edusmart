// Quick test for new endpoint
const http = require('http');

const classId = 8;

console.log('Testing SIMPLIFIED endpoint (no JOIN)...\n');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/${classId}/students-test`,
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));

        if (res.statusCode === 200) {
            console.log('\n✅ Simple query WORKS!');
            console.log('→ Problem is in the JOIN clause');
        } else {
            console.log('\n❌ Even simple query fails');
            console.log('→ Problem is database connection or basic query');
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
