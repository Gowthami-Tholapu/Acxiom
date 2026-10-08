import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function MonthlySalesChart({ chartData }) {
  if (!chartData || !chartData.labels || chartData.labels.length === 0) {
    return <div className="text-center py-4 text-muted small">No monthly sales data available</div>;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Revenue: $${context.raw?.toLocaleString() || 0}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value >= 1000 ? value / 1000 + "k" : value}`,
        },
        grid: { color: "#f1f5f9" },
      },
      x: {
        grid: { display: false },
      },
    },
    elements: {
      line: { tension: 0.35, fill: true },
      point: { radius: 4, hitRadius: 8 },
    },
  };

  return (
    <div style={{ height: "260px" }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
