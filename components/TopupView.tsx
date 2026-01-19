
import React, { useState } from 'react';
import { SiteConfig, TopupRequest } from '../types';

interface TopupViewProps {
  config: SiteConfig;
  userRequests: TopupRequest[];
  onSubmitRequest: (amount: number, method: 'BANK' | 'MOMO', content: string) => void;
  username: string;
}

const TopupView: React.FC<TopupViewProps> = ({ config, userRequests, onSubmitRequest, username }) => {
  const [amount, setAmount] = useState('');
  const [contentNote, setContentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transferContent = `Nap_tien_${username}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Đã sao chép: ${text}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) < 10000) {
      alert("Số tiền nạp tối thiểu là 10.000đ");
      return;
    }
    setIsSubmitting(true);
    onSubmitRequest(parseInt(amount), 'BANK', `${transferContent} ${contentNote}`);
    
    setTimeout(() => {
      setAmount('');
      setContentNote('');
      setIsSubmitting(false);
      alert("Đã gửi thông báo! Vui lòng đợi Admin kiểm tra đơn nạp của bạn.");
    }, 500);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Payment Details */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-500">
            <div className="p-8 text-white flex flex-col items-center bg-gradient-to-r from-red-600 to-red-700">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg">
                 <span className="text-red-600 font-black text-xl">TCB</span>
               </div>
               <h2 className="text-xl font-black uppercase tracking-widest mb-1">Chuyển khoản Ngân hàng</h2>
               <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Giao dịch xử lý thủ công (1-5 phút)</p>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
               {/* Left: Info */}
               <div className="space-y-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ngân hàng thụ hưởng</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{config.bankName}</p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Số tài khoản</p>
                      <p className="text-lg font-black text-red-600 font-mono tracking-tight">{config.bankAccountNumber}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(config.bankAccountNumber)}
                      className="w-10 h-10 bg-white text-red-600 rounded-xl flex items-center justify-center border border-slate-200 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      title="Sao chép"
                    >
                      📋
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Người hưởng thụ</p>
                    <p className="text-sm font-black text-slate-800 uppercase">{config.bankBeneficiary}</p>
                  </div>

                  <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-red-400 uppercase mb-1">Nội dung chuyển khoản</p>
                      <p className="text-sm font-black text-red-700 font-mono">{transferContent}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(transferContent)}
                      className="w-10 h-10 bg-white text-red-600 rounded-xl flex items-center justify-center border border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      📋
                    </button>
                  </div>
               </div>

               {/* Right: QR Code */}
               <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative p-4 bg-white border-4 border-slate-50 rounded-[2.5rem] shadow-inner group">
                     <img 
                       src={config.bankQrUrl} 
                       alt="Payment QR" 
                       className="w-64 h-64 object-contain rounded-2xl group-hover:scale-105 transition-transform"
                     />
                     <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] pointer-events-none">
                       <span className="bg-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg">QUÉT MÃ QR</span>
                     </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center max-w-[200px] leading-relaxed">
                    Sử dụng App Ngân hàng bất kỳ để quét mã nạp tiền
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Form Confirmation */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6 justify-center">
                 <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-lg">📝</div>
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gửi xác nhận nạp</h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Số tiền đã chuyển (VNĐ)</label>
                  <input 
                    type="number" 
                    placeholder="VD: 50000"
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-600 transition-all font-black text-xl text-red-600"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['20000', '50000', '100000', '200000', '500000'].map(v => (
                      <button key={v} type="button" onClick={() => setAmount(v)} className="text-[9px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-slate-200">+{parseInt(v).toLocaleString()}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Ghi chú (Tùy chọn)</label>
                  <input 
                    type="text" 
                    placeholder="Mã giao dịch hoặc tên người gửi..."
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none text-sm font-bold"
                    value={contentNote}
                    onChange={e => setContentNote(e.target.value)}
                  />
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                  <p className="text-[10px] text-amber-700 font-bold leading-tight">
                    <span className="text-sm">🔔</span> Lưu ý: Sau khi chuyển khoản hãy gửi đơn ngay. Hệ thống sẽ tự động cập nhật số dư sau 1-3 phút.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl uppercase disabled:opacity-50 active:scale-95"
                >
                  XÁC NHẬN ĐÃ CHUYỂN TIỀN
                </button>
              </form>
           </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight ml-2 flex items-center gap-2">
           <span className="text-2xl">⏳</span> Lịch sử nạp tiền
        </h3>
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[700px]">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tiền</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phương thức</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Trạng thái</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {userRequests.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-8 py-16 text-center text-slate-400 font-bold italic">Bạn chưa thực hiện giao dịch nạp tiền nào.</td>
                   </tr>
                 ) : (
                   userRequests.sort((a,b) => b.createdAt - a.createdAt).map(req => (
                     <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-slate-500">
                          {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-sm font-black text-emerald-600">+{req.amount.toLocaleString()}đ</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-[10px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-lg uppercase">NGÂN HÀNG</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                          <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${
                            req.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {req.status === 'SUCCESS' ? 'Đã duyệt' : 
                             req.status === 'PENDING' ? 'Chờ duyệt' : 'Đã hủy'}
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
    </div>
  );
};

export default TopupView;
