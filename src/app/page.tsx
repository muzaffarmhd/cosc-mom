import ClientOnly from '@/components/ClientOnly';
import MoMDashboard from '@/components/MoMDashboard';

export default function Home() {
  return (
    <ClientOnly>
      <MoMDashboard />
    </ClientOnly>
  );
}