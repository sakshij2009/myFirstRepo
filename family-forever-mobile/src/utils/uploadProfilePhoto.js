import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

export async function uploadProfilePhoto(uri, username) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const storageRef = ref(storage, `profilePhotos/${username}.jpg`);
  await uploadBytes(storageRef, blob);

  return await getDownloadURL(storageRef);
}
