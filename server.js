import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import { MongoClient } from "mongodb";

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "otp24h";
const DATA_COLLECTION = "appdata";

const CHAY_API_BASE = "https://chaycodeso3.com/api";
const CODESIM_API_BASE = "https://apisim.codesim.net";

let mongoClient;
let mongoCollection;

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

const defaultData = {
  users: [
    {
      id: "admin-1",
      username: "admin",
      password: process.env.ADMIN_PASSWORD || "azhung12",
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
    topupNote: "Nội dung chuyển khoản: username của bạn. Sau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt."
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

async function getCollection() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI. Add it in Render Environment.");
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
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
    doc = { id: "main", ...defaultData };
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
    dmxProducts: doc.dmxProducts || [],
    dmxOrders: doc.dmxOrders || []
  };
}

async function writeData(data) {
  const collection = await getCollection();
  const { _id, ...clean } = data;
  await collection.updateOne(
    { id: "main" },
    { $set: { ...clean, id: "main", updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  crypto
    .createHash("sha256")
    .update(String(process.env.MONGODB_URI || "otp24h-dev-secret"))
    .digest("hex");

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  };

  const unsigned = `${base64url(header)}.${base64url(body)}`;
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(unsigned).digest("base64url");

  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(unsigned).digest("base64url");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const value = req.headers.authorization || "";
  if (!value.startsWith("Bearer ")) return "";
  return value.slice("Bearer ".length).trim();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(user, password) {
  if (user.passwordHash) {
    const parts = String(user.passwordHash).split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;

    const expected = hashPassword(password, parts[1]);
    try {
      return crypto.timingSafeEqual(Buffer.from(user.passwordHash), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  // Tự động hỗ trợ tài khoản cũ đang lưu mật khẩu dạng chữ thường.
  return user.password === String(password || "");
}

function publicUser(user) {
  const { password, passwordHash, ...safe } = user;
  return safe;
}

async function requireAuth(req, res, next) {
  const payload = verifyToken(getBearerToken(req));
  if (!payload?.userId) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại" });

  const data = await readData();
  const user = data.users.find(u => u.id === payload.userId);
  if (!user) return res.status(401).json({ message: "Không tìm thấy tài khoản" });

  req.data = data;
  req.user = user;
  next();
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Bạn không có quyền admin" });
    req.admin = req.user;
    next();
  });
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 12000);
  const retries = Number(options.retries || 0);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 OTP24H"
        }
      });

      const bodyText = await response.text();
      clearTimeout(timeout);

      try {
        return JSON.parse(bodyText);
      } catch {
        return {
          error: true,
          httpStatus: response.status,
          contentType: response.headers.get("content-type"),
          message: "API trả về dữ liệu không hợp lệ",
          rawPreview: bodyText.slice(0, 500)
        };
      }
    } catch (error) {
      clearTimeout(timeout);
      lastError = {
        error: true,
        message: error?.name === "AbortError" ? "API timeout" : error.message || "Lỗi gọi API",
        attempt: attempt + 1
      };

      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  return lastError || { error: true, message: "Lỗi gọi API" };
}

function maskKey(key = "") {
  if (!key) return "";
  if (key.length <= 14) return "********";
  return key.slice(0, 8) + "..." + key.slice(-6);
}

function getChayKey(data) {
  return data.providerSettings?.chayApiKey || process.env.CHAYCODESO3_API_KEY || "";
}

function getCodesimKey(data) {
  return data.providerSettings?.codesimApiKey || process.env.CODESIM_API_KEY || "";
}

async function callChay(data, params) {
  const apiKey = getChayKey(data);
  if (!apiKey) return { ResponseCode: 400, Msg: "Chưa cấu hình chaycodeso3 API key", Result: null };

  const url = new URL(CHAY_API_BASE);
  url.searchParams.set("apik", apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return await getJson(url);
}

async function callCodesim(data, pathName, params = {}) {
  const apiKey = getCodesimKey(data);
  if (!apiKey) return { status: 400, message: "Chưa cấu hình CodeSim API key", data: null };

  const url = new URL(CODESIM_API_BASE + pathName);
  url.searchParams.set("api_key", apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return await getJson(url, { timeoutMs: 15000, retries: 1 });
}

function isChayOk(api) {
  return api && api.ResponseCode === 0;
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
    hidden: true
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
    hidden: true
  };
}

function applyOverride(source, overrides) {
  const custom = overrides[source.sourceKey] || {};
  return {
    ...source,
    name: custom.name || source.originalName,
    price: custom.price !== undefined ? Number(custom.price) : source.providerCost,
    hidden: custom.hidden !== undefined ? Boolean(custom.hidden) : true,
    note: custom.note || ""
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

  if (isCodesimOk(api) && Array.isArray(api.data)) {
    const services = api.data.map(serviceFromCodesim);
    data.providerSettings = data.providerSettings || {};
    data.providerSettings.codesimServiceCache = services;
    data.providerSettings.codesimServiceCacheAt = new Date().toISOString();
    data.providerSettings.codesimLastError = null;
    await writeData(data);
    return { services, error: null };
  }

  data.providerSettings = data.providerSettings || {};
  data.providerSettings.codesimLastError = api;
  data.providerSettings.codesimLastErrorAt = new Date().toISOString();
  await writeData(data);

  const cache = Array.isArray(data.providerSettings.codesimServiceCache)
    ? data.providerSettings.codesimServiceCache
    : [];

  if (cache.length) {
    return {
      services: cache,
      error: {
        message: "CodeSim API lỗi tạm thời, đang dùng cache dịch vụ gần nhất",
        cacheAt: data.providerSettings.codesimServiceCacheAt || null,
        api
      }
    };
  }

  return { services: [], error: api };
}

async function getAllServices(data) {
  const chay = await getChayServices(data);
  const codesim = await getCodesimServices(data);

  return {
    services: [...(chay.services || []), ...(codesim.services || [])],
    errors: [
      chay.error ? { provider: "chaycodeso3", error: chay.error } : null,
      codesim.error ? { provider: "codesim", error: codesim.error } : null
    ].filter(Boolean)
  };
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

const loginAttempts = new Map();

function rateLimitLogin(req, res, next) {
  const ip = getClientIp(req) || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 20;

  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };

  if (record.resetAt < now) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  loginAttempts.set(ip, record);

  if (record.count > maxAttempts) {
    return res.status(429).json({ message: "Đăng nhập quá nhiều lần, vui lòng thử lại sau" });
  }

  next();
}

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
  const chay = await getChayServices(data);
  const codesim = await getCodesimServices(data);
  const all = [...chay.services, ...codesim.services].map(s => applyOverride(s, data.serviceOverrides));

  res.json({
    chaycodeso3: {
      ok: !chay.error,
      enabled: !!data.providerSettings.chayEnabled,
      hasApiKey: !!getChayKey(data),
      serviceCount: chay.services.length,
      error: chay.error || null
    },
    codesim: {
      ok: !codesim.error,
      enabled: !!data.providerSettings.codesimEnabled,
      hasApiKey: !!getCodesimKey(data),
      serviceCount: codesim.services.length,
      error: codesim.error || null
    },
    total: all.length,
    visible: all.filter(s => !s.hidden).length,
    hidden: all.filter(s => s.hidden).length
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
    hasCodesimApiKey: !!getCodesimKey(data)
  });
});

app.put("/api/admin/provider-settings", requireAdmin, async (req, res) => {
  const data = req.data;

  data.providerSettings = {
    ...(data.providerSettings || {}),
    chayEnabled:
      req.body.chayEnabled !== undefined
        ? Boolean(req.body.chayEnabled)
        : !!data.providerSettings?.chayEnabled,
    codesimEnabled:
      req.body.codesimEnabled !== undefined
        ? Boolean(req.body.codesimEnabled)
        : !!data.providerSettings?.codesimEnabled
  };

  if (req.body.chayApiKey !== undefined && String(req.body.chayApiKey).trim()) {
    data.providerSettings.chayApiKey = String(req.body.chayApiKey).trim();
  }

  if (req.body.codesimApiKey !== undefined && String(req.body.codesimApiKey).trim()) {
    data.providerSettings.codesimApiKey = String(req.body.codesimApiKey).trim();
  }

  await writeData(data);

  res.json({
    chayEnabled: !!data.providerSettings.chayEnabled,
    chayApiKeyMasked: maskKey(data.providerSettings.chayApiKey),
    hasChayApiKey: !!data.providerSettings.chayApiKey,

    codesimEnabled: !!data.providerSettings.codesimEnabled,
    codesimApiKeyMasked: maskKey(data.providerSettings.codesimApiKey),
    hasCodesimApiKey: !!data.providerSettings.codesimApiKey
  });
});

app.get("/api/admin/provider-test", requireAdmin, async (req, res) => {
  const data = req.data;
  const chay = await callChay(data, { act: "account" });
  const codesim = await callCodesim(data, "/yourself/information-by-api-key");

  res.json({
    ok: isChayOk(chay) && isCodesimOk(codesim),
    chaycodeso3: {
      ok: isChayOk(chay),
      data: chay
    },
    codesim: {
      ok: isCodesimOk(codesim),
      data: codesim
    }
  });
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const data = await readData();

  if (!username || !password) {
    return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
  }

  if (data.users.find(u => u.username.toLowerCase() === String(username).toLowerCase())) {
    return res.status(409).json({ message: "Tài khoản đã tồn tại" });
  }

  const user = {
    id: "u-" + crypto.randomBytes(12).toString("hex"),
    username: String(username),
    passwordHash: hashPassword(password),
    role: "user",
    balance: 0,
    createdAt: new Date().toISOString(),
    registerIp: getClientIp(req)
  };

  data.users.push(user);
  await writeData(data);

  res.json({
    token: signToken({ userId: user.id }),
    user: publicUser(user)
  });
});

app.post("/api/login", rateLimitLogin, async (req, res) => {
  const { username, password } = req.body;
  const data = await readData();

  const user = data.users.find(u => u.username.toLowerCase() === String(username || "").toLowerCase());

  if (!user || !verifyPassword(user, password)) {
    return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
  }

  // Nâng cấp tài khoản cũ từ password plaintext sang passwordHash.
  if (!user.passwordHash) {
    user.passwordHash = hashPassword(password);
    delete user.password;
    await writeData(data);
  }

  res.json({
    token: signToken({ userId: user.id }),
    user: publicUser(user)
  });
});

app.post("/api/change-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const data = req.data;
  const user = req.user;

  if (!verifyPassword(user, oldPassword)) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

  user.passwordHash = hashPassword(newPassword);
  delete user.password;

  await writeData(data);
  res.json({ message: "Đổi mật khẩu thành công" });
});

app.get("/api/me", requireAuth, async (req, res) => {
  res.json(publicUser(req.user));
});

app.get("/api/users", requireAdmin, async (req, res) => {
  res.json(req.data.users.map(publicUser));
});

app.post("/api/users/:id/adjust-balance", requireAdmin, async (req, res) => {
  const data = req.data;
  const user = data.users.find(u => u.id === req.params.id);
  const amount = Number(req.body.amount || 0);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (Number.isNaN(amount)) return res.status(400).json({ message: "Số tiền không hợp lệ" });

  user.balance = Math.max(0, Number(user.balance || 0) + amount);
  await writeData(data);
  res.json(publicUser(user));
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const user = data.users.find(u => u.id === req.params.id);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  if (req.body.password) {
    user.passwordHash = hashPassword(req.body.password);
    delete user.password;
  }
  if (req.body.balance !== undefined) user.balance = Math.max(0, Number(req.body.balance));

  await writeData(data);
  res.json(publicUser(user));
});

app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const user = data.users.find(u => u.id === req.params.id);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.role === "admin") return res.status(400).json({ message: "Không thể xóa admin" });

  data.users = data.users.filter(u => u.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

app.get("/api/user-stats", requireAdmin, async (req, res) => {
  const data = req.data;

  const stats = data.users.map(user => {
    const approvedTopups = data.topups.filter(t => t.userId === user.id && t.status === "approved");
    const usedOrders = data.orders.filter(
      o => o.userId === user.id && o.status !== "canceled" && !(o.status === "expired" && o.refunded)
    );
    const usedDmxOrders = (data.dmxOrders || []).filter(o => o.userId === user.id);

    const totalTopup = approvedTopups.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalOtpUsed = usedOrders.reduce((sum, o) => sum + Number(o.price || 0), 0);
    const totalDmxUsed = usedDmxOrders.reduce((sum, o) => sum + Number(o.price || 0), 0);

    return {
      ...publicUser(user),
      totalTopup,
      totalUsed: totalOtpUsed + totalDmxUsed,
      balance: Number(user.balance || 0)
    };
  });

  res.json(stats);
});

app.get("/api/provider/account", requireAdmin, async (req, res) => {
  const data = req.data;

  res.json({
    chaycodeso3: await callChay(data, { act: "account" }),
    codesim: await callCodesim(data, "/yourself/information-by-api-key")
  });
});

app.get("/api/services", async (req, res) => {
  const data = await readData();
  const { services, errors } = await getAllServices(data);

  const decorated = services
    .map(s => applyOverride(s, data.serviceOverrides))
    .filter(s => !s.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (decorated.length === 0 && errors.length) {
    return res.status(502).json({
      message: "Không tải được dịch vụ từ API nguồn",
      errors
    });
  }

  res.json(decorated);
});

app.get("/api/admin/services", requireAdmin, async (req, res) => {
  const data = req.data;
  const { services, errors } = await getAllServices(data);

  const decorated = services
    .map(s => applyOverride(s, data.serviceOverrides))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({
    sources: decorated,
    errors,
    counts: {
      chaycodeso3: decorated.filter(s => s.provider === "chaycodeso3").length,
      codesim: decorated.filter(s => s.provider === "codesim").length,
      visible: decorated.filter(s => !s.hidden).length,
      hidden: decorated.filter(s => s.hidden).length,
      total: decorated.length
    }
  });
});

app.put("/api/admin/services/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const id = String(req.params.id);

  data.serviceOverrides[id] = {
    ...(data.serviceOverrides[id] || {}),
    ...req.body
  };

  await writeData(data);
  res.json(data.serviceOverrides[id]);
});

app.post("/api/orders", requireAuth, async (req, res) => {
  const { appId, carrier, prefix, sendsms, number, networkId } = req.body;
  const data = req.data;
  const user = req.user;

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
      phone: prefix || number
    });

    if (!isCodesimOk(api) || !api.data?.phone) {
      return res.status(400).json({
        message: api.message || "Không lấy được số CodeSim",
        api
      });
    }

    user.balance = Number(user.balance || 0) - Number(service.price || 0);

    order = {
      id: "o-" + Date.now(),
      provider: "codesim",
      sourceKey: service.sourceKey,
      providerQueueId: api.data.otpId,
      providerSimId: api.data.simId,
      userId: user.id,
      appId: String(service.sourceKey),
      providerServiceId: service.providerId,
      appName: service.name,
      carrier: carrier || "Tự động",
      number: api.data.phone,
      providerCost: Number(api.data.payment || service.providerCost),
      price: service.price,
      status: "waiting",
      code: "",
      sms: "",
      refunded: false,
      createdAt: new Date().toISOString()
    };
  } else {
    api = await callChay(data, {
      act: "number",
      appId: service.providerId,
      carrier,
      prefix,
      sendsms: sendsms ? 1 : undefined,
      number
    });

    if (!isChayOk(api)) {
      return res.status(400).json({
        message: api.Msg || "Không lấy được số",
        api
      });
    }

    user.balance = Number(user.balance || 0) - Number(service.price || 0);

    order = {
      id: "o-" + Date.now(),
      provider: "chaycodeso3",
      sourceKey: service.sourceKey,
      providerQueueId: api.Result.Id,
      providerSimId: api.Result.Id,
      userId: user.id,
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
      createdAt: new Date().toISOString()
    };
  }

  data.orders.unshift(order);
  await writeData(data);

  res.json({
    order,
    user: publicUser(user),
    api
  });
});

app.get("/api/orders", requireAuth, async (req, res) => {
  const data = req.data;
  const user = req.user;

  res.json(
    user.role === "admin"
      ? data.orders
      : data.orders.filter(o => o.userId === user.id)
  );
});

app.post("/api/orders/:id/check-code", requireAuth, async (req, res) => {
  const data = req.data;
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (req.user.role !== "admin" && order.userId !== req.user.id) {
    return res.status(403).json({ message: "Bạn không có quyền xem đơn này" });
  }

  let api;
  let updatedUser = null;

  if (order.provider === "codesim") {
    api = await callCodesim(data, "/otp/get_otp_by_phone_api_key", {
      otp_id: order.providerQueueId
    });

    if (isCodesimOk(api) && api.data?.code) {
      order.status = "done";
      order.code = api.data.code || "";
      order.sms = api.data.content || "";
      order.senderName = api.data.senderName || "";
    }
  } else {
    api = await callChay(data, {
      act: "code",
      id: order.providerQueueId
    });

    if (api.ResponseCode === 0) {
      order.status = "done";
      order.code = api.Result?.Code || "";
      order.sms = api.Result?.SMS || "";
      order.callFile = api.Result?.CallFile || "";
    } else if (api.ResponseCode === 2) {
      order.status = "expired";

      if (!order.refunded) {
        const user = data.users.find(u => u.id === order.userId);
        if (user) {
          user.balance = Number(user.balance || 0) + Number(order.price || 0);
          updatedUser = publicUser(user);
        }

        order.refunded = true;
        order.refundedAt = new Date().toISOString();
        order.refundReason = "expired_no_otp";
      }
    }
  }

  order.lastCheckedAt = new Date().toISOString();
  await writeData(data);

  res.json({
    order,
    api,
    user: updatedUser
  });
});

app.post("/api/orders/:id/cancel", requireAdmin, async (req, res) => {
  const data = req.data;
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (order.status !== "waiting") {
    return res.status(400).json({ message: "Order không còn trạng thái chờ" });
  }

  let api;
  let ok = false;
  let updatedUser = null;

  if (order.provider === "codesim") {
    api = await callCodesim(data, `/sim/cancel_api_key/${order.providerSimId}`);
    ok = isCodesimOk(api);
  } else {
    api = await callChay(data, {
      act: "expired",
      id: order.providerQueueId
    });
    ok = api.ResponseCode === 0;
  }

  if (ok) {
    if (!order.refunded) {
      const user = data.users.find(u => u.id === order.userId);
      if (user) {
        user.balance = Number(user.balance || 0) + Number(order.price || 0);
        updatedUser = publicUser(user);
      }

      order.refunded = true;
      order.refundedAt = new Date().toISOString();
      order.refundReason = "user_cancel";
    }

    order.status = "canceled";
  }

  await writeData(data);

  res.json({
    order,
    api,
    user: updatedUser
  });
});

app.post("/api/orders/:id/reuse", requireAuth, async (req, res) => {
  const data = req.data;
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (req.user.role !== "admin" && order.userId !== req.user.id) {
    return res.status(403).json({ message: "Bạn không có quyền thuê lại đơn này" });
  }
  if (order.provider !== "codesim") return res.status(400).json({ message: "Thuê lại chỉ hỗ trợ CodeSim" });
  if (order.status !== "done") return res.status(400).json({ message: "Chỉ thuê lại số đã lấy code thành công" });

  const user = data.users.find(u => u.id === order.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  if (Number(user.balance || 0) < Number(order.price || 0)) {
    return res.status(400).json({ message: "Số dư user không đủ" });
  }

  const api = await callCodesim(data, "/sim/reuse_by_phone_api_key", {
    phone: order.number,
    service_id: order.providerServiceId
  });

  if (!isCodesimOk(api) || !api.data?.phone) {
    return res.status(400).json({
      message: api.message || "Không thuê lại được số",
      api
    });
  }

  user.balance = Number(user.balance || 0) - Number(order.price || 0);

  const newOrder = {
    id: "o-" + Date.now(),
    provider: "codesim",
    sourceKey: order.sourceKey,
    providerQueueId: api.data.otpId,
    providerSimId: api.data.simId,
    userId: user.id,
    appId: order.appId,
    providerServiceId: order.providerServiceId,
    appName: order.appName,
    carrier: "Tự động",
    number: api.data.phone,
    providerCost: Number(api.data.payment || order.providerCost),
    price: order.price,
    status: "waiting",
    code: "",
    sms: "",
    refunded: false,
    reusedFrom: order.id,
    createdAt: new Date().toISOString()
  };

  data.orders.unshift(newOrder);
  await writeData(data);

  res.json({
    order: newOrder,
    user: publicUser(user),
    api
  });
});

app.post("/api/topups", requireAuth, async (req, res) => {
  const { amount, note } = req.body;
  const data = req.data;
  const user = req.user;

  const money = Number(amount || 0);
  if (!money || Number.isNaN(money) || money <= 0) {
    return res.status(400).json({ message: "Số tiền nạp không hợp lệ" });
  }

  const topup = {
    id: "t-" + Date.now(),
    userId: user.id,
    username: user.username,
    amount: money,
    note: note || "",
    status: "pending",
    createdAt: new Date().toISOString()
  };

  data.topups.unshift(topup);
  await writeData(data);

  res.json(topup);
});

app.get("/api/topups", requireAuth, async (req, res) => {
  const data = req.data;
  const user = req.user;

  res.json(
    user.role === "admin"
      ? data.topups
      : data.topups.filter(t => t.userId === user.id)
  );
});

app.post("/api/topups/:id/approve", requireAdmin, async (req, res) => {
  const data = req.data;
  const topup = data.topups.find(t => t.id === req.params.id);

  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" });
  if (topup.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã xử lý rồi" });

  const user = data.users.find(u => u.id === topup.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  user.balance = Number(user.balance || 0) + Number(topup.amount || 0);
  topup.status = "approved";
  topup.approvedAt = new Date().toISOString();
  topup.approvedBy = req.admin.username;

  await writeData(data);

  res.json({
    topup,
    user: publicUser(user)
  });
});

app.post("/api/topups/:id/reject", requireAdmin, async (req, res) => {
  const data = req.data;
  const topup = data.topups.find(t => t.id === req.params.id);

  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" });
  if (topup.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã xử lý rồi" });

  topup.status = "rejected";
  topup.rejectedAt = new Date().toISOString();
  topup.rejectedBy = req.admin.username;
  topup.rejectReason = req.body.reason || "";

  await writeData(data);
  res.json(topup);
});


function normalizeDmxCategory(name = "") {
  const text = String(name || "").trim();
  if (!text) return "Chưa phân loại";

  const bySeparator = text.split(/[-|:–—]/).map(x => x.trim()).filter(Boolean)[0];
  if (bySeparator && bySeparator.length <= 40) return bySeparator;

  return text.split(/\s+/).slice(0, 2).join(" ") || "Chưa phân loại";
}

function parseDmxBulkPricing(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => ({ minQty: Number(item.minQty || 0), price: Number(item.price || 0) }))
      .filter(item => item.minQty > 1 && item.price > 0)
      .sort((a, b) => a.minQty - b.minQty);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/[=|:,\s]+/).filter(Boolean);
      return { minQty: Number(parts[0] || 0), price: Number(parts[1] || 0) };
    })
    .filter(item => item.minQty > 1 && item.price > 0)
    .sort((a, b) => a.minQty - b.minQty);
}

function getDmxUnitPrice(product, quantity = 1) {
  const tiers = parseDmxBulkPricing(product.bulkPricing)
    .filter(tier => Number(tier.minQty || 0) <= quantity && Number(tier.price || 0) > 0)
    .sort((a, b) => Number(b.minQty || 0) - Number(a.minQty || 0));

  return Number(tiers[0]?.price || product.price || 0);
}

function sortDmxProducts(list) {
  return [...(list || [])].sort((a, b) => {
    const ca = String(a.category || normalizeDmxCategory(a.name)).localeCompare(String(b.category || normalizeDmxCategory(b.name)), "vi");
    if (ca !== 0) return ca;
    return String(a.name || "").localeCompare(String(b.name || ""), "vi");
  });
}

app.get("/api/dmx/products", async (req, res) => {
  const data = await readData();

  const products = sortDmxProducts(
    (data.dmxProducts || [])
      .filter(p => !p.hidden)
      .map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        category: p.category || normalizeDmxCategory(p.name),
        bulkPricing: parseDmxBulkPricing(p.bulkPricing),
        image: p.image || "",
        note: p.note || "",
        stock: Array.isArray(p.codes) ? p.codes.length : 0,
        sold: Number(p.sold || 0),
        createdAt: p.createdAt
      }))
      .filter(p => p.stock > 0)
  );

  res.json(products);
});

app.get("/api/dmx/orders", requireAuth, async (req, res) => {
  const data = req.data;
  const user = req.user;

  if (user.role === "admin") {
    return res.json(data.dmxOrders || []);
  }

  res.json((data.dmxOrders || []).filter(o => o.userId === user.id));
});

app.post("/api/dmx/buy", requireAuth, async (req, res) => {
  const { productId } = req.body;
  const quantity = Math.floor(Number(req.body.quantity || 1));
  const data = req.data;
  const user = req.user;

  const product = (data.dmxProducts || []).find(p => p.id === productId);
  if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });

  if (product.hidden) return res.status(400).json({ message: "Sản phẩm đang bị ẩn" });

  if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Số lượng không hợp lệ" });
  }

  if (quantity > 100) {
    return res.status(400).json({ message: "Mỗi đơn chỉ được mua tối đa 100 mã" });
  }

  if (!Array.isArray(product.codes) || product.codes.length < quantity) {
    return res.status(400).json({ message: "Kho không đủ số lượng cần mua" });
  }

  const unitPrice = getDmxUnitPrice(product, quantity);
  const price = unitPrice * quantity;

  if (Number(user.balance || 0) < price) {
    return res.status(400).json({ message: "Số dư không đủ" });
  }

  const codes = product.codes.splice(0, quantity);

  user.balance = Number(user.balance || 0) - price;
  product.sold = Number(product.sold || 0) + quantity;
  product.updatedAt = new Date().toISOString();

  const order = {
    id: "dmx-" + Date.now(),
    userId: user.id,
    username: user.username,
    productId: product.id,
    productName: product.name,
    category: product.category || normalizeDmxCategory(product.name),
    quantity,
    unitPrice,
    price,
    image: product.image || "",
    code: codes.join("\n"),
    codes,
    note: product.note || "",
    createdAt: new Date().toISOString()
  };

  data.dmxOrders = data.dmxOrders || [];
  data.dmxOrders.unshift(order);

  await writeData(data);

  res.json({
    order,
    user: publicUser(user)
  });
});

app.get("/api/admin/dmx/products", requireAdmin, async (req, res) => {
  const data = req.data;

  const products = sortDmxProducts((data.dmxProducts || []).map(p => ({
    ...p,
    category: p.category || normalizeDmxCategory(p.name),
    bulkPricing: parseDmxBulkPricing(p.bulkPricing),
    stock: Array.isArray(p.codes) ? p.codes.length : 0,
    codesPreview: Array.isArray(p.codes) ? p.codes.slice(0, 5) : []
  })));

  res.json(products);
});

app.post("/api/admin/dmx/products", requireAdmin, async (req, res) => {
  const data = req.data;

  const name = String(req.body.name || "").trim();
  const price = Number(req.body.price || 0);

  if (!name) return res.status(400).json({ message: "Thiếu tên sản phẩm" });

  if (!price || Number.isNaN(price) || price < 0) {
    return res.status(400).json({ message: "Giá bán không hợp lệ" });
  }

  const product = {
    id: "dmxp-" + Date.now(),
    name,
    price,
    category: String(req.body.category || "").trim() || normalizeDmxCategory(name),
    bulkPricing: parseDmxBulkPricing(req.body.bulkPricing),
    image: req.body.image || "",
    note: req.body.note || "",
    hidden: Boolean(req.body.hidden || false),
    codes: [],
    sold: 0,
    createdAt: new Date().toISOString()
  };

  data.dmxProducts = data.dmxProducts || [];
  data.dmxProducts.unshift(product);

  await writeData(data);
  res.json(product);
});

app.put("/api/admin/dmx/products/:id", requireAdmin, async (req, res) => {
  const data = req.data;
  const product = (data.dmxProducts || []).find(p => p.id === req.params.id);

  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  if (req.body.name !== undefined) product.name = String(req.body.name || "").trim();
  if (req.body.price !== undefined) product.price = Number(req.body.price || 0);
  if (req.body.category !== undefined) product.category = String(req.body.category || "").trim() || normalizeDmxCategory(product.name);
  if (req.body.bulkPricing !== undefined) product.bulkPricing = parseDmxBulkPricing(req.body.bulkPricing);
  if (req.body.image !== undefined) product.image = req.body.image || "";
  if (req.body.note !== undefined) product.note = req.body.note || "";
  if (req.body.hidden !== undefined) product.hidden = Boolean(req.body.hidden);

  product.updatedAt = new Date().toISOString();

  await writeData(data);
  res.json(product);
});

app.delete("/api/admin/dmx/products/:id", requireAdmin, async (req, res) => {
  const data = req.data;

  data.dmxProducts = (data.dmxProducts || []).filter(p => p.id !== req.params.id);

  await writeData(data);
  res.json({ success: true });
});

app.post("/api/admin/dmx/products/:id/codes", requireAdmin, async (req, res) => {
  const data = req.data;
  const product = (data.dmxProducts || []).find(p => p.id === req.params.id);

  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  const raw = String(req.body.codes || "");

  const codes = raw
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  if (!codes.length) return res.status(400).json({ message: "Chưa nhập mã voucher" });

  product.codes = product.codes || [];
  product.codes.push(...codes);
  product.updatedAt = new Date().toISOString();

  await writeData(data);

  res.json({
    success: true,
    added: codes.length,
    stock: product.codes.length
  });
});

app.delete("/api/admin/dmx/products/:id/codes", requireAdmin, async (req, res) => {
  const data = req.data;
  const product = (data.dmxProducts || []).find(p => p.id === req.params.id);

  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  product.codes = [];
  product.updatedAt = new Date().toISOString();

  await writeData(data);

  res.json({
    success: true,
    stock: 0
  });
});

app.get("/api/admin/dmx/orders", requireAdmin, async (req, res) => {
  const data = req.data;
  res.json(data.dmxOrders || []);
});

const distPath = path.resolve("dist");

app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
