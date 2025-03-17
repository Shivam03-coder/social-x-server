import { appEnvConfigs } from "@src/configs";
import { SendInviteEmailOptions } from "@src/types/types";
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

  public static sendInviteEmail = async (options: SendInviteEmailOptions) => {
    const { emails, orgId, eventId, role = "MEMBER", invitationType } = options;

    if (!emails.length) {
      throw new Error("No emails provided");
    }

    try {
      for (const email of emails) {
        let inviteUrl = "";
        let subject = "";
        let title = "";
        let description = "";

        // --- Handle URLs and Messages based on invitation type ---
        if (invitationType === "ORGANIZATION") {
          if (!orgId)
            throw new Error(
              "Organization ID is required for organization invites"
            );

          inviteUrl = `http://localhost:3000/invite/organization/accept?email=${encodeURIComponent(
            email
          )}&orgId=${encodeURIComponent(orgId)}&role=${encodeURIComponent(
            role
          )}`;

          subject = "You're invited to join our organization!";
          title = "Join Our Organization!";
          description = `You've been invited to join our organization. Click below to accept your invitation.`;
        } else if (invitationType === "EVENT") {
          if (!eventId)
            throw new Error("Event ID is required for event invites");
          inviteUrl = `http://localhost:3000/invite/event/accept?email=${encodeURIComponent(
            email
          )}&eventId=${encodeURIComponent(eventId)}&role=${encodeURIComponent(
            role
          )}&orgId=${encodeURIComponent(orgId!)}`;

          subject = "You're invited to our event!";
          title = "Join Our Event!";
          description = `You've been invited to attend our event. Click below to accept your invitation.`;
        } else {
          throw new Error("Invalid invitation type");
        }

        const mailOptions = {
          from: `"Your Company Name" <${appEnvConfigs.AUTH_EMAIL}>`,
          to: email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>${title}</h2>
              <p>Hello,</p>
              <p>${description}</p>
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
        console.log(
          `✅ ${invitationType} invitation email sent to ${email}: ${info.messageId}`
        );
      }

      console.log(
        `✅ All ${invitationType} invitation emails sent successfully!`
      );
    } catch (error) {
      console.error(
        `❌ Error sending ${invitationType} invitation emails:`,
        error
      );
      throw new Error(`Failed to send ${invitationType} invitation emails`);
    }
  };
}

export default MailService;
