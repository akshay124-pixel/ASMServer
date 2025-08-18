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
  const {
    userId,
    month,
    daysWorked,
    incomeTax = 0,
    houseRentAllowance = 0,
    transportAllowance = 0,
    medicalAllowance = 0,
    othersEarnings = 0,
    bonus = 0,
    ot = 0,
    providentFund = 0,
    esi = 0,
    professionalTax = 0,
    othersDeductions = 0,
    advance = 0,
  } = req.body;

  try {
    if (req.user.role !== "Accounts") {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!userId || !month || !daysWorked) {
      return res
        .status(400)
        .json({ error: "User ID, month, and days worked are required" });
    }

    const user = await Employee.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const dailySalary = user.baseSalary / 26;
    const calculatedSalary = dailySalary * daysWorked;
    const totalEarnings =
      calculatedSalary +
      Number(houseRentAllowance) +
      Number(transportAllowance) +
      Number(medicalAllowance) +
      Number(othersEarnings) +
      Number(bonus) +
      Number(ot);
    const totalDeductions =
      Number(incomeTax) +
      Number(providentFund) +
      Number(esi) +
      Number(professionalTax) +
      Number(othersDeductions) +
      Number(advance);
    const netPayable = totalEarnings - totalDeductions;

    const pdfName = `${user.username}_${month.replace(/\s+/g, "_")}.pdf`;
    const pdfDir = path.join(__dirname, "../salary_slips");
    const pdfPath = path.join(pdfDir, pdfName);

    ensureDirectoryExistence(pdfDir);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(fs.createWriteStream(pdfPath));

    doc.registerFont("Helvetica", "Helvetica");
    doc.registerFont("Helvetica-Bold", "Helvetica-Bold");
    doc.registerFont("Times-Roman", "Times-Roman");
    doc.registerFont("Times-Bold", "Times-Bold");

    const primaryColor = "#003087";
    const accentColor = "#4B5EAA";
    const textColor = "#1A202C";
    const borderColor = "#D1D5DB";

    // Header
    doc
      .fillColor(primaryColor)
      .font("Times-Bold")
      .fontSize(16)
      .text("PAY SLIP", 0, 30, { align: "center" });

    doc
      .fillColor(textColor)
      .font("Helvetica")
      .fontSize(10)
      .text("PROMARK TECHSOLUTIONS PRIVATE LIMITED", 0, 55, { align: "center" })
      .text(
        "Regd Office: NH-95, Morinda By-Pass, Village Baddi Madouli, Morinda, Distt Ropar-140413 Punjab",
        0,
        70,
        { align: "center" }
      )
      .text("E-mail: info@promark.co.in | Website: www.promark.co.in", 0, 85, {
        align: "center",
      })
      .text(
        "CIN: U36109PB2010PTC034337 | GST: 03AAFCP7669C1ZF | PAN: AAFCP7669C",
        0,
        100,
        { align: "center" }
      );

    doc
      .moveTo(40, 120)
      .lineTo(555, 120)
      .lineWidth(1)
      .strokeColor(accentColor)
      .stroke();

    doc
      .fillColor(primaryColor)
      .font("Times-Bold")
      .fontSize(14)
      .text(`Salary Slip for ${month}`, 0, 135, { align: "center" });

    // Employee details
    const leftColumnX = 40;
    const rightColumnX = 320;
    doc
      .fillColor(textColor)
      .font("Helvetica")
      .fontSize(10)
      .text(`Employee ID: ${user.employeeid || "N/A"}`, leftColumnX, 165)
      .text(`PAN: ${user.pan || "N/A"}`, rightColumnX, 165)
      .text(`Employee Name: ${user.username}`, leftColumnX, 180)
      .text(`Aadhaar No.: ${user.adhaar || "N/A"}`, rightColumnX, 180)
      .text(
        `Date of Joining: ${
          user.joindate ? new Date(user.joindate).toLocaleDateString() : "N/A"
        }`,
        leftColumnX,
        195
      )
      .text(`Designation: ${user.deg || "N/A"}`, rightColumnX, 195);

    // Table positions (FIXED SPACING)
    const tableTop = 225;
    const tableLeft = 40;
    const tableRight = 555;

    // Define column widths to fit total content width (515 points)
    const earningsPartWidth = 180; // Earnings particulars
    const earningsAmtWidth = 70; // Earnings amounts
    const deductionsPartWidth = 190; // Deductions particulars
    const deductionsAmtWidth = 75; // Deductions amounts

    // Calculate column starts
    const earningsCol1 = tableLeft + 5; // 45 (earnings particulars text x)
    const earningsAmtX = tableLeft + earningsPartWidth; // 220 (earnings amounts x)
    const deductionsCol1 = tableLeft + earningsPartWidth + earningsAmtWidth; // 290 (deductions start)
    const deductionsCol1Text = deductionsCol1 + 5; // 295 (deductions particulars text x)
    const deductionsAmtX = deductionsCol1 + deductionsPartWidth; // 480 (deductions amounts x)

    // Table headers
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Gross Earnings", tableLeft, tableTop)
      .text("Deductions", deductionsCol1 + 15, tableTop);

    doc
      .fillColor(textColor)
      .font("Helvetica")
      .fontSize(10)
      .text("Particulars", earningsCol1, tableTop + 20)
      .text("Amount", earningsAmtX, tableTop + 20, {
        width: earningsAmtWidth,
        align: "right",
      })
      .text("Particulars", deductionsCol1Text, tableTop + 20)
      .text("Amount", deductionsAmtX, tableTop + 20, {
        width: deductionsAmtWidth,
        align: "right",
      });

    // Background
    doc
      .rect(tableLeft, tableTop + 15, tableRight - tableLeft, 140)
      .fillOpacity(0.05)
      .fill(accentColor)
      .fillOpacity(1);

    // Table borders
    const rowLines = [15, 35, 50, 65, 80, 95, 110, 125, 140, 155]; // Extended slightly if needed for consistency
    rowLines.forEach((y) => {
      doc.moveTo(tableLeft, tableTop + y).lineTo(tableRight, tableTop + y);
    });

    const verticalLines = [
      tableLeft,
      earningsAmtX,
      deductionsCol1,
      deductionsAmtX,
      tableRight,
    ];
    verticalLines.forEach((x) => {
      doc.moveTo(x, tableTop + 15).lineTo(x, tableTop + 155); // Extended y for totals if desired
    });

    doc.strokeColor(borderColor).lineWidth(0.5).stroke();

    // Earnings data
    doc
      .fillColor(textColor)
      .font("Helvetica")
      .fontSize(10)
      .text("Basic Salary", earningsCol1, tableTop + 40)
      .text(calculatedSalary.toFixed(2), earningsAmtX, tableTop + 40, {
        width: earningsAmtWidth,
        align: "right",
      })
      .text("House Rent Allowance", earningsCol1, tableTop + 55)
      .text(
        Number(houseRentAllowance).toFixed(2),
        earningsAmtX,
        tableTop + 55,
        { width: earningsAmtWidth, align: "right" }
      )
      .text("Transport Allowance", earningsCol1, tableTop + 70)
      .text(
        Number(transportAllowance).toFixed(2),
        earningsAmtX,
        tableTop + 70,
        { width: earningsAmtWidth, align: "right" }
      )
      .text("Medical Allowance", earningsCol1, tableTop + 85)
      .text(Number(medicalAllowance).toFixed(2), earningsAmtX, tableTop + 85, {
        width: earningsAmtWidth,
        align: "right",
      })
      .text("Others", earningsCol1, tableTop + 100)
      .text(Number(othersEarnings).toFixed(2), earningsAmtX, tableTop + 100, {
        width: earningsAmtWidth,
        align: "right",
      })
      .text("Bonus", earningsCol1, tableTop + 115)
      .text(Number(bonus).toFixed(2), earningsAmtX, tableTop + 115, {
        width: earningsAmtWidth,
        align: "right",
      })
      .text("Overtime", earningsCol1, tableTop + 130)
      .text(Number(ot).toFixed(2), earningsAmtX, tableTop + 130, {
        width: earningsAmtWidth,
        align: "right",
      });

    // Deductions data
    doc
      .text("Income Tax", deductionsCol1Text, tableTop + 40)
      .text(Number(incomeTax).toFixed(2), deductionsAmtX, tableTop + 40, {
        width: deductionsAmtWidth,
        align: "right",
      })
      .text("Provident Fund", deductionsCol1Text, tableTop + 55)
      .text(Number(providentFund).toFixed(2), deductionsAmtX, tableTop + 55, {
        width: deductionsAmtWidth,
        align: "right",
      })
      .text("ESI", deductionsCol1Text, tableTop + 70)
      .text(Number(esi).toFixed(2), deductionsAmtX, tableTop + 70, {
        width: deductionsAmtWidth,
        align: "right",
      })
      .text("Professional Tax", deductionsCol1Text, tableTop + 85)
      .text(Number(professionalTax).toFixed(2), deductionsAmtX, tableTop + 85, {
        width: deductionsAmtWidth,
        align: "right",
      })
      .text("Others", deductionsCol1Text, tableTop + 100)
      .text(
        Number(othersDeductions).toFixed(2),
        deductionsAmtX,
        tableTop + 100,
        { width: deductionsAmtWidth, align: "right" }
      )
      .text("Advance", deductionsCol1Text, tableTop + 115)
      .text(Number(advance).toFixed(2), deductionsAmtX, tableTop + 115, {
        width: deductionsAmtWidth,
        align: "right",
      });

    // Totals
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Total Earnings", earningsCol1, tableTop + 145)
      .text(totalEarnings.toFixed(2), earningsAmtX, tableTop + 145, {
        width: earningsAmtWidth,
        align: "right",
      })
      .text("Total Deductions", deductionsCol1Text, tableTop + 145)
      .text(totalDeductions.toFixed(2), deductionsAmtX, tableTop + 145, {
        width: deductionsAmtWidth,
        align: "right",
      });

    // Net payable
    doc
      .fillColor(primaryColor)
      .font("Times-Bold")
      .fontSize(12)
      .text(
        `Net Payable: ${netPayable.toFixed(2)}`,
        leftColumnX,
        tableTop + 180
      )
      .text(`Paid Days: ${daysWorked}`, rightColumnX, tableTop + 180, {
        align: "right",
      });

    // Signature
    doc
      .fillColor(textColor)
      .font("Helvetica")
      .fontSize(10)
      .text("Authorized Signatory", leftColumnX, tableTop + 210)
      .moveTo(leftColumnX, tableTop + 225)
      .lineTo(leftColumnX + 150, tableTop + 225)
      .strokeColor(borderColor)
      .lineWidth(0.5)
      .stroke();

    // Footer
    doc
      .fillColor(textColor)
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text(
        "This is a system-generated document. For queries, contact HR at hr@promark.co.in.",
        0,
        tableTop + 260,
        { align: "center" }
      )
      .text(
        "© 2025 Promark Techsolutions Pvt. Ltd. All rights reserved.",
        0,
        tableTop + 275,
        { align: "center" }
      );

    doc.end();

    const salarySlip = new SalarySlip({
      userId,
      userName: user.username,
      month,
      daysWorked,
      salary: netPayable,
      pdfPath,
    });
    await salarySlip.save();

    res.json({ _id: salarySlip._id, pdfUrl: `/salary_slips/${pdfName}` });
  } catch (err) {
    console.error("Error generating salary slip:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Other controller functions (unchanged)
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
        _id: employee._id, // Changed from 'id' to '_id' for consistency
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
        _id: employee._id, // Changed from 'id' to '_id' for consistency
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
