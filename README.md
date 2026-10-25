# 🎓 SalesGenie AI Microservice — EdTech Intelligence Suite

A high-performance machine learning microservice built with **FastAPI** to power intelligent student operations across sales, retention, personalized learning recommendations, and revenue forecasting.

---

## 📌 System Architecture & Machine Learning Modules

The microservice consolidates **5 dedicated AI/ML pipelines**:

| # | Feature / Endpoint | Model Architecture | Primary Artifact | Objective |
|---|---|---|---|---|
| **1** | **Hybrid Lead Scoring** (`/predict-lead-score`) | Gradient Boosting Classifier + Behavioral Momentum Index | `lead_scoring_model.pkl` | Identifies high-intent student leads and assigns priority action directives. |
| **2** | **Dropout Risk Warning** (`/predict-dropout`) | Random Forest Classifier | `dropout_warning_model.pkl` | Predicts course drop-out probability and engagement risk. |
| **3** | **Course Recommendation** (`/recommend-course`) | TF-IDF Vectorization + Cosine Similarity | `course_recommendation_model_light.pkl` | Generates top-3 personalized course recommendations based on interests. |
| **4** | **Student Profiling** (`/student-profile`) | Rule-based NLP Categorical Classifier | `student_profiling_vectorizer.pkl` | Maps student background and style to 6 professional career tracks. |
| **5** | **Revenue Forecasting** (`/forecast-sales`) | Time Series ARIMA(1, 1, 1) | `sales_forecasting_model.pkl` | Projects rolling 3-month sales and revenue trajectories. |

---

## 📂 Repository File Structure

```text
EDTECH AI/
├── ed38976-edd_cleaned.csv               # Cleaned interaction dataset (14,101 records)
├── ranked_counselor_14k_leads.csv        # Pre-scored priority queue for counselor CRM
├── Edtech_AI_Training.ipynb              # Notebook: Dropout, Recommendations, Profiling, Forecasting
├── lead_scoring.ipynb                    # Notebook: Gradient Boosting Lead Scoring pipeline
├── course_recommendation_model_light.pkl # Serialized TF-IDF model & course metadata
├── dropout_warning_model.pkl             # Serialized Random Forest dropout classifier
├── lead_scoring_model.pkl                # Serialized Gradient Boosting lead scoring model
├── sales_forecasting_model.pkl           # Serialized ARIMA revenue forecasting model
├── student_profiling_vectorizer.pkl      # Serialized student profiling vectorizer
├── main.py                               # FastAPI core application & API routing[cite: 2]
├── requirements.txt                      # Project dependency requirements[cite: 2]
└── README.md                             # System documentation

🚀 Quickstart & Local Setup
1. Clone & Set Up Virtual Environment
Bash
# Clone the repository
git clone [https://github.com/AdithyanAnil0011/Edtech-ai-salesgenie.git](https://github.com/AdithyanAnil0011/Edtech-ai-salesgenie.git)
cd Edtech-ai-salesgenie

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

2. Install Dependencies
Bash
pip install -r requirements.txt
3. Run the Microservice
Bash
uvicorn main:app --reload --port 8000
Open http://127.0.0.1:8000/docs to access the interactive Swagger UI[cite: 2].
