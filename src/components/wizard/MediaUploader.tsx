import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Video } from 'lucide-react';
import { toast } from 'sonner';
import type { HeaderType } from '@/hooks/useTemplateWizard';

interface MediaUploaderProps {
  headerType: HeaderType;
  mediaUrl?: string;
  fileName?: string;
  onUpload: (mediaUrl: string, fileName: string) => void;
  onRemove: () => void;
}

const MEDIA_CONFIG: Record<string, { accept: string; maxSize: number; label: string; extensions: string }> = {
  IMAGE: { accept: 'image/jpeg,image/png', maxSize: 5 * 1024 * 1024, label: 'Imagem', extensions: 'JPG, PNG' },
  VIDEO: { accept: 'video/mp4', maxSize: 16 * 1024 * 1024, label: 'Vídeo', extensions: 'MP4' },
  DOCUMENT: { accept: 'application/pdf', maxSize: 100 * 1024 * 1024, label: 'Documento', extensions: 'PDF' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploader({ headerType, mediaUrl, fileName, onUpload, onRemove }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = MEDIA_CONFIG[headerType];

  const handleFile = useCallback(async (file: File) => {
    if (!config) return;

    const acceptedTypes = config.accept.split(',');
    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Tipo de arquivo inválido. Aceitos: ${config.extensions}`);
      return;
    }

    if (file.size > config.maxSize) {
      toast.error(`Arquivo muito grande. Máximo: ${formatFileSize(config.maxSize)}`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `header_${Date.now()}.${ext}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('template-media')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      setProgress(80);

      const { data: urlData } = supabase.storage
        .from('template-media')
        .getPublicUrl(path);

      setProgress(100);
      onUpload(urlData.publicUrl, file.name);
      toast.success('Upload concluído!');
    } catch (err: any) {
      toast.error(err.message || 'Erro no upload.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [config, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  if (!config) return null;
  if (mediaUrl && !uploading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
        {headerType === 'IMAGE' && (
          <img src={mediaUrl} alt="Header preview" className="w-full h-32 object-cover" />
        )}
        {headerType === 'VIDEO' && (
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {headerType === 'DOCUMENT' && (
          <div className="w-full h-16 flex items-center gap-3 px-4">
            <FileText className="h-6 w-6 text-destructive shrink-0" />
            <span className="text-sm truncate">{fileName || 'Documento.pdf'}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <span className="text-xs text-muted-foreground truncate max-w-[60%]">{fileName}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={onRemove}>
            <X className="h-3.5 w-3.5 mr-1" /> Remover
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30 hover:border-primary/30'
        }`}
      >
        {uploading ? (
          <div className="w-2/3 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">Enviando...</p>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Arraste ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {config.extensions} · Máx {formatFileSize(config.maxSize)}
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
