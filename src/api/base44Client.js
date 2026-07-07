import { authStorage } from '@/lib/auth-storage';
import { createSupabaseEntityStore } from '@/lib/supabaseDataService';

/**
 * Base44 compatibility client using Supabase for data storage.
 * Entity data is stored in Supabase with real-time sync support.
 */
export const base44 = {
  auth: authStorage,
  entities: createSupabaseEntityStore(),
  integrations: {
    Core: {
      async UploadFile({ file }) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file_url: reader.result });
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      },
      async InvokeLLM({ prompt, response_json_schema }) {
        console.warn('[AXIOM mock] InvokeLLM fallback used for:', prompt);
        if (response_json_schema?.properties?.rate) {
          return { rate: 130 };
        }
        if (response_json_schema?.properties?.price) {
          return { price: 0 };
        }
        return {};
      },
    },
  },
};
