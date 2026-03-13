import { Inter } from "next/font/google";
import "./globals.css";
import { FormsProvider } from "@/context/FormsContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "FormCraft — Admin",
  description: "Configurable Form Builder Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <FormsProvider>
            {children}
            <ToastContainer />
          </FormsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
