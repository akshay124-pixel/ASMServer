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

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Serve salary slips for preview
app.use("/salary_slips", express.static(path.join(__dirname, "salary_slips")));

// New route to force download
app.get("/download/:fileName", (req, res) => {
  const filePath = path.join(__dirname, "salary_slips", req.params.fileName);

  if (fs.existsSync(filePath)) {
    res.download(filePath, req.params.fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Error downloading file");
      }
    });
  } else {
    res.status(404).send("File not found");
  }
});

// Route
app.use("/auth", LoginRoute);
app.use("/user", SignupRoute);
app.use("/api", Routes);

// Start server after DB connection
dbconnect().then(() => {
  app.listen(port, () => console.log(`App listening on port ${port}!`));
});
