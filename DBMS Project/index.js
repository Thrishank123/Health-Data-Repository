const express = require('express');
const app = express();

app.use(express.static('public')); // For static files like CSS, images, etc.

app.set('view engine', 'ejs');

// Route for Login Page
app.get('/', (req, res) => {
  res.render('Login');
});

// Route for Signup Page
app.get('/signup', (req, res) => {
  res.render('Signup');
});
app.get('/dashboard', (req, res) => {
  res.render('PatientDashboard');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
