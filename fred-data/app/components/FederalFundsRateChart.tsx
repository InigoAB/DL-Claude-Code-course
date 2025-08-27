'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface FedRatePoint {
  year: string;
  value: number;
  policy: 'Accommodative' | 'Neutral' | 'Restrictive' | 'Emergency';
  isMajorChange?: boolean;
}

export default function FederalFundsRateChart() {
  const [fedRateData, setFedRateData] = useState<FedRatePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rawData = await fredApi.getFederalFundsRateData();
        
        // Process data to show policy stance
        const processedData: FedRatePoint[] = rawData.map((point) => {
          let policy: 'Accommodative' | 'Neutral' | 'Restrictive' | 'Emergency' = 'Neutral';
          let isMajorChange = false;
          
          if (point.value < 0.5) {
            policy = 'Emergency';
            isMajorChange = true;
          } else if (point.value < 2) {
            policy = 'Accommodative';
          } else if (point.value > 4) {
            policy = 'Restrictive';
            isMajorChange = true;
          } else {
            policy = 'Neutral';
          }
          
          return {
            year: point.year,
            value: point.value,
            policy,
            isMajorChange
          };
        });
        
        setFedRateData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load Federal Funds Rate data');
        console.error('Error loading Federal Funds Rate data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600"></div>
          <span className="font-medium">Loading Federal Funds Rate...</span>
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
          <p className="text-indigo-600 font-medium mb-1">
            {`Fed Funds Rate: ${payload[0].value.toFixed(2)}%`}
          </p>
          <p className={`text-sm font-medium ${
            data.policy === 'Emergency' ? 'text-red-600' :
            data.policy === 'Accommodative' ? 'text-blue-600' :
            data.policy === 'Restrictive' ? 'text-orange-600' : 'text-emerald-600'
          }`}>
            {`Policy Stance: ${data.policy}`}
          </p>
          {data.isMajorChange && (
            <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
              <p className="text-xs text-indigo-600 font-medium">🏛️ Major Policy Change</p>
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
      'Emergency': '#ef4444',
      'Accommodative': '#3b82f6',
      'Neutral': '#10b981',
      'Restrictive': '#f97316'
    };
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={payload.isMajorChange ? 6 : 4} 
        fill={colors[payload.policy as keyof typeof colors]} 
        stroke="#ffffff" 
        strokeWidth={2}
        className={payload.isMajorChange ? 'animate-pulse' : ''}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={fedRateData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="fedRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
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
              domain={[0, 'dataMax + 0.5']}
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
              y={2} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Neutral Rate", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              y={0.25} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: "Emergency Level", position: "top", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={3}
              fill="url(#fedRateGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#6366f1', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Federal Funds Rate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/FEDFUNDS" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium font-inter transition-all duration-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-full border border-indigo-200 hover:border-indigo-300 hover:shadow-sm"
        >
          🏛️ View source data: FRED FEDFUNDS
        </a>
      </div>
    </div>
  );
}