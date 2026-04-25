import express from "express";
import cors from "cors";
import path from "path";
import { MongoClient } from "mongodb";

const app = express();
const PORT = process.env.PORT || 10000;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "otp24h";
const DATA_COLLECTION = "appdata";

const CHAY_API_KEY = process.env.CHAYCODESO3_API_KEY || "248c26ea0cd1371009db5dd443339ca1";
const CHAY_API_BASE = "https://chaycodeso3.com/api";

let mongoClient;
let mongoCollection;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const defaultData = {
  users: [
    { id: "admin-1", username: "admin", password: "azhung12", role: "admin", balance: 0, createdAt: new Date().toISOString() }
  ],
  settings: {
    siteName: "OTP 24H",
    logoText: "OTP",
    background: "bg-slate-950",
    announcement: "Chào mừng bạn đến với OTP 24H. Hệ thống thuê sim nhận mã tự động.",
    bannerImage: "",
    bankName: "TECHCOMBANK",
    bankAccountNumber: "MS00T07014613285196",
    bankBeneficiary: "NGUYEN VAN HUNG",
    bankQrUrl: "",
    topupNote: "Nội dung chuyển khoản: username của bạn. Sau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt."
  },
  serviceOverrides: {},
  orders: [],
  topups: []
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
    users: doc.users || defaultData.users,
    serviceOverrides: doc.serviceOverrides || {},
    orders: doc.orders || [],
    topups: doc.topups || []
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

function publicUser(user) {
  const { password, ...safe } = user;
  return safe;
}

async function requireAdmin(req, res, next) {
  const data = await readData();
  const user = data.users.find(u => u.id === req.headers["x-user-id"] && u.role === "admin");
  if (!user) return res.status(403).json({ message: "Bạn không có quyền admin" });
  req.data = data;
  req.admin = user;
  next();
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function getJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 OTP24H"
    }
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: true,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      message: "API trả về dữ liệu không hợp lệ",
      rawPreview: text.slice(0, 500)
    };
  }
}

async function callChay(params) {
  const url = new URL(CHAY_API_BASE);
  url.searchParams.set("apik", CHAY_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return await getJson(url);
}

function isChayOk(api) {
  return api && api.ResponseCode === 0;
}

function serviceFromChay(raw) {
  return {
    id: normalizeName(raw.Name),
    sourceKey: `chaycodeso3:${raw.Id}`,
    provider: "chaycodeso3",
    providerId: raw.Id,
    originalName: raw.Name,
    name: raw.Name,
    providerCost: Number(raw.Cost || 0),
    price: Number(raw.Cost || 0)
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

async function getChayServices() {
  const api = await callChay({ act: "app" });
  if (!isChayOk(api)) {
    return { services: [], error: api };
  }

  return {
    services: (api.Result || []).map(serviceFromChay),
    error: null
  };
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
  const api = await callChay({ act: "app" });
  const services = isChayOk(api) ? (api.Result || []) : [];
  const decorated = services.map(serviceFromChay).map(s => applyOverride(s, data.serviceOverrides));

  res.json({
    chaycodeso3: {
      ok: isChayOk(api),
      serviceCount: services.length,
      visibleCount: decorated.filter(s => !s.hidden).length,
      hiddenCount: decorated.filter(s => s.hidden).length,
      appMessage: api.Msg || api.message || "",
      appStatus: api.ResponseCode ?? api.status ?? null
    },
    codesim: {
      disabled: true,
      reason: "Đã tắt Codesim vì bị Cloudflare 403 trên Render"
    }
  });
});

app.get("/api/settings", async (req, res) => res.json((await readData()).settings));

app.put("/api/settings", requireAdmin, async (req, res) => {
  const data = req.data;
  data.settings = { ...data.settings, ...req.body };
  await writeData(data);
  res.json(data.settings);
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const data = await readData();

  if (!username || !password) return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" });

  if (data.users.find(u => u.username.toLowerCase() === String(username).toLowerCase())) {
    return res.status(409).json({ message: "Tài khoản đã tồn tại" });
  }

  const user = {
    id: "u-" + Date.now(),
    username: String(username),
    password: String(password),
    role: "user",
    balance: 0,
    createdAt: new Date().toISOString()
  };

  data.users.push(user);
  await writeData(data);

  res.json(publicUser(user));
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const data = await readData();

  const user = data.users.find(
    u => u.username.toLowerCase() === String(username || "").toLowerCase() && u.password === String(password || "")
  );

  if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

  res.json(publicUser(user));
});

app.post("/api/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const data = await readData();
  const user = data.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.password !== oldPassword) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
  if (!newPassword) return res.status(400).json({ message: "Thiếu mật khẩu mới" });

  user.password = String(newPassword);
  await writeData(data);
  res.json({ message: "Đổi mật khẩu thành công" });
});

app.get("/api/me", async (req, res) => {
  const data = await readData();
  const user = data.users.find(u => u.id === req.query.userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  res.json(publicUser(user));
});

app.get("/api/users", requireAdmin, async (req, res) => res.json(req.data.users.map(publicUser)));

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

  if (req.body.password) user.password = String(req.body.password);
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
    const usedOrders = data.orders.filter(o => o.userId === user.id && o.status !== "canceled" && !(o.status === "expired" && o.refunded));

    const totalTopup = approvedTopups.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalUsed = usedOrders.reduce((sum, o) => sum + Number(o.price || 0), 0);

    return {
      ...publicUser(user),
      totalTopup,
      totalUsed,
      balance: Number(user.balance || 0)
    };
  });

  res.json(stats);
});

app.get("/api/provider/account", requireAdmin, async (req, res) => {
  res.json({
    chaycodeso3: await callChay({ act: "account" }),
    codesim: {
      disabled: true,
      reason: "Đã tắt Codesim vì bị Cloudflare 403 trên Render"
    }
  });
});

app.get("/api/services", async (req, res) => {
  const data = await readData();
  const { services, error } = await getChayServices();

  if (error) return res.status(502).json({ message: error.Msg || error.message || "Không tải được dịch vụ từ chaycodeso3", error });

  res.json(
    services
      .map(s => applyOverride(s, data.serviceOverrides))
      .filter(s => !s.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))
  );
});

app.get("/api/admin/services", requireAdmin, async (req, res) => {
  const { services, error } = await getChayServices();

  if (error) return res.status(502).json({ message: error.Msg || error.message || "Không tải được dịch vụ từ chaycodeso3", error });

  const decorated = services.map(s => applyOverride(s, req.data.serviceOverrides));

  res.json({
    sources: decorated.sort((a, b) => a.name.localeCompare(b.name)),
    errors: [],
    counts: {
      chaycodeso3: decorated.length,
      visible: decorated.filter(s => !s.hidden).length,
      hidden: decorated.filter(s => s.hidden).length,
      codesim: 0,
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

app.post("/api/orders", async (req, res) => {
  const { userId, appId, carrier, prefix, sendsms, number } = req.body;
  const data = await readData();
  const user = data.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const { services, error } = await getChayServices();
  if (error) return res.status(502).json({ message: "Không tải được dịch vụ từ chaycodeso3", error });

  const service = services.map(s => applyOverride(s, data.serviceOverrides)).find(s => String(s.sourceKey) === String(appId) || String(s.id) === String(appId));
  if (!service) return res.status(404).json({ message: "Dịch vụ không tồn tại" });
  if (service.hidden) return res.status(400).json({ message: "Dịch vụ đang bị ẩn" });

  if (Number(user.balance || 0) < Number(service.price || 0)) {
    return res.status(400).json({ message: "Số dư user không đủ" });
  }

  const api = await callChay({
    act: "number",
    appId: service.providerId,
    carrier,
    prefix,
    sendsms: sendsms ? 1 : undefined,
    number
  });

  if (!isChayOk(api)) {
    return res.status(400).json({ message: api.Msg || "Không lấy được số", api });
  }

  user.balance = Number(user.balance || 0) - Number(service.price || 0);

  const order = {
    id: "o-" + Date.now(),
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
    createdAt: new Date().toISOString()
  };

  data.orders.unshift(order);
  await writeData(data);

  res.json({ order, user: publicUser(user), api });
});

app.get("/api/orders", async (req, res) => {
  const data = await readData();
  const user = data.users.find(u => u.id === req.query.userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  res.json(user.role === "admin" ? data.orders : data.orders.filter(o => o.userId === user.id));
});

app.post("/api/orders/:id/check-code", async (req, res) => {
  const data = await readData();
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });

  const api = await callChay({ act: "code", id: order.providerQueueId });

  let updatedUser = null;

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

  await writeData(data);
  res.json({ order, api, user: updatedUser });
});

app.post("/api/orders/:id/cancel", async (req, res) => {
  const data = await readData();
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (order.status !== "waiting") return res.status(400).json({ message: "Order không còn trạng thái chờ" });

  const api = await callChay({ act: "expired", id: order.providerQueueId });

  let updatedUser = null;

  if (api.ResponseCode === 0) {
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
  res.json({ order, api, user: updatedUser });
});

app.post("/api/topups", async (req, res) => {
  const { userId, amount, note } = req.body;
  const data = await readData();
  const user = data.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const money = Number(amount || 0);
  if (!money || Number.isNaN(money) || money <= 0) return res.status(400).json({ message: "Số tiền nạp không hợp lệ" });

  const topup = {
    id: "t-" + Date.now(),
    userId,
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

app.get("/api/topups", async (req, res) => {
  const data = await readData();
  const user = data.users.find(u => u.id === req.query.userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  res.json(user.role === "admin" ? data.topups : data.topups.filter(t => t.userId === user.id));
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
  res.json({ topup, user: publicUser(user) });
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

const distPath = path.resolve("dist");
app.use(express.static(distPath));
app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, "index.html")));
app.listen(PORT, () => console.log("Server running on port " + PORT));
