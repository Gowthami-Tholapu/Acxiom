import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function PipelineChart({ chartData }) {
  if (!chartData || !chartData.labels || chartData.labels.length === 0) {
    return <div className="text-center py-4 text-muted small">No pipeline data available</div>;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Amount: $${context.raw?.toLocaleString() || 0}`,
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
  };

  return (
    <div style={{ height: "260px" }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
