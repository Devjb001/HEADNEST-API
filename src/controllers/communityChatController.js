
const Community = require('../models/Community.js');
const CommunityChatMessage = require('../models/CommunityChat.js');
const AnonymousUser = require('../models/AnonymousUser.js');

const mongoose = require('mongoose')

const accessChatRoom = async(req, res) => {
	try {
		const { communityID } = req.params;
		
		if (!mongoose.isValidObjectId(communityID)) {
			return res.status(400).json({message: "Invalid Community ID provided." });
		}

		community = await Community.findById(communityID);
		messages = await CommunityChatMessage.find({community: communityID})
		.sort({ createdAt: 1 })
		.limit(100);

		res.status(200).json({
			message: "Community ChatRoom messages retrieved successfully.",
			messages,
			community
		});
	} catch (err) {
	    res.status(500).json({error: err.message})
	}
};

const sendMessage = async(req, res) => {
	try {
		const anonymousUserSessionId = req.header('anonymousUserSessionId');
		// const { anonymousUserSessionId } = req.session;

		if (!anonymousUserSessionId) {
		    return res.status(401).json({ message: 'Anonymous user session ID (Header "anonymousUserSessionId") is required.' });
		}

		if (!mongoose.isValidObjectId(anonymousUserSessionId)) {
			return res.status(400).json({message: "Invalid Anonymous User Session ID." });
		}

		const { content } = req.body;
		
		const anonymousUser = await AnonymousUser.findById(anonymousUserSessionId).populate('community');
		message = await CommunityChatMessage.create({
			anonymousUser: anonymousUserSessionId,
			community: anonymousUser.community,
			content,
			messageType: 'text'
		});

		res.status(200).json({
			success: true,
			message,
		})
	} catch (err) {
	    res.status(500).json({error: err.message})
	}
};

const exitChatRoom = async(req, res) => {
	try {
		const anonymousUserSessionId = req.header('anonymousUserSessionId');
		// const { anonymousUserSessionId } = req.session;

		if (!anonymousUserSessionId) {
		    return res.status(401).json({ message: 'Anonymous user session ID (Header "anonymousUserSessionId") is required.' });
		}

		if (!mongoose.isValidObjectId(anonymousUserSessionId)) {
			return res.status(400).json({message: "Invalid Anonymous User Session ID." });
		}

		const anonymousUser = await AnonymousUser.findById(anonymousUserSessionId).populate('community');
		const notificationMessage = `${anonymousUser.alias} has left the chat session.`;

		const notification = await CommunityChatMessage.create({
			community: anonymousUser.community,
			anonymousUser,
			messageType: 'notification',
			content: notificationMessage,
		});

		res.status(201).json({
		  message: 'Exited chat room successfully.',
		  data: notification
		});

	} catch (err) {
	    res.status(500).json({error: err.message})
	}
};

const notifyJoinOrLeave = async(req, res) => {
	try {
		const anonymousUserSessionId = req.header('anonymousUserSessionId');
		// const { anonymousUserSessionId } = req.session;

		if (!anonymousUserSessionId) {
		    return res.status(401).json({ message: 'Anonymous user session ID (Header "anonymousUserSessionId") is required.' });
		}

		if (!mongoose.isValidObjectId(anonymousUserSessionId)) {
			return res.status(400).json({message: "Invalid Anonymous User Session ID." });
		}

		const { action } = req.body;

		if (!action) {
		  return res.status(400).json({
			success: false,
			message: 'Action is required. Options are [joined/left].'
		  });
		}

		const anonymousUser = await AnonymousUser.findById(anonymousUserSessionId);
		const notificationMessage = `${anonymousUser.alias} has ${action} the chat session.`;

		const notification = await CommunityChatMessage.create({
			community: anonymousUser.community,
			anonymousUser,
			messageType: 'notification'
		});

		res.status(201).json({
		  message: 'Notification sent successfully.',
		  data: notification
		});

	} catch (err) {
	    res.status(500).json({error: err.message})
	}
};

const clearChatHistory = async(req, res) => {
	try {
		const { communityID } = req.params;

		if (!mongoose.isValidObjectId(communityID)) {
			return res.status(400).json({message: "Invalid Community ID provided." });
		}

		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const result = await CommunityChatMessage.deleteMany({
			community: communityID,
			createdAt: { $lt: sevenDaysAgo },
		});

		res.status(200).json({
		  success: true,
		  message: 'Expired messages from over a weeek ago cleared successfully.',
		  data: {
			deletedCount: result.deletedCount,
			cleanupDate: new Date()
		  }
		});

	} catch (err) {
	    res.status(500).json({error: err.message})
	}
};

module.exports = {
	accessChatRoom,
	sendMessage,
	exitChatRoom,
	notifyJoinOrLeave,
	clearChatHistory,
}
