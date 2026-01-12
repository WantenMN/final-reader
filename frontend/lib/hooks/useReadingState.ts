import { useCallback, useRef } from "react";
import { API_URL } from "@/lib/constants";
import type { Chapter } from "@/app/types";

export function useReadingState(
  chapters: Chapter[],
  currentChapterIndex: number,
  stateLoaded: boolean,
  bookId: string,
) {
  const scrollRef = useRef<number>(0);

  // Extract updateReadingState as a standalone function using useCallback
  const updateReadingState = useCallback(async () => {
    if (chapters.length === 0 || currentChapterIndex === -1 || !stateLoaded) {
      return;
    }

    const chapter = chapters[currentChapterIndex];

    // Calculate scroll percentage based on window scroll position
    let currentScrollPercentage = 0;
    if (typeof window !== "undefined") {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollableHeight = scrollHeight - clientHeight;

      if (scrollableHeight > 0) {
        currentScrollPercentage = (scrollTop / scrollableHeight) * 100;
        // Update state and ref with current scroll percentage
        scrollRef.current = currentScrollPercentage;
      }
    }

    try {
      await fetch(`${API_URL}/api/book/${bookId}/state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          position: chapter.path,
          scroll_percentage: currentScrollPercentage,
        }),
      });
    } catch (err) {
      console.error("Failed to update reading state:", err);
    }
  }, [chapters, currentChapterIndex, stateLoaded, bookId]);

  return {
    updateReadingState,
    scrollRef,
  };
}
