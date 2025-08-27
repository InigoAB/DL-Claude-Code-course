"""
Data Loader Module

This module handles loading, cleaning, and preprocessing of e-commerce data
from CSV files. It provides functions to load individual datasets and create
analysis-ready consolidated datasets.
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional
import os
import warnings

# Suppress pandas warnings for cleaner output
warnings.filterwarnings('ignore', category=pd.errors.SettingWithCopyWarning)


def load_raw_datasets(data_path: str = 'ecommerce_data') -> Dict[str, pd.DataFrame]:
    """
    Load all raw CSV datasets from the specified directory.
    
    Args:
        data_path: Path to directory containing CSV files
    
    Returns:
        Dictionary containing all loaded datasets
    """
    datasets = {}
    
    # Define expected files
    file_mapping = {
        'orders': 'orders_dataset.csv',
        'order_items': 'order_items_dataset.csv', 
        'products': 'products_dataset.csv',
        'customers': 'customers_dataset.csv',
        'reviews': 'order_reviews_dataset.csv'
    }
    
    for key, filename in file_mapping.items():
        file_path = os.path.join(data_path, filename)
        try:
            datasets[key] = pd.read_csv(file_path)
            print(f"Loaded {key}: {datasets[key].shape}")
        except FileNotFoundError:
            print(f"Warning: {filename} not found in {data_path}")
            datasets[key] = pd.DataFrame()
    
    return datasets


def clean_and_prepare_sales_data(orders: pd.DataFrame, 
                                order_items: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and merge orders and order_items data to create a consolidated sales dataset.
    
    Args:
        orders: Orders dataset
        order_items: Order items dataset
    
    Returns:
        Cleaned and merged sales dataframe with additional date columns
    """
    # Select relevant columns from each dataset
    orders_clean = orders[[
        'order_id', 
        'order_status', 
        'order_purchase_timestamp', 
        'order_delivered_customer_date'
    ]].copy()
    
    order_items_clean = order_items[[
        'order_id', 
        'order_item_id', 
        'product_id', 
        'price'
    ]].copy()
    
    # Merge the datasets
    sales_data = pd.merge(
        left=order_items_clean,
        right=orders_clean,
        on='order_id',
        how='left'
    )
    
    # Convert timestamps to datetime
    sales_data['order_purchase_timestamp'] = pd.to_datetime(sales_data['order_purchase_timestamp'])
    sales_data['order_delivered_customer_date'] = pd.to_datetime(sales_data['order_delivered_customer_date'])
    
    # Extract date components
    sales_data['year'] = sales_data['order_purchase_timestamp'].dt.year
    sales_data['month'] = sales_data['order_purchase_timestamp'].dt.month
    sales_data['day'] = sales_data['order_purchase_timestamp'].dt.day
    sales_data['quarter'] = sales_data['order_purchase_timestamp'].dt.quarter
    
    return sales_data


def filter_delivered_orders(sales_data: pd.DataFrame) -> pd.DataFrame:
    """
    Filter sales data to include only delivered orders.
    
    Args:
        sales_data: Sales dataframe with order status information
    
    Returns:
        Filtered dataframe containing only delivered orders
    """
    delivered_data = sales_data[sales_data['order_status'] == 'delivered'].copy()
    return delivered_data


def filter_by_date_range(data: pd.DataFrame, 
                        start_year: Optional[int] = None,
                        end_year: Optional[int] = None,
                        start_month: Optional[int] = None,
                        end_month: Optional[int] = None) -> pd.DataFrame:
    """
    Filter dataframe by date range based on year and/or month.
    
    Args:
        data: Dataframe with 'year' and 'month' columns
        start_year: Starting year (inclusive)
        end_year: Ending year (inclusive)
        start_month: Starting month (inclusive, 1-12)
        end_month: Ending month (inclusive, 1-12)
    
    Returns:
        Filtered dataframe
    """
    filtered_data = data.copy()
    
    if start_year is not None:
        filtered_data = filtered_data[filtered_data['year'] >= start_year]
    
    if end_year is not None:
        filtered_data = filtered_data[filtered_data['year'] <= end_year]
    
    if start_month is not None:
        filtered_data = filtered_data[filtered_data['month'] >= start_month]
    
    if end_month is not None:
        filtered_data = filtered_data[filtered_data['month'] <= end_month]
    
    return filtered_data


def get_data_summary(datasets: Dict[str, pd.DataFrame]) -> Dict[str, Dict]:
    """
    Generate summary statistics for all datasets.
    
    Args:
        datasets: Dictionary of dataframes
    
    Returns:
        Dictionary containing summary information for each dataset
    """
    summary = {}
    
    for name, df in datasets.items():
        if not df.empty:
            summary[name] = {
                'shape': df.shape,
                'columns': list(df.columns),
                'memory_usage_mb': df.memory_usage(deep=True).sum() / 1024 / 1024,
                'null_counts': df.isnull().sum().to_dict()
            }
        else:
            summary[name] = {'status': 'empty or not loaded'}
    
    return summary


def validate_data_quality(sales_data: pd.DataFrame) -> Dict[str, any]:
    """
    Validate data quality and identify potential issues.
    
    Args:
        sales_data: Sales dataframe to validate
    
    Returns:
        Dictionary containing data quality metrics and issues
    """
    quality_report = {}
    
    # Basic statistics
    quality_report['total_records'] = len(sales_data)
    quality_report['unique_orders'] = sales_data['order_id'].nunique()
    quality_report['date_range'] = {
        'start': sales_data['order_purchase_timestamp'].min(),
        'end': sales_data['order_purchase_timestamp'].max()
    }
    
    # Data quality checks
    quality_report['issues'] = {}
    
    # Check for negative prices
    negative_prices = sales_data['price'] < 0
    if negative_prices.any():
        quality_report['issues']['negative_prices'] = negative_prices.sum()
    
    # Check for missing essential data
    missing_order_ids = sales_data['order_id'].isnull().sum()
    if missing_order_ids > 0:
        quality_report['issues']['missing_order_ids'] = missing_order_ids
    
    missing_prices = sales_data['price'].isnull().sum()
    if missing_prices > 0:
        quality_report['issues']['missing_prices'] = missing_prices
    
    # Check for duplicate order items
    duplicate_items = sales_data.duplicated(['order_id', 'order_item_id']).sum()
    if duplicate_items > 0:
        quality_report['issues']['duplicate_order_items'] = duplicate_items
    
    # Price statistics
    quality_report['price_stats'] = {
        'min': sales_data['price'].min(),
        'max': sales_data['price'].max(),
        'mean': sales_data['price'].mean(),
        'median': sales_data['price'].median()
    }
    
    return quality_report


def load_and_prepare_analysis_data(data_path: str = 'ecommerce_data',
                                 filter_delivered: bool = True,
                                 start_year: Optional[int] = None,
                                 end_year: Optional[int] = None) -> Tuple[pd.DataFrame, Dict[str, pd.DataFrame]]:
    """
    Complete data loading and preparation pipeline for analysis.
    
    Args:
        data_path: Path to data directory
        filter_delivered: Whether to filter only delivered orders
        start_year: Optional start year filter
        end_year: Optional end year filter
    
    Returns:
        Tuple of (prepared_sales_data, raw_datasets_dict)
    """
    print("Loading raw datasets...")
    datasets = load_raw_datasets(data_path)
    
    print("Cleaning and preparing sales data...")
    sales_data = clean_and_prepare_sales_data(datasets['orders'], datasets['order_items'])
    
    if filter_delivered:
        print("Filtering delivered orders...")
        sales_data = filter_delivered_orders(sales_data)
    
    if start_year or end_year:
        print(f"Filtering by date range: {start_year} - {end_year}")
        sales_data = filter_by_date_range(sales_data, start_year=start_year, end_year=end_year)
    
    print("Validating data quality...")
    quality_report = validate_data_quality(sales_data)
    
    print(f"Data preparation complete:")
    print(f"  - Total records: {quality_report['total_records']:,}")
    print(f"  - Unique orders: {quality_report['unique_orders']:,}")
    print(f"  - Date range: {quality_report['date_range']['start'].strftime('%Y-%m-%d')} to {quality_report['date_range']['end'].strftime('%Y-%m-%d')}")
    
    if quality_report['issues']:
        print(f"  - Data quality issues found: {list(quality_report['issues'].keys())}")
    else:
        print("  - No data quality issues detected")
    
    return sales_data, datasets


def get_date_range_options(sales_data: pd.DataFrame) -> Dict[str, any]:
    """
    Get available date range options from the dataset.
    
    Args:
        sales_data: Sales dataframe with date columns
    
    Returns:
        Dictionary with available years, months, and quarters
    """
    return {
        'available_years': sorted(sales_data['year'].unique().tolist()),
        'available_months': sorted(sales_data['month'].unique().tolist()),
        'available_quarters': sorted(sales_data['quarter'].unique().tolist()),
        'date_range': {
            'min_date': sales_data['order_purchase_timestamp'].min(),
            'max_date': sales_data['order_purchase_timestamp'].max()
        }
    }