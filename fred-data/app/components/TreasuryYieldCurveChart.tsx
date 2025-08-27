'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface YieldCurvePoint {
  year: string;
  twoYear: number;
  tenYear: number;
  thirtyYear: number;
  spread: number;
  isInverted?: boolean;
}

export default function TreasuryYieldCurveChart() {
  const [yieldData, setYieldData] = useState<YieldCurvePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [twoYearData, tenYearData, thirtyYearData] = await Promise.all([
          fredApi.get2YearTreasuryData(),
          fredApi.get10YearTreasuryData(),
          fredApi.get30YearTreasuryData()
        ]);

        // Combine and process data
        const processedData: YieldCurvePoint[] = tenYearData.map(tenYearPoint => {
          const twoYearPoint = twoYearData.find(tp => tp.year === tenYearPoint.year);
          const thirtyYearPoint = thirtyYearData.find(tp => tp.year === tenYearPoint.year);
          
          if (twoYearPoint && thirtyYearPoint) {
            const spread = tenYearPoint.value - twoYearPoint.value;
            return {
              year: tenYearPoint.year,
              twoYear: twoYearPoint.value,
              tenYear: tenYearPoint.value,
              thirtyYear: thirtyYearPoint.value,
              spread,
              isInverted: spread < 0 // Yield curve inversion
            };
          }
          return null;
        }).filter(Boolean) as YieldCurvePoint[];

        setYieldData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load Treasury yield data');
        console.error('Error loading Treasury yield data:', err);
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
          <span className="font-medium">Loading yield curve...</span>
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
          <p className="text-emerald-600 font-medium mb-1">
            {`2-Year: ${data.twoYear.toFixed(2)}%`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`10-Year: ${data.tenYear.toFixed(2)}%`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`30-Year: ${data.thirtyYear.toFixed(2)}%`}
          </p>
          <p className={`text-sm font-medium ${data.isInverted ? 'text-red-600' : 'text-slate-600'}`}>
            {`10Y-2Y Spread: ${data.spread.toFixed(2)}%`}
          </p>
          {data.isInverted && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">⚠️ Inverted Yield Curve</p>
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
          <LineChart
            data={yieldData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
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
              label={{ value: "Normal Level", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="twoYear"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="2-Year Treasury"
            />
            <Line
              type="monotone"
              dataKey="tenYear"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="10-Year Treasury"
            />
            <Line
              type="monotone"
              dataKey="thirtyYear"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
              name="30-Year Treasury"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/DGS10" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-teal-600 hover:text-teal-700 font-medium font-inter transition-all duration-200 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-full border border-teal-200 hover:border-teal-300 hover:shadow-sm"
        >
          📈 View source data: FRED Treasury Yields
        </a>
      </div>
    </div>
  );
}