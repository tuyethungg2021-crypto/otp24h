import React, { useEffect, useMemo, useState } from "react";

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
  providerId?: number;
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

type DmxProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  note?: string;
  stock?: number;
  sold?: number;
  hidden?: boolean;
};

type DmxOrder = {
  id: string;
  productName: string;
  price: number;
  image?: string;
  code: string;
  note?: string;
  createdAt: string;
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
  topupNote:
    "Nội dung chuyển khoản: username của bạn. Sau khi chuyển khoản hãy tạo yêu cầu nạp tiền để admin duyệt."
};

const carriers = [
  { label: "Tất cả nhà mạng", value: "" },
  { label: "Viettel", value: "Viettel" },
  { label: "Mobi", value: "Mobi" },
  { label: "Vina", value: "Vina" },
  { label: "VNMB", value: "VNMB" },
  { label: "ITelecom", value: "ITelecom" }
];

const money = (n: number) =>
  Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);

  const [dmxProducts, setDmxProducts] = useState<DmxProduct[]>([]);
  const [dmxOrders, setDmxOrders] = useState<DmxOrder[]>([]);

  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [tab, setTab] = useState("services");

  const [isLogin, setIsLogin] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [adminServiceSearch, setAdminServiceSearch] =
    useState("");

  const [selectedCarrier, setSelectedCarrier] =
    useState("");

  const [busy, setBusy] = useState(false);

  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");

  const [providerCounts, setProviderCounts] =
    useState<any>({});

  const [providerSettings, setProviderSettings] =
    useState<ProviderSettings>({
      chayEnabled: true,
      chayApiKeyMasked: "",
      hasChayApiKey: false,
      codesimEnabled: true,
      codesimApiKeyMasked: "",
      hasCodesimApiKey: false
    });

  const [chayApiKey, setChayApiKey] = useState("");
  const [codesimApiKey, setCodesimApiKey] =
    useState("");

  const [providerTest, setProviderTest] =
    useState<any>(null);

  const [newDmxName, setNewDmxName] = useState("");
  const [newDmxPrice, setNewDmxPrice] = useState("");
  const [newDmxImage, setNewDmxImage] = useState("");
  const [newDmxNote, setNewDmxNote] = useState("");

  const headers = user
    ? {
        "Content-Type": "application/json",
        "x-user-id": user.id
      }
    : {
        "Content-Type": "application/json"
      };

  const isAdmin = user?.role === "admin";

  const show = (msg: string) => {
    setNotice(msg);

    window.setTimeout(() => {
      setNotice("");
    }, 3500);
  };

  const imageToBase64 = (
    file: File,
    callback: (value: string) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      show("Chỉ được tải file ảnh");
      return;
    }

    if (file.size > 1024 * 1024 * 2) {
      show("Ảnh tối đa 2MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      callback(String(reader.result));
    };

    reader.readAsDataURL(file);
  };

  const loadSettings = async () => {
    const res = await fetch("/api/settings");

    if (res.ok) {
      const data = await res.json();

      setSettings({
        ...defaultSettings,
        ...data
      });
    }
  };

  const loadServices = async () => {
    const res = await fetch("/api/services");

    if (res.ok) {
      setServices(await res.json());
    }
  };

  const loadUsers = async () => {
    if (!user || !isAdmin) return;

    const res = await fetch("/api/user-stats", {
      headers
    });

    if (res.ok) {
      setUsers(await res.json());
    }
  };

  const loadOrders = async () => {
    if (!user) return;

    const res = await fetch(
      `/api/orders?userId=${user.id}`
    );

    if (res.ok) {
      setOrders(await res.json());
    }
  };

  const loadTopups = async () => {
    if (!user) return;

    const res = await fetch(
      `/api/topups?userId=${user.id}`
    );

    if (res.ok) {
      setTopups(await res.json());
    }
  };

  const loadDmxProducts = async () => {
    const res = await fetch("/api/dmx/products");

    if (res.ok) {
      setDmxProducts(await res.json());
    }
  };

  const loadDmxOrders = async () => {
    if (!user) return;

    const res = await fetch(
      `/api/dmx/orders?userId=${user.id}`
    );

    if (res.ok) {
      setDmxOrders(await res.json());
    }
  };

  const loadAdminDmx = async () => {
    if (!user || !isAdmin) return;

    const res = await fetch(
      "/api/admin/dmx/products",
      {
        headers
      }
    );

    if (res.ok) {
      setDmxProducts(await res.json());
    }
  };

  useEffect(() => {
    loadSettings();
    loadServices();
    loadDmxProducts();
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadTopups();
      loadUsers();
      loadDmxOrders();
      loadAdminDmx();
    }
  }, [user]);

  const login = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setBusy(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return show(
          data.message ||
            "Đăng nhập thất bại"
        );
      }

      setUser(data);

      show("Đăng nhập thành công");
    } finally {
      setBusy(false);
    }
  };
    const register = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setBusy(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return show(
          data.message ||
            "Đăng ký thất bại"
        );
      }

      show(
        "Đăng ký thành công, hãy đăng nhập"
      );

      setIsLogin(true);
    } finally {
      setBusy(false);
    }
  };

  const rentNumber = async (
    service: Service
  ) => {
    if (!user) return;

    if (
      !confirm(
        `Thuê ${service.name} giá ${money(
          service.price
        )}?`
      )
    ) {
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: user.id,
        appId:
          service.sourceKey || service.id,
        carrier: selectedCarrier
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Không lấy được số"
      );
    }

    setUser(data.user);

    await loadOrders();

    show("Đã lấy số thành công");
  };

  const checkCode = async (
    order: Order
  ) => {
    const res = await fetch(
      `/api/orders/${order.id}/check-code`,
      {
        method: "POST"
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Không check được code"
      );
    }

    await loadOrders();

    if (
      data.order?.status === "expired" &&
      data.order?.refunded
    ) {
      show(
        "Số đã hết hạn, hệ thống đã hoàn tiền"
      );
    } else if (data.order?.code) {
      show("Đã có OTP");
    } else {
      show(
        data.api?.Msg ||
          data.api?.message ||
          "Đang chờ OTP"
      );
    }
  };

  const reuseOrder = async (
    order: Order
  ) => {
    if (
      !confirm(
        `Thuê lại số ${order.number}?`
      )
    ) {
      return;
    }

    const res = await fetch(
      `/api/orders/${order.id}/reuse`,
      {
        method: "POST"
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Không thuê lại được"
      );
    }

    if (data.user) {
      setUser(data.user);
    }

    await loadOrders();

    show("Đã thuê lại số");
  };

  const buyDmx = async (
    product: DmxProduct
  ) => {
    if (!user) return;

    if (
      !confirm(
        `Mua ${product.name} giá ${money(
          product.price
        )}?`
      )
    ) {
      return;
    }

    const res = await fetch(
      "/api/dmx/buy",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: user.id,
          productId: product.id
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Lỗi mua voucher"
      );
    }

    setUser(data.user);

    await loadDmxProducts();
    await loadDmxOrders();

    show("Mua voucher thành công");
  };

  const createDmxProduct = async () => {
    const res = await fetch(
      "/api/admin/dmx/products",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newDmxName,
          price: Number(
            newDmxPrice || 0
          ),
          image: newDmxImage,
          note: newDmxNote
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Lỗi tạo sản phẩm"
      );
    }

    setNewDmxName("");
    setNewDmxPrice("");
    setNewDmxImage("");
    setNewDmxNote("");

    await loadAdminDmx();

    show("Đã tạo sản phẩm");
  };

  const uploadDmxCodes = async (
    product: DmxProduct
  ) => {
    const codes = prompt(
      "Nhập voucher, mỗi dòng 1 mã"
    );

    if (!codes) return;

    const res = await fetch(
      `/api/admin/dmx/products/${product.id}/codes`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          codes
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Lỗi upload mã"
      );
    }

    await loadAdminDmx();

    show(`Đã thêm ${data.added} mã`);
  };

  const deleteDmxProduct = async (
    product: DmxProduct
  ) => {
    if (
      !confirm(
        `Xóa ${product.name}?`
      )
    ) {
      return;
    }

    await fetch(
      `/api/admin/dmx/products/${product.id}`,
      {
        method: "DELETE",
        headers
      }
    );

    await loadAdminDmx();

    show("Đã xóa sản phẩm");
  };

  const createTopup = async () => {
    if (!user) return;

    const amount = Number(
      topupAmount || 0
    );

    if (
      !amount ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      return show(
        "Nhập số tiền hợp lệ"
      );
    }

    const res = await fetch(
      "/api/topups",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: user.id,
          amount,
          note: topupNote
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return show(
        data.message ||
          "Lỗi tạo yêu cầu nạp"
      );
    }

    setTopupAmount("");
    setTopupNote("");

    await loadTopups();

    show("Đã gửi yêu cầu nạp");
  };

  const filteredServices = useMemo(
    () =>
      services.filter(s =>
        `${s.name}`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
      ),
    [services, search]
  );

  if (!user) {
    return (
      <div
        className={`min-h-screen ${settings.background} flex items-center justify-center p-4`}
      >
        {notice && (
          <Toast>
            {notice}
          </Toast>
        )}

        <form
          onSubmit={
            isLogin
              ? login
              : register
          }
          className="bg-white rounded-3xl p-8 shadow max-w-md w-full"
        >
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl grid place-items-center font-black text-2xl mb-4 overflow-hidden">
            {settings.logoImage ? (
              <img
                src={
                  settings.logoImage
                }
                className="w-full h-full object-cover"
              />
            ) : (
              settings.logoText
            )}
          </div>

          <h1 className="text-3xl font-black mb-2">
            {settings.siteName}
          </h1>

          <p className="text-slate-500 mb-6">
            {isLogin
              ? "Đăng nhập tài khoản"
              : "Tạo tài khoản mới"}
          </p>

          <input
            value={username}
            onChange={e =>
              setUsername(
                e.target.value
              )
            }
            className="w-full border rounded-2xl px-5 py-4 mb-4"
            placeholder="Tài khoản"
          />

          <input
            value={password}
            onChange={e =>
              setPassword(
                e.target.value
              )
            }
            type="password"
            className="w-full border rounded-2xl px-5 py-4 mb-4"
            placeholder="Mật khẩu"
          />

          <button
            disabled={busy}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black"
          >
            {busy
              ? "Đang xử lý..."
              : isLogin
              ? "ĐĂNG NHẬP"
              : "ĐĂNG KÝ"}
          </button>

          <button
            type="button"
            onClick={() =>
              setIsLogin(
                !isLogin
              )
            }
            className="mt-5 w-full text-indigo-600 font-bold"
          >
            {isLogin
              ? "Chưa có tài khoản? Đăng ký"
              : "Đã có tài khoản? Đăng nhập"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {notice && (
        <Toast>{notice}</Toast>
      )}

      <aside className="fixed left-0 top-0 h-full w-72 bg-slate-950 text-white p-5 hidden lg:block overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl grid place-items-center font-black overflow-hidden">
            {settings.logoImage ? (
              <img
                src={
                  settings.logoImage
                }
                className="w-full h-full object-cover"
              />
            ) : (
              settings.logoText
            )}
          </div>

          <h2 className="font-black text-xl">
            {settings.siteName}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 mb-4">
          <b>{user.username}</b>

          <p className="text-slate-400 text-sm">
            Số dư:{" "}
            {money(user.balance)}
          </p>
        </div>

        <Nav
          label="Dịch vụ OTP"
          id="services"
          tab={tab}
          setTab={setTab}
        />

        <Nav
          label="Lịch sử thuê"
          id="orders"
          tab={tab}
          setTab={setTab}
        />

        <Nav
          label="Dịch vụ DMX"
          id="dmx"
          tab={tab}
          setTab={setTab}
        />

        <Nav
          label="Nạp tiền"
          id="topup"
          tab={tab}
          setTab={setTab}
        />

        {isAdmin && (
          <>
            <Nav
              label="Quản lý DMX"
              id="adminDmx"
              tab={tab}
              setTab={setTab}
            />
          </>
        )}
      </aside>

      <main className="lg:ml-72 p-4 lg:p-8">
        <div className="lg:hidden flex gap-2 overflow-x-auto mb-4">
          {[
            "services",
            "orders",
            "dmx",
            "topup",
            ...(isAdmin ? ["adminDmx"] : [])
          ].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="bg-slate-900 text-white rounded-xl px-4 py-2 whitespace-nowrap"
            >
              {t}
            </button>
          ))}
        </div>

        {settings.announcement && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-5 font-semibold whitespace-pre-line">
            {settings.announcement}
          </div>
        )}

        {tab === "services" && (
          <Panel title="Dịch vụ OTP">
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <button
                onClick={loadServices}
                className="bg-slate-900 text-white rounded-2xl px-5 py-3 font-bold"
              >
                Tải lại
              </button>

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 border rounded-2xl px-5 py-3"
                placeholder="Tìm dịch vụ..."
              />

              <select
                value={selectedCarrier}
                onChange={e => setSelectedCarrier(e.target.value)}
                className="border rounded-2xl px-5 py-3"
              >
                {carriers.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredServices.map(s => (
                <div
                  key={s.sourceKey || s.id}
                  className="bg-white border rounded-3xl p-5 shadow-sm"
                >
                  <h3 className="text-xl font-black">{s.name}</h3>

                  <p className="text-sm text-slate-500">
                    Dịch vụ nhận OTP tự động
                  </p>

                  {s.note && (
                    <p className="text-sm bg-slate-100 rounded-xl p-3 mt-3">
                      {s.note}
                    </p>
                  )}

                  <p className="text-2xl font-black text-indigo-600 mt-4">
                    {money(s.price)}
                  </p>

                  <button
                    disabled={busy}
                    onClick={() => rentNumber(s)}
                    className="mt-5 w-full bg-indigo-600 text-white rounded-2xl py-3 font-black"
                  >
                    Thuê số
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {tab === "orders" && (
          <Panel title="Lịch sử thuê số">
            <div className="space-y-3">
              {orders.map(o => (
                <OrderBox
                  key={o.id}
                  order={o}
                  isAdmin={isAdmin}
                  users={users}
                  onCheck={checkCode}
                  onReuse={reuseOrder}
                />
              ))}
            </div>
          </Panel>
        )}

        {tab === "dmx" && (
          <Panel title="Dịch vụ DMX">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dmxProducts.map(p => (
                <div
                  key={p.id}
                  className="bg-white border rounded-3xl p-5 shadow-sm"
                >
                  {p.image && (
                    <img
                      src={p.image}
                      className="w-full h-48 object-cover rounded-2xl mb-4"
                    />
                  )}

                  <h3 className="text-xl font-black">{p.name}</h3>

                  <p className="text-sm text-slate-500 mt-2">
                    Còn {p.stock || 0} mã
                  </p>

                  {p.note && (
                    <div className="bg-slate-100 rounded-2xl p-3 mt-3 text-sm whitespace-pre-wrap">
                      {p.note}
                    </div>
                  )}

                  <p className="text-2xl font-black text-indigo-600 mt-4">
                    {money(p.price)}
                  </p>

                  <button
                    onClick={() => buyDmx(p)}
                    className="mt-5 w-full bg-indigo-600 text-white rounded-2xl py-3 font-black"
                  >
                    Mua ngay
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-black mb-4">
                Lịch sử mua voucher
              </h2>

              <div className="space-y-3">
                {dmxOrders.map(o => (
                  <div key={o.id} className="border rounded-2xl p-4 bg-white">
                    <div className="flex gap-4">
                      {o.image && (
                        <img
                          src={o.image}
                          className="w-28 h-28 object-cover rounded-2xl"
                        />
                      )}

                      <div className="flex-1">
                        <h3 className="font-black text-xl">
                          {o.productName}
                        </h3>

                        <p className="text-sm text-slate-500">
                          Giá: {money(o.price)} |{" "}
                          {new Date(o.createdAt).toLocaleString("vi-VN")}
                        </p>

                        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <b>{o.code}</b>
                        </div>

                        {o.note && (
                          <div className="mt-3 bg-slate-100 rounded-xl p-3 text-sm whitespace-pre-wrap">
                            {o.note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {tab === "topup" && (
          <Panel title="Nạp tiền">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-3xl p-5">
                <h2 className="text-2xl font-black mb-3">
                  Thông tin chuyển khoản
                </h2>

                <p>
                  Ngân hàng: <b>{settings.bankName}</b>
                </p>

                <p>
                  Số tài khoản: <b>{settings.bankAccountNumber}</b>
                </p>

                <p>
                  Chủ tài khoản: <b>{settings.bankBeneficiary}</b>
                </p>

                <p>
                  Nội dung: <b>{user.username}</b>
                </p>

                {settings.bankQrUrl && (
                  <img
                    src={settings.bankQrUrl}
                    className="rounded-2xl mt-4 max-w-xs"
                  />
                )}

                {settings.topupNote && (
                  <p className="mt-4 text-sm text-slate-600">
                    {settings.topupNote}
                  </p>
                )}
              </div>

              <div>
                <h2 className="text-2xl font-black mb-3">
                  Tạo yêu cầu nạp
                </h2>

                <input
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  className="w-full border rounded-2xl px-5 py-4 mb-4"
                  placeholder="Số tiền đã chuyển"
                />

                <input
                  value={topupNote}
                  onChange={e => setTopupNote(e.target.value)}
                  className="w-full border rounded-2xl px-5 py-4 mb-4"
                  placeholder="Ghi chú / mã giao dịch"
                />

                <button
                  onClick={createTopup}
                  className="w-full bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black"
                >
                  Gửi yêu cầu nạp tiền
                </button>
              </div>
            </div>
          </Panel>
        )}

        {tab === "adminDmx" && isAdmin && (
          <Panel title="Quản lý DMX">
            <div className="bg-white border rounded-3xl p-5 mb-6 space-y-4">
              <input
                value={newDmxName}
                onChange={e => setNewDmxName(e.target.value)}
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="Tên sản phẩm"
              />

              <input
                value={newDmxPrice}
                onChange={e => setNewDmxPrice(e.target.value)}
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="Giá bán"
              />

              <textarea
                value={newDmxNote}
                onChange={e => setNewDmxNote(e.target.value)}
                className="w-full border rounded-2xl px-5 py-4"
                placeholder="Ghi chú / hướng dẫn sử dụng voucher"
              />

              <div className="border rounded-2xl p-4">
                <p className="font-bold mb-2">Ảnh sản phẩm</p>

                {newDmxImage && (
                  <img
                    src={newDmxImage}
                    className="w-40 rounded-2xl mb-3"
                  />
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      imageToBase64(file, value => setNewDmxImage(value));
                    }
                  }}
                  className="w-full border rounded-2xl px-5 py-4"
                />
              </div>

              <button
                onClick={createDmxProduct}
                className="bg-indigo-600 text-white rounded-2xl px-6 py-4 font-black"
              >
                Tạo sản phẩm
              </button>
            </div>

            <div className="space-y-4">
              {dmxProducts.map(p => (
                <div key={p.id} className="border rounded-3xl p-5 bg-white">
                  <div className="flex gap-4">
                    {p.image && (
                      <img
                        src={p.image}
                        className="w-32 h-32 object-cover rounded-2xl"
                      />
                    )}

                    <div className="flex-1">
                      <h3 className="text-2xl font-black">{p.name}</h3>

                      <p className="text-slate-500">
                        Giá bán: {money(p.price)}
                      </p>

                      <p className="text-slate-500">
                        Kho còn: {p.stock || 0}
                      </p>

                      <p className="text-slate-500">
                        Đã bán: {p.sold || 0}
                      </p>

                      {p.note && (
                        <div className="bg-slate-100 rounded-2xl p-3 mt-3 text-sm whitespace-pre-wrap">
                          {p.note}
                        </div>
                      )}

                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button
                          onClick={() => uploadDmxCodes(p)}
                          className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold"
                        >
                          Upload mã
                        </button>

                        <button
                          onClick={() => deleteDmxProduct(p)}
                          className="bg-rose-600 text-white rounded-xl px-4 py-2 font-bold"
                        >
                          Xóa sản phẩm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function Toast({ children }: { children: any }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white rounded-2xl px-5 py-3 shadow font-bold">
      {children}
    </div>
  );
}

function Nav({ label, id, tab, setTab }: any) {
  return (
    <button
      onClick={() => setTab(id)}
      className={`w-full rounded-2xl px-4 py-3 text-left font-bold mb-2 ${
        tab === id ? "bg-indigo-600" : "bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow mb-6">
      <h1 className="text-3xl font-black mb-5">{title}</h1>
      {children}
    </div>
  );
}

function OrderBox({ order, isAdmin, users = [], onCheck, onReuse }: any) {
  const orderUser = users.find((u: User) => u.id === order.userId);

  return (
    <div className="border rounded-2xl p-4 bg-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-black text-xl">
            {order.appName} - {order.number}
          </h3>

          <p className="text-sm text-slate-500">
            {isAdmin && (
              <>
                User: {orderUser?.username || order.userId || "Không rõ"} |
                Nguồn: {order.provider || "api"} |{" "}
              </>
            )}
            Nhà mạng: {order.carrier || "Tất cả"} | Trạng thái:{" "}
            {order.status} | Giá: {money(order.price)}
          </p>

          <p className="text-xs text-slate-400">
            {new Date(order.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {order.status === "waiting" && (
            <button
              onClick={() => onCheck(order)}
              className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-bold"
            >
              Check OTP
            </button>
          )}

          {order.provider === "codesim" && order.status === "done" && (
            <button
              onClick={() => onReuse(order)}
              className="bg-emerald-600 text-white rounded-xl px-4 py-2 font-bold"
            >
              Thuê lại
            </button>
          )}
        </div>
      </div>

      {order.code ? (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <b>OTP: {order.code}</b>
        </div>
      ) : (
        order.status === "waiting" && (
          <p className="mt-3 text-slate-500">Đang tự động chờ OTP...</p>
        )
      )}

      {order.sms && (
        <pre className="mt-3 bg-slate-100 rounded-xl p-3 whitespace-pre-wrap text-sm">
          {order.sms}
        </pre>
      )}
    </div>
  );
}
