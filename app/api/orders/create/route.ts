import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const CASHFREE_BASE_URL = "https://api.cashfree.com/pg";
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;

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

    // Generate unique order ID for Cashfree
    const orderId = `order_${Date.now()}_${session.user.id}`;

    // Create Cashfree order payload
    const cashfreeOrderData = {
      order_id: orderId,
      order_amount: listing.price,
      order_currency: listing.currency,
      customer_details: {
        customer_id: session.user.id,
        customer_name: session.user.name || "Customer",
        customer_email: session.user.email,
        customer_phone: "9999999999", // Default phone - you can collect this later
      },
      order_meta: {
        return_url: `${process.env.NEXTAUTH_URL}/payment/success?order_id=${orderId}`,
        notify_url: `${process.env.NEXTAUTH_URL}/api/cashfree/webhook`,
      },
      order_note: `Payment for ${listing.title}`,
    };

    // Create Cashfree order
    const cashfreeResponse = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify(cashfreeOrderData),
    });

    const cashfreeOrder = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      throw new Error(cashfreeOrder.message || "Failed to create Cashfree order");
    }

    // Save order to database
    const order = await prisma.order.create({
      data: {
        buyerId: session.user.id,
        sellerId: listing.ownerId,
        listingId: listing.id,
        amount: Math.round(listing.price * 100), // Store in paise for consistency
        currency: listing.currency,
        status: "created",
        razorpayOrderId: orderId, // Reusing this field for Cashfree order ID
      },
    });

    return NextResponse.json({
      order,
      cashfreeOrder: {
        order_id: cashfreeOrder.order_id,
        payment_session_id: cashfreeOrder.payment_session_id,
        order_status: cashfreeOrder.order_status,
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
