'use client';

import { useState, useEffect } from "react";
import type { Book } from "./types";
import Header from "@/components/Header";
import BookList from "@/components/BookList";
import { API_URL } from "@/lib/constants";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books`);
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const data: Book[] = await response.json();
      setBooks(data);
    } catch (error) {
      console.error(error);
      // Handle fetch error (e.g., show a notification)
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <Header onBookImported={fetchBooks} />
      <BookList books={books} />
    </main>
  );
}
