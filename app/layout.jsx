import "./globals.css";

export const metadata = {
  title: "RSU Mart — Good finds, close by",
  description:
    "Discover the best food, fashion, and everyday finds from businesses around RSU.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
