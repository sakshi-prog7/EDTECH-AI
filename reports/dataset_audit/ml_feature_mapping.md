# ML Feature and AI Capability Mapping

This document details how our seven intended AI features can be supported by the audited datasets.

---

## 1. Feature-to-Dataset Mapping Matrix

| AI Feature / Capability | Supported By Dataset(s) | Key Columns Utilized | Role in EdTech Sales Genie |
| :--- | :--- | :--- | :--- |
| **Lead Scoring** | `02_student_dropout`, `05_education_marketing`, `04_online_engagement` | `Admission grade`, `Age at enrollment`, `Application mode`, `Previous qualification`, `Platform`, `TargetAudience`, `Leads` | Prioritizes inbound student inquiries by estimating conversion probability and student quality. |
| **Course Recommendation** | `03_oulad` (courses, assessments), `02_student_dropout` | `Course`, `code_module`, `highest_education`, `studied_credits` | Suggests the most suitable course path to prospective students based on their background and historical completion success. |
| **Enrollment/Conversion Prediction** | `02_student_dropout`, `03_oulad` (studentRegistration), `05_education_marketing` | `Application mode`, `Application order`, `date_registration`, `Tuition fees up to date`, `Debtor`, `AdSpend`, `Clicks` | Predicts whether an inquiry or registered lead will follow through with full enrollment or abandon the pipeline. |
| **Student Engagement Analysis** | `04_online_engagement`, `03_oulad` (studentVle, studentAssessment) | `study_hours_weekly`, `login_frequency_weekly`, `sum_click`, `activity_type`, `date_submitted`, `score` | Measures and visualizes how actively enrolled students interact with learning resources to trigger retention campaigns. |
| **Dropout Prediction** | `02_student_dropout`, `01_student_performance`, `03_oulad` (studentInfo), `04_online_engagement` | `Target`, `G3`, `final_result`, `dropout`, `failures`, `absences`, `date_unregistration` | Acts as an early-warning system to identify students at risk of leaving, enabling proactive counseling and customer success interventions. |
| **Sales/Enrollment Forecasting** | `05_education_marketing`, `03_oulad` (studentRegistration), `02_student_dropout` | `Date`, `Leads`, `Enrollments`, `date_registration` | Projects future enrollments and tuition revenue trends based on marketing spending and historic registration timelines. |
| **Marketing Analytics** | `05_education_marketing` | `Budget`, `AdSpend`, `Impressions`, `Clicks`, `Leads`, `Enrollments`, `ROAS`, `CAC`, `Channel` | Evaluates campaign performance, channel efficiency (CAC, cost per lead), and optimizes budget allocation across ad platforms. |

---

## 2. In-Depth Feature Support Details

### A. Lead Scoring
* **Source**: `02_student_dropout/data.csv` & `05_education_marketing/Marketing_Campaign_Data.xlsx`
* **Features**: Prior education quality (`Previous qualification`), `Admission grade`, applicant age, and acquisition channel (`Application mode`).
* **AI Output**: A score (0–100) indicating the likelihood of a prospect successfully converting and excelling academically.

### B. Dropout Prediction (Retention)
* **Source**: `02_student_dropout/data.csv`, `03_oulad` (studentInfo, studentVle, studentRegistration)
* **Features**: Demographics, socioeconomic background (`imd_band`), early-term grades, and digital engagement patterns (total clicks, forum posts).
* **AI Output**: Real-time risk probability of a student dropping out mid-term.

### C. Marketing Analytics & ROI Optimization
* **Source**: `05_education_marketing/Marketing_Campaign_Data.xlsx`
* **Features**: Spend, Clicks, Leads, Enrollments, Platform, TargetAudience.
* **AI Output**: Optimized budget distribution suggestions across Google, Facebook, and LinkedIn.
