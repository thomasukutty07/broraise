import sgMail from '@sendgrid/mail';
import User from '@/models/User';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Check if user has email notifications enabled for a specific type
 */
export async function shouldSendEmail(
  userId: string,
  notificationType: 'newComplaint' | 'statusUpdate' | 'comment' | 'assignment' | 'reminder'
): Promise<boolean> {
  try {
    const user = await User.findById(userId).select('emailNotifications');
    if (!user) {
      return false;
    }

    // Default to true if emailNotifications is not set (backward compatibility)
    if (!user.emailNotifications) {
      return true;
    }

    const prefs = user.emailNotifications;
    switch (notificationType) {
      case 'newComplaint':
        return prefs.newComplaint ?? true;
      case 'statusUpdate':
        return prefs.statusUpdate ?? true;
      case 'comment':
        return prefs.comment ?? true;
      case 'assignment':
        return prefs.assignment ?? true;
      case 'reminder':
        return prefs.reminder ?? true;
      default:
        return true;
    }
  } catch (error) {
    
    // Default to true on error to ensure notifications are sent
    return true;
  }
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

  if (!to || !to.trim()) {
    
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
    
  } catch (error: any) {
    
    // Don't throw - email failures shouldn't break the main flow
    if (error.response) {
      
    }
  }
}

/**
 * Send email with preference check
 */
export async function sendEmailIfEnabled(
  userId: string,
  notificationType: 'newComplaint' | 'statusUpdate' | 'comment' | 'assignment' | 'reminder',
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  const enabled = await shouldSendEmail(userId, notificationType);
  if (!enabled) {
    
    return;
  }

  await sendEmail(to, subject, html, text);
}

export function getReminderEmailTemplate(
  complaintTitle: string,
  complaintId: string,
  reminderMessage: string
): { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const complaintUrl = `${baseUrl}/complaints/${complaintId}`;

  return {
    subject: `Reminder: ${complaintTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reminder: Action Required</h2>
        <p>This is a reminder for the complaint "<strong>${complaintTitle}</strong>".</p>
        <p><strong>Reminder:</strong> ${reminderMessage}</p>
        <p>Complaint ID: <strong>${complaintId}</strong></p>
        <p>Please take the necessary action on this complaint.</p>
        <a href="${complaintUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Complaint</a>
      </div>
    `,
  };
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

