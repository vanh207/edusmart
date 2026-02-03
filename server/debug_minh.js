const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('--- DEBUGGING STUDENT @minh ---');

db.get("SELECT * FROM users WHERE username = 'minh'", (err, user) => {
    if (err) {
        console.error('Error fetching @minh:', err);
        return;
    }

    if (!user) {
        console.log('Student @minh not found!');
        db.close();
        return;
    }

    console.log('User Details:');
    console.log(JSON.stringify(user, null, 2));

    db.get("SELECT * FROM classes WHERE id = ?", [user.class_id], (err, cls) => {
        if (err) {
            console.error('Error fetching class:', err);
        } else if (cls) {
            console.log('\nClass Details:');
            console.log(JSON.stringify(cls, null, 2));
        } else {
            console.log('\nClass with ID ' + user.class_id + ' not found in classes table.');
        }

        db.get("SELECT * FROM schools WHERE id = ?", [user.school_id], (err, school) => {
            if (err) {
                console.error('Error fetching school:', err);
            } else if (school) {
                console.log('\nSchool Details:');
                console.log(JSON.stringify(school, null, 2));
            } else {
                console.log('\nSchool with ID ' + user.school_id + ' not found in schools table.');
            }

            // Also search for any other students named Minh for clarity
            db.all("SELECT id, username, full_name, role, class_id, school_id FROM users WHERE full_name LIKE '%Minh%' OR username LIKE '%minh%'", (err, others) => {
                console.log('\nOther users matching "Minh":');
                others.forEach(o => {
                    console.log(`- ID: ${o.id}, Username: @${o.username}, Name: ${o.full_name}, Role: ${o.role}, Class: ${o.class_id}, School: ${o.school_id}`);
                });
                db.close();
            });
        });
    });
});
