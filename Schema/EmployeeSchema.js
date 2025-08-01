// Schema/EmployeeSchema.js
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please fill a valid email address",
    ],
  },
  baseSalary: {
    type: Number,
    required: true,
    min: [0, "Base salary cannot be negative"],
  },
});

module.exports = mongoose.model("Employee", employeeSchema);
