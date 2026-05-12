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
const HTTP_TIMEOUT_MS = 15000;
const SERVICE_CACHE_MS = 1000 * 60 * 5;

let mongoClient;
let mongoCollection;
let serviceCache = {
  key: "",
  expiresAt: 0,
  value: null,
};

const defaultData = {
  users: [
    {
      id: "admin-1",
      username: "admin",
      password: "azhung12",
      role: "admin",
      balance: 0,
      createdAt: new Date().toISOString(),
    },
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
    topupNote: "Nội dung chuyển khoản: username của bạn.\nSau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt.",
  },
  providerSettings: {
    chayApiKey: process.env.CHAYCODESO3_API_KEY || "248c26ea0cd1371009db5dd443339ca1",
    chayEnabled: true,
    codesimApiKey: process.env.CODESIM_API_KEY || "",
    codesimEnabled: true,
  },
  serviceOverrides: {},
  orders: [],
  topups: [],
};

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function maskKey(key = "") {
  if (!key) return "";
  if (key.length <= 14) return "********";
  return key.slice(0, 8) + "..." + key.slice(-6);
}

function publicUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function getClientIp(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
}

function getChayKey(data) {
  return data.providerSettings?.chayApiKey || process.env.CHAYCODESO3_API_KEY || "";
}

function getCodesimKey(data) {
  return data.providerSettings?.codesimApiKey || process.env.CODESIM_API_KEY || "";
}

function serviceCacheKey(data) {
  return JSON.stringify({
    chayEnabled: !!data.providerSettings?.chayEnabled,
    codesimEnabled: !!data.providerSettings?.codesimEnabled,
    chayKey: getChayKey(data) ? "1" : "0",
    codesimKey: getCodesimKey(data) ? "1" : "0",
  });
}

function clearServiceCache() {
  serviceCache = { key: "", expiresAt: 0, value: null };
}

async function getCollection() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI. Add it in Render Environment.");
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await mongoClient.connect();
    mongoCollection = mongoClient.db(DB_NAME).collection(DATA_COLLECTION);
    await mongoCollection.createIndex({ id: 1 }, { unique: true });
  }

  return mongoCollection;
}

async function readData() {
  const collection = await getCollection();
  let doc = await collection.findOne({ id: "main" });

  if (!doc) {
    doc = { id: "main", ...defaultData, createdAt: nowIso(), updatedAt: nowIso() };
    await collection.insertOne(doc);
  }

  return {
    ...defaultData,
    ...doc,
    settings: { ...defaultData.settings, ...(doc.settings || {}) },
    providerSettings: { ...defaultData.providerSettings, ...(doc.providerSettings || {}) },
    users: doc.users || defaultData.users,
    serviceOverrides: doc.serviceOverrides || {},
    orders: doc.orders || [],
    topups: doc.topups || [],
  };
}

async function writeData(data) {
  const collection = await getCollection();
  const { _id, ...clean } = data;
  await collection.updateOne(
    { id: "main" },
    { $set: { ...clean, id: "main", updatedAt: nowIso() } },
    { upsert: true }
  );
}

async function requireAdmin(req, res, next) {
  try {
    const data = await readData();
    const user = data.users.find(u => u.id === req.headers["x-user-id"] && u.role === "admin");

    if (!user) {
      return res.status(403).json({ message: "Bạn không có quyền admin" });
    }

    req.data = data;
    req.admin = user;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message || "Lỗi server" });
  }
}

async function getJson(url, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 OTP24H",
      },
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        error: true,
        httpStatus: response.status,
        contentType: response.headers.get("content-type"),
        message: "API trả về dữ liệu không hợp lệ",
        rawPreview: text.slice(0, 500),
      };
    }

    if (!response.ok && !data.httpStatus) {
      data.httpStatus = response.status;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      return { error: true, timeout: true, message: "API nguồn phản hồi quá lâu" };
    }
    return { error: true, message: error.message || "Không gọi được API nguồn" };
  } finally {
    clearTimeout(timer);
  }
}

async function callChay(data, params) {
  const apiKey = getChayKey(data);
  if (!apiKey) {
    return { ResponseCode: 400, Msg: "Chưa cấu hình chaycodeso3 API key", Result: null };
  }

  const url = new URL(CHAY_API_BASE);
  url.searchParams.set("apik", apiKey);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return getJson(url);
}

async function callCodesim(data, pathName, params = {}) {
  const apiKey = getCodesimKey(data);
  if (!apiKey) {
    return { status: 400, message: "Chưa cấu hình CodeSim API key", data: null };
  }

  const url = new URL(CODESIM_API_BASE + pathName);
  url.searchParams.set("api_key", apiKey);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return getJson(url);
}

function isChayOk(api) {
  return api && Number(api.ResponseCode) === 0;
}

function isCodesimOk(api) {
  return api && Number(api.status) === 200;
}

function serviceFromChay(raw) {
  return {
    id: "chay-" + normalizeName(raw.Name || raw.Id),
    sourceKey: `chaycodeso3:${raw.Id}`,
    provider: "chaycodeso3",
    providerId: raw.Id,
    originalName: raw.Name,
    name: raw.Name,
    providerCost: Number(raw.Cost || 0),
    price: Number(raw.Cost || 0),
    hidden: true,
  };
}

function serviceFromCodesim(raw) {
  return {
    id: `codesim-${raw.id}`,
    sourceKey: `codesim:${raw.id}`,
    provider: "codesim",
    providerId: raw.id,
    originalName: raw.name,
    name: raw.name,
    providerCost: Number(raw.price || 0),
    price: Number(raw.price || 0),
    hidden: true,
  };
}

function applyOverride(source, overrides = {}) {
  const custom = overrides[source.sourceKey] || {};
  return {
    ...source,
    name: custom.name || source.originalName,
    price: custom.price !== undefined ? Number(custom.price) : source.providerCost,
    hidden: custom.hidden !== undefined ? Boolean(custom.hidden) : true,
    note: custom.note || "",
  };
}

async function getChayServices(data) {
  if (!data.providerSettings?.chayEnabled) return { services: [], error: null };
  const api = await callChay(data, { act: "app" });
  if (!isChayOk(api)) return { services: [], error: api };
  return { services: (api.Result || []).map(serviceFromChay), error: null };
}

async function getCodesimServices(data) {
  if (!data.providerSettings?.codesimEnabled) return { services: [], error: null };
  const api = await callCodesim(data, "/service/get_service_by_api_key");
  if (!isCodesimOk(api)) return { services: [], error: api };
  return { services: (api.data || []).map(serviceFromCodesim), error: null };
}

async function getAllServices(data, force = false) {
  const key = serviceCacheKey(data);

  if (!force && serviceCache.value && serviceCache.key === key && Date.now() < serviceCache.expiresAt) {
    return serviceCache.value;
  }

  const [chay, codesim] = await Promise.all([getChayServices(data), getCodesimServices(data)]);
  const value = {
    services: [...(chay.services || []), ...(codesim.services || [])],
    errors: [
      chay.error ? { provider: "chaycodeso3", error: chay.error } : null,
      codesim.error ? { provider: "codesim", error: codesim.error } : null,
    ].filter(Boolean),
  };

  serviceCache = {
    key,
    expiresAt: Date.now() + SERVICE_CACHE_MS,
    value,
  };

  return value;
}

function findUser(data, userId) {
  return data.users.find(u => u.id === userId);
}

app.get("/health", async (req, res) => {
  res.status(200).json({ ok: true, service: "otp24h", time: nowIso() });
});

app.get("/api/db-status", async (req, res) => {
  try {
    await getCollection();
    res.json({ ok: true, db: DB_NAME });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/api/source-status", async (req, res) => {
  const data = await readData();
  const { services, errors } = await getAllServices(data);
  const all = services.map(s => applyOverride(s, data.serviceOverrides));

  res.json({
    ok: !errors.length,
    errors,
    total: all.length,
    visible: all.filter(s => !s.hidden).length,
    hidden: all.filter(s => s.hidden).length,
    cache: {
      active: !!serviceCache.value,
      expiresAt: serviceCache.expiresAt,
    },
  });
});

app.get("/api/settings", async (req, res) => {
  res.json((await readData()).settings);
});

app.put("/api/settings", requireAdmin, async (req, res) => {
  const data = req.data;
  data.settings = { ...data.settings, ...req.body };
  await writeData(data);
  res.json(data.settings);
});

app.get("/api/admin/provider-settings", requireAdmin, async (req, res) => {
  const data = req.data;
  res.json({
    chayEnabled: !!data.providerSettings?.chayEnabled,
    chayApiKeyMasked: maskKey(getChayKey(data)),
    hasChayApiKey: !!getChayKey(data),
    codesimEnabled: !!data.providerSettings?.codesimEnabled,
    codesimApiKeyMasked: maskKey(getCodesimKey(data)),
    hasCodesimApiKey: !!getCodesimKey(data),
  });
});

app.put("/api/admin/provider-settings", requireAdmin, async (req, res) => {
  const data = req.data;

  data.providerSettings = {
    ...(data.providerSettings || {}),
    chayEnabled: req.body.chayEnabled !== undefined ? Boolean(req.body.chayEnabled) : !!data.providerSettings?.chayEnabled,
    codesimEnabled: req.body.codesimEnabled !== undefined ? Boolean(req.body.codesimEnabled) : !!data.providerSettings?.codesimEnabled,
  };

  if (req.body.chayApiKey !== undefined && String(req.body.chayApiKey).trim()) {
    data.providerSettings.chayApiKey = String(req.body.chayApiKey).trim();
  }

  if (req.body.codesimApiKey !== undefined && String(req.body.codesimApiKey).trim()) {
    data.providerSettings.codesimApiKey = String(req.body.codesimApiKey).trim();
  }

  clearServiceCache();
  await writeData(data);

  res.json({
    chayEnabled: !!data.providerSettings.chayEnabled,
    chayApiKeyMasked: maskKey(data.providerSettings.chayApiKey),
    hasChayApiKey: !!data.providerSettings.chayApiKey,
    codesimEnabled: !!data.providerSettings.codesimEnabled,
    codesimApiKeyMasked: maskKey(data.providerSettings.codesimApiKey),
    hasCodesimApiKey: !!data.providerSettings.codesimApiKey,
  });
});

app.get("/api/admin/provider-test", requireAdmin, async (req, res) => {
  const data = req.data;
  const [chay, codesim] = await Promise.all([
    callChay(data, { act: "account" }),
    callCodesim(data, "/yourself/information-by-api-key"),
  ]);

  res.json({
    ok: isChayOk(chay) && isCodesimOk(codesim),
    chaycodeso3: { ok: isChayOk(chay), data: chay },
    codesim: { ok: isCodesimOk(codesim), data: codesim },
  });
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername || !password) {
    return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" });
  }

  const data = await readData();
  if (data.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
    return res.status(409).json({ message: "Tài khoản đã tồn tại" });
  }

  const user = {
    id: makeId("u"),
    username: cleanUsername,
    password: String(password),
    role: "user",
    balance: 0,
    createdAt: nowIso(),
    registerIp: getClientIp(req),
  };

  data.users.push(user);
  await writeData(data);
  res.json(publicUser(user));
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "");

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" });
  }

  const data = await readData();
  const user = data.users.find(u => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword);

  if (!user) {
    return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
  }

  res.json(publicUser(user));
});

app.post("/api/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const data = await readData();
  const user = findUser(data, userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.password !== oldPassword) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
  if (!newPassword) return res.status(400).json({ message: "Thiếu mật khẩu mới" });

  user.password = String(newPassword);
  await writeData(data);
  res.json({ message: "Đổi mật khẩu thành công" });
});

app.get("/api/me", async (req, res) => {
  const data = await readData();
  const user = findUser(data, req.query.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  res.json(publicUser(user));
});

app.get("/api/users", requireAdmin, async (req, res) => {
  res.json(req.data.users.map(publicUser));
});

app.get("/api/user-stats", requireAdmin, async (req, res) => {
  const data = req.data;
  const stats = data.users.map(user => {
    const approvedTopups = data.topups.filter(t => t.userId === user.id && t.status === "approved");
    const usedOrders = data.orders.filter(o => o.userId === user.id && o.status !== "canceled" && !(o.status === "expired" && o.refunded));

    return {
      ...publicUser(user),
      totalTopup: approvedTopups.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      totalUsed: usedOrders.reduce((sum, o) => sum + Number(o.price || 0), 0),
      balance: Number(user.balance || 0),
    };
  });

  res.json(stats);
});

app.post("/api/users/:id/adjust-balance", requireAdmin, async (req, res) => {
  const data = req.data;
  const user = findUser(data, req.params.id);
  const amount = Number(req.body.amount || 0);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (Number.isNaN(amount)) return res.status(400).json({ message: "Số tiền không hợp lệ" });

  user.balance = Math.max(0, Number(user.balance || 0) + amount);
  await writeData(data);
  res.json(publicUser(user));
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const user = findUser(data, req.params.id);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  if (req.body.password) user.password = String(req.body.password);
  if (req.body.balance !== undefined) user.balance = Math.max(0, Number(req.body.balance));

  await writeData(data);
  res.json(publicUser(user));
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const user = findUser(data, req.params.id);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.role === "admin") return res.status(400).json({ message: "Không thể xóa admin" });

  data.users = data.users.filter(u => u.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

app.get("/api/provider/account", requireAdmin, async (req, res) => {
  const data = req.data;
  const [chaycodeso3, codesim] = await Promise.all([
    callChay(data, { act: "account" }),
    callCodesim(data, "/yourself/information-by-api-key"),
  ]);

  res.json({ chaycodeso3, codesim });
});

app.get("/api/services", async (req, res) => {
  const data = await readData();
  const { services, errors } = await getAllServices(data);
  const decorated = services
    .map(s => applyOverride(s, data.serviceOverrides))
    .filter(s => !s.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (decorated.length === 0 && errors.length) {
    return res.status(502).json({ message: "Không tải được dịch vụ từ API nguồn", errors });
  }

  res.json(decorated);
});

app.get("/api/admin/services", requireAdmin, async (req, res) => {
  const data = req.data;
  const force = req.query.force === "1";
  const { services, errors } = await getAllServices(data, force);
  const decorated = services.map(s => applyOverride(s, data.serviceOverrides)).sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    sources: decorated,
    errors,
    counts: {
      chaycodeso3: decorated.filter(s => s.provider === "chaycodeso3").length,
      codesim: decorated.filter(s => s.provider === "codesim").length,
      visible: decorated.filter(s => !s.hidden).length,
      hidden: decorated.filter(s => s.hidden).length,
      total: decorated.length,
    },
  });
});

app.put("/api/admin/services/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const id = String(req.params.id);

  data.serviceOverrides[id] = {
    ...(data.serviceOverrides[id] || {}),
    ...req.body,
  };

  await writeData(data);
  res.json(data.serviceOverrides[id]);
});

app.post("/api/orders", async (req, res) => {
  const { userId, appId, carrier, prefix, sendsms, number, networkId } = req.body;
  const data = await readData();
  const user = findUser(data, userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const { services, errors } = await getAllServices(data);
  const service = services
    .map(s => applyOverride(s, data.serviceOverrides))
    .find(s => String(s.sourceKey) === String(appId) || String(s.id) === String(appId));

  if (!service) return res.status(404).json({ message: "Dịch vụ không tồn tại", errors });
  if (service.hidden) return res.status(400).json({ message: "Dịch vụ đang bị ẩn" });
  if (Number(user.balance || 0) < Number(service.price || 0)) {
    return res.status(400).json({ message: "Số dư user không đủ" });
  }

  let api;
  let order;

  if (service.provider === "codesim") {
    api = await callCodesim(data, "/sim/get_sim", {
      service_id: service.providerId,
      network_id: networkId,
      phone: prefix || number,
    });

    if (!isCodesimOk(api) || !api.data?.phone) {
      return res.status(400).json({ message: api.message || "Không lấy được số CodeSim", api });
    }

    user.balance = Number(user.balance || 0) - Number(service.price || 0);
    order = {
      id: makeId("o"),
      provider: "codesim",
      sourceKey: service.sourceKey,
      providerQueueId: api.data.otpId,
      providerSimId: api.data.simId,
      userId,
      appId: String(service.sourceKey),
      providerServiceId: service.providerId,
      appName: service.name,
      carrier: carrier || "CodeSim",
      number: api.data.phone,
      providerCost: Number(api.data.payment || service.providerCost),
      price: service.price,
      status: "waiting",
      code: "",
      sms: "",
      refunded: false,
      createdAt: nowIso(),
    };
  } else {
    api = await callChay(data, {
      act: "number",
      appId: service.providerId,
      carrier,
      prefix,
      sendsms: sendsms ? 1 : undefined,
      number,
    });

    if (!isChayOk(api)) {
      return res.status(400).json({ message: api.Msg || "Không lấy được số", api });
    }

    user.balance = Number(user.balance || 0) - Number(service.price || 0);
    order = {
      id: makeId("o"),
      provider: "chaycodeso3",
      sourceKey: service.sourceKey,
      providerQueueId: api.Result.Id,
      providerSimId: api.Result.Id,
      userId,
      appId: String(service.sourceKey),
      providerServiceId: service.providerId,
      appName: service.name,
      carrier: carrier || "Tất cả",
      number: api.Result.Number,
      providerCost: Number(api.Result.Cost || service.providerCost),
      price: service.price,
      status: "waiting",
      code: "",
      sms: "",
      refunded: false,
      createdAt: nowIso(),
    };
  }

  data.orders.unshift(order);
  await writeData(data);
  res.json({ order, user: publicUser(user), api });
});

app.get("/api/orders", async (req, res) => {
  const data = await readData();
  const user = findUser(data, req.query.userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const list = user.role === "admin" ? data.orders : data.orders.filter(o => o.userId === user.id);
  res.json(list.slice(0, 300));
});

app.post("/api/orders/:id/check-code", async (req, res) => {
  const data = await readData();
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });

  if (order.status !== "waiting") {
    return res.json({ order, api: { message: "Order không còn chờ OTP" }, user: null });
  }

  let api;
  let updatedUser = null;

  if (order.provider === "codesim") {
    api = await callCodesim(data, "/otp/get_otp_by_phone_api_key", {
      otp_id: order.providerQueueId,
    });

    if (isCodesimOk(api) && api.data?.code) {
      order.status = "done";
      order.code = api.data.code || "";
      order.sms = api.data.content || "";
      order.senderName = api.data.senderName || "";
    }
  } else {
    api = await callChay(data, { act: "code", id: order.providerQueueId });

    if (api.ResponseCode === 0) {
      order.status = "done";
      order.code = api.Result?.Code || "";
      order.sms = api.Result?.SMS || "";
      order.callFile = api.Result?.CallFile || "";
    } else if (api.ResponseCode === 2) {
      order.status = "expired";

      if (!order.refunded) {
        const user = findUser(data, order.userId);
        if (user) {
          user.balance = Number(user.balance || 0) + Number(order.price || 0);
          updatedUser = publicUser(user);
        }

        order.refunded = true;
        order.refundedAt = nowIso();
        order.refundReason = "expired_no_otp";
      }
    }
  }

  order.lastCheckedAt = nowIso();
  await writeData(data);
  res.json({ order, api, user: updatedUser });
});

app.post("/api/orders/:id/cancel", async (req, res) => {
  const data = await readData();
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (order.status !== "waiting") return res.status(400).json({ message: "Order không còn trạng thái chờ" });

  let api;
  let ok = false;
  let updatedUser = null;

  if (order.provider === "codesim") {
    api = await callCodesim(data, `/sim/cancel_api_key/${order.providerSimId}`);
    ok = isCodesimOk(api);
  } else {
    api = await callChay(data, { act: "expired", id: order.providerQueueId });
    ok = api.ResponseCode === 0;
  }

  if (ok) {
    if (!order.refunded) {
      const user = findUser(data, order.userId);
      if (user) {
        user.balance = Number(user.balance || 0) + Number(order.price || 0);
        updatedUser = publicUser(user);
      }

      order.refunded = true;
      order.refundedAt = nowIso();
      order.refundReason = "user_cancel";
    }

    order.status = "canceled";
  }

  await writeData(data);
  res.json({ order, api, user: updatedUser });
});

app.post("/api/orders/:id/reuse", async (req, res) => {
  const data = await readData();
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (order.provider !== "codesim") return res.status(400).json({ message: "Thuê lại chỉ hỗ trợ CodeSim" });
  if (order.status !== "done") return res.status(400).json({ message: "Chỉ thuê lại số đã lấy code thành công" });

  const user = findUser(data, order.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (Number(user.balance || 0) < Number(order.price || 0)) {
    return res.status(400).json({ message: "Số dư user không đủ" });
  }

  const api = await callCodesim(data, "/sim/reuse_by_phone_api_key", {
    phone: order.number,
    service_id: order.providerServiceId,
  });

  if (!isCodesimOk(api) || !api.data?.phone) {
    return res.status(400).json({ message: api.message || "Không thuê lại được số", api });
  }

  user.balance = Number(user.balance || 0) - Number(order.price || 0);

  const newOrder = {
    id: makeId("o"),
    provider: "codesim",
    sourceKey: order.sourceKey,
    providerQueueId: api.data.otpId,
    providerSimId: api.data.simId,
    userId: user.id,
    appId: order.appId,
    providerServiceId: order.providerServiceId,
    appName: order.appName,
    carrier: "CodeSim",
    number: api.data.phone,
    providerCost: Number(api.data.payment || order.providerCost),
    price: order.price,
    status: "waiting",
    code: "",
    sms: "",
    refunded: false,
    reusedFrom: order.id,
    createdAt: nowIso(),
  };

  data.orders.unshift(newOrder);
  await writeData(data);
  res.json({ order: newOrder, user: publicUser(user), api });
});

app.post("/api/topups", async (req, res) => {
  const { userId, amount, note } = req.body;
  const data = await readData();
  const user = findUser(data, userId);
  const money = Number(amount || 0);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (!money || Number.isNaN(money) || money <= 0) {
    return res.status(400).json({ message: "Số tiền nạp không hợp lệ" });
  }

  const topup = {
    id: makeId("t"),
    userId,
    username: user.username,
    amount: money,
    note: note || "",
    status: "pending",
    createdAt: nowIso(),
  };

  data.topups.unshift(topup);
  await writeData(data);
  res.json(topup);
});

app.get("/api/topups", async (req, res) => {
  const data = await readData();
  const user = findUser(data, req.query.userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  res.json(user.role === "admin" ? data.topups : data.topups.filter(t => t.userId === user.id));
});

app.post("/api/topups/:id/approve", requireAdmin, async (req, res) => {
  const data = req.data;
  const topup = data.topups.find(t => t.id === req.params.id);

  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" });
  if (topup.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã xử lý rồi" });

  const user = findUser(data, topup.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  user.balance = Number(user.balance || 0) + Number(topup.amount || 0);
  topup.status = "approved";
  topup.approvedAt = nowIso();
  topup.approvedBy = req.admin.username;

  await writeData(data);
  res.json({ topup, user: publicUser(user) });
});

app.post("/api/topups/:id/reject", requireAdmin, async (req, res) => {
  const data = req.data;
  const topup = data.topups.find(t => t.id === req.params.id);

  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" });
  if (topup.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã xử lý rồi" });

  topup.status = "rejected";
  topup.rejectedAt = nowIso();
  topup.rejectedBy = req.admin.username;
  topup.rejectReason = req.body.reason || "";

  await writeData(data);
  res.json(topup);
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Lỗi server" });
});

const distPath = path.resolve("dist");
app.use(express.static(distPath, { maxAge: "1h", etag: true }));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
