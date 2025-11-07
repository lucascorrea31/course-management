import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Student from "@/models/Student";
import Sale from "@/models/Sale";
import User from "@/models/User";
import { getKiwifyClient } from "@/lib/kiwify";

/**
 * POST /api/sync/students
 * Sync students from Kiwify sales (scheduled job)
 *
 * This endpoint should be called by a cron job to automatically sync students
 * It fetches all sales for all products and creates/updates student records
 *
 * Authentication options:
 * 1. User session (for manual trigger from dashboard)
 * 2. API key (for scheduled cron jobs)
 */
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        // Check authentication - either user session or API key
        const session = await auth();
        const apiKey = request.headers.get("x-api-key");

        let userId: string | null = null;

        if (session?.user?.id) {
            // User is logged in - sync only their students
            userId = session.user.id;
        } else if (apiKey && apiKey === process.env.SYNC_API_KEY) {
            // Valid API key - sync for specific user or all users
            const body = await request.json().catch(() => ({}));
            userId = body.userId || null;
        } else {
            return NextResponse.json({ error: "Unauthorized. Provide valid session or API key." }, { status: 401 });
        }

        const syncResults = {
            studentsCreated: 0,
            studentsUpdated: 0,
            salesProcessed: 0,
            errors: [] as string[],
            details: [] as string[],
        };

        // Get users to sync
        const usersToSync = userId ? await User.find({ _id: userId }) : await User.find({});

        for (const user of usersToSync) {
            try {
                console.log(`\n🔄 Syncing students for user: ${user.email}`);

                // Get all products for this user
                const products = await Product.find({ userId: user._id });

                if (products.length === 0) {
                    syncResults.details.push(`User ${user.email} has no products`);
                    continue;
                }

                console.log(`📦 Found ${products.length} products for user ${user.email}`);

                // Get sales from last 7 days for each product
                const endDate = new Date();
                const startDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                startDate.setDate(startDate.getDate() - 7);

                const kiwify = getKiwifyClient();

                for (const product of products) {
                    try {
                        console.log(`  📊 Fetching sales for product: ${product.name}`);

                        const response = await kiwify.getSales({
                            start_date: startDate.toISOString().split("T")[0],
                            end_date: endDate.toISOString().split("T")[0],
                            product_id: product.kiwifyId,
                        });

                        const sales = response.data || [];
                        console.log(`  ✅ Found ${sales.length} sales for ${product.name}`);

                        for (const sale of sales) {
                            try {
                                // Only process paid sales
                                if (sale.status !== "paid") {
                                    continue;
                                }

                                syncResults.salesProcessed++;

                                // Find or create student
                                let student = await Student.findOne({
                                    email: sale.customer.email.toLowerCase().trim(),
                                    userId: user._id,
                                });

                                const studentData = {
                                    userId: user._id,
                                    kiwifyCustomerId: sale.customer.id,
                                    name: sale.customer.name,
                                    email: sale.customer.email.toLowerCase().trim(),
                                    phone: sale.customer.mobile,
                                    cpf: sale.customer.cpf,
                                    cnpj: sale.customer.cnpj,
                                    instagram: sale.customer.instagram,
                                    country: sale.customer.country,
                                    address: sale.customer.address
                                        ? {
                                              street: sale.customer.address.street,
                                              number: sale.customer.address.number,
                                              complement: sale.customer.address.complement,
                                              neighborhood: sale.customer.address.neighborhood,
                                              city: sale.customer.address.city,
                                              state: sale.customer.address.state,
                                              zipcode: sale.customer.address.zipcode,
                                          }
                                        : undefined,
                                    isActive: true,
                                    lastSyncAt: new Date(),
                                };

                                const productEnrollment = {
                                    productId: product._id as any,
                                    productName: product.name,
                                    enrolledAt: new Date(sale.created_at),
                                    status: "active" as const,
                                    saleId: sale.id,
                                    saleReference: sale.reference,
                                    paymentMethod: sale.payment_method,
                                    amount: sale.net_amount,
                                };

                                if (student) {
                                    // Update existing student
                                    const productExists = student.products.some(
                                        (p) =>
                                            p.saleId === sale.id ||
                                            (p.productId.toString() === String(product._id) &&
                                                p.enrolledAt.getTime() === new Date(sale.created_at).getTime())
                                    );

                                    if (!productExists) {
                                        // Add new product enrollment
                                        student.products.push(productEnrollment);
                                    } else {
                                        // Update existing enrollment
                                        const productIndex = student.products.findIndex(
                                            (p) =>
                                                p.saleId === sale.id ||
                                                (p.productId.toString() === String(product._id) &&
                                                    p.enrolledAt.getTime() === new Date(sale.created_at).getTime())
                                        );
                                        if (productIndex !== -1) {
                                            student.products[productIndex] = {
                                                ...student.products[productIndex],
                                                ...productEnrollment,
                                            };
                                        }
                                    }

                                    // Update student data
                                    Object.assign(student, studentData);
                                    await student.save();

                                    syncResults.studentsUpdated++;
                                    syncResults.details.push(
                                        `Updated student ${student.name} for product ${product.name}`
                                    );
                                } else {
                                    // Create new student
                                    student = await Student.create({
                                        ...studentData,
                                        products: [productEnrollment],
                                        telegram: {
                                            status: "pending",
                                        },
                                    });

                                    syncResults.studentsCreated++;
                                    syncResults.details.push(
                                        `Created student ${student.name} for product ${product.name}`
                                    );
                                }

                                // Also update/create Sale record
                                await Sale.findOneAndUpdate(
                                    { kiwifyId: sale.id },
                                    {
                                        kiwifyId: sale.id,
                                        productId: product._id as any,
                                        productName: product.name,
                                        customer: {
                                            name: sale.customer.name,
                                            email: sale.customer.email,
                                            phone: sale.customer.mobile,
                                        },
                                        status: "paid",
                                        amount: sale.net_amount || 0,
                                        netAmount: sale.net_amount,
                                        commission: 0,
                                        paymentMethod: sale.payment_method,
                                        userId: user._id as any,
                                        approvedAt: new Date(sale.updated_at),
                                    },
                                    { upsert: true, new: true }
                                );
                            } catch (error) {
                                const errorMsg = `Error processing sale ${sale.id}: ${
                                    error instanceof Error ? error.message : String(error)
                                }`;
                                console.error(`  ❌ ${errorMsg}`);
                                syncResults.errors.push(errorMsg);
                            }
                        }
                    } catch (error) {
                        const errorMsg = `Error fetching sales for product ${product.name}: ${
                            error instanceof Error ? error.message : String(error)
                        }`;
                        console.error(`  ❌ ${errorMsg}`);
                        syncResults.errors.push(errorMsg);
                    }
                }
            } catch (error) {
                const errorMsg = `Error syncing user ${user.email}: ${
                    error instanceof Error ? error.message : String(error)
                }`;
                console.error(`❌ ${errorMsg}`);
                syncResults.errors.push(errorMsg);
            }
        }

        console.log("\n✅ Sync completed!");
        console.log(`📊 Results:
  - Students created: ${syncResults.studentsCreated}
  - Students updated: ${syncResults.studentsUpdated}
  - Sales processed: ${syncResults.salesProcessed}
  - Errors: ${syncResults.errors.length}
`);

        return NextResponse.json({
            success: true,
            message: `Sync completed. Created ${syncResults.studentsCreated} students, updated ${syncResults.studentsUpdated} students, processed ${syncResults.salesProcessed} sales.`,
            results: syncResults,
        });
    } catch (error: unknown) {
        console.error("Error in sync students:", error);
        return NextResponse.json(
            {
                error: "Error syncing students",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/sync/students
 * Get sync status and last sync time
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Get last sync time from students
        const lastSync = await Student.findOne({ userId: session.user.id })
            .sort({ lastSyncAt: -1 })
            .select("lastSyncAt");

        // Get counts
        const totalStudents = await Student.countDocuments({ userId: session.user.id });
        const activeStudents = await Student.countDocuments({ userId: session.user.id, isActive: true });

        return NextResponse.json({
            success: true,
            lastSyncAt: lastSync?.lastSyncAt,
            totalStudents,
            activeStudents,
        });
    } catch (error: unknown) {
        console.error("Error getting sync status:", error);
        return NextResponse.json(
            {
                error: "Error getting sync status",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
