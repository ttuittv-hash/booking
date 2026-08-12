import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "서울아레나 대관 시스템",
  description: "대관 신청부터 심사·계약·정산까지 한 곳에서",
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
