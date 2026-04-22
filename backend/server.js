const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const mongoose = require('mongoose');   // ADD THIS
require('dotenv').config();   

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/urbanmind')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use(cors());
app.use(bodyParser.json());
app.use('/api', routes); // Prefixes all routes with /api

app.listen(PORT, () => {
    console.log(` SCIA Backend running on http://localhost:${PORT}`);
});