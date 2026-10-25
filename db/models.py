from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from db.database import Base

# ==========================================
# 00. AUTHENTICATION & USER TRACKING
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="counselor")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    login_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), default="SUCCESS")

# ==========================================
# 01. STUDENT ACADEMIC PERFORMANCE
# ==========================================
class StudentPerformance(Base):
    __tablename__ = "student_performance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject = Column(String(20), index=True)
    school = Column(String(10))
    sex = Column(String(5))
    age = Column(Integer)
    address = Column(String(5))
    famsize = Column(String(10))
    pstatus = Column(String(5))
    medu = Column(Integer)
    fedu = Column(Integer)
    mjob = Column(String(50))
    fjob = Column(String(50))
    reason = Column(String(50))
    guardian = Column(String(50))
    traveltime = Column(Integer)
    studytime = Column(Integer)
    failures = Column(Integer)
    schoolsup = Column(String(10))
    famsup = Column(String(10))
    paid = Column(String(10))
    activities = Column(String(10))
    nursery = Column(String(10))
    higher = Column(String(10))
    internet = Column(String(10))
    romantic = Column(String(10))
    famrel = Column(Integer)
    freetime = Column(Integer)
    goout = Column(Integer)
    dalc = Column(Integer)
    walc = Column(Integer)
    health = Column(Integer)
    absences = Column(Integer)
    g1 = Column(Integer)
    g2 = Column(Integer)
    g3 = Column(Integer)

# ==========================================
# 02. STUDENT DROPOUT MONITORING
# ==========================================
class StudentDropout(Base):
    __tablename__ = "student_dropout"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    marital_status = Column(Integer)
    application_mode = Column(Integer)
    application_order = Column(Integer)
    course = Column(Integer)
    daytime_evening_attendance = Column(Integer)
    previous_qualification = Column(Integer)
    previous_qualification_grade = Column(Float)
    nacionality = Column(Integer)
    mother_s_qualification = Column(Integer)
    father_s_qualification = Column(Integer)
    mother_s_occupation = Column(Integer)
    father_s_occupation = Column(Integer)
    admission_grade = Column(Float)
    displaced = Column(Integer)
    educational_special_needs = Column(Integer)
    debtor = Column(Integer, nullable=True)
    tuition_fees_up_to_date = Column(Integer, nullable=True)
    gender = Column(Integer)
    scholarship_holder = Column(Integer)
    age_at_enrollment = Column(Integer)
    international = Column(Integer)
    curricular_units_1st_sem_credited = Column(Integer, nullable=True)
    curricular_units_1st_sem_enrolled = Column(Integer, nullable=True)
    curricular_units_1st_sem_evaluations = Column(Integer, nullable=True)
    curricular_units_1st_sem_approved = Column(Integer, nullable=True)
    curricular_units_1st_sem_grade = Column(Float, nullable=True)
    curricular_units_1st_sem_without_evaluations = Column(Integer, nullable=True)
    curricular_units_2nd_sem_credited = Column(Integer, nullable=True)
    curricular_units_2nd_sem_enrolled = Column(Integer, nullable=True)
    curricular_units_2nd_sem_evaluations = Column(Integer, nullable=True)
    curricular_units_2nd_sem_approved = Column(Integer, nullable=True)
    curricular_units_2nd_sem_grade = Column(Float, nullable=True)
    curricular_units_2nd_sem_without_evaluations = Column(Integer, nullable=True)
    unemployment_rate = Column(Float)
    inflation_rate = Column(Float)
    gdp = Column(Float)
    target = Column(String(50), index=True)

# ==========================================
# 04. ONLINE ENGAGEMENT & AI LEAD SCORING
# ==========================================
class OnlineLearningEngagement(Base):
    __tablename__ = "online_learning_engagement"

    student_id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer)
    gender = Column(String(20))
    country = Column(String(50), index=True)
    device_type = Column(String(50))
    internet_speed_mbps = Column(Float)
    study_hours_weekly = Column(Float)
    login_frequency_weekly = Column(Integer)
    avg_session_duration_min = Column(Float)
    video_watch_time_min = Column(Float)
    assignments_submitted = Column(Integer)
    forum_posts = Column(Integer)
    quiz_attempts = Column(Integer)
    avg_quiz_score = Column(Float)
    attendance_rate = Column(Float)
    engagement_score = Column(Float)
    final_grade = Column(Float)
    dropout = Column(Integer)

    # CRM AI Workflow fields
    ai_lead_score = Column(Float, index=True, nullable=True)
    priority_level = Column(String(20), index=True, nullable=True)
    assigned_counselor = Column(String(100), nullable=True)
    next_action = Column(String(255), nullable=True)

# ==========================================
# 05. EDUCATION MARKETING DATASETS
# ==========================================
class MarketingCampaignMeta(Base):
    __tablename__ = "marketing_campaign_meta"

    campaignid = Column(String(50), primary_key=True, index=True)
    objective = Column(String(100))
    startdate = Column(String(50))
    enddate = Column(String(50))
    budget = Column(Float)
    campaign_type = Column(String(50))
    creative_type = Column(String(50))
    manager = Column(String(50))
    channel = Column(String(50))
    conversion_goal = Column(String(50))

class MarketingCampaignPerformance(Base):
    __tablename__ = "marketing_campaign_performance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String(50), index=True)
    campaignid = Column(String(50), index=True)
    campaignname = Column(String(100))
    platform = Column(String(50), index=True)
    targetaudience = Column(String(100))
    impressions = Column(Integer)
    clicks = Column(Integer)
    leads = Column(Integer)
    applications = Column(Integer)
    enrollments = Column(Integer)
    cost = Column(Float)
    revenue = Column(Float)
    region = Column(String(100))

class MarketingChannelRate(Base):
    __tablename__ = "marketing_channel_rates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    channel = Column(String(50), unique=True, index=True)
    avgcpm = Column(Float)
    avgcpc = Column(Float)
    remarks = Column(String(255))