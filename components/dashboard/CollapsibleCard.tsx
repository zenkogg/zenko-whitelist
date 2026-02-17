'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

interface CollapsibleCardProps {
  title: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

export function CollapsibleCard({ title, children, defaultCollapsed = false, collapsible = false }: CollapsibleCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // When collapsible becomes false (e.g. resize to desktop), force expand
  useEffect(() => {
    if (!collapsible) setIsCollapsed(false);
  }, [collapsible]);

  const showCollapsed = collapsible && isCollapsed;

  return (
    <>
      <div className={`flex items-center w-full transition-[margin] duration-300 ${showCollapsed ? 'mb-0' : 'mb-4'}`}>
        <div className="flex-1 min-w-0">{title}</div>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 p-1 text-purple-300/50 hover:text-purple-300 transition-transform duration-200 cursor-pointer"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronDownIcon
              className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        )}
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: showCollapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}
