# Hệ Thống Học Tập Tích Hợp AI

Hệ thống học tập thông minh cho học sinh THCS và THPT với tích hợp AI (Google Gemini).

## Tính Năng

- 📚 **Học Bài SGK**: Xem và học các bài học trong sách giáo khoa
- 🎯 **Luyện Tập**: Làm bài tập sau giờ học
- 🗣️ **Luyện Phát Âm**: Cải thiện kỹ năng phát âm tiếng Anh
- 📖 **Từ Vựng**: Học từ vựng theo từng cấp độ
- 🤖 **AI Hỗ Trợ**: Trợ lý AI thông minh giúp học tập
- 🏆 **Bảng Xếp Hạng**: Theo dõi thành tích học tập
- 👨‍💼 **Quản Trị**: Trang quản trị cho admin

## Công Nghệ Sử Dụng

### Frontend
- Next.js 14 (React Framework)
- TypeScript
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express.js
- SQLite
- JWT Authentication
- Google Gemini AI API

## Cài Đặt

### 1. Cài đặt dependencies

```bash
npm run install:all
```

Hoặc cài đặt riêng:

```bash
# Root
npm install

# Backend
cd server
npm install

# Frontend
cd client
npm install
```

### 2. Cấu hình môi trường

Tạo file `server/.env`:

```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GEMINI_API_KEY=AIzaSyCvNwNAbcHvPduQ0Q5TD_isIX_PR16chH4
```

### 3. Chạy ứng dụng

**Chạy cả frontend và backend:**

```bash
npm run dev
```

**Hoặc chạy riêng:**

```bash
# Backend (terminal 1)
cd server
npm run dev

# Frontend (terminal 2)
cd client
npm run dev
```

### 4. Truy cập ứng dụng

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Tài Khoản Mặc Định

### Admin
- Username: `admin`
- Password: `admin123`

### Học Sinh
- Đăng ký tài khoản mới từ trang đăng nhập học sinh

## Cấu Trúc Dự Án

```
project/
├── client/                 # Frontend (Next.js)
│   ├── app/               # Pages và routes
│   ├── lib/               # Utilities và API
│   └── ...
├── server/                # Backend (Express)
│   ├── index.js          # Server chính
│   └── ...
├── database.db           # SQLite database (tự động tạo)
└── package.json          # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký

### Lessons
- `GET /api/lessons` - Lấy danh sách bài học
- `GET /api/lessons/:id` - Lấy chi tiết bài học

### Exercises
- `GET /api/exercises/:lessonId` - Lấy bài tập theo bài học
- `POST /api/exercises/submit` - Nộp bài tập

### Vocabulary
- `GET /api/vocabulary` - Lấy danh sách từ vựng

### AI
- `POST /api/ai/chat` - Chat với AI

### Leaderboard
- `GET /api/leaderboard` - Lấy bảng xếp hạng

### Admin
- `POST /api/admin/lessons` - Tạo bài học
- `POST /api/admin/exercises` - Tạo bài tập
- `POST /api/admin/vocabulary` - Thêm từ vựng

## Phát Triển

### Thêm nội dung học tập

1. Đăng nhập với tài khoản admin
2. Sử dụng trang Admin Dashboard để:
   - Tạo bài học mới
   - Tạo bài tập cho bài học
   - Thêm từ vựng

### Tùy chỉnh

- Thay đổi màu sắc: Sửa `tailwind.config.js`
- Thay đổi API URL: Sửa `client/next.config.js` và `client/lib/api.ts`
- Thay đổi database: Sửa `server/index.js`

## Lưu Ý

- API key Gemini đã được tích hợp sẵn trong code. Trong môi trường production, nên lưu trong biến môi trường.
- Database SQLite sẽ được tạo tự động khi chạy server lần đầu.
- Đảm bảo đã cài đặt Node.js (phiên bản 18 trở lên).
- **Quan trọng về Gemini AI**: Hệ thống sử dụng model `gemini-pro` (model ổn định nhất). Nếu gặp lỗi 404, hệ thống sẽ tự động thử `gemini-1.5-flash`. Đảm bảo API key của bạn có quyền truy cập các model này.

## License

MIT

# edusmart
