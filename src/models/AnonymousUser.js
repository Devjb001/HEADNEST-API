
const mongoose = require('mongoose');

const AnonymousUserSchema = new mongoose.Schema({
    alias: { // The generated anonymous name (e.g., 'Anonymous Dolphin')
        type: String,
        required: true,
        // unique: true,
        trim: true
    },
    community: { // Which community they are currently viewing/active in
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community',
        required: true
    },
    lastActive: { 
        type: Date,
        default: Date.now,
        expires: 7200 //  The user will be auto-removed after 2h of silence. 
    }
}, { timestamps: true });

module.exports = mongoose.model('AnonymousUser', AnonymousUserSchema);
