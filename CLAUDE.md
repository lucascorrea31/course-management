# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Course Management System - "Gestor de InfoProdutos e Cursos" (Course and Info Product Manager)

Sistema de gerenciamento e automação para criadores de conteúdo e cursos, com integrações planejadas para Kiwify e Telegram.

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + ShadCN UI
- **Database**: MongoDB with Mongoose ODM
- **Package Manager**: pnpm (sempre usar pnpm ao invés de npm/yarn)

## Development Commands

```bash
# Desenvolvimento
pnpm dev          # Inicia o servidor de desenvolvimento na porta 3000

# Build e produção
pnpm build        # Cria build de produção
pnpm start        # Inicia servidor de produção

# Linting
pnpm lint         # Executa ESLint

# Adicionar componentes ShadCN
pnpm dlx shadcn@latest add [component-name]
```

## Project Structure

```
app/
  ├── login/          # Página de autenticação
  ├── dashboard/      # Dashboard principal (atualmente exibe "Olá")
  ├── layout.tsx      # Layout root da aplicação
  ├── page.tsx        # Home page
  └── globals.css     # Estilos globais e variáveis CSS

components/
  └── ui/             # Componentes ShadCN UI (Button, Input, Card, Label, etc)

lib/
  ├── mongodb.ts      # Conexão com MongoDB (com cache global)
  └── utils.ts        # Utilitários gerais (cn, etc)
```

## Environment Variables

Copie `.env.example` para `.env.local` e configure:

- `MONGODB_URI`: String de conexão do MongoDB
- `NEXTAUTH_URL`: URL da aplicação (para autenticação futura)
- `NEXTAUTH_SECRET`: Secret key para NextAuth
- `KIWIFY_API_KEY`: API key da Kiwify (integração futura)
- `TELEGRAM_BOT_TOKEN`: Token do bot Telegram (integração futura)
- `TELEGRAM_CHAT_ID`: ID do chat Telegram (integração futura)

## Database Connection

A conexão com MongoDB está implementada em `lib/mongodb.ts` com:
- Cache global para reutilizar conexões
- Suporte para ambientes serverless (Vercel)
- Validação de variáveis de ambiente

## Design System

- **Tema**: Design moderno e clean com cores predominantemente preto e branco
- **Estilo**: Inspirado no ShadCN UI
- **Componentes**: Utilizando ShadCN UI para consistência visual
- **Variáveis CSS**: Sistema de cores baseado em HSL/OKLCH para suporte a dark mode

## Future Integrations

- **Kiwify**: Integração para gestão de produtos e vendas
- **Telegram**: Bot para automação e notificações
- **NextAuth**: Sistema de autenticação completo
