"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Package, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Product {
    _id: string;
    hotmartId: string;
    name: string;
    status: "active" | "inactive";
    lastSyncAt: string;
    createdAt: string;
}

export default function HotmartProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/hotmart/products");
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
            toast.error("Erro ao carregar produtos");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch("/api/hotmart/products", {
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

    const handleTestConnection = async () => {
        try {
            setTesting(true);
            const response = await fetch("/api/hotmart/products", {
                method: "PUT",
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Conexão testada com sucesso!", {
                    description: `Encontrados ${data.productsCount} produtos na Hotmart`,
                });
            } else {
                toast.error("Erro na conexão", {
                    description: data.message,
                });
            }
        } catch (error) {
            toast.error("Erro ao testar conexão", {
                description: "Verifique suas credenciais da Hotmart",
            });
        } finally {
            setTesting(false);
        }
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
        return status === "active" ? (
            <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativo
            </Badge>
        ) : (
            <Badge variant="secondary">Inativo</Badge>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Produtos Hotmart</h2>
                    <p className="text-muted-foreground">Gerencie seus produtos da Hotmart</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleTestConnection}
                        disabled={testing}
                        variant="outline">
                        <CheckCircle className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} />
                        {testing ? "Testando..." : "Testar Conexão"}
                    </Button>
                    <Button
                        onClick={handleSync}
                        disabled={syncing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Sincronizando..." : "Sincronizar"}
                    </Button>
                </div>
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
                                Clique em &quot;Sincronizar&quot; para importar seus produtos da Hotmart
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Certifique-se de ter configurado as variáveis de ambiente HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET
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
                                    <TableHead>ID</TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Última Sincronização</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product._id}>
                                        <TableCell className="font-mono text-xs">
                                            {product.hotmartId}
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(product.lastSyncAt)}
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
