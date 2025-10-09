
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const TherapyChat = require('../models/TherapyChat');
require('dotenv').config();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

// Initialize Socket.io
const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected: ${socket.id}`);

    // Join therapy session room
    socket.on('join_therapy_session', async (data) => {
      try {
        const { sessionId } = data;
        
        // Validate session access
        const appointment = await Appointment.findById(sessionId);
        if (!appointment) {
          return socket.emit('error', { message: 'Session not found' });
        }

      
        // Check if user has access to this session
        const hasAccess = appointment.user.toString() === socket.userId || 
                         appointment.therapist.toString() === socket.userId; 

        if (!hasAccess) {
          return socket.emit('error', { message: 'Access denied to this session' });
        }

        // Join the room
        const roomName = `therapy_${sessionId}`;
        socket.join(roomName);
        socket.currentSession = sessionId;

    
        // Determine user type
        const userType = appointment.therapist.toString() === socket.userId ? 'therapist' : 'user';
        socket.userType = userType;

        // Notify room that user joined
        socket.to(roomName).emit('user_joined', {
          userId: socket.userId,
          userName: socket.user.name,
          userType: userType,
          joinedAt: new Date()
        });

        // Send confirmation to user
        socket.emit('session_joined', {
          sessionId,
          roomName,
          userType,
          message: 'Successfully joined therapy session'
        });

        // Create join notification in database
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
        socket.emit('error', { message: 'Error joining session', error: error.message });
      }
    });

    // Send message in therapy chat
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

        // Save message to database
        const newMessage = new TherapyChat({
          sessionId,
          senderId: socket.userId,
          senderType: socket.userType,
          message: message.trim(),
          messageType: 'text'
        });

        await newMessage.save();
        await newMessage.populate('senderId', 'name email');

        // Send to all users in the room
        const roomName = `therapy_${sessionId}`;
        io.to(roomName).emit('new_message', {
          _id: newMessage._id,
          sessionId: newMessage.sessionId,
          senderId: newMessage.senderId,
          senderType: newMessage.senderType,
          message: newMessage.message,
          messageType: newMessage.messageType,
          createdAt: newMessage.createdAt,
          isFromSelf: false
        });

        console.log(`Message sent in session ${sessionId}: ${message.substring(0, 50)}...`);

      } catch (error) {
        socket.emit('error', { message: 'Error sending message', error: error.message });
      }
    });

    // Typing indicators
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

    // Mark message as read
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
        socket.emit('error', { message: 'Error marking message as read' });
      }
    });

    // Leave therapy session
    socket.on('leave_therapy_session', async () => {
      try {
        if (socket.currentSession) {
          const sessionId = socket.currentSession;
          const roomName = `therapy_${sessionId}`;

          // Create leave notification in database
          const leaveNotification = new TherapyChat({
            sessionId,
            senderId: socket.userId,
            senderType: socket.userType,
            message: `${socket.user.name} left the session`,
            messageType: 'notification'
          });
          await leaveNotification.save();

          // Notify room that user left
          socket.to(roomName).emit('user_left', {
            userId: socket.userId,
            userName: socket.user.name,
            userType: socket.userType,
            leftAt: new Date()
          });

          // Leave the room
          socket.leave(roomName);
          socket.currentSession = null;
          socket.userType = null;

          socket.emit('session_left', { message: 'Left therapy session successfully' });
        }
      } catch (error) {
        socket.emit('error', { message: 'Error leaving session' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.name} disconnected: ${socket.id}`);
      
      // Auto-leave session on disconnect
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

  });

  return io;
};

module.exports = { initializeSocket };