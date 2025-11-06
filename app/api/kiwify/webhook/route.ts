import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import User from "@/models/User";

/**
 * Webhook to receive Kiwify events
 *
 * Supported events:
 * - sale.approved: Sale approved
 * - sale.refused: Sale refused
 * - sale.refunded: Sale refunded
 * - sale.chargeback: Chargeback
 * - subscription.canceled: Subscription canceled
 *
 * Configure this endpoint in Kiwify:
 * https://your-domain.com/api/kiwify/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Kiwify webhook received:", JSON.stringify(body, null, 2));

    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Process different event types
    switch (event) {
      case "sale.approved":
      case "sale.refused":
      case "sale.refunded":
      case "sale.chargeback":
        await handleSaleEvent(event, data);
        break;

      case "subscription.canceled":
        await handleSubscriptionEvent(event, data);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

async function handleSaleEvent(event: string, data: any) {
  try {
    // Find local product
    const product = await Product.findOne({ kiwifyId: data.product_id });

    // Determine status based on event
    let status: "paid" | "refused" | "refunded" | "chargeback" | "pending" = "pending";
    if (event === "sale.approved") status = "paid";
    else if (event === "sale.refused") status = "refused";
    else if (event === "sale.refunded") status = "refunded";
    else if (event === "sale.chargeback") status = "chargeback";

    // Update or create sale
    await Sale.findOneAndUpdate(
      { kiwifyId: data.id },
      {
        kiwifyId: data.id,
        productId: product?._id,
        productName: data.product_name,
        customer: {
          name: data.customer?.name || "N/A",
          email: data.customer?.email || "N/A",
          phone: data.customer?.phone,
        },
        status,
        amount: data.amount || 0,
        commission: data.commission || 0,
        userId: product?.userId,
        approvedAt: status === "paid" ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    console.log(`Sale ${data.id} processed with status: ${status}`);
  } catch (error) {
    console.error("Error processing sale event:", error);
    throw error;
  }
}

async function handleSubscriptionEvent(event: string, data: any) {
  try {
    console.log(`Subscription ${data.id} canceled`);

    // TODO: Implement subscription logic
    // Can create a Subscription model if needed
  } catch (error) {
    console.error("Error processing subscription event:", error);
    throw error;
  }
}
