"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Product {
    _id: string;
    name: string;
    description?: string;
    price: number;
    status: string;
    kiwifyId: string;
    lastSyncAt: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/kiwify/products");
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch("/api/kiwify/products", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Erro ao sincronizar produtos");
            }

            const data = await response.json();
            toast.success("Produtos sincronizados!", {
                description: data.message,
            });
            fetchProducts();
        } catch (error: unknown) {
            let errorMessage = "Erro ao sincronizar produtos";

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === "string") {
                errorMessage = error;
            }

            toast.error("Erro ao sincronizar", {
                description: errorMessage,
            });
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Produtos</h2>
                    <p className="text-muted-foreground">Gerencie seus produtos da Kiwify</p>
                </div>
                <Button
                    onClick={handleSync}
                    disabled={syncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
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
            ) : products.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Package className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Clique em &quot;Sincronizar&quot; para importar seus produtos da Kiwify
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Produtos ({products.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Última Sinc.</TableHead>
                                    <TableHead>ID Kiwify</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product._id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div>{product.name}</div>
                                                {product.description && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {product.description.substring(0, 60)}
                                                        {product.description.length > 60 && "..."}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatPrice(product.price)}</TableCell>
                                        <TableCell>
                                            <Badge variant={product.status === "active" ? "default" : "secondary"}>
                                                {product.status === "active" ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(product.lastSyncAt)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{product.kiwifyId}</TableCell>
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
