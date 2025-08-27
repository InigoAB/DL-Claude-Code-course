'use client';

import { useState } from 'react';
import CPIChart from './CPIChart';
import LaborStatsChart from './LaborStatsChart';
import InterestRatesLongTermChart from './InterestRatesLongTermChart';
import InterestRatesShortTermChart from './InterestRatesShortTermChart';
import InflationComparisonChart from './InflationComparisonChart';
import EmploymentMetricsChart from './EmploymentMetricsChart';
import FederalFundsRateChart from './FederalFundsRateChart';
import TreasuryYieldCurveChart from './TreasuryYieldCurveChart';
import EconomicGrowthChart from './EconomicGrowthChart';
import BusinessInvestmentChart from './BusinessInvestmentChart';
import HousingMarketChart from './HousingMarketChart';
import RealEstateInvestmentChart from './RealEstateInvestmentChart';
import ConsumerSpendingChart from './ConsumerSpendingChart';
import RetailSalesCategoryChart from './RetailSalesCategoryChart';
import MajorCurrencyPairsChart from './MajorCurrencyPairsChart';
import DollarIndexChart from './DollarIndexChart';
import PCEInflationChart from './PCEInflationChart';
import JoblessClaimsWageChart from './JoblessClaimsWageChart';
import ManufacturingBusinessChart from './ManufacturingBusinessChart';
import BuildingPermitsHomeSalesChart from './BuildingPermitsHomeSalesChart';
import CreditCardSeasonalChart from './CreditCardSeasonalChart';
import EmergingMarketCurrenciesChart from './EmergingMarketCurrenciesChart';
import Sidebar from './Sidebar';

type CategoryType = 'Key Indicators' | 'Inflation' | 'Employment' | 'Interest Rates' | 'Economic Growth' | 'Exchange Rates' | 'Housing' | 'Consumer Spending';

export default function Dashboard() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('Key Indicators');

  const getCategoryDescription = (category: CategoryType) => {
    switch (category) {
      case 'Key Indicators':
        return 'Essential economic metrics for market overview';
      case 'Inflation':
        return 'Price level changes and inflation measures';
      case 'Employment':
        return 'Labor market statistics and workforce metrics';
      case 'Interest Rates':
        return 'Federal Reserve rates and treasury yields';
      case 'Economic Growth':
        return 'GDP, productivity and economic expansion metrics';
      case 'Exchange Rates':
        return 'Currency exchange rates and international trade';
      case 'Housing':
        return 'Real estate market and housing sector indicators';
      case 'Consumer Spending':
        return 'Consumption patterns and retail spending data';
      default:
        return 'Real-time economic data from the Federal Reserve Economic Data (FRED) system';
    }
  };

  const renderCharts = () => {
    switch (activeCategory) {
      case 'Key Indicators':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Consumer Price Index
                </h2>
                <div className="text-sm text-slate-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Last 5 Years
                </div>
              </div>
              <div className="h-[430px]">
                <CPIChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  US Unemployment Rate
                </h2>
                <div className="text-sm text-slate-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                  Key Periods
                </div>
              </div>
              <div className="h-[430px]">
                <LaborStatsChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  10-Year Treasury Yields
                </h2>
                <div className="text-sm text-slate-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  Long-term
                </div>
              </div>
              <div className="h-[430px]">
                <InterestRatesLongTermChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  3-Month Treasury Rates
                </h2>
                <div className="text-sm text-slate-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  Short-term
                </div>
              </div>
              <div className="h-[430px]">
                <InterestRatesShortTermChart />
              </div>
            </div>
          </>
        );

      case 'Inflation':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Headline vs Core CPI
                </h2>
                <div className="text-sm text-slate-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                  Comparison
                </div>
              </div>
              <div className="h-[430px]">
                <InflationComparisonChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Consumer Price Index
                </h2>
                <div className="text-sm text-slate-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Headline CPI
                </div>
              </div>
              <div className="h-[430px]">
                <CPIChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95 col-span-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  PCE Inflation & Producer Prices
                </h2>
                <div className="text-sm text-slate-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                  Advanced Analysis
                </div>
              </div>
              <div className="h-[430px]">
                <PCEInflationChart />
              </div>
            </div>
          </>
        );

      case 'Interest Rates':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Federal Funds Rate
                </h2>
                <div className="text-sm text-slate-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Policy Stance
                </div>
              </div>
              <div className="h-[430px]">
                <FederalFundsRateChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Treasury Yield Curve
                </h2>
                <div className="text-sm text-slate-500 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                  Multi-Maturity
                </div>
              </div>
              <div className="h-[430px]">
                <TreasuryYieldCurveChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  10-Year Treasury Yields
                </h2>
                <div className="text-sm text-slate-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  Long-term
                </div>
              </div>
              <div className="h-[430px]">
                <InterestRatesLongTermChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  3-Month Treasury Rates
                </h2>
                <div className="text-sm text-slate-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  Short-term
                </div>
              </div>
              <div className="h-[430px]">
                <InterestRatesShortTermChart />
              </div>
            </div>
          </>
        );

      case 'Employment':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Employment Metrics Overview
                </h2>
                <div className="text-sm text-slate-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  Multi-Series
                </div>
              </div>
              <div className="h-[430px]">
                <EmploymentMetricsChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  US Unemployment Rate
                </h2>
                <div className="text-sm text-slate-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                  Key Periods
                </div>
              </div>
              <div className="h-[430px]">
                <LaborStatsChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95 col-span-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Jobless Claims & Wage Growth
                </h2>
                <div className="text-sm text-slate-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  Labor Market Dynamics
                </div>
              </div>
              <div className="h-[430px]">
                <JoblessClaimsWageChart />
              </div>
            </div>
          </>
        );

      case 'Economic Growth':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  GDP & Industrial Production
                </h2>
                <div className="text-sm text-slate-500 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Growth Trends
                </div>
              </div>
              <div className="h-[430px]">
                <EconomicGrowthChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Business Investment & Productivity
                </h2>
                <div className="text-sm text-slate-500 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  Capital Efficiency
                </div>
              </div>
              <div className="h-[430px]">
                <BusinessInvestmentChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95 col-span-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Manufacturing PMI & Business Confidence
                </h2>
                <div className="text-sm text-slate-500 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Leading Indicators
                </div>
              </div>
              <div className="h-[430px]">
                <ManufacturingBusinessChart />
              </div>
            </div>
          </>
        );

      case 'Housing':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Housing Market Overview
                </h2>
                <div className="text-sm text-slate-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  Market Activity
                </div>
              </div>
              <div className="h-[430px]">
                <HousingMarketChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Real Estate Investment Trends
                </h2>
                <div className="text-sm text-slate-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                  Investment Analysis
                </div>
              </div>
              <div className="h-[430px]">
                <RealEstateInvestmentChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95 col-span-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Building Permits & Home Sales Activity
                </h2>
                <div className="text-sm text-slate-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  Construction Pipeline
                </div>
              </div>
              <div className="h-[430px]">
                <BuildingPermitsHomeSalesChart />
              </div>
            </div>
          </>
        );

      case 'Consumer Spending':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Consumer Spending & Confidence
                </h2>
                <div className="text-sm text-slate-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                  Spending Power
                </div>
              </div>
              <div className="h-[430px]">
                <ConsumerSpendingChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Retail Sales by Category
                </h2>
                <div className="text-sm text-slate-500 bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                  Category Breakdown
                </div>
              </div>
              <div className="h-[430px]">
                <RetailSalesCategoryChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95 col-span-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Credit Card Spending & Seasonal Trends
                </h2>
                <div className="text-sm text-slate-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                  Credit & Seasonality
                </div>
              </div>
              <div className="h-[430px]">
                <CreditCardSeasonalChart />
              </div>
            </div>
          </>
        );

      case 'Exchange Rates':
        return (
          <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Major Currency Pairs
                </h2>
                <div className="text-sm text-slate-500 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
                  USD vs Major Currencies
                </div>
              </div>
              <div className="h-[430px]">
                <MajorCurrencyPairsChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Dollar Index & Trade Balance
                </h2>
                <div className="text-sm text-slate-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  USD Strength
                </div>
              </div>
              <div className="h-[430px]">
                <DollarIndexChart />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:bg-white/95 col-span-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 font-inter">
                  Emerging Market Currencies
                </h2>
                <div className="text-sm text-slate-500 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                  Global Markets
                </div>
              </div>
              <div className="h-[430px]">
                <EmergingMarketCurrenciesChart />
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 h-[520px] shadow-lg border border-slate-200/50 col-span-full">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🚧</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{activeCategory} Charts</h3>
                <p className="text-slate-500 font-inter">Coming soon! We're building comprehensive charts for this category.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar */}
      <Sidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 p-8 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-800 via-blue-700 to-indigo-700 bg-clip-text text-transparent font-inter mb-3">
              {activeCategory} Dashboard
            </h1>
            <p className="text-slate-600 font-inter text-lg leading-relaxed">
              {getCategoryDescription(activeCategory)}
            </p>
          </div>
        </header>
        
        {/* Charts Grid */}
        <div className="flex-1 p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {renderCharts()}
          </div>
          
          {/* Footer */}
          <footer className="mt-12 text-center">
            <div className="bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 inline-block border border-slate-200/50">
              <p className="text-slate-600 font-inter text-sm font-medium">
                📊 Data provided by Federal Reserve Economic Data (FRED)
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}