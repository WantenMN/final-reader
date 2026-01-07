"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/constants";
import type { Chapter } from "@/app/types";

export default function ReadPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [chapterContent, setChapterContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterContentError, setChapterContentError] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function fetchBookData() {
      if (!bookId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch chapters
        const chaptersResponse = await fetch(
          `${API_URL}/api/books/${bookId}/chapters`
        );
        if (!chaptersResponse.ok) {
          throw new Error("Failed to fetch chapters");
        }
        const fetchedChapters: Chapter[] = await chaptersResponse.json();
        setChapters(fetchedChapters);

        // Fetch reading state
        let initialChapterIndex = 0;
        try {
          const stateResponse = await fetch(
            `${API_URL}/api/book/${bookId}/state`
          );
          if (stateResponse.ok) {
            const readingState = await stateResponse.json();
            const savedPosition = readingState.position;
            if (savedPosition) {
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
          // Continue with default initialChapterIndex (0)
        }
        setCurrentChapterIndex(initialChapterIndex);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBookData();
  }, [bookId]);

  useEffect(() => {
    async function fetchChapterContent() {
      if (chapters.length === 0 || currentChapterIndex === -1) {
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
        const content = await contentResponse.text();
        setChapterContent(content);
      } catch (err: any) {
        setChapterContentError(err.message);
        setChapterContent(""); // Clear content on error
      } finally {
        setLoading(false);
      }
    }
    fetchChapterContent();
  }, [bookId, chapters, currentChapterIndex]);

  useEffect(() => {
    async function updateReadingState() {
      if (chapters.length === 0 || currentChapterIndex === -1) {
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
  }, [bookId, chapters, currentChapterIndex]);

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

  if (loading && chapters.length === 0) {
    return (
      <div className="py-8">
        <div className="max-w-screen-md mx-auto px-4">Loading book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-screen-md mx-auto px-4 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  const currentChapter = chapters[currentChapterIndex];
  const isFirstChapter = currentChapterIndex === 0;
  const isLastChapter = currentChapterIndex === chapters.length - 1;

  return (
    <div className="flex">
      {/* Left sidebar for table of contents */}
      <div className="w-64 p-4 border-r h-screen overflow-y-auto sticky top-0">
        <h2 className="text-xl font-bold mb-4">Chapters</h2>
        <nav>
          <ul>
            {chapters.map((chapter, index) => (
              <li key={index} className="mb-2">
                <button
                  onClick={() => setCurrentChapterIndex(index)}
                  className={`text-left w-full p-2 rounded-md ${
                    index === currentChapterIndex
                      ? "bg-blue-500 text-white"
                      : "hover:bg-gray-200"
                  }`}
                >
                  {chapter.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>{" "}
      </div>

      {/* Main content area */}
      <div className="flex-grow p-4">
        <h1 className="text-2xl font-bold mb-4">
          {currentChapter?.title || "Unknown Chapter"}
        </h1>
        {chapterContentError ? (
          <div className="text-red-500 mb-4">
            Error loading chapter content: {chapterContentError}
          </div>
        ) : (
          <div className="max-w-prose mx-auto">
            {" "}
            {/* Added wrapper div */}
            <div
              className="prose lg:prose-lg"
              dangerouslySetInnerHTML={{ __html: chapterContent }}
            />
          </div>
        )}
        <div className="flex justify-between mt-8">
          <button
            onClick={goToPreviousChapter}
            disabled={isFirstChapter || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
          >
            Previous Chapter
          </button>
          <button
            onClick={goToNextChapter}
            disabled={isLastChapter || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
          >
            Next Chapter
          </button>
        </div>
      </div>
    </div>
  );
}
