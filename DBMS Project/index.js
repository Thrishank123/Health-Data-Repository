import express from "express";
import bodyParser from "body-parser";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session"; // Import express-session

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let db;
db = await open({
    filename: './shopkeep.db', // Corrected typo
    driver: sqlite3.Database,
});

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.render('Login.ejs');
});
app.post("/login",async(req,res)=>{
  const username=req.body("username");
  const password=req.body("password");
  const row = await db.get("SELECT * FROM Patient WHERE username = ?", [username]);
  if(row)
  {
    const isMatch = await bcrypt.compare(password, row.password);
        if (isMatch) {
            res.redirect("/index.ejs"); 
        } else {
            res.send("Password not matched");
        }
    } else {
        res.send("User not found");
    }
  }
  
)
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
