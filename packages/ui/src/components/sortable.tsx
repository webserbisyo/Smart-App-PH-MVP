"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import {
  type Announcements,
  closestCenter,
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  type DndContextProps,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  KeyboardSensor,
  MouseSensor,
  type ScreenReaderInstructions,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  type SortableContextProps,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "#lib/utils";
import * as React from "react";
import * as ReactDOM from "react-dom";

const orientationConfig = {
  vertical: {
    modifiers: [restrictToVerticalAxis, restrictToParentElement],
    strategy: verticalListSortingStrategy,
    collisionDetection: closestCenter,
  },
  horizontal: {
    modifiers: [restrictToHorizontalAxis, restrictToParentElement],
    strategy: horizontalListSortingStrategy,
    collisionDetection: closestCenter,
  },
  mixed: {
    modifiers: [restrictToParentElement],
    strategy: undefined,
    collisionDetection: closestCorners,
  },
};

const ROOT_NAME = "Sortable";
const CONTENT_NAME = "SortableContent";
const ITEM_NAME = "SortableItem";
const ITEM_HANDLE_NAME = "SortableItemHandle";
const OVERLAY_NAME = "SortableOverlay";

interface SortableRootContextValue {
  id: string;
  items: UniqueIdentifier[];
  modifiers: NonNullable<DndContextProps["modifiers"]>;
  strategy: SortableContextProps["strategy"];
  activeId: UniqueIdentifier | null;
  setActiveId: (id: UniqueIdentifier | null) => void;
  flatCursor: boolean;
}

const SortableRootContext =
  React.createContext<SortableRootContextValue | null>(null);

function isUniqueIdentifier(value: unknown): value is UniqueIdentifier {
  return typeof value === "string" || typeof value === "number";
}

function getSortableIndex(data: unknown): number | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "sortable" in data &&
    typeof data.sortable === "object" &&
    data.sortable !== null &&
    "index" in data.sortable &&
    typeof data.sortable.index === "number"
  ) {
    return data.sortable.index;
  }
  return undefined;
}

function useSortableContext(consumerName: string) {
  const context = React.useContext(SortableRootContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

interface GetItemValue<T> {
  /**
   * Callback that returns a unique identifier for each sortable item. Required for array of objects.
   * @example getItemValue={(item) => item.id}
   */
  getItemValue: (item: T) => UniqueIdentifier;
}

interface SortableOwnProps<T> {
  value: T[];
  onValueChange?: (items: T[]) => void;
  onMove?: (
    event: DragEndEvent & { activeIndex: number; overIndex: number },
  ) => void;
  strategy?: SortableContextProps["strategy"];
  orientation?: "vertical" | "horizontal" | "mixed";
  flatCursor?: boolean;
}

type SortableProps<T> = DndContextProps &
  (T extends object ? GetItemValue<T> : Partial<GetItemValue<T>>) &
  SortableOwnProps<T>;

/** `SortableProps` with the object/primitive `getItemValue` requirement resolved, so it can be destructured. */
type SortableResolvedProps<T> = Omit<
  DndContextProps,
  "onDragStart" | "onDragEnd" | "onDragCancel"
> & {
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragCancel?: (event: DragEndEvent) => void;
} & Partial<GetItemValue<T>> &
  SortableOwnProps<T>;

function Sortable<T>(props: SortableProps<T>) {
  const resolvedProps: SortableResolvedProps<T> = props;
  const {
    value,
    onValueChange,
    collisionDetection,
    modifiers,
    strategy,
    onMove,
    orientation = "vertical",
    flatCursor = false,
    getItemValue: getItemValueProp,
    accessibility,
    onDragStart: onDragStartProp,
    onDragEnd: onDragEndProp,
    onDragCancel: onDragCancelProp,
    ...sortableProps
  } = resolvedProps;

  const id = React.useId();
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const config = React.useMemo(
    () => orientationConfig[orientation],
    [orientation],
  );

  const getItemValue = React.useCallback(
    (item: T): UniqueIdentifier => {
      if (getItemValueProp) {
        return getItemValueProp(item);
      }
      if (!isUniqueIdentifier(item)) {
        throw new Error(
          "`getItemValue` is required when using array of objects",
        );
      }
      return item;
    },
    [getItemValueProp],
  );

  const items = React.useMemo(() => {
    return value.map((item) => getItemValue(item));
  }, [value, getItemValue]);

  const onDragStart = React.useCallback(
    (event: DragStartEvent) => {
      onDragStartProp?.(event);

      if (event.activatorEvent.defaultPrevented) return;

      setActiveId(event.active.id);
    },
    [onDragStartProp],
  );

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      onDragEndProp?.(event);

      if (event.activatorEvent.defaultPrevented) return;

      const { active, over } = event;
      if (over && active.id !== over.id) {
        const activeIndex = value.findIndex(
          (item) => getItemValue(item) === active.id,
        );
        const overIndex = value.findIndex(
          (item) => getItemValue(item) === over.id,
        );

        if (onMove) {
          onMove({ ...event, activeIndex, overIndex });
        } else {
          onValueChange?.(arrayMove(value, activeIndex, overIndex));
        }
      }
      setActiveId(null);
    },
    [value, onValueChange, onMove, getItemValue, onDragEndProp],
  );

  const onDragCancel = React.useCallback(
    (event: DragEndEvent) => {
      onDragCancelProp?.(event);

      if (event.activatorEvent.defaultPrevented) return;

      setActiveId(null);
    },
    [onDragCancelProp],
  );

  const announcements: Announcements = React.useMemo(
    () => ({
      onDragStart({ active }) {
        const activeValue = active.id.toString();
        return `Grabbed sortable item "${activeValue}". Current position is ${String((getSortableIndex(active.data.current) ?? 0) + 1)} of ${String(value.length)}. Use arrow keys to move, space to drop.`;
      },
      onDragOver({ active, over }) {
        if (over) {
          const overIndex = getSortableIndex(over.data.current) ?? 0;
          const activeIndex = getSortableIndex(active.data.current) ?? 0;
          const moveDirection = overIndex > activeIndex ? "down" : "up";
          const activeValue = active.id.toString();
          return `Sortable item "${activeValue}" moved ${moveDirection} to position ${String(overIndex + 1)} of ${String(value.length)}.`;
        }
        return "Sortable item is no longer over a droppable area. Press escape to cancel.";
      },
      onDragEnd({ active, over }) {
        const activeValue = active.id.toString();
        if (over) {
          const overIndex = getSortableIndex(over.data.current) ?? 0;
          return `Sortable item "${activeValue}" dropped at position ${String(overIndex + 1)} of ${String(value.length)}.`;
        }
        return `Sortable item "${activeValue}" dropped. No changes were made.`;
      },
      onDragCancel({ active }) {
        const activeIndex = getSortableIndex(active.data.current) ?? 0;
        const activeValue = active.id.toString();
        return `Sorting cancelled. Sortable item "${activeValue}" returned to position ${String(activeIndex + 1)} of ${String(value.length)}.`;
      },
      onDragMove({ active, over }) {
        if (over) {
          const overIndex = getSortableIndex(over.data.current) ?? 0;
          const activeIndex = getSortableIndex(active.data.current) ?? 0;
          const moveDirection = overIndex > activeIndex ? "down" : "up";
          const activeValue = active.id.toString();
          return `Sortable item "${activeValue}" is moving ${moveDirection} to position ${String(overIndex + 1)} of ${String(value.length)}.`;
        }
        return "Sortable item is no longer over a droppable area. Press escape to cancel.";
      },
    }),
    [value],
  );

  const screenReaderInstructions: ScreenReaderInstructions = React.useMemo(
    () => ({
      draggable: `
        To pick up a sortable item, press space or enter.
        While dragging, use the ${orientation === "vertical" ? "up and down" : orientation === "horizontal" ? "left and right" : "arrow"} keys to move the item.
        Press space or enter again to drop the item in its new position, or press escape to cancel.
      `,
    }),
    [orientation],
  );

  const contextValue = React.useMemo<SortableRootContextValue>(
    () => ({
      id,
      items,
      modifiers: modifiers ?? config.modifiers,
      strategy: strategy ?? config.strategy,
      activeId,
      setActiveId,
      flatCursor,
    }),
    [
      id,
      items,
      modifiers,
      strategy,
      config.modifiers,
      config.strategy,
      activeId,
      flatCursor,
    ],
  );

  return (
    <SortableRootContext.Provider value={contextValue}>
      <DndContext
        collisionDetection={collisionDetection ?? config.collisionDetection}
        modifiers={modifiers ?? config.modifiers}
        sensors={sensors}
        {...sortableProps}
        id={id}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{
          announcements,
          screenReaderInstructions,
          ...accessibility,
        }}
      />
    </SortableRootContext.Provider>
  );
}

const SortableContentContext = React.createContext<boolean>(false);

interface SortableContentProps
  extends React.ComponentProps<"div">, useRender.ComponentProps<"div"> {
  strategy?: SortableContextProps["strategy"];
  children: React.ReactNode;
  withoutSlot?: boolean;
}

function SortableContent(props: SortableContentProps) {
  const {
    strategy: strategyProp,
    withoutSlot,
    children,
    className,
    render,
    ref,
    ...contentProps
  } = props;

  const context = useSortableContext(CONTENT_NAME);
  const strategy = strategyProp ?? context.strategy;

  const element = useRender({
    defaultTagName: "div",
    ref,
    props: mergeProps<"div">(
      {
        className,
        children,
      },
      contentProps,
    ),
    render,
    state: {
      slot: "sortable-content",
    },
    enabled: !withoutSlot,
  });

  return (
    <SortableContentContext.Provider value={true}>
      <SortableContext items={context.items} {...(strategy ? { strategy } : {})}>
        {withoutSlot ? children : element}
      </SortableContext>
    </SortableContentContext.Provider>
  );
}

interface SortableItemContextValue {
  id: string;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  isDragging?: boolean | undefined;
  disabled?: boolean | undefined;
}

const SortableItemContext =
  React.createContext<SortableItemContextValue | null>(null);

function useSortableItemContext(consumerName: string) {
  const context = React.useContext(SortableItemContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
  }
  return context;
}

interface SortableItemProps
  extends React.ComponentProps<"div">, useRender.ComponentProps<"div"> {
  value: UniqueIdentifier;
  asHandle?: boolean;
  disabled?: boolean;
}

function SortableItem(props: SortableItemProps) {
  const {
    value,
    style,
    asHandle,
    disabled,
    className,
    render,
    ref,
    ...itemProps
  } = props;

  const inSortableContent = React.useContext(SortableContentContext);
  const inSortableOverlay = React.useContext(SortableOverlayContext);

  if (!inSortableContent && !inSortableOverlay) {
    throw new Error(
      `\`${ITEM_NAME}\` must be used within \`${CONTENT_NAME}\` or \`${OVERLAY_NAME}\``,
    );
  }

  if (value === "") {
    throw new Error(`\`${ITEM_NAME}\` value cannot be an empty string`);
  }

  const context = useSortableContext(ITEM_NAME);
  const id = React.useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: value,
    ...(disabled !== undefined ? { disabled } : {}),
  });

  const onNodeRefChange = React.useCallback(
    (node: HTMLElement | null) => {
      if (disabled) return;
      setNodeRef(node);
      if (asHandle) setActivatorNodeRef(node);
    },
    [disabled, asHandle, setNodeRef, setActivatorNodeRef],
  );

  const composedRef = useMergedRefs(ref, onNodeRefChange);

  const composedStyle = React.useMemo<React.CSSProperties>(() => {
    return {
      transform: CSS.Translate.toString(transform),
      transition,
      ...style,
    };
  }, [transform, transition, style]);

  const itemContext = React.useMemo<SortableItemContextValue>(
    () => ({
      id,
      attributes,
      listeners,
      setActivatorNodeRef,
      isDragging,
      disabled,
    }),
    [id, attributes, listeners, setActivatorNodeRef, isDragging, disabled],
  );

  const handleProps =
    asHandle && !disabled ? { ...attributes, ...listeners } : undefined;

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        id,
        ref: composedRef,
        style: composedStyle,
        className: cn(
          "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden",
          {
            "touch-none select-none": asHandle,
            "cursor-default": context.flatCursor,
            "data-dragging:cursor-grabbing": !context.flatCursor,
            "cursor-grab": !isDragging && asHandle && !context.flatCursor,
            "opacity-50": isDragging,
            "pointer-events-none opacity-50": disabled,
          },
          className,
        ),
      },
      itemProps,
      handleProps,
    ),
    render,
    state: {
      slot: "sortable-item",
      ...(disabled && { disabled: "" }),
      ...(isDragging && { dragging: "" }),
    },
  });

  return (
    <SortableItemContext.Provider value={itemContext}>
      {element}
    </SortableItemContext.Provider>
  );
}

interface SortableItemHandleProps
  extends React.ComponentProps<"button">, useRender.ComponentProps<"button"> {}

function SortableItemHandle(props: SortableItemHandleProps) {
  const { disabled, className, render, ref, ...itemHandleProps } = props;

  const context = useSortableContext(ITEM_HANDLE_NAME);
  const itemContext = useSortableItemContext(ITEM_HANDLE_NAME);

  const isDisabled = disabled ?? itemContext.disabled;

  const { setActivatorNodeRef } = itemContext;

  const onActivatorNodeRef = React.useCallback(
    (node: HTMLElement | null) => {
      if (isDisabled) return;
      setActivatorNodeRef(node);
    },
    [isDisabled, setActivatorNodeRef],
  );

  const composedRef = useMergedRefs(ref, onActivatorNodeRef);

  const handleProps = isDisabled
    ? undefined
    : { ...itemContext.attributes, ...itemContext.listeners };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-controls": itemContext.id,
        ref: composedRef,
        disabled: isDisabled,
        className: cn(
          "select-none disabled:pointer-events-none disabled:opacity-50",
          context.flatCursor
            ? "cursor-default"
            : "cursor-grab data-dragging:cursor-grabbing",
          className,
        ),
      },
      itemHandleProps,
      handleProps,
    ),
    render,
    state: {
      slot: "sortable-item-handle",
      ...(isDisabled && { disabled: "" }),
      ...(itemContext.isDragging && { dragging: "" }),
    },
  });
}

const SortableOverlayContext = React.createContext(false);

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

interface SortableOverlayProps extends Omit<
  React.ComponentProps<typeof DragOverlay>,
  "children"
> {
  container?: Element | DocumentFragment | null;
  children?:
    | ((params: { value: UniqueIdentifier }) => React.ReactNode)
    | React.ReactNode;
}

function SortableOverlay(props: SortableOverlayProps) {
  const { container: containerProp, children, ...overlayProps } = props;

  const context = useSortableContext(OVERLAY_NAME);

  const [mounted, setMounted] = React.useState(false);

  useIsoLayoutEffect(() => { setMounted(true); }, []);

  const container =
    containerProp ?? (mounted ? globalThis.document.body : null);

  if (!container) return null;

  return ReactDOM.createPortal(
    <DragOverlay
      dropAnimation={dropAnimation}
      modifiers={context.modifiers}
      className={cn(!context.flatCursor && "cursor-grabbing")}
      {...overlayProps}
    >
      <SortableOverlayContext.Provider value={true}>
        {context.activeId
          ? typeof children === "function"
            ? children({ value: context.activeId })
            : children
          : null}
      </SortableOverlayContext.Provider>
    </DragOverlay>,
    container,
  );
}

export {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
  type SortableProps,
};
