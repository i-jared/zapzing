import React, { ReactNode } from 'react';

// Use the same regex as LinkListModal
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

interface MessageTextProps {
  text: string;
}

const MessageText: React.FC<MessageTextProps> = ({ text }) => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const url = match[0];
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    // Add the link
    parts.push(
      <a
        key={match.index}
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {url}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};

export default MessageText; 