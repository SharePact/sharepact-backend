const { Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis();

const emailWorker = new Worker('myqueue', async (job)=>{
   const { group } = job.data;
  
  try {
    const invoices = await Promise.all(
      group.members.map(async (member) => {
        const user = member.user;
        const buffer = await generateInvoice(group, user);
        sendEmailWithBrevo({
          subject: `${group.groupName} - ${group.planName} invoice`,
          htmlContent: `<h2>Payment invoice for ${group.groupName} - ${group.planName} <h2>`,
          to: [{ email: user.email }],
          attachments: [{ name: "invoice.pdf", buffer: buffer }],
        });
        return {
          user,
          buffer,
        };
      })
    );
  } catch (error) {
    console.error(error)
   throw new Error(error) 
  }
}, { 
    connection,
 attempts: 5, // The job will be retried 5 times before failing permanently
    backoff: {
        type: 'exponential', // Use exponential backoff
        delay: 5000, // Initial delay of 5 seconds between retries
    }
  });

emailWorker.on('completed', job => {
    console.log(`Job ${job.id} has completed!`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`);
});
