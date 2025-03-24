import React from 'react';
import { Conversation, Message } from '../types';

interface MessageNotificationProps {
  t: { visible: boolean; id: string };
  conversation: Conversation;
  message: Message;
  onView: () => void;
}

export function MessageNotification({ t, conversation, message, onView }: MessageNotificationProps) {
  return (
    <div
      className={`${t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <img
              className="h-10 w-10 rounded-full"
              src={conversation.profile_picture || 'https://cdn.pixabay.com/photo/2021/07/02/04/48/user-6380868_1280.png'}
              alt={conversation.customer_name}
            />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {conversation.customer_name}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {message.content}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
      </div>
    </div>
  );
}