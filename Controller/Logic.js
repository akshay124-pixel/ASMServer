const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const User = require("../Schema/AuthSchema");
const SalarySlip = require("../Schema/Model");
const Employee = require("../Schema/EmployeeSchema");
// Ensure the salary_slips directory exists
const ensureDirectoryExistence = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "Accounts") {
      return res.status(403).json({ error: "Access denied" });
    }
    const users = await User.find({ role: "Accounts" });
    res.json(users || []);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error", data: [] });
  }
};

exports.generateSalarySlip = async (req, res) => {
  const { userId, month, daysWorked } = req.body;

  try {
    if (req.user.role !== "Accounts") {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!userId || !month || !daysWorked) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await Employee.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const dailySalary = user.baseSalary / 26;
    const calculatedSalary = dailySalary * daysWorked;

    const pdfName = `${user.username}_${month.replace(/\s+/g, "_")}.pdf`;
    const pdfDir = path.join(__dirname, "../salary_slips");
    const pdfPath = path.join(pdfDir, pdfName);

    ensureDirectoryExistence(pdfDir);

    // Create PDF and wait for it to finish writing
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Header
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor("#1e3a8a")
        .text("Promark Techsolutions Pvt. Ltd.", 50, 30, { align: "center" });

      doc
        .fontSize(10)
        .fillColor("#f97316")
        .text("Proudly ", 230, 60, { continued: true })
        .fillColor("yellow")
        .text("Made ", { continued: true })
        .fillColor("#16a34a")
        .text("in India");

      doc
        .moveTo(50, 80)
        .lineTo(550, 80)
        .strokeColor("#3b82f6")
        .lineWidth(2)
        .stroke();

      // Title
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor("#1e3a8a")
        .text(`Salary Slip for ${month}`, 50, 100, { align: "center" });

      // Employee Details
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#1e40af")
        .text("Employee Details", 50, 140);
      doc
        .moveTo(50, 155)
        .lineTo(550, 155)
        .strokeColor("#e0e7ff")
        .lineWidth(1)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#1f2937")
        .text(`Name: ${user.username}`, 50, 170);

      // Salary Details
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#1e40af")
        .text("Salary Details", 50, 250);
      doc
        .moveTo(50, 265)
        .lineTo(550, 265)
        .strokeColor("#e0e7ff")
        .lineWidth(1)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#1f2937")
        .text(`Month: ${month}`, 50, 280)
        .text(`Days Worked: ${daysWorked}`, 50, 300)
        .text(`Daily Salary Rate: ₹${dailySalary.toFixed(2)}`, 50, 320)
        .font("Helvetica-Bold")
        .text(`Total Salary: ₹${calculatedSalary.toFixed(2)}`, 50, 340);

      // Footer
      doc
        .moveTo(50, 380)
        .lineTo(550, 380)
        .strokeColor("#e0e7ff")
        .lineWidth(1)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#4b5563")
        .text(
          "Promark Corporate Mansion, Plot No E-250, Industrial Area 8-B, Mohali, Punjab, India-160071",
          50,
          400,
          { align: "center" }
        )
        .text("Contact: 1800 103 8878 | Email: info@promark.co.in", 50, 415, {
          align: "center",
        });

      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#6b7280")
        .text(
          "This is a system-generated document. For queries, contact HR at hr@promark.co.in.",
          50,
          460,
          { align: "center" }
        )
        .text(
          "© 2025 Promark Techsolutions Pvt. Ltd. All rights reserved.",
          50,
          475,
          {
            align: "center",
          }
        );

      doc.end();

      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Save to DB after PDF generation
    const salarySlip = new SalarySlip({
      userId,
      userName: user.username,
      month,
      daysWorked,
      salary: calculatedSalary,
      pdfPath,
    });

    await salarySlip.save();

    res.json({ _id: salarySlip._id, pdfUrl: `/salary_slips/${pdfName}` });
  } catch (err) {
    console.error("Error generating salary slip:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Controller/Logic.js
exports.getAllSalarySlips = async (req, res) => {
  try {
    const slips = await SalarySlip.find().populate("userId");
    res.json(
      slips.map((slip) => ({
        _id: slip._id,
        user: slip.userName,
        month: slip.month,
        days: slip.daysWorked,
        salary: slip.salary.toFixed(2),
        pdfUrl: slip.pdfPath.replace(
          path.join(__dirname, "../salary_slips"),
          "/salary_slips"
        ),
      }))
    );
  } catch (err) {
    console.error("Error fetching salary slips:", err.stack);
    res.status(500).json({ error: "Server error" });
  }
};
// Controller/Logic.js
exports.deleteSalarySlip = async (req, res) => {
  try {
    const slip = await SalarySlip.findByIdAndDelete(req.params.id);
    if (!slip) {
      return res.status(404).json({ error: "Salary slip not found" });
    }

    try {
      if (slip.pdfPath && fs.existsSync(slip.pdfPath)) {
        fs.unlinkSync(slip.pdfPath);
      }
    } catch (fileErr) {
      console.error("Error deleting PDF file:", fileErr.stack);
    }

    res.json({ message: "Salary slip deleted successfully" });
  } catch (err) {
    console.error("Error deleting salary slip:", err.stack);
    res.status(500).json({ error: "Server error" });
  }
};
// Controller/Logic.js
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== "Accounts") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { username, email, baseSalary } = req.body;
    if (!username || !email || !baseSalary) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (isNaN(baseSalary) || baseSalary < 0) {
      return res.status(400).json({ error: "Invalid base salary" });
    }

    // Check for email uniqueness
    const existingEmployee = await Employee.findOne({
      email,
      _id: { $ne: req.params.id },
    });
    if (existingEmployee) {
      return res.status(409).json({ error: "Email is already in use" });
    }

    const user = await Employee.findByIdAndUpdate(
      req.params.id,
      { username, email, baseSalary },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Error updating user:", err.stack);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
};
// Controller/Logic.js
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "Accounts") {
      return res.status(403).json({ error: "Access denied" });
    }

    const userId = req.params.id;
    console.log(`Attempting to delete employee with ID: ${userId}`);

    const user = await Employee.findById(userId);
    if (!user) {
      console.log(`Employee with ID ${userId} not found in database`);
      return res.status(404).json({ error: "Employee not found" });
    }

    await Employee.findByIdAndDelete(userId);
    console.log(`Employee with ID ${userId} deleted successfully`);

    // Delete associated salary slips
    const deletedSlips = await SalarySlip.deleteMany({ userId });
    console.log(`Deleted ${deletedSlips.deletedCount} associated salary slips`);

    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(
      `Error deleting employee with ID ${req.params.id}:`,
      err.stack
    );
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
};
// Employee

exports.addEmployee = async (req, res) => {
  try {
    const { username, email, baseSalary } = req.body;

    if (!username || !email || !baseSalary) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await Employee.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ error: "Employee with this email already exists" });
    }

    const employee = new Employee({ username, email, baseSalary });
    await employee.save();

    res
      .status(201)
      .json({ message: "Employee added successfully", user: employee }); // Return 'user' for frontend consistency
  } catch (error) {
    console.error("Error adding employee:", error.stack);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error.stack);
    res.status(500).json({ error: "Server error" });
  }
};
