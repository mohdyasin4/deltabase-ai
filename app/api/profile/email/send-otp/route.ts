import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
import { otpStore, generateOTP, isValidEmail } from '@/lib/otpStore';
import { emailService } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { newEmail } = body;

    // Validate input
    if (!newEmail) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }    // Validate email format
    if (!isValidEmail(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

    // Store OTP
    otpStore.set(userId, {
      code: otpCode,
      email: newEmail,
      expiresAt
    });    // Send OTP via email using the email service
    const emailResult = await emailService.sendEmail({
      to: newEmail,
      subject: "Verify Your New Email Address - DeltaBase",
      html: emailService.generateOTPEmailTemplate(otpCode, newEmail)
    });
    
    if (!emailResult.success) {
      // Remove OTP from store if email failed
      otpStore.delete(userId);
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your new email address",
      data: {
        email: newEmail,
        expiresAt: new Date(expiresAt).toISOString(),
        // Don't send the actual OTP in the response for security
      }
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
