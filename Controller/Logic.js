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
      .fontSize(14)
      .fillColor("#000000")
      .text("PAY SLIP", 50, 30, { align: "center" });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#000000")
      .text("PROMARK TECHSOLUTIONS PRIVATE LIMITED", 50, 50, {
        align: "center",
      })
      .text(
        "Regd Office: NH-95, Morinda By-Pass, Village Baddi Madouli, Morinda, Distt Ropar-140413 Punjab",
        50,
        65,
        { align: "center" }
      )
      .text("E-mail: info@promark.co.in, www.promark.co.in", 50, 80, {
        align: "center",
      })
      .text(
        "CIN: U36109PB2010PTC034337  GST: 03AAFCP7669C1ZF  PAN: AAFCP7669C",
        50,
        95,
        { align: "center" }
      );

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text(`Salary For The Month ${month}`, 50, 120, { align: "center" });

    // Employee Details Section
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#000000")
      .text(`Employee ID: ${user.employeeid || "N/A"}`, 50, 150)
      .text(`PAN: ${user.pan || "N/A"}`, 300, 150)
      .text(`Employee Name: ${user.username}`, 50, 165)
      .text(`Aadhaar No.: ${user.adhaar || "N/A"}`, 300, 165)
      .text(
        `Date of Joining: ${
          user.joindate ? new Date(user.joindate).toLocaleDateString() : "N/A"
        }`,
        50,
        180
      )
      .text(`Designation: ${user.deg || "N/A"}`, 300, 180);

    // Earnings and Deductions Table
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Gross Earnings", 50, 210)
      .text("Deductions", 300, 210);

    // Table Headers
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Particulars", 50, 225)
      .text("Amount", 200, 225)
      .text("Particulars", 300, 225)
      .text("Amount", 450, 225);

    // Table Border
    doc
      .moveTo(50, 220)
      .lineTo(550, 220)
      .moveTo(50, 240)
      .lineTo(550, 240)
      .moveTo(50, 220)
      .lineTo(50, 340)
      .moveTo(200, 220)
      .lineTo(200, 340)
      .moveTo(300, 220)
      .lineTo(300, 340)
      .moveTo(450, 220)
      .lineTo(450, 340)
      .moveTo(550, 220)
      .lineTo(550, 340)
      .strokeColor("#000000")
      .lineWidth(1)
      .stroke();

    // Earnings Data
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Basic Salary", 55, 245)
      .text(`₹${user.baseSalary.toFixed(2)}`, 200, 245)
      .text("House Rent Allowance", 55, 260)
      .text("₹0.00", 200, 260)
      .text("Transport Allowance", 55, 275)
      .text("₹0.00", 200, 275)
      .text("Medical Allowance", 55, 290)
      .text("₹0.00", 200, 290)
      .text("Others", 55, 305)
      .text("₹0.00", 200, 305)
      .text("Bonus", 55, 320)
      .text("₹0.00", 200, 320);

    // Deductions Data
    doc
      .text("Income Tax", 305, 245)
      .text("₹0.00", 450, 245)
      .text("Provident Fund", 305, 260)
      .text("₹0.00", 450, 260)
      .text("ESI", 305, 275)
      .text("₹0.00", 450, 275)
      .text("Professional Tax", 305, 290)
      .text("₹0.00", 450, 290)
      .text("Others", 305, 305)
      .text("₹0.00", 450, 305)
      .text("Advance", 305, 320)
      .text("₹0.00", 450, 320);

    // Total Earnings and Deductions
    doc
      .font("Helvetica-Bold")
      .text("Total Earnings", 55, 345)
      .text(`₹${calculatedSalary.toFixed(2)}`, 200, 345)
      .text("Total Deductions", 305, 345)
      .text("₹0.00", 450, 345);

    // Net Payable and Paid Days
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`Net Payable: ₹${calculatedSalary.toFixed(2)}`, 50, 370)
      .text(`Paid Days: ${daysWorked}`, 300, 370);

    // Signature
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("Sign of Authorized Person", 50, 400)
      .moveTo(50, 415)
      .lineTo(200, 415)
      .strokeColor("#000000")
      .lineWidth(1)
      .stroke();

    // Footer
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor("#000000")
      .text(
        "This is a system-generated document. For queries, contact HR at hr@promark.co.in.",
        50,
        450,
        { align: "center" }
      )
      .text(
        "© 2025 Promark Techsolutions Pvt. Ltd. All rights reserved.",
        50,
        465,
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
