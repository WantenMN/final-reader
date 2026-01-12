import { useState, useEffect } from "react";
import { API_URL } from "@/lib/constants";
import { processChapterContent } from "@/lib/contentProcessing";
import type { Chapter } from "@/app/types";
import { READING_CONSTANTS } from "@/lib/readingConstants";

export interface ChapterContentState {
  chapterContent: string;
  chapterContentError: string | null;
  isFirstLoad: boolean;
}

export function useChapterContent(
  bookId: string,
  chapters: Chapter[],
  currentChapterIndex: number,
  stateLoaded: boolean,
): ChapterContentState {
  const [chapterContent, setChapterContent] = useState<string>("");
  const [chapterContentError, setChapterContentError] = useState<string | null>(
    null,
  );
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);

  useEffect(() => {
    async function fetchChapterContent() {
      if (chapters.length === 0 || currentChapterIndex === -1 || !stateLoaded) {
        setChapterContent("");
        return;
      }

      setChapterContentError(null);

      const chapter = chapters[currentChapterIndex];
      try {
        const contentResponse = await fetch(
          `${API_URL}/api/books/${bookId}/chapter?path=${encodeURIComponent(
            chapter.path,
          )}`,
        );
        if (!contentResponse.ok) {
          throw new Error("Failed to fetch chapter content");
        }
        const rawContent = await contentResponse.text();

        // Process the content
        const processed = await processChapterContent(
          rawContent,
          bookId,
          READING_CONSTANTS.CHAPTER_CONTAINER_ID,
        );

        setChapterContent(processed.content);
        setIsFirstLoad(false);
      } catch (err) {
        setChapterContentError(
          err instanceof Error ? err.message : "Unknown error",
        );
        setChapterContent(""); // Clear content on error
        setIsFirstLoad(false); // Set isFirstLoad to false even if there's an error
      }
    }

    fetchChapterContent();
  }, [bookId, chapters, currentChapterIndex, stateLoaded]);

  return {
    chapterContent,
    chapterContentError,
    isFirstLoad,
  };
}
