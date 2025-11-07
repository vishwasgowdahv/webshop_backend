// modules import
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const { sign, verify } = jwt;
import { body, validationResult } from "express-validator";

// files imports
import User from "../models/User.js";
import validateLogin from "../middleware/validateLogin.js";

const router = express.Router();

const JWT_SECRET = "YHJFHTDTHGLKDRTDJHKH";

let sucess = false;

//Signup
router.post(
  "/signup",
  [
    body("name", "Name Should be minimm 3 Charecters").isLength({ min: 3 }),
    body("email", "Enter Valid Email").isEmail(),
    body("password", "Password Must be More than 3 Charecters").isLength({
      min: 3,
    }),
    body("address", "address Must be More than 3 Charecters").isLength({
      min: 3,
    }),
  ],
  async (req, res) => {
    sucess = false;
    const results = validationResult(req);
    if (!results.isEmpty()) {
      return res.status(404).json({ sucess, error: results.array() });
    }
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.json({ sucess, error: "USER Already Exists" });
    }
    
    const ERP_RES = await fetch(
      "http://localhost:4004/odata/v4/simple-erp/Customers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + btoa("service-user:service-user"),
        },
        body: JSON.stringify({
          name: req.body.name,
          email: req.body.email,
          street: req.body.address,
        }),
      }
    );
    const location = ERP_RES.headers.get("location");
    const match = location.match(/Customers\(([^)]+)\)/);
    const ERP_ID = match ? match[1] : null;
    console.log(ERP_ID);
    

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      address: req.body.address,
      ERP_ID:ERP_ID
    });


    const authtoken = sign({ id: user.id }, JWT_SECRET);
    sucess = true;
    res.json({ sucess, authtoken });
  }
);

//Login
router.post(
  "/login",
  [
    body("email", "Enter Valid Email").isEmail(),
    body("password", "Password Must be More than 3 Charecters").isLength({
      min: 3,
    }),
  ],
  async (req, res) => {
    sucess = false;
    const results = validationResult(req);
    if (!results.isEmpty()) {
      return res.status(404).json({ sucess, error: results.array() });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ sucess, error: "Enter Valid Credentials" });
    }
    console.log(user.password, password);

    const passwordCheck = await bcrypt.compare(password, user.password);
    console.log(passwordCheck);

    if (!passwordCheck) {
      return res
        .status(400)
        .json({ sucess, error: "Enter Valid password Credentials" });
    }

    const authtoken = sign({ id: user.id }, JWT_SECRET);
    sucess = true;
    res.json({ sucess, authtoken });
  }
);

//update user Data
router.post("/updateuser", validateLogin, async (req, res) => {
  sucess = false;
  const { name, address } = req.body;
  const userData = await User.findById(req.user._id);
  if (!userData) {
    return res.status(400).json({ sucess, error: "Not logged in Properly" });
  }
  try {
    await User.findByIdAndUpdate(req.user._id, { name, address });
    sucess = true;
    res.json({ sucess, message: "Updated Succesfully" });
  } catch (error) {
    console.log(error);
    res.json({ sucess, message: error.message });
  }
});

//fetchUserData
router.get("/fetchuser", validateLogin, async (req, res) => {
  sucess = false;
  const user = await User.findById(
    new mongoose.Types.ObjectId(req.user.id)
  ).select("-password");
  sucess = true;
  res.json({ sucess, user });
});

export default router;
