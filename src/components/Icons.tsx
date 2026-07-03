import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const EditIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.8 6.2 4 4"/></IconBase>
);
export const RefreshIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.2 9A7 7 0 0 0 6.5 6.5L4 11"/><path d="M5.8 15A7 7 0 0 0 17.5 17.5L20 13"/></IconBase>
);
export const SearchIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></IconBase>
);
export const PlusIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M12 5v14M5 12h14"/></IconBase>
);
export const SaveIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></IconBase>
);
export const LogoutIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></IconBase>
);
export const GripIcon = (props: IconProps) => (
  <IconBase {...props}><circle cx="8" cy="7" r=".8" fill="currentColor"/><circle cx="16" cy="7" r=".8" fill="currentColor"/><circle cx="8" cy="12" r=".8" fill="currentColor"/><circle cx="16" cy="12" r=".8" fill="currentColor"/><circle cx="8" cy="17" r=".8" fill="currentColor"/><circle cx="16" cy="17" r=".8" fill="currentColor"/></IconBase>
);
export const TrashIcon = (props: IconProps) => (
  <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></IconBase>
);
export const ChevronUpIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m7 14 5-5 5 5"/></IconBase>
);
export const ChevronDownIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m7 10 5 5 5-5"/></IconBase>
);
export const XIcon = (props: IconProps) => (
  <IconBase {...props}><path d="m6 6 12 12M18 6 6 18"/></IconBase>
);
export const LockIcon = (props: IconProps) => (
  <IconBase {...props}><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></IconBase>
);
