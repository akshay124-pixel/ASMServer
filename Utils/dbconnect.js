const mongoose = require("mongoose");
const URI = process.env.DB_URI;

const dbconnect = async () => {
  try {
    await mongoose.connect(URI);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

module.exports = dbconnect;
