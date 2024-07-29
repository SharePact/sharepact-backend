const brevo = require("@getbrevo/brevo");

exports.sendEmailWithBrevo = ({ subject, htmlContent, to, attachments }) => {
  let apiInstance = new brevo.TransactionalEmailsApi();

  let apiKey = apiInstance.authentications["apiKey"];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  let sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  sendSmtpEmail.sender = {
    name: process.env?.BREVO_SENDER_NAME,
    email: process.env?.BREVO_SENDER_EMAIL,
  };
  sendSmtpEmail.to = to;

  if (attachments && attachments.length > 0) {
    sendSmtpEmail.attachment = attachments.map((attachment) => ({
      name: attachment.name,
      content: attachment.buffer.toString("base64"),
    }));
  }

  apiInstance.sendTransacEmail(sendSmtpEmail).then(
    function (data) {},
    function (error) {
      console.error(error);
    }
  );
};

// sendEmailWithBrevo({
//   subject: "My subject",
//   htmlContent:
//     "<html><body><h1>Common: This is my first transactional email {{params.parameter}}</h1></body></html>",
//   to: [{ email: "chigozie@collaction.org", name: "Gregory" }],
// });
