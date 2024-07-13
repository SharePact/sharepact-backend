const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/category'); 
const serviceRoutes = require('./routes/service'); 
const profileRoutes = require('./routes/profile');
const bankDetailsRoutes = require('./routes/bankdetails');

const http = require("http")

const cors = require('cors');
const { PlainWebSocketHandler } = require('./utils/socket');

require('dotenv').config();

const app = express();

const server = http.createServer(app);

exports.plainWebSocketHandler = new PlainWebSocketHandler(server);

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', authRoutes); // Use authRoutes for '/auth' routes
app.use('/api/categories', categoryRoutes); // Mount categoryRoutes under '/api/categories'
app.use('/api/services', serviceRoutes); // Mount serviceRoutes under '/api/services'
app.use('/api/profile', profileRoutes); // Mount profileRoutes under '/api/profile'
app.use('/api', bankDetailsRoutes); // Mount bankDetailsRoutes
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
