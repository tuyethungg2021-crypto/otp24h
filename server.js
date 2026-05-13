import express from "express";
import cors from "cors";
import path from "path";
import { MongoClient } from "mongodb";

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "otp24h";
const DATA_COLLECTION = "appdata";
const CHAY_API_BASE = "https://chaycodeso3.com/api";
const CODESIM_API_BASE = "https://apisim.codesim.net";
const HTTP_TIMEOUT_MS = 30000;
const SERVICE_CACHE_MS = 1000 * 60 * 5;
let mongoClient;
let mongoCollection;
let serviceCache = { key: "", expiresAt: 0, value: null };

const defaultData = {
  users: [{ id: "admin-1", username: "admin", password: "azhung12", role: "admin", balance: 0, createdAt: new Date().toISOString() }],
  settings: {
    siteName: "OTP 24H", logoText: "OTP", logoImage: "", background: "bg-slate-950",
    announcement: "Chào mừng bạn đến với OTP 24H.\nHệ thống thuê sim nhận mã tự động.", bannerImage: "",
    bankName: "TECHCOMBANK", bankAccountNumber: "MS00T07014613285196", bankBeneficiary: "NGUYEN VAN HUNG", bankQrUrl: "",
    topupNote: "Nội dung chuyển khoản: username của bạn.\nSau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt."
  },
  providerSettings: { chayApiKey: process.env.CHAYCODESO3_API_KEY || "248c26ea0cd1371009db5dd443339ca1", chayEnabled: true, codesimApiKey: process.env.CODESIM_API_KEY || "", codesimEnabled: true },
  serviceOverrides: {}, orders: [], topups: []
};

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const nowIso = () => new Date().toISOString();
const makeId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeName = (name) => String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").trim();
const maskKey = (key = "") => !key ? "" : key.length <= 14 ? "********" : key.slice(0, 8) + "..." + key.slice(-6);
const publicUser = (u) => { const { password, ...safe } = u; return safe; };
const getClientIp = (req) => req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
const getChayKey = (data) => data.providerSettings?.chayApiKey || process.env.CHAYCODESO3_API_KEY || "";
const getCodesimKey = (data) => data.providerSettings?.codesimApiKey || process.env.CODESIM_API_KEY || "";
const clearServiceCache = () => { serviceCache = { key: "", expiresAt: 0, value: null }; };

async function getCollection() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI. Add it in Render Environment.");
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    await mongoClient.connect();
    mongoCollection = mongoClient.db(DB_NAME).collection(DATA_COLLECTION);
    await mongoCollection.createIndex({ id: 1 }, { unique: true });
  }
  return mongoCollection;
}
async function readData() {
  const collection = await getCollection();
  let doc = await collection.findOne({ id: "main" });
  if (!doc) { doc = { id: "main", ...defaultData, createdAt: nowIso(), updatedAt: nowIso() }; await collection.insertOne(doc); }
  return { ...defaultData, ...doc, settings: { ...defaultData.settings, ...(doc.settings || {}) }, providerSettings: { ...defaultData.providerSettings, ...(doc.providerSettings || {}) }, users: doc.users || defaultData.users, serviceOverrides: doc.serviceOverrides || {}, orders: doc.orders || [], topups: doc.topups || [] };
}
async function writeData(data) {
  const collection = await getCollection();
  const { _id, ...clean } = data;
  await collection.updateOne({ id: "main" }, { $set: { ...clean, id: "main", updatedAt: nowIso() } }, { upsert: true });
}
async function requireAdmin(req, res, next) {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === req.headers["x-user-id"] && u.role === "admin");
    if (!user) return res.status(403).json({ message: "Bạn không có quyền admin" });
    req.data = data; req.admin = user; next();
  } catch (e) { res.status(500).json({ message: e.message || "Lỗi server" }); }
}
async function getJson(url, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal, headers: { Accept: "application/json, text/plain, */*", "User-Agent": "Mozilla/5.0 OTP24H" } });
    const text = await response.text(); let data;
    try { data = JSON.parse(text); } catch { data = { error: true, httpStatus: response.status, message: "API trả về dữ liệu không hợp lệ", rawPreview: text.slice(0, 500) }; }
    if (!response.ok && !data.httpStatus) data.httpStatus = response.status;
    return data;
  } catch (e) {
    if (e.name === "AbortError") return { error: true, timeout: true, message: "API nguồn phản hồi quá lâu" };
    return { error: true, message: e.message || "Không gọi được API nguồn" };
  } finally { clearTimeout(timer); }
}
async function callChay(data, params) {
  const apiKey = getChayKey(data);
  if (!apiKey) return { ResponseCode: 400, Msg: "Chưa cấu hình chaycodeso3 API key", Result: null };
  const url = new URL(CHAY_API_BASE); url.searchParams.set("apik", apiKey);
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v)); });
  return getJson(url);
}
async function callCodesim(data, pathName, params = {}) {
  const apiKey = getCodesimKey(data);
  if (!apiKey) return { status: 400, message: "Chưa cấu hình CodeSim API key", data: null };
  const url = new URL(CODESIM_API_BASE + pathName); url.searchParams.set("api_key", apiKey);
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v)); });
  return getJson(url);
}
const isChayOk = (api) => api && Number(api.ResponseCode) === 0;
const isCodesimOk = (api) => api && Number(api.status) === 200;
const serviceFromChay = (raw) => ({ id: "chay-" + normalizeName(raw.Name || raw.Id), sourceKey: `chaycodeso3:${raw.Id}`, provider: "chaycodeso3", providerId: raw.Id, originalName: raw.Name, name: raw.Name, providerCost: Number(raw.Cost || 0), price: Number(raw.Cost || 0), hidden: true });
const serviceFromCodesim = (raw) => ({ id: `codesim-${raw.id}`, sourceKey: `codesim:${raw.id}`, provider: "codesim", providerId: raw.id, originalName: raw.name, name: raw.name, providerCost: Number(raw.price || 0), price: Number(raw.price || 0), hidden: true });
const applyOverride = (s, overrides = {}) => { const c = overrides[s.sourceKey] || {}; return { ...s, name: c.name || s.originalName, price: c.price !== undefined ? Number(c.price) : s.providerCost, hidden: c.hidden !== undefined ? Boolean(c.hidden) : true, note: c.note || "" }; };
async function getChayServices(data) { if (!data.providerSettings?.chayEnabled) return { services: [], error: null }; const api = await callChay(data, { act: "app" }); if (!isChayOk(api)) return { services: [], error: api }; return { services: (api.Result || []).map(serviceFromChay), error: null }; }
async function getCodesimServices(data) { if (!data.providerSettings?.codesimEnabled) return { services: [], error: null }; const api = await callCodesim(data, "/service/get_service_by_api_key"); if (!isCodesimOk(api)) return { services: [], error: api }; return { services: (api.data || []).map(serviceFromCodesim), error: null }; }
function serviceCacheKey(data) { return JSON.stringify({ chayEnabled: !!data.providerSettings?.chayEnabled, codesimEnabled: !!data.providerSettings?.codesimEnabled, chayKey: getChayKey(data) ? "1" : "0", codesimKey: getCodesimKey(data) ? "1" : "0" }); }
async function getAllServices(data, force = false) {
  const key = serviceCacheKey(data); if (!force && serviceCache.value && serviceCache.key === key && Date.now() < serviceCache.expiresAt) return serviceCache.value;
  const [chay, codesim] = await Promise.all([getChayServices(data), getCodesimServices(data)]);
  const value = { services: [...chay.services, ...codesim.services], errors: [chay.error ? { provider: "chaycodeso3", error: chay.error } : null, codesim.error ? { provider: "codesim", error: codesim.error } : null].filter(Boolean) };
  serviceCache = { key, expiresAt: Date.now() + SERVICE_CACHE_MS, value }; return value;
}
const findUser = (data, id) => data.users.find(u => u.id === id);

app.get("/health", (req, res) => res.json({ ok: true, service: "otp24h", time: nowIso() }));
app.get("/api/db-status", async (req, res) => { try { await getCollection(); res.json({ ok: true, db: DB_NAME }); } catch (e) { res.status(500).json({ ok: false, message: e.message }); } });
app.get("/api/settings", async (req, res) => res.json((await readData()).settings));
app.put("/api/settings", requireAdmin, async (req, res) => { const d = req.data; d.settings = { ...d.settings, ...req.body }; await writeData(d); res.json(d.settings); });
app.get("/api/admin/provider-settings", requireAdmin, async (req, res) => { const d = req.data; res.json({ chayEnabled: !!d.providerSettings?.chayEnabled, chayApiKeyMasked: maskKey(getChayKey(d)), hasChayApiKey: !!getChayKey(d), codesimEnabled: !!d.providerSettings?.codesimEnabled, codesimApiKeyMasked: maskKey(getCodesimKey(d)), hasCodesimApiKey: !!getCodesimKey(d) }); });
app.put("/api/admin/provider-settings", requireAdmin, async (req, res) => { const d = req.data; d.providerSettings = { ...(d.providerSettings || {}), chayEnabled: req.body.chayEnabled !== undefined ? Boolean(req.body.chayEnabled) : !!d.providerSettings?.chayEnabled, codesimEnabled: req.body.codesimEnabled !== undefined ? Boolean(req.body.codesimEnabled) : !!d.providerSettings?.codesimEnabled }; if (String(req.body.chayApiKey || "").trim()) d.providerSettings.chayApiKey = String(req.body.chayApiKey).trim(); if (String(req.body.codesimApiKey || "").trim()) d.providerSettings.codesimApiKey = String(req.body.codesimApiKey).trim(); clearServiceCache(); await writeData(d); res.json({ chayEnabled: !!d.providerSettings.chayEnabled, chayApiKeyMasked: maskKey(d.providerSettings.chayApiKey), hasChayApiKey: !!d.providerSettings.chayApiKey, codesimEnabled: !!d.providerSettings.codesimEnabled, codesimApiKeyMasked: maskKey(d.providerSettings.codesimApiKey), hasCodesimApiKey: !!d.providerSettings.codesimApiKey }); });
app.get("/api/admin/provider-test", requireAdmin, async (req, res) => {
  const data = req.data;
  const [chayResult, codesimResult] = await Promise.allSettled([callChay(data, { act: "account" }), callCodesim(data, "/yourself/information-by-api-key")]);
  const chay = chayResult.status === "fulfilled" ? chayResult.value : { error: true, message: chayResult.reason?.message || "Không gọi được chaycodeso3" };
  const codesim = codesimResult.status === "fulfilled" ? codesimResult.value : { error: true, message: codesimResult.reason?.message || "Không gọi được CodeSim" };
  res.json({ ok: isChayOk(chay) && isCodesimOk(codesim), chaycodeso3: { ok: isChayOk(chay), data: chay }, codesim: { ok: isCodesimOk(codesim), data: codesim } });
});
app.post("/api/register", async (req, res) => { const { username, password } = req.body; const cleanUsername = String(username || "").trim(); if (!cleanUsername || !password) return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" }); const d = await readData(); if (d.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) return res.status(409).json({ message: "Tài khoản đã tồn tại" }); const user = { id: makeId("u"), username: cleanUsername, password: String(password), role: "user", balance: 0, createdAt: nowIso(), registerIp: getClientIp(req) }; d.users.push(user); await writeData(d); res.json(publicUser(user)); });
app.post("/api/login", async (req, res) => { const cleanUsername = String(req.body.username || "").trim().toLowerCase(); const cleanPassword = String(req.body.password || ""); const d = await readData(); const user = d.users.find(u => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword); if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" }); res.json(publicUser(user)); });
app.post("/api/change-password", async (req, res) => { const d = await readData(); const user = findUser(d, req.body.userId); if (!user) return res.status(404).json({ message: "Không tìm thấy user" }); if (user.password !== req.body.oldPassword) return res.status(400).json({ message: "Mật khẩu cũ không đúng" }); user.password = String(req.body.newPassword || ""); await writeData(d); res.json({ message: "Đổi mật khẩu thành công" }); });
app.get("/api/user-stats", requireAdmin, async (req, res) => { const d = req.data; res.json(d.users.map(user => ({ ...publicUser(user), totalTopup: d.topups.filter(t => t.userId === user.id && t.status === "approved").reduce((s, t) => s + Number(t.amount || 0), 0), totalUsed: d.orders.filter(o => o.userId === user.id && o.status !== "canceled" && !(o.status === "expired" && o.refunded)).reduce((s, o) => s + Number(o.price || 0), 0), balance: Number(user.balance || 0) }))); });
app.post("/api/users/:id/adjust-balance", requireAdmin, async (req, res) => { const d = req.data; const u = findUser(d, req.params.id); if (!u) return res.status(404).json({ message: "Không tìm thấy user" }); u.balance = Math.max(0, Number(u.balance || 0) + Number(req.body.amount || 0)); await writeData(d); res.json(publicUser(u)); });
app.put("/api/users/:id", requireAdmin, async (req, res) => { const d = req.data; const u = findUser(d, req.params.id); if (!u) return res.status(404).json({ message: "Không tìm thấy user" }); if (req.body.password) u.password = String(req.body.password); if (req.body.balance !== undefined) u.balance = Math.max(0, Number(req.body.balance)); await writeData(d); res.json(publicUser(u)); });
app.delete("/api/users/:id", requireAdmin, async (req, res) => { const d = req.data; const u = findUser(d, req.params.id); if (!u) return res.status(404).json({ message: "Không tìm thấy user" }); if (u.role === "admin") return res.status(400).json({ message: "Không thể xóa admin" }); d.users = d.users.filter(x => x.id !== req.params.id); await writeData(d); res.json({ success: true }); });
app.get("/api/services", async (req, res) => { const d = await readData(); const { services, errors } = await getAllServices(d); const list = services.map(s => applyOverride(s, d.serviceOverrides)).filter(s => !s.hidden).sort((a, b) => a.name.localeCompare(b.name)); if (!list.length && errors.length) return res.status(502).json({ message: "Không tải được dịch vụ từ API nguồn", errors }); res.json(list); });
app.get("/api/admin/services", requireAdmin, async (req, res) => { const d = req.data; const { services, errors } = await getAllServices(d, req.query.force === "1"); const list = services.map(s => applyOverride(s, d.serviceOverrides)).sort((a, b) => a.name.localeCompare(b.name)); res.json({ sources: list, errors, counts: { chaycodeso3: list.filter(s => s.provider === "chaycodeso3").length, codesim: list.filter(s => s.provider === "codesim").length, visible: list.filter(s => !s.hidden).length, hidden: list.filter(s => s.hidden).length, total: list.length } }); });
app.put("/api/admin/services/:id", requireAdmin, async (req, res) => { const d = req.data; const id = String(req.params.id); d.serviceOverrides[id] = { ...(d.serviceOverrides[id] || {}), ...req.body }; await writeData(d); res.json(d.serviceOverrides[id]); });
app.post("/api/orders", async (req, res) => { const { userId, appId, carrier, prefix, sendsms, number, networkId } = req.body; const d = await readData(); const user = findUser(d, userId); if (!user) return res.status(404).json({ message: "Không tìm thấy user" }); const { services, errors } = await getAllServices(d); const service = services.map(s => applyOverride(s, d.serviceOverrides)).find(s => String(s.sourceKey) === String(appId) || String(s.id) === String(appId)); if (!service) return res.status(404).json({ message: "Dịch vụ không tồn tại", errors }); if (service.hidden) return res.status(400).json({ message: "Dịch vụ đang bị ẩn" }); if (Number(user.balance) < Number(service.price)) return res.status(400).json({ message: "Số dư user không đủ" }); let api, order; if (service.provider === "codesim") { api = await callCodesim(d, "/sim/get_sim", { service_id: service.providerId, network_id: networkId, phone: prefix || number }); if (!isCodesimOk(api) || !api.data?.phone) return res.status(400).json({ message: api.message || "Không lấy được số CodeSim", api }); user.balance -= Number(service.price); order = { id: makeId("o"), provider: "codesim", sourceKey: service.sourceKey, providerQueueId: api.data.otpId, providerSimId: api.data.simId, userId, appId: service.sourceKey, providerServiceId: service.providerId, appName: service.name, carrier: carrier || "CodeSim", number: api.data.phone, providerCost: Number(api.data.payment || service.providerCost), price: service.price, status: "waiting", code: "", sms: "", refunded: false, createdAt: nowIso() }; } else { api = await callChay(d, { act: "number", appId: service.providerId, carrier, prefix, sendsms: sendsms ? 1 : undefined, number }); if (!isChayOk(api)) return res.status(400).json({ message: api.Msg || "Không lấy được số", api }); user.balance -= Number(service.price); order = { id: makeId("o"), provider: "chaycodeso3", sourceKey: service.sourceKey, providerQueueId: api.Result.Id, providerSimId: api.Result.Id, userId, appId: service.sourceKey, providerServiceId: service.providerId, appName: service.name, carrier: carrier || "Tất cả", number: api.Result.Number, providerCost: Number(api.Result.Cost || service.providerCost), price: service.price, status: "waiting", code: "", sms: "", refunded: false, createdAt: nowIso() }; } d.orders.unshift(order); await writeData(d); res.json({ order, user: publicUser(user), api }); });
app.get("/api/orders", async (req, res) => { const d = await readData(); const user = findUser(d, req.query.userId); if (!user) return res.status(404).json({ message: "Không tìm thấy user" }); res.json((user.role === "admin" ? d.orders : d.orders.filter(o => o.userId === user.id)).slice(0, 300)); });
app.post("/api/orders/:id/check-code", async (req, res) => { const d = await readData(); const o = d.orders.find(x => x.id === req.params.id); if (!o) return res.status(404).json({ message: "Không tìm thấy order" }); let api, updatedUser = null; if (o.status !== "waiting") return res.json({ order: o, api: { message: "Order không còn chờ OTP" }, user: null }); if (o.provider === "codesim") { api = await callCodesim(d, "/otp/get_otp_by_phone_api_key", { otp_id: o.providerQueueId }); if (isCodesimOk(api) && api.data?.code) { o.status = "done"; o.code = api.data.code || ""; o.sms = api.data.content || ""; } } else { api = await callChay(d, { act: "code", id: o.providerQueueId }); if (api.ResponseCode === 0) { o.status = "done"; o.code = api.Result?.Code || ""; o.sms = api.Result?.SMS || ""; } else if (api.ResponseCode === 2) { o.status = "expired"; if (!o.refunded) { const u = findUser(d, o.userId); if (u) { u.balance = Number(u.balance || 0) + Number(o.price || 0); updatedUser = publicUser(u); } o.refunded = true; o.refundedAt = nowIso(); o.refundReason = "expired_no_otp"; } } } o.lastCheckedAt = nowIso(); await writeData(d); res.json({ order: o, api, user: updatedUser }); });
app.post("/api/orders/:id/cancel", async (req, res) => { const d = await readData(); const o = d.orders.find(x => x.id === req.params.id); if (!o) return res.status(404).json({ message: "Không tìm thấy order" }); if (o.status !== "waiting") return res.status(400).json({ message: "Order không còn trạng thái chờ" }); const api = o.provider === "codesim" ? await callCodesim(d, `/sim/cancel_api_key/${o.providerSimId}`) : await callChay(d, { act: "expired", id: o.providerQueueId }); const ok = o.provider === "codesim" ? isCodesimOk(api) : api.ResponseCode === 0; let updatedUser = null; if (ok && !o.refunded) { const u = findUser(d, o.userId); if (u) { u.balance = Number(u.balance || 0) + Number(o.price || 0); updatedUser = publicUser(u); } o.refunded = true; o.refundedAt = nowIso(); o.refundReason = "user_cancel"; o.status = "canceled"; } await writeData(d); res.json({ order: o, api, user: updatedUser }); });
app.post("/api/topups", async (req, res) => { const d = await readData(); const u = findUser(d, req.body.userId); const money = Number(req.body.amount || 0); if (!u) return res.status(404).json({ message: "Không tìm thấy user" }); if (!money || money <= 0) return res.status(400).json({ message: "Số tiền nạp không hợp lệ" }); const t = { id: makeId("t"), userId: u.id, username: u.username, amount: money, note: req.body.note || "", status: "pending", createdAt: nowIso() }; d.topups.unshift(t); await writeData(d); res.json(t); });
app.get("/api/topups", async (req, res) => { const d = await readData(); const u = findUser(d, req.query.userId); if (!u) return res.status(404).json({ message: "Không tìm thấy user" }); res.json(u.role === "admin" ? d.topups : d.topups.filter(t => t.userId === u.id)); });
app.post("/api/topups/:id/approve", requireAdmin, async (req, res) => { const d = req.data; const t = d.topups.find(x => x.id === req.params.id); if (!t) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" }); if (t.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã xử lý rồi" }); const u = findUser(d, t.userId); if (!u) return res.status(404).json({ message: "Không tìm thấy user" }); u.balance = Number(u.balance || 0) + Number(t.amount || 0); t.status = "approved"; t.approvedAt = nowIso(); t.approvedBy = req.admin.username; await writeData(d); res.json({ topup: t, user: publicUser(u) }); });
app.post("/api/topups/:id/reject", requireAdmin, async (req, res) => { const d = req.data; const t = d.topups.find(x => x.id === req.params.id); if (!t) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" }); t.status = "rejected"; t.rejectedAt = nowIso(); t.rejectedBy = req.admin.username; t.rejectReason = req.body.reason || ""; await writeData(d); res.json(t); });

app.use((error, req, res, next) => { console.error(error); res.status(500).json({ message: error.message || "Lỗi server" }); });
const distPath = path.resolve("dist");
app.use(express.static(distPath, { maxAge: "1h", etag: true }));
app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, "index.html")));
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});
app.listen(PORT, () => console.log("Server running on port " + PORT));
