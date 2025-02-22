import * as React from "react";
import { toast } from "sonner";
import type { UploadedFile } from "@/types";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUser } from '@clerk/nextjs';

interface UseUploadFileProps {
  defaultUploadedFiles?: UploadedFile[];
}

export function useUploadFile(
  bucketName: string,
  { defaultUploadedFiles = [] }: UseUploadFileProps = {}
) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>(defaultUploadedFiles);
  const [progresses, setProgresses] = React.useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = React.useState(false);
  const { user } = useUser(); // Get the current user
  async function onUpload(files: File[]) {
    setIsUploading(true);
  
    try {
      // Check if the user's bucket exists
      const { data: bucketData, error: bucketError } = await supabaseClient
        .storage
        .listBuckets();
  
      if (bucketError) {
        throw new Error(bucketError.message);
      }
  
      const bucketExists = bucketData?.some(bucket => bucket.name === bucketName);
  
      // Create the bucket if it does not exist
      if (!bucketExists) {
        const { error: createBucketError } = await supabaseClient
          .storage
          .createBucket(bucketName);
  
        if (createBucketError) {
          throw new Error(createBucketError.message);
        }
  
        // Save the bucket to the user's storage
        const { error: insertError } = await supabaseClient
          .from('users_storage')
          .insert([
            {
              user_id: user?.id, // Use the user's ID from Clerk
              bucket_name: bucketName,
              createdat: new Date().toISOString(),
              updatedat: new Date().toISOString(),
            },
            ])
  
        if (insertError) {
          console.error("Insert Error:", insertError.message);
          throw new Error(insertError.message);
        }
      }
  
      // Proceed to upload files to the bucket
      const uploadPromises = files.map(async (file) => {
        const fileName = `${file.name}`;
        const filePath = `${bucketName}/${fileName}`;
        const { error } = await supabaseClient
          .storage
          .from(bucketName) // Use the specified bucket
          .upload(fileName, file);
        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
  
        const publicUrl = supabaseClient
          .storage
          .from(bucketName)
          .getPublicUrl(filePath)
          .data?.publicUrl;
  
        return {
          name: file.name,
          path: filePath,
          url: publicUrl || "",
        } as unknown as UploadedFile;
      });
  
      const uploadedFilesList = await Promise.all(uploadPromises);
  
      setUploadedFiles((prev) => [...prev, ...uploadedFilesList]);
      toast.success("Files uploaded successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred during upload");
    } finally {
      setProgresses({});
      setIsUploading(false);
    }
  }
 

  return {
    onUpload,
    uploadedFiles,
    progresses,
    isUploading,
  };
}