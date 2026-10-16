import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Martabak Abong · Demo', description: 'Demo interaktif pengelolaan pesanan Martabak Abong dengan data fiktif.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fbf8f3' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="id"><body>{children}</body></html>; }
