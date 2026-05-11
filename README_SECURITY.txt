Bản bảo mật nâng cấp:
- JWT Bearer token thay cho x-user-id.
- API admin bắt buộc token admin.
- API user lấy user từ token, không tin userId client gửi lên.
- Mật khẩu mới dùng scrypt hash; tài khoản cũ sẽ tự migrate khi login.
- Khách không thể gọi API hủy sim; endpoint cancel chỉ admin dùng được.
- DMX mua voucher và lịch sử mua bắt buộc token.
- Chặn brute-force login cơ bản.
- Security headers cơ bản.

Render Environment nên thêm:
AUTH_SECRET=<chuỗi bí mật dài, ngẫu nhiên>
ADMIN_PASSWORD=<mật khẩu admin mặc định nếu tạo DB mới>
