const db = require("./connection");

const collection = db.db.collection("users");
collection.createIndex({ name: 1 }, { unique: true });

exports.uploadUser = async (data) => {
  try {
    return await collection.insertOne(data);
  } catch (err) {
    console.log(err);

    if (err.code === 11000) {
      return false;
    }
  }
};

exports.findUser = async (data) => {
  try {
    return await collection.find(data).toArray();
  } catch (error) {}
};

exports.updateUser = async (data, query) => {
  query = query ?? { name: data.name };

  // console.log(data, query, "updat");
  try {
    return await collection.updateOne(query, {
      $set: data,
    });
  } catch (error) {
    throw error;
  }
};

exports.deleteUser = async (data) => {
  try {
    return await collection.deleteOne({ name: data.name });
  } catch (error) {
    throw error;
  }
};
