'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EnhancedShortTermPoint {
  year: string;
  value: number;
  monetaryPolicy: 'QE' | 'Normal' | 'Tightening' | 'Aggressive';
  isZeroRate?: boolean;
  isPolicyPeak?: boolean;
}

export default function InterestRatesShortTermChart() {
  const [shortTermData, setShortTermData] = useState<EnhancedShortTermPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rawData = await fredApi.get3MonthTreasuryData();
        
        // Enhanced data with monetary policy context
        const processedData: EnhancedShortTermPoint[] = rawData.map((point) => {
          let monetaryPolicy: 'QE' | 'Normal' | 'Tightening' | 'Aggressive' = 'Normal';
          let isZeroRate = false;
          let isPolicyPeak = false;
          
          if (point.value < 0.5) {
            monetaryPolicy = 'QE';
            isZeroRate = true;
          } else if (point.value > 4.5) {
            monetaryPolicy = 'Aggressive';
            isPolicyPeak = true;
          } else if (point.value > 2) {
            monetaryPolicy = 'Tightening';
          }
          
          return {
            year: point.year,
            value: point.value,
            monetaryPolicy,
            isZeroRate,
            isPolicyPeak
          };
        });
        
        setShortTermData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load 3-month treasury data');
        console.error('Error loading 3-month treasury data:', err);
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
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          <span>Loading short-term rates...</span>
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
          <p className="text-purple-600 font-medium">
            {`3-Month Rate: ${payload[0].value.toFixed(2)}%`}
          </p>
          <p className={`text-sm font-medium ${
            data.monetaryPolicy === 'QE' ? 'text-blue-600' :
            data.monetaryPolicy === 'Aggressive' ? 'text-red-600' :
            data.monetaryPolicy === 'Tightening' ? 'text-orange-600' : 'text-green-600'
          }`}>
            {`Policy: ${data.monetaryPolicy === 'QE' ? 'Quantitative Easing' : data.monetaryPolicy}`}
          </p>
          {data.isZeroRate && (
            <p className="text-xs text-blue-500 italic font-medium">Near-Zero Policy</p>
          )}
          {data.isPolicyPeak && (
            <p className="text-xs text-red-500 italic font-medium">Policy Peak</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const colors = {
      'QE': '#3b82f6',
      'Aggressive': '#ef4444', 
      'Tightening': '#f97316',
      'Normal': '#8b5cf6'
    };
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={payload.isZeroRate || payload.isPolicyPeak ? 6 : 4} 
        fill={colors[payload.monetaryPolicy as keyof typeof colors]} 
        stroke="#ffffff" 
        strokeWidth={2}
        className={payload.isZeroRate || payload.isPolicyPeak ? 'animate-pulse' : ''}
      />
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={shortTermData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="shortTermGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
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
              label={{ value: "Neutral Rate", position: "topRight", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              y={0.5} 
              stroke="#3b82f6" 
              strokeDasharray="3 3" 
              label={{ value: "QE Level", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#shortTermGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#8b5cf6', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="3-Month Treasury Rate"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/DGS3MO" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium font-inter transition-all duration-200 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full border border-purple-200 hover:border-purple-300 hover:shadow-sm"
        >
          🏦 View source data: FRED DGS3MO
        </a>
      </div>
    </div>
  );
}