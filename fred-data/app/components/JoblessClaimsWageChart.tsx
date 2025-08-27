'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface JoblessWagePoint {
  date: string;
  joblessClaims: number;
  hourlyEarnings: number;
  wageGrowth: number;
  claimsMA: number;
  isJoblessSpike?: boolean;
  isWageAcceleration?: boolean;
  isLaborShortage?: boolean;
}

export default function JoblessClaimsWageChart() {
  const [laborData, setLaborData] = useState<JoblessWagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [claimsData, earningsData] = await Promise.all([
          fredApi.getInitialJoblessClaimsData(),
          fredApi.getAverageHourlyEarningsData()
        ]);

        // Process and align data by date
        const processedData: JoblessWagePoint[] = [];
        
        // Use earnings data as base (monthly) and find corresponding claims
        earningsData.forEach((earningsPoint, index) => {
          // Find claims data for the same month (weekly data, so find closest)
          const earningsDate = new Date(earningsPoint.date);
          const claimsPoint = claimsData.find(cp => {
            const claimsDate = new Date(cp.date);
            return Math.abs(claimsDate.getTime() - earningsDate.getTime()) < 30 * 24 * 60 * 60 * 1000; // Within 30 days
          });
          
          if (claimsPoint) {
            // Calculate wage growth (YoY)
            let wageGrowth = 0;
            if (index >= 12) {
              const earningsYearAgo = earningsData[index - 12]?.value;
              if (earningsYearAgo) {
                wageGrowth = ((earningsPoint.value - earningsYearAgo) / earningsYearAgo) * 100;
              }
            }
            
            // Calculate 4-week moving average for claims
            const claimsMA = claimsData
              .slice(Math.max(0, claimsData.indexOf(claimsPoint) - 3), claimsData.indexOf(claimsPoint) + 1)
              .reduce((sum, point) => sum + point.value, 0) / 4;
            
            const isJoblessSpike = claimsPoint.value > 400; // Above 400K is concerning
            const isWageAcceleration = wageGrowth > 4; // Wage growth above 4%
            const isLaborShortage = claimsPoint.value < 250 && wageGrowth > 3; // Low claims + wage pressure
            
            processedData.push({
              date: earningsPoint.year, // Use year for x-axis
              joblessClaims: claimsPoint.value / 1000, // Convert to thousands
              hourlyEarnings: earningsPoint.value,
              wageGrowth,
              claimsMA: claimsMA / 1000,
              isJoblessSpike,
              isWageAcceleration,
              isLaborShortage
            });
          }
        });

        // Filter out early data and sample
        const validData = processedData.filter(point => point.wageGrowth !== 0);
        const sampledData = validData.filter((_, index) => index % 2 === 0);
        setLaborData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load jobless claims and wage data');
        console.error('Error loading jobless claims and wage data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-200 border-t-emerald-600"></div>
          <span className="font-medium">Loading labor market data...</span>
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
          <p className="text-red-600 font-medium mb-1">
            {`Jobless Claims: ${data.joblessClaims.toFixed(0)}K`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`4-Week Average: ${data.claimsMA.toFixed(0)}K`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Hourly Earnings: $${data.hourlyEarnings.toFixed(2)}`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`Wage Growth: ${data.wageGrowth.toFixed(1)}%`}
          </p>
          {data.isJoblessSpike && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">📈 Jobless Claims Spike</p>
            </div>
          )}
          {data.isLaborShortage && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">💼 Tight Labor Market</p>
            </div>
          )}
          {data.isWageAcceleration && (
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-2">
              <p className="text-xs text-purple-600 font-medium">💰 Wage Acceleration</p>
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
            data={laborData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              yAxisId="claims"
              domain={[0, 800]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Claims (Thousands)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="wages"
              orientation="right"
              domain={[0, 10]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Wage Growth (%) / Earnings ($)', 
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
              yAxisId="claims"
              y={300} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Healthy Level", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="wages"
              y={3} 
              stroke="#10b981" 
              strokeDasharray="3 3" 
              label={{ value: "Normal Wage Growth", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Bar
              yAxisId="claims"
              dataKey="joblessClaims"
              fill="#ef4444"
              opacity={0.6}
              name="Initial Jobless Claims (K)"
            />
            <Line
              yAxisId="claims"
              type="monotone"
              dataKey="claimsMA"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#ffffff' }}
              name="4-Week Moving Average (K)"
            />
            <Line
              yAxisId="wages"
              type="monotone"
              dataKey="wageGrowth"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Wage Growth YoY (%)"
            />
            <Line
              yAxisId="wages"
              type="monotone"
              dataKey="hourlyEarnings"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#ffffff' }}
              name="Hourly Earnings ($)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/ICSA" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium font-inter transition-all duration-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-full border border-emerald-200 hover:border-emerald-300 hover:shadow-sm"
        >
          📊 View source data: FRED Labor Market Indicators
        </a>
      </div>
    </div>
  );
}