import type { SVGProps } from 'react'

const paths: Record<string, React.ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  risk: <><path d="M12 3v10"/><path d="m18.5 20-5.1-8.8a1.6 1.6 0 0 0-2.8 0L5.5 20Z"/><path d="M12 17h.01"/></>,
  drivers: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></>,
  customer: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  retention: <><path d="M12 21s-7-4.3-7-11a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 6.7-7 11-7 11Z"/><path d="m9.5 12 1.7 1.7 3.8-4"/></>,
  geography: <><circle cx="12" cy="10" r="3"/><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/></>,
  model: <><path d="M9 3h6v4H9z"/><path d="M12 7v4"/><path d="M5 11h14v8H5z"/><path d="M9 15h.01M15 15h.01"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  refresh: <><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 1 9"/></>,
  filter: <><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  spark: <><path d="m4 17 5-5 4 3 7-9"/><path d="M15 6h5v5"/></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof paths
}

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
