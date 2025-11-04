# Pre-Deployment Checklist

## ✅ Files Created

- [x] requirements.txt (root level with all dependencies)
- [x] Procfile (Render start command)
- [x] render.yaml (Render service configuration)
- [x] runtime.txt (Python 3.11.0)
- [x] .gitignore (excludes sensitive files)
- [x] .env.example (template for environment variables)
- [x] README.md (updated project documentation)
- [x] DEPLOYMENT.md (complete deployment guide)
- [x] SETUP_GUIDE.md (quick setup instructions)
- [x] push_to_github.sh (Linux/Mac helper)
- [x] push_to_github.bat (Windows helper)

## 📝 Before You Push

### 1. Verify Your Config File

Check `backend_api/config/config.json`:

- [ ] Contains your OPENAI_API_KEY (for local development)
- [ ] This file is gitignored (won't be pushed)

### 2. Review .gitignore

Verify these are excluded:

- [ ] `backend_api/config/config.json` (sensitive data)
- [ ] `.env` (local environment variables)
- [ ] `__pycache__/` (Python cache)
- [ ] `*.mp3` (temporary audio files)
- [ ] `venv/` (virtual environment)

### 3. Test Locally (Optional but Recommended)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn backend_api.master_backend_api:app --reload --port 8000

# Test health endpoint
curl http://localhost:8000/health
```

### 4. Prepare Your Secrets

Have these ready for Render:

- [ ] OpenAI API Key (`OPENAI_API_KEY`)
- [ ] Master API Key (`MASTER_API_KEY`) - create a secure random string
- [ ] Frontend URL for CORS (`CORS_ORIGINS`)

## 🚀 Push to GitHub

Run one of these commands:

**Windows:**

```powershell
.\push_to_github.bat
```

**Mac/Linux:**

```bash
chmod +x push_to_github.sh
./push_to_github.sh
```

**Or manually:**

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## 🌐 Deploy to Render

### Step 1: Create Web Service

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select "AI-Tool-Backend-B"
5. Click "Apply"

### Step 2: Add Environment Variables

Navigate to: Your Service → Environment → Add Environment Variable

```
Name: OPENAI_API_KEY
Value: sk-proj-...your-key...

Name: MASTER_API_KEY
Value: (generate a secure random string)

Name: CORS_ORIGINS
Value: * (or your specific frontend URL)
```

### Step 3: Deploy

- Click "Manual Deploy" or wait for auto-deploy
- First build takes ~5-10 minutes
- Your API will be available at: `https://your-service.onrender.com`

## ✅ Post-Deployment Verification

- [ ] Health check works: `GET /health`
- [ ] API docs accessible: `/docs`
- [ ] CORS configured correctly
- [ ] All endpoints responding
- [ ] Frontend can connect

## 🔧 Maintenance

### Update Dependencies

```bash
pip freeze > requirements.txt
git commit -am "Update dependencies"
git push
```

### Monitor Logs

- Render Dashboard → Your Service → Logs
- Check for errors or warnings
- Monitor response times

### Scale if Needed

- Free tier: 512MB RAM, sleeps after 15 min inactivity
- Starter tier: $7/month, always on, more resources
- Upgrade in Render Dashboard if needed

## 📚 Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [README.md](README.md) - Project documentation
- [Render Docs](https://render.com/docs/web-services)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## 🆘 Common Issues

### Build Fails

- Check Python version in `runtime.txt`
- Verify all dependencies in `requirements.txt`
- Check build logs in Render

### Service Won't Start

- Verify start command in `Procfile`
- Check environment variables are set
- Review service logs

### API Not Responding

- Check service status in Render
- Verify port configuration (`$PORT`)
- Test health endpoint first

### CORS Errors

- Update `CORS_ORIGINS` environment variable
- Include your frontend URL
- Restart service after changes

---

**Ready to go live?** Follow the steps above and you'll be deployed in minutes! 🚀
