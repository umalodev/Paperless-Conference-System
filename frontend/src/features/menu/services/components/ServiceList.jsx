import React from "react";
import ServiceRequestCard from "./ServiceRequestCard";

export default function ServiceList({
  title,
  requests,
  loading,
  error,
  isAssist,
  busyId,
  onAssign,
  onAccept,
  onDone,
  onMarkDone,
  onCancel,
}) {
  return (
    <section className="svc-card svc-recent">
      <div className="svc-card-title">{title}</div>

      <div className="svc-scroll">
        {loading && <div className="pd-empty">Loading...</div>}
        {error && <div className="pd-empty">Error: {error}</div>}

        {!loading && !error && requests.length === 0 && (
          <div className="pd-empty" style={{ padding: 12 }}>
            No requests
          </div>
        )}

        {!loading &&
          !error &&
          requests.map((r) => (
            <ServiceRequestCard
              key={r.serviceRequestId}
              request={r}
              isAssist={isAssist}
              busyId={busyId}
              onAssign={onAssign}
              onAccept={onAccept}
              onDone={onDone}
              onMarkDone={onMarkDone}
              onCancel={onCancel}
            />
          ))}
      </div>
    </section>
  );
}
