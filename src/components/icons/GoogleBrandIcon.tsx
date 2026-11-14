import React from 'react';

export const GoogleBrandIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    {/* Clean Google 4-color clover / multimedia emblem */}
    <circle cx="7" cy="7" r="4" fill="#4285F4" />
    <circle cx="17" cy="7" r="4" fill="#EA4335" />
    <circle cx="17" cy="17" r="4" fill="#34A853" />
    <circle cx="7" cy="17" r="4" fill="#FBBC05" />
  </svg>
);
