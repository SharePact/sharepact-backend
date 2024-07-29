const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const NotificationModel = require("../models/Notifications");
const { sendEmailWithBrevo } = require("./brevo");
const processQueueManager = require("../processQueue");

class NotificationService {
  constructor() {
    this.templatesDir = path.join(__dirname, "../templates"); // Adjust the path if needed
    // (async () => {
    //   await processQueueManager.initProcessQueue(this.processHandlers);
    //   this.processQueue = processQueueManager.getProcessQueue();
    // })();
  }

  static async sendNotification({ type, userId, ...params }) {
    const templatesDir = path.join(__dirname, "../templates");
    const processQueue = processQueueManager.getProcessQueue();
    this.processQueue = processQueue;
    this.templatesDir = templatesDir;

    const templates = {
      welcome: "welcome.ejs",
      emailVerification: "emailVerification.ejs",
      passwordReset: "passwordReset.ejs",
      loginAlert: "loginAlert.ejs",
      passwordChangeAlert: "passwordChangeAlert.ejs",
      emailVerificationSuccessful: "emailVerificationSuccessful.js",
    };

    const templateFile = templates[type];
    if (!templateFile) {
      throw new Error("Notification type is not recognized.");
    }

    const htmlContent = await this.renderTemplate(
      templatesDir,
      templateFile,
      params
    );
    const subject = this.getSubject(type);

    const emailData = {
      event: "notificationEvent",
      type: type,
      subject,
      htmlContent,
      userId,
      to: [],
      textContent: params.textContent || "",
      handler: this.handleNotificationProcess,
    };

    for (const to of params.to) {
      emailData.to.push({ email: to });
    }

    await this.processQueue.add(emailData);
  }

  static async renderTemplate(templatesDir, templateFile, data) {
    const templatePath = path.join(templatesDir, templateFile);
    const template = fs.readFileSync(templatePath, "utf-8");
    return ejs.render(template, data);
  }

  static getSubject(type) {
    const subjects = {
      welcome: "Welcome to Our Service!",
      emailVerification: "Email Verification Code",
      passwordReset: "Password Reset Request",
      loginAlert: "Login Notification",
      passwordChangeAlert: "Password Change Notification",
      emailVerificationSuccessful: "Email Verified Successfully",
    };
    return subjects[type] || "";
  }

  static async handleNotificationProcess(data) {
    const { subject, htmlContent, to, userId, textContent, type } = data;

    if (!["emailVerification", "passwordReset"].includes(type)) {
      await NotificationModel.createNotification({
        subject,
        textContent,
        htmlContent,
        userId,
      });
    }

    sendEmailWithBrevo({ subject, htmlContent, to });
  }
}

module.exports = NotificationService;
