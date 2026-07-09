type PortalBannerProps = {
  extraMessage?: string;
};

export function PortalBanner({ extraMessage }: PortalBannerProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#0B3D91]">
      <p className="font-semibold">
        Phase 1 uses local browser storage. Secure login, database, and role-based access will be
        added in the backend phase.
      </p>
      {extraMessage ? <p className="mt-1 text-xs text-slate-600">{extraMessage}</p> : null}
    </div>
  );
}
