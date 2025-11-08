import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp } from "lucide-react";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Sale from "@/models/Sale";
import mongoose from "mongoose";

export default async function KiwifyDashboardPage() {
  const session = await auth();

  // Fetch real data from database
  await dbConnect();

  // Convert to ObjectId for proper MongoDB query
  const userObjectId = session?.user?.id ? new mongoose.Types.ObjectId(session.user.id) : null;

  const productsCount = userObjectId ? await Product.countDocuments({ userId: userObjectId }) : 0;

  const salesThisMonth = userObjectId ? await Sale.find({
    userId: userObjectId,
    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
  }) : [];

  const totalSalesCount = salesThisMonth.length;

  const totalRevenue = salesThisMonth
    .filter(sale => sale.status === "paid")
    .reduce((sum, sale) => sum + sale.amount, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Dashboard Kiwify
          </h2>
          <p className="text-muted-foreground">
            Visão geral dos seus produtos e vendas da Kiwify
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Produtos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productsCount}</div>
              <p className="text-xs text-muted-foreground">
                {productsCount === 0 ? "Sincronize seus produtos da Kiwify" : "Produtos ativos"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Vendas
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSalesCount}</div>
              <p className="text-xs text-muted-foreground">
                Vendas este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Receita total este mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Primeiros Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Para começar a usar o sistema:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Vá para a página de Produtos e sincronize seus produtos da Kiwify</li>
              <li>Configure o webhook da Kiwify para receber vendas em tempo real</li>
              <li>Acompanhe suas vendas na página de Vendas</li>
            </ol>
          </CardContent>
        </Card>
      </div>
  );
}
