export interface Book {
  id: string;
  title: string;
  author: string | null;
  path: string;
  cover_path: string | null;
  imported_at: string;
}

export interface Chapter {
  id: string;
  title: string;
  path: string;
  level: number;
}
