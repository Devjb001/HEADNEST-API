const Community = require('../models/Community.js');
const CommunityChatMessage = require('../models/CommunityChat.js');
const AnonymousUser = require('../models/AnonymousUser.js');

const mongoose = require('mongoose');


const adjectives = [
    'Sleepy', 'Fiery', 'Brave', 'Quiet', 'Witty', 'Giant', 'Tiny', 'Clever', 
    'Pink', 'Blue', 'Fast', 'Slow', 'Happy', 'Grumpy', 'Smooth', 'Sharp', 'Cool'
];
const animals = [
    'Panda', 'Fox', 'Dolphin', 'Tiger', 'Eagle', 'Koala', 'Wolf', 'Shark', 
    'Bear', 'Lion', 'Rabbit', 'Deer', 'Otter', 'Sloth', 'Goat', 'Wombat', 'Skunk'
];
// Utility function to generate a random alias - like, 'Fiery Wolf'
const generateAlias = () => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return `${adj} ${animal}`;
};


// Utility function to get user and community data
const getAnonUserData = async (anonymousUserSessionId) => {
	if (!mongoose.isValidObjectId(anonymousUserSessionId)) return null;

    const anonymousUser = await AnonymousUser.findById(anonymousUserSessionId)
        .populate('community'); 
        
    if (!anonymousUser) return null;

    return {
        user: anonymousUser,
        communityId: anonymousUser.community._id.toString(),
        userAlias: anonymousUser.alias,
    };
};

module.exports = (io) => {
    const communityNamespace = io.of('/anonymous-community-chat');

    communityNamespace.on('connection', (socket) => {
        console.log(`Anonymous user connected to community chat: ${socket.id}`);

        // Client sends: { communityId }
        // Emits: 'anonymous_user_created'
        socket.on('register_anonymous_user', async (data) => {
            try {
                const { communityId } = data;

                if (!communityId || !mongoose.isValidObjectId(communityId)) {
                    return socket.emit('error', { message: "Invalid Community ID provided for registration." });
                }

				let uniqueAlias = '';
				let isUniqueInRoom = false;
				let attempts = 0;
				const maxAttempts = 10;
				
				// Loop to find an alias unique to the CURRENT COMMUNITY
				while (!isUniqueInRoom && attempts < maxAttempts) {
					uniqueAlias = generateAlias();
					
					const existingUser = await AnonymousUser.findOne({ 
						alias: uniqueAlias,
						community: communityId 
					});
					
					if (!existingUser) { isUniqueInRoom = true; }
					attempts++;
				}

				if (!isUniqueInRoom) {
					uniqueAlias = `${uniqueAlias}_${Math.floor(Math.random() * 999)}`;
					console.warn(`Fallback used for alias in community ${communityId}.`);
				}
                
                const newAnonymousUser = await AnonymousUser.create({
                    alias: uniqueAlias,
                    community: communityId,
                });

                socket.emit('anonymous_user_created', {
                    anonymousUserId: newAnonymousUser._id.toString(),
                    communityId: newAnonymousUser.community.toString(),
                    alias: newAnonymousUser.alias,

                    userObject: newAnonymousUser.toObject(), 
                });

                console.log(`New anonymous user created: ${uniqueAlias} (${newAnonymousUser._id})`);

            } catch (error) {
                if (error.code === 11000) {
                    return socket.emit('error', { 
                        message: 'Failed to create a unique alias. Please try connecting again.', 
                        error: error.message 
                    });
                }
                socket.emit('error', { message: 'Error registering anonymous user', error: error.message });
            }
        });


        // Client sends: { communityID, anonymousUserSessionId }
		// Emits: 'new_community_message'
        socket.on('join_community_room', async (data) => {
            try {
                const { communityID, anonymousUserSessionId } = data;

                if (!mongoose.isValidObjectId(communityID) || !mongoose.isValidObjectId(anonymousUserSessionId)) {
                    return socket.emit('error', { message: 'Invalid IDs provided' });
                }
                
                const userData = await getAnonUserData(anonymousUserSessionId);
                
                if (!userData || userData.communityId !== communityID) {
                    return socket.emit('error', { message: 'User not authorized for this community' });
                }

                socket.anonymousUserSessionId = anonymousUserSessionId;
                socket.currentCommunityId = communityID;
                socket.userAlias = userData.userAlias;

                const roomName = `community_${communityID}`;
                socket.join(roomName);
                
                const messages = await CommunityChatMessage.find({ community: communityID })
                    .sort({ createdAt: 1 })
                    .limit(100);

                socket.emit('room_access', { 
                    messages, 
                    community: userData.user.community
                });

                const joinNotification = await CommunityChatMessage.create({
                    community: communityID,
                    anonymousUser: anonymousUserSessionId,
                    messageType: 'notification',
                    content: `${userData.userAlias} has joined the chat session.`,
                });

                socket.to(roomName).emit('new_community_message', { 
                    ...joinNotification.toObject(),
                    senderAlias: userData.userAlias,
                    event: 'join'
                });

                console.log(`Anonymous user ${userData.userAlias} joined room ${roomName}`);
            } catch (error) {
                socket.emit('error', { message: 'Error joining session', error: error.message });
            }
        });


        // Client sends: { content }
		// Emits: 'new_community_message'
        socket.on('community_message_send', async (data) => {
            try {
                const { content } = data;
                const { anonymousUserSessionId, currentCommunityId, userAlias } = socket;
                
                if (!anonymousUserSessionId || !currentCommunityId || !content) {
                    return socket.emit('error', { message: 'Not authenticated or missing content.' });
                }

                const message = await CommunityChatMessage.create({
                    anonymousUser: anonymousUserSessionId,
                    community: currentCommunityId,
                    content,
                    messageType: 'text'
                });

                communityNamespace.to(`community_${currentCommunityId}`).emit('new_community_message', {
                    ...message.toObject(),
                    senderAlias: userAlias,
                });
            } catch (error) {
                socket.emit('error', { message: 'Error sending message', error: error.message });
            }
        });


		// No input from client; needed data is obtained from socket
		// Emits: 'new_community_message'
        socket.on('leave_community_room', async () => {
            try {
                const { anonymousUserSessionId, currentCommunityId, userAlias } = socket;

                if (anonymousUserSessionId && currentCommunityId) {
                    const roomName = `community_${currentCommunityId}`;
                    
                    const leaveNotification = await CommunityChatMessage.create({
                        community: currentCommunityId,
                        anonymousUser: anonymousUserSessionId,
                        messageType: 'notification',
                        content: `${userAlias} has left the chat session.`,
                    });
                    
                    socket.to(roomName).emit('new_community_message', {
                        ...leaveNotification.toObject(),
                        senderAlias: userAlias,
                        event: 'left'
                    });

                    socket.leave(roomName);
                    socket.currentCommunityId = null;
                }
            } catch (error) {
                socket.emit('error', { message: 'Error leaving session', error: error.message });
            }
        });


        // Client sends: { communityID }
		// Emits: 'chat_history_cleared'
        socket.on('clear_old_messages', async (data) => {
            try {
                const { communityID } = data;

                if (!mongoose.isValidObjectId(communityID)) {
                    return socket.emit('error', { message: 'Invalid Community ID' });
                }
                
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                
                const result = await CommunityChatMessage.deleteMany({
                    community: communityID,
                    createdAt: { $lt: sevenDaysAgo },
                });
                
                const roomName = `community_${communityID}`;
                
                communityNamespace.to(roomName).emit('chat_history_cleared', {
                    deletedCount: result.deletedCount,
                    message: `Admin cleared ${result.deletedCount} old messages.`
                });
                
                socket.emit('status', { message: 'Cleanup complete.' });
            } catch (error) {
                socket.emit('error', { message: 'Error clearing history', error: error.message });
            }
        });
        

		// Handling socket disconnection
		// Emits: 'new_community_message'
		socket.on('disconnect', async () => {
			console.log(`Anonymous user disconnected: ${socket.id}`);
			const { anonymousUserSessionId, currentCommunityId, userAlias } = socket;

			if (anonymousUserSessionId && currentCommunityId) {
				const roomName = `community_${currentCommunityId}`;
				
				console.log(`Anon user ${userAlias} disconnected from room ${roomName}`);

				const disconnectNotification = await CommunityChatMessage.create({
					community: currentCommunityId,
					anonymousUser: anonymousUserSessionId,
					messageType: 'notification',
					content: `${userAlias} has disconnected.`,
				});

				communityNamespace.to(roomName).emit('new_community_message', {
					...disconnectNotification.toObject(),
					senderAlias: userAlias,
					event: 'disconnect',
					disconnectedAt: new Date()
				});
			}
		});

    });
};
