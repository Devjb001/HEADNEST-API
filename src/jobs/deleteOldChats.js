const cron = require('cron');
const TherapyChat = require('../models/TherapyChat');

const deleteOldChats = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await TherapyChat.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`Cron: Deleted ${result.deletedCount} old chat messages (older than 30 days)`);
    
    return {
      success: true,
      deletedCount: result.deletedCount,
      deletedDate: thirtyDaysAgo
    };
  } catch (error) {
    console.error('Cron: Error deleting old chats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


const startChatCleanupCron = () => {
  const job = new cron.CronJob(
    '0 2 * * *', 
    deleteOldChats,
    null,
    true,
    'Africa/Lagos'
  );

  console.log('Chat cleanup cron job started (runs daily at 2:00 AM)');
  return job;
};

module.exports = { deleteOldChats, startChatCleanupCron };