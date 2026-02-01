import { useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PageBlock, DeviceType } from '@/types/pageBuilder';
import { BlockRenderer } from './BlockRenderer';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CanvasEditorProps {
  blocks: PageBlock[];
  selectedBlockId: string | null;
  deviceType: DeviceType;
  isPreview: boolean;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<PageBlock>) => void;
  onDeleteBlock: (id: string) => void;
  onReorderBlocks: (blockIds: string[]) => void;
}

function SortableBlock({
  block,
  isSelected,
  deviceType,
  isPreview,
  onSelect,
  onUpdate,
  onDelete,
}: {
  block: PageBlock;
  isSelected: boolean;
  deviceType: DeviceType;
  isPreview: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PageBlock>) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        position: 'relative',
        border: isSelected ? '2px solid #1976d2' : '2px dashed transparent',
        borderRadius: 1,
        '&:hover': {
          border: isSelected ? '2px solid #1976d2' : '2px dashed #1976d2',
        },
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {!isPreview && (
        <Box
          {...attributes}
          {...listeners}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10,
            width: 24,
            height: 24,
            backgroundColor: '#1976d2',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          ⋮⋮
        </Box>
      )}
      <BlockRenderer
        block={block}
        deviceType={deviceType}
        isPreview={isPreview}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </Box>
  );
}

export function CanvasEditor({
  blocks,
  selectedBlockId,
  deviceType,
  isPreview,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
}: CanvasEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      onReorderBlocks(newBlocks.map((b) => b.id));
    }
  };

  const getCanvasWidth = () => {
    switch (deviceType) {
      case 'desktop':
        return 1920;
      case 'tablet':
        return 768;
      case 'mobile':
        return 375;
      default:
        return 1920;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        backgroundColor: '#f5f5f5',
        backgroundImage: `
          linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
          linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
          linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        display: 'flex',
        justifyContent: 'center',
        p: 4,
      }}
      onClick={() => onSelectBlock(null)}
    >
      <Box
        sx={{
          width: getCanvasWidth(),
          minHeight: '100vh',
          backgroundColor: '#fff',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '50vh',
                  color: 'text.secondary',
                }}
              >
                Перетащите блоки из библиотеки
              </Box>
            ) : (
              blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  deviceType={deviceType}
                  isPreview={isPreview}
                  onSelect={() => onSelectBlock(block.id)}
                  onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                  onDelete={() => onDeleteBlock(block.id)}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </Box>
    </Box>
  );
}
