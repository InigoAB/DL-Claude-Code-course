'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area, Bar } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface HousingPoint {
  date: string;
  housingStarts: number;
  homePriceIndex: number;
  mortgageRates: number;
  isHighStarts?: boolean;
  isPriceBubble?: boolean;
  isAffordabilityCrisis?: boolean;
}

export default function HousingMarketChart() {
  const [housingData, setHousingData] = useState<HousingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [housingStartsData, homePriceData, mortgageData] = await Promise.all([
          fredApi.getHousingStartsData(),
          fredApi.getHomePriceIndexData(),
          fredApi.getMortgageRatesData()
        ]);

        // Process and align data by date
        const processedData: HousingPoint[] = [];
        
        // Use housing starts data as base (monthly)
        housingStartsData.forEach(startPoint => {
          const pricePoint = homePriceData.find(hp => hp.date === startPoint.date);
          const mortgagePoint = mortgageData.find(mr => mr.date === startPoint.date);
          
          if (pricePoint && mortgagePoint) {
            const isHighStarts = startPoint.value > 1500; // Above 1.5M annually
            const isPriceBubble = pricePoint.value > 300; // Home price index > 300
            const isAffordabilityCrisis = mortgagePoint.value > 6; // Mortgage rates > 6%
            
            processedData.push({
              date: startPoint.year, // Use year for x-axis
              housingStarts: startPoint.value / 1000, // Convert to millions
              homePriceIndex: pricePoint.value,
              mortgageRates: mortgagePoint.value,
              isHighStarts,
              isPriceBubble,
              isAffordabilityCrisis
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 3 === 0);
        setHousingData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load housing market data');
        console.error('Error loading housing market data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-200 border-t-amber-600"></div>
          <span className="font-medium">Loading housing market data...</span>
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
          <p className="text-blue-600 font-medium mb-1">
            {`Housing Starts: ${data.housingStarts.toFixed(1)}M`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Home Price Index: ${data.homePriceIndex.toFixed(1)}`}
          </p>
          <p className="text-red-600 font-medium mb-1">
            {`Mortgage Rates: ${data.mortgageRates.toFixed(2)}%`}
          </p>
          {data.isAffordabilityCrisis && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">🏠 Affordability Crisis</p>
            </div>
          )}
          {data.isPriceBubble && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">💰 High Price Environment</p>
            </div>
          )}
          {data.isHighStarts && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">🔨 Strong Construction Activity</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isAffordabilityCrisis) {
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
    if (payload.isPriceBubble) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={5} 
          fill="#f97316" 
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
            data={housingData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="housingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
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
              yAxisId="starts"
              domain={[0, 'dataMax + 0.2']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Housing Starts (M)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="rates"
              orientation="right"
              domain={[0, 10]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Rates (%) / Index', 
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
              yAxisId="starts"
              y={1.2} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Healthy Construction", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="rates"
              y={5} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: "Affordability Threshold", position: "top", fontSize: 10 }}
              opacity={0.7}
            />
            <Bar
              yAxisId="starts"
              dataKey="housingStarts"
              fill="#3b82f6"
              opacity={0.6}
              name="Housing Starts (M)"
            />
            <Line
              yAxisId="rates"
              type="monotone"
              dataKey="homePriceIndex"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Home Price Index"
            />
            <Line
              yAxisId="rates"
              type="monotone"
              dataKey="mortgageRates"
              stroke="#ef4444"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#ef4444', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="30-Year Mortgage Rates (%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/HOUST" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-amber-600 hover:text-amber-700 font-medium font-inter transition-all duration-200 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-full border border-amber-200 hover:border-amber-300 hover:shadow-sm"
        >
          🏠 View source data: FRED Housing Market
        </a>
      </div>
    </div>
  );
}