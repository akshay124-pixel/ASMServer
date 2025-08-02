const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const User = require("../Schema/AuthSchema");
const SalarySlip = require("../Schema/Model");
const Employee = require("../Schema/EmployeeSchema");

const ensureDirectoryExistence = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
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

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(fs.createWriteStream(pdfPath));

    // Header Section
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
      .text("in India", { continued: false });
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
      .fillColor("#1e40af")
      .text(`Salary Slip for ${month}`, 50, 100, { align: "center" });

    // Employee Details Section
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
      .text(`Name: ${user.username}`, 50, 170)
      .text(`Employee ID: ${user.employeeid}`, 50, 190)
      .text(`Email: ${user.email}`, 50, 210);
    if (user.joindate) {
      doc.text(
        `Join Date: ${new Date(user.joindate).toLocaleDateString()}`,
        50,
        230
      );
    }
    if (user.pan) {
      doc.text(`PAN: ${user.pan}`, 50, 250);
    }
    if (user.adhaar) {
      doc.text(`Aadhaar: ${user.adhaar}`, 50, 270);
    }
    if (user.deg) {
      doc.text(`Designation: ${user.deg}`, 50, 290);
    }

    // Salary Details Section
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#1e40af")
      .text("Salary Details", 50, 330);
    doc
      .moveTo(50, 345)
      .lineTo(550, 345)
      .strokeColor("#e0e7ff")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#1f2937")
      .text(`Month: ${month}`, 50, 360)
      .text(`Days Worked: ${daysWorked}`, 50, 380)
      .text(`Daily Salary Rate: ₹${dailySalary.toFixed(2)}`, 50, 400)
      .font("Helvetica-Bold")
      .text(`Total Salary: ₹${calculatedSalary.toFixed(2)}`, 50, 420);

    // Company Contact Information
    doc
      .moveTo(50, 460)
      .lineTo(550, 460)
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
        480,
        { align: "center" }
      )
      .text("Contact: 1800 103 8878 | Email: info@promark.co.in", 50, 495, {
        align: "center",
      });

    // Footer
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor("#6b7280")
      .text(
        "This is a system-generated document. For queries, contact HR at hr@promark.co.in.",
        50,
        520,
        { align: "center" }
      )
      .text(
        "© 2025 Promark Techsolutions Pvt. Ltd. All rights reserved.",
        50,
        535,
        { align: "center" }
      );

    doc.end();

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

// Other controller functions remain unchanged
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

exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== "Accounts") {
      return res.status(403).json({
        success: false,
        error: "Access denied: Accounts role required",
      });
    }

    const {
      username,
      email,
      baseSalary,
      employeeid,
      joindate,
      pan,
      adhaar,
      deg,
    } = req.body;

    if (!username || !email || !baseSalary || !employeeid) {
      return res.status(400).json({
        success: false,
        error: "Username, email, base salary, and employee ID are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    if (isNaN(baseSalary) || baseSalary <= 0) {
      return res.status(400).json({
        success: false,
        error: "Base salary must be a positive number",
      });
    }

    if (joindate && isNaN(Date.parse(joindate))) {
      return res.status(400).json({
        success: false,
        error: "Invalid join date format",
      });
    }

    const existingEmployee = await Employee.findOne({
      $or: [{ email }, { employeeid }],
      _id: { $ne: req.params.id },
    });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        error:
          existingEmployee.email === email
            ? "Email is already in use"
            : "Employee ID is already in use",
      });
    }

    const sanitizedUpdate = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      baseSalary: parseFloat(baseSalary),
      employeeid,
      joindate: joindate ? new Date(joindate) : undefined,
      pan: pan ? pan.toUpperCase() : undefined,
      adhaar,
      deg,
    };

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: sanitizedUpdate },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: {
        id: employee._id,
        username: employee.username,
        email: employee.email,
        baseSalary: employee.baseSalary,
        employeeid: employee.employeeid,
        joindate: employee.joindate,
        pan: employee.pan,
        adhaar: employee.adhaar,
        deg: employee.deg,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating employee:", {
      message: error.message,
      stack: error.stack,
    });

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors)
          .map((err) => err.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

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

exports.addEmployee = async (req, res) => {
  try {
    const {
      username,
      email,
      baseSalary,
      employeeid,
      joindate,
      pan,
      adhaar,
      deg,
    } = req.body;

    if (!username || !email || !baseSalary || !employeeid) {
      return res.status(400).json({
        success: false,
        error: "Username, email, base salary, and employee ID are required",
      });
    }

    const existing = await Employee.findOne({
      $or: [{ email }, { employeeid }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error:
          existing.email === email
            ? "Employee with this email already exists"
            : "Employee with this employee ID already exists",
      });
    }

    const sanitizedEmployee = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      baseSalary: parseFloat(baseSalary),
      employeeid,
      joindate: joindate ? new Date(joindate) : undefined,
      pan: pan ? pan.toUpperCase() : undefined,
      adhaar,
      deg,
    };

    const employee = new Employee(sanitizedEmployee);
    await employee.save();

    return res.status(201).json({
      success: true,
      message: "Employee added successfully",
      data: {
        id: employee._id,
        username: employee.username,
        email: employee.email,
        baseSalary: employee.baseSalary,
        employeeid: employee.employeeid,
        joindate: employee.joindate,
        pan: employee.pan,
        adhaar: employee.adhaar,
        deg: employee.deg,
        createdAt: employee.createdAt,
      },
    });
  } catch (error) {
    console.error("Error adding employee:", {
      message: error.message,
      stack: error.stack,
    });

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors)
          .map((err) => err.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error.stack);
    res.status(500).json({ error: "Server error" });
  }
};
