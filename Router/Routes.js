const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  generateSalarySlip,
  getAllSalarySlips,
  deleteSalarySlip,
  updateUser,
  deleteUser,
  addEmployee,
  getAllEmployees,
} = require("../Controller/Logic");
const { verifyToken } = require("../Utils/configjwt");

router.get("/users", verifyToken, getAllUsers);
router.post("/salary-slip", verifyToken, generateSalarySlip);
router.get("/salary-slips", verifyToken, getAllSalarySlips);
router.delete("/salary-slips/:id", verifyToken, deleteSalarySlip);
router.put("/edit-employees/:id", verifyToken, updateUser);
router.delete("/delete-employees/:id", verifyToken, deleteUser);
router.post("/add-employees", verifyToken, addEmployee);
router.get("/employees", verifyToken, getAllEmployees);

module.exports = router;
