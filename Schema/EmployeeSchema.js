const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
  },
  baseSalary: {
    type: Number,
    required: true,
    min: [0, "Base salary cannot be negative"],
  },
  employeeid: { type: String, required: true, unique: true, trim: true },
  joindate: { type: Date },
  pan: { type: String, trim: true, uppercase: true },
  adhaar: { type: String, trim: true },
  deg: { type: String, trim: true },
  houseRentAllowance: { type: Number, default: 0, min: 0 },
  transportAllowance: { type: Number, default: 0, min: 0 },
  medicalAllowance: { type: Number, default: 0, min: 0 },
  bonus: { type: Number, default: 0, min: 0 },
  ot: { type: Number, default: 0, min: 0 },
  incomeTax: { type: Number, default: 0, min: 0 },
  providentFund: { type: Number, default: 0, min: 0 },
  esi: { type: Number, default: 0, min: 0 },
  professionalTax: { type: Number, default: 0, min: 0 },
  otherEarnings: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
  advance: { type: Number, default: 0, min: 0 },
});

module.exports = mongoose.model("Employee", employeeSchema);
