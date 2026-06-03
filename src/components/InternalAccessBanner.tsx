type InternalAccessBannerProps = {
  area: "admin" | "employee";
};

const messageByArea: Record<InternalAccessBannerProps["area"], string> = {
  admin:
    "Phase 1 uses local browser storage. Secure login, database, and role-based access will be added in the backend phase.",
  employee:
    "Phase 1 uses local browser storage. Secure login, database, and role-based access will be added in the backend phase.",
};

export function InternalAccessBanner({ area }: InternalAccessBannerProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#0B3D91]">
      <span className="font-semibold">{messageByArea[area]}</span>
    </div>
  );
}
