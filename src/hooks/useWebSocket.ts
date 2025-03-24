import { useEffect, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Conversation, Message, Payment, Ticket } from '../types';
import { MessageNotification } from '../components/MessageNotification';
import { PaymentNotification } from '../components/PaymentNotification';

interface WebSocketMessageHandlers {
  onNewMessage?: (message: Message) => void;
  onConversationUpdate?: (conversation: Conversation) => void;
  onNewPayment?: (payment: Payment) => void;
  onNewTicket?: (ticket: Ticket) => void;
}

export function useWebSocket({ onNewMessage, onConversationUpdate, onNewPayment, onNewTicket }: WebSocketMessageHandlers = {}) {
  const handleMessage = useCallback((data: any) => {

    if (!data || typeof data !== 'object') {
      console.error('Invalid WebSocket message format:', data);
      return;
    }

    switch (data.type) {
      case 'new_payment':
        if (data.payment) {
          handlePaymentEvent(data.payment);
        } else {
          console.error('Invalid payment data received:', data.payment);
        }
        break;

      case 'new_ticket':
        if (data.ticket && isValidTicket(data.ticket)) {
          handleTicketEvent(data.ticket);
        } else {
          console.error('Invalid ticket data received:', data.ticket);
        }
        break;

      case 'new_customer_message':
        if (data.conversation && data.message &&
          isValidConversation(data.conversation) &&
          isValidMessage(data.message)) {
          handleMessageEvent(data.conversation, data.message);
        } else {
          console.error('Invalid message data received:', data);
        }
        break;

      case 'conversation_update':
        if (data.conversation && isValidConversation(data.conversation) && onConversationUpdate) {
          onConversationUpdate(data.conversation);
        } else {
          console.error('Invalid conversation update data:', data);
        }
        break;

      default:
        console.log('Unhandled WebSocket message type:', data.type);
    }
  }, [onNewMessage, onConversationUpdate, onNewPayment, onNewTicket]);

  // const isValidPayment = (payment: any): payment is Payment => {
  //   return payment &&
  //          typeof payment.customerName === 'string' &&
  //          typeof payment.status === 'string' &&
  //          ['pending', 'approved', 'rejected'].includes(payment.status);
  // };

  const isValidConversation = (conversation: any): conversation is Conversation => {
    return conversation &&
      typeof conversation.id === 'string' &&
      typeof conversation.customer_id === 'string' &&
      typeof conversation.customer_name === 'string';
  };

  const isValidMessage = (message: any): message is Message => {
    return message &&
      typeof message.id === 'string' &&
      typeof message.conversation_id === 'string' &&
      typeof message.content === 'string';
  };

  const isValidTicket = (ticket: any): ticket is Ticket => {
    return ticket &&
      typeof ticket._id === 'string' &&
      typeof ticket.subject === 'string' &&
      typeof ticket.description === 'string' &&
      typeof ticket.status === 'string' &&
      ['open', 'completed', 'cancelled'].includes(ticket.status);
  };

  const handlePaymentEvent = useCallback((payment: Payment) => {
    // Reproducir sonido de notificación
    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);

    // Mostrar notificación toast
    toast.custom((t) =>
      PaymentNotification({
        t,
        payment,
        onView: () => {
          if (onNewPayment) {
            onNewPayment(payment);
          }
          toast.dismiss(t.id);
        }
      })
      , { duration: 5000 });

    // Actualizar el estado incluso si no se hace clic en la notificación
    if (onNewPayment) {
      onNewPayment(payment);
    }
  }, [onNewPayment]);

  const handleTicketEvent = useCallback((ticket: Ticket) => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);

    toast.success(`New ticket created: ${ticket.subject}`, {
      duration: 5000
    });

    if (onNewTicket) {
      onNewTicket(ticket);
    }
  }, [onNewTicket]);


  const handleMessageEvent = useCallback((conversation: Conversation, message: Message) => {
    // Reproducir sonido de notificación
    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);

    // Mostrar notificación toast
    toast.custom((t) =>
      MessageNotification({
        t,
        conversation,
        message,
        onView: () => {
          if (onConversationUpdate) {
            onConversationUpdate(conversation);
          }
          if (onNewMessage) {
            onNewMessage(message);
          }
          toast.dismiss(t.id);
        }
      })
      , { duration: 5000 });

    // Actualizar el estado incluso si no se hace clic en la notificación
    if (onNewMessage) {
      onNewMessage(message);
    }
    if (onConversationUpdate) {
      onConversationUpdate(conversation);
    }
  }, [onNewMessage, onConversationUpdate]);

  useEffect(() => {
    const unsubscribe = api.onMessage(handleMessage);
    return () => unsubscribe();
  }, [handleMessage]);
}