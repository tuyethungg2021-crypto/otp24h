import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "otp24h";
const DATA_COLLECTION = "appdata";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 8000);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "azhung12";
const CHAY_API_BASE = "https://chaycodeso3.com/api";
const CODESIM_API_BASE = "https://apisim.codesim.net";

let mongoClient;
let mongoCollection;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const defaultData = {
  users: [
    {
      id: "admin-1",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      role: "admin",
      balance: 0,
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    siteName: "OTP 24H",
    logoText: "OTP",
    logoImage: "",
    background: "bg-slate-950",
    announcement: "Chào mừng bạn đến với OTP 24H.\nHệ thống thuê sim nhận mã tự động.",
    bannerImage: "",
    bankName: "TECHCOMBANK",
    bankAccountNumber: "MS00T07014613285196",
    bankBeneficiary: "NGUYEN VAN HUNG",
    bankQrUrl: "",
    topupNote: "Nội dung chuyển khoản: username của bạn.\nSau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt."
  },
  providerSettings: {
    chayApiKey: process.env.CHAYCODESO3_API_KEY || "248c26ea0cd1371009db5dd443339ca1",
    chayEnabled: true,
    codesimApiKey: process.env.CODESIM_API_KEY || "",
    codesimEnabled: true
  },
  serviceOverrides: {},
  orders: [],
  topups: [],
  dmxProducts: [],
  dmxOrders: []
};

const nowIso = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const money = (value) => Number(value || 0);
const publicUser = (user) => user ? ({ id: user.id, username: user.username, role: user.role, balance: Number(user.balance || 0), createdAt: user.createdAt }) : null;
const maskKey = (key = "") => key ? `${key.slice(0, 4)}***${key.slice(-4)}` : "";

async function getCollection() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI environment variable");
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoCollection = mongoClient.db(DB_NAME).collection(DATA_COLLECTION);
  }
  return mongoCollection;
}

async function readData() {
  const collection = await getCollection();
  let doc = await collection.findOne({ id: "main" });
  if (!doc) {
    doc = { id: "main", ...defaultData };
    await collection.insertOne(doc);
  }

  const data = {
    ...defaultData,
    ...doc,
    settings: { ...defaultData.settings, ...(doc.settings || {}) },
    providerSettings: { ...defaultData.providerSettings, ...(doc.providerSettings || {}) },
    users: Array.isArray(doc.users) ? doc.users : [],
    serviceOverrides: doc.serviceOverrides || {},
    orders: Array.isArray(doc.orders) ? doc.orders : [],
    topups: Array.isArray(doc.topups) ? doc.topups : [],
    dmxProducts: Array.isArray(doc.dmxProducts) ? doc.dmxProducts : [],
    dmxOrders: Array.isArray(doc.dmxOrders) ? doc.dmxOrders : []
  };

  let changed = false;
  let admin = data.users.find((u) => u.role === "admin") || data.users.find((u) => u.username === ADMIN_USERNAME);
  if (!admin) {
    data.users.unshift({ id: "admin-1", username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: "admin", balance: 0, createdAt: nowIso() });
    changed = true;
  }
  if (process.env.RESET_ADMIN_PASSWORD === "true") {
    admin = data.users.find((u) => u.role === "admin") || data.users[0];
    admin.username = ADMIN_USERNAME;
    admin.password = ADMIN_PASSWORD;
    admin.role = "admin";
    changed = true;
  }
  if (changed) await writeData(data);
  return data;
}

async function writeData(data) {
  const collection = await getCollection();
  await collection.updateOne({ id: "main" }, { $set: { ...data, id: "main", updatedAt: nowIso() } }, { upsert: true });
}

async function authAdmin(req, res, next) {
  try {
    const data = await readData();
    const userId = req.headers["x-user-id"] || req.query.userId || req.body?.userId;
    const user = data.users.find((u) => u.id === userId);
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Bạn không có quyền admin" });
    req.data = data;
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json, text/plain, */*", "User-Agent": "Mozilla/5.0 OTP24H" }
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: true, httpStatus: response.status, message: "API nguồn trả về dữ liệu không hợp lệ", rawPreview: text.slice(0, 300) };
    }
  } catch (error) {
    return { error: true, message: error.name === "AbortError" ? "API nguồn phản hồi quá lâu" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeChayServices(payload) {
  const list = Array.isArray(payload) ? payload : payload?.data || payload?.Data || payload?.services || [];
  return list.map((s) => {
    const providerId = String(s.id || s.ID || s.service_id || s.appId || s.app_id || s.code || s.key || "");
    const name = s.name || s.Name || s.title || s.appName || s.app_name || providerId;
    const providerCost = Number(s.price || s.Price || s.cost || s.amount || 0);
    return { id: `chay-${providerId}`, provider: "chay", providerId, sourceKey: `chay:${providerId}`, originalName: name, name, price: providerCost, providerCost, note: "" };
  }).filter((s) => s.providerId && s.name);
}

function normalizeCodeSimServices(payload) {
  const list = Array.isArray(payload) ? payload : payload?.data || payload?.Data || payload?.services || payload?.results || [];
  return list.map((s) => {
    const providerId = String(s.id || s.ID || s.service_id || s.appId || s.app_id || s.code || s.key || "");
    const name = s.name || s.Name || s.title || s.appName || s.app_name || providerId;
    const providerCost = Number(s.price || s.Price || s.cost || s.amount || 0);
    return { id: `codesim-${providerId}`, provider: "codesim", providerId, sourceKey: `codesim:${providerId}`, originalName: name, name, price: providerCost, providerCost, note: "" };
  }).filter((s) => s.providerId && s.name);
}

async function fetchProviderServices(data) {
  const ps = data.providerSettings || {};
  const jobs = [];
  if (ps.chayEnabled && ps.chayApiKey) jobs.push(getJson(`${CHAY_API_BASE}/service?apikey=${encodeURIComponent(ps.chayApiKey)}`).then((p) => ({ provider: "chay", payload: p })));
  if (ps.codesimEnabled && ps.codesimApiKey) jobs.push(getJson(`${CODESIM_API_BASE}/service?apikey=${encodeURIComponent(ps.codesimApiKey)}`).then((p) => ({ provider: "codesim", payload: p })));
  const results = await Promise.allSettled(jobs);
  const services = [];
  const errors = [];
  for (const r of results) {
    if (r.status !== "fulfilled") { errors.push(r.reason?.message || "API lỗi"); continue; }
    if (r.value.payload?.error) { errors.push(`${r.value.provider}: ${r.value.payload.message || "API lỗi"}`); continue; }
    services.push(...(r.value.provider === "chay" ? normalizeChayServices(r.value.payload) : normalizeCodeSimServices(r.value.payload)));
  }
  const merged = services.map((s) => {
    const override = data.serviceOverrides?.[s.sourceKey] || {};
    return { ...s, ...override, hidden: override.hidden !== undefined ? override.hidden : true, price: Number(override.price ?? s.price ?? 0) };
  });
  return { services: merged, errors };
}

async function rentFromProvider(data, sourceKey, carrier) {
  const [provider, providerId] = String(sourceKey).split(":");
  const ps = data.providerSettings || {};
  if (provider === "chay") {
    const url = `${CHAY_API_BASE}/rent?apikey=${encodeURIComponent(ps.chayApiKey)}&service=${encodeURIComponent(providerId)}&carrier=${encodeURIComponent(carrier || "")}`;
    return await getJson(url);
  }
  if (provider === "codesim") {
    const url = `${CODESIM_API_BASE}/rent?apikey=${encodeURIComponent(ps.codesimApiKey)}&service=${encodeURIComponent(providerId)}`;
    return await getJson(url);
  }
  return { error: true, message: "Nguồn dịch vụ không hợp lệ" };
}

async function checkProviderCode(data, order) {
  const ps = data.providerSettings || {};
  if (order.provider === "chay") {
    return await getJson(`${CHAY_API_BASE}/code?apikey=${encodeURIComponent(ps.chayApiKey)}&id=${encodeURIComponent(order.providerOrderId || order.requestId || order.id)}`);
  }
  if (order.provider === "codesim") {
    return await getJson(`${CODESIM_API_BASE}/code?apikey=${encodeURIComponent(ps.codesimApiKey)}&id=${encodeURIComponent(order.providerOrderId || order.requestId || order.id)}`);
  }
  return { error: true, message: "Nguồn đơn không hợp lệ" };
}

function extractRentInfo(api) {
  const data = api?.data || api?.Data || api?.result || api;
  return {
    requestId: String(data?.id || data?.ID || data?.request_id || data?.requestId || data?.order_id || ""),
    number: String(data?.number || data?.phone || data?.Phone || data?.phone_number || data?.sim || "")
  };
}

function extractCode(api) {
  const data = api?.data || api?.Data || api?.result || api;
  return data?.code || data?.Code || data?.otp || data?.OTP || data?.sms || data?.message || "";
}

app.get("/api/health", (req, res) => res.json({ ok: true, time: nowIso() }));

app.post("/api/login", async (req, res) => {
  try {
    const data = await readData();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const user = data.users.find((u) => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    res.json(publicUser(user));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/api/register", async (req, res) => {
  try {
    const data = await readData();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (username.length < 3 || password.length < 3) return res.status(400).json({ message: "Tài khoản và mật khẩu tối thiểu 3 ký tự" });
    if (data.users.some((u) => u.username === username)) return res.status(400).json({ message: "Tài khoản đã tồn tại" });
    const user = { id: id("user"), username, password, role: "user", balance: 0, createdAt: nowIso() };
    data.users.push(user);
    await writeData(data);
    res.json(publicUser(user));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/api/change-password", async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find((u) => u.id === req.body.userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    if (user.password !== req.body.oldPassword) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    user.password = String(req.body.newPassword || "");
    await writeData(data);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get("/api/settings", async (req, res) => { const data = await readData(); res.json(data.settings); });
app.put("/api/settings", authAdmin, async (req, res) => { req.data.settings = { ...req.data.settings, ...req.body }; await writeData(req.data); res.json(req.data.settings); });

app.get("/api/services", async (req, res) => {
  try {
    const data = await readData();
    const { services } = await fetchProviderServices(data);
    res.json(services.filter((s) => !s.hidden && Number(s.price || 0) > 0));
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get("/api/admin/services", authAdmin, async (req, res) => {
  const result = await fetchProviderServices(req.data);
  const counts = result.services.reduce((acc, s) => ({ ...acc, [s.provider]: (acc[s.provider] || 0) + 1 }), {});
  res.json({ sources: result.services, counts, errors: result.errors });
});

app.put("/api/admin/services/:key", authAdmin, async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  req.data.serviceOverrides[key] = { ...(req.data.serviceOverrides[key] || {}), ...req.body };
  await writeData(req.data);
  res.json(req.data.serviceOverrides[key]);
});

app.get("/api/admin/provider-settings", authAdmin, async (req, res) => {
  const ps = req.data.providerSettings;
  res.json({ chayEnabled: !!ps.chayEnabled, chayApiKeyMasked: maskKey(ps.chayApiKey), hasChayApiKey: !!ps.chayApiKey, codesimEnabled: !!ps.codesimEnabled, codesimApiKeyMasked: maskKey(ps.codesimApiKey), hasCodesimApiKey: !!ps.codesimApiKey });
});

app.put("/api/admin/provider-settings", authAdmin, async (req, res) => {
  const ps = req.data.providerSettings;
  ps.chayEnabled = !!req.body.chayEnabled;
  ps.codesimEnabled = !!req.body.codesimEnabled;
  if (req.body.chayApiKey) ps.chayApiKey = String(req.body.chayApiKey).trim();
  if (req.body.codesimApiKey) ps.codesimApiKey = String(req.body.codesimApiKey).trim();
  await writeData(req.data);
  res.json({ chayEnabled: !!ps.chayEnabled, chayApiKeyMasked: maskKey(ps.chayApiKey), hasChayApiKey: !!ps.chayApiKey, codesimEnabled: !!ps.codesimEnabled, codesimApiKeyMasked: maskKey(ps.codesimApiKey), hasCodesimApiKey: !!ps.codesimApiKey });
});

app.get("/api/admin/provider-test", authAdmin, async (req, res) => {
  const result = await fetchProviderServices(req.data);
  res.json({ ok: result.errors.length === 0, total: result.services.length, errors: result.errors });
});

app.get("/api/user-stats", authAdmin, async (req, res) => {
  const users = req.data.users.map((u) => {
    const totalTopup = req.data.topups.filter((t) => t.userId === u.id && t.status === "approved").reduce((a, t) => a + money(t.amount), 0);
    const totalOtp = req.data.orders.filter((o) => o.userId === u.id).reduce((a, o) => a + money(o.price), 0);
    const totalDmx = req.data.dmxOrders.filter((o) => o.userId === u.id).reduce((a, o) => a + money(o.price), 0);
    return { ...publicUser(u), totalTopup, totalUsed: totalOtp + totalDmx };
  });
  res.json(users);
});

app.post("/api/users/:id/adjust-balance", authAdmin, async (req, res) => {
  const user = req.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  user.balance = money(user.balance) + money(req.body.amount);
  await writeData(req.data);
  res.json(publicUser(user));
});

app.put("/api/users/:id", authAdmin, async (req, res) => {
  const user = req.data.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (req.body.password) user.password = String(req.body.password);
  await writeData(req.data);
  res.json(publicUser(user));
});

app.delete("/api/users/:id", authAdmin, async (req, res) => {
  req.data.users = req.data.users.filter((u) => u.id !== req.params.id || u.role === "admin");
  await writeData(req.data);
  res.json({ ok: true });
});

app.post("/api/orders", async (req, res) => {
  try {
    const data = await readData();
    const user = data.users.find((u) => u.id === req.body.userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    const sourceKey = req.body.appId;
    const { services } = await fetchProviderServices(data);
    const service = services.find((s) => s.sourceKey === sourceKey || s.id === sourceKey);
    if (!service || service.hidden) return res.status(400).json({ message: "Dịch vụ chưa được mở bán" });
    if (money(user.balance) < money(service.price)) return res.status(400).json({ message: "Số dư không đủ" });
    const api = await rentFromProvider(data, service.sourceKey, req.body.carrier);
    const info = extractRentInfo(api);
    if (api?.error || !info.number) return res.status(400).json({ message: api?.message || api?.Msg || "Không lấy được số từ API nguồn", api });
    user.balance = money(user.balance) - money(service.price);
    const order = { id: id("order"), userId: user.id, username: user.username, provider: service.provider, providerOrderId: info.requestId, serviceId: service.sourceKey, serviceName: service.name, number: info.number, carrier: req.body.carrier || "", price: money(service.price), status: "waiting", code: "", api, createdAt: nowIso() };
    data.orders.unshift(order);
    await writeData(data);
    res.json({ order, user: publicUser(user) });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get("/api/orders", async (req, res) => {
  const data = await readData();
  const user = data.users.find((u) => u.id === req.query.userId);
  if (!user) return res.json([]);
  const list = user.role === "admin" ? data.orders : data.orders.filter((o) => o.userId === user.id);
  res.json(list);
});

app.post("/api/orders/:id/check-code", async (req, res) => {
  try {
    const data = await readData();
    const order = data.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn" });
    const api = await checkProviderCode(data, order);
    const code = extractCode(api);
    if (code) { order.code = String(code); order.status = "done"; order.updatedAt = nowIso(); }
    await writeData(data);
    const user = data.users.find((u) => u.id === order.userId);
    res.json({ order, user: publicUser(user), api });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post("/api/orders/:id/reuse", async (req, res) => res.status(400).json({ message: "Chức năng thuê lại chưa hỗ trợ với API hiện tại" }));

app.get("/api/topups", async (req, res) => {
  const data = await readData();
  const user = data.users.find((u) => u.id === req.query.userId);
  if (!user) return res.json([]);
  res.json(user.role === "admin" ? data.topups : data.topups.filter((t) => t.userId === user.id));
});

app.post("/api/topups", async (req, res) => {
  const data = await readData();
  const user = data.users.find((u) => u.id === req.body.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  const topup = { id: id("topup"), userId: user.id, username: user.username, amount: money(req.body.amount), note: req.body.note || "", status: "pending", createdAt: nowIso() };
  data.topups.unshift(topup);
  await writeData(data);
  res.json(topup);
});

app.post("/api/topups/:id/approve", authAdmin, async (req, res) => {
  const topup = req.data.topups.find((t) => t.id === req.params.id);
  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
  if (topup.status !== "approved") {
    const user = req.data.users.find((u) => u.id === topup.userId);
    if (user) user.balance = money(user.balance) + money(topup.amount);
    topup.status = "approved"; topup.updatedAt = nowIso();
  }
  await writeData(req.data);
  res.json(topup);
});

app.post("/api/topups/:id/reject", authAdmin, async (req, res) => {
  const topup = req.data.topups.find((t) => t.id === req.params.id);
  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
  topup.status = "rejected"; topup.reason = req.body.reason || ""; topup.updatedAt = nowIso();
  await writeData(req.data);
  res.json(topup);
});

app.get("/api/dmx/products", async (req, res) => {
  const data = await readData();
  res.json(data.dmxProducts.filter((p) => !p.hidden && Number(p.stock || p.codes?.length || 0) > 0));
});
app.get("/api/admin/dmx/products", authAdmin, async (req, res) => res.json(req.data.dmxProducts));

app.post("/api/admin/dmx/products", authAdmin, async (req, res) => {
  const product = { id: id("dmx"), name: req.body.name || "Sản phẩm", price: money(req.body.price), category: req.body.category || "Chưa phân loại", bulkPricing: req.body.bulkPricing || [], image: req.body.image || "", note: req.body.note || "", codes: [], stock: 0, hidden: false, createdAt: nowIso() };
  req.data.dmxProducts.unshift(product);
  await writeData(req.data);
  res.json(product);
});

app.put("/api/admin/dmx/products/:id", authAdmin, async (req, res) => {
  const product = req.data.dmxProducts.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  Object.assign(product, req.body, { stock: product.codes?.length || product.stock || 0, updatedAt: nowIso() });
  await writeData(req.data);
  res.json(product);
});

app.delete("/api/admin/dmx/products/:id", authAdmin, async (req, res) => {
  req.data.dmxProducts = req.data.dmxProducts.filter((p) => p.id !== req.params.id);
  await writeData(req.data);
  res.json({ ok: true });
});

app.post("/api/admin/dmx/products/:id/codes", authAdmin, async (req, res) => {
  const product = req.data.dmxProducts.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  const codes = String(req.body.codes || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  product.codes = [...(product.codes || []), ...codes];
  product.stock = product.codes.length;
  await writeData(req.data);
  res.json({ added: codes.length, stock: product.stock });
});

app.delete("/api/admin/dmx/products/:id/codes", authAdmin, async (req, res) => {
  const product = req.data.dmxProducts.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  product.codes = []; product.stock = 0;
  await writeData(req.data);
  res.json({ ok: true });
});

function dmxUnitPrice(product, qty) {
  const tiers = [...(product.bulkPricing || [])].filter((t) => Number(t.minQty) <= qty).sort((a, b) => Number(b.minQty) - Number(a.minQty));
  return money(tiers[0]?.price || product.price);
}

app.post("/api/dmx/buy", async (req, res) => {
  const data = await readData();
  const user = data.users.find((u) => u.id === req.body.userId);
  const product = data.dmxProducts.find((p) => p.id === req.body.productId);
  const quantity = Math.max(1, Math.floor(Number(req.body.quantity || 1)));
  if (!user || !product) return res.status(404).json({ message: "Không tìm thấy user hoặc sản phẩm" });
  if ((product.codes || []).length < quantity) return res.status(400).json({ message: "Kho không đủ mã" });
  const unitPrice = dmxUnitPrice(product, quantity);
  const total = unitPrice * quantity;
  if (money(user.balance) < total) return res.status(400).json({ message: "Số dư không đủ" });
  const codes = product.codes.splice(0, quantity);
  product.stock = product.codes.length;
  user.balance = money(user.balance) - total;
  const order = { id: id("dmxorder"), userId: user.id, username: user.username, productId: product.id, productName: product.name, quantity, price: total, codes, code: codes[0] || "", image: product.image || "", note: product.note || "", createdAt: nowIso() };
  data.dmxOrders.unshift(order);
  await writeData(data);
  res.json({ order, user: publicUser(user) });
});

app.get("/api/dmx/orders", async (req, res) => {
  const data = await readData();
  const user = data.users.find((u) => u.id === req.query.userId);
  if (!user) return res.json([]);
  res.json(user.role === "admin" ? data.dmxOrders : data.dmxOrders.filter((o) => o.userId === user.id));
});

app.use(express.static(path.join(__dirname, "dist")));
// SPA fallback. Do not use app.get("*") because Express 5/path-to-regexp
// throws "Missing parameter name at index 1" on Render with newer dependencies.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API không tồn tại" });
  }
  return res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log(`OTP24H server running on port ${PORT}`));
