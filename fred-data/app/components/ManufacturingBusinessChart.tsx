'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface ManufacturingPoint {
  date: string;
  manufacturingEmployment: number;
  consumerSentiment: number;
  tradeBalance: number;
  industrialProduction: number;
  isEmpGrowth?: boolean;
  isHighSentiment?: boolean;
  isTradeSurplus?: boolean;
  isProductionGrowth?: boolean;
}

export default function ManufacturingBusinessChart() {
  const [mfgData, setMfgData] = useState<ManufacturingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [manufacturingData, sentimentData, tradeData, industrialData] = await Promise.all([
          fredApi.getManufacturingEmploymentData(),
          fredApi.getConsumerSentimentData(),
          fredApi.getTradeBalanceData(),
          fredApi.getIndustrialProductionData()
        ]);

        // Process and align data by date
        const processedData: ManufacturingPoint[] = [];
        
        // Use manufacturing data as base
        manufacturingData.forEach(mfgPoint => {
          const sentimentPoint = sentimentData.find(sp => sp.date === mfgPoint.date);
          const tradePoint = tradeData.find(tp => tp.date === mfgPoint.date);
          const industrialPoint = industrialData.find(ip => ip.date === mfgPoint.date);
          
          if (sentimentPoint && tradePoint && industrialPoint) {
            const isEmpGrowth = mfgPoint.value > 12000; // Manufacturing employment above 12M
            const isHighSentiment = sentimentPoint.value > 90; // High consumer sentiment
            const isTradeSurplus = tradePoint.value > 0; // Positive trade balance
            const isProductionGrowth = industrialPoint.value > 100; // Industrial production above baseline
            
            processedData.push({
              date: mfgPoint.year, // Use year for x-axis
              manufacturingEmployment: mfgPoint.value / 1000, // Convert to millions
              consumerSentiment: sentimentPoint.value,
              tradeBalance: tradePoint.value / 1000, // Convert to billions
              industrialProduction: industrialPoint.value,
              isEmpGrowth,
              isHighSentiment,
              isTradeSurplus,
              isProductionGrowth
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 2 === 0);
        setMfgData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load manufacturing and economic indicators data');
        console.error('Error loading manufacturing and economic indicators data:', err);
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
          <span className="font-medium">Loading manufacturing data...</span>
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
            {`Manufacturing Employment: ${data.manufacturingEmployment.toFixed(1)}M`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Consumer Sentiment: ${data.consumerSentiment.toFixed(1)}`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Trade Balance: $${data.tradeBalance.toFixed(0)}B`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`Industrial Production: ${data.industrialProduction.toFixed(1)}`}
          </p>
          {data.isEmpGrowth && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">👷 Strong Manufacturing Employment</p>
            </div>
          )}
          {data.isHighSentiment && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <p className="text-xs text-emerald-600 font-medium">😊 High Consumer Sentiment</p>
            </div>
          )}
          {data.isProductionGrowth && (
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-2">
              <p className="text-xs text-purple-600 font-medium">🏭 Industrial Production Growth</p>
            </div>
          )}
          {data.isTradeSurplus && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-xs text-blue-600 font-medium">💰 Trade Surplus</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isEmpGrowth && payload.isHighSentiment) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill="#10b981" 
          stroke="#ffffff" 
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    if (payload.isProductionGrowth) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={5} 
          fill="#8b5cf6" 
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
            data={mfgData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="pmiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
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
              yAxisId="employment"
              domain={[10, 15]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Employment (Millions)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
              }}
            />
            <YAxis 
              yAxisId="index"
              orientation="right"
              domain={[60, 120]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Index Value', 
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
              yAxisId="employment"
              y={12} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-Crisis Employment", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              yAxisId="index"
              y={90} 
              stroke="#10b981" 
              strokeDasharray="3 3" 
              label={{ value: "Sentiment Baseline", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <ReferenceLine 
              yAxisId="index"
              y={100} 
              stroke="#8b5cf6" 
              strokeDasharray="3 3" 
              label={{ value: "Production Baseline", position: "topRight", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              yAxisId="employment"
              type="monotone"
              dataKey="manufacturingEmployment"
              stroke="#6366f1"
              strokeWidth={3}
              fill="url(#pmiGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#6366f1', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="Manufacturing Employment (M)"
            />
            <Line
              yAxisId="index"
              type="monotone"
              dataKey="consumerSentiment"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Consumer Sentiment"
            />
            <Line
              yAxisId="index"
              type="monotone"
              dataKey="industrialProduction"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Industrial Production"
            />
            <Line
              yAxisId="employment"
              type="monotone"
              dataKey="tradeBalance"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#ffffff' }}
              name="Trade Balance (B$)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/NAPM" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium font-inter transition-all duration-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-full border border-indigo-200 hover:border-indigo-300 hover:shadow-sm"
        >
          🏭 View source data: FRED Manufacturing & Business
        </a>
      </div>
    </div>
  );
}