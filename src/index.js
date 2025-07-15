import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config();
connectDB();

/*
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
