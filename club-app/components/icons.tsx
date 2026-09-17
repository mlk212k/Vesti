type IconProps = {
  className?: string;
  strokeWidth?: number;
};

function base(paths: React.ReactNode) {
  return function Icon({ className, strokeWidth = 1.75 }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  };
}

export const HomeIcon = base(
  <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" />,
);

export const CalendarIcon = base(
  <>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18" />
    <path d="M8 2.5v4" />
    <path d="M16 2.5v4" />
  </>,
);

export const UsersIcon = base(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
);

export const BellIcon = base(
  <>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </>,
);

export const MessageIcon = base(
  <path d="M21 11.5a8.38 8.38 0 0 1-4.3 7.3 8.5 8.5 0 0 1-8.9-.4L3 21l1.9-4.8a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.4h.5a8.48 8.48 0 0 1 8 8v.5Z" />,
);
