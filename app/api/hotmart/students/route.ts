import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Student from "@/models/Student";
import Product from "@/models/Product";
import { fetchHotmartSubscriptions } from "@/lib/hotmart";

/**
 * GET /api/hotmart/students
 * Get all Hotmart students for the logged-in user
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const students = await Student.find({
      userId: session.user.id,
      platform: "hotmart",
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error: unknown) {
    console.error("Error fetching Hotmart students:", error);
    return NextResponse.json(
      {
        error: "Error fetching students",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hotmart/students
 * Sync students from Hotmart API
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

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
          userId: session.user.id,
        });

        if (!product) {
          console.error(`Product not found for Hotmart ID: ${subscription.product.id}`);
          continue;
        }

        // Find existing student
        const existingStudent = await Student.findOne({
          hotmartSubscriberId: String(subscription.subscriber_id),
          userId: session.user.id,
        });

        const studentData = {
          userId: session.user.id,
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
          `Error syncing student ${subscription.subscriber_id}:`,
          studentError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${subscriptions.length} students (${created} created, ${updated} updated)`,
      stats: {
        total: subscriptions.length,
        created,
        updated,
      },
    });
  } catch (error: unknown) {
    console.error("Error syncing Hotmart students:", error);
    return NextResponse.json(
      {
        error: "Error syncing students",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
