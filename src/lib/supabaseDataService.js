import { supabase } from '@/lib/supabaseClient';
import { getCurrentUserId } from '@/lib/auth-storage';

const ENTITY_NAMES = [
  'Habit',
  'HabitLog',
  'Goal',
  'Milestone',
  'Course',
  'Topic',
  'Book',
  'Flashcard',
  'Account',
  'Transaction',
  'Holding',
  'SavingsGoal',
  'CalendarEvent',
  'Alarm',
  'WeeklyReview',
];

// Convert camelCase to snake_case for database columns
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case to camelCase for JavaScript
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Transform object keys from camelCase to snake_case
function toSnakeCaseObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCaseObject);
  
  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[toSnakeCase(key)] = toSnakeCaseObject(obj[key]);
    }
  }
  return result;
}

// Transform object keys from snake_case to camelCase
function toCamelCaseObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCaseObject);
  
  const result = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[toCamelCase(key)] = toCamelCaseObject(obj[key]);
    }
  }
  return result;
}

function requireUserId() {
  const userId = getCurrentUserId();
  if (!userId) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }
  return userId;
}

function parseSort(sortArg) {
  if (!sortArg || typeof sortArg !== 'string') return null;
  const desc = sortArg.startsWith('-');
  return { field: toSnakeCase(desc ? sortArg.slice(1) : sortArg), desc };
}

function createEntityApi(tableName) {
  const snakeTableName = toSnakeCase(tableName);
  
  return {
    async list(sortArg, limit) {
      const userId = requireUserId();
      let query = supabase
        .from(snakeTableName)
        .select('*')
        .eq('user_id', userId);
      
      const sort = parseSort(sortArg);
      if (sort) {
        query = query.order(sort.field, { ascending: !sort.desc });
      }
      
      if (typeof limit === 'number') {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.map(toCamelCaseObject);
    },

    async filter(filters, sortArg, limit) {
      const userId = requireUserId();
      let query = supabase
        .from(snakeTableName)
        .select('*')
        .eq('user_id', userId);
      
      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(toSnakeCase(key), value);
      }
      
      const sort = parseSort(sortArg);
      if (sort) {
        query = query.order(sort.field, { ascending: !sort.desc });
      }
      
      if (typeof limit === 'number') {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.map(toCamelCaseObject);
    },

    async create(data) {
      const userId = requireUserId();
      const snakeData = toSnakeCaseObject({
        ...data,
        userId,
      });
      
      console.log(`[Supabase] Creating ${snakeTableName} with data:`, snakeData);
      
      const { data: result, error } = await supabase
        .from(snakeTableName)
        .insert(snakeData)
        .select()
        .single();
      
      if (error) {
        console.error(`[Supabase] Error creating ${snakeTableName}:`, error);
        throw error;
      }
      
      console.log(`[Supabase] Successfully created ${snakeTableName}:`, result);
      return toCamelCaseObject(result);
    },

    async bulkCreate(items) {
      const userId = requireUserId();
      const snakeItems = items.map(item => toSnakeCaseObject({
        ...item,
        userId,
      }));
      
      const { data, error } = await supabase
        .from(snakeTableName)
        .insert(snakeItems)
        .select();
      
      if (error) throw error;
      return data.map(toCamelCaseObject);
    },

    async update(id, patch) {
      const userId = requireUserId();
      const snakePatch = toSnakeCaseObject(patch);
      
      const { data: result, error } = await supabase
        .from(snakeTableName)
        .update(snakePatch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return toCamelCaseObject(result);
    },

    async delete(id) {
      const userId = requireUserId();
      const { error } = await supabase
        .from(snakeTableName)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    },

    async deleteMany(filters = {}) {
      const userId = requireUserId();
      let query = supabase
        .from(snakeTableName)
        .delete()
        .eq('user_id', userId);
      
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(toSnakeCase(key), value);
      }
      
      const { error } = await query;
      if (error) throw error;
    },

    // Subscribe to real-time changes
    subscribe(callback) {
      const userId = requireUserId();
      
      console.log(`[Realtime] Setting up subscription for ${snakeTableName} for user ${userId}`);
      
      const subscription = supabase
        .channel(`${snakeTableName}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: snakeTableName,
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log(`[Realtime] Received event for ${snakeTableName}:`, payload);
            callback({
              eventType: payload.eventType,
              old: payload.old ? toCamelCaseObject(payload.old) : null,
              new: payload.new ? toCamelCaseObject(payload.new) : null,
            });
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Subscription status for ${snakeTableName}:`, status);
        });
      
      return () => {
        console.log(`[Realtime] Cleaning up subscription for ${snakeTableName}`);
        supabase.removeChannel(subscription);
      };
    },
  };
}

export function createSupabaseEntityStore() {
  const entities = {};
  for (const name of ENTITY_NAMES) {
    entities[name] = createEntityApi(name);
  }

  return new Proxy(entities, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop];
      target[prop] = createEntityApi(prop);
      return target[prop];
    },
  });
}

// Helper to subscribe to multiple entities
export function createMultiEntitySubscription(entityNames, callback) {
  const unsubscribers = [];
  
  entityNames.forEach(entityName => {
    const api = createEntityApi(entityName);
    const unsubscribe = api.subscribe(callback);
    unsubscribers.push(unsubscribe);
  });
  
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
}
