const Queue = require("bull");
require("dotenv").config();

class ProcessQueueManager {
  constructor() {
    this.processQueue = null;
  }

  async initProcessQueue(handlers) {
    this.handlers = handlers;
    this.processQueue = new Queue("process queue", {
      redis: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD ?? "",
      },
      defaultJobOptions: {
        attempts: 10,
      },
      settings: {
        retryProcessDelay: 5000,
        backoffStrategies: {
          jitter: function (attemptsMade, err) {
            return 30000 * (Math.random() * 10 * attemptsMade);
          },
        },
      },
    });

    this.processQueue.process(async (job, done) => {
      const { event } = job.data;
      try {
        const hnd = this.handlers[event];
        if (!hnd)
          return done(new Error(`handler for event ${event} not found`));
        await hnd(job.data);
        done();
      } catch (error) {
        done(error);
      }
    });

    this.processQueue.on("failed", (job, error) => {
      console.error(`Job ${job.id} failed with error: ${error.message}`);
      // Implement custom failure handling here, e.g., notify admins
    });

    this.processQueue.on("completed", (job, error) => {
      const { event } = job.data;
      console.info(`Job ${job.id} event ${event} has completed`);
    });
  }

  getProcessQueue() {
    return this.processQueue;
  }
}

module.exports = new ProcessQueueManager();
