import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 3; // Max 3 requests per window

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate email domain (prevent fake emails like test@example.com)
    const domain = email.split('@')[1].toLowerCase();
    const invalidDomains = ['example.com', 'test.com', 'localhost', 'temp.com', 'fake.com', 'domain.com'];
    if (invalidDomains.includes(domain) || !domain.includes('.') || domain.endsWith('.local')) {
      return NextResponse.json(
        { error: "Please use a valid email address from a real email provider (Gmail, Outlook, etc.)" },
        { status: 400 }
      );
    }

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists or not (security best practice)
    // Always return success message
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Delete any existing password reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate random token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Hash the token for storage
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Set expiry to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store the hashed token in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: token, // Store plain token for URL (we'll also verify hash)
        tokenHash,
        expiresAt,
      },
    });

    // Send email with reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&id=${user.id}`;
    
    if (!process.env.SENDGRID_API_KEY) {
      console.log("SendGrid not configured. Reset link:", resetLink);
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
        // For development only - remove in production
        ...(process.env.NODE_ENV === "development" && { resetLink }),
      });
    }

    const msg = {
      to: user.email!,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@yourapp.com",
      subject: "Password Reset Request",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Password Reset</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${user.name || "there"},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: white; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px;">${resetLink}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${user.name || "there"},

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      `,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error("SendGrid error:", error);
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
