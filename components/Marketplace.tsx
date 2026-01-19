
import React, { useState } from 'react';
import { MarketProduct, MarketPurchase, User } from '../types';

interface MarketplaceProps {
  user: User;
  products: MarketProduct[];
  purchases: MarketPurchase[];
  onAddProduct: (p: MarketProduct) => void;
  onUpdateProduct: (p: MarketProduct) => void;
  onDeleteProduct: (id: string) => void;
  onBuy: (product: MarketProduct) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, products, purchases, onAddProduct, onUpdateProduct, onDeleteProduct, onBuy }) => {
  const [tab, setTab] = useState<'buy' | 'history' | 'admin'>(user.role === 'admin' ? 'admin' : 'buy');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketProduct | null>(null);
  
  const [form, setForm] = useState<Partial<MarketProduct>>({
    name: '', category: 'Gmail', description: '', price: 0, items: []
  });
  const [bulkItems, setBulkItems] = useState('');

  const handleSaveProduct = () => {
    if (!form.name || !form.price) return;
    const items = bulkItems.split('\n').filter(i => i.trim() !== '');
    const productData: MarketProduct = {
      id: editingProduct?.id || 'prod-' + Date.now(),
      name: form.name || '',
      category: form.category || 'Khác',
      description: form.description || '',
      price: Number(form.price) || 0,
      items: items
    };

    if (editingProduct) onUpdateProduct(productData);
    else onAddProduct(productData);
    
    setShowAddModal(false);
    setEditingProduct(null);
    setForm({ name: '', category: 'Gmail', description: '', price: 0, items: [] });
    setBulkItems('');
  };

  const openEdit = (p: MarketProduct) => {
    setEditingProduct(p);
    setForm(p);
    setBulkItems(p.items.join('\n'));
    setShowAddModal(true);
    setTab('admin');
  };

  const myPurchases = purchases.filter(p => p.userId === user.id).sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('buy')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'buy' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>🛍️ Mua tài khoản</button>
        <button onClick={() => setTab('history')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>📜 Đồ đã mua</button>
        {user.role === 'admin' && (
          <button onClick={() => setTab('admin')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>🛠️ Quản lý kho</button>
        )}
      </div>

      {tab === 'buy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col group hover:border-indigo-500 transition-all">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase">{p.category}</span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase ${p.items.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {p.items.length > 0 ? `Còn ${p.items.length}` : 'Hết hàng'}
                  </span>
               </div>
               <h3 className="text-lg font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
               <p className="text-xs text-slate-400 font-medium mb-6 flex-1">{p.description}</p>
               <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                  <div className="text-xl font-black text-indigo-600">{p.price.toLocaleString()}đ</div>
                  <button 
                    disabled={p.items.length === 0}
                    onClick={() => onBuy(p)}
                    className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 active:scale-95 shadow-xl"
                  >
                    Mua ngay
                  </button>
               </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest">Chưa có sản phẩm nào được đăng bán</div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
           <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung tài khoản</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ngày mua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {myPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap">
                       <span className="text-xs font-black text-slate-800 uppercase">{p.productName}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl font-mono text-xs flex items-center justify-between group">
                          <span className="truncate max-w-md">{p.content}</span>
                          <button onClick={() => {navigator.clipboard.writeText(p.content); alert("Đã copy!")}} className="text-[10px] font-black text-white opacity-0 group-hover:opacity-100 uppercase ml-4">Copy</button>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <span className="text-xs font-black text-indigo-600">{p.price.toLocaleString()}đ</span>
                    </td>
                    <td className="px-8 py-6 text-right text-[10px] font-bold text-slate-400">
                       {new Date(p.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
                {myPurchases.length === 0 && (
                  <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase">Bạn chưa mua tài khoản nào</td></tr>
                )}
              </tbody>
           </table>
        </div>
      )}

      {tab === 'admin' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Quản lý kho tài khoản</h2>
            <button 
              onClick={() => {setEditingProduct(null); setForm({name:'', category:'Gmail', description:'', price:0}); setBulkItems(''); setShowAddModal(true)}}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl"
            >
              + Đăng sản phẩm mới
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên sản phẩm</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tồn kho</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá bán</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6 font-black text-slate-800 uppercase text-xs">{p.name}</td>
                      <td className="px-8 py-6 text-[10px] font-bold text-indigo-500 uppercase">{p.category}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${p.items.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {p.items.length} CÁI
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-indigo-600">{p.price.toLocaleString()}đ</td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <button onClick={() => openEdit(p)} className="text-[9px] font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg uppercase">Sửa/Nạp kho</button>
                            <button onClick={() => onDeleteProduct(p.id)} className="text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg uppercase">Xóa</button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Modal Đăng/Sửa Sản phẩm */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-10">
                 <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase text-center">{editingProduct ? 'Cập nhật sản phẩm' : 'Đăng sản phẩm mới'}</h2>
                 
                 <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                       <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl outline-none text-sm font-bold" placeholder="VD: Gmail New 2024"/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phân loại</label>
                       <select value={form.category} onChange={e=>setForm({...form, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl outline-none text-sm font-bold">
                          <option>Gmail</option><option>Facebook</option><option>TikTok</option><option>Telegram</option><option>Khác</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá bán (VNĐ)</label>
                       <input value={form.price} onChange={e=>setForm({...form, price: Number(e.target.value)})} type="number" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl outline-none text-sm font-bold"/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả ngắn</label>
                       <input value={form.description} onChange={e=>setForm({...form, description: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl outline-none text-sm font-bold" placeholder="VD: Bảo hành 24h, ip Việt..."/>
                    </div>
                 </div>

                 <div className="space-y-2 mb-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                       <span>Danh sách tài khoản kho (Mỗi dòng 1 cái)</span>
                       <span className="text-indigo-600">Đã nhập: {bulkItems.split('\n').filter(i=>i.trim()!=='').length} cái</span>
                    </label>
                    <textarea 
                      value={bulkItems} 
                      onChange={e=>setBulkItems(e.target.value)}
                      className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-6 rounded-[2rem] min-h-[200px] outline-none border border-slate-800"
                      placeholder="user|pass|recovery&#10;user2|pass2|recovery2..."
                    />
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase">Hủy bỏ</button>
                    <button onClick={handleSaveProduct} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl">Lưu sản phẩm</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
