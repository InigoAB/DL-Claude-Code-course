'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface HousingActivityPoint {
  date: string;
  buildingPermits: number;
  existingHomeSales: number;
  housingStarts: number;
  permitToStartRatio: number;
  isHighActivity?: boolean;
  isLowActivity?: boolean;
  isSupplyConstrained?: boolean;
}

export default function BuildingPermitsHomeSalesChart() {
  const [housingData, setHousingData] = useState<HousingActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [permitsData, salesData, startsData] = await Promise.all([
          fredApi.getBuildingPermitsData(),
          fredApi.getExistingHomeSalesData(),
          fredApi.getHousingStartsData()
        ]);

        // Process and align data by date
        const processedData: HousingActivityPoint[] = [];
        
        // Use permits data as base
        permitsData.forEach(permitPoint => {
          const salesPoint = salesData.find(sp => sp.date === permitPoint.date);
          const startsPoint = startsData.find(hp => hp.date === permitPoint.date);
          
          if (salesPoint && startsPoint) {
            const permitToStartRatio = permitPoint.value / startsPoint.value; // Leading indicator
            const isHighActivity = permitPoint.value > 1600 && salesPoint.value > 6; // Strong market
            const isLowActivity = permitPoint.value < 1000 && salesPoint.value < 4; // Weak market
            const isSupplyConstrained = permitToStartRatio > 1.2; // More permits than starts
            
            processedData.push({
              date: permitPoint.year, // Use year for x-axis
              buildingPermits: permitPoint.value / 1000, // Convert to millions
              existingHomeSales: salesPoint.value,
              housingStarts: startsPoint.value / 1000,
              permitToStartRatio,
              isHighActivity,
              isLowActivity,
              isSupplyConstrained
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 2 === 0);
        setHousingData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load housing activity data');
        console.error('Error loading housing activity data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-200 border-t-amber-600"></div>
          <span className="font-medium">Loading housing activity data...</span>
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
          <p className="text-amber-600 font-medium mb-1">
            {`Building Permits: ${data.buildingPermits.toFixed(2)}M`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Existing Home Sales: ${data.existingHomeSales.toFixed(1)}M`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Housing Starts: ${data.housingStarts.toFixed(2)}M`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`Permit/Start Ratio: ${data.permitToStartRatio.toFixed(2)}`}
          </p>
          {data.isHighActivity && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">🏗️ High Housing Activity</p>
            </div>
          )}
          {data.isLowActivity && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">📉 Low Housing Activity</p>
            </div>
          )}
          {data.isSupplyConstrained && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">⚠️ Supply Constraints</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isLowActivity) {
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
    if (payload.isHighActivity) {
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
            data={housingData}
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
              yAxisId="units"
              domain={[0, 'dataMax + 0.5']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Units (Millions)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="ratio"
              orientation="right"
              domain={[0.5, 2]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Permit/Start Ratio', 
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
              yAxisId="units"
              y={1.2} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Healthy Level", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="ratio"
              y={1} 
              stroke="#8b5cf6" 
              strokeDasharray="3 3" 
              label={{ value: "Balanced Supply", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Bar
              yAxisId="units"
              dataKey="buildingPermits"
              fill="#f59e0b"
              opacity={0.6}
              name="Building Permits (M)"
            />
            <Line
              yAxisId="units"
              type="monotone"
              dataKey="existingHomeSales"
              stroke="#10b981"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#10b981', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Existing Home Sales (M)"
            />
            <Line
              yAxisId="units"
              type="monotone"
              dataKey="housingStarts"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Housing Starts (M)"
            />
            <Line
              yAxisId="ratio"
              type="monotone"
              dataKey="permitToStartRatio"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#ffffff' }}
              name="Permit/Start Ratio"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/PERMIT" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-amber-600 hover:text-amber-700 font-medium font-inter transition-all duration-200 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-full border border-amber-200 hover:border-amber-300 hover:shadow-sm"
        >
          🏗️ View source data: FRED Housing Activity
        </a>
      </div>
    </div>
  );
}