const express = require("express");
const dbconnect = require("./Utils/dbconnect");
const SignupRoute = require("./Router/SignupRoute");
const LoginRoute = require("./Router/LoginRoute");
const Routes = require("./Router/Routes");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// Route
app.use("/auth", LoginRoute);
app.use("/user", SignupRoute);
app.use("/api", Routes);

// Serve PDF files
app.use("/salary_slips", express.static(path.join(__dirname, "salary_slips")));

// Start server after DB connection
dbconnect().then(() => {
  app.listen(port, () => console.log(`App listening on port ${port}!`));
});
