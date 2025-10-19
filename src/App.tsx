import { useState, useEffect, useMemo } from "react";
import { UploadForm } from "./components/UploadForm";
import { ResourceList } from "./components/ResourceList";
import { FilterBar } from "./components/FilterBar";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { FolderOpen, LogOut } from "lucide-react";
import { Button } from "./components/ui/button";
import { auth } from "./utils/supabase/client";
import {
  projectId,
  publicAnonKey,
} from "./utils/supabase/info";

interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  downloadUrl: string | null;
  tags?: string[];
}

export default function App() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTag, setSelectedTag] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [checkingAuth, setCheckingAuth] = useState(true);

  const fetchResources = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-db46f9ec/resources`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Error fetching resources:", data.error);
        return;
      }

      setResources(data.resources);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this resource?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-db46f9ec/resources/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Error deleting resource:", data.error);
        alert("Failed to delete resource");
        return;
      }

      // Refresh the resource list
      fetchResources();
    } catch (error) {
      console.error("Failed to delete resource:", error);
      alert("Failed to delete resource");
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setCheckingAuth(false);
          return;
        }

        if (data.session?.access_token) {
          setAccessToken(data.session.access_token);
          setUserEmail(data.session.user?.email || null);
        }
      } catch (error) {
        console.error('Failed to check session:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchResources();
    }
  }, [accessToken]);

  const handleLoginSuccess = (token: string, email: string) => {
    setAccessToken(token);
    setUserEmail(email);
  };

  const handleSignupSuccess = (token: string, email: string) => {
    setAccessToken(token);
    setUserEmail(email);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setAccessToken(null);
      setUserEmail(null);
      setResources([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Get all unique tags from resources
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach((resource) => {
      resource.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [resources]);

  // Filter resources based on search query, file type, and tags
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      // Search filter
      const matchesSearch = resource.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Type filter
      let matchesType = true;
      if (selectedType !== "all") {
        switch (selectedType) {
          case "document":
            matchesType =
              resource.type.includes("pdf") ||
              resource.type.includes("doc") ||
              resource.type.includes("text") ||
              resource.type.includes("word") ||
              resource.type.includes("spreadsheet") ||
              resource.type.includes("excel") ||
              resource.type.includes("powerpoint") ||
              resource.type.includes("presentation");
            break;
          case "image":
            matchesType = resource.type.startsWith("image/");
            break;
          case "video":
            matchesType = resource.type.startsWith("video/");
            break;
          case "audio":
            matchesType = resource.type.startsWith("audio/");
            break;
          case "archive":
            matchesType =
              resource.type.includes("zip") ||
              resource.type.includes("rar") ||
              resource.type.includes("7z") ||
              resource.type.includes("tar") ||
              resource.type.includes("gz");
            break;
        }
      }

      // Tag filter
      const matchesTag =
        selectedTag === "" ||
        (resource.tags && resource.tags.includes(selectedTag));

      return matchesSearch && matchesType && matchesTag;
    });
  }, [resources, searchQuery, selectedType, selectedTag]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login/signup if not authenticated
  if (!accessToken) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setAuthView('signup')}
        />
      );
    } else {
      return (
        <Signup
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
            <h1 className="text-blue-600" style={{ fontFamily: "Times New Roman", fontWeight: "bold", fontSize: "24px" }}>Getresource By Naveed</h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base px-4" style={{fontFamily:"Barlow sans-serif",fontWeight:"bold",fontSize:"20px"}}>
            Upload and manage your resources, notes, and
            documents in one place
          </p>
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-full px-4" style={{fontFamily:"Barlow sans-serif",fontWeight:"bold",fontSize:"15px"}}>
              Signed in as: 
              <br />
              {userEmail}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-xs sm:text-sm"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Upload Form */}
        <div className="mb-6 sm:mb-8">
          <UploadForm onUploadSuccess={fetchResources} />
        </div>

        {/* Resources List */}
        <div>
          <div className="mb-4">
            <h2>Your Resources</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              {filteredResources.length} of {resources.length}{" "}
              {resources.length === 1
                ? "resource"
                : "resources"}
            </p>
          </div>

          {/* Filters */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            availableTags={availableTags}
          />

          <ResourceList
            resources={filteredResources}
            loading={loading}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}