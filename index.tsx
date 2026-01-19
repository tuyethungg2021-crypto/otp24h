
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("%c OTPSIM %c Đang khởi tạo ứng dụng...", "background: #4f46e5; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;", "color: #4f46e5; font-weight: bold;");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("%c Thành công %c React đã render.", "background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;", "color: #10b981;");
  } catch (error) {
    console.error("Lỗi Render:", error);
    container.innerHTML = `<div style="color: red; padding: 40px; text-align: center;"><h2>Lỗi ứng dụng</h2><p>${String(error)}</p></div>`;
  }
} else {
  console.error("Lỗi: Không tìm thấy #root");
}
