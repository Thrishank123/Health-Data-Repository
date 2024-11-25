const express = require('express');
const app = express();

app.use(express.static('public'));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('Login');
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
