'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EnhancedDataPoint {
  year: string;
  value: number;
  change?: number;
  isInflationSpike?: boolean;
}

export default function CPIChart() {
  const [cpiData, setCpiData] = useState<EnhancedDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rawData = await fredApi.getCPIData();
        
        // Process data to show year-over-year changes and inflation spikes
        const processedData: EnhancedDataPoint[] = rawData.map((point, index) => {
          const change = index > 0 ? 
            ((point.value - rawData[index - 1].value) / rawData[index - 1].value) * 100 : 0;
          
          return {
            year: point.year,
            value: point.value,
            change: change,
            isInflationSpike: change > 6 // Mark periods with >6% inflation
          };
        });
        
        setCpiData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load CPI data');
        console.error('Error loading CPI data:', err);
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
          <span className="font-medium">Loading CPI data...</span>
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
            {`CPI Index: ${payload[0].value.toFixed(1)}`}
          </p>
          {data.change > 0 && (
            <p className={`text-sm font-medium ${data.change > 6 ? 'text-red-600' : 'text-emerald-600'}`}>
              {`YoY Change: +${data.change.toFixed(1)}%`}
            </p>
          )}
          {data.isInflationSpike && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">⚠️ High Inflation Period</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isInflationSpike) {
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
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={4} 
        fill="#2563eb" 
        stroke="#ffffff" 
        strokeWidth={2}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={cpiData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="cpiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
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
              stroke="#f59e0b" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-Pandemic Level", position: "top", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#cpiGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#3b82f6', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Consumer Price Index"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/CPIAUCSL" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium font-inter transition-all duration-200 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-full border border-blue-200 hover:border-blue-300 hover:shadow-sm"
        >
          📊 View source data: FRED CPIAUCSL
        </a>
      </div>
    </div>
  );
}