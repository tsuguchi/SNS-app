import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function uploadPostImage(uid: string, file: File, index: number): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} は5MBを超えています`);
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.name} は対応形式ではありません`);
  const path = `posts/${uid}/${Date.now()}_${index}_${sanitize(file.name)}`;
  const r = ref(storage(), path);
  await uploadBytes(r, file, { contentType: file.type });
  return await getDownloadURL(r);
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} は5MBを超えています`);
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.name} は対応形式ではありません`);
  const path = `avatars/${uid}/${Date.now()}_${sanitize(file.name)}`;
  const r = ref(storage(), path);
  await uploadBytes(r, file, { contentType: file.type });
  return await getDownloadURL(r);
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
