// Test script to verify the endpoint works
const http = require('http');

const classId = 8; // Change this to your class ID

const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/classes/${classId}/students`,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log(`Testing endpoint: http://localhost:5000/api/admin/classes/${classId}/students\n`);

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:');
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));

            if (json.students) {
                console.log(`\n✅ Found ${json.students.length} students`);
                json.students.forEach((student, index) => {
                    console.log(`  ${index + 1}. ${student.full_name} (@${student.username})`);
                });
            } else {
                console.log('\n❌ No students array in response');
            }
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure:');
    console.log('1. Server is running (node index.js)');
    console.log('2. Server is on port 5000');
});

req.end();
