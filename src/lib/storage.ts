import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadMealImage(file: File, mealId: string): Promise<string> {
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filePath = `meals/${mealId}/${Date.now()}.${fileExtension}`;

    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    return downloadUrl;
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}
