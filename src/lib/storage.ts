import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Compress and resize an image using canvas.
 * Ensures the base64 payload stays well under Vercel's 4.5MB limit.
 * - Max dimension: 1024px (longer side)
 * - JPEG quality: 0.72 (~72%)
 */
export function compressImage(file: File, maxDim = 1024, quality = 0.72): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;

            // Scale down if needed
            if (width > maxDim || height > maxDim) {
                if (width >= height) {
                    height = Math.round((height / width) * maxDim);
                    width = maxDim;
                } else {
                    width = Math.round((width / height) * maxDim);
                    height = maxDim;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas not supported')); return; }
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = url;
    });
}

export async function uploadMealImage(file: File, mealId: string): Promise<string> {
    const filePath = `meals/${mealId}/${Date.now()}.jpg`;
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
