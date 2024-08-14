import mongoose from "mongoose";
import env from "../utils/validateEnv.js";

//check connection to db
const connection = {};

export const connectToDb = async () => {
  if (connection.isConnected) {
    console.log("MongoDb is already connected");
    return;
  }
  let db;
  try {
    connection.isConnected = true; // update status before connection
    db = await mongoose.connect(env.MONGO_URI, {
      dbName: "Footsy", //give db name
    });
    console.log("MongoDb connected successfully");
  } catch (error) {
    console.log(error);
  } finally {
    connection.isConnected = db.connections[0].readyState; //update connection status
  }
};
