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

// Custom route for PDF serving
app.get("/salary_slips/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "salary_slips", fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return res.status(404).json({ error: "File not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Access-Control-Allow-Origin", "https://asms-wine.vercel.app");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("error", (err) => {
    console.error(`Error streaming file ${filePath}:`, err.stack);
    res.status(500).json({ error: "Error serving file" });
  });
});
// Route
app.use("/auth", LoginRoute);
app.use("/user", SignupRoute);
app.use("/api", Routes);

// Start server after DB connection
dbconnect().then(() => {
  app.listen(port, () => console.log(`App listening on port ${port}!`));
});
