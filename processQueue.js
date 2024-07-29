const Queue = require("bull");

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
    });

    this.processQueue.process(async (job, done) => {
      const { event } = job.data;
      try {
        switch (event) {
          case "notificationEvent":
            const notificationEventHandler = this.handlers[event];
            if (!notificationEventHandler)
              return done(new Error(`handler for event ${event} not found`));
            await notificationEventHandler(job.data);
            break;
          case "testEvent":
            const testEventHandler = this.handlers[event];
            if (!testEventHandler)
              return done(new Error(`handler for event ${event} not found`));
            await testEventHandler(job.data);
            break;
          default:
            return done(new Error(`process event ${event} not implemented`));
        }
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
