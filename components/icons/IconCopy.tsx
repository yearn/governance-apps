import * as React from "react";

export function IconCopy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 4C8 2.89543 8.89543 2 10 2H18C19.1046 2 20 2.89543 20 4V12C20 13.1046 19.1046 14 18 14H10C8.89543 14 8 13.1046 8 12V4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 8C2.89543 8 2 8.89543 2 10V20C2 21.1046 2.89543 22 4 22H14C15.1046 22 16 21.1046 16 20V18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
