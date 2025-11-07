import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  address:{
    type:String,
    required:true,
  },
  ERP_ID:{
    type:String,
    required:true,
  },
  orderHistory:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:"Order"

    }],
  cartData:[{
       itemId:{
          type:mongoose.Schema.Types.ObjectId,
          ref:"Product"
       },
       quantity:{
        type:Number
       }
    }
  ]
  ,
  date: {
    type: Date,
    default: Date.now,
  }
},
 { minimize: false }  // To prevent mongoose from removing empty objects

);
 
const User = mongoose.model("User", userSchema);

export default User;
