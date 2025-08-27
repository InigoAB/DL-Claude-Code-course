# E-commerce Data Analysis - Refactored

This directory contains a refactored version of the e-commerce exploratory data analysis with improved structure, documentation, and reusability.

## Overview

The refactored analysis provides a comprehensive business performance dashboard with configurable parameters for different time periods and comparison years. All visualizations and metrics maintain the same analytical depth as the original while adding professional structure and modularity.

## Files Structure

```
data_analysis/
├── EDA_Refactored.ipynb      # Main analysis notebook (refactored)
├── business_metrics.py       # Business metric calculation functions
├── data_loader.py           # Data loading and preprocessing utilities
├── requirements.txt         # Python dependencies
├── README.md               # This documentation
├── EDA.ipynb              # Original analysis notebook
└── ecommerce_data/        # Data directory
    ├── orders_dataset.csv
    ├── order_items_dataset.csv
    ├── products_dataset.csv
    ├── customers_dataset.csv
    └── order_reviews_dataset.csv
```

## Key Improvements

### 1. **Notebook Structure & Documentation**
- **Table of Contents**: Clear navigation with logical sections
- **Business Objectives**: Defined analysis goals and questions
- **Data Dictionary**: Comprehensive explanation of datasets and business terms
- **Executive Summary**: Key insights and actionable recommendations
- **Professional Formatting**: Clean markdown cells with consistent styling

### 2. **Code Quality & Modularity**
- **business_metrics.py**: Reusable functions for all business calculations
- **data_loader.py**: Centralized data loading, cleaning, and validation
- **Consistent Naming**: Clear variable names and function signatures
- **Error Handling**: Robust data validation and quality checks
- **Documentation**: Comprehensive docstrings for all functions

### 3. **Enhanced Visualizations**
- **Business Color Scheme**: Professional, consistent color palette
- **Clear Titles**: Descriptive titles with date ranges and context
- **Proper Axis Labels**: Units, formatting, and legends included
- **Interactive Maps**: Plotly geographic visualizations for state performance
- **Multi-panel Dashboards**: Comprehensive view of related metrics

### 4. **Configurable Analysis Framework**
- **Time Period Selection**: Easy configuration for any month/year combination
- **Comparison Years**: Flexible year-over-year analysis
- **Modular Functions**: Reusable for different datasets and time periods
- **Parameter-driven**: Single configuration section controls entire analysis

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Analysis
Open `EDA_Refactored.ipynb` and modify the configuration section:

```python
# Analysis Configuration
ANALYSIS_YEAR = 2023          # Primary year for analysis
COMPARISON_YEAR = 2022        # Year to compare against
ANALYSIS_MONTHS = None        # Specific months (None = all months)
DATA_PATH = 'ecommerce_data'  # Path to data directory
```

### 3. Run Analysis
Execute all cells in the notebook to generate the complete business performance report.

## Key Business Metrics

The analysis provides comprehensive insights across multiple dimensions:

### Financial Performance
- **Total Revenue**: Year-over-year revenue comparison
- **Revenue Growth**: Monthly and annual growth rates
- **Average Order Value (AOV)**: Order value trends and growth
- **Order Volume**: Number of orders and growth patterns

### Product Performance
- **Category Revenue**: Revenue by product category with rankings
- **Product Portfolio**: Distribution and concentration analysis
- **Top Performers**: Best-selling categories and revenue drivers

### Geographic Analysis
- **State Performance**: Revenue by customer state
- **Geographic Distribution**: Interactive maps and regional insights
- **Market Concentration**: Geographic revenue distribution

### Customer Experience
- **Satisfaction Scores**: Average review ratings and distribution
- **Delivery Performance**: Average delivery times and impact on satisfaction
- **Service Quality**: Delivery speed categorization and satisfaction correlation

### Operational Metrics
- **Order Status Distribution**: Fulfillment success rates
- **Delivery Success Rate**: Percentage of successfully delivered orders
- **Cancellation Rates**: Order cancellation analysis

## Using the Modules

### Business Metrics Module
```python
from business_metrics import calculate_revenue_metrics, calculate_order_metrics

# Calculate revenue performance
revenue_data = calculate_revenue_metrics(
    sales_data, 
    target_year=2023, 
    comparison_year=2022
)

# Calculate order metrics
order_data = calculate_order_metrics(
    sales_data,
    target_year=2023,
    comparison_year=2022
)
```

### Data Loader Module
```python
from data_loader import load_and_prepare_analysis_data, filter_by_date_range

# Load and prepare data
sales_data, raw_datasets = load_and_prepare_analysis_data(
    data_path='ecommerce_data',
    filter_delivered=True
)

# Filter by specific date range
filtered_data = filter_by_date_range(
    sales_data,
    start_year=2023,
    start_month=6,
    end_month=12
)
```

## Customization Examples

### Quarterly Analysis
```python
# Q4 2023 Analysis
ANALYSIS_YEAR = 2023
ANALYSIS_MONTHS = [10, 11, 12]  # October, November, December
COMPARISON_YEAR = 2022
```

### Custom Date Range
```python
# Summer 2023 vs Summer 2022
ANALYSIS_YEAR = 2023
ANALYSIS_MONTHS = [6, 7, 8]  # June, July, August
COMPARISON_YEAR = 2022
```

### Multi-Year Trend Analysis
Modify the business_metrics functions to accept multiple years for trend analysis across longer periods.

## Data Quality Features

The refactored analysis includes comprehensive data validation:

- **Missing Data Detection**: Identifies and reports missing values
- **Data Type Validation**: Ensures proper data types for calculations
- **Outlier Detection**: Flags potential data quality issues
- **Date Range Validation**: Confirms data availability for analysis periods
- **Duplicate Detection**: Identifies and handles duplicate records

## Visualization Enhancements

### Professional Styling
- Consistent color scheme across all visualizations
- Business-appropriate color palette
- Clear, readable fonts and formatting
- Proper scaling and axis formatting

### Interactive Elements
- Plotly-based geographic maps
- Hover information and drill-down capabilities
- Responsive design for different display sizes

### Dashboard Layout
- Multi-panel layouts for comprehensive views
- Logical grouping of related metrics
- Executive summary with key performance indicators

## Extending the Analysis

The modular design makes it easy to extend the analysis:

### Adding New Metrics
1. Create new functions in `business_metrics.py`
2. Add corresponding visualizations in the notebook
3. Update the executive summary section

### New Data Sources
1. Add loading functions to `data_loader.py`
2. Update the data dictionary documentation
3. Create new analysis sections as needed

### Custom Visualizations
1. Use the established color scheme (`BUSINESS_COLORS`)
2. Follow the consistent formatting patterns
3. Include proper titles, labels, and legends

## Performance Considerations

- **Memory Efficiency**: Data is filtered early to reduce memory usage
- **Computation Optimization**: Metrics are calculated once and reused
- **Modular Loading**: Only required datasets are loaded when needed
- **Scalability**: Functions are designed to handle larger datasets

## Support and Maintenance

### Code Quality
- All functions include comprehensive docstrings
- Type hints are provided for better IDE support
- Error handling for common data issues
- Consistent naming conventions throughout

### Documentation
- Inline comments explain complex business logic
- Data dictionary provides context for all metrics
- Examples demonstrate proper usage patterns

---

This refactored analysis provides a professional, maintainable, and extensible framework for e-commerce business intelligence while preserving all the analytical insights from the original notebook.