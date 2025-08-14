import { ConnectionProvider } from "../contexts/ConnectionContext";
import "./globals.css";

export const metadata = {
  title: "speakBee - AI Voice Intelligence Platform",
  description: "AI-Powered Voice Intelligence Platform with speaker diarization and voice recognition",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConnectionProvider>
          {children}
        </ConnectionProvider>
      </body>
    </html>
  );
}