import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, FileText, Image, Video, Music, Archive, File } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
  availableTags: string[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedTag,
  onTagChange,
  availableTags,
}: FilterBarProps) {
  const fileTypes = [
    { label: 'All', value: 'all', icon: File },
    { label: 'Documents', value: 'document', icon: FileText },
    { label: 'Images', value: 'image', icon: Image },
    { label: 'Videos', value: 'video', icon: Video },
    { label: 'Audio', value: 'audio', icon: Music },
    { label: 'Archives', value: 'archive', icon: Archive },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
        <Input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 sm:pl-10 text-sm sm:text-base"
        />
      </div>

      {/* File Type Filters */}
      <div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {fileTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTypeChange(type.value)}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm justify-center"
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">{type.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div>
          <p className="text-xs sm:text-sm text-gray-600 mb-2">Filter by tag:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTag === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTagChange('')}
              className="text-xs sm:text-sm"
            >
              All Tags
            </Button>
            {availableTags.map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => onTagChange(tag)}
                className="text-xs sm:text-sm"
              >
                #{tag}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
