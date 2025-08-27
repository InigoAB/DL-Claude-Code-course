'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface ConsumerCreditPoint {
  date: string;
  creditOutstanding: number;
  seasonalRetailSales: number;
  adjustedRetailSales: number;
  seasonalityIndex: number;
  creditGrowth: number;
  isHolidaySeason?: boolean;
  isCreditBoom?: boolean;
  isSeasonalPeak?: boolean;
}

export default function CreditCardSeasonalChart() {
  const [consumerData, setConsumerData] = useState<ConsumerCreditPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [creditData, seasonalSalesData, adjustedSalesData] = await Promise.all([
          fredApi.getCreditCardSpendingData(),
          fredApi.getSeasonalRetailSalesData(),
          fredApi.getRetailSalesData()
        ]);

        // Process and align data by date
        const processedData: ConsumerCreditPoint[] = [];
        
        // Use credit data as base
        creditData.forEach((creditPoint, index) => {
          const seasonalPoint = seasonalSalesData.find(sp => sp.date === creditPoint.date);
          const adjustedPoint = adjustedSalesData.find(ap => ap.date === creditPoint.date);
          
          if (seasonalPoint && adjustedPoint) {
            // Calculate seasonality index
            const seasonalityIndex = (seasonalPoint.value / adjustedPoint.value) * 100;
            
            // Calculate credit growth (YoY)
            let creditGrowth = 0;
            if (index >= 12) {
              const creditYearAgo = creditData[index - 12]?.value;
              if (creditYearAgo) {
                creditGrowth = ((creditPoint.value - creditYearAgo) / creditYearAgo) * 100;
              }
            }
            
            const date = new Date(creditPoint.date);
            const month = date.getMonth();
            const isHolidaySeason = month === 10 || month === 11; // November & December
            const isCreditBoom = creditGrowth > 8; // Credit growth above 8%
            const isSeasonalPeak = seasonalityIndex > 105; // Sales 5% above seasonal average
            
            processedData.push({
              date: creditPoint.year, // Use year for x-axis
              creditOutstanding: creditPoint.value / 1000, // Convert to trillions
              seasonalRetailSales: seasonalPoint.value / 1000, // Convert to thousands
              adjustedRetailSales: adjustedPoint.value / 1000,
              seasonalityIndex,
              creditGrowth,
              isHolidaySeason,
              isCreditBoom,
              isSeasonalPeak
            });
          }
        });

        // Filter out early data and sample
        const validData = processedData.filter(point => point.creditGrowth !== 0);
        const sampledData = validData.filter((_, index) => index % 3 === 0);
        setConsumerData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load consumer credit and seasonal data');
        console.error('Error loading consumer credit and seasonal data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-rose-200 border-t-rose-600"></div>
          <span className="font-medium">Loading consumer data...</span>
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
          <p className="text-rose-600 font-medium mb-1">
            {`Credit Outstanding: $${data.creditOutstanding.toFixed(1)}T`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Seasonal Retail Sales: $${data.seasonalRetailSales.toFixed(0)}K`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Adjusted Retail Sales: $${data.adjustedRetailSales.toFixed(0)}K`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`Seasonality Index: ${data.seasonalityIndex.toFixed(1)}`}
          </p>
          <p className="text-orange-600 font-medium mb-1">
            {`Credit Growth: ${data.creditGrowth.toFixed(1)}%`}
          </p>
          {data.isHolidaySeason && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">🎄 Holiday Shopping Season</p>
            </div>
          )}
          {data.isCreditBoom && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">💳 Credit Expansion</p>
            </div>
          )}
          {data.isSeasonalPeak && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">📈 Seasonal Shopping Peak</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={consumerData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
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
              yAxisId="credit"
              domain={[0, 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Credit (Trillions $)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="index"
              orientation="right"
              domain={[90, 110]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Seasonality Index', 
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
              yAxisId="credit"
              y={3} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-Crisis Level", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="index"
              y={100} 
              stroke="#8b5cf6" 
              strokeDasharray="3 3" 
              label={{ value: "Seasonal Average", position: "top", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              yAxisId="credit"
              type="monotone"
              dataKey="creditOutstanding"
              stroke="#f43f5e"
              strokeWidth={3}
              fill="url(#creditGradient)"
              activeDot={{ 
                r: 6, 
                stroke: '#f43f5e', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Credit Outstanding (T$)"
            />
            <Line
              yAxisId="credit"
              type="monotone"
              dataKey="adjustedRetailSales"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Seasonally Adjusted Sales (K$)"
            />
            <Line
              yAxisId="index"
              type="monotone"
              dataKey="seasonalityIndex"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Seasonality Index"
            />
            <Line
              yAxisId="credit"
              type="monotone"
              dataKey="creditGrowth"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
              name="Credit Growth YoY (%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/TOTALSL" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-rose-600 hover:text-rose-700 font-medium font-inter transition-all duration-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-full border border-rose-200 hover:border-rose-300 hover:shadow-sm"
        >
          💳 View source data: FRED Consumer Credit & Seasonality
        </a>
      </div>
    </div>
  );
}