import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await request.json();

    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    // Get listing details
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (!listing.isActive) {
      return NextResponse.json(
        { error: "Listing is not active" },
        { status: 400 }
      );
    }

    // Prevent buying own listing
    if (listing.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot buy your own listing" },
        { status: 400 }
      );
    }

    // Generate unique order ID 
    const orderId = `order_${Date.now()}_${session.user.id}`;

    // Your UPI ID where payments will be received
    const merchantUpiId = process.env.MERCHANT_UPI_ID || "your-upi-id@paytm"; // Add this to .env
    
    // Generate UPI payment URL
    const upiUrl = `upi://pay?pa=${merchantUpiId}&pn=Neighbourhood%20Marketplace&tr=${orderId}&am=${listing.price}&cu=${listing.currency}&tn=Payment%20for%20${encodeURIComponent(listing.title)}`;
    
    // Generate QR code data (same UPI URL)
    const qrCodeData = upiUrl;

    // Save order to database
    const order = await prisma.order.create({
      data: {
        buyerId: session.user.id,
        sellerId: listing.ownerId,
        listingId: listing.id,
        amount: Math.round(listing.price * 100), // Store in paise for consistency
        currency: listing.currency,
        status: "pending", // Pending UPI payment
        razorpayOrderId: orderId, // Using this field for order ID
      },
    });

    return NextResponse.json({
      order,
      paymentInfo: {
        orderId: orderId,
        amount: listing.price,
        currency: listing.currency,
        upiUrl: upiUrl,
        qrCodeData: qrCodeData,
        merchantUpiId: merchantUpiId,
      },
      listing: {
        title: listing.title,
        price: listing.price,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
