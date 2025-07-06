const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load .env variables

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // For form data
app.use(express.json()); // For JSON data

// Serve HTML landing page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB connection error:', err));

// ✅ Define Mongoose Schemas and Models

// User schema: simple username string
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Exercise schema: each exercise belongs to a userId
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// ✅ Routes

// POST /api/users - Register a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).send('Error creating user');
  }
});

// GET /api/users - Return all registered users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});

// POST /api/users/:_id/exercises - Add an exercise to a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).send('User not found');

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).send('Error saving exercise');
  }
});

// GET /api/users/:_id/logs - Get full exercise log for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).send('User not found');

    // Optional query filters: from, to, limit
    const { from, to, limit } = req.query;
    let filter = { userId: user._id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter);
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }))
    });
  } catch (err) {
    res.status(500).send('Error fetching logs');
  }
});

// ✅ Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server is listening on port ' + listener.address().port);
});