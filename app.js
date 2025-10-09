const express = require('express');
const passport = require('passport');
require("dotenv").config()
require("./src/jobs/sendReminders");
const cors = require('cors');

const app = express();



// imported files
const logger = require('./logger')
const { connectToDataBase } = require('./src/config/db');
const googleAuthRoutes = require('./src/auth/googleAuth');
const userAuthRoutes = require('./src/auth/userAuthRoutes');
const therapyRoutes = require('./src/routes/therapyRoutes');
const journalRoutes = require('./src/routes/journalRoutes');
const moodRoutes = require('./src/routes/moodRoutes');
const communityRoutes = require('./src/routes/communityRoutes');
const therapyChatRoutes = require('./src/routes/therapyChatRoutes')
const preferencesRoutes = require("./src/routes/preferencesRoutes");
const paymentRoutes = require('./src/routes/paymentRoutes');
const agenda = require('./src/config/agenda');


// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


//connecting to database
connectToDataBase()


//jobs
const reminderJob = async() => {
  await agenda.start();
  console.log("agenda started");
  await agenda.every("0 8 * * *", "send morning reminders");
  await agenda.every("0 18 * * *", "send evening reminders");
};
reminderJob()


// Routes
app.use('/api', googleAuthRoutes);
app.use('/api', userAuthRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api', moodRoutes);
app.use('/api', communityRoutes);
app.use('/api', therapyRoutes);
app.use('/api', therapyChatRoutes);
app.use("/api", preferencesRoutes);
app.use('/api', paymentRoutes)


// ..............
app.get("/", (req , res) => {
    logger.info("Home route accessed")
    res.status(200).send("This is home route, pls select a route to perform an action")
})

app.get("/error", (req, res) => {
  logger.error("Something went wrong");
  res.status(500).send("Error happened!");
});

module.exports = app;
