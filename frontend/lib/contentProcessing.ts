import { API_URL } from "./constants";

export interface ProcessedContentResult {
  content: string;
}

/**
 * Processes chapter content to handle relative URLs and CSS scoping
 */
export async function processChapterContent(
  rawContent: string,
  bookId: string,
  chapterContainerId: string,
): Promise<ProcessedContentResult> {
  let content = rawContent;

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
  content = content.replace(
    /src="([^http][^"]+)"/g,
    `src="${resourceBaseUrl}$1"`,
  );
  // Handle href attributes
  content = content.replace(
    /href="([^http][^"]+)"/g,
    `href="${resourceBaseUrl}$1"`,
  );

  // Process styles to isolate them within the chapter container
  content = processInlineStyles(content, chapterContainerId);

  // Process external stylesheets
  content = await processExternalStylesheets(
    content,
    resourceBaseUrl,
    chapterContainerId,
  );

  return { content };
}

/**
 * Process inline style tags to scope CSS to the chapter container
 */
function processInlineStyles(
  content: string,
  chapterContainerId: string,
): string {
  return content.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/g,
    (match, attrs, css) => {
      // Add container prefix to all CSS selectors
      const scopedCss = css
        .replace(/([^{}]+)(?=\s*{)/g, (selector: string) => {
          // Skip comments and@media rules
          if (
            selector.trim().startsWith("/*") ||
            selector.trim().startsWith("@media")
          ) {
            return selector;
          }
          // Add container ID to each selector, but make it less specific than user settings
          // Remove any font-size, line-height, or margin-bottom properties that might conflict with user settings
          return selector
            .split(",")
            .map((sel: string) => {
              const trimmedSel = sel.trim();
              if (trimmedSel) {
                return `#${chapterContainerId} ${trimmedSel}`;
              }
              return "";
            })
            .join(",");
        })
        .replace(/font-size:\s*[^;}]+;?/gi, "")
        .replace(/line-height:\s*[^;}]+;?/gi, "")
        .replace(/margin-bottom:\s*[^;}]+;?/gi, ""); // Remove margin-bottom to let our paragraph spacing take precedence
      return `<style${attrs}>${scopedCss}</style>`;
    },
  );
}

/**
 * Process external stylesheets by fetching and scoping them
 */
async function processExternalStylesheets(
  content: string,
  resourceBaseUrl: string,
  chapterContainerId: string,
): Promise<string> {
  // Use a more flexible regex that handles different attribute orders and quotes
  const linkRegex =
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  const linkRegexAlt =
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;

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
      if (!cssUrl.startsWith("http://") && !cssUrl.startsWith("https://")) {
        absoluteCssUrl = `${resourceBaseUrl}${cssUrl.replace(/^\.\//, "").replace(/^\.\.\//, "")}`;
      }

      // Fetch and process external CSS
      const stylePromise = fetch(absoluteCssUrl)
        .then((response) => response.text())
        .then((css) => {
          // Add container prefix to all CSS selectors
          const scopedCss = css
            .replace(/([^{}]+)(?=\s*{)/g, (selector: string) => {
              // Skip comments and@media rules
              if (
                selector.trim().startsWith("/*") ||
                selector.trim().startsWith("@media")
              ) {
                return selector;
              }
              // Add container ID to each selector
              return selector
                .split(",")
                .map((sel: string) => {
                  const trimmedSel = sel.trim();
                  if (trimmedSel) {
                    return `#${chapterContainerId} ${trimmedSel}`;
                  }
                  return "";
                })
                .join(",");
            })
            // Remove any font-size, line-height, or margin-bottom properties that might conflict with user settings
            .replace(/font-size:\s*[^;}]+;?/gi, "")
            .replace(/line-height:\s*[^;}]+;?/gi, "")
            .replace(/margin-bottom:\s*[^;}]+;?/gi, "");
          return { linkTag, css: scopedCss };
        })
        .catch((error) => {
          console.error(`Failed to fetch CSS from ${cssUrl}:`, error);
          return { linkTag, css: "" };
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
    const combinedExternalCss = externalStylesResult
      .map((result) => result.css)
      .join("\n");

    // Remove all link tags
    let updatedContent = content;
    allLinkTags.forEach((linkTag) => {
      updatedContent = updatedContent.replace(linkTag, "");
    });

    // Insert combined styles at the end of head or beginning of body
    if (updatedContent.includes("</head>")) {
      updatedContent = updatedContent.replace(
        /<\/head>/i,
        `<style>${combinedExternalCss}</style></head>`,
      );
    } else {
      // If no head tag, add styles at the beginning of content
      updatedContent = `<style>${combinedExternalCss}</style>${updatedContent}`;
    }

    return updatedContent;
  }

  return content;
}
