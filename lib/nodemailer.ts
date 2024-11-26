import nodemailer from "nodemailer";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_MAIL_CLIENT_ID;
const CLEINT_SECRET = process.env.GOOGLE_MAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_MAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_MAIL_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLEINT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GOOGLE_MAIL_USER,
        clientId: CLIENT_ID,
        clientSecret: CLEINT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken as string,
      },
    });

    const mailOptions = {
      from: `Dabbahwala - ${process.env.GOOGLE_MAIL_USER}`,
      to,
      subject,
      html,
    };

    await transport.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    return error;
  }
}

export { sendEmail };



