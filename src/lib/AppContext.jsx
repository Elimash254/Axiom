import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Global state for all app data
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [habits, setHabits] = useState([]);
  const [financialData, setFinancialData] = useState({
    cash: [],
    holdings: [],
    savings: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Unified fetch function for all data
  const fetchAllData = async () => {
    if (!user || !isAuthenticated) return;
    
    setIsLoading(true);
    setDataError(null);
    
    try {
      const [
        profileResult,
        booksResult,
        topicsResult,
        habitsResult,
        cashResult,
        holdingsResult,
        savingsResult
      ] = await Promise.all([
        // Fetch profile (assuming profiles table exists)
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        // Fetch books
        supabase.from('books').select('*').eq('user_id', user.id),
        // Fetch topics
        supabase.from('topics').select('*').eq('user_id', user.id),
        // Fetch habits
        supabase.from('habits').select('*').eq('user_id', user.id),
        // Fetch financial data
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('holdings').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id)
      ]);

      // Set profile data
      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      // Set books data
      if (booksResult.data) {
        setBooks(booksResult.data);
      }

      // Set topics data
      if (topicsResult.data) {
        setTopics(topicsResult.data);
      }

      // Set habits data
      if (habitsResult.data) {
        setHabits(habitsResult.data);
      }

      // Set financial data
      setFinancialData({
        cash: cashResult.data || [],
        holdings: holdingsResult.data || [],
        savings: savingsResult.data || []
      });

    } catch (error) {
      console.error('Error fetching app data:', error);
      setDataError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh functions for specific data categories
  const refreshFinance = async () => {
    if (!user) return;
    
    try {
      const [cashResult, holdingsResult, savingsResult] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('holdings').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id)
      ]);

      setFinancialData({
        cash: cashResult.data || [],
        holdings: holdingsResult.data || [],
        savings: savingsResult.data || []
      });
    } catch (error) {
      console.error('Error refreshing finance data:', error);
    }
  };

  const refreshLearning = async () => {
    if (!user) return;
    
    try {
      const [booksResult, topicsResult] = await Promise.all([
        supabase.from('books').select('*').eq('user_id', user.id),
        supabase.from('topics').select('*').eq('user_id', user.id)
      ]);

      setBooks(booksResult.data || []);
      setTopics(topicsResult.data || []);
    } catch (error) {
      console.error('Error refreshing learning data:', error);
    }
  };

  const refreshHabits = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase.from('habits').select('*').eq('user_id', user.id);
      setHabits(data || []);
    } catch (error) {
      console.error('Error refreshing habits data:', error);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      setProfile(data);
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    }
  };

  // Fetch all data when user authenticates
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchAllData();
    } else {
      // Clear data when user logs out
      setProfile(null);
      setBooks([]);
      setTopics([]);
      setHabits([]);
      setFinancialData({
        cash: [],
        holdings: [],
        savings: []
      });
    }
  }, [user, isAuthenticated]);

  return (
    <AppContext.Provider
      value={{
        // Global state
        user,
        profile,
        books,
        topics,
        habits,
        financialData,
        isLoading,
        dataError,
        
        // Global functions
        fetchAllData,
        refreshFinance,
        refreshLearning,
        refreshHabits,
        refreshProfile,
        
        // Individual setters for granular updates
        setProfile,
        setBooks,
        setTopics,
        setHabits,
        setFinancialData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
