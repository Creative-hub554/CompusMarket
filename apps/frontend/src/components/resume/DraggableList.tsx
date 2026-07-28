"use client";

import { useState, useRef, useCallback } from "react";

type Props<T> = {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
};

export default function DraggableList<T>({ items, onReorder, renderItem, keyExtractor }: Props<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragNode.current = e.currentTarget as HTMLElement;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    (e.currentTarget as HTMLElement).style.opacity = "0.4";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== index) setOverIndex(index);
  }, [dragIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIndex === null || dragIndex === dropIndex) {
      cleanup();
      return;
    }
    const updated = [...items];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, removed);
    onReorder(updated);
    cleanup();
  }, [dragIndex, items, onReorder]);

  function cleanup() {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  }

  const handleDragEnd = useCallback(() => {
    cleanup();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, index) => {
        const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <div
            key={keyExtractor(item)}
            style={{
              borderTop: isOver ? "2px solid #3b82f6" : "2px solid transparent",
              transition: "border-color 0.15s, transform 0.15s",
              transform: isOver ? "translateY(4px)" : "translateY(0)",
            }}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
}

export function DragHandle({ index, onDragStart }: { index: number; onDragStart: (index: number) => void }) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      ref={handleRef}
      draggable
      onDragStart={(e) => {
        setDragging(true);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        const el = e.currentTarget.closest("[data-draggable-item]") as HTMLElement | null;
        if (el) {
          el.style.opacity = "0.4";
        }
        onDragStart(index);
      }}
      onDragEnd={() => {
        setDragging(false);
        const el = handleRef.current?.closest("[data-draggable-item]") as HTMLElement | null;
        if (el) el.style.opacity = "1";
      }}
      style={{
        cursor: dragging ? "grabbing" : "grab",
        display: "flex",
        alignItems: "center",
        padding: "0 6px",
        color: "#9ca3af",
        userSelect: "none",
        touchAction: "none",
      }}
      title="Drag to reorder"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    </div>
  );
}
