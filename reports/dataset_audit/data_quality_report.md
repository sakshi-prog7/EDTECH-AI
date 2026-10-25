# Data Quality Audit Report

This report summarizes the data quality assessment of the five datasets located in `ALL UNCLEANED DS/`.

## 1. Overview of Datasets and Formats
- **Total Files/Tables Audited**: 14 (11 CSV files + 3 sheets from 1 Excel file)
- **Total Rows**: Over 10.9 million rows across all tables (dominated by `studentVle.csv` with 10.65M rows)
- **Encoding/Delimiters**:
  - `01_student_performance`: CSV format, semicolon (`;`) delimited.
  - `02_student_dropout`: CSV format, semicolon (`;`) delimited.
  - `03_oulad`: CSV format, comma (`,`) delimited.
  - `04_online_engagement`: CSV format, comma (`,`) delimited.
  - `05_education_marketing`: Excel (`.xlsx`) format.

---

## 2. Key Data Quality Findings

### A. Missing Values
Only the **OULAD** dataset contains missing/null values:
1. **`03_oulad/studentRegistration.csv`**:
   - `date_unregistration`: **22,521 missing values (69.10%)**.
     * *Interpretation*: This is structurally expected. A missing unregistration date indicates the student completed the course and did not drop out.
   - `date_registration`: **45 missing values (0.14%)**.
     * *Action*: Needs imputation or removal for models predicting enrollment timeline.
2. **`03_oulad/vle.csv`**:
   - `week_from` and `week_to`: **5,243 missing values (82.39%)**.
     * *Interpretation*: Most VLE resources are not scheduled for specific weeks but are available throughout the course.
3. **`03_oulad/studentInfo.csv`**:
   - `imd_band`: **1,111 missing values (3.41%)**.
     * *Interpretation*: Socio-demographic indicators are missing for some student zip codes/regions.
4. **`03_oulad/studentAssessment.csv`**:
   - `score`: **173 missing values (0.10%)**.
     * *Interpretation*: Students who submitted an assessment but whose score was not recorded or is pending.
5. **`03_oulad/assessments.csv`**:
   - `date`: **11 missing values (5.34%)**.
     * *Interpretation*: Unspecified deadline, usually representing exams that occur at the end of the presentation.

*All other datasets (Student Performance, Student Dropout, Online Engagement, Education Marketing) have **0% missing values**.*

### B. Duplicate Rows
- **`03_oulad/studentVle.csv`** contains **787,170 duplicate rows (7.39% of the table)**.
  * *Interpretation*: This is a serious issue. The duplicates occur because multiple logs of the same student interacting with the same VLE resource on the same day are recorded, or it represents logging pipeline duplication.
  * *Recommendation*: These should be aggregated (e.g., summing `sum_click` or removing duplicate rows) depending on whether the duplicate rows have distinct clicks or represent exact duplicates.
- *No other datasets contain duplicate rows.*

### C. Suspicious / Outlier Values
1. **`01_student_performance`**:
   - `absences`: Values up to **93** in Math and **32** in Portuguese. High absence counts are statistical outliers but represent real-world student behavior.
   - `G1`, `G2`, `G3`: Grades have a minimum value of **0**. A final grade of 0 (`G3`) is suspicious and may indicate the student dropped out or missed the exam.
2. **`02_student_dropout`**:
   - Outliers found in academic credit metrics (e.g., students credited with 20+ units or enrolled in a disproportionate number of courses).
3. **`04_online_engagement`**:
   - `study_hours_weekly` and `video_watch_time_min` contain extreme values that are statistically outliers under the IQR rule, but follow a normal distribution otherwise.
4. **`05_education_marketing`**:
   - `CAC` (Customer Acquisition Cost) and `ROAS` (Return on Ad Spend) contain high outliers due to low enrollment campaigns which spike costs or extreme positive returns.

### D. Constant or Near-Constant Columns
- No strict constant columns exist, but `02_student_dropout` has some fields with low variance (e.g., `Educational special needs`, `International`) where >98% of the values are 0.

### E. Inconsistent Categorical Values
- **`03_oulad/studentInfo.csv`**: `imd_band` has some inconsistent formatting representation (e.g. `"10-20%"` vs `"10-20"` or spacing variations depending on source, but values are generally clean).
- There are no major spelling or capitalization inconsistencies across the other categorical columns.

### F. Potential Data Leakage Risk
- **`03_oulad/studentRegistration.csv`**: `date_unregistration` is a direct proxy for the dropout target. If included as a predictor in a real-time predictive model, it will cause leakage.
- **`01_student_performance`**: `G1` and `G2` are intermediate grades. If predicting student performance or failure before the term starts, these columns cannot be used.
- **`02_student_dropout`**: Second semester performance metrics (`Curricular units 2nd sem...`) cannot be used to predict dropout early in the first semester.

### G. Potential PII (Personally Identifiable Information)
- **None** of the datasets contain direct PII (no names, phone numbers, exact street addresses, or email addresses).
- `04_online_engagement` contains a `student_id` but it is an anonymized surrogate key.
- `03_oulad` uses an anonymized `id_student`.
- `05_education_marketing` contains a `CampaignID` and `CampaignName`, which are campaign-level metadata.

---

## 3. Data Dictionary Note
A full schema definition and data profile for all 160+ unique columns across the 14 tables has been compiled and saved to [data_dictionary.xlsx](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/metadata/data_dictionary.xlsx).
