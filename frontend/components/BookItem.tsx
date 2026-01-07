import Link from "next/link";
import type { Book } from "@/app/types";

interface BookItemProps {
  book: Book;
}

export default function BookItem({ book }: BookItemProps) {
  return (
    <Link href={`/read/${book.id}`}>
      <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="h-48 bg-gray-200 rounded-md mb-4 flex items-center justify-center">
          {/* Placeholder for cover image */}
          <span className="text-gray-500">Cover</span>
        </div>
        <h2 className="text-lg font-bold truncate" title={book.title}>
          {book.title}
        </h2>
        <p className="text-gray-600 truncate" title={book.author ?? 'Unknown Author'}>
          {book.author ?? 'Unknown Author'}
        </p>
      </div>
    </Link>
  );
}

