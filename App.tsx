import React, { useEffect, useState } from "react";

type Role = "admin" | "user";

type User = {
  id: string;
  username: string;
  password?: string;
  role: Role;
  balance: number;
};

type ToastType = "success" | "error" | "info";

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = async () => {
    const res = await fetch("/api/users");
    const data: User[] = await res.json();
    setUsers(data);

    const savedId = localStorage.getItem("otpsim_session_userid");
    if (savedId) {
      const found = data.find(u => u.id === savedId);
      if (found) setUser(found);
    }
  };

  useEffect(() => {
    loadUsers().catch(() => showToast("Không tải được user", "error"));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Đăng nhập thất bại", "error");
        return;
      }

      setUser(data);
      localStorage.setItem("otpsim_session_userid", data.id);
      showToast("Đăng nhập thành công");
    } catch {
      showToast("Lỗi kết nối server", "error");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Đăng ký thất bại", "error");
        return;
      }

      setUsers(prev => [...prev, data]);
      showToast("Đăng ký thành công, hãy đăng nhập");
      setIsLogin(true);
    } catch {
      showToast("Lỗi kết nối server", "error");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("otpsim_session_userid");
    setTab("dashboard");
  };

  const updateBalance = async (target: User) => {
    const amountText = prompt(`Nhập số tiền cộng/trừ cho ${target.username}. Ví dụ: 50000 hoặc -50000`);
    if (!amountText) return;

    const amount = Number(amountText);
    if (Number.isNaN(amount)) {
      showToast("Số tiền không hợp lệ", "error");
      return;
    }

    const newBalance = Math.max(0, target.balance + amount);

    const res = await fetch(`/api/users/${target.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: newBalance })
    });

    const updated = await res.json();

    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    if (user?.id === updated.id) setUser(updated);
    showToast("Đã cập nhật số dư");
  };

  const deleteUser = async (target: User) => {
    if (target.role === "admin") {
      showToast("Không thể xóa admin", "error");
      return;
    }

    if (!confirm(`Xóa tài khoản ${target.username}?`)) return;

    await fetch(`/api/users/${target.id}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== target.id));
    showToast("Đã xóa user", "info");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-900">
        {toast && (
          <div className="fixed top-5 right-5 z-50 rounded-xl bg-white px-5 py-3 font-bold shadow-xl">
            {toast.message}
          </div>
        )}

        <form
          onSubmit={isLogin ? handleLogin : handleRegister}
          className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black">
              S
            </div>
            <h1 className="text-3xl font-black">OTP 24H</h1>
            <p className="text-slate-500 mt-2">
              {isLogin ? "Đăng nhập hệ thống" : "Đăng ký tài khoản mới"}
            </p>
          </div>

          <input
            className="w-full mb-4 rounded-2xl border px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100"
            placeholder="Tài khoản"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />

          <input
            className="w-full mb-6 rounded-2xl border px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100"
            placeholder="Mật khẩu"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button className="w-full rounded-2xl bg-indigo-600 py-4 text-white font-black hover:bg-indigo-700">
            {isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="mt-5 w-full text-sm font-bold text-indigo-600"
          >
            {isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </button>

          <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-xs text-slate-600">
            Admin mặc định: <b>admin</b> / <b>hung0385601880</b>
          </div>
        </form>
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-white px-5 py-3 font-bold shadow-xl">
          {toast.message}
        </div>
      )}

      <div className="flex">
        <aside className="w-72 min-h-screen bg-white p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
              S
            </div>
            <div>
              <h2 className="font-black text-xl">OTP 24H</h2>
              <p className="text-xs text-slate-500">{user.username}</p>
            </div>
          </div>

          <button onClick={() => setTab("dashboard")} className="w-full mb-3 rounded-2xl bg-slate-100 px-4 py-3 font-bold">
            Trang chủ
          </button>

          {isAdmin && (
            <button onClick={() => setTab("users")} className="w-full mb-3 rounded-2xl bg-slate-100 px-4 py-3 font-bold">
              Quản lý user
            </button>
          )}

          <button onClick={logout} className="w-full mt-8 rounded-2xl bg-rose-600 px-4 py-3 text-white font-black">
            Đăng xuất
          </button>
        </aside>

        <main className="flex-1 p-8">
          {tab === "dashboard" && (
            <div>
              <h1 className="text-3xl font-black mb-6">Trang chủ</h1>

              <div className="grid md:grid-cols-3 gap-5">
                <div className="rounded-3xl bg-white p-6 shadow">
                  <p className="text-slate-500 text-sm">Tài khoản</p>
                  <h2 className="text-2xl font-black">{user.username}</h2>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow">
                  <p className="text-slate-500 text-sm">Vai trò</p>
                  <h2 className="text-2xl font-black">{user.role}</h2>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow">
                  <p className="text-slate-500 text-sm">Số dư</p>
                  <h2 className="text-2xl font-black">{user.balance.toLocaleString("vi-VN")}đ</h2>
                </div>
              </div>

              <div className="mt-8 rounded-3xl bg-white p-6 shadow">
                <h2 className="font-black text-xl mb-2">Web đã hoạt động</h2>
                <p className="text-slate-500">
                  Bản này đã sửa lỗi trắng màn hình, đăng ký user lưu lên server, admin xem được danh sách user.
                </p>
              </div>
            </div>
          )}

          {tab === "users" && isAdmin && (
            <div>
              <h1 className="text-3xl font-black mb-6">Quản lý user</h1>

              <div className="rounded-3xl bg-white p-6 shadow overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3">Username</th>
                      <th className="py-3">Role</th>
                      <th className="py-3">Số dư</th>
                      <th className="py-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b">
                        <td className="py-4 font-bold">{u.username}</td>
                        <td className="py-4">{u.role}</td>
                        <td className="py-4">{u.balance.toLocaleString("vi-VN")}đ</td>
                        <td className="py-4 flex gap-2">
                          <button
                            onClick={() => updateBalance(u)}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-white text-xs font-black"
                          >
                            Sửa tiền
                          </button>
                          <button
                            onClick={() => deleteUser(u)}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-white text-xs font-black"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
