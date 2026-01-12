"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import ReadHeader from "@/components/ReadHeader";
import TableOfContents from "@/components/TableOfContents";
import { useReadStore } from "@/lib/store";
import { useBookData } from "@/lib/hooks/useBookData";
import { useChapterContent } from "@/lib/hooks/useChapterContent";
import { useReadingState } from "@/lib/hooks/useReadingState";
import { useScrollHandler } from "@/lib/hooks/useScrollHandler";
import { useChapterNavigation } from "@/lib/hooks/useChapterNavigation";
import { useContentEffects } from "@/lib/hooks/useContentEffects";
import { READING_CONSTANTS } from "@/lib/readingConstants";

export default function ReadPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const { isTocOpen, fontSize, lineHeight, paragraphSpacing, contentWidth } =
    useReadStore();

  // Custom hooks for data management
  const {
    book,
    chapters,
    tocChapters,
    loading,
    stateLoaded,
    error,
    currentChapterIndex: initialChapterIndex,
    savedScrollPercentage,
  } = useBookData(bookId);

  // Navigation hook (manages current chapter index)
  const {
    isManualNavigation,
    setIsManualNavigation,
    isTocManualNavigateRef,
    goToPreviousChapter,
    goToNextChapter,
    setCurrentChapterIndex,
    currentChapterIndex,
  } = useChapterNavigation(chapters, initialChapterIndex);

  const { chapterContent, chapterContentError, isFirstLoad } =
    useChapterContent(bookId, chapters, currentChapterIndex, stateLoaded);

  const { updateReadingState, scrollRef } = useReadingState(
    chapters,
    currentChapterIndex,
    stateLoaded,
    bookId,
  );

  // Refs
  const currentChapterRef = useRef<HTMLLIElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Scroll handler
  useScrollHandler({
    updateReadingState,
    scrollRef,
  });

  const [contentOpacity, setContentOpacity] = useState<number>(0);

  // Content effects (scrolling and link handling)
  useContentEffects({
    chapterContent,
    chapters,
    isFirstLoad,
    currentChapterIndex,
    savedScrollPercentage,
    isTocManualNavigateRef,
    setIsManualNavigation,
    setCurrentChapterIndex,
    contentContainerRef,
    onOpacityChange: setContentOpacity,
  });

  // Call updateReadingState when chapter changes, but not on initial mount
  useEffect(() => {
    if (isInitialMountRef.current) {
      setTimeout(() => {
        isInitialMountRef.current = false;
      }, READING_CONSTANTS.INITIAL_MOUNT_TIMEOUT);
      return;
    }

    updateReadingState();
  }, [bookId, chapters, currentChapterIndex, stateLoaded, updateReadingState]);

  // Set document title when book is loaded
  useEffect(() => {
    if (book) {
      document.title = book.title;
    }
  }, [book]);

  const isAllDataLoaded =
    stateLoaded && chapters.length > 0 && chapterContent !== "";

  if (isFirstLoad && (!isAllDataLoaded || loading)) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4">Loading book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  const isFirstChapter = currentChapterIndex === 0;
  const isLastChapter = currentChapterIndex === chapters.length - 1;

  return (
    <>
      <ReadHeader />
      <div className="flex">
        {/* Left sidebar for table of contents - Using new component */}
        <TableOfContents
          tocChapters={tocChapters}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          isTocOpen={isTocOpen}
          onChapterClick={(targetIndex) => {
            // Set manual navigation flag to prevent scrolling using ref (synchronous update)
            isTocManualNavigateRef.current = true;
            // When navigating via TOC, we don't want to scroll the TOC
            setIsManualNavigation(true);
            setCurrentChapterIndex(targetIndex);
          }}
          currentChapterRef={currentChapterRef}
          isManualNavigation={isManualNavigation}
        />
        {/* Main content area */}
        <div
          className={`grow p-4 pt-20 transition-all duration-300 ${isTocOpen ? "ml-76" : "ml-0"}`}
          ref={mainContentRef}
        >
          {chapterContentError ? (
            <div className="text-red-500 mb-4">
              Error loading chapter content: {chapterContentError}
            </div>
          ) : (
            <div className="mx-auto" style={{ maxWidth: `${contentWidth}px` }}>
              {" "}
              {/* Added wrapper div */}
              <div
                ref={contentContainerRef}
                id="book-chapter-content"
                className="prose lg:prose-lg"
                style={
                  {
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeight}`,
                    opacity: contentOpacity,
                    transition: "opacity 0.3s ease-in-out",
                    // Use CSS variables for user settings that can be referenced by global styles
                    "--user-font-size": `${fontSize}px`,
                    "--user-line-height": lineHeight,
                    "--paragraph-spacing-multiplier": paragraphSpacing,
                  } as React.CSSProperties
                }
                dangerouslySetInnerHTML={{ __html: chapterContent }}
              />
            </div>
          )}
          {(chapterContent || chapterContentError) && (
            <div
              className="flex justify-between pt-10"
              style={{ maxWidth: `${contentWidth}px`, margin: "0 auto" }}
            >
              <button
                onClick={goToPreviousChapter}
                disabled={isFirstChapter || loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 cursor-pointer"
              >
                Previous Chapter
              </button>
              <button
                onClick={goToNextChapter}
                disabled={isLastChapter || loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 cursor-pointer"
              >
                Next Chapter
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
