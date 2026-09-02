# 🔍 LostLink — Smart Digital Lost & Found System

LostLink is a full-stack MERN application designed to help people recover lost items and report found items efficiently. Featuring automated smart item matching, secure ownership verification via hashed answers, and image upload capabilities, LostLink bridges the gap between lost belongings and their rightful owners.

---

## ✨ Features

- 🔐 **Authentication & Authorization**: Secure JWT-based registration and login with bcrypt password hashing.
- 📋 **Lost & Found Item Posting**: Easily post items lost or found with title, category, description, location, date, optional image, and custom verification questions.
- 🔎 **Real-Time Search & Filtering**: Filter posts by type (`lost` / `found`), category, status (`open`, `match_suggested`, `claim_pending`, `verified`, `returned`, `closed`), or keyword search (title, description, location, category).
- 🤖 **Automated Smart Matching Algorithm**: Intelligent weighted matching engine (`matchScore.js`) that compares lost posts with candidate found posts based on 5 key parameters:
  - **Category Match**: 35% weight
  - **Description Similarity**: 25% weight
  - **Title Similarity**: 15% weight
  - **Location Proximity**: 15% weight
  - **Date Proximity**: 10% weight
  - Returns match percentage score along with human-readable match reasons (e.g., *"same category"*, *"nearby location"*).
- 🛡️ **Verification Question & Claiming System**: Original posters configure verification questions for their items. Claimants must answer correctly (evaluated using bcrypt hash comparison) to verify ownership.
- 🖼️ **Cloud Image Storage**: Integrated with Cloudinary via Multer memory buffer for automated image upload, formatting, and optimization.
- 🔒 **Security & Error Resilience**: Protected with Helmet security headers, CORS origin whitelisting, database connection fault tolerance, and graceful error handling.

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Token (JWT), BcryptJS
- **File Handling**: Multer & Cloudinary SDK
- **Security & Logging**: Helmet, CORS, Morgan, Dotenv

### **Frontend**
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **HTTP**: Fetch API with JWT Bearer Token integration

---

## 📁 Project Structure

```text
LostLink_Team/
├── backend/
│   ├── config/              # MongoDB connection & Cloudinary setup
│   │   ├── db.js
│   │   └── cloudinary.js
│   ├── src/
│   │   ├── controllers/     # Business logic (itemController.js)
│   │   ├── middleware/      # Auth middleware & Multer file parser
│   │   ├── models/          # Mongoose schemas (User, Item, Claim)
│   │   ├── routes/          # Express API endpoints (auth, items, claims)
│   │   └── utils/           # Match scoring engine (matchScore.js)
│   ├── server.js            # Express server entry point
│   ├── package.json
│   └── vercel.json          # Serverless deployment configuration
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React SPA & component views
│   │   ├── styles.css       # Tailwind & custom CSS rules
│   │   └── main.jsx         # React application entry
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── vercel.json          # Single Page Application deployment configuration
└── README.md
```

---

## ⚙️ Environment Variables

### **Backend (`backend/.env`)**

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `MONGO_URI` | MongoDB connection URI | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT signing | `your_jwt_secret_key` |
| `CLIENT_URL` | Frontend URL for CORS permission | `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your_api_secret` |

### **Frontend (`frontend/.env`)**

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000` |

---

## 📡 API Endpoints

### **Health Check**
- `GET /api/health` — Public endpoint to verify API and MongoDB status.

### **Authentication (`/api/auth`)**
- `POST /api/auth/register` — Register a new user (`name`, `email`, `password`).
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `GET /api/auth/me` — Fetch current logged-in user profile (Requires Auth).

### **Items (`/api/items`)**
- `GET /api/items` — Fetch all posts with optional filters (`?search=`, `?type=`, `?category=`, `?status=`).
- `POST /api/items` — Create a lost/found post with image upload (Requires Auth, `multipart/form-data`).
- `GET /api/items/:id` — Fetch details for a specific item.
- `GET /api/items/:id/matches` — Get suggested opposite-type items with match scores & reasons.

### **Claims (`/api/claims`)**
- `POST /api/claims/:itemId` — Submit verification answer to claim an item (Requires Auth).
- `GET /api/claims/item/:itemId` — Get all claim attempts for a specific item (Requires Auth).
- `PATCH /api/claims/:claimId/complete` — Mark claim completion and update item status (Requires Auth).

---

## 🚀 Getting Started

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database connection
- [Cloudinary](https://cloudinary.com/) account (for image upload support)

### **Installation & Setup**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/LostLink_Team.git
   cd LostLink_Team
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file inside `backend/`:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lostlink
   JWT_SECRET=supersecretkey123
   CLIENT_URL=http://localhost:5173
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file inside `frontend/`:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

---

## 💻 Running the Application

1. **Start the Backend server**:
   ```bash
   cd backend
   npm run dev
   ```
   The backend running on `http://localhost:5000`.

2. **Start the Frontend client**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🌐 Deployment

Both frontend and backend include `vercel.json` configurations ready for serverless deployment on [Vercel](https://vercel.com).

- **Backend Vercel Config**: Sets up Express serverless functions mapping all `/api/*` routes.
- **Frontend Vercel Config**: Handles Single Page Application routing rewrites.