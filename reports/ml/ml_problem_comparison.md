# Machine Learning Problem Comparison Report

This report compares the four candidate ML problems to determine the primary target for our EdTech Sales Genie model development phase.

---

## 1. Candidate Comparison Matrix

| Problem / Capability | Dataset Used | Sample Size | Class Distribution | Usable Features | Preprocessing Required | Difficulty | Business Relevance | Expected Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Student Dropout & Success Prediction** (Primary Recommendation) | `02_student_dropout/student_dropout.csv` | 4,424 | Multiclass: Graduate (49.9%), Dropout (32.1%), Enrolled (17.9%) | 22 safe demographic & academic features | One-hot encoding for categorical variables; StandardScaler for continuous. | **Low-Medium** | **High**: Prioritizes retention interventions and leads to higher overall customer lifetime value. | Slight imbalance; limited post-enrollment variables for early models. |
| **B. Student Engagement & Early-Risk Warning** | `03_oulad` (vle, assessments, registration) | 10.9M rows (clickstream) | Binary: Withdrawn vs Pass | Clicks, active days, scores | Massive aggregation of clickstreams (weeks 1-4) | **High** | **Medium-High**: Helps student success team, less direct for sales. | Memory constraint during feature engineering. |
| **C. Final Grade / Performance Prediction** | `01_student_performance/student_*.csv` | 1,044 | Numerical G3 (0 to 20 score) | 30 demographic & social features | Scale continuous values, encode categories. | **Low** | **Medium**: Predicts course outcome early. | Small sample size limits deep generalization. |
| **D. Marketing Campaign ROI Optimization** | `05_education_marketing` sheets | 773 | Continuous budget & lead metrics | 플랫폼, 채널, 비용, 클릭 수 | Scale currency values, log transformations for skewed spend. | **Medium** | **High**: Optimizes marketing spend. | Extremely small sample size for neural or boosting approaches. |

---

## 2. Selection Recommendation
- **Primary Model Target**: **Student Dropout / Success Prediction (Problem A)**
  - *Rationale*: It has a high-quality sample size (4,424 records), clean labels with no missing values, and direct business applicability to customer retention. The features allow a clear segregation of pre-enrollment variables to avoid temporal data leakage.
- **Secondary Model Target**: **Student Performance Prediction (Problem C)**
  - *Rationale*: A simple regression task predicting final scores (`g3`) using pre-course parameters.
- **Tertiary Model Target**: **OULAD Early-Risk Prediction (Problem B)**
  - *Rationale*: Highly powerful, but the scale of the clickstream dataset requires significant big-data orchestration.
- **Not Recommended for ML**: **Marketing Campaign Prediction (Problem D)**
  - *Rationale*: Daily spend tables with under 1,000 observations have high variance and are better suited for traditional heuristic dashboards than machine learning.
