import { appEnvConfigs } from "@src/configs";
import nodemailer from "nodemailer";

class MailService {
  private static transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smpt.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: appEnvConfigs.AUTH_EMAIL,
      pass: appEnvConfigs.AUTH_PASS,
    },
  });

  public static sendEmail = async (
    emails: string[],
    orgId: string,
    role: "MEMBER" | "CLIENT"
  ) => {
    if (!emails.length) {
      throw new Error("No emails provided");
    }

    try {
      for (const email of emails) {
        const inviteUrl = `http://localhost:3000/invite/accept?email=${encodeURIComponent(
          email
        )}&orgId=${encodeURIComponent(orgId)}&role=${encodeURIComponent(role)}`;

        const mailOptions = {
          from: `"Your Company Name" <${appEnvConfigs.AUTH_EMAIL}>`,
          to: email,
          subject: "You're invited to join our organization!",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Invitation to Join!</h2>
              <p>Hello,</p>
              <p>You've been invited to join our organization. Click the button below to accept your invitation:</p>
              <a href="${inviteUrl}" style="
                background: #6b46c1;
                color: white;
                padding: 10px 15px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
              ">Accept Invitation</a>
              <p>If you didn't expect this invitation, you can ignore this email.</p>
            </div>
          `,
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Invitation email sent to ${email}: ${info.messageId}`);
      }

      console.log("✅ All invitation emails sent successfully!");
    } catch (error) {
      console.error("❌ Error sending invitation emails:", error);
      throw new Error("Failed to send invitation emails");
    }
  };
}

export default MailService;
