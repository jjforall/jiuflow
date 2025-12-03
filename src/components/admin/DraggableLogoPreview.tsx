import { useState, useRef, useEffect, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface DraggableLogoPreviewProps {
  productImage: string;
  logoUrl: string;
  logoSize: number;
  logoPositionX: number;
  logoPositionY: number;
  printAreaInfo: {
    areaTop: number;
    areaLeft: number;
    areaWidth: number;
    areaHeight: number;
  };
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (size: number) => void;
}

export function DraggableLogoPreview({
  productImage,
  logoUrl,
  logoSize,
  logoPositionX,
  logoPositionY,
  printAreaInfo,
  onPositionChange,
  onSizeChange,
}: DraggableLogoPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState(logoSize);
  const [initialDistance, setInitialDistance] = useState(0);

  // Calculate logo position and size in pixels relative to print area
  const getLogoStyles = useCallback(() => {
    const logoWidth = (logoSize / 100) * printAreaInfo.areaWidth;
    const left = printAreaInfo.areaLeft + (logoPositionX / 100) * printAreaInfo.areaWidth;
    const top = printAreaInfo.areaTop + (logoPositionY / 100) * printAreaInfo.areaHeight;
    
    return {
      width: `${logoWidth}%`,
      left: `${left}%`,
      top: `${top}%`,
      transform: 'translate(-50%, -50%)',
    };
  }, [logoSize, logoPositionX, logoPositionY, printAreaInfo]);

  // Convert pixel position to percentage within print area
  const pixelToPercent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: logoPositionX, y: logoPositionY };
    
    const rect = containerRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;
    
    // Convert to position within print area (0-100)
    const xInArea = ((relX - printAreaInfo.areaLeft) / printAreaInfo.areaWidth) * 100;
    const yInArea = ((relY - printAreaInfo.areaTop) / printAreaInfo.areaHeight) * 100;
    
    // Clamp to 0-100 range
    return {
      x: Math.max(0, Math.min(100, xInArea)),
      y: Math.max(0, Math.min(100, yInArea)),
    };
  }, [logoPositionX, logoPositionY, printAreaInfo]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const pos = pixelToPercent(e.clientX, e.clientY);
    onPositionChange(Math.round(pos.x / 5) * 5, Math.round(pos.y / 5) * 5);
  }, [isDragging, pixelToPercent, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - drag
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Pinch - resize
      setIsResizing(true);
      setIsDragging(false);
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(distance);
      setInitialSize(logoSize);
    }
  }, [logoSize]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const pos = pixelToPercent(e.touches[0].clientX, e.touches[0].clientY);
      onPositionChange(Math.round(pos.x / 5) * 5, Math.round(pos.y / 5) * 5);
    } else if (isResizing && e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / initialDistance;
      const newSize = Math.max(10, Math.min(100, initialSize * scale));
      onSizeChange(Math.round(newSize / 5) * 5);
    }
  }, [isDragging, isResizing, pixelToPercent, onPositionChange, initialDistance, initialSize, onSizeChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Resize handle handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'grow' | 'shrink') => {
    e.stopPropagation();
    e.preventDefault();
    const delta = direction === 'grow' ? 5 : -5;
    const newSize = Math.max(10, Math.min(100, logoSize + delta));
    onSizeChange(newSize);
  }, [logoSize, onSizeChange]);

  // Add event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[250px] bg-white rounded-lg border overflow-hidden cursor-crosshair"
    >
      {/* Product image */}
      <img
        src={productImage}
        alt="Product"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      
      {/* Print area indicator (subtle) */}
      <div 
        className="absolute border border-dashed border-primary/20 pointer-events-none"
        style={{
          left: `${printAreaInfo.areaLeft}%`,
          top: `${printAreaInfo.areaTop}%`,
          width: `${printAreaInfo.areaWidth}%`,
          height: `${printAreaInfo.areaHeight}%`,
        }}
      />
      
      {/* Draggable logo */}
      {logoUrl && (
        <div
          ref={logoRef}
          className={`absolute cursor-move group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={getLogoStyles()}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <img
            src={logoUrl}
            alt="Logo"
            className={`w-full h-auto drop-shadow-lg pointer-events-none select-none transition-shadow ${
              isDragging ? 'shadow-2xl' : ''
            }`}
            draggable={false}
          />
          
          {/* Resize handles */}
          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="p-1 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/80 transition-colors"
              onMouseDown={(e) => handleResizeStart(e, 'grow')}
              title="拡大"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="p-1 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/80 transition-colors"
              onMouseDown={(e) => handleResizeStart(e, 'shrink')}
              title="縮小"
            >
              <Minimize2 className="h-3 w-3" />
            </button>
          </div>
          
          {/* Selection border */}
          <div className={`absolute inset-0 border-2 border-primary rounded transition-opacity ${
            isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`} />
        </div>
      )}
      
      {/* Instructions overlay */}
      <div className="absolute bottom-2 left-2 right-2 text-center">
        <p className="text-[10px] text-muted-foreground bg-background/80 rounded px-2 py-1 inline-block">
          ドラッグで移動 • ボタンでサイズ変更 • ピンチでリサイズ
        </p>
      </div>
    </div>
  );
}
