# 🚀 Code Swipe - The TikTok for Developers

> Swipe through coding challenges, learn by doing, and level up your programming skills - one swipe at a time!

[![Deployed on Cloud Run](https://img.shields.io/badge/Deployed%20on-Cloud%20Run-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-8E75B2?logo=google)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Database-Firebase-FFCA28?logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.txt)

## 📱 What is Code Swipe?

Code Swipe is a revolutionary mobile-first coding education platform that combines the addictive swipe interface of TikTok with interactive coding challenges. Learn programming through bite-sized challenges across 8 languages, get instant feedback, and track your progress - all in a fun, engaging format.

**[➡️ Try it Out!](https://codeswipe-the-tiktok-for-developers-1078343599369.us-west1.run.app/)** *(Note: Link will be live upon final deployment)*

**🎯 Built for the Google Cloud Run Hackathon**

---

## ✨ Features

### 🎮 Core Features

- **📱 TikTok-Style Interface** - Swipe through coding challenges with an intuitive, mobile-first design
- **🌍 8 Programming Languages** - JavaScript, Python, Go, Java, TypeScript, C++, C#, Rust
- **⚡ Real-Time Code Execution** - Instant validation using Piston API for secure, sandboxed code execution
- **🤖 AI-Powered Questions** - Dynamic question generation using Google Gemini AI
- **🧠 AI Code Review** - Get instant, personalized feedback on your code with quality scores and improvement suggestions
- **💾 Smart Question Caching** - Hybrid approach: 70% cached questions + 30% fresh AI-generated content
- **🎯 Difficulty Levels** - Beginner, Intermediate, Advanced, Expert
- **🏆 Achievement System** - Track solved challenges and earn achievements
- **❤️ Like & Save** - Bookmark favorite challenges for later
- **🔗 Social Sharing** - Share challenges on Twitter, LinkedIn, Facebook
- **👤 User Profiles** - Track progress, view statistics, manage settings
- **📱 Progressive Web App** - Install on any device, works offline, native app experience

### 🎨 User Experience

- **Personalized Learning** - Set your preferred language and difficulty level
- **AI Mentorship** - Real-time code review with quality scores and actionable feedback
- **Progress Tracking** - Visual statistics and achievement badges
- **Responsive Design** - Optimized for mobile, tablet, and desktop
- **Dark Mode** - Eye-friendly interface for coding sessions
- **Offline Support** - JavaScript challenges work offline
- **PWA Ready** - Install as native app on any device

### 🔧 Technical Features

- **Dual Mode Operation**
  - **AI Mode**: Fresh questions from Gemini AI with real-time code review
  - **DB Mode**: Curated questions from Firebase with AI feedback
- **AI Code Review System** - Gemini-powered analysis providing:
  - Code quality scores (1-10)
  - Strength identification
  - Improvement suggestions
  - Works for both correct and incorrect solutions
- **Multi-Language Validation** - Secure code execution for all 8 languages
- **Smart Caching** - Reduces API costs while maintaining freshness
- **Duplicate Prevention** - Content-based hashing prevents duplicate questions
- **Firebase Integration** - Real-time data sync and authentication
- **Google OAuth** - Seamless sign-in with Google accounts
- **PWA Architecture** - Installable, offline-capable, app-like experience

---

## 🚀 What Makes Code Swipe Different?

Code Swipe isn't just another coding platform. It's an innovative fusion of learning science and modern UX.

1.  **Addictive UX Meets Education:** We've applied TikTok's dopamine-driven interface to skill development, making coding practice as engaging as social media. The "swipe, code, learn, repeat" loop keeps you coming back.

2.  **AI-Powered Personalization at Scale:** Using **Gemini**, we generate infinite challenges based on your interests and skill level. Our context caching reduces AI costs by **90%**, making AI-driven education economically viable.

3.  **AI Mentorship for Every Developer:** Get instant code quality analysis, strength identification, and actionable improvement suggestions on every submission. It's like having an AI mentor available 24/7.

4.  **True Mobile-First Coding:** A full-featured code editor and real code execution in 8 languages, all on your phone. Learn while commuting, waiting in line, or anywhere.

5.  **Production-Ready from Day One:** Built on an auto-scaling serverless architecture on Google Cloud Run, with comprehensive error handling, security-first design, and intelligent cost optimization.

---

## 🏆 Hackathon Submission

### **Category: General Application**
This project is submitted to the general category, demonstrating an innovative, production-ready serverless application built on Google Cloud Run and heavily featuring Google AI.

### **Key Highlights for Judges**

✅ **Deployed on Cloud Run**: The entire application, including a React frontend and a Node.js backend, is deployed as two distinct, auto-scaling Cloud Run services.

✅ **Gemini AI Integration**: The platform deeply integrates **Gemini Pro** for advanced question generation and **Gemini Flash** for fast code reviews, showcasing the power of Google's AI models. An intelligent context caching strategy reduces Gemini API costs by over 90%.

✅ **Multi-Service Architecture**: A decoupled frontend and backend architecture, demonstrating best practices for building scalable web applications on Cloud Run.

✅ **Firebase & GCP Integration**: Leverages Firestore for a real-time database, Firebase Authentication for user management, and Cloud Storage for assets.

✅ **Production-Ready & Scalable**: Designed with error handling, caching, and a serverless architecture that can scale from zero to thousands of users automatically.


---

## 🏗️ Architecture

Code Swipe uses a modern, scalable architecture deployed entirely on Google Cloud Platform.

**[View Detailed Architecture Diagram →](./ARCHITECTURE.txt)**

## 🚀 Google Cloud Integration

This project makes extensive use of Google Cloud services to deliver a robust and scalable application.

**[View Google Cloud Contributions →](./GOOGLE_CLOUD.txt)**

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editor component

### Backend
- **Node.js** - Runtime
- **Express** - API framework
- **Firebase Admin SDK** - Database access
- **Google AI SDK** - Gemini integration

### Infrastructure
- **Google Cloud Run** - Serverless deployment
- **Firebase** - Firestore database & Auth
- **Piston API** - Code execution
- **Gemini AI** - Question generation

### DevOps
- **GitHub Actions** - CI/CD
- **Docker** - Containerization
- **gcloud CLI** - Deployment

---

## 📖 Documentation

- **[Architecture Diagram](./ARCHITECTURE.txt)** - System architecture and data flow.
- **[Google Cloud Contributions](./GOOGLE_CLOUD.txt)** - Detailed GCP services usage.
- **[AI Code Review System](./docs/AI_CODE_REVIEW.md)** - Details on the AI feedback system.
- **[Piston API Integration](./docs/PISTON_API_INTEGRATION.md)** - Multi-language code execution.
- **[License](./LICENSE.txt)** - MIT License.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase account & `serviceAccountKey.json`
- Google Cloud account & `gcloud` CLI
- Gemini API key

### Installation & Deployment

1.  **Clone the repository**: `git clone https://github.com/m3lk0rbot/codeswipe_-the-tiktok-for-developers.git`
2.  **Install dependencies**: `npm install` and `cd curator && npm install`
3.  **Configure Firebase**: Add your config to `services/firebase.ts`.
4.  **Configure Gemini**: Add your API key to `curator/env.yaml` and as a secret in Secret Manager.
5.  **Run locally**: `npm run dev` (frontend) and `cd curator && npm start` (backend).
6.  **Deploy to Cloud Run**: Use the `gcloud run deploy` commands found in `GOOGLE_CLOUD.txt`.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.txt](./LICENSE.txt) file for details.
