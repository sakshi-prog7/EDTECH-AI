# Machine Learning Preprocessing Plan

This document establishes the preprocessing pipeline designed for the **Student Dropout & Success Prediction** model.

---

## 1. Feature Preprocessing Specifications

### A. Numerical Features
* **Strategy**: Standardize values to zero mean and unit variance.
* **Target Columns**: `admission_grade`, `previous_qualification_grade`, `age_at_enrollment`, `unemployment_rate`, `inflation_rate`, `gdp`.
* **Scaler**: `StandardScaler` from scikit-learn.
* **Imputation**: None required (dataset has 0% missing values). If raw values are fed in future, use median imputation.

### B. Categorical Features
* **Strategy**: One-hot encode nominal categories with multiple classes; binary map binary categories (0/1).
* **Target Columns**:
  - *Nominal*: `marital_status`, `application_mode`, `course`, `previous_qualification`, `mother_s_qualification`, `father_s_qualification`, `mother_s_occupation`, `father_s_occupation`.
  - *Binary/Pass-through*: `daytime_evening_attendance`, `displaced`, `educational_special_needs`, `gender`, `scholarship_holder`, `international`.
* **Encoder**: `OneHotEncoder(handle_unknown='ignore', drop='first')`.

### C. Target Variable
* **Strategy**: Label encoding.
* **Target Column**: `target`.
* **Classes**:
  - `Graduate` -> `0`
  - `Dropout` -> `1`
  - `Enrolled` -> `2`

---

## 2. Class Imbalance Mitigation
- **Imbalance Ratio**: The classes are distributed as: Graduate (49.9%), Dropout (32.1%), Enrolled (17.9%). Enrolled is a minority class.
- **Handling Strategy**:
  - Use **Class Weights** (e.g., `class_weight='balanced'` in Random Forest or XGBoost) to penalize minority misclassifications.
  - Avoid SMOTE or oversampling on the raw data files directly; any resampling must be performed strictly within the cross-validation folds during training.

---

## 3. Outliers
- Preserved. Academic features like older students (`age_at_enrollment`) or high admission scores represent real student diversity and are valuable signals for boosting algorithms.
