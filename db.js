import mongoose from "mongoose";
const URI = "mongodb+srv://vishwasgowda722_db_user:TRhZZYIPwlRuMJyJ@cluster0.zozllfp.mongodb.net/" ;
const connectToDb = async() => {
  await mongoose.connect(URI);
};

export default connectToDb
