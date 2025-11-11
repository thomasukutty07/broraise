'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ZoomIn, ZoomOut, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  url: string;
  fileName: string;
  isImage: boolean;
  onClose?: () => void;
}

export function FilePreview({ url, fileName, isImage, onClose }: FilePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setZoom(100);
  };

  const handleClose = () => {
    setOpen(false);
    setZoom(100);
    onClose?.();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-muted/50 hover:shadow-md transition-shadow group">
        {isImage ? (
          <div className="relative cursor-pointer" onClick={handleOpen}>
            <img
              src={url}
              alt={fileName}
              className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">Click to download</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="flex-shrink-0"
            >
              <Download className="size-4" />
            </Button>
          </div>
        )}
        <div className="p-2 border-t bg-background">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate block"
            onClick={(e) => {
              if (!isImage) {
                e.preventDefault();
                handleDownload();
              }
            }}
          >
            {fileName}
          </a>
        </div>
      </div>

      {isImage && (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-w-5xl w-full p-0">
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <ImageIcon className="size-5" />
                  {fileName}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleDownload}>
                    <Download className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleClose}>
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="p-4 overflow-auto max-h-[80vh] flex items-center justify-center bg-muted/30">
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-[75vh] object-contain transition-transform"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

