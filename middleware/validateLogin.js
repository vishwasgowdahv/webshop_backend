import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const { verify } = jwt;

const JWT_SECRET =  "YHJFHTDTHGLKDRTDJHKH";

let sucess=false;

const validateLogin = async (req, res, next) => {

  const token = req.header("authtoken");

    // checking if jwt token is present
  if (!token) {
    return res.status(400).json({sucess,error:"jwt token not found"});
    }

  try {
    const jwtverify = verify(token, JWT_SECRET);
    req.user = new mongoose.Types.ObjectId(jwtverify);
    sucess=true;
    next(); 
  } 
  catch (error) {
    res.status(401).json({sucess,error:"Authenticate with Valid jwttoken"});
  }
};

export default validateLogin;
