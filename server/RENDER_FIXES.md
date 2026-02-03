# Khắc Phục 2 Vấn Đề Render

## 1️⃣ Migrate SQLite → PostgreSQL

### Vấn Đề
Render không hỗ trợ SQLite persistent vì file system là ephemeral (tạm thời).

### Giải Pháp

#### Bước 1: Cài PostgreSQL Package

```bash
cd server
npm install pg
```

#### Bước 2: Chạy Migration Script

**Local (trước khi deploy):**
```bash
# Set PostgreSQL connection string
export DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Run migration
node migrate-to-postgres.js
```

**Trên Render (sau khi deploy):**
1. Vào Render Dashboard → Service → Shell
2. Chạy:
```bash
node migrate-to-postgres.js
```

#### Bước 3: Update Code (Tùy Chọn)

**Cách 1: Dùng Database Adapter (Khuyến nghị)**

Thay tất cả:
```javascript
const db = new sqlite3.Database('./database.db');
```

Thành:
```javascript
const db = require('./db-adapter');
await db.connect();
```

**Cách 2: Điều Kiện Theo Environment**

```javascript
let db;
if (process.env.DATABASE_URL) {
  // PostgreSQL (Production)
  const { Client } = require('pg');
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await db.connect();
} else {
  // SQLite (Development)
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database('./database.db');
}
```

---

## 2️⃣ Khắc Phục Free Tier Sleep

### Vấn Đề
Render free tier sleep sau 15 phút không có request → Khởi động lại mất ~30 giây.

### Giải Pháp 1: UptimeRobot (Miễn Phí)

#### Bước 1: Đăng Ký UptimeRobot

1. Truy cập: https://uptimerobot.com
2. Đăng ký tài khoản miễn phí
3. Xác nhận email

#### Bước 2: Tạo Monitor

1. Click **+ Add New Monitor**
2. Điền thông tin:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** EduSmart Backend
   - **URL:** `https://edusmart-backend.onrender.com/health`
   - **Monitoring Interval:** 5 minutes (free tier)
3. Click **Create Monitor**

#### Bước 3: Thêm Health Check Endpoint

**File `server/index.js`:**
```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

#### Kết Quả
- ✅ UptimeRobot ping mỗi 5 phút
- ✅ Server không bao giờ sleep
- ✅ Miễn phí (50 monitors)
- ✅ Email alert nếu server down

---

### Giải Pháp 2: Cron-Job.org (Miễn Phí)

1. Truy cập: https://cron-job.org
2. Đăng ký tài khoản
3. Tạo cron job:
   - **URL:** `https://edusmart-backend.onrender.com/health`
   - **Schedule:** Every 5 minutes
4. Enable job

---

### Giải Pháp 3: Upgrade Render ($7/tháng)

**Ưu điểm:**
- ✅ Không sleep
- ✅ Faster builds
- ✅ More resources (512MB → 2GB RAM)
- ✅ Priority support

**Nhược điểm:**
- ❌ Phải trả phí

---

## 📋 Checklist Hoàn Chỉnh

### Migration
- [ ] Cài package `pg`: `npm install pg`
- [ ] Tạo PostgreSQL database trên Render
- [ ] Copy `DATABASE_URL` từ Render
- [ ] Chạy `migrate-to-postgres.js`
- [ ] Verify data migrated: `psql $DATABASE_URL`
- [ ] Update code để dùng PostgreSQL
- [ ] Test locally với PostgreSQL

### Anti-Sleep
- [ ] Thêm `/health` endpoint
- [ ] Deploy lên Render
- [ ] Đăng ký UptimeRobot
- [ ] Tạo monitor với URL `/health`
- [ ] Test: Đợi 20 phút → Kiểm tra server vẫn chạy

---

## 🧪 Testing

### Test Migration

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# List tables
\dt

# Check data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM classes;
SELECT COUNT(*) FROM schools;

# Exit
\q
```

### Test Anti-Sleep

1. Deploy lên Render
2. Đợi 20 phút (không truy cập)
3. Mở browser: `https://edusmart-backend.onrender.com/api/ping`
4. Nếu response ngay lập tức → ✅ Không sleep
5. Nếu mất 30s → ❌ Vẫn sleep → Check UptimeRobot

---

## 🎯 Kết Quả Mong Đợi

Sau khi hoàn thành:

- ✅ Database: PostgreSQL (persistent)
- ✅ Server: Không sleep (24/7 uptime)
- ✅ Response time: < 200ms
- ✅ Chi phí: $0/tháng (free tier + UptimeRobot)

---

## ⚠️ Lưu Ý Quan Trọng

1. **Backup SQLite trước khi migrate:**
   ```bash
   cp database.db database.db.backup
   ```

2. **Test migration locally trước:**
   - Tạo PostgreSQL local (Docker/Homebrew)
   - Test migration script
   - Verify data integrity

3. **Environment Variables:**
   - Development: Không set `DATABASE_URL` → Dùng SQLite
   - Production: Set `DATABASE_URL` → Dùng PostgreSQL

4. **UptimeRobot Limits:**
   - Free: 50 monitors, 5-minute interval
   - Paid: Unlimited monitors, 1-minute interval
