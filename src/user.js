const userService = require("./services/user");
const { util } = require("./util");

async function create(socket, data) {
  let exists = false;

  let user = {
    id: data?.id ?? util.randomString(5),
    name: data.name ?? util.randomString(5),
    lobby: data.lobby,
    active: data.active,
    connectionId: socket.id,
  };

  console.log("created user", user.name);

  const res = await userService.uploadUser(user);
  if (!res) exists = true;
  else userService.updateUser(user);

  socket.emit("userCheck", { flag: exists, name: data.name });
}

async function update(io, socket, data) {
  let user = {
    name: data.name || "",
    lobby: data.lobby,
    active: data.active,
    connectionId: socket.id,
    updateTime: new Date().getTime(),
  };

  console.log("updated user", user.name);

  const res = await userService.updateUser(user);

  const users = await userService.findUser({ lobby: data.lobby, active: true });

  users.forEach((client) => {
    io.to(client.connectionId).emit("userUpdate", { users: users, user: user });
  });
}

async function findAndSync(io, socket, data) {
  const users = await userService.findUser({ lobby: data.lobby });

  users.forEach((user) => {
    console.log("synced user", user.name);
    if (socket.id !== user.connectionId)
      io.to(user.connectionId).emit("roll", {
        roll: data.roll,
        turn: data.turn,
        owner: data.owner,
      });
  });
}

async function findAndSyncClick(io, socket, data) {
  const users = await userService.findUser({ lobby: data.lobby });

  users.forEach((user) => {
    console.log("synced user", user.name);
    if (socket.id !== user.connectionId)
      io.to(user.connectionId).emit("syncClick", {
        roll: data.roll,
        pawn: data.pawn,
      });
  });
}

exports.user = { create, update, findAndSync, findAndSyncClick };
