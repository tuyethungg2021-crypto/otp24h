
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Không tìm thấy phần tử root để gắn ứng dụng!");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Lỗi khi khởi tạo ứng dụng React:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Đã xảy ra lỗi khởi động!</h2>
      <p>${error instanceof Error ? error.message : 'Vui lòng kiểm tra console để biết chi tiết.'}</p>
    </div>`;
  }
}
