export const provinces = [
    { id: '01', name: 'Hà Nội' },
    { id: '79', name: 'Thành phố Hồ Chí Minh' },
    { id: '48', name: 'Đà Nẵng' },
    { id: '31', name: 'Hải Phòng' },
    { id: '92', name: 'Cần Thơ' },
    { id: '42', name: 'Thanh Hóa' },
    { id: '40', name: 'Nghệ An' },
    { id: '10', name: 'Lào Cai' },
    { id: '15', name: 'Yên Bái' },
    { id: '64', name: 'Gia Lai' },
    { id: '67', name: 'Đắk Lắk' },
    { id: '77', name: 'Bà Rịa - Vũng Tàu' },
    { id: '74', name: 'Bình Dương' },
    { id: '75', name: 'Đồng Nai' },
    { id: '82', name: 'Tiền Giang' },
    { id: '89', name: 'An Giang' },
    { id: '94', name: 'Sóc Trăng' },
    { id: '26', name: 'Vĩnh Phúc' },
    { id: '27', name: 'Bắc Ninh' },
    { id: '30', name: 'Hải Dương' },
    { id: '33', name: 'Hưng Yên' },
    { id: '34', name: 'Thái Bình' },
    { id: '35', name: 'Hà Nam' },
    { id: '36', name: 'Nam Định' },
    { id: '37', name: 'Ninh Bình' },
    { id: '24', name: 'Bắc Giang' },
    { id: '25', name: 'Phú Thọ' },
    { id: '22', name: 'Quảng Ninh' }
].sort((a, b) => a.name.localeCompare(b.name));

export const districtsByProvince: { [key: string]: string[] } = {
    '01': ['Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Long Biên', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Hoàng Mai', 'Thanh Xuân', 'Sóc Sơn', 'Đông Anh', 'Gia Lâm', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Thanh Trì', 'Hà Đông', 'Sơn Tây', 'Ba Vì', 'Phúc Thọ', 'Đan Phượng', 'Hoài Đức', 'Quốc Oai', 'Thạch Thất', 'Chương Mỹ', 'Thanh Oai', 'Thường Tín', 'Phú Xuyên', 'Ứng Hòa', 'Mỹ Đức'],
    '79': ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Tân', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Thủ Đức', 'Bình Chánh', 'Cần Giờ', 'Củ Chi', 'Hóc Môn', 'Nhà Bè'],
    '48': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang', 'Hoàng Sa'],
    '31': ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An', 'Kiến An', 'Đồ Sơn', 'Dương Kinh', 'An Dương', 'An Lão', 'Bạch Long Vĩ', 'Cát Hải', 'Kiến Thụy', 'Thủy Nguyên', 'Tiên Lãng', 'Vĩnh Bảo'],
    '92': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt', 'Cờ Đỏ', 'Phong Điền', 'Thới Lai', 'Vĩnh Thạnh'],
    '40': ['Vinh', 'Cửa Lò', 'Thái Hòa', 'Diễn Châu', 'Quỳnh Lưu', 'Con Cuông', 'Tương Dương', 'Kỳ Sơn', 'Nam Đàn', 'Hưng Nguyên'],
    '42': ['Thanh Hóa', 'Bỉm Sơn', 'Sầm Sơn', 'Đông Sơn', 'Quảng Xương', 'Hoằng Hóa', 'Hậu Lộc', 'Hà Trung', 'Nga Sơn', 'Thường Xuân'],
};

export const wardsByDistrict: { [key: string]: string[] } = {
    'Ba Đình': ['Phúc Xá', 'Trúc Bạch', 'Vĩnh Phúc', 'Cống Vị', 'Liễu Giai', 'Nguyễn Trung Trực', 'Quán Thánh', 'Ngọc Hà', 'Đội Cấn', 'Kim Mã', 'Giảng Võ', 'Thành Công', 'Ngọc Khánh', 'Điện Biên'],
    'Hoàn Kiếm': ['Phan Chu Trinh', 'Phúc Tân', 'Đồng Xuân', 'Hàng Mã', 'Hàng Buồm', 'Hàng Đào', 'Hàng Bồ', 'Cửa Đông', 'Lý Thái Tổ', 'Hàng Bạc', 'Hàng Gai', 'Chương Dương', 'Hàng Trống', 'Cửa Nam', 'Hàng Bông', 'Tràng Tiền', 'Trần Hưng Đạo', 'Hàng Bài'],
    'Đống Đa': ['Cát Linh', 'Văn Miếu', 'Quốc Tử Giám', 'Láng Thượng', 'Ô Chợ Dừa', 'Văn Chương', 'Hàng Bột', 'Láng Hạ', 'Khâm Thiên', 'Thổ Quan', 'Nam Đồng', 'Trung Phụng', 'Quang Trung', 'Trung Liệt', 'Phương Liên', 'Thịnh Quang', 'Trung Tự', 'Kim Liên', 'Ngã Tư Sở', 'Khương Thượng', 'Phương Mai'],
    'Cầu Giấy': ['Nghĩa Đô', 'Nghĩa Tân', 'Mai Dịch', 'Dịch Vọng', 'Dịch Vọng Hậu', 'Quan Hoa', 'Yên Hòa', 'Trung Hòa'],
    'Quận 1': ['Tân Định', 'Đa Kao', 'Bến Nghé', 'Bến Thành', 'Nguyễn Thái Bình', 'Phạm Ngũ Lão', 'Cầu Ông Lãnh', 'Cô Giang', 'Nguyễn Cư Trinh', 'Cầu Kho'],
    'Quận 3': ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Võ Thị Sáu'],
};

interface SchoolsByLevel {
    thcs: string[];
    thpt: string[];
}

export const schoolsByProvince: { [key: string]: SchoolsByLevel } = {
    '01': { // Hà Nội
        thcs: [
            'THCS Chu Văn An', 'THCS Giảng Võ', 'THCS Cầu Giấy', 'THCS Nguyễn Siêu', 'THCS Đoàn Thị Điểm',
            'THCS Marie Curie', 'THCS Lomonoxop', 'THCS Nguyễn Trường Tộ', 'THCS Ngô Sĩ Liên', 'THCS Trưng Vương',
            'THCS Thăng Long', 'THCS Tây Sơn', 'THCS Bế Văn Đàn', 'THCS Lê Quý Đôn', 'THCS Yên Hòa',
            'THCS Nam Từ Liêm', 'THCS Thanh Xuân', 'THCS Chất lượng cao Cầu Giấy', 'THCS FPT', 'THCS Vinschool'
        ],
        thpt: [
            'THPT Chuyên Hà Nội - Amsterdam', 'THPT Chu Văn An', 'THPT Chuyên Nguyễn Huệ', 'THPT Sơn Tây',
            'THPT Kim Liên', 'THPT Thăng Long', 'THPT Yên Hòa', 'THPT Phan Đình Phùng', 'THPT Việt Đức',
            'THPT Trần Phú', 'THPT Cầu Giấy', 'THPT Nguyễn Gia Thiều', 'THPT Xuân Đỉnh', 'THPT Nhân Chính',
            'THPT Lương Thế Vinh', 'THPT chuyên KHTN', 'THPT Chuyên Ngoại Ngữ', 'THPT FPT', 'THPT Phan Huy Chú'
        ]
    },
    '79': { // TP HCM
        thcs: [
            'THCS Trần Đại Nghĩa', 'THCS Lê Quý Đôn', 'THCS Nguyễn Du', 'THCS Võ Trường Toản', 'THCS Colette',
            'THCS Hai Bà Trưng', 'THCS Nguyễn Văn Tố', 'THCS Hồng Bàng', 'THCS Kim Đồng', 'THCS Lê Văn Tám',
            'THCS Đoàn Thị Điểm', 'THCS Trường Chinh', 'THCS Nguyễn Văn Bé', 'THCS Hoa Lư', 'THCS Bạch Đằng'
        ],
        thpt: [
            'THPT Chuyên Lê Hồng Phong', 'THPT Chuyên Trần Đại Nghĩa', 'THPT Nguyễn Thượng Hiền', 'THPT Bùi Thị Xuân',
            'THPT Lê Quý Đôn', 'THPT Nguyễn Thị Minh Khai', 'THPT Gia Định', 'THPT Trưng Vương', 'THPT Phú Nhuận',
            'THPT Mạc Đĩnh Chi', 'THPT Nguyễn Hữu Huân', 'THPT Trần Phú', 'THPT Nguyễn Công Trứ', 'THPT Ten Lơ Man'
        ]
    },
    '48': { // Đà Nẵng
        thcs: [
            'THCS Kim Đồng', 'THCS Trưng Vương', 'THCS Lê Độ', 'THCS Nguyễn Huệ', 'THCS Tây Sơn',
            'THCS Lý Thường Kiệt', 'THCS Chu Văn An', 'THCS Nguyễn Khuyến'
        ],
        thpt: [
            'THPT Chuyên Lê Quý Đôn', 'THPT Phan Châu Trinh', 'THPT Hoàng Hoa Thám', 'THPT Trần Phú',
            'THPT Thái Phiên', 'THPT Nguyễn Trãi', 'THPT Tôn Thất Tùng'
        ]
    },
    '40': { // Nghệ An
        thcs: [
            'THCS Đặng Thai Mai', 'THCS Lê Mao', 'THCS Lê Lợi', 'THCS Hưng Bình', 'THCS Hà Huy Tập'
        ],
        thpt: [
            'THPT Chuyên Phan Bội Châu', 'THPT Huỳnh Thúc Kháng', 'THPT Hà Huy Tập', 'THPT Lê Viết Thuật'
        ]
    },
    '42': { // Thanh Hóa
        thcs: [
            'THCS Trần Mai Ninh', 'THCS Điện Biên', 'THCS Quang Trung', 'THCS Cù Chính Lan'
        ],
        thpt: [
            'THPT Chuyên Lam Sơn', 'THPT Hàm Rồng', 'THPT Đào Duy Từ', 'THPT Nguyễn Trãi'
        ]
    }
};

// Helper function to get default schools if specific province data is missing
export const getGenericSchools = (level: string) => {
    if (level === 'trung học cơ sở') {
        return ['THCS Lê Lợi', 'THCS Quang Trung', 'THCS Nguyễn Huệ', 'THCS Trần Hưng Đạo', 'THCS Phan Bội Châu'];
    } else if (level === 'trung học phổ thông') {
        return ['THPT Chuyên của Tỉnh', 'THPT Nguyễn Trãi', 'THPT Trần Hưng Đạo', 'THPT Phan Bội Châu', 'THPT Lê Quý Đôn'];
    }
    return [];
};
