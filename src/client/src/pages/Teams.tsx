import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { fetchApi } from "@/lib/api";
import { FACULTIES, getDiceBearAvatar } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { Plus, Search, Users } from "lucide-react";

interface MemberPreview {
  id: string;
  name: string;
  avatarSeed: string;
}

interface TeamItem {
  id: string;
  name: string;
  slug: string;
  coverImageUrl?: string;
  eventName: string;
  eventUrl: string;
  startDate?: string;
  endDate?: string;
  accessType: "OPEN" | "INVITE_ONLY" | "CLOSED";
  maxMembers: number;
  targetFaculty?: string;
  memberCount: number;
  membersPreview?: MemberPreview[];
  owner: {
    id: string;
    name: string;
    nim: string;
    avatarSeed?: string;
  };
}

function formatTeamDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}'`;
  } catch {
    return dateStr;
  }
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

export const Teams: React.FC = () => {
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
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsString.withDefault("deadline_asc").withOptions({ shallow: false }),
  );
  const [faculty, setFaculty] = useQueryState(
    "faculty",
    parseAsString.withDefault("ALL").withOptions({ shallow: false }),
  );
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("ALL_ACTIVE").withOptions({ shallow: false }),
  );

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadTeams = async () => {
    setLoading(true);
    const query = new URLSearchParams();
    query.set("page", page.toString());
    query.set("limit", "12");
    if (sort) query.set("sort", sort);
    if (faculty && faculty !== "ALL") query.set("faculty", faculty);
    if (status && status !== "ALL_ACTIVE") query.set("status", status);

    const { data } = await fetchApi<{
      data: TeamItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/teams?${query.toString()}`);

    if (data) {
      setTeams(data.data);
      setTotalPages(data.pagination.totalPages || 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, [page, search, sort, faculty, status]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

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
    <AppShell
      title="Teams & Projects"
      breadcrumbs={[{ label: "Teams & Projects" }]}
    >
      <div className="space-y-6">
        {/* Header & Filter Bar matching docs/teams.png */}
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Browse Teams
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Discover student competition squads and collaborative projects
              </p>
            </div>

            <Link to="/teams/create">
              <Button size="sm" className="gap-1.5 font-medium shadow-sm">
                <Plus className="size-4" />
                <span>Create Team</span>
              </Button>
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-2">
            <SearchBar
              defaultValue={search}
              placeholder="Search teams or events..."
              onSearch={handleSearch}
            />

            {/* Filter Dropdowns matching docs/teams.png */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort by deadline */}
              <div className="w-44">
                <Select
                  value={sort}
                  onValueChange={(val) => {
                    setSort(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50">
                    <SelectValue placeholder="Sort: deadline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline_asc">
                      Deadline (Ascending)
                    </SelectItem>
                    <SelectItem value="deadline_desc">
                      Deadline (Descending)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Faculty Filter */}
              <div className="w-40">
                <Select
                  value={faculty}
                  onValueChange={(val) => {
                    setFaculty(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50">
                    <SelectValue placeholder="Open faculty" />
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

              {/* Status / Access Filter */}
              <div className="w-40">
                <Select
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50">
                    <SelectValue placeholder="Open for public" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_ACTIVE">All Active Teams</SelectItem>
                    <SelectItem value="OPEN">Open for public</SelectItem>
                    <SelectItem value="INVITE_ONLY">Invite only</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Grid matching docs/teams.png */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-2xl border border-border/50 bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => {
              const previewMembers = t.membersPreview || [];
              const visibleMembers = previewMembers.slice(0, 2);
              const extraCount = Math.max(
                t.memberCount - visibleMembers.length,
              );

              return (
                <Link
                  key={t.id}
                  to={`/teams/${t.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-primary/60 hover:shadow-xl"
                >
                  {/* Card Background Cover with Overlay */}
                  <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950">
                    {t.coverImageUrl && (
                      <img
                        src={t.coverImageUrl}
                        alt=""
                        aria-hidden="true"
                        onError={(e) => {
                          // Gracefully hide broken image so clean gradient renders seamlessly
                          (e.target as HTMLElement).style.display = "none";
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                      />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />

                    {/* Top-left Event Badge & Top-right Date Badge */}
                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        title={t.eventName}
                        className={`min-w-0 ${t.endDate ? "max-w-[65%]" : "max-w-[85%]"} text-[11px] font-semibold bg-background/80 text-foreground backdrop-blur px-2.5 py-0.5 rounded-full shadow-sm`}
                      >
                        <span className="truncate">{t.eventName}</span>
                      </Badge>

                      {t.endDate && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[11px] font-semibold bg-background/80 text-foreground backdrop-blur px-2.5 py-0.5 rounded-full shadow-sm"
                        >
                          {formatTeamDate(t.endDate)}
                        </Badge>
                      )}
                    </div>

                    {/* Bottom Content Area matching docs/teams.png */}
                    <div className="absolute bottom-3.5 inset-x-3.5 flex items-end justify-between gap-2">
                      {/* Left: Team Title & Lead */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-white group-hover:text-primary transition-colors">
                          {t.name}
                        </h3>
                        <p className="truncate text-xs text-neutral-300 font-medium mt-0.5">
                          Lead: {t.owner.name} ({t.owner.nim})
                        </p>
                      </div>

                      {/* Right: Avatar Stack with number badge elevated to front */}
                      <div className="flex items-center -space-x-2 shrink-0 pl-2">
                        {visibleMembers.map((m, idx) => (
                          <Avatar
                            key={m.id}
                            style={{ zIndex: idx }}
                            className="size-8 ring-2 ring-black rounded-full border border-white/20 shadow-sm"
                          >
                            <AvatarImage
                              src={getDiceBearAvatar(m.avatarSeed)}
                              alt={m.name}
                            />
                            <AvatarFallback className="text-[10px] bg-neutral-800 text-white font-medium">
                              {m.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}

                        {extraCount > 0 ? (
                          <div
                            style={{ zIndex: 10 }}
                            className="relative flex size-8 items-center justify-center rounded-full bg-neutral-800 text-white text-[11px] font-bold ring-2 ring-black border border-white/20 shadow-sm"
                          >
                            +{extraCount}
                          </div>
                        ) : previewMembers.length === 0 ? (
                          <div className="flex size-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 text-xs ring-2 ring-black">
                            <Users className="size-3.5" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No teams found matching your filters.
            </p>
          </div>
        )}

        {/* Shadcn Pagination Component matching docs/teams.png */}
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
    </AppShell>
  );
};
