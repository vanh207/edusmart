const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const xlsx = require("xlsx");
const { Parser } = require("json2csv");
const csvParser = require("csv-parser");
require("dotenv").config();
const admin = require("./firebaseAdmin");
// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Google Generative AI initialization with multiple specialized keys
const aiConfigs = {
  chat: process.env.GEMINI_KEY_CHAT,
  proctoring: process.env.GEMINI_KEY_PROCTOR,
  content: process.env.GEMINI_KEY_CONTENT,
  explain: process.env.GEMINI_KEY_EXPLAIN,
  speaking: process.env.GEMINI_KEY_SPEAKING,
  pronunciation: process.env.GEMINI_KEY_PRONUNCIATION,
  writing: process.env.GEMINI_KEY_WRITING,
};

const aiInstances = {};
Object.keys(aiConfigs).forEach((feature) => {
  if (aiConfigs[feature]) {
    aiInstances[feature] = new GoogleGenerativeAI(aiConfigs[feature]);
  }
});

// Fallback for one-off/legacy initialization
const mainGenAI =
  aiInstances.chat ||
  aiInstances.content ||
  new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || "",
  );

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Handle room joining
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`📍 Socket ${socket.id} joined room: ${roomId}`);
  });

  // Handle monitoring sync from admin/teacher
  socket.on('monitoring-sync', ({ roomId, type, enabled, mode }) => {
    console.log(`📡 Broadcasting monitoring-sync to room ${roomId}:`, { type, enabled, mode });
    // Broadcast to all clients in the room EXCEPT the sender
    socket.to(roomId).emit('monitoring-sync', { type, enabled, mode });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// Security Middleware Imports
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');

// Rate limiting for login/register endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per windowMs
  message: 'Quá nhiều lần đăng nhập/đăng ký, vui lòng thử lại sau 15 phút',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute
  message: 'Quá nhiều requests, vui lòng thử lại sau',
  standardHeaders: true,
  legacyHeaders: false,
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// CRITICAL: Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === "your-secret-key-change-in-production") {
  console.error('❌ CRITICAL: JWT_SECRET must be set in production!');
  process.exit(1);
}

// Middleware
// Apply Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now (can enable later with proper config)
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// Apply XSS protection
app.use(xss());

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Serve static files from uploads and public directories
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Ping route for connectivity check
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// Health check endpoint for UptimeRobot (prevents Render free tier sleep)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Get all students in a class - WORKING VERSION (copied from test)
app.get("/api/classes/:classId/students", (req, res) => {
  const { classId } = req.params;
  console.log(`📚 [API] Fetching students for class ${classId}`);

  db.all(
    "SELECT id, username, full_name, email, avatar_url, class_id FROM users WHERE class_id = ? AND role = 'student' ORDER BY full_name ASC",
    [classId],
    (err, students) => {
      if (err) {
        console.error('❌ Error fetching students:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Found ${students?.length || 0} students`);
      res.json({ students: students || [] });
    }
  );
});

// TEST endpoint - Simple query without JOIN to debug
app.get("/api/classes/:classId/students-test", (req, res) => {
  const { classId } = req.params;
  console.log(`🧪 [TEST] Fetching students for class ${classId}`);

  // Simple query first
  db.all(
    "SELECT id, username, full_name, email, class_id, role FROM users WHERE class_id = ? AND role = 'student'",
    [classId],
    (err, students) => {
      if (err) {
        console.error('❌ TEST Error:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ TEST Found ${students?.length || 0} students`);
      res.json({ students, count: students?.length || 0 });
    }
  );
});

// Get all students in a class (for teachers/admins to manage grades)
app.get("/api/teacher/students/:classId", (req, res) => {
  const { classId } = req.params;

  console.log(`📚 [API] Fetching students for class ${classId}`);

  db.all(
    `SELECT 
      u.id, 
      u.username, 
      u.full_name, 
      u.email, 
      u.avatar_url,
      u.level,
      u.class_id,
      c.name as class_name,
      c.grade_level
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.class_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC`,
    [classId],
    (err, students) => {
      if (err) {
        console.error('❌ Error fetching students:', err);
        return res.status(500).json({ error: "Failed to fetch students" });
      }
      console.log(`✅ Found ${students?.length || 0} students in class ${classId}`);
      res.json(students || []);
    }
  );
});

// Duplicate removed - endpoint moved to top of file

app.get("/api", (req, res) => {
  res.json({ message: "LMS API Server is running", version: "1.0.0" });
});

// (Old initialization check removed in favor of standardized one above)

// Optimized AI Generation Helper with Feature-based Key Mapping
async function generateWithAI(prompt, imagePart = null, feature = "content") {
  const modelsToTry = [
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-exp",
    "models/gemini-flash-latest",
    "models/gemini-pro-latest",
  ];

  // Select the appropriate AI instance based on feature
  const genAI = aiInstances[feature] || mainGenAI;

  let lastQuotaError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(
        `[AI-${feature.toUpperCase()}] Trying Model: ${modelName}...`,
      );
      const model = genAI.getGenerativeModel({ model: modelName });

      const payload = imagePart ? [prompt, imagePart] : [prompt];
      const result = await model.generateContent(payload);

      console.log(
        `[AI-${feature.toUpperCase()}] Sent request to ${modelName}, waiting for response...`,
      );
      const response = await result.response;
      const text = response.text();
      console.log(
        `[AI-${feature.toUpperCase()}] Response received from ${modelName}. Length: ${text?.length || 0}`,
      );

      if (text) {
        console.log(`[AI-${feature.toUpperCase()}] Success with ${modelName}`);
        return text;
      }
    } catch (error) {
      const errorMsg = error.message || "";
      console.error(
        `[AI-${feature.toUpperCase()}] Model ${modelName} failed: ${errorMsg}`,
      );

      if (
        errorMsg.includes("429") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("limit")
      ) {
        lastQuotaError = `Google AI (${feature}) đang quá tải lượt truy cập. Vui lòng thử lại sau giây lát.`;
      }
      continue;
    }
  }
  throw new Error(
    lastQuotaError ||
    `Tất cả các mô hình AI cho tính năng ${feature} hiện đang bận. Vui lòng thử lại sau.`,
  );
}

// Initialize Database
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database at:", dbPath);
  }
});

// Helper for safe database migrations
// Helper for safe database migrations
function addColumnIfNotExists(table, column, definition, callback) {
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) {
      console.error(`Error checking table ${table}:`, err);
      if (callback) callback(err);
      return;
    }
    const exists = rows.some((row) => row.name === column);
    if (!exists) {
      db.run(
        `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
        (err) => {
          if (err) {
            console.error(`Error adding column ${column} to ${table}:`, err);
          } else {
            console.log(`Column ${column} added to ${table} successfully.`);
          }
          if (callback) callback(err);
        },
      );
    } else if (callback) {
      callback();
    }
  });
}

// (initializeViolationTable moved to main db.serialize block)
// (addColumnIfNotExists "users" "firebase_uid" moved into serialize block)

// Activity logging helper
function logActivity(userId, username, action, details, schoolId = null) {
  db.run(
    "INSERT INTO activity_logs (user_id, username, action, details, school_id) VALUES (?, ?, ?, ?, ?)",
    [userId, username, action, details || null, schoolId],
    (err) => {
      if (err) console.error("Logging Error:", err.message);
    },
  );
}

// Helper: Normalize school and class names to UPPERCASE
function normalizeSchoolData(data) {
  return {
    school_name: data.school_name ? data.school_name.trim().toUpperCase() : null,
    class_name: data.class_name ? data.class_name.trim().toUpperCase() : null
  };
}

// Helper: Find school_id by school name (case-insensitive)
function findSchoolIdByName(schoolName, callback) {
  if (!schoolName || typeof schoolName !== 'string') {
    return callback(null, null);
  }

  const normalizedName = schoolName.trim().toUpperCase();

  if (!normalizedName) {
    return callback(null, null);
  }

  db.get(
    'SELECT id, name FROM schools WHERE UPPER(TRIM(name)) = ?',
    [normalizedName],
    (err, school) => {
      if (err) {
        console.error('Error finding school by name:', err);
        return callback(err, null);
      }

      if (school) {
        console.log(`✓ Found school: "${school.name}" (ID: ${school.id})`);
        return callback(null, school.id);
      } else {
        console.log(`⚠️ School not found: "${schoolName}" → school_id = NULL`);
        return callback(null, null);
      }
    }
  );
}


// Achievement Trigger Helper
const checkAchievements = async (userId) => {
  return new Promise((resolve) => {
    db.get("SELECT points, study_streak FROM users WHERE id = ?", [userId], async (err, user) => {
      if (err || !user) return resolve();

      db.all("SELECT * FROM achievements", [], async (err, achievements) => {
        if (err || !achievements) return resolve();

        for (const ach of achievements) {
          let earned = false;
          if (ach.requirement_type === 'total_points' && user.points >= ach.requirement_value) {
            earned = true;
          } else if (ach.requirement_type === 'streak' && user.study_streak >= ach.requirement_value) {
            earned = true;
          }

          if (earned) {
            // Check if already earned
            const alreadyEarned = await new Promise((res) => {
              db.get("SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?", [userId, ach.id], (err, row) => res(!!row));
            });

            if (!alreadyEarned) {
              db.run("INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)", [userId, ach.id], (err) => {
                if (!err) {
                  sendNotification(userId, "Thành tựu mới! 🏆", `Bạn đã đạt được huy hiệu: ${ach.title}`, "success");
                  io.emit('achievement-earned', { userId, achievement: ach });
                }
              });
            }
          }
        }
        resolve();
      });
    });
  });
};

// Notification helper
const sendNotification = (userId, title, message, type = "info", link = null) => {
  db.run(
    "INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)",
    [userId, title, message, type, link],
    (err) => {
      if (err) console.error("Notification Error:", err.message);
    },
  );
}

// Group notification helper (sends to all students in a grade level)
function sendGroupNotification(
  gradeLevel,
  title,
  message,
  type = "info",
  link = null,
) {
  const query = gradeLevel
    ? 'SELECT id FROM users WHERE grade_level = ? AND role = "student"'
    : 'SELECT id FROM users WHERE role = "student"';
  const params = gradeLevel ? [gradeLevel] : [];

  db.all(query, params, (err, users) => {
    if (err) {
      console.error("Group Notification Error (Query):", err.message);
      return;
    }
    if (!users || users.length === 0) return;

    users.forEach((user) => {
      sendNotification(user.id, title, message, type, link);
    });
  });
}

// Gamification: Badge Awarding Helper
function checkAndAwardBadges(userId) {
  db.serialize(() => {
    // 1. Get user statistics
    db.get(
      `
      SELECT 
        (SELECT COUNT(*) FROM test_results WHERE user_id = ?) as test_count,
        (SELECT COUNT(*) FROM test_results WHERE user_id = ? AND score = total_score) as perfect_scores,
        points, study_streak
      FROM users WHERE id = ?
    `,
      [userId, userId, userId],
      (err, stats) => {
        if (err || !stats) return;

        // 2. Get all badges to check
        db.all("SELECT * FROM badges", (err, badges) => {
          if (err || !badges) return;

          badges.forEach((badge) => {
            let meetsCriteria = false;
            switch (badge.criteria_type) {
              case "points":
                meetsCriteria = stats.points >= badge.criteria_value;
                break;
              case "streak":
                meetsCriteria = stats.study_streak >= badge.criteria_value;
                break;
              case "test_count":
                meetsCriteria = stats.test_count >= badge.criteria_value;
                break;
              case "perfect_score":
                meetsCriteria = stats.perfect_scores >= badge.criteria_value;
                break;
            }

            if (meetsCriteria) {
              db.run(
                "INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)",
                [userId, badge.id],
                function (err) {
                  if (!err && this.changes > 0) {
                    // New badge awarded! Send notification
                    sendNotification(
                      userId,
                      "Thành tựu mới! 🎖️",
                      `Chúc mừng! Bạn đã nhận được huy hiệu: ${badge.name}`,
                      "success",
                      "/profile",
                    );
                    logActivity(
                      userId,
                      "Hệ thống",
                      "Nhận huy hiệu",
                      `Nhận huy hiệu: ${badge.name}`,
                    );
                  }
                },
              );
            }
          });
        });
      },
    );
  });
}

// Auto-assign student to class by exact class name match
function autoAssignStudentToClass(userId, callback) {
  db.get(
    'SELECT school_id, grade_level, class_name, role FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err || !user || user.role !== 'student') {
        return callback && callback(err);
      }

      if (!user.class_name || !user.school_id || !user.grade_level) {
        console.log(`User ${userId} missing class_name/school/grade, skipping auto-assign`);
        return callback && callback(null);
      }

      // Find exact class match
      db.get(
        `SELECT id FROM classes 
         WHERE name = ? AND school_id = ? AND grade_level = ?
         LIMIT 1`,
        [user.class_name, user.school_id, user.grade_level],
        (err, targetClass) => {
          if (err) return callback && callback(err);

          if (!targetClass) {
            console.log(`⚠️ No class found: "${user.class_name}" (school: ${user.school_id}, grade: ${user.grade_level})`);
            return callback && callback(null);
          }

          // Assign student to class (update both class_id and current_class_id)
          db.run(
            'UPDATE users SET class_id = ?, current_class_id = ? WHERE id = ?',
            [targetClass.id, targetClass.id, userId],
            (err) => {
              if (!err) {
                console.log(`✓ User ${userId} auto-assigned to class ${targetClass.id} (${user.class_name})`);
              }
              callback && callback(err);
            }
          );

        }
      );
    }
  );
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log(`Auth Failed: No token for ${req.path}`);
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(`Auth Failed: Token error for ${req.path}:`, err.message);
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Fetch full user data
    db.get(
      "SELECT id, username, role, is_full_access, is_super_admin, school_id FROM users WHERE id = ?",
      [decoded.id],
      (err, user) => {
        if (err || !user) {
          req.user = decoded;
        } else {
          req.user = user;
        }
        next();
      },
    );
  });
};

// School Isolation Middleware - Ensures users only see data from their school
const enforceSchoolIsolation = (req, res, next) => {
  // Super admin can see all schools
  if (req.user && req.user.is_super_admin === 1) {
    req.schoolId = null; // NULL = see all schools
    return next();
  }

  // Check if user has school_id
  if (!req.user || !req.user.school_id) {
    return res.status(403).json({
      error: 'Tài khoản chưa được gán vào trường học nào. Vui lòng liên hệ quản trị viên.'
    });
  }

  // Attach school_id to request for filtering
  req.schoolId = req.user.school_id;
  next();
};

// Create uploads directory & perform startup cleanup
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
} else {
  // Startup Cleanup: Clear 'general' folder (Requirement: "clear on web close/restart")
  const generalDir = path.join(uploadsDir, "general");
  if (fs.existsSync(generalDir)) {
    fs.readdir(generalDir, (err, files) => {
      if (err || !files) return;
      files.forEach((file) => {
        const filePath = path.join(generalDir, file);
        fs.unlink(filePath, (e) => {
          if (e) console.log("Startup cleanup (general) failed for:", file);
        });
      });
      console.log("Startup: General uploads directory cleared.");
    });
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let type = req.body.type || "general";
    if (file.fieldname === "avatar") type = "avatars";
    if (
      file.fieldname === "evidence" ||
      file.fieldname === "screenshot" ||
      req.path.includes("violation")
    ) {
      type = "violations";
    }
    // Added specific check for lessons route
    if (req.path.includes("lessons")) {
      type = "lessons";
    }
    if (req.path.includes("questions")) {
      type = "questions";
    }
    if (req.path.includes("feedback")) {
      type = "feedback";
    }
    const dir = path.join(uploadsDir, type);

    // Ensure directory exists with extra safety
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error(`FATAL: Failed to create upload directory: ${dir}`, e);
        return cb(e);
      }
    }

    console.log(`MULTER: Saving ${file.fieldname} to /uploads/${type}`);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|mp3|wav|m4a)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

// (Exercise max_attempts migration moved into main db.serialize block)

// Tests table
db.serialize(() => {
  // Grades table initialization with multi-tenancy and teacher tracking
  db.run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    semester INTEGER NOT NULL,
    year TEXT NOT NULL,
    grade_type TEXT NOT NULL,
    score REAL NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(class_id) REFERENCES classes(id),
    FOREIGN KEY(school_id) REFERENCES schools(id),
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists("grades", "school_id", "INTEGER");
  addColumnIfNotExists("grades", "teacher_id", "INTEGER");
  addColumnIfNotExists("grades", "class_id", "INTEGER");
  addColumnIfNotExists("grades", "subject", "TEXT");
  addColumnIfNotExists("grades", "semester", "INTEGER");
  addColumnIfNotExists("grades", "year", "TEXT");
  addColumnIfNotExists("grades", "grade_type", "TEXT");
  addColumnIfNotExists("grades", "score", "REAL");
  addColumnIfNotExists("grades", "note", "TEXT");
  addColumnIfNotExists("grades", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  // Migration to rename school_year to year if it exists
  db.all("PRAGMA table_info(grades)", (err, columns) => {
    if (err) return;
    const hasSchoolYear = columns.some(c => c.name === 'school_year');
    const hasYear = columns.some(c => c.name === 'year');
    if (hasSchoolYear && !hasYear) {
      console.log('--- RE-NAMING school_year TO year IN grades TABLE ---');
      db.run("ALTER TABLE grades RENAME COLUMN school_year TO year", (err) => {
        if (err) console.error("Error renaming column:", err);
        else console.log("✓ Successfully renamed school_year to year");
      });
    }
  });

  // Database Self-Healing: Repair grades missing school_id
  db.run(`
    UPDATE grades 
    SET school_id = (SELECT school_id FROM users WHERE users.id = grades.student_id)
    WHERE school_id IS NULL OR school_id = 0
  `, (err) => {
    if (!err) console.log('✓ Database Check: Repaired grades with missing school_id');
  });

  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    grade_level TEXT,
    points INTEGER DEFAULT 0,
    is_super_admin INTEGER DEFAULT 0,
    school TEXT,
    birth_date TEXT,
    avatar_url TEXT,
    specialty TEXT,
    qualification TEXT,
    receive_notifications INTEGER DEFAULT 1,
    study_streak INTEGER DEFAULT 0,
    last_study_date DATETIME,
    last_activity DATETIME,
    is_full_access INTEGER DEFAULT 0,
    class_id INTEGER,
    current_class_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES classes(id),
    FOREIGN KEY(current_class_id) REFERENCES classes(id)
  )`);

  // Column migrations for users (only for columns NOT in CREATE TABLE)
  addColumnIfNotExists("users", "firebase_uid", "TEXT");
  addColumnIfNotExists("users", "class_name", "TEXT");
  addColumnIfNotExists("users", "school_id", "INTEGER");
  addColumnIfNotExists("users", "phone_number", "TEXT");
  addColumnIfNotExists("users", "gender", "TEXT");
  addColumnIfNotExists("users", "place_of_birth", "TEXT");
  addColumnIfNotExists("users", "province", "TEXT");
  addColumnIfNotExists("users", "district", "TEXT");
  addColumnIfNotExists("users", "ward", "TEXT");
  addColumnIfNotExists("users", "school_level", "TEXT");
  addColumnIfNotExists("users", "ip_address", "TEXT");


  // Migration for classes uniqueness (composite unique name + school_id)
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='classes'", [], (err, row) => {
    if (row && row.sql && row.sql.includes('name TEXT UNIQUE')) {
      console.log('--- MIGRATING CLASSES TABLE: REMOVING GLOBAL UNIQUE CONSTRAINT ---');
      db.all("PRAGMA table_info(classes)", (infoErr, columns) => {
        const hasSchoolId = columns.some(c => c.name === 'school_id');
        const sourceColumns = columns.map(c => c.name).filter(c => c !== 'id').join(', ');

        db.serialize(() => {
          db.run(`CREATE TABLE classes_migration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            grade_level TEXT NOT NULL,
            teacher_id INTEGER,
            schedule_start TEXT,
            schedule_end TEXT,
            schedule_days TEXT,
            study_monitoring_enabled INTEGER DEFAULT 0,
            test_monitoring_enabled INTEGER DEFAULT 0,
            social_monitoring_enabled INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            school_id INTEGER,
            UNIQUE(name, school_id)
          )`);

          db.run(`INSERT INTO classes_migration (${sourceColumns}${hasSchoolId ? '' : ', school_id'}) SELECT ${sourceColumns}${hasSchoolId ? '' : ', NULL'} FROM classes`);
          db.run('DROP TABLE classes');
          db.run('ALTER TABLE classes_migration RENAME TO classes');
          console.log('--- CLASSES MIGRATION COMPLETED ---');
        });
      });
    }
  });

  // Classes table
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    teacher_id INTEGER,
    schedule_start TEXT,
    schedule_end TEXT,
    schedule_days TEXT,
    study_monitoring_enabled INTEGER DEFAULT 0,
    test_monitoring_enabled INTEGER DEFAULT 0,
    social_monitoring_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    school_id INTEGER,
    FOREIGN KEY(teacher_id) REFERENCES users(id),
    UNIQUE(name, school_id)
  )`);

  // Force creation of teacher_id and other columns if they were skipped or missing
  addColumnIfNotExists("classes", "teacher_id", "INTEGER");
  addColumnIfNotExists("classes", "schedule_start", "TEXT");
  addColumnIfNotExists("classes", "schedule_end", "TEXT");
  addColumnIfNotExists("classes", "schedule_days", "TEXT");
  addColumnIfNotExists(
    "classes",
    "study_monitoring_enabled",
    "INTEGER DEFAULT 0",
  );
  addColumnIfNotExists(
    "classes",
    "test_monitoring_enabled",
    "INTEGER DEFAULT 0",
  );
  addColumnIfNotExists(
    "classes",
    "social_monitoring_enabled",
    "INTEGER DEFAULT 0",
  );

  // Ensure user_violations has metadata support
  db.run(`CREATE TABLE IF NOT EXISTS user_violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER,
    item_type TEXT, -- 'test', 'lesson', 'exercise', 'social_media'
    violation_type TEXT,
    evidence_url TEXT,
    metadata TEXT, -- JSON string for extra info like IP, reason
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  addColumnIfNotExists("user_violations", "metadata", "TEXT");
  addColumnIfNotExists("user_violations", "item_id", "INTEGER");
  addColumnIfNotExists("user_violations", "item_type", "TEXT");
  addColumnIfNotExists("user_violations", "ai_analysis", "TEXT");
  addColumnIfNotExists("user_violations", "ai_confidence", "INTEGER");
  addColumnIfNotExists("user_violations", "school_id", "INTEGER");

  // System Feedback table (for Super Admin)
  db.run(`CREATE TABLE IF NOT EXISTS system_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    school_id INTEGER,
    subject TEXT,
    message TEXT NOT NULL,
    image_url TEXT,
    ai_category TEXT,
    status TEXT DEFAULT 'pending', 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  addColumnIfNotExists("system_feedback", "image_url", "TEXT");
  addColumnIfNotExists("system_feedback", "ai_category", "TEXT");

  // Achievements system
  db.run(`CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    requirement_type TEXT, -- e.g., 'total_points', 'streak', 'lessons_completed'
    requirement_value INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
    achievement_id INTEGER,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(achievement_id) REFERENCES achievements(id)
  )`);

  // (Schools table definition moved to downstream administrative block)


  // System Announcements
  db.run(`CREATE TABLE IF NOT EXISTS announcements(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info', --info, success, warning, error
    target_role TEXT DEFAULT 'all', --all, student, teacher
    school_id INTEGER, --NULL for global, or specific school_id
    created_by INTEGER,
    expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS announcement_reads(
        user_id INTEGER,
        announcement_id INTEGER,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, announcement_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(announcement_id) REFERENCES announcements(id)
      )`);

  // (Exercise migrations handled below with addColumnIfNotExists)

  // Activity Logs table
  db.run(`CREATE TABLE IF NOT EXISTS activity_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        action TEXT NOT NULL,
        details TEXT,
        school_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

  addColumnIfNotExists("activity_logs", "school_id", "INTEGER");

  // OTP Verifications table
  db.run(`CREATE TABLE IF NOT EXISTS otp_verifications(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        otp TEXT NOT NULL,
        purpose TEXT NOT NULL,
        temp_data TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

  // Lessons table
  db.run(`CREATE TABLE IF NOT EXISTS lessons(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade_level TEXT NOT NULL,
        file_path TEXT,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

  // Vocabulary Progress table
  db.run(`CREATE TABLE IF NOT EXISTS vocabulary_progress(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        vocabulary_id INTEGER,
        type TEXT, -- 'reading' or 'writing'
    score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(vocabulary_id) REFERENCES vocabulary(id)
      )`);

  // Exercises table (enhanced schema)
  db.run(`CREATE TABLE IF NOT EXISTS exercises(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER,
        title TEXT,
        subject TEXT,
        grade_level TEXT,
        total_questions INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        description TEXT,
        duration INTEGER DEFAULT 30,
        max_attempts INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lesson_id) REFERENCES lessons(id)
      )`);

  // Migration for legacy exercises table (transition from single question to set)
  db.all("PRAGMA table_info(exercises)", (err, columns) => {
    if (err || !columns) return;
    const hasQuestion = columns.some((c) => c.name === "question");
    if (hasQuestion) {
      console.log(
        "Legacy 'question' column detected in 'exercises' table. Recreating table to unified schema...",
      );
      const hasTitle = columns.some((c) => c.name === "title");
      const hasOptions = columns.some((c) => c.name === "options");
      const hasCorrect = columns.some((c) => c.name === "correct_answer");
      const hasPoints = columns.some((c) => c.name === "points");

      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("ALTER TABLE exercises RENAME TO exercises_old");
        db.run(`CREATE TABLE exercises(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER,
        title TEXT,
        subject TEXT,
        grade_level TEXT,
        total_questions INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        description TEXT,
        duration INTEGER DEFAULT 30,
        max_attempts INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(lesson_id) REFERENCES lessons(id)
      )`);

        const hasSubject = columns.some((c) => c.name === "subject");
        const hasGrade = columns.some((c) => c.name === "grade_level");
        const hasQuestionsCount = columns.some(
          (c) => c.name === "total_questions",
        );
        const hasPointsCount = columns.some((c) => c.name === "total_points");

        // Copy basic data from old table
        db.run(`INSERT INTO exercises(id, lesson_id, title, subject, grade_level, total_questions, total_points) 
                SELECT id, lesson_id,
  ${hasTitle ? "COALESCE(title, 'Bài tập cũ')" : "'Bài tập cũ'"},
                ${hasSubject ? "subject" : "NULL"},
                ${hasGrade ? "grade_level" : "NULL"},
                ${hasQuestionsCount ? "total_questions" : "0"},
                ${hasPointsCount ? "total_points" : "0"}
                FROM exercises_old`);

        // Migrate the old single question to the new questions table
        db.run(`INSERT INTO exercise_questions(exercise_id, question, options, correct_answer, points, question_order)
                SELECT id, question, ${hasOptions ? "COALESCE(options, '[]')" : "'[]'"}, ${hasCorrect ? "COALESCE(correct_answer, '')" : "''"}, ${hasPoints ? "COALESCE(points, 10)" : "10"}, 0 
                FROM exercises_old WHERE question IS NOT NULL`);

        db.run("DROP TABLE exercises_old");
        db.run("COMMIT", (err) => {
          if (!err)
            console.log("Exercises table successfully migrated to new schema.");
          else console.error("Error migrating exercises table:", err);
        });
      });
    }
  });

  // Exercise questions table (multiple questions per exercise set)
  db.run(`CREATE TABLE IF NOT EXISTS exercise_questions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    type TEXT DEFAULT 'abcd',
    audio_url TEXT,
    question_order INTEGER DEFAULT 0,
    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
  )`);

  // User progress table
  db.run(`CREATE TABLE IF NOT EXISTS user_progress(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER,
    exercise_id INTEGER,
    completed BOOLEAN DEFAULT 0,
    score INTEGER DEFAULT 0,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    study_time INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(lesson_id) REFERENCES lessons(id),
    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
  )`);

  // (Simplified user_violations removed in favor of detailed one at L606)

  db.run(`CREATE TABLE IF NOT EXISTS vocabulary(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    pronunciation TEXT,
    example TEXT,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    type TEXT DEFAULT 'reading', -- 'reading' or 'writing'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration for settings table to support multi-tenancy
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'", [], (err, row) => {
    if (row && row.sql && !row.sql.includes('school_id')) {
      console.log('--- MIGRATING SETTINGS TABLE: ENABLING MULTI-TENANCY ---');
      db.serialize(() => {
        db.run('ALTER TABLE settings RENAME TO settings_old');
        db.run(`CREATE TABLE settings(
    key TEXT,
    value TEXT NOT NULL,
    school_id INTEGER,
    PRIMARY KEY(key, school_id)
  )`);
        // Copy global settings as NULL school_id (defaults)
        db.run('INSERT INTO settings (key, value, school_id) SELECT key, value, NULL FROM settings_old');
        db.run('DROP TABLE settings_old');
        console.log('--- SETTINGS MIGRATION COMPLETED ---');
      });
    }
  });

  // Settings table for global configurations
  db.run(
    `CREATE TABLE IF NOT EXISTS settings(
    key TEXT,
    value TEXT NOT NULL,
    school_id INTEGER,
    PRIMARY KEY(key, school_id)
  )`,
    (err) => {
      if (!err) {
        // Seed default proctoring status if not exists (global defaults)
        db.run("INSERT OR IGNORE INTO settings (key, value, school_id) VALUES ('proctoring_enabled', '0', NULL)");
        db.run("INSERT OR IGNORE INTO settings (key, value, school_id) VALUES ('social_monitoring_enabled', '0', NULL)");
        db.run("INSERT OR IGNORE INTO settings (key, value, school_id) VALUES ('test_monitoring_enabled', '0', NULL)");
      }
    },
  );

  // Notifications table
  db.run(`CREATE TABLE IF NOT EXISTS notifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, --NULL means global notification
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Leaderboard view
  db.run(`DROP VIEW IF EXISTS leaderboard`);
  db.run(`CREATE VIEW leaderboard AS
SELECT
u.id,
  u.username,
  u.full_name,
  u.grade_level,
  u.avatar_url,
  u.study_streak,
  u.school_id,
  COALESCE(SUM(up.score), 0) + u.points as total_points,
  COUNT(DISTINCT up.lesson_id) as lessons_completed
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY total_points DESC
  `);

  // Add columns if they don't exist (migrations)
  addColumnIfNotExists("users", "is_super_admin", "INTEGER DEFAULT 0");
  addColumnIfNotExists("users", "is_proctoring_enabled", "INTEGER DEFAULT 0");
  addColumnIfNotExists("users", "receive_notifications", "INTEGER DEFAULT 1");
  addColumnIfNotExists("lessons", "file_path", "TEXT");
  addColumnIfNotExists("exercises", "max_attempts", "INTEGER DEFAULT 0");
  addColumnIfNotExists("tests", "max_attempts", "INTEGER DEFAULT 0");
  addColumnIfNotExists("user_progress", "points", "INTEGER DEFAULT 0");
  addColumnIfNotExists("test_results", "points", "INTEGER DEFAULT 0");
  addColumnIfNotExists("users", "last_activity", "DATETIME");
  addColumnIfNotExists("lessons", "file_type", "TEXT");
  addColumnIfNotExists("lessons", "ai_proctoring", "INTEGER DEFAULT 0");
  addColumnIfNotExists("lessons", "material_type", "TEXT");
  addColumnIfNotExists("lessons", "material_link", "TEXT");
  addColumnIfNotExists("exercises", "file_path", "TEXT");
  addColumnIfNotExists("exercises", "file_type", "TEXT");
  // Migration for additional columns if tables already exist
  addColumnIfNotExists("vocabulary", "type", "TEXT DEFAULT 'reading'");
  // Remove old vocabulary file_path/file_type migrations if they exist, as the table definition changed
  // db.run(`ALTER TABLE vocabulary ADD COLUMN file_path TEXT`, (err) => { });
  // db.run(`ALTER TABLE vocabulary ADD COLUMN file_type TEXT`, (err) => { });
  // Additional migrations for other tables
  addColumnIfNotExists("exercises", "max_attempts", "INTEGER DEFAULT 0");
  addColumnIfNotExists("exercise_questions", "audio_url", "TEXT");
  addColumnIfNotExists("test_results", "start_time", "DATETIME");
  addColumnIfNotExists("test_results", "answers", "TEXT");
  addColumnIfNotExists("test_results", "file_url", "TEXT");
  addColumnIfNotExists("user_progress", "start_time", "DATETIME");
  addColumnIfNotExists("user_progress", "answers", "TEXT");
  addColumnIfNotExists("user_progress", "file_url", "TEXT");


  // Add school_id to all content tables for multi-tenancy
  addColumnIfNotExists("classes", "school_id", "INTEGER");
  addColumnIfNotExists("lessons", "school_id", "INTEGER");
  addColumnIfNotExists("tests", "school_id", "INTEGER");
  addColumnIfNotExists("exercises", "school_id", "INTEGER");
  addColumnIfNotExists("learning_paths", "school_id", "INTEGER");
  addColumnIfNotExists("vocabulary", "school_id", "INTEGER");

  // (user_violations moved to top of block)

  // Migration for vocabulary consistency
  db.run(
    "UPDATE vocabulary SET subject = 'anh' WHERE subject = 'english' OR subject = 'Tiếng Anh' OR subject = 'English'",
  );
  db.run(
    "UPDATE vocabulary SET type = 'speaking' WHERE type = 'reading' OR type IS NULL OR type = '' OR type NOT IN ('speaking', 'writing')",
  );
  // Ensure pronunciation column exists
  addColumnIfNotExists("vocabulary", "pronunciation", "TEXT");

  // Create default users AFTER migration
  const adminPassword = bcrypt.hashSync("admin123", 10);
  db.run(
    `INSERT OR IGNORE INTO users(username, password, full_name, role, is_super_admin)
VALUES('admin', ?, 'Super Administrator', 'admin', 1)`,
    [adminPassword],
  );

  const studentPassword = bcrypt.hashSync("student123", 10);
  db.run(
    `INSERT OR IGNORE INTO users(username, password, full_name, role, grade_level)
VALUES('student', ?, 'Student Test', 'student', 'thcs_6')`,
    [studentPassword],
  );

  // Tests/Exams table
  db.run(`CREATE TABLE IF NOT EXISTS tests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  total_questions INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 100,
  ai_proctoring INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
)`);

  // Test questions table
  db.run(`CREATE TABLE IF NOT EXISTS test_questions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  audio_url TEXT,
  question_order INTEGER DEFAULT 0,
  FOREIGN KEY(test_id) REFERENCES tests(id)
)`);

  // Test results table
  db.run(`CREATE TABLE IF NOT EXISTS test_results(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  percentage REAL DEFAULT 0,
  time_taken INTEGER DEFAULT 0,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(test_id) REFERENCES tests(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

  // Learning paths table
  db.run(`CREATE TABLE IF NOT EXISTS learning_paths(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  grade_level TEXT NOT NULL,
  subject TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

  // Learning path steps table
  db.run(`CREATE TABLE IF NOT EXISTS learning_path_steps(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path_id INTEGER NOT NULL,
  lesson_id INTEGER,
  step_order INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  FOREIGN KEY(path_id) REFERENCES learning_paths(id),
  FOREIGN KEY(lesson_id) REFERENCES lessons(id)
)`);

  // Learning path progress table
  // Smart Notes (Sổ tay sửa lỗi) table
  db.run(`CREATE TABLE IF NOT EXISTS smart_notes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- 'test', 'exercise'
    item_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  ai_explanation TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'mastered'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);
  // Gamification: Badges table
  db.run(`CREATE TABLE IF NOT EXISTS badges(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  criteria_type TEXT NOT NULL, -- 'points', 'streak', 'test_count', 'perfect_score'
    criteria_value INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

  // User badges table
  db.run(`CREATE TABLE IF NOT EXISTS user_badges(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(badge_id) REFERENCES badges(id),
  UNIQUE(user_id, badge_id)
)`);

  // Store items table (for skin/points exchange)
  db.run(`CREATE TABLE IF NOT EXISTS store_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'theme', 'avatar', 'power_up'
    metadata TEXT, --JSON string for extra properties
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default badges if empty
  db.get("SELECT COUNT(*) as count FROM badges", (err, row) => {
    if (row && row.count === 0) {
      const initialBadges = [
        [
          "Người mới bắt đầu",
          "🌱",
          "Hoàn thành bài thi đầu tiên",
          "test_count",
          1,
        ],
        ["Chăm chỉ", "📚", "Đạt chuỗi học tập 7 ngày", "streak", 7],
        ["Thiên tài", "🧠", "Đạt 100 điểm trong 5 bài thi", "perfect_score", 5],
        ["Vô địch điểm số", "🏆", "Tích lũy tổng 1000 điểm", "points", 1000],
      ];
      initialBadges.forEach((b) => {
        db.run(
          "INSERT INTO badges (name, icon, description, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?)",
          b,
        );
      });
    }
  });

  // OTP verifications table
  db.run(`CREATE TABLE IF NOT EXISTS otp_verifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL, --email or phone or username
    otp TEXT NOT NULL,
    temp_data TEXT, --JSON string for registration data
    purpose TEXT NOT NULL, -- 'register', 'reset_password'
    expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Administrative Divisions Tables
  db.run(`CREATE TABLE IF NOT EXISTS provinces(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS districts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(province_id) REFERENCES provinces(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wards(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(district_id) REFERENCES districts(id)
  )`);

  db.run(
    `CREATE TABLE IF NOT EXISTS schools(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    levels TEXT,
    province TEXT,
    district TEXT,
    district_id INTEGER,
    ward TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(district_id) REFERENCES districts(id)
  )`);

  // Extra column check for schools (for robustness)
  addColumnIfNotExists("schools", "levels", "TEXT");
  addColumnIfNotExists("schools", "province", "TEXT");
  addColumnIfNotExists("schools", "district", "TEXT");
  addColumnIfNotExists("schools", "district_id", "INTEGER");
  addColumnIfNotExists("schools", "ward", "TEXT");
  addColumnIfNotExists("schools", "address", "TEXT");
  addColumnIfNotExists("schools", "is_deleted", "INTEGER DEFAULT 0");


  // Simple Seeding for Administrative Data
  db.get("SELECT COUNT(*) as count FROM provinces", (err, row) => {
    if (row && row.count === 0) {
      // Hanoi
      db.run("INSERT INTO provinces (name) VALUES ('Hà Nội')", function () {
        const hnId = this.lastID;
        db.run(
          "INSERT INTO districts (province_id, name) VALUES (?, ?)",
          [hnId, "Quận Ba Đình"],
          function () {
            const dId = this.lastID;
            db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
              dId,
              "Phường Phúc Xá",
            ]);
            db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
              dId,
              "Phường Trúc Bạch",
            ]);
            db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
              dId,
              "THPT Phan Đình Phùng",
            ]);
            db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
              dId,
              "THCS Nguyễn Trãi",
            ]);
          },
        );
        db.run(
          "INSERT INTO districts (province_id, name) VALUES (?, ?)",
          [hnId, "Quận Cầu Giấy"],
          function () {
            const dId = this.lastID;
            db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
              dId,
              "Phường Dịch Vọng",
            ]);
            db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
              dId,
              "Phường Mai Dịch",
            ]);
            db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
              dId,
              "Đại học Quốc gia Hà Nội",
            ]);
            db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
              dId,
              "THPT Cầu Giấy",
            ]);
          },
        );
      });
      // TP HCM
      db.run(
        "INSERT INTO provinces (name) VALUES ('TP. Hồ Chí Minh')",
        function () {
          const hcmId = this.lastID;
          db.run(
            "INSERT INTO districts (province_id, name) VALUES (?, ?)",
            [hcmId, "Quận 1"],
            function () {
              const dId = this.lastID;
              db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
                dId,
                "Phường Bến Nghé",
              ]);
              db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
                dId,
                "Phường Đa Kao",
              ]);
              db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
                dId,
                "Đại học KHXH&NV TP.HCM",
              ]);
            },
          );
          db.run(
            "INSERT INTO districts (province_id, name) VALUES (?, ?)",
            [hcmId, "Quận 3"],
            function () {
              const dId = this.lastID;
              db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
                dId,
                "Phường Võ Thị Sáu",
              ]);
              db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
                dId,
                "Đại học Kinh tế TP.HCM",
              ]);
            },
          );
        },
      );
      // Da Nang
      db.run("INSERT INTO provinces (name) VALUES ('Đà Nẵng')", function () {
        const dnId = this.lastID;
        db.run(
          "INSERT INTO districts (province_id, name) VALUES (?, ?)",
          [dnId, "Quận Hải Châu"],
          function () {
            const dId = this.lastID;
            db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
              dId,
              "Phường Thạch Thang",
            ]);
            db.run("INSERT INTO schools (district_id, name) VALUES (?, ?)", [
              dId,
              "THPT Phan Châu Trinh",
            ]);
          },
        );
        db.run(
          "INSERT INTO districts (province_id, name) VALUES (?, ?)",
          [dnId, "Quận Thanh Khê"],
          function () {
            db.run("INSERT INTO wards (district_id, name) VALUES (?, ?)", [
              this.lastID,
              "Phường Hòa Khê",
            ]);
          },
        );
      });
    }
  });

  // Test violations table
  db.run(`CREATE TABLE IF NOT EXISTS test_violations(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    violation_type TEXT NOT NULL,
    screenshot TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    extra_info TEXT,
    FOREIGN KEY(test_id) REFERENCES tests(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Final Users Migrations and Server Startup
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err || !columns) return;
    const hasStreak = columns.some((c) => c.name === "study_streak");
    const hasLastDate = columns.some((c) => c.name === "last_study_date");
    const hasFullAccess = columns.some((c) => c.name === "is_full_access");
    if (!hasStreak)
      db.run("ALTER TABLE users ADD COLUMN study_streak INTEGER DEFAULT 0");
    if (!hasLastDate)
      db.run("ALTER TABLE users ADD COLUMN last_study_date DATETIME");
    if (!hasFullAccess)
      db.run("ALTER TABLE users ADD COLUMN is_full_access INTEGER DEFAULT 0");

    // Server will start at the end of file after all setup is complete

    // Start interval cleanup
    setInterval(performSystemCleanup, 300000);
  });
});

// Administrative Divisions APIs
app.get("/api/location/provinces", (req, res) => {
  db.all("SELECT * FROM provinces ORDER BY name", (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.get("/api/location/districts/:provinceId", (req, res) => {
  db.all(
    "SELECT * FROM districts WHERE province_id = ? ORDER BY name",
    [req.params.provinceId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.get("/api/location/wards/:districtId", (req, res) => {
  db.all(
    "SELECT * FROM wards WHERE district_id = ? ORDER BY name",
    [req.params.districtId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.get("/api/location/schools/:districtId", (req, res) => {
  db.all(
    "SELECT * FROM schools WHERE district_id = ? ORDER BY name",
    [req.params.districtId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

// User Badges API
app.get("/api/user/badges", authenticateToken, (req, res) => {
  db.all(
    `
    SELECT b.*, ub.awarded_at 
    FROM badges b
    JOIN user_badges ub ON b.id = ub.badge_id
    WHERE ub.user_id = ?
    ORDER BY ub.awarded_at DESC
  `,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

// Analytics & Reports API
app.get("/api/user/analytics/radar", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    `
        SELECT t.subject, AVG(tr.percentage) as avg_score, COUNT(*) as count
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.user_id = ?
        GROUP BY t.subject
      `,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      // Map data to radar chart format
      const subjectMap = {
        toan: "Toán học",
        van: "Ngữ văn",
        anh: "Tiếng Anh",
        ly: "Vật lý",
        hoa: "Hóa học",
        sinh: "Sinh học",
      };

      const data = rows.map((row) => ({
        subject: subjectMap[row.subject] || row.subject,
        A: Math.round(row.avg_score),
        fullMark: 100,
      }));

      res.json(data);
    },
  );
});

app.get("/api/user/analytics/weekly", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  db.all(
    `
        SELECT date(completed_at) as day, COUNT(*) as count, AVG(percentage) as avg_score
        FROM test_results
        WHERE user_id = ? AND completed_at >= ?
        GROUP BY day
        ORDER BY day ASC
      `,
    [userId, sevenDaysAgo],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.get("/api/user/test-results", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    `
        SELECT tr.*, t.title as test_title, t.subject, t.grade_level
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.user_id = ?
        ORDER BY tr.completed_at DESC
      `,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

// Smart Notes API
app.get("/api/user/smart-notes", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    `
        SELECT sn.*, t.title as source_title
        FROM smart_notes sn
        LEFT JOIN tests t ON sn.item_id = t.id AND sn.item_type = 'test'
        WHERE sn.user_id = ?
        ORDER BY sn.created_at DESC
      `,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.patch("/api/user/smart-notes/:id", authenticateToken, (req, res) => {
  const { status } = req.body;
  db.run(
    "UPDATE smart_notes SET status = ? WHERE id = ? AND user_id = ?",
    [status, req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Status updated" });
    },
  );
});

app.delete("/api/user/smart-notes/:id", authenticateToken, (req, res) => {
  db.run(
    "DELETE FROM smart_notes WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) return res.status(404).json({ error: "Note not found" });
      res.json({ message: "Note deleted successfully" });
    },
  );
});
// Routes

// Authentication
app.post("/api/auth/login-firebase", async (req, res) => {
  try {
    if (!admin.isInitialized) {
      return res.status(500).json({ error: "Hệ thống chưa cấu hình Firebase. Vui lòng liên hệ Admin để thêm file serviceAccountKey.json." });
    }
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing ID Token" });

    // 1. Verify Firebase Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decodedToken;
    console.log(`[LOGIN-FIREBASE] Authenticating email: ${email}, uid: ${uid}`);

    // 2. Find user in SQLite by email
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (err) {
        console.error(`[LOGIN-FIREBASE] DB Error: ${err.message}`);
        return res.status(500).json({ error: "Database error" });
      }
      if (!user) {
        console.warn(`[LOGIN-FIREBASE] User not found for email: ${email}`);
        return res.status(404).json({ error: "Tài khoản chưa được đồng bộ. Vui lòng đăng ký lại." });
      }
      console.log(`[LOGIN-FIREBASE] User found: ${user.username} (ID: ${user.id})`);

      // Update school_id if null (Auto-assign to first school as fallback)
      if (!user.school_id) {
        console.log(`[LOGIN-FIREBASE] User ${user.id} has no school_id, auto-assigning to ID: 1`);
        db.run("UPDATE users SET school_id = 1 WHERE id = ?", [user.id]);
        user.school_id = 1;
      }

      // 3. Generate Project JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          school_id: user.school_id,
          is_super_admin: user.is_super_admin || 0
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          grade_level: user.grade_level,
          school_id: user.school_id,
          is_super_admin: user.is_super_admin || 0,
          created_at: user.created_at
        }
      });
    });
  } catch (error) {
    console.error("Firebase Login Error:", error);
    res.status(401).json({ error: "Xác thực Firebase thất bại: " + error.message });
  }
});

app.post("/api/auth/register-firebase", async (req, res) => {
  try {
    if (!admin.isInitialized) {
      return res.status(500).json({ error: "Hệ thống chưa cấu hình Firebase. Vui lòng liên hệ Admin để thêm file serviceAccountKey.json." });
    }
    const { idToken, username, full_name, role, grade_level, gender, birth_date, province, district, ward, school, class_name } = req.body;

    if (!idToken) return res.status(400).json({ error: "Missing ID Token" });

    // 1. Verify Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decodedToken;

    // 2. Check if user already exists
    db.get("SELECT * FROM users WHERE email = ? OR username = ?", [email, username], (err, existing) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (existing) return res.status(400).json({ error: "Email hoặc Tên đăng nhập đã tồn tại" });

      // 3. Normalized School & Get School ID
      const normalizedSchool = school ? school.toString().trim().toUpperCase() : null;
      db.get("SELECT id FROM schools WHERE UPPER(name) = ? OR UPPER(name) LIKE ?", [normalizedSchool, `%${normalizedSchool}%`], (schoolErr, schoolRow) => {
        const schoolId = schoolRow ? schoolRow.id : null;

        // 4. Insert into SQLite
        db.run(
          "INSERT INTO users (username, password, full_name, email, grade_level, role, gender, birth_date, province, district, ward, school, school_id, class_name, firebase_uid, class_id, current_class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1), (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1))",
          [username, "FIREBASE_MANAGED", full_name, email, grade_level, "student", gender, birth_date, province, district, ward, normalizedSchool, schoolId, class_name, uid, class_name, schoolId, class_name, schoolId],
          function (regErr) {
            if (regErr) return res.status(500).json({ error: "Lưu dữ liệu thất bại: " + regErr.message });

            const token = jwt.sign(
              { id: this.lastID, username, role: "student", school_id: schoolId },
              JWT_SECRET,
              { expiresIn: "7d" }
            );

            res.json({
              token,
              user: {
                id: this.lastID,
                username,
                full_name,
                role: "student",
                grade_level,
                school_id: schoolId,
                created_at: new Date().toISOString()
              }
            });
          }
        );
      });
    });
  } catch (error) {
    console.error("Firebase Register Error:", error);
    res.status(401).json({ error: "Xác thực Firebase thất bại: " + error.message });
  }
});

// Authentication
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    db.get(
      "SELECT * FROM users WHERE (username = ? OR email = ?) AND role = ?",
      [username, username, role],
      async (err, user) => {
        if (err) {
          console.error("Database error in login:", err);
          return res
            .status(500)
            .json({ error: "Database error: " + err.message });
        }

        if (!user) {
          return res
            .status(401)
            .json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
        }

        try {
          const validPassword = await bcrypt.compare(password, user.password);
          if (!validPassword) {
            return res
              .status(401)
              .json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
          }

          const token = jwt.sign(
            {
              id: user.id,
              username: user.username,
              role: user.role,
              school_id: user.school_id,
              is_super_admin: user.is_super_admin || 0
            },
            JWT_SECRET,
            { expiresIn: "7d" },
          );

          // Update school_id if null (Auto-assign to first school as fallback)
          if (!user.school_id && user.role !== 'admin') {
            db.run("UPDATE users SET school_id = 1 WHERE id = ?", [user.id]);
            user.school_id = 1;
          }

          res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              full_name: user.full_name,
              role: user.role,
              grade_level: user.grade_level,
              points: user.points,
              school_id: user.school_id,
              is_super_admin: user.is_super_admin || 0,
              created_at: user.created_at
            },
          });
        } catch (bcryptErr) {
          console.error("Bcrypt error:", bcryptErr);
          return res.status(500).json({ error: "Lỗi xác thực mật khẩu" });
        }
      },
    );
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Lỗi server: " + error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      email,
      grade_level,
      gender,
      birth_date,
      place_of_birth,
      province,
      district,
      ward,
      school,
      school_level,
      class_name,
    } = req.body;

    if (!username || !password || !full_name) {
      return res
        .status(400)
        .json({ error: "Vui lòng điền đầy đủ thông tin bắt buộc" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const normalizedSchool = school ? school.toString().toUpperCase() : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sync school_id with school name if provided (Case-insensitive matching)
    db.get(
      "SELECT id FROM schools WHERE UPPER(name) = UPPER(?)",
      [normalizedSchool],
      (schoolErr, schoolRow) => {
        const schoolId = schoolRow ? schoolRow.id : null;

        db.run(
          "INSERT INTO users (username, password, full_name, email, grade_level, role, gender, birth_date, place_of_birth, province, district, ward, school, school_level, class_name, school_id, class_id, current_class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1), (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1))",
          [
            username,
            hashedPassword,
            full_name,
            email || null,
            grade_level || null,
            "student",
            gender || null,
            birth_date || null,
            place_of_birth || null,
            province || null,
            district || null,
            ward || null,
            normalizedSchool,
            school_level || null,
            class_name || null,
            schoolId,
            class_name, schoolId,
            class_name, schoolId
          ],
          function (err) {
            if (err) {
              console.error("Registration error:", err);
              if (err.message.includes("UNIQUE constraint")) {
                return res
                  .status(400)
                  .json({ error: "Tên đăng nhập đã tồn tại" });
              }
              return res
                .status(500)
                .json({ error: "Đăng ký thất bại: " + err.message });
            }

            const token = jwt.sign(
              {
                id: this.lastID,
                username,
                role: "student",
                school_id: schoolId,
                is_super_admin: 0
              },
              JWT_SECRET,
              { expiresIn: "7d" },
            );

            res.json({
              token,
              user: {
                id: this.lastID,
                username,
                full_name,
                role: "student",
                grade_level,
                gender,
                birth_date,
                place_of_birth,
                province,
                district,
                ward,
                school,
                school_level,
                class_name,
                school_id: schoolId,
                created_at: new Date().toISOString()
              },
            });

            // Real-time update for admins (Isolated by school)
            if (schoolId) {
              io.to(`school_${schoolId}`).emit("user-updated", {
                type: "register",
                userId: this.lastID,
                role: "student",
              });
            }
          },
        );
      },
    );
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Lỗi server: " + error.message });
  }
});

app.post("/api/auth/register-teacher", async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      email,
      specialty,
      qualification,
      birth_date,
      gender,
      place_of_birth,
      province,
      district,
      ward,
      school,
    } = req.body;

    if (!username || !password || !full_name) {
      return res
        .status(400)
        .json({ error: "Vui lòng điền đầy đủ thông tin bắt buộc" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const normalizedSchool = school ? school.toString().toUpperCase() : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sync school_id with school name if provided (Case-insensitive matching)
    db.get(
      "SELECT id FROM schools WHERE UPPER(name) = UPPER(?)",
      [normalizedSchool],
      (schoolErr, schoolRow) => {
        const schoolId = schoolRow ? schoolRow.id : null;

        db.run(
          "INSERT INTO users (username, password, full_name, email, role, specialty, qualification, birth_date, gender, place_of_birth, province, district, ward, school, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            username,
            hashedPassword,
            full_name,
            email || null,
            "teacher",
            specialty || null,
            qualification || null,
            birth_date || null,
            gender || null,
            place_of_birth || null,
            province || null,
            district || null,
            ward || null,
            normalizedSchool,
            schoolId,
          ],
          function (err) {
            if (err) {
              console.error("Teacher registration error:", err);
              if (err.message.includes("UNIQUE constraint")) {
                return res
                  .status(400)
                  .json({ error: "Tên đăng nhập đã tồn tại" });
              }
              return res
                .status(500)
                .json({ error: "Đăng ký thất bại: " + err.message });
            }

            const token = jwt.sign(
              {
                id: this.lastID,
                username,
                role: "teacher",
                school_id: schoolId,
                is_super_admin: 0
              },
              JWT_SECRET,
              { expiresIn: "7d" },
            );

            res.json({
              token,
              user: {
                id: this.lastID,
                username,
                full_name,
                role: "teacher",
                specialty,
                qualification,
                birth_date,
                gender,
                place_of_birth,
                province,
                district,
                ward,
                school,
                created_at: new Date().toISOString()
              },
            });
          },
        );
      },
    );
  } catch (error) {
    console.error("Teacher Register error:", error);
    res.status(500).json({ error: "Lỗi server: " + error.message });
  }
});

app.post("/api/auth/request-otp", async (req, res) => {
  const { identifier, username, type, purpose } = req.body; // identifier is email/phone, type is 'email' or 'phone'

  if (!identifier || !purpose) {
    return res.status(400).json({ error: "Thiếu thông tin yêu cầu" });
  }

  // If purpose is reset, check if user exists
  if (purpose === "reset_password") {
    if (!username || !identifier)
      return res
        .status(400)
        .json({ error: "Cần cả tên đăng nhập và email/SĐT để đổi mật khẩu" });
    db.get(
      "SELECT * FROM users WHERE username = ? AND (email = ? OR phone_number = ?)",
      [username, identifier, identifier],
      (err, user) => {
        if (err || !user)
          return res
            .status(404)
            .json({
              error:
                "Thông tin tài khoản không khớp. Vui lòng kiểm tra lại tên đăng nhập và email/SĐT.",
            });
        sendOTPAndSave(identifier, purpose, null, res);
      },
    );
  } else {
    // Purpose is register
    sendOTPAndSave(identifier, purpose, req.body.temp_data, res);
  }
});

function sendOTPAndSave(identifier, purpose, tempData, res) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

  db.run(
    "INSERT INTO otp_verifications (identifier, otp, purpose, expires_at, temp_data) VALUES (?, ?, ?, ?, ?)",
    [
      identifier,
      otp,
      purpose,
      expiresAt.toISOString(),
      tempData ? JSON.stringify(tempData) : null,
    ],
    (err) => {
      if (err) return res.status(500).json({ error: "Lỗi server khi tạo OTP" });

      // [DEVELOPER FALLBACK] Print OTP to terminal so development can continue without working SMTP
      console.log("------------------------------------------");
      console.log(`[AUTH] OTP CODE FOR ${identifier}: ${otp}`);
      console.log(`[AUTH] Purpose: ${purpose}`);
      console.log("------------------------------------------");

      // In a real app, send actual email/SMS here.
      const mailOptions = {
        from: `"Hệ thống LMS" <${process.env.SMTP_USER}>`,
        to: identifier,
        subject: `Mã OTP xác thực ${purpose === "reset_password" ? "đặt lại mật khẩu" : "đăng ký"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2e7d32; text-align: center;">Mã Xác Thực OTP</h2>
            <p>Chào bạn,</p>
            <p>Bạn vừa yêu cầu mã xác thực cho mục đích: <strong>${purpose === "reset_password" ? "Đặt lại mật khẩu" : "Đăng ký tài khoản"}</strong>.</p>
            <div style="background-color: #f1f8e9; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1b5e20;">${otp}</span>
            </div>
            <p>Mã này có hiệu lực trong vòng <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
            <p style="font-size: 12px; color: #757575; text-align: center;">Đây là email tự động, vui lòng không phản hồi email này.</p>
          </div>
        `,
      };

      transporter.sendMail(mailOptions, (mailErr, info) => {
        if (mailErr) {
          console.error("Error sending OTP email:", mailErr);
          // Return the specific error message to help the user troubleshoot
          return res
            .status(500)
            .json({
              error:
                "Không thể gửi email OTP. " +
                (mailErr.message.includes("535") ? "Lỗi xác thực Gmail (535). " : "") +
                "Ghi chú: Nếu bạn là nhà phát triển, hãy kiểm tra terminal của server để lấy mã OTP.",
              details: mailErr.message
            });
        }
        console.log(`[OTP] Email sent to ${identifier}: ${otp}`);
        res.json({
          message: "Mã OTP đã được gửi về email của bạn!",
          identifier,
        });
      });
    },
  );
}

app.post("/api/auth/verify-otp", async (req, res) => {
  const { identifier, otp, purpose, new_password } = req.body;

  db.get(
    "SELECT * FROM otp_verifications WHERE identifier = ? AND otp = ? AND purpose = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    [identifier, otp, purpose, new Date().toISOString()],
    async (err, verification) => {
      if (err || !verification) {
        return res
          .status(400)
          .json({ error: "Mã OTP không hợp lệ hoặc đã hết hạn" });
      }

      if (purpose === "reset_password") {
        if (!new_password)
          return res.status(400).json({ error: "Vui lòng nhập mật khẩu mới" });
        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.run(
          "UPDATE users SET password = ? WHERE email = ? OR phone_number = ?",
          [hashedPassword, identifier, identifier],
          (updateErr) => {
            if (updateErr)
              return res
                .status(500)
                .json({ error: "Lỗi khi cập nhật mật khẩu" });
            res.json({ message: "Cập nhật mật khẩu thành công!" });
          },
        );
      } else if (purpose === "register") {
        const data = JSON.parse(verification.temp_data);
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const normalizedSchool = data.school
          ? data.school.toString().toUpperCase()
          : null;

        // Sync school_id with school name if provided (Case-insensitive matching)
        db.get(
          "SELECT id FROM schools WHERE UPPER(name) = ? OR UPPER(name) LIKE ? ORDER BY CASE WHEN UPPER(name) = ? THEN 0 ELSE 1 END LIMIT 1",
          [normalizedSchool, `%${normalizedSchool}%`, normalizedSchool],
          (schoolErr, schoolRow) => {
            const schoolId = schoolRow ? schoolRow.id : null;

            db.run(
              "INSERT INTO users (username, password, full_name, email, grade_level, role, phone_number, gender, birth_date, place_of_birth, province, district, ward, school, school_level, class_name, class_id, current_class_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1)), COALESCE(?, (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1)), ?)",
              [
                data.username,
                hashedPassword,
                data.full_name,
                data.email || null,
                data.grade_level || null,
                "student",
                data.phone_number || null,
                data.gender || null,
                data.birth_date || null,
                data.place_of_birth || null,
                data.province || null,
                data.district || null,
                data.ward || null,
                normalizedSchool,
                data.school_level || null,
                data.class_name || null,
                data.class_id || null, data.class_name, schoolId,
                data.current_class_id || data.class_id || null, data.class_name, schoolId,
                schoolId,
              ],
              function (regErr) {
                if (regErr) {
                  console.error("OTP Registration error:", regErr);
                  return res
                    .status(500)
                    .json({ error: "Đăng ký thất bại: " + regErr.message });
                }

                const token = jwt.sign(
                  {
                    id: this.lastID,
                    username: data.username,
                    role: "student",
                    school_id: schoolId,
                    is_super_admin: 0
                  },
                  JWT_SECRET,
                  { expiresIn: "7d" },
                );

                res.json({
                  message: "Đăng ký thành công!",
                  token,
                  user: {
                    id: this.lastID,
                    username: data.username,
                    full_name: data.full_name,
                    role: "student",
                    grade_level: data.grade_level,
                    gender: data.gender,
                    birth_date: data.birth_date,
                    place_of_birth: data.place_of_birth,
                    province: data.province,
                    district: data.district,
                    ward: data.ward,
                    school: data.school,
                    school_level: data.school_level,
                    class_name: data.class_name,
                    school_id: schoolId,
                    class_id: data.current_class_id || data.class_id || null,
                    current_class_id:
                      data.current_class_id || data.class_id || null,
                    created_at: new Date().toISOString()
                  },
                });

                // Real-time update for admins (Isolated by school)
                if (schoolId) {
                  io.to(`school_${schoolId}`).emit("user-updated", {
                    type: "register",
                    userId: this.lastID,
                    role: "student",
                  });
                } else {
                  io.emit("user-updated", {
                    type: "register",
                    userId: this.lastID,
                    role: "student",
                  });
                }
              },
            );
          },
        );
      }

      // Cleanup OTP
      db.run("DELETE FROM otp_verifications WHERE id = ?", [verification.id]);
    },
  );
});

// AI Chat endpoint with optional file support
app.post(
  "/api/ai/chat",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { message, context } = req.body;
      const filePath = req.file?.path;

      if (!message && !filePath) {
        return res.status(400).json({ error: "Message or file is required" });
      }

      let fileContent = "";
      if (filePath) {
        try {
          fileContent = fs.readFileSync(filePath, "utf8");
        } catch (err) {
          console.error("Error reading file for chat:", err);
        }
      }

      const prompt = `
      Bạn là một giáo viên AI thân thiện và nhiệt tình hỗ trợ học sinh THCS và THPT học tập.
      ${context ? `Ngữ cảnh: ${context}` : ""}
      ${fileContent ? `Nội dung tài liệu đi kèm: ${fileContent}` : ""}
      Câu hỏi/Yêu cầu: ${message || "Hãy phân tích tài liệu đính kèm."}
    `;

      try {
        const text = await generateWithAI(prompt, null, "chat");
        return res.json({ response: text });
      } catch (aiError) {
        throw aiError;
      }
    } catch (error) {
      console.error("AI Error:", error);
      console.error("Error details:", error.message);

      // Provide user-friendly error messages
      let errorMessage = "Lỗi AI service";
      if (error.message && error.message.includes("API key")) {
        errorMessage =
          "API key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.";
      } else if (error.message && error.message.includes("404")) {
        errorMessage = "Model AI không khả dụng. Vui lòng thử lại sau.";
      } else if (error.message) {
        errorMessage = "Lỗi AI service: " + error.message;
      }

      res.status(500).json({
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);

// Lessons
app.get("/api/lessons", authenticateToken, (req, res) => {
  const { grade_level, subject } = req.query;
  let query = "SELECT * FROM lessons WHERE (school_id = ? OR school_id IS NULL)";
  const params = [req.user.school_id];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, lessons) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(lessons);
  });
});

app.get("/api/lessons/:id", authenticateToken, (req, res) => {
  db.get(
    "SELECT * FROM lessons WHERE id = ?",
    [req.params.id],
    (err, lesson) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    },
  );
});

// Exercises List for Students
app.get("/api/exercises", authenticateToken, (req, res) => {
  const { grade_level, subject, search, lesson_id } = req.query;
  let query = `
    SELECT e.*, l.title as lesson_title,
           (SELECT score FROM user_progress WHERE user_id = ? AND exercise_id = e.id ORDER BY id DESC LIMIT 1) as latest_score,
           (SELECT completed FROM user_progress WHERE user_id = ? AND exercise_id = e.id ORDER BY id DESC LIMIT 1) as is_completed
    FROM exercises e
    LEFT JOIN lessons l ON e.lesson_id = l.id
    WHERE (e.school_id = ? OR e.school_id IS NULL)
  `;
  const params = [req.user.id, req.user.id, req.user.school_id];

  if (grade_level) {
    query += " AND e.grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND e.subject = ?";
    params.push(subject);
  }
  if (lesson_id) {
    query += " AND e.lesson_id = ?";
    params.push(lesson_id);
  }
  if (search) {
    query += " AND (e.title LIKE ? OR e.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY e.id DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching exercises list:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Get Questions for a specific Exercise Set
// Note: Keeping the path variable as :lessonId for backward compatibility if needed,
// but we will now treat it as setId in the query for better decoupling.
app.get("/api/exercises/:setId", authenticateToken, (req, res) => {
  const setId = req.params.setId;
  db.all(
    `
    SELECT eq.*, e.title as set_title, e.description, e.duration, e.max_attempts,
           (SELECT COUNT(*) FROM user_progress WHERE user_id = ? AND exercise_id = e.id) as current_attempts
    FROM exercise_questions eq
    JOIN exercises e ON eq.exercise_id = e.id
    WHERE e.id = ?
    ORDER BY eq.question_order
    `,
    [req.user.id, setId],
    (err, exercises) => {
      if (err) {
        console.error("Error fetching questions:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(exercises);
    },
  );
});

app.post("/api/exercises/:id/submit", authenticateToken, (req, res) => {
  const { answers, studyTime, file_url } = req.body;
  const questionId = req.params.id;
  const userId = req.user.id;

  db.get(
    "SELECT eq.*, e.lesson_id FROM exercise_questions eq JOIN exercises e ON eq.exercise_id = e.id WHERE eq.id = ?",
    [questionId],
    (err, question) => {
      if (err || !question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const userAnswer = answers[0];
      const isCorrect = userAnswer === question.correct_answer;
      const score = isCorrect ? question.points : 0;

      db.run(
        "INSERT INTO user_progress (user_id, exercise_id, score, completed, study_time, lesson_id, answers, file_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          question.exercise_id,
          score,
          1,
          studyTime || 0,
          question.lesson_id,
          JSON.stringify(answers),
          file_url || null,
        ],
        function (err) {
          if (err) {
            console.error("Error saving progress:", err);
            return res.status(500).json({ error: "Failed to save progress" });
          }

          db.run("UPDATE users SET points = points + ? WHERE id = ?", [
            score,
            userId,
          ]);

          res.json({
            score,
            results: [{ correct: isCorrect }],
            totalPoints: score,
          });

          // Check for new achievements
          checkAchievements(userId);
        },
      );
    },
  );
});

app.post("/api/exercises/submit", authenticateToken, (req, res) => {
  const { exercise_id, answers, study_time, file_url, start_time } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "Answers must be an array" });
  }

  // Get exercise set info
  db.get(
    "SELECT * FROM exercises WHERE id = ?",
    [exercise_id],
    (err, exercise) => {
      if (err || !exercise) {
        return res.status(404).json({ error: "Exercise set not found" });
      }

      // Check attempt limit
      if (exercise.max_attempts > 0) {
        db.get(
          "SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND exercise_id = ?",
          [userId, exercise_id],
          (err, row) => {
            if (!err && row && row.count >= exercise.max_attempts) {
              return res
                .status(403)
                .json({
                  error: `Bạn đã hết lượt làm bài (Tối đa ${exercise.max_attempts} lần).`,
                });
            }
            processExerciseSubmission();
          },
        );
      } else {
        processExerciseSubmission();
      }

      function processExerciseSubmission() {
        // Get all questions for this exercise set
        db.all(
          "SELECT * FROM exercise_questions WHERE exercise_id = ? ORDER BY question_order",
          [exercise_id],
          (err, questions) => {
            if (err) return res.status(500).json({ error: "Database error" });

            let score = 0;
            const results = questions.map((q, index) => {
              const userAnswer = (answers[index] || "").toString().trim();
              const correctAnswer = (q.correct_answer || "").toString().trim();

              // Smart comparison: Check exact match first, then check letter prefix (e.g. "A" vs "A. Option")
              let isCorrect =
                userAnswer.toLowerCase() === correctAnswer.toLowerCase();

              if (
                !isCorrect &&
                userAnswer.length === 1 &&
                correctAnswer.length > 2 &&
                correctAnswer[1] === "."
              ) {
                isCorrect =
                  userAnswer.toLowerCase() === correctAnswer[0].toLowerCase();
              }

              if (isCorrect) score += q.points;
              return {
                question: q.question,
                userAnswer,
                correctAnswer: q.correct_answer,
                isCorrect,
                points: isCorrect ? q.points : 0,
                type: q.type,
              };
            });

            const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
            const percentage =
              totalPoints > 0 ? (score / totalPoints) * 100 : 0;

            // Save progress
            db.run(
              "INSERT INTO user_progress (user_id, exercise_id, score, completed, study_time, lesson_id, answers, file_url, start_time, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
              [
                userId,
                exercise_id,
                score,
                1,
                study_time || 0,
                exercise.lesson_id,
                JSON.stringify(answers),
                file_url || null,
                start_time || null,
              ],
              function (err) {
                if (err) {
                  console.error("Error saving progress:", err);
                  return res
                    .status(500)
                    .json({ error: "Failed to save progress" });
                }

                // Update user points
                db.run("UPDATE users SET points = points + ? WHERE id = ?", [
                  score,
                  userId,
                ]);

                res.json({
                  score,
                  results,
                  totalScore: totalPoints,
                  percentage,
                  totalPoints: score, // for backward compatibility if needed
                });

                // Check for new achievements
                checkAchievements(userId);
              },
            );
          },
        );
      }
    },
  );
});

// Log study time independently
app.post("/api/user/study-time", authenticateToken, (req, res) => {
  const { lesson_id, study_time } = req.body;
  const userId = req.user.id;

  if (!study_time) {
    return res.status(400).json({ error: "Study time required" });
  }

  // Check if progress already exists for this lesson
  db.get(
    "SELECT id FROM user_progress WHERE user_id = ? AND lesson_id = ? AND exercise_id IS NULL",
    [userId, lesson_id],
    (err, row) => {
      if (row) {
        db.run(
          "UPDATE user_progress SET study_time = study_time + ? WHERE id = ?",
          [study_time, row.id],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ message: "Study time updated" });
          },
        );
      } else {
        db.run(
          "INSERT INTO user_progress (user_id, lesson_id, study_time, completed) VALUES (?, ?, ?, ?)",
          [userId, lesson_id || null, study_time, 0],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ message: "Study time logged" });
          },
        );
      }
    },
  );
});

// Update Learning Path Progress
app.post("/api/learning-paths/progress", authenticateToken, (req, res) => {
  const { path_id, step_id, completed } = req.body;
  const userId = req.user.id;

  db.get(
    "SELECT id FROM learning_path_progress WHERE user_id = ? AND path_id = ? AND step_id = ?",
    [userId, path_id, step_id],
    (err, row) => {
      if (row) {
        db.run(
          "UPDATE learning_path_progress SET completed = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
          [completed ? 1 : 0, row.id],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ message: "Progress updated" });
          },
        );
      } else {
        db.run(
          "INSERT INTO learning_path_progress (user_id, path_id, step_id, completed) VALUES (?, ?, ?, ?)",
          [userId, path_id, step_id, completed ? 1 : 0],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ message: "Progress saved" });
          },
        );
      }
    },
  );
});

// Vocabulary
app.get("/api/vocabulary", authenticateToken, (req, res) => {
  const { grade_level, subject, type, search } = req.query;
  let query = "SELECT * FROM vocabulary WHERE (school_id = ? OR school_id IS NULL)";
  const params = [req.user.school_id];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }
  if (type) {
    if (type === "speaking") {
      query += " AND (type = ? OR type = ?)";
      params.push("speaking", "reading");
    } else {
      query += " AND type = ?";
      params.push(type);
    }
  }
  if (search) {
    query += " AND (word LIKE ? OR meaning LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY id DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Leaderboard
app.get("/api/leaderboard", authenticateToken, (req, res) => {
  let query = "SELECT * FROM leaderboard";
  let params = [];

  if (req.user.is_super_admin !== 1) {
    query += " WHERE school_id = ?";
    params.push(req.user.school_id);
  }

  query += " LIMIT 100";

  db.all(query, params, (err, leaderboard) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(leaderboard);
  });
});

// Heartbeat for online status, study streak, and monitoring metadata
app.post("/api/user/heartbeat", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const {
    participation_status,
    os_info,
    browser_info,
    wifi_info,
    bssid,
    ip_address,
    client_time,
    client_today,
  } = req.body;
  const today = client_today || new Date().toISOString().split("T")[0];

  db.get(
    "SELECT last_study_date, study_streak, class_name, school_id FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(404).json({ error: "User not found" });

      let newStreak = user.study_streak || 0;
      let updateFields = client_time
        ? "last_activity = ?"
        : "last_activity = CURRENT_TIMESTAMP";
      let params = client_time ? [client_time] : [];

      // Metadata updates
      if (participation_status) {
        updateFields += ", participation_status = ?";
        params.push(participation_status);
      }
      if (os_info) {
        updateFields += ", os_info = ?";
        params.push(os_info);
      }
      if (browser_info) {
        updateFields += ", browser_info = ?";
        params.push(browser_info);
      }
      if (wifi_info) {
        updateFields += ", wifi_info = ?";
        params.push(wifi_info);
      }
      if (bssid) {
        updateFields += ", bssid = ?";
        params.push(bssid);
      }
      if (ip_address) {
        updateFields += ", ip_address = ?";
        params.push(ip_address);
      }

      // Automated class assignment if current_class_id is null but class_name is set
      // This happens based on the prompt "automatically distribute to classes based on their declared Class/Grade"
      if (user.class_name && user.school_id) {
        updateFields +=
          ", class_id = (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1), current_class_id = (SELECT id FROM classes WHERE UPPER(name) = UPPER(?) AND school_id = ? LIMIT 1)";
        params.push(user.class_name, user.school_id, user.class_name, user.school_id);
      }

      if (!user.last_study_date) {
        newStreak = 1;
        updateFields += ", last_study_date = ?, study_streak = ?";
        params.push(today, newStreak);
      } else {
        const lastDate = user.last_study_date.split("T")[0];
        if (lastDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastDate === yesterdayStr) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
          updateFields += ", last_study_date = ?, study_streak = ?";
          params.push(today, newStreak);
        }
      }

      db.run(
        `UPDATE users SET ${updateFields} WHERE id = ?`,
        [...params, userId],
        (err) => {
          if (err)
            return res.status(500).json({ error: "Database update failed" });
          res.json({ streak: newStreak });
        },
      );
    },
  );
});

app.get("/api/user/profile", authenticateToken, (req, res) => {
  db.get(
    "SELECT id, username, full_name, email, grade_level, points, study_streak, last_study_date, role, school, birth_date, avatar_url, specialty, qualification, gender, place_of_birth, province, district, ward, school_level, class_name, class_id, current_class_id, school_id, is_super_admin, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      res.json(user);
    },
  );
});

app.post("/api/user/profile", authenticateToken, (req, res) => {
  const {
    full_name,
    email,
    grade_level,
    school,
    birth_date,
    specialty,
    qualification,
    gender,
    place_of_birth,
    province,
    district,
    ward,
    school_level,
    class_name,
  } = req.body;
  const normalizedSchool = school ? school.toString().toUpperCase() : null;

  // Sync school_id with school name if provided (Case-insensitive matching)
  db.get(
    "SELECT id FROM schools WHERE UPPER(name) = UPPER(?)",
    [normalizedSchool],
    (schoolErr, schoolRow) => {
      const schoolId = schoolRow ? schoolRow.id : null;

      db.run(
        "UPDATE users SET full_name = ?, email = ?, grade_level = ?, school = ?, birth_date = ?, specialty = ?, qualification = ?, gender = ?, place_of_birth = ?, province = ?, district = ?, ward = ?, school_level = ?, class_name = ?, school_id = ? WHERE id = ?",
        [
          full_name,
          email || null,
          grade_level || null,
          normalizedSchool,
          birth_date || null,
          specialty || null,
          qualification || null,
          gender || null,
          place_of_birth || null,
          province || null,
          district || null,
          ward || null,
          school_level || null,
          class_name || null,
          schoolId,
          req.user.id,
        ],
        function (err) {
          if (err) {
            return res.status(500).json({ error: "Failed to update profile" });
          }
          res.json({ message: "Profile updated successfully" });

          // Real-time update for admins (Isolated by school)
          if (req.user.school_id) {
            io.to(`school_${req.user.school_id}`).emit("user-updated", {
              type: "update",
              userId: req.user.id,
            });
          }
        },
      );
    },
  );
});

app.post(
  "/api/user/avatar",
  authenticateToken,
  upload.single("avatar"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // 1. Cleanup old avatar physical file
    db.get(
      "SELECT avatar_url FROM users WHERE id = ?",
      [userId],
      (err, user) => {
        if (
          user &&
          user.avatar_url &&
          user.avatar_url !== "/uploads/avatars/default.png"
        ) {
          const oldPath = path.join(__dirname, user.avatar_url);
          if (fs.existsSync(oldPath)) {
            fs.unlink(oldPath, (unlinkErr) => {
              if (unlinkErr)
                console.error(
                  `Failed to delete old avatar: ${oldPath}`,
                  unlinkErr,
                );
            });
          }
        }

        // 2. Update DB with new avatar
        db.run(
          "UPDATE users SET avatar_url = ? WHERE id = ?",
          [avatarUrl, userId],
          (dbErr) => {
            if (dbErr) {
              return res.status(500).json({ error: "Failed to update avatar" });
            }
            res.json({
              avatar_url: avatarUrl,
              message: "Avatar updated successfully",
            });
          },
        );
      },
    );
  },
);

app.post("/api/user/settings/notifications", authenticateToken, (req, res) => {
  const { receive_notifications } = req.body;
  const userId = req.user.id;
  db.run(
    "UPDATE users SET receive_notifications = ? WHERE id = ?",
    [receive_notifications ? 1 : 0, userId],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Cài đặt thông báo đã được cập nhật" });
    },
  );
});

// Public: Get global settings (filtered)
app.get("/api/public/settings", (req, res) => {
  db.all(
    "SELECT key, value FROM settings WHERE key IN ('proctoring_enabled')",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      const settings = {};
      rows.forEach((row) => {
        settings[row.key] = row.value;
      });
      res.json(settings);
    },
  );
});

app.get("/api/notifications", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    "SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC LIMIT 50",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.post("/api/notifications/read/:id", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;
  db.run(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
    [notificationId, userId],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Marked as read" });
    },
  );
});

app.post("/api/notifications", authenticateToken, (req, res) => {
  const { title, message, type, link, user_id } = req.body;
  // If user_id is provided, send to that user, otherwise send to self (for logging)
  const targetId = user_id || req.user.id;
  sendNotification(targetId, title, message, type, link);
  res.json({ message: "Notification sent" });
});

// Admin: Upload Audio for Questions
app.post(
  "/api/admin/questions/audio",
  authenticateToken,
  upload.single("audio"),
  (req, res) => {
    if (
      req.user.role !== "admin" &&
      !(req.user.role === "teacher" && req.user.is_full_access === 1)
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const type = req.body.type || "questions"; // questions, lessons, etc.
    const audioUrl = `/uploads/${type}/${req.file.filename}`;

    res.json({
      url: audioUrl,
      filename: req.file.filename,
      message: "Audio uploaded successfully",
    });
  },
);

// --- ADMIN DATA MANAGEMENT (IMPORT/EXPORT) ---

// Export Data (Schools, Users, Staff)
app.get("/api/admin/export/:type", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const type = req.params.type;
  let query = "";
  let params = [];

  if (type === "schools" && req.user.is_super_admin === 1) {
    query = "SELECT * FROM schools";
  } else if (type === "students") {
    query = "SELECT id, username, full_name, email, grade_level, school_id FROM users WHERE role = 'student'";
    if (req.user.is_super_admin !== 1) {
      query += " AND school_id = ?";
      params = [req.user.school_id];
    }
  } else if (type === "staff") {
    query = "SELECT id, username, full_name, email, role, school_id FROM users WHERE role IN ('teacher', 'admin')";
    if (req.user.is_super_admin !== 1) {
      query += " AND school_id = ?";
      params = [req.user.school_id];
    }
  } else {
    return res.status(400).json({ error: "Invalid export type" });
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    try {
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(rows);
      res.header("Content-Type", "text/csv");
      res.attachment(`${type}_export_${new Date().getTime()}.csv`);
      return res.send(csv);
    } catch (e) {
      return res.status(500).json({ error: "CSV generation failed" });
    }
  });
});

// Bulk Import Users (CSV/Excel)
app.post(
  "/api/admin/import/users",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const workbook = xlsx.read(req.file.buffer || fs.readFileSync(req.file.path), {
        type: req.file.buffer ? "buffer" : "file",
      });
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        const { username, password, full_name, email, role, grade_level } = row;
        if (!username || !password) {
          errorCount++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(password.toString(), 10);
        const userRole = role || "student";
        const schoolId = req.user.is_super_admin === 1 ? row.school_id : req.user.school_id;

        await new Promise((resolve) => {
          db.run(
            "INSERT INTO users (username, password, full_name, email, role, grade_level, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              username.toString(),
              hashedPassword,
              full_name || username,
              email || null,
              userRole,
              grade_level || null,
              schoolId,
            ],
            (err) => {
              if (err) errorCount++;
              else successCount++;
              resolve();
            },
          );
        });
      }

      res.json({
        message: `Import hoàn tất. Thành công: ${successCount}, Thất bại: ${errorCount}`,
        successCount,
        errorCount,
      });
    } catch (e) {
      console.error("Import error:", e);
      res.status(500).json({ error: "Import failed" });
    }
  },
);

// --- SYSTEM ANNOUNCEMENTS ---

// Create Announcement (Admin/Super Admin)
app.post("/api/admin/announcements", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { title, content, type, target_role, school_id, expires_at } = req.body;
  const targetSchool = req.user.is_super_admin === 1 ? school_id : req.user.school_id;

  db.run(
    "INSERT INTO announcements (title, content, type, target_role, school_id, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, content, type || 'info', target_role || 'all', targetSchool, req.user.id, expires_at || null],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Đã tạo thông báo thành công", id: this.lastID });
    }
  );
});

// Get Announcements (User)
app.get("/api/announcements", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const schoolId = req.user.school_id;
  const userRole = req.user.role;

  db.all(
    `SELECT a.*, r.read_at 
     FROM announcements a
     LEFT JOIN announcement_reads r ON a.id = r.announcement_id AND r.user_id = ?
     WHERE (a.school_id IS NULL OR a.school_id = ?)
     AND (a.target_role = 'all' OR a.target_role = ?)
     AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
     ORDER BY a.created_at DESC`,
    [userId, schoolId, userRole],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    }
  );
});

// Mark Announcement as Read
app.post("/api/announcements/:id/read", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const announcementId = req.params.id;

  db.run(
    "INSERT OR IGNORE INTO announcement_reads (user_id, announcement_id) VALUES (?, ?)",
    [userId, announcementId],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Marked as read" });
    }
  );
});

// --- ACHIEVEMENTS & GAMIFICATION ---

// Get User Achievements
app.get("/api/user/achievements", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    `SELECT a.*, ua.earned_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
     ORDER BY a.requirement_value ASC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    }
  );
});

// Admin: Seed Achievements (Utility)
app.post("/api/admin/achievements/seed", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) return res.status(403).json({ error: "Unauthorized" });

  const defaultAchievements = [
    { title: "Người mới bắt đầu", description: "Đạt 100 điểm đầu tiên", icon_name: "zap", requirement_type: "total_points", requirement_value: 100 },
    { title: "Chiến binh chăm chỉ", description: "Đạt 1,000 điểm tích lũy", icon_name: "shield", requirement_type: "total_points", requirement_value: 1000 },
    { title: "Siêu sao EduSmart", description: "Đạt 5,000 điểm tích lũy", icon_name: "award", requirement_type: "total_points", requirement_value: 5000 },
    { title: "Kiên trì", description: "Duy trì học tập 7 ngày liên tiếp", icon_name: "flame", requirement_type: "streak", requirement_value: 7 },
  ];

  const stmt = db.prepare("INSERT INTO achievements (title, description, icon_name, requirement_type, requirement_value) VALUES (?, ?, ?, ?, ?)");
  defaultAchievements.forEach(a => stmt.run(a.title, a.description, a.icon_name, a.requirement_type, a.requirement_value));
  stmt.finalize();

  res.json({ message: "Achievements seeded successfully" });
});

// Admin routes
// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));

// Admin routes
app.post(
  "/api/admin/lessons",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    if (
      req.user.role !== "admin" &&
      !(req.user.role === "teacher" && req.user.is_full_access === 1)
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const {
      title,
      content,
      subject,
      grade_level,
      material_type,
      material_link,
    } = req.body;
    const filePath = req.file ? `/uploads/lessons/${req.file.filename}` : null;
    const fileType = req.file ? req.file.mimetype : null;

    db.run(
      "INSERT INTO lessons (title, content, subject, grade_level, file_path, file_type, material_type, material_link, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        title,
        content,
        subject,
        grade_level,
        filePath,
        fileType,
        material_type || null,
        material_link || null,
        req.user.school_id,
      ],
      function (err) {
        if (err) {
          console.error("Error creating lesson:", err);
          return res
            .status(500)
            .json({ error: "Failed to create lesson: " + err.message });
        }
        const lessonId = this.lastID;
        logActivity(
          req.user.id,
          req.user.username,
          "Tạo bài học",
          `Tạo bài học mới: ${title} (ID: ${lessonId})`,
        );
        res.json({ id: lessonId, message: "Lesson created successfully" });
        sendGroupNotification(
          grade_level,
          "Bài học mới! 📚",
          `Bài học: ${title} vừa được đăng tải. Hãy vào xem ngay nhé!`,
          "success",
          `/practice`,
        );
        sendNotification(
          req.user.id,
          "Hệ thống",
          `Bạn đã tạo bài học "${title}" thành công.`,
          "info",
        );
      },
    );
  },
);

app.post("/api/admin/exercises", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const {
    lesson_id,
    title,
    description,
    subject,
    grade_level,
    duration,
    questions,
  } = req.body;

  db.run(
    "INSERT INTO exercises (lesson_id, title, description, subject, grade_level, duration, total_questions, total_points, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      lesson_id || null,
      title,
      description || null,
      subject,
      grade_level,
      duration || 30,
      questions ? questions.length : 0,
      questions ? questions.reduce((sum, q) => sum + (q.points || 10), 0) : 0,
      req.user.school_id,
    ],
    function (err) {
      if (err) {
        console.error("Error creating exercise set:", err);
        return res
          .status(500)
          .json({ error: "Failed to create exercise set: " + err.message });
      }

      const exerciseId = this.lastID;
      logActivity(
        req.user.id,
        req.user.username,
        "Tạo bài luyện tập",
        `Tạo bài luyện tập mới: ${title} (ID: ${exerciseId})`,
      );
      res.json({
        id: exerciseId,
        message: "Exercise set created successfully",
      });
      sendGroupNotification(
        grade_level,
        "Bài tập mới! 🎯",
        `Bài tập: ${title} đã sẵn sàng. Cùng luyện tập ngay thôi!`,
        "success",
        lesson_id ? `/practice/${lesson_id}` : "/practice",
      );
      sendNotification(
        req.user.id,
        "Hệ thống",
        `Bạn đã tạo bài tập "${title}" thành công.`,
        "info",
      );

      if (!questions || questions.length === 0) return;

      let inserted = 0;
      questions.forEach((q, index) => {
        db.run(
          "INSERT INTO exercise_questions (exercise_id, question, options, correct_answer, points, type, question_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            exerciseId,
            q.question,
            JSON.stringify(q.options),
            q.correct_answer,
            q.points || 10,
            q.type || "abcd",
            index,
          ],
          function (qErr) {
            if (qErr) console.error("Error inserting exercise question:", qErr);
            inserted++;
          },
        );
      });
    },
  );
});

app.post(
  "/api/admin/vocabulary",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    if (
      req.user.role !== "admin" &&
      !(req.user.role === "teacher" && req.user.is_full_access === 1)
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const {
      word,
      meaning,
      pronunciation,
      example,
      grade_level,
      subject,
      type,
    } = req.body;
    // file_path and file_type are no longer part of the vocabulary table
    // const filePath = req.file ? `/ uploads / vocabulary / ${ req.file.filename } ` : null;
    // const fileType = req.file ? req.file.mimetype : null;

    db.run(
      "INSERT INTO vocabulary (word, meaning, pronunciation, example, grade_level, subject, type, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        word,
        meaning,
        pronunciation || null,
        example || null,
        grade_level || "thcs_6",
        subject || "anh",
        type || "speaking",
        req.user.school_id,
      ],
      function (err) {
        if (err) {
          console.error("Error adding vocabulary:", err);
          return res
            .status(500)
            .json({ error: "Failed to add vocabulary: " + err.message });
        }
        const vocabId = this.lastID;
        logActivity(
          req.user.id,
          req.user.username,
          "Tạo từ vựng",
          `Thêm từ vựng mới: ${word} (ID: ${vocabId})`,
        );
        res.json({ id: vocabId, message: "Vocabulary added successfully" });
        sendGroupNotification(
          grade_level,
          "Từ vựng mới! 🔠",
          `Đã có từ vựng mới cho chủ đề ${subject}. Hãy vào học ngay nhé!`,
          "info",
          "/vocabulary",
        );
        sendNotification(
          req.user.id,
          "Hệ thống",
          `Bạn đã thêm từ vựng "${word}" thành công.`,
          "info",
        );
      },
    );
  },
);

// Admin statistics endpoint
app.get("/api/admin/statistics", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Admin or teacher access required" });
  }

  db.all(
    `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'student' AND (? = 1 OR school_id = ?)) as total_students,
      (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND (? = 1 OR school_id = ?)) as total_teachers,
      (SELECT COUNT(*) FROM users WHERE role = 'admin' AND (? = 1 OR school_id = ?)) as total_admins,
      (SELECT COUNT(*) FROM lessons WHERE (? = 1 OR school_id = ?)) as total_lessons,
      (SELECT COUNT(*) FROM exercises WHERE (? = 1 OR school_id = ?)) as total_exercises,
      (SELECT COUNT(*) FROM vocabulary WHERE (? = 1 OR school_id = ?)) as total_vocabulary,
      (SELECT COUNT(*) FROM tests WHERE (? = 1 OR school_id = ?)) as total_tests,
      (SELECT COUNT(*) FROM user_progress WHERE completed = 1 AND user_id IN (SELECT id FROM users WHERE (? = 1 OR school_id = ?))) as completed_exercises,
      (SELECT SUM(score) FROM user_progress WHERE user_id IN (SELECT id FROM users WHERE (? = 1 OR school_id = ?))) as total_points_earned,
      (SELECT COUNT(*) FROM user_violations WHERE user_id IN (SELECT id FROM users WHERE (? = 1 OR school_id = ?))) as total_violations,
      (SELECT value FROM settings WHERE key = 'proctoring_enabled') as proctoring_enabled,
      (SELECT value FROM settings WHERE key = 'social_monitoring_enabled') as social_monitoring_enabled,
      (SELECT value FROM settings WHERE key = 'test_monitoring_enabled') as test_monitoring_enabled
  `,
    [
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
      req.user.is_super_admin || 0, req.user.school_id,
    ],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      const stats = rows[0] || {};
      // Convert proctoring_enabled to boolean for frontend
      if (stats.proctoring_enabled !== undefined) {
        stats.proctoring_enabled =
          stats.proctoring_enabled === "true" ||
          stats.proctoring_enabled === "1" ||
          stats.proctoring_enabled === 1;
      }
      if (stats.social_monitoring_enabled !== undefined) {
        stats.social_monitoring_enabled =
          stats.social_monitoring_enabled === "true" ||
          stats.social_monitoring_enabled === "1" ||
          stats.social_monitoring_enabled === 1;
      }
      if (stats.test_monitoring_enabled !== undefined) {
        stats.test_monitoring_enabled =
          stats.test_monitoring_enabled === "true" ||
          stats.test_monitoring_enabled === "1" ||
          stats.test_monitoring_enabled === 1;
      }
      res.json(stats);
    },
  );
});

// Register admin/teacher (only super admin can do this)
app.post("/api/admin/register", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or super admin
    db.get(
      "SELECT role, is_super_admin FROM users WHERE id = ?",
      [req.user.id],
      async (err, user) => {
        if (
          err ||
          !user ||
          (user.role !== "admin" && user.role !== "teacher")
        ) {
          return res
            .status(403)
            .json({
              error: "Chỉ admin hoặc giáo viên mới có quyền tạo tài khoản",
            });
        }

        const {
          username,
          password,
          full_name,
          email,
          role,
          specialty,
          qualification,
          birth_date,
          gender,
          place_of_birth,
          province,
          district,
          ward,
          school_level,
          grade_level,
          class_name,
          current_class_id,
          school,
        } = req.body;

        if (!username || !password || !full_name || !role) {
          return res
            .status(400)
            .json({ error: "Vui lòng điền đầy đủ thông tin" });
        }

        const normalizedSchool = school
          ? school.toString().toUpperCase()
          : null;
        const hashedPassword = await bcrypt.hash(password, 10);

        // If requester is super admin, they might provide a specific school_id
        const finalSchoolId =
          req.user.is_super_admin === 1 && req.body.school_id
            ? req.body.school_id
            : req.user.school_id;

        db.run(
          "INSERT INTO users (username, password, full_name, email, role, specialty, qualification, birth_date, is_super_admin, gender, place_of_birth, province, district, ward, school_level, grade_level, class_name, class_id, current_class_id, school, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            username,
            hashedPassword,
            full_name,
            email || null,
            role,
            specialty || null,
            qualification || null,
            birth_date || null,
            0,
            gender || null,
            place_of_birth || null,
            province || null,
            district || null,
            ward || null,
            school_level || null,
            grade_level || null,
            class_name || null,
            current_class_id || null,
            current_class_id || null,
            normalizedSchool,
            finalSchoolId,
          ],
          function (err) {
            if (err) {
              console.error("Registration error:", err);
              if (err.message.includes("UNIQUE constraint")) {
                return res
                  .status(400)
                  .json({ error: "Tên đăng nhập đã tồn tại" });
              }
              return res
                .status(500)
                .json({ error: "Đăng ký thất bại: " + err.message });
            }

            logActivity(
              req.user.id,
              req.user.username,
              "Tạo tài khoản",
              `Tạo tài khoản ${role}: ${username} (ID: ${this.lastID})`,
            );

            res.json({
              id: this.lastID,
              message: `${role === "admin" ? "Admin" : role === "teacher" ? "Giáo viên" : "Học sinh"} đã được tạo thành công`,
            });
          },
        );
      },
    );
  } catch (error) {
    console.error("Register admin error:", error);
    res.status(500).json({ error: "Lỗi server: " + error.message });
  }
});

// Get all users (admin only)
app.get("/api/admin/users", authenticateToken, (req, res) => {
  db.get(
    "SELECT username, role, is_super_admin FROM users WHERE id = ?",
    [req.user.id],
    (err, currentUser) => {
      if (
        err ||
        !currentUser ||
        (currentUser.role !== "admin" && currentUser.role !== "teacher")
      ) {
        return res
          .status(403)
          .json({
            error:
              "Chỉ admin hoặc giáo viên mới có quyền xem danh sách người dùng",
          });
      }

      let { role } = req.query;

      // Restriction: Only system admin or users with role 'admin' can see staff (role !== student)
      // School admins (role 'admin') can see staff within their school
      if (currentUser.role !== "admin" && currentUser.is_super_admin !== 1) {
        role = "student";
      }

      let query = `SELECT id, username, full_name, email, grade_level, points, role, created_at, specialty, qualification, avatar_url, is_full_access,
                        gender, birth_date, place_of_birth, province, district, ward, school, school_level, class_name, class_id, current_class_id, school_id
                 FROM users WHERE 1=1`;
      const params = [];

      // Data Isolation: Non-super admins only see their school's users
      if (currentUser.is_super_admin !== 1) {
        query += " AND school_id = ?";
        params.push(currentUser.school_id || req.user.school_id);
      }

      if (role) {
        query += " AND role = ?";
        params.push(role);
      }

      db.all(query, params, (err, users) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        res.json(users);
      });
    },
  );
});

// Class Management Routes
app.get("/api/admin/classes", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const query = `
    SELECT c.*, t.full_name as teacher_name,
           (SELECT COUNT(*) FROM users WHERE class_id = c.id) as student_count
    FROM classes c
    LEFT JOIN users t ON c.teacher_id = t.id
    WHERE (? = 1 OR c.school_id = ?)
    ORDER BY c.grade_level, c.name
  `;

  db.all(query, [req.user.is_super_admin || 0, req.user.school_id], (err, rows) => {
    if (err) {
      console.error("Error fetching classes:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    res.json(rows);
  });
});

app.post("/api/admin/classes", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const {
    name,
    grade_level,
    teacher_id,
    schedule_start,
    schedule_end,
    schedule_days,
    study_monitoring_enabled,
    test_monitoring_enabled,
    social_monitoring_enabled,
  } = req.body;

  if (!name || !grade_level) {
    return res.status(400).json({ error: "Name and grade level are required" });
  }

  db.run(
    `INSERT INTO classes (
      name, grade_level, teacher_id, 
      schedule_start, schedule_end, schedule_days,
      study_monitoring_enabled, test_monitoring_enabled, social_monitoring_enabled,
      school_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.toUpperCase(),
      grade_level,
      teacher_id || req.user.id,
      schedule_start || "08:00",
      schedule_end || "17:00",
      schedule_days || "[]",
      study_monitoring_enabled ? 1 : 0,
      test_monitoring_enabled ? 1 : 0,
      social_monitoring_enabled ? 1 : 0,
      req.user.school_id,
    ],
    function (err) {
      if (err) {
        console.error("Error creating class:", err);
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ error: "Tên lớp đã tồn tại" });
        }
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }
      logActivity(
        req.user.id,
        req.user.username,
        "Tạo lớp học",
        `Tạo lớp: ${name} (ID: ${this.lastID})`,
        req.user.school_id,
      );
      res.json({ id: this.lastID, message: "Class created successfully" });
      io.to(`school_${req.user.school_id}`).emit("classes-updated");
    },
  );
});

app.put("/api/admin/classes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const classId = req.params.id;
  const updates = req.body;
  const allowedFields = [
    "name",
    "grade_level",
    "teacher_id",
    "schedule_start",
    "schedule_end",
    "schedule_days",
    "study_monitoring_enabled",
    "test_monitoring_enabled",
    "social_monitoring_enabled",
  ];

  const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));
  if (keys.length === 0)
    return res.status(400).json({ error: "No valid fields provided" });

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => {
    if (k === "name") return updates[k].toUpperCase();
    if (k.endsWith("_enabled")) return updates[k] ? 1 : 0;
    return updates[k];
  });

  db.run(
    `UPDATE classes SET ${setClause} WHERE id = ? AND (? = 1 OR school_id = ?)`,
    [...values, classId, req.user.is_super_admin || 0, req.user.school_id],
    function (err) {
      if (err) {
        console.error("Error updating class:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }
      if (this.changes === 0)
        return res
          .status(403)
          .json({ error: "Permission denied or class not found" });
      logActivity(
        req.user.id,
        req.user.username,
        "Cập nhật lớp học",
        `Cập nhật lớp ID: ${classId} (${keys.join(", ")})`,
        req.user.school_id,
      );
      res.json({ message: "Class updated successfully" });
      io.to(`school_${req.user.school_id}`).emit("classes-updated");
      // Emit sync event specifically for this class to refresh student monitoring state
      io.to(`monitoring_${classId}`).emit("monitoring-sync", {
        type: "refresh",
        enabled: true,
      });
    },
  );
});

app.patch("/api/admin/classes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'name', 'grade_level', 'teacher_id', 'invite_code',
    'study_monitoring_enabled',
    'test_monitoring_enabled',
    'social_monitoring_enabled'
  ];

  const sets = [];
  const values = [];

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      sets.push(`${key} = ?`);
      // Convert true/false sang 1/0 cho SQLite
      values.push(typeof updates[key] === 'boolean' ? (updates[key] ? 1 : 0) : updates[key]);
    }
  });

  if (sets.length === 0) return res.status(400).json({ error: "No valid fields provided" });

  values.push(id);
  values.push(req.user.is_super_admin || 0);
  values.push(req.user.school_id);
  const sql = `UPDATE classes SET ${sets.join(", ")} WHERE id = ? AND (? = 1 OR school_id = ?)`;

  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ success: true, message: "Class updated successfully" });

    // Gửi tín hiệu đồng bộ qua Socket
    Object.keys(updates).forEach(key => {
      if (key.includes('monitoring_enabled')) {
        const type = key === 'study_monitoring_enabled' ? 'ai' :
          key === 'social_monitoring_enabled' ? 'social' : 'test';
        io.to(`monitoring_${id}`).emit('monitoring-sync', {
          roomId: `monitoring_${id}`,
          type: type,
          enabled: updates[key]
        });
      }
    });
  });
});

app.delete("/api/admin/classes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  db.run("DELETE FROM classes WHERE id = ? AND (? = 1 OR school_id = ?)", [req.params.id, req.user.is_super_admin || 0, req.user.school_id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    if (this.changes === 0) return res.status(403).json({ error: "Permission denied or class not found" });

    // Clear class_id for students in this class
    db.run("UPDATE users SET class_id = NULL WHERE class_id = ?", [
      req.params.id,
    ]);

    logActivity(
      req.user.id,
      req.user.username,
      "Xóa lớp học",
      `Xóa lớp ID: ${req.params.id}`,
      req.user.school_id,
    );
    res.json({ message: "Class deleted successfully" });
    io.to(`school_${req.user.school_id}`).emit("classes-updated");
  });
});

// --- SUPER ADMIN APIs ---
app.get("/api/super-admin/stats", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });

  db.get(
    `
      SELECT 
        (SELECT COUNT(*) FROM schools) as total_schools,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM lessons) as total_lessons,
        (SELECT COUNT(*) FROM test_results) as total_exams,
        (SELECT COUNT(*) FROM system_feedback WHERE status = 'pending') as pending_feedback
    `,
    (err, stats) => {
      if (err) {
        console.error("Stats error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(stats);
    },
  );
});

app.get("/api/super-admin/schools", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });

  db.all(
    `
      SELECT s.*,
             (SELECT COUNT(*) FROM users WHERE school_id = s.id) as user_count
      FROM schools s
      ORDER BY s.name
    `,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.post("/api/super-admin/schools", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });

  const { name, district_id, levels, province, district, ward, address } =
    req.body;
  if (!name) return res.status(400).json({ error: "Tên trường là bắt buộc" });
  const normalizedName = name.toString().toUpperCase();

  db.run(
    "INSERT INTO schools (name, district_id, levels, province, district, ward, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      normalizedName,
      district_id || null,
      levels || null,
      province || null,
      district || null,
      ward || null,
      address || null,
    ],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint"))
          return res.status(400).json({ error: "Tên trường đã tồn tại" });
        console.error("Create school error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({
        id: this.lastID,
        message: "Trường học đã được tạo thành công",
      });
    },
  );
});

app.delete("/api/super-admin/schools/:id", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });
  const schoolId = req.params.id;

  db.run("DELETE FROM schools WHERE id = ?", [schoolId], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    // Also clear school references in users
    db.run(
      "UPDATE users SET school_id = NULL, school = NULL WHERE school_id = ?",
      [schoolId],
    );
    res.json({ message: "Trường học đã được xóa thành công" });
  });
});

app.post("/api/super-admin/cleanup-schools", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });

  db.serialize(() => {
    db.run("DELETE FROM schools");
    db.run("UPDATE users SET school_id = NULL, school = NULL");
    res.json({ message: "Tất cả các trường học đã được xóa sạch" });
  });
});

app.get("/api/super-admin/feedback", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });

  db.all(
    `
      SELECT f.*, u.full_name, u.username, s.name as school_name
      FROM system_feedback f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN schools s ON f.school_id = s.id
      ORDER BY f.created_at DESC
    `,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

app.put(
  "/api/super-admin/feedback/:id/resolve",
  authenticateToken,
  (req, res) => {
    if (req.user.is_super_admin !== 1)
      return res.status(403).json({ error: "Super Admin access required" });

    db.run(
      'UPDATE system_feedback SET status = "resolved" WHERE id = ?',
      [req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ message: "Feedback resolved" });
      },
    );
  },
);

app.get("/api/admin/classes/:id/students", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  db.all(
    'SELECT id, username, full_name, role, grade_level, points, avatar_url FROM users WHERE class_id = ? AND role = "student"',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

// Delete user (admin/teacher can delete students, only 'admin' can delete staff)
// List and Delete endpoints for content management
app.get("/api/admin/lessons", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { grade_level, subject, search } = req.query;
  let query = "SELECT * FROM lessons WHERE (? = 1 OR school_id = ?)";
  const params = [req.user.is_super_admin || 0, req.user.school_id];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }
  if (search) {
    query += " AND (title LIKE ? OR content LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.delete("/api/admin/lessons/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const lessonId = req.params.id;

  // 1. First find the file_path to cleanup the physical file
  db.get(
    "SELECT file_path FROM lessons WHERE id = ?",
    [lessonId],
    (err, lesson) => {
      if (lesson && lesson.file_path) {
        const fullPath = path.join(__dirname, lesson.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (unlinkErr) => {
            if (unlinkErr)
              console.error(
                `Failed to delete lesson file: ${fullPath}`,
                unlinkErr,
              );
            else console.log(`Successfully deleted physical file: ${fullPath}`);
          });
        }
      }

      // 2. Start cascade deletion from DB
      db.run("DELETE FROM lessons WHERE id = ? AND (? = 1 OR school_id = ?)", [lessonId, req.user.is_super_admin || 0, req.user.school_id], function (err) {
        if (err) return res.status(500).json({ error: "Database error" });
        if (this.changes === 0) return res.status(403).json({ error: "Permission denied or lesson not found" });

        logActivity(
          req.user.id,
          req.user.username,
          "Xóa bài học",
          `Xóa bài học ID: ${lessonId}`,
        );

        // CASCADE DELETE: First get all exercise IDs to clean up questions
        db.all(
          "SELECT id FROM exercises WHERE lesson_id = ?",
          [lessonId],
          (err, exRows) => {
            if (exRows && exRows.length > 0) {
              const exIds = exRows.map((r) => r.id);
              const placeholders = exIds.map(() => "?").join(",");
              db.run(
                `DELETE FROM exercise_questions WHERE exercise_id IN (${placeholders})`,
                exIds,
              );

              // Cleanup violations for each associated exercise
              exIds.forEach((id) => cleanupItemViolations(id, "exercise"));
            }
            // Now delete exercises
            db.run("DELETE FROM exercises WHERE lesson_id = ?", [lessonId]);
          },
        );

        // Also delete user progress for this lesson (exercises/tests)
        db.run("DELETE FROM user_progress WHERE lesson_id = ?", [lessonId]);
        // Also delete from learning path steps
        db.run("DELETE FROM learning_path_steps WHERE lesson_id = ?", [
          lessonId,
        ]);

        sendNotification(
          req.user.id,
          "Hệ thống",
          `Bạn đã xóa bài học thành công.`,
          "warning",
        );
        res.json({ message: "Lesson and all associated data deleted" });
      });
    },
  );
});

app.get("/api/admin/exercises", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { grade_level, subject, search } = req.query;
  let query =
    "SELECT e.*, l.title as lesson_title FROM exercises e LEFT JOIN lessons l ON e.lesson_id = l.id WHERE (? = 1 OR e.school_id = ?)";
  const params = [req.user.is_super_admin || 0, req.user.school_id];

  if (grade_level) {
    query += " AND e.grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND e.subject = ?";
    params.push(subject);
  }
  if (search) {
    query += " AND (e.title LIKE ? OR e.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY e.id DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    // Fetch questions for each exercise
    const fetchQuestions = (index) => {
      if (index === rows.length) return res.json(rows);

      db.all(
        "SELECT * FROM exercise_questions WHERE exercise_id = ? ORDER BY question_order",
        [rows[index].id],
        (qErr, questions) => {
          if (!qErr) {
            rows[index].questions = questions.map((q) => ({
              ...q,
              options: q.options ? JSON.parse(q.options) : [],
            }));
          }
          fetchQuestions(index + 1);
        },
      );
    };

    fetchQuestions(0);
  });
});

app.put(
  "/api/admin/lessons/:id",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    if (
      req.user.role !== "admin" &&
      !(req.user.role === "teacher" && req.user.is_full_access === 1)
    ) {
      return res.status(403).json({ error: "Permission denied" });
    }
    const {
      title,
      content,
      subject,
      grade_level,
      material_type,
      material_link,
    } = req.body;
    const lessonId = req.params.id;

    // 1. If a new file is uploaded, we need to find and delete the OLD physical file first
    if (req.file) {
      db.get(
        "SELECT file_path FROM lessons WHERE id = ?",
        [lessonId],
        (err, oldLesson) => {
          if (oldLesson && oldLesson.file_path) {
            const oldPath = path.join(__dirname, oldLesson.file_path);
            if (fs.existsSync(oldPath)) {
              fs.unlink(oldPath, (unlinkErr) => {
                if (unlinkErr)
                  console.error(
                    `Failed to delete OLD lesson file: ${oldPath}`,
                    unlinkErr,
                  );
                else
                  console.log(
                    `Successfully cleaned up old physical file: ${oldPath}`,
                  );
              });
            }
          }
        },
      );
    }

    const filePath = req.file
      ? `/uploads/lessons/${req.file.filename}`
      : req.body.file_path;
    const fileType = req.file ? req.file.mimetype : req.body.file_type;

    db.run(
      "UPDATE lessons SET title = ?, content = ?, subject = ?, grade_level = ?, file_path = ?, file_type = ?, material_type = ?, material_link = ? WHERE id = ? AND (? = 1 OR school_id = ?)",
      [
        title,
        content,
        subject,
        grade_level,
        filePath,
        fileType,
        material_type || null,
        material_link || null,
        lessonId,
        req.user.is_super_admin || 0,
        req.user.school_id,
      ],
      function (err) {
        if (err) return res.status(500).json({ error: "Database error" });
        if (this.changes === 0) return res.status(403).json({ error: "Permission denied or lesson not found" });
        logActivity(
          req.user.id,
          req.user.username,
          "Cập nhật bài học",
          `Cập nhật bài học: ${title} (ID: ${lessonId})`,
        );
        res.json({ message: "Lesson updated" });
      },
    );
  },
);

app.put("/api/admin/exercises/:id", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }
  const {
    lesson_id,
    title,
    description,
    subject,
    grade_level,
    duration,
    questions,
  } = req.body;

  db.run(
    "UPDATE exercises SET lesson_id = ?, title = ?, description = ?, subject = ?, grade_level = ?, duration = ?, total_questions = ?, total_points = ? WHERE id = ? AND (? = 1 OR school_id = ?)",
    [
      lesson_id || null,
      title,
      description || null,
      subject,
      grade_level,
      duration || 30,
      questions.length,
      questions.reduce((sum, q) => sum + (q.points || 10), 0),
      req.params.id,
      req.user.school_id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) return res.status(403).json({ error: "Permission denied or exercise not found" });
      logActivity(
        req.user.id,
        req.user.username,
        "Cập nhật bài luyện tập",
        `Cập nhật bài luyện tập: ${title} (ID: ${req.params.id})`,
      );

      // Update questions: delete old and insert new (simple approach)
      db.run(
        "DELETE FROM exercise_questions WHERE exercise_id = ?",
        [req.params.id],
        () => {
          questions.forEach((q, index) => {
            db.run(
              "INSERT INTO exercise_questions (exercise_id, question, options, correct_answer, points, type, question_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [
                req.params.id,
                q.question,
                JSON.stringify(q.options),
                q.correct_answer,
                q.points || 10,
                q.type || "abcd",
                index,
              ],
            );
          });
          res.json({ message: "Exercise set updated" });
        },
      );
    },
  );
});

app.put("/api/admin/tests/:id", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }
  const { title, description, subject, grade_level, duration, questions } =
    req.body;

  db.run(
    "UPDATE tests SET title = ?, description = ?, subject = ?, grade_level = ?, duration = ?, total_questions = ?, total_points = ? WHERE id = ? AND (? = 1 OR school_id = ?)",
    [
      title,
      description || null,
      subject,
      grade_level,
      duration || 60,
      questions.length,
      questions.reduce((sum, q) => sum + (q.points || 10), 0),
      req.params.id,
      req.user.is_super_admin || 0,
      req.user.school_id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) return res.status(403).json({ error: "Permission denied or test not found" });
      logActivity(
        req.user.id,
        req.user.username,
        "Cập nhật bài kiểm tra",
        `Cập nhật bài kiểm tra: ${title} (ID: ${req.params.id})`,
      );

      db.run(
        "DELETE FROM test_questions WHERE test_id = ?",
        [req.params.id],
        () => {
          questions.forEach((q, index) => {
            db.run(
              "INSERT INTO test_questions (test_id, question, options, correct_answer, points, question_order, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [
                req.params.id,
                q.question,
                JSON.stringify(q.options),
                q.correct_answer,
                q.points || 10,
                index,
                q.type || "abcd",
              ],
            );
          });
          res.json({ message: "Test updated" });
        },
      );
    },
  );
});

app.put("/api/admin/vocabulary/:id", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }
  const { word, meaning, pronunciation, example, grade_level, subject, type } =
    req.body;

  db.run(
    "UPDATE vocabulary SET word = ?, meaning = ?, pronunciation = ?, example = ?, grade_level = ?, subject = ?, type = ? WHERE id = ? AND (? = 1 OR school_id = ?)",
    [
      word,
      meaning,
      pronunciation || null,
      example || null,
      grade_level || "thcs_6",
      subject || "anh",
      type || "speaking",
      req.params.id,
      req.user.is_super_admin || 0,
      req.user.school_id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) return res.status(403).json({ error: "Permission denied or vocabulary not found" });

      logActivity(
        req.user.id,
        req.user.username,
        "Cập nhật từ vựng",
        `Cập nhật từ vựng: ${word} (ID: ${req.params.id})`,
        req.user.is_super_admin === 1 ? null : req.user.school_id
      );
      res.json({ message: "Vocabulary updated" });
    },
  );
});

// Helper to cleanup violations when a parent item is deleted
const cleanupItemViolations = (itemId, itemType) => {
  db.all(
    "SELECT id, evidence_url FROM user_violations WHERE item_id = ? AND item_type = ?",
    [itemId, itemType],
    (err, rows) => {
      if (err || !rows) return;
      rows.forEach((row) => {
        if (row.evidence_url) {
          const fullPath = path.join(__dirname, row.evidence_url);
          if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (e) => {
              if (e)
                console.error(
                  `Sync cleanup unlink error (violation ${row.id}):`,
                  e,
                );
            });
          }
        }
        db.run("DELETE FROM user_violations WHERE id = ?", [row.id]);
      });
      console.log(`Cleaned up violations for ${itemType} ID: ${itemId}`);
    },
  );
};

app.delete("/api/admin/exercises/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const exerciseId = req.params.id;

  // 1. First find and cleanup audio files for all questions in this exercise
  db.all(
    "SELECT audio_url FROM exercise_questions WHERE exercise_id = ?",
    [exerciseId],
    (err, questions) => {
      if (questions && questions.length > 0) {
        questions.forEach((q) => {
          if (q.audio_url) {
            const fullPath = path.join(__dirname, q.audio_url);
            if (fs.existsSync(fullPath)) {
              fs.unlink(fullPath, (unlinkErr) => {
                if (unlinkErr)
                  console.error(
                    `Failed to delete exercise question audio: ${fullPath}`,
                    unlinkErr,
                  );
              });
            }
          }
        });
      }

      // 2. Proceed with DB deletion
      db.run("DELETE FROM exercises WHERE id = ? AND (? = 1 OR school_id = ?)", [exerciseId, req.user.is_super_admin || 0, req.user.school_id], function (err) {
        if (err) return res.status(500).json({ error: "Database error" });
        if (this.changes === 0) return res.status(403).json({ error: "Permission denied or exercise not found" });

        logActivity(
          req.user.id,
          req.user.username,
          "Xóa bài luyện tập",
          `Xóa bài luyện tập ID: ${exerciseId}`,
        );

        // Clean up associated questions
        db.run("DELETE FROM exercise_questions WHERE exercise_id = ?", [
          exerciseId,
        ]);
        // Clean up user progress for THIS specific exercise
        db.run("DELETE FROM user_progress WHERE exercise_id = ?", [exerciseId]);
        // Synchronize violation deletion
        cleanupItemViolations(exerciseId, "exercise");

        sendNotification(
          req.user.id,
          "Hệ thống",
          `Bạn đã xóa bài tập thành công.`,
          "warning",
        );
        res.json({ message: "Exercise set and associated progress deleted" });
      });
    },
  );
});

app.get("/api/admin/tests", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { grade_level, subject, search } = req.query;
  let query = "SELECT * FROM tests WHERE (? = 1 OR school_id = ?)";
  const params = [req.user.is_super_admin || 0, req.user.school_id];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }
  if (search) {
    query += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY id DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    // Fetch questions for each test
    const fetchQuestions = (index) => {
      if (index === rows.length) return res.json(rows);

      db.all(
        "SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_order",
        [rows[index].id],
        (qErr, questions) => {
          if (!qErr) {
            rows[index].questions = questions.map((q) => ({
              ...q,
              options: q.options ? JSON.parse(q.options) : [],
            }));
          }
          fetchQuestions(index + 1);
        },
      );
    };

    fetchQuestions(0);
  });
});

app.delete("/api/admin/tests/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const testId = req.params.id;

  // 1. First find and cleanup audio files for all questions in this test
  db.all(
    "SELECT audio_url FROM test_questions WHERE test_id = ?",
    [testId],
    (err, questions) => {
      if (questions && questions.length > 0) {
        questions.forEach((q) => {
          if (q.audio_url) {
            const fullPath = path.join(__dirname, q.audio_url);
            if (fs.existsSync(fullPath)) {
              fs.unlink(fullPath, (unlinkErr) => {
                if (unlinkErr)
                  console.error(
                    `Failed to delete question audio: ${fullPath}`,
                    unlinkErr,
                  );
              });
            }
          }
        });
      }

      // 2. Proceed with DB deletion
      db.run("DELETE FROM tests WHERE id = ? AND (? = 1 OR school_id = ?)", [testId, req.user.is_super_admin || 0, req.user.school_id], function (err) {
        if (err) return res.status(500).json({ error: "Database error" });
        if (this.changes === 0) return res.status(403).json({ error: "Permission denied or test not found" });

        logActivity(
          req.user.id,
          req.user.username,
          "Xóa bài kiểm tra",
          `Xóa bài kiểm tra ID: ${testId}`,
        );

        // Clean up questions
        db.run("DELETE FROM test_questions WHERE test_id = ?", [testId]);
        // Clean up results
        db.run("DELETE FROM test_results WHERE test_id = ?", [testId]);
        // Synchronize violation deletion
        cleanupItemViolations(testId, "test");

        sendNotification(
          req.user.id,
          "Hệ thống",
          `Bạn đã xóa bài kiểm tra thành công.`,
          "warning",
        );
        res.json({ message: "Test and associated results deleted" });
      });
    },
  );
});

app.get("/api/admin/vocabulary", authenticateToken, (req, res) => {
  if (
    req.user.role !== "admin" &&
    !(req.user.role === "teacher" && req.user.is_full_access === 1)
  ) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { grade_level, subject, search } = req.query;
  let query = "SELECT * FROM vocabulary WHERE 1=1";
  const params = [];

  if (req.user.is_super_admin !== 1) {
    query += " AND school_id = ?";
    params.push(req.user.school_id);
  }

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }
  if (search) {
    query += " AND (word LIKE ? OR meaning LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY id DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.delete("/api/admin/vocabulary/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const vocabId = req.params.id;

  db.run("DELETE FROM vocabulary WHERE id = ? AND (? = 1 OR school_id = ?)", [vocabId, req.user.is_super_admin || 0, req.user.school_id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    if (this.changes === 0) return res.status(403).json({ error: "Permission denied or vocabulary not found" });

    logActivity(
      req.user.id,
      req.user.username,
      "Xóa từ vựng",
      `Xóa từ vựng ID: ${vocabId}`,
    );

    // Clean up progress
    db.run("DELETE FROM vocabulary_progress WHERE vocabulary_id = ?", [
      vocabId,
    ]);

    sendNotification(
      req.user.id,
      "Hệ thống",
      `Bạn đã xóa từ vựng thành công.`,
      "warning",
    );
    res.json({ message: "Vocabulary deleted" });
  });
});

// Admin: Get vocabulary participation
app.get(
  "/api/admin/vocabulary/:id/participation",
  authenticateToken,
  (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Permission denied" });
    }

    const vocabId = req.params.id;
    const { grade_level } = req.query;

    let query = `
    SELECT vp.*, u.full_name, u.username, u.grade_level as user_grade
    FROM vocabulary_progress vp
    JOIN users u ON vp.user_id = u.id
    JOIN vocabulary v ON vp.vocabulary_id = v.id
    WHERE vp.vocabulary_id = ? AND v.school_id = ?
  `;
    const params = [vocabId, req.user.school_id];

    if (grade_level) {
      query += " AND u.grade_level = ?";
      params.push(grade_level);
    }

    query += " ORDER BY vp.created_at DESC";

    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    });
  },
);

// Student: Record vocabulary progress
app.post("/api/vocabulary/progress", authenticateToken, (req, res) => {
  const { vocabulary_id, type, score } = req.body;
  const userId = req.user.id;

  db.run(
    "INSERT INTO vocabulary_progress (user_id, vocabulary_id, type, score) VALUES (?, ?, ?, ?)",
    [userId, vocabulary_id, type, score || 0],
    (err) => {
      if (err) return res.status(500).json({ error: "Database error" });

      // Update study streak if needed (simplified)
      db.run(
        "UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?",
        [userId],
      );

      res.json({ message: "Progress recorded" });
    },
  );
});

app.delete("/api/admin/users/:id", authenticateToken, (req, res) => {
  db.get(
    "SELECT username, role, is_super_admin, school_id FROM users WHERE id = ?",
    [req.user.id],
    (err, currentUser) => {
      if (
        err ||
        !currentUser ||
        (currentUser.role !== "admin" && currentUser.role !== "teacher")
      ) {
        return res
          .status(403)
          .json({ error: "Bạn không có quyền thực hiện thao tác này" });
      }

      const targetUserId = parseInt(req.params.id);
      if (targetUserId === req.user.id) {
        return res.status(400).json({ error: "Không thể xóa chính mình" });
      }

      db.get(
        "SELECT role, is_super_admin, school_id FROM users WHERE id = ?",
        [targetUserId],
        (err, targetUser) => {
          if (err || !targetUser) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
          }

          // Data Isolation: School admin can only delete users in their school
          if (
            currentUser.is_super_admin !== 1 &&
            currentUser.school_id !== targetUser.school_id
          ) {
            return res
              .status(403)
              .json({
                error: "Bạn không có quyền xóa người dùng ở trường khác",
              });
          }

          // Restriction: Only system admin or users with role 'admin' can delete staff/admins
          // Others (like teachers) can only delete students
          if (
            currentUser.role !== "admin" &&
            currentUser.is_super_admin !== 1 &&
            targetUser.role !== "student"
          ) {
            return res
              .status(403)
              .json({
                error:
                  "Bạn chỉ có quyền xóa học sinh. Thông tin cán bộ chỉ admin mới có quyền xóa.",
              });
          }

          db.run(
            "DELETE FROM users WHERE id = ?",
            [targetUserId],
            function (err) {
              if (err) {
                return res.status(500).json({ error: "Database error" });
              }
              logActivity(
                req.user.id,
                req.user.username,
                "Xóa người dùng",
                `Xóa người dùng ID: ${targetUserId} (Role: ${targetUser.role})`,
                req.user.school_id,
              );
              res.json({ message: "Người dùng đã được xóa" });

              // Real-time update for admins (Isolated by school)
              if (targetUser.school_id) {
                io.to(`school_${targetUser.school_id}`).emit("user-updated", {
                  type: "delete",
                  userId: targetUserId,
                });
              }
            },
          );
        },
      );
    },
  );
});

// Admin: Toggle Teacher Full Access
app.post(
  "/api/admin/users/:id/toggle-access",
  authenticateToken,
  (req, res) => {
    db.get(
      "SELECT role, is_super_admin, school_id FROM users WHERE id = ?",
      [req.user.id],
      (err, currentUser) => {
        if (
          err ||
          !currentUser ||
          (currentUser.role !== "admin" && currentUser.is_super_admin !== 1)
        ) {
          return res
            .status(403)
            .json({ error: "Chỉ Admin mới có quyền cấp quyền" });
        }

        const targetUserId = req.params.id;
        const { is_full_access } = req.body;

        db.get(
          "SELECT school_id FROM users WHERE id = ?",
          [targetUserId],
          (tErr, targetUser) => {
            if (tErr || !targetUser)
              return res
                .status(404)
                .json({ error: "Không tìm thấy người dùng" });

            // Data Isolation
            if (
              currentUser.is_super_admin !== 1 &&
              currentUser.school_id !== targetUser.school_id
            ) {
              return res
                .status(403)
                .json({
                  error:
                    "Bạn không có quyền thay đổi quyền hạn người dùng ở trường khác",
                });
            }

            db.run(
              'UPDATE users SET is_full_access = ? WHERE id = ? AND role = "teacher"',
              [is_full_access ? 1 : 0, targetUserId],
              function (err) {
                if (err)
                  return res.status(500).json({ error: "Database error" });
                logActivity(
                  req.user.id,
                  req.user.username,
                  "Cập nhật quyền giáo viên",
                  `Thay đổi is_full_access thành ${is_full_access} cho Teacher ID: ${targetUserId}`,
                  req.user.school_id,
                );
                res.json({
                  message: "Quyền hạn của giáo viên đã được cập nhật",
                });
              },
            );
          },
        );
      },
    );
  },
);

// Admin: Update User Profile
app.post("/api/admin/users/:id", authenticateToken, (req, res) => {
  // Check if current user is admin or teacher with full access
  db.get(
    "SELECT role, is_full_access, is_super_admin, school_id FROM users WHERE id = ?",
    [req.user.id],
    (err, currentUser) => {
      if (
        err ||
        !currentUser ||
        (currentUser.role !== "admin" &&
          currentUser.is_full_access !== 1 &&
          currentUser.is_super_admin !== 1)
      ) {
        return res
          .status(403)
          .json({
            error:
              "Chỉ Admin hoặc giáo viên có quyền quản trị mới có thể cập nhật thông tin",
          });
      }

      const targetUserId = req.params.id;
      const {
        full_name,
        email,
        role,
        grade_level,
        school,
        birth_date,
        specialty,
        qualification,
        gender,
        place_of_birth,
        province,
        district,
        ward,
        school_level,
        class_name,
        current_class_id,
      } = req.body;

      db.get(
        "SELECT role, username, school_id FROM users WHERE id = ?",
        [targetUserId],
        (err, targetUser) => {
          if (err || !targetUser)
            return res.status(404).json({ error: "Không tìm thấy người dùng" });

          // Data Isolation
          if (
            currentUser.is_super_admin !== 1 &&
            currentUser.school_id !== targetUser.school_id
          ) {
            return res
              .status(403)
              .json({
                error:
                  "Bạn không có quyền cập nhật thông tin người dùng ở trường khác",
              });
          }

          // Restriction: Only system admin or users with role 'admin' can modify other admins/teachers
          if (
            currentUser.role !== "admin" &&
            currentUser.is_super_admin !== 1 &&
            targetUser.role !== "student"
          ) {
            return res
              .status(403)
              .json({ error: "Bạn chỉ có quyền cập nhật thông tin học sinh" });
          }

          db.run(
            "UPDATE users SET full_name = ?, email = ?, role = ?, grade_level = ?, school = ?, birth_date = ?, specialty = ?, qualification = ?, gender = ?, place_of_birth = ?, province = ?, district = ?, ward = ?, school_level = ?, class_name = ?, class_id = ? WHERE id = ?",
            [
              full_name,
              email || null,
              role,
              grade_level || null,
              school || null,
              birth_date || null,
              specialty || null,
              qualification || null,
              gender || null,
              place_of_birth || null,
              province || null,
              district || null,
              ward || null,
              school_level || null,
              class_name || null,
              current_class_id || null,
              targetUserId,
            ],
            function (err) {
              if (err) {
                console.error("Update user error:", err);
                return res.status(500).json({ error: "Cập nhật thất bại" });
              }
              logActivity(
                req.user.id,
                req.user.username,
                "Cập nhật người dùng",
                `Đã cập nhật thông tin cho ${targetUser.username} (ID: ${targetUserId})`,
                req.user.school_id,
              );
              res.json({
                message: "Thông tin người dùng đã được cập nhật thành công",
              });

              // Real-time update for admins (Isolated by school)
              if (targetUser.school_id) {
                io.to(`school_${targetUser.school_id}`).emit("user-updated", {
                  type: "update",
                  userId: targetUserId,
                });
              }
            },
          );
        },
      );
    },
  );
});

// (Duplicate Super Admin Endpoints removed)

// --- USER FEEDBACK ENDPOINT ---
app.post(
  "/api/feedback",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    const { subject, message } = req.body;
    const imageUrl = req.file ? `/uploads/feedback/${req.file.filename}` : null;

    // AI Categorization (Async but don't block response too long)
    let aiCategory = "Khác";
    try {
      const prompt = `Hãy phân loại phản hồi sau đây của học sinh vào một trong các nhóm: "Lỗi hệ thống", "Góp ý tính năng", "Nội dung học tập", "Khen ngợi" hoặc "Khác". 
      Chỉ trả về DUY NHẤT tên nhóm.
      Tiêu đề: ${subject}
      Nội dung: ${message}`;

      const category = await generateWithAI(prompt, null, "chat");
      if (category) aiCategory = category.trim();
    } catch (e) {
      console.error("AI Categorization failed:", e);
    }

    db.run(
      "INSERT INTO system_feedback (user_id, school_id, subject, message, image_url, ai_category) VALUES (?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        req.user.school_id,
        subject,
        message,
        imageUrl,
        aiCategory,
      ],
      (err) => {
        if (err) {
          console.error("Database error inserting feedback:", err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({
          message: "Cảm ơn phản hồi của bạn! Chúng tôi sẽ xem xét sớm nhất.",
          category: aiCategory,
        });
      },
    );
  },
);

// Get user progress
app.get("/api/user/progress", authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `
SELECT
l.id as lesson_id,
  l.title as lesson_title,
  l.subject,
  l.grade_level,
  MAX(up.completed) as completed,
  MAX(up.score) as score,
  MAX(up.completed_at) as completed_at,
  (COALESCE((SELECT study_time FROM user_progress WHERE user_id = ? AND lesson_id = l.id AND exercise_id IS NULL LIMIT 1), 0) +
  COALESCE((SELECT SUM(study_time) FROM user_progress WHERE user_id = ? AND lesson_id = l.id AND exercise_id IS NOT NULL), 0)) as total_study_time,
    (SELECT COUNT(*) FROM exercises WHERE lesson_id = l.id) as total_exercises,
      (SELECT COUNT(DISTINCT exercise_id) FROM user_progress WHERE user_id = ? AND lesson_id = l.id AND completed = 1 AND exercise_id IS NOT NULL) as completed_exercises
    FROM lessons l
    LEFT JOIN user_progress up ON l.id = up.lesson_id AND up.user_id = ?
  GROUP BY l.id
    ORDER BY l.created_at DESC
  `,
    [userId, userId, userId, userId],
    (err, progress) => {
      if (err) {
        console.error("Progress API Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(progress);
    },
  );
});

// Get learning paths
app.get("/api/learning-paths", authenticateToken, (req, res) => {
  const { grade_level, subject } = req.query;
  let query = "SELECT * FROM learning_paths WHERE 1=1";
  const params = [];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, paths) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(paths);
  });
});

// Get learning path details
app.get("/api/learning-paths/:id", authenticateToken, (req, res) => {
  db.get(
    "SELECT * FROM learning_paths WHERE id = ?",
    [req.params.id],
    (err, path) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (!path) {
        return res.status(404).json({ error: "Learning path not found" });
      }

      db.all(
        `
      SELECT s.*, lp.completed, lp.completed_at 
      FROM learning_path_steps s 
      LEFT JOIN learning_path_progress lp ON s.id = lp.step_id AND lp.user_id = ?
  WHERE s.path_id = ?
    ORDER BY s.step_order
    `,
        [req.user.id, req.params.id],
        (err, steps) => {
          if (err) {
            return res.status(500).json({ error: "Database error" });
          }
          res.json({ ...path, steps });
        },
      );
    },
  );
});

// (Duplicate AI Pronunciation check removed - see line 3265 for integrated version)

// (test_violations moved to main db.serialize block)

// Tests endpoints
app.get("/api/tests", authenticateToken, (req, res) => {
  const { grade_level, subject } = req.query;
  let query = "SELECT * FROM tests WHERE school_id = ?";
  const params = [req.user.school_id];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, tests) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(tests);
  });
});

app.get("/api/tests/:id", authenticateToken, (req, res) => {
  db.get("SELECT * FROM tests WHERE id = ?", [req.params.id], (err, test) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    db.get(
      "SELECT COUNT(*) as count FROM test_results WHERE user_id = ? AND test_id = ?",
      [req.user.id, req.params.id],
      (err, row) => {
        const currentAttempts = row ? row.count : 0;
        db.all(
          "SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_order",
          [req.params.id],
          (err, questions) => {
            if (err) {
              return res.status(500).json({ error: "Database error" });
            }
            res.json({ ...test, questions, current_attempts: currentAttempts });
          },
        );
      },
    );
  });
});

app.post("/api/tests/submit", authenticateToken, (req, res) => {
  const { test_id, answers, start_time } = req.body;
  const userId = req.user.id;

  db.get("SELECT * FROM tests WHERE id = ?", [test_id], (err, test) => {
    if (err || !test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const processTestSubmission = () => {
      db.all(
        "SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_order",
        [test_id],
        (err, questions) => {
          if (err) {
            return res.status(500).json({ error: "Database error" });
          }

          let score = 0;
          const results = questions.map((q, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === q.correct_answer;
            if (isCorrect) score += q.points;
            return {
              question: q.question,
              userAnswer,
              correctAnswer: q.correct_answer,
              isCorrect,
              points: isCorrect ? q.points : 0,
            };
          });

          const percentage = (score / test.total_points) * 100;

          // Adaptive Learning: Save Smart Notes for incorrect answers
          results
            .filter((r) => !r.isCorrect)
            .forEach((r) => {
              db.run(
                `
                INSERT INTO smart_notes (user_id, item_type, item_id, question_text, user_answer, correct_answer)
                VALUES (?, 'test', ?, ?, ?, ?)
              `,
                [
                  userId,
                  test_id,
                  r.question,
                  r.userAnswer || "",
                  r.correctAnswer,
                ],
              );
            });

          // Update user points and achievements
          db.run(
            "UPDATE users SET points = points + ? WHERE id = ?",
            [score, userId],
            (err) => {
              if (!err) {
                checkAchievements(userId);
              }
            },
          );

          res.json({
            score,
            totalScore: test.total_points,
            percentage,
            results,
          });
        },
      );
    };

    // Check attempt limit
    if (test.max_attempts > 0) {
      db.get(
        "SELECT COUNT(*) as count FROM test_results WHERE user_id = ? AND test_id = ?",
        [userId, test_id],
        (err, row) => {
          if (!err && row && row.count >= test.max_attempts) {
            return res
              .status(403)
              .json({
                error: `Bạn đã hết lượt làm bài thi (Tối đa ${test.max_attempts} lần).`,
              });
          }
          processTestSubmission();
        },
      );
    } else {
      processTestSubmission();
    }
  });
});

// Admin: Create test
app.post("/api/admin/tests", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Admin or teacher access required" });
  }

  const { title, description, subject, grade_level, duration, questions } =
    req.body;

  db.run(
    "INSERT INTO tests (title, description, subject, grade_level, duration, total_questions, total_points, created_by, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      title,
      description || null,
      subject,
      grade_level,
      duration || 60,
      questions ? questions.length : 0,
      questions ? questions.reduce((sum, q) => sum + (q.points || 10), 0) : 0,
      req.user.id,
      req.user.school_id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to create test" });
      }

      const testId = this.lastID;
      logActivity(
        req.user.id,
        req.user.username,
        "Tạo bài kiểm tra",
        `Tạo bài kiểm tra mới: ${title} (ID: ${testId})`,
      );
      res.json({ id: testId, message: "Test created successfully" });
      sendNotification(
        req.user.id,
        "Hệ thống",
        `Bạn đã tạo bài kiểm tra "${title}" thành công.`,
        "info",
      );
      sendGroupNotification(
        grade_level,
        "Bài kiểm tra mới! 📝",
        `Bài kiểm tra: ${title} đã được mở. Hãy chuẩn bị thật kỹ nhé!`,
        "warning",
        `/tests/${testId}`,
      );

      if (!questions || questions.length === 0) return;

      let inserted = 0;
      questions.forEach((q, index) => {
        db.run(
          "INSERT INTO test_questions (test_id, question, options, correct_answer, points, question_order, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            testId,
            q.question,
            JSON.stringify(q.options),
            q.correct_answer,
            q.points || 10,
            index,
            q.type || "abcd",
          ],
          function (err) {
            if (err) console.error("Error inserting question:", err);
            inserted++;
          },
        );
      });
    },
  );
});

// Admin: Create learning path
app.post("/api/admin/learning-paths", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Admin or teacher access required" });
  }

  const { title, description, grade_level, subject, steps } = req.body;

  db.run(
    "INSERT INTO learning_paths (title, description, grade_level, subject, school_id) VALUES (?, ?, ?, ?, ?)",
    [
      title,
      description || null,
      grade_level,
      subject || null,
      req.user.school_id,
    ],
    function (err) {
      if (err) {
        return res
          .status(500)
          .json({ error: "Failed to create learning path" });
      }

      const pathId = this.lastID;

      if (steps && steps.length > 0) {
        steps.forEach((step, index) => {
          db.run(
            "INSERT INTO learning_path_steps (path_id, lesson_id, step_order, title, description) VALUES (?, ?, ?, ?, ?)",
            [
              pathId,
              step.lesson_id || null,
              index,
              step.title,
              step.description || null,
            ],
          );
        });
      }

      res.json({ id: pathId, message: "Learning path created successfully" });
    },
  );
});

// New: Delete Learning Path
app.delete("/api/admin/learning-paths/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const pathId = req.params.id;

  db.run("DELETE FROM learning_paths WHERE id = ? AND school_id = ?", [pathId, req.user.school_id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    if (this.changes === 0) return res.status(403).json({ error: "Permission denied or path not found" });

    logActivity(
      req.user.id,
      req.user.username,
      "Xóa lộ trình học",
      `Xóa lộ trình học ID: ${pathId}`,
    );

    // Cascade delete steps
    db.run("DELETE FROM learning_path_steps WHERE path_id = ?", [pathId]);
    // Cascade delete progress
    db.run("DELETE FROM learning_path_progress WHERE path_id = ?", [pathId]);

    sendNotification(
      req.user.id,
      "Hệ thống",
      `Đã xóa lộ trình học tập thành công.`,
      "warning",
    );
    res.json({ message: "Learning path deleted" });
  });
});

// Admin: Get all learning paths
app.get("/api/admin/learning-paths", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const { grade_level, subject } = req.query;
  let query = "SELECT * FROM learning_paths WHERE school_id = ?";
  const params = [req.user.school_id];

  if (grade_level) {
    query += " AND grade_level = ?";
    params.push(grade_level);
  }
  if (subject) {
    query += " AND subject = ?";
    params.push(subject);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// --- CLASS MANAGEMENT APIs ---

// Public: Get all classes (for students)
app.get("/api/classes", (req, res) => {
  db.all(
    "SELECT id, name, grade_level, schedule_start, schedule_end, schedule_days FROM classes",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

// Student: Get current class status and schedule
app.get("/api/user/class-status", authenticateToken, (req, res) => {
  db.get(
    "SELECT current_class_id FROM users WHERE id = ?",
    [req.user.id],
    (err, user) => {
      if (err || !user?.current_class_id) {
        return res.json({
          in_class: false,
          participation_status: "Không tham gia",
        });
      }

      db.get(
        "SELECT * FROM classes WHERE id = ?",
        [user.current_class_id],
        (err, cls) => {
          if (err || !cls) {
            return res.json({
              in_class: false,
              participation_status: "Không tham gia",
            });
          }

          res.json({
            id: cls.id,
            in_class: true,
            class_name: cls.name,
            schedule_start: cls.schedule_start,
            schedule_end: cls.schedule_end,
            schedule_days: cls.schedule_days
              ? JSON.parse(cls.schedule_days)
              : [],
            study_monitoring: !!cls.study_monitoring_enabled,
            test_monitoring: !!cls.test_monitoring_enabled,
            social_monitoring: !!cls.social_monitoring_enabled,
          });
        },
      );
    },
  );
});

// Admin: Get student monitoring data
app.get("/api/admin/students/monitoring", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  let query = `
    SELECT u.id, u.username, u.full_name, u.avatar_url, u.grade_level, u.participation_status, 
           u.os_info, u.browser_info, u.ip_address, u.last_activity, u.current_class_id,
           u.school_id, c.name as class_name
    FROM users u
    LEFT JOIN classes c ON u.current_class_id = c.id
    WHERE u.role = 'student'
  `;
  const params = [];

  if (req.user.is_super_admin !== 1) {
    query += " AND u.school_id = ?";
    params.push(req.user.school_id);
  }

  query += " ORDER BY u.last_activity DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// AI Social Media Violation Verification
app.post(
  "/api/admin/violations/verify-social",
  authenticateToken,
  upload.single("frame"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No frame uploaded" });
    const { userId } = req.body;

    try {
      const frameBase64 = fs.readFileSync(req.file.path, {
        encoding: "base64",
      });

      // AI Detection Prompt - STRENGHTENED for extremely strict key-based detection
      const prompt = `
      Bạn là một giám thị AI CỰC KỲ NGHIÊM KHẮC. Hãy phân tích ảnh chụp màn hình để tìm các DẤU HIỆU VI PHẠM (Mạng xã hội, AI Tool, Giải trí):

      NHIỆM VỤ: Kiểm tra các "Key Visual" sau:
      1. TRÌNH DUYỆT/URL: Nhìn vào thanh địa chỉ (Address Bar) hoặc tab trình duyệt nếu thấy: facebook.com, youtube.com, zalo.me, tiktok.com, chatgpt.com, gemini.google.com, claude.ai, v.v.
      2. WINDOW TITLE: Tiêu đề cửa sổ có chứa: "Facebook", "YouTube", "Zalo", "ChatGPT", "Gemini", "Copilot".
      3. UI ELEMENTS: 
         - Thanh điều hướng màu xanh đặc trưng của Facebook.
         - Logo YouTube (nút Play đỏ) hoặc giao diện Sidebar YouTube.
         - Sidebar AI Assistant (Edge Copilot, ChatGPT Sidebar).
         - Giao diện chat/tin nhắn của Zalo, Telegram, Discord, Messenger.
      
      TRẢ VỀ JSON: { "is_social_media": true, "reason": "Tên ứng dụng/web vi phạm (ghi rõ tên công cụ/mạng xã hội)" }
      CHỈ TRẢ VỀ: { "is_social_media": false, "reason": "" } NẾU MÀN HÌNH CHỈ CÓ TRANG HỌC TẬP/THI HOẶC DESKTOP TRỐNG.
    `;

      const imagePart = {
        inlineData: {
          data: frameBase64,
          mimeType: req.file.mimetype,
        },
      };

      const resultText = await generateWithAI(prompt, imagePart, "proctoring");
      let result;
      try {
        result = JSON.parse(resultText.replace(/```json|```/g, "").trim());
      } catch (e) {
        result = { is_social_media: false, reason: "Không thể nhận diện" };
      }

      if (result.is_social_media) {
        // Save as violation
        const evidenceUrl = `/uploads/violations/${req.file.filename}`;
        const metadata = JSON.stringify({
          reason: result.reason,
          timestamp: new Date().toISOString(),
        });

        // Get school_id from reported user
        db.get(
          "SELECT school_id FROM users WHERE id = ?",
          [userId],
          (uErr, targetUser) => {
            const schoolId = targetUser
              ? targetUser.school_id
              : req.user.school_id;

            db.run(
              "INSERT INTO user_violations (user_id, item_id, item_type, violation_type, evidence_url, metadata, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [
                userId,
                0,
                "social_media",
                result.reason,
                evidenceUrl,
                metadata,
                schoolId,
              ],
              (err) => {
                if (err) console.error("Social media violation DB error:", err);
                else {
                  // Real-time notification isolated by school
                  io.to(`school_${schoolId}`).emit("new-violation-record", {
                    user_id: userId,
                    item_id: 0,
                    item_type: "social_media",
                    violation_type: result.reason,
                    evidence_url: evidenceUrl,
                    metadata: metadata,
                    created_at: new Date(),
                  });
                }
              },
            );
          },
        );
      } else {
        // Delete temporary frame if not a violation
        fs.unlink(req.file.path, (e) => { });
      }

      res.json(result);
    } catch (err) {
      console.error("AI Verification Error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  },
);

// Admin: Get learning path by ID
app.get("/api/admin/learning-paths/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }
  const pathId = req.params.id;

  db.get("SELECT * FROM learning_paths WHERE id = ? AND school_id = ?", [pathId, req.user.school_id], (err, path) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!path)
      return res.status(404).json({ error: "Learning path not found" });

    db.all(
      "SELECT * FROM learning_path_steps WHERE path_id = ? ORDER BY step_order",
      [pathId],
      (err, steps) => {
        if (err) return res.status(500).json({ error: "Database error" });
        path.steps = steps;
        res.json(path);
      },
    );
  });
});

// Report Violation
app.post(
  "/api/user/violation",
  authenticateToken,
  upload.single("screenshot"),
  (req, res) => {
    const { item_id, item_type, type, metadata } = req.body;
    const userId = req.user.id;
    const evidenceUrl = req.file
      ? `/uploads/violations/${req.file.filename}`
      : null;

    // Accept both 'violation_type' and 'type' for compatibility
    const vType = type || req.body.violation_type || "Unknown";

    // Ensure metadata is stored as JSON string
    const metaStr =
      typeof metadata === "string" ? metadata : JSON.stringify(metadata || {});

    // Ensure item_id is a number if possible, or 0
    let itemIdInt = parseInt(item_id);
    if (isNaN(itemIdInt)) itemIdInt = 0;

    console.log("VIOLATION REPORT RECEIVED:", {
      userId,
      item_id: itemIdInt,
      raw_item_id: item_id,
      item_type: item_type || "unknown",
      vType,
      hasFile: !!req.file,
      meta: metaStr,
    });

    // Shared AI Processor
    // Shared AI Processor
    // Shared AI Processor
    const verifyViolationWithAI = async (data, file, isExisting = false) => {
      try {
        const userData = await new Promise((r) =>
          db.get(
            "SELECT current_class_id, school_id FROM users WHERE id = ?",
            [data.user_id],
            (err, row) => r(row || {}),
          ),
        );
        const cls = await new Promise((r) =>
          db.get(
            "SELECT study_monitoring_enabled, social_media_monitoring_enabled, test_monitoring_enabled FROM classes WHERE id = ?",
            [userData.current_class_id],
            (err, row) => r(row || {}),
          ),
        );
        const globalSettings = await new Promise((r) =>
          db.all(
            "SELECT key, value FROM settings WHERE key IN ('proctoring_enabled', 'social_monitoring_enabled', 'test_monitoring_enabled') AND (school_id = ? OR school_id IS NULL) ORDER BY school_id ASC",
            [userData.school_id],
            (err, rows) => {
              const s = {};
              if (rows)
                rows.forEach(
                  (row) =>
                    (s[row.key] = row.value === "1" || row.value === "true"),
                );
              r(s);
            },
          ),
        );

        const isStudyEnabled =
          !!cls.study_monitoring_enabled || !!globalSettings.proctoring_enabled;
        const isSocialEnabled =
          !!cls.social_media_monitoring_enabled ||
          !!globalSettings.social_monitoring_enabled;
        const isTestEnabled =
          !!cls.test_monitoring_enabled ||
          !!globalSettings.test_monitoring_enabled;

        const schoolId = userData.school_id;

        const isTest = data.item_type === "test" || isTestEnabled;
        let visuals = "";
        if (isTest) {
          visuals =
            "ChatGPT, Gemini, Claude, Copilot, Facebook, Youtube, Zalo, Messenger, Discord, Telegram, TikTok.";
        } else {
          if (isStudyEnabled)
            visuals +=
              "ChatGPT, Gemini, Claude, Copilot, Blackbox, Monica AI, Sider, HyperWrite, Quillbot.\n";
          if (isSocialEnabled)
            visuals +=
              "Facebook, Messenger, Zalo, Discord, Telegram, TikTok, Youtube, Netflix, Spotify.\n";
        }
        const frame = fs.readFileSync(file.path, "base64");
        const prompt = `
        Bạn là Hệ thống Giám thị AI. Hãy phân tích ảnh chụp màn hình để phát hiện hành vi gian lận.
        
        QUY TẮC CẦN KIỂM TRA:
        1. AI TOOLS: Nếu thấy giao diện chat, logo hoặc văn bản liên quan đến: ${visuals?.includes("ChatGPT") ? "ChatGPT, Gemini, Claude, Copilot, Blackbox AI" : "Công cụ AI (Gemini/ChatGPT)"}.
        2. SOCIAL MEDIA: Nếu thấy giao diện ${isTest ? "Mạng xã hội (Facebook, Zalo, Tiktok...)" : visuals}.
        3. BRANDING: Tìm các biểu tượng đặc trưng (Logo ChatGPT, logo G màu xanh của Gemini, sidebar Copilot).
        
        TRẢ VỀ DUY NHẤT JSON: { "is_violation": boolean, "reason": "Chi tiết vi phạm (ví dụ: Đang dùng ChatGPT)", "confidence": number (0-100) }
        NẾU KHÔNG VI PHẠM (Chỉ có trang web học tập, desktop sạch): { "is_violation": false, "reason": "", "confidence": 0 }
      `;
        const aiRes = await generateWithAI(
          prompt,
          { inlineData: { data: frame, mimeType: "image/jpeg" } },
          "proctoring",
        );
        const json = JSON.parse(
          aiRes.match(/\{[\s\S]*\}/)[0].replace(/```json|```/g, ""),
        );

        if (json.is_violation) {
          // Fetch User Info for payload enrichment
          const user = await new Promise((r) =>
            db.get(
              "SELECT u.full_name, u.username, u.avatar_url, c.name as class_name FROM users u LEFT JOIN classes c ON u.current_class_id = c.id WHERE u.id = ?",
              [data.user_id],
              (err, row) => r(row || {}),
            ),
          );

          if (isExisting) {
            db.run(
              "UPDATE user_violations SET ai_analysis = ?, ai_confidence = ? WHERE id = ?",
              [json.reason, json.confidence, data.id],
            );
            io.to(`school_${schoolId}`).emit("violation-updated", {
              ...data,
              ...user,
              ai_analysis: json.reason,
              ai_scanning: false,
            });
          } else {
            db.run(
              "INSERT INTO user_violations (user_id, item_id, item_type, violation_type, evidence_url, metadata, ai_analysis, ai_confidence, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                data.user_id,
                data.item_id,
                data.item_type,
                json.reason,
                data.evidence_url,
                data.metadata,
                json.reason,
                json.confidence,
                schoolId,
              ],
              function (err) {
                if (!err)
                  io.to(`school_${schoolId}`).emit("new-violation-record", {
                    ...data,
                    ...user,
                    id: this.lastID,
                    violation_type: json.reason,
                    ai_analysis: json.reason,
                    ai_scanning: false,
                  });
              },
            );
          }
        } else if (!isExisting && fs.existsSync(file.path)) {
          fs.unlink(file.path, () => { });
        }
      } catch (e) {
        console.error("AI Error:", e);
      }
    };

    if (vType === "background_scan") {
      res.json({ message: "Silent scan" });
      verifyViolationWithAI(
        {
          user_id: userId,
          item_id: itemIdInt,
          item_type: "monitoring",
          violation_type: vType,
          evidence_url: evidenceUrl,
          metadata: metaStr,
        },
        req.file,
        false,
      );
    } else {
      let displayType = vType;
      try {
        const metaParsed = JSON.parse(metaStr);
        if (metaParsed.reason) displayType = metaParsed.reason;
      } catch (e) { }

      // Fetch user details immediately to include in socket payload
      db.get(
        "SELECT u.full_name, u.username, u.avatar_url, u.school_id, c.name as class_name FROM users u LEFT JOIN classes c ON u.current_class_id = c.id WHERE u.id = ?",
        [userId],
        (err, user) => {
          let isProxy = false;
          try {
            const metaParsed = JSON.parse(metaStr);
            if (metaParsed.is_proxy) isProxy = true;
          } catch (e) { }

          const schoolId = user?.school_id || req.user.school_id;

          db.run(
            "INSERT INTO user_violations (user_id, item_id, item_type, violation_type, evidence_url, metadata, ai_analysis, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              userId,
              itemIdInt,
              item_type || "monitoring",
              displayType,
              evidenceUrl,
              metaStr,
              isProxy ? "Xác thực bởi Hệ thống (Proxy Catch)" : null,
              schoolId,
            ],
            function (err) {
              if (err) return res.status(500).json({ error: "DB Error" });

              const data = {
                id: this.lastID,
                user_id: userId,
                item_id: itemIdInt,
                item_type: item_type || "monitoring",
                violation_type: displayType,
                evidence_url: evidenceUrl,
                metadata: metaStr,
                ai_scanning: !isProxy,
                ai_analysis: isProxy
                  ? "Xác thực bởi Hệ thống (Proxy Catch)"
                  : null,
                full_name: user?.full_name,
                username: user?.username,
                avatar_url: user?.avatar_url,
                class_name: user?.class_name,
                school_id: schoolId,
                created_at: new Date().toISOString(),
              };
              io.to(`school_${schoolId}`).emit("new-violation-record", data);
              res.json({ message: "Recorded", id: data.id });
              if (req.file && !isProxy)
                verifyViolationWithAI(data, req.file, true);
            },
          );
        },
      );
    }
  },
);

// Upload Submission File
app.post(
  "/api/user/upload-submission",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { item_id, item_type } = req.body;
    const fileUrl = `/uploads/general/${req.file.filename}`;

    res.json({ file_url: fileUrl, message: "File uploaded successfully" });
  },
);

// Admin: Get all participation results with filters
app.get("/api/admin/participation", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  const { type, grade_level, start_date, end_date, test_id, exercise_id } =
    req.query;
  let query = "";
  let params = [];

  if (type === "test") {
    query = `
      SELECT tr.*, u.full_name, u.username, u.grade_level as user_grade, t.title as item_title
      FROM test_results tr
      JOIN users u ON tr.user_id = u.id
      JOIN tests t ON tr.test_id = t.id
      WHERE 1 = 1
  `;
    if (grade_level) {
      query += " AND u.grade_level = ?";
      params.push(grade_level);
    }
    if (test_id) {
      query += " AND tr.test_id = ?";
      params.push(test_id);
    }
    if (start_date) {
      query += " AND tr.completed_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND tr.completed_at <= ?";
      params.push(end_date);
    }
    query += " ORDER BY tr.completed_at DESC";
  } else {
    // Default or exercise/lesson progress
    query = `
      SELECT up.*, u.full_name, u.username, u.grade_level as user_grade,
  COALESCE(l.title, e.title) as item_title
      FROM user_progress up
      JOIN users u ON up.user_id = u.id
      LEFT JOIN lessons l ON up.lesson_id = l.id
      LEFT JOIN exercises e ON up.exercise_id = e.id
      WHERE 1 = 1
  `;
    if (grade_level) {
      query += " AND u.grade_level = ?";
      params.push(grade_level);
    }
    if (exercise_id) {
      query += " AND up.exercise_id = ?";
      params.push(exercise_id);
    }
    if (start_date) {
      query += " AND up.completed_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND up.completed_at <= ?";
      params.push(end_date);
    }
    query += " GROUP BY up.id ORDER BY up.completed_at DESC";
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching participation:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Admin: Report Violation (Base64 from Student)
app.post("/api/admin/violations/report", (req, res) => {
  const { user_id, violation_type, evidence_image, class_id } = req.body;
  if (!user_id || !evidence_image)
    return res.status(400).json({ error: "Missing data" });

  const fileName = `violation_${Date.now()}.jpg`;
  const relativePath = `/uploads/violations/${fileName}`;
  const uploadsDirLocal = path.join(__dirname, "uploads");
  const fullPath = path.join(uploadsDirLocal, "violations", fileName);

  // Ensure directory exists
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const base64Data = evidence_image.replace(/^data:image\/\w+;base64,/, "");

  fs.writeFile(fullPath, base64Data, "base64", (err) => {
    if (err) {
      console.error("Error saving violation file:", err);
      return res.status(500).json({ error: "Lỗi lưu file" });
    }

    const sql = `INSERT INTO user_violations (user_id, item_type, violation_type, evidence_url, created_at, metadata, school_id) 
                 VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`;

    const metadata = JSON.stringify({
      class_id,
      timestamp: new Date().toISOString(),
    });

    // Fetch student's school_id
    db.get(
      "SELECT u.full_name, u.username, u.school_id FROM users u WHERE u.id = ?",
      [user_id],
      (uErr, student) => {
        const schoolId = student ? student.school_id : null;

        db.run(
          sql,
          [
            user_id,
            "monitoring",
            violation_type,
            relativePath,
            metadata,
            schoolId,
          ],
          function (err) {
            if (err) {
              console.error("DB Error reporting violation:", err);
              return res.status(500).json({ error: err.message });
            }

            const recordId = this.lastID;

            // Broadcast to teacher dashboard (Isolated by school)
            if (schoolId) {
              io.to(`school_${schoolId}`).emit("new-violation-record", {
                id: recordId,
                user_id,
                full_name: student?.full_name,
                username: student?.username,
                violation_type,
                evidence_url: relativePath,
                created_at: new Date(),
                item_type: "monitoring",
                current_class_id: class_id,
              });
            }

            res.json({ success: true, id: recordId });
          },
        );
      },
    );
  });
});

// --- VIOLATION KEYS (Đồng bộ với Proxy C# Standard) ---
const VIOLATION_KEYS = {
  AI: [
    "openai",
    "chat.com",
    "bard",
    "claude",
    "perplexity",
    "poe",
    "copilot",
    "quillbot",
    "grammarly",
    "jasper",
    "lm",
    "gpt",
    "cursor",
    "gemini",
    "chatgpt",
    "chat.openai.com",
    "huggingface",
    "llama",
    "llm",
    "mistral",
    "groq",
    "moonshot",
    "notion ai",
    "you.com",
    "writesonic",
    "phind",
    "tabnine",
    "codewhisperer",
    "replika",
    "deepai",
    "character.ai",
    "codeium",
    "deepmind",
    "tome.app",
    "shortlyai",
    "copy.ai",
    "inferkit",
    "type.ai",
    "chatpdf",
    "upword",
    "ai21",
    "cohere",
    "wordtune",
    "scribe",
    "simplified",
    "writer.com",
    "peppertype",
    "frase",
    "anyword",
    "hypotenuse",
    "scalenut",
    "surferseo",
    "textcortex",
    "lex.page",
    "writecream",
    "rytr",
    "neuroflash",
    "lightpdf",
    "voicemaker",
    "suno",
    "heygen",
  ],
  SOCIAL: [
    "facebook",
    "zalo",
    "tiktok",
    "youtube",
    "instagram",
    "twitter",
    "riot",
    "garena",
    "liên minh huyền thoại",
    "lienminh",
    "valorant",
    "dota",
    "game",
    "steam",
    "discord",
    "netflix",
    "movie",
    "phim",
    "truyen",
  ],
};

// Xóa toàn bộ lịch sử vi phạm và ảnh (Tự động gọi khi Web/App khởi động)
app.post("/api/admin/violations/purge-all", authenticateToken, (req, res) => {
  let whereClause = " WHERE evidence_url IS NOT NULL";
  let params = [];
  if (req.user.is_super_admin !== 1) {
    whereClause += " AND school_id = ?";
    params.push(req.user.school_id);
  }

  db.all(
    `SELECT evidence_url FROM user_violations${whereClause}`,
    params,
    (err, rows) => {
      if (err) {
        console.error("Error fetching evidence for purge:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Xóa file vật lý
      if (rows && rows.length > 0) {
        rows.forEach((row) => {
          if (row.evidence_url) {
            // URLs usually start with /uploads/..., joining with __dirname to get full path
            // Some URLs might be base64 or external, we only target local uploads
            if (row.evidence_url.startsWith("/uploads/")) {
              const fullPath = path.join(__dirname, row.evidence_url);
              if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, (e) => {
                  if (e) console.error(`Failed to delete file: ${fullPath}`, e);
                });
              }
            }
          }
        });
      }

      // Xóa bản ghi trong DB
      let deleteSql = "DELETE FROM user_violations";
      if (req.user.is_super_admin !== 1) {
        deleteSql += " WHERE school_id = ?";
      }

      db.run(deleteSql, params, (dbErr) => {
        if (dbErr) {
          console.error("Error purging violations table:", dbErr);
          return res.status(500).json({ error: "Database error" });
        }

        console.log(
          "[PURGE] Successfully cleared all violations and evidence files.",
        );

        if (req.user.is_super_admin === 1) {
          io.emit("violations-purged");
        } else {
          io.to(`school_${req.user.school_id}`).emit("violations-purged");
        }

        res.json({ success: true, message: "Đã xóa sạch lịch sử vi phạm." });
      });
    },
  );
});

// Endpoint nhận log traffic từ App C# gửi qua (Tăng cường giám sát Proxy)
app.post("/api/proxy/check", (req, res) => {
  const { userId, url, classId, port, evidence_image } = req.body;
  if (!url || !userId) return res.sendStatus(400);

  let violationType = null;
  const lowerUrl = url.toLowerCase();

  // Kiểm tra xem URL có chứa từ khóa AI không
  if (VIOLATION_KEYS.AI.some((key) => lowerUrl.includes(key))) {
    violationType = "Sử dụng công cụ hỗ trợ AI/Học tập trái phép";
  }
  // Kiểm tra xem URL có chứa từ khóa SOCIAL không
  else if (VIOLATION_KEYS.SOCIAL.some((key) => lowerUrl.includes(key))) {
    violationType = "Truy cập Mạng xã hội/Giải trí trong giờ thi";
  }

  if (violationType) {
    const reason = `[Proxy Capture Port ${port || 1111}] ${violationType}: ${url}`;
    let evidenceUrl = null;

    if (evidence_image) {
      try {
        const fileName = `proxy_violation_${Date.now()}.jpg`;
        const relativePath = `/uploads/violations/${fileName}`;
        const fullPath = path.join(
          __dirname,
          "uploads",
          "violations",
          fileName,
        );

        // Ensure directory exists
        if (!fs.existsSync(path.dirname(fullPath))) {
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        }

        const base64Data = evidence_image.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        fs.writeFileSync(fullPath, base64Data, "base64");
        evidenceUrl = relativePath;
        console.log(
          `[PROXY] Evidence saved to standard uploads: ${evidenceUrl}`,
        );
      } catch (saveErr) {
        console.error("Error saving proxy violation image:", saveErr);
      }
    }

    // 1. Lấy thông tin User để gửi kèm tên/username qua Socket
    db.get(
      `SELECT full_name, username, school_id FROM users WHERE id = ?`,
      [userId],
      (userErr, userData) => {
        const userDisplayName =
          userData?.full_name || userData?.username || "Unknown";
        const userLoginName = userData?.username || userId;
        const schoolId = userData?.school_id || null;

        // 1. Lưu vào Database
        const sql = `INSERT INTO user_violations (user_id, item_type, violation_type, evidence_url, created_at, metadata, school_id) 
                   VALUES (?, 'monitoring', ?, ?, datetime('now'), ?, ?)`;

        const metadata = JSON.stringify({
          source: "proxy",
          port: port,
          full_url: url,
          class_id: classId,
          is_proxy_enhanced: true,
        });

        db.run(
          sql,
          [userId, reason, evidenceUrl, metadata, schoolId],
          function (err) {
            if (err) {
              console.error("Proxy Check DB Error:", err);
              return res.status(500).json({ error: err.message });
            }

            const recordId = this.lastID;

            // 2. Báo realtime cho giáo viên qua Socket (Isolated by school)
            io.to(`monitoring_${classId}`).emit("violation-detected", {
              studentId: userId,
              reason: reason,
              type: "proxy",
              evidence_url: evidenceUrl,
              full_name: userDisplayName,
              username: userLoginName,
            });

            // Cũng emit event chuẩn để Dashboard hiện trong danh sách lịch sử
            if (schoolId) {
              io.to(`school_${schoolId}`).emit("new-violation-record", {
                id: recordId,
                user_id: userId,
                full_name: userDisplayName,
                username: userLoginName,
                violation_type: reason,
                evidence_url: evidenceUrl,
                created_at: new Date(),
                item_type: "monitoring",
                current_class_id: classId,
                is_proxy_alert: true,
              });
            }

            console.log(
              `🛡️ [PROXY] Violation detected for User ${userId} (${userDisplayName}): ${violationType}`,
            );
          },
        );
      },
    );
  }
  res.sendStatus(200);
});

// Admin: Delete all violations
app.delete("/api/admin/violations/all", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  db.all(
    "SELECT evidence_url FROM user_violations WHERE evidence_url IS NOT NULL AND school_id = ?",
    [req.user.school_id],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error fetching violations" });

      // 1. Delete all evidence files
      rows.forEach((row) => {
        if (row.evidence_url) {
          const fullPath = path.join(__dirname, row.evidence_url);
          if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (unlinkErr) => {
              if (unlinkErr)
                console.error(
                  `Error deleting evidence file: ${fullPath}`,
                  unlinkErr,
                );
            });
          }
        }
      });

      // 2. Clear table
      db.run("DELETE FROM user_violations WHERE school_id = ?", [req.user.school_id], function (delErr) {
        if (delErr)
          return res
            .status(500)
            .json({ error: "Database error deleting violations" });

        logActivity(
          req.user.id,
          req.user.username,
          "Xóa tất cả vi phạm",
          "Đã xóa toàn bộ lịch sử vi phạm và tệp đối chứng.",
        );

        // 3. Sync frontend
        io.emit("violations-purged");

        res.json({ message: "All violations cleared successfully" });
      });
    },
  );
});

// Admin: Get all violations (Consolidated)
app.get("/api/admin/violations", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  const {
    grade_level,
    start_date,
    end_date,
    item_id,
    item_type,
    user_id,
    class_id,
  } = req.query;
  let query = `
    SELECT v.*, v.evidence_url as screenshot, u.full_name, u.username, u.grade_level, u.current_class_id,
      c.name as class_name,
      CASE 
        WHEN v.item_type = 'test' THEN (SELECT title FROM tests WHERE id = v.item_id)
        WHEN v.item_type = 'lesson' THEN (SELECT title FROM lessons WHERE id = v.item_id)
        WHEN v.item_type = 'exercise' THEN (SELECT title FROM exercises WHERE id = v.item_id)
        WHEN v.item_type = 'social_media' THEN 'Theo dõi MXH'
        WHEN v.item_type = 'monitoring' THEN 'Giám sát hệ thống'
        ELSE 'Khác'
      END as item_title
    FROM user_violations v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN classes c ON u.current_class_id = c.id
    WHERE 1 = 1
  `;
  let params = [];

  // Data Isolation
  if (req.user.is_super_admin !== 1) {
    query += " AND v.school_id = ?";
    params.push(req.user.school_id);
  }

  if (grade_level) {
    query += " AND u.grade_level = ?";
    params.push(grade_level);
  }
  if (class_id && class_id !== "all") {
    query += " AND u.current_class_id = ?";
    params.push(class_id);
  }
  if (item_id) {
    query += " AND v.item_id = ?";
    params.push(item_id);
  }
  if (item_type) {
    query += " AND v.item_type = ?";
    params.push(item_type);
  }
  if (user_id) {
    query += " AND v.user_id = ?";
    params.push(user_id);
  }
  if (start_date) {
    query += " AND v.created_at >= ?";
    params.push(start_date);
  }
  if (end_date) {
    query += " AND v.created_at <= ?";
    params.push(end_date + " 23:59:59");
  }

  query += " ORDER BY v.created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching violations:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Admin: Get violations for a specific user
app.get("/api/admin/violations/user/:userId", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  const userId = req.params.userId;
  db.all(
    `
    SELECT v.*, u.current_class_id,
      CASE 
        WHEN v.item_type = 'test' THEN (SELECT title FROM tests WHERE id = v.item_id)
        WHEN v.item_type = 'lesson' THEN (SELECT title FROM lessons WHERE id = v.item_id)
        WHEN v.item_type = 'exercise' THEN (SELECT title FROM exercises WHERE id = v.item_id)
        WHEN v.item_type = 'social_media' THEN 'Theo dõi MXH'
        WHEN v.item_type = 'monitoring' THEN 'Giám sát hệ thống'
        ELSE 'Khác'
      END as item_title
    FROM user_violations v
    JOIN users u ON v.user_id = u.id
    WHERE v.user_id = ? AND (v.school_id = ? OR 1 = ?)
    ORDER BY v.created_at DESC
  `,
    [userId, req.user.school_id, req.user.is_super_admin],
    (err, rows) => {
      if (err) {
        console.error("Error fetching user violations:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    },
  );
});

// Admin: Get all participation results with filters (Consolidated)
app.get("/api/admin/participation", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  const { type, grade_level, start_date, end_date, test_id, exercise_id } =
    req.query;
  let query = "";
  let params = [];

  const schoolFilter =
    req.user.is_super_admin === 1
      ? ""
      : " AND u.school_id = " + req.user.school_id;

  if (type === "test") {
    query = `
      SELECT tr.*, u.full_name, u.username, u.grade_level as user_grade, t.title as item_title
      FROM test_results tr
      JOIN users u ON tr.user_id = u.id
      JOIN tests t ON tr.test_id = t.id
      WHERE 1 = 1 ${schoolFilter}
  `;
    if (grade_level) {
      query += " AND u.grade_level = ?";
      params.push(grade_level);
    }
    if (test_id) {
      query += " AND tr.test_id = ?";
      params.push(test_id);
    }
    if (start_date) {
      query += " AND tr.completed_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND tr.completed_at <= ?";
      params.push(end_date + " 23:59:59");
    }
    query += " ORDER BY tr.completed_at DESC";
  } else {
    query = `
      SELECT up.*, u.full_name, u.username, u.grade_level as user_grade,
      COALESCE(l.title, e.title) as item_title
      FROM user_progress up
      JOIN users u ON up.user_id = u.id
      LEFT JOIN lessons l ON up.lesson_id = l.id
      LEFT JOIN exercises e ON up.exercise_id = e.id
      WHERE 1 = 1 ${schoolFilter}
  `;
    if (grade_level) {
      query += " AND u.grade_level = ?";
      params.push(grade_level);
    }
    if (exercise_id) {
      query += " AND up.exercise_id = ?";
      params.push(exercise_id);
    }
    if (start_date) {
      query += " AND up.completed_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND up.completed_at <= ?";
      params.push(end_date + " 23:59:59");
    }
    query += " GROUP BY up.id ORDER BY up.completed_at DESC";
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching participation:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// Admin: Delete participation result
app.delete(
  "/api/admin/participation/:type/:id",
  authenticateToken,
  (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { type, id } = req.params;
    const table = type === "test" ? "test_results" : "user_progress";

    // Data Isolation Check
    db.get(
      `SELECT u.school_id FROM ${table} t JOIN users u ON t.user_id = u.id WHERE t.id = ?`,
      [id],
      (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!row) return res.status(404).json({ error: "Record not found" });
        if (
          req.user.is_super_admin !== 1 &&
          row.school_id !== req.user.school_id
        ) {
          return res
            .status(403)
            .json({ error: "Permission denied for this school" });
        }

        db.run(`DELETE FROM ${table} WHERE id = ?`, [id], function (err) {
          if (err) {
            console.error("Error deleting participation:", err);
            return res
              .status(500)
              .json({ error: "Database error while deleting participation" });
          }
          logActivity(
            req.user.id,
            req.user.username,
            "Xóa kết quả làm bài",
            `Xóa kết quả bài ${type} (ID: ${id})`,
            req.user.school_id,
          );
          res.json({ message: "Participation record deleted successfully" });
        });
      },
    );
  },
);

// ---------------------------------------------------------
// Admin: Delete a violation
app.delete("/api/admin/violations/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  const violationId = req.params.id;

  db.get(
    "SELECT evidence_url, school_id FROM user_violations WHERE id = ?",
    [violationId],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(404).json({ error: "Violation not found" });

      // Data Isolation Check
      if (
        req.user.is_super_admin !== 1 &&
        row.school_id !== req.user.school_id
      ) {
        return res
          .status(403)
          .json({ error: "Permission denied for this school" });
      }

      // Delete associated file if it exists
      if (row.evidence_url) {
        const fullPath = path.join(__dirname, row.evidence_url);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (unlinkErr) => {
            if (unlinkErr)
              console.error(
                "Error deleting violation evidence file:",
                unlinkErr,
              );
          });
        }
      }

      db.run(
        "DELETE FROM user_violations WHERE id = ?",
        [violationId],
        function (err) {
          if (err) return res.status(500).json({ error: "Database error" });
          logActivity(
            req.user.id,
            req.user.username,
            "Xóa vi phạm",
            `Xóa vi phạm ID: ${violationId}`,
            req.user.school_id,
          );
          res.json({ message: "Violation deleted successfully" });
        },
      );
    },
  );
});

// AI Scan for student violations
app.post(
  "/api/admin/violations/scan/:id",
  authenticateToken,
  async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { id } = req.params;

    db.get(
      `
    SELECT v.*, u.full_name, u.username 
    FROM user_violations v
    JOIN users u ON v.user_id = u.id
    WHERE v.id = ?
  `,
      [id],
      async (err, violation) => {
        if (err || !violation)
          return res.status(404).json({ error: "Violation not found" });

        const prompt = `
      Hãy phân tích xem hành động sau có phải là hành vi sử dụng công cụ AI(ChatGPT, Gemini, v.v.) để làm bài hay không. 
      Hành động: ${violation.violation_type}
      Mô tả: Trong quá trình làm bài ${violation.item_type} ID ${violation.item_id}, học sinh ${violation.full_name} đã thực hiện: ${violation.violation_type}.
      Nếu là 'Paste', hãy đánh giá khả năng học sinh copy bài từ ngoài vào.
      Trả về JSON: { "is_ai_likely": true, "confidence": 0 - 100, "reason": "lý do tiếng Việt" }
`;

        try {
          const text = await generateWithAI(prompt, null, "proctoring");
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            res.json(JSON.parse(jsonMatch[0]));
          } else {
            res.json({
              is_ai_likely: false,
              confidence: 50,
              reason: "Không thể phân tích chính xác",
            });
          }
        } catch (error) {
          console.error("AI Scan Error:", error);
          res.status(500).json({ error: "AI analysis failed" });
        }
      },
    );
  },
);

// Public/Student: Get Global Proctoring Settings
app.get("/api/settings/proctoring", (req, res) => {
  const school_id = req.query.school_id || null;
  db.all(
    "SELECT key, value FROM settings WHERE key IN ('proctoring_enabled', 'social_monitoring_enabled', 'test_monitoring_enabled') AND (school_id = ? OR school_id IS NULL) ORDER BY school_id ASC",
    [school_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      const settings = {
        proctoring_enabled: false,
        social_monitoring_enabled: false,
        test_monitoring_enabled: false,
      };
      rows.forEach((row) => {
        settings[row.key] = row.value === "1" || row.value === "true";
      });
      res.json(settings);
    },
  );
});

// Admin: Toggle Global Proctoring
app.post("/api/admin/settings/proctoring", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }
  const { enabled } = req.body;
  db.run(
    "INSERT OR REPLACE INTO settings (key, value, school_id) VALUES ('proctoring_enabled', ?, ?)",
    [enabled ? "1" : "0", req.user.school_id],
    (err) => {
      if (err) {
        console.error("Proctoring update error:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }
      logActivity(
        req.user.id,
        req.user.username,
        "Thay đổi cài đặt GIÁM SÁT AI",
        `Chuyển trạng thái proctoring_enabled sang: ${enabled}`,
      );

      // Broadcast to students within the school
      io.to(`school_${req.user.school_id}`).emit("monitoring-sync", {
        type: "ai",
        enabled,
      });

      res.json({ message: "Settings updated" });
    },
  );
});

// Admin: Toggle Global Social Monitoring
app.post(
  "/api/admin/settings/social-monitoring",
  authenticateToken,
  (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }
    const { enabled } = req.body;
    db.run(
      "INSERT OR REPLACE INTO settings (key, value, school_id) VALUES ('social_monitoring_enabled', ?, ?)",
      [enabled ? "1" : "0", req.user.school_id],
      (err) => {
        if (err) {
          console.error("Social monitoring update error:", err);
          return res
            .status(500)
            .json({ error: "Database error: " + err.message });
        }
        logActivity(
          req.user.id,
          req.user.username,
          "Thay đổi cài đặt GIÁM SÁT MXH",
          `Chuyển trạng thái social_monitoring_enabled sang: ${enabled}`,
        );

        // Broadcast to students within the school
        io.to(`school_${req.user.school_id}`).emit("monitoring-sync", {
          type: "social",
          enabled,
        });

        res.json({ message: "Settings updated" });
      },
    );
  },
);

// Admin: Toggle Global Test Monitoring
app.post(
  "/api/admin/settings/test-monitoring",
  authenticateToken,
  (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }
    const { enabled } = req.body;
    db.run(
      "INSERT OR REPLACE INTO settings (key, value, school_id) VALUES ('test_monitoring_enabled', ?, ?)",
      [enabled ? "1" : "0", req.user.school_id],
      (err) => {
        if (err) {
          console.error("Test monitoring update error:", err);
          return res
            .status(500)
            .json({ error: "Database error: " + err.message });
        }
        logActivity(
          req.user.id,
          req.user.username,
          "Thay đổi cài đặt GIÁM SÁT PHÒNG THI",
          `Chuyển trạng thái test_monitoring_enabled sang: ${enabled}`,
        );

        // Broadcast to students within the school
        io.to(`school_${req.user.school_id}`).emit("monitoring-sync", {
          type: "test",
          enabled,
        });

        res.json({ message: "Settings updated" });
      },
    );
  },
);

// Admin: Maintenance Cleanup
app.post("/api/admin/maintenance/cleanup", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const report = {
    orphaned_exercises: 0,
    orphaned_questions: 0,
    orphaned_progress: 0,
  };

  db.serialize(() => {
    // 1. Delete exercises that point to non-existent lessons
    db.run(
      `
      DELETE FROM exercises 
      WHERE lesson_id IS NOT NULL 
      AND lesson_id NOT IN (SELECT id FROM lessons)
    `,
      function (err) {
        if (!err) report.orphaned_exercises = this.changes;

        // 2. Delete questions that point to non-existent exercises
        db.run(
          `
        DELETE FROM exercise_questions 
        WHERE exercise_id NOT IN (SELECT id FROM exercises)
      `,
          function (err) {
            if (!err) report.orphaned_questions = this.changes;

            // 3. Delete progress records with missing lesson/exercise links
            db.run(
              `
          DELETE FROM user_progress 
          WHERE (lesson_id IS NOT NULL AND lesson_id NOT IN (SELECT id FROM lessons))
          OR (exercise_id IS NOT NULL AND exercise_id NOT IN (SELECT id FROM exercises))
        `,
              function (err) {
                if (!err) report.orphaned_progress = this.changes;

                res.json({ message: "Cleanup completed successfully", report });
              },
            );
          },
        );
      },
    );
  });
});

// Admin: Get Activity Logs (Admin only)
app.get("/api/admin/activity-logs", authenticateToken, (req, res) => {
  db.get(
    "SELECT role, is_super_admin FROM users WHERE id = ?",
    [req.user.id],
    (err, currentUser) => {
      if (err || !currentUser || currentUser.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Chỉ Admin mới có quyền xem nhật ký" });
      }

      let query = "SELECT * FROM activity_logs";
      const params = [];

      // Filter by school if not super admin
      if (currentUser.is_super_admin !== 1) {
        query += " WHERE school_id = ?";
        params.push(req.user.school_id);
      }

      query += " ORDER BY created_at DESC LIMIT 500";

      db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(rows);
      });
    },
  );
});

// AI Content Generation
app.post(
  "/api/admin/ai-generate",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { type, prompt_addon } = req.body; // lesson, exercise, test
    const filePath = req.file?.path;

    if (!filePath && !prompt_addon) {
      return res.status(400).json({ error: "File or prompt required" });
    }

    let content = "";
    if (filePath) {
      try {
        if (filePath.endsWith(".pdf")) {
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdf(dataBuffer);
          content = data.text;
        } else if (filePath.endsWith(".docx")) {
          const result = await mammoth.extractRawText({ path: filePath });
          content = result.value;
        } else {
          // Fallback for .txt or other text-based files
          content = fs.readFileSync(filePath, "utf8");
        }
      } catch (readErr) {
        console.error("Error reading file:", readErr);
        return res
          .status(500)
          .json({
            error: "Không thể đọc nội dung file. Vui lòng kiểm tra định dạng!",
          });
      }
    }

    const prompt = `
    Bạn là một chuyên gia soạn thảo giáo án và bài tập. 
    Dựa trên nội dung sau hãy tạo ra ${type === "test" ? "một bài kiểm tra gồm 5 câu hỏi trắc nghiệm kèm theo thời gian làm bài dự kiến (duration) tính bằng phút" : type === "exercise" ? "5 câu hỏi bài tập" : "một bài giảng chi tiết"}.
    Nội dung: ${content}
    Yêu cầu bổ sung: ${prompt_addon || ""}
    
    YÊU CẦU QUAN TRỌNG:
    - Chỉ trả về duy nhất định dạng JSON nguyên bản, không bao gồm giải thích hay markdown code blocks (\`\`\`json ... \`\`\`).
    - Cấu trúc JSON phải chính xác như sau:
    ${type === "test"
        ? `
    {
      "title": "Tiêu đề bài kiểm tra",
      "description": "Mô tả ngắn",
      "duration": 60,
      "questions": [
        { "question": "Câu hỏi?", "options": ["A", "B", "C", "D"], "correct_answer": "Đáp án đúng", "points": 10, "type": "abcd" }
      ]
    }`
        : type === "exercise"
          ? `
    [
      { "question": "Câu hỏi?", "options": ["A", "B", "C", "D"], "correct_answer": "Đáp án đúng", "points": 10, "type": "abcd" }
    ]`
          : `
    {
      "title": "Tiêu đề bài giảng",
      "content": "Nội dung bài giảng sử dụng markdown",
      "subject": "toan/anh/van...",
      "grade_level": "thcs_6/7..."
    }`
      }
`;

    try {
      const text = await generateWithAI(prompt, null, "content");

      // Clean text to extract JSON
      let cleanedText = text;
      const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        cleanedText = jsonBlockMatch[1];
      } else {
        const startIdx = text.indexOf(type === "exercise" ? "[" : "{");
        const endIdx = text.lastIndexOf(type === "exercise" ? "]" : "}");
        if (startIdx !== -1 && endIdx !== -1) {
          cleanedText = text.substring(startIdx, endIdx + 1);
        }
      }

      try {
        const jsonData = JSON.parse(cleanedText);
        res.json(jsonData);
      } catch (parseError) {
        console.error(
          "JSON Parse Error:",
          parseError,
          "Text was:",
          cleanedText,
        );
        res
          .status(500)
          .json({
            error: "AI trả về định dạng không hợp lệ. Vui lòng thử lại!",
          });
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Internal AI error" });
    }
  },
);

// AI Explain Question
app.post("/api/ai/explain", authenticateToken, async (req, res) => {
  const { question, userAnswer, correctAnswer, options } = req.body;

  try {
    const prompt = `
      Bạn là một giáo viên tận tâm. Học sinh vừa trả lời sai một câu hỏi.
      Hãy giải thích ngắn gọn (tối đa 3 câu) tại sao đáp án của học sinh là sai và tại sao đáp án kia mới đúng.
      
      Câu hỏi: "${question}"
      Các lựa chọn: ${JSON.stringify(options)}
      Học sinh chọn: "${userAnswer}"
      Đáp án đúng: "${correctAnswer}"
      
      Chỉ trả về lời giải thích, không lặp lại câu hỏi. Giọng điệu khích lệ, dễ hiểu.
    `;

    const explanationRaw = await generateWithAI(prompt, null, "explain");
    // Ensure we get clean text, stripping markdown code blocks if any
    const explanation = explanationRaw.replace(/```(?:json)?|```/g, "").trim();

    res.json({ explanation });
  } catch (error) {
    console.error("AI Explain Error:", error);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

// AI Pronunciation Check
app.post("/api/ai/check-pronunciation", authenticateToken, async (req, res) => {
  const { word, userInput } = req.body;

  if (!word || !userInput) {
    return res.status(400).json({ error: "Missing word or userInput" });
  }

  // Primary Logic: Direct normalized text match (TTS transcript match)
  const normalizedTarget = word.toLowerCase().trim();
  const normalizedInput = userInput.toLowerCase().trim();
  const isMatch = normalizedTarget === normalizedInput;

  try {
    const prompt = `
      Bạn là chuyên gia ngôn ngữ học tiếng Anh. 
      Từ mẫu: "${word}"
      Người dùng đọc là: "${userInput}"
      
      Hãy so sánh cách phát âm (dựa trên text-to-speech transcript) và chấm điểm.
      1. Chấm điểm độ chính xác (0-100).
      2. Xác định đúng/sai (nếu điểm >= 80 thì là true).
      3. Đưa ra nhận xét chi tiết bằng tiếng Việt:
         - Nếu sai, chỉ ra phần âm nào sai (ví dụ: thiếu âm đuôi 's', đọc sai nguyên âm...).
         - Nếu đúng, khen ngợi.
      
      Trả về DUY NHẤT định dạng JSON sau:
      {
        "score": number,
        "correct": boolean,
        "feedback": "Lời nhận xét"
      }
    `;

    let aiResponse = null;
    try {
      const text = await generateWithAI(prompt, null, "pronunciation");
      if (text) {
        let cleanedText = text;
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          cleanedText = jsonBlockMatch[1];
        } else {
          const startIdx = text.indexOf("{");
          const endIdx = text.lastIndexOf("}");
          if (startIdx !== -1 && endIdx !== -1) {
            cleanedText = text.substring(startIdx, endIdx + 1);
          }
        }
        aiResponse = JSON.parse(cleanedText);
      }
    } catch (aiErr) {
      console.error("AI Pronunciation Check (AI Phase) Error:", aiErr.message);
    }

    res.json({
      score: aiResponse ? aiResponse.score : isMatch ? 100 : 40,
      correct: aiResponse ? aiResponse.correct : isMatch,
      feedback: aiResponse
        ? aiResponse.feedback
        : isMatch
          ? "Tuyệt vời! Chính xác tuyệt đối."
          : "Có vẻ chưa giống lắm, hãy thử lại nhé.",
    });
  } catch (error) {
    console.error("AI Pronunciation Check (Global) Error:", error);
    res.json({
      score: isMatch ? 100 : 40,
      correct: isMatch,
      feedback: isMatch
        ? "Phát âm đúng (Chế độ offline)"
        : "Cần phát âm rõ hơn (Chế độ offline)",
    });
  }
});

// AI Writing Check
app.post("/api/ai/check-writing", authenticateToken, async (req, res) => {
  const { word, userInput } = req.body;

  if (!word || !userInput) {
    return res.status(400).json({ error: "Missing word or userInput" });
  }

  // 1. Primary Logic: Direct Check (Always works even without AI)
  const normalizedTarget = word.toLowerCase().trim();
  const normalizedInput = userInput.toLowerCase().trim();
  const isCorrect = normalizedTarget === normalizedInput;

  try {
    const prompt = `
      Bạn là giáo viên tiếng Anh. Học sinh đang luyện viết từ: "${word}".
      Học sinh đã nhập: "${userInput.trim()}".
      
      Hãy kiểm tra xem học sinh viết đúng chưa. 
      - Nếu đúng, khen ngợi.
      - Nếu sai, chỉ ra lỗi sai (chính tả, ngữ pháp) và cung cấp phiên âm IPA của từ đúng.
      
      Trả về DUY NHẤT định dạng JSON sau:
      {
        "correct": boolean,
        "feedback": "Lời nhận xét ngắn gọn (tiếng Việt)",
        "ipa": "phiên âm IPA của từ ${word}",
        "target_word": "${word}"
      }
    `;

    // 2. AI Logic: For feedback and IPA enrichment
    let aiResponse = null;
    try {
      const text = await generateWithAI(prompt, null, "writing");
      if (text) {
        let cleanedText = text;
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          cleanedText = jsonBlockMatch[1];
        } else {
          const startIdx = text.indexOf("{");
          const endIdx = text.lastIndexOf("}");
          if (startIdx !== -1 && endIdx !== -1) {
            cleanedText = text.substring(startIdx, endIdx + 1);
          }
        }
        aiResponse = JSON.parse(cleanedText);
      }
    } catch (aiErr) {
      console.error("AI Writing Check (AI Phase) Error:", aiErr.message);
      // AI failed, but we continue with primary logic
    }

    // 3. Combine results: Priority to AI, but fallback to direct check for correctness
    res.json({
      correct: aiResponse ? aiResponse.correct : isCorrect,
      feedback: aiResponse
        ? aiResponse.feedback
        : isCorrect
          ? "Chính xác! Bạn viết rất tốt."
          : "Chưa chính xác, hãy kiểm tra lại nhé.",
      ipa: aiResponse ? aiResponse.ipa : "",
      target_word: word,
    });
  } catch (error) {
    console.error("AI Writing Check (Global) Error:", error);
    // Absolute fallback
    res.json({
      correct: isCorrect,
      feedback: isCorrect
        ? "Chính xác! (Chế độ offline)"
        : "Chưa chính xác. (Chế độ offline)",
      ipa: "",
      target_word: word,
    });
  }
});

// AI Speaking Chat API (AI Teacher) - Relocated for priority
app.post("/api/ai/speaking-chat", authenticateToken, async (req, res) => {
  console.log("--- AI Speaking Request ---");
  console.log("User:", req.user?.username);
  const { message, conversation_history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const historyString =
      conversation_history
        ?.map(
          (h) =>
            `${h.role === "user" ? "Student" : "AI Teacher"}: ${h.content}`,
        )
        .join("\n") || "";

    const prompt = `
    Bạn là một giáo viên tiếng Anh/Việt (tùy theo ngôn ngữ người dùng nói) thân thiện và kiên nhẫn tại hệ thống EduSmart Noitru.
    Nhiệm vụ của bạn là luyện giao tiếp 1-1 với học sinh qua giọng nói.

    Lịch sử hội thoại:
    ${historyString}

    Học sinh vừa nói (có thể chứa lỗi nhận diện giọng nói): "${message}"

    HÃY THỰC HIỆN CÁC BƯỚC SAU:
    1. **PHÂN TÍCH Ý ĐỊNH (Intent Inference)**: Vì đây là dữ liệu từ Micro, đôi khi sẽ bị sai chính tả hoặc thiếu từ. Hãy dựa vào Lịch sử hội thoại để đoán xem học sinh thực sự muốn nói gì. Đừng phản hồi quá máy móc vào những từ sai.
    2. **PHẢN HỒI THÔNG MINH**: Phản hồi lại câu nói (đã được bạn ngầm hiểu lại cho đúng) một cách tự nhiên.
    3. **CHỈNH SỬA LỖI (Feedback)**: Trong phần "feedback", hãy liệt kê những từ mà bạn đoán là học sinh đã phát âm/nói sai và cung cấp câu đúng bằng Tiếng Việt.
    4. **KHUYÊN KHÍCH**: Luôn đặt câu hỏi mở để giữ cuộc trò chuyện tiếp tục.

    TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT NHƯ SAU (Lưu ý: phần "feedback" và "corrected_text" PHẢI LUÔN BẰNG TIẾNG VIỆT):
    {
      "ai_response": "Nội dung phản hồi của bạn để AI đọc lên (có thể dùng tiếng Anh hoặc Việt tùy ngữ cảnh)",
      "feedback": "Lời khuyên sửa lỗi hoặc lời khen bằng Tiếng Việt (để hiển thị trên màn hình)",
      "corrected_text": "Câu nói đã được sửa lỗi hoàn chỉnh kèm giải thích nghĩa bằng Tiếng Việt",
      "suggested_topics": ["Chủ đề 1", "Chủ đề 2"]
    }
  `;

    const aiRawResponse = await generateWithAI(prompt, null, "speaking");
    let aiData;

    try {
      let cleanedText = aiRawResponse;
      const jsonBlockMatch = aiRawResponse.match(
        /```(?:json)?\s*([\s\S]*?)\s*```/,
      );
      if (jsonBlockMatch) {
        cleanedText = jsonBlockMatch[1];
      } else {
        const startIdx = aiRawResponse.indexOf("{");
        const endIdx = aiRawResponse.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1) {
          cleanedText = aiRawResponse.substring(startIdx, endIdx + 1);
        }
      }
      aiData = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("AI Speaking Parse Error:", parseErr.message);
      aiData = {
        ai_response: aiRawResponse.substring(0, 200),
        feedback: "Tuyệt vời, hãy tiếp tục nói nhé!",
        corrected_text: "",
        suggested_topics: [],
      };
    }

    res.json(aiData);
  } catch (error) {
    console.error("AI Speaking API Error:", error);
    const errorMessage =
      error.message || "AI Teacher is resting. Please try again later.";
    res.status(500).json({ error: errorMessage });
  }
});

// Ghost Student Cleanup: Delete violations for students inactive > 5 mins
const cleanupGhostViolations = () => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  db.all(
    `SELECT id, username FROM users WHERE role = 'student' AND last_activity < ?`,
    [cutoff],
    (err, users) => {
      if (err || !users || users.length === 0) return;

      users.forEach((user) => {
        db.all(
          `SELECT id, evidence_url FROM user_violations WHERE user_id = ?`,
          [user.id],
          (err, violations) => {
            if (err || !violations || violations.length === 0) return;

            console.log(
              `[CLEANUP] Purging ${violations.length} violations for ghost student: ${user.username}`,
            );

            violations.forEach((v) => {
              if (v.evidence_url) {
                const fullPath = path.join(__dirname, v.evidence_url);
                if (fs.existsSync(fullPath)) {
                  fs.unlink(fullPath, (e) => { });
                }
              }
            });

            db.run(
              `DELETE FROM user_violations WHERE user_id = ?`,
              [user.id],
              (delErr) => {
                if (!delErr && user.school_id) {
                  io.to(`school_${user.school_id}`).emit(
                    "violation-deleted-sync",
                    { userId: user.id },
                  );
                }
              },
            );
          },
        );
      });
    },
  );
};

// Check for ghost students every 1 minute
setInterval(cleanupGhostViolations, 60000);

// Shared Cleanup Function (Storage-Safe)
const performSystemCleanup = () => {
  const defaultCutoff = 7 * 24 * 60 * 60 * 1000; // 7 days (Evidence preservation)
  const testCutoff = 15 * 60 * 1000; // 15 minutes (Temporary test captures)

  const defaultCutoffStr = new Date(Date.now() - defaultCutoff).toISOString();
  const testCutoffStr = new Date(Date.now() - testCutoff).toISOString();

  console.log("--- STARTING STORAGE CLEANUP ---");

  // 1. Delete records & files older than cutoffs
  db.all(
    `
    SELECT id, evidence_url, item_type FROM user_violations 
    WHERE created_at < ? OR (item_type = 'test' AND created_at < ?)
  `,
    [defaultCutoffStr, testCutoffStr],
    (err, rows) => {
      if (err || !rows) return;
      rows.forEach((row) => {
        if (row.evidence_url) {
          const fullPath = path.join(__dirname, row.evidence_url);
          if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (e) => {
              if (e) console.error("Cleanup unlink fail:", e);
            });
          }
        }
        db.run("DELETE FROM user_violations WHERE id = ?", [row.id]);
      });
    },
  );

  // 2. Scan for Orphaned files (Files existing on disk but NOT in database)
  const violationsDir = path.join(uploadsDir, "violations");
  if (fs.existsSync(violationsDir)) {
    fs.readdir(violationsDir, (err, files) => {
      if (err || !files) return;

      // Get all active evidence URLs from both tables
      db.all(
        "SELECT evidence_url FROM user_violations UNION SELECT screenshot as evidence_url FROM test_violations",
        (dbErr, dbRows) => {
          if (dbErr) return;
          const validFiles = new Set(
            dbRows
              .filter((r) => r.evidence_url)
              .map((r) => path.basename(r.evidence_url)),
          );

          files.forEach((file) => {
            if (!validFiles.has(file)) {
              const filePath = path.join(violationsDir, file);
              fs.stat(filePath, (err, stats) => {
                if (err) return;
                // Only delete if it's been there at least 10 minutes (avoid race condition with active uploads)
                if (Date.now() - stats.mtime.getTime() > 10 * 60 * 1000) {
                  console.log(`Deleting orphaned image: ${file}`);
                  fs.unlink(filePath, (e) => { });
                }
              });
            }
          });
        },
      );
    });
  }
};

// Admin: Manual Trigger Cleanup
app.post("/api/admin/maintenance/cleanup", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    performSystemCleanup();
    logActivity(
      req.user.id,
      req.user.username,
      "Bảo trì hệ thống",
      "Đã kích hoạt dọn dẹp bộ nhớ thủ công (Xóa dữ liệu > 7 ngày)",
    );
    res.json({ message: "Cleanup process started successfully" });
  } catch (err) {
    console.error("Manual cleanup error:", err);
    res.status(500).json({ error: "Cleanup failed to start" });
  }
});

// (Automatic cleanup moved to main db.serialize startup)

// Debug endpoint to check data consistency
app.get("/api/debug/data", (req, res) => {
  db.all(
    "SELECT id, title, subject, grade_level FROM lessons LIMIT 20",
    [],
    (err, lessons) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(
        "SELECT id, lesson_id, title, subject, grade_level FROM exercises LIMIT 20",
        [],
        (err, exercises) => {
          if (err) return res.status(500).json({ error: err.message });
          db.all(
            "SELECT exercise_id, COUNT(*) as count FROM exercise_questions GROUP BY exercise_id",
            [],
            (err, counts) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ lessons, exercises, question_counts: counts });
            },
          );
        },
      );
    },
  );
});

// ---------------------------------------------------------
// NEW: Session-based Idle Cleanup Logic
// ---------------------------------------------------------
let activeUserSockets = new Set();
let idleCleanupTimer = null;

const runFullViolationPurge = () => {
  console.log(
    "🚨 [IDLE CLEANUP] No active users for 5 mins. Purging all violations...",
  );

  // 1. Delete all records from database
  db.run("DELETE FROM user_violations", (err) => {
    if (err) console.error("Full purge DB error (user_violations):", err);
  });
  db.run("DELETE FROM test_violations", (err) => {
    if (err) console.error("Full purge DB error (test_violations):", err);
  });

  // 2. Delete all files from uploads/violations
  const violationsDir = path.join(__dirname, "uploads", "violations");
  if (fs.existsSync(violationsDir)) {
    fs.readdir(violationsDir, (err, files) => {
      if (err || !files) return;
      files.forEach((file) => {
        const filePath = path.join(violationsDir, file);
        fs.unlink(filePath, (e) => {
          if (e) console.error(`Failed to delete file ${file}:`, e);
        });
      });
      console.log(
        `🧹 [IDLE CLEANUP] Deleted ${files.length} violation images.`,
      );
    });
  }

  // Notify any remaining (just in case) or future connections
  io.emit("violations-purged");
};

// Socket.io Connection Logic
io.on("connection", (socket) => {
  activeUserSockets.add(socket.id);
  console.log(
    `A user connected via Socket: ${socket.id}. Total active: ${activeUserSockets.size}`,
  );

  // Cancel idle timer if someone connects
  if (idleCleanupTimer) {
    console.log("🕒 [IDLE CLEANUP] Timer cancelled. User reconnected.");
    clearTimeout(idleCleanupTimer);
    idleCleanupTimer = null;
  }

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on("join-school-room", (schoolId) => {
    if (!schoolId) return;
    socket.join(`school_${schoolId}`);
    console.log(`Socket ${socket.id} joined school room: school_${schoolId}`);
  });

  // Relay Screen Data from Student to Teacher
  socket.on("screen-data", ({ roomId, userId, frame }) => {
    socket.to(roomId).emit("screen-update", { studentId: userId, frame });
  });

  // Relay Monitoring Toggle from Teacher to Students
  socket.on("monitoring-toggle", ({ roomId, type, enabled, mode }) => {
    socket.to(roomId).emit("monitoring-sync", { type, enabled, mode });
  });

  socket.on("monitoring-sync", ({ roomId, type, enabled, mode }) => {
    socket.to(roomId).emit("monitoring-sync", { type, enabled, mode });
  });

  socket.on("disconnect", () => {
    activeUserSockets.delete(socket.id);
    console.log(
      `User disconnected: ${socket.id}. Remaining active: ${activeUserSockets.size}`,
    );

    // If no one is left, start the 5-minute countdown
    if (activeUserSockets.size === 0) {
      console.log(
        "🕒 [IDLE CLEANUP] Starting 5-minute countdown for violation purge...",
      );
      idleCleanupTimer = setTimeout(runFullViolationPurge, 5 * 60 * 1000);
    }
  });
});

// (Server listen and user migrations moved to main db.serialize startup)

// --- ADDITIONAL ADMIN ENDPOINTS ---

// Delete Announcement (Admin/Super Admin)
app.delete("/api/admin/announcements/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const announcementId = req.params.id;

  db.serialize(() => {
    db.run("DELETE FROM announcements WHERE id = ?", [announcementId], (err) => {
      if (err) return res.status(500).json({ error: "Database error" });

      // Also delete from reads table
      db.run("DELETE FROM announcement_reads WHERE announcement_id = ?", [announcementId]);

      res.json({ message: "Th�ng b�o �? ��?c x�a th�nh c�ng" });
    });
  });
});

// AI Feedback Analysis (Super Admin)
app.get("/api/super-admin/feedback/analysis", authenticateToken, async (req, res) => {
  if (req.user.is_super_admin !== 1)
    return res.status(403).json({ error: "Super Admin access required" });

  db.all(
    `
    SELECT f.message, f.subject, f.ai_category, f.created_at, s.name as school_name
    FROM system_feedback f
    LEFT JOIN schools s ON f.school_id = s.id
    WHERE f.status = 'pending'
    ORDER BY f.created_at DESC
    LIMIT 50
    `,
    async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (rows.length === 0) return res.json({ analysis: "Ch�a c� ph?n h?i n�o �? ph�n t�ch." });

      const feedbackText = rows.map(r => `[${r.school_name || 'N/A'}] ${r.subject}: ${r.message} (${r.ai_category})`).join('\n');

      try {
        const prompt = `D�?i ��y l� c�c ph?n h?i m?i nh?t t? ng�?i d�ng h? th?ng LMS. H?y ph�n t�ch c�c xu h�?ng ch�nh, nh?ng v?n �? n?i c?m v� �? xu?t c�c h�nh �?ng c?i thi?n c? th? cho qu?n tr? vi�n. 
        Tr? v? k?t qu? b?ng ti?ng Vi?t, �?nh d?ng Markdown s?ch s?.
        
        Ph?n h?i:\n${feedbackText}`;

        const analysis = await generateWithAI(prompt, null, "chat");
        res.json({ analysis });
      } catch (e) {
        console.error("AI Analysis failed:", e);
        res.status(500).json({ error: "AI Analysis failed" });
      }
    }
  );
});

// --- SCHOOL MANAGEMENT ENDPOINTS ---

// Get all schools (Super Admin only)
app.get("/api/super-admin/schools", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Super Admin access required" });
  }

  db.all(
    `SELECT s.*, COUNT(DISTINCT u.id) as user_count 
     FROM schools s 
     LEFT JOIN users u ON s.id = u.school_id 
     GROUP BY s.id 
     ORDER BY s.created_at DESC`,
    (err, schools) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(schools);
    }
  );
});

// Create new school (Super Admin only)
app.post("/api/super-admin/schools", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Super Admin access required" });
  }

  const { name, code, province, district, ward, address, phone, email } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: "Tên trường và mã trường là bắt buộc" });
  }

  db.run(
    `INSERT INTO schools (name, code, province, district, ward, address, phone, email) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, code, province, district, ward, address, phone, email],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: "Mã trường đã tồn tại" });
        }
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ id: this.lastID, message: "Tạo trường thành công" });
    }
  );
});

// Update school (Super Admin only)
app.patch("/api/super-admin/schools/:id", authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Super Admin access required" });
  }

  const { name, province, district, ward, address, phone, email } = req.body;
  const schoolId = req.params.id;

  db.run(
    `UPDATE schools 
     SET name = COALESCE(?, name), 
         province = COALESCE(?, province),
         district = COALESCE(?, district),
         ward = COALESCE(?, ward),
         address = COALESCE(?, address),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email)
     WHERE id = ?`,
    [name, province, district, ward, address, phone, email, schoolId],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) {
        return res.status(404).json({ error: "Không tìm thấy trường" });
      }
      res.json({ message: "Cập nhật trường thành công" });
    }
  );
});

// Get current user's school info
app.get("/api/user/school", authenticateToken, (req, res) => {
  if (!req.user.school_id) {
    return res.json({ school: null });
  }

  db.get(
    "SELECT * FROM schools WHERE id = ?",
    [req.user.school_id],
    (err, school) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ school });
    }
  );
});

// --- USER MANAGEMENT ENDPOINTS ---

// Update user (Admin) - with auto-assign for students
app.post("/api/admin/users/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const userId = parseInt(req.params.id);
  const updates = req.body;

  // Build dynamic UPDATE query
  const fields = [];
  const values = [];

  const allowedFields = [
    'username', 'full_name', 'role', 'grade_level', 'school_id', 'class_name',
    'email', 'phone_number', 'gender', 'birth_date', 'province', 'district',
    'ward', 'school', 'school_level', 'place_of_birth', 'avatar_url'
  ];

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  });

  if (fields.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(userId);

  db.run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        console.error('Update user error:', err);
        return res.status(500).json({ error: "Database error" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Auto-assign to class if student and class_name changed
      if (updates.class_name || updates.grade_level || updates.school_id) {
        autoAssignStudentToClass(userId, (err) => {
          if (err) console.error('Auto-assign failed:', err);
        });
      }

      res.json({ message: "Cập nhật thành công" });
    }
  );
});

// Register user (Admin) - with auto-assign for students
app.post("/api/admin/register", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { username, password, full_name, role, grade_level, school_id, class_name } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, password, full_name, role, grade_level, school_id, class_name) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, hashedPassword, full_name, role, grade_level, school_id, class_name],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: "Username already exists" });
        }
        return res.status(500).json({ error: "Database error" });
      }

      const userId = this.lastID;

      // Auto-assign if student
      if (role === 'student' && class_name) {
        autoAssignStudentToClass(userId, (err) => {
          if (err) console.error('Auto-assign failed:', err);
        });
      }

      res.json({ message: "Đăng ký thành công", userId });
    }
  );
});


// --- CLASS MANAGEMENT ENDPOINTS ---

// Get all classes (Admin)
app.get("/api/admin/classes", authenticateToken, enforceSchoolIsolation, (req, res) => {
  const schoolId = req.schoolId;

  const query = schoolId
    ? 'SELECT * FROM classes WHERE school_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM classes ORDER BY created_at DESC';
  const params = schoolId ? [schoolId] : [];

  db.all(query, params, (err, classes) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(classes);
  });
});

// Create class (Admin) - Auto-assign school_id from teacher
app.post("/api/admin/classes", authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { name, grade_level, teacher_id, ...otherFields } = req.body;

  if (!name || !grade_level) {
    return res.status(400).json({ error: "Tên lớp và khối lớp là bắt buộc" });
  }

  // Auto-assign school_id from teacher
  const schoolId = req.schoolId || req.user.school_id;

  if (!schoolId) {
    return res.status(400).json({ error: "Không xác định được trường học" });
  }

  // Build INSERT query dynamically
  const fields = ['name', 'grade_level', 'school_id', 'teacher_id'];
  const values = [name, grade_level, schoolId, teacher_id || req.user.id];

  // Add optional fields
  const optionalFields = ['study_monitoring_enabled', 'test_monitoring_enabled', 'social_monitoring_enabled',
    'schedule_start', 'schedule_end', 'schedule_days'];

  optionalFields.forEach(field => {
    if (otherFields[field] !== undefined) {
      fields.push(field);
      values.push(otherFields[field]);
    }
  });

  const placeholders = fields.map(() => '?').join(', ');

  db.run(
    `INSERT INTO classes (${fields.join(', ')}) VALUES (${placeholders})`,
    values,
    function (err) {
      if (err) {
        console.error('Create class error:', err);
        return res.status(500).json({ error: "Database error" });
      }

      const classId = this.lastID;
      console.log(`✓ Class created: ${name} (school_id: ${schoolId}, grade: ${grade_level})`);

      // ✅ Auto-assign existing students with matching class_name
      db.run(
        `UPDATE users 
         SET class_id = ? 
         WHERE role = 'student' 
           AND class_name = ? 
           AND school_id = ? 
           AND grade_level = ?
           AND (class_id IS NULL OR class_id != ?)`,
        [classId, name, schoolId, grade_level, classId],
        function (assignErr) {
          if (assignErr) {
            console.error('Batch auto-assign error:', assignErr);
          } else if (this.changes > 0) {
            console.log(`✓ Auto-assigned ${this.changes} existing students to class ${classId} (${name})`);
          }
        }
      );

      res.json({ id: classId, message: "Tạo lớp thành công" });
    }
  );
});

// Update class (Admin)
app.put("/api/admin/classes/:id", authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const classId = parseInt(req.params.id);
  const updates = req.body;

  // Build dynamic UPDATE query
  const fields = [];
  const values = [];

  const allowedFields = [
    'name', 'grade_level', 'teacher_id', 'study_monitoring_enabled',
    'test_monitoring_enabled', 'social_monitoring_enabled',
    'schedule_start', 'schedule_end', 'schedule_days'
  ];

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  });

  if (fields.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(classId);

  db.run(
    `UPDATE classes SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        console.error('Update class error:', err);
        return res.status(500).json({ error: "Database error" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Class not found" });
      }

      res.json({ message: "Cập nhật lớp thành công" });
    }
  );
});

// Delete class (Admin)
app.delete("/api/admin/classes/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const classId = parseInt(req.params.id);

  db.run('DELETE FROM classes WHERE id = ?', [classId], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    if (this.changes === 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Set class_id = NULL for students in this class
    db.run('UPDATE users SET class_id = NULL WHERE class_id = ?', [classId]);

    res.json({ message: "Xóa lớp thành công" });
  });
});

// Get students in a class
app.get("/api/admin/classes/:id/students", authenticateToken, (req, res) => {
  const classId = parseInt(req.params.id);

  db.all(
    `SELECT id, username, full_name, email, grade_level, class_name 
     FROM users 
     WHERE class_id = ? AND role = 'student'
     ORDER BY full_name`,
    [classId],
    (err, students) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(students);
    }
  );
});

// --- MAINTENANCE ENDPOINTS ---

// Manually run batch auto-assign for all students (Admin/Debug)
app.post("/api/admin/batch-auto-assign", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  console.log('🔄 Running batch auto-assign for all students...');

  // Get all students with class_name
  db.all(
    `SELECT id, username, class_name, school_id, grade_level 
     FROM users 
     WHERE role = 'student' AND class_name IS NOT NULL`,
    (err, students) => {
      if (err) {
        console.error('Error fetching students:', err);
        return res.status(500).json({ error: "Database error" });
      }

      console.log(`Found ${students.length} students with class_name`);

      let assigned = 0;
      let notFound = 0;
      let processed = 0;

      students.forEach(student => {
        // Find matching class
        db.get(
          `SELECT id FROM classes 
           WHERE name = ? AND school_id = ? AND grade_level = ?
           LIMIT 1`,
          [student.class_name, student.school_id, student.grade_level],
          (err, targetClass) => {
            processed++;

            if (err) {
              console.error(`Error for student ${student.username}:`, err);
            } else if (targetClass) {
              // Assign to class
              db.run(
                'UPDATE users SET class_id = ? WHERE id = ?',
                [targetClass.id, student.id],
                (err) => {
                  if (!err) {
                    assigned++;
                    console.log(`✓ ${student.username} → class ${targetClass.id} (${student.class_name})`);
                  }
                }
              );
            } else {
              notFound++;
              console.log(`⚠️ ${student.username}: No class found for "${student.class_name}" (school: ${student.school_id}, grade: ${student.grade_level})`);
            }

            // Send response when all processed
            if (processed === students.length) {
              setTimeout(() => {
                res.json({
                  message: "Batch auto-assign completed",
                  total: students.length,
                  assigned,
                  notFound
                });
              }, 500);
            }
          }
        );
      });

      if (students.length === 0) {
        res.json({ message: "No students to assign", total: 0, assigned: 0, notFound: 0 });
      }
    }
  );
});

// --- USER MANAGEMENT ENDPOINTS ---

// Update user (Admin) - with auto-assign for students
app.post("/api/admin/users/:id", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const userId = parseInt(req.params.id);
  const updates = req.body;

  // Build dynamic UPDATE query
  const fields = [];
  const values = [];

  const allowedFields = [
    'username', 'full_name', 'role', 'grade_level', 'school_id', 'class_name',
    'email', 'phone_number', 'gender', 'birth_date', 'province', 'district',
    'ward', 'school', 'school_level', 'place_of_birth', 'avatar_url'
  ];

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  });

  if (fields.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(userId);

  db.run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        console.error('Update user error:', err);
        return res.status(500).json({ error: "Database error" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // ✅ Auto-assign to class if student and class_name changed
      if (updates.class_name || updates.grade_level || updates.school_id) {
        autoAssignStudentToClass(userId, (err) => {
          if (err) console.error('Auto-assign failed:', err);
        });
      }

      res.json({ message: "Cập nhật thành công" });
    }
  );
});

// Register user (Admin) - with auto-assign for students
app.post("/api/admin/register", authenticateToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { username, password, full_name, role, grade_level, school_id, school_name, class_name } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  // Auto-find school_id from school_name if provided
  const processRegistration = (finalSchoolId) => {
    db.run(
      `INSERT INTO users (username, password, full_name, role, grade_level, school_id, class_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, full_name, role, grade_level, finalSchoolId, class_name],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: "Username already exists" });
          }
          return res.status(500).json({ error: "Database error" });
        }

        const userId = this.lastID;

        // ✅ Auto-assign if student
        if (role === 'student' && class_name) {
          autoAssignStudentToClass(userId, (err) => {
            if (err) console.error('Auto-assign failed:', err);
          });
        }

        res.json({ message: "Đăng ký thành công", userId });
      }
    );
  };

  // If school_name is provided, find school_id first
  if (school_name && !school_id) {
    findSchoolIdByName(school_name, (err, foundSchoolId) => {
      if (err) {
        return res.status(500).json({ error: "Error finding school" });
      }
      processRegistration(foundSchoolId);
    });
  } else {
    // Use provided school_id or null
    processRegistration(school_id || null);
  }
});


// GET /api/teacher/students/:classId - Get students in a class
app.get('/api/teacher/students/:classId', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only teachers and admins can view class students' });
  }

  const classId = parseInt(req.params.classId);
  const school_id = req.schoolId;

  console.log(`[GET /api/teacher/students/${classId}] User: ${req.user.username}, Role: ${req.user.role}, School: ${school_id}`);

  const query = `
    SELECT 
      u.id,
      u.username,
      u.full_name,
      u.email,
      u.grade_level,
      u.class_name,
      u.class_id
    FROM users u
    WHERE u.class_id = ? AND u.school_id = ? AND u.role = 'student'
    ORDER BY u.full_name ASC
  `;

  db.all(query, [classId, school_id], (err, students) => {
    if (err) {
      console.error('[GET /api/teacher/students/:classId] Database error:', err);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách học sinh' });
    }

    console.log(`[GET /api/teacher/students/${classId}] Found ${students.length} student(s)`);
    res.json({ students });
  });
});

// ==================== GRADES MANAGEMENT API ====================

// POST /api/teacher/grades - Nhập/Cập nhật điểm
app.post('/api/teacher/grades', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền nhập điểm' });
  }

  const { student_id, class_id, subject, semester, year, grade_type, score, note } = req.body;
  const teacher_id = req.user.id;
  const school_id = req.schoolId;

  // Validate required fields
  if (!student_id || !class_id || !subject || !semester || !year || !grade_type || score === undefined) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  // Validate score
  if (score < 0 || score > 10) {
    return res.status(400).json({ error: 'Điểm phải từ 0 đến 10' });
  }

  // Validate grade_type
  const validGradeTypes = ['oral', 'quiz_15', 'test_45', 'midterm', 'final'];
  if (!validGradeTypes.includes(grade_type)) {
    return res.status(400).json({ error: 'Loại điểm không hợp lệ' });
  }

  // Check if student belongs to the same school (if teacher has a school)
  // If teacher/admin has NO school_id (Super Admin), we fetch it from the student
  let studentQuery = 'SELECT id, school_id FROM users WHERE id = ? AND role = "student"';
  let studentParams = [student_id];

  if (school_id) {
    studentQuery += ' AND school_id = ?';
    studentParams.push(school_id);
  }

  db.get(studentQuery, studentParams, (err, student) => {
    if (err) {
      console.error('[GRADE ERROR] db.get student:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học sinh hoặc học sinh không thuộc trường của bạn' });

    // Ensure we have a school_id for the grade record
    const finalSchoolId = school_id || student.school_id;
    if (!finalSchoolId) {
      return res.status(400).json({ error: 'Học sinh chưa được gán vào trường học nào. Không thể nhập điểm.' });
    }

    // Check if class belongs to the same school
    db.get('SELECT id FROM classes WHERE id = ? AND school_id = ?', [class_id, finalSchoolId], (err, classRow) => {
      if (err) {
        console.error('[GRADE ERROR] db.get class:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      if (!classRow) return res.status(404).json({ error: 'Không tìm thấy lớp hoặc lớp không thuộc trường của học sinh' });

      // Insert grade
      const sql = `
        INSERT INTO grades (student_id, class_id, school_id, teacher_id, subject, semester, year, grade_type, score, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const insertParams = [student_id, class_id, finalSchoolId, teacher_id, subject, parseInt(semester), year, grade_type, score, note];

      db.run(sql, insertParams, function (err) {
        if (err) {
          console.error('[GRADE ERROR] db.run insert:', err);
          return res.status(500).json({ error: 'Lỗi khi lưu điểm', details: err.message });
        }
        console.log(`[GRADE SUCCESS] Teacher ${teacher_id} added grade for Student ${student_id} at School ${finalSchoolId}`);
        res.json({ message: 'Đã nhập điểm thành công', id: this.lastID });
      });
    });
  });
});

// GET /api/teacher/grades/:classId - Xem điểm của lớp (Cho giáo viên/admin)
app.get('/api/teacher/grades/:classId', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền xem điểm' });
  }

  const { classId } = req.params;
  const { subject, semester, year } = req.query;
  const school_id = req.schoolId;

  // Verify class belongs to school
  db.get('SELECT id, name FROM classes WHERE id = ? AND school_id = ?', [classId, school_id], (err, classRow) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!classRow) return res.status(404).json({ error: 'Không tìm thấy lớp' });

    let query = `
      SELECT g.*, u.full_name as student_name, u.username
      FROM grades g
      JOIN users u ON g.student_id = u.id
      WHERE g.class_id = ?
    `;
    const params = [classId];

    if (req.user.is_super_admin !== 1) {
      query += " AND g.school_id = ?";
      params.push(school_id);
    }

    if (subject && subject !== 'all') {
      query += ' AND g.subject = ?';
      params.push(subject);
    }

    if (semester) {
      query += ' AND g.semester = ?';
      params.push(parseInt(semester));
    }

    if (year) {
      query += ' AND g.year = ?';
      params.push(year);
    }

    query += ' ORDER BY u.full_name, g.subject, g.grade_type';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching grades:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  });
});

// GET /api/student/grades - Học sinh xem điểm của mình (Hoặc Admin/Giáo viên xem điểm học sinh)
app.get('/api/student/grades', authenticateToken, enforceSchoolIsolation, (req, res) => {
  const { semester, year, subject, student_id: queryStudentId } = req.query;
  const school_id = req.schoolId;

  // Determine whose grades we are looking at
  let targetStudentId = req.user.id;

  if (req.user.role === 'admin' || req.user.role === 'teacher') {
    if (queryStudentId) {
      targetStudentId = queryStudentId;
    } else if (req.user.role === 'admin') {
      // If admin and no student_id, they will see their own (empty) grades.
      // This is expected, but we could return an error if preferred.
    }
  } else if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Bạn không có quyền xem điểm' });
  }

  console.log(`[DEBUG GRADES] Fetching for student: ${targetStudentId}, requested by: ${req.user.id} (${req.user.role}), school_id: ${school_id}`);

  let query = `
    SELECT g.*, u.full_name as student_name
    FROM grades g
    JOIN users u ON g.student_id = u.id
    WHERE g.student_id = ?
  `;
  const params = [targetStudentId];

  if (school_id) {
    query += ' AND g.school_id = ?';
    params.push(school_id);
  }

  if (semester) {
    query += ' AND g.semester = ?';
    params.push(parseInt(semester));
  }

  if (year) {
    query += ' AND g.year = ?';
    params.push(year);
  }

  if (subject && subject !== 'all') {
    query += ' AND g.subject = ?';
    params.push(subject);
  }

  query += ' ORDER BY g.subject, g.semester, g.grade_type';

  console.log(`[DEBUG GRADES] SQL Query: ${query}`);
  console.log(`[DEBUG GRADES] Params:`, params);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('[DEBUG GRADES] Error fetching student grades:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`[DEBUG GRADES] Found ${rows.length} grade records`);
    if (rows.length === 0) {
      // Check if student exists at all
      db.get('SELECT id, username, school_id FROM users WHERE id = ?', [targetStudentId], (err, user) => {
        if (user) {
          console.log(`[DEBUG GRADES] Target student exists: ${user.username}, school_id in user record: ${user.school_id}`);
        } else {
          console.log(`[DEBUG GRADES] Target student NOT FOUND in users table: ${targetStudentId}`);
        }
      });
    }
    res.json(rows);
  });
});

// PUT /api/teacher/grades/:id - Sửa điểm
app.put('/api/teacher/grades/:id', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền sửa điểm' });
  }

  const { id } = req.params;
  const { score, note, semester, year } = req.body;
  const school_id = req.schoolId;

  if (score !== undefined && (score < 0 || score > 10)) {
    return res.status(400).json({ error: 'Điểm phải từ 0 đến 10' });
  }

  // Get current grade to preserve fields
  db.get('SELECT * FROM grades WHERE id = ?', [id], (err, grade) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!grade) return res.status(404).json({ error: 'Không tìm thấy điểm' });

    if (req.user.is_super_admin !== 1 && grade.school_id !== school_id) {
      return res.status(403).json({ error: 'Bạn không có quyền sửa điểm này' });
    }

    const finalScore = score !== undefined ? score : grade.score;
    const finalNote = note !== undefined ? note : grade.note;
    const finalSemester = semester !== undefined ? semester : grade.semester;
    const finalYear = year !== undefined ? year : grade.year;

    db.run(`
      UPDATE grades 
      SET score = ?, note = ?, semester = ?, year = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [finalScore, finalNote, finalSemester, finalYear, id], function (err) {
      if (err) {
        console.error('Error updating grade:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Đã cập nhật điểm' });
    });
  });
});

// DELETE /api/teacher/grades/:id - Xóa điểm
app.delete('/api/teacher/grades/:id', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền xóa điểm' });
  }

  const { id } = req.params;
  const school_id = req.schoolId;

  // Verify ownership or super admin
  db.get('SELECT school_id FROM grades WHERE id = ?', [id], (err, grade) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!grade) return res.status(404).json({ error: 'Không tìm thấy điểm' });

    if (req.user.is_super_admin !== 1 && grade.school_id !== school_id) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa điểm này' });
    }

    db.run('DELETE FROM grades WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Error deleting grade:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Đã xóa điểm' });
    });
  });
});

// GET /api/teacher/students/:classId - Lấy danh sách học sinh trong lớp
app.get('/api/teacher/students/:classId', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ giáo viên mới có quyền xem danh sách học sinh' });
  }

  const { classId } = req.params;
  const school_id = req.schoolId;

  db.get('SELECT id, name FROM classes WHERE id = ? AND school_id = ?', [classId, school_id], (err, classRow) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!classRow) return res.status(404).json({ error: 'Không tìm thấy lớp' });

    let studentQuery = `
      SELECT id, username, full_name, email, grade_level
      FROM users
      WHERE current_class_id = ? AND role = 'student'
    `;
    const studentParams = [classId];

    if (req.user.is_super_admin !== 1) {
      studentQuery += " AND school_id = ?";
      studentParams.push(school_id);
    }

    studentQuery += " ORDER BY full_name";

    db.all(studentQuery, studentParams, (err, students) => {
      if (err) {
        console.error('Error fetching students:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({
        class: classRow,
        students: students
      });
    });
  });
});

// GET /api/admin/classes/:id/students - Admin lấy danh sách học sinh trong lớp
app.get('/api/admin/classes/:id/students', authenticateToken, enforceSchoolIsolation, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Chỉ admin và giáo viên mới có quyền xem danh sách học sinh' });
  }

  const classId = parseInt(req.params.id);
  const school_id = req.schoolId;

  console.log(`[GET /api/admin/classes/${classId}/students] User: ${req.user.username}, Role: ${req.user.role}, School: ${school_id}`);

  // Query to get all students in the class using class_id
  const query = `
    SELECT 
      u.id,
      u.username,
      u.full_name,
      u.email,
      u.class_name,
      u.class_id,
      u.grade_level,
      u.school_level,
      u.created_at
    FROM users u
    WHERE u.class_id = ? 
      AND u.school_id = ?
      AND u.role = 'student'
    ORDER BY u.full_name ASC
  `;

  db.all(query, [classId, school_id], (err, students) => {
    if (err) {
      console.error('[GET /api/admin/classes/:id/students] Database error:', err);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách học sinh' });
    }

    console.log(`[GET /api/admin/classes/${classId}/students] Found ${students.length} student(s)`);
    res.json(students);
  });
});

// ============================================================================
// SUPER ADMIN - SCHOOL MANAGEMENT WITH SOFT DELETE
// ============================================================================

// GET /api/super-admin/schools - Get all schools (excluding deleted)
app.get('/api/super-admin/schools', authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: 'Only super admin can view all schools' });
  }

  const includeDeleted = req.query.include_deleted === 'true';
  const query = includeDeleted
    ? 'SELECT * FROM schools ORDER BY name'
    : 'SELECT * FROM schools WHERE is_deleted = 0 ORDER BY name';

  db.all(query, (err, schools) => {
    if (err) {
      console.error('Error fetching schools:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(schools);
  });
});

// POST /api/super-admin/schools - Create new school
app.post('/api/super-admin/schools', authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: 'Only super admin can create schools' });
  }

  const { name, district_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'School name is required' });
  }

  // Check if school with same name exists but is deleted
  db.get('SELECT id, is_deleted FROM schools WHERE UPPER(TRIM(name)) = ?', [name.trim().toUpperCase()], (err, existing) => {
    if (err) {
      console.error('Error checking existing school:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing && existing.is_deleted === 1) {
      // School exists but is deleted - suggest restore
      return res.status(409).json({
        error: 'School with this name was previously deleted',
        suggestion: 'restore',
        schoolId: existing.id,
        message: 'Would you like to restore the deleted school instead?'
      });
    }

    if (existing && existing.is_deleted === 0) {
      return res.status(400).json({ error: 'School with this name already exists' });
    }

    // Create new school
    db.run(
      'INSERT INTO schools (name, district_id, is_deleted) VALUES (?, ?, 0)',
      [name.trim(), district_id],
      function (err) {
        if (err) {
          console.error('Error creating school:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        console.log(`✓ Created school: ${name} (ID: ${this.lastID})`);
        res.json({ message: 'School created successfully', id: this.lastID });
      }
    );
  });
});

// PUT /api/super-admin/schools/:id - Update school
app.put('/api/super-admin/schools/:id', authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: 'Only super admin can update schools' });
  }

  const { id } = req.params;
  const { name, district_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'School name is required' });
  }

  db.run(
    'UPDATE schools SET name = ?, district_id = ? WHERE id = ? AND is_deleted = 0',
    [name.trim(), district_id, id],
    function (err) {
      if (err) {
        console.error('Error updating school:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'School not found or already deleted' });
      }
      console.log(`✓ Updated school ID ${id}`);
      res.json({ message: 'School updated successfully' });
    }
  );
});

// DELETE /api/super-admin/schools/:id - Soft delete school
app.delete('/api/super-admin/schools/:id', authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: 'Only super admin can delete schools' });
  }

  const { id } = req.params;

  // Check if school has students
  db.get('SELECT COUNT(*) as count FROM users WHERE school_id = ? AND role = "student"', [id], (err, result) => {
    if (err) {
      console.error('Error checking students:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const studentCount = result.count;

    // Soft delete (mark as deleted)
    db.run(
      'UPDATE schools SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
      function (err) {
        if (err) {
          console.error('Error deleting school:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'School not found' });
        }
        console.log(`✓ Soft deleted school ID ${id} (${studentCount} students preserved)`);
        res.json({
          message: 'School deleted successfully',
          note: studentCount > 0 ? `${studentCount} student(s) remain linked to this school` : null
        });
      }
    );
  });
});

// POST /api/super-admin/schools/:id/restore - Restore deleted school
app.post('/api/super-admin/schools/:id/restore', authenticateToken, (req, res) => {
  if (req.user.is_super_admin !== 1) {
    return res.status(403).json({ error: 'Only super admin can restore schools' });
  }

  const { id } = req.params;

  db.run(
    'UPDATE schools SET is_deleted = 0, deleted_at = NULL WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        console.error('Error restoring school:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'School not found' });
      }
      console.log(`✓ Restored school ID ${id}`);
      res.json({ message: 'School restored successfully' });
    }
  );
});


// Start server with Socket.IO
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO enabled for real-time monitoring`);
});

