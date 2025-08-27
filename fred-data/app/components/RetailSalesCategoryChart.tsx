'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar } from 'recharts';
import { fredApi, ChartDataPoint } from '../services/fredApi';

interface RetailCategoryPoint {
  date: string;
  totalRetailSales: number;
  durableGoods: number;
  services: number;
  nonDurableGoods: number;
  isHolidaySeason?: boolean;
  isRecoveryPeriod?: boolean;
}

export default function RetailSalesCategoryChart() {
  const [retailData, setRetailData] = useState<RetailCategoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [retailSalesData, durableGoodsData, servicesData] = await Promise.all([
          fredApi.getRetailSalesData(),
          fredApi.getDurableGoodsData(),
          fredApi.getServicesData()
        ]);

        // Process and align data by date
        const processedData: RetailCategoryPoint[] = [];
        
        // Use retail sales data as base
        retailSalesData.forEach(retailPoint => {
          const durablePoint = durableGoodsData.find(dg => dg.date === retailPoint.date);
          const servicesPoint = servicesData.find(sv => sv.date === retailPoint.date);
          
          if (durablePoint && servicesPoint) {
            const date = new Date(retailPoint.date);
            const month = date.getMonth();
            const isHolidaySeason = month === 10 || month === 11; // November & December
            const isRecoveryPeriod = date >= new Date('2021-01-01') && date <= new Date('2022-12-31');
            
            // Calculate non-durable goods as difference (simplified)
            const nonDurableGoods = Math.max(0, retailPoint.value - durablePoint.value);
            
            processedData.push({
              date: retailPoint.year, // Use year for x-axis
              totalRetailSales: retailPoint.value / 1000, // Convert to thousands
              durableGoods: durablePoint.value / 1000,
              services: servicesPoint.value / 1000,
              nonDurableGoods: nonDurableGoods / 1000,
              isHolidaySeason,
              isRecoveryPeriod
            });
          }
        });

        // Sample data to reduce chart density
        const sampledData = processedData.filter((_, index) => index % 3 === 0);
        setRetailData(sampledData);
        setError(null);
      } catch (err) {
        setError('Failed to load retail sales category data');
        console.error('Error loading retail sales category data:', err);
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-200 border-t-violet-600"></div>
          <span className="font-medium">Loading retail sales data...</span>
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
          <p className="text-violet-600 font-medium mb-1">
            {`Total Retail Sales: $${data.totalRetailSales.toFixed(0)}K`}
          </p>
          <p className="text-blue-600 font-medium mb-1">
            {`Durable Goods: $${data.durableGoods.toFixed(0)}K`}
          </p>
          <p className="text-emerald-600 font-medium mb-1">
            {`Services: $${data.services.toFixed(0)}K`}
          </p>
          <p className="text-orange-600 font-medium mb-1">
            {`Non-Durable Goods: $${data.nonDurableGoods.toFixed(0)}K`}
          </p>
          {data.isHolidaySeason && (
            <div className="mt-2 bg-violet-50 border border-violet-200 rounded-lg p-2">
              <p className="text-xs text-violet-600 font-medium">🎄 Holiday Shopping Season</p>
            </div>
          )}
          {data.isRecoveryPeriod && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-600 font-medium">📈 Post-Pandemic Recovery</p>
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
            data={retailData}
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
              domain={[0, 'dataMax + 50']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ 
                value: 'Sales (Thousands $)', 
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
              y={400} 
              stroke="#6b7280" 
              strokeDasharray="5 5" 
              label={{ value: "Pre-COVID Level", position: "top", fontSize: 10 }}
              opacity={0.5}
            />
            <Bar
              dataKey="totalRetailSales"
              fill="#8b5cf6"
              opacity={0.4}
              name="Total Retail Sales"
            />
            <Line
              type="monotone"
              dataKey="durableGoods"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
              name="Durable Goods"
            />
            <Line
              type="monotone"
              dataKey="services"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
              name="Services"
            />
            <Line
              type="monotone"
              dataKey="nonDurableGoods"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#ffffff' }}
              name="Non-Durable Goods"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-4 text-center">
        <a 
          href="https://fred.stlouisfed.org/series/RSAFS" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-violet-600 hover:text-violet-700 font-medium font-inter transition-all duration-200 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-full border border-violet-200 hover:border-violet-300 hover:shadow-sm"
        >
          🛍️ View source data: FRED Retail Sales Categories
        </a>
      </div>
    </div>
  );
}