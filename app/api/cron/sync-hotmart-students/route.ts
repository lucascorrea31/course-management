import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Student from "@/models/Student";
import Product from "@/models/Product";
import { fetchHotmartSubscriptions } from "@/lib/hotmart";

/**
 * POST /api/cron/sync-hotmart-students
 * Cronjob to sync Hotmart students for all users
 * Requires SYNC_API_KEY for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const authHeader = request.headers.get("authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get all users
    const users = await User.find({});
    const results = [];

    for (const user of users) {
      try {
        // Fetch all subscriptions from Hotmart
        const subscriptions = await fetchHotmartSubscriptions();

        let created = 0;
        let updated = 0;

        for (const subscription of subscriptions) {
          try {
            const subscriber = subscription.subscriber;

            // Find or get product
            const product = await Product.findOne({
              hotmartId: String(subscription.product.id),
              userId: user._id,
            });

            if (!product) {
              continue;
            }

            // Find existing student
            const existingStudent = await Student.findOne({
              hotmartSubscriberId: String(subscription.subscriber_id),
              userId: user._id,
            });

            const studentData = {
              userId: user._id,
              platform: "hotmart" as const,
              hotmartSubscriberId: String(subscription.subscriber_id),
              name: subscriber.name,
              email: subscriber.email,
              phone: subscriber.phone_local_code && subscriber.phone_number
                ? `+${subscriber.phone_local_code}${subscriber.phone_number}`
                : undefined,
              cpf: subscriber.cpf,
              address: subscriber.address ? {
                street: subscriber.address.address,
                number: subscriber.address.number,
                complement: subscriber.address.complement,
                neighborhood: subscriber.address.neighborhood,
                city: subscriber.address.city,
                state: subscriber.address.state,
                zipcode: subscriber.address.zip_code,
              } : undefined,
              isActive: subscription.status === "ACTIVE",
              lastSyncAt: new Date(),
            };

            if (existingStudent) {
              // Update existing student
              Object.assign(existingStudent, studentData);

              // Update or add product enrollment
              const productIndex = existingStudent.products.findIndex(
                (p) => p.productId.toString() === product._id.toString()
              );

              if (productIndex >= 0) {
                existingStudent.products[productIndex].status =
                  subscription.status === "ACTIVE" ? "active" : "expired";
                existingStudent.products[productIndex].enrolledAt = new Date(subscription.date_created * 1000);
              } else {
                existingStudent.products.push({
                  productId: product._id,
                  productName: subscription.product.name,
                  enrolledAt: new Date(subscription.date_created * 1000),
                  status: subscription.status === "ACTIVE" ? "active" : "expired",
                });
              }

              await existingStudent.save();
              updated++;
            } else {
              // Create new student
              await Student.create({
                ...studentData,
                products: [
                  {
                    productId: product._id,
                    productName: subscription.product.name,
                    enrolledAt: new Date(subscription.date_created * 1000),
                    status: subscription.status === "ACTIVE" ? "active" : "expired",
                  },
                ],
              });
              created++;
            }
          } catch (studentError) {
            console.error(
              `Error syncing student ${subscription.subscriber_id} for user ${user._id}:`,
              studentError
            );
          }
        }

        results.push({
          userId: user._id,
          email: user.email,
          success: true,
          stats: {
            total: subscriptions.length,
            created,
            updated,
          },
        });
      } catch (userError) {
        results.push({
          userId: user._id,
          email: user.email,
          success: false,
          error: userError instanceof Error ? userError.message : String(userError),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced Hotmart students for ${users.length} users`,
      results,
    });
  } catch (error: unknown) {
    console.error("Error in Hotmart students cronjob:", error);
    return NextResponse.json(
      {
        error: "Error syncing students",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
