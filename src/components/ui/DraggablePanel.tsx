import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ResizableBox, ResizableBoxProps } from 'react-resizable';
import { useSettings } from '../../state/SettingsContext';
import { DEFAULT_PANEL_SIZES } from '../../state/settings';
import { PanelId } from '../../types';

interface DraggablePanelProps {
  panelId: PanelId;
  children: ReactNode;
  className?: string;
}

export function DraggablePanel({ panelId, children, className }: DraggablePanelProps) {
  const { settings, updatePanelPosition, updatePanelSize } = useSettings();
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  const position = useMemo(() => {
    const positions = settings.panelPositions || {};
    const pos = positions[panelId] || { x: 0, y: 0 };
    return pos;
  }, [settings.panelPositions, panelId]);

  const size = useMemo(() => {
    const sizes = settings.panelSizes || {};
    const s = sizes[panelId] || { width: 320, height: 260 };
    return s;
  }, [settings.panelSizes, panelId]);

  const minSize = useMemo(() => {
    const defaults = DEFAULT_PANEL_SIZES[panelId];
    if (defaults) return defaults;
    return { width: size.width, height: size.height };
  }, [panelId, size.width, size.height]);

  const maxSize = useMemo(() => {
    return {
      width: Math.max(minSize.width, viewportSize.width),
      height: Math.max(minSize.height, viewportSize.height),
    };
  }, [minSize.height, minSize.width, viewportSize.height, viewportSize.width]);

  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    updatePanelPosition(panelId, { x: data.x, y: data.y });
  };

  const mergedClassName = ['relative', className].filter(Boolean).join(' ');

  const resizableProps: ResizableBoxProps = {
    width: size.width,
    height: size.height,
    minConstraints: [minSize.width, minSize.height],
    maxConstraints: [maxSize.width, maxSize.height],
    resizeHandles: ['se'],
    onResizeStop: (_e, data) => {
      updatePanelSize(panelId, {
        width: data.size.width,
        height: data.size.height,
      });
    },
    className: mergedClassName,
    handleSize: [12, 12],
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".panel-header, .panel-edge-handle"
      bounds="parent"
      position={position}
      onStop={handleStop}
    >
      <div ref={nodeRef} className="absolute">
        <ResizableBox {...resizableProps}>
          <div className="relative h-full w-full">
            <div className="panel-edge-handle panel-edge-handle-left" />
            <div className="panel-edge-handle panel-edge-handle-right" />
            <div className="panel-edge-handle panel-edge-handle-bottom" />
            {children}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
}
