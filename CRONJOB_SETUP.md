# Cronjob Setup Guide

This guide explains how to set up automated cronjobs for syncing students and cleaning up the Telegram group.

## Available Endpoints

### 1. Sync Students from Kiwify
**Endpoint**: `POST /api/sync/students`

Fetches sales from Kiwify and creates/updates student records.

**When to run**: Every 1-4 hours (depending on your sales volume)

**Authentication**: Requires `x-api-key` header with `SYNC_API_KEY` value

### 2. Sync Telegram Group
**Endpoint**: `POST /api/telegram/sync-group`

Removes students from Telegram group who no longer have active products or are inactive.

**When to run**: Daily (e.g., every day at 2 AM)

**Authentication**: Requires `x-api-key` header with `SYNC_API_KEY` value

## Setup Instructions

### Using cron-job.org (Recommended - No Server Required)

1. **Create Account**
   - Go to https://cron-job.org
   - Create a free account

2. **Add Sync Students Job**
   - Click "Create cronjob"
   - Title: "Sync Kiwify Students"
   - URL: `https://your-domain.com/api/sync/students`
   - Method: POST
   - Schedule: Every 2 hours (or your preference)
   - Add Header:
     - Name: `x-api-key`
     - Value: Your `SYNC_API_KEY` from `.env`
   - Save

3. **Add Telegram Group Cleanup Job**
   - Click "Create cronjob"
   - Title: "Clean Telegram Group"
   - URL: `https://your-domain.com/api/telegram/sync-group`
   - Method: POST
   - Schedule: Daily at 2:00 AM
   - Add Header:
     - Name: `x-api-key`
     - Value: Your `SYNC_API_KEY` from `.env`
   - Save

### Using Vercel Cron (Vercel Deployments)

1. **Create cron configuration**

   Add to `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/sync/students",
         "schedule": "0 */2 * * *"
       },
       {
         "path": "/api/telegram/sync-group",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```

2. **Update routes to accept Vercel cron**
   - Vercel automatically adds authentication
   - No additional changes needed

### Using Unix Cron (VPS/Server)

1. **Open crontab**
   ```bash
   crontab -e
   ```

2. **Add jobs**
   ```bash
   # Sync students every 2 hours
   0 */2 * * * curl -X POST https://your-domain.com/api/sync/students \
     -H "x-api-key: YOUR_SYNC_API_KEY" \
     -H "Content-Type: application/json"

   # Clean Telegram group daily at 2 AM
   0 2 * * * curl -X POST https://your-domain.com/api/telegram/sync-group \
     -H "x-api-key: YOUR_SYNC_API_KEY" \
     -H "Content-Type: application/json"
   ```

3. **Save and exit**

## Schedule Recommendations

### Sync Students
- **High volume sales**: Every 1 hour
- **Medium volume**: Every 2-4 hours
- **Low volume**: Every 6-12 hours

### Telegram Group Cleanup
- **Recommended**: Daily at a low-traffic time (e.g., 2-4 AM)
- **Aggressive**: Twice daily (morning and night)
- **Conservative**: Weekly

## Testing

### Test Sync Students
```bash
curl -X POST http://localhost:3000/api/sync/students \
  -H "x-api-key: YOUR_SYNC_API_KEY" \
  -H "Content-Type: application/json"
```

### Test Telegram Sync
```bash
curl -X POST http://localhost:3000/api/telegram/sync-group \
  -H "x-api-key: YOUR_SYNC_API_KEY" \
  -H "Content-Type: application/json"
```

## Security Notes

- Never commit your `SYNC_API_KEY` to version control
- Generate a strong key using: `openssl rand -base64 32`
- Store it securely in environment variables
- Use HTTPS in production
- Monitor cronjob execution logs
- Set up alerts for failed jobs

## Monitoring

Both endpoints return detailed JSON responses:

```json
{
  "success": true,
  "message": "Summary message",
  "results": {
    "checked": 10,
    "removed": 2,
    "kept": 8,
    "errors": [],
    "details": ["..."]
  }
}
```

### Common Issues

1. **401 Unauthorized**: Check if `x-api-key` header matches `SYNC_API_KEY`
2. **500 Error**: Check server logs for database or API issues
3. **Timeout**: Increase timeout settings (may need longer for large datasets)
4. **Rate limiting**: Kiwify API has rate limits, adjust frequency if needed

## Manual Trigger

You can also trigger these jobs manually from the dashboard:
- Students page: "Sync Telegram Group" button (coming soon)
- Or use the API routes directly through the UI

## Logs

Check application logs for detailed execution information:
- Vercel: Deployment logs
- Server: Application logs (`pm2 logs` if using PM2)
- cron-job.org: Execution history in dashboard
