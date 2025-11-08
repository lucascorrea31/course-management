"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  isActive: boolean;
  products: Array<{
    productName: string;
    enrolledAt: string;
    status: string;
  }>;
  lastSyncAt?: string;
  createdAt: string;
}

export default function HotmartStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/hotmart/students");
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
      } else {
        toast.error("Erro ao buscar alunos", {
          description: data.error || "Tente novamente",
        });
      }
    } catch (error) {
      toast.error("Erro ao buscar alunos", {
        description: "Verifique sua conexão e tente novamente",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/hotmart/students", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Alunos sincronizados!", {
          description: data.message,
        });
        await fetchStudents();
      } else {
        toast.error("Erro ao sincronizar alunos", {
          description: data.details || data.error,
        });
      }
    } catch (error) {
      toast.error("Erro ao sincronizar alunos", {
        description: "Verifique sua conexão e tente novamente",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alunos Hotmart</h1>
          <p className="text-muted-foreground">
            Gerencie os alunos dos seus produtos Hotmart
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos Inativos</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => !s.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>
            Alunos sincronizados da plataforma Hotmart
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum aluno encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Clique em &quot;Sincronizar&quot; para buscar alunos da Hotmart
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        {student.cpf && (
                          <div className="text-sm text-muted-foreground">
                            CPF: {student.cpf}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {student.email}
                          </div>
                          {student.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {student.products.map((product, idx) => (
                            <div key={idx} className="text-sm">
                              <div>{product.productName}</div>
                              <Badge
                                variant={
                                  product.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {product.status === "active" ? "Ativo" : "Expirado"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.isActive ? "default" : "secondary"}
                        >
                          {student.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(student.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
