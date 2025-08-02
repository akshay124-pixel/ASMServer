const express = require("express");
const dbconnect = require("./Utils/dbconnect");
const SignupRoute = require("./Router/SignupRoute");
const LoginRoute = require("./Router/LoginRoute");
const Routes = require("./Router/Routes");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 4000;

const ensureDirectoryExistence = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectoryExistence(path.join(__dirname, "salary_slips"));

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

app.use("/auth", LoginRoute);
app.use("/user", SignupRoute);
app.use("/api", Routes);

dbconnect().then(() => {
  app.listen(port, () => console.log(`App listening on port ${port}!`));
});
