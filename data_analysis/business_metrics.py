"""
Business Metrics Module for E-commerce Data Analysis

This module contains functions to calculate key business metrics for e-commerce data analysis.
All functions are designed to work with configurable date ranges and return structured results.
"""

import pandas as pd
from typing import Dict, List, Tuple, Optional
import numpy as np


def calculate_revenue_metrics(sales_data: pd.DataFrame, target_year: int, 
                            comparison_year: int) -> Dict[str, float]:
    """
    Calculate revenue metrics comparing target year vs comparison year.
    
    Args:
        sales_data: DataFrame with columns ['price', 'year']
        target_year: Primary year for analysis (e.g., 2023)
        comparison_year: Year to compare against (e.g., 2022)
        
    Returns:
        Dictionary containing revenue metrics
    """
    target_revenue = sales_data[sales_data['year'] == target_year]['price'].sum()
    comparison_revenue = sales_data[sales_data['year'] == comparison_year]['price'].sum()
    
    if comparison_revenue == 0:
        revenue_growth = 0
    else:
        revenue_growth = (target_revenue - comparison_revenue) / comparison_revenue * 100
    
    return {
        'target_year_revenue': target_revenue,
        'comparison_year_revenue': comparison_revenue,
        'revenue_growth_percent': revenue_growth,
        'target_year': target_year,
        'comparison_year': comparison_year
    }


def calculate_monthly_growth_trend(sales_data: pd.DataFrame, year: int) -> Dict[str, float]:
    """
    Calculate month-over-month growth trend for a specific year.
    
    Args:
        sales_data: DataFrame with columns ['price', 'year', 'month']
        year: Year to analyze
        
    Returns:
        Dictionary containing monthly growth metrics
    """
    year_data = sales_data[sales_data['year'] == year]
    monthly_revenue = year_data.groupby('month')['price'].sum()
    monthly_growth = monthly_revenue.pct_change()
    
    return {
        'monthly_growth_series': monthly_growth.to_dict(),
        'average_monthly_growth_percent': monthly_growth.mean() * 100,
        'year': year,
        'months_analyzed': len(monthly_revenue)
    }


def calculate_order_metrics(sales_data: pd.DataFrame, target_year: int, 
                          comparison_year: int) -> Dict[str, float]:
    """
    Calculate order-related metrics comparing two years.
    
    Args:
        sales_data: DataFrame with columns ['order_id', 'price', 'year']
        target_year: Primary year for analysis
        comparison_year: Year to compare against
        
    Returns:
        Dictionary containing order metrics
    """
    target_orders = sales_data[sales_data['year'] == target_year]
    comparison_orders = sales_data[sales_data['year'] == comparison_year]
    
    target_order_count = target_orders['order_id'].nunique()
    comparison_order_count = comparison_orders['order_id'].nunique()
    
    target_avg_order_value = target_orders.groupby('order_id')['price'].sum().mean()
    comparison_avg_order_value = comparison_orders.groupby('order_id')['price'].sum().mean()
    
    if comparison_order_count == 0:
        order_count_growth = 0
    else:
        order_count_growth = (target_order_count - comparison_order_count) / comparison_order_count * 100
    
    if comparison_avg_order_value == 0:
        avg_order_value_growth = 0
    else:
        avg_order_value_growth = (target_avg_order_value - comparison_avg_order_value) / comparison_avg_order_value * 100
    
    return {
        'target_year_orders': target_order_count,
        'comparison_year_orders': comparison_order_count,
        'order_count_growth_percent': order_count_growth,
        'target_year_avg_order_value': target_avg_order_value,
        'comparison_year_avg_order_value': comparison_avg_order_value,
        'avg_order_value_growth_percent': avg_order_value_growth,
        'target_year': target_year,
        'comparison_year': comparison_year
    }


def calculate_product_category_performance(sales_data: pd.DataFrame, 
                                         products_data: pd.DataFrame,
                                         year: int) -> pd.DataFrame:
    """
    Calculate revenue performance by product category for a specific year.
    
    Args:
        sales_data: DataFrame with columns ['product_id', 'price', 'year']
        products_data: DataFrame with columns ['product_id', 'product_category_name']
        year: Year to analyze
        
    Returns:
        DataFrame with category performance sorted by revenue descending
    """
    year_sales = sales_data[sales_data['year'] == year]
    
    sales_with_categories = pd.merge(
        products_data[['product_id', 'product_category_name']],
        year_sales[['product_id', 'price']],
        on='product_id'
    )
    
    category_performance = (sales_with_categories
                          .groupby('product_category_name')['price']
                          .agg(['sum', 'count', 'mean'])
                          .round(2))
    
    category_performance.columns = ['total_revenue', 'order_count', 'avg_order_value']
    category_performance = category_performance.sort_values('total_revenue', ascending=False)
    category_performance.reset_index(inplace=True)
    
    return category_performance


def calculate_geographic_performance(sales_data: pd.DataFrame, 
                                   orders_data: pd.DataFrame,
                                   customers_data: pd.DataFrame,
                                   year: int) -> pd.DataFrame:
    """
    Calculate revenue performance by state for a specific year.
    
    Args:
        sales_data: DataFrame with columns ['order_id', 'price', 'year']
        orders_data: DataFrame with columns ['order_id', 'customer_id']
        customers_data: DataFrame with columns ['customer_id', 'customer_state']
        year: Year to analyze
        
    Returns:
        DataFrame with state performance sorted by revenue descending
    """
    year_sales = sales_data[sales_data['year'] == year]
    
    # Merge sales with customer data
    sales_with_customers = pd.merge(
        year_sales[['order_id', 'price']],
        orders_data[['order_id', 'customer_id']],
        on='order_id'
    )
    
    sales_with_states = pd.merge(
        sales_with_customers,
        customers_data[['customer_id', 'customer_state']],
        on='customer_id'
    )
    
    state_performance = (sales_with_states
                        .groupby('customer_state')['price']
                        .agg(['sum', 'count'])
                        .round(2))
    
    state_performance.columns = ['total_revenue', 'order_count']
    state_performance = state_performance.sort_values('total_revenue', ascending=False)
    state_performance.reset_index(inplace=True)
    
    return state_performance


def categorize_delivery_speed(days: int) -> str:
    """
    Categorize delivery speed into business-relevant buckets.
    
    Args:
        days: Number of days for delivery
        
    Returns:
        String category for delivery speed
    """
    if days <= 3:
        return '1-3 days'
    elif days <= 7:
        return '4-7 days'
    else:
        return '8+ days'


def calculate_customer_experience_metrics(sales_data: pd.DataFrame, 
                                        reviews_data: pd.DataFrame,
                                        year: int) -> Dict[str, float]:
    """
    Calculate customer experience metrics including delivery speed and satisfaction.
    
    Args:
        sales_data: DataFrame with delivery speed and review data
        reviews_data: DataFrame with review scores
        year: Year to analyze
        
    Returns:
        Dictionary containing customer experience metrics
    """
    year_data = sales_data[sales_data['year'] == year].copy()
    
    # Calculate delivery speed if not already present
    if 'delivery_speed' not in year_data.columns:
        if 'order_delivered_customer_date' in year_data.columns and 'order_purchase_timestamp' in year_data.columns:
            year_data['delivery_speed'] = (
                pd.to_datetime(year_data['order_delivered_customer_date']) - 
                pd.to_datetime(year_data['order_purchase_timestamp'])
            ).dt.days
    
    # Merge with reviews
    if 'review_score' not in year_data.columns:
        year_data = pd.merge(year_data, reviews_data[['order_id', 'review_score']], on='order_id', how='left')
    
    # Remove duplicates for order-level analysis
    order_level_data = year_data[['order_id', 'delivery_speed', 'review_score']].drop_duplicates()
    
    # Calculate metrics
    avg_delivery_time = order_level_data['delivery_speed'].mean()
    avg_review_score = order_level_data['review_score'].mean()
    
    # Delivery speed categorization
    order_level_data['delivery_category'] = order_level_data['delivery_speed'].apply(categorize_delivery_speed)
    delivery_satisfaction = order_level_data.groupby('delivery_category')['review_score'].mean().to_dict()
    
    return {
        'average_delivery_days': avg_delivery_time,
        'average_review_score': avg_review_score,
        'delivery_satisfaction_by_speed': delivery_satisfaction,
        'total_orders_with_reviews': len(order_level_data),
        'year': year
    }


def calculate_order_status_distribution(orders_data: pd.DataFrame, year: int) -> Dict[str, float]:
    """
    Calculate the distribution of order statuses for a specific year.
    
    Args:
        orders_data: DataFrame with columns ['order_status', 'year']
        year: Year to analyze
        
    Returns:
        Dictionary with order status distribution percentages
    """
    year_orders = orders_data[orders_data['year'] == year]
    status_distribution = year_orders['order_status'].value_counts(normalize=True) * 100
    
    return {
        'status_distribution_percent': status_distribution.to_dict(),
        'total_orders': len(year_orders),
        'year': year
    }


def generate_monthly_revenue_data(sales_data: pd.DataFrame, year: int) -> pd.DataFrame:
    """
    Generate monthly revenue data for visualization purposes.
    
    Args:
        sales_data: DataFrame with columns ['price', 'year', 'month']
        year: Year to analyze
        
    Returns:
        DataFrame with monthly revenue data suitable for plotting
    """
    year_data = sales_data[sales_data['year'] == year]
    monthly_revenue = (year_data
                      .groupby(['year', 'month'])['price']
                      .sum()
                      .reset_index())
    
    return monthly_revenue


def filter_data_by_date_range(df: pd.DataFrame, 
                            timestamp_column: str,
                            start_year: int, 
                            end_year: int,
                            start_month: Optional[int] = None,
                            end_month: Optional[int] = None) -> pd.DataFrame:
    """
    Filter DataFrame by configurable date range.
    
    Args:
        df: Input DataFrame
        timestamp_column: Name of the timestamp column to filter on
        start_year: Starting year (inclusive)
        end_year: Ending year (inclusive)
        start_month: Starting month (optional, 1-12)
        end_month: Ending month (optional, 1-12)
        
    Returns:
        Filtered DataFrame
    """
    df_filtered = df.copy()
    df_filtered[timestamp_column] = pd.to_datetime(df_filtered[timestamp_column])
    df_filtered['year'] = df_filtered[timestamp_column].dt.year
    df_filtered['month'] = df_filtered[timestamp_column].dt.month
    
    # Filter by year range
    df_filtered = df_filtered[
        (df_filtered['year'] >= start_year) & 
        (df_filtered['year'] <= end_year)
    ]
    
    # Filter by month range if specified
    if start_month is not None and end_month is not None:
        df_filtered = df_filtered[
            (df_filtered['month'] >= start_month) & 
            (df_filtered['month'] <= end_month)
        ]
    
    return df_filtered