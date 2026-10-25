from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

# ==========================================
# AUTHENTICATION & JWT SCHEMAS
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[str] = "counselor"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    last_login: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# LEAD & CRM SCHEMAS
# ==========================================
class LeadScoreRequest(BaseModel):
    student_id: int
    country: Optional[str] = "Global"
    engagement_score: float
    attendance_rate: float
    avg_quiz_score: float
    login_frequency_weekly: int

class StudentLeadResponse(BaseModel):
    student_id: int
    age: Optional[int] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    device_type: Optional[str] = None
    study_hours_weekly: Optional[float] = None
    login_frequency_weekly: Optional[int] = None
    attendance_rate: Optional[float] = None
    engagement_score: Optional[float] = None
    avg_quiz_score: Optional[float] = None
    ai_lead_score: Optional[float] = None
    priority_level: Optional[str] = None
    assigned_counselor: Optional[str] = None
    next_action: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# WEBSITE DASHBOARD & ANALYTICS SCHEMAS
# ==========================================
class DashboardOverviewResponse(BaseModel):
    total_leads: int
    hot_leads_count: int
    warm_leads_count: int
    cold_leads_count: int
    total_marketing_spend: float
    total_revenue_generated: float
    overall_roi_percentage: float
    at_risk_dropout_students: int

class MarketingAnalyticsResponse(BaseModel):
    platform: str
    impressions: int
    clicks: int
    leads: int
    applications: int
    enrollments: int
    cost: float
    revenue: float
    model_config = ConfigDict(from_attributes=True)