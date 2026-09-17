# 🤖 Meta WhatsApp Cloud API Payment Gateway (PayVista)

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Meta Cloud API](https://img.shields.io/badge/Meta_WhatsApp_Cloud_API-v18.0-0467DF?style=for-the-badge&logo=meta&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)

A production-ready, full-stack payment link generator and dispatcher built with **Node.js, Express, and Meta's Official WhatsApp Cloud API (`v18.0`)**.

Designed for modern FinTech merchants to create dynamic payment requests and dispatch automated WhatsApp messages & receipts directly to customers.

---

## 🌟 Key Engineering Features

- **Official Meta WhatsApp Cloud API Integration**: Directly communicates with Meta Graph API endpoints (`graph.facebook.com/v18.0`) using OAuth bearer tokens and Phone Number IDs.
- **Smart Template Fallback System**: Automatically detects Meta 24-hour customer window policies (Error 131000/131047) and falls back to pre-approved WhatsApp templates seamlessly.
- **Real-Time Analytics & Metrics API**: Live backend metrics calculation endpoint (`/api/analytics`) tracking Total Volume (₹), Dispatched Count, and Payment Conversion Rates (%).
- **Interactive FinTech Merchant Dashboard**: Includes real-time status tracking (`Pending`, `Sent via Meta API`, `Paid`), search & filter bar, quick presets, and API credentials management.
- **Hosted Payment Checkout Simulator (`/pay/:id`)**: Full customer checkout page supporting UPI QR Codes, Credit/Debit Cards, and Netbanking simulation.

---

## 🏗️ System Architecture

```text
┌─────────────────────────┐        HTTP POST        ┌──────────────────────────────┐
│  Merchant Dashboard UI  ├────────────────────────►│ Express.js Backend Server    │
└─────────────────────────┘                         └──────────────┬───────────────┘
                                                                   │
                                                OAuth Bearer / POST│ graph.facebook.com
                                                                   ▼
┌─────────────────────────┐      WhatsApp Message   ┌──────────────────────────────┐
│  Customer Mobile Phone  │◄────────────────────────┤  Meta WhatsApp Cloud API     │
└─────────────────────────┘                         └──────────────────────────────┘
```

---

## ⚡ Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/abhishek-0512/payment-integration.git
cd payment-integration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
BASE_URL=http://localhost:3000

# Meta WhatsApp Cloud API Credentials
WHATSAPP_PHONE_NUMBER_ID=1330521036802982
WHATSAPP_CLOUD_API_TOKEN=YOUR_META_ACCESS_TOKEN
```

### 4. Start the Application
```bash
npm start
```
The merchant dashboard will be accessible at: **`http://localhost:3000`**

---

## 💻 API Documentation

### 1. Create & Dispatch Payment Request
```http
POST /api/payment-links
Content-Type: application/json

{
  "customerName": "Abhishek",
  "customerPhone": "916386252355",
  "amount": 1499.00,
  "currency": "INR",
  "description": "Annual Cloud Subscription"
}
```

### 2. Get Analytics Metrics Summary
```http
GET /api/analytics
```
**Response**:
```json
{
  "success": true,
  "data": {
    "totalRequests": 3,
    "totalVolume": 4749,
    "paidVolume": 1499,
    "totalPaidCount": 1,
    "totalDispatchedCount": 2,
    "conversionRate": 33
  }
}
```

### 3. Resend WhatsApp API Dispatch
```http
POST /api/payment-links/:id/trigger-whatsapp
```

### 4. Complete Customer Checkout
```http
POST /api/payment-links/:id/pay
```

---

## 🛡️ Security & Best Practices

- `.env` and sensitive access tokens are strictly ignored from source control via [`.gitignore`](file:///Users/abhishek/Desktop/paymentIntegration/.gitignore).
- Sanitizes and validates phone numbers and payment amounts against SQL/XSS injections.

---

## 📜 License

Distributed under the **MIT License**. Free for commercial and portfolio use.
