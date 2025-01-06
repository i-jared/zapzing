import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { FaPaperPlane } from 'react-icons/fa';

const MainPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('general');

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/auth';
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      console.log(`Sending message to ${selectedChannel}: ${message}`);
      setMessage('');
    }
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
          <div className="alert alert-info">
            <span>No messages yet in #{selectedChannel}</span>
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-base-300 p-4 w-full">
          <form onSubmit={handleSendMessage} className="join w-full">
            <input
              type="text"
              placeholder={`Message #${selectedChannel}`}
              className="input input-bordered join-item flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" className="btn btn-primary join-item">
              <FaPaperPlane />
            </button>
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
