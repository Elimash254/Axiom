import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';
import { todayStr } from '@/lib/format';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    // Get user from localStorage or auth context
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
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
  };

  const loadFinanceData = async () => {
    try {
      setFinanceLoading(true);
      const [a, t, h, sg] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
        supabase.from('holdings').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id)
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
  };

  const loadHabitsData = async () => {
    try {
      setHabitsLoading(true);
      const [h, hl] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500)
      ]);
      setHabits(h.data || []);
      setHabitLogs(hl.data || []);
      setTodayLogs((hl.data || []).filter((l) => l.date === todayStr()));
    } catch (error) {
      console.error('Error loading habits data:', error);
    } finally {
      setHabitsLoading(false);
    }
  };

  const loadLearningData = async () => {
    try {
      setLearningLoading(true);
      const [c, b] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', user.id),
        supabase.from('books').select('*').eq('user_id', user.id),
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
  };

  const loadCalendarData = async () => {
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
  };

  const loadGoalsData = async () => {
    try {
      setGoalsLoading(true);
      const g = await base44.entities.Goal.list();
      setGoals(g);
    } catch (error) {
      console.error('Error loading goals data:', error);
    } finally {
      setGoalsLoading(false);
    }
  };

  // Refresh functions for individual data sections
  const refreshFinance = () => loadFinanceData();
  const refreshHabits = () => loadHabitsData();
  const refreshLearning = () => loadLearningData();
  const refreshCalendar = () => loadCalendarData();
  const refreshGoals = () => loadGoalsData();

  const value = {
    user,
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
