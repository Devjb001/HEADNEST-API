const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const sessionAuthMiddleware = require('../middlewares/sessionAuthMiddleware');
const { accessChatroom } = require('../controllers/therapyChatController');


router.get('/appointments/:id/chat', authMiddleware, sessionAuthMiddleware, accessChatroom);


module.exports = router;