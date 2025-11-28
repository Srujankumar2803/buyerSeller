import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    
    // Verify webhook signature if secret is configured
    if (process.env.CASHFREE_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.CASHFREE_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");
      
      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body);
    
    console.log("Cashfree webhook event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "PAYMENT_SUCCESS":
        await handlePaymentSuccess(event.data);
        break;
      case "PAYMENT_FAILED":
        await handlePaymentFailed(event.data);
        break;
      case "PAYMENT_USER_DROPPED":
        await handlePaymentDropped(event.data);
        break;
      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handlePaymentSuccess(data: any) {
  try {
    const { order_id } = data.order;
    
    // Find order by Cashfree order ID
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: order_id }, // Reusing this field for Cashfree order ID
    });

    if (!order) {
      console.error("Order not found:", order_id);
      return;
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        razorpayPaymentId: data.payment.cf_payment_id,
      },
    });

    console.log("Payment successful for order:", order_id);
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

async function handlePaymentFailed(data: any) {
  try {
    const { order_id } = data.order;
    
    // Find order by Cashfree order ID
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: order_id },
    });

    if (!order) {
      console.error("Order not found:", order_id);
      return;
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        razorpayPaymentId: data.payment?.cf_payment_id || null,
      },
    });

    console.log("Payment failed for order:", order_id);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

async function handlePaymentDropped(data: any) {
  try {
    const { order_id } = data.order;
    
    // Find order by Cashfree order ID
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: order_id },
    });

    if (!order) {
      console.error("Order not found:", order_id);
      return;
    }

    // Update order status to failed (user dropped the payment)
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
      },
    });

    console.log("Payment dropped for order:", order_id);
  } catch (error) {
    console.error("Error handling payment drop:", error);
  }
}