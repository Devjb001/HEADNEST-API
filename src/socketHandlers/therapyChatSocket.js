const Appointment = require('../models/Appointment');
const TherapyChat = require('../models/TherapyChat');

const therapyChatSocketHandler = (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket.id})`);

  // Join therapy session
  socket.on('join_therapy_session', async (data) => {
    try {
      const { sessionId } = data;

      const appointment = await Appointment.findById(sessionId);
      if (!appointment) {
        return socket.emit('error', { message: 'Session not found' });
      }

    
      const hasAccess = appointment.user.toString() === socket.userId || 
                       appointment.therapist.toString() === socket.userId;

      if (!hasAccess) {
        return socket.emit('error', { message: 'Access denied to this session' });
      }

    
      const roomName = `therapy_${sessionId}`;
      socket.join(roomName);
      socket.currentSession = sessionId;

      
      const userType = appointment.therapist.toString() === socket.userId ? 'therapist' : 'user';
      socket.userType = userType;

 
      socket.to(roomName).emit('user_joined', {
        userId: socket.userId,
        userName: socket.user.name,
        userType: userType,
        joinedAt: new Date()
      });

  
      socket.emit('session_joined', {
        sessionId,
        roomName,
        userType,
        message: 'Successfully joined therapy session'
      });

   
      const joinNotification = new TherapyChat({
        sessionId,
        senderId: socket.userId,
        senderType: userType,
        message: `${socket.user.name} joined the session`,
        messageType: 'notification'
      });
      await joinNotification.save();

      console.log(`${socket.user.name} joined therapy session: ${sessionId}`);

    } catch (error) {
      console.error('Join session error:', error);
      socket.emit('error', { message: 'Error joining session', error: error.message });
    }
  });


  socket.on('send_message', async (data) => {
    try {
      const { message } = data;
      const sessionId = socket.currentSession;

      if (!sessionId) {
        return socket.emit('error', { message: 'Not in any therapy session' });
      }

      if (!message || !message.trim()) {
        return socket.emit('error', { message: 'Message cannot be empty' });
      }

     
      const newMessage = new TherapyChat({
        sessionId,
        senderId: socket.userId,
        senderType: socket.userType,
        message: message.trim(),
        messageType: 'text'
      });

      await newMessage.save();
      await newMessage.populate('senderId', 'name email');

     
      const roomName = `therapy_${sessionId}`;
      socket.to(roomName).emit('new_message', {
        _id: newMessage._id,
        sessionId: newMessage.sessionId,
        senderId: newMessage.senderId,
        senderType: newMessage.senderType,
        message: newMessage.message,
        messageType: newMessage.messageType,
        createdAt: newMessage.createdAt
      });

     
      socket.emit('message_sent', {
        _id: newMessage._id,
        message: newMessage.message,
        createdAt: newMessage.createdAt
      });

      console.log(`Message sent in session ${sessionId}: ${message.substring(0, 50)}...`);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Error sending message', error: error.message });
    }
  });


  socket.on('typing_start', () => {
    if (socket.currentSession) {
      const roomName = `therapy_${socket.currentSession}`;
      socket.to(roomName).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        userType: socket.userType
      });
    }
  });

  socket.on('typing_stop', () => {
    if (socket.currentSession) {
      const roomName = `therapy_${socket.currentSession}`;
      socket.to(roomName).emit('user_stopped_typing', {
        userId: socket.userId
      });
    }
  });


  socket.on('mark_message_read', async (data) => {
    try {
      const { messageId } = data;
      
      await TherapyChat.findByIdAndUpdate(messageId, { isRead: true });
      
      if (socket.currentSession) {
        const roomName = `therapy_${socket.currentSession}`;
        socket.to(roomName).emit('message_read', {
          messageId,
          readBy: socket.userId,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Mark read error:', error);
      socket.emit('error', { message: 'Error marking message as read' });
    }
  });

  
  socket.on('leave_therapy_session', async () => {
    try {
      if (socket.currentSession) {
        const sessionId = socket.currentSession;
        const roomName = `therapy_${sessionId}`;

       
        const leaveNotification = new TherapyChat({
          sessionId,
          senderId: socket.userId,
          senderType: socket.userType,
          message: `${socket.user.name} left the session`,
          messageType: 'notification'
        });
        await leaveNotification.save();


        socket.to(roomName).emit('user_left', {
          userId: socket.userId,
          userName: socket.user.name,
          userType: socket.userType,
          leftAt: new Date()
        });


        socket.leave(roomName);
        socket.currentSession = null;
        socket.userType = null;

        socket.emit('session_left', { message: 'Left therapy session successfully' });
        console.log(`${socket.user.name} left therapy session: ${sessionId}`);
      }
    } catch (error) {
      console.error('Leave session error:', error);
      socket.emit('error', { message: 'Error leaving session' });
    }
  });


  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
    
 
    if (socket.currentSession) {
      const roomName = `therapy_${socket.currentSession}`;
      socket.to(roomName).emit('user_disconnected', {
        userId: socket.userId,
        userName: socket.user.name,
        userType: socket.userType,
        disconnectedAt: new Date()
      });
    }
  });
};

module.exports = therapyChatSocketHandler;