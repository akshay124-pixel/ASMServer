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
    const pdfDir = path.join(__dirname, "salary_slips");
    const pdfPath = path.join(pdfDir, pdfName);

    ensureDirectoryExistence(pdfDir);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor("#1e3a8a")
        .text("Promark Techsolutions Pvt. Ltd.", 50, 30, { align: "center" });
      // ... rest of the PDF content ...

      doc.end();

      stream.on("finish", () => {
        console.log(`PDF created successfully at: ${pdfPath}`);
        if (fs.existsSync(pdfPath)) {
          console.log(`Confirmed: PDF file exists at ${pdfPath}`);
        } else {
          console.error(`Error: PDF file not found at ${pdfPath}`);
        }
        resolve();
      });
      stream.on("error", (err) => {
        console.error(`Error creating PDF at ${pdfPath}:`, err.stack);
        reject(err);
      });
    });

    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF file not found at: ${pdfPath}`);
      return res.status(500).json({ error: "Failed to generate PDF file" });
    }

    const salarySlip = new SalarySlip({
      userId,
      userName: user.username,
      month,
      daysWorked,
      salary: calculatedSalary,
      pdfPath,
    });

    await salarySlip.save();

    const baseUrl = "https://asmserver.onrender.com";
    const pdfUrl = `${baseUrl}/salary_slips/${pdfName}`;
    console.log(`PDF URL: ${pdfUrl}`);

    res.json({ _id: salarySlip._id, pdfUrl });
  } catch (err) {
    console.error("Error generating salary slip:", err.stack);
    res.status(500).json({ error: "Server error" });
  }
};
exports.getAllSalarySlips = async (req, res) => {
  try {
    const slips = await SalarySlip.find().populate("userId");
    const baseUrl = "https://asmserver.onrender.com";
    res.json(
      slips.map((slip) => {
        const normalizedPath = slip.pdfPath.replace(/\\/g, "/");
        const fileName = path.basename(normalizedPath);
        const pdfUrl = `${baseUrl}/salary_slips/${fileName}`;
        return {
          _id: slip._id,
          user: slip.userName,
          month: slip.month,
          days: slip.daysWorked,
          salary: slip.salary.toFixed(2),
          pdfUrl,
        };
      })
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
