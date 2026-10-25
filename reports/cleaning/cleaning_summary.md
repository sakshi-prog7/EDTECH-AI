# Data Cleaning Summary Report

This report summarizes the results of Phase 2 — Controlled Data Cleaning for all datasets.

## 1. Executive Summary
- **Total Raw Files Audited**: 12 (11 CSVs + 1 Excel with 3 sheets)
- **Total Cleaned Files/Tables Saved**: 14 tables (7 CSVs + 7 Parquet files)
- **Total Rows Processed**: 11,024,628 rows
- **Total Rows Removed**: 787,170 rows (all were exact duplicate clickstream records in OULAD's `studentVle`)
- **Total Duplicate Rows Removed**: 787,170 rows
- **Total Columns Removed**: 0 columns (adhering to the column removal policy to preserve analytical value)
- **Total Columns Transformed**: 160+ column headers normalized to lowercase snake_case; monetary columns in marketing sheets converted from currency text to numeric floats.

---

## 2. Cleaned Files Registry

All cleaned outputs are saved under [data/cleaned/](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/):

### A. Student Performance (`01_student_performance/`)
* **[student_math.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/01_student_performance/student_math.csv)**: 395 rows, 33 columns.
* **[student_portuguese.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/01_student_performance/student_portuguese.csv)**: 649 rows, 33 columns.
* *Note*: 382 overlapping students were identified across both files using demographic matching keys.

### B. Student Dropout (`02_student_dropout/`)
* **[student_dropout.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/02_student_dropout/student_dropout.csv)**: 4,424 rows, 37 columns.

### C. OULAD (`03_oulad/`)
Converted to **Parquet** format for speed, compression, and memory optimization:
* **[courses.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/courses.parquet)**: 22 rows, 3 columns.
* **[assessments.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/assessments.parquet)**: 206 rows, 6 columns.
* **[vle.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/vle.parquet)**: 6,364 rows, 6 columns.
* **[studentInfo.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/studentInfo.parquet)**: 32,593 rows, 12 columns.
* **[studentRegistration.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/studentRegistration.parquet)**: 32,593 rows, 6 columns (includes new column: `unregistered_flag`).
* **[studentAssessment.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/studentAssessment.parquet)**: 173,912 rows, 5 columns.
* **[studentVle.parquet](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/03_oulad/studentVle.parquet)**: 9,868,110 rows, 6 columns.

### D. Online Engagement (`04_online_engagement/`)
* **[online_learning_engagement.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/04_online_engagement/online_learning_engagement.csv)**: 50,000 rows, 18 columns.

### E. Education Marketing (`05_education_marketing/`)
Extracted sheets from `Marketing_Campaign_Data.xlsx` into individual CSVs:
* **[marketing_campaignperformance.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/05_education_marketing/marketing_campaignperformance.csv)**: 763 rows, 13 columns.
* **[marketing_campaignmeta.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/05_education_marketing/marketing_campaignmeta.csv)**: 5 rows, 10 columns.
* **[marketing_channelrates.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/data/cleaned/05_education_marketing/marketing_channelrates.csv)**: 5 rows, 4 columns.

---

## 3. OULAD Cleaning and Aggregation
- **Duplicates removal**: 787,170 exact duplicate rows where `id_student`, `id_site`, `date`, and `sum_click` were completely identical were removed from `studentVle.csv`. This represents 7.39% data reduction, resolving data recording duplication issues.
- **`unregistered_flag` Creation**: In `student_registration`, we created `unregistered_flag` (1 = active/still registered, 0 = unregistered). This preserves the semantic meaning of missing `date_unregistration` values.

---

## 4. Marketing Formatting Cleanup
- Stripped currency sign (`₹`), removed thousand separators (`,`), and cleaned whitespaces from all cost, budget, and spend columns.
- Converted all monetary text strings into numeric float fields to enable financial modeling (ROAS, CAC, CPC).
- Saved as standalone `.csv` files maintaining relationship keys (`campaign_id` and `channel`).
