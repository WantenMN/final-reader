import { useState, useEffect } from "react";
import { API_URL } from "@/lib/constants";
import type { Book, Chapter } from "@/app/types";

export interface BookDataState {
  book: Book | null;
  chapters: Chapter[];
  tocChapters: Chapter[];
  loading: boolean;
  stateLoaded: boolean;
  error: string | null;
}

export interface ReadingState {
  currentChapterIndex: number;
  savedScrollPercentage: number;
}

export function useBookData(bookId: string): BookDataState & ReadingState {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tocChapters, setTocChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stateLoaded, setStateLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [savedScrollPercentage, setSavedScrollPercentage] = useState<number>(0);

  useEffect(() => {
    async function fetchBookData() {
      if (!bookId) return;

      setLoading(true);
      setError(null);
      setStateLoaded(false);

      try {
        // 1. Fetch book details
        const bookResponse = await fetch(`${API_URL}/api/books`);
        if (!bookResponse.ok) {
          throw new Error("Failed to fetch books");
        }
        const books: Book[] = await bookResponse.json();
        const fetchedBook = books.find((b) => b.id === bookId);
        setBook(fetchedBook || null);

        // 2. Fetch full reading order chapters (for navigation)
        const chaptersResponse = await fetch(
          `${API_URL}/api/books/${bookId}/chapters`,
        );
        if (!chaptersResponse.ok) {
          throw new Error("Failed to fetch chapters");
        }
        const fetchedChapters: Chapter[] = await chaptersResponse.json();
        setChapters(fetchedChapters);

        // 3. Fetch TOC chapters (for display in sidebar)
        const tocResponse = await fetch(`${API_URL}/api/books/${bookId}/toc`);
        if (tocResponse.ok) {
          const fetchedTocChapters: Chapter[] = await tocResponse.json();
          setTocChapters(fetchedTocChapters);
        } else {
          console.warn("Failed to fetch TOC, using full chapters as fallback");
          setTocChapters(fetchedChapters); // Fallback to full chapters if TOC fails
        }

        // 4. Load state and determine current chapter
        let initialChapterIndex = 0;
        let savedScrollPercent = 0;
        try {
          const stateResponse = await fetch(
            `${API_URL}/api/book/${bookId}/state`,
          );
          if (stateResponse.ok) {
            const readingState = await stateResponse.json();
            const savedPosition = readingState.position;
            if (savedPosition) {
              // 4.1 If state exists, find the corresponding chapter in full reading order
              const savedChapterIndex = fetchedChapters.findIndex(
                (chap) => chap.path === savedPosition,
              );
              if (savedChapterIndex !== -1) {
                initialChapterIndex = savedChapterIndex;
                // 4.2 If scroll percentage exists, save it
                if (
                  readingState.scroll_percentage !== undefined &&
                  readingState.scroll_percentage !== null
                ) {
                  savedScrollPercent = readingState.scroll_percentage;
                }
              }
            }
          }
        } catch (stateError) {
          console.warn(
            "No saved reading state found or failed to fetch state:",
            stateError,
          );
          // 4.3 If no state, continue with default (first chapter)
        }

        // Set the current chapter index based on state or default to first
        setCurrentChapterIndex(initialChapterIndex);
        setSavedScrollPercentage(savedScrollPercent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setStateLoaded(true);
        setLoading(false);
      }
    }

    fetchBookData();
  }, [bookId]);

  return {
    book,
    chapters,
    tocChapters,
    loading,
    stateLoaded,
    error,
    currentChapterIndex,
    savedScrollPercentage,
  };
}
