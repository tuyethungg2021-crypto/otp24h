
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Phục vụ tất cả file tĩnh (bundle.js, index.html, v.v.) từ thư mục hiện tại
app.use(express.static(__dirname));

// Luôn trả về index.html cho các route không phải là file thực tế
app.get('*', (req, res) => {
  // Nếu yêu cầu là một file (có dấu chấm trong tên) nhưng không tìm thấy thì trả 404
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('File not found');
  }
  // Còn lại thì phục vụ index.html (cho Single Page Application)
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server đang chạy tại cổng: ${port}`);
});
