import { Suspense } from 'react';
import { OrderPage } from '@/components/order-page';
export default function EditPage() { return <Suspense fallback={<p className="loading">Memuat pesanan…</p>}><OrderPage /></Suspense>; }
