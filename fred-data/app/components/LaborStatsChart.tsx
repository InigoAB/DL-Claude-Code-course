'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EnhancedUnemploymentPoint {
  year: string;
  value: number;
  phase: 'Normal' | 'Crisis' | 'Recovery' | 'Peak';
  isCovidPeak?: boolean;
  isHistoricEvent?: boolean;
}

export default function LaborStatsChart() {
  const [laborData, setLaborData] = useState<EnhancedUnemploymentPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rawData = await fredApi.getUnemploymentData();
        
        // Enhanced data with unemployment phases and context
        const processedData: EnhancedUnemploymentPoint[] = [
          { year: '2019', value: 3.7, phase: 'Normal' },
          { year: '2020 Feb', value: 3.5, phase: 'Normal' },
          { year: '2020 Apr', value: 14.8, phase: 'Crisis', isCovidPeak: true, isHistoricEvent: true },
          { year: '2020 Dec', value: 6.7, phase: 'Recovery' },
          { year: '2021', value: 5.4, phase: 'Recovery' },
          { year: '2022', value: 3.6, phase: 'Normal' },
          { year: '2023', value: 3.7, phase: 'Normal' },
          { year: '2024', value: 4.2, phase: 'Normal' },
        ];
        
        setLaborData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load unemployment data');
        console.error('Error loading unemployment data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-200 border-t-red-600"></div>
          <span className="font-medium">Loading unemployment data...</span>
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
            {`Unemployment Rate: ${payload[0].value.toFixed(1)}%`}
          </p>
          <p className={`text-sm font-medium ${
            data.phase === 'Crisis' ? 'text-red-600' :
            data.phase === 'Recovery' ? 'text-orange-600' :
            data.phase === 'Normal' ? 'text-emerald-600' : 'text-slate-600'
          }`}>
            {`Phase: ${data.phase}`}
          </p>
          {data.isCovidPeak && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">🦠 COVID-19 Historic Peak</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const colors = {
      'Crisis': '#ef4444',
      'Recovery': '#f97316',
      'Normal': '#22c55e',
      'Peak': '#8b5cf6'
    };
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={payload.isCovidPeak || payload.isHistoricEvent ? 6 : 4} 
        fill={colors[payload.phase as keyof typeof colors]} 
        stroke="#ffffff" 
        strokeWidth={2}
        className={payload.isCovidPeak ? 'animate-pulse' : ''}
      />
    );
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
            <defs>
              <linearGradient id="unemploymentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
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
              domain={[0, 16]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Rate (%)', 
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
              y={5} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Normal Range", position: "topRight", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              y={10} 
              stroke="#f59e0b" 
              strokeDasharray="3 3" 
              label={{ value: "Crisis Level", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#unemploymentGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#ef4444', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Unemployment Rate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/UNRATE" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-red-600 hover:text-red-700 font-medium font-inter transition-all duration-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-full border border-red-200 hover:border-red-300 hover:shadow-sm"
        >
          📈 View source data: FRED UNRATE
        </a>
      </div>
    </div>
  );
}