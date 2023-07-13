const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const Crypto = require("crypto");

const db = require("./connection");
const port = process.env.PORT;

//init db connection
// db.client.connect();

let lobbies = {};
let users = {};
let state = {};

const io = require("socket.io")(server, {
  pingInterval: 1000 * 60 * 5,
  pingTimeout: 1000 * 60 * 3,
  cors: {
    origin: "*",
  },
});

function randomString(size = 21) {
  return Crypto.randomBytes(size).toString("base64").slice(0, size);
}

function synchronize(socket, socketId, data) {
  const currentLobbyState = state[data.lobby];
  io.to(socketId).emit("sync", currentLobbyState);
}

io.on("connection", (socket) => {
  socket.on("addPlayer", (data) => {
    if (!lobbies[data.lobby]) return;

    let newPlayer = {
      playerId: randomString(5),
      name: data.name == "" ? randomString(5) : data.name,
      lobby: data.lobby ?? "",
      connectionId: socket.id,
    };

    lobbies[data.lobby][socket.id] = newPlayer;

    // io.emit("playerUpdate", [lobbies, lobbies[socket.id]]);

    const currentLobby = lobbies[data.lobby];

    // console.log(currentLobby, "los");

    for (let socketId in currentLobby) {
      io.to(socketId).emit("playerUpdate", [currentLobby, socket.id]);

      synchronize(socket, socketId, data);
    }
  });

  socket.on("synchronize", (data) => {
    const currentLobby = lobbies[data.lobby];
    for (let socketId in currentLobby) {
      synchronize(socket, socketId, data);
    }
  });

  socket.on("addUser", (data) => {
    // console.log(data, "add");

    users[socket.id] = {
      playerId: randomString(5),
      name: data.name ?? randomString(5),
      lobby: data.lobby ?? "",
    };
    // console.log(users, "users");

    socket.broadcast.emit("userUpdate", users);
  });

  socket.on("roll", (data) => {
    // console.log("roll", data);

    let currentLobby = lobbies[data.lobby];

    if (!currentLobby) return;

    for (let socketId in currentLobby)
      if (socket.id !== socketId) {
        io.to(socketId).emit("roll", {
          roll: data.roll,
          turn: data.turn,
          owner: data.owner,
        });
      }
  });

  socket.on("state", (data) => {
    state[data.lobby] = data;
    // console.log(data, "state");
  });

  socket.on("lobby", (data) => {
    let lobby = randomString(20);

    lobbies[lobby] = {};
    state[lobby] = [];

    socket.emit("assignLobby", lobby);
  });

  socket.on("destroyLobby", (data) => {
    const currentLobby = lobbies[data];
    for (let socketId in currentLobby)
      io.to(socketId).emit("lobbyDeath", [currentLobby, socket.id]);
    delete lobbies[data];
  });

  socket.on("disconnect", (data) => {
    const user = users[socket.id];
    const lobby = user?.lobby || "";

    // console.log(user, "dis");
    io.emit("disconnected", user);

    delete users[socket.id];

    if (lobby !== "" && lobbies[lobby]) delete lobbies[lobby][socket.id];

    const currentLobby = lobbies[lobby];
    if (lobby !== "" && lobbies[lobby])
      for (let socketId in currentLobby)
        io.to(socketId).emit("playerUpdate", [currentLobby, socket.id]);

    socket.broadcast.emit("userUpdate", users);
  });
});

server.listen(port);
