import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getKiwifyClient } from "@/lib/kiwify";
import mongoose from "mongoose";

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

        console.log("GET Products - User ID:", session.user.id);

        // Convert to ObjectId for proper comparison
        const userObjectId = new mongoose.Types.ObjectId(session.user.id);

        // Try to find all products first to debug
        const allProducts = await Product.find({});
        console.log("Total products in DB:", allProducts.length);
        if (allProducts.length > 0) {
            console.log("Sample product userId:", allProducts[0].userId, "Type:", typeof allProducts[0].userId);
        }

        const products = await Product.find({
            userId: userObjectId,
            platform: "kiwify"
        }).sort({
            createdAt: -1,
        });

        console.log("Products found for user:", products.length);

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

        console.log("POST Products - User ID:", session.user.id, "Type:", typeof session.user.id);

        // Convert to ObjectId for proper storage
        const userObjectId = new mongoose.Types.ObjectId(session.user.id);

        const kiwify = getKiwifyClient();
        const response = await kiwify.getProducts();

        // Handle different possible response formats
        const kiwifyProducts = response?.products || (response as any)?.data || [];

        if (!Array.isArray(kiwifyProducts)) {
            console.error("Unexpected response format:", response);
            throw new Error(`Unexpected API response format: ${JSON.stringify(response)}`);
        }

        const syncedProducts = [];

        for (const kProduct of kiwifyProducts) {
            const product = await Product.findOneAndUpdate(
                { kiwifyId: kProduct.id },
                {
                    platform: "kiwify",
                    kiwifyId: kProduct.id,
                    name: kProduct.name,
                    description: kProduct.description,
                    price: kProduct.price,
                    status: kProduct.status === "active" ? "active" : "inactive",
                    imageUrl: kProduct.image_url,
                    userId: userObjectId,
                    lastSyncAt: new Date(),
                },
                { upsert: true, new: true }
            );

            console.log("Saved product:", product.name, "with userId:", product.userId);
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
