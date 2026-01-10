"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/constants";
import type { Chapter } from "@/app/types";
import ReadHeader from "@/components/ReadHeader"; // Added import
import { useReadStore } from "@/lib/store"; // Added import

export default function ReadPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const { isTocOpen, fontSize, lineHeight, paragraphSpacing, contentWidth } =
    useReadStore(); // Added useReadStore properties

  const [chapters, setChapters] = useState<Chapter[]>([]); // Full reading order for navigation
  const [tocChapters, setTocChapters] = useState<Chapter[]>([]); // TOC from toc.ncx for display
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [chapterContent, setChapterContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [stateLoaded, setStateLoaded] = useState<boolean>(false); // New state to track if reading state is loaded
  const [error, setError] = useState<string | null>(null);
  const [chapterContentError, setChapterContentError] = useState<string | null>(
    null
  );
  // Removed initialScrollDone state

  const tocRef = useRef<HTMLDivElement>(null);
  const currentChapterRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    async function fetchBookData() {
      if (!bookId) return;

      setLoading(true);
      setError(null);
      setStateLoaded(false); // Reset stateLoaded when starting to fetch

      try {
        // 1. Fetch full reading order chapters (for navigation)
        const chaptersResponse = await fetch(
          `${API_URL}/api/books/${bookId}/chapters`
        );
        if (!chaptersResponse.ok) {
          throw new Error("Failed to fetch chapters");
        }
        const fetchedChapters: Chapter[] = await chaptersResponse.json();
        setChapters(fetchedChapters);

        // 2. Fetch TOC chapters (for display in sidebar)
        const tocResponse = await fetch(
          `${API_URL}/api/books/${bookId}/toc`
        );
        if (tocResponse.ok) {
          const fetchedTocChapters: Chapter[] = await tocResponse.json();
          setTocChapters(fetchedTocChapters);
        } else {
          console.warn("Failed to fetch TOC, using full chapters as fallback");
          setTocChapters(fetchedChapters); // Fallback to full chapters if TOC fails
        }

        // 3. Load state and determine current chapter
        let initialChapterIndex = 0;
        try {
          const stateResponse = await fetch(
            `${API_URL}/api/book/${bookId}/state`
          );
          if (stateResponse.ok) {
            const readingState = await stateResponse.json();
            const savedPosition = readingState.position;
            if (savedPosition) {
              // 3.1 If state exists, find the corresponding chapter in full reading order
              const savedChapterIndex = fetchedChapters.findIndex(
                (chap) => chap.path === savedPosition
              );
              if (savedChapterIndex !== -1) {
                initialChapterIndex = savedChapterIndex;
              }
            }
          }
        } catch (stateError) {
          console.warn(
            "No saved reading state found or failed to fetch state:",
            stateError
          );
          // 3.2 If no state, continue with default (first chapter)
        }

        // Set the current chapter index based on state or default to first
        setCurrentChapterIndex(initialChapterIndex);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setStateLoaded(true); // Mark that state loading is complete
        setLoading(false);
      }
    }

    fetchBookData();
  }, [bookId]);

  useEffect(() => {
    async function fetchChapterContent() {
      if (chapters.length === 0 || currentChapterIndex === -1 || !stateLoaded) {
        setChapterContent("");
        return;
      }

      setLoading(true);
      setChapterContentError(null);

      const chapter = chapters[currentChapterIndex];
      try {
          const contentResponse = await fetch(
            `${API_URL}/api/books/${bookId}/chapter?path=${encodeURIComponent(
              chapter.path
            )}`
          );
          if (!contentResponse.ok) {
            throw new Error("Failed to fetch chapter content");
          }
          let content = await contentResponse.text();
          
          // Process content to replace relative URLs with absolute URLs pointing to the resource endpoint
          const resourceBaseUrl = `${API_URL}/api/books/${bookId}/resource/`;
          
          // Use simple string replacement for all relative URL patterns
          // These replacements will handle most common cases
          content = content.replace(/src="\.\.\//g, `src="${resourceBaseUrl}`);
          content = content.replace(/src="\.\//g, `src="${resourceBaseUrl}`);
          content = content.replace(/href="\.\.\//g, `href="${resourceBaseUrl}`);
          content = content.replace(/href="\.\//g, `href="${resourceBaseUrl}`);
          
          // For direct relative paths like src="image.jpg", we need to be careful
          // to only replace them if they're not already absolute URLs
          // Handle src attributes
          content = content.replace(/src="([^http][^"]+)"/g, `src="${resourceBaseUrl}$1"`);
          // Handle href attributes
          content = content.replace(/href="([^http][^"]+)"/g, `href="${resourceBaseUrl}$1"`);
          
          setChapterContent(content);
        } catch (err: any) {
          setChapterContentError(err.message);
          setChapterContent(""); // Clear content on error
        } finally {
          setLoading(false);
        }
    }
    fetchChapterContent();
  }, [bookId, chapters, currentChapterIndex, stateLoaded]);

  useEffect(() => {
    async function updateReadingState() {
      if (chapters.length === 0 || currentChapterIndex === -1 || !stateLoaded) {
        return;
      }

      const chapter = chapters[currentChapterIndex];
      try {
        await fetch(`${API_URL}/api/book/${bookId}/state`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ position: chapter.path }),
        });
      } catch (err) {
        console.error("Failed to update reading state:", err);
      }
    }
    updateReadingState();
  }, [bookId, chapters, currentChapterIndex, stateLoaded]);

  // Auto-scroll to current chapter in sidebar when TOC opens or chapter changes
  useEffect(() => {
    if (isTocOpen && currentChapterRef.current && tocRef.current) {
      const sidebar = tocRef.current;
      const currentChapterElement = currentChapterRef.current;

      const elementTop = currentChapterElement.offsetTop;
      const elementHeight = currentChapterElement.offsetHeight;
      const sidebarHeight = sidebar.clientHeight;

      // Calculate the position to scroll to
      const elementPosition = elementTop - sidebar.offsetTop;
      const middlePosition =
        elementPosition - sidebarHeight / 2 + elementHeight / 2;

      // Scroll to position without animation
      sidebar.scrollTop = middlePosition;
    }
  }, [currentChapterIndex, chapters.length, isTocOpen]); // Added isTocOpen to dependencies

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  }, [chapterContent]);

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  if (loading && (!stateLoaded || chapters.length === 0)) {
    return (
      <div className="py-8">
        <div className="max-w-3xl mx-auto px-4">Loading book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-3xl mx-auto px-4 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  const currentChapter = chapters[currentChapterIndex];
  const isFirstChapter = currentChapterIndex === 0;
  const isLastChapter = currentChapterIndex === chapters.length - 1;

  return (
    <>
      <ReadHeader />
      <div className="flex">
        {/* Left sidebar for table of contents */}
        {isTocOpen && ( // Conditional rendering based on isTocOpen
          <div
            ref={tocRef}
            className="w-64 p-4 border-r h-screen overflow-y-auto sticky top-0 pt-20"
          >
            <h2 className="text-xl font-bold mb-4">Chapters</h2>
            <nav>
              <ul>
                {tocChapters.map((tocChapter, tocIndex) => {
                  // Find if this TOC chapter is the current one being displayed
                  const isCurrentChapter = chapters[currentChapterIndex]?.path === tocChapter.path;
                  
                  return (
                    <li
                      key={tocIndex}
                      ref={
                        isCurrentChapter ? currentChapterRef : null
                      }
                      className="mb-2"
                    >
                      <button
                        onClick={() => {
                          // Find the index of this TOC chapter in the full reading order
                          const targetIndex = chapters.findIndex(
                            (chap) => chap.path === tocChapter.path
                          );
                          if (targetIndex !== -1) {
                            setCurrentChapterIndex(targetIndex);
                          }
                        }}
                        className={`text-left w-full p-2 rounded-md cursor-pointer ${
                          isCurrentChapter
                            ? "bg-blue-500 text-white"
                            : "hover:bg-gray-200"
                        }`}
                        style={{ 
                          paddingLeft: `${tocChapter.level * 16 + 8}px` // Add indentation based on level
                        }}
                      >
                        {tocChapter.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>{' '}
          </div>
        )}
        {/* Main content area */}
        <div className="grow p-4 pt-20">
          {chapterContentError ? (
            <div className="text-red-500 mb-4">
              Error loading chapter content: {chapterContentError}
            </div>
          ) : (
            <div className="mx-auto" style={{ maxWidth: `${contentWidth}px` }}>
              {" "}
              {/* Added wrapper div */}
              <div
                className="prose lg:prose-lg"
                style={
                  {
                    fontSize: `${fontSize}px`,
                    lineHeight: `${lineHeight}`,
                    // Use a CSS variable for paragraph spacing that can be targeted in global.css
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
