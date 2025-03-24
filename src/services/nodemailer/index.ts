import { appEnvConfigs } from "@src/configs";
import { SendInviteEmailOptions } from "@src/types/types";
import nodemailer, { Transporter } from "nodemailer";

class MailService {
  private static transporter: Transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smpt.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: appEnvConfigs.AUTH_EMAIL,
      pass: appEnvConfigs.AUTH_PASS,
    },
  });

  private static generateInviteUrl({
    role,
    orgId,
    eventId,
  }: {
    role: string;
    orgId?: string;
    eventId?: string;
  }): string {
    const baseUrl = "http://localhost:3000/invite";

    const queryParams = new URLSearchParams();

    if (orgId) queryParams.append("orgId", orgId);
    if (eventId) queryParams.append("eventId", eventId);
    queryParams.append("role", role);

    return `${baseUrl}?${queryParams.toString()}`;
  }

  private static getEmailContent(invitationType: "ORGANIZATION" | "EVENT") {
    if (invitationType === "ORGANIZATION") {
      return {
        subject: "You're invited to join our organization!",
        title: "Join Our Organization!",
        description:
          "You've been invited to join our organization. Click below to accept your invitation.",
      };
    }

    if (invitationType === "EVENT") {
      return {
        subject: "You're invited to our event!",
        title: "Join Our Event!",
        description:
          "You've been invited to attend our event. Click below to accept your invitation.",
      };
    }

    throw new Error("Invalid invitation type");
  }

  private static buildEmailTemplate(
    title: string,
    description: string,
    inviteUrl: string
  ): string {
    return `
      <div style="
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        background: #fafafa;
        color: #262626;
        padding: 40px 20px;
        text-align: center;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          overflow: hidden;
          border: 1px solid #dbdbdb;
        ">
          <div style="background: linear-gradient(90deg, #f58529, #dd2a7b, #8134af, #515bd4); height: 6px;"></div>

          <div style="padding: 40px 30px;">
            <img src="https://i.ibb.co/NjYrddW/social-x-logo.png" alt="Social-X Logo" style="width: 80px; margin-bottom: 20px;" />

            <h2 style="
              color: #262626;
              margin-bottom: 16px;
              font-size: 24px;
            ">
              ${title}
            </h2>

            <p style="
              color: #8e8e8e;
              font-size: 16px;
              line-height: 1.5;
              margin-bottom: 30px;
            ">
              ${description}
            </p>

            <a href="${inviteUrl}" style="
              background: linear-gradient(90deg, #f58529, #dd2a7b, #8134af, #515bd4);
              color: #ffffff;
              padding: 14px 24px;
              font-size: 16px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              display: inline-block;
              transition: background 0.3s ease;
            ">
              Accept Invitation
            </a>

            <p style="
              color: #8e8e8e;
              font-size: 12px;
              margin-top: 30px;
            ">
              If you didn’t expect this invitation, you can safely ignore this email.
            </p>
          </div>

          <div style="
            background: #fafafa;
            padding: 20px;
            font-size: 12px;
            color: #8e8e8e;
            border-top: 1px solid #dbdbdb;
          ">
            © ${new Date().getFullYear()} Social-X. All rights reserved.
          </div>
        </div>
      </div>
    `;
  }

  public static async sendInviteEmail(options: {
    email: string;
    orgId: string;
    eventId: string;
    role?: string;
  }) {
    const { email, orgId, eventId, role = "MEMBER" } = options;

    try {
      const subject = "You're invited!";
      const title = "Join Us";
      const description =
        "You've been invited to join our platform. Click below to get started.";

      const inviteUrl = this.generateInviteUrl({
        role,
        orgId,
        eventId,
      });

      const mailOptions = {
        from: `"Social-X" <${appEnvConfigs.AUTH_EMAIL}>`,
        to: email,
        subject,
        html: this.buildEmailTemplate(title, description, inviteUrl),
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Invitation email sent to ${email}: ${info.messageId}`);
    } catch (error) {
      console.error(`❌ Error sending invitation email to ${email}:`, error);
      throw new Error(`Failed to send invitation email to ${email}`);
    }
  }
}

export default MailService;
