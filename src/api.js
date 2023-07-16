const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const Crypto = require("crypto");

const userService = require("./services/user");
const lobbyService = require("./services/lobby");

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

function randomString(size = 21) {
  return Crypto.randomBytes(size).toString("base64").slice(0, size);
}

async function synchronize(socket, data) {
  // console.log(data,'sdasf');

  if (!data) return;
  const users = await userService.findUser({ lobby: data.lobby });

  users.forEach((user) => {
    let socketId = user.connectionId;
    if (socket !== socket.id) io.to(socketId).emit("sync", data.state);
  });
}

async function updateUser(socket, data) {
  let user = {
    name: data.name ?? randomString(5),
    lobby: data.lobby,
    active: data.active,
    connectionId: socket.id,
    updateTime: new Date().getTime(),
  };

  const res = await userService.updateUser(user);

  const users = await userService.findUser({ lobby: data.lobby, active: true });

  users.forEach((client) => {
    io.to(client.connectionId).emit("userUpdate", { users: users, user: user });
  });
}

async function updateLobby(socket, lobbyData) {
  const updateObj = lobbyData.data || {};
  const res = await lobbyService.updateLobby(updateObj, {
    lobby: lobbyData.lobby,
  });

  const lobby = await lobbyService.findLobby({ lobby: lobbyData.lobby });

  socket.emit("lobbyInfo", lobby);
}

async function updateState(socket, lobbyData) {
  const updateObj = { state: lobbyData.state } || {};
  const res = await lobbyService.updateLobby(updateObj, {
    lobby: lobbyData.lobby,
  });
}

io.on("connection", (socket) => {
  socket.on("addUser", async (data) => {
    let exists = false;

    let user = {
      id: data.id ?? randomString(5),
      name: data.name ?? randomString(5),
      lobby: data.lobby,
      active: data.active,
      connectionId: socket.id,
    };

    const res = await userService.uploadUser(user);
    if (!res) exists = true;
    else updateUser(user);

    socket.emit("userCheck", { flag: exists, name: data.name });
  });

  socket.on("updateUser", (data) => {
    updateUser(socket, data);
  });

  socket.on("synchronize", async (data) => {
    const lobby = await lobbyService.findLobby({ lobby: data.lobby });
    // console.log(lobby, "data");

    synchronize(socket, { state: lobby.state, lobby: lobby.lobby });
  });

  socket.on("roll", async (data) => {
    const users = await userService.findUser({ lobby: data.lobby });

    users.forEach((user) => {
      if (socket.id !== user.connectionId)
        io.to(user.connectionId).emit("roll", {
          roll: data.roll,
          turn: data.turn,
          owner: data.owner,
        });
    });
  });

  // update state
  socket.on("state", (data) => {
    // console.log("state Update called,");

    updateState(socket, { state: data.state, lobby: data.lobby });
  });

  socket.on("lobby", async (data) => {
    let lobbyData = {
      lobby: data.lobby || randomString(20),
      owner: data.owner,
      state: {},
      gameType: data.gameType || "local",
      gameMode: data.gameMode || "4",
      password: data.password || null,
    };

    const res = await lobbyService.createLobby(lobbyData);

    socket.emit("assignLobby", lobbyData);
  });

  socket.on("lobbyData", async (data) => {
    let lobbyData = {
      lobby: data.lobby,
      name: data.name,
    };

    updateLobby(socket, lobbyData);
  });

  socket.on("room", (data) => {
    const lobby = data.lobby || randomString(20);

    lobbies[lobby] = {};
    state[lobby] = [];

    io.to(data.sender).emit("invited", {
      reciever: data.reciever || null,
      lobby: lobby,
    });

    if (data.reciever)
      io.to(data.reciever).emit("invitation", {
        sender: data.sender,
        name: data.name,
        lobby: lobby,
      });
  });

  socket.on("destroyLobby", async (data) => {
    let res = await lobbyService.deleteLobby({ lobby: data.lobby });

    io.emit("lobbyDeath", { lobby: data.lobby });

    return;
  });

  socket.on("resetLobby", (data) => {
    const currentLobby = lobbies[data];
    state[data] = [];

    for (let socketId in currentLobby) io.to(socketId).emit("restart", {});
  });

  socket.on("assignName", (data) => [
    socket.emit("name", { name: randomString(5) }),
  ]);

  socket.on("disconnect", async (data) => {
    const user = await userService.findUser({ connectionId: socket.id });

    const res = await userService.updateUser(
      { active: false, lobby: null },
      { connectionId: socket.id }
    );

    if (!user[0]) return;
    // console.log(user[0].name, "disconnected");

    let users = [];

    users = await userService.findUser({ lobby: user[0].lobby });

    if (user[0].lobby)
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
