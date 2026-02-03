# Hướng Dẫn Khắc Phục Sự Cố

## Vấn đề: Đăng nhập/Đăng ký thất bại

### 1. Kiểm tra Server Backend có đang chạy không

**Bước 1:** Mở terminal và chạy:
```bash
cd server
npm install
node index.js
```

Bạn sẽ thấy thông báo:
```
Connected to SQLite database
Server is running on port 5000
API URL: http://localhost:5000/api
```

**Nếu không thấy:** Kiểm tra xem port 5000 có bị chiếm dụng không:
- Windows: `netstat -ano | findstr :5000`
- Nếu port bị chiếm, thay đổi PORT trong file `server/.env`

### 2. Kiểm tra Frontend có kết nối được với Backend không

**Bước 1:** Mở trình duyệt và truy cập:
```
http://localhost:5000/api/auth/login
```

**Bước 2:** Mở Developer Tools (F12) trong trình duyệt khi đăng nhập, xem tab Console và Network:
- Nếu thấy lỗi "Network Error" hoặc "ECONNREFUSED": Backend chưa chạy
- Nếu thấy lỗi CORS: Kiểm tra cấu hình CORS trong server/index.js

### 3. Kiểm tra Database

**Bước 1:** Kiểm tra file `server/database.db` có được tạo không

**Bước 2:** Nếu không có, xóa file và khởi động lại server để tạo lại:
```bash
cd server
rm database.db  # hoặc del database.db trên Windows
node index.js
```

### 4. Kiểm tra Logs

**Backend:** Xem console output khi đăng nhập:
- Nếu thấy "Database error": Database có vấn đề
- Nếu thấy "Bcrypt error": Có vấn đề với mật khẩu

**Frontend:** Mở Developer Tools (F12) > Console:
- Xem các lỗi JavaScript
- Xem các request API trong tab Network

### 5. Kiểm tra Tài khoản Admin

Tài khoản admin mặc định:
- Username: `admin`
- Password: `admin123`

Nếu không đăng nhập được:
1. Xóa file `server/database.db`
2. Khởi động lại server để tạo lại database và tài khoản admin

### 6. Lỗi thường gặp

#### "Cannot connect to server"
- **Nguyên nhân:** Backend chưa chạy hoặc chạy sai port
- **Giải pháp:** Chạy `cd server && node index.js`

#### "Tên đăng nhập đã tồn tại"
- **Nguyên nhân:** Username đã được sử dụng
- **Giải pháp:** Chọn username khác

#### "Tên đăng nhập hoặc mật khẩu không đúng"
- **Nguyên nhân:** Sai username/password hoặc sai role
- **Giải pháp:** 
  - Kiểm tra lại thông tin đăng nhập
  - Đảm bảo chọn đúng role (student/admin)

#### "Database error"
- **Nguyên nhân:** Database bị lỗi hoặc chưa được tạo
- **Giải pháp:** Xóa database.db và khởi động lại server

### 7. Cách chạy đúng

**Terminal 1 - Backend:**
```bash
cd server
npm install
node index.js
```

**Terminal 2 - Frontend:**
```bash
v
```

Hoặc dùng script:
```bash
npm run install:all
npm run dev
```

### 8. Test API trực tiếp

Sử dụng Postman hoặc curl để test:

**Đăng nhập:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'
```

**Đăng ký:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","full_name":"Test User","grade_level":"thcs_6"}'
```

### 9. Reset hoàn toàn

Nếu vẫn không được, reset toàn bộ:

```bash
# Xóa database
rm server/database.db  # hoặc del server\database.db trên Windows

# Xóa node_modules và cài lại
rm -rf node_modules server/node_modules client/node_modules
npm run install:all

# Chạy lại
c
```

