const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const routes = require('./routes/routes');
const cookieParser = require('cookie-parser');
const app = express();
const port = 3000;
app.set('view engine', 'ejs');
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

mongoose.connect("mongodb+srv://assik4:assik4@cluster0.5jdqoez.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on("connected", () => {
  console.log("Mongo db established");
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

