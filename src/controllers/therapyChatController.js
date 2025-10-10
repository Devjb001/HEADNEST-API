const TherapyChat = require('../models/TherapyChat');

const accessChatroom = async (req, res) => {
  try {
    const { sessionId, booking } = req.session;

  
    const messages = await TherapyChat.find({ 
      sessionId,
      isDeleted: false 
    })
    .populate('senderId', 'name email')
    .sort({ createdAt: 1 })
    .limit(100);

    res.status(200).json({
      success: true,
      message: 'Chat session accessed successfully',
      data: {
        sessionId,
        sessionInfo: {
          appointmentId: booking._id,
          userId: booking.user,
          therapistId: booking.therapist,
          sessionDate: booking.datetime
        },
        messages: messages,
        messageCount: messages.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accessing chat session',
      error: error.message
    });
  }
};

module.exports = {
  accessChatroom
};