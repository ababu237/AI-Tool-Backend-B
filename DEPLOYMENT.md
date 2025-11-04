# Deployment Guide for Render

## Prerequisites

- GitHub account with this repository
- Render account (free tier available at https://render.com)
- OpenAI API key

## Step 1: Prepare Your Repository

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub account if not already connected
4. Select this repository: `AI-Tool-Backend-B`
5. Render will automatically detect `render.yaml`
6. Click "Apply" to create the service

### Option B: Manual Setup

1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ai-tool-backend` (or your preferred name)
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend_api.master_backend_api:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free (or select your preferred plan)

## Step 3: Configure Environment Variables

In Render Dashboard → Your Service → Environment:

Add these environment variables:

```
OPENAI_API_KEY=your_actual_openai_api_key
MASTER_API_KEY=your_secure_api_key_for_endpoints (optional but recommended)
ENVIRONMENT=production
CORS_ORIGINS=https://your-frontend-url.com
```

**Important Security Notes:**

- Never commit actual API keys to Git
- Use Render's environment variables for all secrets
- The `MASTER_API_KEY` protects your endpoints from unauthorized access

## Step 4: Deploy

1. Click "Create Web Service" or "Deploy"
2. Wait for the build to complete (5-10 minutes first time)
3. Once deployed, you'll get a URL like: `https://ai-tool-backend.onrender.com`

## Step 5: Test Your Deployment

Test the health endpoint:

```bash
curl https://your-app-name.onrender.com/health
```

Expected response:

```json
{
  "status": "healthy",
  "services": {...}
}
```

## Step 6: Update Frontend

In your frontend code, update the API base URL:

```javascript
// Before (local)
const API_BASE_URL = "http://localhost:8000";

// After (production)
const API_BASE_URL = "https://your-app-name.onrender.com";
```

### Frontend Integration Example

```javascript
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "https://your-app-name.onrender.com";
const API_KEY = process.env.REACT_APP_API_KEY; // Your MASTER_API_KEY

async function callAPI(endpoint, data) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY, // Include if MASTER_API_KEY is set
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Example: Clinical chat
const result = await callAPI("/clinical/chat", {
  user_message: "What are the symptoms of flu?",
  output_language: "en",
});
```

## Available Endpoints

Once deployed, your API will have these endpoints:

- `GET /` - API information
- `GET /health` - Health check
- `POST /clinical/chat` - Clinical chat with translation
- `POST /clinical/tts` - Text-to-speech
- `POST /document/process` - Document Q&A
- `POST /csv/process` - CSV processing
- `POST /transcription/transcribe` - Audio transcription
- `POST /organ/analyze` - Organ scan analysis

Full API documentation: `https://your-app-name.onrender.com/docs`

## Monitoring and Logs

- View logs: Render Dashboard → Your Service → Logs
- Monitor health: Use the `/health` endpoint
- Set up alerts in Render for downtime notifications

## Troubleshooting

### Build Fails

- Check that `requirements.txt` is valid
- Verify Python version in `runtime.txt` is supported
- Check build logs in Render dashboard

### Service Won't Start

- Verify environment variables are set correctly
- Check that `OPENAI_API_KEY` is valid
- Review startup logs

### CORS Errors

- Add your frontend URL to `CORS_ORIGINS` environment variable
- Or set `CORS_ORIGINS=*` for testing (not recommended for production)

### API Key Errors

- Ensure `x-api-key` header matches `MASTER_API_KEY`
- Or remove `MASTER_API_KEY` env var to disable authentication

## Updating Your Deployment

Render automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Update API"
git push origin main
```

Render will detect the push and redeploy automatically.

## Cost Optimization

**Free Tier Limitations:**

- Service spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- 750 hours/month (enough for 1 service running 24/7)

**To Upgrade:**

- Go to Render Dashboard → Your Service → Settings
- Change plan to Starter ($7/month) or higher for:
  - No spin-down
  - Faster cold starts
  - More resources

## Need Help?

- Render Documentation: https://render.com/docs
- Support: support@render.com
- Check service status: https://status.render.com
