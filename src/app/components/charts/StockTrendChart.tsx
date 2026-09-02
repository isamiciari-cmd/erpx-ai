import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StockTrendChartProps {
  data: Array<{ id: string; month: string; value: number }>;
}

const StockTrendChart = React.memo(({ data }: StockTrendChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="inventoryStockGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="month" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#inventoryStockGradient)"
          name="Stock Value"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

StockTrendChart.displayName = 'StockTrendChart';

export default StockTrendChart;
