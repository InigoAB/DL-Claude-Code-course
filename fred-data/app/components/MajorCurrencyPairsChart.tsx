'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface CurrencyPoint {
  date: string;
  usdEur: number;
  usdJpy: number;
  usdGbp: number;
  usdCny: number;
  isDollarStrong?: boolean;
  isVolatilePeriod?: boolean;
  isCrisisPeriod?: boolean;
}

export default function MajorCurrencyPairsChart() {
  const [currencyData, setCurrencyData] = useState<CurrencyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [euroData, yenData, poundData, yuanData] = await Promise.all([
          fredApi.getEuroExchangeRateData(),
          fredApi.getYenExchangeRateData(),
          fredApi.getPoundExchangeRateData(),
          fredApi.getYuanExchangeRateData()
        ]);

        // Process and align data by date
        const processedData: CurrencyPoint[] = [];
        
        // Use Euro data as base and align others
        euroData.forEach(euroPoint => {
          const yenPoint = yenData.find(yp => yp.date === euroPoint.date);
          const poundPoint = poundData.find(gp => gp.date === euroPoint.date);
          const yuanPoint = yuanData.find(cp => cp.date === euroPoint.date);
          
          if (yenPoint && poundPoint && yuanPoint) {
            const date = new Date(euroPoint.date);
            
            // Analyze USD strength (simplified indicators)
            const isDollarStrong = euroPoint.value < 0.85 && poundPoint.value < 1.25; // Strong USD periods
            const isVolatilePeriod = Math.abs(euroPoint.value - 1.0) > 0.2; // High volatility
            const isCrisisPeriod = date >= new Date('2020-03-01') && date <= new Date('2020-12-31'); // COVID crisis
            
            processedData.push({
              date: euroPoint.year, // Use year for x-axis
              usdEur: euroPoint.value,
              usdJpy: yenPoint.value,
              usdGbp: poundPoint.value,
              usdCny: yuanPoint.value,
              isDollarStrong,
              isVolatilePeriod,
              isCrisisPeriod
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 2 === 0);
        setCurrencyData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load currency exchange data');
        console.error('Error loading currency exchange data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-200 border-t-cyan-600"></div>
          <span className="font-medium">Loading currency exchange data...</span>
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
            {`USD/EUR: ${data.usdEur.toFixed(3)}`}
          </p>
          <p className="text-red-600 font-medium mb-1">
            {`USD/JPY: ${data.usdJpy.toFixed(1)}`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`USD/GBP: ${data.usdGbp.toFixed(3)}`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`USD/CNY: ${data.usdCny.toFixed(2)}`}
          </p>
          {data.isDollarStrong && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">💪 Strong USD Period</p>
            </div>
          )}
          {data.isCrisisPeriod && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">⚠️ Crisis Period</p>
            </div>
          )}
          {data.isVolatilePeriod && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">📈 High Volatility</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isCrisisPeriod) {
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
    if (payload.isDollarStrong) {
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
            data={currencyData}
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
              yAxisId="rates"
              domain={[0.5, 1.5]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Exchange Rate', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="yen"
              orientation="right"
              domain={[80, 150]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'JPY Rate', 
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
              yAxisId="rates"
              y={1.0} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Parity", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="yen"
              y={110} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: "JPY Normal", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Line
              yAxisId="rates"
              type="monotone"
              dataKey="usdEur"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="USD/EUR"
            />
            <Line
              yAxisId="yen"
              type="monotone"
              dataKey="usdJpy"
              stroke="#ef4444"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#ef4444', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="USD/JPY"
            />
            <Line
              yAxisId="rates"
              type="monotone"
              dataKey="usdGbp"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="USD/GBP"
            />
            <Line
              yAxisId="rates"
              type="monotone"
              dataKey="usdCny"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#ffffff' }}
              name="USD/CNY"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/DEXUSEU" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-cyan-600 hover:text-cyan-700 font-medium font-inter transition-all duration-200 bg-cyan-50 hover:bg-cyan-100 px-3 py-2 rounded-full border border-cyan-200 hover:border-cyan-300 hover:shadow-sm"
        >
          🌐 View source data: FRED Exchange Rates
        </a>
      </div>
    </div>
  );
}