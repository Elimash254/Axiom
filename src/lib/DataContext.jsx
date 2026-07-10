import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';
import { todayStr } from '@/lib/format';
import { useAuth } from '@/lib/AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Finance data
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  
  // Habits data
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  
  // Learning data
  const [courses, setCourses] = useState([]);
  const [books, setBooks] = useState([]);
  const [learningLoading, setLearningLoading] = useState(true);
  
  // Calendar data
  const [events, setEvents] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // Goals data
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        loadFinanceData(),
        loadHabitsData(),
        loadLearningData(),
        loadCalendarData(),
        loadGoalsData()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]); // Only recreate when user ID changes

  useEffect(() => {
    if (authUser && authUser.id) {
      loadAllData();
    } else {
      // Set loading to false if no user
      setLoading(false);
      setFinanceLoading(false);
      setHabitsLoading(false);
      setLearningLoading(false);
      setCalendarLoading(false);
      setGoalsLoading(false);
    }
  }, [authUser?.id, loadAllData]); // Only reload when user ID changes or loadAllData changes

  const loadFinanceData = useCallback(async () => {
    if (!authUser?.id) {
      setFinanceLoading(false);
      return;
    }
    try {
      setFinanceLoading(true);
      const [a, t, h, sg] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', authUser.id),
        supabase.from('transactions').select('*').eq('user_id', authUser.id).order('date', { ascending: false }).limit(100),
        supabase.from('holdings').select('*').eq('user_id', authUser.id),
        supabase.from('savings_goals').select('*').eq('user_id', authUser.id)
      ]);
      
      setAccounts(a.data || []);
      setTransactions(t.data || []);
      
      const sanitizedHoldings = (h.data || []).map(holding => ({
        ...holding,
        quantity: Number(holding.quantity) || 0,
        buy_price: Number(holding.buy_price) || 0,
        current_price: Number(holding.current_price) || Number(holding.buy_price) || 0,
      }));
      setHoldings(sanitizedHoldings);
      
      const sanitizedSavings = (sg.data || []).map(goal => ({
        ...goal,
        target_amount: Number(goal.target_amount) || 0,
        current_amount: Number(goal.current_amount) || 0,
      }));
      setSavingsGoals(sanitizedSavings);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setFinanceLoading(false);
    }
  }, [authUser?.id]);

  const loadHabitsData = useCallback(async () => {
    if (!authUser?.id) {
      setHabitsLoading(false);
      return;
    }
    try {
      setHabitsLoading(true);
      const [h, hl] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', authUser.id).eq('active', true),
        supabase.from('habit_logs').select('*').eq('user_id', authUser.id).order('date', { ascending: false }).limit(500)
      ]);
      setHabits(h.data || []);
      setHabitLogs(hl.data || []);
      setTodayLogs((hl.data || []).filter((l) => l.date === todayStr()));
    } catch (error) {
      console.error('Error loading habits data:', error);
    } finally {
      setHabitsLoading(false);
    }
  }, [authUser?.id]);

  const loadLearningData = useCallback(async () => {
    if (!authUser?.id) {
      setLearningLoading(false);
      return;
    }
    try {
      setLearningLoading(true);
      const [c, b] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', authUser.id),
        supabase.from('books').select('*').eq('user_id', authUser.id),
      ]);
      
      const sanitizedCourses = (c.data || []).map(course => ({
        ...course,
        total_lessons: Number(course.total_lessons) || 0,
        lessons_completed: Number(course.lessons_completed) || 0,
      }));
      setCourses(sanitizedCourses);
      
      const sanitizedBooks = (b.data || []).map(book => ({
        ...book,
        total_pages: Number(book.total_pages) || 0,
        pages_read: Number(book.pages_read) || 0,
      }));
      setBooks(sanitizedBooks);
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLearningLoading(false);
    }
  }, [authUser?.id]);

  const loadCalendarData = useCallback(async () => {
    try {
      setCalendarLoading(true);
      const [e, a, r] = await Promise.all([
        base44.entities.CalendarEvent.list('-date', 200),
        base44.entities.Alarm.list(),
        base44.entities.WeeklyReview.list('-week_starting', 10),
      ]);
      setEvents(e);
      setAlarms(a);
      setReviews(r);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadGoalsData = useCallback(async () => {
    try {
      setGoalsLoading(true);
      const g = await base44.entities.Goal.list();
      setGoals(g);
    } catch (error) {
      console.error('Error loading goals data:', error);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  // Refresh functions for individual data sections
  const refreshFinance = () => loadFinanceData();
  const refreshHabits = () => loadHabitsData();
  const refreshLearning = () => loadLearningData();
  const refreshCalendar = () => loadCalendarData();
  const refreshGoals = () => loadGoalsData();

  const value = {
    user: authUser,
    loading,
    
    // Finance
    accounts,
    transactions,
    holdings,
    savingsGoals,
    financeLoading,
    refreshFinance,
    
    // Habits
    habits,
    habitLogs,
    todayLogs,
    habitsLoading,
    refreshHabits,
    
    // Learning
    courses,
    books,
    learningLoading,
    refreshLearning,
    
    // Calendar
    events,
    alarms,
    reviews,
    calendarLoading,
    refreshCalendar,
    
    // Goals
    goals,
    goalsLoading,
    refreshGoals,
    
    // Setters for optimistic updates
    setAccounts,
    setTransactions,
    setHoldings,
    setSavingsGoals,
    setHabits,
    setHabitLogs,
    setTodayLogs,
    setCourses,
    setBooks,
    setEvents,
    setAlarms,
    setReviews,
    setGoals,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
