
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Đang bắt đầu khởi tạo React...");

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("React App đã được render vào #root thành công.");
  } catch (error) {
    console.error("Lỗi khi render React:", error);
    if (container.innerHTML === "") {
        container.innerHTML = `<div style="color: red; padding: 20px;">Lỗi render: ${String(error)}</div>`;
    }
  }
} else {
  console.error("Không tìm thấy phần tử #root để khởi chạy ứng dụng!");
}
