import React from "react";

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3 pt-3 border-top">
      <div className="text-muted small mb-2 mb-md-0">
        Showing Page <span className="fw-bold">{page}</span> of <span className="fw-bold">{totalPages}</span> ({totalItems} total records)
      </div>
      <nav aria-label="Table pagination">
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              <i className="bi bi-chevron-left me-1"></i> Prev
            </button>
          </li>
          {[...Array(totalPages)].map((_, i) => {
            const p = i + 1;
            // Only render a reasonable window around current page
            if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
              return (
                <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                  <button className="page-link" onClick={() => onPageChange(p)}>
                    {p}
                  </button>
                </li>
              );
            } else if (p === page - 3 || p === page + 3) {
              return (
                <li key={p} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              );
            }
            return null;
          })}
          <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              Next <i className="bi bi-chevron-right ms-1"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
