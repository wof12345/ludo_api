require("dotenv").config();

const url = process.env.DATABASE;
const { MongoClient } = require("mongodb");

const client = new MongoClient(url);

const db = client.db("ludo");

exports.db = db;
