import { getCurrentUserId } from '@/lib/auth-storage';
import { supabase } from '@/lib/supabaseClient';

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

function requireUserId() {
  const userId = getCurrentUserId();
  if (!userId) {
    const error = new Error('Not authenticated');
    error.status = 401;
    throw error;
  }
  return userId;
}

function getUserDataStore(userId) {
  try {
    const raw = localStorage.getItem(userDataKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUserDataStore(userId, store) {
  localStorage.setItem(userDataKey(userId), JSON.stringify(store));
}

function getEntityList(userId, entityName) {
  const store = getUserDataStore(userId);
  return store[entityName] ?? [];
}

function setEntityList(userId, entityName, list) {
  const store = getUserDataStore(userId);
  store[entityName] = list;
  saveUserDataStore(userId, store);
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function parseSort(sortArg) {
  if (!sortArg || typeof sortArg !== 'string') return null;
  const desc = sortArg.startsWith('-');
  return { field: desc ? sortArg.slice(1) : sortArg, desc };
}

function applySort(items, sortArg) {
  const sort = parseSort(sortArg);
  if (!sort) return items;
  return [...items].sort((a, b) => {
    const left = a[sort.field];
    const right = b[sort.field];
    if (left === right) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    const cmp = left < right ? -1 : 1;
    return sort.desc ? -cmp : cmp;
  });
}

function matchesFilter(item, filters) {
  return Object.entries(filters).every(([key, value]) => item[key] === value);
}

function createEntityApi(entityName) {
  return {
    async list(sortArg, limit) {
      const userId = requireUserId();
      let items = getEntityList(userId, entityName);
      items = applySort(items, sortArg);
      if (typeof limit === 'number') {
        items = items.slice(0, limit);
      }
      return items;
    },
    async filter(filters, sortArg, limit) {
      const userId = requireUserId();
      let items = getEntityList(userId, entityName).filter((item) => matchesFilter(item, filters));
      items = applySort(items, sortArg);
      if (typeof limit === 'number') {
        items = items.slice(0, limit);
      }
      return items;
    },
    async create(data) {
      const userId = requireUserId();
      const record = {
        id: generateId(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const list = getEntityList(userId, entityName);
      list.push(record);
      setEntityList(userId, entityName, list);
      return record;
    },
    async bulkCreate(items) {
      const created = [];
      for (const data of items) {
        created.push(await this.create(data));
      }
      return created;
    },
    async update(id, patch) {
      const userId = requireUserId();
      const list = getEntityList(userId, entityName);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`${entityName} not found`);
      }
      list[index] = {
        ...list[index],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      setEntityList(userId, entityName, list);
      return list[index];
    },
    async delete(id) {
      const userId = requireUserId();
      const list = getEntityList(userId, entityName);
      setEntityList(
        userId,
        entityName,
        list.filter((item) => item.id !== id),
      );
    },
    async deleteMany(filters = {}) {
      const userId = requireUserId();
      if (Object.keys(filters).length === 0) {
        setEntityList(userId, entityName, []);
        return;
      }
      const list = getEntityList(userId, entityName).filter((item) => !matchesFilter(item, filters));
      setEntityList(userId, entityName, list);
    },
  };
}

export function createEntityStore() {
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

export function clearUserEntityData(userId) {
  if (!userId) return;
  localStorage.removeItem(userDataKey(userId));
}
