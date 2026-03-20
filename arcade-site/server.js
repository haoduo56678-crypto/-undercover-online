const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 👉 静态文件（让 /undercover-online 能访问）
app.use(express.static(path.join(__dirname)));

// 👉 简单房间逻辑（最基础联机）
let rooms = {};

io.on("connection", (socket) => {
  console.log("玩家连接:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    rooms[roomId].push(socket.id);

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      io.to(roomId).emit("updatePlayers", rooms[roomId]);
    }
  });
});

// 👉 Railway 必须用这个端口
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});