import { ReactNode, useMemo, useRef } from 'react';
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

  const handleStop = (_e: DraggableEvent, data: DraggableData) => {
    updatePanelPosition(panelId, { x: data.x, y: data.y });
  };

  const mergedClassName = ['relative', className].filter(Boolean).join(' ');

  const resizableProps: ResizableBoxProps = {
    width: size.width,
    height: size.height,
    minConstraints: [minSize.width, minSize.height],
    maxConstraints: [1200, 900],
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
      handle=".draggable-handle"
      bounds="parent"
      position={position}
      onStop={handleStop}
    >
      <div ref={nodeRef} className="absolute">
        <ResizableBox {...resizableProps}>
          <div className="relative h-full w-full">
            <button
              type="button"
              className="draggable-handle absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-slate-800/80 border border-slate-600 text-slate-400 hover:text-white flex items-center justify-center cursor-move"
              aria-label="Drag panel"
            >
              ⤧
            </button>
            {children}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
}
