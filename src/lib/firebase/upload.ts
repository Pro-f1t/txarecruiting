"use client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./client";

/** Upload a file to Storage and return its download URL. */
export async function uploadFile(folder: string, uid: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${folder}/${uid}/${Date.now()}-${safe}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}
