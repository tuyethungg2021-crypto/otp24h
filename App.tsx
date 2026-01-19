import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar.tsx';
import ServiceGrid from './components/ServiceGrid.tsx';
import OtpDashboard from './components/OtpDashboard.tsx';
import AiSupport from './components/AiSupport.tsx';
import Login from './components/Login.tsx';
import UserManagement from './components/UserManagement.tsx';
import OrderHistory from './components/OrderHistory.tsx';
import TopupView from './components/TopupView.tsx';
import AdminSettings from './components/AdminSettings.tsx';
import TopupManagement from './components/TopupManagement.tsx';
import Marketplace from './components/Marketplace.tsx';
import Toast from './components/Toast.tsx';
import { SimService, ActiveOrder, User, SiteConfig, TopupRequest, MarketProduct, MarketPurchase, ToastType } from './types.ts';
import { otpApi } from './services/otpApi.ts';

const DEFAULT_CONFIG: SiteConfig = {
  siteName: 'OTPSim',
  logoInitial: 'S',
  telegramLink: 'https://t.me/admin',
  announcement: 'Chào mừng bạn đến với OTPSim! Hệ thống tự động 24/7, tỷ lệ mã về cực cao cho Telegram và Facebook.',
  masterApiKey: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJudWJpYTMiLCJqdGkiOiI4NDM1NiIsImlhdCI6MTc2NzAwMjM2NCwiZXhwIjoxODI5MjEwMzY0fQ.l_1ZGnQG3IDr5LnVEEepL3ouYht8Ea9vU5bZDecIZm0S1AIxAeld8RROe-3cdWNn7nCEmgb65aySGKsxjyoK3g',
  globalMarkup: 1.5,
  customPrices: {},
  bankName: 'TECHCOMBANK',
  bankAccountNumber: '1903XXXXXXXXXX',
  bankBeneficiary: 'NGUYEN VAN A',
  bankQrUrl: 'https://img.vietqr.io/image/TCB-19036733222013-compact2.jpg',
  momoNumber: '',
  momoBeneficiary: '',
  momoQrUrl: ''
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [balance, setBalance] = useState<number>(0);
  const [services, setServices] = useState<SimService[]>([]);
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [purchases, setPurchases] = useState<MarketPurchase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);
  
  const pollingRefs = useRef<{ [key: string]: boolean }>({});

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem('otpsim_config');
    if (savedConfig) setSiteConfig(JSON.parse(savedConfig));

    const savedUsers = localStorage.getItem('otpsim_users');
    let currentUsers: User[] = [];
    if (savedUsers) {
      currentUsers = JSON.parse(savedUsers);
      currentUsers = currentUsers.map(u => u.username === 'admin' ? { ...u, password: 'hung0385601880' } : u);
    } else {
      const defaultAdmin: User = { id: 'admin-1', username: 'admin', password: 'hung0385601880', role: 'admin', balance: 0 };
      currentUsers = [defaultAdmin];
    }
    setAllUsers(currentUsers);

    const savedSessionId = localStorage.getItem('otpsim_session_userid');
    if (savedSessionId) {
      const found = currentUsers.find(u => u.id === savedSessionId);
      if (found) {
        setUser(found);
      }
    }

    const savedOrders = localStorage.getItem('otpsim_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));

    const savedTopups = localStorage.getItem('otpsim_topups');
    if (savedTopups) setTopupRequests(JSON.parse(savedTopups));

    const savedProducts = localStorage.getItem('otpsim_products');
    if (savedProducts) setProducts(JSON.parse(savedProducts));

    const savedPurchases = localStorage.getItem('otpsim_purchases');
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
  }, []);

  useEffect(() => {
    localStorage.setItem('otpsim_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('otpsim_topups', JSON.stringify(topupRequests));
  }, [topupRequests]);

  useEffect(() => {
    localStorage.setItem('otpsim_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('otpsim_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('otpsim_purchases', JSON.stringify(purchases));
  }, [purchases]);

  const saveConfig = (newConfig: SiteConfig) => {
    setSiteConfig(newConfig);
    localStorage.setItem('otpsim_config', JSON.stringify(newConfig));
    showToast("Cấu hình hệ thống đã được lưu!");
    if (user) initData();
  };

  const handleRegister = (username: string, pass: string) => {
    const exists = allUsers.some(u => u.username === username);
    if (exists) {
      showToast("Tên tài khoản này đã tồn tại!", 'error');
      return;
    }
    const newUser: User = {
      id: 'u-' + Date.now(),
      username,
      password: pass,
      role: 'user',
      balance: 0
    };
    setAllUsers(prev => [...prev, newUser]);
    showToast("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
  };

  const handleLogin = (username: string, pass: string, rememberMe: boolean) => {
    const found = allUsers.find(u => u.username === username && u.password === pass);
    if (found) {
      setUser(found);
      if (rememberMe) {
        localStorage.setItem('otpsim_session_userid', found.id);
      }
      showToast(`Chào mừng trở lại, ${found.username}!`);
    } else {
      showToast("Sai tài khoản hoặc mật khẩu!", 'error');
    }
  };

  const initData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'admin') {
        try {
          const accRes = await otpApi.getAccountInfo(siteConfig.masterApiKey);
          const data = accRes.data ?? accRes;
          if (data && data.balance !== undefined) setBalance(data.balance);
        } catch (e) { 
          console.warn("Không thể lấy ví tổng: ", e);
        }
      } else {
        const freshUser = allUsers.find(u => u.id === user.id);
        if (freshUser) setBalance(freshUser.balance);
      }
      
      const servRes = await otpApi.getServices(siteConfig.masterApiKey);
      let servicesData: SimService[] = [];
      if (Array.isArray(servRes)) servicesData = servRes;
      else if (servRes && Array.isArray(servRes.data)) servicesData = servRes.data;

      if (servicesData.length > 0) {
        const updatedServices = servicesData.map((s: SimService) => {
          const originalPrice = s.price || 0;
          const customPrice = siteConfig.customPrices[s.id];
          const finalPrice = customPrice !== undefined 
            ? customPrice 
            : Math.round(originalPrice * siteConfig.globalMarkup);
            
          return {
            ...s,
            originalPrice,
            price: finalPrice
          };
        });
        setServices(updatedServices);
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) initData();
  }, [user]);

  const handleUpdatePassword = (userId: string, newPass: string) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
    if (user?.id === userId) setUser({ ...user, password: newPass });
    showToast("Đã đổi mật khẩu thành công!");
  };

  const handleUpdateBalance = (userId: string, amount: number) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: (u.balance || 0) + amount } : u));
    if (user?.id === userId) {
      setBalance(prev => prev + amount);
      setUser(prevUser => prevUser ? { ...prevUser, balance: (prevUser.balance || 0) + amount } : null);
    }
    if (amount > 0) showToast(`Đã cộng ${amount.toLocaleString()}đ vào ví.`);
    else if (amount < 0) showToast(`Đã trừ ${Math.abs(amount).toLocaleString()}đ khỏi ví.`, 'info');
  };

  const handleBuyProduct = (product: MarketProduct) => {
    if (!user) return;
    if (balance < product.price) {
      showToast("Số dư không đủ! Vui lòng nạp thêm tiền.", 'error');
      setActiveTab('topup');
      return;
    }
    if (product.items.length === 0) {
      showToast("Sản phẩm này đã hết hàng!", 'error');
      return;
    }

    const boughtItem = product.items[0];
    const remainingItems = product.items.slice(1);

    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, items: remainingItems } : p));
    handleUpdateBalance(user.id, -product.price);

    const newPurchase: MarketPurchase = {
      id: 'pur-' + Date.now(),
      userId: user.id,
      productId: product.id,
      productName: product.name,
      content: boughtItem,
      price: product.price,
      createdAt: Date.now()
    };
    setPurchases(prev => [newPurchase, ...prev]);
    showToast(`Mua thành công ${product.name}! Kiểm tra tab "Đồ đã mua".`);
  };

  const handleSubmitTopup = (amount: number, method: 'BANK' | 'MOMO', content: string) => {
    if (!user) return;
    const newRequest: TopupRequest = {
      id: 'tr-' + Date.now(),
      userId: user.id,
      username: user.username,
      amount,
      method,
      content,
      status: 'PENDING',
      createdAt: Date.now()
    };
    setTopupRequests(prev => [newRequest, ...prev]);
  };

  const handleApproveTopup = (request: TopupRequest) => {
    setTopupRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'SUCCESS' } : r));
    handleUpdateBalance(request.userId, request.amount);
    showToast(`Đã duyệt đơn nạp cho ${request.username}`);
  };

  const handleCancelTopup = (request: TopupRequest) => {
    setTopupRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'CANCELLED' } : r));
    showToast(`Đã hủy đơn nạp của ${request.username}`, 'info');
  };

  const handleDeleteUser = (userId: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    showToast("Đã xóa tài khoản người dùng.", 'info');
  };

  const handleDeleteInactiveUsers = () => {
    const activeUserIds = new Set(orders.map(o => o.ownerId));
    const inactiveUsers = allUsers.filter(u => u.role !== 'admin' && !activeUserIds.has(u.id));
    
    if (inactiveUsers.length === 0) {
      showToast("Không tìm thấy thành viên nào chưa từng hoạt động.", 'info');
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa ${inactiveUsers.length} thành viên chưa từng có đơn hàng thuê SIM nào?`)) {
      setAllUsers(prev => prev.filter(u => u.role === 'admin' || activeUserIds.has(u.id)));
      showToast(`Đã dọn dẹp ${inactiveUsers.length} tài khoản rác.`);
    }
  };

  const handleAddUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: 'u-' + Date.now(),
      username: userData.username || '',
      password: userData.password || '',
      role: 'user',
      balance: userData.balance || 0
    };
    setAllUsers(prev => [...prev, newUser]);
    showToast("Đã thêm người dùng mới.");
  };

  const handleRentSim = async (service: SimService) => {
    if (!user) return;
    if (balance < service.price) {
      showToast("Số dư không đủ! Hãy nạp thêm tiền.", 'error');
      setActiveTab('topup');
      return;
    }

    try {
      const res = await otpApi.rentSim(service.id, siteConfig.masterApiKey);
      const data = res.data ?? res;
      if (data && data.otpId) {
        const newOrder: ActiveOrder = {
          id: data.otpId.toString(),
          simId: data.simId,
          phoneNumber: data.phone,
          serviceName: data.serviceName,
          otp: null,
          status: 'WAITING',
          expiresAt: Date.now() + 15 * 60 * 1000,
          createdAt: Date.now(),
          ownerId: user.id
        };
        handleUpdateBalance(user.id, -service.price);
        setOrders(prev => [newOrder, ...prev]);
        startPolling(data.otpId);
        showToast(`Đã thuê số ${data.phone} thành công!`);
      } else {
        showToast(data?.message || "Hết số khả dụng cho dịch vụ này.", 'error');
      }
    } catch (err) { 
      showToast("Lỗi hệ thống khi thuê SIM.", 'error');
    }
  };

  const startPolling = useCallback((otpId: number) => {
    if (pollingRefs.current[otpId]) return;
    pollingRefs.current[otpId] = true;
    const poll = async () => {
      if (!pollingRefs.current[otpId]) return;
      try {
        const res = await otpApi.checkOtp(otpId, siteConfig.masterApiKey);
        const data = res.data ?? res;
        if (data && data.code) {
          setOrders(prev => prev.map(o => o.id === otpId.toString() ? { ...o, otp: data.code, status: 'RECEIVED' } : o));
          delete pollingRefs.current[otpId];
          showToast(`Nhận được mã OTP: ${data.code}`, 'success');
        } else { setTimeout(poll, 5000); }
      } catch (err) { setTimeout(poll, 5000); }
    };
    poll();
  }, [siteConfig.masterApiKey]);

  const handleCancelOrder = async (order: ActiveOrder) => {
    try {
      const res = await otpApi.cancelSim(order.simId, siteConfig.masterApiKey);
      if (res.status === 200 || res.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'CANCELLED' } : o));
        delete pollingRefs.current[order.id];
        const s = services.find(sv => sv.name === order.serviceName);
        if (s) handleUpdateBalance(order.ownerId, s.price);
        showToast("Đã hủy số và hoàn tiền thành công.", 'info');
      }
    } catch (err) {
      showToast("Không thể hủy số này.", 'error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
    localStorage.removeItem('otpsim_session_userid');
    showToast("Đã đăng xuất an toàn!", 'info');
  };

  const filteredServices = services
    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aIsNew = a.name.toLowerCase().includes('new');
      const bIsNew = b.name.toLowerCase().includes('new');
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      return 0;
    });

  const myOrders = user?.role === 'admin' ? orders : orders.filter(o => o.ownerId === user?.id);
  const activeOrders = myOrders.filter(o => o.status === 'WAITING');
  const historyOrders = myOrders.filter(o => o.status !== 'WAITING');
  
  const userTopups = topupRequests.filter(r => r.userId === user?.id);
  const pendingCount = topupRequests.filter(r => r.status === 'PENDING').length;

  const renderUserDashboard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight ml-2">Dịch vụ SIM OTP</h2>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Tìm ứng dụng..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>
          <ServiceGrid services={filteredServices} onRent={handleRentSim} />
        </section>

        <section className="space-y-6">
           <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight ml-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
              Đơn hàng đang chờ
           </h2>
           <OtpDashboard orders={activeOrders} onCancel={handleCancelOrder} />
        </section>
      </div>

      <div className="space-y-8">
        <AiSupport />
        
        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-200">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
           <h4 className="text-sm font-black uppercase tracking-widest mb-4">Cần hỗ trợ gấp?</h4>
           <p className="text-xs text-indigo-200 font-bold leading-relaxed mb-8">Nếu gặp vấn đề về nạp tiền hoặc lỗi mã OTP, hãy nhắn tin ngay cho đội ngũ kỹ thuật của chúng tôi.</p>
           <a 
            href={siteConfig.telegramLink} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg shadow-black/20"
           >
             Chat Telegram ✈️
           </a>
        </div>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-10">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ví tổng hiện tại</p>
             <div className="text-2xl font-black text-emerald-600">{balance.toLocaleString()}đ</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng đơn hàng</p>
             <div className="text-2xl font-black text-indigo-600">{orders.length}</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nạp chờ duyệt</p>
             <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thành viên</p>
             <div className="text-2xl font-black text-slate-800">{allUsers.length - 1}</div>
          </div>
       </div>
       {renderUserDashboard()}
    </div>
  );

  if (!user) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} siteName={siteConfig.siteName} logoInitial={siteConfig.logoInitial} />;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] relative">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <Sidebar 
        siteName={siteConfig.siteName}
        logoInitial={siteConfig.logoInitial}
        balance={balance} 
        role={user.role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onRefresh={initData}
      />

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl mx-auto w-full relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-3">
             {activeTab !== 'dashboard' && (
               <button 
                 onClick={() => setActiveTab('dashboard')}
                 className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase bg-indigo-50 w-fit px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
               >
                 <span>←</span> QUAY LẠI TRANG CHỦ
               </button>
             )}
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">
                 {user.role === 'admin' ? 'Quyền Admin' : 'Thành viên'}
               </span>
               <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none capitalize">
                {activeTab === 'users' ? 'Quản lý đại lý' : 
                 activeTab === 'settings' ? 'Giao diện hệ thống' : 
                 activeTab === 'dashboard' ? 'Bảng điều khiển' : 
                 activeTab === 'topup' ? 'Nạp tiền ví' : 
                 activeTab === 'topup-manage' ? 'Duyệt đơn nạp' :
                 activeTab === 'market' ? 'Cửa hàng tài khoản' :
                 'Lịch sử thuê'}
              </h1>
             </div>
            <p className="text-slate-400 font-bold hidden md:flex items-center gap-2">
              Xin chào, <span className="text-slate-800 font-black">{user.username}</span>
              <span className="ml-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black border border-emerald-100 shadow-sm flex items-center gap-1.5">
                <span className="text-[10px] opacity-70">SỐ DƯ:</span> {balance.toLocaleString('vi-VN')}đ
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="px-6 py-3.5 bg-white text-rose-500 rounded-[1.25rem] border border-slate-200 shadow-sm font-black text-xs uppercase hover:bg-rose-50 transition-colors tracking-widest whitespace-nowrap">Thoát</button>
          </div>
        </header>

        {activeTab === 'dashboard' && siteConfig.announcement && (
          <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
             <div className="bg-amber-50 border border-amber-100 p-5 rounded-[2rem] flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-amber-400 text-white rounded-full flex items-center justify-center text-xl animate-pulse">📢</div>
                <div className="flex-1">
                   <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-0.5">Thông báo hệ thống</p>
                   <p className="text-sm font-bold text-amber-900 leading-tight">{siteConfig.announcement}</p>
                </div>
             </div>
          </div>
        )}

        <div className="animate-in fade-in duration-500">
          {activeTab === 'users' && user.role === 'admin' ? (
            <UserManagement 
              users={allUsers} 
              orders={orders}
              onAddUser={handleAddUser} 
              onUpdateBalance={handleUpdateBalance} 
              onUpdatePassword={handleUpdatePassword}
              onDeleteUser={handleDeleteUser} 
              onDeleteInactiveUsers={handleDeleteInactiveUsers}
            />
          ) : activeTab === 'topup-manage' && user.role === 'admin' ? (
            <TopupManagement 
              requests={topupRequests}
              onApprove={handleApproveTopup}
              onCancel={handleCancelTopup}
            />
          ) : activeTab === 'settings' && user.role === 'admin' ? (
            <AdminSettings 
              config={siteConfig} 
              onSave={saveConfig} 
              services={services}
            />
          ) : activeTab === 'history' ? (
            <OrderHistory orders={historyOrders} role={user.role} />
          ) : activeTab === 'market' ? (
            <Marketplace 
              user={user}
              products={products}
              purchases={purchases}
              onAddProduct={(p) => setProducts(prev => [...prev, p])}
              onUpdateProduct={(p) => setProducts(prev => prev.map(old => old.id === p.id ? p : old))}
              onDeleteProduct={(id) => setProducts(prev => prev.filter(p => p.id !== id))}
              onBuy={handleBuyProduct}
            />
          ) : activeTab === 'topup' ? (
            <TopupView 
              config={siteConfig} 
              userRequests={userTopups}
              onSubmitRequest={handleSubmitTopup}
              username={user.username}
            />
          ) : (
            user.role === 'admin' ? renderAdminDashboard() : renderUserDashboard()
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex lg:hidden items-center justify-around p-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className="text-xl">🏠</span>
              <span className="text-[9px] font-black uppercase">Home</span>
           </button>
           <button onClick={() => setActiveTab('market')} className={`flex flex-col items-center gap-1 ${activeTab === 'market' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className="text-xl">🛍️</span>
              <span className="text-[9px] font-black uppercase">Shop</span>
           </button>
           <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className="text-xl">📜</span>
              <span className="text-[9px] font-black uppercase">Lịch sử</span>
           </button>
           <button onClick={() => setActiveTab('topup')} className={`flex flex-col items-center gap-1 ${activeTab === 'topup' ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className="text-xl">💳</span>
              <span className="text-[9px] font-black uppercase">Nạp</span>
           </button>
        </div>
      </main>
    </div>
  );
};

export default App;