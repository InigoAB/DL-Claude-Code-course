"""
Business Metrics Module

This module contains functions for calculating key business metrics
from e-commerce sales data including revenue, growth, customer experience,
and geographic analysis.
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, Any


def calculate_revenue_metrics(sales_data: pd.DataFrame, 
                            target_year: int = 2023, 
                            comparison_year: int = 2022) -> Dict[str, float]:
    """
    Calculate revenue metrics for a given year compared to a baseline year.
    
    Args:
        sales_data: DataFrame with sales data including 'price' and 'year' columns
        target_year: Year to analyze (default: 2023)
        comparison_year: Year to compare against (default: 2022)
    
    Returns:
        Dictionary containing revenue metrics:
        - total_revenue: Total revenue for target year
        - revenue_growth: Year-over-year revenue growth percentage
        - comparison_revenue: Total revenue for comparison year
    """
    target_data = sales_data[sales_data['year'] == target_year]
    comparison_data = sales_data[sales_data['year'] == comparison_year]
    
    total_revenue = target_data['price'].sum()
    comparison_revenue = comparison_data['price'].sum()
    
    if comparison_revenue > 0:
        revenue_growth = ((total_revenue - comparison_revenue) / comparison_revenue) * 100
    else:
        revenue_growth = 0.0
    
    return {
        'total_revenue': total_revenue,
        'revenue_growth': revenue_growth,
        'comparison_revenue': comparison_revenue
    }


def calculate_monthly_growth(sales_data: pd.DataFrame, year: int = 2023) -> Dict[str, Any]:
    """
    Calculate month-over-month growth rate for a specific year.
    
    Args:
        sales_data: DataFrame with sales data including 'price', 'month', 'year' columns
        year: Year to analyze (default: 2023)
    
    Returns:
        Dictionary containing:
        - monthly_growth_series: Series of month-over-month growth rates
        - average_monthly_growth: Average monthly growth rate
    """
    year_data = sales_data[sales_data['year'] == year]
    monthly_revenue = year_data.groupby('month')['price'].sum()
    monthly_growth = monthly_revenue.pct_change()
    
    return {
        'monthly_growth_series': monthly_growth,
        'average_monthly_growth': monthly_growth.mean() * 100
    }


def calculate_order_metrics(sales_data: pd.DataFrame, 
                          target_year: int = 2023, 
                          comparison_year: int = 2022) -> Dict[str, Any]:
    """
    Calculate order-related metrics including AOV and order count.
    
    Args:
        sales_data: DataFrame with sales data including 'order_id', 'price', 'year' columns
        target_year: Year to analyze (default: 2023)
        comparison_year: Year to compare against (default: 2022)
    
    Returns:
        Dictionary containing order metrics:
        - avg_order_value: Average order value for target year
        - total_orders: Total number of orders for target year
        - aov_growth: Year-over-year AOV growth percentage
        - order_count_growth: Year-over-year order count growth percentage
    """
    target_data = sales_data[sales_data['year'] == target_year]
    comparison_data = sales_data[sales_data['year'] == comparison_year]
    
    # Calculate AOV for both years
    target_aov = target_data.groupby('order_id')['price'].sum().mean()
    comparison_aov = comparison_data.groupby('order_id')['price'].sum().mean()
    
    # Calculate order counts
    target_orders = target_data['order_id'].nunique()
    comparison_orders = comparison_data['order_id'].nunique()
    
    # Calculate growth rates
    aov_growth = ((target_aov - comparison_aov) / comparison_aov) * 100 if comparison_aov > 0 else 0.0
    order_growth = ((target_orders - comparison_orders) / comparison_orders) * 100 if comparison_orders > 0 else 0.0
    
    return {
        'avg_order_value': target_aov,
        'total_orders': target_orders,
        'aov_growth': aov_growth,
        'order_count_growth': order_growth
    }


def calculate_product_category_performance(sales_data: pd.DataFrame, 
                                         products_data: pd.DataFrame, 
                                         year: int = 2023) -> pd.DataFrame:
    """
    Calculate revenue performance by product category for a specific year.
    
    Args:
        sales_data: DataFrame with sales data including 'product_id', 'price', 'year' columns
        products_data: DataFrame with product data including 'product_id', 'product_category_name'
        year: Year to analyze (default: 2023)
    
    Returns:
        DataFrame with product categories ranked by revenue (descending order)
    """
    year_data = sales_data[sales_data['year'] == year]
    
    # Merge sales with product categories
    sales_categories = pd.merge(
        products_data[['product_id', 'product_category_name']], 
        year_data[['product_id', 'price']], 
        on='product_id'
    )
    
    # Calculate revenue by category
    category_revenue = (sales_categories
                       .groupby('product_category_name')['price']
                       .sum()
                       .sort_values(ascending=False)
                       .reset_index())
    
    return category_revenue


def calculate_geographic_performance(sales_data: pd.DataFrame, 
                                   orders_data: pd.DataFrame, 
                                   customers_data: pd.DataFrame, 
                                   year: int = 2023) -> pd.DataFrame:
    """
    Calculate revenue performance by customer state for a specific year.
    
    Args:
        sales_data: DataFrame with sales data including 'order_id', 'price', 'year' columns
        orders_data: DataFrame with order data including 'order_id', 'customer_id'
        customers_data: DataFrame with customer data including 'customer_id', 'customer_state'
        year: Year to analyze (default: 2023)
    
    Returns:
        DataFrame with states ranked by revenue (descending order)
    """
    year_data = sales_data[sales_data['year'] == year]
    
    # Merge sales data with customer information
    sales_customers = pd.merge(
        year_data[['order_id', 'price']], 
        orders_data[['order_id', 'customer_id']], 
        on='order_id'
    )
    
    sales_states = pd.merge(
        sales_customers, 
        customers_data[['customer_id', 'customer_state']], 
        on='customer_id'
    )
    
    # Calculate revenue by state
    state_revenue = (sales_states
                    .groupby('customer_state')['price']
                    .sum()
                    .sort_values(ascending=False)
                    .reset_index())
    
    return state_revenue


def calculate_customer_experience_metrics(sales_data: pd.DataFrame, 
                                        reviews_data: pd.DataFrame, 
                                        year: int = 2023) -> Dict[str, Any]:
    """
    Calculate customer experience metrics including delivery times and review scores.
    
    Args:
        sales_data: DataFrame with sales data including delivery and timestamp columns
        reviews_data: DataFrame with review data including 'order_id', 'review_score'
        year: Year to analyze (default: 2023)
    
    Returns:
        Dictionary containing customer experience metrics:
        - avg_review_score: Average review score
        - avg_delivery_days: Average delivery time in days
        - review_distribution: Distribution of review scores
        - delivery_impact_on_reviews: Review scores by delivery speed categories
    """
    year_data = sales_data[sales_data['year'] == year].copy()
    
    # Calculate delivery speed
    year_data['delivery_speed'] = (
        year_data['order_delivered_customer_date'] - 
        year_data['order_purchase_timestamp']
    ).dt.days
    
    # Merge with reviews
    review_delivery = pd.merge(
        year_data[['order_id', 'delivery_speed']].drop_duplicates(), 
        reviews_data[['order_id', 'review_score']], 
        on='order_id'
    )
    
    # Categorize delivery speed
    def categorize_delivery_speed(days):
        if days <= 3:
            return '1-3 days'
        elif days <= 7:
            return '4-7 days'
        else:
            return '8+ days'
    
    review_delivery['delivery_category'] = review_delivery['delivery_speed'].apply(categorize_delivery_speed)
    
    # Calculate metrics
    avg_review_score = review_delivery['review_score'].mean()
    avg_delivery_days = review_delivery['delivery_speed'].mean()
    review_distribution = review_delivery['review_score'].value_counts(normalize=True).sort_index()
    delivery_impact = review_delivery.groupby('delivery_category')['review_score'].mean()
    
    return {
        'avg_review_score': avg_review_score,
        'avg_delivery_days': avg_delivery_days,
        'review_distribution': review_distribution,
        'delivery_impact_on_reviews': delivery_impact
    }


def calculate_order_status_distribution(orders_data: pd.DataFrame, year: int = 2023) -> pd.Series:
    """
    Calculate the distribution of order statuses for a specific year.
    
    Args:
        orders_data: DataFrame with order data including 'order_status', 'order_purchase_timestamp'
        year: Year to analyze (default: 2023)
    
    Returns:
        Series with normalized order status distribution
    """
    orders_data_copy = orders_data.copy()
    orders_data_copy['year'] = pd.to_datetime(orders_data_copy['order_purchase_timestamp']).dt.year
    year_orders = orders_data_copy[orders_data_copy['year'] == year]
    
    return year_orders['order_status'].value_counts(normalize=True)


def get_monthly_revenue_data(sales_data: pd.DataFrame, year: int = 2023) -> pd.DataFrame:
    """
    Get monthly revenue data for plotting purposes.
    
    Args:
        sales_data: DataFrame with sales data including 'price', 'month', 'year' columns
        year: Year to analyze (default: 2023)
    
    Returns:
        DataFrame with monthly revenue data for the specified year
    """
    year_data = sales_data[sales_data['year'] == year]
    monthly_revenue = (year_data
                      .groupby(['year', 'month'])['price']
                      .sum()
                      .reset_index())
    
    return monthly_revenue