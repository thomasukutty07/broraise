import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    return;
  }

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@brototype.com',
      subject,
      text: text || subject,
      html,
    });
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}

export function getComplaintEmailTemplate(
  type: 'submitted' | 'assigned' | 'updated' | 'resolved',
  complaintTitle: string,
  complaintId: string,
  additionalInfo?: string
): { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const complaintUrl = `${baseUrl}/complaints/${complaintId}`;

  const templates = {
    submitted: {
      subject: `Complaint Submitted: ${complaintTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Complaint Submitted Successfully</h2>
          <p>Your complaint "<strong>${complaintTitle}</strong>" has been submitted and is now being reviewed.</p>
          <p>Complaint ID: <strong>${complaintId}</strong></p>
          <p>You can track the status of your complaint at any time.</p>
          <a href="${complaintUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Complaint</a>
        </div>
      `,
    },
    assigned: {
      subject: `New Complaint Assigned: ${complaintTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Complaint Assigned</h2>
          <p>A new complaint "<strong>${complaintTitle}</strong>" has been assigned to you.</p>
          <p>Complaint ID: <strong>${complaintId}</strong></p>
          ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
          <a href="${complaintUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Complaint</a>
        </div>
      `,
    },
    updated: {
      subject: `Complaint Updated: ${complaintTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Complaint Status Updated</h2>
          <p>The complaint "<strong>${complaintTitle}</strong>" has been updated.</p>
          <p>Complaint ID: <strong>${complaintId}</strong></p>
          ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
          <a href="${complaintUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Complaint</a>
        </div>
      `,
    },
    resolved: {
      subject: `Complaint Resolved: ${complaintTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Complaint Resolved</h2>
          <p>Your complaint "<strong>${complaintTitle}</strong>" has been resolved.</p>
          <p>Complaint ID: <strong>${complaintId}</strong></p>
          ${additionalInfo ? `<p>Resolution: ${additionalInfo}</p>` : ''}
          <p>Please provide your feedback on how we handled your complaint.</p>
          <a href="${complaintUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View & Rate</a>
        </div>
      `,
    },
  };

  return templates[type];
}

