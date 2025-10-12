const mongoose = require('mongoose');

const CommunityChatMessageSchema = new mongoose.Schema({
    community: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community',
        required: true,
    },
    anonymousUser: { // The unique, persistent ID stored in the client's Local Storage
		type: mongoose.Schema.Types.ObjectId,
        ref: 'AnonymousUser',
        required: true,
    },
	messageType: {
		type: String,
		enum: ['text', 'notification', 'system'],
		default: 'text',
		required: [true, 'Message Type must be set. Options are: [text / notification / system].']
	},
    content: {
        type: String,
        required: [true, 'Message content cannot be empty.'],
        trim: true,
        maxlength: 500 
    },
}, { timestamps: true });

CommunityChatMessageSchema.index({ community: 1, createdAt: 1 });

module.exports = mongoose.model('CommunityChatMessage', CommunityChatMessageSchema);
