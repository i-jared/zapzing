import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { FaPaperPlane, FaUser } from 'react-icons/fa';

interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: Date;
  channel: string;
}

const MainPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/auth';
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now(),
        text: message.trim(),
        sender: 'You',
        timestamp: new Date(),
        channel: selectedChannel
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const shouldShowHeader = (currentMsg: Message, index: number, messages: Message[]) => {
    if (index === 0) return true;
    const prevMsg = messages[index - 1];
    return prevMsg.sender !== currentMsg.sender;
  };

  return (
    <div className="drawer lg:drawer-open h-screen w-screen">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col bg-base-200 w-full">
        {/* Navbar */}
        <div className="navbar bg-base-300 w-full">
          <div className="flex-none lg:hidden">
            <label htmlFor="main-drawer" className="btn btn-square btn-ghost drawer-button">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">#{selectedChannel}</h1>
          </div>
          <div className="flex-none">
            <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.filter(m => m.channel === selectedChannel).length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center opacity-50">
                <div className="text-lg font-semibold">No messages yet</div>
                <div className="text-sm">Send the first message in #{selectedChannel}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              {messages
                .filter(m => m.channel === selectedChannel)
                .map((msg, index, filteredMessages) => (
                  <div key={msg.id} className="flex pl-4">
                    <div className="w-10 flex-shrink-0">
                      {shouldShowHeader(msg, index, filteredMessages) && (
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <FaUser className="w-6 h-6" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 ml-4">
                      {shouldShowHeader(msg, index, filteredMessages) && (
                        <div className="flex items-baseline mb-1">
                          <span className="font-bold">{msg.sender}</span>
                          <time className="text-xs opacity-50 ml-2">{formatTime(msg.timestamp)}</time>
                        </div>
                      )}
                      <div className="text-base-content">{msg.text}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-base-300 p-4 w-full">
          <form onSubmit={handleSendMessage} className="join w-full">
            <button type="submit" className="btn btn-primary join-item">
              <FaPaperPlane />
            </button>
            <input
              type="text"
              placeholder={`Message #${selectedChannel}`}
              className="input input-bordered join-item flex-1 focus:outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <div className="drawer-side">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <Sidebar onChannelSelect={setSelectedChannel} />
      </div>
    </div>
  );
};

export default MainPage;
