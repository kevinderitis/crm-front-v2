export interface User {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'agent';
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  assigned_to: string | null;
  tags: string[];
  profile_picture?: string;
  ai_enabled?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  mime_type: string;
  type: 'text' | 'image';
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Payment {
  customerName: string;
  amount: number;
  date: string;
  image: string;
  status: 'pending' | 'approved' | 'rejected';
  bonus?: number;
}

export interface PaymentApproval {
  amount: number;
  bonus: number;
}

export interface MetaConfig {
  accessToken: string;
  fanpageId: string;
  webhookUrl: string;
}

export interface Ticket {
  conversation: string;
  id: string;
  subject: string;
  description: string;
  date: string;
  time: string;
  status: 'open' | 'completed' | 'cancelled' | 'edited';
  created_by: string;
  real_amount?: number;
}

export interface TicketCompletion {
  real_amount?: number;
}

export interface SalesReport {
  date: string;
  newUsers: number;
  ticketCount: number;
  netSales: number;
  bonuses: number;
  prizes: number;
  totalSales: number;
}

export interface PrizeReport {
  date: string;
  user: string;
  amount: number;
  collection: number;
  bonus: number;
  status: string;
  operator: string;
}