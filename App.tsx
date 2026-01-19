import { useEffect, useState } from "react";

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    // giả lập load dữ liệu
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Đang tải ứng dụng...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.center}>
        <h2>Đăng nhập</h2>
        <button
          style={styles.button}
          onClick={() => setUser({ username: "demo_user" })}
        >
          Đăng nhập demo
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>🎉 Web đã chạy thành công</h1>
      <p>Xin chào: <b>{user.username}</b></p>

      <button
        style={styles.button}
        onClick={() => setUser(null)}
      >
        Đăng xuất
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  center: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    fontFamily: "Arial, sans-serif"
  },
  container: {
    padding: "40px",
    fontFamily: "Arial, sans-serif"
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer"
  }
};

export default App;
