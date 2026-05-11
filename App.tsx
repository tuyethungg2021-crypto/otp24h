import React, { useEffect, useMemo, useState } from "react";

type User = { id: string; username: string; role: "admin" | "user"; balance: number; totalTopup?: number; totalUsed?: number };
type Settings = any;
type Service = { id: string; provider: string; providerId: string; sourceKey: string; originalName?: string; name: string; price: number; providerCost?: number; hidden?: boolean; note?: string };
type Order = any;
type Topup = any;
type DmxProduct = any;
type DmxOrder = any;

const defaultSettings = {
  siteName: "OTP 24H",
  logoText: "OTP",
  logoImage: "",
  announcement: "Chào mừng bạn đến với OTP 24H.",
  bannerImage: "",
  bankName: "TECHCOMBANK",
  bankAccountNumber: "MS00T07014613285196",
  bankBeneficiary: "NGUYEN VAN HUNG",
  bankQrUrl: "",
  topupNote: "Nội dung chuyển khoản: username của bạn."
};

const carriers = ["", "Viettel", "Mobi", "Vina", "VNMB", "ITelecom"];
const tabsUser = ["services", "orders", "dmx", "topup"];
const tabsAdmin = ["adminTopups", "users", "adminServices", "adminDmx", "api", "settings"];
const tabName: Record<string, string> = {
  services: "Thuê OTP", orders: "Đơn OTP", dmx: "Voucher DMX", topup: "Nạp tiền",
  adminTopups: "Duyệt nạp", users: "User", adminServices: "Dịch vụ", adminDmx: "Kho DMX", api: "API", settings: "Cài đặt"
};
const money = (n: number) => Number(n || 0).toLocaleString("vi-VN") + "đ";

async function api(path: string, options: any = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
  return data;
}
function parseBulk(text: string) {
  return String(text || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(line => {
    const [minQty, price] = line.split(/[=|: ,]+/).map(Number);
    return { minQty, price };
  }).filter(x => x.minQty > 1 && x.price > 0);
}
function bulkText(items: any[] = []) { return items.map(x => `${x.minQty}=${x.price}`).join("\n"); }
function unitPrice(product: DmxProduct, qty: number) {
  const tier = [...(product.bulkPricing || [])].filter((x: any) => Number(x.minQty) <= qty).sort((a: any, b: any) => Number(b.minQty) - Number(a.minQty))[0];
  return Number(tier?.price || product.price || 0);
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem("otp24h_user") || "null"); } catch { return null; } });
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [services, setServices] = useState<Service[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dmxProducts, setDmxProducts] = useState<DmxProduct[]>([]);
  const [dmxOrders, setDmxOrders] = useState<DmxOrder[]>([]);
  const [providerSettings, setProviderSettings] = useState<any>({});
  const [providerTest, setProviderTest] = useState<any>(null);
  const [tab, setTab] = useState("services");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [carrier, setCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [chayApiKey, setChayApiKey] = useState("");
  const [codesimApiKey, setCodesimApiKey] = useState("");
  const [dmxSearch, setDmxSearch] = useState("");
  const [newDmx, setNewDmx] = useState({ name: "", price: "", category: "", bulkPricing: "", image: "", note: "" });

  const isAdmin = user?.role === "admin";
  const headers = user ? { "Content-Type": "application/json", "x-user-id": user.id } : { "Content-Type": "application/json" };
  const show = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 3500); };

  const loadSettings = async () => { try { setSettings({ ...defaultSettings, ...(await api("/api/settings")) }); } catch (e: any) { show(e.message); } };
  const loadServices = async () => { try { setServices(await api("/api/services")); } catch (e: any) { show(e.message); } };
  const loadOrders = async () => { if (user) setOrders(await api(`/api/orders?userId=${user.id}`)); };
  const loadTopups = async () => { if (user) setTopups(await api(`/api/topups?userId=${user.id}`)); };
  const loadUsers = async () => { if (isAdmin) setUsers(await api("/api/user-stats", { headers })); };
  const loadAdminServices = async () => { if (isAdmin) { const data = await api("/api/admin/services", { headers }); setAdminServices(data.sources || []); } };
  const loadProviderSettings = async () => { if (isAdmin) setProviderSettings(await api("/api/admin/provider-settings", { headers })); };
  const loadDmxProducts = async () => { setDmxProducts(await api(isAdmin ? "/api/admin/dmx/products" : "/api/dmx/products", isAdmin ? { headers } : {})); };
  const loadDmxOrders = async () => { if (user) setDmxOrders(await api(`/api/dmx/orders?userId=${user.id}`)); };

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { if (!user) return; localStorage.setItem("otp24h_user", JSON.stringify(user)); loadOrders(); loadTopups(); loadDmxProducts(); loadDmxOrders(); if (isAdmin) { loadUsers(); loadAdminServices(); loadProviderSettings(); } }, [user, tab]);
  useEffect(() => { if (user && tab === "services") loadServices(); }, [user, tab]);
  useEffect(() => { if (!user) return; const t = window.setInterval(async () => { try { const list = await api(`/api/orders?userId=${user.id}`); setOrders(list); for (const o of list.filter((x: any) => x.status === "waiting")) await fetch(`/api/orders/${o.id}/check-code`, { method: "POST" }); } catch {} }, 8000); return () => window.clearInterval(t); }, [user]);

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const data = await api(isLogin ? "/api/login" : "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (isLogin) { setUser(data); localStorage.setItem("otp24h_user", JSON.stringify(data)); show("Đăng nhập thành công"); }
      else { show("Đăng ký thành công, hãy đăng nhập"); setIsLogin(true); }
    } catch (e: any) { show(e.message); } finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem("otp24h_user"); setUser(null); setTab("services"); };

  const rentNumber = async (s: Service) => {
    if (!user || !confirm(`Thuê ${s.name} giá ${money(s.price)}?`)) return; setBusy(true);
    try { const data = await api("/api/orders", { method: "POST", headers, body: JSON.stringify({ userId: user.id, appId: s.sourceKey || s.id, carrier }) }); setUser(data.user); await loadOrders(); show("Đã lấy số thành công"); }
    catch (e: any) { show(e.message); } finally { setBusy(false); }
  };
  const checkCode = async (o: Order) => { try { const data = await api(`/api/orders/${o.id}/check-code`, { method: "POST" }); if (data.user) setUser(data.user); await loadOrders(); show(data.order?.code ? "Đã có OTP" : "Đang chờ OTP"); } catch (e: any) { show(e.message); } };
  const createTopup = async () => { try { await api("/api/topups", { method: "POST", headers, body: JSON.stringify({ userId: user?.id, amount: Number(topupAmount), note: topupNote }) }); setTopupAmount(""); setTopupNote(""); await loadTopups(); show("Đã gửi yêu cầu nạp"); } catch (e: any) { show(e.message); } };
  const approveTopup = async (t: Topup) => { try { await api(`/api/topups/${t.id}/approve`, { method: "POST", headers }); await loadTopups(); await loadUsers(); show("Đã cộng tiền"); } catch (e: any) { show(e.message); } };
  const rejectTopup = async (t: Topup) => { try { await api(`/api/topups/${t.id}/reject`, { method: "POST", headers, body: JSON.stringify({ reason: prompt("Lý do", "") || "" }) }); await loadTopups(); show("Đã từ chối"); } catch (e: any) { show(e.message); } };
  const adjustBalance = async (u: User) => { const amount = prompt(`Cộng/trừ tiền cho ${u.username}`); if (!amount) return; try { await api(`/api/users/${u.id}/adjust-balance`, { method: "POST", headers, body: JSON.stringify({ amount: Number(amount) }) }); await loadUsers(); show("Đã cập nhật số dư"); } catch (e: any) { show(e.message); } };
  const changePass = async (u: User) => { const password = prompt(`Mật khẩu mới cho ${u.username}`); if (!password) return; try { await api(`/api/users/${u.id}`, { method: "PUT", headers, body: JSON.stringify({ password }) }); show("Đã đổi mật khẩu"); } catch (e: any) { show(e.message); } };
  const deleteUser = async (u: User) => { if (!confirm(`Xóa user ${u.username}?`)) return; try { await api(`/api/users/${u.id}`, { method: "DELETE", headers }); await loadUsers(); show("Đã xóa user"); } catch (e: any) { show(e.message); } };
  const saveService = async (s: Service, patch: any) => { try { await api(`/api/admin/services/${encodeURIComponent(s.sourceKey || s.id)}`, { method: "PUT", headers, body: JSON.stringify(patch) }); await loadAdminServices(); await loadServices(); show("Đã lưu dịch vụ"); } catch (e: any) { show(e.message); } };
  const saveSettings = async () => { try { await api("/api/settings", { method: "PUT", headers, body: JSON.stringify(settings) }); show("Đã lưu cài đặt"); } catch (e: any) { show(e.message); } };
  const saveProviderSettings = async () => { try { const data = await api("/api/admin/provider-settings", { method: "PUT", headers, body: JSON.stringify({ ...providerSettings, chayApiKey, codesimApiKey }) }); setProviderSettings(data); setChayApiKey(""); setCodesimApiKey(""); show("Đã lưu API"); } catch (e: any) { show(e.message); } };
  const buyDmx = async (p: DmxProduct) => { const q = Number(prompt("Nhập số lượng", "1") || 0); if (!q) return; try { const total = unitPrice(p, q) * q; if (!confirm(`Mua ${q} mã, tổng ${money(total)}?`)) return; const data = await api("/api/dmx/buy", { method: "POST", headers, body: JSON.stringify({ userId: user?.id, productId: p.id, quantity: q }) }); setUser(data.user); await loadDmxProducts(); await loadDmxOrders(); show("Mua thành công"); } catch (e: any) { show(e.message); } };
  const createDmxProduct = async () => { try { await api("/api/admin/dmx/products", { method: "POST", headers, body: JSON.stringify({ name: newDmx.name, price: Number(newDmx.price), category: newDmx.category, bulkPricing: parseBulk(newDmx.bulkPricing), image: newDmx.image, note: newDmx.note }) }); setNewDmx({ name: "", price: "", category: "", bulkPricing: "", image: "", note: "" }); await loadDmxProducts(); show("Đã tạo sản phẩm"); } catch (e: any) { show(e.message); } };
  const updateDmx = async (p: DmxProduct, patch: any) => { try { await api(`/api/admin/dmx/products/${p.id}`, { method: "PUT", headers, body: JSON.stringify(patch) }); await loadDmxProducts(); show("Đã lưu sản phẩm"); } catch (e: any) { show(e.message); } };
  const uploadCodes = async (p: DmxProduct) => { const codes = prompt("Nhập voucher, mỗi dòng 1 mã"); if (!codes) return; try { const d = await api(`/api/admin/dmx/products/${p.id}/codes`, { method: "POST", headers, body: JSON.stringify({ codes }) }); await loadDmxProducts(); show(`Đã thêm ${d.added} mã`); } catch (e: any) { show(e.message); } };
  const imageFile = (file: File, cb: (v: string) => void) => { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsDataURL(file); };

  const filteredServices = useMemo(() => services.filter(s => `${s.name}`.toLowerCase().includes(search.toLowerCase())), [services, search]);
  const filteredAdminServices = useMemo(() => adminServices.filter(s => `${s.name} ${s.originalName} ${s.providerId} ${s.provider}`.toLowerCase().includes(search.toLowerCase())), [adminServices, search]);
  const filteredDmx = useMemo(() => dmxProducts.filter(p => `${p.name} ${p.category} ${p.note}`.toLowerCase().includes(dmxSearch.toLowerCase())), [dmxProducts, dmxSearch]);

  if (!user) return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-900"><div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
    {notice && <div className="mb-4 rounded-xl bg-amber-100 p-3 font-bold">{notice}</div>}
    <div className="text-center mb-6"><div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl">{settings.logoText}</div><h1 className="text-3xl font-black mt-3">{settings.siteName}</h1><p>{isLogin ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}</p></div>
    <form onSubmit={submitAuth}><input value={username} onChange={e => setUsername(e.target.value)} className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Tài khoản"/><input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border rounded-2xl px-5 py-4 mb-4" placeholder="Mật khẩu"/><button disabled={busy} className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black">{busy ? "Đang xử lý..." : isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}</button></form>
    <button onClick={() => setIsLogin(!isLogin)} className="mt-5 w-full text-indigo-600 font-bold">{isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}</button><p className="text-center text-sm mt-4 text-slate-500">Admin mặc định: admin / azhung12</p>
  </div></div>;

  return <div className="min-h-screen bg-slate-100 text-slate-900"><div className="max-w-7xl mx-auto p-4">
    {notice && <div className="fixed top-4 right-4 z-50 bg-amber-100 border border-amber-200 rounded-2xl px-5 py-3 font-bold shadow">{notice}</div>}
    <div className="bg-slate-950 text-white rounded-3xl p-5 mb-5 flex flex-col md:flex-row gap-4 justify-between"><div><h1 className="text-3xl font-black">{settings.siteName}</h1><p>{user.username} · Số dư: <b>{money(user.balance)}</b></p></div><div className="flex gap-2 flex-wrap"><button onClick={() => { const oldPassword = prompt("Mật khẩu cũ"); const newPassword = prompt("Mật khẩu mới"); if (oldPassword && newPassword) api("/api/change-password", { method: "POST", headers, body: JSON.stringify({ userId: user.id, oldPassword, newPassword }) }).then(() => show("Đã đổi mật khẩu")).catch((e: any) => show(e.message)); }} className="bg-white/10 rounded-xl px-4 py-2">Đổi mật khẩu</button><button onClick={logout} className="bg-rose-600 rounded-xl px-4 py-2 font-bold">Đăng xuất</button></div></div>
    <div className="flex gap-2 overflow-x-auto mb-5">{[...tabsUser, ...(isAdmin ? tabsAdmin : [])].map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 whitespace-nowrap font-bold ${tab === t ? "bg-indigo-600 text-white" : "bg-white"}`}>{tabName[t]}</button>)}</div>
    {settings.announcement && <div className="bg-white rounded-2xl p-4 mb-4 whitespace-pre-wrap">{settings.announcement}</div>}{settings.bannerImage && <img src={settings.bannerImage} className="w-full rounded-3xl mb-4"/>}

    {tab === "services" && <section><div className="flex flex-col md:flex-row gap-3 mb-4"><button onClick={loadServices} className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold">Tải dịch vụ</button><input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border rounded-2xl px-5 py-3" placeholder="Tìm dịch vụ..."/><select value={carrier} onChange={e => setCarrier(e.target.value)} className="border rounded-2xl px-5 py-3">{carriers.map(c => <option key={c} value={c}>{c || "Tất cả nhà mạng"}</option>)}</select></div><div className="grid md:grid-cols-3 gap-4">{filteredServices.map(s => <div key={s.sourceKey} className="bg-white rounded-3xl p-5 shadow"><h3 className="font-black text-lg">{s.name}</h3><p className="text-sm text-slate-500">{s.note || "Dịch vụ nhận OTP tự động"}</p><div className="text-2xl font-black my-3">{money(s.price)}</div><button disabled={busy} onClick={() => rentNumber(s)} className="w-full bg-indigo-600 text-white rounded-2xl py-3 font-black">Thuê số</button></div>)}</div></section>}
    {tab === "orders" && <section className="space-y-3">{orders.map(o => <div key={o.id} className="bg-white rounded-2xl p-4"><b>{o.serviceName}</b><p>Số: <b>{o.number}</b> · Giá: {money(o.price)} · Trạng thái: {o.status}</p>{o.code && <pre className="bg-emerald-50 p-3 rounded-xl mt-2 font-black">{o.code}</pre>}<button onClick={() => checkCode(o)} className="mt-3 bg-slate-900 text-white rounded-xl px-4 py-2">Check OTP</button></div>)}</section>}
    {tab === "topup" && <section className="grid md:grid-cols-2 gap-4"><div className="bg-white rounded-3xl p-5"><h2 className="text-xl font-black">Thông tin chuyển khoản</h2><p>Ngân hàng: <b>{settings.bankName}</b></p><p>Số TK: <b>{settings.bankAccountNumber}</b></p><p>Chủ TK: <b>{settings.bankBeneficiary}</b></p><p>Nội dung: <b>{user.username}</b></p>{settings.bankQrUrl && <img src={settings.bankQrUrl} className="max-w-xs mt-3 rounded-2xl"/>}<p className="whitespace-pre-wrap mt-3">{settings.topupNote}</p></div><div className="bg-white rounded-3xl p-5"><h2 className="text-xl font-black">Tạo yêu cầu nạp</h2><input value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="w-full border rounded-2xl px-5 py-3 my-3" placeholder="Số tiền"/><input value={topupNote} onChange={e => setTopupNote(e.target.value)} className="w-full border rounded-2xl px-5 py-3 mb-3" placeholder="Ghi chú"/><button onClick={createTopup} className="bg-indigo-600 text-white rounded-2xl px-5 py-3 font-bold">Gửi yêu cầu</button><div className="mt-5 space-y-2">{topups.map(t => <div key={t.id} className="border rounded-xl p-3">{money(t.amount)} · {t.status}</div>)}</div></div></section>}
    {tab === "dmx" && <section><div className="flex gap-3 mb-4"><button onClick={loadDmxProducts} className="bg-slate-900 text-white rounded-2xl px-5 py-3">Tải lại</button><input value={dmxSearch} onChange={e => setDmxSearch(e.target.value)} className="flex-1 border rounded-2xl px-5 py-3" placeholder="Tìm voucher..."/></div><div className="grid md:grid-cols-3 gap-4">{filteredDmx.map(p => <div key={p.id} className="bg-white rounded-3xl p-5">{p.image && <img src={p.image} className="w-full rounded-2xl mb-3"/>}<h3 className="font-black">{p.name}</h3><p>{p.category} · Còn {p.stock || p.codes?.length || 0}</p><p className="whitespace-pre-wrap text-sm">{p.note}</p><div className="text-2xl font-black my-3">{money(p.price)}</div><button onClick={() => buyDmx(p)} className="w-full bg-indigo-600 text-white rounded-2xl py-3 font-black">Mua ngay</button></div>)}</div><h2 className="text-xl font-black mt-6 mb-3">Lịch sử mua</h2>{dmxOrders.map(o => <pre key={o.id} className="bg-white rounded-2xl p-4 whitespace-pre-wrap mb-3">{o.productName}\nSố lượng: {o.quantity} · Tổng: {money(o.price)}\n{(o.codes || [o.code]).join("\n")}</pre>)}</section>}

    {tab === "adminTopups" && isAdmin && <section className="space-y-3">{topups.map(t => <div key={t.id} className="bg-white rounded-2xl p-4"><b>{t.username}</b> muốn nạp <b>{money(t.amount)}</b><p>{t.status} · {t.note}</p>{t.status === "pending" && <div className="flex gap-2 mt-2"><button onClick={() => approveTopup(t)} className="bg-emerald-600 text-white rounded-xl px-4 py-2">Duyệt</button><button onClick={() => rejectTopup(t)} className="bg-rose-600 text-white rounded-xl px-4 py-2">Từ chối</button></div>}</div>)}</section>}
    {tab === "users" && isAdmin && <section className="bg-white rounded-3xl p-4 overflow-x-auto"><table className="w-full"><thead><tr><th>User</th><th>Role</th><th>Đã nạp</th><th>Đã dùng</th><th>Còn lại</th><th></th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-t"><td>{u.username}</td><td>{u.role}</td><td>{money(u.totalTopup || 0)}</td><td>{money(u.totalUsed || 0)}</td><td>{money(u.balance)}</td><td className="space-x-2"><button onClick={() => adjustBalance(u)} className="bg-indigo-600 text-white rounded px-2 py-1">Tiền</button><button onClick={() => changePass(u)} className="bg-amber-500 text-white rounded px-2 py-1">Pass</button><button onClick={() => deleteUser(u)} className="bg-rose-600 text-white rounded px-2 py-1">Xóa</button></td></tr>)}</tbody></table></section>}
    {tab === "adminServices" && isAdmin && <section><div className="flex gap-3 mb-4"><button onClick={loadAdminServices} className="bg-slate-900 text-white rounded-2xl px-5 py-3">Tải API</button><input value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border rounded-2xl px-5 py-3" placeholder="Tìm dịch vụ..."/></div><div className="space-y-3">{filteredAdminServices.map(s => <div key={s.sourceKey} className="bg-white rounded-2xl p-4 grid md:grid-cols-5 gap-2 items-center"><div><b>{s.originalName || s.name}</b><p className="text-sm">{s.provider} · {s.providerId} · API {money(s.providerCost || 0)}</p></div><input defaultValue={s.name} onBlur={e => saveService(s, { name: e.target.value })} className="border rounded-xl px-3 py-2"/><input defaultValue={s.price} onBlur={e => saveService(s, { price: Number(e.target.value) })} className="border rounded-xl px-3 py-2"/><input defaultValue={s.note || ""} onBlur={e => saveService(s, { note: e.target.value })} className="border rounded-xl px-3 py-2"/><button onClick={() => saveService(s, { hidden: !s.hidden })} className={`${s.hidden ? "bg-emerald-600" : "bg-rose-600"} text-white rounded-xl px-3 py-2 font-bold`}>{s.hidden ? "Bỏ ẩn" : "Ẩn"}</button></div>)}</div></section>}
    {tab === "api" && isAdmin && <section className="bg-white rounded-3xl p-5 space-y-3"><h2 className="text-xl font-black">Cấu hình API</h2><label><input type="checkbox" checked={!!providerSettings.chayEnabled} onChange={e => setProviderSettings({ ...providerSettings, chayEnabled: e.target.checked })}/> Bật Chaycodeso3 ({providerSettings.chayApiKeyMasked || "chưa có key"})</label><input value={chayApiKey} onChange={e => setChayApiKey(e.target.value)} className="w-full border rounded-2xl px-5 py-3" placeholder="Chay API key mới"/><label><input type="checkbox" checked={!!providerSettings.codesimEnabled} onChange={e => setProviderSettings({ ...providerSettings, codesimEnabled: e.target.checked })}/> Bật CodeSim ({providerSettings.codesimApiKeyMasked || "chưa có key"})</label><input value={codesimApiKey} onChange={e => setCodesimApiKey(e.target.value)} className="w-full border rounded-2xl px-5 py-3" placeholder="CodeSim API key mới"/><div className="flex gap-2"><button onClick={saveProviderSettings} className="bg-indigo-600 text-white rounded-2xl px-5 py-3">Lưu API</button><button onClick={async () => { const d = await api("/api/admin/provider-test", { headers }); setProviderTest(d); }} className="bg-slate-900 text-white rounded-2xl px-5 py-3">Test API</button></div>{providerTest && <pre className="bg-slate-100 rounded-2xl p-4 overflow-auto">{JSON.stringify(providerTest, null, 2)}</pre>}</section>}
    {tab === "settings" && isAdmin && <section className="bg-white rounded-3xl p-5 space-y-3"><h2 className="text-xl font-black">Cài đặt web</h2>{["siteName","logoText","logoImage","announcement","bannerImage","bankName","bankAccountNumber","bankBeneficiary","bankQrUrl","topupNote"].map(k => <textarea key={k} value={settings[k] || ""} onChange={e => setSettings({ ...settings, [k]: e.target.value })} className="w-full border rounded-2xl px-5 py-3" placeholder={k}/>) }<button onClick={saveSettings} className="bg-indigo-600 text-white rounded-2xl px-5 py-3 font-bold">Lưu cài đặt</button></section>}
    {tab === "adminDmx" && isAdmin && <section><div className="bg-white rounded-3xl p-5 mb-4 grid md:grid-cols-2 gap-3"><input value={newDmx.name} onChange={e => setNewDmx({ ...newDmx, name: e.target.value })} className="border rounded-2xl px-5 py-3" placeholder="Tên sản phẩm"/><input value={newDmx.price} onChange={e => setNewDmx({ ...newDmx, price: e.target.value })} className="border rounded-2xl px-5 py-3" placeholder="Giá"/><input value={newDmx.category} onChange={e => setNewDmx({ ...newDmx, category: e.target.value })} className="border rounded-2xl px-5 py-3" placeholder="Phân loại"/><textarea value={newDmx.bulkPricing} onChange={e => setNewDmx({ ...newDmx, bulkPricing: e.target.value })} className="border rounded-2xl px-5 py-3" placeholder={'Giá sỉ: 2=9000\n5=8000'}/><textarea value={newDmx.note} onChange={e => setNewDmx({ ...newDmx, note: e.target.value })} className="border rounded-2xl px-5 py-3" placeholder="Ghi chú"/><input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) imageFile(f, v => setNewDmx({ ...newDmx, image: v })); }} className="border rounded-2xl px-5 py-3"/><button onClick={createDmxProduct} className="bg-indigo-600 text-white rounded-2xl px-5 py-3 font-bold">Tạo sản phẩm</button></div><div className="space-y-3">{dmxProducts.map(p => <div key={p.id} className="bg-white rounded-2xl p-4 grid md:grid-cols-6 gap-2"><input defaultValue={p.name} onBlur={e => updateDmx(p, { name: e.target.value })} className="border rounded-xl px-3 py-2"/><input defaultValue={p.price} onBlur={e => updateDmx(p, { price: Number(e.target.value) })} className="border rounded-xl px-3 py-2"/><input defaultValue={p.category} onBlur={e => updateDmx(p, { category: e.target.value })} className="border rounded-xl px-3 py-2"/><textarea defaultValue={bulkText(p.bulkPricing)} onBlur={e => updateDmx(p, { bulkPricing: parseBulk(e.target.value) })} className="border rounded-xl px-3 py-2"/><button onClick={() => uploadCodes(p)} className="bg-slate-900 text-white rounded-xl px-3 py-2">Thêm mã ({p.stock || 0})</button><button onClick={() => updateDmx(p, { hidden: !p.hidden })} className="bg-amber-500 text-white rounded-xl px-3 py-2">{p.hidden ? "Hiện" : "Ẩn"}</button></div>)}</div></section>}
  </div></div>;
}
