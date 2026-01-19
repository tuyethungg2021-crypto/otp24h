
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// 1. Phục vụ các file tĩnh trong thư mục dist và root
app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

// 2. Xử lý các yêu cầu file (js, css, png...) nếu không tồn tại thì trả về 404 thay vì index.html
app.get('*', (req, res, next) => {
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('File not found');
  }
  next();
});

// 3. Mặc định trả về index.html cho các route của React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
