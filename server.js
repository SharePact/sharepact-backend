const cluster = require('cluster');
const os = require('os');
const mongoose = require("mongoose");
const Server = require("./middleware/index.js");
const Router = require("./routes/index.js");
const processQueueManager = require("./processQueue");
const NotificationService = require("./notification/index");
const FirebaseService = require("./notification/firebase.js");
const PaymentInvoiceService = require("./notification/payment_invoice");
const InAppNotificationService = require("./notification/inapp");

require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

// process handler for queuing with redis
(async () => {
  const handlers = {
    testEvent: (data) => {
      console.log("process handler works");
    },
    notificationEvent: NotificationService.handleNotificationProcess,
    paymentInvoiceEvent: PaymentInvoiceService.handleSendInvoiceProcess,
    inAppNotificationEvent: InAppNotificationService.handleNotificationProcess,
  };
  await processQueueManager.initProcessQueue(handlers);
  const processQueue = processQueueManager.getProcessQueue();
  await processQueue.add({
    event: "testEvent",
  });
})();

FirebaseService.initApp();

if (cluster.isMaster) {
  const numCPUs = os.availableParallelism();
  console.log("number of cpus: ", numCPUs)
  console.log(`Master process ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Starting a new one...`);
    cluster.fork();
  });
} else {
  // This will be executed by the worker processes
  const serverInstance = new Server(new Router());
  serverInstance.startListening();
}
