import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import { getKiwifyClient } from "@/lib/kiwify";

type SaleStatus = "approved" | "pending" | "canceled" | "refunded";

/**
 * GET - List sales from local database
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");

        await dbConnect();

        const query: { userId: string; status?: string } = { userId: session.user.id };
        if (status) {
            query.status = status;
        }

        const sales = await Sale.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("productId");

        const total = await Sale.countDocuments(query);

        return NextResponse.json({
            sales,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (error: unknown) {
        console.error("Error fetching sales:", error);
        return NextResponse.json({ error: "Error fetching sales" }, { status: 500 });
    }
}

/**
 * POST - Sync sales from Kiwify
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { start_date, end_date } = body;

        await dbConnect();

        const kiwify = getKiwifyClient();
        const { sales: kiwifySales } = await kiwify.getSales({
            start_date,
            end_date,
        });

        const syncedSales = [];

        for (const kSale of kiwifySales) {
            // Find corresponding local product
            const product = await Product.findOne({
                kiwifyId: kSale.product_id,
                userId: session.user.id,
            });

            const sale = await Sale.findOneAndUpdate(
                { kiwifyId: kSale.id },
                {
                    kiwifyId: kSale.id,
                    productId: product?._id,
                    productName: kSale.product_name,
                    customer: {
                        name: kSale.customer.name,
                        email: kSale.customer.email,
                        phone: kSale.customer.phone,
                    },
                    status: kSale.status as SaleStatus,
                    amount: kSale.amount,
                    commission: kSale.commission,
                    userId: session.user.id,
                    approvedAt: kSale.approved_at ? new Date(kSale.approved_at) : undefined,
                },
                { upsert: true, new: true }
            );

            syncedSales.push(sale);
        }

        return NextResponse.json({
            message: `${syncedSales.length} sales synced successfully`,
            sales: syncedSales,
        });
    } catch (error: unknown) {
        console.error("Error syncing sales:", error);

        let errorMessage = "";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === "string") {
            errorMessage = error;
        }

        return NextResponse.json({ error: errorMessage || "Error syncing sales" }, { status: 500 });
    }
}
