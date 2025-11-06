"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";

interface Sale {
  _id: string;
  kiwifyId: string;
  productName: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  status: string;
  amount: number;
  commission: number;
  createdAt: string;
  approvedAt?: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/kiwify/sales");
      const data = await response.json();
      setSales(data.sales || []);
    } catch (error) {
      console.error("Erro ao buscar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);

      // Sincroniza vendas dos últimos 30 dias
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await fetch("/api/kiwify/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao sincronizar vendas");
      }

      const data = await response.json();
      alert(data.message);
      fetchSales();
    } catch (error: any) {
      alert(error.message || "Erro ao sincronizar vendas");
    } finally {
      setSyncing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" }
    > = {
      paid: { label: "Pago", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      refused: { label: "Recusado", variant: "destructive" },
      refunded: { label: "Reembolsado", variant: "secondary" },
      chargeback: { label: "Chargeback", variant: "destructive" },
    };

    const config = statusMap[status] || {
      label: status,
      variant: "secondary" as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vendas</h2>
          <p className="text-muted-foreground">
            Acompanhe suas vendas da Kiwify
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : sales.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma venda encontrada
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clique em "Sincronizar" para importar suas vendas dos últimos 30
                dias
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Vendas ({sales.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sale.customer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {sale.customer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sale.productName}</TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(sale.amount)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatPrice(sale.commission)}
                    </TableCell>
                    <TableCell>{getStatusBadge(sale.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sale.approvedAt || sale.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
