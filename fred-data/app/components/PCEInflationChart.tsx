'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface PCEInflationPoint {
  date: string;
  pceInflation: number;
  producerPrices: number;
  coreInflation: number;
  inflationSpread: number;
  isHighInflation?: boolean;
  isDeflationRisk?: boolean;
  isSupplyShock?: boolean;
}

export default function PCEInflationChart() {
  const [inflationData, setInflationData] = useState<PCEInflationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pceData, producerData, coreData] = await Promise.all([
          fredApi.getPCEInflationData(),
          fredApi.getProducerPriceIndexData(),
          fredApi.getCoreCPIData()
        ]);

        // Process and align data by date
        const processedData: PCEInflationPoint[] = [];
        
        // Use PCE data as base
        pceData.forEach((pcePoint, index) => {
          const producerPoint = producerData.find(pp => pp.date === pcePoint.date);
          const corePoint = coreData.find(cp => cp.date === pcePoint.date);
          
          if (producerPoint && corePoint) {
            // Calculate year-over-year inflation rates
            let pceInflationRate = 0;
            let producerInflationRate = 0;
            let coreInflationRate = 0;
            
            if (index >= 12) { // Need 12 months for YoY calculation
              const pceYearAgo = pceData[index - 12]?.value;
              const producerYearAgo = producerData.find(pp => pp.date === pceData[index - 12]?.date)?.value;
              const coreYearAgo = coreData.find(cp => cp.date === pceData[index - 12]?.date)?.value;
              
              if (pceYearAgo && producerYearAgo && coreYearAgo) {
                pceInflationRate = ((pcePoint.value - pceYearAgo) / pceYearAgo) * 100;
                producerInflationRate = ((producerPoint.value - producerYearAgo) / producerYearAgo) * 100;
                coreInflationRate = ((corePoint.value - coreYearAgo) / coreYearAgo) * 100;
              }
            }
            
            const inflationSpread = producerInflationRate - pceInflationRate; // Producer-Consumer spread
            const isHighInflation = pceInflationRate > 4; // Above Fed comfort zone
            const isDeflationRisk = pceInflationRate < 0; // Deflation
            const isSupplyShock = Math.abs(inflationSpread) > 3; // Large spread indicates supply issues
            
            processedData.push({
              date: pcePoint.year, // Use year for x-axis
              pceInflation: pceInflationRate,
              producerPrices: producerInflationRate,
              coreInflation: coreInflationRate,
              inflationSpread,
              isHighInflation,
              isDeflationRisk,
              isSupplyShock
            });
          }
        });

        // Filter out early data with no YoY calculations and sample
        const validData = processedData.filter(point => point.pceInflation !== 0);
        const sampledData = validData.filter((_, index) => index % 2 === 0);
        setInflationData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load PCE inflation data');
        console.error('Error loading PCE inflation data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-200 border-t-orange-600"></div>
          <span className="font-medium">Loading PCE inflation data...</span>
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
          <p className="text-orange-600 font-medium mb-1">
            {`PCE Inflation: ${data.pceInflation.toFixed(1)}%`}
          </p>
          <p className="text-red-600 font-medium mb-1">
            {`Producer Prices: ${data.producerPrices.toFixed(1)}%`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Core Inflation: ${data.coreInflation.toFixed(1)}%`}
          </p>
          <p className="text-purple-600 font-medium mb-1">
            {`Producer-Consumer Spread: ${data.inflationSpread.toFixed(1)}%`}
          </p>
          {data.isHighInflation && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-600 font-medium">🔥 High Inflation Period</p>
            </div>
          )}
          {data.isDeflationRisk && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-xs text-blue-600 font-medium">❄️ Deflation Risk</p>
            </div>
          )}
          {data.isSupplyShock && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-xs text-orange-600 font-medium">⚡ Supply Chain Impact</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isHighInflation) {
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
    if (payload.isDeflationRisk) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={5} 
          fill="#3b82f6" 
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
            data={inflationData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 40,
            }}
          >
            <defs>
              <linearGradient id="pceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.01}/>
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
              domain={[-2, 'dataMax + 1']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Inflation Rate (%)', 
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
              label={{ value: "Fed Target", position: "topLeft", fontSize: 10 }}
              opacity={0.5}
            />
            <ReferenceLine 
              y={0} 
              stroke="#3b82f6" 
              strokeDasharray="3 3" 
              label={{ value: "Zero Inflation", position: "topLeft", fontSize: 10 }}
              opacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="pceInflation"
              stroke="#f97316"
              strokeWidth={3}
              fill="url(#pceGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 6, 
                stroke: '#f97316', 
                strokeWidth: 2,
                fill: '#ffffff'
              }}
              name="PCE Inflation (%)"
            />
            <Line
              type="monotone"
              dataKey="producerPrices"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#ffffff' }}
              name="Producer Price Inflation (%)"
            />
            <Line
              type="monotone"
              dataKey="coreInflation"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#ffffff' }}
              name="Core Inflation (%)"
            />
            <Line
              type="monotone"
              dataKey="inflationSpread"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#ffffff' }}
              name="Producer-Consumer Spread (%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/PCEPI" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium font-inter transition-all duration-200 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-full border border-orange-200 hover:border-orange-300 hover:shadow-sm"
        >
          💰 View source data: FRED PCE & Producer Prices
        </a>
      </div>
    </div>
  );
}