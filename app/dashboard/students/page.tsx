"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    RefreshCw,
    GraduationCap,
    Search,
    UserPlus,
    UserMinus,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface Student {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    isActive: boolean;
    telegram: {
        status: "pending" | "active" | "removed" | "failed";
        userId?: number;
        username?: string;
        addedAt?: string;
        removedAt?: string;
    };
    products: {
        productId: string;
        productName: string;
        enrolledAt: string;
        status: "active" | "expired" | "refunded";
    }[];
    lastSyncAt?: string;
    createdAt: string;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/students");
            const data = await response.json();
            setStudents(data.students || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const handleAddToTelegram = async (studentEmail: string) => {
        try {
            setActionLoading(studentEmail);
            const response = await fetch("/api/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "add", studentEmail }),
            });

            const data = await response.json();

            if (data.success && data.inviteLink) {
                // Try to copy to clipboard
                let copied = false;
                try {
                    await navigator.clipboard.writeText(data.inviteLink);
                    copied = true;
                } catch (clipboardError) {
                    console.warn("Could not copy to clipboard:", clipboardError);
                }

                // Show alert with or without clipboard confirmation
                alert(
                    `Link de convite gerado para o aluno!\n\nEnvie este link:\n${data.inviteLink}${
                        copied ? "\n\n✅ Link copiado para a área de transferência" : ""
                    }`
                );
                await fetchStudents();
            } else {
                alert(`Erro ao gerar link: ${data.error || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error adding to Telegram:", error);
            alert("Erro ao adicionar aluno ao Telegram");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveFromTelegram = async (studentEmail: string, telegramUserId?: number) => {
        if (!telegramUserId) {
            alert("Aluno não possui Telegram vinculado");
            return;
        }

        if (!confirm("Tem certeza que deseja remover este aluno do grupo?")) {
            return;
        }

        try {
            setActionLoading(studentEmail);
            const response = await fetch("/api/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "remove",
                    studentEmail,
                    telegramUserId,
                    reason: "Removido manualmente pelo administrador",
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert("Aluno removido do grupo com sucesso!");
                await fetchStudents();
            } else {
                alert(`Erro ao remover aluno: ${data.error || "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Error removing from Telegram:", error);
            alert("Erro ao remover aluno do Telegram");
        } finally {
            setActionLoading(null);
        }
    };

    const getTelegramStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return (
                    <Badge
                        variant="default"
                        className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                    </Badge>
                );
            case "pending":
                return (
                    <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                    </Badge>
                );
            case "removed":
                return (
                    <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Removido
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Erro
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                    </Badge>
                );
        }
    };

    const filteredStudents = students.filter(
        (student) =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Alunos</h2>
                    <p className="text-muted-foreground">Lista de participantes dos seus cursos</p>
                </div>
                <Button
                    onClick={fetchStudents}
                    disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Carregando..." : "Atualizar"}
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            ) : filteredStudents.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {searchTerm
                                    ? "Tente buscar com outros termos"
                                    : "Seus alunos aparecerão aqui quando realizarem compras"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Alunos ({filteredStudents.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Aluno</TableHead>
                                    <TableHead>Produtos</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Telegram</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-xs text-muted-foreground">{student.email}</div>
                                                {student.phone && (
                                                    <div className="text-xs text-muted-foreground">
                                                        📞 {student.phone}
                                                    </div>
                                                )}
                                                {student.cpf && (
                                                    <div className="text-xs text-muted-foreground">
                                                        CPF: {student.cpf}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {student.products.slice(0, 2).map((product, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-1">
                                                        <Badge
                                                            variant={
                                                                product.status === "active" ? "default" : "outline"
                                                            }
                                                            className="w-fit">
                                                            {product.productName}
                                                        </Badge>
                                                        {product.status !== "active" && (
                                                            <span className="text-xs text-muted-foreground">
                                                                ({product.status})
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {student.products.length > 2 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        +{student.products.length - 2} mais
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {student.isActive ? (
                                                <Badge
                                                    variant="default"
                                                    className="bg-green-500">
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Inativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {getTelegramStatusBadge(student.telegram.status)}
                                                {student.telegram.username && (
                                                    <span className="text-xs text-muted-foreground">
                                                        @{student.telegram.username}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {student.telegram.status !== "active" && student.isActive && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleAddToTelegram(student.email)}
                                                        disabled={actionLoading === student.email}>
                                                        <UserPlus className="h-4 w-4 mr-1" />
                                                        {actionLoading === student.email ? "..." : "Adicionar"}
                                                    </Button>
                                                )}
                                                {student.telegram.status === "active" && student.telegram.userId && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            handleRemoveFromTelegram(
                                                                student.email,
                                                                student.telegram.userId
                                                            )
                                                        }
                                                        disabled={actionLoading === student.email}>
                                                        <UserMinus className="h-4 w-4 mr-1" />
                                                        {actionLoading === student.email ? "..." : "Remover"}
                                                    </Button>
                                                )}
                                            </div>
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
