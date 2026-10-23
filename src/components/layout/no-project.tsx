import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { useLanguageStore } from '@/app/language-store';
import { buttonClassName } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/states';

export function NoProjectPanel({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const language = useLanguageStore((state) => state.language);
  const indonesian = language === 'id';
  return (
    <EmptyState
      icon={<FolderOpen className="h-5 w-5" />}
      title={title ?? (indonesian ? 'Tidak ada ruang kerja terbuka' : 'No workspace is open')}
      description={
        description ??
        (indonesian
          ? 'Buat atau pilih ruang kerja lokal dari dasbor, lalu kembali ke tampilan ini.'
          : 'Create or select a local workspace from the dashboard, then return to this view.')
      }
      action={
        <Link to="/" className={buttonClassName('primary', 'sm')}>
          {indonesian ? 'Buka dasbor' : 'Open dashboard'}
        </Link>
      }
    />
  );
}
