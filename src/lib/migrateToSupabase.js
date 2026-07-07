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

function userDataKey(userId) {
  return `axiom_user_data_${userId}`;
}

function getUserDataStore(userId) {
  try {
    const raw = localStorage.getItem(userDataKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

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

export async function migrateToSupabase() {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User must be authenticated to migrate data');
  }

  console.log('[Migration] Starting migration for user:', userId);
  
  const localStore = getUserDataStore(userId);
  const migrationResults = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const entityName of ENTITY_NAMES) {
    const localData = localStore[entityName] || [];
    if (localData.length === 0) {
      console.log(`[Migration] No data found for ${entityName}`);
      continue;
    }

    const snakeTableName = toSnakeCase(entityName);
    console.log(`[Migration] Migrating ${localData.length} ${entityName} records...`);

    try {
      // Prepare data for Supabase
      const supabaseData = localData.map(item => {
        const snakeItem = toSnakeCaseObject(item);
        // Ensure user_id is set
        snakeItem.user_id = userId;
        // Remove id if it's not a UUID (Supabase will generate new ones)
        if (!snakeItem.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          delete snakeItem.id;
        }
        return snakeItem;
      });

      // Insert data in batches
      const batchSize = 100;
      for (let i = 0; i < supabaseData.length; i += batchSize) {
        const batch = supabaseData.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from(snakeTableName)
          .insert(batch)
          .select();
        
        if (error) {
          console.error(`[Migration] Error inserting batch for ${entityName}:`, error);
          migrationResults.errors.push({
            entity: entityName,
            error: error.message,
            batchIndex: i / batchSize,
          });
          migrationResults.failed += batch.length;
        } else {
          console.log(`[Migration] Successfully migrated batch ${i / batchSize + 1} for ${entityName}`);
          migrationResults.success += batch.length;
        }
      }

      migrationResults.total += localData.length;
    } catch (error) {
      console.error(`[Migration] Failed to migrate ${entityName}:`, error);
      migrationResults.errors.push({
        entity: entityName,
        error: error.message,
      });
      migrationResults.failed += localData.length;
      migrationResults.total += localData.length;
    }
  }

  console.log('[Migration] Migration complete:', migrationResults);
  
  // Ask user if they want to clear local data after successful migration
  if (migrationResults.success > 0 && migrationResults.failed === 0) {
    const confirmClear = confirm(
      `Migration successful!\n\n` +
      `Total records: ${migrationResults.total}\n` +
      `Successful: ${migrationResults.success}\n` +
      `Failed: ${migrationResults.failed}\n\n` +
      `Do you want to clear local localStorage data? (Recommended)`
    );
    
    if (confirmClear) {
      localStorage.removeItem(userDataKey(userId));
      console.log('[Migration] Local data cleared');
    }
  }

  return migrationResults;
}

// Function to check if migration has already been done
export async function checkMigrationStatus() {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    // Check if we have local data first
    const localStore = getUserDataStore(userId);
    const hasLocalData = Object.values(localStore).some(arr => arr && arr.length > 0);
    
    let hasSupabaseData = false;
    
    // Only check Supabase if we have local data to migrate
    if (hasLocalData) {
      try {
        // Check if any data exists in Supabase for this user
        const { count, error } = await supabase
          .from('habits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if (error) {
          // If table doesn't exist yet, treat as no Supabase data
          console.log('[Migration] Supabase tables may not exist yet:', error.message);
          hasSupabaseData = false;
        } else {
          hasSupabaseData = count > 0;
        }
      } catch (err) {
        // If query fails, assume no Supabase data
        console.log('[Migration] Could not check Supabase status:', err.message);
        hasSupabaseData = false;
      }
    }
    
    return {
      hasSupabaseData,
      hasLocalData,
      needsMigration: hasLocalData && !hasSupabaseData,
      canClearLocal: hasLocalData && hasSupabaseData,
    };
  } catch (error) {
    console.error('[Migration] Error checking status:', error);
    return {
      hasSupabaseData: false,
      hasLocalData: false,
      needsMigration: false,
      canClearLocal: false,
    };
  }
}
