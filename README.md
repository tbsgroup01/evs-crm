# EVS CRM & Case Management System

A production-ready business CRM and Case Management Web Application designed for enterprise workflows (Lead Upload, Counselor Action, Case Manager Allocation, Secure Document Verification, Pricing Package Locking, Payment Tracking, and Admin Reports).

## Technology Stack
- **Frontend**: React, Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod, Recharts, Lucide React.
- **Backend**: Node.js, Express, Sequelize ORM, MySQL, JWT authentication, bcrypt, Multer, Winston logging.

## Folder Structure

```
EVS-crm/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── UI.jsx          # Reusable tables, modales, input grids
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Login view with form validation
│   │   │   ├── Dashboards.jsx  # Admin, Counselor, Case Manager dashboards
│   │   │   ├── Leads.jsx       # Lead listings, forms, details, import wizard
│   │   │   ├── Cases.jsx       # Case profiles, payment ledgers, doc uploads
│   │   │   └── AdminPanels.jsx # User CRUD, activity logs, reports sheets
│   │   ├── App.jsx             # Router and global Auth context
│   │   └── main.jsx            # React bootstrap
│   └── package.json
└── server/                     # Express + Sequelize Backend
    ├── src/
    │   ├── config/             # DB env schemas and multer setups
    │   ├── controllers/        # CRUD and business transactions logic
    │   ├── middleware/         # Auth verify and role checking middlewares
    │   ├── migrations/         # 15 database tables migrations
    │   ├── models/             # Sequelize data mappings
    │   ├── routes/             # Scoped routing managers
    │   ├── seeders/            # Database seed data populator
    │   └── utils/              # Winston logger wrappers
    ├── ecosystem.config.js     # PM2 process script
    └── package.json
```

## Installation & Setup

### 1. Prerequisites
- Node.js LTS (v18+)
- MySQL Server (v8.0)

### 2. Backend Config
1. Create a `.env` file inside `server/` matching the parameters in `.env.example`:
   ```ini
   NODE_ENV=development
   PORT=5505
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=yourpassword
   DB_NAME=evs-crm
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   CLIENT_URL=http://localhost:5173
   ```
2. Install packages:
   ```bash
   cd server
   npm install
   ```
3. Initialize the database and run migrations/seeders:
   ```bash
   npx sequelize-cli db:create
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```
4. Run server:
   ```bash
   npm run dev
   ```

### 3. Frontend Config
1. Install packages:
   ```bash
   cd client
   npm install
   ```
2. Run client:
   ```bash
   npm run dev
   ```

## Production Deployment

### 1. PM2 Cluster Launch
Start the Node.js server in a background cluster process:
```bash
cd server
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

### 2. PM2 Commands
- **View logs**: `pm2 logs evs-crm-api`
- **View status**: `pm2 status`
- **Restart application**: `pm2 restart evs-crm-api`
- **Stop application**: `pm2 stop evs-crm-api`

### 3. Nginx Server Configuration (Reverse Proxy)
Add reverse proxy settings in your `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Static build
    location / {
        root /var/www/evs-crm/client/dist;
        index index.html;
        try_files $uri /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5505;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Database Backup & Restore

- **Daily Backup**:
  ```bash
  mysqldump -u root -p evs-crm > crm_backup_$(date +%F).sql
  ```
- **Restore Database**:
  ```bash
  mysql -u root -p evs-crm < crm_backup.sql
  ```
