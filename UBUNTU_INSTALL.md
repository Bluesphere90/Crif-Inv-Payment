# Hướng dẫn Cài đặt & Cấu hình trên Ubuntu (Production Ready)

Tài liệu này hướng dẫn chi tiết cách cài đặt dự án Invoice Management System lên máy chủ Ubuntu và giải thích các cấu hình cần thiết.

## 1. Chuẩn bị Môi trường (Prerequisites)

Trước khi cài đặt dự án, bạn cần cài đặt các phần mềm nền tảng.

### Bước 1: Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### Bước 2: Cài đặt Node.js 18 (LTS)
Dự án yêu cầu Node.js v18+. Sử dụng repository chính thức của NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra version
node -v  # Kết quả nên là v18.x.x
npm -v
```

### Bước 3: Cài đặt PostgreSQL 14
```bash
# Thêm repository PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Cài đặt
sudo apt update
sudo apt install -y postgresql-14 postgresql-contrib-14

# Khởi động service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Bước 4: Cài đặt PM2 (Process Manager)
PM2 giúp chạy ứng dụng Node.js dưới nền (background) và tự động khởi động lại nếu bị lỗi hoặc khi reboot server.
```bash
sudo npm install -g pm2
```

---

## 2. Thiết lập Database

Tạo database và user cho dự án.

```bash
# Đăng nhập vào user postgres
sudo -i -u postgres

# Vào giao diện dòng lệnh psql
psql
```

Trong giao diện `postgres=#`, chạy các lệnh sau:

```sql
-- 1. Tạo database
CREATE DATABASE invoice_management;

-- 2. Tạo user (Thay 'password_baomat' bằng mật khẩu mạnh của bạn)
CREATE USER my_app_user WITH ENCRYPTED PASSWORD 'password_baomat';

-- 3. Cấp quyền vào database
GRANT ALL PRIVILEGES ON DATABASE invoice_management TO my_app_user;

-- 4. KẾT NỐI VÀO DB VÀ CẤP QUYỀN SCHEMA (Quan trọng với Postgres 15+)
\c invoice_management
GRANT ALL ON SCHEMA public TO my_app_user;

-- Thoát
\q
```

Sau đó gõ `exit` để quay lại user bình thường.

---

## 3. Cài đặt và Cấu hình Dự án

### Bước 1: Copy mã nguồn và cài đặt dependencies
Giả sử bạn để code ở `/var/www/invoice-app` hoặc thư mục home.

```bash
# Tại thư mục dự án
npm install
```

### Bước 2: Cấu hình biến môi trường (.env)
Đây là bước quan trọng nhất mà bạn yêu cầu chi tiết.

Copy file mẫu:
```bash
cp .env.example .env
nano .env
```

**Chi tiết các thông tin cần thay đổi trong file `.env`:**

| Biến | Giá trị Mặc định | **Cần thay đổi thành (Production)** | Giải thích |
|------|------------------|-------------------------------------|------------|
| `NODE_ENV` | `development` | `production` | Chuyển sang chế độ chạy thật, giúp tối ưu hiệu năng và bảo mật. |
| `PORT` | `3000` | `3000` (hoặc cổng khác) | Cổng mà ứng dụng sẽ chạy. |
| `DB_HOST` | `localhost` | `localhost` | Giữ nguyên nếu DB nằm cùng server. |
| `DB_USERNAME`| `postgres` | `my_app_user` | User database bạn đã tạo ở phần 2. Không nên dùng user `postgres` root. |
| `DB_PASSWORD`| `...` | `password_baomat` | Mật khẩu bạn đã set ở phần 2. |
| `DB_DATABASE`| `invoice_management` | `invoice_management` | Tên database đã tạo. |
| `CORS_ORIGIN`| `*` | `https://your-frontend-domain.com` | **Quan trọng**: Nếu có Frontend riêng, hãy điền domain của nó vào đây để bảo mật. |
| `JWT_SECRET` | `...` | **CHUỖI_NGẪU_NHIÊN_DÀI** | ⚠️ **BẮT BUỘC ĐỔI**. Dùng lệnh dưới để tạo chuỗi an toàn. |
| `TELEGRAM_*` | (trống) | (Token thật) | Nếu muốn nhận thông báo qua Telegram. |

**Cách tạo JWT Secret mạnh:**
Chạy lệnh này trong terminal và copy kết quả vào `.env`:
```bash
openssl rand -base64 32
```

### Bước 3: Chạy Database Migration & Seed
Để tạo bảng và dữ liệu mẫu (Admin user, team sales...).

```bash
# Chạy migration (tạo bảng)
npm run migration:run

# Chạy seed (tạo dữ liệu mẫu)
npm run seed
```

---

## 4. Chạy ứng dụng (Production)

Không dùng `npm run dev` trên server. Hãy dùng PM2.

### Bước 1: Build dự án
Chuyển đổi code TypeScript sang JavaScript.
```bash
npm run build
```

### Bước 2: Khởi chạy với PM2
```bash
# Chạy file main đã build
pm2 start dist/index.js --name "invoice-app"

# Lưu danh sách process để tự chạy lại khi reboot
pm2 save
pm2 startup
# (Làm theo hướng dẫn hiện ra trên màn hình sau lệnh pm2 startup)
```

### Các lệnh quản lý cơ bản:
- Xem log: `pm2 logs invoice-app`
- Restart: `pm2 restart invoice-app`
- Stop: `pm2 stop invoice-app`

---

## 5. (Tùy chọn) Cấu hình Nginx Reverse Proxy

Để truy cập web qua domain (ví dụ `invoice.company.com`) thay vì `IP:3000`, bạn nên dùng Nginx.

```bash
sudo apt install nginx
```

Tạo file config: `/etc/nginx/sites-available/invoice-app`
```nginx
server {
    listen 80;
    server_name invoice.company.com; # Thay bằng domain hoặc IP của bạn

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/invoice-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Vậy là hoàn tất quá trình cài đặt!
