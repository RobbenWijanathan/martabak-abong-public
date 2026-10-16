import { Suspense } from 'react';
import { OrderPage } from '@/components/order-page';
export default function ReceiptPage() { return <Suspense fallback={<p className="loading">Memuat struk…</p>}><OrderPage receipt /></Suspense>; }
