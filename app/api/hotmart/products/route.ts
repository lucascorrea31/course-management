import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { fetchHotmartProducts, testHotmartConnection } from "@/lib/hotmart";

/**
 * GET /api/hotmart/products
 * Get all Hotmart products for the logged-in user
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const products = await Product.find({
            userId: session.user.id,
            platform: "hotmart",
        }).sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            products,
        });
    } catch (error: unknown) {
        console.error("Error fetching Hotmart products:", error);
        return NextResponse.json(
            {
                error: "Error fetching products",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/hotmart/products
 * Sync products from Hotmart API
 */
export async function POST(_request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Fetch products from Hotmart
        const hotmartProducts = await fetchHotmartProducts();

        let created = 0;
        let updated = 0;

        for (const hotmartProduct of hotmartProducts) {
            try {
                // Find existing product or create new one
                const existingProduct = await Product.findOne({
                    hotmartId: String(hotmartProduct.id),
                    userId: session.user.id,
                });

                if (existingProduct) {
                    // Update existing product
                    existingProduct.name = hotmartProduct.name;
                    existingProduct.status = hotmartProduct.status === "ACTIVE" ? "active" : "inactive";
                    existingProduct.lastSyncAt = new Date();

                    await existingProduct.save();
                    updated++;
                } else {
                    // Create new product
                    await Product.create({
                        platform: "hotmart",
                        hotmartId: String(hotmartProduct.id),
                        name: hotmartProduct.name,
                        price: 0, // Hotmart doesn't provide price in products list
                        status: hotmartProduct.status === "ACTIVE" ? "active" : "inactive",
                        userId: session.user.id,
                        lastSyncAt: new Date(),
                    });
                    created++;
                }
            } catch (productError) {
                console.error(`Error syncing product ${hotmartProduct.id}:`, productError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${hotmartProducts.length} products (${created} created, ${updated} updated)`,
            stats: {
                total: hotmartProducts.length,
                created,
                updated,
            },
        });
    } catch (error: unknown) {
        console.error("Error syncing Hotmart products:", error);
        return NextResponse.json(
            {
                error: "Error syncing products",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/hotmart/products
 * Test Hotmart API connection
 */
export async function PUT() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await testHotmartConnection();
        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Error testing Hotmart connection:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
