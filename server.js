import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = "./data.json";
const API_KEY = process.env.CHAYCODESO3_API_KEY || "248c26ea0cd1371009db5dd443339ca1";
const API_BASE = "https://chaycodeso3.com/api";

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const defaultData = {
  users: [{ id: "admin-1", username: "admin", password: "azhung12", role: "admin", balance: 0, createdAt: new Date().toISOString() }],
  settings: {
    siteName: "OTP 24H",
    logoText: "OTP",
    background: "bg-slate-950",
    announcement: "Chào mừng bạn đến với OTP 24H. Hệ thống thuê sim nhận mã tự động.",
    bannerImage: ""
  },
  serviceOverrides: {},
  orders: []
};

function readData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      ...defaultData,
      ...data,
      settings: { ...defaultData.settings, ...(data.settings || {}) },
      users: data.users || defaultData.users,
      serviceOverrides: data.serviceOverrides || {},
      orders: data.orders || []
    };
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function publicUser(user) { const { password, ...safe } = user; return safe; }

function requireAdmin(req, res, next) {
  const data = readData();
  const user = data.users.find(u => u.id === req.headers["x-user-id"] && u.role === "admin");
  if (!user) return res.status(403).json({ message: "Bạn không có quyền admin" });
  req.data = data;
  req.admin = user;
  next();
}

async function callProvider(params) {
  const url = new URL(API_BASE);
  url.searchParams.set("apik", API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  const response = await fetch(url);
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { ResponseCode: 1, Msg: "API trả về dữ liệu không hợp lệ", Raw: text }; }
}

function applyOverride(raw, overrides) {
  const id = String(raw.Id);
  const custom = overrides[id] || {};
  return {
    id,
    providerId: raw.Id,
    originalName: raw.Name,
    name: custom.name || raw.Name,
    providerCost: Number(raw.Cost || 0),
    price: custom.price !== undefined ? Number(custom.price) : Number(raw.Cost || 0),
    hidden: Boolean(custom.hidden),
    note: custom.note || ""
  };
}

app.get("/api/settings", (req, res) => res.json(readData().settings));
app.put("/api/settings", requireAdmin, (req, res) => {
  const data = req.data;
  data.settings = { ...data.settings, ...req.body };
  writeData(data);
  res.json(data.settings);
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  if (!username || !password) return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" });
  if (data.users.find(u => u.username.toLowerCase() === String(username).toLowerCase())) return res.status(409).json({ message: "Tài khoản đã tồn tại" });
  const user = { id: "u-" + Date.now(), username: String(username), password: String(password), role: "user", balance: 0, createdAt: new Date().toISOString() };
  data.users.push(user);
  writeData(data);
  res.json(publicUser(user));
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  const user = data.users.find(u => u.username.toLowerCase() === String(username || "").toLowerCase() && u.password === String(password || ""));
  if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
  res.json(publicUser(user));
});

app.post("/api/change-password", (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const data = readData();
  const user = data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.password !== oldPassword) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
  user.password = String(newPassword);
  writeData(data);
  res.json({ message: "Đổi mật khẩu thành công" });
});

app.get("/api/users", requireAdmin, (req, res) => res.json(req.data.users.map(publicUser)));
app.post("/api/users/:id/adjust-balance", requireAdmin, (req, res) => {
  const data = req.data;
  const user = data.users.find(u => u.id === req.params.id);
  const amount = Number(req.body.amount || 0);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (Number.isNaN(amount)) return res.status(400).json({ message: "Số tiền không hợp lệ" });
  user.balance = Math.max(0, Number(user.balance || 0) + amount);
  writeData(data);
  res.json(publicUser(user));
});
app.put("/api/users/:id", requireAdmin, (req, res) => {
  const data = req.data;
  const user = data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (req.body.password) user.password = String(req.body.password);
  if (req.body.balance !== undefined) user.balance = Math.max(0, Number(req.body.balance));
  writeData(data);
  res.json(publicUser(user));
});
app.delete("/api/users/:id", requireAdmin, (req, res) => {
  const data = req.data;
  const user = data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.role === "admin") return res.status(400).json({ message: "Không thể xóa admin" });
  data.users = data.users.filter(u => u.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get("/api/provider/account", requireAdmin, async (req, res) => res.json(await callProvider({ act: "account" })));

app.get("/api/services", async (req, res) => {
  const data = readData();
  const api = await callProvider({ act: "app" });
  if (api.ResponseCode !== 0) return res.status(502).json({ message: api.Msg || "Không tải được dịch vụ", api });
  res.json((api.Result || []).map(x => applyOverride(x, data.serviceOverrides)).filter(x => !x.hidden));
});

app.get("/api/admin/services", requireAdmin, async (req, res) => {
  const api = await callProvider({ act: "app" });
  if (api.ResponseCode !== 0) return res.status(502).json({ message: api.Msg || "Không tải được dịch vụ", api });
  res.json((api.Result || []).map(x => applyOverride(x, req.data.serviceOverrides)));
});

app.put("/api/admin/services/:id", requireAdmin, (req, res) => {
  const data = req.data;
  const id = String(req.params.id);
  data.serviceOverrides[id] = { ...(data.serviceOverrides[id] || {}), ...req.body };
  writeData(data);
  res.json(data.serviceOverrides[id]);
});

app.post("/api/orders", async (req, res) => {
  const { userId, appId, carrier, prefix, sendsms, number } = req.body;
  const data = readData();
  const user = data.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const apps = await callProvider({ act: "app" });
  if (apps.ResponseCode !== 0) return res.status(502).json({ message: "Không tải được dịch vụ" });
  const raw = (apps.Result || []).find(s => String(s.Id) === String(appId));
  if (!raw) return res.status(404).json({ message: "Dịch vụ không tồn tại" });
  const service = applyOverride(raw, data.serviceOverrides);
  if (service.hidden) return res.status(400).json({ message: "Dịch vụ đang bị ẩn" });
  if (Number(user.balance || 0) < Number(service.price || 0)) return res.status(400).json({ message: "Số dư không đủ" });

  const api = await callProvider({ act: "number", appId, carrier, prefix, sendsms: sendsms ? 1 : undefined, number });
  if (api.ResponseCode !== 0) return res.status(400).json({ message: api.Msg || "Không lấy được số", api });

  user.balance = Number(user.balance || 0) - Number(service.price || 0);
  const order = {
    id: "o-" + Date.now(),
    providerQueueId: api.Result.Id,
    userId,
    appId: String(appId),
    appName: service.name,
    number: api.Result.Number,
    providerCost: api.Result.Cost,
    price: service.price,
    status: "waiting",
    code: "",
    sms: "",
    createdAt: new Date().toISOString()
  };
  data.orders.unshift(order);
  writeData(data);
  res.json({ order, user: publicUser(user), api });
});

app.get("/api/orders", (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.query.userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  res.json(user.role === "admin" ? data.orders : data.orders.filter(o => o.userId === user.id));
});

app.post("/api/orders/:id/check-code", async (req, res) => {
  const data = readData();
  const order = data.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  const api = await callProvider({ act: "code", id: order.providerQueueId });
  if (api.ResponseCode === 0) {
    order.status = "done";
    order.code = api.Result?.Code || "";
    order.sms = api.Result?.SMS || "";
    order.callFile = api.Result?.CallFile || "";
  } else if (api.ResponseCode === 2) {
    order.status = "expired";
  }
  writeData(data);
  res.json({ order, api });
});

app.post("/api/orders/:id/cancel", async (req, res) => {
  const data = readData();
  const order = data.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (order.status !== "waiting") return res.status(400).json({ message: "Order không còn trạng thái chờ" });
  const api = await callProvider({ act: "expired", id: order.providerQueueId });
  if (api.ResponseCode === 0) {
    const user = data.users.find(u => u.id === order.userId);
    if (user) user.balance = Number(user.balance || 0) + Number(order.price || 0);
    order.status = "canceled";
  }
  writeData(data);
  res.json({ order, api });
});

const distPath = path.resolve("dist");
app.use(express.static(distPath));
app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, "index.html")));
app.listen(PORT, () => console.log("Server running on port " + PORT));
