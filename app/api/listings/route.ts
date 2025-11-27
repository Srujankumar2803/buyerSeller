import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import formidable from "formidable";
import { IncomingMessage } from "http";
import { Readable } from "stream";

// Helper to convert NextRequest to Node.js IncomingMessage for formidable
async function parseFormDataWithFormidable(req: NextRequest) {
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Create a readable stream from the buffer
  const readable = Readable.from(buffer);
  
  // Create a mock IncomingMessage for formidable
  const incomingMessage = readable as unknown as IncomingMessage;
  incomingMessage.headers = Object.fromEntries(req.headers.entries());
  
  const form = formidable({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  return new Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
  }>((resolve, reject) => {
    form.parse(incomingMessage, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// Helper to get field value
function getFieldValue(field: string | string[] | undefined): string {
  if (Array.isArray(field)) return field[0] || "";
  return field || "";
}

// GET /api/listings - List with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "12");
    const page = parseInt(searchParams.get("page") || "1");
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const city = searchParams.get("city") || "";
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const sortBy = searchParams.get("sort") || "newest";
    const owner = searchParams.get("owner") || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      isActive: boolean;
      ownerId?: string;
      OR?: Array<{ title?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }>;
      category?: string;
      city?: { contains: string; mode: 'insensitive' };
      price?: { gte?: number; lte?: number };
    } = {
      isActive: true,
    };

    // Filter by owner if requested
    if (owner === "me" && session?.user?.id) {
      where.ownerId = session.user.id;
    }

    // Search by title or description
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by city
    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    // Filter by price range
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price.gte = parseFloat(priceMin);
      if (priceMax) where.price.lte = parseFloat(priceMax);
    }

    // Determine sort order
    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sortBy === "price-asc") {
      orderBy = { price: "asc" };
    } else if (sortBy === "price-desc") {
      orderBy = { price: "desc" };
    } else if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "oldest") {
      orderBy = { createdAt: "asc" };
    }

    // Get total count for pagination
    const total = await prisma.listing.count({ where });

    // Get listings
    const listings = await prisma.listing.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        images: {
          select: {
            id: true,
            filename: true,
            mime: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      listings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// POST /api/listings - Create listing (SELLER only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SELLER") {
      return NextResponse.json(
        { error: "Only sellers can create listings" },
        { status: 403 }
      );
    }

    const { fields, files } = await parseFormDataWithFormidable(request);

    const title = getFieldValue(fields.title);
    const description = getFieldValue(fields.description);
    const priceStr = getFieldValue(fields.price);
    const category = getFieldValue(fields.category);
    const city = getFieldValue(fields.city);
    const latStr = getFieldValue(fields.lat);
    const lngStr = getFieldValue(fields.lng);

    // Validate required fields
    if (!title || !description || !priceStr || !category || !city) {
      return NextResponse.json(
        { error: "Title, description, price, category, and city are required" },
        { status: 400 }
      );
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    const lat = latStr ? parseFloat(latStr) : null;
    const lng = lngStr ? parseFloat(lngStr) : null;

    // Handle uploaded images
    const uploadedFiles = files.images
      ? Array.isArray(files.images)
        ? files.images
        : [files.images]
      : [];

    // Create listing with images in a transaction
    const listing = await prisma.$transaction(async (tx) => {
      // Create the listing
      const newListing = await tx.listing.create({
        data: {
          title,
          description,
          price,
          category,
          city,
          lat,
          lng,
          ownerId: session.user.id,
        },
      });

      // Create image records for each uploaded file
      const imagePromises = uploadedFiles.map(async (file) => {
        const fs = await import("fs/promises");
        const buffer = await fs.readFile(file.filepath);

        return tx.image.create({
          data: {
            filename: file.originalFilename || file.newFilename,
            mime: file.mimetype || "application/octet-stream",
            data: buffer,
            listingId: newListing.id,
          },
        });
      });

      const images = await Promise.all(imagePromises);

      return {
        ...newListing,
        images: images.map((img) => ({
          id: img.id,
          filename: img.filename,
          mime: img.mime,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
