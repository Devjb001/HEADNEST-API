const app = require('./app');
const http = require('http');
const { initializeSocket } = require('./src/config/socket');
const { startChatCleanupCron } = require('./src/jobs/deleteOldChats');

require('dotenv').config();
require('./worker')


const server = http.createServer(app);


const io = initializeSocket(server);
startChatCleanupCron();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.io initialized and ready for real-time chat');
});
