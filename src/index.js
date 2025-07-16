import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const port = process.env.PORT || 8080;

dotenv.config();
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Express error : ", error);
      throw error;
    });
    const server = app.listen(port, () => {
      console.log(`Server is running at port : ${port}`);
    });

    server.on("error", (error) => {
      console.log("Server error:", error);
      throw error;
    });
  })
  .catch((err) => {
    console.log("Mongo DB connection failed !!", error);
  });

/*
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from "express";
const app = express();
const port = process.env.PORT || 3030;

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("Express error : ", error);
      throw error;
    });

    app.listen(port, () => {
      console.log(`App is listning on port ${port}`);
    });
  } catch (error) {
    console.error("Error : ", error);
    throw error;
  }
})();

*/
