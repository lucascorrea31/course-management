import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getKiwifyClient } from "@/lib/kiwify";

/**
 * GET - List products from local database
 */
export async function GET(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const products = await Product.find({ userId: session.user.id }).sort({
            createdAt: -1,
        });

        return NextResponse.json({ products });
    } catch (error: unknown) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ error: "Error fetching products" }, { status: 500 });
    }
}

/**
 * POST - Sync products from Kiwify
 */
export async function POST(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const kiwify = getKiwifyClient();
        const { products: kiwifyProducts } = await kiwify.getProducts();

        const syncedProducts = [];

        for (const kProduct of kiwifyProducts) {
            const product = await Product.findOneAndUpdate(
                { kiwifyId: kProduct.id },
                {
                    kiwifyId: kProduct.id,
                    name: kProduct.name,
                    description: kProduct.description,
                    price: kProduct.price,
                    status: kProduct.status === "active" ? "active" : "inactive",
                    imageUrl: kProduct.image_url,
                    userId: session.user.id,
                    lastSyncAt: new Date(),
                },
                { upsert: true, new: true }
            );

            syncedProducts.push(product);
        }

        return NextResponse.json({
            message: `${syncedProducts.length} products synced successfully`,
            products: syncedProducts,
        });
    } catch (error: unknown) {
        console.error("Error syncing products:", error);

        let errorMessage = "Error syncing products";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === "string") {
            errorMessage = error;
        }

        return NextResponse.json({ error: errorMessage || "Error syncing products" }, { status: 500 });
    }
}
