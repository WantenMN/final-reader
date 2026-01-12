"use client";

import Link from "next/link";
import { useReadStore } from "@/lib/store";
import {
  MenuIcon,
  PlusIcon,
  MinusIcon,
  HomeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";

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

  const increaseLineHeight = () =>
    setLineHeight(Math.min(lineHeight + 0.2, 3.0));
  const decreaseLineHeight = () =>
    setLineHeight(Math.max(lineHeight - 0.2, 1.0));

  const increaseParagraphSpacing = () =>
    setParagraphSpacing(Math.min(paragraphSpacing + 0.2, 3.0));
  const decreaseParagraphSpacing = () =>
    setParagraphSpacing(Math.max(paragraphSpacing - 0.2, 0.5));

  const increaseContentWidth = () =>
    setContentWidth(Math.min(contentWidth + 100, 1400));
  const decreaseContentWidth = () =>
    setContentWidth(Math.max(contentWidth - 100, 600));

  // Header classes for conditional styling - always render, use transform to animate
  const headerClasses = `fixed top-0 left-0 right-0 p-2 z-30 flex justify-between items-center transform transition-all duration-300 ease-in-out bg-white border-gray-200 shadow-md ${
    isHeaderVisible
      ? "translate-y-0 opacity-100"
      : "-translate-y-full opacity-0"
  }`;

  // Left button classes for conditional background
  const leftButtonClasses = `p-1.5 rounded-md transition-colors duration-300 cursor-pointer ${
    isTocOpen ? "bg-gray-200" : "hover:bg-gray-200"
  }`;

  return (
    <>
      {/* Always render header, use transform to animate */}
      <div className={headerClasses}>
        {/* Left side: favicon home button + toc toggle */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center justify-center p-1.5 rounded-md hover:bg-gray-200 transition-colors duration-300"
            aria-label="Home"
          >
            <HomeIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <button
            onClick={toggleToc}
            className={leftButtonClasses}
            aria-label="Toggle Table of Contents"
          >
            <MenuIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Font Size Control */}
          <div className="flex items-center space-x-1">
            <button
              onClick={decreaseFontSize}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Decrease font size"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs">字号: {fontSize}px</span>
            <button
              onClick={increaseFontSize}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Increase font size"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Line Height Control */}
          <div className="flex items-center space-x-1">
            <button
              onClick={decreaseLineHeight}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Decrease line height"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs">行高: {lineHeight.toFixed(1)}</span>
            <button
              onClick={increaseLineHeight}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Increase line height"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Paragraph Spacing Control */}
          <div className="flex items-center space-x-1">
            <button
              onClick={decreaseParagraphSpacing}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Decrease paragraph spacing"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs">段距: {paragraphSpacing.toFixed(1)}</span>
            <button
              onClick={increaseParagraphSpacing}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Increase paragraph spacing"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content Width Control */}
          <div className="flex items-center space-x-1">
            <button
              onClick={decreaseContentWidth}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Decrease content width"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs">宽度: {contentWidth}px</span>
            <button
              onClick={increaseContentWidth}
              className="p-1 rounded-md hover:bg-gray-200"
              aria-label="Increase content width"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right side button: ChevronUpIcon when header is visible, to hide it */}
        <div className="flex items-center">
          <button
            onClick={toggleHeader}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors duration-300 cursor-pointer"
            aria-label="Hide Header"
          >
            <ChevronUpIcon className="h-5 w-5 text-gray-900" />
          </button>
        </div>
      </div>

      {!isHeaderVisible && (
        <div className="fixed top-2 right-4 z-50">
          {/* Button to show header when header is hidden: ChevronDownIcon */}
          <button
            onClick={toggleHeader}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors duration-300 cursor-pointer"
            aria-label="Show Header"
          >
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}
    </>
  );
}
