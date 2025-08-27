# DL Claude Code Course - Multi-Application Repository

This repository contains three main applications showcasing different aspects of data analysis and AI-powered interfaces:

## Applications Overview

### 🤖 RAG Chatbot (`ragchatbot/`)
A Retrieval-Augmented Generation system for course materials with intelligent search capabilities.
- **Tech Stack**: FastAPI, ChromaDB, Anthropic Claude, HTML/CSS/JS
- **Features**: Semantic search, tool-based AI, session management
- **Use Case**: Interactive course material exploration

### 📊 Data Analysis (`data_analysis/`)
Comprehensive e-commerce analytics framework with Jupyter notebooks and Streamlit dashboard.
- **Tech Stack**: Python, Pandas, Plotly, Streamlit, Jupyter
- **Features**: Business metrics, interactive dashboard, configurable analysis
- **Use Case**: E-commerce business intelligence

### 📈 FRED Economic Dashboard (`fred-data/`)
Modern Next.js dashboard for Federal Reserve Economic Data visualization.
- **Tech Stack**: Next.js, TypeScript, Tailwind CSS, Recharts
- **Features**: Real-time economic indicators, responsive design, comprehensive testing
- **Use Case**: Economic data monitoring and analysis


## Quick Start Guide

### 🤖 RAG Chatbot
```bash
cd ragchatbot
echo "ANTHROPIC_API_KEY=your_key_here" > .env
uv sync
./run.sh
# Access: http://localhost:8000
```

### 📊 Data Analysis Dashboard
```bash
cd data_analysis
uv sync
uv run streamlit run dashboard.py
# Access: http://localhost:8501
```

### 📈 FRED Economic Dashboard
```bash
cd fred-data
npm install
npm run dev
# Access: http://localhost:3000
```

## Prerequisites

- **For RAG Chatbot & Data Analysis**: Python 3.13+, uv package manager, Anthropic API key
- **For FRED Dashboard**: Node.js 18+, npm
- **For Windows**: Use Git Bash for shell commands

## E-commerce Data Analysis

This repository also includes a comprehensive e-commerce data analysis framework located in the `data_analysis/` directory.

### Overview

The data analysis framework provides a refactored, configurable approach to analyzing e-commerce sales data with focus on business metrics and performance indicators.

### Key Features

- **Configurable Analysis**: Easily analyze different time periods and date ranges
- **Modular Design**: Reusable functions for data loading and business metrics calculation
- **Comprehensive Metrics**: Revenue, product performance, geographic, and customer experience analysis
- **Professional Visualizations**: Business-oriented charts and plots with consistent styling
- **Documentation**: Well-documented code with clear business context

### Files Structure

```
data_analysis/
├── EDA_Refactored.ipynb     # Main analysis notebook with improved structure
├── business_metrics.py      # Business metrics calculation functions
├── data_loader.py          # Data loading and processing functions
├── ecommerce_data/         # E-commerce datasets (CSV files)
└── EDA.ipynb              # Original analysis (for reference)
```

### Getting Started with Data Analysis

1. **Install required dependencies** (if not already installed):
   ```bash
   uv sync
   ```

2. **Start Jupyter**:
   ```bash
   uv run jupyter notebook
   ```

3. **Open the refactored notebook**:
   Navigate to `data_analysis/EDA_Refactored.ipynb`

4. **Configure analysis parameters**:
   Modify the configuration cell to analyze different time periods:
   ```python
   TARGET_YEAR = 2023        # Primary year for analysis
   COMPARISON_YEAR = 2022    # Year to compare against
   ANALYSIS_MONTHS = None    # Optional: (start_month, end_month) for partial year
   ```

### Analysis Configuration

The framework is designed to be highly configurable:

- **Time Period Selection**: Analyze any year or specific month ranges
- **Comparison Analysis**: Compare performance between different time periods
- **Filter Options**: Include/exclude different order statuses or customer segments
- **Visualization Themes**: Consistent business-oriented color schemes

### Key Business Metrics

The analysis calculates and visualizes:

- **Revenue Analysis**: Total revenue, growth trends, month-over-month comparisons
- **Order Performance**: Order volume, average order value, conversion rates
- **Product Analysis**: Category performance, top-selling products
- **Geographic Distribution**: Sales by state/region with choropleth maps
- **Customer Experience**: Delivery speed analysis, review scores, satisfaction metrics
- **Operational Metrics**: Order status distribution, fulfillment rates

### Reusable Functions

The `business_metrics.py` module provides functions for:
- `calculate_revenue_metrics()` - Revenue and growth calculations
- `calculate_order_metrics()` - Order volume and value analysis
- `calculate_product_category_performance()` - Product category insights
- `calculate_geographic_performance()` - Geographic distribution analysis
- `calculate_customer_experience_metrics()` - Customer satisfaction analysis

The `data_loader.py` module handles:
- Loading and validating e-commerce datasets
- Data quality checks and preprocessing
- Creating analysis-ready merged datasets
- Configurable date range filtering

### Data Dictionary

The framework includes comprehensive data documentation:
- **Business Terms**: Revenue, AOV, MoM Growth, Customer Satisfaction
- **Column Definitions**: Detailed explanations of all data fields
- **Data Quality Reports**: Automatic validation and quality metrics

### Usage Examples

**Basic Analysis**:
```python
from business_metrics import calculate_revenue_metrics
from data_loader import create_analysis_ready_dataset

# Load data
sales_data, datasets = create_analysis_ready_dataset('ecommerce_data/')

# Calculate revenue metrics
revenue_metrics = calculate_revenue_metrics(sales_data, 2023, 2022)
print(f"Revenue growth: {revenue_metrics['revenue_growth_percent']:.2f}%")
```

**Custom Date Range**:
```python
from business_metrics import filter_data_by_date_range

# Analyze Q1 2023 data
q1_data = filter_data_by_date_range(
    sales_data, 
    'order_purchase_timestamp',
    2023, 2023, 1, 3  # Jan-Mar 2023
)
```

### Success Criteria Met

The refactored analysis framework successfully addresses all requirements:

✅ **Easy-to-read Code**: Clean, documented functions with clear business context
✅ **Configurable Analysis**: Works for any date range without code changes
✅ **Reusable Code**: Modular functions applicable to future datasets
✅ **Maintainable Structure**: Well-organized code that analysts can easily extend
✅ **Preserved Analysis**: All original analyses maintained while improving quality
✅ **No Assumed Thresholds**: Business metrics calculated without hardcoded assumptions

The framework transforms the original ad-hoc analysis into a professional, production-ready analytical tool suitable for ongoing business intelligence and decision-making.

## E-commerce Analytics Dashboard

The repository also includes a professional Streamlit dashboard that converts the EDA analysis into an interactive web application for real-time business intelligence.

### Dashboard Features

**Interactive Layout:**
- **Header**: Business title with dual filtering system (years + time periods)
- **KPI Cards**: Total Revenue, Monthly Growth, Average Order Value, Total Orders (with trend indicators)
- **Analytics Grid**: 2x2 layout with revenue trends, top categories, geographic distribution, and customer satisfaction
- **Experience Metrics**: Average delivery time and review scores with star ratings

**Key Capabilities:**
- **Dual Filtering System**: Year-over-year comparison plus time period selection (Q1-Q4, H1-H2, Full Year)
- Real-time filtering affecting all metrics and visualizations
- Professional styling with color-coded trend indicators (green/red)
- Interactive Plotly charts with hover details and zoom capabilities
- Responsive design optimized for business stakeholders

### Running the Dashboard

1. **Install dependencies** (includes Streamlit):
   ```bash
   uv sync
   ```

2. **Launch the dashboard**:
   ```bash
   cd data_analysis
   uv run streamlit run dashboard.py
   ```

3. **Access the application**:
   - Local: http://localhost:8501
   - Network sharing: Add `--server.address=0.0.0.0`

### Dashboard Structure

The dashboard automatically:
- Loads and validates all e-commerce datasets
- Provides year-over-year comparison filtering
- Calculates business metrics with trend analysis
- Renders interactive visualizations using Plotly
- Implements data caching for optimal performance

**Chart Types:**
- **Revenue Trend**: Line chart with current (solid) vs previous (dashed) periods
- **Category Performance**: Horizontal bar chart with blue gradient
- **Geographic Analysis**: US choropleth map with revenue distribution
- **Customer Experience**: Satisfaction scores by delivery speed

The dashboard transforms static analysis into dynamic business intelligence, enabling stakeholders to explore data interactively and make data-driven decisions.

