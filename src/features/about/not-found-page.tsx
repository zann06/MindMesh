import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { buttonClassName } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/states';
import { useCopy } from '@/app/language-store';
import { FeatureOrb } from '@/features/world/feature-orb';

const copy = {
  en: {
    srTitle: 'Page not found',
    title: 'This corner of the universe is empty',
    description:
      'The page may have moved, or the link may be incomplete. Your stored project data is unaffected.',
    returnDashboard: 'Return to dashboard',
    openUniverse: 'Open universe',
  },
  id: {
    srTitle: 'Halaman tidak ditemukan',
    title: 'Sudut semesta ini kosong',
    description:
      'Halaman mungkin telah dipindahkan, atau tautannya tidak lengkap. Data proyek yang tersimpan tidak terpengaruh.',
    returnDashboard: 'Kembali ke dasbor',
    openUniverse: 'Buka semesta',
  },
};

export function NotFoundPage() {
  const c = useCopy(copy);
  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="sr-only">{c.srTitle}</h1>
      <div className="mb-5 flex justify-center">
        <FeatureOrb variant="knowledge" size={96} />
      </div>
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title={c.title}
        description={c.description}
        action={
          <>
            <Link to="/" className={buttonClassName('primary', 'md')}>
              {c.returnDashboard}
            </Link>
            <Link to="/universe" className={buttonClassName('secondary', 'md')}>
              {c.openUniverse}
            </Link>
          </>
        }
      />
    </div>
  );
}
