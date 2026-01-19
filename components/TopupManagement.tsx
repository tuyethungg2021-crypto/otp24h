
import React from 'react';
import { TopupRequest } from '../types';

interface TopupManagementProps {
  requests: TopupRequest[];
  onApprove: (request: TopupRequest) => void;
  onCancel: (request: TopupRequest) => void;
}

const TopupManagement: React.FC<TopupManagementProps> = ({ requests, onApprove, onCancel }) => {
  const pending = requests.filter(r => r.status === 'PENDING').sort((a, b) => b.createdAt - a.createdAt);
  const processed = requests.filter(r => r.status !== 'PENDING').sort((a, b) => b.createdAt - a.createdAt);

  const renderTable = (data: TopupRequest[], title: string) => (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">{title} ({data.length})</h3>
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tiền</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương thức</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold italic">Không có dữ liệu.</td>
                </tr>
              ) : (
                data.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-slate-800">{req.username}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-emerald-600">+{req.amount.toLocaleString()}đ</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${req.method === 'MOMO' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                        {req.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-500">{req.content}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-slate-400">
                      {new Date(req.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => onApprove(req)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100 hover:scale-105 transition-transform"
                          >
                            Duyệt
                          </button>
                          <button 
                            onClick={() => onCancel(req)}
                            className="bg-rose-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-100 hover:scale-105 transition-transform"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${req.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {req.status === 'SUCCESS' ? 'Thành công' : 'Bị hủy'}
                        </span>
                      )}
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

  return (
    <div className="space-y-12 pb-20">
      {renderTable(pending, "Đơn đang chờ duyệt")}
      {renderTable(processed, "Lịch sử duyệt đơn")}
    </div>
  );
};

export default TopupManagement;
