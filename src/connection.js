require("dotenv").config();
const url = process.env.DATABASE;
const { MongoClient } = require("mongodb");

exports.client = new MongoClient(url);
