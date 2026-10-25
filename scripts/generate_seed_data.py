import os
import sys
import json
import pandas as pd

# Add repository root to system path so services can be imported anywhere
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from services.routing_engine import route_lead_workflow

ENGAGEMENT_CSV = os.path.join(PROJECT_ROOT, "data", "cleaned", "04_online_engagement", "online_learning_engagement.csv")
MARKETING_CSV = os.path.join(PROJECT_ROOT, "data", "cleaned", "05_education_marketing", "marketing_campaignperformance.csv")

def generate_crm_seed_files():
    seed_dir = os.path.join(PROJECT_ROOT, "data", "seed")
    os.makedirs(seed_dir, exist_ok=True)

    # 1. Generate Leads Seed
    if os.path.exists(ENGAGEMENT_CSV):
        df_eng = pd.read_csv(ENGAGEMENT_CSV)
        processed_leads = []
        for record in df_eng.head(50).to_dict(orient="records"):
            routed = route_lead_workflow(record)
            lead_entry = {
                **record,
                "ai_lead_score": routed["ai_lead_score"],
                "priority_level": routed["priority_level"],
                "assigned_counselor": routed["routed_to"],
                "next_action": routed["recommended_action"]
            }
            processed_leads.append(lead_entry)

        seed_leads_path = os.path.join(seed_dir, "seed_leads.json")
        with open(seed_leads_path, "w") as f:
            json.dump(processed_leads, f, indent=2)
        print(f"[SUCCESS] Generated {seed_leads_path} ({len(processed_leads)} records)")
    else:
        print(f"[WARNING] Engagement file not found at: {ENGAGEMENT_CSV}")

    # 2. Generate Marketing Summary Seed
    if os.path.exists(MARKETING_CSV):
        df_mkt = pd.read_csv(MARKETING_CSV)
        mkt_summary = df_mkt.groupby("platform").agg({
            "impressions": "sum",
            "clicks": "sum",
            "leads": "sum",
            "applications": "sum",
            "enrollments": "sum",
            "cost": "sum",
            "revenue": "sum"
        }).reset_index().to_dict(orient="records")

        seed_mkt_path = os.path.join(seed_dir, "seed_marketing_summary.json")
        with open(seed_mkt_path, "w") as f:
            json.dump(mkt_summary, f, indent=2)
        print(f"[SUCCESS] Generated {seed_mkt_path} for frontend analytics")
    else:
        print(f"[WARNING] Marketing file not found at: {MARKETING_CSV}")

if __name__ == "__main__":
    generate_crm_seed_files()