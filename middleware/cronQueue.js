const cron = require("node-cron");
const {
  recurringInvoices,
  checkMembersPayments,
  paymentReminderForInactiveMembers,
  groupCreatorDisbursement,
  verifyPendingDisbursements,
} = require("../controllers/cronjob");

// Log when the cron job is scheduled
console.log("Scheduling cron jobs...");

/**
 * Run the daily cron jobs sequentially.
 *
 * @returns {Promise<void>}
 * @async
 * @function
 */
const runCronJobs = async () => {
  const tasks = [
    { name: "recurringInvoices", task: recurringInvoices },
    { name: "checkMembersPayments", task: checkMembersPayments },
    {
      name: "paymentReminderForInactiveMembers",
      task: paymentReminderForInactiveMembers,
    },
    { name: "groupCreatorDisbursement", task: groupCreatorDisbursement },
    { name: "verifyPendingDisbursements", task: verifyPendingDisbursements },
  ];

  for (const { name, task } of tasks) {
    try {
      console.log(`Running daily cron job for ${name}`);
      await task();
      console.log(`All ${name} completed`);
    } catch (error) {
      console.error(`Error running ${name}:`, error);
    }
  }
};

// Schedule the cron job to run once daily
const cronJob = cron.schedule("0 1 * * *", runCronJobs, {
  name: "dailyCronJob",
});

console.log("Cron jobs scheduled.");

// Track the cron job status and log it
const scheduledTasks = cron.getTasks();

/**
 * Check if the daily cron job is scheduled
 * @type {boolean}
 */
const isDailyCronJobScheduled = scheduledTasks.has("dailyCronJob");
console.log(`Is daily cron job scheduled? ${isDailyCronJobScheduled}`);
