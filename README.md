# 💻 Mini-IDE (v1.0.0)

**Mini-IDE** là một trình soạn thảo mã nguồn (Mini-IDE) cao cấp được tích hợp ngay trên Side Panel của trình duyệt Chrome. Với phong cách thiết kế **Glassmorphism** hiện đại và hiệu năng tối ưu, công cụ này cho phép bạn truy cập và chỉnh sửa trực tiếp các tệp mã nguồn cục bộ một cách an toàn và mạnh mẽ.

![Banner](icons/icon128.png)

---

## ✨ Tính năng nổi bật

### 1. Quản lý Tệp tin "Thực tế" (Native File Management)

- Sử dụng **File System Access API** để phá bỏ rào cản giữa trình duyệt và hệ thống tệp cục bộ.
- **Cây thư mục Đa cấp**: Duyệt các dự án sâu với khả năng đóng/mở thư mục mượt mà.
- **Sắp xếp Thông minh**: Tự động ưu tiên hiển thị thư mục trước, sau đó đến các tệp tin theo thứ tự bảng chữ cái (giống như VS Code).

### 2. Trình soạn thảo chuyên nghiệp (Smart Editor)

- **Đồng bộ Số dòng**: Hệ thống số dòng được tích hợp hoàn hảo với khả năng cuộn đồng bộ (Scroll Sync) chính xác tuyệt đối.
- **Tô màu Mã nguồn (Syntax Highlighting)**: Hỗ trợ highlight nhẹ nhàng cho JS, HTML, CSS, giúp việc đọc code trở nên dễ dàng hơn.
- **Hỗ trợ Tab & Indent**: Xử lý thụt lề chuẩn xác, mang lại cảm giác gõ code như trên các IDE thực thụ.

### 3. Tùy chỉnh Không gian làm việc (Fluid Workspace)

- **Thanh kéo linh hoạt (Resizer)**: Điều chỉnh độ rộng của vùng làm việc bằng thao tác kéo thả trực quan.
- **Ẩn/Hiện Sidebar**: Nút toggle chuyên dụng giúp bạn ẩn nhanh cây thư mục để tập trung hoàn toàn 100% vào mã nguồn.
- **Ghi nhớ Bố cục**: Tự động lưu lại độ rộng và trạng thái hiển thị của bạn cho các phiên làm việc sau.

### 4. Phiên làm việc Bền bỉ (Persistence)

- **Khôi phục Dự án**: Tự động ghi nhớ thư mục cuối cùng bạn đã mở thông qua IndexedDB.
- **Trạng thái Tiện ích**: Hiển thị chỉ báo "Dirty" (chưa lưu) để bạn luôn kiểm soát được dữ liệu của mình.
- **Bảo vệ tệp Binary**: Ngăn chặn việc mở các tệp không phải văn bản (PDF, Ảnh, Video) để đảm bảo ứng dụng luôn ổn định và không bị treo.

### 5. Quản lý Thao tác lồng nhau (Nested Operations)

- **Thao tác Inline**: Đổi tên hoặc tạo mới file/folder ngay trên cây thư mục mà không cần các hộp thoại phiền phức.
- **Cơ chế Xóa An sau**: Sử dụng API `removeEntry` hiện đại giúp thao tác xóa diễn ra tin cậy ở bất kỳ cấp độ sâu nào của dự án.
- **Chống lỗi Nhân đôi**: Hệ thống bảo vệ thông minh ngăn chặn việc tạo tệp trùng lặp khi người dùng tương tác nhanh.

---

## ⌨️ Phím tắt & Thao tác nhanh

- **`Ctrl + S`**: Lưu nhanh tệp đang chỉnh sửa.
- **`Enter`**: Xác nhận nhanh khi đang Đổi tên hoặc Tạo mới.
- **`Esc`**: Hủy bỏ thao tác Đổi tên hoặc Tạo mới.
- **Click vào Folder**: Đóng hoặc mở thư mục con.
- **Nút biểu tượng trong Folder**: Thêm file/folder mới trực tiếp vào thư mục đó.
- **Nút Toggle (Header)**: Mở rộng vùng soạn thảo bằng cách ẩn cây thư mục.

---

## 🚀 Hướng dẫn cài đặt (Dành cho nhà phát triển)

1.  Tải mã nguồn dự án về máy tính.
2.  Mở trình duyệt Chrome và truy cập `chrome://extensions`.
3.  Bật **Developer mode** (Chế độ nhà phát triển) ở góc trên bên phải.
4.  Nhấn nút **Load unpacked** và chọn thư mục chứa mã nguồn của Mini-IDE.
5.  Ghim (Pin) Extension lên thanh công cụ để mở Side Panel nhanh chóng.

---

## 🛠️ Công nghệ sử dụng

- **Ngôn ngữ**: HTML5 (Semantic), Vanilla CSS (Flexbox/Grid/Variables), JavaScript (ES6+).
- **Công nghệ cốt lõi**:
  - `FileSystemAccessAPI`: Giao tiếp hệ thống tệp.
  - `IndexedDB`: Lưu trữ Handle an toàn.
  - `LocalStorage`: Lưu trữ cấu hình giao diện.
- **Thiết kế**: Phong cách Glassmorphism với Dark Mode cao cấp.

---

## 📄 Giấy phép & Liên hệ

- **Phiên bản**: 1.0.0
- **Tác giả**: [Black Candy 🍫]
