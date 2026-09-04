import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi, useAuth } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import {
  CAMPUSES,
  FACULTIES,
  getCampusBadge,
  getDiceBearAvatar,
  getMajorCode,
} from "@/lib/constants";
import { LinkedinIcon, GithubIcon } from "@/components/social-icons";
import { Search, MessageSquare, Globe, ExternalLink } from "lucide-react";

interface StudentCardData {
  id: string;
  nim: string;
  name: string;
  campus: string;
  faculty: string;
  major: string;
  degree: string;
  shift: string;
  semester: number;
  avatarSeed: string;
  headline?: string;
  bioMd?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
}

interface ExploreResponse {
  data: StudentCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const SearchBar: React.FC<{
  defaultValue: string;
  placeholder?: string;
  onSearch: (query: string) => void;
}> = React.memo(({ defaultValue, placeholder, onSearch }) => {
  const [val, setVal] = useState(defaultValue);
  const debounced = useDebounce(val, 400);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-9 bg-background/50 h-9 text-xs"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearch(val);
          }
        }}
      />
    </div>
  );
});

export const Explore: React.FC = () => {
  const { user } = useAuth();

  // URL state management using nuqs
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false }),
  );
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false }),
  );

  const handleSearch = React.useCallback(
    (q: string) => {
      setSearch((prev) => {
        if (prev !== q) {
          setPage(1);
          return q;
        }
        return prev;
      });
    },
    [setSearch, setPage],
  );
  const [campus, setCampus] = useQueryState(
    "campus",
    parseAsString.withDefault("ALL").withOptions({ shallow: false }),
  );
  const [faculty, setFaculty] = useQueryState(
    "faculty",
    parseAsString.withDefault("ALL").withOptions({ shallow: false }),
  );
  const [semester, setSemester] = useQueryState(
    "semester",
    parseAsString.withDefault("ALL").withOptions({ shallow: false }),
  );

  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Send Note Dialog state
  const [noteRecipient, setNoteRecipient] = useState<StudentCardData | null>(
    null,
  );
  const [noteMessage, setNoteMessage] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteStatus, setNoteStatus] = useState("");

  const loadStudents = async () => {
    setLoading(true);
    const query = new URLSearchParams();
    query.set("page", page.toString());
    query.set("limit", "12");
    if (search.trim()) query.set("search", search.trim());
    if (campus && campus !== "ALL") query.set("campus", campus);
    if (faculty && faculty !== "ALL") query.set("faculty", faculty);
    if (semester && semester !== "ALL") query.set("semester", semester);

    const { data } = await fetchApi<ExploreResponse>(
      `/api/users?${query.toString()}`,
    );
    if (data) {
      setStudents(data.data);
      setTotalPages(data.pagination.totalPages || 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [page, search, campus, faculty, semester]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteRecipient || !noteMessage.trim()) return;

    setNoteSending(true);
    setNoteStatus("");

    const { error } = await fetchApi("/api/notifications/note", {
      method: "POST",
      body: JSON.stringify({
        recipientId: noteRecipient.id,
        message: noteMessage.trim(),
      }),
    });

    setNoteSending(false);
    if (error) {
      setNoteStatus(error);
    } else {
      setNoteMessage("");
      setNoteRecipient(null);
    }
  };

  // Generate pagination items array
  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;

    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            isActive={page === 1}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(1);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      items.push(
        <PaginationItem key={p}>
          <PaginationLink
            href="#"
            isActive={page === p}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(p);
            }}
          >
            {p}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            isActive={page === totalPages}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <AppShell title="Explore Peers" breadcrumbs={[{ label: "Explore Peers" }]}>
      <div className="space-y-6">
        {/* Filter and Search Bar matching docs/explore.png */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-2">
          <SearchBar
            defaultValue={search}
            placeholder="Search by name, NIM, or headline..."
            onSearch={handleSearch}
          />

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campus filter */}
            <div className="w-36">
              <Select
                value={campus}
                onValueChange={(val) => {
                  setCampus(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50">
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Campuses</SelectItem>
                  {CAMPUSES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.badge}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Faculty filter */}
            <div className="w-36">
              <Select
                value={faculty}
                onValueChange={(val) => {
                  setFaculty(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50">
                  <SelectValue placeholder="All Faculties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Faculties</SelectItem>
                  {FACULTIES.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester filter */}
            <div className="w-36">
              <Select
                value={semester}
                onValueChange={(val) => {
                  setSemester(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50">
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      Semester {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="0">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Student Grid matching docs/explore.png */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border border-border/50 bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : students.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  {/* Top: Circular Avatar + Name + Badges */}
                  <div className="flex items-center gap-3.5">
                    <Link to={`/profile/${student.nim}`} className="shrink-0">
                      <Avatar className="size-12 rounded-full border border-border/60 shadow-sm">
                        <AvatarImage
                          src={getDiceBearAvatar(student.avatarSeed)}
                          alt={student.name}
                        />
                        <AvatarFallback className="font-semibold text-xs">
                          {student.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/profile/${student.nim}`}
                        className="block truncate text-sm font-bold text-foreground hover:text-primary transition-colors"
                        title={student.name}
                      >
                        {student.name}
                      </Link>

                      {/* Badges immediately under name: SM6 or Graduated, S1-TI, Meruya */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0 font-medium rounded-full bg-secondary/80 text-secondary-foreground"
                        >
                          {student.semester === 0
                            ? "Graduated"
                            : `SM${student.semester}`}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0 font-medium rounded-full bg-secondary/80 text-secondary-foreground"
                        >
                          {student.degree || "S1"}-{getMajorCode(student.major)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0 font-medium rounded-full bg-secondary/80 text-secondary-foreground"
                        >
                          {getCampusBadge(student.campus)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Bio snippet */}
                  <p className="mt-3.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {student.headline ||
                      student.bioMd ||
                      "Student at Universitas Mercu Buana."}
                  </p>
                </div>

                {/* Bottom action buttons: No divider, no detail link, mapped only if present */}
                <div className="mt-4 flex items-center gap-2">
                  {student.linkedinUrl && (
                    <a
                      href={student.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn Profile"
                      className="size-8 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <LinkedinIcon className="size-3.5" />
                    </a>
                  )}

                  {student.githubUrl && (
                    <a
                      href={student.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="GitHub Profile"
                      className="size-8 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <GithubIcon className="size-3.5" />
                    </a>
                  )}

                  {student.websiteUrl && (
                    <a
                      href={student.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Portfolio / Website"
                      className="size-8 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Globe className="size-3.5" />
                    </a>
                  )}

                  {user && user.id !== student.id && (
                    <button
                      onClick={() => {
                        setNoteRecipient(student);
                        setNoteStatus("");
                      }}
                      title="Send Quick Note"
                      className="size-8 ml-auto rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No students found matching your filters.
            </p>
          </div>
        )}

        {/* Shadcn Pagination Component matching docs/explore.png */}
        {totalPages > 1 && (
          <div className="pt-6 border-t border-border/40 flex items-center justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page - 1);
                    }}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page + 1);
                    }}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Send Note Dialog */}
      <Dialog
        open={Boolean(noteRecipient)}
        onOpenChange={(open) => !open && setNoteRecipient(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Note to {noteRecipient?.name}</DialogTitle>
            <DialogDescription>
              Send a quick message to introduce yourself or invite to a team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendNote}>
            {noteStatus && (
              <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {noteStatus}
              </div>
            )}

            <Textarea
              placeholder="Hi! I'm also in FASILKOM Meruya, want to team up for..."
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              maxLength={280}
              required
              rows={4}
              className="resize-none text-xs"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {noteMessage.length}/280
            </p>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteRecipient(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={noteSending}>
                {noteSending ? "Sending..." : "Send Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};
