"use client";

import { useReadStore } from "@/lib/store";
import { MenuIcon, XIcon, SettingsIcon, PlusIcon, MinusIcon } from "lucide-react";

export default function ReadHeader() {
  const {
    isTocOpen,
    toggleToc,
    isHeaderVisible,
    toggleHeader,
    fontSize,
    lineHeight,
    paragraphSpacing,
    contentWidth,
    setFontSize,
    setLineHeight,
    setParagraphSpacing,
    setContentWidth,
  } = useReadStore();

  const increaseFontSize = () => setFontSize(Math.min(fontSize + 1, 32));
  const decreaseFontSize = () => setFontSize(Math.max(fontSize - 1, 12));

  const increaseLineHeight = () => setLineHeight(Math.min(lineHeight + 0.1, 2.5));
  const decreaseLineHeight = () => setLineHeight(Math.max(lineHeight - 0.1, 1.0));

  const increaseParagraphSpacing = () => setParagraphSpacing(Math.min(paragraphSpacing + 0.1, 2.0));
  const decreaseParagraphSpacing = () => setParagraphSpacing(Math.max(paragraphSpacing - 0.1, 0.5));

  const increaseContentWidth = () => setContentWidth(Math.min(contentWidth + 100, 1400));
  const decreaseContentWidth = () => setContentWidth(Math.max(contentWidth - 100, 600));

  // Header classes for conditional styling
  const headerClasses = `fixed top-0 left-0 right-0 p-4 z-10 flex justify-between items-center transition-all duration-300 bg-white border-gray-200 shadow-md`;

  // Left button classes for conditional background
  const leftButtonClasses = `p-2 rounded-md transition-colors duration-300 cursor-pointer ${
    isTocOpen ? 'bg-gray-200' : ''
  }`;

  return (
    <>
      {isHeaderVisible && (
        <div className={headerClasses}>
          {/* Left Toggle Button (MenuIcon always) */}
          <button
            onClick={toggleToc}
            className={leftButtonClasses}
            aria-label="Toggle Table of Contents"
          >
            <MenuIcon className="h-6 w-6 text-gray-600" />{" "}
            {/* Always MenuIcon */}
          </button>

          <div className="flex items-center space-x-4">
            {/* Font Size Control */}
            <div className="flex items-center space-x-1">
              <button onClick={decreaseFontSize} className="p-1 rounded-md hover:bg-gray-200" aria-label="Decrease font size">
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="text-sm">字号: {fontSize}px</span>
              <button onClick={increaseFontSize} className="p-1 rounded-md hover:bg-gray-200" aria-label="Increase font size">
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Line Height Control */}
            <div className="flex items-center space-x-1">
              <button onClick={decreaseLineHeight} className="p-1 rounded-md hover:bg-gray-200" aria-label="Decrease line height">
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="text-sm">行高: {lineHeight.toFixed(1)}</span>
              <button onClick={increaseLineHeight} className="p-1 rounded-md hover:bg-gray-200" aria-label="Increase line height">
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Paragraph Spacing Control */}
            <div className="flex items-center space-x-1">
              <button onClick={decreaseParagraphSpacing} className="p-1 rounded-md hover:bg-gray-200" aria-label="Decrease paragraph spacing">
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="text-sm">段距: {paragraphSpacing.toFixed(1)}</span>
              <button onClick={increaseParagraphSpacing} className="p-1 rounded-md hover:bg-gray-200" aria-label="Increase paragraph spacing">
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Content Width Control */}
            <div className="flex items-center space-x-1">
              <button onClick={decreaseContentWidth} className="p-1 rounded-md hover:bg-gray-200" aria-label="Decrease content width">
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="text-sm">宽度: {contentWidth}px</span>
              <button onClick={increaseContentWidth} className="p-1 rounded-md hover:bg-gray-200" aria-label="Increase content width">
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right side button: XIcon when header is visible, to hide it */}
          <div className="flex items-center">
                        <button onClick={toggleHeader} className="p-2 rounded-md hover:bg-gray-200 transition-colors duration-300 cursor-pointer" aria-label="Hide Header">
              <XIcon className="h-6 w-6 text-gray-900" />{" "}
              {/* XIcon when header is visible */}
            </button>
          </div>
        </div>
      )}

      {!isHeaderVisible && (
        <div className="fixed top-4 right-4 z-50">
          {/* Button to show header when header is hidden: SettingsIcon */}
                    <button onClick={toggleHeader} className="p-2 rounded-md cursor-pointer" aria-label="Show Header">
            <SettingsIcon className="h-6 w-6" />{" "}
            {/* SettingsIcon when header is hidden */}
          </button>
        </div>
      )}
    </>
  );
}
