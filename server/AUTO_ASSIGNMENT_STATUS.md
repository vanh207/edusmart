# Tóm tắt: Tự động gán trường và lớp cho học sinh

## Tình trạng hiện tại

### ✅ ĐÃ CÓ - Functions hỗ trợ tự động gán

1. **`findSchoolIdByName(schoolName, callback)`** (dòng 223-253)
   - Tự động tìm `school_id` dựa trên tên trường
   - So sánh không phân biệt hoa thường
   - Ví dụ: "THCS ABC" → school_id = 3

2. **`autoAssignStudentToClass(userId, callback)`** (dòng 400-444)
   - ✅ **ĐÃ SỬA** - Tự động tìm và gán `class_id` dựa trên:
     - Tên lớp (`class_name`)
     - Trường (`school_id`)
     - Khối lớp (`grade_level`)
   - **Trước:** Chỉ cập nhật `current_class_id`
   - **Sau:** Cập nhật cả `class_id` VÀ `current_class_id`

### ⚠️ CẦN KIỂM TRA

**Các functions này có được gọi trong endpoint đăng ký không?**

Nếu endpoint đăng ký (`/api/register` hoặc `/api/admin/register`) KHÔNG gọi 2 functions này, thì học sinh mới đăng ký sẽ:
- ❌ Không được gán `school_id` tự động
- ❌ Không được gán `class_id` tự động
- ❌ Phải admin thủ công sửa sau

### 🔍 Cần làm gì tiếp theo

1. Tìm endpoint đăng ký (có thể là `/api/register` hoặc `/api/admin/register`)
2. Kiểm tra xem endpoint có gọi:
   - `findSchoolIdByName()` để gán school_id?
   - `autoAssignStudentToClass()` để gán class_id?
3. Nếu chưa gọi → Thêm logic gọi 2 functions này

### 📝 Flow lý tưởng khi học sinh đăng ký

```
1. Học sinh điền form:
   - Tên trường: "THCS ABC"
   - Lớp: "6A"
   - Khối: "thcs_6"

2. Backend xử lý:
   a. Gọi findSchoolIdByName("THCS ABC") → school_id = 3
   b. Tạo user với school_id = 3, class_name = "6A", grade_level = "thcs_6"
   c. Gọi autoAssignStudentToClass(userId) → tìm lớp 6A trong school_id=3 → gán class_id = 8

3. Kết quả:
   ✅ Học sinh tự động xuất hiện trong lớp 6A
   ✅ Admin không cần sửa thủ công
```

### 🎯 Kết luận

- ✅ **Logic tự động gán đã có sẵn**
- ✅ **Function autoAssignStudentToClass đã được sửa** (cập nhật cả class_id)
- ⚠️ **Cần kiểm tra xem endpoint đăng ký có gọi các functions này không**
