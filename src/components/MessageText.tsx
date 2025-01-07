import React, { ReactNode } from 'react';

// Use the same regex as LinkListModal
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
// Add regex for mentions - matches @name or @email
const MENTION_REGEX = /@(\S+?)(?:\s|$)/g;

interface MessageTextProps {
  text: string;
}

const MessageText: React.FC<MessageTextProps> = ({ text }) => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // First, find all URLs and mentions
  const matches: Array<{
    index: number;
    length: number;
    content: string;
    type: 'url' | 'mention';
  }> = [];

  // Find URLs
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      content: match[0],
      type: 'url'
    });
  }

  // Find mentions
  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      content: match[1], // The name/email without the @ symbol
      type: 'mention'
    });
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Process matches in order
  matches.forEach((match) => {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match.type === 'url') {
      const url = match.content;
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
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
    } else { // mention
      parts.push(
        <span
          key={match.index}
          className="text-primary"
        >
          @{match.content}
        </span>
      );
    }

    lastIndex = match.index + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};

export default MessageText; 