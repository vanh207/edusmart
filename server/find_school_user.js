const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Searching for school: PTDTNT ATK SƠN DƯƠNG');

db.get("SELECT * FROM schools WHERE name LIKE '%PTDTNT ATK SƠN DƯƠNG%'", [], (err, school) => {
    if (err) { console.error(err); return; }
    if (school) {
        console.log(`Found School: ID=${school.id}, Name=${school.name}`);

        console.log('\nSearching for user: Đỗ Việt Anh or @vanh');
        db.all("SELECT id, username, full_name, role, school_id, class_name, class_id, current_class_id FROM users WHERE username LIKE '%vanh%' OR full_name LIKE '%Đỗ Việt Anh%'", [], (err, users) => {
            if (err) { console.error(err); return; }
            users.forEach(u => {
                console.log(`User ID: ${u.id}, Username: ${u.username}, Name: ${u.full_name}, Role: ${u.role}, SchoolID: ${u.school_id}, ClassName: ${u.class_name}, ClassID: ${u.class_id}, CurrentClassID: ${u.current_class_id}`);
            });

            if (school) {
                console.log(`\nClasses at School ID ${school.id}:`);
                db.all("SELECT id, name FROM classes WHERE school_id = ?", [school.id], (err, classes) => {
                    classes.forEach(c => console.log(`Class ID: ${c.id}, Name: ${c.name}`));
                    db.close();
                });
            } else {
                db.close();
            }
        });
    } else {
        console.log('School not found by name.');
        db.close();
    }
});
