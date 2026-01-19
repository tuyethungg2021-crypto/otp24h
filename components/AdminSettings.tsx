
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Đã sao chép: ${text}`);
  };

  const isApiConfigured = config.masterApiKey && config.masterApiKey.length > 10;
  const isBankConfigured = config.bankAccountNumber && config.bankAccountNumber !== '1903XXXXXXXXXX';

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
            {/* Checklist nhanh */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isApiConfigured ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <span className="text-xl">{isApiConfigured ? '✅' : '❌'}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mã Kho SIM (CodeSim)</p>
                    <p className={`text-xs font-bold ${isApiConfigured ? 'text-emerald-700' : 'text-rose-700'}`}>{isApiConfigured ? 'Đã kết nối kho' : 'Chưa nhập API Key'}</p>
                  </div>
               </div>
               <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isBankConfigured ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <span className="text-xl">{isBankConfigured ? '✅' : '❌'}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thông tin Ngân hàng</p>
                    <p className={`text-xs font-bold ${isBankConfigured ? 'text-emerald-700' : 'text-rose-700'}`}>{isBankConfigured ? 'Đã thiết lập' : 'Cần cập nhật STK'}</p>
                  </div>
               </div>
            </div>

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
                      <p className="text-sm font-bold opacity-90">Tải code lên <b>GitHub</b>.</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-8 h-8 min-w-[32px] bg-white/20 rounded-full flex items-center justify-center font-black">2</div>
                      <p className="text-sm font-bold opacity-90">Kết nối GitHub với <b>Vercel.com</b> để Deploy.</p>
                   </div>
                   <div className="flex flex-col gap-4 bg-white/10 p-6 rounded-2xl border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Thiết lập Vercel Environment Variables:</p>
                      <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
                         <code className="text-xs font-black">Key: API_KEY</code>
                         <button onClick={() => copyToClipboard('API_KEY')} className="text-[10px] bg-white/20 px-2 py-1 rounded-md hover:bg-white/40">Copy</button>
                      </div>
                      <p className="text-[11px] font-medium italic opacity-80">Lấy giá trị tại: <a href="https://aistudio.google.com/" target="_blank" className="underline font-black">Google AI Studio</a></p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                   <h4 className="text-xs font-black text-slate-800 uppercase mb-4 tracking-widest flex items-center gap-2">
                      <span className="text-xl">💰</span> Cách kiếm tiền
                   </h4>
                   <ul className="space-y-3 text-[11px] font-bold text-slate-500 leading-relaxed">
                      <li>• Bước 1: Bạn nạp tiền vào tài khoản <b>CodeSim.net</b>.</li>
                      <li>• Bước 2: Khách nạp tiền cho bạn qua STK (Bạn duyệt thủ công ở tab Duyệt đơn nạp).</li>
                      <li>• Bước 3: Khách thuê số, hệ thống dùng API CodeSim để lấy số.</li>
                      <li>• Bước 4: Bạn hưởng chênh lệch giá (Web đã tự cộng 50% vào giá gốc).</li>
                   </ul>
                </div>
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2rem]">
                   <h4 className="text-xs font-black text-slate-800 uppercase mb-4 tracking-widest flex items-center gap-2">
                      <span className="text-xl">🔒</span> Bảo mật
                   </h4>
                   <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-4">
                      Mật khẩu Admin mặc định là: <code className="bg-slate-200 px-2 py-0.5 rounded text-indigo-600">hung0385601880</code>.
                   </p>
                   <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                      Lưu ý: Web sử dụng LocalStorage cho dữ liệu người dùng. Để chạy quy mô lớn, hãy nâng cấp lên Supabase.
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
