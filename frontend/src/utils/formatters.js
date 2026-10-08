export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "N/A";
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return dateTimeString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusBadgeClass(status) {
  if (!status) return "badge bg-secondary";
  const s = status.toLowerCase();
  switch (s) {
    case "active":
    case "won":
    case "completed":
      return "badge-status badge-active";
    case "inactive":
    case "lost":
    case "cancelled":
    case "missed":
      return "badge-status badge-inactive";
    case "new":
      return "badge-status badge-new";
    case "contacted":
      return "badge-status badge-contacted";
    case "qualified":
      return "badge-status badge-qualified";
    case "unqualified":
      return "badge-status badge-unqualified";
    case "converted":
      return "badge-status badge-converted";
    case "planned":
    case "proposal":
    case "negotiation":
      return "badge-status badge-planned";
    default:
      return "badge bg-secondary";
  }
}
