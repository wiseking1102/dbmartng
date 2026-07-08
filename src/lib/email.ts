/**
 * Resend email delivery service for DBMartNG.
 *
 * Sends transactional emails: notifications, billing receipts, admin alerts.
 * Uses Resend API — requires RESEND_API_KEY env var.
 * Falls back silently to console.log when not configured (dev mode).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API = "https://api.resend.com";

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface SendBatchParams {
  emails: { to: string; subject: string; html: string }[];
}

/**
 * Send a transactional email via Resend.
 * Falls back to console.log when RESEND_API_KEY is not set (dev mode).
 */
export async function sendEmail(params: EmailParams): Promise<{ success: boolean; id?: string }> {
  const from = params.from || "DBMartNG <noreply@dbmartng.com>";

  if (!RESEND_API_KEY) {
    console.log("[Email] No RESEND_API_KEY configured — dev mode:");
    console.log(`  To: ${Array.isArray(params.to) ? params.to.join(", ") : params.to}`);
    console.log(`  Subject: ${params.subject}`);
    return { success: true };
  }

  try {
    const response = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text || undefined,
        reply_to: params.replyTo || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Email] Failed to send:", data);
      return { success: false };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error("[Email] Send error:", err);
    return { success: false };
  }
}

/**
 * Send emails in batch (for bulk notifications).
 */
export async function sendBatchEmails(params: SendBatchParams): Promise<{ success: boolean; sent: number; failed: number }> {
  if (!RESEND_API_KEY) {
    console.log("[Email] No RESEND_API_KEY configured — dev mode (batch)");
    return { success: true, sent: params.emails.length, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    params.emails.map(async (email) => {
      const result = await sendEmail(email);
      if (result.success) sent++;
      else failed++;
    })
  );

  return { success: failed === 0, sent, failed };
}

/**
 * Pre-built email templates for transactional emails.
 */
export const emailTemplates = {
  welcomeBuyer(name: string) {
    return {
      subject: "Welcome to DBMartNG!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #0a1f3d;">Welcome, ${name}!</h1>
          <p style="color: #4a5568;">You're now part of the DBMartNG community. Browse verified Nigerian businesses and connect directly with vendors.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://dbmartng.com"}/browse" 
             style="display: inline-block; background: #c9952d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Start Browsing
          </a>
        </div>
      `,
    };
  },

  welcomeVendor(name: string) {
    return {
      subject: "Your DBMartNG Vendor Account is Ready!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #0a1f3d;">Welcome, ${name}!</h1>
          <p style="color: #4a5568;">Your vendor account is set up. Complete your profile and start listing your products or services.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://dbmartng.com"}/dashboard/vendor" 
             style="display: inline-block; background: #c9952d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Go to Dashboard
          </a>
        </div>
      `,
    };
  },

  listingApproved(businessName: string, listingTitle: string) {
    return {
      subject: `"${listingTitle}" is Now Live on DBMartNG!`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #0a1f3d;">Listing Approved ✓</h1>
          <p style="color: #4a5568;">Your listing <strong>"${listingTitle}"</strong> for <strong>${businessName}</strong> has been approved and is now visible to customers.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://dbmartng.com"}/dashboard/vendor/listings" 
             style="display: inline-block; background: #c9952d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            View My Listings
          </a>
        </div>
      `,
    };
  },

  listingRejected(businessName: string, listingTitle: string, reason: string) {
    return {
      subject: `"${listingTitle}" Was Not Approved`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #0a1f3d;">Listing Update</h1>
          <p style="color: #4a5568;">Your listing <strong>"${listingTitle}"</strong> for <strong>${businessName}</strong> was not approved.</p>
          <p style="color: #e53e3e; background: #fff5f5; padding: 12px; border-radius: 8px;">Reason: ${reason}</p>
          <p style="color: #4a5568;">Please update the listing and resubmit.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://dbmartng.com"}/dashboard/vendor/listings" 
             style="display: inline-block; background: #c9952d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Edit Listing
          </a>
        </div>
      `,
    };
  },

  subscriptionReceipt(businessName: string, amount: number, periodEnd: string) {
    return {
      subject: "Your DBMartNG Pro Subscription Receipt",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #0a1f3d;">Payment Confirmed ✓</h1>
          <p style="color: #4a5568;">Thank you, <strong>${businessName}</strong>! Your Pro subscription payment of <strong>₦${amount.toLocaleString()}</strong> has been received.</p>
          <p style="color: #4a5568;">Your subscription is active until <strong>${new Date(periodEnd).toLocaleDateString()}</strong>.</p>
        </div>
      `,
    };
  },

  paymentFailed(businessName: string) {
    return {
      subject: "Action Required: DBMartNG Payment Failed",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #e53e3e;">Payment Failed</h1>
          <p style="color: #4a5568;">Hi <strong>${businessName}</strong>, we were unable to process your recurring subscription payment.</p>
          <p style="color: #4a5568;">Paystack will retry automatically. Please ensure your payment method is valid.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://dbmartng.com"}/dashboard/vendor/billing" 
             style="display: inline-block; background: #c9952d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Update Billing
          </a>
        </div>
      `,
    };
  },

  newInquiry(vendorName: string, buyerName: string, message: string) {
    return {
      subject: `New Inquiry from ${buyerName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #0a1f3d;">New Customer Inquiry</h1>
          <p style="color: #4a5568;"><strong>${buyerName}</strong> sent you a message:</p>
          <blockquote style="border-left: 3px solid #c9952d; padding-left: 12px; color: #4a5568; margin: 12px 0;">${message}</blockquote>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://dbmartng.com"}/dashboard/vendor" 
             style="display: inline-block; background: #c9952d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            View Message
          </a>
        </div>
      `,
    };
  },

  adminAlert(title: string, detail: string) {
    return {
      subject: `[DBMartNG Alert] ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #e53e3e;">⚠️ Admin Alert</h1>
          <p style="color: #4a5568;"><strong>${title}</strong></p>
          <p style="color: #4a5568; background: #f7fafc; padding: 12px; border-radius: 8px;">${detail}</p>
        </div>
      `,
    };
  },
};
