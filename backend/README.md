# MediPredict CDSS - Clinical Decision Support System

An AI-powered clinical decision support system to assist healthcare professionals in making evidence-based medication decisions.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🎯 Features

- **Patient Management** — Complete CRUD for patient records
- **Clinical Assessments** — Vital signs, lab results, BMI, eGFR
- **AI Drug Recommendations** — ML-powered suggestions with confidence scores
- **Drug Interaction Checking** — Real-time drug interaction alerts
- **Dosage Calculator** — Renal and age-based adjustments
- **Report Generation** — Clinical reports with print support
- **User Management** — Role-based access (Admin, Clinician, Supervisor)
- **Professional Verification** — Admin approval workflow
- **Audit Trail** — Complete logging of all system activities

## 🏗️ Architecture

```
healthcare-ml-app/
├── backend/          # Flask backend (API + ML models)
│   ├── app/         # Flask application
│   ├── ml/          # Trained ML models
│   ├── instance/    # Database (gitignored)
│   └── app.py       # Entry point
└── frontend/        # Frontend (React/Vue/HTML)
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or 3.12 (⚠️ **NOT 3.14** — has compatibility issues)
- Node.js 16+ (for frontend)
- Git

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/medipredict-cdss.git
cd medipredict-cdss/backend

# Create virtual environment
py -3.11 -m venv venv
venv\Scripts\activate.bat    # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env with your settings

# Initialize database
python create_db.py

# Create admin user
python create_admin.py

# Run the backend
python app.py
```

Backend runs at: `http://127.0.0.1:5000`

### Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

## 🔐 Default Admin Credentials

After running `create_admin.py`:

- **Email:** `admin@medipredict.com`
- **Password:** `Admin@123`

⚠️ **Change these immediately in production!**

## 📦 Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Flask, SQLAlchemy, JWT |
| Database | SQLite (dev), PostgreSQL (prod) |
| ML | scikit-learn, joblib |
| Frontend | React/HTML/CSS/JS |
| Auth | JWT + Flask-Login |

## 📚 API Documentation

### Authentication

- `POST /auth/signup` — Register new user
- `POST /auth/login` — Login
- `POST /auth/logout` — Logout
- `GET /auth/me` — Get current user

### Patients

- `GET /api/patients` — List patients
- `POST /api/patients` — Create patient
- `GET /api/patients/:id` — Get patient
- `PUT /api/patients/:id` — Update patient
- `DELETE /api/patients/:id` — Delete patient

### Assessments

- `POST /api/patients/:id/assess` — Create assessment
- `GET /api/assessments/:id` — Get assessment
- `POST /api/assessments/:id/finalize` — Finalize

### Reports

- `GET /api/reports` — List reports
- `GET /api/reports/:id` — Get report

## 🧪 Testing

```bash
cd backend
pytest tests/
```

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Contact

- **Email:** chukabrandon@gmail.com
- **Phone:** +254 796 375 403
- **Location:** Chuka, Tharaka Nithi, Kenya

## ⚠️ Disclaimer

This system provides recommendations only and is not a substitute for professional medical advice. Always consult with a healthcare provider before starting any new medication.