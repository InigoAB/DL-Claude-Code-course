"""
Data Loader Module for E-commerce Data Analysis

This module handles loading, processing, and cleaning of e-commerce datasets.
It provides functions to load individual datasets and create merged datasets
for analysis while handling common data quality issues.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
import os
import warnings


def load_orders_data(file_path: str) -> pd.DataFrame:
    """
    Load and process orders dataset.
    
    Args:
        file_path: Path to orders CSV file
        
    Returns:
        Processed orders DataFrame with datetime columns and derived fields
    """
    orders = pd.read_csv(file_path)
    
    # Convert timestamp columns to datetime
    timestamp_columns = [
        'order_purchase_timestamp', 
        'order_approved_at',
        'order_delivered_carrier_date', 
        'order_delivered_customer_date',
        'order_estimated_delivery_date'
    ]
    
    for col in timestamp_columns:
        if col in orders.columns:
            orders[col] = pd.to_datetime(orders[col], errors='coerce')
    
    # Extract year and month from purchase timestamp
    orders['year'] = orders['order_purchase_timestamp'].dt.year
    orders['month'] = orders['order_purchase_timestamp'].dt.month
    
    return orders


def load_order_items_data(file_path: str) -> pd.DataFrame:
    """
    Load and process order items dataset.
    
    Args:
        file_path: Path to order items CSV file
        
    Returns:
        Processed order items DataFrame
    """
    order_items = pd.read_csv(file_path)
    
    # Convert shipping limit date to datetime
    if 'shipping_limit_date' in order_items.columns:
        order_items['shipping_limit_date'] = pd.to_datetime(order_items['shipping_limit_date'], errors='coerce')
    
    return order_items


def load_products_data(file_path: str) -> pd.DataFrame:
    """
    Load and process products dataset.
    
    Args:
        file_path: Path to products CSV file
        
    Returns:
        Processed products DataFrame
    """
    products = pd.read_csv(file_path)
    
    # Handle missing product categories
    if 'product_category_name' in products.columns:
        products['product_category_name'] = products['product_category_name'].fillna('unknown')
    
    return products


def load_customers_data(file_path: str) -> pd.DataFrame:
    """
    Load and process customers dataset.
    
    Args:
        file_path: Path to customers CSV file
        
    Returns:
        Processed customers DataFrame
    """
    customers = pd.read_csv(file_path)
    
    # Clean state abbreviations (ensure uppercase)
    if 'customer_state' in customers.columns:
        customers['customer_state'] = customers['customer_state'].str.upper()
    
    return customers


def load_reviews_data(file_path: str) -> pd.DataFrame:
    """
    Load and process reviews dataset.
    
    Args:
        file_path: Path to reviews CSV file
        
    Returns:
        Processed reviews DataFrame
    """
    reviews = pd.read_csv(file_path)
    
    # Convert review dates to datetime
    date_columns = ['review_creation_date', 'review_answer_timestamp']
    for col in date_columns:
        if col in reviews.columns:
            reviews[col] = pd.to_datetime(reviews[col], errors='coerce')
    
    return reviews


def load_payments_data(file_path: str) -> pd.DataFrame:
    """
    Load and process order payments dataset if available.
    
    Args:
        file_path: Path to payments CSV file
        
    Returns:
        Processed payments DataFrame
    """
    try:
        payments = pd.read_csv(file_path)
        return payments
    except FileNotFoundError:
        return pd.DataFrame()


def load_all_datasets(data_directory: str) -> Dict[str, pd.DataFrame]:
    """
    Load all e-commerce datasets from a directory.
    
    Args:
        data_directory: Directory containing CSV files
        
    Returns:
        Dictionary with dataset names as keys and DataFrames as values
    """
    datasets = {}
    
    # Expected file mappings
    file_mappings = {
        'orders': 'orders_dataset.csv',
        'order_items': 'order_items_dataset.csv',
        'products': 'products_dataset.csv',
        'customers': 'customers_dataset.csv',
        'reviews': 'order_reviews_dataset.csv',
        'payments': 'order_payments_dataset.csv'
    }
    
    # Load each dataset using appropriate loader function
    for dataset_name, filename in file_mappings.items():
        file_path = os.path.join(data_directory, filename)
        
        if os.path.exists(file_path):
            if dataset_name == 'orders':
                datasets[dataset_name] = load_orders_data(file_path)
            elif dataset_name == 'order_items':
                datasets[dataset_name] = load_order_items_data(file_path)
            elif dataset_name == 'products':
                datasets[dataset_name] = load_products_data(file_path)
            elif dataset_name == 'customers':
                datasets[dataset_name] = load_customers_data(file_path)
            elif dataset_name == 'reviews':
                datasets[dataset_name] = load_reviews_data(file_path)
            elif dataset_name == 'payments':
                datasets[dataset_name] = load_payments_data(file_path)
        else:
            print(f"Warning: {filename} not found in {data_directory}")
    
    return datasets


def create_sales_dataset(order_items: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:
    """
    Create comprehensive sales dataset by merging order items with orders.
    
    Args:
        order_items: Order items DataFrame
        orders: Orders DataFrame
        
    Returns:
        Merged sales DataFrame with order and item information
    """
    # Select relevant columns for sales analysis
    order_items_cols = ['order_id', 'order_item_id', 'product_id', 'price', 'freight_value']
    orders_cols = ['order_id', 'customer_id', 'order_status', 'order_purchase_timestamp', 
                  'order_delivered_customer_date', 'year', 'month']
    
    sales_data = pd.merge(
        left=order_items[order_items_cols],
        right=orders[orders_cols],
        on='order_id',
        how='inner'
    )
    
    return sales_data


def filter_delivered_orders(sales_data: pd.DataFrame) -> pd.DataFrame:
    """
    Filter sales data to include only delivered orders.
    
    Args:
        sales_data: Sales DataFrame with order_status column
        
    Returns:
        DataFrame containing only delivered orders
    """
    delivered_orders = sales_data[sales_data['order_status'] == 'delivered'].copy()
    
    # Calculate delivery speed for delivered orders
    if 'order_delivered_customer_date' in delivered_orders.columns and 'order_purchase_timestamp' in delivered_orders.columns:
        delivered_orders['delivery_speed'] = (
            pd.to_datetime(delivered_orders['order_delivered_customer_date']) - 
            pd.to_datetime(delivered_orders['order_purchase_timestamp'])
        ).dt.days
    
    return delivered_orders


def create_analysis_ready_dataset(data_directory: str, 
                                filter_delivered: bool = True,
                                include_reviews: bool = True) -> Tuple[pd.DataFrame, Dict[str, pd.DataFrame]]:
    """
    Create a complete analysis-ready dataset with all necessary joins.
    
    Args:
        data_directory: Directory containing CSV files
        filter_delivered: Whether to filter for delivered orders only
        include_reviews: Whether to include review data in the main dataset
        
    Returns:
        Tuple of (main_sales_dataframe, supporting_dataframes_dict)
    """
    # Load all datasets
    datasets = load_all_datasets(data_directory)
    
    # Check required datasets are available
    required_datasets = ['orders', 'order_items']
    for dataset in required_datasets:
        if dataset not in datasets:
            raise ValueError(f"Required dataset '{dataset}' not found")
    
    # Create main sales dataset
    sales_data = create_sales_dataset(datasets['order_items'], datasets['orders'])
    
    # Filter for delivered orders if requested
    if filter_delivered:
        sales_data = filter_delivered_orders(sales_data)
    
    # Include reviews if available and requested
    if include_reviews and 'reviews' in datasets:
        sales_data = pd.merge(
            sales_data, 
            datasets['reviews'][['order_id', 'review_score']], 
            on='order_id', 
            how='left'
        )
    
    # Return main dataset and supporting datasets for additional analysis
    supporting_datasets = {k: v for k, v in datasets.items() if k not in ['orders', 'order_items']}
    
    return sales_data, supporting_datasets


def validate_data_quality(datasets: Dict[str, pd.DataFrame]) -> Dict[str, Dict]:
    """
    Perform basic data quality checks on loaded datasets.
    
    Args:
        datasets: Dictionary of loaded DataFrames
        
    Returns:
        Dictionary containing data quality metrics for each dataset
    """
    quality_report = {}
    
    for name, df in datasets.items():
        quality_metrics = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'missing_values': df.isnull().sum().to_dict(),
            'duplicate_rows': df.duplicated().sum(),
            'memory_usage_mb': df.memory_usage(deep=True).sum() / 1024 / 1024
        }
        
        # Dataset-specific checks
        if name == 'orders':
            quality_metrics['unique_orders'] = df['order_id'].nunique()
            quality_metrics['order_status_distribution'] = df['order_status'].value_counts().to_dict()
            
        elif name == 'order_items':
            quality_metrics['unique_orders'] = df['order_id'].nunique()
            quality_metrics['unique_products'] = df['product_id'].nunique()
            quality_metrics['price_statistics'] = df['price'].describe().to_dict()
            
        elif name == 'products':
            quality_metrics['unique_products'] = df['product_id'].nunique()
            if 'product_category_name' in df.columns:
                quality_metrics['unique_categories'] = df['product_category_name'].nunique()
                
        elif name == 'customers':
            quality_metrics['unique_customers'] = df['customer_id'].nunique()
            if 'customer_state' in df.columns:
                quality_metrics['unique_states'] = df['customer_state'].nunique()
        
        quality_report[name] = quality_metrics
    
    return quality_report


def get_data_dictionary() -> Dict[str, Dict[str, str]]:
    """
    Return data dictionary explaining key columns and business terms.
    
    Returns:
        Dictionary with dataset names and column descriptions
    """
    data_dictionary = {
        'orders': {
            'order_id': 'Unique identifier for each order',
            'customer_id': 'Unique identifier for each customer',
            'order_status': 'Current status of the order (delivered, canceled, etc.)',
            'order_purchase_timestamp': 'When the order was placed',
            'order_delivered_customer_date': 'When the order was delivered to customer',
            'year': 'Year extracted from purchase timestamp',
            'month': 'Month extracted from purchase timestamp'
        },
        'order_items': {
            'order_id': 'Unique identifier for each order',
            'order_item_id': 'Sequence number of item within the order',
            'product_id': 'Unique identifier for each product',
            'price': 'Price paid for the item (excluding freight)',
            'freight_value': 'Shipping cost for the item'
        },
        'products': {
            'product_id': 'Unique identifier for each product',
            'product_category_name': 'Category classification of the product',
            'product_weight_g': 'Product weight in grams',
            'product_length_cm': 'Product length in centimeters',
            'product_height_cm': 'Product height in centimeters',
            'product_width_cm': 'Product width in centimeters'
        },
        'customers': {
            'customer_id': 'Unique identifier for each customer',
            'customer_unique_id': 'Unique identifier across all customer records',
            'customer_zip_code_prefix': 'First 5 digits of customer zip code',
            'customer_city': 'Customer city name',
            'customer_state': 'Customer state abbreviation'
        },
        'reviews': {
            'review_id': 'Unique identifier for each review',
            'order_id': 'Order being reviewed',
            'review_score': 'Rating given by customer (1-5 scale)',
            'review_comment_title': 'Title of the review comment',
            'review_comment_message': 'Review message text',
            'review_creation_date': 'When the review was created'
        },
        'business_terms': {
            'Revenue': 'Total price value of delivered orders',
            'AOV': 'Average Order Value - mean total price per order',
            'MoM Growth': 'Month-over-Month growth percentage',
            'Delivery Speed': 'Days between order placement and delivery',
            'Customer Satisfaction': 'Average review score (1-5 scale)'
        }
    }
    
    return data_dictionary