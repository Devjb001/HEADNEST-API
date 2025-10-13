
const User = require('../models/User.js');
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
	console.error(err);
    res.status(500).json({error: err.message})
  }
};

// POST /therapists
const onboardTherapist = async (req, res) => {
	try {
		const userId = req.user.id;
		const { name, specialization, description, qualifications, rate, avatar } = req.body;

		if (!name || !specialization || !rate) {
		  return res.status(400).json({ message: 'Missing required fields: name, specialization, and rate.' });
		}

		let user = await User.findById(userId);

		const therapist = await Therapist.create({
			user: userId,
			name,
			specialization,
			description: description || '',
			qualifications: qualifications || [],
			rate,
			avatar: avatar || ''
		});

		user.role = 'therapist';
		await user.save();

		return res.status(201).json({
			message: 'Therapist onboarded successfully.',
			therapist
		})
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: `Error onboarding therapist: ${err.message}` });
	}
}

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
	console.error(err);
    res.status(500).json({error: err.message})
  }
};

// GET /therapists/me
const retrieveMyTherapistProfile = async (req, res) => {
	try {
		const therapist = await Therapist.findOne({ user: req.user.id }).populate('user');

		if (!therapist) {
			return res.status(404).json({ message: "Therapist profile for authenticated user not found." })
		}

		return res.status(200).json({
			message: "Therapist profile retrieved successfully.",
			therapist
		})
	} catch (err) {
		console.error(err);
		res.status(500).json({error: err.message})
	}
}

// PATCH /therapists/me
const updateMyTherapistProfile = async (req, res) => {
	try {
		const therapist = await Therapist.findOne({ user: req.user.id }).populate('user');

		if (!therapist) {
			return res.status(404).json({ message: "Therapist profile for authenticated user not found." })
		}

		const { name, specialization, description, qualifications, rate, avatar } = req.body;

		if (name) therapist.name = name;
		if (specialization) therapist.specialization = specialization;
		if (description) therapist.description = description;
		if (qualifications) therapist.qualifications = qualifications;
		if (rate) therapist.rate = rate;
		if (avatar) therapist.avatar = avatar;

		await therapist.save();

		return res.status(200).json({
			message: "Therapist profile updated successfully.",
			therapist
		})
	} catch (err) {
		console.error(err);
		res.status(500).json({error: err.message})
	}
}

// DELETE /therapists/me
const deleteMyTherapistProfile = async (req, res) => {
	try {
		const userId = req.user.id;

		const therapist = await Therapist.findOneAndDelete({ user: userId });
		const user = await User.findById(userId);

		if (!therapist) {
			return res.status(404).json({ message: "Therapist profile for authenticated user not found." })
		}

		user.role = 'patient';
		await user.save();

		return res.status(204).json({ message: "Therapist profile deleted successfully."})
	} catch (err) {
		console.error(err);
		res.status(500).json({error: err.message})
	}

}

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
	console.error(err);
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
	console.error(err);
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
    return res.status(200).json({message: `Reminder email sent successfully to ${userEmail} for ${upcomingAppointments.length} appointments.`});

  } catch (err) {
    console.error(`ERROR processing reminders for user ${userID}:`, err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllTherapists,
  onboardTherapist,
  getSingleTherapist,
  retrieveMyTherapistProfile,
  updateMyTherapistProfile,
  deleteMyTherapistProfile,
  getAllAppointments,
  getSingleAppointment,
  getUserAppointments,
  bookAppointment,
  sendUpcomingAppointmentReminders,
}

