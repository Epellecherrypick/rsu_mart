import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email, code) {
  const sender = process.env.PASSWORD_RESET_EMAIL;
  const appPassword = process.env.PASSWORD_RESET_EMAIL_APP_PASSWORD;
  if (!sender || !appPassword) {
    throw new Error("Configure PASSWORD_RESET_EMAIL and PASSWORD_RESET_EMAIL_APP_PASSWORD.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: sender, pass: appPassword.replace(/\s/g, "") },
  });

  await transporter.sendMail({
    from: `RSU Mart <${sender}>`,
    to: email,
    subject: "Your RSU Mart password reset code",
    text: `Your RSU Mart password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });
}
