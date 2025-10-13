
const express = require('express');
const therapyController = require('../controllers/therapyController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.get('/therapists/me', authMiddleware, therapyController.retrieveMyTherapistProfile);
router.patch('/therapists/me', authMiddleware, therapyController.updateMyTherapistProfile);
router.delete('/therapists/me', authMiddleware, therapyController.deleteMyTherapistProfile);
router.get('/therapists/:therapistID', therapyController.getSingleTherapist);
router.get('/therapists', therapyController.getAllTherapists);
router.post('/therapists', authMiddleware, therapyController.onboardTherapist);

router.post('/appointments/', authMiddleware, therapyController.bookAppointment);
router.get('/appointments/user', authMiddleware, therapyController.getUserAppointments);
router.post('/appointments/email-reminder', authMiddleware, therapyController.sendUpcomingAppointmentReminders);
router.get('/appointments/:appointmentID', therapyController.getSingleAppointment);
router.get('/appointments', therapyController.getAllAppointments);

module.exports = router
