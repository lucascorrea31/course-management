import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import { getKiwifyClient } from "@/lib/kiwify";

type SaleStatus = "paid" | "pending" | "refused" | "refunded" | "chargeback";

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

        // Log request parameters
        console.log("Fetching sales from Kiwify with params:", { start_date, end_date });

        const response = await kiwify.getSales({
            start_date,
            end_date,
        });

        // Log full response for debugging
        console.log("Kiwify API Response:", JSON.stringify(response, null, 2));

        // Validate response structure
        if (!response || typeof response !== "object") {
            console.error("Invalid response from Kiwify API:", response);
            return NextResponse.json(
                {
                    error: "Invalid response from Kiwify API",
                    details: "Response is not an object",
                    response: response,
                },
                { status: 500 }
            );
        }

        // Kiwify API returns data in "data" field
        const kiwifySales = response.data || [];

        // Validate that sales is an array
        if (!Array.isArray(kiwifySales)) {
            console.error("Kiwify sales is not an array:", kiwifySales);
            return NextResponse.json(
                {
                    error: "kiwifySales is not iterable",
                    details: `Expected array, got ${typeof kiwifySales}`,
                    receivedData: kiwifySales,
                    fullResponse: response,
                },
                { status: 500 }
            );
        }

        // If sales array is empty
        if (kiwifySales.length === 0) {
            console.log("No sales found for the given period");
            return NextResponse.json({
                message: "No sales found for the given period",
                sales: [],
            });
        }

        const syncedSales = [];

        for (const kSale of kiwifySales) {
            // Find corresponding local product
            const product = await Product.findOne({
                kiwifyId: kSale.product.id,
                userId: session.user.id,
            });

            // Map status from Kiwify to our internal status
            let mappedStatus: SaleStatus = "pending";
            if (kSale.status === "paid" || kSale.status === "approved") {
                mappedStatus = "paid";
            } else if (kSale.status === "refunded") {
                mappedStatus = "refunded";
            } else if (kSale.status === "canceled" || kSale.status === "refused") {
                mappedStatus = "refused";
            } else if (kSale.status === "chargeback") {
                mappedStatus = "chargeback";
            }

            const sale = await Sale.findOneAndUpdate(
                { kiwifyId: kSale.id },
                {
                    kiwifyId: kSale.id,
                    productId: product?._id,
                    productName: kSale.product.name,
                    customer: {
                        name: kSale.customer.name,
                        email: kSale.customer.email,
                        phone: kSale.customer.mobile,
                    },
                    status: mappedStatus,
                    amount: kSale.net_amount || 0, // Use net_amount as the main amount
                    netAmount: kSale.net_amount,
                    commission: 0, // Commission not provided in this endpoint
                    paymentMethod: kSale.payment_method,
                    installments: undefined, // Installments not in this response
                    userId: session.user.id,
                    approvedAt: kSale.status === "paid" ? new Date(kSale.updated_at) : undefined,
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
