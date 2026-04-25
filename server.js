import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 10000;
const USERS_FILE = "./users.json";

app.use(cors());
app.use(express.json());

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(
      USERS_FILE,
      JSON.stringify(
        [
          {
            id: "admin-1",
            username: "admin",
            password: "hung0385601880",
            role: "admin",
            balance: 0
          }
        ],
        null,
        2
      )
    );
  }

  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.get("/api/users", (req, res) => {
  res.json(readUsers());
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  if (!username || !password) {
    return res.status(400).json({ message: "Thiếu tài khoản hoặc mật khẩu" });
  }

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: "Tài khoản đã tồn tại" });
  }

  const newUser = {
    id: "u-" + Date.now(),
    username,
    password,
    role: "user",
    balance: 0
  };

  users.push(newUser);
  writeUsers(users);

  res.json(newUser);
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
  }

  res.json(user);
});

app.put("/api/users/:id", (req, res) => {
  const users = readUsers();
  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: "Không tìm thấy user" });
  }

  users[index] = {
    ...users[index],
    ...req.body
  };

  writeUsers(users);
  res.json(users[index]);
});

app.delete("/api/users/:id", (req, res) => {
  const users = readUsers().filter(u => u.id !== req.params.id);
  writeUsers(users);
  res.json({ success: true });
});

const distPath = path.resolve("dist");
app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
