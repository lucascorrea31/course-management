import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getKiwifyClient } from "@/lib/kiwify";

/**
 * GET - Lista produtos do banco de dados local
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await dbConnect();

    const products = await Product.find({ userId: session.user.id }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Erro ao buscar produtos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 }
    );
  }
}

/**
 * POST - Sincroniza produtos da Kiwify
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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
      message: `${syncedProducts.length} produtos sincronizados com sucesso`,
      products: syncedProducts,
    });
  } catch (error: any) {
    console.error("Erro ao sincronizar produtos:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao sincronizar produtos" },
      { status: 500 }
    );
  }
}
