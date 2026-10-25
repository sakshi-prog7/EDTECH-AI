# Data Quality After Cleaning Report

This report evaluates the data quality state of all datasets following Phase 2 cleaning and preprocessing.

## 1. Quality Improvements Achieved

### A. Duplicate Status
- **Exact Duplicate Count**: **0** across all 14 cleaned tables.
- **Deduplication**: 787,170 exact duplicates in OULAD clickstream (`student_vle`) were successfully removed.

### B. Standardized Schema Names
- All column names across all 14 files have been normalized to `lowercase`, `snake_case`, resolving inconsistencies and stripping tab spaces (e.g. `Daytime/evening attendance\t` -> `daytime_evening_attendance`).

### C. Financial Normalization
- Rupee symbols (`₹`) and formatting commas have been stripped from the education marketing tables. Cost and performance metrics are now fully numeric floats, resolving parsing errors.

---

## 2. In-Depth Missing Values Profile
All missing values now have clean, documented, and semantically sound interpretations:

1. **OULAD `date_unregistration`**:
   - Mapped to a new categorical/binary helper column `unregistered_flag` (1 = Still Enrolled, 0 = Unregistered). Missing values in `date_unregistration` remain as `NaN`/null because they have semantic meaning (the student completed the class).
2. **OULAD `imd_band`**:
   - All null values have been mapped to an explicit category string `"unknown"`. This allows classification models to run without throwing errors while avoiding artificial imputation.
3. **OULAD `score`**:
   - Kept missing values intact (0.10% missing). Imputing zero would distort performance analytics for unattempted vs. failed assessments.
4. **OULAD `week_from` & `week_to`**:
   - Left missing as-is. Represents asynchronous resources available to students during the entire duration of the course presentation rather than a specific week.
5. **OULAD `date` (assessments)**:
   - Kept missing values as-is (5.34% missing), representing exams that are administered at the final date of the course.

*All other datasets have **0% missing values**.*

---

## 3. Data Leakage and Feature Risk
- Leakage risk categories for `student_dropout.csv` columns have been compiled in [dropout_feature_risk.csv](file:///c:/Users/Sanskruti/OneDrive/Desktop/EdTech_Sales_Genie_AI/reports/cleaning/dropout_feature_risk.csv).
- We categorized columns like second-semester academic variables and `date_unregistration` as **High Leakage Risk** to prevent them from being used in early-stage predictive modeling.

---

## 4. Post-Cleaning Validation Checks Passed
- **Empty Rows/Columns**: verified that no completely empty rows or columns exist in the output files.
- **Relational Integrity**: verified that ID keys (`id_student`, `id_site`, `id_assessment`, `code_module`, `code_presentation`) were kept intact as integer/string keys with no floating-point conversions, preserving table relationships.
- **Numerical Ranges**: verified that score percentages and metrics are within normal ranges (e.g. `attendance_rate` from 0.0 to 1.0, `score` from 0 to 100).
- **Parquet Verification**: Parquet files read correctly with identical row shapes as the post-dedup CSV counts.
