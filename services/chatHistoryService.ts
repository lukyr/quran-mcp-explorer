import { supabase } from './supabaseClient';
import { ChatMessage } from '../types';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  tool_calls?: any;
  created_at: string;
}

// Helper to get or create a user ID (prioritizes Auth user, fallbacks to local anonymous)
export const getUserId = async () => {
  console.log('[chatHistory] getUserId called');
  try {
    // 1. Check if Supabase Auth user exists with a timeout
    // Create a promise that rejects after 2 seconds
    const timeoutPromise = new Promise<{ data: { session: null } }>((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), 10000)
    );

    // Race the session fetch against the timeout
    const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
    ]) as { data: { session: any } };

    console.log('[chatHistory] Session retrieved:', session ? 'Found' : 'Null');
    if (session?.user) {
      console.log('[chatHistory] Using Auth User ID');
      return session.user.id;
    }
  } catch (err) {
    console.error('[chatHistory] Error getting session or timeout:', err);
  }

  // 2. Fallback to anonymous local ID
  console.log('[chatHistory] Using Anonymous ID');
  let userId = localStorage.getItem('sahabat_quran_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('sahabat_quran_user_id', userId);
  }
  return userId;
};

// Get the anonymous ID specifically (for merging)
export const getAnonymousId = () => {
    return localStorage.getItem('sahabat_quran_user_id');
};

export const chatHistoryService = {
  async getConversations(): Promise<Conversation[]> {
    console.log('[chatHistory] getConversations start');
    const userId = await getUserId();
    console.log('[chatHistory] Fetching conversations for:', userId);

    // Race the DB query against a timeout
    const dbPromise = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('DB fetch timeout')), 15000)
    );

    try {
        const { data, error } = await Promise.race([
            dbPromise,
            timeoutPromise
        ]) as any;

        console.log('[chatHistory] Fetch result:', { dataLength: data?.length, error });

        if (error) {
          console.error('Error fetching conversations:', error);
          return [];
        }
        return data || [];
    } catch (err) {
        console.error('[chatHistory] DB query timed out:', err);
        return [];
    }
  },

  async createConversation(firstMessage: string): Promise<Conversation | null> {
    const userId = await getUserId();
    const title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title,
        last_message_preview: title,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
    return data;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Convert DB messages to ChatMessage type
    return (data || []).map((msg: DBMessage) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      content: msg.content,
      toolResults: msg.tool_calls ? msg.tool_calls : undefined
    }));
  },

  async saveMessage(conversationId: string, message: ChatMessage) {
    // 1. Insert message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        tool_calls: message.toolResults
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
    }

    // 2. Update conversation last_message_preview and updated_at
    const preview = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
    await supabase
      .from('conversations')
      .update({
        last_message_preview: preview,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  },

  async deleteConversation(conversationId: string) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
    }
  },

  // Merge anonymous history to authenticated user
  async mergeAnonymousHistory(authUserId: string) {
    const anonymousId = getAnonymousId();
    if (!anonymousId) return;

    // Update all conversations belonging to anonymousId to now belong to authUserId
    const { error } = await supabase
        .from('conversations')
        .update({ user_id: authUserId })
        .eq('user_id', anonymousId);

    if (error) {
        console.error('Error merging history:', error);
    } else {
        console.log('Successfully merged history from', anonymousId, 'to', authUserId);
        // Optionally clear anonymous ID to prevent future confusion,
        // OR keep it? Better keep it or just not rely on it if logged in.
        // localStorage.removeItem('sahabat_quran_user_id');
    }
  }
};
