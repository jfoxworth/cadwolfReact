import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@cadwolf.com";

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your CadWolf email address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111;">Verify your email</h2>
        <p style="color:#555;margin:0 0 24px;">Click below to confirm your CadWolf account. This link expires in 24 hours.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px;margin:24px 0 0;">
          If you didn't create a CadWolf account, you can ignore this email.<br>
          <a href="${verifyUrl}" style="color:#888;">${verifyUrl}</a>
        </p>
      </div>
    `,
  });
}

export async function sendTeamInviteEmail(to: string, inviteUrl: string, teamName: string, role: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${teamName} on CadWolf`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111;">Team invitation</h2>
        <p style="color:#555;margin:0 0 24px;">
          You've been invited to join <strong>${teamName}</strong> as a <strong>${role}</strong>.
          Click below to accept. This link expires in 7 days.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:13px;margin:24px 0 0;">
          If you didn't expect this, you can safely ignore this email.<br>
          <a href="${inviteUrl}" style="color:#888;">${inviteUrl}</a>
        </p>
      </div>
    `,
  });
}

export async function sendEmailChangeEmail(to: string, confirmUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Confirm your new CadWolf email address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111;">Confirm your new email</h2>
        <p style="color:#555;margin:0 0 24px;">Click below to confirm this as your new CadWolf email address. This link expires in 1 hour.</p>
        <a href="${confirmUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
          Confirm Email Change
        </a>
        <p style="color:#888;font-size:13px;margin:24px 0 0;">
          If you didn't request this, you can safely ignore this email.<br>
          <a href="${confirmUrl}" style="color:#888;">${confirmUrl}</a>
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your CadWolf password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111;">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;margin:24px 0 0;">
          If you didn't request this, you can safely ignore this email.<br>
          <a href="${resetUrl}" style="color:#888;">${resetUrl}</a>
        </p>
      </div>
    `,
  });
}
