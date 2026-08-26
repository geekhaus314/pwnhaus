import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "pwn4g3 Next.js Lab",
  description: "An isolated Next.js application lab in the pwn4g3 engineering portfolio."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
