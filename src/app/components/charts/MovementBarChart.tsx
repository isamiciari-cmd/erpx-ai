import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MovementBarChartProps {
  data: Array<{ id: string; day: string; in: number; out: number }>;
}

const MovementBarChart = React.memo(({ data }: MovementBarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="day" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
            borderRadius: "8px",
          }}
        />
        <Bar dataKey="in" fill="#10B981" radius={[4, 4, 0, 0]} name="Stock In" />
        <Bar dataKey="out" fill="#EF4444" radius={[4, 4, 0, 0]} name="Stock Out" />
      </BarChart>
    </ResponsiveContainer>
  );
});

MovementBarChart.displayName = 'MovementBarChart';

export default MovementBarChart;
