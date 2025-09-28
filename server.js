const app = require('./app');
const http = require('http');
const { initializeSocket } = require('./src/config/socket');
require('dotenv').config();
require('./worker')


const server = http.createServer(app);


const io = initializeSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Socket.io initialized and ready for real-time chat');
});;