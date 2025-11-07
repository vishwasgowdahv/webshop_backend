import mongoose, { Schema } from "mongoose";

const errorSchema = new Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  errorCode:{
    type:String,
    required:true
  },
  errorMessage:{
    type:String,
    required:true
  },
  errorTag:{
    type:String,
    required:true
  }
},
 { minimize: false }  // To prevent mongoose from removing empty objects

);
 
const Error = mongoose.model("Error", errorSchema);

export default Error;
