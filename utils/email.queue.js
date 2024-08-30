const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis();

// Create a BullMQ queue
const emailQueue = new Queue('emailQueue', {
    connection
});

module.exports = emailQueue;
