const lobbyService = require("./services/lobby");
const userService = require("./services/user");
const { util } = require("./util");

async function create(socket, data) {
  let lobbyData = {
    lobby: data.lobby || util.randomString(20),
    owner: data.owner,
    state: {},
    gameType: data.gameType || "local",
    gameMode: data.gameMode || "4",
    password: data.password || null,
    time: new Date().getTime(),
  };

  const res = await lobbyService.createLobby(lobbyData);

  socket.emit("assignLobby", lobbyData);
}

async function update(socket, data) {
  lobbyData = {
    lobby: data.lobby,
    name: data.name,
  };

  const updateObj = lobbyData.data || {};
  const res = await lobbyService.updateLobby(updateObj, {
    lobby: lobbyData.lobby,
  });

  const lobby = await lobbyService.findLobby({ lobby: lobbyData.lobby });

  socket.emit("lobbyInfo", lobby);
}

async function state(socket, lobbyData) {
  const updateObj = { state: lobbyData.state } || {};
  const res = await lobbyService.updateLobby(updateObj, {
    lobby: lobbyData.lobby,
  });
}

async function createRoom(io, data) {
  const lobby = data.lobby || util.randomString(20);
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
}

async function synchronize(io, socket, data) {
  // console.log(data,'sdasf');
  const currentLobby = await lobbyService.findLobby({ lobby: data.lobby });

  data = {
    state: currentLobby?.state || {},
    lobby: currentLobby?.lobby || "",
  };

  if (!data) return;
  const users = await userService.findUser({ lobby: data.lobby });

  users.forEach((user) => {
    let socketId = user.connectionId;
    if (socket !== socket.id) io.to(socketId).emit("sync", data.state);
  });
}

async function destroy(io, data) {
  let res = await lobbyService.deleteLobby({ lobby: data.lobby });

  io.emit("lobbyDeath", { lobby: data.lobby });
}

exports.lobby = { create, update, state, synchronize, createRoom, destroy };
