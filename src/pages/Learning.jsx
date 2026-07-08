import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Trash2, BookOpen, GraduationCap, Check, Minus, ChevronDown, ChevronRight, Brain, FlaskConical, Lightbulb, Timer, Shuffle, Clock } from 'lucide-react';
import PullToRefresh from '@/components/PullToRefresh';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleHeader from '@/components/ModuleHeader';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import { formatDate } from '@/lib/format';
import TopicList from '@/components/learning/TopicList';
import FlashcardDeck from '@/components/learning/FlashcardDeck';
import MixModeView from '@/components/learning/MixModeView';
import DeepWorkTimer from '@/components/learning/DeepWorkTimer';
import { useAuth } from '@/lib/AuthContext';

export default function Learning() {
  const [courses, setCourses] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(null);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', platform: '', total_lessons: 0, target_date: '', notes: '' });
  const [newUnit, setNewUnit] = useState({ title: '', target_date: '' });
  const [newBook, setNewBook] = useState({ title: '', author: '', total_pages: 0, target_date: '', takeaways: '' });
  const [mixMode, setMixMode] = useState(false);
  const [deepWorkCourse, setDeepWorkCourse] = useState(null);
  const { user } = useAuth();
  const readingSpeed = parseFloat(user?.reading_speed) || 1.5;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, b] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', user.id),
        supabase.from('books').select('*').eq('user_id', user.id),
      ]);
      console.log('[Learning] Raw courses data:', c.data);
      console.log('[Learning] Raw books data:', b.data);
      // Sanitize courses data to prevent NaN errors
      const sanitizedCourses = (c.data || []).map(course => ({
        ...course,
        total_lessons: Number(course.total_lessons) || 0,
        lessons_completed: Number(course.lessons_completed) || 0,
      }));
      setCourses(sanitizedCourses);
      // Sanitize books data to prevent NaN errors
      const sanitizedBooks = (b.data || []).map(book => ({
        ...book,
        total_pages: Number(book.total_pages) || 0,
        pages_read: Number(book.pages_read) || 0,
      }));
      setBooks(sanitizedBooks);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addUnit = async () => {
    if (!newUnit.title.trim()) return;
    const tempId = 'temp-' + Date.now();
    const tempUnit = { title: newUnit.title, target_date: newUnit.target_date, id: tempId, category: 'academic', color: '#7E9D8A', total_lessons: 0, lessons_completed: 0, status: 'active' };
    setCourses(prevCourses => [tempUnit, ...prevCourses]);
    setNewUnit({ title: '', target_date: '' });
    setShowAdd(null);
    try {
      const { data: created, error } = await supabase.from('courses').insert([{
        title: newUnit.title,
        target_date: newUnit.target_date,
        category: 'academic',
        color: '#7E9D8A',
        total_lessons: 0,
        lessons_completed: 0,
        status: 'active',
        user_id: user.id,
      }]).select().single();
      if (error) throw error;
      setCourses(prevCourses => prevCourses.map(c => c.id === tempId ? { ...tempUnit, ...created } : c));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setCourses(prevCourses => prevCourses.filter(c => c.id !== tempId));
    }
  };

  const addCourse = async () => {
    if (!newCourse.title.trim()) return;
    const tempId = 'temp-' + Date.now();
    const tempCourse = { ...newCourse, id: tempId, total_lessons: Number(newCourse.total_lessons) || 0, category: 'personal_development', color: '#7E9D8A', lessons_completed: 0, status: 'active' };
    // Optimistic state update using functional form
    setCourses(prevCourses => [tempCourse, ...prevCourses]);
    setNewCourse({ title: '', platform: '', total_lessons: 0, target_date: '', notes: '' });
    setShowAdd(null);
    try {
      const { data: created, error } = await supabase.from('courses').insert([{
        title: newCourse.title,
        platform: newCourse.platform,
        total_lessons: Number(newCourse.total_lessons) || 0,
        target_date: newCourse.target_date,
        notes: newCourse.notes,
        category: 'personal_development',
        color: '#7E9D8A',
        lessons_completed: 0,
        status: 'active',
        user_id: user.id,
      }]).select().single();
      if (error) throw error;
      // Merge created response with temp course to preserve all fields
      setCourses(prevCourses => prevCourses.map(c => c.id === tempId ? { ...tempCourse, ...created } : c));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setCourses(prevCourses => prevCourses.filter(c => c.id !== tempId));
    }
  };

  const addBook = async () => {
    if (!newBook.title.trim()) return;
    const tempId = 'temp-' + Date.now();
    const tempBook = { 
      ...newBook, 
      id: tempId, 
      total_pages: Number(newBook.total_pages) || 0, 
      color: '#7E9D8A', 
      status: 'reading', 
      pages_read: 0 
    };
    // Optimistic state update using functional form
    setBooks(prevBooks => [tempBook, ...prevBooks]);
    setNewBook({ title: '', author: '', total_pages: 0, target_date: '', takeaways: '' });
    setShowAdd(null);
    try {
      const { data: created, error } = await supabase.from('books').insert([{
        title: newBook.title,
        author: newBook.author,
        total_pages: Number(newBook.total_pages) || 0,
        target_date: newBook.target_date,
        takeaways: newBook.takeaways,
        color: '#7E9D8A',
        status: 'reading',
        pages_read: 0,
        user_id: user.id,
      }]).select().single();
      if (error) throw error;
      // Merge created response with temp book to preserve all fields
      setBooks(prevBooks => prevBooks.map(b => b.id === tempId ? { ...tempBook, ...created } : b));
    } catch (err) {
      toast.error('Something went wrong, please try again');
      setBooks(prevBooks => prevBooks.filter(b => b.id !== tempId));
    }
  };

  const updateCourse = async (id, field, value) => {
    // Optimistic state update using functional form to prevent race conditions
    setCourses(prevCourses => prevCourses.map(c => c.id === id ? { ...c, [field]: value } : c));
    try {
      const { error } = await supabase.from('courses').update({ [field]: value }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    } catch (err) {
      // Revert on error - we need to refetch to get the correct state
      toast.error('Something went wrong, please try again');
      loadData();
    }
  };

  const updateBook = async (id, field, value) => {
    // Optimistic state update using functional form to prevent race conditions
    setBooks(prevBooks => prevBooks.map(b => b.id === id ? { ...b, [field]: value } : b));
    try {
      const { error } = await supabase.from('books').update({ [field]: value }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    } catch (err) {
      // Revert on error - we need to refetch to get the correct state
      toast.error('Something went wrong, please try again');
      loadData();
    }
  };

  const deleteCourse = async (id) => {
    const { error } = await supabase.from('courses').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    setCourses(courses.filter(c => c.id !== id));
  };

  const deleteBook = async (id) => {
    const { error } = await supabase.from('books').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    setBooks(books.filter(b => b.id !== id));
  };

  const formatReadingTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} min to finish`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m to finish` : `${h}h to finish`;
  };

  if (loading) {
    return (
      <div className="px-5 pt-12 pb-8">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse bg-neutral-800/60 rounded mb-2"></div>
            <div className="h-8 w-48 animate-pulse bg-neutral-800/60 rounded"></div>
          </div>
          <div className="h-9 w-20 animate-pulse bg-neutral-800/60 rounded"></div>
        </div>

        {/* Tabs Skeleton */}
        <div className="grid w-full grid-cols-4 bg-white/5 mb-4 h-10 animate-pulse bg-neutral-800/60 rounded"></div>

        {/* Academic Units Skeleton */}
        <div className="space-y-3 mb-6">
          <div className="glass rounded-2xl p-4 animate-pulse bg-neutral-800/60">
            <div className="flex items-start gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-neutral-700/50"></div>
              <div className="flex-1">
                <div className="h-4 w-40 bg-neutral-700/50 rounded mb-2"></div>
                <div className="h-3 w-24 bg-neutral-700/50 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-neutral-700/50 rounded"></div>
            </div>
            <div className="h-7 w-24 bg-neutral-700/50 rounded mt-2"></div>
          </div>
          <div className="glass rounded-2xl p-4 animate-pulse bg-neutral-800/60">
            <div className="flex items-start gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-neutral-700/50"></div>
              <div className="flex-1">
                <div className="h-4 w-36 bg-neutral-700/50 rounded mb-2"></div>
                <div className="h-3 w-20 bg-neutral-700/50 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-neutral-700/50 rounded"></div>
            </div>
            <div className="h-7 w-24 bg-neutral-700/50 rounded mt-2"></div>
          </div>
        </div>

        {/* Personal Courses Skeleton */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-20 animate-pulse bg-neutral-800/60 rounded"></div>
            <div className="h-7 w-12 animate-pulse bg-neutral-800/60 rounded"></div>
          </div>
          <div className="glass rounded-2xl p-4 animate-pulse bg-neutral-800/60">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-700/50"></div>
              <div className="flex-1">
                <div className="h-4 w-48 bg-neutral-700/50 rounded mb-2"></div>
                <div className="h-3 w-32 bg-neutral-700/50 rounded mb-1"></div>
                <div className="h-3 w-24 bg-neutral-700/50 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-neutral-700/50 rounded"></div>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-3 w-16 bg-neutral-700/50 rounded"></div>
              <div className="h-3 w-8 bg-neutral-700/50 rounded"></div>
            </div>
            <div className="h-1 w-full bg-neutral-700/50 rounded"></div>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-7 w-7 bg-neutral-700/50 rounded"></div>
              <div className="h-7 w-16 bg-neutral-700/50 rounded"></div>
              <div className="h-7 w-7 bg-neutral-700/50 rounded"></div>
            </div>
          </div>
        </div>

        {/* Books Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-20 animate-pulse bg-neutral-800/60 rounded"></div>
          </div>
          <div className="glass rounded-2xl p-4 animate-pulse bg-neutral-800/60">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-700/50"></div>
              <div className="flex-1">
                <div className="h-4 w-40 bg-neutral-700/50 rounded mb-2"></div>
                <div className="h-3 w-24 bg-neutral-700/50 rounded mb-1"></div>
                <div className="h-3 w-20 bg-neutral-700/50 rounded"></div>
              </div>
              <div className="w-8 h-8 bg-neutral-700/50 rounded"></div>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="h-3 w-16 bg-neutral-700/50 rounded"></div>
              <div className="h-3 w-8 bg-neutral-700/50 rounded"></div>
            </div>
            <div className="h-1 w-full bg-neutral-700/50 rounded"></div>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-7 w-7 bg-neutral-700/50 rounded"></div>
              <div className="h-7 w-16 bg-neutral-700/50 rounded"></div>
              <div className="h-7 w-12 bg-neutral-700/50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const academicCourses = courses.filter(c => c.category === 'academic');
  const personalCourses = courses.filter(c => c.category !== 'academic');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
    <PullToRefresh onRefresh={loadData}>
    <div className="px-5 pt-12 pb-8">
      <ModuleHeader
        title="Learning"
        subtitle="Grow every day"
        accentColor="#7E9D8A"
        onAdd={() => setShowAdd(showAdd === 'unit' ? null : 'unit')}
        addLabel="Unit"
      />

      <Tabs defaultValue="academic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/5 mb-4 h-10">
          <TabsTrigger value="academic" className="text-sm"><FlaskConical className="w-3 h-3 mr-1" /> Academic</TabsTrigger>
          <TabsTrigger value="personal" className="text-sm"><Lightbulb className="w-3 h-3 mr-1" /> Personal</TabsTrigger>
          <TabsTrigger value="flashcards" className="text-sm"><Brain className="w-3 h-3 mr-1" /> Cards</TabsTrigger>
          <TabsTrigger value="books" className="text-sm"><BookOpen className="w-3 h-3 mr-1" /> Books</TabsTrigger>
        </TabsList>

        {/* Academic Units */}
        <TabsContent value="academic" className="space-y-3">
          {mixMode ? (
            <MixModeView courses={academicCourses} onExit={() => setMixMode(false)} />
          ) : (
            <>
              {academicCourses.length > 0 && (
                <Button onClick={() => setMixMode(true)} variant="outline" className="w-full glass border-white/10 text-sage h-9 mb-3">
                  <Shuffle className="w-4 h-4 mr-2" /> Mix Mode — Interleaved Study
                </Button>
              )}
              {showAdd === 'unit' && (
                <div className="glass-strong rounded-2xl p-4 space-y-2">
                  <Input placeholder="Unit name (e.g. Pharmacology I)" value={newUnit.title} onChange={e => setNewUnit({ ...newUnit, title: e.target.value })} className="bg-white/5 border-white/10" />
                  <Input type="date" value={newUnit.target_date} onChange={e => setNewUnit({ ...newUnit, target_date: e.target.value })} className="bg-white/5 border-white/10" />
                  <Button onClick={addUnit} className="w-full bg-sage hover:bg-sage/90 text-white">Add Unit</Button>
                </div>
              )}

              {academicCourses.length === 0 ? (
                <EmptyState title="No academic units" subtitle="Add your pharmacy units to track topics, subtopics, and progress." action={<Button onClick={() => setShowAdd('unit')} className="bg-sage hover:bg-sage/90"><Plus className="w-4 h-4 mr-1" /> Add Unit</Button>} />
              ) : (
                <>
                  {academicCourses.filter(c => c.status === 'active').length > 0 && (
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Units</p>
                  )}
                  {academicCourses.filter(c => c?.status === 'active').map(course => (
                    <div key={course?.id ?? ''} className="glass rounded-2xl p-4">
                      <div className="flex items-start gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-sage/15 flex items-center justify-center flex-shrink-0">
                          <FlaskConical className="w-5 h-5 text-sage" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base">{course?.title ?? 'Untitled Unit'}</h3>
                          {course?.target_date && <p className="text-sm text-muted-foreground">Target: {formatDate(course.target_date)}</p>}
                        </div>
                        <button onClick={() => setExpandedUnit(expandedUnit === course?.id ? null : course?.id)} className="text-muted-foreground hover:text-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={expandedUnit === course?.id ? "Collapse" : "Expand"}>
                          {expandedUnit === course?.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteCourse(course?.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setDeepWorkCourse(course)} className="glass border-white/10 h-7 text-xs text-copper">
                          <Timer className="w-3 h-3" /> Start Deep Work
                        </Button>
                      </div>
                      {expandedUnit === course?.id && <TopicList courseId={course?.id} courseTitle={course?.title ?? 'Untitled Unit'} />}
                    </div>
                  ))}

                  {academicCourses.filter(c => c.status === 'completed').length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Completed</p>
                      {academicCourses.filter(c => c?.status === 'completed').map(course => (
                        <div key={course?.id ?? ''} className="glass rounded-2xl p-3 flex items-center gap-3 opacity-60">
                          <Check className="w-5 h-5 text-sage" />
                          <span className="text-base flex-1 line-through">{course?.title ?? 'Untitled Unit'}</span>
                          <button onClick={() => deleteCourse(course?.id)} className="!text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Personal Development */}
        <TabsContent value="personal" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-muted-foreground uppercase">Courses</h3>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(showAdd === 'course' ? null : 'course')} className="text-sage text-sm"><Plus className="w-3 h-3" /> Add</Button>
          </div>
          {showAdd === 'course' && (
            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Course title" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} className="bg-white/5 border-white/10" />
              <Input placeholder="Platform (e.g. Coursera, Udemy)" value={newCourse.platform} onChange={e => setNewCourse({ ...newCourse, platform: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="number" placeholder="Total lessons" value={newCourse.total_lessons} onChange={e => setNewCourse({ ...newCourse, total_lessons: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="date" value={newCourse.target_date} onChange={e => setNewCourse({ ...newCourse, target_date: e.target.value })} className="bg-white/5 border-white/10" />
              <Button onClick={addCourse} className="w-full bg-sage hover:bg-sage/90 text-white">Add Course</Button>
            </div>
          )}

          {personalCourses.length === 0 ? (
            <EmptyState title="No courses" subtitle="Track your personal development courses — data science, design, coding, and more." action={<Button onClick={() => setShowAdd('course')} className="bg-sage hover:bg-sage/90"><Plus className="w-4 h-4 mr-1" /> Add Course</Button>} />
          ) : (
            <>
              {personalCourses.filter(c => c.status === 'active').length > 0 && (
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</p>
              )}
              {personalCourses.filter(c => c?.status === 'active').map(course => {
                const currentVal = Number(course?.lessons_completed) || 0;
                const totalLimit = Number(course?.total_lessons) || 0;
                const progressPercentage = totalLimit > 0 ? Math.min(100, Math.round((currentVal / totalLimit) * 100)) : 0;
                console.log('[Learning] Course progress:', course?.title, 'currentVal:', currentVal, 'totalLimit:', totalLimit, 'progressPercentage:', progressPercentage);
                return (
                  <div key={course?.id ?? ''} className="glass rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sage/15 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-5 h-5 text-sage" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{course?.title ?? 'Untitled Course'}</h3>
                        {course?.platform && <p className="text-sm text-muted-foreground">{course.platform}</p>}
                        {course?.target_date && <p className="text-sm text-muted-foreground">Target: {formatDate(course.target_date)}</p>}
                      </div>
                      <button onClick={() => deleteCourse(course?.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{currentVal}/{totalLimit} lessons</span>
                      <span className="text-sm font-semibold text-sage">{progressPercentage}%</span>
                    </div>
                    <ProgressBar value={currentVal} max={totalLimit} color="#7E9D8A" height={6} />
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => {
                        const currentLessons = Number(course?.lessons_completed) || 0;
                        updateCourse(course?.id, 'lessons_completed', Math.max(0, currentLessons - 1));
                      }} className="glass border-white/10 h-7 w-7 p-0"><Minus className="w-3 h-3" /></Button>
                      <Input
                        type="number"
                        value={course?.lessons_completed ?? 0}
                        onChange={e => updateCourse(course?.id, 'lessons_completed', Number(e.target.value))}
                        className="bg-white/5 border-white/10 h-7 text-center text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => {
                        const currentLessons = Number(course?.lessons_completed) || 0;
                        const totalLessons = Number(course?.total_lessons) || 0;
                        const newVal = currentLessons + 1;
                        updateCourse(course?.id, 'lessons_completed', newVal);
                        if (totalLessons > 0 && newVal >= totalLessons) {
                          updateCourse(course?.id, 'status', 'completed');
                        }
                      }} className="glass border-white/10 h-7 w-7 p-0"><Plus className="w-3 h-3" /></Button>
                      {totalLimit > 0 && currentVal >= totalLimit && (
                        <Button size="sm" onClick={() => updateCourse(course?.id, 'status', 'completed')} className="bg-sage hover:bg-sage/90 text-background h-7 ml-auto">Complete</Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {personalCourses.filter(c => c.status === 'completed').length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Completed</p>
                  {personalCourses.filter(c => c?.status === 'completed').map(course => (
                    <div key={course?.id ?? ''} className="glass rounded-2xl p-3 flex items-center gap-3 opacity-60">
                      <Check className="w-5 h-5 text-sage" />
                      <span className="text-base flex-1 line-through">{course?.title ?? 'Untitled Course'}</span>
                      <button onClick={() => deleteCourse(course?.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Flashcards */}
        <TabsContent value="flashcards" className="space-y-3">
          <FlashcardDeck courses={courses} />
        </TabsContent>

        {/* Books */}
        <TabsContent value="books" className="space-y-3">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(showAdd === 'book' ? null : 'book')} className="text-sage text-sm"><Plus className="w-3 h-3" /> Add Book</Button>
          </div>
          {showAdd === 'book' && (
            <div className="glass-strong rounded-2xl p-4 space-y-2">
              <Input placeholder="Book title" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="bg-white/5 border-white/10" />
              <Input placeholder="Author" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="number" placeholder="Total pages" value={newBook.total_pages} onChange={e => setNewBook({ ...newBook, total_pages: e.target.value })} className="bg-white/5 border-white/10" />
              <Input type="date" value={newBook.target_date} onChange={e => setNewBook({ ...newBook, target_date: e.target.value })} className="bg-white/5 border-white/10" />
              <Button onClick={addBook} className="w-full bg-sage hover:bg-sage/90 text-white">Add Book</Button>
            </div>
          )}

          {books.length === 0 ? (
            <EmptyState title="No books" subtitle="Track your reading — pages, progress, and key takeaways." />
          ) : (
            <>
              {books.filter(b => b.status === 'reading').length > 0 && (
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reading</p>
              )}
              {books.filter(b => b?.status === 'reading').map(book => {
                const currentVal = Number(book?.pages_read) || 0;
                const totalLimit = Number(book?.total_pages) || 0;
                const progressPercentage = totalLimit > 0 ? Math.min(100, Math.round((currentVal / totalLimit) * 100)) : 0;
                const remaining = totalLimit - currentVal;
                console.log('[Learning] Book progress:', book?.title, 'currentVal:', currentVal, 'totalLimit:', totalLimit, 'progressPercentage:', progressPercentage);
                return (
                  <div key={book?.id ?? ''} className="glass rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sage/15 flex items-center justify-center flex-shrink-0 text-lg">📖</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{book?.title ?? 'Untitled Book'}</h3>
                        {book?.author && <p className="text-sm text-muted-foreground">{book.author}</p>}
                        {book?.target_date && <p className="text-sm text-muted-foreground">Target: {formatDate(book.target_date)}</p>}
                      </div>
                      <button onClick={() => deleteBook(book?.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{currentVal}/{totalLimit} pages</span>
                      <span className="text-sm font-semibold text-sage">{progressPercentage}%</span>
                    </div>
                    <ProgressBar value={currentVal} max={totalLimit} color="#7E9D8A" height={6} />
                    {totalLimit > 0 && remaining > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Est. {formatReadingTime(remaining * readingSpeed)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => {
                        const currentPages = Number(book?.pages_read) || 0;
                        updateBook(book?.id, 'pages_read', Math.max(0, currentPages - 10));
                      }} className="glass border-white/10 h-7 w-7 p-0"><Minus className="w-3 h-3" /></Button>
                      <Input
                        type="number"
                        value={book?.pages_read ?? 0}
                        onChange={e => updateBook(book?.id, 'pages_read', Number(e.target.value))}
                        className="bg-white/5 border-white/10 h-7 text-center text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => {
                        const currentPages = Number(book?.pages_read) || 0;
                        const totalPages = Number(book?.total_pages) || 0;
                        const newVal = currentPages + 10;
                        updateBook(book?.id, 'pages_read', newVal);
                        if (totalPages > 0 && newVal >= totalPages) {
                          updateBook(book?.id, 'status', 'completed');
                        }
                      }} className="glass border-white/10 h-7 w-7 p-0">+10</Button>
                    </div>
                  </div>
                );
              })}

              {books.filter(b => b.status === 'completed').length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Finished</p>
                  {books.filter(b => b?.status === 'completed').map(book => (
                    <div key={book?.id ?? ''} className="glass rounded-2xl p-3 flex items-center gap-3 opacity-60">
                      <Check className="w-5 h-5 text-sage" />
                      <span className="text-base flex-1 line-through">{book?.title ?? 'Untitled Book'}</span>
                      <button onClick={() => deleteBook(book?.id)} className="text-muted-foreground hover:text-rose-400 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {deepWorkCourse && (
        <DeepWorkTimer
          courseId={deepWorkCourse?.id ?? ''}
          courseTitle={deepWorkCourse?.title ?? 'Untitled Course'}
          onClose={() => setDeepWorkCourse(null)}
        />
      )}
    </div>
    </PullToRefresh>
    </motion.div>
  );
}