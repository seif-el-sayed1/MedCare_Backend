const sendEmail = require("../utils/sendEmail");
const generateHTML = require("../utils/generateHTML");
class EmailController {
  adminVerificationEmail = async (token, emailAddress) => {
    const adminUrl =  process.env.ADMIN_URL;
    const verifyLink =  process.env.ADMIN_VERIFY ;
    const loginLink =  process.env.ADMIN_LOGIN ;

    const html = generateHTML({
      link: adminUrl,
      emailTitle: "Verify Your Admin Account",
      emailSubTitle: "Tap the button below to verify your email address.",
      btnText: "Verify Account",
      btnLink: verifyLink + token,
      belowText: "You can login from here:",
      belowLink: loginLink,
      footerNote: `You received this email because you were added as an admin on ${process.env.APP_NAME}. If you did not initiate this action, please ignore this email.`,
      footerLink: process.env.APP_NAME
    });
    await sendEmail({
      email: emailAddress,
      subject: `${process.env.APP_NAME} admin account verification`,
      html: html
    });
  };

}

module.exports = new EmailController();
