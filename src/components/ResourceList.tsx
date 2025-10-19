import { ResourceCard } from './ResourceCard';
import { Skeleton } from './ui/skeleton';
import { FileX } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  downloadUrl: string | null;
  tags?: string[];
}

interface ResourceListProps {
  resources: Resource[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export function ResourceList({ resources, loading, onDelete }: ResourceListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-start gap-4">
              <Skeleton className="w-8 h-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <FileX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-gray-600 mb-2">No resources yet</h3>
        <p className="text-gray-500">Upload your first resource to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onDelete={onDelete}
        />
      ))}

      
    </div>
  );
}
