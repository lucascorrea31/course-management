# Course Management System

A comprehensive management platform for digital course creators and info product providers, featuring deep integration with Kiwify API and automated Telegram group management.

## Overview

This system helps content creators manage their digital products, track sales, monitor students, and automatically manage Telegram group access based on purchase status. Built specifically for creators using Kiwify as their payment and content delivery platform.

## Key Features

### 🎓 Course & Product Management
- **Kiwify Integration**: Sync all your products and courses from Kiwify
- **Real-time Updates**: Automatic synchronization of product information
- **Product Overview**: View all active and inactive products with pricing
- **Student Lists**: Track enrolled students per course/product

### 💰 Sales Management
- **Sales Dashboard**: Monitor all your sales in one place
- **Automatic Sync**: Import sales from the last 30 days
- **Real-time Webhooks**: Receive instant notifications of new sales
- **Status Tracking**: Monitor payment status (paid, pending, refunded, chargeback)
- **Revenue Metrics**: Track total revenue and commissions

### 📱 Telegram Integration
- **Automated Group Management**: Automatically manage Telegram group membership
- **Student Verification**: Remove users who are not active students
- **Access Control**: Grant/revoke access based on purchase status
- **Bot Integration**: Telegram bot for automated notifications and management

### 📊 Dashboard Analytics
- **Overview Metrics**: Total products, sales, and revenue at a glance
- **Monthly Reports**: Track performance over time
- **Customer Information**: View customer details including email and phone

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + ShadCN UI
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js
- **Package Manager**: pnpm
- **API Integration**: Kiwify REST API
- **Bot Integration**: Telegram Bot API

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── kiwify/
│   │   │   ├── products/      # Product sync endpoints
│   │   │   ├── sales/         # Sales sync endpoints
│   │   │   └── webhook/       # Webhook receiver
│   ├── dashboard/
│   │   ├── page.tsx           # Main dashboard
│   │   ├── products/          # Products management
│   │   └── sales/             # Sales tracking
│   ├── login/                 # Authentication
│   └── globals.css            # Global styles
├── components/
│   └── ui/                    # ShadCN UI components
├── lib/
│   ├── mongodb.ts             # MongoDB connection
│   ├── kiwify.ts              # Kiwify API client
│   └── utils.ts               # Utilities
├── models/
│   ├── Product.ts             # Product schema
│   ├── Sale.ts                # Sale schema
│   └── User.ts                # User schema
└── auth.ts                    # NextAuth configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or cloud)
- Kiwify account with API access
- Telegram Bot Token (optional, for Telegram features)
- pnpm package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd course-management
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/course-management

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32

# Kiwify OAuth 2.0 API
KIWIFY_CLIENT_ID=your-kiwify-client-id
KIWIFY_CLIENT_SECRET=your-kiwify-client-secret
KIWIFY_ACCOUNT_ID=your-kiwify-account-id

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

4. **Start the development server**
```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Getting Kiwify OAuth Credentials

To obtain your Kiwify OAuth credentials:

1. Log in to your [Kiwify Dashboard](https://dashboard.kiwify.com.br/)
2. Go to **Settings** → **API** or **Integrations**
3. Find your **Account ID** (usually displayed in your account settings)
4. Create a new OAuth application
5. Copy the following values:
   - `KIWIFY_ACCOUNT_ID` - Your Kiwify account identifier
   - `KIWIFY_CLIENT_ID` - OAuth client ID (UUID format)
   - `KIWIFY_CLIENT_SECRET` - OAuth client secret
6. Add them to your `.env.local` file

**Note**: The system uses OAuth 2.0 authentication with automatic token caching. Access tokens are valid for 24 hours and are automatically refreshed when expired.

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

## API Endpoints

### Products

- `GET /api/kiwify/products` - List all synced products
- `POST /api/kiwify/products` - Sync products from Kiwify

### Sales

- `GET /api/kiwify/sales` - List all sales
- `POST /api/kiwify/sales` - Sync sales from Kiwify (30-day range)

### Webhooks

- `POST /api/kiwify/webhook` - Receive real-time updates from Kiwify

## Kiwify Webhook Setup

To receive real-time sale notifications:

1. Log in to your Kiwify dashboard
2. Go to **Settings** → **Webhooks**
3. Add a new webhook with the URL:
   ```
   https://your-domain.com/api/kiwify/webhook
   ```
4. Select events to track:
   - ✅ Sale approved
   - ✅ Sale refunded
   - ✅ Sale chargeback
   - ✅ Subscription created/cancelled (coming soon)

## Telegram Bot Setup

### Creating Your Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to set bot name and username
4. Copy the bot token to your `.env.local`

### Getting Chat ID

1. Add your bot to your Telegram group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the `chat` object and copy the `id`
5. Add the chat ID to your `.env.local`

### Bot Features (Coming Soon)

- Automatic student addition when sale is approved
- Automatic removal on refund/chargeback
- Student verification commands
- Manual add/remove commands for administrators

## Database Models

### Product
```typescript
{
  kiwifyId: string,      // Unique Kiwify product ID
  name: string,          // Product name
  description: string,   // Product description
  price: number,         // Price in cents
  status: string,        // active | inactive
  lastSyncAt: Date      // Last synchronization timestamp
}
```

### Sale
```typescript
{
  kiwifyId: string,      // Unique Kiwify sale ID
  productId: ObjectId,   // Reference to Product
  productName: string,   // Product name snapshot
  customer: {
    name: string,
    email: string,
    phone: string
  },
  status: string,        // paid | pending | refused | refunded | chargeback
  amount: number,        // Total amount in cents
  commission: number,    // Your commission in cents
  createdAt: Date,
  approvedAt: Date
}
```

## Features in Development

- [ ] Subscription management
- [ ] Automated Telegram group management
- [ ] Student verification system
- [ ] Advanced analytics and reporting
- [ ] Email notification system
- [ ] Student engagement tracking
- [ ] Multi-language support

## Design System

The application uses a modern, clean design inspired by ShadCN UI:
- **Color Scheme**: Predominantly black and white with accent colors
- **Dark Mode**: Full dark mode support via CSS variables
- **Components**: Reusable UI components from ShadCN
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG compliant components

## Contributing

This is a private project for managing digital courses and info products. All code, comments, and documentation must be in English.

## Security Notes

- Never commit `.env.local` or `.env` files to version control
- Keep your Kiwify API key confidential
- Use environment variables for all sensitive data
- Implement rate limiting on webhook endpoints in production
- Validate webhook signatures from Kiwify (recommended)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Ensure your platform supports:
- Node.js 18+
- Environment variables
- MongoDB connectivity
- Serverless functions or persistent Node.js process

## License

Private project - All rights reserved

## Support

For issues and questions, please contact the repository maintainer.
