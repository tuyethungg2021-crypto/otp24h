
import React, { useState } from 'react';
import { SiteConfig, SimService } from '../types';

interface AdminSettingsProps {
  config: SiteConfig;
  onSave: (newConfig: SiteConfig) => void;
  services: SimService[];
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ config, onSave, services }) => {
  const [formData, setFormData] = useState<SiteConfig>(config);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'prices' | 'payment'>('general');
  const [priceSearch, setPriceSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleCustomPriceChange = (serviceId: number, value: string) => {
    const price = value === '' ? undefined : parseInt(value);
    const newCustomPrices = { ...formData.customPrices };
    
    if (price === undefined) {
      delete newCustomPrices[serviceId];
    } else {
      newCustomPrices[serviceId] = price;
    }
    
    setFormData({ ...formData, customPrices: newCustomPrices });
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(priceSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sub Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-2">
          <button 
            onClick={() => setActiveSubTab('general')}
            className={`w-full text-left px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'general' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            ⚙️ Cài đặt chung
          </button>
          <button 
            onClick={() => setActiveSubTab('prices')}
            className={`w-full text-left px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'prices' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            💰 Giá dịch vụ
          </button>
          <button 
            onClick={() => setActiveSubTab('payment')}
            className={`w-full text-left px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubTab === 'payment' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            🏦 Thanh toán
          </button>
          
          <div className="pt-10">
            <button 
              onClick={handleSubmit}
              className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl text-[10px] font-black shadow-xl transition-all uppercase tracking-widest"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[800px]">
          {activeSubTab === 'general' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 pb-6">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cài đặt chung</h2>
                 <p className="text-sm text-slate-400 font-bold mt-1">Quản lý giao diện và thông báo hệ thống</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Website</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={formData.siteName}
                    onChange={e => setFormData({...formData, siteName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telegram Admin</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={formData.telegramLink}
                    onChange={e => setFormData({...formData, telegramLink: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master API Key (CodeSim)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-900 text-indigo-400 px-6 py-4 rounded-2xl outline-none font-mono text-xs border border-slate-800"
                    value={formData.masterApiKey}
                    onChange={e => setFormData({...formData, masterApiKey: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thông báo toàn trang</label>
                  <textarea 
                    className="w-full bg-amber-50/50 border border-amber-100 px-6 py-4 rounded-2xl outline-none text-sm font-bold min-h-[120px]"
                    value={formData.announcement}
                    onChange={e => setFormData({...formData, announcement: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'prices' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Giá dịch vụ</h2>
                    <p className="text-sm text-slate-400 font-bold mt-1">Điều chỉnh lợi nhuận cho các số thuê</p>
                 </div>
                 <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4">
                    <div>
                       <p className="text-[10px] font-black text-indigo-400 uppercase">Tỉ lệ lợi nhuận chung</p>
                       <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.1"
                            className="w-16 bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm font-black text-indigo-600 outline-none"
                            value={formData.globalMarkup}
                            onChange={e => setFormData({...formData, globalMarkup: parseFloat(e.target.value) || 1})}
                          />
                          <span className="text-[10px] font-bold text-slate-400">x Giá gốc</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Tìm ứng dụng cần sửa giá..." 
                      className="w-full pl-6 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm"
                      value={priceSearch}
                      onChange={e => setPriceSearch(e.target.value)}
                    />
                 </div>

                 <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dịch vụ</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Giá gốc</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá bán hiện tại</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá bán tùy chỉnh</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {filteredServices.slice(0, 50).map(s => (
                             <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-800 uppercase">{s.name}</span>
                                      <span className="text-[9px] text-slate-400 font-bold">ID: {s.id}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                   <span className="text-xs font-bold text-slate-400">{(s.originalPrice || 0).toLocaleString()}đ</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <span className="text-xs font-black text-indigo-600">{s.price.toLocaleString()}đ</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <div className="flex justify-end items-center gap-2">
                                      <input 
                                        type="number" 
                                        placeholder="Tự động"
                                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-600 outline-none focus:border-emerald-500 transition-all text-right"
                                        value={formData.customPrices[s.id] || ''}
                                        onChange={e => handleCustomPriceChange(s.id, e.target.value)}
                                      />
                                      <span className="text-[10px] font-bold text-slate-300">đ</span>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    {filteredServices.length > 50 && (
                      <div className="p-4 bg-slate-50 text-center">
                        <p className="text-[10px] font-bold text-slate-400">Hiển thị 50 kết quả đầu tiên. Vui lòng sử dụng ô tìm kiếm để thấy dịch vụ khác.</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {activeSubTab === 'payment' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-b border-slate-100 pb-6">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cấu hình thanh toán</h2>
                 <p className="text-sm text-slate-400 font-bold mt-1">Thông tin ngân hàng hiển thị ở trang nạp tiền</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngân hàng</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={formData.bankName}
                    onChange={e => setFormData({...formData, bankName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tài khoản</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={formData.bankAccountNumber}
                    onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ tài khoản (Viết Hoa)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={formData.bankBeneficiary}
                    onChange={e => setFormData({...formData, bankBeneficiary: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Ảnh QR (VietQR)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-6 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={formData.bankQrUrl}
                    onChange={e => setFormData({...formData, bankQrUrl: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
