
const Therapist = require('../models/Therapist');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const nodemailer = require("nodemailer");
const { formatAppointmentsForEmail } = require('../utils/formatAppointmentsForEmail.js');

require("dotenv").config();


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// GET /therapists
const getAllTherapists = async (req, res) => {
  try {
    const therapists = await Therapist.find({}).populate('user', 'email avatar');

    if (therapists.length > 0) {
      res.status(200).json(therapists);

    } else {
      res.status(404).json({message: 'No therapists found.' });
    }

  } catch (err) {
    res.status(500).json({error: err.message})
  }
};

// GET /therapists/:id 
const getSingleTherapist = async (req, res) => {
  try {
    const { therapistID } = req.params; // From the URL parameter

    if (!mongoose.isValidObjectId(therapistID)) {
      return res.status(400).json({message: "Invalid Therapist ID provided." });
    }

    const therapist = await Therapist.findById(therapistID).populate('user', 'email avatar');
    
    if (!therapist) {
      return res.status(404).json({message: `Therapist with id ${therapistID} not found.`});
    }

    res.status(200).json(therapist);

  } catch (err) {
    res.status(500).json({error: err.message})
  }
};

// GET /appointments
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({})
      .populate('user', 'email avatar')
      .populate('therapist', 'name specialization avatar');

    if (appointments.length > 0) {
      res.status(200).json(appointments);

    } else {
      res.status(404).json({message: 'No appointments found.' });
    }

  } catch (err) {
    res.status(500).json({error: err.message})
  } 
};

// GET /appointments/:appointmentID 
const getSingleAppointment = async (req, res) => {
  try {
    const { appointmentID } = req.params; // From the URL parameter

    if (!mongoose.isValidObjectId(appointmentID)) {
      return res.status(400).json({message: "Invalid Appointment ID provided." });
    }

    const appointment = await Appointment.findById(appointmentID)
      .populate('user', 'email avatar')
      .populate('therapist', 'name specialization avatar');

    if (!appointment) {
      return res.status(404).json({message: `Appointment with id ${appointmentID} not found.`});
    }

    res.status(200).json(appointment);

  } catch (err) {
    console.log(err);
    res.status(500).json({error: err.message})
  }
};

// GET /appointments/user
const getUserAppointments = async (req, res) => {
  try {
    const userID = req.user.id;
    const userAppointments = await Appointment.find({user:userID})
      .populate('user', 'email avatar')
      .populate('therapist', 'name specialization avatar');

    if (userAppointments.length > 0) {
      res.status(200).json(userAppointments);

    } else {
      res.status(404).json({ message: 'No appointments found for this user.' });
    }

  } catch (err) {
    res.status(500).json({error: err.message})
  }
}

// POST /appointments/
const bookAppointment = async (req, res) => {
  try {
    const userID = req.user.id;
    const { therapistID, datetime, duration, note, type } = req.body;

    if (!therapistID || !datetime || !duration) {
      return res.status(400).json({ message: 'Missing required fields: therapistID, datetime, and duration.' });
    }
    
    if (!mongoose.isValidObjectId(userID)) {
        return res.status(400).json({ message: 'Invalid ID format for user.'});
    }

    if (!mongoose.isValidObjectId(therapistID)) {
        return res.status(400).json({ message: 'Invalid ID format for therapist'});
    }

    const newAppointment = await Appointment.create({
      user: userID,
      therapist: therapistID,
      datetime: datetime,
      duration: duration,
      note: note || '',
	  type
    });

    res.status(201).json({ 
      message: 'Appointment successfully booked.',
      appointment: newAppointment 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Error booking appointment: ${err.message}` });
  }
};

// POST /appointments/email-reminder
const sendUpcomingAppointmentReminders = async (req, res) => {
  try {

    const userID = req.user.id;
    const userEmail = req.user.email;

    const upcomingAppointments = await Appointment.find({
      user: userID,
      datetime: { $gte: new Date() } 
    })
      .populate('therapist', 'name specialization')
      .sort({ datetime: 1 }); // Sort by date ascending

    if (upcomingAppointments.length === 0) {
      console.log(`No upcoming appointments found for user ${userID}. Skipping email.`);
      return;
    }

    const emailContent = formatAppointmentsForEmail(upcomingAppointments);

    await transporter.sendMail({
      from: `"Headnest Appointments" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Reminder: You have ${upcomingAppointments.length} Upcoming Appointment(s)`,
      text: emailContent.text,
      html: emailContent.html,
    });
    
    console.log(`Reminder email sent successfully to ${userEmail} for ${upcomingAppointments.length} appointments.`);
    return;

  } catch (err) {
    console.error(`ERROR processing reminders for user ${userID}:`, err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllTherapists,
  getSingleTherapist,
  getAllAppointments,
  getSingleAppointment,
  getUserAppointments,
  bookAppointment,
  sendUpcomingAppointmentReminders,
}

