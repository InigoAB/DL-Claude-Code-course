'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EnhancedTreasuryPoint {
  year: string;
  value: number;
  phase: 'Normal' | 'Crisis Low' | 'Rising' | 'Peak';
  isHistoricLow?: boolean;
}

export default function InterestRatesLongTermChart() {
  const [longTermData, setLongTermData] = useState<EnhancedTreasuryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rawData = await fredApi.get10YearTreasuryData();
        
        // Enhanced data with phases and context
        const processedData: EnhancedTreasuryPoint[] = rawData.map((point) => {
          let phase: 'Normal' | 'Crisis Low' | 'Rising' | 'Peak' = 'Normal';
          let isHistoricLow = false;
          
          if (point.value < 1.5) {
            phase = 'Crisis Low';
            isHistoricLow = true;
          } else if (point.value > 4) {
            phase = 'Peak';
          } else if (point.value > 2.5) {
            phase = 'Rising';
          }
          
          return {
            year: point.year,
            value: point.value,
            phase,
            isHistoricLow
          };
        });
        
        setLongTermData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load 10-year treasury data');
        console.error('Error loading 10-year treasury data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          <span>Loading treasury data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="font-medium">Error loading data</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-xl">
          <p className="font-semibold text-gray-800">{`Year: ${label}`}</p>
          <p className="text-green-600 font-medium">
            {`10-Year Yield: ${payload[0].value.toFixed(2)}%`}
          </p>
          <p className={`text-sm font-medium ${
            data.phase === 'Crisis Low' ? 'text-red-600' :
            data.phase === 'Peak' ? 'text-orange-600' :
            data.phase === 'Rising' ? 'text-yellow-600' : 'text-blue-600'
          }`}>
            {`Phase: ${data.phase}`}
          </p>
          {data.isHistoricLow && (
            <p className="text-xs text-red-500 italic font-medium">Historic Low</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const colors = {
      'Crisis Low': '#ef4444',
      'Peak': '#f97316', 
      'Rising': '#eab308',
      'Normal': '#22c55e'
    };
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={payload.isHistoricLow ? 6 : 4} 
        fill={colors[payload.phase as keyof typeof colors]} 
        stroke="#ffffff" 
        strokeWidth={2}
        className={payload.isHistoricLow ? 'animate-pulse' : ''}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={longTermData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="treasuryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.01}/>
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
                value: 'Yield (%)', 
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
              y={2.5} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Normal Range", position: "topRight", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              y={1.5} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: "Crisis Level", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={3}
              fill="url(#treasuryGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#22c55e', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="10-Year Treasury Yield"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/DGS10" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-green-600 hover:text-green-700 font-medium font-inter transition-all duration-200 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-full border border-green-200 hover:border-green-300 hover:shadow-sm"
        >
          💰 View source data: FRED DGS10
        </a>
      </div>
    </div>
  );
}