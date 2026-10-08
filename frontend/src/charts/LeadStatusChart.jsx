import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function LeadStatusChart({ chartData }) {
  if (!chartData || !chartData.labels || chartData.labels.length === 0) {
    return <div className="text-center py-4 text-muted small">No lead status data available</div>;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 12, padding: 15, font: { size: 12 } },
      },
    },
    cutout: "65%",
  };

  return (
    <div style={{ height: "260px" }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
