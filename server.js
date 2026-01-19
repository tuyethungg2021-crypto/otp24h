
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Phục vụ các file tĩnh (HTML, TSX, CSS) trực tiếp từ thư mục gốc
app.use(express.static(__dirname));

// Luôn trả về index.html cho mọi đường dẫn (SPA Routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Web OTP đang chạy tại port ${port}`);
});
