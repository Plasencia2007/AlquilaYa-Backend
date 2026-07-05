import { SVGProps } from 'react';

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Map Pin / Location Icon on the top right */}
      <path
        d="M 78,34 C 77,32 70,26 70,20 A 8 8 0 1 1 86,20 C 86,26 79,32 78,34 Z M 78,17 A 3 3 0 1 0 78,23 A 3 3 0 1 0 78,17 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      
      {/* House outline (Left wall and roof) */}
      <path
        d="M 12,88 V 38 L 50,8 L 88,38"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* House outline (Bottom and right wall with gap) */}
      <path
        d="M 12,88 H 88 V 58"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Bed inside the house: Headboard */}
      <path
        d="M 24,50 V 80"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Bed inside the house: Mattress and Leg */}
      <path
        d="M 24,68 H 72 V 80"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Bed inside the house: Pillow */}
      <path
        d="M 32,60 H 42"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
