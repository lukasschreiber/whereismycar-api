import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

export const sendEmail = async (email, code) =>{
  try {
    const smtpEndpoint = "puppis.uberspace.de";
    const port = 465;
    const senderAddress = "mailer@lukasschreiber.com";
    var toAddress = email;
    const smtpUsername = "mailer@lukasschreiber.com";
    const smtpPassword = "QtYdFUA6uJnZuxkB";
    var subject = "Verify your email";
    // The body of the email for recipients
    var body_html = `<!DOCTYPE> 
    <html>
      <body>
        <p>Your authentication code is : </p> <b>${code}</b>
      </body>
    </html>`;
    // Create the SMTP transport.
    let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: true, // true for 465, false for other ports
      auth: {
        user: smtpUsername,
        pass: smtpPassword,
      },
    });
    // Specify the fields in the email.
    let mailOptions = {
      from: senderAddress,
      to: toAddress,
      subject: subject,
      html: body_html,
    };
    await transporter.sendMail(mailOptions);
    return { error: false };
  } catch (error) {
    console.error("send-email-error", error);
    return {
      error: true,
      message: "Cannot send email",
    };
  }
}
