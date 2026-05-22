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

  adminForgotPasswordEmail = async (token, emailAddress) => {
    const forgotLink = process.env.ADMIN_FORGOT_PASS;
    const loginLink = process.env.ADMIN_LOGIN;

    const html = generateHTML({
      emailTitle: "Reset your admin account password",
      emailSubTitle: "Tap the button below to reset your account password.",
      btnText: "Reset Password",
      btnLink: forgotLink + token,
      belowText: "You can login from here:",
      belowLink: loginLink,
      footerNote: `You are receiving this email because a request to reset the password for your ${process.env.APP_NAME} admin account has been initiated. If you did not initiate this action, please disregard this message.`
    });
    await sendEmail({
      email: emailAddress,
      subject: `${process.env.APP_NAME} reset admin account password`,
      html: html
    });
  };

  userVerificationEmail = async (code, emailAddress) => {

    const html = generateHTML({
      emailTitle: "Verify Your user Account",
      emailSubTitle: "Use the code below to verify your email address.",
      btnText: code,
      footerNote: `You received this email because you have registered on ${process.env.APP_NAME}. If you did not initiate this action, please ignore this email.`,
    });
    await sendEmail({
      email: emailAddress,
      subject: `${process.env.APP_NAME} account verification`,
      html: html
    });
  };

  doctorVerificationEmail = async (token, emailAddress) => {
    const doctorUrl =  process.env.DOCTOR_URL;
    const verifyLink =  process.env.DOCTOR_VERIFY ;
    const loginLink =  process.env.DOCTOR_LOGIN ;

    const html = generateHTML({
      link: doctorUrl,
      emailTitle: "Verify Your Doctor Account",
      emailSubTitle: "Tap the button below to verify your email address.",
      btnText: "Verify Account",
      btnLink: verifyLink + token,
      belowText: "You can login from here:",
      belowLink: loginLink,
      footerNote: `You received this email because you were added as a doctor on ${process.env.APP_NAME}. If you did not initiate this action, please ignore this email.`,
      footerLink: process.env.APP_NAME
    });
    await sendEmail({
      email: emailAddress,
      subject: `${process.env.APP_NAME} doctor account verification`,
      html: html
    });
  };
}

module.exports = new EmailController();
