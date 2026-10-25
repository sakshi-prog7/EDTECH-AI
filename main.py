import os
import sys
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import func
from sqlalchemy.orm import Session

# ==========================================
# 0. SCIKIT-LEARN PICKLE COMPATIBILITY PATCH
# ==========================================
try:
    import sklearn._loss as _loss
    for base_name in [
        "HalfBinomialLoss", "HalfMultinomialLoss", "HalfSquaredError",
        "HalfPoissonLoss", "HalfGammaLoss", "HalfTweedieLoss", "PinballLoss", "ExponentialLoss"
    ]:
        cy_name = f"Cy{base_name}"
        if hasattr(_loss, base_name):
            setattr(_loss, cy_name, getattr(_loss, base_name))
        else:
            setattr(_loss, cy_name, type(cy_name, (), {}))
    sys.modules["_loss"] = _loss
except Exception:
    pass

# ==========================================
# 1. DATABASE & MODEL IMPORTS
# ==========================================
from db.database import engine, Base, get_db
import db.models
from db.models import (
    User, LoginHistory, OnlineLearningEngagement, 
    MarketingCampaignPerformance, StudentDropout, StudentPerformance
)
from db.schemas import (
    Token, TokenData, UserRegister, UserLogin, UserResponse,
    StudentLeadResponse, DashboardOverviewResponse,
    MarketingAnalyticsResponse, LeadScoreRequest
)
from services.routing_engine import route_lead_workflow

Base.metadata.create_all(bind=engine)

# ==========================================
# 2. JWT SECURITY CONFIGURATION
# ==========================================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "edtech-ai-salesgenie-super-secret-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

# ==========================================
# 3. FASTAPI APP INITIALIZATION
# ==========================================
app = FastAPI(
    title="EdTech AI SalesGenie Enterprise Platform",
    description="Unified API with JWT Authentication, Database CRM, Member 2 Retrained ML Models, and Marketing Analytics",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 4. LOAD TRAINED ML MODELS (MEMBER 2 ASSETS)
# ==========================================
def safe_load_model(filename):
    if os.path.exists(filename):
        try:
            return joblib.load(filename)
        except Exception as e:
            print(f"[WARNING] Could not load {filename}: {e}")
    return None

dropout_model = safe_load_model("dropout_warning_model.pkl")
lead_scoring_model = safe_load_model("lead_scoring_model.pkl")

course_rec_asset = safe_load_model("course_recommendation_model_light.pkl")
if course_rec_asset:
    course_tfidf, courses_df = course_rec_asset
    course_tfidf_matrix = course_tfidf.transform(courses_df["combined_features"])
else:
    course_tfidf, courses_df, course_tfidf_matrix = None, None, None

student_profiling_vectorizer = safe_load_model("student_profiling_vectorizer.pkl")
forecasting_model = safe_load_model("sales_forecasting_model.pkl")

# ==========================================
# 5. REQUEST SCHEMAS (MEMBER 2 PREDICTIVE)
# ==========================================
class DropoutRequest(BaseModel):
    age: float
    time_spent_on_course: float
    time_watched: float
    skip_count: float
    pause_count: float
    disengagement_score: float
    experience_level_encoded: int
    learning_style_encoded: int
    difficulty_level_encoded: int

class LeadRequest(BaseModel):
    age: float
    time_spent_on_course: float
    time_watched: float
    skip_count: float
    pause_count: float
    ratings: float
    num_reviews: float
    video_duration: float = 0.0
    experience_level: Optional[str] = "Intermediate"
    difficulty_level: Optional[str] = "Medium"
    learning_style: Optional[str] = "Visual"
    category: Optional[str] = "Data Science"
    interests: Optional[str] = "Machine Learning"

class RecommendationRequest(BaseModel):
    student_interests: str

class ProfilingRequest(BaseModel):
    interests: str
    experience_level: str
    learning_style: str

# ==========================================
# 6. SYSTEM HEALTH ENDPOINT
# ==========================================
@app.get("/")
def home():
    return {
        "status": "online",
        "service": "EdTech AI SalesGenie Enterprise Backend",
        "security": "JWT Bearer Token Enabled",
        "database": "connected",
        "ml_models": {
            "dropout_model_loaded": dropout_model is not None,
            "lead_scoring_model_loaded": lead_scoring_model is not None,
            "recommender_loaded": course_tfidf is not None,
            "forecasting_loaded": forecasting_model is not None
        }
    }

# ==========================================
# 7. JWT AUTHENTICATION ENDPOINTS
# ==========================================
@app.post("/api/auth/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    from backend.app.core.database import engine as be_engine
    from backend.app.core.security import hash_password as be_hash
    from sqlalchemy import text as sa_text
    import uuid as _uuid

    # Check in the live backend database (salesgenie.db).
    with be_engine.connect() as conn:
        existing = conn.execute(
            sa_text("SELECT id FROM users WHERE email = :email COLLATE NOCASE"),
            {"email": user_data.email},
        ).mappings().first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.now(timezone.utc).isoformat()
    user_id = str(_uuid.uuid4())
    with be_engine.begin() as conn:
        conn.execute(
            sa_text(
                "INSERT INTO users (id, name, email, password_hash, role, is_active, "
                "failed_login_attempts, locked_until, created_at, updated_at) "
                "VALUES (:id, :name, :email, :hash, :role, 1, 0, NULL, :now, :now)"
            ),
            {
                "id": user_id,
                "name": user_data.full_name,
                "email": user_data.email,
                "hash": be_hash(user_data.password),
                "role": (user_data.role or "STUDENT").upper(),
                "now": now,
            },
        )

    return {
        "id": user_id,
        "full_name": user_data.full_name,
        "email": user_data.email,
        "role": (user_data.role or "STUDENT").upper(),
        "last_login": None,
    }

@app.post("/api/auth/login", response_model=Token)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    from backend.app.core.database import engine as be_engine
    from backend.app.core.security import verify_password as be_verify
    from sqlalchemy import text as sa_text

    # Query the live backend database (salesgenie.db) for the user.
    with be_engine.connect() as conn:
        row = conn.execute(
            sa_text("SELECT * FROM users WHERE email = :email COLLATE NOCASE"),
            {"email": creds.email},
        ).mappings().first()

    user = dict(row) if row else None
    if not user or not be_verify(creds.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Record login in the backend database.
    import uuid as _uuid
    with be_engine.begin() as conn:
        conn.execute(
            sa_text(
                "INSERT INTO login_history (id, user_id, ip_address, success, created_at) "
                "VALUES (:id, :uid, :ip, 1, :now)"
            ),
            {
                "id": str(_uuid.uuid4()),
                "uid": user["id"],
                "ip": "127.0.0.1",
                "now": datetime.now(timezone.utc).isoformat(),
            },
        )

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"], "name": user["name"]}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

# ==========================================
# 8. SECURE CRM LEADS & ROUTING WORKFLOWS
# ==========================================
@app.get("/api/leads", response_model=List[StudentLeadResponse])
def get_leads(
    priority: Optional[str] = Query(None, description="Filter by HOT, WARM, or COLD"),
    limit: int = Query(50, description="Max rows to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(OnlineLearningEngagement)
    if priority:
        query = query.filter(OnlineLearningEngagement.priority_level == priority.upper())
    return query.limit(limit).all()

@app.post("/api/leads/score-and-route")
def score_and_route_lead(
    lead_input: LeadScoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = route_lead_workflow(lead_input.model_dump())
    
    existing_record = db.query(OnlineLearningEngagement).filter(
        OnlineLearningEngagement.student_id == lead_input.student_id
    ).first()

    if existing_record:
        existing_record.engagement_score = lead_input.engagement_score
        existing_record.attendance_rate = lead_input.attendance_rate
        existing_record.avg_quiz_score = lead_input.avg_quiz_score
        existing_record.login_frequency_weekly = lead_input.login_frequency_weekly
        existing_record.ai_lead_score = result["ai_lead_score"]
        existing_record.priority_level = result["priority_level"]
        existing_record.assigned_counselor = result["routed_to"]
        existing_record.next_action = result["recommended_action"]
    else:
        new_lead = OnlineLearningEngagement(
            student_id=lead_input.student_id,
            country=lead_input.country,
            engagement_score=lead_input.engagement_score,
            attendance_rate=lead_input.attendance_rate,
            avg_quiz_score=lead_input.avg_quiz_score,
            login_frequency_weekly=lead_input.login_frequency_weekly,
            ai_lead_score=result["ai_lead_score"],
            priority_level=result["priority_level"],
            assigned_counselor=result["routed_to"],
            next_action=result["recommended_action"]
        )
        db.add(new_lead)

    db.commit()
    return result

# ==========================================
# 9. DASHBOARD & MARKETING ANALYTICS
# ==========================================
@app.get("/api/dashboard/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from backend.app.core.database import engine as be_engine
    from backend.app.services.dashboard import enhanced_dashboard_stats
    from sqlalchemy import text as sa_text

    # Reuse the existing enhanced dashboard service for core metrics
    stats = enhanced_dashboard_stats("30d")
    kpis = stats.get("enhancedKpis", {})
    total_leads = kpis.get("total_leads", 0)
    revenue = kpis.get("revenue", 0)

    # Compute marketing cost and lead breakdowns from the live backend database
    with be_engine.connect() as conn:
        cost_row = conn.execute(
            sa_text("SELECT COALESCE(SUM(cost), 0) FROM campaign_daily")
        ).first()
        hot = conn.execute(
            sa_text("SELECT COUNT(*) FROM leads WHERE priority = 'High'")
        ).scalar()
        warm = conn.execute(
            sa_text("SELECT COUNT(*) FROM leads WHERE priority = 'Medium'")
        ).scalar()
        cold = conn.execute(
            sa_text("SELECT COUNT(*) FROM leads WHERE priority = 'Low'")
        ).scalar()
        at_risk = conn.execute(
            sa_text("SELECT COUNT(*) FROM students")
        ).scalar()

    cost = float(cost_row[0] if cost_row else 0)
    roi = round(((revenue - cost) / cost * 100), 2) if cost > 0 else 0.0

    return {
        "total_leads": total_leads,
        "hot_leads_count": hot,
        "warm_leads_count": warm,
        "cold_leads_count": cold,
        "total_marketing_spend": round(cost, 2),
        "total_revenue_generated": round(revenue, 2),
        "overall_roi_percentage": roi,
        "at_risk_dropout_students": at_risk,
    }

@app.get("/api/marketing/analytics", response_model=List[MarketingAnalyticsResponse])
def get_marketing_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = db.query(
        MarketingCampaignPerformance.platform,
        func.sum(MarketingCampaignPerformance.impressions).label("impressions"),
        func.sum(MarketingCampaignPerformance.clicks).label("clicks"),
        func.sum(MarketingCampaignPerformance.leads).label("leads"),
        func.sum(MarketingCampaignPerformance.applications).label("applications"),
        func.sum(MarketingCampaignPerformance.enrollments).label("enrollments"),
        func.sum(MarketingCampaignPerformance.cost).label("cost"),
        func.sum(MarketingCampaignPerformance.revenue).label("revenue")
    ).group_by(MarketingCampaignPerformance.platform).all()

    return [
        {
            "platform": r.platform,
            "impressions": int(r.impressions or 0),
            "clicks": int(r.clicks or 0),
            "leads": int(r.leads or 0),
            "applications": int(r.applications or 0),
            "enrollments": int(r.enrollments or 0),
            "cost": round(float(r.cost or 0.0), 2),
            "revenue": round(float(r.revenue or 0.0), 2)
        }
        for r in results
    ]

# ==========================================
# 10. PREDICTIVE AI MODEL ENDPOINTS
# ==========================================
@app.post("/predict-dropout")
def predict_dropout(data: DropoutRequest):
    if not dropout_model:
        raise HTTPException(status_code=503, detail="Dropout warning model is not loaded")
    
    features = [[
        data.age,
        data.time_spent_on_course,
        data.time_watched,
        data.skip_count,
        data.pause_count,
        data.disengagement_score,
        data.experience_level_encoded,
        data.learning_style_encoded,
        data.difficulty_level_encoded,
    ]]
    prediction = dropout_model.predict(features)[0]
    probability = dropout_model.predict_proba(features)[0][int(prediction)] * 100
    return {
        "at_risk_of_dropping_out": bool(prediction),
        "confidence_score": round(float(probability), 2),
    }

@app.post("/predict-lead-score")
def predict_lead_score(data: LeadRequest):
    if lead_scoring_model:
        try:
            features = np.array([[
                data.age,
                data.time_spent_on_course,
                data.time_watched,
                data.skip_count,
                data.pause_count,
                data.ratings,
                data.num_reviews
            ]])
            if hasattr(lead_scoring_model, "predict_proba"):
                prob = float(lead_scoring_model.predict_proba(features)[0][1] * 100)
            else:
                prob = float(lead_scoring_model.predict(features)[0] * 100)
            return {
                "high_intent_lead": bool(prob >= 50.0),
                "conversion_probability": round(prob, 2),
                "engine": "retrained_ml_model"
            }
        except Exception:
            pass

    watch_score = min(1.0, data.time_watched / 45.0) * 0.45
    rating_score = (data.ratings / 5.0) * 0.35
    skip_penalty = min(1.0, data.skip_count / 15.0) * 0.20
    base_score = watch_score + rating_score - skip_penalty

    interests_lower = (data.interests or "").lower()
    keyword_boost = 0.15 if any(kw in interests_lower for kw in ["advanced", "ml", "python", "data"]) else 0.0
    total_score = max(0.0, min(1.0, base_score + keyword_boost))
    conversion_prob = round(float(total_score * 100), 2)

    return {
        "high_intent_lead": bool(conversion_prob >= 50.0),
        "conversion_probability": conversion_prob,
        "engine": "heuristic_routing"
    }

@app.post("/recommend-course")
def recommend_course(data: RecommendationRequest):
    if not course_tfidf or courses_df is None:
        raise HTTPException(status_code=503, detail="Course recommendation model is not loaded")

    student_vec = course_tfidf.transform([data.student_interests])
    sim_scores = cosine_similarity(student_vec, course_tfidf_matrix).flatten()
    sorted_indices = sim_scores.argsort()[::-1]

    recommendations = []
    seen_courses = set()

    for idx in sorted_indices:
        course_name = courses_df.loc[idx, "course_name"]
        if course_name not in seen_courses:
            seen_courses.add(course_name)
            recommendations.append({
                "recommended_course": course_name,
                "category": courses_df.loc[idx, "category"],
                "similarity_score": round(float(sim_scores[idx] * 100), 2),
            })
        if len(recommendations) == 3:
            break

    return {"recommendations": recommendations}

@app.post("/student-profile")
def student_profile(data: ProfilingRequest):
    interests = data.interests.lower()
    if any(kw in interests for kw in ["react", "html", "css", "javascript", "web"]):
        track = "Fullstack Web Development"
    elif any(kw in interests for kw in ["ai", "machine learning", "neural", "python", "data"]):
        track = "AI & Machine Learning Engineering"
    elif any(kw in interests for kw in ["cybersecurity", "hacking", "penetration"]):
        track = "Cybersecurity & Ethical Hacking"
    else:
        track = "Cloud & Big Data Architecture"

    return {
        "experience_level": data.experience_level,
        "learning_style": data.learning_style,
        "assigned_career_profile": track,
    }

@app.get("/forecast-sales")
def forecast_sales():
    if not forecasting_model:
        raise HTTPException(status_code=503, detail="Sales forecasting model is not loaded")

    forecast = forecasting_model.forecast(steps=3)
    forecast_dict = {
        str(date.strftime("%Y-%m")): round(float(val), 2)
        for date, val in forecast.items()
    }
    return {"next_3_months_revenue_forecast": forecast_dict}