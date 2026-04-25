import React, { useEffect, useMemo, useState } from "react";

type User = { id: string; username: string; role: "admin" | "user"; balance: number };
type Service = { id: string; originalName: string; name: string; providerCost: number; price: number; hidden: boolean; note?: string };
type Order = { id: string; appName: string; number: string; price: number; status: string; code?: string; sms?: string; createdAt: string };
type Settings = { siteName: string; logoText: string; background: string; announcement: string; bannerImage: string };

const defaultSettings: Settings = {
  siteName: "OTP 24H",
  logoText: "OTP",
  background: "bg-slate-950",
  announcement: "",
  bannerImage: ""
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [tab, setTab] = useState("services");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = user ? { "Content-Type": "application/json", "x-user-id": user.id } : { "Content-Type": "application/json" };
  const isAdmin = user?.role === "admin";

  const show = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const loadSettings = async () => {
    const res = await fetch("/api/settings");
    if (res.ok) setSettings(await res.json());
  };

  const loadServices = async () => {
    const res = await fetch("/api/services");
    if (res.ok) setServices(await res.json());
    else show("Không tải được danh sách dịch vụ");
  };

  const loadUsers = async () => {
    if (!user || !isAdmin) return;
    const res = await fetch("/api/users", { headers });
    if (res.ok) setUsers(await res.json());
  };

  const loadAdminServices = async () => {
    if (!user || !isAdmin) return;
    const res = await fetch("/api/admin/services", { headers });
    if (res.ok) setAdminServices(await res.json());
    else show("Không tải được dịch vụ admin");
  };

  const loadOrders = async () => {
    if (!user) return;
    const res = await fetch(`/api/orders?userId=${user.id}`);
    if (res.ok) setOrders(await res.json());
  };

  useEffect(() => {
    loadSettings();
    loadServices();
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadUsers();
      loadAdminServices();
    }
  }, [user, tab]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
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
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) return show(data.message || "Đăng ký thất bại");
      show("Đăng ký thành công, hãy đăng nhập");
      setIsLogin(true);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => setUser(null);

  const rentNumber = async (service: Service) => {
    if (!user) return;
    if (!confirm(`Thuê ${service.name} giá ${service.price.toLocaleString("vi-VN")}đ?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/orders", { method: "POST", headers, body: JSON.stringify({ userId: user.id, appId: service.id }) });
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
    await loadOrders();
    show(data.api?.Msg || "Đã check code");
  };

  const cancelOrder = async (order: Order) => {
    const res = await fetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Không hủy được");
    await loadOrders();
    show(data.api?.Msg || "Đã hủy");
  };

  const adjustBalance = async (target: User) => {
    const amount = prompt(`Nhập số tiền cộng/trừ cho ${target.username}`);
    if (!amount) return;
    const res = await fetch(`/api/users/${target.id}/adjust-balance`, { method: "POST", headers, body: JSON.stringify({ amount: Number(amount) }) });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi sửa tiền");
    await loadUsers();
    show("Đã cập nhật số dư");
  };

  const changeUserPass = async (target: User) => {
    const newPassword = prompt(`Mật khẩu mới cho ${target.username}`);
    if (!newPassword) return;
    const res = await fetch(`/api/users/${target.id}`, { method: "PUT", headers, body: JSON.stringify({ password: newPassword }) });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi đổi mật khẩu");
    show("Đã đổi mật khẩu");
  };

  const deleteUser = async (target: User) => {
    if (!confirm(`Xóa user ${target.username}?`)) return;
    const res = await fetch(`/api/users/${target.id}`, { method: "DELETE", headers });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi xóa user");
    await loadUsers();
    show("Đã xóa user");
  };

  const saveService = async (service: Service, patch: any) => {
    const res = await fetch(`/api/admin/services/${service.id}`, { method: "PUT", headers, body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi lưu dịch vụ");
    await loadAdminServices();
    await loadServices();
    show("Đã lưu dịch vụ");
  };

  const saveSettings = async () => {
    const res = await fetch("/api/settings", { method: "PUT", headers, body: JSON.stringify(settings) });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi lưu cài đặt");
    show("Đã lưu cài đặt");
  };

  const changeOwnPassword = async () => {
    if (!user) return;
    const oldPassword = prompt("Nhập mật khẩu cũ");
    const newPassword = prompt("Nhập mật khẩu mới");
    if (!oldPassword || !newPassword) return;
    const res = await fetch("/api/change-password", { method: "POST", headers, body: JSON.stringify({ userId: user.id, oldPassword, newPassword }) });
    const data = await res.json();
    if (!res.ok) return show(data.message || "Lỗi đổi mật khẩu");
    show("Đã đổi mật khẩu");
  };

  const filteredServices = useMemo(() => services.filter(s => s.name.toLowerCase().includes(search.toLowerCase())), [services, search]);

  if (!user) {
    return (
      <div className={`min-h-screen ${settings.background} flex items-center justify-center p-4`}>
        {notice && <div className="fixed top-5 right-5 bg-white rounded-2xl px-5 py-3 shadow-xl font-bold z-50">{notice}</div>}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black">{settings.logoText}</div>
            <h1 className="text-3xl font-black mt-4">{settings.siteName}</h1>
            <p className="text-slate-500 mt-2">{isLogin ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}</p>
          </div>
          <form onSubmit={isLogin ? login : register} className="space-y-4">
            <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100" placeholder="Tài khoản" value={username} onChange={e => setUsername(e.target.value)} />
            <input className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100" placeholder="Mật khẩu" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button disabled={busy} className="w-full rounded-2xl bg-indigo-600 text-white py-4 font-black hover:bg-indigo-700 disabled:opacity-60">{busy ? "Đang xử lý..." : isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}</button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="mt-5 w-full text-indigo-600 font-bold">{isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}</button>
          <div className="mt-6 bg-slate-100 rounded-2xl p-4 text-sm">Admin: <b>admin</b> / <b>azhung12</b></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      {notice && <div className="fixed top-5 right-5 bg-white rounded-2xl px-5 py-3 shadow-xl font-bold z-50">{notice}</div>}
      <aside className="w-72 bg-slate-950 text-white p-6 min-h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black">{settings.logoText}</div>
          <div><h2 className="text-xl font-black">{settings.siteName}</h2><p className="text-xs text-slate-400">{user.username}</p></div>
        </div>
        <div className="space-y-2">
          <Nav label="Dịch vụ" id="services" tab={tab} setTab={setTab} />
          <Nav label="Lịch sử thuê" id="orders" tab={tab} setTab={setTab} />
          <button onClick={changeOwnPassword} className="w-full rounded-2xl px-4 py-3 text-left font-bold bg-slate-800">Đổi mật khẩu</button>
          {isAdmin && <>
            <Nav label="Quản lý user" id="users" tab={tab} setTab={setTab} />
            <Nav label="Quản lý dịch vụ" id="adminServices" tab={tab} setTab={setTab} />
            <Nav label="Giao diện" id="settings" tab={tab} setTab={setTab} />
          </>}
          <button onClick={logout} className="w-full rounded-2xl px-4 py-3 text-left font-bold bg-rose-600">Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="grid md:grid-cols-3 gap-5 mb-6">
          <Card title="Tài khoản" value={user.username} />
          <Card title="Vai trò" value={user.role} />
          <Card title="Số dư" value={`${user.balance.toLocaleString("vi-VN")}đ`} />
        </div>

        {settings.announcement && <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6 font-semibold">{settings.announcement}</div>}
        {settings.bannerImage && <img src={settings.bannerImage} className="w-full max-h-72 object-cover rounded-3xl mb-6" />}

        {tab === "services" && <section>
          <div className="flex justify-between items-center mb-5"><h1 className="text-3xl font-black">Dịch vụ OTP</h1><button onClick={loadServices} className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold">Tải lại</button></div>
          <input className="w-full rounded-2xl border px-5 py-4 mb-5" placeholder="Tìm dịch vụ..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="grid md:grid-cols-3 gap-5">
            {filteredServices.map(s => <div key={s.id} className="bg-white rounded-3xl p-6 shadow">
              <h3 className="text-xl font-black">{s.name}</h3>
              <p className="text-slate-500 text-sm mt-1">ID: {s.id}</p>
              {s.note && <p className="text-sm mt-3 bg-slate-100 rounded-xl p-3">{s.note}</p>}
              <p className="text-2xl font-black text-indigo-600 mt-4">{s.price.toLocaleString("vi-VN")}đ</p>
              <button onClick={() => rentNumber(s)} className="mt-5 w-full bg-indigo-600 text-white rounded-2xl py-3 font-black">Thuê số</button>
            </div>)}
          </div>
        </section>}

        {tab === "orders" && <Panel title="Lịch sử thuê">
          <div className="space-y-3">{orders.map(o => <div key={o.id} className="border rounded-2xl p-4 flex justify-between items-center">
            <div><b>{o.appName}</b> - {o.number}<p className="text-sm text-slate-500">Trạng thái: {o.status} | Giá: {o.price.toLocaleString("vi-VN")}đ</p>{o.code && <p className="text-green-600 font-black">Code: {o.code}</p>}{o.sms && <p className="text-sm">{o.sms}</p>}</div>
            <div className="flex gap-2"><button onClick={() => checkCode(o)} className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold">Check code</button>{o.status === "waiting" && <button onClick={() => cancelOrder(o)} className="bg-rose-600 text-white rounded-xl px-4 py-2 font-bold">Hủy</button>}</div>
          </div>)}</div>
        </Panel>}

        {tab === "users" && isAdmin && <Panel title="Quản lý user">
          <table className="w-full text-left"><thead><tr className="border-b"><th className="py-3">User</th><th>Role</th><th>Số dư</th><th>Hành động</th></tr></thead><tbody>
            {users.map(u => <tr key={u.id} className="border-b"><td className="py-4 font-bold">{u.username}</td><td>{u.role}</td><td>{u.balance.toLocaleString("vi-VN")}đ</td><td className="flex gap-2 py-3"><button onClick={() => adjustBalance(u)} className="bg-indigo-600 text-white rounded-xl px-3 py-2 text-sm font-bold">Cộng/trừ</button><button onClick={() => changeUserPass(u)} className="bg-amber-500 text-white rounded-xl px-3 py-2 text-sm font-bold">Đổi pass</button><button onClick={() => deleteUser(u)} className="bg-rose-600 text-white rounded-xl px-3 py-2 text-sm font-bold">Xóa</button></td></tr>)}
          </tbody></table>
        </Panel>}

        {tab === "adminServices" && isAdmin && <Panel title="Quản lý dịch vụ">
          <button onClick={loadAdminServices} className="mb-4 bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold">Tải dịch vụ API</button>
          <div className="space-y-3">{adminServices.map(s => <div key={s.id} className="border rounded-2xl p-4 grid md:grid-cols-6 gap-3 items-center">
            <div><b>{s.originalName}</b><p className="text-xs text-slate-500">ID {s.id} | API {s.providerCost}đ</p></div>
            <input defaultValue={s.name} onBlur={e => saveService(s, { name: e.target.value })} className="border rounded-xl px-3 py-2" placeholder="Tên hiển thị" />
            <input defaultValue={s.price} onBlur={e => saveService(s, { price: Number(e.target.value) })} className="border rounded-xl px-3 py-2" placeholder="Giá bán" />
            <input defaultValue={s.note || ""} onBlur={e => saveService(s, { note: e.target.value })} className="border rounded-xl px-3 py-2" placeholder="Chú thích" />
            <label className="flex gap-2 items-center"><input type="checkbox" defaultChecked={s.hidden} onChange={e => saveService(s, { hidden: e.target.checked })} />Ẩn</label>
            <button onClick={() => saveService(s, { hidden: !s.hidden })} className="bg-indigo-600 text-white rounded-xl px-3 py-2 font-bold">Lưu</button>
          </div>)}</div>
        </Panel>}

        {tab === "settings" && isAdmin && <Panel title="Cài đặt giao diện">
          <div className="space-y-4 max-w-3xl">
            <input value={settings.siteName} onChange={e => setSettings({ ...settings, siteName: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Tên web" />
            <input value={settings.logoText} onChange={e => setSettings({ ...settings, logoText: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Logo text" />
            <select value={settings.background} onChange={e => setSettings({ ...settings, background: e.target.value })} className="w-full border rounded-2xl px-5 py-4"><option value="bg-slate-950">Nền đen</option><option value="bg-indigo-950">Nền tím</option><option value="bg-blue-950">Nền xanh</option><option value="bg-emerald-950">Nền xanh lá</option></select>
            <textarea value={settings.announcement} onChange={e => setSettings({ ...settings, announcement: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Thông báo admin" />
            <input value={settings.bannerImage} onChange={e => setSettings({ ...settings, bannerImage: e.target.value })} className="w-full border rounded-2xl px-5 py-4" placeholder="Link ảnh thông báo/banner" />
            <button onClick={saveSettings} className="bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black">Lưu giao diện</button>
          </div>
        </Panel>}
      </main>
    </div>
  );
}

function Nav({ label, id, tab, setTab }: any) {
  return <button onClick={() => setTab(id)} className={`w-full rounded-2xl px-4 py-3 text-left font-bold ${tab === id ? "bg-indigo-600" : "bg-slate-800"}`}>{label}</button>;
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="bg-white rounded-3xl p-6 shadow"><p className="text-slate-500 text-sm">{title}</p><h2 className="text-2xl font-black">{value}</h2></div>;
}

function Panel({ title, children }: { title: string; children: any }) {
  return <div className="bg-white rounded-3xl p-6 shadow"><h1 className="text-3xl font-black mb-5">{title}</h1>{children}</div>;
}
