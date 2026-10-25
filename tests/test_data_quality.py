import os
import pandas as pd
import pytest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))

DATASETS = {
    "math": os.path.join(PROJECT_ROOT, "data", "cleaned", "01_student_performance", "student_math.csv"),
    "portuguese": os.path.join(PROJECT_ROOT, "data", "cleaned", "01_student_performance", "student_portuguese.csv"),
    "dropout": os.path.join(PROJECT_ROOT, "data", "cleaned", "02_student_dropout", "student_dropout.csv"),
    "engagement": os.path.join(PROJECT_ROOT, "data", "cleaned", "04_online_engagement", "online_learning_engagement.csv"),
    "marketing_meta": os.path.join(PROJECT_ROOT, "data", "cleaned", "05_education_marketing", "marketing_campaignmeta.csv"),
    "marketing_perf": os.path.join(PROJECT_ROOT, "data", "cleaned", "05_education_marketing", "marketing_campaignperformance.csv"),
    "marketing_rates": os.path.join(PROJECT_ROOT, "data", "cleaned", "05_education_marketing", "marketing_channelrates.csv"),
    "ml_ready": os.path.join(PROJECT_ROOT, "data", "ml_ready", "dropout_prediction", "student_dropout_ml_ready.csv"),
}

def test_all_datasets_exist():
    for name, path in DATASETS.items():
        assert os.path.exists(path), f"Missing dataset: {path}"

def test_all_csv_validity():
    for name, path in DATASETS.items():
        df = pd.read_csv(path)
        assert not df.empty, f"Dataset {name} is empty"
        assert len(df.columns) >= 2, f"Dataset {name} has insufficient columns"
        assert df.isnull().all().sum() == 0, f"Dataset {name} has 100% null columns"

def test_parquet_datasets():
    oulad_file = os.path.join(PROJECT_ROOT, "data", "cleaned", "03_oulad", "studentInfo.parquet")
    df = pd.read_parquet(oulad_file)
    assert not df.empty, "OULAD Parquet file contains no records"