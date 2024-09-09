const mongoose = require("mongoose");
const Server = require("./middleware/index.js");
const Router = require("./routes/index.js");
const processQueueManager = require("./processQueue");
const NotificationService = require("./notification/index");
const FirebaseService = require("./notification/firebase.js");
const PaymentInvoiceService = require("./notification/payment_invoice");

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
  };
  await processQueueManager.initProcessQueue(handlers);
  const processQueue = processQueueManager.getProcessQueue();
  await processQueue.add({
    event: "testEvent",
  });
})();
FirebaseService.initApp();
FirebaseService.sendNotification(
  "1:573408586871:web:919d0ee10f4f534b6b2a72",
  "test",
  "test"
);
FirebaseService.sendNotificationToTopic("uuwiyiveq", "test", "test");

const server = new Server(new Router());
server.startListening();
