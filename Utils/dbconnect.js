const mongoose = require("mongoose");
const URI =
  "mongodb+srv://promarkdatabase:promarkdatabase%401234@promarkdb.zfwjisc.mongodb.net/ASMS_Data";

const dbconnect = async () => {
  try {
    await mongoose.connect(URI);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

module.exports = dbconnect;
