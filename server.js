import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = "./data.json";

const CHAY_API_KEY = process.env.CHAYCODESO3_API_KEY || "248c26ea0cd1371009db5dd443339ca1";
const CHAY_API_BASE = "https://chaycodeso3.com/api";

const CODESIM_API_KEY = process.env.CODESIM_API_KEY || "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJudWJpYTMiLCJqdGkiOiI4NDM1NiIsImlhdCI6MTc3NzA4NDE5NiwiZXhwIjoxODM5MjkyMTk2fQ.F5SrJi-hvbhovlmaoxHyIcqshXwbnapb-nltkXkPQO2WLTG8kr5VRPHZdu8ZYdrzmi8m6pTbUZtMo1dSsI6cvA";
const CODESIM_API_BASE = "https://apisim.codesim.net";

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
      orders: data.orders || [],
      topups: data.topups || []
    };
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function publicUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function requireAdmin(req, res, next) {
  const data = readData();
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
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function getJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: true, message: "API trả về dữ liệu không hợp lệ", raw: text };
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

async function callCodesim(pathname, params = {}) {
  const url = new URL(CODESIM_API_BASE + pathname);
  url.searchParams.set("api_key", CODESIM_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return await getJson(url);
}

function isChayOk(api) {
  return api && api.ResponseCode === 0;
}

function isCodesimOk(api) {
  return api && Number(api.status) === 200;
}

function serviceFromChay(raw) {
  return {
    sourceKey: `chaycodeso3:${raw.Id}`,
    provider: "chaycodeso3",
    providerId: raw.Id,
    originalName: raw.Name,
    normalizedName: normalizeName(raw.Name),
    providerCost: Number(raw.Cost || 0)
  };
}

function serviceFromCodesim(raw) {
  return {
    sourceKey: `codesim:${raw.id}`,
    provider: "codesim",
    providerId: raw.id,
    originalName: raw.name,
    normalizedName: normalizeName(raw.name),
    providerCost: Number(raw.price || 0)
  };
}

function applyOverride(source, overrides) {
  const custom = overrides[source.sourceKey] || {};
  return {
    ...source,
    id: source.sourceKey,
    name: custom.name || source.originalName,
    price: custom.price !== undefined ? Number(custom.price) : source.providerCost,
    hidden: Boolean(custom.hidden),
    note: custom.note || "",
    priority: custom.priority !== undefined ? Number(custom.priority) : 0
  };
}

async function getAllSources() {
  const [chay, codesim] = await Promise.allSettled([
    callChay({ act: "app" }),
    callCodesim("/service/get_service_by_api_key")
  ]);

  const sources = [];
  const errors = [];

  if (chay.status === "fulfilled" && isChayOk(chay.value)) {
    for (const raw of chay.value.Result || []) sources.push(serviceFromChay(raw));
  } else {
    errors.push({ provider: "chaycodeso3", error: chay.status === "fulfilled" ? chay.value : String(chay.reason) });
  }

  if (codesim.status === "fulfilled" && isCodesimOk(codesim.value)) {
    for (const raw of codesim.value.data || []) sources.push(serviceFromCodesim(raw));
  } else {
    errors.push({ provider: "codesim", error: codesim.status === "fulfilled" ? codesim.value : String(codesim.reason) });
  }

  return { sources, errors };
}

function mergeServices(sources, overrides, includeHidden = false) {
  const groups = new Map();
  const decorated = sources.map(s => applyOverride(s, overrides));

  for (const item of decorated) {
    if (!includeHidden && item.hidden) continue;

    const key = item.normalizedName || item.sourceKey;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        name: item.name,
        originalName: item.originalName,
        providerCost: item.providerCost,
        price: item.price,
        hidden: item.hidden,
        note: item.note,
        sources: []
      });
    }

    const group = groups.get(key);
    group.sources.push(item);

    const visibleSources = group.sources.filter(s => includeHidden || !s.hidden);
    const best = [...visibleSources].sort((a, b) =>
      (a.price - b.price) || (b.priority - a.priority) || (a.providerCost - b.providerCost)
    )[0];

    if (best) {
      group.name = best.name;
      group.price = best.price;
      group.providerCost = best.providerCost;
      group.bestProvider = best.provider;
      group.bestSourceKey = best.sourceKey;
      group.note = best.note;
    }
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function chooseSources(mergedService, overrides) {
  return [...(mergedService.sources || [])]
    .map(s => applyOverride(s, overrides))
    .filter(s => !s.hidden)
    .sort((a, b) => (a.price - b.price) || (b.priority - a.priority) || (a.providerCost - b.providerCost));
}

async function rentFromSource(source, options = {}) {
  if (source.provider === "chaycodeso3") {
    const api = await callChay({
      act: "number",
      appId: source.providerId,
      carrier: options.carrier,
      prefix: options.prefix,
      sendsms: options.sendsms ? 1 : undefined,
      number: options.number
    });

    if (!isChayOk(api)) return { ok: false, message: api.Msg || "Chaycodeso3 không lấy được số", api };

    return {
      ok: true,
      api,
      providerQueueId: api.Result.Id,
      providerSimId: api.Result.Id,
      number: api.Result.Number,
      providerCost: Number(api.Result.Cost || source.providerCost),
      appName: api.Result.App || source.name
    };
  }

  const api = await callCodesim("/sim/get_sim", {
    service_id: source.providerId,
    network_id: options.network_id,
    phone: options.prefix || options.phone
  });

  if (!isCodesimOk(api) || !api.data || !api.data.otpId) {
    return { ok: false, message: api.message || "Codesim không lấy được số", api };
  }

  return {
    ok: true,
    api,
    providerQueueId: api.data.otpId,
    providerSimId: api.data.simId,
    number: api.data.phone,
    providerCost: Number(api.data.payment || source.providerCost),
    appName: api.data.serviceName || source.name
  };
}

async function checkCodeForOrder(order) {
  if (order.provider === "chaycodeso3") {
    const api = await callChay({ act: "code", id: order.providerQueueId });
    if (api.ResponseCode === 0) {
      return {
        status: "done",
        api,
        code: api.Result?.Code || "",
        sms: api.Result?.SMS || "",
        callFile: api.Result?.CallFile || ""
      };
    }
    if (api.ResponseCode === 2) return { status: "expired", api };
    return { status: "waiting", api };
  }

  const api = await callCodesim("/otp/get_otp_by_phone_api_key", { otp_id: order.providerQueueId });
  if (isCodesimOk(api) && api.data && api.data.code) {
    return {
      status: "done",
      api,
      code: api.data.code || "",
      sms: api.data.content || "",
      callFile: api.data.audio || ""
    };
  }

  return { status: "waiting", api };
}

async function cancelAtProvider(order) {
  if (order.provider === "chaycodeso3") {
    const api = await callChay({ act: "expired", id: order.providerQueueId });
    return { ok: api.ResponseCode === 0, api };
  }

  const api = await callCodesim(`/sim/cancel_api_key/${order.providerSimId}`);
  return { ok: Number(api.status) === 200, api };
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
  writeData(data);

  res.json(publicUser(user));
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const data = readData();

  const user = data.users.find(
    u => u.username.toLowerCase() === String(username || "").toLowerCase() && u.password === String(password || "")
  );

  if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

  res.json(publicUser(user));
});

app.post("/api/change-password", (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  const data = readData();
  const user = data.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  if (user.password !== oldPassword) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
  if (!newPassword) return res.status(400).json({ message: "Thiếu mật khẩu mới" });

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

app.get("/api/provider/account", requireAdmin, async (req, res) => {
  const [chay, codesim] = await Promise.allSettled([
    callChay({ act: "account" }),
    callCodesim("/yourself/information-by-api-key")
  ]);

  res.json({
    chaycodeso3: chay.status === "fulfilled" ? chay.value : { error: String(chay.reason) },
    codesim: codesim.status === "fulfilled" ? codesim.value : { error: String(codesim.reason) }
  });
});

app.get("/api/services", async (req, res) => {
  const data = readData();
  const { sources, errors } = await getAllSources();

  if (sources.length === 0) return res.status(502).json({ message: "Không tải được dịch vụ từ cả 2 nguồn", errors });

  res.json(mergeServices(sources, data.serviceOverrides, false));
});

app.get("/api/admin/services", requireAdmin, async (req, res) => {
  const { sources, errors } = await getAllSources();

  if (sources.length === 0) return res.status(502).json({ message: "Không tải được dịch vụ từ cả 2 nguồn", errors });

  res.json({
    merged: mergeServices(sources, req.data.serviceOverrides, true),
    sources: sources.map(s => applyOverride(s, req.data.serviceOverrides)),
    errors
  });
});

app.put("/api/admin/services/:id", requireAdmin, (req, res) => {
  const data = req.data;
  const id = String(req.params.id);

  data.serviceOverrides[id] = {
    ...(data.serviceOverrides[id] || {}),
    ...req.body
  };

  writeData(data);
  res.json(data.serviceOverrides[id]);
});

app.post("/api/orders", async (req, res) => {
  const { userId, appId, carrier, prefix, sendsms, number } = req.body;
  const data = readData();
  const user = data.users.find(u => u.id === userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const { sources } = await getAllSources();
  const merged = mergeServices(sources, data.serviceOverrides, true).find(s => String(s.id) === String(appId));

  if (!merged) return res.status(404).json({ message: "Dịch vụ không tồn tại ở cả 2 nguồn" });

  const candidates = chooseSources(merged, data.serviceOverrides);
  if (candidates.length === 0) return res.status(400).json({ message: "Dịch vụ đang bị ẩn ở tất cả nguồn" });

  const cheapest = Math.min(...candidates.map(s => Number(s.price || 0)));
  if (Number(user.balance || 0) < cheapest) return res.status(400).json({ message: "Số dư user không đủ" });

  const attempts = [];
  let selected = null;
  let rented = null;

  for (const source of candidates) {
    if (Number(user.balance || 0) < Number(source.price || 0)) {
      attempts.push({ provider: source.provider, sourceKey: source.sourceKey, ok: false, message: "User không đủ tiền cho nguồn này" });
      continue;
    }

    const result = await rentFromSource(source, { carrier, prefix, sendsms, number });
    attempts.push({ provider: source.provider, sourceKey: source.sourceKey, ok: result.ok, message: result.message || "OK" });

    if (result.ok) {
      selected = source;
      rented = result;
      break;
    }
  }

  if (!selected || !rented) {
    return res.status(400).json({ message: "Cả 2 nguồn đều không lấy được số", attempts });
  }

  user.balance = Number(user.balance || 0) - Number(selected.price || 0);

  const order = {
    id: "o-" + Date.now(),
    provider: selected.provider,
    sourceKey: selected.sourceKey,
    providerQueueId: rented.providerQueueId,
    providerSimId: rented.providerSimId,
    userId,
    appId: String(appId),
    providerServiceId: selected.providerId,
    appName: selected.name,
    number: rented.number,
    providerCost: rented.providerCost,
    price: selected.price,
    status: "waiting",
    code: "",
    sms: "",
    createdAt: new Date().toISOString()
  };

  data.orders.unshift(order);
  writeData(data);

  res.json({ order, user: publicUser(user), attempts });
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

  const result = await checkCodeForOrder(order);

  if (result.status === "done") {
    order.status = "done";
    order.code = result.code || "";
    order.sms = result.sms || "";
    order.callFile = result.callFile || "";
  } else if (result.status === "expired") {
    order.status = "expired";
  }

  writeData(data);
  res.json({ order, api: result.api });
});

app.post("/api/orders/:id/cancel", async (req, res) => {
  const data = readData();
  const order = data.orders.find(o => o.id === req.params.id);

  if (!order) return res.status(404).json({ message: "Không tìm thấy order" });
  if (order.status !== "waiting") return res.status(400).json({ message: "Order không còn trạng thái chờ" });

  const result = await cancelAtProvider(order);

  if (result.ok) {
    const user = data.users.find(u => u.id === order.userId);
    if (user) user.balance = Number(user.balance || 0) + Number(order.price || 0);
    order.status = "canceled";
  }

  writeData(data);
  res.json({ order, api: result.api });
});

app.post("/api/topups", (req, res) => {
  const { userId, amount, note } = req.body;
  const data = readData();
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
  writeData(data);

  res.json(topup);
});

app.get("/api/topups", (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === req.query.userId);

  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  res.json(user.role === "admin" ? data.topups : data.topups.filter(t => t.userId === user.id));
});

app.post("/api/topups/:id/approve", requireAdmin, (req, res) => {
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

  writeData(data);
  res.json({ topup, user: publicUser(user) });
});

app.post("/api/topups/:id/reject", requireAdmin, (req, res) => {
  const data = req.data;
  const topup = data.topups.find(t => t.id === req.params.id);

  if (!topup) return res.status(404).json({ message: "Không tìm thấy yêu cầu nạp" });
  if (topup.status !== "pending") return res.status(400).json({ message: "Yêu cầu này đã xử lý rồi" });

  topup.status = "rejected";
  topup.rejectedAt = new Date().toISOString();
  topup.rejectedBy = req.admin.username;
  topup.rejectReason = req.body.reason || "";

  writeData(data);
  res.json(topup);
});

const distPath = path.resolve("dist");
app.use(express.static(distPath));
app.get(/.*/, (req, res) => res.sendFile(path.join(distPath, "index.html")));
app.listen(PORT, () => console.log("Server running on port " + PORT));
