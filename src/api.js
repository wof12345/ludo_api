const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const Crypto = require("crypto");

const db = require("./connection");

//init db connection
// db.client.connect();

let clients = {};
let users = {};

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

function randomString(size = 21) {
  return Crypto.randomBytes(size).toString("base64").slice(0, size);
}

io.on("connection", (socket) => {
  socket.on("addPlayer", (data) => {
    clients[socket.id] = { playerId: randomString(5), playerName: data };
    console.log(clients, "player", data);

    io.emit("playerUpdate", clients);
  });

  socket.on("addUser", (data) => {
    // console.log(data, "add");

    users[socket.id] = {
      playerId: randomString(5),
      name: data.name ?? randomString(5),
      lobby: data.lobby ?? "",
    };
    console.log(users, "users");

    io.emit("userUpdate", users);
  });

  socket.on("roll", (data) => {
    console.log("roll", data);

    socket.broadcast.emit("roll", data);
  });

  socket.on("lobby", (data) => {
    let lobby = randomString(20);

    socket.emit("assignLobby", lobby);
  });

  socket.on("disconnect", (data) => {
    io.emit("disconnected", clients[socket.id]);
    delete clients[socket.id];
    delete users[socket.id];
  });
});

server.listen(3000);
