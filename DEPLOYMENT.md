# StackSave AI Audit — Deployment Guide

This guide covers deploying StackSave AI Audit to Render with production-ready configuration.

## Overview

**Deployment Architecture:**
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: MongoDB Atlas
- AI Service: Grok API
- Email Service: Resend API
- Platform: Render (both frontend and backend)

## Pre-Deployment Checklist

### 1. MongoDB Atlas Setup
- Ensure MongoDB Atlas cluster is running
- Whitelist Render IP addresses (0.0.0.0/0 for development, specific IPs for production)
- Get your connection string with username/password

### 2. API Keys Ready
- Grok API key (for AI summaries)
- Resend API key (for email notifications)

### 3. GitHub Repository
- Ensure code is pushed to GitHub
- Repository should be public or accessible by Render

## Changes Made for Production

### Frontend Changes

**1. Environment Variables (`frontend/.env.example`)**
- Added clear comments for development vs production values
- `VITE_API_BASE_URL` now has deployment guidance

**2. API Configuration (`frontend/src/components/ChatBot.tsx`)**
- Fixed inconsistent API URL variable usage
- Now uses `VITE_API_BASE_URL` consistently across all components
- Strips `/api` suffix for ChatBot to construct base URL correctly

**3. Package Scripts (`frontend/package.json`)**
- Added `start` script: `vite preview` for production serving
- Build command: `tsc -b && vite build` (TypeScript check + Vite build)

**4. Meta Tags (`frontend/index.html`)**
- Updated Open Graph and Twitter Card URLs to generic domain
- Ready to customize with actual production domain

**5. Render Configuration (`frontend/render.yaml`)**
- Configured for automatic GitHub deployment
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/`

### Backend Changes

**1. Environment Variables (`backend/.env.example`)**
- Added clear comments for each variable
- `MONGODB_URI`: MongoDB Atlas connection string
- `GROQ_API_KEY`: Grok AI API key
- `RESEND_API_KEY`: Resend email API key
- `FRONTEND_URL`: Frontend URL for CORS (dev vs prod guidance)
- `PORT`: Server port (Render overrides this)
- `NODE_ENV`: Environment (development/production)

**2. CORS Configuration (`backend/src/app.ts`)**
- Environment-aware CORS origins
- Production: Only allows production frontend URL
- Development: Allows localhost URLs for testing
- Dynamic based on `NODE_ENV` variable

**3. Console Logs (`backend/src/app.ts`)**
- Environment-aware server URL logging
- Production shows Render URL
- Development shows localhost
- Added environment indicator in logs

**4. Render Configuration (`backend/render.yaml`)**
- Configured for automatic GitHub deployment
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Health check path: `/api/health`
- Environment variables configured (with sync: false for secrets)

## Deployment Steps

### Step 1: Deploy Backend First

1. **Create Backend Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository
   - Use root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`

2. **Configure Environment Variables**
   In Render dashboard, add these environment variables:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/stacksave?retryWrites=true&w=majority
   GROQ_API_KEY=your_grok_api_key
   RESEND_API_KEY=your_resend_api_key
   FRONTEND_URL=https://stacksave-frontend.onrender.com
   PORT=10000
   NODE_ENV=production
   ```

3. **Deploy and Note URL**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the backend URL (e.g., `https://stacksave-backend.onrender.com`)

### Step 2: Deploy Frontend

1. **Create Frontend Service on Render**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect the same GitHub repository
   - Use root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`

2. **Configure Environment Variables**
   In Render dashboard, add this environment variable:
   ```
   VITE_API_BASE_URL=https://stacksave-backend.onrender.com/api
   ```
   **IMPORTANT:** Replace with your actual backend URL from Step 1

3. **Update Backend CORS**
   - Go back to backend service in Render
   - Update `FRONTEND_URL` environment variable
   - Set it to your frontend URL (e.g., `https://stacksave-frontend.onrender.com`)
   - Redeploy backend to apply changes

4. **Deploy Frontend**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the frontend URL

### Step 3: Verify Deployment

1. **Test Backend Health**
   ```bash
   curl https://stacksave-backend.onrender.com/api/health
   ```
   Should return: `{"status":"ok","db":"connected"}`

2. **Test Frontend**
   - Open frontend URL in browser
   - Try running an audit
   - Verify API calls work
   - Check ChatBot functionality

3. **Test CORS**
   - Verify no CORS errors in browser console
   - Check that frontend can successfully call backend API

## Environment Variables Reference

### Frontend Environment Variables

| Variable | Purpose | Development | Production |
|----------|---------|-------------|------------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:5000/api` | `https://stacksave-backend.onrender.com/api` |

### Backend Environment Variables

| Variable | Purpose | Development | Production |
|----------|---------|-------------|------------|
| `MONGODB_URI` | MongoDB connection string | Local or Atlas | Atlas connection string |
| `GROQ_API_KEY` | Grok AI API key | Your key | Your key |
| `RESEND_API_KEY` | Resend email API key | Your key | Your key |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` | `https://stacksave-frontend.onrender.com` |
| `PORT` | Server port | `5000` | `10000` (or Render's PORT) |
| `NODE_ENV` | Environment mode | `development` | `production` |

## Local Development Setup

After production deployment, maintain local development by:

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env with: VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev
```

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your local development values
npm install
npm run dev
```

## Troubleshooting

### Issue: CORS Errors
**Solution:** Ensure `FRONTEND_URL` in backend environment variables matches the actual frontend URL exactly (including protocol).

### Issue: MongoDB Connection Failed
**Solution:** 
- Verify MongoDB Atlas connection string is correct
- Check Atlas IP whitelist (0.0.0.0/0 for testing)
- Ensure database user has correct permissions

### Issue: Build Fails
**Solution:**
- Check Render build logs
- Ensure all dependencies are in package.json
- Verify TypeScript compiles locally with `npm run build`

### Issue: API Calls Fail
**Solution:**
- Verify `VITE_API_BASE_URL` in frontend is correct
- Check backend is running and accessible
- Test backend health endpoint directly
- Check browser console for specific errors

### Issue: ChatBot Not Working
**Solution:**
- Ensure ChatBot uses the same API URL as other components
- Verify backend `/api/chat` endpoint is accessible
- Check Grok API key is valid and has credits

## Future-Safe Architecture

This deployment setup supports:

1. **Future UI Improvements**
   - Frontend build process unchanged
   - Environment variables handle API configuration
   - No hardcoded URLs in code

2. **Future Backend Features**
   - Backend build process unchanged
   - Environment variables handle all configuration
   - CORS dynamically configured based on environment

3. **Future API Integrations**
   - Add new API keys via environment variables
   - No code changes needed for configuration
   - Backend service layer ready for additions

4. **Environment Changes**
   - Switch between dev/prod via `NODE_ENV`
   - No code changes needed
   - Environment-aware CORS and logging

5. **Scaling**
   - Render handles horizontal scaling automatically
   - MongoDB Atlas scales independently
   - Stateless backend design ready for scaling

## GitHub Auto-Deploy

Both services are configured for automatic deployment:
- Push to `main` branch triggers automatic redeploy
- No manual intervention needed
- Build and deploy logs available in Render dashboard

## Security Notes

1. **API Keys**
   - Never commit `.env` files
   - Use Render's environment variable management
   - Rotate keys regularly

2. **MongoDB**
   - Use strong passwords
   - Enable IP whitelisting in production
   - Use TLS connections

3. **CORS**
   - Production allows only production frontend URL
   - Development allows localhost for testing
   - Environment-based configuration

## Monitoring

### Render Dashboard
- Monitor service health
- View deployment logs
- Check resource usage
- Set up alerts

### Backend Logs
- Health check endpoint: `/api/health`
- Request logging middleware enabled
- Error logging for debugging

## Cost Optimization

- Free tier on Render sufficient for MVP
- MongoDB Atlas free tier available
- Monitor API usage (Grok, Resend)
- Scale up as traffic grows

## Support

For deployment issues:
1. Check Render build logs
2. Check this guide's troubleshooting section
3. Verify environment variables are set correctly
4. Test locally with production environment variables

## Summary

Your StackSave AI Audit is now production-ready with:
- ✅ Environment-based configuration
- ✅ Automatic GitHub deployment
- ✅ Production-safe CORS setup
- ✅ Future-safe architecture
- ✅ Clean separation of concerns
- ✅ Comprehensive documentation

Deploy both services, update environment variables with actual URLs, and you're live!
