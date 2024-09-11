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

const server = new Server(new Router());
server.startListening();
