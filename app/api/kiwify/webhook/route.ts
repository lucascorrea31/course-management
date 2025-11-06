import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import User from "@/models/User";

/**
 * Webhook para receber eventos da Kiwify
 *
 * Eventos suportados:
 * - sale.approved: Venda aprovada
 * - sale.refused: Venda recusada
 * - sale.refunded: Venda reembolsada
 * - sale.chargeback: Chargeback
 * - subscription.canceled: Assinatura cancelada
 *
 * Configure este endpoint na Kiwify:
 * https://seu-dominio.com/api/kiwify/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Webhook Kiwify recebido:", JSON.stringify(body, null, 2));

    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json(
        { error: "Payload inválido" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Processa diferentes tipos de eventos
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
        console.log(`Evento não tratado: ${event}`);
    }

    return NextResponse.json({ success: true, message: "Webhook processado" });
  } catch (error: any) {
    console.error("Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}

async function handleSaleEvent(event: string, data: any) {
  try {
    // Encontra o produto local
    const product = await Product.findOne({ kiwifyId: data.product_id });

    // Determina o status baseado no evento
    let status: "paid" | "refused" | "refunded" | "chargeback" | "pending" = "pending";
    if (event === "sale.approved") status = "paid";
    else if (event === "sale.refused") status = "refused";
    else if (event === "sale.refunded") status = "refunded";
    else if (event === "sale.chargeback") status = "chargeback";

    // Atualiza ou cria a venda
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

    console.log(`Venda ${data.id} processada com status: ${status}`);
  } catch (error) {
    console.error("Erro ao processar evento de venda:", error);
    throw error;
  }
}

async function handleSubscriptionEvent(event: string, data: any) {
  try {
    console.log(`Assinatura ${data.id} cancelada`);

    // TODO: Implementar lógica para assinaturas
    // Pode criar um modelo Subscription se necessário
  } catch (error) {
    console.error("Erro ao processar evento de assinatura:", error);
    throw error;
  }
}
