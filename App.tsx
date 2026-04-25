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

  const login = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    setUser(data);
  };

  const register = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("Đăng ký thành công");
    setIsLogin(true);
  };

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h2>{isLogin ? "Login" : "Register"}</h2>

        <form onSubmit={isLogin ? login : register}>
          <input
            placeholder="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <br />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <br />
          <button type="submit">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Switch to Register" : "Switch to Login"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Xin chào {user.username}</h2>
      <p>Role: {user.role}</p>
      <p>Balance: {user.balance}</p>

      {user.role === "admin" && (
        <div>
          <h3>Danh sách user</h3>
          {users.map(u => (
            <div key={u.id}>
              {u.username} - {u.balance}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setUser(null)}>Logout</button>
    </div>
  );
}
