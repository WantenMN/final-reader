import { useEffect } from "react";
import type { Chapter } from "@/app/types";
import { READING_CONSTANTS } from "@/lib/readingConstants";

export interface ContentEffectsOptions {
  chapterContent: string;
  chapters: Chapter[];
  isFirstLoad: boolean;
  currentChapterIndex: number;
  savedScrollPercentage: number;
  isTocManualNavigateRef: React.MutableRefObject<boolean>;
  setIsManualNavigation: (value: boolean) => void;
  setCurrentChapterIndex: (index: number) => void;
  contentContainerRef: React.RefObject<HTMLDivElement | null>;
  onOpacityChange: (opacity: number) => void;
}

export function useContentEffects({
  chapterContent,
  chapters,
  isFirstLoad,
  currentChapterIndex,
  savedScrollPercentage,
  isTocManualNavigateRef,
  setIsManualNavigation,
  setCurrentChapterIndex,
  contentContainerRef,
  onOpacityChange,
}: ContentEffectsOptions): void {
  useEffect(() => {
    // Scroll to saved position when chapter content changes
    if (typeof window !== "undefined") {
      // Get the saved scroll percentage for this chapter
      const currentChapterPath = chapters[currentChapterIndex]?.path;
      if (currentChapterPath) {
        // Reset opacity to 0 when content changes
        onOpacityChange(0);

        // If it's the initial load and we have a saved scroll percentage, use that
        if (isFirstLoad && savedScrollPercentage > 0) {
          // Aggressive scroll recovery logic
          const scrollToSavedPosition = () => {
            const currentScrollTop = window.scrollY;

            // Only scroll if current position is 0
            if (currentScrollTop === 0) {
              const scrollHeight = document.documentElement.scrollHeight;
              const clientHeight = window.innerHeight;
              const scrollableHeight = scrollHeight - clientHeight;
              const targetScrollTop =
                (scrollableHeight * savedScrollPercentage) / 100;

              // Use immediate scrolling instead of smooth for aggressive recovery
              window.scrollTo({ top: targetScrollTop, behavior: "instant" });

              // Check again after a short delay to ensure scroll worked
              setTimeout(() => {
                const newScrollTop = window.scrollY;
                if (newScrollTop === 0) {
                  // If still 0, try again
                  scrollToSavedPosition();
                } else {
                  // Scroll successful, fade in content
                  onOpacityChange(1);
                }
              }, READING_CONSTANTS.SCROLL_CHECK_DELAY); // Short delay for next check
            } else {
              // Already scrolled, fade in content
              onOpacityChange(1);
            }
          };

          // Initial call
          setTimeout(() => {
            scrollToSavedPosition();
          }, READING_CONSTANTS.CONTENT_FADE_IN_DELAY); // Small delay to ensure content is rendered
        } else {
          // Otherwise, scroll to top and fade in content
          window.scrollTo({ top: 0 });
          // Fade in content
          onOpacityChange(1);
        }
      }
    }

    // Get all links in the content container and add click event listeners
    const contentContainer = contentContainerRef.current;
    if (contentContainer) {
      const links = contentContainer.querySelectorAll("a");

      const handleLinkClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const link = e.target as HTMLAnchorElement;
        const href = link.getAttribute("href");
        if (href) {
          // Extract the path part before the anchor (if any)
          const path = href.split("#")[0];

          // Find the corresponding chapter in the full reading order
          const targetIndex = chapters.findIndex((chap) => chap.path === path);

          if (targetIndex !== -1) {
            // Set manual navigation flag to prevent scrolling using ref
            isTocManualNavigateRef.current = true;
            // When navigating via content links, we want to scroll the TOC
            setIsManualNavigation(false);
            // Navigate to the target chapter
            setCurrentChapterIndex(targetIndex);
          } else {
            // Try to find by matching just the filename part
            const filename = path.split("/").pop();
            if (filename) {
              const altTargetIndex = chapters.findIndex(
                (chap) => chap.path.split("/").pop() === filename,
              );
              if (altTargetIndex !== -1) {
                isTocManualNavigateRef.current = true;
                // When navigating via content links, we want to scroll the TOC
                setIsManualNavigation(false);
                setCurrentChapterIndex(altTargetIndex);
              }
            }
          }
        }
      };

      // Add event listener to each link
      links.forEach((link) => {
        link.addEventListener("click", handleLinkClick);
      });

      // Clean up event listeners
      return () => {
        links.forEach((link) => {
          link.removeEventListener("click", handleLinkClick);
        });
      };
    }
  }, [
    chapterContent,
    chapters,
    isFirstLoad,
    currentChapterIndex,
    savedScrollPercentage,
    isTocManualNavigateRef,
    setIsManualNavigation,
    setCurrentChapterIndex,
    contentContainerRef,
    onOpacityChange,
  ]);
}
