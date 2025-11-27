import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Helper to convert NextRequest to Node.js IncomingMessage
async function parseFormData(req: NextRequest) {
  const formData = await req.formData();
  const fields: Record<string, string> = {};
  let avatarFile: { filename: string; mime: string; data: Buffer } | null = null;

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      if (key === "avatar") {
        const arrayBuffer = await value.arrayBuffer();
        avatarFile = {
          filename: value.name,
          mime: value.type,
          data: Buffer.from(arrayBuffer),
        };
      }
    } else {
      fields[key] = value;
    }
  }

  return { fields, avatarFile };
}

export async function POST(request: NextRequest) {
  try {
    const { fields, avatarFile } = await parseFormData(request);
    const { name, email, password, role } = fields;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (role && role !== "BUYER" && role !== "SELLER") {
      return NextResponse.json(
        { error: "Role must be BUYER or SELLER" },
        { status: 400 }
      );
    }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // Validate email domain (prevent fake emails like test@example.com)
  const domain = email.split('@')[1].toLowerCase();
  const invalidDomains = ['example.com', 'test.com', 'localhost', 'temp.com', 'fake.com'];
  if (invalidDomains.includes(domain)) {
    return NextResponse.json(
      { error: "Please use a valid email address from a real email provider (Gmail, Outlook, etc.)" },
      { status: 400 }
    );
  }

  // Check if domain has valid MX records (basic check)
  if (!domain.includes('.') || domain.endsWith('.local')) {
    return NextResponse.json(
      { error: "Please use a valid email address from a real email provider" },
      { status: 400 }
    );
  }    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create avatar image if uploaded
    let avatarImageId: string | undefined;
    if (avatarFile) {
      const image = await prisma.image.create({
        data: {
          filename: avatarFile.filename,
          mime: avatarFile.mime,
          data: Buffer.from(avatarFile.data),
        },
      });
      avatarImageId = image.id;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role === "SELLER" ? "SELLER" : "BUYER",
        avatarImageId: avatarImageId || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
