import React, { useState, useEffect, useRef } from 'react';
import { Search, LogOut, Send, Paperclip, CreditCard, Tag, Bot, Plus, X, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { mockTags } from '../lib/mockData';
import { Message, Tag as TagType, Conversation } from '../types';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#FF4444' });
  const [availableTags, setAvailableTags] = useState<TagType[]>(mockTags);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { signOut, user } = useAuthStore((state) => ({
    signOut: state.signOut,
    user: state.user
  }));
  const navigate = useNavigate();

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar conversaciones y etiquetas al inicio
  useEffect(() => {
    loadConversations();
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setIsLoadingTags(true);
      const tags = await api.getTags();
      setAvailableTags(tags);
    } catch (error) {
      toast.error('Error loading tags');
    } finally {
      setIsLoadingTags(false);
    }
  };


  // const handleSelectConversation = async (conversation: Conversation) => {
  //   if (!conversation?._id) {
  //     console.error('Invalid conversation selected:', conversation);
  //     return;
  //   }
  //   setSelectedConversation(conversation);
  //   try {
  //     setIsLoadingMessages(true);
  //     const fetchedMessages = await api.getMessages(conversation._id);
  //     setMessages(fetchedMessages);
  //   } catch (error) {
  //     console.error('Error loading messages:', error);
  //     toast.error('Error loading messages');
  //   } finally {
  //     setIsLoadingMessages(false);
  //   }
  // };

  const loadMessages = async (conversationId: string) => {
    try {
      const fetchedMessages = await api.getMessages(conversationId);
      setMessages(fetchedMessages);
    } catch (error) {
      toast.error('Error cargando mensajes');
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      // Marcar la conversación como leída en el backend
      if (conversation.unread_count > 0) {
        let id = conversation._id || conversation.id;
        await api.markConversationAsRead(id);
      }

      // Actualizar el estado local
      setConversations(prev => prev.map(conv =>
        (conv._id || conv.id) === (conversation.id || conversation._id)
          ? { ...conv, unread_count: 0 }
          : conv
      ));

      conversation._id = conversation._id || conversation.id;
      setSelectedConversation(conversation);

      await loadMessages(conversation._id || conversation.id);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };


  useWebSocket({
    onNewMessage: (message) => {
      if (selectedConversation?.customer_id === message.sender_id) {
        setMessages(prev => {
          return [...prev, message]
        });
      }

      setConversations(prev => prev.map(conv => {
        if (conv._id === message.conversation_id) {
          return {
            ...conv,
            last_message: message.content,
            last_message_at: message.created_at,
            unread_count: selectedConversation?.id === message.conversation_id
              ? conv.unread_count
              : (conv.unread_count + 1)
          };
        }
        return conv;
      }));
    },
    onConversationUpdate: (updatedConversation) => {
      setConversations(prev => {
        // Buscar si la conversación ya existe
        const index = prev.findIndex(c => c._id === (updatedConversation._id || updatedConversation.id));
        if (index !== -1) {
          // Si existe, actualizar la conversación existente
          const newConversations = [...prev];
          newConversations[index] = {
            ...newConversations[index],
            ...updatedConversation
          };
          return newConversations;
        }

        // Si no existe, agregar al principio
        return [updatedConversation, ...prev];
      });

      // Actualizar la conversación seleccionada si corresponde
      if (selectedConversation?._id === updatedConversation._id) {
        setSelectedConversation(updatedConversation);
      }
    }
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error('Error saliendo');
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const fetchedConversations = await api.getConversations();
      setConversations(fetchedConversations);

      // Solo seleccionar la primera conversación si no hay una seleccionada
      if (fetchedConversations.length > 0 && !selectedConversation) {
        await handleSelectConversation(fetchedConversations[0]);
      }
    } catch (error) {
      toast.error('Error cargando conversaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = conversations.filter(
    conv => conv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const message = await api.sendMessage(selectedConversation._id, newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage('');

      const updatedConversation = {
        ...selectedConversation,
        last_message: newMessage,
        last_message_at: new Date().toISOString(),
      };
      setSelectedConversation(updatedConversation);
      setConversations(prev =>
        prev.map(conv =>
          conv._id === selectedConversation._id ? updatedConversation : conv
        )
      );
    } catch (error) {
      toast.error('Error enviando mensajes');
    }
  };

  const toggleAI = async () => {
    if (selectedConversation) {
      try {
        const updatedConversation = await api.toggleAI(selectedConversation._id);
        setSelectedConversation(updatedConversation);
        setConversations(prev =>
          prev.map(conv =>
            conv._id === selectedConversation._id ? updatedConversation : conv
          )
        );
      } catch (error) {
        toast.error('Error toggling AI');
      }
    }
  };

  const addTag = async (tag: TagType) => {
    if (selectedConversation && !selectedConversation.tags.includes(tag.name)) {

      if (selectedConversation.tags.includes(tag.name)) {
        toast.error('La etiqueta ya ha sido agregada.');
        return;
      }

      try {
        await api.addTagToConversation(selectedConversation._id, tag._id);
        const updatedConversation = {
          ...selectedConversation,
          tags: [...selectedConversation.tags, tag._id],
        };
        setSelectedConversation(updatedConversation);
        setConversations(prev =>
          prev.map(conv =>
            conv._id === selectedConversation._id ? updatedConversation : conv
          )
        );
      } catch (error) {
        toast.error('Error adding tag');
      }
    }
  };

  const removeTag = async (tagName: string) => {
    if (selectedConversation) {
      try {
        const tag = availableTags.find(t => t.name === tagName);
        if (tag) {
          await api.removeTagFromConversation(selectedConversation._id, tag._id);
          const updatedConversation = {
            ...selectedConversation,
            tags: selectedConversation.tags.filter(t => t !== tag._id),
          };
          setSelectedConversation(updatedConversation);
          setConversations(prev =>
            prev.map(conv =>
              conv._id === selectedConversation._id ? updatedConversation : conv
            )
          );
        }
      } catch (error) {
        toast.error('Error removing tag');
      }
    }
  };

  const handleEditName = () => {
    if (selectedConversation) {
      setEditedName(selectedConversation.customer_name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!selectedConversation || !editedName.trim()) return;

    try {
      const updatedConversation = await api.updateCustomerName(selectedConversation._id, editedName);

      // Actualizar solo la conversación específica
      setConversations(prev => prev.map(conv =>
        conv._id === updatedConversation._id ? updatedConversation : conv
      ));

      setSelectedConversation(updatedConversation);
      setIsEditingName(false);
      toast.success('Nombre actualizado correctamente');
    } catch (error) {
      toast.error('Error updating customer name');
    }
  };


  const createNewTag = async () => {
    if (!newTag.name.trim()) return;
    try {
      const createdTag = await api.createTag({
        name: newTag.name.trim(),
        color: newTag.color
      });

      setAvailableTags(prev => [...prev, createdTag]);
      setNewTag({ name: '', color: '#FF4444' });
      toast.success('Tag creado con exito');
    } catch (error) {
      toast.error('Error creating tag');
    }
  };


  const isCustomerMessage = (senderId: string) => {
    return senderId === selectedConversation?.customer_id;
  };

  const isCurrentUserMessage = (senderId: string) => {
    return senderId === user?.id;
  };

  return (
    <div className="h-screen flex">
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Mensajes</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/tickets')}
                className="p-2 hover:bg-purple-100 rounded-full text-purple-600"
                title="Ticket Management"
              >
                <Ticket className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/payments')}
                className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                title="Payment Management"
              >
                <CreditCard className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-100 rounded-full text-red-600"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={(conversation._id || conversation.id)}
                onClick={() => handleSelectConversation(conversation)}
                className={clsx(
                  "p-4 hover:bg-gray-50 cursor-pointer",
                  (selectedConversation?.id || selectedConversation?._id) === (conversation._id || conversation.id) && "bg-blue-50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={conversation.profile_picture || 'https://cdn.pixabay.com/photo/2021/07/02/04/48/user-6380868_1280.png'}
                      alt={conversation.customer_name}
                      className="w-12 h-12 rounded-full"
                    />
                    {conversation.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className={clsx(
                        "text-sm font-medium truncate",
                        conversation.unread_count > 0 ? "text-blue-600" : "text-gray-900"
                      )}>
                        {conversation.customer_name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(conversation.last_message_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={clsx(
                      "text-sm truncate",
                      conversation.unread_count > 0 ? "text-blue-600 font-medium" : "text-gray-500"
                    )}>
                      {conversation.last_message}
                    </p>
                    {conversation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conversation.tags.map(tagName => {
                          const tag = availableTags.find(t => t._id === tagName);
                          return tag ? (
                            <span
                              key={tag.name}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: tag.color + '40', color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedConversation.profile_picture || 'https://cdn.pixabay.com/photo/2021/07/02/04/48/user-6380868_1280.png'}
                    alt={selectedConversation.customer_name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    {isEditingName ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="px-2 py-1 border rounded text-lg"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveName();
                            }
                          }}
                        />
                        <button
                          onClick={handleSaveName}
                          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-semibold">
                          {selectedConversation.customer_name}
                        </h2>
                        <button
                          onClick={handleEditName}
                          className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                          title="Edit customer name"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">ID: {selectedConversation.customer_id}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowTagMenu(!showTagMenu)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                    title="Etiquetas"
                  >
                    <Tag className="h-5 w-5 text-gray-600" />
                  </button>
                  <div className="flex items-center space-x-2">
                    <span className={clsx(
                      "text-sm",
                      selectedConversation.ai_enabled
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {selectedConversation.ai_enabled ? 'IA Activada' : 'IA Desactivada'}
                    </span>
                    <button
                      onClick={toggleAI}
                      className={clsx(
                        "p-2 rounded-full",
                        selectedConversation.ai_enabled
                          ? "bg-green-100 text-green-600 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                      title="Toggle AI Assistant"
                    >
                      <Bot className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {showTagMenu && (
                <div className="absolute right-4 mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 z-10">
                  <h3 className="font-semibold mb-2">Etiquetas</h3>
                  <div className="space-y-2 mb-4">
                    {availableTags.map(tag => (
                      <div
                        key={tag._id}
                        className="flex items-center justify-between"
                      >
                        <button
                          onClick={() => addTag(tag)}
                          className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-100 w-full"
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="Nueva etiqueta"
                        value={newTag.name}
                        onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                        className="flex-1 px-2 py-1 border rounded"
                      />
                      <input
                        type="color"
                        value={newTag.color}
                        onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={createNewTag}
                      disabled={!newTag.name.trim() || isLoadingTags}
                      className="flex items-center justify-center space-x-1 w-full px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedConversation.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedConversation.tags.map(tagName => {
                    const tag = availableTags.find(t => t._id === tagName);
                    return tag ? (
                      <span
                        key={tag.name}
                        className="flex items-center space-x-1 px-2 py-1 rounded-full text-sm"
                        style={{ backgroundColor: tag.color + '40', color: tag.color }}
                      >
                        <span>{tag.name}</span>
                        <button
                          onClick={() => removeTag(tag.name)}
                          className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    "flex",
                    isCustomerMessage(message.sender_id) ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[70%] rounded-lg p-3",
                      isCurrentUserMessage(message.sender_id)
                        ? "bg-blue-600 text-white dark:bg-blue-700"
                        : isCustomerMessage(message.sender_id)
                          ? "bg-white text-gray-900 dark:bg-white dark:text-black"
                          : "bg-black text-white dark:bg-black"
                    )}
                  >
                    {!isCurrentUserMessage(message.sender_id) && !isCustomerMessage(message.sender_id) && (
                      <p className="text-xs opacity-75 mb-1">IA</p>
                    )}
                    {message.type === 'text' ? (
                      <p>{message.content}</p>
                    ) : (
                      <img
                        src={message.content}
                        alt="Message attachment"
                        className="rounded-lg max-w-full object-contain max-h-[400px] w-auto"
                      />
                    )}
                    <span className="text-xs opacity-75 mt-1 block">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
              }
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex items-center space-x-4">
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-gray-600"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="p-2 text-blue-600 hover:text-blue-700"
                disabled={!newMessage.trim()}
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div >
  );
}