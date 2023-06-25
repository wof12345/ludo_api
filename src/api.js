const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://127.0.0.1:5500",

    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(socket.id);
});

server.listen(3000);
