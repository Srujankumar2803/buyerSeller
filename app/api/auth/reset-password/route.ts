import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, token, password } = body;

    // Validate inputs
    if (!id || !token || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Hash the incoming token to match against stored hash
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find the password reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: id,
        tokenHash: tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: id },
      data: { passwordHash },
    });

    // Delete the used reset token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Delete all other reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: id },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
