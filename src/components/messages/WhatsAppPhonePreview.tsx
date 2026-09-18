import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { resolveSpintaxFirst } from "@/lib/spintax";
import { Loader2, Pause, Play } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

function applyInlineFormatting(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~([^~]+)~/g, "<del>$1</del>");
}

/**
 * Replace {{var}} with resolved values or clickable placeholders.
 * Returns HTML string with data attributes for click handling.
 */
function applyVariableHighlights(text: string, variableValues: Record<string, string>): string {
  return text.replace(
    /\{\{([^}]+)\}\}/g,
    (_match, name) => {
      const value = variableValues[name];
      if (value) {
        return `<span data-var-name="${name}" class="preview-var preview-var--filled" style="background:#dcf8c6;color:#075e54;padding:0 3px;border-radius:3px;border-bottom:1.5px solid #25d366;cursor:pointer;display:inline;vertical-align:baseline">${value}</span>`;
      }
      return `<span data-var-name="${name}" class="preview-var preview-var--empty" style="background:#dcf8c6;color:#075e54;padding:0 3px;border-radius:3px;border-bottom:1.5px dashed #25d366;cursor:pointer;display:inline;vertical-align:baseline;opacity:0.8">${name}</span>`;
    }
  );
}

interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

interface WhatsAppPhonePreviewProps {
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  messageType?: string;
  onRefresh?: () => void;
  onPlayAudio?: () => Promise<{ audioBase64: string; duration_ms: number } | null>;
  isLoadingAudio?: boolean;
  variableValues?: Record<string, string>;
  onVariableChange?: (name: string, value: string) => void;
  /** Direct audio URL for playback-only mode (no generation) */
  audioSrc?: string;
  /** Text shown in the phone header (contact name area) */
  headerLabel?: string;
  /** Available fields the user can pick for the header label */
  headerFields?: Array<{ key: string; label: string; value: string }>;
  /** Called when user selects a different header field */
  onHeaderFieldChange?: (key: string) => void;
  /** Template header text (HEADER component) */
  templateHeaderText?: string;
  /** Template header media type (IMAGE, VIDEO, DOCUMENT) */
  templateHeaderMediaType?: string;
  /** Template header media URL */
  templateHeaderMediaUrl?: string;
  /** Template footer text */
  templateFooterText?: string;
  /** Template buttons */
  templateButtons?: TemplateButton[];
}

export default function WhatsAppPhonePreview({ content, mediaUrl, mediaUrls = [], messageType = "text", onRefresh, onPlayAudio, isLoadingAudio, variableValues = {}, onVariableChange, audioSrc, headerLabel, headerFields, onHeaderFieldChange, templateHeaderText, templateHeaderMediaType, templateHeaderMediaUrl, templateFooterText, templateButtons = [] }: WhatsAppPhonePreviewProps) {
  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const cachedAudioBase64 = useRef<string | null>(null);
  const cachedTextHash = useRef<string>('');
  const waveformRef = useRef<HTMLDivElement>(null);
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Compute a simple hash of text+variables to detect changes
  const currentTextHash = useMemo(() => {
    const varsStr = Object.entries(variableValues).sort().map(([k, v]) => `${k}=${v}`).join('|');
    return `${content}::${varsStr}`;
  }, [content, variableValues]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    setAudioCurrentTime(audio.currentTime);
    setAudioProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  }, []);

  // Create or reuse audio element from cached base64
  const ensureAudioElement = useCallback((base64: string, durationMs: number) => {
    // Clean up old audio
    if (audioRef.current) {
      audioRef.current.pause();
      cancelAnimationFrame(animFrameRef.current);
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audioRef.current = audio;
    setAudioDuration(durationMs / 1000);

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      cancelAnimationFrame(animFrameRef.current);
      setAudioState('paused');
      setAudioProgress(100);
      setAudioCurrentTime(audio.duration);
    });

    return audio;
  }, []);

  // Auto-load audio from URL when audioSrc is provided
  useEffect(() => {
    if (!audioSrc) return;
    // Clean up previous
    if (audioRef.current) {
      audioRef.current.pause();
      cancelAnimationFrame(animFrameRef.current);
    }
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });
    audio.addEventListener('ended', () => {
      cancelAnimationFrame(animFrameRef.current);
      setAudioState('paused');
      setAudioProgress(100);
      setAudioCurrentTime(audio.duration);
    });
    setAudioState('paused');
    setAudioProgress(0);
    setAudioCurrentTime(0);
    return () => {
      audio.pause();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioSrc]);

  const handleAudioClick = useCallback(async () => {
    const audio = audioRef.current;

    // If playing → pause
    if (audio && audioState === 'playing') {
      audio.pause();
      cancelAnimationFrame(animFrameRef.current);
      setAudioState('paused');
      return;
    }

    // If paused with existing audio → resume (or replay if at end)
    if (audio && (audioState === 'paused' || audioSrc)) {
      if (audio.currentTime >= audio.duration - 0.1) {
        audio.currentTime = 0;
        setAudioCurrentTime(0);
        setAudioProgress(0);
      }
      await audio.play();
      setAudioState('playing');
      animFrameRef.current = requestAnimationFrame(updateProgress);
      return;
    }

    // Idle — check if we have cached audio and text hasn't changed
    if (cachedAudioBase64.current && cachedTextHash.current === currentTextHash) {
      const newAudio = ensureAudioElement(cachedAudioBase64.current, audioDuration * 1000);
      await newAudio.play();
      setAudioState('playing');
      setAudioProgress(0);
      setAudioCurrentTime(0);
      animFrameRef.current = requestAnimationFrame(updateProgress);
      return;
    }

    // Need to generate new audio
    if (!onPlayAudio) return;
    setAudioState('loading');
    try {
      const result = await onPlayAudio();
      if (!result) { setAudioState('idle'); return; }

      cachedAudioBase64.current = result.audioBase64;
      cachedTextHash.current = currentTextHash;

      const newAudio = ensureAudioElement(result.audioBase64, result.duration_ms);
      await newAudio.play();
      setAudioState('playing');
      setAudioProgress(0);
      setAudioCurrentTime(0);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } catch {
      setAudioState('idle');
    }
  }, [audioState, audioSrc, onPlayAudio, updateProgress, currentTextHash, ensureAudioElement, audioDuration]);

  // Seek on waveform click
  const handleWaveformClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || audioState === 'idle' || audioState === 'loading') return;
    const rect = waveformRef.current?.getBoundingClientRect();
    if (!rect) return;
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = percent * audio.duration;
    setAudioCurrentTime(audio.currentTime);
    setAudioProgress(percent * 100);
  }, [audioState]);

  // Invalidate cached audio when text changes
  useEffect(() => {
    if (cachedTextHash.current && cachedTextHash.current !== currentTextHash) {
      // Text changed — stop current audio and reset to idle
      if (audioRef.current) {
        audioRef.current.pause();
        cancelAnimationFrame(animFrameRef.current);
        audioRef.current = null;
      }
      cachedAudioBase64.current = null;
      cachedTextHash.current = '';
      setAudioState('idle');
      setAudioProgress(0);
      setAudioCurrentTime(0);
      setAudioDuration(0);
    }
  }, [currentTextHash]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  const resolvedContent = useMemo(() => resolveSpintaxFirst(content || ""), [content]);
  const allMediaUrls = useMemo(() => {
    if (mediaUrls.length > 0) return mediaUrls;
    if (mediaUrl) return [mediaUrl];
    return [];
  }, [mediaUrl, mediaUrls]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const cycleImage = useCallback(() => {
    if (allMediaUrls.length <= 1) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % allMediaUrls.length);
      setAnimating(false);
    }, 300);
  }, [allMediaUrls.length]);

  useEffect(() => {
    if (allMediaUrls.length <= 1) return;
    const interval = setInterval(cycleImage, 3000);
    return () => clearInterval(interval);
  }, [allMediaUrls.length, cycleImage]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [allMediaUrls.length]);

  const highlightedBody = useMemo(() => {
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const escaped = escapeHtml(resolvedContent);

    const lines = escaped.split('\n');
    const processedLines: string[] = [];
    let inCodeBlock = false;
    const codeBlockLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === '```') {
        if (inCodeBlock) {
          processedLines.push(
            `<div style="background:#f0f0f0;border-radius:6px;padding:8px 10px;font-family:monospace;font-size:11px;white-space:pre-wrap;margin:4px 0;color:#333">${codeBlockLines.join('\n')}</div>`
          );
          codeBlockLines.length = 0;
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (line.startsWith('&gt; ')) {
        const quoteText = line.slice(5);
        processedLines.push(
          `<div style="border-left:3px solid #25d366;padding:2px 8px;margin:3px 0;color:#555;font-size:12px">${applyVariableHighlights(applyInlineFormatting(quoteText), variableValues)}</div>`
        );
        continue;
      }

      if (/^- /.test(line)) {
        processedLines.push(`<div style="padding-left:12px;margin:1px 0">• ${applyVariableHighlights(applyInlineFormatting(line.slice(2)), variableValues)}</div>`);
        continue;
      }

      const olMatch = line.match(/^(\d+)\.\s(.+)/);
      if (olMatch) {
        processedLines.push(`<div style="padding-left:12px;margin:1px 0">${olMatch[1]}. ${applyVariableHighlights(applyInlineFormatting(olMatch[2]), variableValues)}</div>`);
        continue;
      }

      processedLines.push(applyVariableHighlights(applyInlineFormatting(line), variableValues));
    }

    if (inCodeBlock && codeBlockLines.length > 0) {
      processedLines.push(
        `<div style="background:#f0f0f0;border-radius:6px;padding:8px 10px;font-family:monospace;font-size:11px;white-space:pre-wrap;margin:4px 0;color:#333">${codeBlockLines.join('\n')}</div>`
      );
    }

    return processedLines.join('\n');
  }, [resolvedContent, variableValues]);

  // Click handler for variable chips in the preview
  const [editingVar, setEditingVar] = useState<string | null>(null);
  const [editingVarValue, setEditingVarValue] = useState('');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const varName = target.getAttribute('data-var-name');
    if (varName && onVariableChange) {
      const rect = target.getBoundingClientRect();
      const containerRect = chatAreaRef.current?.getBoundingClientRect();
      if (containerRect) {
        setPopoverPos({
          top: rect.bottom - containerRect.top + 4,
          left: rect.left - containerRect.left,
        });
      }
      setEditingVar(varName);
      setEditingVarValue(variableValues[varName] || '');
    }
  }, [onVariableChange, variableValues]);

  const saveVarEdit = useCallback(() => {
    if (editingVar && onVariableChange) {
      onVariableChange(editingVar, editingVarValue);
    }
    setEditingVar(null);
    setPopoverPos(null);
  }, [editingVar, editingVarValue, onVariableChange]);

  const hasMedia = messageType === "image" || messageType === "link";
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);

  return (
    <div className="sticky top-20">
      <div className="mx-auto w-[300px] rounded-[2rem] border-4 border-foreground/20 bg-[#e5ddd5] p-1 shadow-xl">
        {/* Phone header */}
        <div className="bg-[#075e54] rounded-t-[1.5rem] px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20" />
          <div className="flex-1 min-w-0 relative">
            {headerFields && headerFields.length > 0 && onHeaderFieldChange ? (
              <>
                <button
                  onClick={() => setHeaderDropdownOpen(!headerDropdownOpen)}
                  className="text-white text-sm font-medium truncate max-w-full text-left hover:text-white/90 transition-colors flex items-center gap-1"
                >
                  <span className="truncate">{headerLabel || 'Empresa'}</span>
                  <svg className={`w-3 h-3 shrink-0 transition-transform ${headerDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {headerDropdownOpen && (
                  <div className="absolute top-7 left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] max-w-[220px] animate-scale-in">
                    {headerFields.map(f => (
                      <button
                        key={f.key}
                        onClick={() => { onHeaderFieldChange(f.key); setHeaderDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex flex-col"
                      >
                        <span className="font-medium text-gray-700">{f.label}</span>
                        {f.value && <span className="text-[10px] text-gray-400 truncate">{f.value}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-white text-sm font-medium truncate">{headerLabel || 'Empresa'}</p>
            )}
            <p className="text-white/70 text-[10px]">online</p>
          </div>
        </div>
        {/* Chat area */}
        <div ref={chatAreaRef} className="relative h-[400px] overflow-y-auto p-3 space-y-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMC41IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b0b0b0 transparent' }} onClick={handlePreviewClick}>
          <div className="bg-white rounded-lg rounded-tl-none shadow-sm max-w-[85%] p-2">
            {/* Template header (text or media from meta_template) */}
            {templateHeaderText && !hasMedia && (
              <p className="text-[13px] font-bold text-gray-900 mb-1">{templateHeaderText}</p>
            )}
            {templateHeaderMediaType === 'IMAGE' && (
              <div className="relative bg-gray-100 h-40 rounded-lg mb-2 overflow-hidden">
                {templateHeaderMediaUrl ? (
                  <img src={templateHeaderMediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">📷 Imagem</div>
                )}
              </div>
            )}
            {templateHeaderMediaType === 'VIDEO' && (
              <div className="bg-gray-100 h-40 rounded-lg mb-2 flex items-center justify-center text-xs text-gray-400">
                {templateHeaderMediaUrl ? '▶️' : '🎬 Vídeo'}
              </div>
            )}
            {templateHeaderMediaType === 'DOCUMENT' && (
              <div className="bg-gray-100 h-12 rounded-lg mb-2 flex items-center gap-2 px-3 text-xs text-gray-500">
                📄 Documento.pdf
              </div>
            )}
            {/* Media header (from campaign direct media) */}
            {hasMedia && !templateHeaderMediaType && (
              <div className="relative bg-gray-100 h-40 rounded-lg mb-2 overflow-hidden">
                {allMediaUrls.length > 0 ? (
                  <>
                    <img
                      src={allMediaUrls[currentIndex]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover rounded-lg transition-all duration-300 ease-in-out"
                      style={{
                        opacity: animating ? 0 : 1,
                        transform: animating ? 'scale(1.05)' : 'scale(1)',
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    📷 Imagem
                  </div>
                )}
              </div>
            )}
            {messageType === "audio" && (
              <div className="bg-[#d4f5c9] rounded-lg mb-2 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-10 w-10 rounded-full bg-[#075e54]/20 flex items-center justify-center shrink-0 ${onPlayAudio ? 'cursor-pointer hover:bg-[#075e54]/30 transition-colors' : ''}`}
                    onClick={handleAudioClick}
                  >
                    {audioState === 'loading' || isLoadingAudio ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#075e54]" />
                    ) : audioState === 'playing' ? (
                      <Pause className="w-4 h-4 text-[#075e54]" />
                    ) : (
                      <Play className="w-4 h-4 text-[#075e54] ml-0.5" />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div
                      ref={waveformRef}
                      className={`relative h-[18px] flex items-center ${audioState !== 'idle' && audioState !== 'loading' ? 'cursor-pointer' : ''}`}
                      onClick={handleWaveformClick}
                    >
                      <div className="absolute inset-0 flex items-center gap-[2px]">
                        {Array.from({ length: 28 }).map((_, i) => {
                          const heights = [40, 65, 30, 85, 50, 70, 35, 90, 45, 75, 55, 80, 38, 60, 42, 88, 48, 72, 33, 82, 52, 68, 36, 78, 44, 62, 40, 70];
                          const barPercent = (i / 28) * 100;
                          const isPlayed = barPercent < audioProgress;
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-full transition-all duration-150"
                              style={{
                                height: `${heights[i]}%`,
                                backgroundColor: isPlayed ? '#075e54' : '#b0c4b0',
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-[#6b8a6b]">
                        {audioState === 'playing' || audioState === 'paused' ? formatTime(audioCurrentTime) : '0:00'}
                      </span>
                      <span className="text-[10px] text-[#6b8a6b]">
                        {audioDuration > 0 ? formatTime(audioDuration) : '--:--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Body text — hidden for audio */}
            {messageType !== "audio" && (
              <p
                className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-900"
                dangerouslySetInnerHTML={{
                  __html: highlightedBody || '<span class="text-gray-400">Mensagem aparecerá aqui...</span>',
                }}
              />
            )}
            {/* Template footer */}
            {templateFooterText && (
              <p className="text-[11px] text-gray-400 mt-1">{templateFooterText}</p>
            )}
            <p className="text-[10px] text-gray-400 text-right mt-1">14:32 ✓✓</p>
          </div>

          {/* Template buttons */}
          {templateButtons.length > 0 && (
            <div className="max-w-[85%] space-y-[1px] mt-[2px]">
              {templateButtons.filter(b => !['QUICK_REPLY', 'MARKETING_OPT_OUT'].includes(b.type)).map((btn, i) => (
                <div key={`cta-${i}`} className="bg-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 py-2.5 cursor-default">
                  {btn.type === 'URL' && <svg className="w-3.5 h-3.5" style={{ color: '#007bfc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                  {btn.type === 'PHONE_NUMBER' && <svg className="w-3.5 h-3.5" style={{ color: '#007bfc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                  {btn.type === 'COPY_CODE' && <svg className="w-3.5 h-3.5" style={{ color: '#007bfc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                  <span className="text-[13px] font-medium" style={{ color: '#007bfc' }}>{btn.text || 'Botão'}</span>
                </div>
              ))}
              {templateButtons.filter(b => b.type === 'QUICK_REPLY' || b.type === 'MARKETING_OPT_OUT').length > 0 && (
                <div className="flex gap-[1px]">
                  {templateButtons.filter(b => b.type === 'QUICK_REPLY' || b.type === 'MARKETING_OPT_OUT').map((btn, i) => (
                    <div key={`qr-${i}`} className="flex-1 bg-white rounded-lg shadow-sm flex items-center justify-center py-2 cursor-default">
                      <span className="text-[12px] font-medium" style={{ color: '#007bfc' }}>{btn.text || 'Resposta'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Variable edit popover */}
          {editingVar && popoverPos && (
            <div
              className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 animate-scale-in"
              style={{ top: popoverPos.top, left: popoverPos.left, minWidth: 180 }}
            >
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">{`{{${editingVar}}}`}</p>
              <div className="flex gap-1">
                <Input
                  value={editingVarValue}
                  onChange={e => setEditingVarValue(e.target.value)}
                  placeholder={`Valor de ${editingVar}`}
                  className="h-7 text-xs flex-1"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveVarEdit();
                    if (e.key === 'Escape') { setEditingVar(null); setPopoverPos(null); }
                  }}
                />
                <button
                  onClick={saveVarEdit}
                  className="h-7 px-2 text-xs bg-[#075e54] text-white rounded-md hover:bg-[#064d45] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Bottom bar */}
        <div className="bg-[#f0f0f0] rounded-b-[1.5rem] px-4 py-3 flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full h-8" />
          <div className="h-8 w-8 rounded-full bg-[#075e54]" />
        </div>
      </div>
    </div>
  );
}
