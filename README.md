# 🔍 LostLink — Smart Digital Lost & Found System

LostLink is a comprehensive full-stack MERN (MongoDB, Express, React, Node.js) application designed to help people recover lost items and report found items efficiently. Featuring automated smart item matching, secure ownership verification via hashed answers, community reputation system, image uploads, and admin management, LostLink bridges the gap between lost belongings and their rightful owners.

**Live Demo:** [https://lost-link-team-frontend.vercel.app](https://lost-link-team-frontend.vercel.app)  
**Backend API:** [https://lost-link-team-backend.vercel.app](https://lost-link-team-backend.vercel.app)

---

## ✨ Core Features

### 🔐 **Authentication & Authorization**
- Secure JWT-based registration and login
- Bcrypt password hashing with salt rounds
- Admin role-based access control
- Firebase authentication support
- Session persistence with local storage

### 📋 **Lost & Found Item Posting**
- Post items with title, category, description, location, date, and custom verification questions
- Optional image upload to Cloudinary with auto-optimization
- Support for categories: Documents, Wallet, Keys, Electronics, Bags, Clothing, Accessories, Books, ID Card, Other
- Item status tracking: `open`, `match_suggested`, `claim_pending`, `verified`, `returned`, `closed`

### 🔎 **Real-Time Search & Filtering**
- Filter posts by type (`lost` / `found`), category, status, or keyword
- Search across title, description, category, and location
- Case-insensitive regex filtering for flexible searching

### 🤖 **Automated Smart Matching Algorithm**
Intelligent weighted matching engine that compares items based on:
- **Category Match**: 35% weight (exact category match)
- **Description Similarity**: 25% weight (token-based similarity)
- **Title Similarity**: 15% weight (keyword overlap)
- **Location Proximity**: 15% weight (location token matching)
- **Date Proximity**: 10% weight (event date window: 7 days)

Returns match percentage score (0-100) with human-readable reasons for each match.

### 🛡️ **Secure Verification & Claiming**
- Original posters set custom verification questions (e.g., "What color was the wallet?")
- Claimants must answer correctly to verify ownership
- Bcrypt hash comparison ensures secure verification
- Prevents unauthorized item claims

### ⭐ **Community Reputation System**
- User trust scores based on activity and ratings
- Rating system (1-5 stars) with comments
- Fraud reporting mechanism
- Trust badges: "Unverified", "Verified Member", "Trusted Finder", "Community Champion", "High Risk"
- Automatic trust calculation based on verified reports, successful returns, verified claims, average rating, and fraud reports

### 👨‍💼 **Admin Control Panel**
- Dashboard with statistics (total users, items, claims, status breakdown)
- User management and monitoring
- Item moderation (view, delete, update status)
- Reputation monitoring
- Full oversight of community activity

### 🖼️ **Cloud Image Storage**
- Integrated Cloudinary for image uploads
- Multer memory storage buffer
- Automatic image optimization and formatting
- WebP and JPEG support with auto quality
- Secure public ID tracking

### 🔒 **Security & Error Handling**
- Helmet security headers (CSP, HSTS, XSS protection)
- CORS origin whitelisting
- Database connection fault tolerance with retry logic
- Graceful error handling and user-friendly error messages
- JWT token expiration (7-day default)
- Rate limiting ready for production deployment

---

## 🛠️ Tech Stack

### **Backend**
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | Latest |
| Framework | Express.js | ^4.21.2 |
| Database | MongoDB | Mongoose ^8.8.4 |
| Authentication | JWT | jsonwebtoken ^9.0.2 |
| Password Hashing | Bcrypt | bcryptjs ^2.4.3 |
| File Upload | Multer | ^2.0.0 |
| Cloud Storage | Cloudinary | ^2.5.1 |
| Security | Helmet | ^8.0.0 |
| CORS | cors | ^2.8.5 |
| Logging | Morgan | ^1.10.0 |
| ENV Config | dotenv | ^16.4.5 |

### **Frontend**
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | ^18.3.1 |
| Build Tool | Vite | ^5.4.10 |
| Styling | Tailwind CSS | ^3.4.15 |
| HTTP Client | Fetch API | Native |
| Auth | Firebase | ^12.18.0 |
| CSS Preprocessing | PostCSS | ^8.4.49 |
| Auto-prefixer | Autoprefixer | ^10.4.20 |

---

## 📁 Project Structure

```
LostLink_Team/
│
├── backend/                          # Express.js Backend Server
│   ├── config/
│   │   ├── cloudinary.js            # Cloudinary configuration & SDK setup
│   │   ├── cloudinaryUpload.js      # (Legacy) Image upload handler
│   │   └── multer.js                # Memory storage config & file filter
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── cloudinary.js        # Cloudinary v2 API initialization
│   │   │   ├── db.js                # MongoDB connection with retry logic
│   │   │   └── multer.js            # Multer configuration for multipart/form-data
│   │   │
│   │   ├── controllers/
│   │   │   └── itemController.js    # Item CRUD & matching logic
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT verification & admin check
│   │   │   └── adminMiddleware.js   # Admin role protection
│   │   │
│   │   ├── models/
│   │   │   ├── User.js              # User schema with reputation fields
│   │   │   ├── Item.js              # Lost/Found item schema
│   │   │   └── Claim.js             # Claim verification schema
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # POST /register, /login, GET /me
│   │   │   ├── itemRoutes.js        # GET/POST items, GET matches
│   │   │   ├── claimRoutes.js       # POST claims, GET claims, PATCH complete
│   │   │   ├── adminRoutes.js       # Admin stats, users, items management
│   │   │   └── reputationRoutes.js  # GET user profile, POST rating, fraud report
│   │   │
│   │   └── utils/
│   │       └── matchScore.js        # Smart matching algorithm
│   │
│   ├── server.js                    # Express app initialization & routes
│   ├── test-mongo.js                # MongoDB connection test utility
│   ├── .env                         # Environment variables (git ignored)
│   ├── .env.example                 # Environment template
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json                  # Vercel serverless deployment config
│
├── frontend/                         # React Vite SPA
│   ├── src/
│   │   ├── App.jsx                  # Main component with all UI views
│   │   ├── firebase.js              # Firebase initialization
│   │   ├── main.jsx                 # React entry point
│   │   ├── styles.css               # Tailwind + custom CSS
│   │   └── env.d.ts                 # TypeScript env type definitions
│   │
│   ├── public/                      # Static assets
│   ├── index.html                   # HTML template
│   ├── .env                         # Environment variables (git ignored)
│   ├── .env.example                 # Environment template
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── postcss.config.js            # PostCSS plugins config
│   ├── vercel.json                  # Vercel SPA routing config
│   └── eslint.config.mjs            # ESLint configuration
│
├── eslint.config.mjs                # Project-wide ESLint config
├── README.md                        # This file
└── .gitignore                       # Git ignore patterns
```

---

## ⚙️ Environment Variables

### **Backend Configuration** (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lostlink?retryWrites=true&w=majority

# JWT Security
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Frontend CORS
CLIENT_URL=https://lost-link-team-frontend.vercel.app
BACKEND_URL=https://lost-link-team-backend.vercel.app
FRONTEND_URL=https://lost-link-team-frontend.vercel.app

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin Account
ADMIN_EMAIL=admin@lostlink.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=System Administrator
```

### **Frontend Configuration** (`frontend/.env`)

```env
# API Endpoint
VITE_API_URL=https://lost-link-team-backend.vercel.app/api
BACKEND_URL=https://lost-link-team-backend.vercel.app
FRONTEND_URL=https://lost-link-team-frontend.vercel.app
```

---

## 📡 API Endpoints Reference

### **Health & Status**
```
GET /                                    # API info & endpoint list
GET /api/health                          # Health check (database status)
```

### **Authentication** (`/api/auth`)
```
POST   /api/auth/register                # Register new user
POST   /api/auth/login                   # Login with email/password
POST   /api/auth/firebase-login          # Login via Firebase
GET    /api/auth/me                      # Get current user profile (Auth required)
```

### **Items** (`/api/items`)
```
GET    /api/items                        # List all items (filters: ?search, ?type, ?category, ?status)
POST   /api/items                        # Create new item (Auth required, multipart/form-data)
GET    /api/items/:id                    # Get item details
GET    /api/items/:id/matches            # Get smart matched items for this item
```

### **Claims** (`/api/claims`)
```
POST   /api/claims/:itemId               # Submit verification answer (Auth required)
GET    /api/claims/item/:itemId          # Get all claims for an item (Auth required)
PATCH  /api/claims/:claimId/complete     # Mark claim as complete (Auth required)
```

### **Admin** (`/api/admin`)
```
GET    /api/admin/stats                  # Dashboard statistics (Admin only)
GET    /api/admin/users                  # List all users (Admin only)
GET    /api/admin/items                  # List all items (Admin only)
DELETE /api/admin/items/:id              # Delete item (Admin only)
PATCH  /api/admin/items/:id/status       # Update item status (Admin only)
```

### **Reputation** (`/api/reputation`)
```
GET    /api/reputation/user/:id          # Get user profile & reputation (Auth required)
POST   /api/reputation/rate              # Rate a user (Auth required)
POST   /api/reputation/report-fraud      # Report user as fraudulent (Auth required)
```

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB Atlas** account ([Create free cluster](https://www.mongodb.com/cloud/atlas))
- **Cloudinary** account ([Free tier](https://cloudinary.com/))
- **Git** ([Download](https://git-scm.com/))

### **Installation & Local Setup**

#### 1. **Clone Repository**
```bash
git clone https://github.com/your-username/LostLink_Team.git
cd LostLink_Team
```

#### 2. **Backend Setup**
```bash
cd backend
npm install
```

Create `.env` file in `backend/` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://your_user:your_password@your_cluster.mongodb.net/lostlink?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_EMAIL=admin@lostlink.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=System Administrator
```

Start backend server:
```bash
npm start              # Production mode
# or
npm run dev           # Development with nodemon
```

Server runs on `http://localhost:5000`

#### 3. **Frontend Setup**
```bash
cd ../frontend
npm install
```

Create `.env` file in `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

Start frontend dev server:
```bash
npm run dev
```

App opens at `http://localhost:5173`

#### 4. **Test the App**
```bash
# Test backend health
curl http://localhost:5000/api/health

# Register a test user (frontend UI or API call)
# Login with registered email/password
# Create lost/found items
# Test smart matching & claims
```

---

## 🌍 Deployment to Vercel

### **Backend Deployment**

1. **Push to GitHub** with `vercel.json` in backend root:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

2. **Import Project in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select GitHub repository
   - Set root directory to `backend/`
   - Add environment variables (MONGO_URI, JWT_SECRET, etc.)
   - Click "Deploy"

3. **Backend URL**: `https://lost-link-team-backend.vercel.app`

### **Frontend Deployment**

1. **Update `.env`** to point to deployed backend:
```env
VITE_API_URL=https://lost-link-team-backend.vercel.app/api
```

2. **Import Project in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select GitHub repository
   - Set root directory to `frontend/`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Click "Deploy"

3. **Frontend URL**: `https://lost-link-team-frontend.vercel.app`

---

## 🧪 Testing

### **Test with Admin Account**
- Email: `admin@lostlink.com`
- Password: `admin123`

Access admin dashboard to view:
- User statistics
- All items & claims
- Item moderation
- User reputation monitoring

### **API Testing** (using curl or Postman)

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"pass123"}'
```

**Create Item:**
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "type=lost" \
  -F "title=Blue Wallet" \
  -F "category=Wallet" \
  -F "description=Lost blue leather wallet" \
  -F "location=Campus Gate A" \
  -F "eventDate=2024-09-01" \
  -F "verificationQuestion=What card was inside?" \
  -F "verificationAnswer=driver's license" \
  -F "image=@/path/to/image.jpg"
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| **MongoDB connection fails** | Verify MONGO_URI, check IP whitelist in MongoDB Atlas, ensure network access |
| **Cloudinary uploads fail** | Confirm API key/secret, check account status, verify folder permissions |
| **400 Bad Request on item creation** | Ensure all required fields are filled, verify FormData format, check Content-Type |
| **401 Unauthorized** | Token expired, re-login to get fresh token, check Authorization header format |
| **CORS errors** | Verify CLIENT_URL matches frontend origin, check allowed origins in server.js |
| **Frontend shows wrong API URL** | Hard refresh (Ctrl+Shift+R), clear browser cache, verify .env file is loaded |

---

## 📝 Sample Data & Workflows

### **Workflow 1: Post a Lost Item**
1. Register/Login
2. Click "Report Lost Item"
3. Fill form: type, title, category, description, location, date, verification question
4. Upload photo (optional)
5. Submit — item appears in feed with `open` status

### **Workflow 2: Find Matching Found Item**
1. View posted lost item
2. System shows matching found items (smart algorithm)
3. Each match shows score (0-100) and reasons
4. Click "View Match" to see details

### **Workflow 3: Claim an Item**
1. Find desired item in feed
2. Click "Claim Item"
3. Answer owner's verification question
4. If correct: claim moves to `verified` status, item marked `returned`
5. Original owner can now arrange return

### **Workflow 4: Rate Community Member**
1. View user's profile via claimed item or match
2. Click "Rate User"
3. Enter 1-5 star rating + optional comment
4. User's reputation score updates dynamically

---

## 🚨 Security Best Practices

✅ **Implemented**:
- JWT tokens with 7-day expiration
- Bcrypt password hashing with 10 salt rounds
- Verification answer hashing (bcrypt)
- CORS origin whitelisting
- Helmet security headers
- Environment variable protection (.env not in git)

⚠️ **Production Recommendations**:
- Use strong JWT_SECRET (min 32 characters)
- Enable HTTPS/TLS on all endpoints
- Implement rate limiting on auth endpoints
- Add request validation middleware
- Enable MongoDB IP whitelisting
- Regular security audits
- Monitor error logs for suspicious activity

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team & Support

**Project**: LostLink - Smart Lost & Found System  
**Event**: ATP Hackathon 1  
**Repository**: [LostLink_Team](https://github.com/your-username/LostLink_Team)  

For support, questions, or feedback, please open a GitHub issue or contact the team.

---

**Last Updated**: September 2026  
**Status**: ✅ Production Ready  
**Live**: https://lost-link-team-frontend.vercel.app
