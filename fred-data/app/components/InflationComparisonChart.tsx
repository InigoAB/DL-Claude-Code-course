'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface InflationPoint {
  year: string;
  headlineCPI: number;
  coreCPI: number;
  spread: number;
  isVolatilePeriod?: boolean;
}

export default function InflationComparisonChart() {
  const [inflationData, setInflationData] = useState<InflationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [headlineData, coreData] = await Promise.all([
          fredApi.getCPIData(),
          fredApi.getCoreCPIData()
        ]);

        // Combine and process data
        const processedData: InflationPoint[] = headlineData.map(headlinePoint => {
          const corePoint = coreData.find(cp => cp.year === headlinePoint.year);
          if (corePoint) {
            const spread = headlinePoint.value - corePoint.value;
            return {
              year: headlinePoint.year,
              headlineCPI: headlinePoint.value,
              coreCPI: corePoint.value,
              spread,
              isVolatilePeriod: Math.abs(spread) > 10 // Mark periods with high volatility
            };
          }
          return null;
        }).filter(Boolean) as InflationPoint[];

        setInflationData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load inflation data');
        console.error('Error loading inflation data:', err);
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
          <span className="font-medium">Loading inflation data...</span>
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
          <p className="font-semibold text-slate-800 mb-2">{`Year: ${label}`}</p>
          <p className="text-blue-600 font-medium mb-1">
            {`Headline CPI: ${data.headlineCPI.toFixed(1)}`}
          </p>
          <p className="text-orange-600 font-medium mb-1">
            {`Core CPI: ${data.coreCPI.toFixed(1)}`}
          </p>
          <p className="text-slate-600 text-sm">
            {`Spread: ${data.spread.toFixed(1)} points`}
          </p>
          {data.isVolatilePeriod && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">📊 High Volatility Period</p>
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
            data={inflationData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="headlineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="coreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="year" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'CPI Index', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
            <ReferenceLine 
              y={280} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-Pandemic Level", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="headlineCPI"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#headlineGradient)"
              name="Headline CPI"
            />
            <Line
              type="monotone"
              dataKey="coreCPI"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ 
                r: 6, 
                stroke: '#f97316', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Core CPI (Ex Food & Energy)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/CPIAUCSL" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium font-inter transition-all duration-200 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-full border border-orange-200 hover:border-orange-300 hover:shadow-sm"
        >
          📈 View source data: FRED CPI
        </a>
      </div>
    </div>
  );
}