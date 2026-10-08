import React from "react";

export default function Footer() {
  return (
    <footer className="py-3 px-4 bg-white border-top text-center text-muted small mt-auto">
      <div className="container-fluid d-flex flex-column flex-sm-row justify-content-between align-items-center">
        <span>&copy; {new Date().getFullYear()} AcxiomCRM. Production-Ready Enterprise Platform.</span>
        <span className="mt-1 mt-sm-0">FastAPI &bull; React &bull; SQLAlchemy &bull; MySQL</span>
      </div>
    </footer>
  );
}
