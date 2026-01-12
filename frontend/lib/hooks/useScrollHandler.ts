import { useEffect, useRef } from "react";
import { READING_CONSTANTS } from "@/lib/readingConstants";

export interface ScrollHandlerOptions {
  updateReadingState: () => void;
  scrollRef: React.MutableRefObject<number>;
}

export function useScrollHandler({
  updateReadingState,
  scrollRef,
}: ScrollHandlerOptions) {
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      // Calculate current scroll percentage
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollableHeight = scrollHeight - clientHeight;

      let currentScrollPercentage = 0;
      if (scrollableHeight > 0) {
        currentScrollPercentage = (scrollTop / scrollableHeight) * 100;
        // Update ref with current scroll percentage
        scrollRef.current = currentScrollPercentage;
      }

      // Clear existing timeout if scroll continues
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }

      // Set new timeout to save state after debounce delay
      scrollDebounceRef.current = setTimeout(() => {
        updateReadingState();
      }, READING_CONSTANTS.SCROLL_DEBOUNCE_DELAY);
    };

    // Handle window resize to maintain scroll percentage
    const handleResize = () => {
      // Only restore if we have a valid scroll percentage
      if (scrollRef.current > 0) {
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const scrollableHeight = scrollHeight - clientHeight;

        if (scrollableHeight > 0) {
          const targetScrollTop = (scrollableHeight * scrollRef.current) / 100;
          window.scrollTo({ top: targetScrollTop, behavior: "instant" });
        }
      }
    };

    // Add event listeners
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      // Clean up event listeners and timeout
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, [updateReadingState, scrollRef]);

  return {
    scrollDebounceRef,
  };
}
