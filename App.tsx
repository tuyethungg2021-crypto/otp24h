import React, { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  role: "admin" | "user";
  balance: number;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const loadUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Đăng nhập thất bại");
      return;
    }

    setUser(data);
    await loadUsers();
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Đăng ký thất bại");
      return;
    }

    alert("Đăng ký thành công");
    setIsLogin(true);
    await loadUsers();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black">
              S
            </div>
            <h1 className="text-3xl font-black mt-4">OTP 24H</h1>
            <p className="text-slate-500 mt-2">
              {isLogin ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}
            </p>
          </div>

          <form onSubmit={isLogin ? login : register} className="space-y-4">
            <input
              className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />

            <input
              className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-100"
              placeholder="Mật khẩu"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button className="w-full rounded-2xl bg-indigo-600 text-white py-4 font-black hover:bg-indigo-700">
              {isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ"}
            </button>
          </form>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="mt-5 w-full text-indigo-600 font-bold"
          >
            {isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
          </button>

          <div className="mt-6 bg-slate-100 rounded-2xl p-4 text-sm text-slate-600">
            Admin: <b>admin</b> / <b>hung0385601880</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-72 bg-white min-h-screen p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black">
            S
          </div>
          <div>
            <h2 className="text-xl font-black">OTP 24H</h2>
            <p className="text-sm text-slate-500">{user.username}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full bg-indigo-600 text-white rounded-2xl py-3 font-bold">
            Dashboard
          </button>

          <button
            onClick={() => setUser(null)}
            className="w-full bg-rose-600 text-white rounded-2xl py-3 font-bold"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-black mb-6">Xin chào, {user.username}</h1>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow">
            <p className="text-slate-500 text-sm">Tài khoản</p>
            <h2 className="text-2xl font-black">{user.username}</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow">
            <p className="text-slate-500 text-sm">Vai trò</p>
            <h2 className="text-2xl font-black">{user.role}</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow">
            <p className="text-slate-500 text-sm">Số dư</p>
            <h2 className="text-2xl font-black">
              {user.balance.toLocaleString("vi-VN")}đ
            </h2>
          </div>
        </div>

        {user.role === "admin" && (
          <div className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-2xl font-black mb-4">Quản lý user</h2>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-3">Username</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="py-4 font-bold">{u.username}</td>
                    <td className="py-4">{u.role}</td>
                    <td className="py-4">{u.balance.toLocaleString("vi-VN")}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
