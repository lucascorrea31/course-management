"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        // Registration
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Error creating account");
        } else {
          // After registration, auto login
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError(result.error);
          } else {
            router.push("/dashboard");
            router.refresh();
          }
        }
      }
    } catch (err) {
      setError("Error processing request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left Side - Logo Area */}
      <div className="hidden lg:flex lg:items-center lg:justify-center bg-muted p-8">
        <div className="text-center">
          {/* Logo placeholder - adicionar logo aqui */}
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-primary text-primary-foreground text-2xl font-bold mb-4">
            CM
          </div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-muted-foreground mt-2">
            Gerencie seus cursos e produtos
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="space-y-2 text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  {isLogin ? "Entrar" : "Criar Conta"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isLogin
                    ? "Digite suas credenciais para acessar"
                    : "Preencha os dados para começar"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Processando..."
                : isLogin
                ? "Entrar"
                : "Criar Conta"}
            </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                  }}
                  className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                  {isLogin
                    ? "Não tem uma conta? Criar conta"
                    : "Já tem uma conta? Entrar"}
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground px-4">
          Ao continuar, você concorda com nossos{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Termos de Serviço
          </a>{" "}
          e{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Política de Privacidade
          </a>
          .
        </p>
        </div>
      </div>
    </div>
  );
}
