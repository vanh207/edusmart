const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const sampleVocabulary = [
    // Speaking
    { word: "Beautiful", meaning: "Đẹp, xinh đẹp", pronunciation: "/ˈbjuːtɪfl/", example: "She is a beautiful girl.", subject: "English", grade_level: "6", type: "speaking" },
    { word: "Environment", meaning: "Môi trường", pronunciation: "/ɪnˈvaɪrənmənt/", example: "We should protect our environment.", subject: "English", grade_level: "7", type: "speaking" },
    { word: "Technology", meaning: "Công nghệ", pronunciation: "/tekˈnɒlədʒi/", example: "Technology is changing fast.", subject: "English", grade_level: "8", type: "speaking" },
    { word: "Education", meaning: "Giáo dục", pronunciation: "/ˌedʒuˈkeɪʃn/", example: "Education is very important.", subject: "English", grade_level: "9", type: "speaking" },

    // Reading
    { word: "Harvest", meaning: "Vụ thu hoạch", pronunciation: "/ˈhɑːvɪst/", example: "They are busy with the harvest.", subject: "English", grade_level: "6", type: "reading" },
    { word: "Pollution", meaning: "Ô nhiễm", pronunciation: "/pəˈluːʃn/", example: "Air pollution is a serious problem.", subject: "English", grade_level: "7", type: "reading" },
    { word: "Volcano", meaning: "Núi lửa", pronunciation: "/vɒlˈkeɪnəʊ/", example: "The volcano erupted yesterday.", subject: "English", grade_level: "8", type: "reading" },

    // Writing
    { word: "Experience", meaning: "Kinh nghiệm", pronunciation: "/ɪkˈspɪəriəns/", example: "He has a lot of experience.", subject: "English", grade_level: "9", type: "writing" },
    { word: "Success", meaning: "Sự thành công", pronunciation: "/səkˈses/", example: "Hard work leads to success.", subject: "English", grade_level: "10", type: "writing" }
];

db.serialize(() => {
    console.log('--- INITIALIZING VOCABULARY DATA ---');

    const stmt = db.prepare(`
    INSERT INTO vocabulary (word, meaning, pronunciation, example, subject, grade_level, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    sampleVocabulary.forEach(v => {
        stmt.run(v.word, v.meaning, v.pronunciation, v.example, v.subject, v.grade_level, v.type);
    });

    stmt.finalize();
    console.log(`✓ Added ${sampleVocabulary.length} vocabulary items.`);

    db.close();
});
