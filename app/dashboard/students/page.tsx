"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, GraduationCap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface Student {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    products: {
        productId: string;
        productName: string;
        enrollmentDate: string;
        checkedIn: boolean;
        orderId: string;
    }[];
    totalPurchases: number;
    totalCheckins: number;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/kiwify/students");
            const data = await response.json();
            setStudents(data.students || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const filteredStudents = students.filter(student =>
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
                                    <TableHead>Total de Matrículas</TableHead>
                                    <TableHead>Check-ins</TableHead>
                                    <TableHead>Última Matrícula</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {student.email}
                                                </div>
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
                                                    <div key={idx} className="flex items-center gap-1">
                                                        <Badge variant="outline" className="w-fit">
                                                            {product.productName}
                                                        </Badge>
                                                        {product.checkedIn && (
                                                            <Badge variant="default" className="w-fit text-xs">
                                                                ✓
                                                            </Badge>
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
                                        <TableCell className="font-medium">
                                            {student.totalPurchases}
                                        </TableCell>
                                        <TableCell className="font-medium text-green-600">
                                            {student.totalCheckins} / {student.totalPurchases}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {student.products.length > 0
                                                ? formatDate(student.products[0].enrollmentDate)
                                                : "-"}
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
