'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EmergingCurrencyPoint {
  date: string;
  cadUsd: number;
  mxnUsd: number;
  brlUsd: number;
  inrUsd: number;
  emAverage: number;
  isVolatilePeriod?: boolean;
  isUSDStrength?: boolean;
  isCommodityShock?: boolean;
}

export default function EmergingMarketCurrenciesChart() {
  const [emData, setEmData] = useState<EmergingCurrencyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cadData, mxnData, brlData, inrData] = await Promise.all([
          fredApi.getCanadianDollarRateData(),
          fredApi.getMexicanPesoRateData(),
          fredApi.getBrazilianRealRateData(),
          fredApi.getIndianRupeeRateData()
        ]);

        // Process and align data by date
        const processedData: EmergingCurrencyPoint[] = [];
        
        // Use CAD data as base and align others
        cadData.forEach(cadPoint => {
          const mxnPoint = mxnData.find(mp => mp.date === cadPoint.date);
          const brlPoint = brlData.find(bp => bp.date === cadPoint.date);
          const inrPoint = inrData.find(ip => ip.date === cadPoint.date);
          
          if (mxnPoint && brlPoint && inrPoint) {
            // Normalize exchange rates (invert where needed for consistency)
            const cadUsd = 1 / cadPoint.value; // CAD/USD to USD/CAD
            const mxnUsd = 1 / mxnPoint.value; // MXN/USD to USD/MXN (scaled)
            const brlUsd = 1 / brlPoint.value; // BRL/USD to USD/BRL (scaled)
            const inrUsd = 1 / inrPoint.value; // INR/USD to USD/INR (scaled)
            
            // Calculate emerging market currency index (average)
            const emAverage = (cadUsd + (mxnUsd * 10) + (brlUsd * 5) + (inrUsd * 50)) / 4;
            
            const date = new Date(cadPoint.date);
            const isVolatilePeriod = date >= new Date('2020-03-01') && date <= new Date('2020-12-31'); // COVID volatility
            const isUSDStrength = emAverage < 0.8; // Strong USD periods
            const isCommodityShock = date >= new Date('2022-03-01') && date <= new Date('2022-12-31'); // Ukraine war commodity shock
            
            processedData.push({
              date: cadPoint.year, // Use year for x-axis
              cadUsd,
              mxnUsd: mxnUsd * 10, // Scale for visibility
              brlUsd: brlUsd * 5, // Scale for visibility
              inrUsd: inrUsd * 50, // Scale for visibility
              emAverage,
              isVolatilePeriod,
              isUSDStrength,
              isCommodityShock
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 3 === 0);
        setEmData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load emerging market currency data');
        console.error('Error loading emerging market currency data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-200 border-t-teal-600"></div>
          <span className="font-medium">Loading emerging market data...</span>
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
          <p className="text-emerald-600 font-medium mb-1">
            {`USD/CAD: ${data.cadUsd.toFixed(3)}`}
          </p>
          <p className="text-red-600 font-medium mb-1">
            {`USD/MXN: ${(data.mxnUsd / 10).toFixed(2)} (scaled)`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`USD/BRL: ${(data.brlUsd / 5).toFixed(2)} (scaled)`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`USD/INR: ${(data.inrUsd / 50).toFixed(1)} (scaled)`}
          </p>
          <p className="text-teal-600 font-medium mb-1">
            {`EM Index: ${data.emAverage.toFixed(2)}`}
          </p>
          {data.isVolatilePeriod && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">⚡ High Volatility Period</p>
            </div>
          )}
          {data.isUSDStrength && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">💪 USD Strength</p>
            </div>
          )}
          {data.isCommodityShock && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">🛢️ Commodity Shock</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isVolatilePeriod) {
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
    if (payload.isCommodityShock) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={5} 
          fill="#f97316" 
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
            data={emData}
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
              domain={[0.5, 2]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Exchange Rate (Normalized)', 
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
              y={1} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Parity/Normal", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="cadUsd"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="USD/CAD"
            />
            <Line
              type="monotone"
              dataKey="mxnUsd"
              stroke="#ef4444"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#ef4444', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="USD/MXN (scaled)"
            />
            <Line
              type="monotone"
              dataKey="brlUsd"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="USD/BRL (scaled)"
            />
            <Line
              type="monotone"
              dataKey="inrUsd"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
              name="USD/INR (scaled)"
            />
            <Line
              type="monotone"
              dataKey="emAverage"
              stroke="#14b8a6"
              strokeWidth={4}
              strokeDasharray="5 5"
              dot={{ r: 5, fill: '#14b8a6', strokeWidth: 2, stroke: '#ffffff' }}
              name="EM Currency Index"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/DEXCAUS" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-teal-600 hover:text-teal-700 font-medium font-inter transition-all duration-200 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-full border border-teal-200 hover:border-teal-300 hover:shadow-sm"
        >
          🌎 View source data: FRED Emerging Market Currencies
        </a>
      </div>
    </div>
  );
}