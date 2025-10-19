import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Simple auth helper without full Supabase client
export const auth = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: { session: null }, error: data };
    }

    return {
      data: {
        session: {
          access_token: data.access_token,
          user: data.user,
        },
      },
      error: null,
    };
  },

  async getSession() {
    const accessToken = localStorage.getItem('access_token');
    const userEmail = localStorage.getItem('user_email');

    if (!accessToken) {
      return { data: { session: null }, error: null };
    }

    return {
      data: {
        session: {
          access_token: accessToken,
          user: { email: userEmail },
        },
      },
      error: null,
    };
  },

  async signOut() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    return { error: null };
  },

  saveSession(accessToken: string, email: string) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('user_email', email);
  },
};
