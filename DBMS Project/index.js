import express from "express";
import bodyParser from "body-parser";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import session from "express-session";
import { render } from "ejs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Initialize SQLite database
const db = await open({
  filename: "./health.db",
  driver: sqlite3.Database,
});

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure session
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/");
  }
}

// Routes

// Login Page
app.get("/", (req, res) => {
  res.render("Login.ejs");
});

// Signup Page
app.get("/signup", (req, res) => {
  res.render("Signup.ejs");
});

// Handle Signup
app.post("/signup", async (req, res) => {
  const { role, username, password, gender, dob, contact, address, email, specs } = req.body;

  if (role === "patient") {
    const existingUser = await db.get("SELECT * FROM Patient WHERE Username = ?", [username]);
    if (existingUser) {
      return res.status(400).send("Username is already taken. Please choose a different one.");
    }

    await db.run(
      "INSERT INTO Patient (Role, Username, Password, Gender, DateOfBirth, ContactNumber, Address, Email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [role, username, password, gender, dob, contact, address, email]
    );
    res.redirect("/");
  } else if (role === "doctor") {
    const existingUser = await db.get("SELECT * FROM Doctors WHERE Username = ?", [username]);
    if (existingUser) {
      return res.status(400).send("Username is already taken. Please choose a different one.");
    }

    await db.run(
      "INSERT INTO Doctors (Username, Password, Specialization, ContactNumber, Email, Role) VALUES (?, ?, ?, ?, ?, ?)",
      [username, password, specs, contact, email, role]
    );
    res.redirect("/");
  } else {
    res.status(400).send("Invalid role specified.");
  }
});

// Handle Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const patient = await db.get("SELECT * FROM Patient WHERE Username = ?", [username]);
  const doctor = await db.get("SELECT * FROM Doctors WHERE Username = ?", [username]);

  if (patient && patient.Password === password) {
    req.session.user = { id: patient.PatientID, role: "patient", username };
    const labTests = await db.all(
      "SELECT test_date, test_name, result FROM Lab WHERE patient_id = ?",
      [patient.PatientID]
    );
    const appointmentCount = await db.get(
      "SELECT COUNT(*) AS appointment_count FROM Appointments WHERE patient_id = ?",
      [patient.PatientID]
    );
    res.redirect("/dashboard");
  } else if (doctor && doctor.Password === password) {
    req.session.user = { id: doctor.DoctorID, role: "doctor", username };
    res.render("Doctor.ejs", { name: username });
  } else {
    res.status(400).send("Invalid username or password.");
  }
});

// Patient Dashboard
app.get("/dashboard", isAuthenticated, async (req, res) => {
  if (req.session.user.role === "patient") {
    const labTests = await db.all("SELECT * FROM Lab WHERE patient_id = ?", [req.session.user.id]);
    const appointments = await db.get(
      "SELECT COUNT(*) AS appointment_count FROM Appointments WHERE patient_id = ?",
      [req.session.user.id]
    );
    const patient_id = req.session.user.id;
    const healthStats = await db.all(
      "SELECT status, COUNT(*) AS count FROM PatientHealthStatus WHERE patient_id = ? AND date >= DATE('now', '-30 days') GROUP BY status",
      [patient_id]
    );
    const medications = await db.all("SELECT * FROM Medication WHERE patient_id = ?", [req.session.user.id]);
    const chartData = {};
    healthStats.forEach(stat => {
      chartData[stat.status] = stat.count;
    });
    console.log(chartData);
    res.render("PatientDashboard.ejs", {
      name: req.session.user.username,
      labTests: labTests,
      appointments: appointments?.appointment_count || 0,
      chartData: chartData,
      medications: medications,
    });
  } else {
    res.redirect("/");
  }
});

// Profile Page Route for Patient
app.get("/profile", isAuthenticated, async (req, res) => {
  if (req.session.user.role === "patient") {
    const patient = await db.get("SELECT * FROM Patient WHERE PatientID = ?", [req.session.user.id]);
    const medications = await db.all("SELECT * FROM Medication WHERE patient_id = ?", [req.session.user.id]);
    
    res.render("Profile.ejs", {
      name: patient.Username,
      dob: patient.DateOfBirth,
      gender: patient.Gender,
      email: patient.Email,
      phone: patient.ContactNumber,
      address: patient.Address,
      medications: medications,
    });
  } else {
    res.redirect("/");
  }
});

// Submit Health Status
app.post("/status", isAuthenticated, async (req, res) => {
  const { health } = req.body;
  const patientId = req.session.user.id;

  const existingEntry = await db.get(
    "SELECT * FROM PatientHealthStatus WHERE patient_id = ? AND date = DATE('now')", 
    [patientId]
  );

  if (existingEntry) {
    res.status(400).send("You have already submitted your status for today.");
  } else {
    await db.run(
      "INSERT INTO PatientHealthStatus (patient_id, status, date) VALUES (?, ?, DATE('now'))",
      [patientId, health]
    );
    res.redirect("/dashboard");
  }
});

// Logout Route
// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out.");
    }
    res.redirect("/"); // Redirect to the login page after logout
  });
});

app.get("/doctor",(req,res)=>{
  res.render("Doctor");
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
