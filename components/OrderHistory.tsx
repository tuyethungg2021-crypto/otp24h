
import React from 'react';
import { ActiveOrder } from '../types';

interface OrderHistoryProps {
  orders: ActiveOrder[];
  role: 'admin' | 'user';
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, role }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Lịch sử giao dịch</h2>
        <div className="text-[10px] font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100">
          TỔNG CỘNG: {orders.length} ĐƠN HÀNG
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dịch vụ</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã OTP</th>
                {role === 'admin' && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đại lý</th>}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={role === 'admin' ? 6 : 5} className="px-6 py-12 text-center text-slate-400 font-bold italic">Chưa có lịch sử giao dịch.</td>
                </tr>
              ) : (
                orders.sort((a, b) => b.createdAt - a.createdAt).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-black text-slate-800 uppercase">{order.serviceName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-indigo-600">
                      {order.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-black text-emerald-600 font-mono">{order.otp || '---'}</span>
                    </td>
                    {role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 rounded-md text-slate-500 uppercase">{order.ownerId.slice(-4)}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        order.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {order.status === 'RECEIVED' ? 'Thành công' : 
                         order.status === 'CANCELLED' ? 'Đã hủy' : 
                         order.status === 'WAITING' ? 'Đang chờ' : 'Hết hạn'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
