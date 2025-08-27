'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface RealEstatePoint {
  date: string;
  homePriceIndex: number;
  homeownershipRate: number;
  priceToIncomeRatio: number;
  isOvervalued?: boolean;
  isAccessible?: boolean;
}

export default function RealEstateInvestmentChart() {
  const [realEstateData, setRealEstateData] = useState<RealEstatePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [homePriceData, homeownershipData] = await Promise.all([
          fredApi.getHomePriceIndexData(),
          fredApi.getHomeownershipRateData()
        ]);

        // Process and align data by date
        const processedData: RealEstatePoint[] = [];
        
        // Use home price data as base
        homePriceData.forEach((pricePoint, index) => {
          const ownershipPoint = homeownershipData.find(hr => hr.date === pricePoint.date);
          
          if (ownershipPoint) {
            // Calculate simplified price-to-income ratio (using home price index as proxy)
            const priceToIncomeRatio = pricePoint.value / 100; // Normalized ratio
            const isOvervalued = pricePoint.value > 300; // Price index above 300
            const isAccessible = ownershipPoint.value > 68; // Homeownership rate above 68%
            
            processedData.push({
              date: pricePoint.year, // Use year for x-axis
              homePriceIndex: pricePoint.value,
              homeownershipRate: ownershipPoint.value,
              priceToIncomeRatio,
              isOvervalued,
              isAccessible
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 2 === 0);
        setRealEstateData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load real estate investment data');
        console.error('Error loading real estate investment data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-200 border-t-orange-600"></div>
          <span className="font-medium">Loading real estate data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm">
          <div className="font-semibold text-lg mb-2">⚠️ Error loading data</div>
          <div className="text-sm text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 rounded-xl shadow-xl">
          <p className="font-semibold text-slate-800 mb-2">{`Period: ${label}`}</p>
          <p className="text-orange-600 font-medium mb-1">
            {`Home Price Index: ${data.homePriceIndex.toFixed(1)}`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Homeownership Rate: ${data.homeownershipRate.toFixed(1)}%`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Price-to-Income Ratio: ${data.priceToIncomeRatio.toFixed(1)}`}
          </p>
          {data.isOvervalued && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">📈 Potentially Overvalued</p>
            </div>
          )}
          {data.isAccessible && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">🏡 Good Accessibility</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isOvervalued) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill="#ef4444" 
          stroke="#ffffff" 
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    if (payload.isAccessible) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={5} 
          fill="#10b981" 
          stroke="#ffffff" 
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={realEstateData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="realEstateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              yAxisId="index"
              domain={['dataMin - 20', 'dataMax + 20']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Price Index / Ratio', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="right"
              domain={[60, 75]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Ownership Rate (%)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
            <ReferenceLine 
              yAxisId="index"
              y={200} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Historical Average", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="percentage"
              y={67} 
              stroke="#3b82f6" 
              strokeDasharray="3 3" 
              label={{ value: "Target Ownership", position: "top", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              yAxisId="index"
              type="monotone"
              dataKey="homePriceIndex"
              stroke="#f97316"
              strokeWidth={3}
              fill="url(#realEstateGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#f97316', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Home Price Index"
            />
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="homeownershipRate"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Homeownership Rate (%)"
            />
            <Line
              yAxisId="index"
              type="monotone"
              dataKey="priceToIncomeRatio"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
              name="Price-to-Income Ratio"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/CSUSHPISA" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium font-inter transition-all duration-200 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-full border border-orange-200 hover:border-orange-300 hover:shadow-sm"
        >
          🏡 View source data: FRED Real Estate Investment
        </a>
      </div>
    </div>
  );
}