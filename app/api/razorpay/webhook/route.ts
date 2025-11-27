import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature (if webhook secret is configured)
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    }

    const event = JSON.parse(body);

    console.log("Webhook event:", event.event);

    // Handle different webhook events
    switch (event.event) {
      case "payment.authorized":
      case "payment.captured":
        await handlePaymentSuccess(event.payload.payment.entity);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case "order.paid":
        await handleOrderPaid(event.payload.order.entity);
        break;

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(payment: any) {
  try {
    // Find order by razorpay order ID
    const order = await prisma.order.findFirst({
      where: {
        razorpayOrderId: payment.order_id,
      },
    });

    if (!order) {
      console.error("Order not found for payment:", payment.id);
      return;
    }

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        razorpayPaymentId: payment.id,
      },
    });

    console.log(`Order ${order.id} marked as paid`);
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        razorpayOrderId: payment.order_id,
      },
    });

    if (!order) {
      console.error("Order not found for failed payment:", payment.id);
      return;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        razorpayPaymentId: payment.id,
      },
    });

    console.log(`Order ${order.id} marked as failed`);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

async function handleOrderPaid(order: any) {
  try {
    const dbOrder = await prisma.order.findFirst({
      where: {
        razorpayOrderId: order.id,
      },
    });

    if (!dbOrder) {
      console.error("Order not found:", order.id);
      return;
    }

    await prisma.order.update({
      where: { id: dbOrder.id },
      data: {
        status: "paid",
      },
    });

    console.log(`Order ${dbOrder.id} confirmed via order.paid webhook`);
  } catch (error) {
    console.error("Error handling order paid:", error);
  }
}
