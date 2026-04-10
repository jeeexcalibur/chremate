<div align="center">
  <img src="./public/favicon.svg" width="80" alt="Chremate Logo">
  <h1>Chremate</h1>
  <p><strong>Your smart money companion</strong></p>
  <p>An AI-powered personal finance tracker built for first-time earners to track daily spending and monthly salary naturally.</p>
</div>

---

## ✨ Features

- **🪄 Magic Bar (AI Powered)**: Type natural language like *"Beli ayam geprek 30k terus naik gojek 15k"* and let AI automatically categorize, parse amounts, and save them.
- **➕ Quick Manual Entry**: A clean, mobile-first floating action button for traditional structured entry.
- **📊 Real-time Dashboard**: Live financial overview, today's spending pulse, and budget health tracker.
- **📈 Advanced Insights**: 7-day spending trends and category-based doughnut charts.
- **📱 Mobile-First Design**: Built with Tailwind CSS and glassmorphism styling, fully responsive and optimized for mobile devices.
- **🔐 Secure Authentication**: Handled via Firebase Auth (Email/Google).

## 🛠️ Tech Stack

- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite, TypeScript, Pinia
- **Styling**: Tailwind CSS v4
- **Backend / Database**: Firebase (Firestore, Authentication)
- **AI Integration**: Gemini 1.5 Flash via REST API (with local fallback parsing)
- **Charting**: Chart.js (`vue-chartjs`)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/chremate.git
cd chremate
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Firebase and Gemini credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the development server
```bash
npm run dev
```

## ⚙️ Deployment

**Chremate** is optimized for Vercel.

1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your terminal and follow the prompts.
3. Once deployed, add your `.env` variables to the Vercel Project Settings.
4. **Important**: Add your new Vercel domain to your Firebase Authentication Authorized Domains.

## 📄 License
This project is open-source and available under the MIT License.
