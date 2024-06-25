const express = require('express');
const app = express();
const admin = require('./firebase/admin'); // Ensure the path is correct
const firebase = require('./firebase/client'); // Ensure the path is correct
const authRoutes = require('./routes/authRoutes');

app.use(express.json());

// Use routes
app.use('/auth', authRoutes);

module.exports = app;
