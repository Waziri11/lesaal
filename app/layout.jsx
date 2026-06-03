import "./globals.css";

export const metadata = {
  title: "Lesaal Marketing | Modern Growth Studio",
  description:
    "Modern marketing website with smooth scroll, cinematic transitions, and interaction-rich UI built in Next.js.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
