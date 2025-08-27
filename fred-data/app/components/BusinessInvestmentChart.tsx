'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface InvestmentPoint {
  date: string;
  businessInvestment: number;
  capitalUtilization: number;
  productivityGrowth: number;
  isHighInvestment?: boolean;
  isLowUtilization?: boolean;
}

export default function BusinessInvestmentChart() {
  const [investmentData, setInvestmentData] = useState<InvestmentPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [businessInvData, capUtilData, productivityData] = await Promise.all([
          fredApi.getBusinessInvestmentData(),
          fredApi.getCapacityUtilizationData(),
          fredApi.getProductivityData()
        ]);

        // Process and align data by date
        const processedData: InvestmentPoint[] = [];
        
        // Use business investment data as base
        businessInvData.forEach(bizPoint => {
          const utilPoint = capUtilData.find(cp => cp.date === bizPoint.date);
          const prodPoint = productivityData.find(pp => pp.date === bizPoint.date);
          
          if (utilPoint && prodPoint) {
            const isHighInvestment = bizPoint.value > 2000; // Simplified threshold
            const isLowUtilization = utilPoint.value < 75; // Capacity utilization below 75%
            
            processedData.push({
              date: bizPoint.year, // Use year for x-axis
              businessInvestment: bizPoint.value / 1000, // Convert to trillions
              capitalUtilization: utilPoint.value,
              productivityGrowth: prodPoint.value,
              isHighInvestment,
              isLowUtilization
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 2 === 0);
        setInvestmentData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load business investment data');
        console.error('Error loading business investment data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-200 border-t-purple-600"></div>
          <span className="font-medium">Loading business investment data...</span>
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
          <p className="text-purple-600 font-medium mb-1">
            {`Business Investment: $${data.businessInvestment.toFixed(1)}T`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Capacity Utilization: ${data.capitalUtilization.toFixed(1)}%`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Productivity Growth: ${data.productivityGrowth.toFixed(1)}%`}
          </p>
          {data.isHighInvestment && (
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-2">
              <p className="text-xs text-purple-600 font-medium">🏭 High Investment Period</p>
            </div>
          )}
          {data.isLowUtilization && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">⚠️ Low Capacity Utilization</p>
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
            data={investmentData}
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
              yAxisId="investment"
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Investment (Trillions $)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="right"
              domain={[60, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Percentage (%)', 
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
              yAxisId="percentage"
              y={80} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Normal Utilization", position: "topRight", fontSize: 10 }}
              opacity={0.5}
            />
            <Bar
              yAxisId="investment"
              dataKey="businessInvestment"
              fill="#8b5cf6"
              opacity={0.7}
              name="Business Investment (T$)"
            />
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="capitalUtilization"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Capacity Utilization (%)"
            />
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="productivityGrowth"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Productivity Growth (%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/GPDI" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium font-inter transition-all duration-200 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full border border-purple-200 hover:border-purple-300 hover:shadow-sm"
        >
          🏭 View source data: FRED Business Investment
        </a>
      </div>
    </div>
  );
}