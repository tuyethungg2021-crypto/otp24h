
import React, { useState } from 'react';
import { SiteConfig } from '../types';

interface AdminSettingsProps {
  config: SiteConfig;
  onSave: (newConfig: SiteConfig) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ config, onSave }) => {
  const [formData, setFormData] = useState<SiteConfig>(config);
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'guide'>('config');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Quản trị hệ thống</h2>
            <p className="text-sm text-slate-400 font-bold mt-1">Cấu hình vận hành website thực tế</p>
          </div>
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveSubTab('config')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cấu hình
            </button>
            <button 
              onClick={() => setActiveSubTab('guide')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'guide' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Hướng dẫn Live
            </button>
          </div>
        </div>
        
        {activeSubTab === 'config' ? (
          <form onSubmit={handleSubmit} className="p-10 space-y-12 animate-in fade-in duration-300">
            {/* Chung */}
            <section className="space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-lg">🌐</div>
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Cấu hình chung</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tên Website / Thương hiệu</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm"
                     value={formData.siteName}
                     onChange={e => setFormData({...formData, siteName: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Link Telegram Hỗ Trợ (Admin)</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm"
                     value={formData.telegramLink}
                     onChange={e => setFormData({...formData, telegramLink: e.target.value})}
                   />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Thông báo toàn trang</label>
                   <textarea 
                     className="w-full bg-amber-50/50 border border-amber-100 px-5 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all font-bold text-sm text-amber-900 min-h-[100px]"
                     value={formData.announcement}
                     onChange={e => setFormData({...formData, announcement: e.target.value})}
                     placeholder="Nhập nội dung thông báo cho khách hàng..."
                   />
                 </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Master API Key (Lấy từ apisim.codesim.net)</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-sm text-indigo-600"
                     value={formData.masterApiKey}
                     onChange={e => setFormData({...formData, masterApiKey: e.target.value})}
                   />
                 </div>
               </div>
            </section>

            {/* Ngân hàng */}
            <section className="space-y-6 pt-10 border-t border-slate-100">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-lg">🏦</div>
                  <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">Thông tin nhận tiền (Ngân hàng)</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tên Ngân hàng</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none font-bold text-sm"
                     value={formData.bankName}
                     onChange={e => setFormData({...formData, bankName: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Số tài khoản (STK)</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none font-bold text-sm"
                     value={formData.bankAccountNumber}
                     onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Người thụ hưởng</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none font-bold text-sm"
                     value={formData.bankBeneficiary}
                     onChange={e => setFormData({...formData, bankBeneficiary: e.target.value.toUpperCase()})}
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Link Ảnh QR (Dùng VietQR.io)</label>
                   <input 
                     type="text" 
                     className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none font-bold text-sm"
                     value={formData.bankQrUrl}
                     onChange={e => setFormData({...formData, bankQrUrl: e.target.value})}
                   />
                 </div>
               </div>
            </section>

            <div className="pt-10">
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-3xl text-sm font-black shadow-2xl shadow-slate-200 transition-all uppercase tracking-[0.3em] active:scale-[0.98]"
              >
                CẬP NHẬT TOÀN BỘ HỆ THỐNG
              </button>
            </div>
          </form>
        ) : (
          <div className="p-10 space-y-10 animate-in slide-in-from-right-4 duration-300">
             <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Quy trình đưa Web lên Internet</h3>
                <div className="space-y-4 relative z-10">
                   <div className="flex gap-4">
                      <div className="w-8 h-8 min-w-[32px] bg-white/20 rounded-full flex items-center justify-center font-black">1</div>
                      <p className="text-sm font-bold opacity-90">Tạo tài khoản <b>GitHub</b> và tải toàn bộ code này lên một Repository mới.</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-8 h-8 min-w-[32px] bg-white/20 rounded-full flex items-center justify-center font-black">2</div>
                      <p className="text-sm font-bold opacity-90">Truy cập <b>Vercel.com</b>, kết nối GitHub và chọn Repository vừa tạo để Deploy.</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-8 h-8 min-w-[32px] bg-white/20 rounded-full flex items-center justify-center font-black">3</div>
                      <p className="text-sm font-bold opacity-90">Trong cài đặt Vercel, thêm biến môi trường <b>API_KEY</b> (Mã Gemini của bạn).</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-8 h-8 min-w-[32px] bg-white/20 rounded-full flex items-center justify-center font-black">4</div>
                      <p className="text-sm font-bold opacity-90">Trỏ tên miền riêng (nếu có) vào Vercel qua bản ghi CNAME hoặc A.</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                   <h4 className="text-xs font-black text-slate-800 uppercase mb-4 tracking-widest flex items-center gap-2">
                      <span className="text-xl">💰</span> Cách kiếm tiền
                   </h4>
                   <ul className="space-y-3 text-[11px] font-bold text-slate-500 leading-relaxed">
                      <li>• Bạn nạp tiền vào ví <b>Codesim</b> qua API.</li>
                      <li>• Khách nạp tiền cho bạn qua STK (bạn duyệt đơn tay).</li>
                      <li>• Khách thuê SIM với giá bạn đã cấu hình (mặc định x1.5 giá gốc).</li>
                      <li>• Bạn hưởng chênh lệch từ mỗi lần khách thuê thành công.</li>
                   </ul>
                </div>
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                   <h4 className="text-xs font-black text-slate-800 uppercase mb-4 tracking-widest flex items-center gap-2">
                      <span className="text-xl">🔒</span> Bảo mật
                   </h4>
                   <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-4">
                      Mật khẩu Admin mặc định là: <code className="bg-slate-200 px-2 py-0.5 rounded text-indigo-600">hung0385601880</code>. Hãy đổi ngay khi web chạy thực tế.
                   </p>
                   <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                      Các dữ liệu người dùng hiện tại được lưu ở <b>LocalStorage</b> (trình duyệt). Để quản lý tập trung hàng ngàn user, bạn nên nâng cấp lên Database (Supabase/Firebase).
                   </p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
