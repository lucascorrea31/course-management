# Hotmart Integration Setup

This guide explains how to configure the Hotmart integration in the course management system.

## Prerequisites

1. Hotmart account as a producer
2. Access to the Hotmart developers panel

## Step 1: Create Credentials on Hotmart

### 1.1 Access the Developers Portal

1. Go to: https://developers.hotmart.com/
2. Log in with your Hotmart account
3. Accept the API terms of use

### 1.2 Create an Application

1. In the developers panel, click on **"My Applications"**
2. Click on **"Create Application"**
3. Fill in the details:
   - **Application Name**: Course Management System
   - **Description**: Course and student management system
   - **Redirect URI**: `https://your-domain.com/api/hotmart/callback` (if using OAuth with code)

### 1.3 Get Credentials

After creating the application, you will receive:
- **Client ID**: Unique identifier for your application
- **Client Secret**: Secret key (keep it safe!)

> ⚠️ **IMPORTANT**: The Client Secret is sensitive. Never share it or commit it to public repositories.

## Step 2: Configure Environment Variables

### 2.1 Add to `.env` file

Copy the `.env.example` file to `.env.local` (if in development) or configure the environment variables on your production server:

```bash
# Hotmart OAuth 2.0 API
HOTMART_BASIC_AUTH=Basic OTBlODY2YjgtNWI4MS00NGQxLWFiYmQtNmUxYmE1ZjlmYTMzOjdjZmNmNjNjLThhNmUtNDM0Ny1hZmUzLTY1ZDkzYmZiM2E0ZA==

# Environment: production or sandbox
HOTMART_ENV=sandbox
```

**Important**:
- Use `HOTMART_ENV=sandbox` for test credentials
- Use `HOTMART_ENV=production` for production credentials

### 2.2 Verify Configuration

In the `.env.local` or `.env` file, make sure the variables are configured correctly:

```env
HOTMART_CLIENT_ID=abc123xyz...
HOTMART_CLIENT_SECRET=def456uvw...
```

## Step 3: Test the Connection

### 3.1 Via Interface

1. Access the dashboard: `http://localhost:3000/dashboard`
2. Click on the **"Hotmart"** card
3. Go to the **"Products"** tab
4. Click the **"Test Connection"** button
5. You should see a success message

### 3.2 Via API

You can also test via cURL:

```bash
curl -X PUT http://localhost:3000/api/hotmart/products \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

## Step 4: Sync Products

### 4.1 Via Interface

1. Go to `/dashboard/hotmart/products`
2. Click on **"Sync"**
3. Wait for the sync to complete
4. Your Hotmart products will appear in the list

### 4.2 Via API

```bash
curl -X POST http://localhost:3000/api/hotmart/products \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

## Sandbox vs Production Environment

### Sandbox (Testing)
- **Base URL**: `https://sandbox.hotmart.com`
- **Credentials**: Get test credentials from the developers panel
- **Data**: Fictitious data for testing
- **Configuration**: `HOTMART_ENV=sandbox`

### Production
- **Base URL**: `https://api-hot-connect.hotmart.com`
- **Credentials**: Real production credentials
- **Data**: Real product and sales data
- **Configuration**: `HOTMART_ENV=production`

> ⚠️ **IMPORTANT**: Always test with the sandbox environment before using in production!

## Integration Architecture

### OAuth 2.0 Authentication

The integration uses the **Client Credentials** flow of OAuth 2.0:

```
1. System requests token → POST /security/oauth/token
2. Hotmart returns access_token
3. System uses token in requests → Authorization: Bearer {token}
```

### Endpoints Used

#### Authentication
- **URL**: `https://api-sec-vlc.hotmart.com/security/oauth/token`
- **Method**: POST
- **Headers**:
  - `Authorization: Basic {base64(client_id:client_secret)}`
  - `Content-Type: application/json`
- **Query Parameters**:
  - `grant_type=client_credentials`
  - `client_id={your_client_id}`
  - `client_secret={your_client_secret}`

#### Products
- **URL**: `https://developers.hotmart.com/product/rest/v2/products`
- **Method**: GET
- **Headers**:
  - `Authorization: Bearer {access_token}`
  - `Content-Type: application/json`

## Data Structure

### Hotmart Product

```typescript
interface HotmartProduct {
  id: number;
  name: string;
  ucode: string;
  status?: string;
  createdDate?: string;
  updatedDate?: string;
}
```

### Product in Database

```typescript
interface IProduct {
  platform: "hotmart";
  hotmartId: string;
  name: string;
  description?: string;
  price: number;
  status: "active" | "inactive";
  userId: ObjectId;
  lastSyncAt: Date;
}
```

## Troubleshooting

### Error: "HOTMART_CLIENT_ID and HOTMART_CLIENT_SECRET must be configured"

**Solution**: Verify that the environment variables are configured correctly in the `.env` file.

### Error: "Hotmart auth failed: 401"

**Possible causes**:
- Incorrect Client ID or Client Secret
- Credentials revoked in Hotmart panel
- Application not authorized

**Solution**:
1. Verify credentials in the developers panel
2. Regenerate credentials if necessary
3. Update the `.env` file

### Error: "Failed to fetch products: 403"

**Cause**: Invalid or expired access token

**Solution**: The system automatically generates a new token. If the error persists, check the application permissions in the Hotmart panel.

### No products returned

**Possible causes**:
- You don't have products registered in Hotmart
- Products don't have "ACTIVE" status
- API permissions issue

**Solution**:
1. Verify that you have products in Hotmart
2. Confirm that the products are active
3. Test the connection via the "Test Connection" button

## Next Steps

### Features in Development

- ⏳ **Sales Webhook**: Receive notifications of new sales
- ⏳ **Sales Sync**: Import sales history
- ⏳ **Subscription Management**: Control active/cancelled subscriptions
- ⏳ **Telegram Integration**: Add students automatically

### Webhook (Coming soon)

To receive sales in real-time, you'll need to configure a webhook:

1. Access the Hotmart panel
2. Go to **Tools** > **Webhooks**
3. Configure the URL: `https://your-domain.com/api/hotmart/webhook`
4. Select events: `PURCHASE_COMPLETE`, `PURCHASE_REFUNDED`, etc.

## References

- [Official Hotmart Developers Documentation](https://developers.hotmart.com/docs/)
- [OAuth 2.0 Authentication](https://developers.hotmart.com/docs/en/start/app-auth/)
- [Products API](https://developers.hotmart.com/docs/en/v1/product/product-list/)
- [Sandbox for Testing](https://developers.hotmart.com/docs/en/start/sandbox/)

## Support

If you encounter problems:

1. Check the server logs: `pnpm dev` (development mode)
2. Consult the official Hotmart documentation
3. Contact Hotmart support if the problem persists
