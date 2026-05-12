import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  providerId?: number | string;
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

type ProviderCounts = {
  chaycodeso3?: number;
  codesim?: number;
  visible?: number;
  hidden?: number;
  total?: number;
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
  topupNote: "Nội dung chuyển khoản: username của bạn.\nSau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt.",
};

const defaultProviderSettings: ProviderSettings = {
  chayEnabled: true,
  chayApiKeyMasked: "",
  hasChayApiKey: false,
  codesimEnabled: true,
  codesimApiKeyMasked: "",
  hasCodesimApiKey: false,
};

const carriers = [
  { label: "Tất cả nhà mạng", value: "" },
  { label: "Viettel", value: "Viettel" },
  { label: "Mobi", value: "Mobi" },
  { label: "Vina", value: "Vina" },
  { label: "VNMB", value: "VNMB" },
  { label: "ITelecom", value: "ITelecom" },
];

const tabLabels: Record<string, string> = {
  services: "Dịch vụ",
  orders: "Đơn thuê",
  topup: "Nạp tiền",
  adminTopups: "Duyệt nạp",
  users: "Người dùng",
  adminServices: "Quản lý dịch vụ",
  api: "API",
  settings: "Cài đặt",
};

const money = (n: number) => Number(n || 0).toLocaleString("vi-VN") + "đ";
const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

function getSavedUser() {
  try {
    const raw = localStorage.getItem("otp24h_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      throw new Error(data?.message || "Có lỗi xảy ra");
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Server phản hồi quá lâu, vui lòng thử lại");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function App() {
  const [user, setUserState] = useState<User | null>(() => getSavedUser());
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [tab, setTab] = useState("services");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [adminServiceSearch, setAdminServiceSearch] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [providerCounts, setProviderCounts] = useState<ProviderCounts>({});
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>(defaultProviderSettings);
  const [chayApiKey, setChayApiKey] = useState("");
  const [codesimApiKey, setCodesimApiKey] = useState("");
  const [providerTest, setProviderTest] = useState<any>(null);

  const toastTimer = useRef<number | null>(null);
  const checkingRef = useRef(false);
  const isAdmin = user?.role === "admin";

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    if (next) localStorage.setItem("otp24h_user", JSON.stringify(next));
    else localStorage.removeItem("otp24h_user");
  }, []);

  const headers = useMemo(() => {
    const base: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.id) base["x-user-id"] = user.id;
    return base;
  }, [user?.id]);

  const show = useCallback((msg: string) => {
    setNotice(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const imageToBase64 = useCallback(
    (file: File, callback: (value: string) => void) => {
      if (!file.type.startsWith("image/")) return show("Chỉ được tải file ảnh");
      if (file.size > 1024 * 1024 * 2) return show("Ảnh tối đa 2MB");

      const reader = new FileReader();
      reader.onload = () => callback(String(reader.result));
      reader.readAsDataURL(file);
    },
    [show]
  );

  const loadSettings = useCallback(async () => {
    const data = await apiFetch<Partial<Settings>>("/api/settings", {}, 10000);
    setSettings({ ...defaultSettings, ...data });
  }, []);

  const loadServices = useCallback(async () => {
    const data = await apiFetch<Service[]>("/api/services", {}, 15000);
    setServices(data || []);
  }, []);

  const loadOrders = useCallback(async () => {
    if (!user) return [] as Order[];
    const data = await apiFetch<Order[]>(`/api/orders?userId=${encodeURIComponent(user.id)}`, {}, 12000);
    setOrders(data || []);
    return data || [];
  }, [user]);

  const loadTopups = useCallback(async () => {
    if (!user) return;
    const data = await apiFetch<Topup[]>(`/api/topups?userId=${encodeURIComponent(user.id)}`, {}, 12000);
    setTopups(data || []);
  }, [user]);

  const loadUsers = useCallback(async () => {
    if (!user || !isAdmin) return;
    const data = await apiFetch<User[]>("/api/user-stats", { headers }, 12000);
    setUsers(data || []);
  }, [headers, isAdmin, user]);

  const loadAdminServices = useCallback(
    async (force = false) => {
      if (!user || !isAdmin) return;
      const data = await apiFetch<{ sources: Service[]; counts: ProviderCounts }>(`/api/admin/services${force ? "?force=1" : ""}`, { headers }, 20000);
      setAdminServices(data.sources || []);
      setProviderCounts(data.counts || {});
    },
    [headers, isAdmin, user]
  );

  const loadProviderSettings = useCallback(async () => {
    if (!user || !isAdmin) return;
    const data = await apiFetch<ProviderSettings>("/api/admin/provider-settings", { headers }, 12000);
    setProviderSettings({ ...defaultProviderSettings, ...data });
  }, [headers, isAdmin, user]);

  const refreshCurrentTab = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (tab === "services") await loadServices();
      if (tab === "orders") await loadOrders();
      if (tab === "topup") await loadTopups();
      if (isAdmin && tab === "adminTopups") await loadTopups();
      if (isAdmin && tab === "users") await loadUsers();
      if (isAdmin && tab === "adminServices") await loadAdminServices();
      if (isAdmin && tab === "api") await loadProviderSettings();
    } catch (error: any) {
      show(error.message || "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, loadAdminServices, loadOrders, loadProviderSettings, loadServices, loadTopups, loadUsers, show, tab, user]);

  useEffect(() => {
    Promise.allSettled([loadSettings(), loadServices()]).catch(() => undefined);
  }, [loadSettings, loadServices]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const common = [loadOrders(), loadTopups()];
    const admin = isAdmin ? [loadUsers(), loadAdminServices(), loadProviderSettings()] : [];

    Promise.allSettled([...common, ...admin])
      .then(results => {
        const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
        if (rejected) show(rejected.reason?.message || "Có dữ liệu chưa tải được");
      })
      .finally(() => setLoading(false));
  }, [isAdmin, loadAdminServices, loadOrders, loadProviderSettings, loadTopups, loadUsers, show, user]);

  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      if (checkingRef.current || document.hidden) return;
      const waiting = orders.filter(o => o.status === "waiting");
      if (!waiting.length) return;

      checkingRef.current = true;
      try {
        const checking = waiting.slice(0, 5);
        await Promise.allSettled(
          checking.map(order =>
            apiFetch(`/api/orders/${order.id}/check-code`, {
              method: "POST",
              headers,
            }, 12000)
          )
        );
        await loadOrders();
      } finally {
        checkingRef.current = false;
      }
    };

    const timer = window.setInterval(poll, 7000);
    return () => window.clearInterval(timer);
  }, [headers, loadOrders, orders, user]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && user) loadOrders().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadOrders, user]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      const data = await apiFetch<User>("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setUser(data);
      show("Đăng nhập thành công");
    } catch (error: any) {
      show(error.message || "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      await apiFetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      show("Đăng ký thành công, hãy đăng nhập");
      setIsLogin(true);
    } catch (error: any) {
      show(error.message || "Đăng ký thất bại");
    } finally {
      setBusy(false);
    }
  };

  const rentNumber = async (service: Service) => {
    if (!user || busy) return;
    const carrierText = service.provider === "codesim" ? "Tự động" : selectedCarrier || "Tất cả nhà mạng";
    if (!confirm(`Thuê ${service.name} giá ${money(service.price)}?\nNhà mạng: ${carrierText}`)) return;

    setBusy(true);
    try {
      const data = await apiFetch<{ order: Order; user: User }>("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id, appId: service.sourceKey || service.id, carrier: selectedCarrier }),
      }, 20000);

      if (data.user) setUser(data.user);
      await loadOrders();
      setTab("orders");
      show("Đã lấy số thành công");
    } catch (error: any) {
      show(error.message || "Không lấy được số");
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (order: Order) => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<{ order: Order; api?: any; user?: User }>(`/api/orders/${order.id}/check-code`, {
        method: "POST",
        headers,
      }, 15000);

      if (data.user) setUser(data.user);
      await loadOrders();

      if (data.order?.status === "expired" && data.order?.refunded) show("Số đã hết hạn, hệ thống đã hoàn tiền");
      else if (data.order?.code) show("Đã có OTP");
      else show(data.api?.Msg || data.api?.message || "Đang chờ OTP");
    } catch (error: any) {
      show(error.message || "Không check được code");
    } finally {
      setBusy(false);
    }
  };

  const reuseOrder = async (order: Order) => {
    if (busy) return;
    if (!confirm(`Thuê lại số ${order.number}?`)) return;

    setBusy(true);
    try {
      const data = await apiFetch<{ order: Order; user?: User }>(`/api/orders/${order.id}/reuse`, {
        method: "POST",
        headers,
      }, 20000);
      if (data.user) setUser(data.user);
      await loadOrders();
      show("Đã thuê lại số");
    } catch (error: any) {
      show(error.message || "Không thuê lại được");
    } finally {
      setBusy(false);
    }
  };

  const adjustBalance = async (target: User) => {
    const amount = prompt(`Nhập số tiền cộng/trừ cho ${target.username}`);
    if (!amount) return;

    try {
      await apiFetch(`/api/users/${target.id}/adjust-balance`, {
        method: "POST",
        headers,
        body: JSON.stringify({ amount: Number(amount) }),
      });
      await loadUsers();
      show("Đã cập nhật số dư");
    } catch (error: any) {
      show(error.message || "Lỗi sửa tiền");
    }
  };

  const changeUserPass = async (target: User) => {
    const newPassword = prompt(`Mật khẩu mới cho ${target.username}`);
    if (!newPassword) return;

    try {
      await apiFetch(`/api/users/${target.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ password: newPassword }),
      });
      show("Đã đổi mật khẩu");
    } catch (error: any) {
      show(error.message || "Lỗi đổi mật khẩu");
    }
  };

  const deleteUser = async (target: User) => {
    if (!confirm(`Xóa user ${target.username}?`)) return;

    try {
      await apiFetch(`/api/users/${target.id}`, { method: "DELETE", headers });
      await loadUsers();
      show("Đã xóa user");
    } catch (error: any) {
      show(error.message || "Lỗi xóa user");
    }
  };

  const saveService = async (service: Service, patch: Partial<Service>) => {
    const key = service.sourceKey || service.id;

    try {
      await apiFetch(`/api/admin/services/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(patch),
      });
      await Promise.allSettled([loadAdminServices(), loadServices()]);
      show("Đã lưu dịch vụ");
    } catch (error: any) {
      show(error.message || "Lỗi lưu dịch vụ");
    }
  };

  const bulkSetHidden = async (hidden: boolean, onlyFiltered = false) => {
    const list = onlyFiltered ? filteredAdminServices : adminServices;
    if (!list.length) return show("Không có dịch vụ nào để cập nhật");
    if (!confirm(`${hidden ? "ẨN" : "HIỆN"} ${list.length} dịch vụ?`)) return;

    setBusy(true);
    try {
      const batchSize = 10;
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(s =>
            apiFetch(`/api/admin/services/${encodeURIComponent(s.sourceKey || s.id)}`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ hidden }),
            }, 12000)
          )
        );
        await sleep(120);
      }
      await Promise.allSettled([loadAdminServices(), loadServices()]);
      show("Đã cập nhật dịch vụ");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });
      show("Đã lưu cài đặt");
    } catch (error: any) {
      show(error.message || "Lỗi lưu cài đặt");
    } finally {
      setBusy(false);
    }
  };

  const saveProviderSettings = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<ProviderSettings>("/api/admin/provider-settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          chayEnabled: providerSettings.chayEnabled,
          chayApiKey,
          codesimEnabled: providerSettings.codesimEnabled,
          codesimApiKey,
        }),
      });
      setChayApiKey("");
      setCodesimApiKey("");
      setProviderSettings(data);
      await Promise.allSettled([loadAdminServices(true), loadServices()]);
      show("Đã lưu cấu hình API");
    } catch (error: any) {
      show(error.message || "Lỗi lưu API key");
    } finally {
      setBusy(false);
    }
  };

  const testProvider = async () => {
    try {
      const data = await apiFetch<any>("/api/admin/provider-test", { headers }, 20000);
      setProviderTest(data);
      show(data.ok ? "Cả 2 API hoạt động" : "Có API đang lỗi, xem kết quả test bên dưới");
    } catch (error: any) {
      show(error.message || "Không test được API");
    }
  };

  const changeOwnPassword = async () => {
    if (!user) return;
    const oldPassword = prompt("Nhập mật khẩu cũ");
    const newPassword = prompt("Nhập mật khẩu mới");
    if (!oldPassword || !newPassword) return;

    try {
      await apiFetch("/api/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id, oldPassword, newPassword }),
      });
      show("Đã đổi mật khẩu");
    } catch (error: any) {
      show(error.message || "Lỗi đổi mật khẩu");
    }
  };

  const createTopup = async () => {
    if (!user || busy) return;
    const amount = Number(topupAmount || 0);
    if (!amount || Number.isNaN(amount) || amount <= 0) return show("Nhập số tiền nạp hợp lệ");

    setBusy(true);
    try {
      await apiFetch("/api/topups", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id, amount, note: topupNote }),
      });
      setTopupAmount("");
      setTopupNote("");
      await loadTopups();
      show("Đã gửi yêu cầu nạp tiền");
    } catch (error: any) {
      show(error.message || "Lỗi tạo yêu cầu nạp");
    } finally {
      setBusy(false);
    }
  };

  const approveTopup = async (topup: Topup) => {
    try {
      await apiFetch(`/api/topups/${topup.id}/approve`, { method: "POST", headers });
      await Promise.allSettled([loadTopups(), loadUsers()]);
      show("Đã cộng tiền cho user");
    } catch (error: any) {
      show(error.message || "Lỗi duyệt nạp");
    }
  };

  const rejectTopup = async (topup: Topup) => {
    const reason = prompt("Lý do từ chối", "") || "";
    try {
      await apiFetch(`/api/topups/${topup.id}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason }),
      });
      await loadTopups();
      show("Đã từ chối yêu cầu");
    } catch (error: any) {
      show(error.message || "Lỗi từ chối");
    }
  };

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => `${s.name} ${s.originalName || ""} ${s.provider || ""}`.toLowerCase().includes(q));
  }, [services, search]);

  const activeOrders = useMemo(() => orders.filter(o => o.status === "waiting" || (o.status === "done" && o.code)), [orders]);

  const filteredAdminServices = useMemo(() => {
    const q = adminServiceSearch.trim().toLowerCase();
    if (!q) return adminServices;
    return adminServices.filter(s => `${s.originalName} ${s.name} ${s.id} ${s.provider || ""} ${s.providerId || ""}`.toLowerCase().includes(q));
  }, [adminServices, adminServiceSearch]);

  if (!user) {
    return (
      <div className={`${settings.background || "bg-slate-950"} min-h-screen flex items-center justify-center p-4`}>
        {notice && <Toast>{notice}</Toast>}
        <div className="bg-white rounded-3xl p-8 shadow max-w-md w-full">
          <div className="text-center mb-7">
            {settings.logoImage ? (
              <img src={settings.logoImage} className="w-24 h-24 mx-auto rounded-3xl object-cover" />
            ) : (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black">
                {settings.logoText}
              </div>
            )}
            <h1 className="text-3xl font-black mt-4">{settings.siteName}</h1>
          </div>

          <form onSubmit={isLogin ? login : register}>
            <h2 className="text-xl font-black mb-4">{isLogin ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}</h2>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Tài khoản" autoComplete="username" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Mật khẩu" autoComplete={isLogin ? "current-password" : "new-password"} />
            <button disabled={busy} className="w-full bg-indigo-600 disabled:bg-slate-400 text-white rounded-2xl py-4 font-black">
              {busy ? "Đang xử lý..." : isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}
            </button>
          </form>

          <button onClick={() => setIsLogin(!isLogin)} className="mt-5 w-full text-indigo-600 font-bold">
            {isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </button>
          <p className="text-center text-xs text-slate-400 mt-4">Admin mặc định: admin / azhung12</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${settings.background || "bg-slate-950"} min-h-screen text-slate-900`}>
      {notice && <Toast>{notice}</Toast>}

      <div className="grid lg:grid-cols-[280px_1fr] min-h-screen">
        <aside className="bg-slate-950 text-white p-5 lg:sticky lg:top-0 lg:h-screen overflow-y-auto">
          <div className="flex items-center gap-3 mb-5">
            {settings.logoImage ? (
              <img src={settings.logoImage} className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black">
                {settings.logoText}
              </div>
            )}
            <div>
              <h2 className="font-black text-xl">{settings.siteName}</h2>
              <p className="text-xs text-slate-400">{user.username}</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 mb-4">
            <p className="text-xs text-slate-400">Số dư</p>
            <p className="text-2xl font-black">{money(user.balance)}</p>
          </div>

          <nav className="hidden lg:block">
            <Nav label="Dịch vụ" id="services" tab={tab} setTab={setTab} />
            <Nav label="Đơn thuê" id="orders" tab={tab} setTab={setTab} />
            <Nav label="Nạp tiền" id="topup" tab={tab} setTab={setTab} />
            {isAdmin && (
              <>
                <Nav label="Duyệt nạp" id="adminTopups" tab={tab} setTab={setTab} />
                <Nav label="Người dùng" id="users" tab={tab} setTab={setTab} />
                <Nav label="Quản lý dịch vụ" id="adminServices" tab={tab} setTab={setTab} />
                <Nav label="API" id="api" tab={tab} setTab={setTab} />
                <Nav label="Cài đặt" id="settings" tab={tab} setTab={setTab} />
              </>
            )}
          </nav>

          <div className="flex gap-2 mt-4 flex-wrap lg:block lg:space-y-2">
            <button onClick={changeOwnPassword} className="rounded-2xl px-4 py-3 text-left font-bold bg-slate-800">
              Đổi mật khẩu
            </button>
            <button onClick={() => setUser(null)} className="rounded-2xl px-4 py-3 text-left font-bold bg-rose-600">
              Đăng xuất
            </button>
          </div>
        </aside>

        <main className="p-4 md:p-8 overflow-x-hidden">
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4">
            {["services", "orders", "topup", ...(isAdmin ? ["adminTopups", "users", "adminServices", "api", "settings"] : [])].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`${tab === t ? "bg-indigo-600" : "bg-slate-900"} text-white rounded-xl px-4 py-2 whitespace-nowrap`}>
                {tabLabels[t] || t}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-3xl font-black text-white lg:text-slate-900">{tabLabels[tab] || tab}</h1>
              {loading && <p className="text-sm text-slate-200 lg:text-slate-500">Đang tải dữ liệu...</p>}
            </div>
            <button onClick={refreshCurrentTab} disabled={loading} className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold disabled:bg-slate-400">
              Tải lại
            </button>
          </div>

          {!isAdmin && activeOrders.length > 0 && (
            <Panel title="Đơn đang hoạt động">
              <div className="grid gap-3">
                {activeOrders.map(o => (
                  <OrderBox key={o.id} order={o} isAdmin={false} onCheck={checkCode} onReuse={reuseOrder} />
                ))}
              </div>
            </Panel>
          )}

          {settings.announcement && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6 whitespace-pre-wrap font-semibold">
              {settings.announcement}
            </div>
          )}

          {settings.bannerImage && <img src={settings.bannerImage} className="w-full max-h-64 object-cover rounded-3xl mb-6 shadow" />}

          {tab === "services" && (
            <Panel title="Thuê sim nhận OTP">
              <div className="flex flex-col md:flex-row gap-3 mb-5">
                <input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border rounded-2xl px-5 py-3" placeholder="Tìm dịch vụ..." />
                <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)} className="border rounded-2xl px-5 py-3">
                  {carriers.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {!services.length && (
                <p className="bg-slate-100 rounded-2xl p-5 font-bold">
                  Hiện chưa có dịch vụ nào được mở. Admin vào Quản lý dịch vụ để bấm Bỏ ẩn dịch vụ muốn bán.
                </p>
              )}

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredServices.map(s => (
                  <div key={s.sourceKey || s.id} className="border rounded-3xl p-5 hover:shadow transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black">{s.name}</h3>
                        <p className="text-sm text-slate-500">Dịch vụ nhận OTP tự động</p>
                      </div>
                      {s.provider && <span className="text-xs bg-slate-100 rounded-full px-3 py-1">{s.provider}</span>}
                    </div>
                    {s.note && <p className="mt-3 text-sm bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">{s.note}</p>}
                    <p className="text-2xl font-black mt-4 text-indigo-600">{money(s.price)}</p>
                    <button disabled={busy} onClick={() => rentNumber(s)} className="mt-5 w-full bg-indigo-600 disabled:bg-slate-400 text-white rounded-2xl py-3 font-black">
                      Thuê số
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "orders" && (
            <Panel title="Lịch sử thuê số">
              <div className="grid gap-3">
                {orders.map(o => (
                  <OrderBox key={o.id} order={o} isAdmin={isAdmin} users={users} onCheck={checkCode} onReuse={reuseOrder} />
                ))}
                {!orders.length && <p className="text-slate-500">Chưa có đơn nào.</p>}
              </div>
            </Panel>
          )}

          {tab === "topup" && (
            <Panel title="Nạp tiền">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-3xl p-5">
                  <h2 className="text-2xl font-black mb-4">Thông tin chuyển khoản</h2>
                  <p><b>Ngân hàng:</b> {settings.bankName}</p>
                  <p><b>Số tài khoản:</b> {settings.bankAccountNumber}</p>
                  <p><b>Chủ tài khoản:</b> {settings.bankBeneficiary}</p>
                  <p><b>Nội dung:</b> {user.username}</p>
                  {settings.bankQrUrl && <img src={settings.bankQrUrl} className="w-60 rounded-2xl object-cover mt-4 border" />}
                  {settings.topupNote && <pre className="mt-4 bg-white rounded-2xl p-4 whitespace-pre-wrap text-sm">{settings.topupNote}</pre>}
                </div>

                <div>
                  <h2 className="text-2xl font-black mb-4">Tạo yêu cầu nạp</h2>
                  <input value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Số tiền đã chuyển" inputMode="numeric" />
                  <input value={topupNote} onChange={e => setTopupNote(e.target.value)} className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Ghi chú / mã giao dịch" />
                  <button disabled={busy} onClick={createTopup} className="bg-indigo-600 disabled:bg-slate-400 text-white rounded-2xl px-6 py-4 font-black">
                    Gửi yêu cầu nạp tiền
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-black mt-8 mb-4">Lịch sử nạp tiền</h2>
              <div className="grid gap-3">
                {topups.map(t => <TopupBox key={t.id} topup={t} />)}
                {!topups.length && <p className="text-slate-500">Chưa có lịch sử nạp.</p>}
              </div>
            </Panel>
          )}

          {tab === "adminTopups" && isAdmin && (
            <Panel title="Duyệt yêu cầu nạp">
              <div className="grid gap-3">
                {topups.map(t => (
                  <div key={t.id} className="border rounded-2xl p-4">
                    <h3 className="font-black">{t.username} muốn nạp {money(t.amount)}</h3>
                    <p className="text-sm text-slate-500">Trạng thái: {t.status} | {new Date(t.createdAt).toLocaleString("vi-VN")}</p>
                    {t.note && <p className="mt-2 bg-slate-50 rounded-xl p-3">Ghi chú: {t.note}</p>}
                    {t.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => approveTopup(t)} className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold">Duyệt cộng tiền</button>
                        <button onClick={() => rejectTopup(t)} className="bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">Từ chối</button>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-right">Đã nạp</th>
                      <th className="p-3 text-right">Đã dùng</th>
                      <th className="p-3 text-right">Còn lại</th>
                      <th className="p-3 text-left">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b">
                        <td className="p-3 font-bold">{u.username}</td>
                        <td className="p-3">{u.role}</td>
                        <td className="p-3 text-right">{money(u.totalTopup || 0)}</td>
                        <td className="p-3 text-right">{money(u.totalUsed || 0)}</td>
                        <td className="p-3 text-right font-black">{money(u.balance)}</td>
                        <td className="p-3">
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => adjustBalance(u)} className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm font-bold">Cộng/trừ</button>
                            <button onClick={() => changeUserPass(u)} className="bg-amber-500 text-white rounded-xl px-3 py-2 text-sm font-bold">Đổi pass</button>
                            <button onClick={() => deleteUser(u)} className="bg-rose-600 text-white rounded-xl px-3 py-2 text-sm font-bold">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {tab === "adminServices" && isAdmin && (
            <Panel title="Quản lý dịch vụ API">
              <div className="grid md:grid-cols-5 gap-3 mb-5">
                <Stat title="Tổng" value={providerCounts.total || adminServices.length} />
                <Stat title="Đang hiện" value={providerCounts.visible || 0} />
                <Stat title="Đang ẩn" value={providerCounts.hidden || 0} />
                <Stat title="ChayCode" value={providerCounts.chaycodeso3 || 0} />
                <Stat title="CodeSim" value={providerCounts.codesim || 0} />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => loadAdminServices(true)} className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold">Tải dịch vụ API</button>
                <button onClick={() => bulkSetHidden(true, false)} disabled={busy} className="bg-rose-600 disabled:bg-slate-400 text-white rounded-2xl px-5 py-3 font-bold">Ẩn tất cả</button>
                <button onClick={() => bulkSetHidden(false, true)} disabled={busy} className="bg-emerald-600 disabled:bg-slate-400 text-white rounded-2xl px-5 py-3 font-bold">Hiện dịch vụ đang tìm</button>
                <button onClick={() => bulkSetHidden(true, true)} disabled={busy} className="bg-amber-500 disabled:bg-slate-400 text-white rounded-2xl px-5 py-3 font-bold">Ẩn dịch vụ đang tìm</button>
              </div>

              <input value={adminServiceSearch} onChange={e => setAdminServiceSearch(e.target.value)} className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Tìm dịch vụ, ID hoặc nguồn..." />
              <p className="text-sm text-slate-500 mb-4">Mặc định dịch vụ mới từ API sẽ bị ẩn. Muốn bán dịch vụ nào thì tìm rồi bấm “Bỏ ẩn”.</p>

              <div className="grid gap-3">
                {filteredAdminServices.map(s => (
                  <AdminServiceBox key={s.sourceKey || s.id} service={s} onSave={saveService} />
                ))}
              </div>
            </Panel>
          )}

          {tab === "api" && isAdmin && (
            <Panel title="Cấu hình API nguồn">
              <p className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
                API key không hiển thị đầy đủ. Ô nào để trống thì giữ nguyên key cũ, ô nào dán key mới thì backend sẽ lưu key mới vào database.
              </p>

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="border rounded-3xl p-5">
                  <h2 className="text-2xl font-black mb-2">chaycodeso3</h2>
                  <p className="text-sm text-slate-500 mb-3">Nguồn API cũ đang có sẵn trên web.</p>
                  <label className="flex gap-2 items-center mb-3">
                    <input type="checkbox" checked={providerSettings.chayEnabled} onChange={e => setProviderSettings({ ...providerSettings, chayEnabled: e.target.checked })} />
                    Bật nguồn này
                  </label>
                  <p>Trạng thái key: {providerSettings.hasChayApiKey ? "Đã có" : "Chưa có"}</p>
                  <p className="mb-3">Key hiện tại: {providerSettings.chayApiKeyMasked || "Chưa cấu hình"}</p>
                  <input value={chayApiKey} onChange={e => setChayApiKey(e.target.value)} className="w-full border rounded-2xl px-5 py-4" placeholder="Dán API key chaycodeso3 mới vào đây, để trống nếu không đổi" />
                </div>

                <div className="border rounded-3xl p-5">
                  <h2 className="text-2xl font-black mb-2">CodeSim</h2>
                  <p className="text-sm text-slate-500 mb-3">Nguồn API mới thêm vào hệ thống.</p>
                  <label className="flex gap-2 items-center mb-3">
                    <input type="checkbox" checked={providerSettings.codesimEnabled} onChange={e => setProviderSettings({ ...providerSettings, codesimEnabled: e.target.checked })} />
                    Bật nguồn này
                  </label>
                  <p>Trạng thái key: {providerSettings.hasCodesimApiKey ? "Đã có" : "Chưa có"}</p>
                  <p className="mb-3">Key hiện tại: {providerSettings.codesimApiKeyMasked || "Chưa cấu hình"}</p>
                  <input value={codesimApiKey} onChange={e => setCodesimApiKey(e.target.value)} className="w-full border rounded-2xl px-5 py-4" placeholder="Dán API key CodeSim mới vào đây, để trống nếu không đổi" />
                </div>
              </div>

              <div className="flex gap-2 mt-5 flex-wrap">
                <button disabled={busy} onClick={saveProviderSettings} className="bg-indigo-600 disabled:bg-slate-400 text-white rounded-2xl px-6 py-4 font-black">Lưu cấu hình API</button>
                <button onClick={testProvider} className="bg-slate-900 text-white rounded-2xl px-6 py-4 font-black">Test cả 2 API</button>
              </div>

              {providerTest && <pre className="mt-5 bg-slate-100 rounded-2xl p-4 overflow-x-auto text-xs">{JSON.stringify(providerTest, null, 2)}</pre>}
            </Panel>
          )}

          {tab === "settings" && isAdmin && (
            <Panel title="Cài đặt giao diện">
              <div className="grid gap-4">
                <input value={settings.siteName} onChange={e => setSettings({ ...settings, siteName: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Tên web" />
                <input value={settings.logoText} onChange={e => setSettings({ ...settings, logoText: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Logo text nếu chưa upload ảnh" />

                <div className="border rounded-2xl p-4">
                  <p className="font-bold mb-2">Ảnh logo web</p>
                  {settings.logoImage && <img src={settings.logoImage} className="w-24 h-24 rounded-2xl object-cover mb-3" />}
                  <input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) imageToBase64(file, value => setSettings({ ...settings, logoImage: value })); }} className="w-full border rounded-2xl px-5 py-4" />
                  {settings.logoImage && <button type="button" onClick={() => setSettings({ ...settings, logoImage: "" })} className="mt-3 bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">Xóa ảnh logo</button>}
                </div>

                <select value={settings.background} onChange={e => setSettings({ ...settings, background: e.target.value })} className="w-full border rounded-2xl px-5 py-4">
                  <option value="bg-slate-950">Nền đen</option>
                  <option value="bg-violet-950">Nền tím</option>
                  <option value="bg-blue-950">Nền xanh</option>
                  <option value="bg-emerald-950">Nền xanh lá</option>
                </select>

                <textarea value={settings.announcement} onChange={e => setSettings({ ...settings, announcement: e.target.value })} className="w-full border rounded-2xl px-5 py-4 min-h-28" placeholder="Thông báo admin" />
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
                    <input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) imageToBase64(file, value => setSettings({ ...settings, bankQrUrl: value })); }} className="w-full border rounded-2xl px-5 py-4" />
                    {settings.bankQrUrl && <button type="button" onClick={() => setSettings({ ...settings, bankQrUrl: "" })} className="mt-3 bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">Xóa ảnh QR</button>}
                  </div>

                  <textarea value={settings.topupNote || ""} onChange={e => setSettings({ ...settings, topupNote: e.target.value })} className="w-full border rounded-2xl px-5 py-4 min-h-28" placeholder="Ghi chú nạp tiền" />
                </div>

                <button disabled={busy} onClick={saveSettings} className="bg-indigo-600 disabled:bg-slate-400 text-white rounded-2xl px-6 py-4 font-black w-fit">Lưu cài đặt</button>
              </div>
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white rounded-2xl px-5 py-3 shadow font-bold max-w-[90vw] text-center">
      {children}
    </div>
  );
}

function Nav({ label, id, tab, setTab }: { label: string; id: string; tab: string; setTab: (id: string) => void }) {
  return (
    <button onClick={() => setTab(id)} className={`w-full rounded-2xl px-4 py-3 text-left font-bold mb-2 ${tab === id ? "bg-indigo-600" : "bg-slate-800"}`}>
      {label}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 shadow mb-6">
      <h1 className="text-2xl md:text-3xl font-black mb-5">{title}</h1>
      {children}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-100 rounded-2xl p-4">
      <b>{title}</b>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function TopupBox({ topup }: { topup: Topup }) {
  return (
    <div className="border rounded-2xl p-4">
      <h3 className="font-black">{money(topup.amount)}</h3>
      <p className="text-sm text-slate-500">Trạng thái: {topup.status} | {new Date(topup.createdAt).toLocaleString("vi-VN")}</p>
      {topup.note && <p className="mt-2 bg-slate-50 rounded-xl p-3">{topup.note}</p>}
    </div>
  );
}

function OrderBox({ order, isAdmin, users = [], onCheck, onReuse }: { order: Order; isAdmin: boolean; users?: User[]; onCheck: (order: Order) => void; onReuse: (order: Order) => void }) {
  const orderUser = users.find(u => u.id === order.userId);

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
          {order.status === "waiting" && <button onClick={() => onCheck(order)} className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold">Check OTP</button>}
          {order.provider === "codesim" && order.status === "done" && <button onClick={() => onReuse(order)} className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold">Thuê lại</button>}
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

      {order.sms && <pre className="mt-3 bg-slate-100 rounded-xl p-3 whitespace-pre-wrap text-sm overflow-x-auto">{order.sms}</pre>}
    </div>
  );
}

function AdminServiceBox({ service, onSave }: { service: Service; onSave: (service: Service, patch: Partial<Service>) => void }) {
  const [name, setName] = useState(service.name || "");
  const [price, setPrice] = useState(String(service.price || 0));
  const [note, setNote] = useState(service.note || "");

  useEffect(() => {
    setName(service.name || "");
    setPrice(String(service.price || 0));
    setNote(service.note || "");
  }, [service]);

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h3 className="font-black text-lg">{service.originalName || service.name}</h3>
          <p className="text-sm text-slate-500">
            Nguồn {service.provider} | ID {service.providerId} | API {money(service.providerCost)}
          </p>
          <p className={`font-bold mt-1 ${service.hidden ? "text-rose-600" : "text-emerald-600"}`}>{service.hidden ? "Đang ẩn" : "Đang hiện"}</p>
        </div>

        <button onClick={() => onSave(service, { hidden: !service.hidden })} className={`${service.hidden ? "bg-emerald-600" : "bg-rose-600"} text-white rounded-xl px-4 py-2 font-bold`}>
          {service.hidden ? "Bỏ ẩn" : "Ẩn"}
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_140px_1fr_auto] gap-2 mt-4">
        <input value={name} onChange={e => setName(e.target.value)} onBlur={() => name !== service.name && onSave(service, { name })} className="border rounded-xl px-3 py-2" placeholder="Tên hiển thị" />
        <input value={price} onChange={e => setPrice(e.target.value)} onBlur={() => Number(price) !== Number(service.price) && onSave(service, { price: Number(price) })} className="border rounded-xl px-3 py-2" placeholder="Giá bán" inputMode="numeric" />
        <input value={note} onChange={e => setNote(e.target.value)} onBlur={() => note !== (service.note || "") && onSave(service, { note })} className="border rounded-xl px-3 py-2" placeholder="Chú thích" />
        <label className="flex items-center gap-2 px-3 py-2">
          <input type="checkbox" checked={service.hidden} onChange={e => onSave(service, { hidden: e.target.checked })} />
          Ẩn
        </label>
      </div>
    </div>
  );
}
