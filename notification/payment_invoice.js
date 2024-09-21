const ServiceModel = require("../models/service");
const Flutterwave = require("../utils/flutterwave");
const PaymentModel = require("../models/payment");
const { sendEmailWithBrevo } = require("./brevo");
const ejs = require("ejs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const pdf = require("html-pdf");
const processQueueManager = require("../processQueue");
const GroupModel = require("../models/group");
require("dotenv").config();

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
    console.log("starting html-pdf");

    // Create PDF with html-pdf
    const options = { format: "Letter" }; // You can modify options if needed

    const pdfBuffer = await new Promise((resolve, reject) => {
      pdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      });
    });

    console.log("PDF generated successfully");

    const dataBuffer = Buffer.from(pdfBuffer);
    console.log("PDF Buffer created");
    return dataBuffer;
  }

  static async handleSendInvoiceProcess(data) {
    const { group: groupInfo, user } = data;
    const group = await GroupModel.findById(groupInfo._id);
    const buffer = await PaymentInvoiceService.generateInvoice(group, user);

    // Path to the EJS template
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "invoiceemail.ejs"
    );

    // Render the EJS template
    const htmlContent = await ejs.renderFile(templatePath, {
      user,
      group,
      totalAmount:
        group.subscriptionCost / group.members.length + group.handlingFee,
      currency: group.currency,
      paymentLink: group.paymentLink,
      logoUrl:
        "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1725966804/ShapePact_Logo_eltxdv.png",
      twitterLink: "https://twitter.com/Sharepact-Limited",
      instagramLink: "https://instagram.com/Sharepact-Limited",
      linkedinLink: "https://linkedin.com/in/Sharepact-Limited",
      twitterLogoUrl:
        "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1725968030/Twitter_Logo_469489_976_cp8cga.avif",
      instagramLogoUrl:
        "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1725968030/Instagram_Logo_2016.svg_ffskk2.webp",
      linkedinLogoUrl:
        "https://res.cloudinary.com/dvwmkgnzz/image/upload/v1725968030/Linkedin_Logo_caphbo.webp",
    });

    // Send email
    await sendEmailWithBrevo({
      subject: `${group.groupName} Invoice`,
      htmlContent, // Use rendered HTML content
      to: [{ email: user.email }],
      attachments: [{ name: "invoice.pdf", buffer }],
    });

    // Update group details after sending invoice
    await group.updateMemberPaymentActiveState(user._id, false);
    await group.updateMemberlastInvoiceSentAt(user._id, Date.now());
  }
}

module.exports = PaymentInvoiceService;
