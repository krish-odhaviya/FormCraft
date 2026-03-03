import { Inter } from "next/font/google";
import "./globals.css";
import { FormsProvider } from "@/context/FormsContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "FormBuilder Platform",
  description: "Configurable Form Builder Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <FormsProvider>{children}</FormsProvider>
      </body>
    </html>
  );
}
