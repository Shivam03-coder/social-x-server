import { appEnvConfigs } from "@src/configs";
import { v2 as cloudinary } from "cloudinary";
import { promises as fs } from "fs";

cloudinary.config({
  cloud_name: appEnvConfigs.CLOUDINARY_CLOUD_NAME,
  api_key: appEnvConfigs.CLOUDINARY_API_KEY,
  api_secret: appEnvConfigs.CLOUDINARY_API_SECRET,
});

type ImagePath = string | string[];

class CloudinaryService {
  public static async uploadImages(
    imagePaths: ImagePath
  ): Promise<string | string[] | null> {
    if (!imagePaths || (Array.isArray(imagePaths) && imagePaths.length === 0)) {
      console.error("No file path provided");
      return null;
    }

    const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];

    try {
      const uploadPromises = paths.map(async (imagePath) => {
        try {
          await fs.access(imagePath);

          const uploadResponse = await cloudinary.uploader.upload(imagePath, {
            resource_type: "auto",
          });

          await fs
            .unlink(imagePath)
            .catch((err) => console.warn("Failed to delete local file:", err));

          return uploadResponse.url;
        } catch (error) {
          console.error("Cloudinary upload failed for:", imagePath, error);
          await fs.unlink(imagePath).catch(() => null);
          return null;
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      return uploadedUrls.length === 1
        ? uploadedUrls[0]
        : uploadedUrls.filter((url) => url !== null);
    } catch (error) {
      console.log("Error in CloudinaryService.uploadImages:", error);
      return null;
    }
  }
}

export default CloudinaryService;
