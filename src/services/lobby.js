const db = require("./connection");

const collection = db.db.collection("lobbies");
collection.createIndex({ lobby: 1 }, { unique: true });

exports.createLobby = async (data) => {
  try {
    return await collection.insertOne(data);
  } catch (err) {
    console.log(err);

    if (err.code === 11000) {
      return false;
    }
  }
};

exports.getLobbies = async (data) => {
  try {
    return await collection.find(data).toArray();
  } catch (error) {}
};

exports.findLobby = async (data) => {
  try {
    return await collection.findOne(data);
  } catch (error) {}
};

exports.updateLobby = async (data, query) => {
  query = query ?? { lobby: data.lobby };

  // console.log(data, query, "lob");

  try {
    return await collection.updateOne(query, {
      $set: data,
    });
  } catch (error) {
    throw error;
  }
};

exports.addPlayer = async (data, query) => {
  query = query ?? { name: data.name };
  try {
    return await collection.updateOne(query, {
      $set: data,
    });
  } catch (error) {
    throw error;
  }
};

exports.deleteLobby = async (data) => {
  try {
    return await collection.deleteOne({ name: data.name });
  } catch (error) {
    throw error;
  }
};
