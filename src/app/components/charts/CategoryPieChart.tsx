import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

interface CategoryPieChartProps {
  data: Array<{ id: string; name: string; value: number; count: number }>;
  colors: string[];
  width: string;
  height: number;
}

const CategoryPieChart = React.memo(({ data, colors, width, height }: CategoryPieChartProps) => {
  return (
    <PieChart width={parseInt(width)} height={height}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        fill="#8884d8"
        paddingAngle={5}
        dataKey="value"
        nameKey="name"
        label={false}
      >
        {data.map((entry, index) => (
          <Cell key={`category-${entry.id}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
        }}
      />
    </PieChart>
  );
});

CategoryPieChart.displayName = 'CategoryPieChart';

export default CategoryPieChart;
