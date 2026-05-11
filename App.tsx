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
