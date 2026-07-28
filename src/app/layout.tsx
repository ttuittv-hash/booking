import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "서울아레나 대관 견적·신청 시스템",
  description: "서울아레나 대관 견적 산출 및 신청 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
