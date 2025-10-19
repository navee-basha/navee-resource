import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Download, Trash2, FileText, Image, Video, Music, Archive, File, Eye } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  downloadUrl: string | null;
  tags?: string[];
}

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-full h-full" />;
  if (type.startsWith('video/')) return <Video className="w-full h-full" />;
  if (type.startsWith('audio/')) return <Music className="w-full h-full" />;
  if (type.includes('pdf')) return <FileText className="w-full h-full" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) {
    return <Archive className="w-full h-full" />;
  }
  return <File className="w-full h-full" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ResourceCard({ resource, onDelete }: ResourceCardProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1${resource.downloadUrl}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleView = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1${resource.downloadUrl}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('View failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // For images and PDFs, open in new tab for viewing
      if (resource.type.startsWith('image/') || resource.type.includes('pdf')) {
        window.open(url, '_blank');
      } else {
        // For text files, try to view them
        if (resource.type.startsWith('text/')) {
          window.open(url, '_blank');
        } else {
          alert('Preview not available for this file type. Use the download button instead.');
        }
      }
      
      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Failed to view file');
    }
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div className="text-blue-600 flex-shrink-0">
          {getFileIcon(resource.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="truncate">{resource.name}</h3>
          <div className="text-sm text-gray-600 mt-1">
            <div>{formatFileSize(resource.size)}</div>
            <div>{formatDate(resource.uploadDate)}</div>
          </div>
          
          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
            className="gap-1"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-1"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(resource.id)}
            className="gap-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
