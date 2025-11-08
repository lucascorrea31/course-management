import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  const integrations = [
    {
      id: "kiwify",
      name: "Kiwify",
      description: "Gerencie seus produtos, vendas e alunos da Kiwify",
      status: "active",
      href: "/dashboard/kiwify",
      icon: "🥝",
      features: [
        "Sincronização de produtos",
        "Gerenciamento de vendas",
        "Controle de alunos",
        "Integração com Telegram",
      ],
    },
    {
      id: "hotmart",
      name: "Hotmart",
      description: "Gerencie seus produtos e vendas da Hotmart",
      status: "active",
      href: "/dashboard/hotmart",
      icon: "🔥",
      features: [
        "Sincronização de produtos",
        "Autenticação OAuth 2.0",
        "Gerenciamento de vendas (em breve)",
        "Webhooks automáticos (em breve)",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Olá, {session?.user?.name}!
        </h2>
        <p className="text-muted-foreground">
          Selecione uma integração para gerenciar seus produtos e alunos
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {integrations.map((integration) => (
          <Link
            key={integration.id}
            href={integration.href}
            className={`group ${integration.status === "coming_soon" ? "pointer-events-none" : ""}`}
          >
            <Card className={`transition-all hover:shadow-lg ${integration.status === "coming_soon" ? "opacity-60" : "hover:border-primary"}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{integration.icon}</div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {integration.name}
                        {integration.status === "active" && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        )}
                        {integration.status === "coming_soon" && (
                          <Badge variant="secondary">
                            Em Breve
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  {integration.status === "active" && (
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Recursos disponíveis:
                  </p>
                  <ul className="grid gap-2">
                    {integration.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Este sistema permite gerenciar múltiplas plataformas de vendas em um único lugar:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Clique em uma integração ativa para acessar o dashboard</li>
            <li>Configure suas credenciais de API nas páginas de cada integração</li>
            <li>Sincronize seus dados e comece a gerenciar seus produtos e alunos</li>
            <li>Configure webhooks para receber atualizações em tempo real</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
