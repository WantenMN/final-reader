import { useState, useRef, useEffect } from "react";
import type { Chapter } from "@/app/types";

export interface NavigationState {
  isManualNavigation: boolean;
  setIsManualNavigation: (value: boolean) => void;
  isTocManualNavigateRef: React.MutableRefObject<boolean>;
}

export interface ChapterNavigationActions {
  goToPreviousChapter: () => void;
  goToNextChapter: () => void;
  setCurrentChapterIndex: (index: number) => void;
}

export function useChapterNavigation(
  chapters: Chapter[],
  initialChapterIndex: number,
): NavigationState &
  ChapterNavigationActions & { currentChapterIndex: number } {
  const [isManualNavigation, setIsManualNavigation] = useState<boolean>(false);
  const [currentChapterIndex, setCurrentChapterIndex] =
    useState<number>(initialChapterIndex);
  const isTocManualNavigateRef = useRef<boolean>(false);

  // Sync with initial chapter index when it changes
  useEffect(() => {
    setCurrentChapterIndex(initialChapterIndex);
  }, [initialChapterIndex]);

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      // When navigating via buttons, we want to scroll the TOC
      setIsManualNavigation(false);
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      // When navigating via buttons, we want to scroll the TOC
      setIsManualNavigation(false);
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  return {
    isManualNavigation,
    setIsManualNavigation,
    isTocManualNavigateRef,
    goToPreviousChapter,
    goToNextChapter,
    setCurrentChapterIndex,
    currentChapterIndex,
  };
}
