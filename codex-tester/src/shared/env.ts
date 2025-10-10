const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  supabaseUrl: getEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};