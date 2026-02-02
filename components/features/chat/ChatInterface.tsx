/**
 * Chat Interface Component
 *
 * LLM-style chat interface with Knowledge Base RAG integration
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSendChatMessageMutation } from '@/store/services/api';
import type { ChatMessage } from '@/types';

const SUGGESTED_PROMPTS = [
  'What funding program should I leverage for xx opportunity?',
  'What questions should I ask for a potential MAP call?',
  'What questions should I ask for a GenAI call?',
  'What are the benefits of our Managed Services program?',
  'What are the benefits of our FinOps program?',
];

export function ChatInterface() {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [sendChatMessage, { isLoading }] = useSendChatMessageMutation();

  // Auto-resize textarea (1 row min, 4 rows max)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate line height (approx 24px per line)
    const lineHeight = 24;
    const minHeight = lineHeight; // 1 row
    const maxHeight = lineHeight * 4; // 4 rows

    // Set new height within bounds
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  // Get first name from user's full name
  const firstName = (user?.name as string)?.split(' ')[0] || 'there';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();

    // Add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Clear input
    setInputValue('');

    try {
      // Send message to API
      const response = await sendChatMessage({
        message: userMessage,
        sessionId,
      }).unwrap();

      // Update session ID for conversation continuity
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
        },
      ]);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card flex flex-col h-full min-h-[500px] pb-4">
      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-y-auto mb-6">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <p
                className="text-[26px] font-semibold mb-2 bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(90.03deg, rgba(227, 68, 26, 0.49) 2.55%, rgba(241, 112, 13, 0.43) 34.13%, rgba(176, 159, 251, 0.98) 82.11%, rgba(0, 137, 221, 0.33) 128.87%)'
                }}
              >
                Hello, {firstName}
              </p>
              <p className="text-neutral-400 text-[26px] font-semibold">
                How can I help you today?
              </p>
            </div>

            {/* Spacer to push suggestions to bottom */}
            <div className="flex-1" />

            {/* Suggested Prompts Grid - Aligned to Bottom */}
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="px-4 py-3 rounded-xl text-left cursor-pointer transition-all bg-white border border-neutral-200 hover:border-indigo-300 hover:shadow-sm"
                >
                  <p className="text-neutral-700 text-[15px] leading-normal">
                    {prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-indigo-50 ml-8'
                    : 'bg-gray-50 mr-8'
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">O</span>
                    </div>
                  )}
                  <p className={`text-gray-900 text-sm ${
                    message.role === 'user' ? 'font-medium' : 'font-normal'
                  } whitespace-pre-wrap flex-1`}>
                    {message.content}
                  </p>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-700 text-sm font-semibold">
                        {firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="p-4 rounded-lg bg-gray-50 mr-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">O</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative flex items-end border border-neutral-200 rounded-lg bg-white">
        <textarea
          ref={textareaRef}
          placeholder="Start asking"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 resize-none border-none focus:ring-0 focus:outline-none disabled:opacity-50 overflow-y-auto py-3 px-4 bg-transparent"
          rows={1}
        />
        <div className="flex-shrink-0 flex gap-2 p-2">
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`px-3 py-2 rounded-md border-none font-medium transition-all flex items-center justify-center ${
              inputValue.trim() && !isLoading
                ? 'bg-violet-900 text-white cursor-pointer hover:bg-violet-950'
                : 'bg-gray-200 text-white cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
