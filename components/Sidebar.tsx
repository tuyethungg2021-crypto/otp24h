
import React from 'react';

interface SidebarProps {
  balance: number;
  role: 'admin' | 'user';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  siteName: string;
  logoInitial: string;
  onRefresh?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ balance, role, activeTab, setActiveTab, siteName, logoInitial, onRefresh }) => {
  const menuItems = [
    { id: 'dashboard', icon: '🏠', label: 'Trang chủ' },
    { id: 'market', icon: '🛍️', label: 'Cửa hàng' },
    { id: 'history', icon: '📜', label: 'Lịch sử thuê' },
    ...(role === 'admin' ? [
      { id: 'users', icon: '👥', label: 'Quản lý đại lý' },
      { id: 'topup-manage', icon: '✅', label: 'Duyệt đơn nạp' },
      { id: 'settings', icon: '⚙️', label: 'Cấu hình Web' }
    ] : []),
    { id: 'topup', icon: '💳', label: 'Nạp tiền' },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
            {logoInitial}
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{siteName}</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <span className={`text-lg ${activeTab === item.id ? '' : 'group-hover:scale-125 transition-transform'}`}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 relative group/card">
          <div className="flex items-center justify-between mb-1">
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {role === 'admin' ? 'Ví Tổng (API)' : 'Số dư của bạn'}
             </p>
             <button 
                onClick={onRefresh}
                className="text-indigo-400 hover:text-indigo-600 transition-colors p-1"
                title="Làm mới số dư"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="hover:rotate-180 transition-transform duration-500"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
             </button>
          </div>
          <div className="text-2xl font-black text-indigo-700">
            {balance.toLocaleString('vi-VN')} <span className="text-xs font-bold opacity-60">VNĐ</span>
          </div>
          <button 
            onClick={() => setActiveTab('topup')}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95"
          >
            {role === 'admin' ? 'NẠP VÍ TỔNG' : 'NẠP TIỀN'}
          </button>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl"></div>
          <h4 className="text-[10px] font-black text-emerald-400 uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            Hệ thống Cloud
          </h4>
          <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
            Mọi phiên làm việc được bảo vệ bởi lớp mã hóa đầu cuối AES-256.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
