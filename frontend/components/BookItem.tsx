import Link from "next/link";
import type { Book } from "@/app/types";
import { API_URL } from "@/lib/constants";

interface BookItemProps {
  book: Book;
}

export default function BookItem({ book }: BookItemProps) {
  const hasCover = book.cover_path;
  const coverUrl = hasCover ? `${API_URL}/api/books/${book.id}/cover` : null;

  return (
    <Link href={`/read/${book.id}`} className="block group">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow-md">
        <div className="relative aspect-2/3 bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden">
          {hasCover && coverUrl ? (
            <img
              src={coverUrl}
              alt={`${book.title} cover`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            /* Placeholder for cover image */
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs">No Cover</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h2 className="text-sm font-semibold text-gray-900 truncate" title={book.title}>
            {book.title}
          </h2>
          <div className="mt-1">
            <p className="text-xs text-gray-600 truncate" title={book.author ?? 'Unknown Author'}>
              {book.author ?? 'Unknown Author'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

