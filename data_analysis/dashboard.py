"""
E-commerce Analytics Dashboard

A professional Streamlit dashboard for analyzing e-commerce business metrics.
Converts the EDA_Refactored.ipynb analysis into an interactive web application.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, date
import sys
import os

# Add the current directory to path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data_loader import create_analysis_ready_dataset, validate_data_quality
from business_metrics import (
    calculate_revenue_metrics, calculate_monthly_growth_trend, calculate_order_metrics,
    calculate_product_category_performance, calculate_geographic_performance,
    calculate_customer_experience_metrics, filter_data_by_date_range
)

# Page configuration
st.set_page_config(
    page_title="E-commerce Analytics Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom CSS for professional styling
st.markdown("""
<style>
    .main .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
        max-width: 100%;
    }
    
    .metric-card {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #007acc;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: bold;
        color: #2c3e50;
        margin: 0;
    }
    
    .metric-label {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin: 0;
        margin-bottom: 0.5rem;
    }
    
    .metric-trend {
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .trend-positive {
        color: #27ae60;
    }
    
    .trend-negative {
        color: #e74c3c;
    }
    
    .chart-container {
        background-color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 1rem;
    }
    
    .header-title {
        font-size: 2.5rem;
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 0;
    }
    
    .review-stars {
        color: #f39c12;
        font-size: 1.5rem;
    }
</style>
""", unsafe_allow_html=True)

@st.cache_data
def load_data():
    """Load and cache the e-commerce data"""
    try:
        data_directory = 'ecommerce_data'
        sales_data, supporting_datasets = create_analysis_ready_dataset(
            data_directory, 
            filter_delivered=True, 
            include_reviews=True
        )
        return sales_data, supporting_datasets
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
        return None, None

def format_currency(value, suffix=''):
    """Format currency values for display"""
    if value >= 1_000_000:
        return f"${value/1_000_000:.1f}M{suffix}"
    elif value >= 1_000:
        return f"${value/1_000:.0f}K{suffix}"
    else:
        return f"${value:.0f}{suffix}"

def format_trend_indicator(current_value, previous_value, format_as_currency=True):
    """Create trend indicator with arrow and percentage"""
    if previous_value == 0:
        return "N/A"
    
    change_pct = ((current_value - previous_value) / previous_value) * 100
    arrow = "↗" if change_pct > 0 else "↘"
    color_class = "trend-positive" if change_pct > 0 else "trend-negative"
    
    return f'<span class="{color_class}">{arrow} {change_pct:.2f}%</span>'

def create_metric_card(label, value, trend_html="", format_as_currency=True):
    """Create a styled metric card"""
    if format_as_currency:
        display_value = format_currency(value)
    else:
        display_value = f"{value:,.0f}" if isinstance(value, (int, float)) else str(value)
    
    card_html = f"""
    <div class="metric-card">
        <p class="metric-label">{label}</p>
        <p class="metric-value">{display_value}</p>
        <p class="metric-trend">{trend_html}</p>
    </div>
    """
    return card_html

def create_revenue_trend_chart(sales_data, target_year, comparison_year):
    """Create revenue trend line chart with current and previous period"""
    current_data = sales_data[sales_data['year'] == target_year].groupby('month')['price'].sum().reset_index()
    previous_data = sales_data[sales_data['year'] == comparison_year].groupby('month')['price'].sum().reset_index()
    
    # Ensure we have data for all months in the filtered range
    if len(current_data) > 0:
        month_range = range(current_data['month'].min(), current_data['month'].max() + 1)
    else:
        month_range = range(1, 13)
    
    fig = go.Figure()
    
    # Current period - solid line
    fig.add_trace(go.Scatter(
        x=current_data['month'],
        y=current_data['price'],
        mode='lines+markers',
        name=f'{target_year}',
        line=dict(color='#007acc', width=3),
        marker=dict(size=8)
    ))
    
    # Previous period - dashed line
    fig.add_trace(go.Scatter(
        x=previous_data['month'],
        y=previous_data['price'],
        mode='lines+markers',
        name=f'{comparison_year}',
        line=dict(color='#95a5a6', width=2, dash='dash'),
        marker=dict(size=6)
    ))
    
    fig.update_layout(
        title="Monthly Revenue Trend",
        xaxis_title="Month",
        yaxis_title="Revenue",
        showlegend=True,
        hovermode='x unified',
        plot_bgcolor='white',
        xaxis=dict(showgrid=True, gridcolor='lightgray'),
        yaxis=dict(showgrid=True, gridcolor='lightgray', tickformat='$,.0f')
    )
    
    return fig

def create_category_chart(category_data):
    """Create top 10 categories bar chart with blue gradient"""
    top_10 = category_data.head(10)
    
    # Create blue gradient colors
    colors = [f'rgba(0, 123, 255, {0.4 + (i * 0.06)})' for i in range(len(top_10))]
    
    fig = go.Figure(data=[
        go.Bar(
            x=top_10['total_revenue'],
            y=[cat.replace('_', ' ').title() for cat in top_10['product_category_name']],
            orientation='h',
            marker_color=colors,
            text=[format_currency(val) for val in top_10['total_revenue']],
            textposition='outside'
        )
    ])
    
    fig.update_layout(
        title="Top 10 Product Categories by Revenue",
        xaxis_title="Revenue",
        yaxis_title="Category",
        showlegend=False,
        plot_bgcolor='white',
        xaxis=dict(showgrid=True, gridcolor='lightgray', tickformat='$,.0f'),
        yaxis=dict(showgrid=False)
    )
    
    return fig

def create_state_map(geographic_data):
    """Create US choropleth map for revenue by state"""
    fig = px.choropleth(
        geographic_data,
        locations='customer_state',
        color='total_revenue',
        locationmode='USA-states',
        scope='usa',
        title='Revenue by State',
        color_continuous_scale='Blues',
        labels={'total_revenue': 'Revenue ($)'}
    )
    
    fig.update_layout(
        plot_bgcolor='white',
        geo=dict(bgcolor='white')
    )
    
    return fig

def create_satisfaction_chart(customer_experience):
    """Create satisfaction vs delivery time bar chart"""
    delivery_satisfaction = pd.DataFrame.from_dict(
        customer_experience['delivery_satisfaction_by_speed'], 
        orient='index', 
        columns=['Avg_Review_Score']
    ).reset_index()
    delivery_satisfaction.columns = ['Delivery_Speed', 'Avg_Review_Score']
    
    fig = go.Figure(data=[
        go.Bar(
            x=delivery_satisfaction['Delivery_Speed'],
            y=delivery_satisfaction['Avg_Review_Score'],
            marker_color='#007acc',
            text=[f'{score:.2f}' for score in delivery_satisfaction['Avg_Review_Score']],
            textposition='outside'
        )
    ])
    
    fig.update_layout(
        title="Average Review Score by Delivery Speed",
        xaxis_title="Delivery Speed",
        yaxis_title="Average Review Score",
        showlegend=False,
        plot_bgcolor='white',
        yaxis=dict(range=[0, 5], showgrid=True, gridcolor='lightgray'),
        xaxis=dict(showgrid=False)
    )
    
    return fig

def main():
    """Main dashboard application"""
    
    # Load data
    sales_data, supporting_datasets = load_data()
    
    if sales_data is None:
        st.error("Failed to load data. Please check the data files.")
        return
    
    # Header Section
    col1, col2 = st.columns([2, 2])
    
    with col1:
        st.markdown('<h1 class="header-title">E-commerce Analytics Dashboard</h1>', unsafe_allow_html=True)
    
    with col2:
        # Create two columns for year and month filters
        filter_col1, filter_col2 = st.columns(2)
        
        with filter_col1:
            # Year range filter
            available_years = sorted(sales_data['year'].unique())
            selected_years = st.selectbox(
                "Years Comparison",
                options=[(2023, 2022), (2022, 2021)] if len(available_years) >= 2 else [(available_years[0], available_years[0])],
                format_func=lambda x: f"{x[0]} vs {x[1]}",
                key="year_selector"
            )
            target_year, comparison_year = selected_years
        
        with filter_col2:
            # Month range filter
            month_names = {
                1: "January", 2: "February", 3: "March", 4: "April",
                5: "May", 6: "June", 7: "July", 8: "August", 
                9: "September", 10: "October", 11: "November", 12: "December"
            }
            
            month_options = [
                (None, "Full Year"),
                ((1, 3), "Q1 (Jan-Mar)"),
                ((4, 6), "Q2 (Apr-Jun)"),
                ((7, 9), "Q3 (Jul-Sep)"),
                ((10, 12), "Q4 (Oct-Dec)"),
                ((1, 6), "H1 (Jan-Jun)"),
                ((7, 12), "H2 (Jul-Dec)")
            ]
            
            selected_months = st.selectbox(
                "Time Period",
                options=month_options,
                format_func=lambda x: x[1],
                key="month_selector"
            )
            
            month_range = selected_months[0]
    
    # Display current filter selection
    if month_range is not None:
        period_text = f"📊 Analysis Period: {target_year} vs {comparison_year} • {selected_months[1]}"
    else:
        period_text = f"📊 Analysis Period: {target_year} vs {comparison_year} • Full Year"
    
    st.markdown(f"*{period_text}*")
    st.markdown("---")
    
    # Filter data based on selected years and months
    filtered_data = sales_data[sales_data['year'].isin([target_year, comparison_year])]
    
    # Apply month filter if selected
    if month_range is not None:
        start_month, end_month = month_range
        filtered_data = filtered_data[
            (filtered_data['month'] >= start_month) & 
            (filtered_data['month'] <= end_month)
        ]
    
    # Calculate metrics
    revenue_metrics = calculate_revenue_metrics(filtered_data, target_year, comparison_year)
    order_metrics = calculate_order_metrics(filtered_data, target_year, comparison_year)
    monthly_growth = calculate_monthly_growth_trend(filtered_data, target_year)
    category_performance = calculate_product_category_performance(
        filtered_data, supporting_datasets['products'], target_year
    )
    geographic_performance = calculate_geographic_performance(
        filtered_data, sales_data, supporting_datasets['customers'], target_year
    )
    customer_experience = calculate_customer_experience_metrics(
        filtered_data, supporting_datasets['reviews'], target_year
    )
    
    # KPI Cards Row
    st.markdown("### Key Performance Indicators")
    
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    
    with kpi_col1:
        trend_html = format_trend_indicator(
            revenue_metrics['target_year_revenue'], 
            revenue_metrics['comparison_year_revenue']
        )
        card_html = create_metric_card(
            "Total Revenue", 
            revenue_metrics['target_year_revenue'], 
            trend_html
        )
        st.markdown(card_html, unsafe_allow_html=True)
    
    with kpi_col2:
        avg_growth = monthly_growth['average_monthly_growth_percent']
        growth_color = "trend-positive" if avg_growth > 0 else "trend-negative"
        growth_arrow = "↗" if avg_growth > 0 else "↘"
        growth_html = f'<span class="{growth_color}">{growth_arrow} {avg_growth:.2f}%</span>'
        
        card_html = create_metric_card(
            "Monthly Growth", 
            f"{avg_growth:.2f}%", 
            "Average MoM Growth",
            format_as_currency=False
        )
        st.markdown(card_html, unsafe_allow_html=True)
    
    with kpi_col3:
        trend_html = format_trend_indicator(
            order_metrics['target_year_avg_order_value'], 
            order_metrics['comparison_year_avg_order_value']
        )
        card_html = create_metric_card(
            "Average Order Value", 
            order_metrics['target_year_avg_order_value'], 
            trend_html
        )
        st.markdown(card_html, unsafe_allow_html=True)
    
    with kpi_col4:
        trend_html = format_trend_indicator(
            order_metrics['target_year_orders'], 
            order_metrics['comparison_year_orders'],
            format_as_currency=False
        )
        card_html = create_metric_card(
            "Total Orders", 
            order_metrics['target_year_orders'], 
            trend_html,
            format_as_currency=False
        )
        st.markdown(card_html, unsafe_allow_html=True)
    
    # Charts Grid (2x2)
    st.markdown("### Analytics Overview")
    
    chart_col1, chart_col2 = st.columns(2)
    
    with chart_col1:
        # Revenue trend chart
        revenue_chart = create_revenue_trend_chart(filtered_data, target_year, comparison_year)
        st.plotly_chart(revenue_chart, use_container_width=True)
        
        # State map
        state_map = create_state_map(geographic_performance)
        st.plotly_chart(state_map, use_container_width=True)
    
    with chart_col2:
        # Category chart
        category_chart = create_category_chart(category_performance)
        st.plotly_chart(category_chart, use_container_width=True)
        
        # Satisfaction chart
        satisfaction_chart = create_satisfaction_chart(customer_experience)
        st.plotly_chart(satisfaction_chart, use_container_width=True)
    
    # Bottom Row Cards
    st.markdown("### Customer Experience Metrics")
    
    bottom_col1, bottom_col2 = st.columns(2)
    
    with bottom_col1:
        # Calculate delivery time trend (simplified - using same year comparison)
        avg_delivery = customer_experience['average_delivery_days']
        delivery_html = f"{avg_delivery:.1f} days"
        
        card_html = f"""
        <div class="metric-card">
            <p class="metric-label">Average Delivery Time</p>
            <p class="metric-value">{delivery_html}</p>
            <p class="metric-trend">Target: ≤ 7 days</p>
        </div>
        """
        st.markdown(card_html, unsafe_allow_html=True)
    
    with bottom_col2:
        # Review score with stars
        avg_review = customer_experience['average_review_score']
        stars = "★" * int(avg_review) + "☆" * (5 - int(avg_review))
        
        card_html = f"""
        <div class="metric-card">
            <p class="metric-label">Average Review Score</p>
            <p class="metric-value">{avg_review:.2f}</p>
            <p class="review-stars">{stars}</p>
        </div>
        """
        st.markdown(card_html, unsafe_allow_html=True)
    
    # Footer
    st.markdown("---")
    st.markdown(f"*Dashboard last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")

if __name__ == "__main__":
    main()