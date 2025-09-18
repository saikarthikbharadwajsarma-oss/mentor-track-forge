import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, File, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  taskId?: string;
  userId: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function FileUpload({ taskId, userId, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);
    uploadFiles(newFiles);
  };

  const uploadFiles = async (filesToUpload: UploadFile[]) => {
    for (const uploadFile of filesToUpload) {
      try {
        // Validate file
        if (uploadFile.file.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('File size must be less than 5MB');
        }

        const allowedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx'];
        const isAllowed = allowedTypes.some(type => 
          type.includes('*') ? 
            uploadFile.file.type.startsWith(type.replace('*', '')) :
            uploadFile.file.name.endsWith(type)
        );

        if (!isAllowed) {
          throw new Error('File type not allowed. Please upload images, PDFs, or documents.');
        }

        // Generate unique filename
        const fileExt = uploadFile.file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // Simulate upload progress
        const interval = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          ));
        }, 100);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, uploadFile.file);

        clearInterval(interval);

        if (uploadError) throw uploadError;

        // Save file record to database
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            filename: fileName,
            original_name: uploadFile.file.name,
            file_path: filePath,
            file_size: uploadFile.file.size,
            mime_type: uploadFile.file.type,
            task_id: taskId || null,
            uploaded_by: userId,
          });

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 100, status: 'success' }
            : f
        ));

        toast({
          title: "Upload successful",
          description: `${uploadFile.file.name} has been uploaded`,
        });

      } catch (error: any) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: error.message }
            : f
        ));

        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    onUploadComplete?.();
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-gradient-card shadow-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          File Upload
        </CardTitle>
        <CardDescription>
          Upload files related to {taskId ? 'this task' : 'your work'}. Max 5MB per file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">
            Drag and drop files here, or click to select
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports images, PDFs, and documents (max 5MB)
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
              }
            }}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-medium text-foreground">Uploads</h4>
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background-secondary"
              >
                <File className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                  </p>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-2" />
                  )}
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  {file.status === 'uploading' && (
                    <Badge variant="outline">Uploading...</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}