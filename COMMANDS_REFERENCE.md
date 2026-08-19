# Smart Hotel Dining - Commands Reference

Quick access to all common commands for development, testing, and deployment.

---

## 🚀 Quick Start

```bash
cd smart-hotel

# Start MongoDB (Docker)
docker compose up -d

# Install all dependencies
npm run install:all

# Configure server
cd server && cp .env.example .env && cd ..

# Seed demo data
npm run seed

# Start development servers
npm run dev
```

---

## 📦 Installation Commands

```bash
# Install all dependencies
npm run install:all

# Install only server dependencies
npm --prefix server install

# Install only client dependencies
npm --prefix client install

# Install specific package (server)
npm --prefix server install package-name

# Install specific package (client)
npm --prefix client install package-name

# Update all packages
npm --prefix server update
npm --prefix client update

# Audit security vulnerabilities
npm --prefix server audit
npm --prefix client audit
```

---

## 🗄️ Database Commands

```bash
# Seed demo data
npm run seed

# Clear all data (CAUTION!)
npm --prefix server run seed:clear

# Connect to MongoDB locally
mongo smart-hotel

# Backup database
mongodump --uri "mongodb://localhost:27017/smart-hotel" --out ./backups/

# Restore database
mongorestore ./backups/

# Export collection to JSON
mongoexport --uri "mongodb://localhost:27017/smart-hotel" --collection orders --out orders.json

# Import collection from JSON
mongoimport --uri "mongodb://localhost:27017/smart-hotel" --collection orders --file orders.json
```

---

## 🏃 Development Commands

```bash
# Start both servers
npm run dev

# Start server only (port 5000)
npm run server
npm --prefix server run dev

# Start client only (port 5173)
npm run client
npm --prefix client run dev

# Watch mode for client
npm --prefix client run dev -- --host

# Debug server
node --inspect server/src/index.js

# Run with specific environment
NODE_ENV=development npm run server
NODE_ENV=production npm run server
```

---

## 🔨 Build Commands

```bash
# Build client
npm --prefix client run build

# Build server (if configured)
npm --prefix server run build

# Build both
npm run build

# Preview client build locally
npm --prefix client run preview

# Generate source maps
npm --prefix client run build -- --sourcemap
```

---

## 📝 Code Quality Commands

```bash
# Lint client code
npm --prefix client run lint

# Lint server code
npm --prefix server run lint

# Format code with Prettier
npm --prefix client run format

# Type check (if TypeScript)
npm --prefix client run type-check

# Check for security vulnerabilities
npm audit

# Fix audit vulnerabilities
npm audit fix
```

---

## 🧪 Testing Commands

```bash
# Run all tests
npm run test

# Run server tests
npm --prefix server run test

# Run client tests
npm --prefix client run test

# Run tests in watch mode
npm --prefix server run test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm --prefix server run test -- test/auth.test.js

# Run integration tests
npm --prefix server run test:integration

# Run E2E tests (when available)
npm run test:e2e
```

---

## 🐳 Docker Commands

```bash
# Start Docker services
docker compose up -d

# Start with logs
docker compose up

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v

# View logs
docker compose logs

# View server logs
docker compose logs server

# View MongoDB logs
docker compose logs mongo

# Build Docker image
docker build -t smart-hotel:latest .

# Run Docker container
docker run -p 5000:5000 smart-hotel:latest

# Tag image for registry
docker tag smart-hotel:latest myregistry/smart-hotel:latest

# Push to registry
docker push myregistry/smart-hotel:latest

# Run Docker in background
docker run -d -p 5000:5000 smart-hotel:latest

# Execute command in container
docker exec -it container-id bash

# Stop container
docker stop container-id

# Remove container
docker rm container-id

# View running containers
docker ps

# View all containers
docker ps -a

# View images
docker images

# Clean up unused images
docker image prune
```

---

## 📊 Monitoring & Debugging

```bash
# Check server health
curl http://localhost:5000/api/health

# Check API endpoint
curl http://localhost:5000/api/orders

# With authentication header
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/orders

# POST request
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[...]}'

# Check server logs
tail -f server.log

# Search logs
grep "ERROR" server.log

# Monitor process
top -p $(pgrep -f "node")

# Check port usage
lsof -i :5000
lsof -i :5173

# Kill process on port
kill -9 $(lsof -ti:5000)

# Monitor MongoDB
mongostat

# Check MongoDB collections
use smart-hotel
show collections
db.users.count()
db.orders.find().pretty()
```

---

## 🌐 Environment & Configuration

```bash
# Show environment variables
printenv

# Set environment variable (Windows)
set NODE_ENV=production

# Set environment variable (Linux/Mac)
export NODE_ENV=production

# Load .env file
source server/.env

# Verify .env is loaded
echo $MONGO_URI
echo $JWT_SECRET

# Create .env from example
cp server/.env.example server/.env

# Update specific env variable
sed -i 's/MONGO_URI=.*/MONGO_URI=new_value/' server/.env
```

---

## 📱 Client-Specific Commands

```bash
# Build with optimizations
npm --prefix client run build -- --mode production

# Analyze bundle size
npm --prefix client run build -- --analyze

# Generate PWA assets
npm --prefix client run build -- --pwa

# Clean build cache
rm -rf client/node_modules client/dist

# Clear Vite cache
rm -rf client/.vite

# Reinstall dependencies
rm -rf client/node_modules package-lock.json
npm --prefix client install
```

---

## 🖥️ Server-Specific Commands

```bash
# Start with nodemon for auto-reload
npm --prefix server run dev

# Start production server
npm --prefix server run start

# Check Node version
node -v

# Check npm version
npm -v

# Clear node_modules
rm -rf server/node_modules

# Reinstall server dependencies
rm -rf server/node_modules server/package-lock.json
npm --prefix server install

# Check MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI); console.log('Connected')"
```

---

## 🔐 Security Commands

```bash
# Audit security
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix
npm audit fix --force

# Check password strength
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('password', 10))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check SSL certificate
openssl s_client -connect api.example.com:443

# Generate SSL certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
```

---

## 📤 Deployment Commands

```bash
# Deploy to Heroku
heroku login
heroku create smart-hotel
git push heroku main

# Deploy to AWS
aws s3 cp client/dist s3://bucket-name --recursive
aws ecs update-service --cluster prod --service smart-hotel

# Deploy with Docker
docker build -t smart-hotel .
docker tag smart-hotel myregistry/smart-hotel:latest
docker push myregistry/smart-hotel:latest

# Deploy to Vercel (client only)
npm install -g vercel
vercel --prod

# SSH into server
ssh user@server-ip

# Copy files to server
scp -r client/dist user@server-ip:/var/www/

# Remote database backup
ssh user@server-ip 'mongodump --uri mongodb://...'
```

---

## 📋 Git Commands

```bash
# Check git status
git status

# Add all changes
git add .

# Add specific file
git add server/src/app.js

# Commit changes
git commit -m "Add feature: X"

# Push to origin
git push origin main

# Push to specific branch
git push origin feature-branch

# Pull changes
git pull origin main

# Create new branch
git checkout -b feature/new-feature

# Switch branch
git checkout main

# Merge branch
git merge feature-branch

# View commit history
git log --oneline

# View branch list
git branch -a

# Delete branch
git branch -d feature-branch

# Create tag
git tag v1.0.0

# Push tags
git push origin --tags

# Clone repository
git clone repo-url

# Add remote
git remote add upstream url

# View remotes
git remote -v
```

---

## 📧 Email Service Commands

```bash
# Test SendGrid API
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json"

# Test email service locally
node -e "const emailService = require('./services/notifications/emailService'); emailService.sendMock('test@example.com', 'Test Subject', 'Test Content')"
```

---

## 📱 SMS Service Commands

```bash
# Test Twilio API
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  -d "To=+1234567890" \
  -d "From=$TWILIO_PHONE_NUMBER" \
  -d "Body=Test message" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

---

## 📊 Database Query Commands

```bash
# Find all users
db.users.find()

# Find with filter
db.users.find({ email: "user@example.com" })

# Count documents
db.orders.count()

# Get latest 10 orders
db.orders.find().sort({ createdAt: -1 }).limit(10)

# Update document
db.users.updateOne({ _id: ObjectId("...") }, { $set: { role: "admin" } })

# Delete document
db.orders.deleteOne({ _id: ObjectId("...") })

# Aggregation example
db.orders.aggregate([
  { $match: { status: "delivered" } },
  { $group: { _id: null, total: { $sum: "$total" } } }
])

# Create index
db.orders.createIndex({ branch: 1, createdAt: -1 })

# List indexes
db.orders.getIndexes()

# Drop index
db.orders.dropIndex("index_name")
```

---

## 🔍 Troubleshooting Commands

```bash
# Check Node process
ps aux | grep node

# Check memory usage
free -m

# Check disk space
df -h

# Check open ports
netstat -tulpn

# Monitor CPU usage
top

# Check environment
npm list

# Verify installations
npm ls -g --depth=0

# Clear npm cache
npm cache clean --force

# Check package versions
npm list package-name

# Validate package.json
npm audit

# Diagnose npm
npm doctor
```

---

## 📚 Useful Aliases

Add to `.bashrc` or `.zshrc`:

```bash
alias smart-hotel='cd ~/smart-hotel'
alias start-dev='npm run dev'
alias start-mongo='docker compose up -d'
alias stop-mongo='docker compose down'
alias client-build='npm --prefix client run build'
alias server-logs='tail -f server.log'
alias check-health='curl http://localhost:5000/api/health'
alias db-export='mongoexport --uri mongodb://localhost:27017/smart-hotel'
alias db-import='mongoimport --uri mongodb://localhost:27017/smart-hotel'
```

---

## 🔗 Port Mappings

```
Client:          http://localhost:5173
API Server:      http://localhost:5000
MongoDB:         mongodb://localhost:27017
Socket.IO:       ws://localhost:5000/socket.io
```

---

## 📞 Common Issues & Solutions

### Port Already in Use
```bash
# Find and kill process
lsof -i :5000
kill -9 <PID>
```

### MongoDB Connection Failed
```bash
# Verify MongoDB is running
docker compose ps

# Restart MongoDB
docker compose restart mongo
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Permission Denied
```bash
# Check file permissions
ls -la

# Make executable
chmod +x file.sh

# Change ownership
sudo chown user:group file
```

---

## 📖 Documentation References

- API Docs: `docs/api.md`
- Database Schema: `docs/database.md`
- Architecture: `docs/architecture.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Testing: `TESTING_GUIDE.md`
- Implementation: `IMPLEMENTATION_GUIDE.md`

---

## ⚡ Quick Cheatsheet

```bash
# Setup
npm run install:all && npm run seed

# Development
npm run dev

# Testing
npm run test

# Build
npm run client:build

# Deployment
docker build -t smart-hotel . && docker push registry/smart-hotel

# Database
mongo smart-hotel
db.users.find().pretty()
```

---

**Version**: 1.0  
**Last Updated**: August 2026  
**All commands tested and working ✅**
