import React, { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  username: string;
  role: "admin" | "user";
  balance: number;
  totalTopup?: number;
  totalUsed?: number;
};

type Service = {
  id: string;
  sourceKey?: string;
  provider?: string;
  providerId?: number;
  originalName: string;
  name: string;
  providerCost: number;
  price: number;
  hidden: boolean;
  note?: string;
};

type Order = {
  id: string;
  userId?: string;
  appName: string;
  number: string;
  price: number;
  status: string;
  code?: string;
  sms?: string;
  createdAt: string;
  provider?: string;
  carrier?: string;
  refunded?: boolean;
  refundReason?: string;
};

type DmxProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  note?: string;
  stock?: number;
  sold?: number;
  hidden?: boolean;
  codesPreview?: string[];
  createdAt?: string;
};

type DmxOrder = {
  id: string;
  userId?: string;
  username?: string;
  productId?: string;
  productName: string;
  price: number;
  image?: string;
  code: string;
  note?: string;
  createdAt: string;
};

type Settings = {
  siteName: string;
  logoText: string;
  logoImage: string;
  background: string;
  announcement: string;
  bannerImage: string;
  bankName: string;
  bankAccountNumber: string;
  bankBeneficiary: string;
  bankQrUrl: string;
  topupNote: string;
};

type Topup = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  note?: string;
  status: string;
  createdAt: string;
};

type ProviderSettings = {
  chayEnabled: boolean;
  chayApiKeyMasked: string;
  hasChayApiKey: boolean;
  codesimEnabled: boolean;
  codesimApiKeyMasked: string;
  hasCodesimApiKey: boolean;
};

const defaultSettings: Settings = {
  siteName: "OTP 24H",
  logoText: "OTP",
  logoImage: "",
  background: "bg-slate-950",
  announcement: "",
  bannerImage: "",
  bankName: "TECHCOMBANK",
  bankAccountNumber: "MS00T07014613285196",
  bankBeneficiary: "NGUYEN VAN HUNG",
  bankQrUrl: "",
  topupNote: "Nội dung chuyển khoản: username của bạn. Sau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt."
};

const carriers = [
  { label: "Tất cả nhà mạng", value: "" },
  { label: "Viettel", value: "Viettel" },
  { label: "Mobi", value: "Mobi" },
  { label: "Vina", value: "Vina" },
  { label: "VNMB", value: "VNMB" },
  { label: "ITelecom", value: "ITelecom" }
];

const money = (n: number) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [dmxProducts, setDmxProducts] = useState<DmxProduct[]>([]);
  const [dmxOrders, setDmxOrders] = useState<DmxOrder[]>([]);
  const [newDmxName, setNewDmxName] = useState("");
  const [newDmxPrice, setNewDmxPrice] = useState("");
  const [newDmxImage, setNewDmxImage] = useState("");
  const [newDmxNote, setNewDmxNote] = useState("");

  const [tab, setTab] = useState("services");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [adminServiceSearch, setAdminServiceSearch] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [busy, setBusy] = useState(false);

  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [providerCounts, setProviderCounts] = useState<any>({});

  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    chayEnabled: true,
    chayApiKeyMasked: "",
    hasChayApiKey: false,
    codesimEnabled: true,
    codesimApiKeyMasked: "",
    hasCodesimApiKey: false
  });

  const [chayApiKey, setChayApiKey] = useState("");
  const [codesimApiKey, setCodesimApiKey] = useState("");
  const [providerTest, setProviderTest] = useState<any>(null);

  const headers = user
    ? { "Content-Type": "application/json", "x-user-id": user.id }
    : { "Content-Type": "application/json" };

  const isAdmin = user?.role === "admin";

  const show = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const imageToBase64 = (file: File, callback: (value: string) => void) => {
    if (!file.type.startsWith("image/")) {
      show("Chỉ được tải file ảnh");
      return;
    }

    if (file.size > 1024 * 1024 * 2) {
      show("Ảnh tối đa 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result));
    reader.readAsDataURL(file);
  };

  const loadSettings = async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings({ ...defaultSettings, ...data });
    }
  };

  const loadServices = async () => {
    const res = await fetch("/api/services");
    if (res.ok) setServices(await res.json());
    else show((await res.json().catch(() => ({}))).message || "Không tải được dịch vụ");
  };

  const loadUsers = async () => {
    if (!user || !isAdmin) return;
    const res = await fetch("/api/user-stats", { headers });
    if (res.ok) setUsers(await res.json());
  };

  const loadAdminServices = async () => {
    if (!user || !isAdmin) return;

    const res = await fetch("/api/admin/services", { headers });

    if (res.ok) {
      const data = await res.json();
      setAdminServices(data.sources || []);
      setProviderCounts(data.counts || {});
    } else {
      show((await res.json().catch(() => ({}))).message || "Không tải được dịch vụ admin");
    }
  };

  const loadProviderSettings = async () => {
    if (!user || !isAdmin) return;
    const res = await fetch("/api/admin/provider-settings", { headers });
    if (res.ok) setProviderSettings(await res.json());
  };

  const loadOrders = async () => {
    if (!user) return;
    const res = await fetch(`/api/orders?userId=${user.id}`);
    if (res.ok) setOrders(await res.json());
  };

  const loadTopups = async () => {
    if (!user) return;
    const res = await fetch(`/api/topups?userId=${user.id}`);
    if (res.ok) setTopups(await res.json());
  };

  const loadDmxProducts = async () => {
    const url = isAdmin ? "/api/admin/dmx/products" : "/api/dmx/products";
    const res = await fetch(url, isAdmin ? { headers } : undefined);
    if (res.ok) setDmxProducts(await res.json());
  };

  const loadDmxOrders = async () => {
    if (!user) return;
    const res = await fetch(`/api/dmx/orders?userId=${user.id}`);
    if (res.ok) setDmxOrders(await res.json());
  };

  useEffect(() => {
    loadSettings();
    loadServices();
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadTopups();
      loadUsers();
      loadAdminServices();
      loadProviderSettings();
      loadDmxProducts();
      loadDmxOrders();
    }
  }, [user, tab]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(async () => {
      const latest = await fetch(`/api/orders?userId=${user.id}`);
      if (!latest.ok) return;

      const list: Order[] = await latest.json();

      for (const order of list.filter(o => o.status === "waiting")) {
        await fetch(`/api/orders/${order.id}/check-code`, { method: "POST" });
      }

      await loadOrders();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [user]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) return show(data.message || "Đăng nhập thất bại");

      setUser(data);
      show("Đăng nhập thành công");
    } finally {
      setBusy(false);
    }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) return show(data.message || "Đăng ký thất bại");

      show("Đăng ký thành công, hãy đăng nhập");
      setIsLogin(true);
    } finally {
      setBusy(false);
    }
  };

  const rentNumber = async (service: Service) => {
    if (!user) return;

    const carrierText = service.provider === "codesim" ? "Tự động" : selectedCarrier || "Tất cả nhà mạng";

    if (!confirm(`Thuê ${service.name} giá ${money(service.price)}?\nNhà mạng: ${carrierText}`)) return;

    setBusy(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: user.id,
          appId: service.sourceKey || service.id,
          carrier: selectedCarrier
        })
      });

      const data = await res.json();
      if (!res.ok) return show(data.message || "Không lấy được số");

      setUser(data.user);
      await loadOrders();
      show("Đã lấy số thành công");
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (order: Order) => {
    const res = await fetch(`/api/orders/${order.id}/check-code`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) return show(data.message || "Không check được code");

    if (data.user) setUser(data.user);

    await loadOrders();

    if (data.order?.status === "expired" && data.order?.refunded) show("Số đã hết hạn, hệ thống đã hoàn tiền");
    else if (data.order?.code) show("Đã có OTP");
    else show(data.api?.Msg || data.api?.message || "Đang chờ OTP");
  };

  const reuseOrder = async (order: Order) => {
    if (!confirm(`Thuê lại số ${order.number}?`)) return;

    const res = await fetch(`/api/orders/${order.id}/reuse`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) return show(data.message || "Không thuê lại được");

    if (data.user) setUser(data.user);

    await loadOrders();
    show("Đã thuê lại số");
  };

  const adjustBalance = async (target: User) => {
    const amount = prompt(`Nhập số tiền cộng/trừ cho ${target.username}`);
    if (!amount) return;

    const res = await fetch(`/api/users/${target.id}/adjust-balance`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: Number(amount) })
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi sửa tiền");

    await loadUsers();
    show("Đã cập nhật số dư");
  };

  const changeUserPass = async (target: User) => {
    const newPassword = prompt(`Mật khẩu mới cho ${target.username}`);
    if (!newPassword) return;

    const res = await fetch(`/api/users/${target.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password: newPassword })
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi đổi mật khẩu");

    show("Đã đổi mật khẩu");
  };

  const deleteUser = async (target: User) => {
    if (!confirm(`Xóa user ${target.username}?`)) return;

    const res = await fetch(`/api/users/${target.id}`, {
      method: "DELETE",
      headers
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi xóa user");

    await loadUsers();
    show("Đã xóa user");
  };

  const saveService = async (service: Service, patch: any) => {
    const key = service.sourceKey || service.id;

    const res = await fetch(`/api/admin/services/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch)
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi lưu dịch vụ");

    await loadAdminServices();
    await loadServices();
    show("Đã lưu dịch vụ");
  };

  const bulkSetHidden = async (hidden: boolean, onlyFiltered = false) => {
    const list = onlyFiltered ? filteredAdminServices : adminServices;

    if (!list.length) return show("Không có dịch vụ nào để cập nhật");
    if (!confirm(`${hidden ? "ẨN" : "HIỆN"} ${list.length} dịch vụ?`)) return;

    setBusy(true);

    try {
      await Promise.all(
        list.map(s =>
          fetch(`/api/admin/services/${encodeURIComponent(s.sourceKey || s.id)}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ hidden })
          })
        )
      );

      await loadAdminServices();
      await loadServices();
      show("Đã cập nhật dịch vụ");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify(settings)
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi lưu cài đặt");

    show("Đã lưu cài đặt");
  };

  const saveProviderSettings = async () => {
    const res = await fetch("/api/admin/provider-settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        chayEnabled: providerSettings.chayEnabled,
        chayApiKey,
        codesimEnabled: providerSettings.codesimEnabled,
        codesimApiKey
      })
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi lưu API key");

    setChayApiKey("");
    setCodesimApiKey("");
    setProviderSettings(data);

    await loadAdminServices();
    await loadServices();

    show("Đã lưu cấu hình API");
  };

  const testProvider = async () => {
    const res = await fetch("/api/admin/provider-test", { headers });
    const data = await res.json();

    setProviderTest(data);
    show(data.ok ? "Cả 2 API hoạt động" : "Có API đang lỗi, xem kết quả test bên dưới");
  };

  const changeOwnPassword = async () => {
    if (!user) return;

    const oldPassword = prompt("Nhập mật khẩu cũ");
    const newPassword = prompt("Nhập mật khẩu mới");

    if (!oldPassword || !newPassword) return;

    const res = await fetch("/api/change-password", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: user.id, oldPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi đổi mật khẩu");

    show("Đã đổi mật khẩu");
  };

  const createTopup = async () => {
    if (!user) return;

    const amount = Number(topupAmount || 0);
    if (!amount || Number.isNaN(amount) || amount <= 0) return show("Nhập số tiền nạp hợp lệ");

    const res = await fetch("/api/topups", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: user.id, amount, note: topupNote })
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi tạo yêu cầu nạp");

    setTopupAmount("");
    setTopupNote("");
    await loadTopups();
    show("Đã gửi yêu cầu nạp tiền");
  };

  const approveTopup = async (topup: Topup) => {
    const res = await fetch(`/api/topups/${topup.id}/approve`, {
      method: "POST",
      headers
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi duyệt nạp");

    await loadTopups();
    await loadUsers();
    show("Đã cộng tiền cho user");
  };

  const rejectTopup = async (topup: Topup) => {
    const reason = prompt("Lý do từ chối", "");

    const res = await fetch(`/api/topups/${topup.id}/reject`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason })
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi từ chối");

    await loadTopups();
    show("Đã từ chối yêu cầu");
  };

  const buyDmx = async (product: DmxProduct) => {
    if (!user) return;

    if (!confirm(`Mua ${product.name} giá ${money(product.price)}?`)) return;

    const res = await fetch("/api/dmx/buy", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: user.id,
        productId: product.id
      })
    });

    const data = await res.json();

    if (!res.ok) return show(data.message || "Lỗi mua voucher");

    setUser(data.user);
    await loadDmxProducts();
    await loadDmxOrders();

    show("Mua voucher thành công");
  };

  const createDmxProduct = async () => {
    const res = await fetch("/api/admin/dmx/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: newDmxName,
        price: Number(newDmxPrice || 0),
        image: newDmxImage,
        note: newDmxNote
      })
    });

    const data = await res.json();

    if (!res.ok) return show(data.message || "Lỗi tạo sản phẩm");

    setNewDmxName("");
    setNewDmxPrice("");
    setNewDmxImage("");
    setNewDmxNote("");

    await loadDmxProducts();

    show("Đã tạo sản phẩm");
  };

  const updateDmxProduct = async (product: DmxProduct, patch: any) => {
    const res = await fetch(`/api/admin/dmx/products/${product.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch)
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi lưu sản phẩm");

    await loadDmxProducts();
    show("Đã lưu sản phẩm");
  };

  const uploadDmxCodes = async (product: DmxProduct) => {
    const codes = prompt("Nhập voucher, mỗi dòng 1 mã");

    if (!codes) return;

    const res = await fetch(`/api/admin/dmx/products/${product.id}/codes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ codes })
    });

    const data = await res.json();

    if (!res.ok) return show(data.message || "Lỗi upload mã");

    await loadDmxProducts();
    show(`Đã thêm ${data.added} mã`);
  };

  const clearDmxCodes = async (product: DmxProduct) => {
    if (!confirm(`Xóa toàn bộ mã còn lại của ${product.name}?`)) return;

    const res = await fetch(`/api/admin/dmx/products/${product.id}/codes`, {
      method: "DELETE",
      headers
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi xóa kho mã");

    await loadDmxProducts();
    show("Đã xóa kho mã");
  };

  const deleteDmxProduct = async (product: DmxProduct) => {
    if (!confirm(`Xóa sản phẩm ${product.name}?`)) return;

    const res = await fetch(`/api/admin/dmx/products/${product.id}`, {
      method: "DELETE",
      headers
    });

    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi xóa sản phẩm");

    await loadDmxProducts();
    show("Đã xóa sản phẩm");
  };

  const filteredServices = useMemo(
    () => services.filter(s => `${s.name}`.toLowerCase().includes(search.toLowerCase())),
    [services, search]
  );

  const activeOrders = orders.filter(o => o.status === "waiting" || (o.status === "done" && o.code));

  const filteredAdminServices = useMemo(
    () =>
      adminServices.filter(s =>
        `${s.originalName} ${s.name} ${s.id} ${s.provider || ""}`
          .toLowerCase()
          .includes(adminServiceSearch.toLowerCase())
      ),
    [adminServices, adminServiceSearch]
  );

  if (!user) {
    return (
      <div className={`min-h-screen ${settings.background} flex items-center justify-center p-4`}>
        {notice && <Toast>{notice}</Toast>}

        <form onSubmit={isLogin ? login : register} className="bg-white rounded-3xl p-8 shadow max-w-md w-full">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl grid place-items-center font-black text-2xl mb-4 overflow-hidden">
            {settings.logoImage ? (
              <img src={settings.logoImage} className="w-full h-full object-cover" />
            ) : (
              settings.logoText
            )}
          </div>

          <h1 className="text-3xl font-black mb-2">{settings.siteName}</h1>
          <p className="text-slate-500 mb-6">{isLogin ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}</p>

          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border rounded-2xl px-5 py-4 mb-4"
            placeholder="Tài khoản"
          />

          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            className="w-full border rounded-2xl px-5 py-4 mb-4"
            placeholder="Mật khẩu"
          />

          <button disabled={busy} className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black">
            {busy ? "Đang xử lý..." : isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}
          </button>

          <button type="button" onClick={() => setIsLogin(!isLogin)} className="mt-5 w-full text-indigo-600 font-bold">
            {isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </button>

          <p className="text-xs text-slate-400 mt-5 text-center">Admin mặc định: admin / azhung12</p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {notice && <Toast>{notice}</Toast>}

      <aside className="fixed left-0 top-0 h-full w-72 bg-slate-950 text-white p-5 hidden lg:block overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl grid place-items-center font-black overflow-hidden">
            {settings.logoImage ? (
              <img src={settings.logoImage} className="w-full h-full object-cover" />
            ) : (
              settings.logoText
            )}
          </div>
          <h2 className="font-black text-xl">{settings.siteName}</h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 mb-4">
          <b>{user.username}</b>
          <p className="text-slate-400 text-sm">Số dư: {money(user.balance)}</p>
        </div>

        <Nav label="Dịch vụ OTP" id="services" tab={tab} setTab={setTab} />
        <Nav label="Lịch sử thuê" id="orders" tab={tab} setTab={setTab} />
        <Nav label="Dịch vụ DMX" id="dmx" tab={tab} setTab={setTab} />
        <Nav label="Nạp tiền" id="topup" tab={tab} setTab={setTab} />

        {isAdmin && (
          <>
            <Nav label="Duyệt nạp" id="adminTopups" tab={tab} setTab={setTab} />
            <Nav label="Quản lý user" id="users" tab={tab} setTab={setTab} />
            <Nav label="Quản lý dịch vụ" id="adminServices" tab={tab} setTab={setTab} />
            <Nav label="Quản lý DMX" id="adminDmx" tab={tab} setTab={setTab} />
            <Nav label="API CodeSim" id="api" tab={tab} setTab={setTab} />
            <Nav label="Cài đặt web" id="settings" tab={tab} setTab={setTab} />
          </>
        )}

        <button onClick={changeOwnPassword} className="w-full rounded-2xl px-4 py-3 text-left font-bold bg-slate-800 mt-3">
          Đổi mật khẩu
        </button>

        <button onClick={() => setUser(null)} className="w-full rounded-2xl px-4 py-3 text-left font-bold bg-rose-600 mt-3">
          Đăng xuất
        </button>
      </aside>

      <main className="lg:ml-72 p-4 lg:p-8">
        <div className="lg:hidden flex gap-2 overflow-x-auto mb-4">
          {["services", "orders", "dmx", "topup", ...(isAdmin ? ["adminTopups", "users", "adminServices", "adminDmx", "api", "settings"] : [])].map(t => (
            <button key={t} onClick={() => setTab(t)} className="bg-slate-900 text-white rounded-xl px-4 py-2 whitespace-nowrap">
              {t}
            </button>
          ))}
        </div>

        {!isAdmin && activeOrders.length > 0 && (
          <Panel title="Sim đang thuê / chờ OTP">
            <button onClick={loadOrders} className="bg-slate-900 text-white rounded-xl px-4 py-2 mb-4 font-bold">
              Tải lại
            </button>

            <div className="space-y-3">
              {activeOrders.map(o => (
                <OrderBox key={o.id} order={o} isAdmin={false} users={users} onCheck={checkCode} onReuse={reuseOrder} />
              ))}
            </div>
          </Panel>
        )}

        {settings.announcement && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-5 font-semibold whitespace-pre-line">
            {settings.announcement}
          </div>
        )}

        {settings.bannerImage && <img src={settings.bannerImage} className="w-full rounded-3xl mb-5 max-h-72 object-cover" />}

        {tab === "services" && (
          <Panel title="Dịch vụ OTP">
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <button onClick={loadServices} className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold">
                Tải lại
              </button>

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 border rounded-2xl px-5 py-3"
                placeholder="Tìm dịch vụ..."
              />

              <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)} className="border rounded-2xl px-5 py-3">
                {carriers.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {!services.length && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                Hiện chưa có dịch vụ nào được mở. Admin vào Quản lý dịch vụ để bấm Bỏ ẩn dịch vụ muốn bán.
              </div>
            )}

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredServices.map(s => (
                <div key={s.sourceKey || s.id} className="bg-white border rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xl font-black">{s.name}</h3>
                  <p className="text-sm text-slate-500">Dịch vụ nhận OTP tự động</p>

                  {s.note && <p className="text-sm bg-slate-100 rounded-xl p-3 mt-3">{s.note}</p>}

                  <p className="text-2xl font-black text-indigo-600 mt-4">{money(s.price)}</p>

                  <button disabled={busy} onClick={() => rentNumber(s)} className="mt-5 w-full bg-indigo-600 text-white rounded-2xl py-3 font-black">
                    Thuê số
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "orders" && (
          <Panel title="Lịch sử thuê số">
            <div className="space-y-3">
              {orders.map(o => (
                <OrderBox key={o.id} order={o} isAdmin={isAdmin} users={users} onCheck={checkCode} onReuse={reuseOrder} />
              ))}
            </div>
          </Panel>
        )}

        {tab === "dmx" && (
          <Panel title="Dịch vụ DMX">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dmxProducts.map(p => (
                <div key={p.id} className="bg-white border rounded-3xl p-5 shadow-sm">
                  {p.image && <img src={p.image} className="w-full h-48 object-cover rounded-2xl mb-4" />}

                  <h3 className="text-xl font-black">{p.name}</h3>

                  <p className="text-sm text-slate-500 mt-2">Còn {p.stock || 0} mã</p>

                  {p.note && <div className="bg-slate-100 rounded-2xl p-3 mt-3 text-sm whitespace-pre-wrap">{p.note}</div>}

                  <p className="text-2xl font-black text-indigo-600 mt-4">{money(p.price)}</p>

                  <button onClick={() => buyDmx(p)} className="mt-5 w-full bg-indigo-600 text-white rounded-2xl py-3 font-black">
                    Mua ngay
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-black mb-4">Lịch sử mua voucher</h2>

              <div className="space-y-3">
                {dmxOrders.map(o => (
                  <div key={o.id} className="border rounded-2xl p-4 bg-white">
                    <div className="flex gap-4">
                      {o.image && <img src={o.image} className="w-28 h-28 object-cover rounded-2xl" />}

                      <div className="flex-1">
                        <h3 className="font-black text-xl">{o.productName}</h3>
                        <p className="text-sm text-slate-500">Giá: {money(o.price)} | {new Date(o.createdAt).toLocaleString("vi-VN")}</p>

                        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <b>Mã voucher: {o.code}</b>
                        </div>

                        {o.note && <div className="mt-3 bg-slate-100 rounded-xl p-3 text-sm whitespace-pre-wrap">{o.note}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {tab === "topup" && (
          <Panel title="Nạp tiền">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-3xl p-5">
                <h2 className="text-2xl font-black mb-3">Thông tin chuyển khoản</h2>
                <p>Ngân hàng: <b>{settings.bankName}</b></p>
                <p>Số tài khoản: <b>{settings.bankAccountNumber}</b></p>
                <p>Chủ tài khoản: <b>{settings.bankBeneficiary}</b></p>
                <p>Nội dung: <b>{user.username}</b></p>

                {settings.bankQrUrl && <img src={settings.bankQrUrl} className="rounded-2xl mt-4 max-w-xs" />}
                {settings.topupNote && <p className="mt-4 text-sm text-slate-600">{settings.topupNote}</p>}
              </div>

              <div>
                <h2 className="text-2xl font-black mb-3">Tạo yêu cầu nạp</h2>

                <input
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  className="w-full border rounded-2xl px-5 py-4 mb-4"
                  placeholder="Số tiền đã chuyển"
                />

                <input
                  value={topupNote}
                  onChange={e => setTopupNote(e.target.value)}
                  className="w-full border rounded-2xl px-5 py-4 mb-4"
                  placeholder="Ghi chú / mã giao dịch"
                />

                <button onClick={createTopup} className="w-full bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black">
                  Gửi yêu cầu nạp tiền
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-black mt-8 mb-4">Lịch sử nạp tiền</h2>

            <div className="space-y-3">
              {topups.map(t => (
                <div key={t.id} className="border rounded-2xl p-4">
                  <b>{money(t.amount)}</b>
                  <p className="text-sm text-slate-500">Trạng thái: {t.status} | {new Date(t.createdAt).toLocaleString("vi-VN")}</p>
                  {t.note && <p className="text-sm">{t.note}</p>}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "adminTopups" && isAdmin && (
          <Panel title="Duyệt nạp tiền">
            <div className="space-y-3">
              {topups.map(t => (
                <div key={t.id} className={`border rounded-2xl p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4 ${t.status === "pending" ? "bg-amber-50 border-amber-200" : "bg-white"}`}>
                  <div>
                    <b>{t.username}</b> muốn nạp <b className="text-indigo-600">{money(t.amount)}</b>
                    <p className="text-sm text-slate-500">Trạng thái: {t.status} | {new Date(t.createdAt).toLocaleString("vi-VN")}</p>
                    {t.note && <p className="text-sm">Ghi chú: {t.note}</p>}
                  </div>

                  {t.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => approveTopup(t)} className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold">
                        Duyệt cộng tiền
                      </button>
                      <button onClick={() => rejectTopup(t)} className="bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "users" && isAdmin && (
          <Panel title="Quản lý user">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-3">User</th>
                    <th>Role</th>
                    <th>Đã nạp</th>
                    <th>Đã dùng</th>
                    <th>Còn lại</th>
                    <th>Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="py-4 font-bold">{u.username}</td>
                      <td>{u.role}</td>
                      <td>{money(u.totalTopup || 0)}</td>
                      <td>{money(u.totalUsed || 0)}</td>
                      <td className="font-black text-indigo-600">{money(u.balance)}</td>
                      <td className="flex gap-2 py-3">
                        <button onClick={() => adjustBalance(u)} className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm font-bold">Cộng/trừ</button>
                        <button onClick={() => changeUserPass(u)} className="bg-amber-500 text-white rounded-xl px-3 py-2 text-sm font-bold">Đổi pass</button>
                        <button onClick={() => deleteUser(u)} className="bg-rose-600 text-white rounded-xl px-3 py-2 text-sm font-bold">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "adminServices" && isAdmin && (
          <Panel title="Quản lý dịch vụ">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <button onClick={loadAdminServices} className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold">Tải dịch vụ API</button>
              <button onClick={() => bulkSetHidden(true, false)} disabled={busy} className="bg-rose-600 text-white rounded-2xl px-5 py-3 font-bold">Ẩn tất cả</button>
              <button onClick={() => bulkSetHidden(false, true)} disabled={busy} className="bg-emerald-600 text-white rounded-2xl px-5 py-3 font-bold">Hiện dịch vụ đang tìm</button>
              <button onClick={() => bulkSetHidden(true, true)} disabled={busy} className="bg-amber-500 text-white rounded-2xl px-5 py-3 font-bold">Ẩn dịch vụ đang tìm</button>
            </div>

            <input
              value={adminServiceSearch}
              onChange={e => setAdminServiceSearch(e.target.value)}
              className="w-full border rounded-2xl px-5 py-4 mb-4"
              placeholder="Tìm dịch vụ, ID hoặc nguồn..."
            />

            <div className="grid md:grid-cols-5 gap-3 mb-4">
              <Stat title="Tổng" value={providerCounts.total || adminServices.length} />
              <Stat title="Đang hiện" value={providerCounts.visible || 0} />
              <Stat title="Đang ẩn" value={providerCounts.hidden || 0} />
              <Stat title="Chay" value={providerCounts.chaycodeso3 || 0} />
              <Stat title="CodeSim" value={providerCounts.codesim || 0} />
            </div>

            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 font-semibold">
              Mặc định dịch vụ mới từ API sẽ bị ẩn. Muốn bán dịch vụ nào thì tìm rồi bấm “Bỏ ẩn”.
            </div>

            <div className="space-y-3">
              {filteredAdminServices.map(s => (
                <div key={s.sourceKey || s.id} className={`border rounded-2xl p-4 grid md:grid-cols-6 gap-3 items-center ${s.hidden ? "bg-rose-50 border-rose-200" : "bg-white"}`}>
                  <div>
                    <b>{s.originalName}</b>
                    <p className="text-xs text-slate-500">Nguồn {s.provider} | ID {s.providerId} | API {money(s.providerCost)}</p>
                    <p className={`text-xs font-bold mt-1 ${s.hidden ? "text-rose-600" : "text-emerald-600"}`}>{s.hidden ? "Đang ẩn" : "Đang hiện"}</p>
                  </div>

                  <input defaultValue={s.name} onBlur={e => saveService(s, { name: e.target.value })} className="border rounded-xl px-3 py-2" placeholder="Tên hiển thị" />
                  <input defaultValue={s.price} onBlur={e => saveService(s, { price: Number(e.target.value) })} className="border rounded-xl px-3 py-2" placeholder="Giá bán" />
                  <input defaultValue={s.note || ""} onBlur={e => saveService(s, { note: e.target.value })} className="border rounded-xl px-3 py-2" placeholder="Chú thích" />

                  <label className="flex gap-2 items-center font-bold">
                    <input type="checkbox" checked={s.hidden} onChange={e => saveService(s, { hidden: e.target.checked })} />
                    Ẩn
                  </label>

                  <button onClick={() => saveService(s, { hidden: !s.hidden })} className={`${s.hidden ? "bg-emerald-600" : "bg-rose-600"} text-white rounded-xl px-3 py-2 font-bold`}>
                    {s.hidden ? "Bỏ ẩn" : "Ẩn"}
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "adminDmx" && isAdmin && (
          <Panel title="Quản lý DMX">
            <div className="bg-white border rounded-3xl p-5 mb-6 space-y-4">
              <input value={newDmxName} onChange={e => setNewDmxName(e.target.value)} className="w-full border rounded-2xl px-5 py-4" placeholder="Tên sản phẩm" />

              <input value={newDmxPrice} onChange={e => setNewDmxPrice(e.target.value)} className="w-full border rounded-2xl px-5 py-4" placeholder="Giá bán" />

              <textarea value={newDmxNote} onChange={e => setNewDmxNote(e.target.value)} className="w-full border rounded-2xl px-5 py-4" placeholder="Ghi chú / hướng dẫn sử dụng voucher" />

              <div className="border rounded-2xl p-4">
                <p className="font-bold mb-2">Ảnh sản phẩm</p>

                {newDmxImage && <img src={newDmxImage} className="w-40 rounded-2xl mb-3" />}

                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) imageToBase64(file, value => setNewDmxImage(value));
                  }}
                  className="w-full border rounded-2xl px-5 py-4"
                />
              </div>

              <button onClick={createDmxProduct} className="bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black">
                Tạo sản phẩm
              </button>
            </div>

            <div className="space-y-4">
              {dmxProducts.map(p => (
                <div key={p.id} className="border rounded-3xl p-5 bg-white">
                  <div className="flex gap-4">
                    {p.image && <img src={p.image} className="w-32 h-32 object-cover rounded-2xl" />}

                    <div className="flex-1">
                      <h3 className="text-2xl font-black">{p.name}</h3>

                      <p className="text-slate-500">Giá bán: {money(p.price)}</p>
                      <p className="text-slate-500">Kho còn: {p.stock || 0}</p>
                      <p className="text-slate-500">Đã bán: {p.sold || 0}</p>
                      <p className={`font-bold ${p.hidden ? "text-rose-600" : "text-emerald-600"}`}>
                        {p.hidden ? "Đang ẩn" : "Đang hiện"}
                      </p>

                      {p.note && <div className="bg-slate-100 rounded-2xl p-3 mt-3 text-sm whitespace-pre-wrap">{p.note}</div>}

                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button onClick={() => uploadDmxCodes(p)} className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold">
                          Upload mã
                        </button>

                        <button onClick={() => updateDmxProduct(p, { hidden: !p.hidden })} className={`${p.hidden ? "bg-emerald-600" : "bg-amber-500"} text-white rounded-xl px-4 py-2 font-bold`}>
                          {p.hidden ? "Bỏ ẩn" : "Ẩn"}
                        </button>

                        <button onClick={() => clearDmxCodes(p)} className="bg-slate-700 text-white rounded-xl px-4 py-2 font-bold">
                          Xóa kho mã
                        </button>

                        <button onClick={() => deleteDmxProduct(p)} className="bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">
                          Xóa sản phẩm
                        </button>
                      </div>

                      {p.codesPreview && p.codesPreview.length > 0 && (
                        <div className="mt-4 bg-slate-100 rounded-xl p-3 text-sm">
                          <b>Mã còn trong kho mẫu:</b>
                          <pre className="whitespace-pre-wrap mt-2">{p.codesPreview.join("\n")}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "api" && isAdmin && (
          <Panel title="Cấu hình API nguồn">
            <div className="max-w-4xl space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <b>Lưu ý:</b> API key không hiển thị đầy đủ. Ô nào để trống thì giữ nguyên key cũ, ô nào dán key mới thì backend sẽ lưu key mới vào database.
              </div>

              <div className="border rounded-3xl p-5 bg-white space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">chaycodeso3</h2>
                    <p className="text-slate-500 text-sm">Nguồn API cũ đang có sẵn trên web.</p>
                  </div>

                  <label className="flex items-center gap-3 font-bold">
                    <input type="checkbox" checked={providerSettings.chayEnabled} onChange={e => setProviderSettings({ ...providerSettings, chayEnabled: e.target.checked })} />
                    Bật nguồn này
                  </label>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4">
                  <p>Trạng thái key: <b>{providerSettings.hasChayApiKey ? "Đã có" : "Chưa có"}</b></p>
                  <p>Key hiện tại: <b>{providerSettings.chayApiKeyMasked || "Chưa cấu hình"}</b></p>
                </div>

                <input
                  type="password"
                  value={chayApiKey}
                  onChange={e => setChayApiKey(e.target.value)}
                  className="w-full border rounded-2xl px-5 py-4"
                  placeholder="Dán API key chaycodeso3 mới vào đây, để trống nếu không đổi"
                />
              </div>

              <div className="border rounded-3xl p-5 bg-white space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">CodeSim</h2>
                    <p className="text-slate-500 text-sm">Nguồn API mới thêm vào hệ thống.</p>
                  </div>

                  <label className="flex items-center gap-3 font-bold">
                    <input type="checkbox" checked={providerSettings.codesimEnabled} onChange={e => setProviderSettings({ ...providerSettings, codesimEnabled: e.target.checked })} />
                    Bật nguồn này
                  </label>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4">
                  <p>Trạng thái key: <b>{providerSettings.hasCodesimApiKey ? "Đã có" : "Chưa có"}</b></p>
                  <p>Key hiện tại: <b>{providerSettings.codesimApiKeyMasked || "Chưa cấu hình"}</b></p>
                </div>

                <input
                  type="password"
                  value={codesimApiKey}
                  onChange={e => setCodesimApiKey(e.target.value)}
                  className="w-full border rounded-2xl px-5 py-4"
                  placeholder="Dán API key CodeSim mới vào đây, để trống nếu không đổi"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <button onClick={saveProviderSettings} className="bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black">
                  Lưu cấu hình API
                </button>

                <button onClick={testProvider} className="bg-slate-900 text-white rounded-2xl px-6 py-4 font-black">
                  Test cả 2 API
                </button>
              </div>

              {providerTest && (
                <pre className="bg-slate-950 text-slate-100 rounded-2xl p-4 overflow-auto text-xs max-h-80">
                  {JSON.stringify(providerTest, null, 2)}
                </pre>
              )}
            </div>
          </Panel>
        )}

        {tab === "settings" && isAdmin && (
          <Panel title="Cài đặt giao diện">
            <div className="space-y-4 max-w-3xl">
              <input value={settings.siteName} onChange={e => setSettings({ ...settings, siteName: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Tên web" />

              <input value={settings.logoText} onChange={e => setSettings({ ...settings, logoText: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Logo text nếu chưa upload ảnh" />

              <div className="border rounded-2xl p-4">
                <p className="font-bold mb-2">Ảnh logo web</p>

                {settings.logoImage && <img src={settings.logoImage} className="w-24 h-24 rounded-2xl object-cover mb-3 border" />}

                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) imageToBase64(file, value => setSettings({ ...settings, logoImage: value }));
                  }}
                  className="w-full border rounded-2xl px-5 py-4"
                />

                {settings.logoImage && (
                  <button type="button" onClick={() => setSettings({ ...settings, logoImage: "" })} className="mt-3 bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">
                    Xóa ảnh logo
                  </button>
                )}
              </div>

              <select value={settings.background} onChange={e => setSettings({ ...settings, background: e.target.value })} className="w-full border rounded-2xl px-5 py-4">
                <option value="bg-slate-950">Nền đen</option>
                <option value="bg-indigo-950">Nền tím</option>
                <option value="bg-blue-950">Nền xanh</option>
                <option value="bg-emerald-950">Nền xanh lá</option>
              </select>

              <textarea value={settings.announcement} onChange={e => setSettings({ ...settings, announcement: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Thông báo admin" />

              <input value={settings.bannerImage} onChange={e => setSettings({ ...settings, bannerImage: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Link ảnh banner" />

              <div className="pt-4 border-t">
                <h2 className="text-2xl font-black mb-4">Thông tin nạp tiền</h2>

                <input value={settings.bankName || ""} onChange={e => setSettings({ ...settings, bankName: e.target.value })} className="w-full border rounded-2xl px-5 py-4 mb-3" placeholder="Tên ngân hàng" />

                <input value={settings.bankAccountNumber || ""} onChange={e => setSettings({ ...settings, bankAccountNumber: e.target.value })} className="w-full border rounded-2xl px-5 py-4 mb-3" placeholder="Số tài khoản" />

                <input value={settings.bankBeneficiary || ""} onChange={e => setSettings({ ...settings, bankBeneficiary: e.target.value })} className="w-full border rounded-2xl px-5 py-4 mb-3" placeholder="Chủ tài khoản" />

                <input value={settings.bankQrUrl || ""} onChange={e => setSettings({ ...settings, bankQrUrl: e.target.value })} className="w-full border rounded-2xl px-5 py-4 mb-3" placeholder="Link ảnh QR hoặc ảnh đã tải lên" />

                <div className="border rounded-2xl p-4 mb-3">
                  <p className="font-bold mb-2">Tải ảnh QR nạp tiền</p>

                  {settings.bankQrUrl && <img src={settings.bankQrUrl} className="w-48 rounded-2xl object-cover mb-3 border" />}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) imageToBase64(file, value => setSettings({ ...settings, bankQrUrl: value }));
                    }}
                    className="w-full border rounded-2xl px-5 py-4"
                  />

                  {settings.bankQrUrl && (
                    <button type="button" onClick={() => setSettings({ ...settings, bankQrUrl: "" })} className="mt-3 bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">
                      Xóa ảnh QR
                    </button>
                  )}
                </div>

                <textarea value={settings.topupNote || ""} onChange={e => setSettings({ ...settings, topupNote: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Ghi chú nạp tiền" />
              </div>

              <button onClick={saveSettings} className="bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black">
                Lưu cài đặt
              </button>
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function Toast({ children }: { children: any }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white rounded-2xl px-5 py-3 shadow font-bold">
      {children}
    </div>
  );
}

function Nav({ label, id, tab, setTab }: any) {
  return (
    <button onClick={() => setTab(id)} className={`w-full rounded-2xl px-4 py-3 text-left font-bold mb-2 ${tab === id ? "bg-indigo-600" : "bg-slate-800"}`}>
      {label}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow mb-6">
      <h1 className="text-3xl font-black mb-5">{title}</h1>
      {children}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-slate-100 rounded-2xl p-4">
      <b>{title}</b>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function OrderBox({ order, isAdmin, users = [], onCheck, onReuse }: any) {
  const orderUser = users.find((u: User) => u.id === order.userId);

  return (
    <div className="border rounded-2xl p-4 bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-black text-xl">{order.appName} - {order.number}</h3>

          <p className="text-sm text-slate-500">
            {isAdmin && <>User: {orderUser?.username || order.userId || "Không rõ"} | Nguồn: {order.provider || "api"} | </>}
            Nhà mạng: {order.carrier || "Tất cả"} | Trạng thái: {order.status} | Giá: {money(order.price)}
          </p>

          <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {order.status === "waiting" && (
            <button onClick={() => onCheck(order)} className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold">
              Check OTP
            </button>
          )}

          {order.provider === "codesim" && order.status === "done" && (
            <button onClick={() => onReuse(order)} className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold">
              Thuê lại
            </button>
          )}
        </div>
      </div>

      {order.refunded && (
        <p className="mt-3 text-emerald-700 font-bold">
          Đã hoàn tiền: {order.refundReason === "expired_no_otp" ? "Hết hạn không có OTP" : "Khách hủy"}
        </p>
      )}

      {order.code ? (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <b>OTP: {order.code}</b>
        </div>
      ) : (
        order.status === "waiting" && <p className="mt-3 text-slate-500">Đang tự động chờ OTP...</p>
      )}

      {order.sms && <pre className="mt-3 bg-slate-100 rounded-xl p-3 whitespace-pre-wrap text-sm">{order.sms}</pre>}
    </div>
  );
}
