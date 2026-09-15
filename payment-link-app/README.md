# PayLink Express - Production-Ready Payment Collection Web Application

PayLink Express is a production-ready, lightweight payment collection web application that enables merchants to enter customer details, generate secure payment links, trigger instant payment notifications via the official Meta WhatsApp Cloud API, process payments via Razorpay (with pluggable payment architecture), verify payments server-side with webhooks/HMAC signatures, and issue downloadable PDF receipts.

> [!IMPORTANT]
> **Zero Local WhatsApp / Zero Puppeteer / Zero Web Automation**: This application relies 100% on the official Meta WhatsApp Cloud API (`https://graph.facebook.com/v21.0/`). It does NOT use `whatsapp-web.js`, `baileys`, `venom-bot`, QR code logins, or local browser sessions. The merchant needs no WhatsApp running on their computer.

---

## 1. Core Architecture & Workflow

```text
                    MERCHANT WEBSITE
                           │
                    Create Payment
                           │
                           ▼
                    YOUR BACKEND
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
       Razorpay API              Meta WhatsApp
             │                  Cloud API
             │                           │
             │                           ▼
             │                    Customer WhatsApp
             │                           │
             │                    Click Payment Link
             │                           │
             ▼                           ▼
        Payment Gateway <────────── Payment Page
             │
             ▼
        Razorpay Webhook
             │
             ▼
        YOUR BACKEND
             │
             ▼
          MongoDB
             │
             ▼
       Payment SUCCESS
             │
             ▼
       Receipt Generator (PDFKit)
             │
             ▼
          PDF Receipt
```

---

## 2. Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons
- **Backend**: Node.js, Express.js, REST APIs
- **Database**: MongoDB with Mongoose
- **Payment Gateway**: Razorpay (Pluggable Provider Factory Pattern)
- **WhatsApp**: Official Meta WhatsApp Cloud API (Graph API v21.0)
- **Receipt Engine**: PDFKit (Server-Side Streamed PDF Generation)

---

## 3. Monorepo Project Structure

```text
payment-link-app/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── PaymentCard.jsx
│   │   │   ├── Alert.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreatePayment.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   ├── PaymentSuccess.jsx
│   │   │   ├── PaymentFailed.jsx
│   │   │   └── PaymentHistory.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   ├── razorpay.js
│   │   │   └── app.config.js
│   │   ├── controllers/
│   │   │   ├── payment.controller.js
│   │   │   ├── whatsapp.controller.js
│   │   │   └── webhook.controller.js
│   │   ├── models/
│   │   │   └── payment.model.js
│   │   ├── routes/
│   │   │   ├── payment.routes.js
│   │   │   ├── whatsapp.routes.js
│   │   │   └── webhook.routes.js
│   │   ├── services/
│   │   │   ├── payment/
│   │   │   │   ├── payment.provider.js
│   │   │   │   ├── razorpay.service.js
│   │   │   │   ├── payment.factory.js
│   │   │   │   └── payment.service.js
│   │   │   ├── whatsapp/
│   │   │   │   └── whatsapp.service.js
│   │   │   └── receipt/
│   │   │       └── receipt.service.js
│   │   ├── middleware/
│   │   │   ├── error.middleware.js
│   │   │   ├── validation.middleware.js
│   │   │   └── rateLimiter.middleware.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   ├── helpers.js
│   │   │   └── errors.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## 4. Setup & Local Installation

### Prerequisites
- Node.js >= 18.x
- MongoDB (Running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

### Step 1: Configure Backend
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/payment_link_db

RAZORPAY_KEY_ID=rzp_test_YourKeyId
RAZORPAY_KEY_SECRET=YourKeySecret
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecret

WHATSAPP_API_VERSION=v21.0
WHATSAPP_ACCESS_TOKEN=EAAG...YourMetaToken
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_TEMPLATE_NAME=payment_link_notification

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001
```

Start backend dev server:
```bash
npm run dev
```

### Step 2: Configure & Start Frontend
In a separate terminal tab:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 5. Meta WhatsApp Cloud API Setup Guide

### 1. Developer Account & Meta App Setup
1. Go to [Meta for Developers Portal](https://developers.facebook.com/).
2. Log in and click **My Apps** -> **Create App**.
3. Select **Other** -> App Type: **Business**.
4. Enter an App Name and link your Business Account.

### 2. Add WhatsApp Product
1. On your App Dashboard, scroll down to **WhatsApp** and click **Set up**.
2. Select or create a **WhatsApp Business Account**.

### 3. Obtain Credentials
1. In the left sidebar, navigate to **WhatsApp** -> **API Setup**.
2. Copy the following keys:
   - **Temporary/Permanent Access Token** -> `WHATSAPP_ACCESS_TOKEN`
   - **Phone Number ID** -> `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** -> `WHATSAPP_BUSINESS_ACCOUNT_ID`
3. Add a test recipient phone number under **To** field (e.g. `919876543210`).

### 4. Create Approved Message Template (Recommended for Business Outbound Initiations)
1. Go to **WhatsApp** -> **Message Templates**.
2. Click **Create Template** -> Category: **Utility** -> Name: `payment_link_notification`.
3. Add body text with parameters:
   `Hello {{1}}, you have a payment request of {{2}} for {{3}}. Pay here: {{4}}`
4. Submit for instant Meta approval.

---

## 6. Razorpay Integration & Webhook Setup

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/) (Test Mode).
2. Go to **Account & Settings** -> **API Keys** -> Generate Test Key Pair (`KEY_ID` and `KEY_SECRET`).
3. Add credentials into `backend/.env`.
4. Webhooks: Go to **Settings** -> **Webhooks** -> Add New Webhook.
   - Webhook URL: `https://your-domain.com/api/webhooks/razorpay` (or ngrok/localtunnel for local testing)
   - Secret: Set `RAZORPAY_WEBHOOK_SECRET`.
   - Active Events: Select `payment.captured`, `order.paid`, and `payment.failed`.

---

## 7. REST API Documentation

### Payments
- `POST /api/payments/create`: Create payment link and Razorpay order
- `GET /api/payments`: Get paginated merchant payment history
- `GET /api/payments/:id`: Get payment details by payment ID
- `GET /api/payments/:id/status`: Check current payment status
- `POST /api/payments/verify`: HMAC-SHA256 signature verification
- `GET /api/payments/:id/receipt`: Download PDF receipt stream

### WhatsApp
- `POST /api/whatsapp/send-payment-link`: Trigger official Meta WhatsApp message directly from backend (`{ "paymentId": "..." }`). Updates DB with `whatsappMessageId`, `whatsappSentAt`, and `whatsappStatus`.

### Webhooks
- `POST /api/webhooks/razorpay`: Razorpay server-to-server webhook callback handling with signature verification and idempotency check (`processedWebhookEvents`).

---

## 8. Security & Idempotency Rules

- **Zero Client Credentials**: Secret keys (`RAZORPAY_KEY_SECRET`, `WHATSAPP_ACCESS_TOKEN`) never reach React.
- **Server Verification Only**: Frontend redirects alone never mark payments as SUCCESS. Verification requires cryptographic HMAC signature check or signed webhook validation.
- **Idempotency**: Webhook events check `processedWebhookEvents` array so duplicate webhooks do not trigger duplicate receipt numbers or state changes.
- **Normalized Phone Numbers**: Normalizes numbers to E.164 without `+` prefix (e.g. `919876543210`).

---

## 9. Final Acceptance Checklist

- [x] Merchant enters customer details and amount.
- [x] Backend creates Razorpay order and unique payment link (`http://localhost:5173/pay/:paymentId`).
- [x] Merchant clicks **Send on WhatsApp** button.
- [x] React calls `POST /api/whatsapp/send-payment-link`.
- [x] Backend calls official Meta WhatsApp Cloud API (`https://graph.facebook.com/v21.0/`).
- [x] Customer receives WhatsApp message with payment link.
- [x] Customer opens link and views checkout details.
- [x] Customer pays via Razorpay modal.
- [x] Backend verifies payment signature & processes webhook idempotently.
- [x] Status changes to `SUCCESS` in MongoDB.
- [x] Customer downloads official PDF receipt.
- [x] Merchant history table displays `SUCCESS`, `WhatsApp: SENT`, and `Receipt` download link.

---

## 10. License

MIT License
