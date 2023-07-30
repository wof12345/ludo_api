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
    room: data.room || false,
  };

  const res = await lobbyService.createLobby(lobbyData);

  console.log("lobby created ", lobbyData.lobby);

  socket.emit("assignLobby", lobbyData);
}

async function get(socket, data) {
  const res = await lobbyService.findLobby({
    lobby: data.lobby,
  });

  const lobby = res;
  console.log(lobby?.lobby, "info");

  socket.emit("lobbyInfo", lobby);
}

async function state(socket, lobbyData) {
  const updateObj = { state: lobbyData.state } || {};

  const res = await lobbyService.updateLobby(updateObj, {
    lobby: lobbyData.lobby,
  });
  console.log("saved state ", res.lobby);
}

async function createRoom(io, data) {
  const lobby = data.lobby || util.randomString(20);
  const user = await userService.findUser({ connectionId: data.reciever });
  io.to(data.sender).emit("invited", {
    reciever: user.name || null,
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
    console.log(`synchronized user ${user.name}`);
    let socketId = user.connectionId;
    if (socketId !== socket.id) io.to(socketId).emit("sync", data.state);
  });
}

async function destroy(io, data) {
  let res = await lobbyService.deleteLobby({ lobby: data.lobby });

  console.log("lobby deleted ", data.lobby);

  io.emit("lobbyDeath", { lobby: data.lobby });
}

exports.lobby = {
  create,
  state,
  synchronize,
  createRoom,
  destroy,
  get,
};
