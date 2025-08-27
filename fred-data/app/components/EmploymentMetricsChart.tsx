'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface EmploymentPoint {
  date: string;
  unemploymentRate: number;
  laborParticipation: number;
  nonfarmPayrolls: number;
  isCovidPeriod?: boolean;
  isRecoveryPeriod?: boolean;
}

export default function EmploymentMetricsChart() {
  const [employmentData, setEmploymentData] = useState<EmploymentPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [unemploymentData, participationData, payrollsData] = await Promise.all([
          fredApi.getUnemploymentData(),
          fredApi.getLaborParticipationData(),
          fredApi.getNonfarmPayrollsData()
        ]);

        // Process and align data by date
        const processedData: EmploymentPoint[] = [];
        
        // Use unemployment data as base and match with other series
        unemploymentData.forEach(unempPoint => {
          const participationPoint = participationData.find(p => p.date === unempPoint.date);
          const payrollsPoint = payrollsData.find(p => p.date === unempPoint.date);
          
          if (participationPoint && payrollsPoint) {
            const date = new Date(unempPoint.date);
            const isCovidPeriod = date >= new Date('2020-03-01') && date <= new Date('2020-12-31');
            const isRecoveryPeriod = date >= new Date('2021-01-01') && date <= new Date('2022-12-31');
            
            processedData.push({
              date: unempPoint.year, // Use year for x-axis
              unemploymentRate: unempPoint.value,
              laborParticipation: participationPoint.value,
              nonfarmPayrolls: payrollsPoint.value / 1000, // Convert to millions for readability
              isCovidPeriod,
              isRecoveryPeriod
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 3 === 0);
        setEmploymentData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load employment data');
        console.error('Error loading employment data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-200 border-t-emerald-600"></div>
          <span className="font-medium">Loading employment data...</span>
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
            {`Unemployment: ${data.unemploymentRate.toFixed(1)}%`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Labor Participation: ${data.laborParticipation.toFixed(1)}%`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Nonfarm Payrolls: ${data.nonfarmPayrolls.toFixed(1)}M`}
          </p>
          {data.isCovidPeriod && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">🦠 COVID-19 Impact Period</p>
            </div>
          )}
          {data.isRecoveryPeriod && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <p className="text-xs text-emerald-600 font-medium">📈 Recovery Period</p>
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
            data={employmentData}
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
              yAxisId="percentage"
              domain={[0, 70]}
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
            <YAxis 
              yAxisId="millions"
              orientation="right"
              domain={[120, 160]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Millions', 
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
              y={5} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Normal Unemployment", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="percentage"
              y={63} 
              stroke="#3b82f6" 
              strokeDasharray="3 3" 
              label={{ value: "Pre-COVID Participation", position: "top", fontSize: 10 }}
              opacity={0.7}
            />
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="unemploymentRate"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#ffffff' }}
              name="Unemployment Rate (%)"
            />
            <Line
              yAxisId="percentage"
              type="monotone"
              dataKey="laborParticipation"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Labor Participation (%)"
            />
            <Line
              yAxisId="millions"
              type="monotone"
              dataKey="nonfarmPayrolls"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Nonfarm Payrolls (M)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/UNRATE" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium font-inter transition-all duration-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-full border border-emerald-200 hover:border-emerald-300 hover:shadow-sm"
        >
          👥 View source data: FRED Employment
        </a>
      </div>
    </div>
  );
}