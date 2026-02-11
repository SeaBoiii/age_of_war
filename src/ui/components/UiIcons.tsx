import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export function CrestIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l7 3v5c0 5-3.4 8.8-7 10-3.6-1.2-7-5-7-10V6l7-3z" />
      <path d="M8.5 11.5h7" />
      <path d="M12 8v7" />
    </BaseIcon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 6l10 6-10 6V6z" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8.5 6.5v11" />
      <path d="M15.5 6.5v11" />
    </BaseIcon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10v14H7a2.5 2.5 0 0 0-2.5 2V6.5z" />
      <path d="M7 4v16" />
    </BaseIcon>
  );
}

export function VolumeOnIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 10h3l4-4v12l-4-4H5z" />
      <path d="M16 9.5a4 4 0 0 1 0 5" />
      <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
    </BaseIcon>
  );
}

export function VolumeOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 10h3l4-4v12l-4-4H5z" />
      <path d="M16 9l5 6" />
      <path d="M21 9l-5 6" />
    </BaseIcon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l1.4 3.7L17 8l-3.6 1.3L12 13l-1.4-3.7L7 8l3.6-1.3L12 3z" />
      <path d="M6 14l.8 2L9 16.8 6.8 17.6 6 20l-.8-2.4L3 16.8 5.2 16 6 14z" />
    </BaseIcon>
  );
}

export function ChipIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M4 9h3M4 15h3M17 9h3M17 15h3M9 4v3M15 4v3M9 17v3M15 17v3" />
    </BaseIcon>
  );
}

export function GoldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse cx="12" cy="7.5" rx="6" ry="3.5" />
      <path d="M6 7.5v6c0 1.9 2.7 3.5 6 3.5s6-1.6 6-3.5v-6" />
      <path d="M6 10.5c0 1.9 2.7 3.5 6 3.5s6-1.6 6-3.5" />
    </BaseIcon>
  );
}

export function AgeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 19V5" />
      <path d="M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 19h14" />
    </BaseIcon>
  );
}

export function TurretIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 18h14" />
      <path d="M8 18v-5h8v5" />
      <path d="M12 8h4l3 2-3 2h-4z" />
      <path d="M8 13h8" />
    </BaseIcon>
  );
}

export function QueueIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h10" />
      <path d="M18 15v4" />
    </BaseIcon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
      <path d="M10 19v-4h4v4" />
    </BaseIcon>
  );
}

export function RestartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 5v5h-5" />
    </BaseIcon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 5h8v3a4 4 0 0 1-8 0V5z" />
      <path d="M10 12v3" />
      <path d="M14 12v3" />
      <path d="M8 18h8" />
      <path d="M6 7H4a3 3 0 0 0 3 3" />
      <path d="M18 7h2a3 3 0 0 1-3 3" />
    </BaseIcon>
  );
}

export function DefeatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l7 3v5c0 5-3.4 8.8-7 10-3.6-1.2-7-5-7-10V6l7-3z" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 9.5 12 15l5.5-5.5" />
    </BaseIcon>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 14.5 12 9l5.5 5.5" />
    </BaseIcon>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="8" width="12" height="10" rx="2" />
      <path d="M9 12h0.01M15 12h0.01" />
      <path d="M12 8V5" />
      <path d="M9 18v2M15 18v2" />
    </BaseIcon>
  );
}
