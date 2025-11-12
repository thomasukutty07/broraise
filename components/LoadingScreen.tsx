'use client';

import { FileText } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClass = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background'
    : 'flex items-center justify-center min-h-[400px]';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Animated Logo/Icon */}
        <div className="relative">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          {/* Inner pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          {/* Main icon container */}
          <div className="relative flex items-center justify-center size-20 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <FileText className="size-10 text-primary-foreground animate-bounce" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {message}
          </h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we load your content
          </p>
        </div>

        {/* Animated Dots */}
        <div className="flex space-x-2">
          <div 
            className="size-2 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '-0.3s' }}
          />
          <div 
            className="size-2 rounded-full bg-primary animate-bounce" 
            style={{ animationDelay: '-0.15s' }}
          />
          <div className="size-2 rounded-full bg-primary animate-bounce" />
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden relative">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              width: '50%',
              animation: 'shimmer 1.5s ease-in-out infinite'
            }}
          />
        </div>
      </div>
    </div>
  );
}

