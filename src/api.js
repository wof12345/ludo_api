const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const userService = require("./services/user");
const lobbyService = require("./services/lobby");

const { lobby } = require("./lobby");
const { user } = require("./user");
const { util } = require("./util");

const port = process.env.PORT;

let lobbies = {};
let state = {};

const io = require("socket.io")(server, {
  pingInterval: 1000 * 60 * 5,
  pingTimeout: 1000 * 60 * 3,
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("addUser", async (data) => {
    user.create(socket, data);
  });

  socket.on("updateUser", (data) => {
    user.update(io, socket, data);
  });

  socket.on("synchronize", async (data) => {
    // console.log(lobby, "data");

    lobby.synchronize(io, socket, data);
  });

  socket.on("roll", async (data) => {
    user.findAndSync(io, socket, data);
  });

  socket.on("syncClick", async (data) => {
    user.findAndSyncClick(io, socket, data);
  });

  // update state
  socket.on("state", (data) => {
    // console.log("state Update called,");

    lobby.state(socket, { state: data.state, lobby: data.lobby });
  });

  socket.on("lobby", async (data) => {
    //lobby creation
    lobby.create(socket, data);
  });

  socket.on("lobbyData", async (data) => {
    lobby.get(socket, data);
  });

  socket.on("room", (data) => {
    lobby.createRoom(io, data);
  });

  socket.on("kick", (data) => {
    console.log(data);

    // user.update(data);
  });

  socket.on("destroyLobby", async (data) => {
    lobby.destroy(io, data);

    return;
  });

  socket.on("resetLobby", (data) => {
    for (let socketId in currentLobby) io.to(socketId).emit("restart", {});
  });

  socket.on("assignName", (data) => [
    socket.emit("name", { name: util.randomString(5) }),
  ]);

  socket.on("disconnect", async (data) => {
    const user = await userService.findUser({ connectionId: socket.id });
    const res = await userService.updateUser(
      { active: false, lobby: null },
      { connectionId: socket.id }
    );
    if (!user[0]) return;
    console.log(user[0].name, "disconnected");
    let users = [];
    users = await userService.findUser({ lobby: user[0].lobby });
    if (users.length <= 0) {
      lobbyService.deleteLobby(user[0].lobby);
    }
    // if (user[0].lobby)
    users.forEach((client) => {
      if (client.connectionId !== socket.id)
        io.to(client.connectionId).emit("disconnection", {
          user: user[0],
          users: users,
        });
    });
  });
});

server.listen(port);
