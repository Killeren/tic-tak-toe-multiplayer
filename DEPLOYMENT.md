# Cloud Deployment Guide - Tic-Tac-Toe Multiplayer

This guide covers deploying your multiplayer Tic-Tac-Toe game to various cloud platforms.

## Table of Contents
1. [Quick Overview](#quick-overview)
2. [Deploy to Railway (Recommended - Easiest)](#railway-deployment)
3. [Deploy to Fly.io](#flyio-deployment)
4. [Deploy to AWS](#aws-deployment)
5. [Deploy to Google Cloud](#google-cloud-deployment)
6. [Deploy to DigitalOcean](#digitalocean-deployment)
7. [Custom Domain Setup](#custom-domain-setup)

---

## Quick Overview

### Architecture
- **Backend**: Nakama game server + PostgreSQL (Docker containers)
- **Frontend**: Static HTML/CSS/JS files
- **Total Cost**: ~$5-20/month depending on platform

### What You Need
- GitHub account (for code repository)
- Cloud platform account (Railway/Fly.io/AWS/etc.)
- Credit card (most platforms offer free credits)
- Domain name (optional)

---

## Railway Deployment

**Railway** is the easiest option with generous free tier and automatic HTTPS.

### Step 1: Prepare Repository

```bash
cd /Users/vsscharan/Desktop/tic-tak-toe-lilagames

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - Tic-Tac-Toe multiplayer game"

# Create GitHub repository and push
# Go to github.com and create a new repository
git remote add origin https://github.com/YOUR_USERNAME/tictactoe-multiplayer.git
git push -u origin main
```

### Step 2: Deploy to Railway

1. **Go to [Railway.app](https://railway.app)** and sign in with GitHub

2. **Create New Project** → Deploy from GitHub repo

3. **Add PostgreSQL Service**:
   - Click "New" → Database → PostgreSQL
   - Note the connection details

4. **Add Nakama Service**:
   - Click "New" → Empty Service
   - Settings → Source → Connect to your repo
   - Add environment variables:
     ```
     DATABASE_URL=${POSTGRES.DATABASE_URL}
     ```
   - Settings → Deploy → Custom Start Command:
     ```
     /nakama/nakama --config /nakama/data/local.yml
     ```

5. **Add Client Service** (Static files):
   - Click "New" → Empty Service
   - Connect to your repo
   - Settings → Root Directory: `client/src`
   - Add build command: `echo "No build needed"`
   - Add start command: `python3 -m http.server $PORT`

6. **Configure Networking**:
   - Nakama service → Settings → Networking → Generate Domain
   - Copy the domain (e.g., `nakama-production.up.railway.app`)
   - Update client configuration (see step 7)

### Step 3: Update Client Configuration

Create `railway-config.js` in `client/src/`:
```javascript
const CONFIG = {
    serverUrl: 'YOUR-NAKAMA-DOMAIN.railway.app', // Without https://
    serverPort: '443',
    serverKey: 'defaultkey',
    useSSL: true
};
```

Update `index.html` to use railway-config.js:
```html
<script src="railway-config.js"></script>
<script src="game.js"></script>
```

### Railway Pricing
- **Free Tier**: $5 credit/month, enough for hobby projects
- **Developer Plan**: $20/month for production apps

---

## Fly.io Deployment

**Fly.io** offers great global edge network and $0 egress fees.

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Or use install script
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login
```

### Step 2: Create Fly Apps

```bash
cd /Users/vsscharan/Desktop/tic-tak-toe-lilagames

# Create server app
cd server
flyctl launch --name tictactoe-server --no-deploy

# Create Postgres
flyctl postgres create --name tictactoe-db --region sjc

# Attach database
flyctl postgres attach tictactoe-db -a tictactoe-server
```

### Step 3: Deploy Server

The `fly.toml` file is already created. Deploy:
```bash
cd server
flyctl deploy
```

### Step 4: Deploy Client

```bash
cd ../client
flyctl launch --name tictactoe-client --no-deploy
flyctl deploy
```

### Fly.io Pricing
- **Free Tier**: 3 shared-cpu-1x VMs + 3GB storage
- **Paid**: ~$10-15/month for production

---

## AWS Deployment

Deploy using **AWS Elastic Beanstalk** (easiest) or **ECS** (more control).

### Option A: Elastic Beanstalk

1. **Install EB CLI**:
```bash
pip install awsebcli
```

2. **Initialize EB**:
```bash
cd /Users/vsscharan/Desktop/tic-tak-toe-lilagames/server
eb init -p docker tictactoe-game --region us-west-2
```

3. **Create Environment**:
```bash
eb create tictactoe-prod --database.engine postgres --database.size 10
```

4. **Deploy**:
```bash
eb deploy
```

5. **Get URL**:
```bash
eb status
```

### Option B: ECS with Fargate

See `aws-deployment/` folder for detailed CloudFormation templates.

### AWS Pricing
- **t3.micro**: ~$10/month (Nakama)
- **db.t3.micro RDS**: ~$15/month (PostgreSQL)
- **S3 + CloudFront**: ~$1/month (Static files)
- **Total**: ~$26/month

---

## Google Cloud Deployment

Deploy using **Cloud Run** for containers.

### Step 1: Setup GCP

```bash
# Install gcloud CLI
brew install google-cloud-sdk

# Login
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Build and Push Images

```bash
cd /Users/vsscharan/Desktop/tic-tak-toe-lilagames/server

# Build Nakama image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tictactoe-nakama

# Deploy to Cloud Run
gcloud run deploy tictactoe-nakama \
  --image gcr.io/YOUR_PROJECT_ID/tictactoe-nakama \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Step 3: Setup Cloud SQL (PostgreSQL)

```bash
# Create PostgreSQL instance
gcloud sql instances create tictactoe-db \
  --database-version=POSTGRES_12 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create nakama --instance=tictactoe-db
```

### Step 4: Deploy Client to Cloud Storage + CDN

```bash
cd ../client/src

# Create bucket
gsutil mb gs://tictactoe-client

# Upload files
gsutil -m cp -r * gs://tictactoe-client

# Make public
gsutil iam ch allUsers:objectViewer gs://tictactoe-client

# Enable CDN
gcloud compute backend-buckets create tictactoe-cdn \
  --gcs-bucket-name=tictactoe-client \
  --enable-cdn
```

### GCP Pricing
- **Cloud Run**: ~$5/month (minimal traffic)
- **Cloud SQL**: ~$10/month (f1-micro)
- **Cloud Storage + CDN**: ~$1/month
- **Total**: ~$16/month

---

## DigitalOcean Deployment

Simple and affordable with App Platform.

### Step 1: Create App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect GitHub repository
4. Select your repo

### Step 2: Configure Services

**Nakama Service**:
- **Type**: Docker
- **Dockerfile Path**: `server/Dockerfile.nakama`
- **HTTP Port**: 7350
- **Environment Variables**:
  ```
  DATABASE_URL=${db.DATABASE_URL}
  ```

**PostgreSQL**:
- Add managed database
- Plan: Basic ($15/month)

**Client**:
- **Type**: Static Site
- **Source Directory**: `client/src`
- **Output Directory**: (leave empty)

### Step 3: Deploy

Click "Deploy" and wait 5-10 minutes.

### DigitalOcean Pricing
- **App Platform**: $5/month (basic)
- **Managed PostgreSQL**: $15/month
- **Total**: ~$20/month

---

## Custom Domain Setup

### Railway
1. Settings → Networking → Custom Domain
2. Add your domain (e.g., `tictactoe.yourdomain.com`)
3. Add CNAME record pointing to Railway domain

### Fly.io
```bash
flyctl certs add tictactoe.yourdomain.com
```
Then add CNAME/ALIAS record.

### AWS Route 53
```bash
# Create hosted zone
aws route53 create-hosted-zone --name yourdomain.com

# Add records
aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID --change-batch file://dns-records.json
```

### Cloudflare (Universal)
1. Add site to Cloudflare
2. Update nameservers
3. Add CNAME records for subdomains
4. Enable SSL/TLS (Full)

---

## Environment Variables

Update these in your cloud platform:

```bash
# Nakama
DATABASE_URL=postgresql://user:pass@host:5432/nakama
SERVER_KEY=YOUR_SECURE_KEY_HERE
CONSOLE_USERNAME=admin
CONSOLE_PASSWORD=YOUR_SECURE_PASSWORD

# Client (update in game.js)
NAKAMA_SERVER_URL=your-nakama-domain.com
NAKAMA_SERVER_PORT=443
NAKAMA_USE_SSL=true
```

---

## SSL/HTTPS Setup

Most platforms provide automatic HTTPS:
- ✅ Railway: Automatic
- ✅ Fly.io: Automatic
- ✅ GCP Cloud Run: Automatic
- ✅ DigitalOcean App Platform: Automatic
- ⚠️ AWS: Need to setup ALB + ACM

---

## Monitoring & Logs

### Railway
```bash
# View logs
railway logs
```

### Fly.io
```bash
# View logs
flyctl logs
```

### AWS
- CloudWatch for logs
- X-Ray for tracing

### GCP
- Cloud Logging
- Cloud Monitoring

---

## Scaling

### Horizontal Scaling
Most platforms support auto-scaling:

**Railway**: Adjust replicas in settings
**Fly.io**: 
```bash
flyctl scale count 3
```

**AWS**: Auto Scaling Groups
**GCP**: Cloud Run auto-scales

### Vertical Scaling
Increase memory/CPU as needed:

**Railway**: Change service plan
**Fly.io**: 
```bash
flyctl scale vm shared-cpu-2x
```

---

## Backup Strategy

### Database Backups

**Railway**: Automatic daily backups
**Fly.io**: 
```bash
flyctl postgres backup list
```

**AWS RDS**: Enable automated backups
**GCP Cloud SQL**: Enable automated backups

### Application Backups
- Keep git repository updated
- Export environment variables
- Document configuration changes

---

## Cost Optimization

1. **Use free tiers** where possible
2. **Shut down dev environments** when not in use
3. **Use spot instances** on AWS/GCP
4. **Enable CDN** for static assets
5. **Optimize database** queries and indexes
6. **Monitor usage** and set billing alerts

---

## Troubleshooting Deployment

### Common Issues

**1. Database Connection Failed**
```bash
# Check DATABASE_URL format
# Should be: postgresql://user:pass@host:5432/dbname

# Test connection
psql $DATABASE_URL
```

**2. CORS Errors**
Update `local.yml`:
```yaml
console:
  cors:
    allowed_origins: ["https://yourdomain.com"]
```

**3. WebSocket Connection Failed**
- Ensure port 7350 is open
- Check SSL/TLS configuration
- Verify serverUrl in client config

**4. Build Failures**
- Check Dockerfile syntax
- Verify all files are committed
- Check build logs

---

## Security Checklist

- [ ] Change default passwords
- [ ] Use environment variables for secrets
- [ ] Enable SSL/HTTPS
- [ ] Restrict database access
- [ ] Set up firewall rules
- [ ] Enable DDoS protection
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Backup encryption
- [ ] Rate limiting

---

## Performance Optimization

1. **Enable CDN** for client files
2. **Use connection pooling** for database
3. **Enable gzip compression**
4. **Optimize images** and assets
5. **Use HTTP/2** where available
6. **Cache static resources**
7. **Minimize JavaScript** bundle size
8. **Use edge locations** close to users

---

## Next Steps

1. Choose a platform based on your needs
2. Follow the specific deployment guide
3. Update client configuration with production URLs
4. Test thoroughly before going live
5. Set up monitoring and alerts
6. Configure custom domain (optional)
7. Enable analytics (optional)

## Support

Need help? Check:
- Platform documentation
- [Nakama Documentation](https://heroiclabs.com/docs/)
- GitHub Issues
- Discord communities

## Recommended Platform by Use Case

| Use Case | Platform | Why |
|----------|----------|-----|
| Hobby Project | Railway | Free tier, easiest setup |
| MVP/Startup | Fly.io | Good pricing, global edge |
| Enterprise | AWS/GCP | Full control, compliance |
| Simple & Affordable | DigitalOcean | Predictable pricing |
| Academic | Railway/Fly.io | Free tiers available |

Good luck with your deployment! 🚀
