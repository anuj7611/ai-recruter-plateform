import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Hirely — AI Interview Platform",
    template: "%s · Hirely",
  },
  description: "Practice, evaluate, and manage better interviews with AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full"><Providers>{children}</Providers></body>
    </html>
  );
}
