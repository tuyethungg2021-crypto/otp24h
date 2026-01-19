
import React, { useState } from 'react';
import { User, ActiveOrder } from '../types';

interface UserManagementProps {
  users: User[];
  orders: ActiveOrder[];
  onAddUser: (user: Partial<User>) => void;
  onUpdateBalance: (userId: string, amount: number) => void;
  onUpdatePassword: (userId: string, newPass: string) => void;
  onDeleteUser: (userId: string) => void;
  onDeleteInactiveUsers: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, orders, onAddUser, onUpdateBalance, onUpdatePassword, onDeleteUser, onDeleteInactiveUsers }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState<{show: boolean, userId: string, username: string}>({show: false, userId: '', username: ''});
  const [showPassMap, setShowPassMap] = useState<{[key: string]: boolean}>({});
  const [balanceAmount, setBalanceAmount] = useState('10000');
  const [newUser, setNewUser] = useState({ username: '', password: '', balance: 0 });
  const [search, setSearch] = useState('');

  const handleAdd = () => {
    if (!newUser.username || !newUser.password) return;
    onAddUser({ ...newUser, role: 'user' });
    setNewUser({ username: '', password: '', balance: 0 });
    setShowAddModal(false);
  };

  const toggleShowPass = (userId: string) => {
    setShowPassMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const members = users.filter(u => u.role !== 'admin');
  const filteredMembers = members.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  const totalBalance = members.reduce((sum, u) => sum + (u.balance || 0), 0);
  
  const getOrderCount = (userId: string) => orders.filter(o => o.ownerId === userId).length;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng thành viên</p>
          <div className="text-3xl font-black text-slate-800">{members.length}</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng tiền khách đang giữ</p>
          <div className="text-3xl font-black text-emerald-600">{totalBalance.toLocaleString()}đ</div>
        </div>
        <div className="bg-rose-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-100 flex flex-col justify-center relative overflow-hidden group">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Bảo trì hệ thống</p>
          <button 
            onClick={onDeleteInactiveUsers}
            className="text-xs font-black flex items-center gap-2 bg-white/20 hover:bg-white/40 px-4 py-2 rounded-xl transition-all w-fit uppercase"
          >
            🧹 DỌN DẸP USER RÁC
          </button>
          <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 group-hover:scale-110 transition-transform">🗑️</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input 
            type="text" 
            placeholder="Tìm tên đại lý..." 
            className="w-full pl-6 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <span>➕</span> TẠO TÀI KHOẢN MỚI
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mật khẩu</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Đơn hàng</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Số dư</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((user) => {
                const orderCount = getOrderCount(user.id);
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-slate-800">{user.username}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {user.id.slice(-8)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-mono font-bold text-slate-600">
                          {showPassMap[user.id] ? user.password : '••••••••'}
                        </span>
                        <button 
                          onClick={() => toggleShowPass(user.id)}
                          className="text-xs text-indigo-500 hover:underline font-bold"
                        >
                          {showPassMap[user.id] ? 'Ẩn' : 'Xem'}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${orderCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        {orderCount} ĐƠN
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-emerald-600">{user.balance.toLocaleString()}đ</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setShowBalanceModal({show: true, userId: user.id, username: user.username})}
                          className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase"
                        >
                          Nạp/Trừ
                        </button>
                        <button 
                          onClick={() => {
                            const newPass = prompt(`Nhập mật khẩu mới cho ${user.username}:`, user.password);
                            if (newPass) onUpdatePassword(user.id, newPass);
                          }}
                          className="text-[10px] font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-500 hover:text-white transition-all uppercase"
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.username}"? Dữ liệu sẽ biến mất vĩnh viễn.`)) {
                              onDeleteUser(user.id);
                            }
                          }}
                          className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all uppercase"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nạp/Trừ Tiền */}
      {showBalanceModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-10 text-center">
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">💰</div>
               <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase">Điều chỉnh số dư</h3>
               <p className="text-slate-400 font-bold text-sm mb-8">Thành viên: <span className="text-indigo-600">{showBalanceModal.username}</span></p>
               
               <div className="space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Số tiền điều chỉnh</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl outline-none font-black text-xl text-center text-indigo-600"
                      value={balanceAmount}
                      onChange={e => setBalanceAmount(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-400 mt-2 italic text-center">Mẹo: Nhập số âm (VD: -50000) để trừ tiền trong tài khoản khách.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['10000', '50000', '100000'].map(val => (
                      <button key={val} onClick={() => setBalanceAmount(val)} className="py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 hover:bg-indigo-600 hover:text-white transition-all">+{parseInt(val).toLocaleString()}</button>
                    ))}
                  </div>
               </div>

               <div className="flex gap-4 mt-10">
                  <button onClick={() => setShowBalanceModal({show: false, userId: '', username: ''})} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl text-xs font-black uppercase">Đóng</button>
                  <div className="flex-1 flex flex-col gap-2">
                    <button onClick={() => {
                      onUpdateBalance(showBalanceModal.userId, Math.abs(parseInt(balanceAmount)));
                      setShowBalanceModal({show: false, userId: '', username: ''});
                    }} className="w-full bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100">CỘNG TIỀN</button>
                    <button onClick={() => {
                      onUpdateBalance(showBalanceModal.userId, -Math.abs(parseInt(balanceAmount)));
                      setShowBalanceModal({show: false, userId: '', username: ''});
                    }} className="w-full bg-rose-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-rose-100">TRỪ TIỀN</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm User Mới */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-10">
              <h3 className="text-2xl font-black text-slate-800 mb-8 text-center uppercase">Tạo tài khoản</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    placeholder="Nhập tên đăng nhập..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mật khẩu</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-2xl outline-none font-bold text-sm"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-10">
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl text-xs font-black uppercase">Hủy</button>
                <button onClick={handleAdd} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase shadow-xl shadow-indigo-100">Tạo mới</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
