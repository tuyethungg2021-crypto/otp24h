
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Phục vụ các file trong thư mục gốc và thư mục dist
app.use(express.static(__dirname));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Luôn trả về index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Web OTP đang chạy tại port ${port}`);
});
