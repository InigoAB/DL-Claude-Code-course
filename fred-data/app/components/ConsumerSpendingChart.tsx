'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area, Bar } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface SpendingPoint {
  date: string;
  personalConsumption: number;
  retailSales: number;
  consumerConfidence: number;
  spendingGrowth?: number;
  isHighSpending?: boolean;
  isConfidenceHigh?: boolean;
  isRecessionPeriod?: boolean;
}

export default function ConsumerSpendingChart() {
  const [spendingData, setSpendingData] = useState<SpendingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pceData, retailData, confidenceData] = await Promise.all([
          fredApi.getPersonalConsumptionData(),
          fredApi.getRetailSalesData(),
          fredApi.getConsumerConfidenceData()
        ]);

        // Process and align data by date
        const processedData: SpendingPoint[] = [];
        
        // Use PCE data as base (quarterly)
        pceData.forEach((pcePoint, index) => {
          const retailPoint = retailData.find(rs => {
            const pceDate = new Date(pcePoint.date);
            const retailDate = new Date(rs.date);
            // Match within same quarter
            return Math.abs(pceDate.getTime() - retailDate.getTime()) < 95 * 24 * 60 * 60 * 1000;
          });
          
          const confidencePoint = confidenceData.find(cc => {
            const pceDate = new Date(pcePoint.date);
            const confDate = new Date(cc.date);
            return Math.abs(pceDate.getTime() - confDate.getTime()) < 95 * 24 * 60 * 60 * 1000;
          });
          
          if (retailPoint && confidencePoint) {
            // Calculate spending growth rate
            let spendingGrowth = 0;
            if (index > 0) {
              const prevPCE = pceData[index - 1].value;
              spendingGrowth = ((pcePoint.value - prevPCE) / prevPCE) * 100;
            }
            
            const isHighSpending = pcePoint.value > 15000; // Above $15T annually
            const isConfidenceHigh = confidencePoint.value > 100; // Above baseline
            const isRecessionPeriod = spendingGrowth < -2; // Declining consumption
            
            processedData.push({
              date: pcePoint.year, // Use year for x-axis
              personalConsumption: pcePoint.value / 1000, // Convert to trillions
              retailSales: retailPoint.value / 1000, // Convert to thousands for scale
              consumerConfidence: confidencePoint.value,
              spendingGrowth,
              isHighSpending,
              isConfidenceHigh,
              isRecessionPeriod
            });
          }
        });

        setSpendingData(processedData);
        setError(null);
      } catch (err) {
        setError('Failed to load consumer spending data');
        console.error('Error loading consumer spending data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-rose-200 border-t-rose-600"></div>
          <span className="font-medium">Loading consumer spending data...</span>
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
          <p className="text-rose-600 font-medium mb-1">
            {`Personal Consumption: $${data.personalConsumption.toFixed(1)}T`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Retail Sales: $${data.retailSales.toFixed(0)}K`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Consumer Confidence: ${data.consumerConfidence.toFixed(1)}`}
          </p>
          {data.spendingGrowth && (
            <p className={`text-sm font-medium ${data.spendingGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {`Spending Growth: ${data.spendingGrowth.toFixed(1)}%`}
            </p>
          )}
          {data.isRecessionPeriod && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">📉 Spending Contraction</p>
            </div>
          )}
          {data.isConfidenceHigh && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">😊 High Consumer Confidence</p>
            </div>
          )}
          {data.isHighSpending && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-xs text-blue-600 font-medium">💰 Strong Consumption</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isRecessionPeriod) {
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
    if (payload.isConfidenceHigh) {
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
            data={spendingData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              yAxisId="trillions"
              domain={['dataMin - 1', 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Spending (Trillions $)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="confidence"
              orientation="right"
              domain={[70, 130]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Confidence Index', 
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
              yAxisId="trillions"
              y={12} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-COVID Spending", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="confidence"
              y={100} 
              stroke="#10b981" 
              strokeDasharray="3 3" 
              label={{ value: "Baseline Confidence", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              yAxisId="trillions"
              type="monotone"
              dataKey="personalConsumption"
              stroke="#f43f5e"
              strokeWidth={3}
              fill="url(#spendingGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#f43f5e', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Personal Consumption (T$)"
            />
            <Bar
              yAxisId="trillions"
              dataKey="retailSales"
              fill="#3b82f6"
              opacity={0.6}
              name="Retail Sales (scaled)"
            />
            <Line
              yAxisId="confidence"
              type="monotone"
              dataKey="consumerConfidence"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Consumer Confidence"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/PCE" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-rose-600 hover:text-rose-700 font-medium font-inter transition-all duration-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-full border border-rose-200 hover:border-rose-300 hover:shadow-sm"
        >
          🛒 View source data: FRED Consumer Spending
        </a>
      </div>
    </div>
  );
}