
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Log mọi yêu cầu để kiểm tra trên Render Logs
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Phục vụ file từ thư mục dist (nơi chứa bundle.js)
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Phục vụ file tĩnh khác
app.use(express.static(__dirname));

// Mặc định trả về index.html cho các route (SPA)
app.get('*', (req, res) => {
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('File not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server đang chạy tại cổng: ${port}`);
});
