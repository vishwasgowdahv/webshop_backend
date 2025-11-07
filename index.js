import connectToDb from "./db.js";
import express from "express";
import authRoute from './routes/authRoute.js'
import productRoute from './routes/productRoute.js'
import cartRoute from './routes/cartRoute.js'
import cors from "cors";


const app = express();

const PORT = 3000;
connectToDb();
app.use(cors());


app.use(express.json());
app.use("/v1/api/auth", authRoute);
app.use("/v1/api/product",productRoute);
app.use("/v1/api/cart",cartRoute);


app.listen(PORT, function () {
  console.log("Server listening on Port", PORT);
});