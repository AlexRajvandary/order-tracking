type StorefrontAnnouncementProps = {
  text: string | null | undefined;
};

export function StorefrontAnnouncement({ text }: StorefrontAnnouncementProps) {
  const value = text?.trim();
  if (!value) return null;

  return (
    <div
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#111] text-white"
      role="status"
      aria-label="Объявление"
    >
      <div className="announcement-marquee flex min-h-8 w-max items-center py-1.5 text-[11px] font-medium tracking-[0.12em] whitespace-nowrap uppercase sm:min-h-9 sm:text-xs">
        <span className="px-6">{value}</span>
        <span className="px-6" aria-hidden>
          {value}
        </span>
        <span className="px-6" aria-hidden>
          {value}
        </span>
        <span className="px-6" aria-hidden>
          {value}
        </span>
      </div>
    </div>
  );
}
