# 🎥 Video Transcoding Reporter

A comprehensive automated reporting system for video transcoding jobs that fetches data from **Drive** and **WAC configs**, generates detailed reports (HTML + CSV), and sends them via **AWS SES**.

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=Video+Transcoding+Dashboard)

---

## 🚀 Features

- **Real-time Dashboard**: Beautiful web interface with live statistics and data tables
- **Automated Reports**: Generates summary + detailed table for transcoding jobs
- **Email Notifications**: Sends HTML reports with CSV attachments via AWS SES
- **Flexible Scheduling**: Supports interval-based or cron-style scheduling
- **Performance Optimized**: Server-side caching with 2-minute refresh intervals
- **REST API**: Complete API for monitoring and manual triggers
- **Email Management**: Web interface for managing recipients and BCC lists
- **Dockerized**: Easy deployment with Docker and Docker Compose

---

## 📋 Prerequisites

Before setting up the application, ensure you have:

### Required Software
- **Node.js** (v18 or higher)
- **MongoDB** (v5.0 or higher)
- **Docker & Docker Compose** (for containerized deployment)

### Required Services
- **AWS SES Account** with SMTP credentials
- **MongoDB Databases**:
  - WAC Config Production Database
  - Drive Production Database

### Environment Variables
You'll need the following environment variables configured:

```bash
# MongoDB Connection Strings
MONGO_DB_URL_WAC_PROD=mongodb://username:password@host:port/wac-config-prod
MONGO_DB_URL_DRIVE_PROD=mongodb://username:password@host:port/drive-prod

# AWS SES SMTP Configuration
AWS_SES_SMTP_USER=your-ses-smtp-username
AWS_SES_SMTP_PASS=your-ses-smtp-password
AWS_SES_HOST=email-smtp.region.amazonaws.com
AWS_SES_PORT=587

# Scheduling Configuration
SCHEDULE_MODE=interval  # or 'cron'
SCHEDULE_TYPE=minutes   # minutes, hours, daily
SCHEDULE_VALUE=5        # interval value
# OR for cron mode:
# CRON_EXPRESSION=0 */4 * * *

# Application Configuration
PORT=4000
NAMESPACE_JK=local      # or 'prod', 'staging'
EMAIL_SUBJECT=Video Transcoding Report (Automated)
```

---

## 🛠️ Installation & Setup

### Method 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd video-transcoding-reporter
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Configure your environment variables**
   ```bash
   nano .env.local
   ```

4. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Verify deployment**
   ```bash
   docker logs transcoding-reporter
   ```

### Method 2: Manual Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd video-transcoding-reporter
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start the application**
   ```bash
   npm run server
   ```

---

## 🔧 Configuration

### Database Setup

Ensure your MongoDB databases have the required collections:

**WAC Config Database:**
```javascript
// Collection: wac_configs
{
  videoAppId: String,
  appName: String,
  appUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Drive Database:**
```javascript
// Collection: drives
{
  videoAppId: ObjectId,
  title: String,
  encodeId: String,
  videoMetadata: {
    duration: Number,
    size: Number
  },
  webhookResponse: {
    status: String, // 'success', 'failed', 'in-progress', 'in-queue'
    sourceUrl: String
  },
  createdAt: Date
}
```

### AWS SES Setup

1. **Create AWS SES Account**
   - Go to AWS SES Console
   - Verify your sender email domain
   - Create SMTP credentials

2. **Configure SMTP Settings**
   ```bash
   AWS_SES_SMTP_USER=AKIA...
   AWS_SES_SMTP_PASS=your-smtp-password
   AWS_SES_HOST=email-smtp.ap-south-1.amazonaws.com
   ```

### Scheduling Options

**Interval Mode:**
```bash
SCHEDULE_MODE=interval
SCHEDULE_TYPE=minutes
SCHEDULE_VALUE=30  # Every 30 minutes
```

**Cron Mode:**
```bash
SCHEDULE_MODE=cron
CRON_EXPRESSION=0 9,13,17 * * *  # 9 AM, 1 PM, 5 PM daily
```

---

## 📡 API Documentation

### Dashboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Welcome page |
| `GET` | `/report` | Dashboard interface |
| `GET` | `/api/report` | Report data (JSON) |

### Email Management

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `GET` | `/emails` | Get recipients list | - |
| `POST` | `/emails/add` | Add recipients | `{"recipients": ["email@example.com"], "bcc": ["manager@example.com"]}` |
| `POST` | `/emails/remove` | Remove recipients | `{"recipients": ["email@example.com"]}` |
| `GET` | `/email` | Email management UI | - |

### Example API Calls

```bash
# Get current recipients
curl http://localhost:4000/emails

# Add recipients
curl -X POST http://localhost:4000/emails/add \
  -H "Content-Type: application/json" \
  -d '{"recipients":["user@example.com"], "bcc":["manager@example.com"]}'

# Remove recipients
curl -X POST http://localhost:4000/emails/remove \
  -H "Content-Type: application/json" \
  -d '{"recipients":["user@example.com"]}'

# Get report data
curl http://localhost:4000/api/report
```

---

## 🚀 Deployment

### Production Deployment

1. **Update environment for production**
   ```bash
   cp .env.local .env.prod
   # Update with production database URLs and settings
   ```

2. **Deploy with production settings**
   ```bash
   NAMESPACE_JK=prod docker-compose up -d
   ```

3. **Set up reverse proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:4000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Health Monitoring

The application provides several monitoring endpoints:

- **Dashboard**: `http://your-domain.com/report`
- **API Health**: `http://your-domain.com/api/report`
- **Email Management**: `http://your-domain.com/email`

---

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check MongoDB connectivity
mongo "mongodb://your-connection-string"

# Verify environment variables
docker exec transcoding-reporter env | grep MONGO
```

**Email Sending Failed**
```bash
# Test AWS SES credentials
aws ses verify-email-identity --email-address your-email@domain.com

# Check SMTP settings
telnet email-smtp.region.amazonaws.com 587
```

**Performance Issues**
```bash
# Check database indexes
db.drives.getIndexes()
db.wac_configs.getIndexes()

# Monitor query performance
db.drives.explain("executionStats").find({createdAt: {$gte: new Date()}})
```

### Logs and Debugging

```bash
# View application logs
docker logs transcoding-reporter -f

# Check specific errors
docker logs transcoding-reporter 2>&1 | grep ERROR

# Monitor performance
docker stats transcoding-reporter
```

---

## 📊 Performance Optimization

The application includes several performance optimizations:

- **Database Indexing**: Compound indexes on frequently queried fields
- **Server-side Caching**: 2-minute cache refresh intervals
- **Query Optimization**: Aggregation pipelines with limits
- **Memory Management**: Efficient data processing and cleanup

### Recommended Database Indexes

```javascript
// drives collection
db.drives.createIndex({ "createdAt": -1 })
db.drives.createIndex({ "webhookResponse.status": 1 })
db.drives.createIndex({ "videoAppId": 1 })
db.drives.createIndex({ "createdAt": -1, "webhookResponse.status": 1 })

// wac_configs collection
db.wac_configs.createIndex({ "videoAppId": 1 })
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

For support and questions:

- **Email**: support@yourcompany.com
- **Documentation**: [Wiki](https://github.com/yourrepo/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourrepo/issues)

---

## 🔄 Changelog

### v1.0.0
- Initial release with dashboard and email reporting
- Docker support and automated scheduling
- Performance optimizations and caching
- Comprehensive API documentation