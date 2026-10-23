import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useWorkspaceStore } from '@/app/workspace-store';
import { toast } from '@/app/toast-store';
import { useCopy } from '@/app/language-store';
import { errorMessage } from '@/lib/utils';

const copy = {
  en: {
    loadSample: 'Load sample project',
    loadedTitle: 'Sample project loaded',
    loadedBody: 'Six concepts, four typed relationships, and a four-question quiz are ready.',
    errorTitle: 'Could not load the sample project',
  },
  id: {
    loadSample: 'Muat proyek sampel',
    loadedTitle: 'Proyek sampel dimuat',
    loadedBody: 'Enam konsep, empat relasi bertipe, dan kuis empat pertanyaan sudah siap.',
    errorTitle: 'Tidak dapat memuat proyek sampel',
  },
};

export function SampleProjectButton({
  onLoaded,
  children,
  variant = 'secondary',
  size = 'md',
}: {
  onLoaded?: () => void;
  children?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const loadSampleProject = useWorkspaceStore((state) => state.loadSampleProject);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const c = useCopy(copy);

  return (
    <Button
      variant={variant}
      size={size}
      loading={loading}
      leftIcon={<Sparkles className="h-4 w-4" />}
      onClick={async () => {
        setLoading(true);
        try {
          await loadSampleProject();
          toast.success(c.loadedTitle, c.loadedBody);
          onLoaded?.();
          navigate('/universe');
        } catch (error) {
          toast.error(c.errorTitle, errorMessage(error));
        } finally {
          setLoading(false);
        }
      }}
    >
      {children ?? c.loadSample}
    </Button>
  );
}
