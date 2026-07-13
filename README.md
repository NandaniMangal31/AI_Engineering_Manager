# AI Engineering Manager

## Run locally

1. Install dependencies:
   - npm run install:all
2. Start both services:
   - npm run dev
3. Open the frontend at http://localhost:4200
4. The frontend proxies API requests to http://localhost:5000

## Notes
- The backend uses MongoDB from the configured MONGO_URI in backend/.env.
- The frontend uses the proxy config in frontend/proxy.conf.json.
- The Slack OAuth install endpoint is available at http://localhost:5000/api/slack/install.
