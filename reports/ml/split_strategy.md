# Model Training Split Strategy

This document details the data partition strategy for the primary machine learning model.

---

## 1. Partition Ratios
We will partition our ML-ready dataset (`student_dropout_ml_ready.csv`) using the following ratio:
- **Train Set**: **70%** (used to fit model weights and estimators)
- **Validation Set**: **15%** (used for hyperparameter tuning and model selection)
- **Test Set**: **15%** (kept entirely independent for final performance reporting)

---

## 2. Partition Strategy: Stratified Split
- **Why Stratified?**: Because the dataset contains multiclass labels with a minority class (`Enrolled` at 17.9%), a random split risks generating train/test sets with differing class distributions.
- **Implementation**: We will use stratified sampling on the `target` column to ensure that the 70/15/15 split maintains exactly:
  * Graduate: ~50.0%
  * Dropout: ~32.1%
  * Enrolled: ~17.9%
  across all three sub-splits.

---

## 3. Preprocessing Isolation (Data Leakage Prevention)
To ensure no data leakage:
1. The partition split will be executed **before** any scaling or encoding fits occur.
2. The `StandardScaler` and `OneHotEncoder` parameters will be fitted **only** on the 70% Training split.
3. The fitted transformers will then be applied (transform only) to the Validation and Test sets.
