
import React from 'react';
import { ActiveOrder } from '../types';

interface OtpDashboardProps {
  orders: ActiveOrder[];
  onCancel: (order: ActiveOrder) => void;
}

const OtpDashboard: React.FC<OtpDashboardProps> = ({ orders, onCancel }) => {
  if (orders.length === 0) return null;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
           ' ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Có thể thêm thông báo toast ở đây nếu cần
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày Giờ</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dịch Vụ</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số Điện Thoại</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mã OTP</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng Thái</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                {/* Ngày Giờ */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{formatDate(order.createdAt).split(' ')[0]}</span>
                    <span className="text-[10px] font-medium text-slate-400">{formatDate(order.createdAt).split(' ')[1]}</span>
                  </div>
                </td>

                {/* Dịch Vụ */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">📱</span>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{order.serviceName}</span>
                  </div>
                </td>

                {/* Số Điện Thoại */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-indigo-600 font-mono tracking-tighter">{order.phoneNumber}</span>
                    <button 
                      onClick={() => copyToClipboard(order.phoneNumber)}
                      className="p-1.5 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Sao chép số"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                </td>

                {/* Mã OTP */}
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {order.otp ? (
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-sm font-black text-emerald-600 font-mono tracking-[0.2em]">{order.otp}</span>
                      <button 
                        onClick={() => copyToClipboard(order.otp || '')}
                        className="p-1 text-emerald-400 hover:text-emerald-700 transition-colors"
                        title="Sao chép OTP"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-1">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  )}
                </td>

                {/* Trạng Thái */}
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    order.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 
                    order.status === 'WAITING' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {order.status === 'RECEIVED' ? 'Thành công' : 
                     order.status === 'WAITING' ? 'Đang đợi' : 
                     order.status === 'CANCELLED' ? 'Đã hủy' : 'Hết hạn'}
                  </span>
                </td>

                {/* Thao Tác */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {order.status === 'WAITING' && (
                    <button 
                      onClick={() => onCancel(order)}
                      className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase underline decoration-2 underline-offset-4 transition-all"
                    >
                      Hủy số
                    </button>
                  )}
                  {order.status === 'RECEIVED' && (
                    <span className="text-[10px] font-black text-emerald-500 opacity-50 uppercase">Hoàn tất</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OtpDashboard;
