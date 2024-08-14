import nodemailer from "nodemailer";
import Mailgen from "mailgen";
import env from "../utils/validateEnv.js";

const sendEmail = async ({ from, to, subject, text, username, link, btnText, instructions }) => {
  let mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "FOOTSY",
      link: "https://mailgen.js",
    },
  });

  var email = {
    body: {
      name: username,
      intro: text,
      action: {
        instructions:
          instructions || "To get started with Footsy, please click here:",
        button: {
          color: "#3182CE",
          text: btnText || "Visit",
          link: link || "https://mailgen.js",
        },
      },
      outro: "Need help, or have questions? Reply to this email",
    },
  };

  var emailBody = mailGenerator.generate(email);
  try {
    let mailOptions = {
      from,
      to,
      subject,
      html: emailBody,
    };
    const transporter = nodemailer.createTransport({
      host: env.BREVO_MAIL_HOST,
      port: env.BREVO_MAIL_PORT,
      auth: {
        user: env.BREVO_MAIL_LOGIN,
        pass: env.BREVO_MAIL_APIKEY,
      },
    });
    await transporter.sendMail(mailOptions);
    return { success: true, msg: "Email sent successfully" };
  } catch (error) {
    console.log(error);
    return { success: false, msg: "Failed to send email" };
  }
};

export default sendEmail;
