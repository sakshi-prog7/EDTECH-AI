# Machine Learning Readiness Audit Report

This report confirms that the primary dataset has been prepared, audited, and is fully ready for model training.

---

## 1. Dataset Shape and Profiles
- **Cleaned Data File**: [student_dropout_ml_ready.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/ml_ready/dropout_prediction/student_dropout_ml_ready.csv)
- **Observations (Rows)**: **4,424**
- **Selected Predictor Columns (Features)**: **22** (safe demographic, social, and macro-economic factors)
- **Target Label**: `target` (multiclass: Graduate / Dropout / Enrolled)
- **Missing Values**: **0%** (all columns fully populated)

---

## 2. Leakage and Post-Outcome Variable Scan
- **Leakage Variables**: None. All semester grade features (`curricular_units_*_sem_*`) and payment details (`debtor`, `tuition_fees_up_to_date`) have been **successfully excluded** from the ML-ready dataset.
- **Identifiers**: Removed. Row-indices and academic keys have been omitted, leaving only generalizing attributes.

---

## 3. Recommended Algorithms for Model Selection
During the model development phase, we should train and evaluate:
1. **Primary Model: XGBoost / LightGBM Classifier**
   - *Pros*: Excellent handling of nominal categorical integer keys, robustness to slight imbalance, and superior predictive accuracy on tabular structures.
2. **Secondary Model: Random Forest Classifier**
   - *Pros*: Provides solid baseline comparisons, does not require extensive tuning, and offers built-in feature importances.
3. **Linear Baseline: Logistic Regression (with L2 Regularization)**
   - *Pros*: Highly explainable and fast to train.
