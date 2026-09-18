import { useTemplateWizard, type CarouselCard } from '@/hooks/useTemplateWizard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Image, Video } from 'lucide-react';

export function StepCarouselCards() {
  const { state, dispatch } = useTemplateWizard();
  const cards = state.carouselCards;

  const updateCards = (newCards: CarouselCard[]) => {
    dispatch({ type: 'SET_CAROUSEL_CARDS', payload: newCards });
  };

  const addCard = () => {
    if (cards.length >= 10) return;
    const mediaType = cards[0]?.mediaType || 'IMAGE';
    updateCards([...cards, { mediaType, body: '', buttons: [] }]);
  };

  const removeCard = (i: number) => {
    if (cards.length <= 2) return;
    updateCards(cards.filter((_, idx) => idx !== i));
  };

  const updateCard = (i: number, updates: Partial<CarouselCard>) => {
    updateCards(cards.map((c, idx) => idx === i ? { ...c, ...updates } : c));
  };

  const setMediaTypeAll = (type: 'IMAGE' | 'VIDEO') => {
    updateCards(cards.map(c => ({ ...c, mediaType: type })));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Cards do Carousel</Label>
          <p className="text-xs text-muted-foreground">{cards.length}/10 cards — mínimo 2</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCard} disabled={cards.length >= 10}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Card
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs">Tipo de mídia (todos os cards):</Label>
        <div className="flex gap-2">
          {(['IMAGE', 'VIDEO'] as const).map(type => (
            <button
              key={type}
              onClick={() => setMediaTypeAll(type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border transition-all ${
                cards[0]?.mediaType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {type === 'IMAGE' ? <Image className="h-3 w-3" /> : <Video className="h-3 w-3" />}
              {type === 'IMAGE' ? 'Imagem' : 'Vídeo'}
            </button>
          ))}
        </div>
      </div>

      {cards.map((card, i) => (
        <div key={i} className="p-3 rounded-lg border border-border bg-card/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Card {i + 1}</span>
            <button
              onClick={() => removeCard(i)}
              disabled={cards.length <= 2}
              className="text-destructive hover:text-destructive/80 disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-center h-20 rounded-md border-2 border-dashed border-border bg-muted/20 text-muted-foreground text-xs">
            {card.mediaType === 'IMAGE' ? 'Imagem' : 'Vídeo'} (upload em breve)
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Texto ({card.body.length}/160)</Label>
            <Textarea
              value={card.body}
              onChange={e => updateCard(i, { body: e.target.value.slice(0, 160) })}
              className="min-h-[60px] text-xs resize-none"
              placeholder="Texto do card..."
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Botões do card (1-2)</Label>
            {card.buttons.map((btn, bi) => (
              <div key={bi} className="flex gap-2">
                <Input
                  value={btn.text}
                  onChange={e => {
                    const newButtons = [...card.buttons];
                    newButtons[bi] = { ...btn, text: e.target.value.slice(0, 25) };
                    updateCard(i, { buttons: newButtons });
                  }}
                  className="h-7 text-xs"
                  placeholder="Texto do botão"
                  maxLength={25}
                />
              </div>
            ))}
            {card.buttons.length < 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => updateCard(i, { buttons: [...card.buttons, { type: 'QUICK_REPLY', text: '' }] })}
              >
                + Botão
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
