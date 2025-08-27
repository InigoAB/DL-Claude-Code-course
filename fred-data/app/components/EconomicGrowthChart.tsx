'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EconomicGrowthPoint {
  date: string;
  gdp: number;
  industrialProduction: number;
  gdpGrowthRate?: number;
  isRecession?: boolean;
  isExpansion?: boolean;
}

export default function EconomicGrowthChart() {
  const [growthData, setGrowthData] = useState<EconomicGrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [gdpData, industrialData] = await Promise.all([
          fredApi.getGDPData(),
          fredApi.getIndustrialProductionData()
        ]);

        // Process and align data by date
        const processedData: EconomicGrowthPoint[] = [];
        
        // Use quarterly GDP data as base and interpolate monthly industrial production
        gdpData.forEach((gdpPoint, index) => {
          // Find closest industrial production data point
          const industrialPoint = industrialData.find(ip => {
            const gdpDate = new Date(gdpPoint.date);
            const ipDate = new Date(ip.date);
            // Match within same quarter
            return Math.abs(gdpDate.getTime() - ipDate.getTime()) < 95 * 24 * 60 * 60 * 1000; // ~3 months
          });
          
          if (industrialPoint) {
            // Calculate GDP growth rate (quarter over quarter)
            let gdpGrowthRate = 0;
            if (index > 0) {
              const prevGDP = gdpData[index - 1].value;
              gdpGrowthRate = ((gdpPoint.value - prevGDP) / prevGDP) * 100;
            }
            
            const date = new Date(gdpPoint.date);
            const isRecession = gdpGrowthRate < -2; // Simplified recession indicator
            const isExpansion = gdpGrowthRate > 3; // Strong growth indicator
            
            processedData.push({
              date: gdpPoint.year, // Use year for x-axis
              gdp: gdpPoint.value / 1000, // Convert to trillions for readability
              industrialProduction: industrialPoint.value,
              gdpGrowthRate,
              isRecession,
              isExpansion
            });
          }
        });

        setGrowthData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load economic growth data');
        console.error('Error loading economic growth data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
          <span className="font-medium">Loading economic growth data...</span>
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
            {`GDP: $${data.gdp.toFixed(1)}T`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Industrial Production: ${data.industrialProduction.toFixed(1)}`}
          </p>
          {data.gdpGrowthRate && (
            <p className={`text-sm font-medium ${data.gdpGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {`GDP Growth: ${data.gdpGrowthRate.toFixed(1)}%`}
            </p>
          )}
          {data.isRecession && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">📉 Recession Indicator</p>
            </div>
          )}
          {data.isExpansion && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">📈 Strong Growth</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isRecession) {
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
    if (payload.isExpansion) {
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
            data={growthData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="gdpGradient" x1="0" y1="0" x2="0" y2="1">
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
              yAxisId="gdp"
              domain={['dataMin - 1', 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'GDP (Trillions $)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="production"
              orientation="right"
              domain={['dataMin - 5', 'dataMax + 5']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Industrial Production Index', 
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
              yAxisId="gdp"
              y={20} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-COVID GDP", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <Area
              yAxisId="gdp"
              type="monotone"
              dataKey="gdp"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#gdpGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#3b82f6', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="GDP (Trillions)"
            />
            <Line
              yAxisId="production"
              type="monotone"
              dataKey="industrialProduction"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Industrial Production Index"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/GDP" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium font-inter transition-all duration-200 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-full border border-blue-200 hover:border-blue-300 hover:shadow-sm"
        >
          📈 View source data: FRED GDP & Industrial Production
        </a>
      </div>
    </div>
  );
}