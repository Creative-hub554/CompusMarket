type OrderItemTimelineProps = {
  status: string;
  trackingNumber?: string | null;
  packedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
};

const STEPS = [
  { key: "APPROVED", label: "Approved" },
  { key: "PACKING", label: "Packed", timeField: "packedAt" as const },
  { key: "SHIPPED", label: "Shipped", timeField: "shippedAt" as const },
  { key: "DELIVERED", label: "Delivered", timeField: "deliveredAt" as const },
];

const STATUS_ORDER = ["PENDING", "APPROVED", "PACKING", "SHIPPED", "DELIVERED"];

function formatTime(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderItemTimeline({ status, trackingNumber, packedAt, shippedAt, deliveredAt }: OrderItemTimelineProps) {
  if (status === "REJECTED") {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        Order rejected.
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
        Order cancelled.
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);
  if (currentIdx < 0) return null;

  return (
    <div className="py-1">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const stepIdx = i + 1;
          const done = currentIdx >= stepIdx;
          const isCurrent = currentIdx === stepIdx - 1;
          const time = formatTime(step.timeField ? { packedAt, shippedAt, deliveredAt }[step.timeField] : null);
          return (
            <div key={step.key} className="flex-1 min-w-0">
              <div className="flex items-center">
                <div
                  className={`w-4 h-4 rounded-full shrink-0 border-2 ${
                    done
                      ? "bg-green-500 border-green-500"
                      : isCurrent
                        ? "bg-white border-khmer-blue"
                        : "bg-white border-gray-300"
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${done ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
              <p className={`text-xs font-medium mt-1.5 ${done ? "text-green-700" : isCurrent ? "text-khmer-blue" : "text-gray-400"}`}>
                {step.label}
              </p>
              {time && <p className="text-[10px] text-gray-400 mt-0.5">{time}</p>}
            </div>
          );
        })}
      </div>
      {status === "SHIPPED" && trackingNumber && (
        <p className="text-xs text-gray-500 mt-2">
          Tracking: <span className="font-medium">{trackingNumber}</span>
        </p>
      )}
    </div>
  );
}
