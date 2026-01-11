"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/constants";
import type { Book, Chapter } from "@/app/types";
import ReadHeader from "@/components/ReadHeader"; // Added import
import TableOfContents from "@/components/TableOfContents"; // Added import for new TOC component
import { useReadStore } from "@/lib/store"; // Added import

export default function ReadPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const { isTocOpen, fontSize, lineHeight, paragraphSpacing, contentWidth } = useReadStore(); // Added useReadStore properties

  const [book, setBook] = useState<Book | null>(null); // Book details
  const [chapters, setChapters] = useState<Chapter[]>([]); // Full reading order for navigation
  const [tocChapters, setTocChapters] = useState<Chapter[]>([]); // TOC from toc.ncx for display
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [chapterContent, setChapterContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [stateLoaded, setStateLoaded] = useState<boolean>(false); // New state to track if reading state is loaded
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true); // New state to track if it's first load
  const isTocManualNavigateRef = useRef<boolean>(false); // Use ref instead of state for synchronous updates
  const [error, setError] = useState<string | null>(null);
  const [chapterContentError, setChapterContentError] = useState<string | null>(
    null
  );
  // Removed initialScrollDone state

  // Only keep currentChapterRef, tocRef is now managed inside TableOfContents component
  const currentChapterRef = useRef<HTMLLIElement>(null);
  // Add ref for chapter content container to handle link clicks
  const contentContainerRef = useRef<HTMLDivElement>(null);
  // State to track if navigation was initiated from TOC (for scrolling behavior)
  const [isManualNavigation, setIsManualNavigation] = useState<boolean>(false);

  useEffect(() => {
    async function fetchBookData() {
      if (!bookId) return;

      setLoading(true);
      setError(null);
      setStateLoaded(false); // Reset stateLoaded when starting to fetch

      try {
        // 1. Fetch book details
        const bookResponse = await fetch(
          `${API_URL}/api/books`
        );
        if (!bookResponse.ok) {
          throw new Error("Failed to fetch books");
        }
        const books: Book[] = await bookResponse.json();
        const fetchedBook = books.find(b => b.id === bookId);
        setBook(fetchedBook || null);

        // 2. Fetch full reading order chapters (for navigation)
        const chaptersResponse = await fetch(
          `${API_URL}/api/books/${bookId}/chapters`
        );
        if (!chaptersResponse.ok) {
          throw new Error("Failed to fetch chapters");
        }
        const fetchedChapters: Chapter[] = await chaptersResponse.json();
        setChapters(fetchedChapters);

        // 3. Fetch TOC chapters (for display in sidebar)
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

        // 4. Load state and determine current chapter
        let initialChapterIndex = 0;
        try {
          const stateResponse = await fetch(
            `${API_URL}/api/book/${bookId}/state`
          );
          if (stateResponse.ok) {
            const readingState = await stateResponse.json();
            const savedPosition = readingState.position;
            if (savedPosition) {
              // 4.1 If state exists, find the corresponding chapter in full reading order
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
          // 4.2 If no state, continue with default (first chapter)
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
          
          // Process styles to isolate them within the chapter container
          const chapterContainerId = 'book-chapter-content';
          
          // Step 1: Process inline style tags
          content = content.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (match, attrs, css) => {
            // Add container prefix to all CSS selectors
            const scopedCss = css.replace(/([^{}]+)(?=\s*{)/g, (selector: string) => {
              // Skip comments and@media rules
              if (selector.trim().startsWith('/*') || selector.trim().startsWith('@media')) {
                return selector;
              }
              // Add container ID to each selector, but make it less specific than user settings
              // Remove any font-size, line-height, or margin-bottom properties that might conflict with user settings
              return selector.split(',').map((sel: string) => {
                const trimmedSel = sel.trim();
                if (trimmedSel) {
                  return `#${chapterContainerId} ${trimmedSel}`;
                }
                return '';
              }).join(',');
            }).replace(/font-size:\s*[^;}]+;?/gi, '')
              .replace(/line-height:\s*[^;}]+;?/gi, '')
              .replace(/margin-bottom:\s*[^;}]+;?/gi, ''); // Remove margin-bottom to let our paragraph spacing take precedence
            return `<style${attrs}>${scopedCss}</style>`;
          });
          
          // Step 2: Process link tags - we'll need to fetch and modify external CSS
          // Use a more flexible regex that handles different attribute orders and quotes
          const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
          const linkRegexAlt = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
          
          const stylePromises: Array<Promise<{ linkTag: string; css: string }>> = [];
          const allLinkTags = new Set<string>();
          
          // Function to process link tags with a given regex
          const processLinkTags = (regex: RegExp) => {
            let match;
            while ((match = regex.exec(content)) !== null) {
              const linkTag = match[0];
              allLinkTags.add(linkTag);
              const cssUrl = match[1];
              let absoluteCssUrl = cssUrl;
              
              // Convert relative URLs to absolute
              if (!cssUrl.startsWith('http://') && !cssUrl.startsWith('https://')) {
                absoluteCssUrl = `${resourceBaseUrl}${cssUrl.replace(/^\.\//, '').replace(/^\.\.\//, '')}`;
              }
              
              // Fetch and process external CSS
              const stylePromise = fetch(absoluteCssUrl)
                .then(response => response.text())
                .then(css => {
                  // Add container prefix to all CSS selectors
                  const scopedCss = css.replace(/([^{}]+)(?=\s*{)/g, (selector: string) => {
                    // Skip comments and@media rules
                    if (selector.trim().startsWith('/*') || selector.trim().startsWith('@media')) {
                      return selector;
                    }
                    // Add container ID to each selector
                    return selector.split(',').map((sel: string) => {
                      const trimmedSel = sel.trim();
                      if (trimmedSel) {
                        return `#${chapterContainerId} ${trimmedSel}`;
                      }
                      return '';
                    }).join(',');
                  })
                  // Remove any font-size, line-height, or margin-bottom properties that might conflict with user settings
                  .replace(/font-size:\s*[^;}]+;?/gi, '')
                  .replace(/line-height:\s*[^;}]+;?/gi, '')
                  .replace(/margin-bottom:\s*[^;}]+;?/gi, '');
                  return { linkTag, css: scopedCss };
                })
                .catch(error => {
                  console.error(`Failed to fetch CSS from ${cssUrl}:`, error);
                  return { linkTag, css: '' };
                });
              
              stylePromises.push(stylePromise);
            }
          };
          
          // Process both regex patterns to catch all link stylesheets
          processLinkTags(linkRegex);
          processLinkTags(linkRegexAlt);
          
          // If there are external styles, fetch them and replace link tags with style tags
          if (stylePromises.length > 0) {
            const externalStylesResult = await Promise.all(stylePromises);
            const combinedExternalCss = externalStylesResult.map(result => result.css).join('\n');
            
            // Remove all link tags
            let updatedContent = content;
            allLinkTags.forEach(linkTag => {
              updatedContent = updatedContent.replace(linkTag, '');
            });
            
            // Insert combined styles at the end of head or beginning of body
            if (updatedContent.includes('</head>')) {
              updatedContent = updatedContent.replace(/<\/head>/i, `<style>${combinedExternalCss}</style></head>`);
            } else {
              // If no head tag, add styles at the beginning of content
              updatedContent = `<style>${combinedExternalCss}</style>${updatedContent}`;
            }
            
            content = updatedContent;
          }
          
          setChapterContent(content);
          setIsFirstLoad(false); // Set isFirstLoad to false after first content load
        } catch (err: any) {
          setChapterContentError(err.message);
          setChapterContent(""); // Clear content on error
          setIsFirstLoad(false); // Set isFirstLoad to false even if there's an error
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

  // Add useEffect to handle link clicks in chapter content
  useEffect(() => {
    // Scroll to top when chapter content changes
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
    
    // Get all links in the content container and add click event listeners
    const contentContainer = contentContainerRef.current;
    if (contentContainer) {
      const links = contentContainer.querySelectorAll('a');
      
      const handleLinkClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const link = e.target as HTMLAnchorElement;
        const href = link.getAttribute('href');
        if (href) {
          // Extract the path part before the anchor (if any)
          const path = href.split('#')[0];
          
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
            const filename = path.split('/').pop();
            if (filename) {
              const altTargetIndex = chapters.findIndex((chap) => 
                chap.path.split('/').pop() === filename
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
      links.forEach(link => {
        link.addEventListener('click', handleLinkClick);
      });
      
      // Clean up event listeners
      return () => {
        links.forEach(link => {
          link.removeEventListener('click', handleLinkClick);
        });
      };
    }
  }, [chapterContent, chapters]);

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

  // Set document title when book is loaded
  useEffect(() => {
    if (book) {
      document.title = book.title;
    }
  }, [book]);

  const isAllDataLoaded = stateLoaded && chapters.length > 0 && chapterContent !== "";
  
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

  const currentChapter = chapters[currentChapterIndex];
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
        <div className={`grow p-4 pt-20 transition-all duration-300 ${isTocOpen ? 'ml-76' : 'ml-0'}`}>
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
