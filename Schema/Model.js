const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  month: { type: String, required: true },
  daysWorked: {
    type: Number,
    required: true,
    min: [0, "Days worked cannot be negative"],
  },
  salary: {
    type: Number,
    required: true,
    min: [0, "Salary cannot be negative"],
  },
  pdfPath: { type: String, required: true },
});

module.exports = mongoose.model("SalarySlip", salarySlipSchema);
