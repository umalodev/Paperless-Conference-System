import { useState, useMemo } from "react";

/**
 * Hook untuk pencarian dan filter participant.
 */
export default function useParticipants(participants) {
  const [query, setQuery] = useState("");

  const filteredParticipants = useMemo(() => {
    if (!Array.isArray(participants)) return [];
    const search = query.toLowerCase();

    return participants.filter((p) => {
      const role = p.account?.role?.toLowerCase() || "";
      const name = p.account?.displayName?.toLowerCase() || "";
      return !query || name.includes(search) || role.includes(search);
    });
  }, [participants, query]);

  return { query, setQuery, filteredParticipants };
}
