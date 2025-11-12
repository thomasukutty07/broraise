'use client';

import LoadingScreen from './LoadingScreen';

type PageLoaderProps = {
  message?: string;
  fullScreen?: boolean;
};

export default function PageLoader({
  message = 'Loading page...',
  fullScreen = true,
}: PageLoaderProps) {
  return <LoadingScreen message={message} fullScreen={fullScreen} />;
}



