import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ExternalLink, 
  BookOpen, 
  Users, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  AlertCircle, 
  Search,
  Filter,
  FileText,
  Quote,
  Building2
} from "lucide-react";
import { toast } from "sonner";

interface Author {
  given?: string;
  family?: string;
  name?: string;
}

interface Paper {
  DOI: string;
  title: string[];
  abstract?: string;
  author?: Author[];
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  "is-referenced-by-count"?: number;
  URL?: string;
  link?: { URL: string; "content-type": string }[];
  "container-title"?: string[];
  publisher?: string;
  subject?: string[];
  type?: string;
}

interface CrossRefResponse {
  status: string;
  "message-type": string;
  message: {
    items: Paper[];
    "total-results": number;
    "items-per-page": number;
    query: {
      "start-index": number;
    };
  };
}

const RESEARCH_TOPICS = [
  { id: "artificial-intelligence", name: "Artificial Intelligence", query: "artificial intelligence", color: "bg-purple-500" },
  { id: "machine-learning", name: "Machine Learning", query: "machine learning", color: "bg-blue-500" },
  { id: "computer-vision", name: "Computer Vision", query: "computer vision", color: "bg-cyan-500" },
  { id: "nlp", name: "Natural Language Processing", query: "natural language processing", color: "bg-green-500" },
  { id: "green-computing", name: "Green Computing & Communication", query: "green computing sustainable computing", color: "bg-emerald-500" },
  { id: "cybersecurity", name: "Cyber Security & Blockchain", query: "cybersecurity blockchain security", color: "bg-red-500" },
  { id: "bioinformatics", name: "Bioinformatics", query: "bioinformatics computational biology", color: "bg-pink-500" },
  { id: "iot", name: "Internet of Things", query: "internet of things IoT sensors", color: "bg-orange-500" },
  { id: "cloud-edge-fog", name: "Cloud, Edge & Fog Computing", query: "cloud computing edge computing fog computing", color: "bg-sky-500" },
  { id: "networking", name: "Networking & Wireless", query: "wireless communication networking 5G 6G", color: "bg-indigo-500" },
  { id: "robotics", name: "Robotics & Automation", query: "robotics automation autonomous systems", color: "bg-amber-500" },
];

const YEAR_FILTERS = [
  { value: "2024", label: "2024 onwards" },
  { value: "2023", label: "2023 onwards" },
  { value: "2022", label: "2022 onwards" },
  { value: "2020", label: "2020 onwards" },
  { value: "", label: "All time" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "published-desc", label: "Newest First" },
  { value: "published", label: "Oldest First" },
  { value: "is-referenced-by-count", label: "Most Cited" },
];

const DOCUMENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "journal-article", label: "Journal Articles" },
  { value: "proceedings-article", label: "Conference Papers" },
  { value: "book-chapter", label: "Book Chapters" },
  { value: "posted-content", label: "Preprints" },
];

export function TrendingPapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(RESEARCH_TOPICS[0]);
  const [yearFilter, setYearFilter] = useState("2024");
  const [sortBy, setSortBy] = useState("is-referenced-by-count");
  const [documentType, setDocumentType] = useState("");
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [publisherFilter, setPublisherFilter] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Q1 Publishers filter - only show papers from top journals
  const Q1_PUBLISHERS = ["IEEE", "ACM", "Elsevier", "ScienceDirect", "Springer", "Nature"];

  const fetchPapers = useCallback(async (
    topic: typeof RESEARCH_TOPICS[0],
    query: string,
    year: string,
    sort: string,
    docType: string,
    openAccess: boolean,
    publisher: string,
    currentOffset: number,
    append: boolean = false
  ) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      // Build the search query - focus on topic-specific terms
      const searchTerm = query.trim() ? `${query.trim()} ${topic.query}` : topic.query;
      
      // Build URL with parameters - use query.bibliographic for more precise topic matching
      const params = new URLSearchParams({
        "query.bibliographic": searchTerm,
        rows: "20",
        offset: currentOffset.toString(),
        sort: sort === "relevance" ? "relevance" : sort,
        order: sort === "published-desc" || sort === "is-referenced-by-count" ? "desc" : "asc",
      });
      
      // Add publisher filter if specified
      if (publisher) {
        params.set("query.publisher-name", publisher);
      }

      // Add filters
      let filters: string[] = [];
      
      if (year) {
        filters.push(`from-pub-date:${year}`);
      }

      if (docType) {
        filters.push(`type:${docType}`);
      }

      if (openAccess) {
        filters.push("has-full-text:true");
      }

      if (filters.length > 0) {
        params.append("filter", filters.join(","));
      }

      const response = await fetch(
        `https://api.crossref.org/works?${params.toString()}`,
        {
          headers: {
            "User-Agent": "ThesisManagementSystem/1.0 (mailto:contact@thesismanagement.edu)"
          }
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        }
        throw new Error("Failed to fetch papers");
      }

      const data: CrossRefResponse = await response.json();
      
      if (append) {
        setPapers((prev) => [...prev, ...data.message.items]);
      } else {
        setPapers(data.message.items || []);
      }
      
      setTotal(data.message["total-results"] || 0);
      setHasMore(data.message.items.length >= 20);
    } catch (err) {
      console.error("Error fetching papers:", err);
      const message = err instanceof Error ? err.message : "Failed to load papers";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchPapers(selectedTopic, debouncedQuery, yearFilter, sortBy, documentType, openAccessOnly, publisherFilter, 0);
  }, [selectedTopic, debouncedQuery, yearFilter, sortBy, documentType, openAccessOnly, publisherFilter, fetchPapers]);

  const handleLoadMore = () => {
    const nextOffset = offset + 20;
    setOffset(nextOffset);
    fetchPapers(selectedTopic, debouncedQuery, yearFilter, sortBy, documentType, openAccessOnly, publisherFilter, nextOffset, true);
  };

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return "Unknown Authors";
    const names = authors.slice(0, 3).map((a) => {
      if (a.name) return a.name;
      return `${a.given || ""} ${a.family || ""}`.trim() || "Unknown";
    });
    if (authors.length > 3) {
      return `${names.join(", ")} et al.`;
    }
    return names.join(", ");
  };

  const getYear = (paper: Paper) => {
    const dateParts = paper["published-print"]?.["date-parts"]?.[0] || 
                     paper["published-online"]?.["date-parts"]?.[0];
    return dateParts?.[0] || "N/A";
  };

  const getPaperUrl = (paper: Paper) => {
    if (paper.link?.[0]?.URL) {
      return paper.link[0].URL;
    }
    return paper.URL || `https://doi.org/${paper.DOI}`;
  };

  const getJournalName = (paper: Paper) => {
    return paper["container-title"]?.[0] || paper.publisher || "Unknown Journal";
  };

  const getCitationCount = (paper: Paper) => {
    return paper["is-referenced-by-count"] || 0;
  };

  const handleTopicChange = (topicId: string) => {
    const topic = RESEARCH_TOPICS.find((t) => t.id === topicId);
    if (topic) setSelectedTopic(topic);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden box-border">
      <div className="flex flex-col gap-4">
        {/* Header - Stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Trending Papers</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Discover trending research papers via CrossRef
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 shrink-0 w-full sm:w-auto"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Advanced Filters"}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search papers by title, topic, author, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Year From</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_FILTERS.map((filter) => (
                        <SelectItem key={filter.value || "all"} value={filter.value || "all"}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value || "all"} value={type.value || "all"}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Publisher/Journal</Label>
                  <Input
                    placeholder="e.g., IEEE, Springer, Nature"
                    value={publisherFilter}
                    onChange={(e) => setPublisherFilter(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center sm:col-span-2 lg:col-span-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="openAccess"
                      checked={openAccessOnly}
                      onCheckedChange={(checked) => setOpenAccessOnly(checked === true)}
                    />
                    <Label htmlFor="openAccess" className="cursor-pointer text-sm">
                      Full Text Available Only
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Topic Tabs - Scrollable with proper containment */}
      <Tabs
        value={selectedTopic.id}
        onValueChange={handleTopicChange}
        className="w-full max-w-full"
      >
        <div className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2 w-full">
            {RESEARCH_TOPICS.map((topic) => (
              <TabsTrigger
                key={topic.id}
                value={topic.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm"
              >
                {topic.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {RESEARCH_TOPICS.map((topic) => (
          <TabsContent key={topic.id} value={topic.id} className="mt-6 max-w-full overflow-hidden">
            {/* Results count */}
            {!loading && !error && (
              <p className="text-sm text-muted-foreground mb-4">
                Found {total.toLocaleString()} papers in {topic.name}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Searching papers...</span>
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardContent className="flex items-center justify-center py-12">
                  <AlertCircle className="h-8 w-8 text-destructive mr-2" />
                  <span className="text-destructive">{error}</span>
                </CardContent>
              </Card>
            ) : papers.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <BookOpen className="h-8 w-8 text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">No papers found. Try adjusting your search or filters.</span>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {papers.map((paper, index) => (
                  <Card key={paper.DOI} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              #{offset + index + 1}
                            </Badge>
                            {paper.type && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {paper.type.replace("-", " ")}
                              </Badge>
                            )}
                            {getCitationCount(paper) > 0 && (
                              <Badge className="bg-primary/90 hover:bg-primary text-xs flex items-center gap-1">
                                <Quote className="h-3 w-3" />
                                {getCitationCount(paper).toLocaleString()} citations
                              </Badge>
                            )}
                            {paper.subject?.slice(0, 2).map((subject) => (
                              <Badge key={subject} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                          <CardTitle className="text-lg leading-tight">
                            {paper.title?.[0] || "Untitled"}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {paper.abstract && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {paper.abstract}
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{formatAuthors(paper.author)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>{getYear(paper)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">{getJournalName(paper)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="default"
                            size="sm"
                            asChild
                            className="gap-1"
                          >
                            <a
                              href={getPaperUrl(paper)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Source
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="gap-1"
                          >
                            <a
                              href={`https://doi.org/${paper.DOI}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="h-4 w-4" />
                              DOI
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More Papers"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
