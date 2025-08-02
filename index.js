const express = require("express");
const dbconnect = require("./Utils/dbconnect");
const SignupRoute = require("./Router/SignupRoute");
const LoginRoute = require("./Router/LoginRoute");
const Routes = require("./Router/Routes");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 4000;

app.use(
  cors({
    origin: "https://asms-wine.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use("/salary_slips", express.static(path.join(__dirname, "salary_slips")));

// Route
app.use("/auth", LoginRoute);
app.use("/user", SignupRoute);
app.use("/api", Routes);

// Start server after DB connection
dbconnect().then(() => {
  app.listen(port, () => console.log(`App listening on port ${port}!`));
});
