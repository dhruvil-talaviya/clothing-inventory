# 👕 Clothing Inventory Management System

A full-stack MERN web application to manage a clothing store's inventory, staff, billing, and point of sale operations — with a powerful Admin panel and dedicated Staff interface.

---

## 🚀 Features

### 🔐 Admin Panel
- 📊 **Sales Overview** — Monitor all sales and revenue in real-time
- 📦 **Product Management** — Add, update, and delete clothing products
- 🗃️ **Stock Management** — Track and manage stock levels
- 🏷️ **Coupon Management** — Create and manage discount coupons
- 🧑‍💼 **Staff Account Management** — Create and manage staff accounts

### 👨‍💼 Staff Dashboard
- 🛒 **POS (Point of Sale)** — Fast and easy in-store sales processing
- 📦 **Inventory View** — View available stock and product details
- 🧾 **Billing & Email** — Generate bills and send them to customers via email

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js, React Router |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **Email** | Nodemailer |

---

## 👥 Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — products, stock, coupons, staff, sales |
| **Staff** | POS, billing, inventory view |

---

## 📁 Project Structure
```
clothing-inventory/
├── backend/
│   └── utils/
│       └── sendBillEmail.js
├── fronted/
│   └── src/
│       ├── App.jsx
│       └── pages/
│           ├── StaffDashboard.jsx
│           └── staff/
│               └── POS.jsx
```

---

## ⚙️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/dhruviltalaviya/clothing-inventory.git
cd clothing-inventory
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Install frontend dependencies
```bash
cd fronted
npm install
```

### 4. Configure environment variables
Create a `.env` file in the `backend` folder:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
PORT=5000
```

### 5. Run the app

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd fronted
npm run dev
```

---

## 👨‍💻 Developer

**Dhruvil Talaviya**
[![GitHub](https://img.shields.io/badge/GitHub-dhruviltalaviya-black?logo=github)](https://github.com/dhruviltalaviya)
