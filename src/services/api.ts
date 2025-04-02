import { User, Conversation, Message, Payment, Tag, MetaConfig, Ticket } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

class APIService {
  private static instance: APIService;
  private token: string | null = null;
  private socket: WebSocket | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; 

  private constructor() { }

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  setToken(token: string) {
    this.token = token;
  }

  getWebSocketStatus(): { connected: boolean; attempts: number } {
    return {
      connected: this.socket?.readyState === WebSocket.OPEN,
      attempts: this.reconnectAttempts
    };
  }

  private resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  connectWebSocket() {
    if (!this.token) {
      console.warn('WebSocket: No token available for connection');
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket: Connection already exists, skipping');
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      console.warn('WebSocket: Connection already in progress, skipping');
      return;
    }

    console.log('WebSocket: Initiating new connection');

    const wsUrl = `${import.meta.env.VITE_WS_URL}/socket?token=${this.token}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket: Connection established successfully');
      this.resetReconnectAttempts();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle pong response
        if (data.type === 'pong') {
          return;
        }

        this.messageHandlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('WebSocket: Error parsing message', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket: Connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      this.stopHeartbeat();

      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
        this.reconnectAttempts++;
        console.log(`WebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => this.connectWebSocket(), 5000);
      } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        console.error('WebSocket: Max reconnection attempts reached');
        toast.error('Connection lost. Please refresh the page.');
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket: Error occurred', error);
    };
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.stopHeartbeat();
      console.log('WebSocket: Closing connection...');
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
      this.resetReconnectAttempts();
    }
  }

  onMessage(handler: (message: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code?.startsWith('AUTH_')) {
          useAuthStore.getState().signOut();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    await this.fetchWithAuth('/auth/logout', { method: 'POST' });
    this.token = null;
    this.disconnectWebSocket();
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.fetchWithAuth('/users');
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return this.fetchWithAuth('/messages/conversations');
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}`);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async sendImage(conversationId: string, imageUrl: string): Promise<Message> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}/messages/image`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }

  async toggleAI(conversationId: string): Promise<Conversation> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}/ai-toggle`, {
      method: 'PUT',
    });
  }

  async markConversationAsRead(conversationId: string): Promise<Conversation> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}/read`, {
      method: 'PUT'
    });
  }

  async updateCustomerName(conversationId: string, customerName: string): Promise<Conversation> {
    return this.fetchWithAuth(`/messages/conversations/${conversationId}/customer-name`, {
      method: 'PUT',
      body: JSON.stringify({ customer_name: customerName }),
    });
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return this.fetchWithAuth('/tags');
  }

  async createTag(tagData: Partial<Tag>): Promise<Tag> {
    return this.fetchWithAuth('/tags', {
      method: 'POST',
      body: JSON.stringify(tagData),
    });
  }

  async addTagToConversation(conversationId: string, tagId: string): Promise<void> {
    return this.fetchWithAuth(`/tags/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    });
  }

  async removeTagFromConversation(conversationId: string, tagId: string): Promise<void> {
    return this.fetchWithAuth(`/tags/conversations/${conversationId}/${tagId}`, {
      method: 'DELETE',
    });
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return this.fetchWithAuth('/payments');
  }

  async approvePayment(paymentId: string): Promise<Payment> {
    return this.fetchWithAuth(`/payments/${paymentId}/approve`, {
      method: 'PUT',
    });
  }

  async rejectPayment(paymentId: string): Promise<Payment> {
    return this.fetchWithAuth(`/payments/${paymentId}/reject`, {
      method: 'PUT',
    });
  }

  // Meta Configuration
  async getMetaConfig(): Promise<MetaConfig> {
    return this.fetchWithAuth('/meta/config');
  }

  async updateMetaConfig(config: Partial<MetaConfig>): Promise<MetaConfig> {
    return this.fetchWithAuth('/meta/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    return this.fetchWithAuth('/tickets');
  }

  async createTicket(ticketData: Partial<Ticket>): Promise<Ticket> {
    return this.fetchWithAuth('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  }

  async completeTicket(ticketId: string): Promise<Ticket> {
    return this.fetchWithAuth(`/tickets/${ticketId}/complete`, {
      method: 'PUT',
    });
  }

  async cancelTicket(ticketId: string): Promise<Ticket> {
    return this.fetchWithAuth(`/tickets/${ticketId}/cancel`, {
      method: 'PUT',
    });
  }
}

export const api = APIService.getInstance();
