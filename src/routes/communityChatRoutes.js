
const express = require('express');
const communityChatController = require('../controllers/communityChatController.js')

const router = express.Router();

router.post('/community/chat/send', communityChatController.sendMessage);
router.post('/community/chat/exit', communityChatController.exitChatRoom);
router.post('/community/chat/notify', communityChatController.notifyJoinOrLeave);
router.delete('/community/chat/history/:communityID', communityChatController.clearChatHistory);
router.get('/community/chat/:communityID', communityChatController.accessChatRoom); 

module.exports = router;
