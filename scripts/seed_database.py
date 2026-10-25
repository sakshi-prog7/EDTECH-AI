import os
import sys
import pandas as pd

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from db.database import engine, Base
import db.models
from services.routing_engine import route_lead_workflow

def load_csv(rel_path):
    full_path = os.path.join(PROJECT_ROOT, rel_path)
    if os.path.exists(full_path):
        return pd.read_csv(full_path)
    return None

def seed_all_datasets():
    print("[INFO] Rebuilding database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 1. Student Academic Performance
    df_math = load_csv("data/cleaned/01_student_performance/student_math.csv")
    if df_math is not None:
        df_math["subject"] = "math"
        df_math.to_sql("student_performance", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_math)} rows (Math Performance)")

    df_port = load_csv("data/cleaned/01_student_performance/student_portuguese.csv")
    if df_port is not None:
        df_port["subject"] = "portuguese"
        df_port.to_sql("student_performance", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_port)} rows (Portuguese Performance)")

    # 2. Student Dropout Monitoring
    df_dropout = load_csv("data/cleaned/02_student_dropout/student_dropout.csv")
    if df_dropout is not None:
        df_dropout.to_sql("student_dropout", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_dropout)} rows (Dropout Risk Records)")

    # 3. Online Learning Engagement & AI CRM Scoring
    df_eng = load_csv("data/cleaned/04_online_engagement/online_learning_engagement.csv")
    if df_eng is not None:
        scores, priorities, counselors, actions = [], [], [], []
        for record in df_eng.to_dict(orient="records"):
            res = route_lead_workflow(record)
            scores.append(res["ai_lead_score"])
            priorities.append(res["priority_level"])
            counselors.append(res["routed_to"])
            actions.append(res["recommended_action"])

        df_eng["ai_lead_score"] = scores
        df_eng["priority_level"] = priorities
        df_eng["assigned_counselor"] = counselors
        df_eng["next_action"] = actions
        df_eng.to_sql("online_learning_engagement", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_eng)} rows (Scored Student Leads)")

    # 4. Education Marketing Datasets
    df_meta = load_csv("data/cleaned/05_education_marketing/marketing_campaignmeta.csv")
    if df_meta is not None:
        df_meta.to_sql("marketing_campaign_meta", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_meta)} rows (Marketing Metadata)")

    df_perf = load_csv("data/cleaned/05_education_marketing/marketing_campaignperformance.csv")
    if df_perf is not None:
        df_perf.to_sql("marketing_campaign_performance", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_perf)} rows (Marketing Campaign Performance)")

    df_rates = load_csv("data/cleaned/05_education_marketing/marketing_channelrates.csv")
    if df_rates is not None:
        df_rates.to_sql("marketing_channel_rates", con=engine, if_exists="append", index=False)
        print(f"[SUCCESS] Ingested {len(df_rates)} rows (Channel Ad Rates)")

if __name__ == "__main__":
    seed_all_datasets()