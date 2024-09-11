const ServiceModel = require("../models/service");
const Flutterwave = require("../utils/flutterwave");
const PaymentModel = require("../models/payment");
const { sendEmailWithBrevo } = require("./brevo");
const ejs = require("ejs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const puppeteer = require("puppeteer");
const processQueueManager = require("../processQueue");
const GroupModel = require("../models/group");

class PaymentInvoiceService {
  static async sendToGroup({ group }) {
    const processQueue = processQueueManager.getProcessQueue();
    group.members.map(async (member) => {
      const user = member.user;
      await processQueue.add(
        {
          event: "paymentInvoiceEvent",
          group,
          user,
          handler: this.handleSendInvoiceProcess,
        },
        {
          attempts: 30,
          backoff: {
            type: "jitter",
          },
        }
      );
    });
  }

  static async generateInvoice(group, user) {
    const templatePath = path.join(__dirname, "../templates/invoice.ejs");
    const cost = group.subscriptionCost / group.members?.length;
    const amount = group.handlingFee + cost;
    const service = await ServiceModel.findById(group.service);

    const resp = await Flutterwave.getUrl({
      user_id: user._id,
      email: user.email,
      name: user.username,
      transaction_reference: uuidv4(),
      amount: amount,
      currency: service.currency,
      redirect_url: `${process.env?.APP_URL}/api/verify-payment`,
    });

    if (!resp.status) throw new Error("error generating payment link");
    console.log("88888888888888888, succeded");

    await PaymentModel.createPayment({
      reference: resp.reference,
      userId: user._id,
      groupId: group._id,
      amount,
      disbursed: false,
      currency: service.currency,
    });
    const html = await ejs.renderFile(templatePath, {
      group,
      user,
      cost,
      amount,
      payment_link: resp.payment_link,
    });

    // Use Puppeteer to generate the PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the content for the page
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate the PDF
    const pdfBuffer = await page.pdf({ format: "Letter" });
    // Close the browser after generating the PDF
    await browser.close();

    const dataBuffer = Buffer.from(pdfBuffer);
    return dataBuffer;
  }

  static async handleSendInvoiceProcess(data) {
    const { group: groupInfo, user } = data;
    const group = await GroupModel.findById(groupInfo._id);
    const buffer = await PaymentInvoiceService.generateInvoice(group, user);
    sendEmailWithBrevo({
      subject: `${group.groupName} invoice`,
      htmlContent: `<h2>Payment invoice for ${group.groupName}  <h2>`,
      to: [{ email: user.email }],
      attachments: [{ name: "invoice.pdf", buffer: buffer }],
    });
    await group.updateMemberPaymentActiveState(user._id, false);
    await group.updateMemberlastInvoiceSentAt(user._id, Date.now());
  }
}

module.exports = PaymentInvoiceService;
