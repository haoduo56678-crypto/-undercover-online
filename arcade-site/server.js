const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ROOT = __dirname;
const GAME_DIR = path.join(ROOT, "undercover-online");

// 先单独托管游戏目录里的静态资源
app.use("/undercover-online", express.static(GAME_DIR));

// 根路径直接跳到游戏
app.get("/", (req, res) => {
  res.redirect("/undercover-online/");
});

// 明确返回游戏首页
app.get(["/undercover-online", "/undercover-online/"], (req, res) => {
  res.sendFile(path.join(GAME_DIR, "index.html"));
});

// 兜底：任何没匹配到的 undercover-online 路径也回首页
app.get("/undercover-online/*", (req, res) => {
  res.sendFile(path.join(GAME_DIR, "index.html"));
});

// ===== socket =====
let rooms = {};

io.on("connection", (socket) => {
  console.log("玩家连接:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (!rooms[roomId].includes(socket.id)) {
      rooms[roomId].push(socket.id);
    }

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      io.to(roomId).emit("updatePlayers", rooms[roomId]);
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});