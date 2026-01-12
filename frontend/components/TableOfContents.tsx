import React, { useRef, useState } from "react";
import type { Chapter } from "@/app/types";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TableOfContentsProps {
  tocChapters: Chapter[];
  chapters: Chapter[];
  currentChapterIndex: number;
  isTocOpen: boolean;
  onChapterClick: (targetIndex: number) => void;
  currentChapterRef: React.RefObject<HTMLLIElement | null>; // Allow null in the RefObject type
  isManualNavigation?: boolean; // New prop to control scrolling behavior
}

export default function TableOfContents({
  tocChapters,
  chapters,
  currentChapterIndex,
  isTocOpen,
  onChapterClick,
  currentChapterRef,
  isManualNavigation = false, // Add default value for the new prop
}: TableOfContentsProps) {
  const tocRef = useRef<HTMLDivElement>(null);
  // State to track expanded/collapsed chapters
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(),
  );

  // Toggle chapter expansion
  const toggleChapterExpansion = (chapterPath: string, e: React.MouseEvent) => {
    // Prevent triggering chapter navigation
    e.stopPropagation();

    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterPath)) {
        newSet.delete(chapterPath);
      } else {
        newSet.add(chapterPath);
      }
      return newSet;
    });
  };

  // Get all parent chapters of a given chapter
  const getParentChapters = React.useCallback(
    (targetChapter: Chapter | undefined) => {
      if (!targetChapter) return [];

      const parents: Chapter[] = [];

      // Find the corresponding chapter in tocChapters using path
      const currentTocChapter = tocChapters.find(
        (chap) => chap.path === targetChapter.path,
      );
      if (!currentTocChapter) return [];

      let currentLevel = currentTocChapter.level;

      // Find all parent chapters by checking chapters before current one
      for (let i = tocChapters.indexOf(currentTocChapter) - 1; i >= 0; i--) {
        const potentialParent = tocChapters[i];
        if (potentialParent.level < currentLevel) {
          parents.push(potentialParent);
          // Update level to find grandparent
          currentLevel = potentialParent.level;
        }
      }

      return parents;
    },
    [tocChapters],
  );

  // Auto-expand parent chapters when current chapter changes
  React.useEffect(() => {
    const currentChapter = chapters[currentChapterIndex];
    if (currentChapter) {
      const parentChapters = getParentChapters(currentChapter);

      if (parentChapters.length > 0) {
        setExpandedChapters((prev) => {
          const newSet = new Set(prev);
          // Add all parent chapters to the expanded set
          parentChapters.forEach((parent) => {
            newSet.add(parent.path);
          });
          return newSet;
        });
      }
    }
  }, [currentChapterIndex, chapters, tocChapters, getParentChapters]);

  // Check if a chapter should be expanded
  const isChapterExpanded = (chapterPath: string) => {
    return expandedChapters.has(chapterPath);
  };

  // Organize chapters into a nested structure for easier rendering
  const getNestedChapters = () => {
    const nested: { [key: string]: Chapter[] } = {};
    const rootChapters: Chapter[] = [];
    const chapterStack: Chapter[] = [];

    tocChapters.forEach((chapter) => {
      if (chapterStack.length === 0) {
        // This is a root chapter
        rootChapters.push(chapter);
        chapterStack.push(chapter);
      } else {
        // Check the level against the top of the stack
        let parent = chapterStack[chapterStack.length - 1];

        // Pop from stack until we find the parent with lower level
        while (chapterStack.length > 0 && parent.level >= chapter.level) {
          chapterStack.pop();
          parent = chapterStack[chapterStack.length - 1];
        }

        if (chapterStack.length > 0) {
          // Add to parent's children
          if (!nested[parent.path]) {
            nested[parent.path] = [];
          }
          nested[parent.path].push(chapter);
        } else {
          // This is a root chapter
          rootChapters.push(chapter);
        }

        chapterStack.push(chapter);
      }
    });

    return { rootChapters, nested };
  };

  // Check if a chapter has children
  const hasChildren = (chapter: Chapter) => {
    const { nested } = getNestedChapters();
    return nested[chapter.path] && nested[chapter.path].length > 0;
  };

  // Get children of a chapter
  const getChildren = (chapter: Chapter) => {
    const { nested } = getNestedChapters();
    return nested[chapter.path] || [];
  };

  // Auto-scroll to current chapter after it has been expanded
  React.useEffect(() => {
    // Only scroll if the navigation wasn't initiated from the TOC itself
    if (
      isTocOpen &&
      currentChapterRef &&
      currentChapterRef.current &&
      !isManualNavigation
    ) {
      const currentChapterElement = currentChapterRef.current;
      const sidebar = tocRef.current;

      if (sidebar && currentChapterElement) {
        // Wait for the DOM to update with the expanded chapters
        setTimeout(() => {
          // Calculate the position to scroll to - add offset for header
          const offset = 60;
          const elementTop = currentChapterElement.offsetTop;
          const scrollPosition = elementTop - offset;

          // Use smooth scroll behavior
          sidebar.style.scrollBehavior = "smooth";
          // Ensure the scroll position doesn't go negative
          sidebar.scrollTop = Math.max(0, scrollPosition);
          // Reset to auto behavior after scrolling to prevent interference with manual scrolling
          setTimeout(() => {
            sidebar.style.scrollBehavior = "auto";
          }, 1000);
        }, 0); // Use setTimeout to ensure DOM has updated
      }
    }
  }, [
    isTocOpen,
    currentChapterIndex,
    expandedChapters,
    currentChapterRef,
    isManualNavigation,
  ]); // Add isManualNavigation to dependencies

  // Render TOC chapters recursively with nested structure
  const renderTocChapters = () => {
    const { rootChapters } = getNestedChapters();

    const renderChapter = (
      chapter: Chapter,
      depth: number,
    ): React.ReactNode => {
      const isCurrentChapter =
        chapters[currentChapterIndex]?.path === chapter.path;
      const hasKids = hasChildren(chapter);
      const isExpanded = isChapterExpanded(chapter.path);
      const children = getChildren(chapter);

      return (
        <li
          key={chapter.path} // Use unique path as key instead of index
          ref={isCurrentChapter ? currentChapterRef : null}
        >
          <button
            onClick={() => {
              // Find the index of this TOC chapter in the full reading order
              const targetIndex = chapters.findIndex(
                (chap) => chap.path === chapter.path,
              );
              if (targetIndex !== -1) {
                onChapterClick(targetIndex);
              }
            }}
            className={`text-left w-full p-2 my-1 rounded-md cursor-pointer flex items-center ${isCurrentChapter ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {/* Move expansion icon to the left - Using lucide-react icons */}
            {hasKids && (
              <span
                className="mr-2 cursor-pointer shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChapterExpansion(chapter.path, e);
                }}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            )}
            <span className="grow">{chapter.title}</span>
          </button>

          {/* Render children if expanded */}
          {hasKids && isExpanded && (
            <ul className="ml-4 mt-0">
              {children.map((child) => renderChapter(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    };

    return <ul>{rootChapters.map((chapter) => renderChapter(chapter, 0))}</ul>;
  };

  return (
    <div
      ref={tocRef}
      className={`fixed top-0 left-0 w-76 p-4 shadow-2xl h-screen overflow-y-auto pt-20 transform transition-all duration-300 ease-in-out z-20 bg-white ${
        isTocOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
      }`}
    >
      <h2 className="text-xl font-bold mb-4">Chapters</h2>
      <nav>{renderTocChapters()}</nav>
    </div>
  );
}
