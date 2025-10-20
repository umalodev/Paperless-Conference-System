import React from "react";

export default function NotesEmpty({ message = "No notes yet." }) {
  return <div className="pd-empty">{message}</div>;
}
