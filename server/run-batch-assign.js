// Simple Node.js script to run batch auto-assign
// Usage: node run-batch-assign.js <admin_token>

const http = require('http');

const token = process.argv[2];

if (!token) {
    console.log('❌ Usage: node run-batch-assign.js <admin_token>');
    console.log('');
    console.log('To get your admin token:');
    console.log('  1. Login to admin dashboard');
    console.log('  2. Open DevTools (F12)');
    console.log('  3. Go to Application > Local Storage');
    console.log('  4. Copy the "token" value');
    process.exit(1);
}

console.log('🔄 Running batch auto-assign...\n');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/batch-auto-assign',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const result = JSON.parse(data);

            if (res.statusCode === 200) {
                console.log('✅ Success!\n');
                console.log(`📊 Results:`);
                console.log(`   Total students: ${result.total}`);
                console.log(`   ✓ Assigned: ${result.assigned}`);
                console.log(`   ⚠ Not found: ${result.notFound}`);

                if (result.notFound > 0) {
                    console.log('\n💡 Tip: Check server logs to see which students couldn\'t be matched.');
                }
            } else {
                console.log('❌ Error:', result.error || 'Unknown error');
            }
        } catch (e) {
            console.log('❌ Error parsing response:', data);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Connection error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running (node index.js)');
    console.log('   2. Server is on port 5000');
});

req.end();
