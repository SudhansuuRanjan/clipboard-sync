import imageCompression from "browser-image-compression";

export async function compressImage(imageFile, maxSizeMB = 0.2, maxWidthOrHeight = 1920, useWebWorker = true) {
    const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker,
    }

    try {
        const compressedFile = await imageCompression(imageFile, options);
        const newFile = new File([compressedFile], imageFile.name, { lastModified: new Date(), size: imageFile.size, type: imageFile.type });
        return newFile;
    } catch (error) {
        throw new Error(error.message);
    }
}