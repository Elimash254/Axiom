import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Brain, Layers, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function FlashcardDeck({ courses }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [studying, setStudying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '', course_id: '' });

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    try {
      const c = await base44.entities.Flashcard.list();
      setCards(c);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const dueCards = cards.filter(c => !c.next_review || c.next_review <= todayStr());

  const addCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return;
    const created = await base44.entities.Flashcard.create({
      ...newCard,
      ease_factor: 2.5,
      interval: 1,
      next_review: todayStr(),
      review_count: 0,
    });
    setCards([created, ...cards]);
    setNewCard({ front: '', back: '', course_id: '' });
    setShowAdd(false);
  };

  const deleteCard = async (id) => {
    await base44.entities.Flashcard.delete(id);
    setCards(cards.filter(c => c.id !== id));
  };

  const reviewCard = async (quality) => {
    const card = dueCards[currentIdx];
    if (!card) return;

    let ease = card.ease_factor || 2.5;
    let interval = card.interval || 1;
    const count = (card.review_count || 0) + 1;

    if (quality === 0) {
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    } else if (quality === 1) {
      interval = Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(1.3, ease - 0.15);
    } else if (quality === 2) {
      interval = Math.round(interval * ease);
    } else {
      interval = Math.round(interval * ease * 1.3);
      ease = ease + 0.15;
    }

    const next = new Date();
    next.setDate(next.getDate() + Math.max(1, interval));
    const nextReview = next.toISOString().split('T')[0];

    const updated = await base44.entities.Flashcard.update(card.id, {
      ease_factor: ease,
      interval,
      next_review: nextReview,
      review_count: count,
    });

    setCards(cards.map(c => c.id === card.id ? updated : c));
    setFlipped(false);

    if (currentIdx < dueCards.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setStudying(false);
      setCurrentIdx(0);
    }
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading flashcards...</div>;

  if (studying && dueCards.length > 0) {
    const card = dueCards[currentIdx];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { setStudying(false); setFlipped(false); }} className="text-xs text-muted-foreground">← Exit study</button>
          <span className="text-xs text-muted-foreground">{currentIdx + 1} / {dueCards.length}</span>
        </div>
        <div
          onClick={() => setFlipped(!flipped)}
          className="glass-strong rounded-2xl p-8 min-h-[220px] flex items-center justify-center cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-3 right-3 text-xs text-muted-foreground uppercase tracking-wide">
            {flipped ? 'Answer' : 'Question'}
          </div>
          <p className="text-center text-lg font-medium px-4">{flipped ? card.back : card.front}</p>
        </div>
        {flipped ? (
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => reviewCard(0)} className="bg-rose-500 hover:bg-rose-600 text-xs h-9">Again</Button>
            <Button onClick={() => reviewCard(2)} className="bg-sage hover:bg-sage/90 text-xs h-9">Good</Button>
            <Button onClick={() => reviewCard(3)} className="bg-copper hover:bg-copper/90 text-xs h-9">Easy</Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Tap card to reveal answer</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-sage" />
            <span className="text-xs text-muted-foreground uppercase">Due Today</span>
          </div>
          <p className="text-2xl font-bold text-sage">{dueCards.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold">{cards.length}</p>
        </div>
      </div>

      {dueCards.length > 0 && (
        <Button onClick={() => { setStudying(true); setCurrentIdx(0); setFlipped(false); }} className="w-full bg-sage hover:bg-sage/90 text-white">
          <Brain className="w-4 h-4 mr-2" /> Study {dueCards.length} {dueCards.length === 1 ? 'card' : 'cards'}
        </Button>
      )}

      {showAdd ? (
        <div className="glass-strong rounded-2xl p-4 space-y-2">
          <Select value={newCard.course_id || 'none'} onValueChange={(val) => setNewCard({ ...newCard, course_id: val === 'none' ? '' : val })}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="No specific unit" />
            </SelectTrigger>
            <SelectContent className="w-full">
              <SelectItem value="none" className="py-3">No specific unit</SelectItem>
              {courses.map(c => <SelectItem key={c.id} value={c.id} className="py-3">{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Front (question)" value={newCard.front} onChange={e => setNewCard({ ...newCard, front: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
          <Textarea placeholder="Back (answer)" value={newCard.back} onChange={e => setNewCard({ ...newCard, back: e.target.value })} className="bg-white/5 border-white/10 min-h-[60px]" />
          <div className="flex gap-2">
            <Button onClick={addCard} className="flex-1 bg-sage hover:bg-sage/90 text-white">Add Card</Button>
            <Button onClick={() => setShowAdd(false)} variant="ghost" className="glass">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowAdd(true)} variant="ghost" className="text-sage text-xs">
          <Plus className="w-3 h-3" /> Add Flashcard
        </Button>
      )}

      {cards.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No flashcards yet. Create your first card to start studying!</p>
        </div>
      ) : (
        cards.slice(0, 30).map(card => (
          <div key={card.id} className="glass rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card.front}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{card.back}</p>
                {card.next_review && (
                  <p className="text-xs text-muted-foreground mt-1">Next review: {card.next_review}</p>
                )}
              </div>
              <button onClick={() => deleteCard(card.id)} className="text-muted-foreground hover:text-rose-400 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}