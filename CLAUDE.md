# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT: All code, comments, documentation, and communication in this repository must be in English.**

## Project Overview

Course Management System - Platform for managing digital info products and courses.

Management and automation system for content creators and course providers, with integrations for Kiwify and Telegram.

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + ShadCN UI
- **Database**: MongoDB with Mongoose ODM
- **Package Manager**: pnpm (always use pnpm instead of npm/yarn)

## Development Commands

```bash
# Development
pnpm dev          # Start development server on port 3000

# Build and production
pnpm build        # Create production build
pnpm start        # Start production server

# Linting
pnpm lint         # Run ESLint

# Add ShadCN components
pnpm dlx shadcn@latest add [component-name]
```

## Project Structure

```
app/
  ├── login/          # Authentication page
  ├── dashboard/      # Main dashboard
  ├── layout.tsx      # Root application layout
  ├── page.tsx        # Home page
  └── globals.css     # Global styles and CSS variables

components/
  └── ui/             # ShadCN UI components (Button, Input, Card, Label, etc)

lib/
  ├── mongodb.ts      # MongoDB connection (with global caching)
  └── utils.ts        # General utilities (cn, etc)
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `MONGODB_URI`: MongoDB connection string
- `NEXTAUTH_URL`: Application URL (for authentication)
- `NEXTAUTH_SECRET`: Secret key for NextAuth
- `KIWIFY_API_KEY`: Kiwify API key
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `TELEGRAM_CHAT_ID`: Telegram chat ID

## Database Connection

MongoDB connection is implemented in `lib/mongodb.ts` with:
- Global caching to reuse connections
- Serverless environment support (Vercel)
- Environment variable validation

## Design System

- **Theme**: Modern and clean design with predominantly black and white colors
- **Style**: Inspired by ShadCN UI
- **Components**: Using ShadCN UI for visual consistency
- **CSS Variables**: HSL/OKLCH based color system for dark mode support

## Integrations

- **Kiwify**: Integration for product and sales management
- **Telegram**: Bot for automation and notifications
- **NextAuth**: Complete authentication system
